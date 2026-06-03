import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import type { MonthlyReview } from "@/lib/generated/prisma/client"

type SerializedMonthlyReview = Omit<MonthlyReview, "createdAt" | "updatedAt"> & {
  createdAt: string
  updatedAt: string
}

function serializeMonthlyReview(r: MonthlyReview): SerializedMonthlyReview {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

const MonthlyReviewInput = z.object({
  year:         z.number().int().min(2000).max(2100),
  month:        z.number().int().min(1).max(12),
  summary:      z.string().default(""),
  keyThemes:    z.array(z.string().min(1).max(100)).max(20).default([]),
  goalsSet:     z.array(z.string().min(1).max(200)).max(20).default([]),
  goalsMet:     z.array(z.string().min(1).max(200)).max(20).default([]),
  overallScore: z.number().int().min(0).max(100).optional().nullable(),
  weeklyIds:    z.array(z.string().uuid()).default([]),
})

export const monthlyReviewsRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const reviews = await ctx.prisma.monthlyReview.findMany({
        where:   { userId: ctx.userId },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      })
      return reviews.map(serializeMonthlyReview)
    }),

  get: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const review = await ctx.prisma.monthlyReview.findFirst({
        where: { userId: ctx.userId, year: input.year, month: input.month },
      })
      return review ? serializeMonthlyReview(review) : null
    }),

  upsert: protectedProcedure
    .input(MonthlyReviewInput)
    .mutation(async ({ ctx, input }) => {
      const { year, month, ...data } = input
      const review = await ctx.prisma.monthlyReview.upsert({
        where:  { userId_year_month: { userId: ctx.userId, year, month } },
        create: { ...data, year, month, userId: ctx.userId },
        update: data,
      })
      return serializeMonthlyReview(review)
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(MonthlyReviewInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, year: _y, month: _m, ...data } = input
      const review = await ctx.prisma.monthlyReview.update({
        where: { id, userId: ctx.userId },
        data,
      })
      return serializeMonthlyReview(review)
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.monthlyReview.findFirst({
        where: { id: input, userId: ctx.userId },
      })
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Monthly review not found" })
      }
      await ctx.prisma.monthlyReview.delete({ where: { id: input, userId: ctx.userId } })
      return { ok: true }
    }),

  // Aggregate weekly reviews for the given month to suggest fields
  prefill: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const { year, month } = input
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd   = new Date(year, month, 1)   // exclusive

      const weeklyReviews = await ctx.prisma.weeklyReview.findMany({
        where: {
          userId:    ctx.userId,
          weekStart: { gte: monthStart, lt: monthEnd },
        },
        select: {
          id:              true,
          disciplineScore: true,
          whatWorked:      true,
          toImprove:       true,
          netPnl:          true,
          winRate:         true,
          tradeCount:      true,
        },
        orderBy: { weekStart: "asc" },
      })

      if (!weeklyReviews.length) {
        return {
          weeklyIds:    [],
          overallScore: null,
          keyThemes:    [],
          netPnl:       0,
          winRate:      0,
          tradeCount:   0,
        }
      }

      const totalNetPnl   = weeklyReviews.reduce((s, r) => s + r.netPnl.toNumber(), 0)
      const avgWinRate    = weeklyReviews.reduce((s, r) => s + r.winRate.toNumber(), 0) / weeklyReviews.length
      const totalTrades   = weeklyReviews.reduce((s, r) => s + r.tradeCount, 0)
      const scores        = weeklyReviews.map(r => r.disciplineScore).filter(s => s > 0)
      const avgScore      = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

      // Collect unique whatWorked / toImprove entries as theme suggestions
      const whatWorkedItems = weeklyReviews
        .map(r => r.whatWorked?.trim())
        .filter((s): s is string => Boolean(s))
        .slice(0, 5)

      return {
        weeklyIds:    weeklyReviews.map(r => r.id),
        overallScore: avgScore,
        keyThemes:    whatWorkedItems,
        netPnl:       parseFloat(totalNetPnl.toFixed(2)),
        winRate:      parseFloat(avgWinRate.toFixed(2)),
        tradeCount:   totalTrades,
      }
    }),
})
