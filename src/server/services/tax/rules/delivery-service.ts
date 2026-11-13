import { randomUUID } from "node:crypto";
import React from "react";
import { render } from "@react-email/render";
import type {
  PrismaClient,
  Prisma,
  TaxRuleDelivery,
  TaxRuleUpdate,
  NotificationPreference,
} from "@/lib/generated/prisma/client";
import {
  emitNotification,
  inQuietHours,
} from "@/server/services/notifications/emit";
import { isEmailChannelEnabled } from "@/server/services/email/eligibility";
import {
  sendEmail as defaultSendEmail,
  type EmailSender,
} from "@/server/services/email/resend-client";
import {
  TaxRuleUpdateEmail,
  ruleAmount,
} from "@/emails/templates/tax-rule-update";
import type { RuleChange } from "./publication-policy";

export interface DeliveryOptions {
  now?: Date;
  sendEmail?: EmailSender;
  deadline?: number;
}
const CATEGORY = "Fiscalidad";
const terminalPriority = (pref: NotificationPreference | null) =>
  pref?.minPriority === "P0" || pref?.minPriority === "P1";
function changesOf(update: TaxRuleUpdate): RuleChange[] {
  return Array.isArray(update.changes)
    ? (update.changes as unknown as RuleChange[])
    : [];
}
function summary(update: TaxRuleUpdate) {
  const changes = changesOf(update);
  return changes.length
    ? changes
        .map(
          (c) => `${c.label}: ${ruleAmount(c.before)} → ${ruleAmount(c.after)}`,
        )
        .join("; ")
    : `Tabla disponible para el ejercicio ${update.year}; sin variación en los umbrales comparados.`;
}

async function fanOut(db: PrismaClient, now: Date) {
  const updates = await db.taxRuleUpdate.findMany({
    where: { status: "PUBLISHED", fanoutComplete: false },
    orderBy: [{ publishedAt: "asc" }, { id: "asc" }],
    take: 5,
  });
  let created = 0;
  for (const update of updates) {
    if (!update.publishedAt) continue;
    created += await db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM public.tax_rule_updates WHERE id=${update.id}::uuid AND NOT fanout_complete FOR UPDATE SKIP LOCKED`;
      if (!locked.length) return 0;
      // Exclude blocked users before limiting the page. Filtering afterwards
      // would revisit the same first 100 deletion jobs on every invocation.
      const profiles = await tx.$queryRaw<{ userId: string }[]>`
        SELECT p.user_id AS "userId" FROM public.tax_profiles p
        WHERE p.country='HN' AND p.created_at <= ${update.publishedAt!}
          AND NOT EXISTS (SELECT 1 FROM public.tax_rule_deliveries d
            WHERE d.user_id=p.user_id AND d.update_id=${update.id}::uuid)
          AND NOT EXISTS (SELECT 1 FROM public.account_deletion_jobs j
            WHERE j.user_id=p.user_id)
        ORDER BY p.user_id LIMIT 100`;
      if (!profiles.length) {
        await tx.taxRuleUpdate.update({
          where: { id: update.id },
          data: { fanoutComplete: true },
        });
        return 0;
      }
      const result = await tx.taxRuleDelivery.createMany({
        data: profiles.map((p) => ({
          userId: p.userId,
          updateId: update.id,
          nextAttemptAt: now,
        })),
        skipDuplicates: true,
      });
      return result.count;
    });
  }
  return created;
}
async function userEligibility(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
) {
  const [user, pref, job] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailNotifications: true },
    }),
    db.notificationPreference.findUnique({
      where: { userId_category: { userId, category: CATEGORY } },
    }),
    db.accountDeletionJob.findUnique({
      where: { userId },
      select: { userId: true },
    }),
  ]);
  return { user, pref, blocked: !user || Boolean(job) };
}

async function notifyInApp(
  db: PrismaClient,
  row: TaxRuleDelivery & { update: TaxRuleUpdate },
  token: string,
  now: Date,
) {
  if (row.inAppStatus !== "PENDING") return false;
  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM public.tax_rule_deliveries WHERE id=${row.id}::uuid AND lease_token=${token}::uuid FOR UPDATE`;
    if (!locked.length) return false;
    const { pref, blocked } = await userEligibility(tx, row.userId);
    if (blocked) {
      await tx.taxRuleDelivery.updateMany({
        where: { id: row.id, leaseToken: token },
        data: {
          inAppStatus: "SUPPRESSED",
          emailStatus: "SUPPRESSED",
          reasonCode: "ACCOUNT_UNAVAILABLE",
        },
      });
      return false;
    }
    if (
      pref &&
      (pref.muted ||
        !pref.channels.includes("in_app") ||
        terminalPriority(pref))
    ) {
      await tx.taxRuleDelivery.updateMany({
        where: { id: row.id, leaseToken: token },
        data: { inAppStatus: "SUPPRESSED" },
      });
      return false;
    }
    if (pref && inQuietHours(pref, now)) return false;
    const notice = await emitNotification(
      tx as unknown as PrismaClient,
      row.userId,
      "TAX_RULES_UPDATED",
      {
        params: {
          year: row.update.year,
          summary: summary(row.update),
          agreement: row.update.agreement ?? "SAR",
        },
        sourceId: row.update.id,
        dedupeKey: `tax-rule-update:${row.update.id}`,
        groupKey: `tax-rules:${row.update.year}`,
        href: `/fiscal?rulesYear=${row.update.year}#reglas-fiscales`,
        now,
      },
    );
    if (!notice) return false;
    await tx.taxRuleDelivery.update({
      where: { id: row.id },
      data: { inAppStatus: "DELIVERED", notifiedAt: now },
    });
    return true;
  });
}

/** Persistent event deliveries. No user financial data enters the email payload. */
export async function deliverTaxRuleUpdates(
  db: PrismaClient,
  options: DeliveryOptions = {},
) {
  const now = options.now ?? new Date(),
    send = options.sendEmail ?? defaultSendEmail,
    deadline = options.deadline ?? Date.now() + 15_000;
  const created = await fanOut(db, now);
  let inAppDelivered = 0,
    emailDelivered = 0,
    emailCalls = 0;
  const due = {
    nextAttemptAt: { lte: now },
    AND: [
      { OR: [{ inAppStatus: "PENDING" }, { emailStatus: "PENDING" }] },
      { OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
    ],
  };
  const pending = await db.taxRuleDelivery.findMany({
    where: due,
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
    take: 30,
  });
  for (const item of pending) {
    if (Date.now() >= deadline) break;
    const token = randomUUID();
    const claimed = await db.taxRuleDelivery.updateMany({
      where: { ...due, id: item.id },
      data: {
        leaseToken: token,
        leaseUntil: new Date(now.getTime() + 120_000),
      },
    });
    if (!claimed.count) continue;
    try {
      const row = await db.taxRuleDelivery.findUnique({
        where: { id: item.id },
        include: { update: true },
      });
      if (!row) continue;
      if (row.update.status !== "PUBLISHED") {
        await db.taxRuleDelivery.updateMany({
          where: { id: item.id, leaseToken: token },
          data: {
            inAppStatus: "SUPPRESSED",
            emailStatus: "SUPPRESSED",
            reasonCode: "RELEASE_NOT_PUBLISHED",
          },
        });
        continue;
      }
      if (await notifyInApp(db, row, token, now)) inAppDelivered++;
      const current = await db.taxRuleDelivery.findFirst({
        where: { id: item.id, leaseToken: token },
      });
      if (!current || current.emailStatus !== "PENDING") continue;
      const { user, pref, blocked } = await userEligibility(db, row.userId);
      if (
        blocked ||
        !user?.email ||
        !user.emailNotifications ||
        !pref ||
        pref.muted ||
        !pref.channels.includes("email") ||
        terminalPriority(pref)
      ) {
        await db.taxRuleDelivery.updateMany({
          where: { id: item.id, leaseToken: token },
          data: {
            emailStatus: "SUPPRESSED",
            reasonCode: blocked ? "ACCOUNT_UNAVAILABLE" : null,
          },
        });
        continue;
      }
      if (!isEmailChannelEnabled(user.emailNotifications, pref, now)) continue; // Quiet hours defer; they do not suppress.
      if (
        current.firstEmailAttemptAt &&
        now.getTime() - current.firstEmailAttemptAt.getTime() >= 23 * 3_600_000
      ) {
        await db.taxRuleDelivery.updateMany({
          where: { id: item.id, leaseToken: token },
          data: {
            emailStatus: "REVIEW_REQUIRED",
            reasonCode: "EMAIL_RETRY_WINDOW_EXPIRED",
          },
        });
        continue;
      }
      if (emailCalls >= 5) continue;
      const html = await render(
        React.createElement(TaxRuleUpdateEmail, {
          year: row.update.year,
          agreement: row.update.agreement ?? "SAR",
          sourceUrl: row.update.sourceUrl,
          changes: changesOf(row.update),
          appUrl:
            process.env.NEXT_PUBLIC_APP_URL ?? "https://www.tjournalx.com",
        }),
      );
      const started = await db.taxRuleDelivery.updateMany({
        where: { id: item.id, leaseToken: token, emailStatus: "PENDING" },
        data: {
          firstEmailAttemptAt: current.firstEmailAttemptAt ?? now,
          lastEmailAttemptAt: now,
          emailAttempts: { increment: 1 },
        },
      });
      if (!started.count) continue;
      if (emailCalls > 0)
        await new Promise((resolve) => setTimeout(resolve, 550));
      emailCalls++;
      const result = await send({
        to: user.email,
        subject: `Reglas ISR ${row.update.year} actualizadas — TjournalX`,
        html,
        idempotencyKey: `tax-rule-update/${item.id}`,
      });
      if (result.ok && !result.dryRun && result.id) {
        await db.taxRuleDelivery.updateMany({
          where: { id: item.id, leaseToken: token },
          data: {
            emailStatus: "DELIVERED",
            emailedAt: now,
            emailProviderId: result.id,
            reasonCode: null,
          },
        });
        emailDelivered++;
      } else if (result.dryRun) {
        await db.taxRuleDelivery.updateMany({
          where: { id: item.id, leaseToken: token },
          data: {
            firstEmailAttemptAt: current.firstEmailAttemptAt,
            reasonCode: "EMAIL_NOT_CONFIGURED",
          },
        });
      } else {
        await db.taxRuleDelivery.updateMany({
          where: { id: item.id, leaseToken: token },
          data: { reasonCode: "EMAIL_SEND_FAILED" },
        });
      }
    } catch {
      await db.taxRuleDelivery.updateMany({
        where: { id: item.id, leaseToken: token },
        data: { reasonCode: "DELIVERY_RETRY_PENDING" },
      });
    } finally {
      await db.taxRuleDelivery.updateMany({
        where: { id: item.id, leaseToken: token },
        data: {
          leaseToken: null,
          leaseUntil: null,
          nextAttemptAt: new Date(now.getTime() + 900_000),
        },
      });
    }
  }
  return { created, inAppDelivered, emailDelivered };
}
