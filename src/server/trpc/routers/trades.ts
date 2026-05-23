import { z } from "zod"
import { router, protectedProcedure } from "../init"
import type { Prisma } from "@/lib/generated/prisma/client"

type RawAccount = Prisma.AccountGetPayload<Record<string, never>>
type RawTrade   = Prisma.TradeGetPayload<{
  include: { account: true; setup: true }
}>

function serializeAccount(a: RawAccount) {
  return {
    ...a,
    initialBalance: Number(a.initialBalance),
    ddDailyPct:     a.ddDailyPct  != null ? Number(a.ddDailyPct)  : null,
    ddWeeklyPct:    a.ddWeeklyPct != null ? Number(a.ddWeeklyPct) : null,
    ddMonthlyPct:   a.ddMonthlyPct!= null ? Number(a.ddMonthlyPct): null,
    ddTotalPct:     a.ddTotalPct  != null ? Number(a.ddTotalPct)  : null,
    targetPct:      a.targetPct   != null ? Number(a.targetPct)   : null,
    createdAt:      a.createdAt.toISOString(),
    updatedAt:      a.updatedAt.toISOString(),
  }
}

function serializeTrade(t: RawTrade) {
  return {
    ...t,
    entry:     Number(t.entry),
    stop:      Number(t.stop),
    target:    Number(t.target),
    size:      Number(t.size),
    pnl:       t.pnl       != null ? Number(t.pnl)       : null,
    rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null,
    date:      (t.date as Date).toISOString().slice(0, 10),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    account:   t.account ? serializeAccount(t.account) : null,
    setup:     t.setup
      ? {
          ...t.setup,
          createdAt: t.setup.createdAt.toISOString(),
          updatedAt: t.setup.updatedAt.toISOString(),
        }
      : null,
  }
}

export type SerializedTrade = ReturnType<typeof serializeTrade>

export const tradesRouter = router({
  list: protectedProcedure
    .input(z.object({
      accountId: z.string().uuid().optional(),
      setupId:   z.string().uuid().optional(),
      from:      z.string().optional(),
      to:        z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const trades = await ctx.prisma.trade.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.accountId && { accountId: input.accountId }),
          ...(input?.setupId   && { setupId:   input.setupId }),
          ...((input?.from || input?.to) ? {
            date: {
              ...(input?.from && { gte: new Date(input.from) }),
              ...(input?.to   && { lte: new Date(input.to)   }),
            }
          } : {}),
        },
        include: { account: true, setup: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      })
      return trades.map(serializeTrade)
    }),

  create: protectedProcedure
    .input(z.object({
      accountId:      z.string().uuid(),
      setupId:        z.string().uuid().optional(),
      direction:      z.enum(["LONG", "SHORT"]),
      symbol:         z.string().min(1),
      entry:          z.number(),
      stop:           z.number(),
      target:         z.number(),
      size:           z.number().positive(),
      date:           z.string(),
      openTime:       z.string(),
      session:        z.enum(["London", "New York", "Asia", "London Close"]),
      tags:           z.array(z.string()).default([]),
      notes:          z.string().default(""),
      screenshotUrls: z.array(z.string()).default([]),
      rMultiple:      z.number().optional(),
      pnl:            z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const trade = await ctx.prisma.trade.create({
        data: { ...input, userId: ctx.userId, date: new Date(input.date) },
        include: { account: true, setup: true },
      })
      return serializeTrade(trade)
    }),

  update: protectedProcedure
    .input(z.object({
      id:             z.string().uuid(),
      notes:          z.string().optional(),
      tags:           z.array(z.string()).optional(),
      pnl:            z.number().optional(),
      rMultiple:      z.number().optional(),
      screenshotUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const trade = await ctx.prisma.trade.update({
        where: { id, userId: ctx.userId },
        data,
        include: { account: true, setup: true },
      })
      return serializeTrade(trade)
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.trade.delete({ where: { id: input, userId: ctx.userId } })
    }),
})
