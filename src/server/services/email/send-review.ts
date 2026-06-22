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
import { lightTheme } from "@/emails/theme"
import { isEmailChannelEnabled, type EmailPrefRow } from "./eligibility"
import { sendEmail as defaultSendEmail, type EmailSender, type EmailAttachment } from "./resend-client"

export const REVIEWS_CATEGORY = "Reviews"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export type ReviewEmailKind = "weekly" | "monthly"
export type ReviewEmailStatus = "sent" | "empty" | "ineligible" | "already_sent" | "send_failed"

export type ReviewPeriod =
  | { kind: "weekly"; weekStart: string }
  | { kind: "monthly"; year: number; month: number }

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
  return period.kind === "weekly" ? `/reviews/semanal/${period.weekStart}` : `/reviews/mensual/${periodKey(period)}`
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
  const appUrl = deps.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://app.tradingjournal.app"
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

  // Load the computed report + saved AI analysis.
  let title: string
  let aiAnalysis: string | null
  let report
  if (period.kind === "weekly") {
    const bundle = await loadWeeklyReport(prisma, user.id, period.weekStart)
    report = bundle.report
    title = bundle.report.weekLabel
    aiAnalysis = bundle.saved?.aiAnalysis ?? null
  } else {
    const bundle = await loadMonthlyReport(prisma, user.id, period.year, period.month)
    report = bundle.report
    title = `${MONTHS[period.month - 1]} ${period.year}`
    aiAnalysis = bundle.saved?.aiAnalysis ?? null
  }

  if (report.kpis.trades === 0) return { status: "empty" }

  const model = buildReviewEmailModel({ kind: period.kind, title, reportPath: reportPath(period), report, aiAnalysis })
  const html = await render(React.createElement(ReviewSummary, { model, theme: lightTheme, appUrl }))

  const sign = model.kpis.netPnl >= 0 ? "📈" : "📉"
  const subject = period.kind === "weekly"
    ? `${sign} Tu semana — ${title}`
    : `${sign} Tu mes — ${title}`

  // Optional PDF attachment (Phase 5).
  let attachments: EmailAttachment[] | undefined
  if (deps.renderPdf) {
    try {
      const pdf = await deps.renderPdf({ userId: user.id, period })
      attachments = [{ filename: `review-${period.kind}-${weekKey}.pdf`, content: pdf }]
    } catch (err) {
      logger.warn(`[email:review] PDF render failed for ${user.id} ${weekKey}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const result = await send({ to: user.email, subject, html, attachments })
  if (!result.ok) return { status: "send_failed", error: result.error }

  try {
    await prisma.emailLog.create({ data: { userId: user.id, emailType, weekKey } })
  } catch (err) {
    // Unique (user_id, email_type, week_key) — already logged (manual resend or parallel tick).
    logger.warn(`[email:review] email_log insert race for ${user.id} ${weekKey}: ${err instanceof Error ? err.message : String(err)}`)
  }

  return { status: "sent" }
}
