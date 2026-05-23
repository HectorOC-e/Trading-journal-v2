import { z } from "zod"
import { router, protectedProcedure } from "../init"

const AccountInput = z.object({
  name:             z.string().min(1),
  broker:           z.string().min(1),
  type:             z.enum(["PERSONAL", "PROP_FIRM", "DEMO", "QA"]),
  initialBalance:   z.number().default(0),
  currency:         z.string().default("USD"),
  timezone:         z.string().default("America/New_York"),
  ddDailyPct:       z.number().optional(),
  ddWeeklyPct:      z.number().optional(),
  ddMonthlyPct:     z.number().optional(),
  ddTotalPct:       z.number().optional(),
  targetPct:        z.number().optional(),
  ddModel:          z.enum(["FIXED", "TRAILING"]).optional(),
  phase:            z.enum(["PHASE_1", "PHASE_2", "FUNDED", "NONE"]).optional(),
  maxTradesPerDay:  z.number().int().optional(),
  allowedSymbols:   z.array(z.string()).default([]),
  minTradingDays:   z.number().int().optional(),
})

export const accountsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.account.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "asc" },
    })
  ),

  create: protectedProcedure
    .input(AccountInput)
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.create({
        data: { ...input, userId: ctx.userId },
      })
      await ctx.prisma.accountLog.create({
        data: {
          userId:    ctx.userId,
          accountId: account.id,
          event:     "CREATED",
          payload:   { name: account.name, type: account.type, initialBalance: Number(account.initialBalance) },
        },
      })
      return account
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(AccountInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.account.update({ where: { id, userId: ctx.userId }, data })
    }),

  changePhase: protectedProcedure
    .input(z.object({
      id:    z.string().uuid(),
      phase: z.enum(["PHASE_1", "PHASE_2", "FUNDED", "NONE"]),
      note:  z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const prev = await ctx.prisma.account.findUniqueOrThrow({
        where: { id: input.id, userId: ctx.userId },
        select: { phase: true },
      })
      const account = await ctx.prisma.account.update({
        where: { id: input.id, userId: ctx.userId },
        data:  { phase: input.phase },
      })
      await ctx.prisma.accountLog.create({
        data: {
          userId:    ctx.userId,
          accountId: input.id,
          event:     "PHASE_CHANGE",
          payload:   { from: prev.phase, to: input.phase, note: input.note ?? "" },
        },
      })
      return account
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.account.delete({ where: { id: input, userId: ctx.userId } })
    ),
})
