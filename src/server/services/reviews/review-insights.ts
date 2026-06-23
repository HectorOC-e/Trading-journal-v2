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
  // includePractice=true to match the review report, which counts all closed trades.
  const bundle = await buildAnalyticsBundle(userId, prisma, windowFor(period), true)
  return generateInsights({
    trades:      bundle.raw.trades,
    setups:      bundle.raw.setupsMeta,
    accounts:    bundle.raw.accountsMeta,
    withdrawals: bundle.raw.withdrawals,
  })
}
