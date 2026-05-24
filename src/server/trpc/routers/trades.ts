import { z } from "zod"
import { router, protectedProcedure } from "../init"
import type { Prisma } from "@/lib/generated/prisma/client"
import { calcExpectancyR, calcProfitFactor } from "@/lib/formulas"

type RawAccount = Prisma.AccountGetPayload<Record<string, never>>
type RawTrade   = Prisma.TradeGetPayload<{
  include: { account: true; setup: true; events: true }
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
    entry:      Number(t.entry),
    stop:       Number(t.stop),
    target:     Number(t.target),
    size:       Number(t.size),
    pnl:        t.pnl        != null ? Number(t.pnl)        : null,
    rMultiple:  t.rMultiple  != null ? Number(t.rMultiple)  : null,
    closePrice: t.closePrice != null ? Number(t.closePrice) : null,
    commission: t.commission != null ? Number(t.commission) : null,
    date:       (t.date as Date).toISOString().slice(0, 10),
    createdAt:  t.createdAt.toISOString(),
    updatedAt:  t.updatedAt.toISOString(),
    account:    t.account ? serializeAccount(t.account) : null,
    setup:      t.setup
      ? {
          ...t.setup,
          createdAt: t.setup.createdAt.toISOString(),
          updatedAt: t.setup.updatedAt.toISOString(),
        }
      : null,
    events: t.events?.map(e => ({
      ...e,
      price:     e.price     != null ? Number(e.price)     : null,
      contracts: e.contracts != null ? Number(e.contracts) : null,
      timestamp: e.timestamp.toISOString(),
    })) ?? [],
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
        include: {
          account: true,
          setup: true,
          events: { orderBy: { timestamp: "asc" } },
        },
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
      pnl:            z.number().optional(),
      closePrice:     z.number().optional(),
      closeTime:      z.string().optional(),
      commission:     z.number().optional(),
      status:         z.enum(["OPEN", "CLOSED", "CANCELLED"]).default("OPEN"),
    }))
    .mutation(async ({ ctx, input }) => {
      const trade = await ctx.prisma.trade.create({
        data: { ...input, userId: ctx.userId, date: new Date(input.date) },
        include: { account: true, setup: true, events: true },
      })

      // Persist the opening state as the first immutable event
      await ctx.prisma.tradeEvent.create({
        data: {
          userId:    ctx.userId,
          tradeId:   trade.id,
          type:      "OPEN",
          price:     input.entry,
          contracts: input.size,
          notes:     `${input.direction} · SL ${input.stop} · TP ${input.target}`,
          timestamp: new Date(`${input.date}T${input.openTime}:00`),
        },
      })

      // Re-fetch with the new event included
      const full = await ctx.prisma.trade.findUniqueOrThrow({
        where:   { id: trade.id },
        include: { account: true, setup: true, events: { orderBy: { timestamp: "asc" } } },
      })
      return serializeTrade(full)
    }),

  update: protectedProcedure
    .input(z.object({
      id:             z.string().uuid(),
      notes:          z.string().optional(),
      tags:           z.array(z.string()).optional(),
      pnl:            z.number().optional(),
      rMultiple:      z.number().optional(),
      screenshotUrls: z.array(z.string()).optional(),
      entry:          z.number().optional(),
      stop:           z.number().optional(),
      target:         z.number().optional(),
      size:           z.number().optional(),
      session:        z.string().optional(),
      setupId:        z.string().uuid().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const trade = await ctx.prisma.trade.update({
        where: { id, userId: ctx.userId },
        data,
        include: { account: true, setup: true, events: true },
      })
      return serializeTrade(trade)
    }),

  close: protectedProcedure
    .input(z.object({
      id:         z.string().uuid(),
      closePrice: z.number(),
      closeTime:  z.string().optional(),
      commission: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const trade = await ctx.prisma.trade.findUniqueOrThrow({
        where: { id: input.id, userId: ctx.userId },
      })
      const entry   = Number(trade.entry)
      const size    = Number(trade.size)
      const rawPnl  = trade.direction === "LONG"
        ? (input.closePrice - entry) * size
        : (entry - input.closePrice) * size
      const risk      = Math.abs(entry - Number(trade.stop)) * size
      const rMultiple = risk > 0 ? rawPnl / risk : null
      const netPnl    = rawPnl - input.commission
      const updated = await ctx.prisma.trade.update({
        where: { id: input.id, userId: ctx.userId },
        data: {
          status:     "CLOSED",
          closePrice: input.closePrice,
          closeTime:  input.closeTime,
          commission: input.commission,
          pnl:        netPnl,
          rMultiple:  rMultiple,
        },
        include: { account: true, setup: true, events: true },
      })
      return serializeTrade(updated)
    }),

  addEvent: protectedProcedure
    .input(z.object({
      tradeId:   z.string().uuid(),
      type:      z.enum(["STOP_MOVE", "TRAIL_STOP", "TAKE_PROFIT_MOVE", "PARTIAL_CLOSE", "SCALE_IN", "NOTE"]),
      price:     z.number().optional(),
      contracts: z.number().optional(),
      notes:     z.string().default(""),
      timestamp: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const trade = await ctx.prisma.trade.findUniqueOrThrow({
        where: { id: input.tradeId, userId: ctx.userId },
        include: { account: true },
      })

      const tradeUpdate: Record<string, unknown> = {}

      if ((input.type === "STOP_MOVE" || input.type === "TRAIL_STOP") && input.price != null) {
        tradeUpdate.stop = input.price
      }

      if (input.type === "TAKE_PROFIT_MOVE" && input.price != null) {
        tradeUpdate.target = input.price
      }

      if (input.type === "SCALE_IN" && input.price != null && input.contracts != null) {
        const oldSize     = Number(trade.size)
        const newSize     = oldSize + input.contracts
        const newAvgEntry = newSize > 0
          ? (Number(trade.entry) * oldSize + input.price * input.contracts) / newSize
          : Number(trade.entry)
        tradeUpdate.entry = newAvgEntry
        tradeUpdate.size  = newSize
      }

      if (input.type === "PARTIAL_CLOSE" && input.contracts != null) {
        tradeUpdate.size = Math.max(0, Number(trade.size) - input.contracts)
      }

      if (Object.keys(tradeUpdate).length > 0) {
        await ctx.prisma.trade.update({
          where: { id: input.tradeId, userId: ctx.userId },
          data:  tradeUpdate,
        })
      }

      return ctx.prisma.tradeEvent.create({
        data: {
          userId:    ctx.userId,
          tradeId:   input.tradeId,
          type:      input.type,
          price:     input.price,
          contracts: input.contracts,
          notes:     input.notes,
          timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
        },
      })
    }),

  stats: protectedProcedure
    .input(z.object({
      accountId: z.string().uuid().optional(),
      setupId:   z.string().uuid().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const trades = await ctx.prisma.trade.findMany({
        where: {
          userId: ctx.userId,
          status: "CLOSED",
          ...(input?.accountId && { accountId: input.accountId }),
          ...(input?.setupId   && { setupId:   input.setupId }),
        },
        select: { pnl: true, rMultiple: true, tags: true, date: true, accountId: true, setupId: true },
      })

      const total = trades.length
      if (total === 0) return { total: 0, wins: 0, losses: 0, be: 0, winRate: 0, avgR: 0, netPnl: 0, pnlMonth: 0, expectancy: 0, aplusRate: 0, profitFactor: 0 }

      const wins      = trades.filter(t => Number(t.pnl ?? 0) > 0).length
      const losses    = trades.filter(t => Number(t.pnl ?? 0) < 0).length
      const be        = total - wins - losses
      const winRate   = Math.round((wins / total) * 100)
      const netPnl    = trades.reduce((s: number, t) => s + Number(t.pnl ?? 0), 0)

      // avgR: only trades with a recorded rMultiple contribute (excludes open trades)
      const closedWithR = trades.filter(t => t.rMultiple != null)
      const avgR = closedWithR.length > 0
        ? closedWithR.reduce((s: number, t) => s + Number(t.rMultiple!), 0) / closedWithR.length
        : 0

      const grossWin  = trades.filter(t => Number(t.pnl ?? 0) > 0).reduce((s: number, t) => s + Number(t.pnl ?? 0), 0)
      const grossLoss = Math.abs(trades.filter(t => Number(t.pnl ?? 0) < 0).reduce((s: number, t) => s + Number(t.pnl ?? 0), 0))
      const profitFactor = calcProfitFactor(grossWin, grossLoss)

      // Expectancy in R: uses real avgWinR and avgLossR from closed trades
      const expectancy = calcExpectancyR(
        trades.map(t => ({ rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null, pnl: t.pnl != null ? Number(t.pnl) : null }))
      )

      const aplusTrades = trades.filter(t => (t.tags as string[]).includes("A+")).length
      const aplusRate   = Math.round((aplusTrades / total) * 100)
      const now         = new Date()
      const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const pnlMonth    = trades
        .filter(t => (t.date as Date).toISOString().slice(0, 10) >= monthStart)
        .reduce((s: number, t) => s + Number(t.pnl ?? 0), 0)

      return { total, wins, losses, be, winRate, avgR, netPnl, pnlMonth, expectancy, aplusRate, profitFactor }
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.trade.delete({ where: { id: input, userId: ctx.userId } })
    }),
})
