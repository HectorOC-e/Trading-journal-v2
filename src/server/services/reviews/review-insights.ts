// Deterministic insight cards scoped to a single review period. Reuses the
// Analytics intelligence engine (buildAnalyticsBundle + generateInsights) windowed
// to the week/month so review reports get the same typed cards (correlation /
// anomaly / opportunity …) as the /analytics page. Shared by the tRPC `insights`
// queries and the generateAnalysis / cron prompts (as detected signals).

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { buildAnalyticsBundle } from "@/domains/analytics/services/analytics-bundle"
import { generateInsights, type Insight } from "@/domains/analytics/services/insights-engine"
import type { ReviewPeriod } from "@/server/services/email/send-review"

function windowFor(period: ReviewPeriod): { from: Date; to: Date } {
  if (period.kind === "weekly") {
    const from = new Date(period.weekStart + "T00:00:00")
    const to = new Date(from); to.setDate(from.getDate() + 7) // exclusive upper bound
    return { from, to }
  }
  return { from: new Date(period.year, period.month - 1, 1), to: new Date(period.year, period.month, 1) }
}

export async function loadReviewInsights(prisma: PrismaClient, userId: string, period: ReviewPeriod): Promise<Insight[]> {
  return loadInsightsForWindow(prisma, userId, windowFor(period))
}

/**
 * Same engine as loadReviewInsights but for an arbitrary date window (e.g. the whole
 * history or a year/month range) — used by the Reviews "Trayectoria" recurring-pattern
 * cards. `to` is an exclusive upper bound.
 */
export async function loadInsightsForWindow(prisma: PrismaClient, userId: string, window: { from: Date; to: Date }): Promise<Insight[]> {
  // includePractice=true to match the review report, which counts all closed trades.
  const bundle = await buildAnalyticsBundle(userId, prisma, window, true)
  return generateInsights({
    trades:      bundle.raw.trades,
    setups:      bundle.raw.setupsMeta,
    accounts:    bundle.raw.accountsMeta,
    withdrawals: bundle.raw.withdrawals,
  })
}

// ── Phase 3: rich "/analytics-scoped-to-the-period" slice for the report page ──
export interface ReviewAnalytics {
  expectancy:  number
  avgR:        number
  avgWin:      number
  avgLoss:     number
  equityCurve: { date: string; balance: number }[]
  markets:     { symbol: string; netPnl: number; trades: number; winRate: number }[]
  byEmotion:   { emotion: string; trades: number; avgPnl: number; winRate: number }[]
}

export async function loadReviewAnalytics(prisma: PrismaClient, userId: string, period: ReviewPeriod): Promise<ReviewAnalytics> {
  const b = await buildAnalyticsBundle(userId, prisma, windowFor(period), true)
  return {
    expectancy:  b.performance.expectancy,
    avgR:        b.performance.avgR,
    avgWin:      b.performance.avgWin,
    avgLoss:     b.performance.avgLoss,
    equityCurve: b.risk.equityCurve,
    markets:     b.markets.slice(0, 8).map(m => ({ symbol: m.symbol, netPnl: m.netPnl, trades: m.trades, winRate: m.winRate })),
    byEmotion:   b.psychology.byEmotion.slice(0, 6).map(e => ({ emotion: e.emotion, trades: e.trades, avgPnl: e.avgPnl, winRate: e.winRate })),
  }
}
