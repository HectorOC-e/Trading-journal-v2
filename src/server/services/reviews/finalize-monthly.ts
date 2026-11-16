// Submit the shared manual envelope once; all automatic evidence remains scoped
// in report snapshots and each goal is evaluated only in its declared mode.
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { OPERATIONAL_MODES, type OperationalMode } from "@/domains/trading/operational-mode"
import { loadMonthlyReport } from "./report-data"
import { evaluateGoal } from "./goal-eval"

export type FinalizeResult = "finalized" | "skipped"

export async function finalizeMonthlyReview(
  prisma: PrismaClient,
  userId: string,
  year: number,
  month: number,
  mode?: OperationalMode,
): Promise<FinalizeResult> {
  const bundles = await Promise.all((mode ? [mode] : OPERATIONAL_MODES).map(async selected => ({
    mode: selected,
    ...await loadMonthlyReport(prisma, userId, year, month, selected),
  })))
  if (!bundles.some(({ report }) => report.kpis.trades > 0)) return "skipped"

  await prisma.monthlyReview.upsert({
    where: { userId_year_month: { userId, year, month } },
    create: { userId, year, month, status: "submitted" },
    update: { status: "submitted" },
  })

  for (const { mode: selected, report } of bundles) {
    if (report.kpis.trades === 0) continue
    const goals = await prisma.monthlyGoal.findMany({
      where: { userId, year, month, userConfirmed: false, operationalMode: selected },
    })
    const ctx = { violations: report.discipline.violations, trades: report.kpis.trades, netPnl: report.kpis.netPnl, winRate: report.kpis.winRate }
    for (const goal of goals) {
      const proposal = evaluateGoal(goal.text, ctx)
      if (proposal) {
        await prisma.monthlyGoal.update({
          where: { id: goal.id, userId, operationalMode: selected, userConfirmed: false },
          data: { status: proposal.status, note: proposal.note, source: "ai" },
        })
      }
    }
  }
  return "finalized"
}
