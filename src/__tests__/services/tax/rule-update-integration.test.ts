import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  syncTaxRules,
  publishSarCandidate,
} from "@/server/services/tax/rules/sync-service";
import { parseSarRulePage } from "@/server/services/tax/rules/sar-source";
import { HN_ISR_2026 } from "@/domains/tax/rules/hn/2026";
import { randomUUID } from "node:crypto";
import { deliverTaxRuleUpdates } from "@/server/services/tax/rules/delivery-service";
import type {
  SendEmailArgs,
  SendEmailResult,
} from "@/server/services/email/resend-client";

const url = process.env.FISCAL_TEST_DATABASE_URL;
if (url) {
  const u = new URL(url);
  if (
    !["localhost", "127.0.0.1"].includes(u.hostname) ||
    !(
      u.pathname.startsWith("/fiscal_") ||
      (process.env.FISCAL_TEST_SUPABASE_LOCAL === "1" &&
        u.port === "54322" &&
        u.pathname === "/postgres")
    )
  )
    throw Error(
      "Fiscal rule integration requires an explicitly isolated local database",
    );
}
const db = url
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString: url, max: 8 }),
    })
  : null;
const original = readFileSync(
  new URL("../../fixtures/tax/sar-2026.html", import.meta.url),
  "utf8",
);
// 2097 is intentionally fictional, isolated from existing 2027-unavailable tests.
const future = original
  .replaceAll("2026", "2097")
  .replaceAll("228,324.32", "240,000.00")
  .replaceAll("228,324.33", "240,000.01")
  .replaceAll("348,154.10", "360,000.00")
  .replaceAll("348,154.11", "360,000.01")
  .replaceAll("809,660.75", "840,000.00")
  .replaceAll("809,660.76", "840,000.01");
const page = "https://www.sar.gob.hn/download/acuerdo-sar-01-2097/";
const now = new Date("2096-11-13T15:00:00Z");
const source = async (u: string) => ({
  url: u,
  html: u === page ? future : `<a href="${page}">Acuerdo SAR-01-2097</a>`,
});
const owners: string[] = [];
async function owner(
  master = true,
  pref: Record<string, unknown> | null = { channels: ["in_app", "email"] },
) {
  const id = randomUUID();
  owners.push(id);
  await db!
    .$executeRaw`INSERT INTO public.users(id,email,email_notifications) VALUES(${id}::uuid,${`qa-fiscal-rules-${id}@example.invalid`},${master})`;
  await db!.taxProfile.create({
    data: { userId: id, name: "QA fiscal rules", country: "HN" },
  });
  if (pref)
    await db!.notificationPreference.create({
      data: {
        userId: id,
        category: "Fiscalidad",
        timezone: "America/Tegucigalpa",
        ...pref,
      },
    });
  return id;
}
async function publish() {
  await syncTaxRules(db!, { now, fetchSource: source });
}
async function ownerBatch(count: number) {
  const ids = Array.from({ length: count }, () => randomUUID()).sort();
  owners.push(...ids);
  await db!.$executeRaw(
    Prisma.sql`INSERT INTO public.users(id,email,email_notifications) VALUES ${Prisma.join(ids.map((id) => Prisma.sql`(${id}::uuid,${`qa-fiscal-rules-${id}@example.invalid`},true)`))}`,
  );
  await db!.taxProfile.createMany({
    data: ids.map((userId) => ({
      userId,
      name: "QA fiscal batch",
      country: "HN",
    })),
  });
  await db!.notificationPreference.createMany({
    data: ids.map((userId) => ({
      userId,
      category: "Fiscalidad",
      channels: ["in_app", "email"],
      timezone: "America/Tegucigalpa",
    })),
  });
  return ids;
}
async function delivery(userId: string) {
  return db!.taxRuleDelivery.findFirst({ where: { userId } });
}
describe.skipIf(!db)(
  "automatic rule publication on isolated PostgreSQL",
  () => {
    it.each(["baseline", "published"])(
      "resolves recovered source parsing warnings for %s rules",
      async (mode) => {
        const sourceUrl =
          mode === "baseline" ? HN_ISR_2026.references[0].url : page;
        const text = mode === "baseline" ? original : future;
        const instant =
          mode === "baseline" ? new Date("2026-11-13T15:00:00Z") : now;
        const fetched = (body: string) => async (u: string) => ({
          url: u,
          html: u === sourceUrl ? body : `<a href="${sourceUrl}">SAR</a>`,
        });
        if (mode === "published")
          await syncTaxRules(db!, { now: instant, fetchSource: fetched(text) });
        await syncTaxRules(db!, {
          now: new Date(instant.getTime() + 86_400_000),
          fetchSource: fetched(text.replace("15%", "16%")),
        });
        expect(
          await db!.taxRuleUpdate.count({
            where: { status: "REVIEW_REQUIRED" },
          }),
        ).toBeGreaterThan(0);
        await syncTaxRules(db!, {
          now: new Date(instant.getTime() + 172_800_000),
          fetchSource: fetched(text),
        });
        expect(
          await db!.taxRuleUpdate.count({
            where: { status: "REVIEW_REQUIRED" },
          }),
        ).toBe(0);
      },
    );
    it("continues delivering new in-app notices while old emails remain dry-run pending", async () => {
      const ids = await ownerBatch(32);
      await publish();
      const sendEmail = async () => ({ ok: true, dryRun: true });
      await deliverTaxRuleUpdates(db!, {
        now,
        sendEmail,
        deadline: Date.now() + 60_000,
      });
      expect(
        await db!.notification.count({
          where: { userId: { in: ids }, code: "TAX_RULES_UPDATED" },
        }),
      ).toBe(30);
      await deliverTaxRuleUpdates(db!, {
        now: new Date(now.getTime() + 900_000),
        sendEmail,
        deadline: Date.now() + 60_000,
      });
      expect(
        await db!.notification.count({
          where: { userId: { in: ids }, code: "TAX_RULES_UPDATED" },
        }),
      ).toBe(32);
    }, 30_000);
    it("skips a full first page of accounts in deletion without starving an eligible recipient", async () => {
      const ids = await ownerBatch(101),
        eligible = ids.at(-1)!;
      await db!.accountDeletionJob.createMany({
        data: ids.slice(0, 100).map((userId) => ({ userId })),
      });
      await publish();
      await deliverTaxRuleUpdates(db!, {
        now,
        sendEmail: async () => ({ ok: true, dryRun: true }),
      });
      expect(
        await db!.notification.count({
          where: { userId: eligible, code: "TAX_RULES_UPDATED" },
        }),
      ).toBe(1);
      expect(
        await db!.notification.count({
          where: { userId: { in: ids.slice(0, 100) } },
        }),
      ).toBe(0);
    }, 30_000);
    beforeEach(async () => {
      await db!.taxRuleDelivery.deleteMany();
      await db!.taxRuleUpdate.deleteMany();
      await db!.taxRuleSyncState.deleteMany();
      await db!.taxRuleSet.deleteMany({ where: { year: 2097 } });
      await db!.accountDeletionJob.deleteMany({
        where: { userId: { in: owners } },
      });
      await db!.user.deleteMany({ where: { id: { in: owners } } });
    }, 30_000);
    afterAll(async () => {
      if (db) {
        await db.taxRuleDelivery.deleteMany();
        await db.taxRuleUpdate.deleteMany();
        await db.taxRuleSyncState.deleteMany();
        await db.taxRuleSet.deleteMany({ where: { year: 2097 } });
        await db.accountDeletionJob.deleteMany({
          where: { userId: { in: owners } },
        });
        await db.user.deleteMany({ where: { id: { in: owners } } });
        await db.$disconnect();
      }
    });
    it("commits the verified package and publication event together", async () => {
      const candidate = parseSarRulePage(future, page, "2096-11-13");
      expect(await publishSarCandidate(db!, candidate, now)).toEqual({
        published: 1,
        reviewRequired: 0,
      });
      expect(
        await db!.taxRuleUpdate.count({
          where: { year: 2097, status: "PUBLISHED" },
        }),
      ).toBe(1);
    });
    it("publishes a single immutable package even when runners overlap", async () => {
      await Promise.all([
        syncTaxRules(db!, { now, fetchSource: source }),
        syncTaxRules(db!, { now, fetchSource: source }),
      ]);
      expect(
        await db!.taxRuleSet.count({ where: { year: 2097, published: true } }),
      ).toBe(1);
      expect(
        await db!.taxRuleUpdate.count({
          where: { year: 2097, status: "PUBLISHED" },
        }),
      ).toBe(1);
      expect(
        (
          await db!.taxRuleSet.findUnique({
            where: { id: HN_ISR_2026.version },
          })
        )?.checksum,
      ).toBe(HN_ISR_2026.checksum);
    });
    it("does not generate a release when checking the already-installed 2026 baseline", async () => {
      const source = async (u: string) => ({
        url: u,
        html:
          u === HN_ISR_2026.references[0].url
            ? original
            : `<a href="${HN_ISR_2026.references[0].url}">SAR-01-2026</a>`,
      });
      const result = await syncTaxRules(db!, {
        now: new Date("2026-11-13T15:00:00Z"),
        fetchSource: source,
      });
      expect(result.published).toBe(0);
      expect(
        await db!.taxRuleUpdate.count({ where: { status: "PUBLISHED" } }),
      ).toBe(0);
    });
    it("keeps the installed package when official sources fail", async () => {
      const result = await syncTaxRules(db!, {
        now,
        fetchSource: async () => {
          throw Error("simulated source unavailable");
        },
      });
      expect(result.status).toBe("error");
      expect(await db!.taxRuleSet.count({ where: { year: 2097 } })).toBe(0);
      expect(
        (
          await db!.taxRuleSet.findUnique({
            where: { id: HN_ISR_2026.version },
          })
        )?.published,
      ).toBe(true);
    });
    it("does not republish an identical new-year table on a later daily check", async () => {
      await syncTaxRules(db!, { now, fetchSource: source });
      await syncTaxRules(db!, {
        now: new Date(now.getTime() + 86_400_000),
        fetchSource: source,
      });
      expect(
        await db!.taxRuleUpdate.count({
          where: { year: 2097, status: "PUBLISHED" },
        }),
      ).toBe(1);
    });
    it("delivers both channels once and does not mark an already-read notice unread again", async () => {
      const id = await owner();
      await publish();
      const sent: SendEmailArgs[] = [];
      const sendEmail = async (args: SendEmailArgs) => {
        sent.push(args);
        return { ok: true, id: "provider-qa" };
      };
      await deliverTaxRuleUpdates(db!, { now, sendEmail });
      const notice = await db!.notification.findFirst({
        where: { userId: id, code: "TAX_RULES_UPDATED" },
      });
      expect(notice?.category).toBe("Fiscalidad");
      expect(sent).toHaveLength(1);
      expect(sent[0].html).toContain("240,000.00");
      expect(sent[0].html).not.toContain("RTN");
      await db!.notification.update({
        where: { id: notice!.id },
        data: { readAt: now },
      });
      await deliverTaxRuleUpdates(db!, {
        now: new Date(now.getTime() + 900000),
        sendEmail,
      });
      expect(sent).toHaveLength(1);
      expect(
        (await db!.notification.findUnique({ where: { id: notice!.id } }))
          ?.readAt,
      ).toEqual(now);
      expect(await delivery(id)).toMatchObject({
        inAppStatus: "DELIVERED",
        emailStatus: "DELIVERED",
      });
    });
    it.each(["master_off", "no_category_opt_in"])(
      "does not send email for %s but keeps the in-app notice",
      async (mode) => {
        const id = await owner(
          mode !== "master_off",
          mode === "no_category_opt_in"
            ? null
            : { channels: ["in_app", "email"] },
        );
        await publish();
        let calls = 0;
        await deliverTaxRuleUpdates(db!, {
          now,
          sendEmail: async () => {
            calls++;
            return { ok: true, id: "unexpected" };
          },
        });
        expect(calls).toBe(0);
        expect(await delivery(id)).toMatchObject({
          inAppStatus: "DELIVERED",
          emailStatus: "SUPPRESSED",
        });
      },
    );
    it("defers both channels during quiet hours and delivers after silence ends", async () => {
      const id = await owner(true, {
        channels: ["in_app", "email"],
        quietStart: "08:00",
        quietEnd: "10:00",
      });
      await publish();
      let calls = 0;
      const sendEmail = async () => {
        calls++;
        return { ok: true, id: "qa-after-silence" };
      };
      await deliverTaxRuleUpdates(db!, { now, sendEmail });
      expect(calls).toBe(0);
      expect(await delivery(id)).toMatchObject({
        inAppStatus: "PENDING",
        emailStatus: "PENDING",
      });
      await deliverTaxRuleUpdates(db!, {
        now: new Date(now.getTime() + 7200000),
        sendEmail,
      });
      expect(calls).toBe(1);
      expect(await delivery(id)).toMatchObject({
        inAppStatus: "DELIVERED",
        emailStatus: "DELIVERED",
      });
    });
    it.each([{ muted: true }, { minPriority: "P1" }])(
      "respects permanent category gating %j",
      async (prefs) => {
        const id = await owner(true, {
          channels: ["in_app", "email"],
          ...prefs,
        });
        await publish();
        let calls = 0;
        await deliverTaxRuleUpdates(db!, {
          now,
          sendEmail: async () => {
            calls++;
            return { ok: true, id: "unexpected" };
          },
        });
        expect(calls).toBe(0);
        expect(await delivery(id)).toMatchObject({
          inAppStatus: "SUPPRESSED",
          emailStatus: "SUPPRESSED",
        });
      },
    );
    it("retries a failed email with the same provider idempotency key", async () => {
      const id = await owner();
      await publish();
      const calls: SendEmailArgs[] = [];
      const sendEmail = async (
        args: SendEmailArgs,
      ): Promise<SendEmailResult> => {
        calls.push(args);
        return calls.length === 1
          ? { ok: false, error: "simulated uncertainty" }
          : { ok: true, id: "qa-retry" };
      };
      await deliverTaxRuleUpdates(db!, { now, sendEmail });
      expect(await delivery(id)).toMatchObject({
        inAppStatus: "DELIVERED",
        emailStatus: "PENDING",
      });
      await deliverTaxRuleUpdates(db!, {
        now: new Date(now.getTime() + 900000),
        sendEmail,
      });
      expect(await delivery(id)).toMatchObject({ emailStatus: "DELIVERED" });
      expect(calls).toHaveLength(2);
      expect(calls[0].idempotencyKey).toBe(calls[1].idempotencyKey);
    });
    it("does not mark a dry-run as delivered or consume the real-send retry window", async () => {
      const id = await owner();
      await publish();
      await deliverTaxRuleUpdates(db!, {
        now,
        sendEmail: async () => ({ ok: true, dryRun: true }),
      });
      expect(await delivery(id)).toMatchObject({
        emailStatus: "PENDING",
        emailedAt: null,
        firstEmailAttemptAt: null,
      });
      await deliverTaxRuleUpdates(db!, {
        now: new Date(now.getTime() + 172800000),
        sendEmail: async () => ({ ok: true, id: "qa-real-later" }),
      });
      expect(await delivery(id)).toMatchObject({ emailStatus: "DELIVERED" });
    });
    it("does not blindly resend an uncertain delivery after the provider dedupe window", async () => {
      const id = await owner();
      await publish();
      let calls = 0;
      const sendEmail = async () => {
        calls++;
        return { ok: false, error: "simulated uncertainty" };
      };
      await deliverTaxRuleUpdates(db!, { now, sendEmail });
      await deliverTaxRuleUpdates(db!, {
        now: new Date(now.getTime() + 86400000),
        sendEmail,
      });
      expect(calls).toBe(1);
      expect(await delivery(id)).toMatchObject({
        emailStatus: "REVIEW_REQUIRED",
      });
    });
    it("deduplicates overlapping delivery runners", async () => {
      const id = await owner();
      await publish();
      let calls = 0;
      const sendEmail = async () => {
        calls++;
        return { ok: true, id: "qa-concurrent" };
      };
      await Promise.all([
        deliverTaxRuleUpdates(db!, { now, sendEmail }),
        deliverTaxRuleUpdates(db!, { now, sendEmail }),
      ]);
      expect(calls).toBe(1);
      expect(
        await db!.notification.count({
          where: { userId: id, code: "TAX_RULES_UPDATED" },
        }),
      ).toBe(1);
    });
    it("excludes an account with an active deletion intent", async () => {
      const id = await owner();
      await publish();
      await db!.accountDeletionJob.create({ data: { userId: id } });
      let calls = 0;
      await deliverTaxRuleUpdates(db!, {
        now,
        sendEmail: async () => {
          calls++;
          return { ok: true, id: "unexpected" };
        },
      });
      expect(calls).toBe(0);
      expect(
        await db!.notification.count({
          where: { userId: id, code: "TAX_RULES_UPDATED" },
        }),
      ).toBe(0);
    });
  },
);
