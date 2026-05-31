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
})
