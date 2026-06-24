// Auto-finalization for a weekly review. Run by the Monday cron for the just-finished
// week: flips the review to "submitted", snapshots the computed discipline score, and
// populates the ✓worked / ✗toImprove chips from the report when empty. Idempotent and
// NON-destructive — it never overwrites the user's own notes (executiveSummary) or any
// chips they already filled.

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { computeDisciplineScore } from "@/domains/analytics/services/discipline-service"
import { loadWeeklyReport } from "./report-data"
import { deriveChipsFromReport } from "./verdict"

export type FinalizeResult = "finalized" | "skipped"

export async function finalizeWeeklyReview(
  prisma: PrismaClient,
  userId: string,
  weekStart: string,
): Promise<FinalizeResult> {
  const { report, saved } = await loadWeeklyReport(prisma, userId, weekStart)
  if (report.kpis.trades === 0) return "skipped" // nothing traded — don't fabricate a review

  const ws = new Date(weekStart + "T00:00:00")
  const we = new Date(ws); we.setDate(ws.getDate() + 7) // exclusive for discipline window
  const disc = await computeDisciplineScore(prisma, userId, { from: ws, to: we })
  const score = disc.score ?? 0

  const chips = deriveChipsFromReport(report)
  const workedText = chips.worked.join("\n")
  const improveText = chips.toImprove.join("\n")

  if (saved) {
    const data: Record<string, unknown> = {
      tradeCount: report.kpis.trades,
      netPnl: report.kpis.netPnl,
      winRate: report.kpis.winRate,
      disciplineScore: score,
    }
    if (saved.status !== "submitted") data.status = "submitted"
    if (!saved.whatWorked?.trim() && workedText) data.whatWorked = workedText
    if (!saved.toImprove?.trim() && improveText) data.toImprove = improveText
    await prisma.weeklyReview.update({ where: { id: saved.id }, data })
    return "finalized"
  }

  const weekEnd = new Date(ws); weekEnd.setDate(ws.getDate() + 6)
  await prisma.weeklyReview.create({
    data: {
      userId,
      weekStart: ws,
      weekEnd,
      weekLabel: report.weekLabel,
      weekRange: report.weekLabel,
      status: "submitted",
      tradeCount: report.kpis.trades,
      netPnl: report.kpis.netPnl,
      winRate: report.kpis.winRate,
      disciplineScore: score,
      whatWorked: workedText,
      toImprove: improveText,
    },
  })
  return "finalized"
}
