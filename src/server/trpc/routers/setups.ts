import { z } from "zod"
import { router, protectedProcedure, dashboardMutation } from "../init"
import { computeSetupStats, computeSessionMatrix, computeDirectionBreakdown } from "@/domains/analytics/services/setup-analytics"
import type { MinimalTrade } from "@/domains/analytics/services/dashboard-analytics"
import type { DirectionStats } from "@/domains/analytics/services/setup-analytics"
import { scheduleEmbedding } from "@/server/services/retrieval/pipeline"

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
  // ── Edge definition fields (T-VIII-002) ──────────────────────────────────
  expectedWr:        z.number().min(0).max(100).optional(),
  expectedAvgR:      z.number().optional(),
  minR:              z.number().optional(),
  maxR:              z.number().optional(),
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

  create: dashboardMutation
    .input(SetupInput)
    .mutation(async ({ ctx, input }) => {
      const setup = await ctx.prisma.setup.create({
        data: { ...input, userId: ctx.userId },
      })
      scheduleEmbedding(ctx.prisma, ctx.userId, "setups", setup.id, input.description ?? "")
      return setup
    }),

  update: dashboardMutation
    .input(z.object({ id: z.string().uuid() }).merge(SetupInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      // ── T-VIII-004: version snapshot on versioned field changes ─────────
      const versionedFields = ["aplusChecklist", "standardChecklist", "direction"] as const
      const shouldVersion = versionedFields.some(f => data[f] !== undefined)

      if (shouldVersion) {
        const existing = await ctx.prisma.setup.findUniqueOrThrow({
          where: { id, userId: ctx.userId },
        })
        const hasChange = versionedFields.some(
          f => data[f] !== undefined && JSON.stringify(data[f]) !== JSON.stringify(existing[f])
        )
        if (hasChange) {
          const latestVersion = await ctx.prisma.setupVersion.findFirst({
            where:   { setupId: id },
            orderBy: { version: "desc" },
            select:  { version: true },
          })
          // Prisma Json type requires InputJsonValue; serialise via JSON to strip
          // non-serialisable Prisma internals (Decimal, Date → plain values).
          const snapshotJson = JSON.parse(JSON.stringify(existing))
          await ctx.prisma.setupVersion.create({
            data: {
              setupId:  id,
              version:  (latestVersion?.version ?? 0) + 1,
              snapshot: snapshotJson,
              reason:   "Condiciones modificadas",
            },
          })
        }
      }

      // ── Apply the update ────────────────────────────────────────────────
      // Numeric edge fields come in as JS numbers; Prisma Decimal fields accept numbers directly.
      const setup = await ctx.prisma.setup.update({
        where: { id, userId: ctx.userId },
        data,
      })
      if (data.description !== undefined) {
        scheduleEmbedding(ctx.prisma, ctx.userId, "setups", setup.id, data.description ?? "")
      }
      return setup
    }),

  setStatus: dashboardMutation
    .input(z.object({ id: z.string().uuid(), status: z.enum(SETUP_STATUSES) }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.setup.update({
        where: { id: input.id, userId: ctx.userId },
        data:  { status: input.status },
      })
    ),

  delete: dashboardMutation
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

      const [setupRows, tradeRows, checklistRows] = await Promise.all([
        ctx.prisma.setup.findMany({
          where: { userId: ctx.userId, status: { not: "DESCARTADO" } },
          select: {
            id: true, name: true, abbreviation: true, color: true,
            expectedWr: true, expectedAvgR: true,
          },
          orderBy: [{ status: "asc" }, { name: "asc" }],
        }),
        ctx.prisma.trade.findMany({
          where: {
            userId:  ctx.userId,
            status:  "CLOSED",
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
        ctx.prisma.tradeChecklistResult.findMany({
          where:  { userId: ctx.userId },
          select: { tradeId: true, itemsChecked: true, itemsTotal: true },
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

      // Map includes expectedWr / expectedAvgR for each setup
      const setupMap = new Map(setupRows.map(s => [s.id, {
        id:           s.id,
        name:         s.name,
        abbr:         s.abbreviation,
        color:        s.color,
        expectedWr:   s.expectedWr   != null ? Number(s.expectedWr)   : null,
        expectedAvgR: s.expectedAvgR != null ? Number(s.expectedAvgR) : null,
      }]))

      const checklistMap = new Map(checklistRows.map(r => [r.tradeId, { checked: r.itemsChecked.length, total: r.itemsTotal }]))
      const setupIds     = input?.setupId
        ? [input.setupId]
        : [...new Set(trades.filter(t => t.setupId).map(t => t.setupId!))]
      const setupMetas   = setupIds.map(id => setupMap.get(id) ?? { id, name: id, abbr: "??", color: "#4f6ef7", expectedWr: null, expectedAvgR: null })

      // Compute stats and merge expectedWr / expectedAvgR / health into each record
      const { calcSetupHealth } = await import("@/lib/formulas/setup")
      const setupStats = setupIds.map((id, i) => {
        const meta   = setupMetas[i]
        const base   = computeSetupStats(id, trades, { id: meta.id, name: meta.name, abbr: meta.abbr, color: meta.color }, checklistMap)
        const health = calcSetupHealth({
          winRate:      base.winRate,
          avgR:         base.avgR,
          expectedWr:   meta.expectedWr,
          expectedAvgR: meta.expectedAvgR,
          tradeCount:   base.trades,
        })
        return {
          ...base,
          expectedWr:   meta.expectedWr,
          expectedAvgR: meta.expectedAvgR,
          health,
        }
      }).sort((a, b) => b.trades - a.trades)

      const sessionMatrix  = computeSessionMatrix(
        setupMetas.map(m => ({ id: m.id, name: m.name, abbr: m.abbr, color: m.color })),
        trades,
      )
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

  // ── T-VIII-003: lifecycle check ─────────────────────────────────────────────
  lifecycleCheck: protectedProcedure
    .query(async ({ ctx }) => {
      const sixMonthsAgo = new Date(Date.now() - 180 * 86_400_000)

      const [setups, tradeRows] = await Promise.all([
        ctx.prisma.setup.findMany({
          where:  { userId: ctx.userId, status: "ACTIVO" },
          select: { id: true, name: true, abbreviation: true, expectedWr: true },
        }),
        ctx.prisma.trade.findMany({
          where:  { userId: ctx.userId, status: "CLOSED", setupId: { not: null }, date: { gte: sixMonthsAgo } },
          select: { setupId: true, pnl: true, date: true },
          orderBy: [{ date: "asc" }],
        }),
      ])

      type Suggestion = "PAUSE" | "REVIEW_EDGE" | "REACTIVATE" | null
      type LifecycleSuggestion = {
        setupId:    string
        setupName:  string
        setupAbbr:  string
        suggestion: Suggestion
        reason:     string
        evidence:   string
      }

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000)

      const results: LifecycleSuggestion[] = []

      for (const setup of setups) {
        const expectedWr = setup.expectedWr != null ? Number(setup.expectedWr) : null
        // Skip setups without edge definition
        if (expectedWr === null) continue

        const setupTrades = tradeRows.filter(t => t.setupId === setup.id)
        const totalTrades = setupTrades.length

        // Check recent activity (no trades in 30 days)
        const recentTrades = setupTrades.filter(t => (t.date as Date) >= thirtyDaysAgo)

        if (totalTrades < 20) {
          // Not enough data to evaluate — skip
          continue
        }

        // Compute WR over last 20 trades
        const last20 = setupTrades.slice(-20)
        const last20Wins = last20.filter(t => (t.pnl != null ? Number(t.pnl) : 0) > 0).length
        const last20Wr   = (last20Wins / 20) * 100

        // Check for 3+ consecutive losses in recent 10 trades
        const recent10   = setupTrades.slice(-10)
        let maxConsec    = 0
        let curConsec    = 0
        for (const t of recent10) {
          if ((t.pnl != null ? Number(t.pnl) : 0) < 0) {
            curConsec++
            if (curConsec > maxConsec) maxConsec = curConsec
          } else {
            curConsec = 0
          }
        }

        const fromDateStr = sixMonthsAgo.toISOString().slice(0, 10)
        const toDateStr   = now.toISOString().slice(0, 10)

        let suggestion: Suggestion = null
        let reason    = ""
        let evidence  = ""

        if (last20Wr < expectedWr - 10) {
          suggestion = "PAUSE"
          reason     = "Win rate por debajo del esperado"
          evidence   = `WR cayó de ${expectedWr.toFixed(0)}% esperado a ${last20Wr.toFixed(0)}% en los últimos 20 trades (${fromDateStr} – ${toDateStr})`
        } else if (last20Wr > expectedWr + 10) {
          suggestion = "REVIEW_EDGE"
          reason     = "Win rate supera expectativa — revisar edge"
          evidence   = `WR de ${last20Wr.toFixed(0)}% supera el ${expectedWr.toFixed(0)}% esperado en los últimos 20 trades (${fromDateStr} – ${toDateStr})`
        } else if (maxConsec >= 3) {
          suggestion = "PAUSE"
          reason     = "Racha de pérdidas"
          evidence   = `${maxConsec} pérdidas consecutivas en los últimos 10 trades (${fromDateStr} – ${toDateStr})`
        } else if (recentTrades.length === 0) {
          // Inactive for 30 days — informational only (no suggestion per spec)
          suggestion = null
          reason     = "Sin actividad en 30 días"
          evidence   = `0 trades en los últimos 30 días`
        }

        results.push({
          setupId:   setup.id,
          setupName: setup.name,
          setupAbbr: setup.abbreviation,
          suggestion,
          reason,
          evidence,
        })
      }

      // Return only setups with non-null suggestion
      return results.filter(r => r.suggestion !== null)
    }),

  // ── T-VIII-004: get version history for one setup ───────────────────────────
  getVersions: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ ctx, input }) =>
      ctx.prisma.setupVersion.findMany({
        where: {
          setupId: input,
          setup:   { userId: ctx.userId },
        },
        orderBy: { version: "desc" },
      })
    ),

  // ── T-VIII-004: get version counts for all setups ────────────────────────────
  // Returns { [setupId]: versionCount } so SetupCards can show version count
  // without N separate queries.
  listVersionCounts: protectedProcedure
    .query(async ({ ctx }) => {
      const rows = await ctx.prisma.setupVersion.groupBy({
        by:    ["setupId"],
        where: { setup: { userId: ctx.userId } },
        _count: { id: true },
      })
      const result: Record<string, number> = {}
      for (const row of rows) result[row.setupId] = row._count.id
      return result
    }),
})
