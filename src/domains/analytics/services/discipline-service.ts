import { calcDisciplineScore, type DisciplineBreakdown } from "@/lib/formulas/discipline"
import { VIOLATION_TAGS } from "@/types"
import type { PrismaClient } from "@/lib/generated/prisma/client"

export interface DisciplineDetail {
  tradeCount:      number
  violatingTrades: number
  reviewsDone:     number
  pendingReviews:  number
  enabledRules:    number
}

export interface DisciplineResult extends DisciplineBreakdown {
  detail: DisciplineDetail
}

interface DisciplinePeriod {
  from: Date
  to:   Date
}

/**
 * Compute discipline score for a user over a given period.
 * Single source of truth for aggregation — replaces inline implementations
 * in weekly-reviews.ts (computedDisciplineScore + prefill).
 *
 * Fetches all required parameters in parallel (4 queries), then delegates
 * computation to calcDisciplineScore() from lib/formulas/discipline.ts.
 */
export async function computeDisciplineScore(
  prisma: PrismaClient,
  userId: string,
  period: DisciplinePeriod,
  accountId?: string,
): Promise<DisciplineResult> {
  const { from, to } = period

  const [trades, reviews, pendingReviews, rules] = await Promise.all([
    prisma.trade.findMany({
      where: {
        userId,
        status: "CLOSED",
        date:   { gte: from, lt: to },
        ...(accountId ? { accountId } : {}),
      },
      select: { tags: true },
    }),
    prisma.resourceReview.findMany({
      where:  { userId, createdAt: { gte: from, lt: to } },
      select: { id: true },
    }),
    prisma.learningResource.count({
      where: {
        userId,
        nextReviewAt: { lte: from },
        status:       { notIn: ["ABANDONED", "MASTERED"] },
      },
    }),
    prisma.rule.findMany({
      where:  { userId, enabled: true },
      select: { id: true },
    }),
  ])

  const violatingTrades = trades.filter(t =>
    (t.tags as string[]).some(tag =>
      VIOLATION_TAGS.includes(tag as typeof VIOLATION_TAGS[number])
    )
  ).length

  const params = {
    totalTrades:       trades.length,
    taggedViolations:  violatingTrades,
    pendingReviews,
    completedReviews:  reviews.length,
    totalEnabledRules: rules.length,
    // Proxy: each behavioral violation maps to one rule broken.
    // Capped at rule count — when per-rule tracking is added, replace this.
    violatedRules: Math.min(violatingTrades, rules.length),
  }

  const breakdown = calcDisciplineScore(params)

  return {
    ...breakdown,
    detail: {
      tradeCount:      trades.length,
      violatingTrades,
      reviewsDone:     reviews.length,
      pendingReviews,
      enabledRules:    rules.length,
    },
  }
}
