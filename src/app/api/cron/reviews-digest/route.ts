// POST /api/cron/reviews-digest — weekly/monthly trading-review email runner.
//
// Triggered hourly by pg_cron → pg_net (see supabase/migrations/*_schedule_reviews_digest.sql).
// Auth: `Authorization: Bearer <CRON_SECRET>`. Gates each user by their LOCAL hour
// (REVIEWS_HOUR = 8) and local date: Monday → weekly (previous week), day 1 → monthly
// (previous month). For each due period it auto-generates the AI analysis from trades
// (when missing) and emails the review. `{ force, type }` body forces a run for testing.

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { localDateISO, localHour } from "@/lib/datetime/local"
import { checkCronAuth } from "@/app/api/cron/learning-digest/route"
import {
  sendReviewEmail,
  type ReviewEmailStatus,
  type ReviewEmailUser,
  type ReviewPeriod,
} from "@/server/services/email/send-review"
import { ensureReviewAnalysis } from "@/server/services/reviews/ensure-analysis"
import { renderReviewPdf } from "@/server/services/reviews/render-pdf"
import { REVIEWS_HOUR, duePeriods, previousWeekStart, previousMonth } from "@/server/services/reviews/review-schedule"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // AI generation across users can be slow

const USER_SELECT = {
  id: true, email: true, name: true, emailNotifications: true, timezone: true,
} as const

export async function POST(req: NextRequest) {
  const auth = checkCronAuth(req.headers.get("authorization"), process.env.CRON_SECRET)
  if (auth === "unconfigured") return new NextResponse("CRON_SECRET not configured", { status: 412 })
  if (auth === "unauthorized") return new NextResponse("Unauthorized", { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { force?: boolean; type?: "weekly" | "monthly" }
  const force = body.force === true
  const now = new Date()

  const users = (await prisma.user.findMany({
    where: { emailNotifications: true },
    select: USER_SELECT,
  })) as ReviewEmailUser[]

  const tally: Record<ReviewEmailStatus | "skipped" | "error", number> = {
    sent: 0, empty: 0, ineligible: 0, already_sent: 0, send_failed: 0, skipped: 0, error: 0,
  }

  for (const user of users) {
    const todayISO = localDateISO(now, user.timezone)
    if (!force && localHour(now, user.timezone) !== REVIEWS_HOUR) { tally.skipped++; continue }

    let periods: ReviewPeriod[]
    if (force) {
      periods = []
      if (body.type === "weekly"  || !body.type) periods.push({ kind: "weekly", weekStart: previousWeekStart(todayISO) })
      if (body.type === "monthly" || !body.type) periods.push({ kind: "monthly", ...previousMonth(todayISO) })
    } else {
      periods = duePeriods(todayISO)
    }
    if (periods.length === 0) { tally.skipped++; continue }

    for (const period of periods) {
      try {
        // Auto-generate AI from trades; a failure must not block the email.
        try {
          await ensureReviewAnalysis(prisma, user.id, period)
        } catch (e) {
          logger.warn(`[cron:reviews-digest] AI gen failed ${user.id}: ${e instanceof Error ? e.message : String(e)}`)
        }
        const { status } = await sendReviewEmail(
          { prisma, now, renderPdf: (a) => renderReviewPdf(prisma, a) },
          user, period,
        )
        tally[status]++
      } catch (err) {
        tally.error++
        logger.error(`[cron:reviews-digest] ${user.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  return NextResponse.json({ ok: true, processed: users.length, ...tally })
}
