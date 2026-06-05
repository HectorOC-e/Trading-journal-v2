import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import type { Prisma } from "@/lib/generated/prisma/client"
import type { AccountLogPayload } from "@/types"
import { computeClosedTradePnl, computeRMultiple, computeScaleInAvgEntry } from "@/domains/trading/services/trade-service"
import { checkLossLimit, checkTradeCountLimit, checkSymbolAllowlist } from "@/domains/trading/services/prop-firm-guard"
import { computeMaxDrawdown } from "@/domains/trading/services/account-service"
import {
  buildKpis, buildAccountStats, buildEquityCurve, buildPnlByDate,
  buildSessionStats, buildHourStats, buildPnlBySymbol, buildPropFirmStatus,
  buildExecutionStats, buildDiscipline,
} from "@/domains/analytics/services/dashboard-analytics"
import type {
  MinimalTrade, AccountBalance, AccountWithLimits, Grain,
  KpiSummary, AccountStat, EquityCurvePoint, PnlByDatePoint,
  SessionStat, HourStat, SymbolStat, PropFirmStatus,
} from "@/domains/analytics/services/dashboard-analytics"
import { computeSetupStats, computeSessionMatrix, computeDirectionBreakdown } from "@/domains/analytics/services/setup-analytics"
import type { SetupStats, SessionMatrixRow, DirectionStats } from "@/domains/analytics/services/setup-analytics"
import { detectPatterns } from "@/domains/analytics/services/pattern-detector"
import { isEmbeddingAvailable } from "@/lib/ai/config"
import { embedText } from "@/lib/ai/embeddings"

/** UTC period boundaries derived from a "YYYY-MM-DD" trade date (HALLAZGO 1B). */
function periodBounds(dateStr: string) {
  const day = new Date(`${dateStr}T00:00:00Z`)
  const dow = (day.getUTCDay() + 6) % 7 // Monday = 0
  const weekStart = new Date(day);  weekStart.setUTCDate(day.getUTCDate() - dow)
  const monthStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1))
  const earliest = weekStart < monthStart ? weekStart : monthStart
  return { day, weekStart, monthStart, earliest }
}

function sameDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate()
}

/** Lock an account (auto, on loss-limit breach) and write an audit log. */
async function lockAccount(
  prisma: typeof import("@/lib/prisma").prisma,
  userId: string,
  accountId: string,
  reason: string,
  limitPct?: number,
  currentPct?: number,
): Promise<void> {
  await prisma.account.update({
    where: { id: accountId, userId },
    data:  { locked: true, lockReason: reason, lockedAt: new Date() },
  })
  const payload: AccountLogPayload = { event: "LOCKED", reason, limitPct, currentPct, auto: true }
  await prisma.accountLog.create({
    data: { userId, accountId, event: "LOCKED", payload },
  })
}

/** Fire-and-forget: embed trade notes and store vector. Errors are silent. */
function scheduleEmbedding(tradeId: string, notes: string, prismaClient: typeof import("@/lib/prisma").prisma): void {
  if (!isEmbeddingAvailable() || !notes.trim()) return
  void (async () => {
    try {
      const vector = await embedText(notes)
      if (!vector) return
      await prismaClient.$executeRaw`
        UPDATE trades
        SET notes_embedding = ${`[${vector.join(",")}]`}::vector
        WHERE id = ${tradeId}::uuid
      `
    } catch {
      // best-effort, never throw
    }
  })()
}

type DashboardOutput = {
  kpis:           KpiSummary
  accountStats:   AccountStat[]
  equityCurve:    EquityCurvePoint[]
  pnlByDate:      PnlByDatePoint[]
  pnlBySymbol:    SymbolStat[]
  sessionStats:   SessionStat[]
  hourStats:      HourStat[]
  setupStats:     SetupStats[]
  sessionMatrix:  SessionMatrixRow[]
  directionStats: DirectionStats[]
  propFirmStatus: PropFirmStatus[]
  recentTrades: Array<{
    id:        string
    symbol:    string
    direction: string
    pnl:       number
    rMultiple: number | null
    session:   string | null
    tags:      string[]
    date:      string
    setupId:   string | null
    setupName: string | null
    setupAbbr: string | null
  }>
  executionStats: {
    avgDurationMinutes: number | null
    avgPlannedRisk:     number | null
    avgPlannedReward:   number | null
    riskRewardRatio:    number | null
  }
  discipline: {
    heatmapData:   { date: string; severity: 0 | 1 | 2 }[]
    rDistribution: { bucket: string; count: number }[]
    violations:    { rule: string; count: number; severity: "mayor" | "menor" }[]
    weeklyScore:   { week: string; score: number }[]
    aplusStats: {
      aplusCount: number
      stdCount:   number
      aplusWr:    number | null
      stdWr:      number | null
      aplusAvgR:  number | null
      stdAvgR:    number | null
    }
    composition: {
      planSeguido: number
      offPlan:     number
      partial:     number
    }
    costoIndisciplina: number
    rachaDiasLimpios:  number
  }
}
import { isCacheEnabled, getCachedStats, setCachedStats, invalidateCache } from "@/domains/analytics/services/analytics-cache"
import { VIOLATION_TAGS } from "@/types"

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
      limit:     z.number().int().min(1).max(200).default(50),
      cursor:    z.string().uuid().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50

      let cursorDate: Date | null = null
      if (input?.cursor) {
        const cursorTrade = await ctx.prisma.trade.findUnique({
          where: { id: input.cursor },
          select: { date: true },
        })
        cursorDate = cursorTrade?.date ?? null
      }

      const trades = await ctx.prisma.trade.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.accountId && { accountId: input.accountId }),
          ...(input?.setupId   && { setupId:   input.setupId }),
          ...((input?.from || input?.to) ? {
            date: {
              ...(input?.from && { gte: new Date(input.from) }),
              ...(input?.to   && { lte: new Date(input.to)   }),
            },
          } : {}),
          ...(input?.cursor && cursorDate ? {
            OR: [
              { date: { lt: cursorDate } },
              { date: cursorDate, id: { lt: input.cursor } },
            ],
          } : {}),
        },
        include: {
          account: true,
          setup:   true,
          events:  { orderBy: { timestamp: "asc" } },
        },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: limit + 1,
      })

      const hasMore   = trades.length > limit
      const items     = hasMore ? trades.slice(0, limit) : trades
      const nextCursor = hasMore ? items[items.length - 1].id : null

      return { items: items.map(serializeTrade), nextCursor }
    }),

  dashboardStats: protectedProcedure
    .input(z.object({
      accountId: z.string().uuid().optional(),
      from:      z.string().optional(),
      to:        z.string().optional(),
      period:    z.enum(["7d", "1M", "3M", "6M", "1Y", "ALL"]).optional().default("3M"),
    }).optional())
    .query(async ({ ctx, input }) => {
      const now        = new Date()
      const today      = now.toISOString().slice(0, 10)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const dayOfWeek  = now.getDay() // 0=Sun, 1=Mon ... 6=Sat
      const daysToMon  = (dayOfWeek + 6) % 7  // days since last Monday
      const weekStart  = new Date(Date.now() - daysToMon * 86_400_000).toISOString().slice(0, 10)
      const period     = input?.period ?? "3M"

      const periodDays: Record<string, number | null> = { "7d": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "ALL": null }
      const days       = periodDays[period]
      const periodFrom = days != null ? new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10) : undefined
      const queryFrom  = input?.from ?? periodFrom
      const queryTo    = input?.to
      const grainMap: Record<string, Grain> = { "7d": "daily", "1M": "daily", "3M": "daily", "6M": "weekly", "1Y": "weekly", "ALL": "monthly" }
      const grain      = grainMap[period]

      // ── Cache lookup (feature-flagged) ────────────────────────────────────
      const cacheKey = `${period}:${input?.accountId ?? "all"}`
      if (isCacheEnabled()) {
        const hit = await getCachedStats<DashboardOutput>(ctx.prisma, ctx.userId, cacheKey)
        if (hit) return hit
      }

      // ── Fetch ─────────────────────────────────────────────────────────────
      // Only active/paused accounts; archived (INACTIVE/LOST) are excluded from
      // all dashboard analytics (QA-002/003/004/005/009).
      const activeAccounts = await ctx.prisma.account.findMany({
        where: { userId: ctx.userId, status: { in: ["ACTIVE", "PAUSED"] } },
        select: {
          id: true, name: true, type: true, status: true,
          initialBalance: true, ddDailyPct: true, ddTotalPct: true,
          maxTradesPerDay: true, allowedSymbols: true,
        },
      })
      const activeAccountIds = activeAccounts.map(a => a.id)

      const [tradeRows, setupRows, checklistRows] = await Promise.all([
        ctx.prisma.trade.findMany({
          where: {
            userId:    ctx.userId,
            status:    "CLOSED",
            accountId: { in: activeAccountIds },
            ...(input?.accountId && { accountId: input.accountId }),
            ...((queryFrom || queryTo) ? {
              date: {
                ...(queryFrom && { gte: new Date(queryFrom) }),
                ...(queryTo   && { lte: new Date(queryTo)   }),
              },
            } : {}),
          },
          select: {
            id: true, accountId: true, symbol: true, direction: true,
            session: true, openTime: true, closeTime: true,
            pnl: true, rMultiple: true, tags: true, date: true,
            setupId: true, entry: true, stop: true, target: true, size: true,
          },
          orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        }),
        ctx.prisma.setup.findMany({
          where: { userId: ctx.userId },
          select: { id: true, name: true, abbreviation: true, color: true },
        }),
        ctx.prisma.tradeChecklistResult.findMany({
          where:  { userId: ctx.userId },
          select: { tradeId: true, itemsChecked: true, itemsTotal: true },
        }),
      ])

      const setupMap      = new Map(setupRows.map(s => [s.id, s]))
      const checklistMap  = new Map(checklistRows.map(r => [r.tradeId, { checked: r.itemsChecked.length, total: r.itemsTotal }]))

      // ── Normalize trades ──────────────────────────────────────────────────
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

      const accounts = activeAccounts
      const acctBalances: AccountBalance[]     = accounts.map(a => ({ id: a.id, initialBalance: Number(a.initialBalance) }))
      const acctWithLimits: AccountWithLimits[] = accounts.map(a => ({
        id:              a.id,
        name:            a.name,
        type:            a.type,
        initialBalance:  Number(a.initialBalance),
        ddDailyPct:      a.ddDailyPct  != null ? Number(a.ddDailyPct)  : null,
        ddTotalPct:      a.ddTotalPct  != null ? Number(a.ddTotalPct)  : null,
        maxTradesPerDay: a.maxTradesPerDay,
        allowedSymbols:  a.allowedSymbols as string[],
      }))

      // ── Core analytics (service delegation) ──────────────────────────────
      const kpis         = buildKpis(trades, today, monthStart, weekStart)
      const accountStats = buildAccountStats(trades, acctBalances, today, monthStart)
      const equityCurve  = buildEquityCurve(trades, acctBalances)
      const pnlByDate    = buildPnlByDate(trades, grain)
      const pnlBySymbol  = buildPnlBySymbol(trades, 10)
      const sessionStats = buildSessionStats(trades)
      const hourStats    = buildHourStats(trades)

      // ── Setup analytics ───────────────────────────────────────────────────
      const setupIds   = [...new Set(trades.filter(t => t.setupId).map(t => t.setupId!))]
      const setupMetas = setupIds.map(id => {
        const s = setupMap.get(id)
        return { id, name: s?.name ?? id, abbr: s?.abbreviation ?? "??", color: s?.color ?? "#4f6ef7" }
      })
      const setupStats     = setupIds.map((id, i) => computeSetupStats(id, trades, setupMetas[i], checklistMap)).sort((a, b) => b.trades - a.trades)
      const sessionMatrix  = computeSessionMatrix(setupMetas, trades)
      const directionStats = setupIds.map(id => computeDirectionBreakdown(id, trades)).filter((d): d is DirectionStats => d !== null)

      // ── Prop firm status ──────────────────────────────────────────────────
      const todayRaw = await ctx.prisma.trade.findMany({
        where:  { userId: ctx.userId, date: new Date(today) },
        select: { accountId: true, pnl: true, status: true },
      })
      const propFirmStatus = buildPropFirmStatus(
        acctWithLimits,
        trades,
        todayRaw.map(t => ({ accountId: t.accountId, pnl: t.pnl != null ? Number(t.pnl) : null, status: t.status })),
      )

      // ── Recent trades ─────────────────────────────────────────────────────
      const recentTrades = [...trades]
        .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
        .slice(0, 20)
        .map(t => {
          const setup = t.setupId ? setupMap.get(t.setupId) : null
          return {
            id: t.id, symbol: t.symbol, direction: t.direction,
            pnl: t.pnl, rMultiple: t.rMultiple, session: t.session,
            tags: t.tags, date: t.date, setupId: t.setupId,
            setupName: setup?.name         ?? null,
            setupAbbr: setup?.abbreviation ?? null,
          }
        })

      // ── Execution stats + discipline (service delegation) ─────────────────
      const executionStats = buildExecutionStats(trades)
      const discipline     = buildDiscipline(trades, kpis.total)

      const result: DashboardOutput = {
        kpis,
        accountStats,
        equityCurve,
        pnlByDate,
        pnlBySymbol,
        sessionStats,
        hourStats,
        setupStats,
        sessionMatrix,
        directionStats,
        propFirmStatus,
        recentTrades,
        executionStats,
        discipline,
      }

      if (isCacheEnabled()) {
        await setCachedStats(ctx.prisma, ctx.userId, cacheKey, result)
      }

      return result
    }),

  create: protectedProcedure
    .input(z.object({
      accountId:       z.string().uuid(),
      setupId:         z.string().uuid().optional(),
      direction:       z.enum(["LONG", "SHORT"]),
      symbol:          z.string().min(1),
      entry:           z.number(),
      stop:            z.number(),
      target:          z.number(),
      size:            z.number().positive(),
      date:            z.string(),
      openTime:        z.string(),
      session:         z.enum(["London", "New York", "Asia", "London Close"]),
      tags:            z.array(z.string().min(1).max(30)).max(20).default([]),
      notes:           z.string().default(""),
      screenshotUrls:  z.array(z.string()).default([]),
      pnl:             z.number().optional(),
      closePrice:      z.number().optional(),
      closeTime:       z.string().optional(),
      commission:      z.number().optional(),
      status:          z.enum(["OPEN", "CLOSED", "CANCELLED"]).default("OPEN"),
      // Psychology fields (TASK-034)
      emotionBefore:   z.enum(["calm", "anxious", "excited", "fearful", "overconfident"]).optional().nullable(),
      confidenceRating: z.number().int().min(1).max(5).optional().nullable(),
      executionQuality: z.number().int().min(1).max(5).optional().nullable(),
      fomoFlag:        z.boolean().optional(),
      revengeFlag:     z.boolean().optional(),
      // Pre-trade planning field (TASK-074)
      planNotes:       z.string().max(500).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      // ── Account + risk-limit enforcement (HALLAZGO 1B) ─────────────────────
      const account = await ctx.prisma.account.findUniqueOrThrow({
        where: { id: input.accountId, userId: ctx.userId },
        select: {
          type:            true,
          locked:          true,
          lockReason:      true,
          ddDailyPct:      true,
          ddWeeklyPct:     true,
          ddMonthlyPct:    true,
          maxTradesPerDay: true,
          allowedSymbols:  true,
          initialBalance:  true,
        },
      })

      // 1) Already locked → no new trades until manual unlock
      if (account.locked) {
        throw new TRPCError({ code: "FORBIDDEN", message: `ACCOUNT_LOCKED:${account.lockReason || "MANUAL"}` })
      }

      // 2) Setup must be selectable (HALLAZGO 2 — backend guard)
      if (input.setupId) {
        const setup = await ctx.prisma.setup.findUnique({
          where:  { id: input.setupId, userId: ctx.userId },
          select: { status: true },
        })
        if (!setup) throw new TRPCError({ code: "BAD_REQUEST", message: "SETUP_NOT_FOUND" })
        if (setup.status === "PAUSADO" || setup.status === "DESCARTADO") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "SETUP_NOT_AVAILABLE" })
        }
      }

      // 3) Loss limits (daily / weekly / monthly) — universal, all account types.
      //    On breach the account is auto-locked and the trade is rejected.
      const initBal = Number(account.initialBalance)
      const bounds  = periodBounds(input.date)
      const hasLossLimit = account.ddDailyPct != null || account.ddWeeklyPct != null || account.ddMonthlyPct != null
      if (hasLossLimit && initBal > 0) {
        const periodTrades = await ctx.prisma.trade.findMany({
          where:  { accountId: input.accountId, userId: ctx.userId, status: "CLOSED", date: { gte: bounds.earliest } },
          select: { pnl: true, date: true },
        })
        const sumFrom = (from: Date) => periodTrades
          .filter(t => (t.date as Date) >= from)
          .reduce((s, t) => s + Number(t.pnl ?? 0), 0)
        const dayLoss   = periodTrades.filter(t => sameDay(t.date as Date, bounds.day)).reduce((s, t) => s + Number(t.pnl ?? 0), 0)
        const weekLoss  = sumFrom(bounds.weekStart)
        const monthLoss = sumFrom(bounds.monthStart)

        const violation =
          checkLossLimit("DAILY",   dayLoss,   initBal, account.ddDailyPct   != null ? Number(account.ddDailyPct)   : null) ??
          checkLossLimit("WEEKLY",  weekLoss,  initBal, account.ddWeeklyPct  != null ? Number(account.ddWeeklyPct)  : null) ??
          checkLossLimit("MONTHLY", monthLoss, initBal, account.ddMonthlyPct != null ? Number(account.ddMonthlyPct) : null)

        if (violation) {
          await lockAccount(ctx.prisma, ctx.userId, input.accountId, violation.type,
            "limitPct" in violation ? violation.limitPct : undefined,
            "currentPct" in violation ? violation.currentPct : undefined)
          throw new TRPCError({ code: "FORBIDDEN", message: `ACCOUNT_LOCKED:${violation.type}` })
        }
      }

      // 4) Prop-firm-only constraints: max trades/day + symbol allowlist
      if (account.type === "PROP_FIRM" || account.type === "DEMO_PROP") {
        const tradeDate = new Date(input.date)
        if (account.maxTradesPerDay != null) {
          const todayCount = await ctx.prisma.trade.count({
            where: { accountId: input.accountId, userId: ctx.userId, date: tradeDate },
          })
          if (checkTradeCountLimit(todayCount, account.maxTradesPerDay)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "PROP_FIRM_MAX_TRADES" })
          }
        }
        if (checkSymbolAllowlist(input.symbol, account.allowedSymbols as string[])) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "PROP_FIRM_SYMBOL_NOT_ALLOWED" })
        }
      }

      const trade = await ctx.prisma.trade.create({
        data: { ...input, userId: ctx.userId, date: new Date(input.date) },
        include: { account: true, setup: true, events: true },
      })

      const openTimeSafe = input.openTime || "00:00"
      await ctx.prisma.tradeEvent.create({
        data: {
          userId:    ctx.userId,
          tradeId:   trade.id,
          type:      "OPEN",
          price:     input.entry,
          contracts: input.size,
          notes:     `${input.direction} · SL ${input.stop} · TP ${input.target}`,
          timestamp: new Date(`${input.date}T${openTimeSafe}:00`),
        },
      })

      const full = await ctx.prisma.trade.findUniqueOrThrow({
        where:   { id: trade.id },
        include: { account: true, setup: true, events: { orderBy: { timestamp: "asc" } } },
      })

      if (isCacheEnabled()) await invalidateCache(ctx.prisma, ctx.userId)
      scheduleEmbedding(trade.id, input.notes ?? "", ctx.prisma)
      return serializeTrade(full)
    }),

  update: protectedProcedure
    .input(z.object({
      id:               z.string().uuid(),
      notes:            z.string().optional(),
      tags:             z.array(z.string().min(1).max(30)).max(20).optional(),
      pnl:              z.number().optional(),
      rMultiple:        z.number().optional(),
      screenshotUrls:   z.array(z.string()).optional(),
      entry:            z.number().optional(),
      stop:             z.number().optional(),
      target:           z.number().optional(),
      size:             z.number().optional(),
      session:          z.string().optional(),
      setupId:          z.string().uuid().optional().nullable(),
      // Psychology fields (TASK-034)
      emotionBefore:    z.enum(["calm", "anxious", "excited", "fearful", "overconfident"]).optional().nullable(),
      confidenceRating: z.number().int().min(1).max(5).optional().nullable(),
      executionQuality: z.number().int().min(1).max(5).optional().nullable(),
      fomoFlag:         z.boolean().optional(),
      revengeFlag:      z.boolean().optional(),
      // Pre-trade planning field (TASK-074)
      planNotes:        z.string().max(500).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const trade = await ctx.prisma.trade.update({
        where: { id, userId: ctx.userId },
        data,
        include: { account: true, setup: true, events: true },
      })
      if (input.notes !== undefined) scheduleEmbedding(trade.id, input.notes ?? "", ctx.prisma)
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
      const entry               = Number(trade.entry)
      const size                = Number(trade.size)
      const { rawPnl, netPnl } = computeClosedTradePnl(trade.direction as "LONG" | "SHORT", entry, input.closePrice, size, input.commission)
      const rMultiple           = computeRMultiple(rawPnl, entry, Number(trade.stop), size)

      const updated = await ctx.prisma.trade.update({
        where:   { id: input.id, userId: ctx.userId },
        data:    { status: "CLOSED", closePrice: input.closePrice, closeTime: input.closeTime, commission: input.commission, pnl: netPnl, rMultiple },
        include: { account: true, setup: true, events: true },
      })

      // ── Auto-INACTIVE on total drawdown breach ────────────────────────────
      const acct = await ctx.prisma.account.findUnique({
        where:  { id: trade.accountId },
        select: { type: true, ddTotalPct: true, initialBalance: true, status: true },
      })
      if (
        acct &&
        (acct.type === "PROP_FIRM" || acct.type === "DEMO_PROP") &&
        acct.ddTotalPct != null &&
        acct.status === "ACTIVE"
      ) {
        const allClosed = await ctx.prisma.trade.findMany({
          where:   { accountId: trade.accountId, userId: ctx.userId, status: "CLOSED" },
          select:  { pnl: true },
          orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        })
        const maxDd   = computeMaxDrawdown(allClosed.map(t => Number(t.pnl ?? 0)))
        const initBal = Number(acct.initialBalance)
        const ddPct   = initBal > 0 ? (maxDd / initBal) * 100 : 0
        if (ddPct >= Number(acct.ddTotalPct)) {
          await ctx.prisma.account.update({
            where: { id: trade.accountId },
            data:  { status: "INACTIVE" },
          })
          const ddPayload: AccountLogPayload = {
            event: "STATUS_CHANGE",
            from:  "ACTIVE",
            to:    "INACTIVE",
            note:  `Drawdown total ${ddPct.toFixed(2)}% superó límite de ${Number(acct.ddTotalPct)}%`,
          }
          await ctx.prisma.accountLog.create({
            data: { userId: ctx.userId, accountId: trade.accountId, event: "STATUS_CHANGE", payload: ddPayload },
          })
              if (isCacheEnabled()) await invalidateCache(ctx.prisma, ctx.userId)
          return { trade: serializeTrade(updated), accountDeactivated: true }
        }
      }

      if (isCacheEnabled()) await invalidateCache(ctx.prisma, ctx.userId)
      return { trade: serializeTrade(updated), accountDeactivated: false }
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
        where:   { id: input.tradeId, userId: ctx.userId },
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
        const oldSize = Number(trade.size)
        tradeUpdate.entry = computeScaleInAvgEntry(Number(trade.entry), oldSize, input.price, input.contracts)
        tradeUpdate.size  = oldSize + input.contracts
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

  // @deprecated — replaced by dashboardStats (Sprint 1). No callers remain. Kept for type-compatibility only; returns empty result.
  stats: protectedProcedure
    .input(z.object({
      accountId: z.string().uuid().optional(),
      setupId:   z.string().uuid().optional(),
    }).optional())
    .query(() => {
      return { total: 0, wins: 0, losses: 0, be: 0, winRate: 0, avgR: 0, netPnl: 0, pnlMonth: 0, expectancy: 0, aplusRate: 0, profitFactor: 0 }
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      // Fetch first to get screenshot URLs for storage cleanup
      const trade = await ctx.prisma.trade.findUniqueOrThrow({
        where:  { id: input, userId: ctx.userId },
        select: { screenshotUrls: true },
      })
      const result = await ctx.prisma.trade.delete({ where: { id: input, userId: ctx.userId } })
      // Delete screenshots from Supabase Storage (best-effort, non-blocking)
      if (trade.screenshotUrls.length > 0) {
        const paths = trade.screenshotUrls.map(url => {
          try { return new URL(url).pathname.replace(/^\/storage\/v1\/object\/public\/trade-screenshots\//, "") }
          catch { return null }
        }).filter((p): p is string => p !== null)
        if (paths.length > 0) {
          await ctx.supabase.storage.from("trade-screenshots").remove(paths).catch(() => undefined)
        }
      }
      if (isCacheEnabled()) await invalidateCache(ctx.prisma, ctx.userId)
      return result
    }),

  ruleViolationStats: protectedProcedure
    .input(z.object({
      from: z.string().optional(),
      to:   z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const trades = await ctx.prisma.trade.findMany({
        where: {
          userId: ctx.userId,
          tags:   { hasSome: [...VIOLATION_TAGS] },
          ...((input?.from || input?.to) ? {
            date: {
              ...(input?.from && { gte: new Date(input.from) }),
              ...(input?.to   && { lte: new Date(input.to)   }),
            },
          } : {}),
        },
        select: { tags: true, date: true },
      })

      const byTag = VIOLATION_TAGS.reduce((acc, tag) => ({
        ...acc,
        [tag]: trades.filter(t => (t.tags as string[]).includes(tag)).length,
      }), {} as Record<string, number>)

      const byMonthMap: Record<string, number> = {}
      for (const t of trades) {
        const monthKey = (t.date as Date).toISOString().slice(0, 7)
        byMonthMap[monthKey] = (byMonthMap[monthKey] ?? 0) + 1
      }
      const byMonth = Object.entries(byMonthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }))

      return { total: trades.length, byTag, byMonth }
    }),

  saveChecklistResult: protectedProcedure
    .input(z.object({
      tradeId:      z.string().uuid(),
      setupId:      z.string().uuid().optional(),
      itemsChecked: z.array(z.string()),
      itemsTotal:   z.number().int().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.trade.findUniqueOrThrow({
        where: { id: input.tradeId, userId: ctx.userId },
      })
      return ctx.prisma.tradeChecklistResult.upsert({
        where:  { tradeId: input.tradeId },
        create: {
          userId:       ctx.userId,
          tradeId:      input.tradeId,
          setupId:      input.setupId,
          itemsChecked: input.itemsChecked,
          itemsTotal:   input.itemsTotal,
        },
        update: {
          itemsChecked: input.itemsChecked,
          itemsTotal:   input.itemsTotal,
        },
      })
    }),

  // T-VI-002: Behavioral pattern insights
  patternInsights: protectedProcedure
    .query(async ({ ctx }) => {
      const tradeRows = await ctx.prisma.trade.findMany({
        where: { userId: ctx.userId, status: "CLOSED" },
        select: {
          id: true, accountId: true, symbol: true, direction: true,
          session: true, openTime: true, closeTime: true,
          pnl: true, rMultiple: true, tags: true, date: true,
          setupId: true, entry: true, stop: true, target: true, size: true,
        },
        orderBy: [{ date: "asc" }],
        take: 500,
      })
      const trades: MinimalTrade[] = tradeRows.map(t => ({
        id:        t.id,
        accountId: t.accountId,
        symbol:    t.symbol,
        direction: t.direction,
        session:   t.session as string | null,
        openTime:  t.openTime as string | null,
        closeTime: t.closeTime as string | null,
        pnl:       t.pnl        != null ? Number(t.pnl)        : 0,
        rMultiple: t.rMultiple  != null ? Number(t.rMultiple)  : null,
        tags:      t.tags        as string[],
        date:      (t.date as Date).toISOString().slice(0, 10),
        setupId:   t.setupId,
        entry:     Number(t.entry),
        stop:      Number(t.stop),
        target:    Number(t.target),
        size:      Number(t.size),
      }))
      return detectPatterns(trades)
    }),

  // T-VI-004: Semantic search (pgvector)
  semanticSearch: protectedProcedure
    .input(z.object({
      query: z.string().min(1).max(500),
      limit: z.number().int().min(1).max(20).default(10),
    }))
    .query(async ({ ctx, input }) => {
      if (!isEmbeddingAvailable()) {
        return { trades: [], similarity: [], error: "NO_EMBEDDING_KEY" as const }
      }
      const queryVector = await embedText(input.query)
      if (!queryVector) {
        return { trades: [], similarity: [], error: "EMBED_FAILED" as const }
      }

      type SearchRow = { id: string; similarity: number }
      const rows = await ctx.prisma.$queryRaw<SearchRow[]>`
        SELECT id, (1 - (notes_embedding <=> ${`[${queryVector.join(",")}]`}::vector)) AS similarity
        FROM trades
        WHERE user_id = ${ctx.userId}::uuid
          AND notes_embedding IS NOT NULL
        ORDER BY notes_embedding <=> ${`[${queryVector.join(",")}]`}::vector
        LIMIT ${input.limit}
      `
      if (!rows.length) return { trades: [], similarity: [] }

      const tradeIds = rows.map(r => r.id)
      const found = await ctx.prisma.trade.findMany({
        where:   { id: { in: tradeIds }, userId: ctx.userId },
        include: { account: true, setup: true, events: { orderBy: { timestamp: "asc" } } },
      })
      const ordered = tradeIds
        .map(id => found.find(t => t.id === id))
        .filter((t): t is NonNullable<typeof t> => !!t)
      return {
        trades:     ordered.map(serializeTrade),
        similarity: rows.map(r => r.similarity),
      }
    }),
})
