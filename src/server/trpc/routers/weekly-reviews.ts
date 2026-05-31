import { z } from "zod"
import { router, protectedProcedure } from "../init"
import type { WeeklyReview } from "@/lib/generated/prisma/client"
import { VIOLATION_TAGS } from "@/types"

const WeeklyReviewInput = z.object({
  accountId:        z.string().uuid().optional().nullable(),
  weekLabel:        z.string().min(1),
  weekRange:        z.string().min(1),
  weekStart:        z.string().datetime({ offset: true }).or(z.string().date()),
  weekEnd:          z.string().datetime({ offset: true }).or(z.string().date()),
  tradeCount:       z.number().int().min(0).default(0),
  netPnl:           z.number().default(0),
  winRate:          z.number().min(0).max(100).default(0),
  disciplineScore:  z.number().int().min(0).max(100).default(0),
  executiveSummary: z.string().default(""),
  whatWorked:       z.string().default(""),
  toImprove:        z.string().default(""),
  status:           z.enum(["draft", "submitted"]).default("draft"),
})

type SerializedReview = Omit<
  WeeklyReview,
  "netPnl" | "winRate" | "weekStart" | "weekEnd" | "createdAt" | "updatedAt"
> & {
  netPnl:    number
  winRate:   number
  weekStart: string
  weekEnd:   string
  createdAt: string
  updatedAt: string
}

function serializeReview(r: WeeklyReview): SerializedReview {
  return {
    ...r,
    netPnl:    r.netPnl.toNumber(),
    winRate:   r.winRate.toNumber(),
    weekStart: r.weekStart.toISOString().slice(0, 10),
    weekEnd:   r.weekEnd.toISOString().slice(0, 10),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export const weeklyReviewsRouter = router({
  list: protectedProcedure
    .input(z.object({ accountId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const reviews = await ctx.prisma.weeklyReview.findMany({
        where: {
          userId:    ctx.userId,
          ...(input?.accountId ? { accountId: input.accountId } : {}),
        },
        orderBy: { weekStart: "desc" },
      })
      return reviews.map(serializeReview)
    }),

  getByWeek: protectedProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.weeklyReview.findFirst({
        where: { userId: ctx.userId, weekStart: new Date(input.weekStart) },
      })
    ),

  create: protectedProcedure
    .input(WeeklyReviewInput)
    .mutation(({ ctx, input }) =>
      ctx.prisma.weeklyReview.create({
        data: {
          ...input,
          weekStart: new Date(input.weekStart),
          weekEnd:   new Date(input.weekEnd),
          userId:    ctx.userId,
        },
      })
    ),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(WeeklyReviewInput.partial()))
    .mutation(({ ctx, input }) => {
      const { id, weekStart, weekEnd, ...rest } = input
      return ctx.prisma.weeklyReview.update({
        where: { id, userId: ctx.userId },
        data: {
          ...rest,
          ...(weekStart ? { weekStart: new Date(weekStart) } : {}),
          ...(weekEnd   ? { weekEnd:   new Date(weekEnd)   } : {}),
        },
      })
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.weeklyReview.delete({ where: { id: input, userId: ctx.userId } })
    ),

  computedDisciplineScore: protectedProcedure
    .input(z.object({ weekStart: z.string(), weekEnd: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId    = ctx.userId
      const weekStart = new Date(input.weekStart)
      const weekEnd   = new Date(input.weekEnd)

      const [trades, reviews, pendingReviews] = await Promise.all([
        ctx.prisma.trade.findMany({
          where:  { userId, date: { gte: weekStart, lte: weekEnd }, status: "CLOSED" },
          select: { tags: true },
        }),
        ctx.prisma.resourceReview.findMany({
          where:  { userId, createdAt: { gte: weekStart, lte: weekEnd } },
          select: { id: true },
        }),
        ctx.prisma.learningResource.count({
          where: {
            userId,
            nextReviewAt: { lte: weekStart },
            status: { notIn: ["ABANDONED", "MASTERED"] },
          },
        }),
      ])

      const violating  = trades.filter(t => (t.tags as string[]).some(tag => VIOLATION_TAGS.includes(tag as typeof VIOLATION_TAGS[number])))
      const execution  = trades.length > 0 ? (trades.length - violating.length) / trades.length : 1
      const learning   = pendingReviews > 0 ? Math.min(1, reviews.length / pendingReviews) : 1
      const adherence  = violating.length === 0 ? 1 : Math.max(0, 1 - violating.length / trades.length)

      return {
        score: Math.round(execution * 50 + learning * 30 + adherence * 20),
        breakdown: {
          execution:  Math.round(execution * 50),
          learning:   Math.round(learning * 30),
          adherence:  Math.round(adherence * 20),
        },
        detail: {
          tradeCount:      trades.length,
          violatingTrades: violating.length,
          reviewsDone:     reviews.length,
          pendingReviews,
        },
      }
    }),

  // T-IX-004: Auto pre-fill data for a new weekly review
  prefill: protectedProcedure
    .input(z.object({
      weekStart: z.string(),
      weekEnd:   z.string(),
      accountId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId
      const from   = new Date(input.weekStart)
      const to     = new Date(input.weekEnd)
      to.setDate(to.getDate() + 1) // make end inclusive

      const [trades, computedScore] = await Promise.all([
        ctx.prisma.trade.findMany({
          where: {
            userId,
            status: "CLOSED",
            ...(input.accountId ? { accountId: input.accountId } : {}),
            date: { gte: from, lt: to },
          },
          select: { pnl: true, rMultiple: true, setupId: true, tags: true },
        }),
        // Compute discipline score inline (same formula as computedDisciplineScore)
        (async () => {
          const [violations, reviews, pending] = await Promise.all([
            ctx.prisma.trade.findMany({
              where:  { userId, date: { gte: from, lt: to }, status: "CLOSED" },
              select: { tags: true },
            }),
            ctx.prisma.resourceReview.findMany({
              where:  { userId, createdAt: { gte: from, lt: to } },
              select: { id: true },
            }),
            ctx.prisma.learningResource.count({
              where: {
                userId,
                nextReviewAt: { lte: from },
                status: { notIn: ["ABANDONED", "MASTERED"] },
              },
            }),
          ])
          const violCount = violations.filter(t =>
            (t.tags as string[]).some(tag => VIOLATION_TAGS.includes(tag as typeof VIOLATION_TAGS[number]))
          ).length
          const totTrades = violations.length
          const execution = totTrades > 0 ? (totTrades - violCount) / totTrades : 1
          const learning  = pending > 0 ? Math.min(1, reviews.length / pending) : 1
          const adherence = violCount === 0 ? 1 : Math.max(0, 1 - violCount / Math.max(totTrades, 1))
          return { score: Math.round(execution * 50 + learning * 30 + adherence * 20) }
        })(),
      ])

      const tradeCount = trades.length
      const netPnl     = parseFloat(trades.reduce((s, t) => s + Number(t.pnl ?? 0), 0).toFixed(2))
      const wins       = trades.filter(t => Number(t.pnl ?? 0) > 0).length
      const winRate    = tradeCount > 0 ? parseFloat((wins / tradeCount * 100).toFixed(2)) : 0

      // Find best and worst setup by total P&L
      const bySetup: Record<string, number> = {}
      for (const t of trades) {
        if (!t.setupId) continue
        bySetup[t.setupId] = (bySetup[t.setupId] ?? 0) + Number(t.pnl ?? 0)
      }
      const setupEntries = Object.entries(bySetup)
      const topSetupId   = setupEntries.length > 0
        ? setupEntries.reduce((a, b) => b[1] > a[1] ? b : a)[0]
        : null
      const worstSetupId = setupEntries.length > 0
        ? setupEntries.reduce((a, b) => b[1] < a[1] ? b : a)[0]
        : null

      return {
        tradeCount,
        netPnl,
        winRate,
        disciplineScore: computedScore.score,
        topSetupId,
        worstSetupId,
      }
    }),
})
