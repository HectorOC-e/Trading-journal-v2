import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { computeSetupStats, computeSessionMatrix, computeDirectionBreakdown } from "@/domains/analytics/services/setup-analytics"
import type { MinimalTrade } from "@/domains/analytics/services/dashboard-analytics"
import type { DirectionStats } from "@/domains/analytics/services/setup-analytics"

const PeriodEnum = z.enum(["1M", "3M", "6M", "1Y", "ALL"])

const SETUP_STATUSES = ["ACTIVO", "EN_PRUEBA", "PAUSADO", "DESCARTADO"] as const

const SetupInput = z.object({
  name:              z.string().min(1),
  abbreviation:      z.string().min(1).max(4),
  market:            z.string().default(""),
  direction:         z.enum(["LONG", "SHORT", "AMBAS"]).default("AMBAS"),
  status:            z.enum(SETUP_STATUSES).default("ACTIVO"),
  description:       z.string().default(""),
  color:             z.string().default("#4f6ef7"),
  images:            z.array(z.string()).default([]),
  aplusChecklist:    z.array(z.string()).default([]),
  standardChecklist: z.array(z.string()).default([]),
})

export const setupsRouter = router({
  list: protectedProcedure
    .input(z.object({
      market:          z.string().optional(),
      status:          z.enum(SETUP_STATUSES).optional(),
      includeDiscarded: z.boolean().default(false),
    }).optional())
    .query(({ ctx, input }) =>
      ctx.prisma.setup.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.market ? { market: input.market } : {}),
          ...(input?.status
            ? { status: input.status }
            : input?.includeDiscarded
              ? {}
              : { status: { not: "DESCARTADO" } }
          ),
        },
        orderBy: [{ status: "asc" }, { name: "asc" }],
      })
    ),

  create: protectedProcedure
    .input(SetupInput)
    .mutation(({ ctx, input }) =>
      ctx.prisma.setup.create({
        data: { ...input, userId: ctx.userId },
      })
    ),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(SetupInput.partial()))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.setup.update({
        where: { id, userId: ctx.userId },
        data,
      })
    }),

  setStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(SETUP_STATUSES) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.setup.update({
        where: { id: input.id, userId: ctx.userId },
        data:  { status: input.status },
      })
    ),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.setup.delete({ where: { id: input, userId: ctx.userId } })
    ),

  performanceStats: protectedProcedure
    .input(z.object({
      setupId: z.string().uuid().optional(),
      period:  PeriodEnum.optional().default("ALL"),
    }).optional())
    .query(async ({ ctx, input }) => {
      const period   = input?.period ?? "ALL"
      const periodDays: Record<string, number | null> = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "ALL": null }
      const days     = periodDays[period]
      const fromDate = days != null ? new Date(Date.now() - days * 86_400_000) : undefined

      const [setupRows, tradeRows] = await Promise.all([
        ctx.prisma.setup.findMany({
          where: { userId: ctx.userId, status: { not: "DESCARTADO" } },
          select: { id: true, name: true, abbreviation: true, color: true },
          orderBy: [{ status: "asc" }, { name: "asc" }],
        }),
        ctx.prisma.trade.findMany({
          where: {
            userId: ctx.userId,
            status: "CLOSED",
            setupId: input?.setupId ?? { not: null },
            ...(fromDate ? { date: { gte: fromDate } } : {}),
          },
          select: {
            id: true, accountId: true, symbol: true, direction: true,
            session: true, openTime: true, closeTime: true,
            pnl: true, rMultiple: true, tags: true, date: true,
            setupId: true, entry: true, stop: true, target: true, size: true,
          },
          orderBy: [{ date: "asc" }],
        }),
      ])

      const trades: MinimalTrade[] = tradeRows.map(t => ({
        id:        t.id,
        accountId: t.accountId,
        symbol:    t.symbol,
        direction: t.direction,
        session:   t.session as string | null,
        openTime:  t.openTime as string | null,
        closeTime: t.closeTime as string | null,
        pnl:       t.pnl       != null ? Number(t.pnl)       : 0,
        rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null,
        tags:      t.tags      as string[],
        date:      (t.date as Date).toISOString().slice(0, 10),
        setupId:   t.setupId,
        entry:     Number(t.entry),
        stop:      Number(t.stop),
        target:    Number(t.target),
        size:      Number(t.size),
      }))

      const setupMap    = new Map(setupRows.map(s => [s.id, { id: s.id, name: s.name, abbr: s.abbreviation, color: s.color }]))
      const setupIds    = input?.setupId
        ? [input.setupId]
        : [...new Set(trades.filter(t => t.setupId).map(t => t.setupId!))]
      const setupMetas  = setupIds.map(id => setupMap.get(id) ?? { id, name: id, abbr: "??", color: "#4f6ef7" })
      const setupStats  = setupIds.map((id, i) => computeSetupStats(id, trades, setupMetas[i])).sort((a, b) => b.trades - a.trades)
      const sessionMatrix  = computeSessionMatrix(setupMetas, trades)
      const directionStats = setupIds.map(id => computeDirectionBreakdown(id, trades)).filter((d): d is DirectionStats => d !== null)

      const playbookSummary = setupStats.length > 0 ? (() => {
        const mostUsed       = setupStats.reduce((a, b) => b.trades > a.trades ? b : a)
        const mostProfitable = setupStats.reduce((a, b) => b.netPnl > a.netPnl ? b : a)
        const bestAplus      = setupStats.reduce((a, b) =>
          (b.aplusCount / Math.max(b.trades, 1)) > (a.aplusCount / Math.max(a.trades, 1)) ? b : a,
        )
        const setupInStreak  = setupStats.reduce((a, b) => b.currentStreak > a.currentStreak ? b : a)
        return {
          mostUsed,
          mostProfitable,
          bestAplus: { ...bestAplus, aplusRate: bestAplus.trades > 0 ? bestAplus.aplusCount / bestAplus.trades * 100 : 0 },
          setupInStreak,
        }
      })() : null

      return { setupStats, sessionMatrix, directionStats, playbookSummary }
    }),
})
