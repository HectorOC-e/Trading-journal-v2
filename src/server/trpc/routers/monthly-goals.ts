import { z } from "zod"
import { router, protectedProcedure } from "../init"

const STATUS = z.enum(["pending", "partial", "done"])

/**
 * Monthly "commitments" (goals) — rich, recurring, hybrid-evaluated. The user owns the
 * text + final status; the AI proposes statuses for unconfirmed ones (see the monthly
 * report resolver / cron finalizer). Setting a status here marks the goal user-confirmed.
 */
export const monthlyGoalsRouter = router({
  list: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
    .query(({ ctx, input }) =>
      ctx.prisma.monthlyGoal.findMany({
        where: { userId: ctx.userId, year: input.year, month: input.month },
        orderBy: { sortOrder: "asc" },
      }),
    ),

  add: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12), text: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.prisma.monthlyGoal.count({ where: { userId: ctx.userId, year: input.year, month: input.month } })
      return ctx.prisma.monthlyGoal.create({
        data: { userId: ctx.userId, year: input.year, month: input.month, text: input.text, sortOrder: count },
      })
    }),

  updateText: protectedProcedure
    .input(z.object({ id: z.string().uuid(), text: z.string().min(1).max(200) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.monthlyGoal.update({ where: { id: input.id, userId: ctx.userId }, data: { text: input.text } }),
    ),

  // User sets/overrides a status → confirmed, so the AI evaluator won't change it.
  setStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid(), status: STATUS, note: z.string().max(300).optional() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.monthlyGoal.update({
        where: { id: input.id, userId: ctx.userId },
        data: { status: input.status, userConfirmed: true, ...(input.note !== undefined ? { note: input.note } : {}) },
      }),
    ),

  remove: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.monthlyGoal.delete({ where: { id: input, userId: ctx.userId } })
      return { ok: true }
    }),

  // Seed this month's goals by carrying forward the previous month's (status reset),
  // only when the month has none yet. Returns the resulting goals.
  carryForward: protectedProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.monthlyGoal.count({ where: { userId: ctx.userId, year: input.year, month: input.month } })
      if (existing === 0) {
        const prevMonth = input.month === 1 ? 12 : input.month - 1
        const prevYear  = input.month === 1 ? input.year - 1 : input.year
        const prev = await ctx.prisma.monthlyGoal.findMany({
          where: { userId: ctx.userId, year: prevYear, month: prevMonth },
          orderBy: { sortOrder: "asc" },
        })
        if (prev.length > 0) {
          await ctx.prisma.monthlyGoal.createMany({
            data: prev.map((g, i) => ({ userId: ctx.userId, year: input.year, month: input.month, text: g.text, sortOrder: i })),
          })
        }
      }
      return ctx.prisma.monthlyGoal.findMany({
        where: { userId: ctx.userId, year: input.year, month: input.month },
        orderBy: { sortOrder: "asc" },
      })
    }),
})
