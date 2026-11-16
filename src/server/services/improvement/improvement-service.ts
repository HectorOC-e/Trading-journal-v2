// ─────────────────────────────────────────────────────────────────────────────
// Improvement service (S14) — the North Star. Aggregates the four drivers
// (discipline, expectancy, commitment-kept, cost of indiscipline) into the
// ImprovementScore (#41) and the per-regime performance (#33). Real accounts only
// (practice money never inflates the score). Read-only, deterministic (P2).
// ─────────────────────────────────────────────────────────────────────────────

import { fxFactor, hasFxConversion, parseFxRates } from "@/lib/fx"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import {
  computeImprovementScore, costOfIndiscipline, type ImprovementResult,
} from "@/domains/analytics/improvement/improvement-score"
import { computeRegimePerformance, type RegimePerformanceResult, type RegimeTrade } from "@/domains/analytics/regime/regime-performance"
import type { OperationalMode } from "@/domains/trading/operational-mode"
import { scopedTradeWhere } from "@/server/services/trades/operational-scope"

const num = (v: { toString(): string } | null | undefined): number | null => (v == null ? null : Number(v))
const OFF_PLAN_TAGS = new Set(["Off-plan", "Impulsivo"])

export interface ImprovementOverview {
  excludedCurrencies: string[]
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

export async function getImprovement(prisma: PrismaClient, userId: string, mode: OperationalMode = "REAL"): Promise<ImprovementOverview> {
  const scope = await scopedTradeWhere(prisma, userId, { mode, includeArchived: true })

  const [trades, commitments, user] = await Promise.all([
    prisma.trade.findMany({
      where: { ...scope, status: "CLOSED" },
      select: { account: { select: { currency: true } }, pnl: true, rMultiple: true, tags: true, regime: true, revengeFlag: true, fomoFlag: true },
    }),
    prisma.commitment.findMany({
      where: { userId, operationalMode: mode, status: { in: ["kept", "partial", "broken", "expired"] } },
      select: { status: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { baseCurrency: true, fxRates: true } }),
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

  const baseCurrency = user?.baseCurrency ?? "USD"
  const rates = parseFxRates(user?.fxRates)
  const excludedCurrencies = [...new Set(trades.filter(t => !hasFxConversion(t.account.currency, baseCurrency, rates)).map(t => t.account.currency))].sort()
  const monetaryTrades = trades.filter(t => hasFxConversion(t.account.currency, baseCurrency, rates))
  const money = (t: (typeof trades)[number]) => (num(t.pnl) ?? 0) * fxFactor(t.account.currency, baseCurrency, rates)
  const cost = costOfIndiscipline(monetaryTrades.map((t) => ({ pnl: money(t), offPlan: isOffPlan(t) })))

  const improvement = computeImprovementScore({
    disciplineRolling,
    expectancyR,
    commitmentKeptRate: keptRate ?? 0.5, // neutral when no commitments resolved yet
    costOfIndisciplineRatio: cost.costRatio,
  })

  const regimeTrades: RegimeTrade[] = monetaryTrades.map((t) => ({ regime: t.regime, rMultiple: num(t.rMultiple), pnl: money(t) }))
  const regime = computeRegimePerformance(regimeTrades)

  return {
    excludedCurrencies,
    hasData: total > 0,
    sampleSize: total,
    improvement,
    regime,
    indisciplineCost: cost.costAbs,
    keptRate,
    inputs: { disciplineRolling, expectancyR, commitmentKeptRate: keptRate ?? 0.5, costOfIndisciplineRatio: cost.costRatio },
  }
}
