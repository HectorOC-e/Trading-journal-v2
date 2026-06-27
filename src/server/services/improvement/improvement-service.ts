// ─────────────────────────────────────────────────────────────────────────────
// Improvement service (S14) — the North Star. Aggregates the four drivers
// (discipline, expectancy, commitment-kept, cost of indiscipline) into the
// ImprovementScore (#41) and the per-regime performance (#33). Real accounts only
// (practice money never inflates the score). Read-only, deterministic (P2).
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import {
  computeImprovementScore, costOfIndiscipline, type ImprovementResult,
} from "@/domains/analytics/improvement/improvement-score"
import { computeRegimePerformance, type RegimePerformanceResult, type RegimeTrade } from "@/domains/analytics/regime/regime-performance"
import { isPracticeType } from "@/domains/trading/account-reality"

const num = (v: { toString(): string } | null | undefined): number | null => (v == null ? null : Number(v))
const OFF_PLAN_TAGS = new Set(["Off-plan", "Impulsivo"])

export interface ImprovementOverview {
  hasData: boolean
  sampleSize: number
  improvement: ImprovementResult
  regime: RegimePerformanceResult
  /** Absolute P&L the off-plan trades cost vs on-plan (#49). */
  indisciplineCost: number
  keptRate: number | null
  /** Raw driver inputs (for the daily snapshot / history). */
  inputs: { disciplineRolling: number; expectancyR: number; commitmentKeptRate: number; costOfIndisciplineRatio: number }
}

export async function getImprovement(prisma: PrismaClient, userId: string): Promise<ImprovementOverview> {
  const accounts = await prisma.account.findMany({ where: { userId }, select: { id: true, type: true } })
  const realIds = accounts.filter((a) => !isPracticeType(a.type)).map((a) => a.id)

  const [trades, commitments] = await Promise.all([
    prisma.trade.findMany({
      where: { userId, status: "CLOSED", accountId: { in: realIds } },
      select: { pnl: true, rMultiple: true, tags: true, regime: true, revengeFlag: true, fomoFlag: true },
    }),
    prisma.commitment.findMany({
      where: { userId, status: { in: ["kept", "partial", "broken", "expired"] } },
      select: { status: true },
    }),
  ])

  const total = trades.length
  const isOffPlan = (t: (typeof trades)[number]) =>
    t.revengeFlag || t.fomoFlag || (t.tags ?? []).some((tag) => OFF_PLAN_TAGS.has(tag))

  const offPlanCount = trades.filter(isOffPlan).length
  const disciplineRolling = total > 0 ? 1 - offPlanCount / total : 0

  const rs = trades.map((t) => num(t.rMultiple)).filter((r): r is number => r != null)
  const expectancyR = rs.length > 0 ? rs.reduce((s, r) => s + r, 0) / rs.length : 0

  const resolved = commitments.length
  const keptRate = resolved > 0 ? commitments.filter((c) => c.status === "kept").length / resolved : null

  const cost = costOfIndiscipline(trades.map((t) => ({ pnl: num(t.pnl) ?? 0, offPlan: isOffPlan(t) })))

  const improvement = computeImprovementScore({
    disciplineRolling,
    expectancyR,
    commitmentKeptRate: keptRate ?? 0.5, // neutral when no commitments resolved yet
    costOfIndisciplineRatio: cost.costRatio,
  })

  const regimeTrades: RegimeTrade[] = trades.map((t) => ({ regime: t.regime, rMultiple: num(t.rMultiple), pnl: num(t.pnl) ?? 0 }))
  const regime = computeRegimePerformance(regimeTrades)

  return {
    hasData: total > 0,
    sampleSize: total,
    improvement,
    regime,
    indisciplineCost: cost.costAbs,
    keptRate,
    inputs: { disciplineRolling, expectancyR, commitmentKeptRate: keptRate ?? 0.5, costOfIndisciplineRatio: cost.costRatio },
  }
}
