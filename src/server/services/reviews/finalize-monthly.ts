// Auto-finalization for a monthly review (the "Carta del Gestor"). Run by the day-1 cron
// for the just-finished month: computes pillars + editorial title + structured themes,
// persists them, flips status to submitted, and proposes a status for each unconfirmed
// goal. Idempotent and non-destructive — never overwrites the user's summary/notes or any
// goal the user confirmed.

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { Prisma } from "@/lib/generated/prisma/client"
import { loadMonthlyReport } from "./report-data"
import { loadReviewAnalytics } from "./review-insights"
import { computePillars } from "./pillars"
import { deriveLetterTitle, deriveStructuredThemes } from "./monthly-letter"
import { evaluateGoal } from "./goal-eval"

const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

export type FinalizeResult = "finalized" | "skipped"

export async function finalizeMonthlyReview(
  prisma: PrismaClient,
  userId: string,
  year: number,
  month: number,
): Promise<FinalizeResult> {
  const { report } = await loadMonthlyReport(prisma, userId, year, month)
  if (report.kpis.trades === 0) return "skipped"

  const analytics = await loadReviewAnalytics(prisma, userId, { kind: "monthly", year, month })
  const pillars = computePillars({
    trades: report.kpis.trades, winRate: report.kpis.winRate, profitFactor: report.kpis.profitFactor,
    expectancy: analytics.expectancy, disciplineScore: report.kpis.disciplineScore, byEmotion: analytics.byEmotion,
  })
  const letterTitle = deriveLetterTitle(`${MONTHS_ES[month - 1]} ${year}`, {
    netPnl: report.kpis.netPnl, winRate: report.kpis.winRate, disciplineScore: report.kpis.disciplineScore, trades: report.kpis.trades,
  })
  const themes = deriveStructuredThemes(report)

  await prisma.monthlyReview.upsert({
    where:  { userId_year_month: { userId, year, month } },
    create: {
      userId, year, month, status: "submitted",
      letterTitle, keyThemesRich: themes as unknown as Prisma.InputJsonValue,
      pillarPerformance: pillars.performance, pillarDiscipline: pillars.discipline, pillarPsychology: pillars.psychology,
      overallScore: pillars.overall,
    },
    update: {
      status: "submitted",
      letterTitle, keyThemesRich: themes as unknown as Prisma.InputJsonValue,
      pillarPerformance: pillars.performance, pillarDiscipline: pillars.discipline, pillarPsychology: pillars.psychology,
      overallScore: pillars.overall,
    },
  })

  // Propose a status for each unconfirmed goal (never touches user-confirmed ones).
  const goals = await prisma.monthlyGoal.findMany({ where: { userId, year, month, userConfirmed: false } })
  if (goals.length > 0) {
    const ctx = { violations: report.discipline.violations, trades: report.kpis.trades, netPnl: report.kpis.netPnl, winRate: report.kpis.winRate }
    for (const g of goals) {
      const proposal = evaluateGoal(g.text, ctx)
      if (proposal) {
        await prisma.monthlyGoal.update({ where: { id: g.id }, data: { status: proposal.status, note: proposal.note, source: "ai" } })
      }
    }
  }

  return "finalized"
}
