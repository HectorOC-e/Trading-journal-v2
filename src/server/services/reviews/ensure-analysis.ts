// Cron auto-generate helper: ensure a period's AI analysis exists, deriving it from
// the computed report when missing and persisting it onto the review row. Silent
// no-op when the user has no AI provider configured or the period has no trades.

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { resolveAiCall, usableCandidates } from "@/lib/ai/resolve-provider"
import { loadWeeklyReport, loadMonthlyReport } from "./report-data"
import { buildAnalysisPrompt, runReviewAnalysis } from "./review-ai"
import { loadReviewInsights } from "./review-insights"
import type { ReviewPeriod } from "@/server/services/email/send-review"

async function persistWeeklyAnalysis(
  prisma: PrismaClient, userId: string, weekStart: string, weekLabel: string, analysis: string, at: Date, savedId: string | null,
) {
  if (savedId) {
    await prisma.weeklyReview.update({ where: { id: savedId }, data: { aiAnalysis: analysis, aiAnalysisAt: at } })
  } else {
    const ws = new Date(weekStart + "T00:00:00"); const we = new Date(ws); we.setDate(ws.getDate() + 6)
    await prisma.weeklyReview.create({
      data: { userId, weekStart: ws, weekEnd: we, weekLabel, weekRange: weekLabel, aiAnalysis: analysis, aiAnalysisAt: at, status: "draft" },
    })
  }
}

async function persistMonthlyAnalysis(prisma: PrismaClient, userId: string, year: number, month: number, analysis: string, at: Date) {
  await prisma.monthlyReview.upsert({
    where:  { userId_year_month: { userId, year, month } },
    create: { userId, year, month, aiAnalysis: analysis, aiAnalysisAt: at },
    update: { aiAnalysis: analysis, aiAnalysisAt: at },
  })
}

export async function ensureReviewAnalysis(prisma: PrismaClient, userId: string, period: ReviewPeriod): Promise<void> {
  const candidates = usableCandidates(await resolveAiCall(prisma, userId, "weekly_reviews"))
  if (candidates.length === 0) return
  const at = new Date()

  if (period.kind === "weekly") {
    const { report, saved } = await loadWeeklyReport(prisma, userId, period.weekStart)
    if (report.kpis.trades === 0 || saved?.aiAnalysis) return
    const insights = await loadReviewInsights(prisma, userId, period)
    const analysis = await runReviewAnalysis(candidates, buildAnalysisPrompt(report.weekLabel, "weekly", report, insights))
    if (analysis) await persistWeeklyAnalysis(prisma, userId, period.weekStart, report.weekLabel, analysis, at, saved?.id ?? null)
  } else {
    const { report, saved } = await loadMonthlyReport(prisma, userId, period.year, period.month)
    if (report.kpis.trades === 0 || saved?.aiAnalysis) return
    const insights = await loadReviewInsights(prisma, userId, period)
    const label = `${String(period.month).padStart(2, "0")}/${period.year}`
    const analysis = await runReviewAnalysis(candidates, buildAnalysisPrompt(label, "monthly", report, insights))
    if (analysis) await persistMonthlyAnalysis(prisma, userId, period.year, period.month, analysis, at)
  }
}
