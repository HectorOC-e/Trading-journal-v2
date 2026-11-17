import { MODE_LABELS, OPERATIONAL_MODES, type OperationalMode } from "@/domains/trading/operational-mode"
// Orchestration for the weekly/monthly trading-review email. Mirrors
// send-learning-digest: check Reviews email-channel eligibility (opt-in), dedupe via
// email_log, load the computed report, skip-if-empty, render + send (optionally with a
// PDF attachment), then log. Manual sends (button) bypass quiet-hours + dedupe but still
// require the master email switch. See spec §3–§5.

import { render } from "@react-email/render"
import React from "react"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { logger } from "@/lib/logger"
import { loadWeeklyReport, loadMonthlyReport } from "@/server/services/reviews/report-data"
import { buildReviewEmailModel } from "@/domains/analytics/services/review-email-model"
import { ReviewSummary } from "@/emails/templates/review-summary"
import { EmailLayout } from "@/emails/components/EmailLayout"
import { StatRow } from "@/emails/components/StatRow"
import { CtaButton } from "@/emails/components/CtaButton"
import { EmailFooter } from "@/emails/components/EmailFooter"
import type { EmailTheme } from "@/emails/theme"
import type { ReviewEmailModel } from "@/domains/analytics/services/review-email-model"
import { currencySymbol } from "@/lib/fx"
import { resolveEmailThemeFor } from "./email-theme"
import { isEmailChannelEnabled, type EmailPrefRow } from "./eligibility"
import { sendEmail as defaultSendEmail, type EmailSender, type EmailAttachment } from "./resend-client"

export const REVIEWS_CATEGORY = "Reviews"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export type ReviewEmailKind = "weekly" | "monthly"
export type ReviewEmailStatus = "sent" | "empty" | "ineligible" | "already_sent" | "send_failed"

export type ReviewPeriod = (
  | { kind: "weekly"; weekStart: string }
  | { kind: "monthly"; year: number; month: number }
) & { mode?: OperationalMode }

export interface ReviewEmailUser {
  id: string
  email: string
  name: string | null
  emailNotifications: boolean
  timezone: string
}

/** Optional server-side PDF renderer (Phase 5). Returns the report PDF bytes. */
export type ReviewPdfRenderer = (args: { userId: string; period: ReviewPeriod }) => Promise<Buffer>

export interface SendReviewDeps {
  prisma: PrismaClient
  now?: Date
  appUrl?: string
  sendEmail?: EmailSender
  renderPdf?: ReviewPdfRenderer
}

function periodKey(period: ReviewPeriod): string {
  return period.kind === "weekly" ? period.weekStart : `${period.year}-${String(period.month).padStart(2, "0")}`
}

function reportPath(period: ReviewPeriod): string {
  const path = period.kind === "weekly" ? `/reviews/semanal/${period.weekStart}` : `/reviews/mensual/${periodKey(period)}`
  return `${path}?mode=${period.mode ?? "REAL"}`
}

/** One document and one delivery, with independent mode samples and empty states. */
function ReviewModeSections({ models, title, theme, appUrl }: {
  models: { mode: OperationalMode; model: ReviewEmailModel }[]
  title: string
  theme: EmailTheme
  appUrl: string
}) {
  return React.createElement(EmailLayout, {
    theme,
    preview: `${title} · Real · Demo · Backtesting`,
  } as React.ComponentProps<typeof EmailLayout>, [
      React.createElement("h1", { key: "title", style: { margin: "26px 30px", fontSize: 20, color: theme.ink } }, title),
      ...models.map(({ mode, model }) => React.createElement("div", { key: mode, style: { borderTop: `1px solid ${theme.lineSection}` } },
        React.createElement("h2", { style: { margin: "22px 30px 8px", color: theme.ink, fontSize: 18 } }, MODE_LABELS[mode]),
        React.createElement("p", { style: { margin: "0 30px 12px", color: theme.ink3, fontSize: 12 } }, `Fecha de operación · moneda base ${model.baseCurrency}`),
        model.isEmpty
          ? React.createElement("p", { style: { margin: "12px 30px 22px", color: theme.ink2 } }, "Sin operaciones")
          : React.createElement(React.Fragment, null,
            React.createElement(StatRow, { theme, stats: [
              { label: "Net P&L", value: `${model.kpis.netPnl < 0 ? "-" : ""}${currencySymbol(model.baseCurrency)}${Math.abs(model.kpis.netPnl).toFixed(2)}` },
              { label: "Trades", value: String(model.kpis.trades) },
              { label: "Win rate", value: `${model.kpis.winRate}%` },
              { label: "Disciplina", value: model.kpis.disciplineScore == null ? "—" : String(model.kpis.disciplineScore) },
            ] }),
            model.aiAnalysis && React.createElement("div", { style: { padding: "0 30px 20px", color: theme.ink2, fontSize: 13, lineHeight: 1.5 } },
              ...model.aiAnalysis.split("\n").filter(line => line.trim()).map((line, i) =>
                React.createElement("p", { key: i, style: { margin: "0 0 8px" } }, line.replace(/^###\s*/, "").replace(/\*\*/g, "")),
              ),
            ),
          ),
        React.createElement(CtaButton, { theme, href: `${appUrl}${model.reportPath}`, label: `Ver ${MODE_LABELS[mode]}` }),
      )),
      React.createElement(EmailFooter, { key: "footer", theme, prefsUrl: `${appUrl}/perfil`, reason: "Recibes esto porque tienes activos los correos de Reviews." }),
  ])
}

export async function sendReviewEmail(
  deps: SendReviewDeps,
  user: ReviewEmailUser,
  period: ReviewPeriod,
  opts: { manual?: boolean } = {},
): Promise<{ status: ReviewEmailStatus; error?: string }> {
  const prisma = deps.prisma
  const now = deps.now ?? new Date()
  const send = deps.sendEmail ?? defaultSendEmail
  const appUrl = deps.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://tjournalx.com"
  const manual = opts.manual === true

  // Eligibility. Manual sends only require the master switch (the click is the opt-in);
  // cron requires the per-category email channel + quiet-hours via isEmailChannelEnabled.
  if (manual) {
    if (!user.emailNotifications) return { status: "ineligible" }
  } else {
    const pref = (await prisma.notificationPreference.findUnique({
      where: { userId_category: { userId: user.id, category: REVIEWS_CATEGORY } },
      select: { muted: true, channels: true, quietStart: true, quietEnd: true, timezone: true },
    })) as EmailPrefRow | null
    if (!isEmailChannelEnabled(user.emailNotifications, pref, now)) return { status: "ineligible" }
  }

  const emailType = `${period.kind}_review`
  const weekKey = periodKey(period)

  if (!manual) {
    const already = await prisma.emailLog.findFirst({
      where: { userId: user.id, emailType, weekKey },
      select: { id: true },
    })
    if (already) return { status: "already_sent" }
  }

  const modes = period.mode ? [period.mode] : manual ? ["REAL" as const] : OPERATIONAL_MODES
  const models = await Promise.all(modes.map(async mode => {
    const bundle = period.kind === "weekly"
      ? await loadWeeklyReport(prisma, user.id, period.weekStart, mode)
      : await loadMonthlyReport(prisma, user.id, period.year, period.month, mode)
    const title = period.kind === "weekly"
      ? (bundle.report as Awaited<ReturnType<typeof loadWeeklyReport>>["report"]).weekLabel
      : `${MONTHS[period.month - 1]} ${period.year}`
    return { mode, title, model: buildReviewEmailModel({
      kind: period.kind, title: `${title} · ${MODE_LABELS[mode]}`, reportPath: reportPath({ ...period, mode }),
      report: bundle.report, aiAnalysis: bundle.saved?.aiAnalysis ?? null,
    }) }
  }))
  if (models.every(({ model }) => model.isEmpty)) return { status: "empty" }
  const title = models[0].title
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: user.id },
    select: { theme: true, colorTheme: true, customTheme: true },
  })
  const theme = resolveEmailThemeFor(prefs)
  const html = models.length === 1
    ? await render(React.createElement(ReviewSummary, { model: models[0].model, theme, appUrl }))
    : await render(React.createElement(ReviewModeSections, { models, title, theme, appUrl }))

  const sign = models.length === 1 ? (models[0].model.kpis.netPnl >= 0 ? "📈" : "📉") : "📊"
  const modeLabel = models.length === 1 ? ` · ${MODE_LABELS[models[0].mode]}` : " · Real / Demo / Backtesting"
  const subject = period.kind === "weekly"
    ? `${sign} Tu semana — ${title}${modeLabel}`
    : `${sign} Tu mes — ${title}${modeLabel}`

  // Optional PDF attachment (Phase 5).
  let attachments: EmailAttachment[] | undefined
  if (deps.renderPdf) {
    attachments = []
    for (const { mode, model } of models) {
      if (model.isEmpty) continue
      try {
        const pdf = await deps.renderPdf({ userId: user.id, period: { ...period, mode } })
        attachments.push({ filename: `review-${period.kind}-${weekKey}-${mode}.pdf`, content: pdf })
      } catch (err) {
        logger.warn(`[email:review] PDF render failed for ${user.id} ${weekKey} ${mode}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  const result = await send({
    to: user.email, subject, html, attachments,
    ...(!manual ? { idempotencyKey: `${emailType}:${user.id}:${weekKey}` } : {}),
  })
  if (!result.ok) return { status: "send_failed", error: result.error }

  try {
    await prisma.emailLog.create({ data: { userId: user.id, emailType, weekKey } })
  } catch (err) {
    // Unique (user_id, email_type, week_key) — already logged (manual resend or parallel tick).
    logger.warn(`[email:review] email_log insert race for ${user.id} ${weekKey}: ${err instanceof Error ? err.message : String(err)}`)
  }

  return { status: "sent" }
}
