import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import type { Prisma } from "@/lib/generated/prisma/client"
import { isWin, calcWinRate, getISOWeekKey } from "@/lib/formulas"
import type { AccountLogPayload } from "@/types"
import { computeClosedTradePnl, computeRMultiple, computeScaleInAvgEntry } from "@/domains/trading/services/trade-service"
import { checkDailyLossLimit, checkTradeCountLimit, checkSymbolAllowlist } from "@/domains/trading/services/prop-firm-guard"
import { computeMaxDrawdown } from "@/domains/trading/services/account-service"
import {
  buildKpis, buildAccountStats, buildEquityCurve, buildPnlByDate,
  buildSessionStats, buildHourStats, buildPnlBySymbol, buildPropFirmStatus,
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
      period:    z.enum(["1M", "3M", "6M", "1Y", "ALL"]).optional().default("3M"),
    }).optional())
    .query(async ({ ctx, input }) => {
      const now        = new Date()
      const today      = now.toISOString().slice(0, 10)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const period     = input?.period ?? "3M"

      const periodDays: Record<string, number | null> = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "ALL": null }
      const days       = periodDays[period]
      const periodFrom = days != null ? new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10) : undefined
      const queryFrom  = input?.from ?? periodFrom
      const queryTo    = input?.to
      const grainMap: Record<string, Grain> = { "1M": "daily", "3M": "daily", "6M": "weekly", "1Y": "weekly", "ALL": "monthly" }
      const grain      = grainMap[period]

      // ── Cache lookup (feature-flagged) ────────────────────────────────────
      const cacheKey = `${period}:${input?.accountId ?? "all"}`
      if (isCacheEnabled()) {
        const hit = await getCachedStats<DashboardOutput>(ctx.prisma, ctx.userId, cacheKey)
        if (hit) return hit
      }

      // ── Fetch ─────────────────────────────────────────────────────────────
      const [tradeRows, accounts, setupRows, checklistRows] = await Promise.all([
        ctx.prisma.trade.findMany({
          where: {
            userId: ctx.userId,
            status: "CLOSED",
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
        ctx.prisma.account.findMany({
          where: { userId: ctx.userId },
          select: {
            id: true, name: true, type: true, status: true,
            initialBalance: true, ddDailyPct: true, ddTotalPct: true,
            maxTradesPerDay: true, allowedSymbols: true,
          },
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
      const kpis         = buildKpis(trades, today, monthStart)
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

      // ── Execution stats ───────────────────────────────────────────────────
      const durations: number[] = []
      const risks: number[]     = []
      const rewards: number[]   = []
      for (const t of trades) {
        if (t.openTime && t.closeTime) {
          const [oh, om] = t.openTime.split(":").map(Number)
          const [ch, cm] = t.closeTime.split(":").map(Number)
          const mins = (ch * 60 + cm) - (oh * 60 + om)
          if (mins > 0) durations.push(mins)
        }
        const risk   = Math.abs(t.entry - t.stop)   * t.size
        const reward = Math.abs(t.target - t.entry) * t.size
        if (risk   > 0) risks.push(risk)
        if (reward > 0) rewards.push(reward)
      }
      const avgDuration      = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null
      const avgPlannedRisk   = risks.length    > 0 ? risks.reduce((a, b) => a + b, 0)    / risks.length    : null
      const avgPlannedReward = rewards.length  > 0 ? rewards.reduce((a, b) => a + b, 0)  / rewards.length  : null
      const executionStats = {
        avgDurationMinutes: avgDuration      != null ? parseFloat(avgDuration.toFixed(1))      : null,
        avgPlannedRisk:     avgPlannedRisk   != null ? parseFloat(avgPlannedRisk.toFixed(2))   : null,
        avgPlannedReward:   avgPlannedReward != null ? parseFloat(avgPlannedReward.toFixed(2)) : null,
        riskRewardRatio:    avgPlannedRisk && avgPlannedReward ? parseFloat((avgPlannedReward / avgPlannedRisk).toFixed(4)) : null,
      }

      // ── Discipline ────────────────────────────────────────────────────────
      const heatmapData: { date: string; severity: 0 | 1 | 2 }[] = []
      const dateMap: Record<string, 0 | 1 | 2> = {}
      for (const t of trades) {
        const isOffPlan = t.tags.includes("Impulsivo") || t.tags.includes("Off-plan")
        const isLoss    = t.pnl < 0
        const sev: 0 | 1 | 2 = isOffPlan ? 2 : isLoss ? 1 : 0
        const cur = dateMap[t.date]
        if (cur === undefined || sev > cur) dateMap[t.date] = sev
      }
      for (const [date, severity] of Object.entries(dateMap)) heatmapData.push({ date, severity })

      const BUCKETS = ["-3R","-2R","-1R","0R","+1R","+2R","+3R","+4R+"] as const
      const bucketMap: Record<string, number> = Object.fromEntries(BUCKETS.map(b => [b, 0]))
      for (const t of trades) {
        const r = t.rMultiple ?? 0
        if      (r <= -2.5) bucketMap["-3R"]++
        else if (r <= -1.5) bucketMap["-2R"]++
        else if (r <= -0.5) bucketMap["-1R"]++
        else if (r <= 0.5)  bucketMap["0R"]++
        else if (r <= 1.5)  bucketMap["+1R"]++
        else if (r <= 2.5)  bucketMap["+2R"]++
        else if (r <= 3.5)  bucketMap["+3R"]++
        else                bucketMap["+4R+"]++
      }
      const rDistribution = BUCKETS.map(b => ({ bucket: b, count: bucketMap[b] }))

      const impulsivoCount = trades.filter(t => t.tags.includes("Impulsivo")).length
      const offPlanCount   = trades.filter(t => t.tags.includes("Off-plan")).length
      const revanCheCount  = trades.filter(t => t.tags.includes("Revanche")).length
      const noSetupCount   = trades.filter(t => !t.setupId).length
      const violations = [
        { rule: "Flag impulsivo manual",    count: impulsivoCount, severity: "mayor" as const },
        { rule: "Off-plan",                 count: offPlanCount,   severity: "mayor" as const },
        { rule: "Revanche / revenge trade", count: revanCheCount,  severity: "mayor" as const },
        { rule: "Sin setup asignado",       count: noSetupCount,   severity: "menor" as const },
      ].filter(v => v.count > 0)

      const byWeek: Record<string, { plan: number; total: number }> = {}
      for (const t of trades) {
        const key = getISOWeekKey(new Date(t.date))
        if (!byWeek[key]) byWeek[key] = { plan: 0, total: 0 }
        byWeek[key].total++
        if (t.setupId != null && !t.tags.includes("Impulsivo") && !t.tags.includes("Off-plan")) byWeek[key].plan++
      }
      const weeklyScore = Object.entries(byWeek)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([week, v]) => ({ week: week.replace(/^\d{4}-/, ""), score: parseFloat((v.plan / v.total * 100).toFixed(2)) }))

      const aplusTrades = trades.filter(t => t.tags.includes("A+"))
      const stdTrades   = trades.filter(t => !t.tags.includes("A+"))
      const aplusStats = {
        aplusCount: aplusTrades.length,
        stdCount:   stdTrades.length,
        aplusWr:    aplusTrades.length > 0 ? calcWinRate(aplusTrades.filter(t => isWin({ pnl: t.pnl })).length, aplusTrades.length) : null,
        stdWr:      stdTrades.length   > 0 ? calcWinRate(stdTrades.filter(t => isWin({ pnl: t.pnl })).length, stdTrades.length) : null,
        aplusAvgR:  aplusTrades.length > 0 ? aplusTrades.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / aplusTrades.length : null,
        stdAvgR:    stdTrades.length   > 0 ? stdTrades.reduce((s, t) => s + (t.rMultiple ?? 0), 0)   / stdTrades.length   : null,
      }

      const total       = kpis.total
      const planSeguido = trades.filter(t => t.setupId != null && !t.tags.includes("Impulsivo") && !t.tags.includes("Off-plan")).length
      const offPlan2    = trades.filter(t => t.tags.includes("Impulsivo") || t.tags.includes("Off-plan")).length
      const composition = { planSeguido, offPlan: offPlan2, partial: Math.max(0, total - planSeguido - offPlan2) }
      const costoIndisciplina = trades.filter(t => t.tags.includes("Impulsivo") || t.tags.includes("Off-plan")).reduce((s, t) => s + t.pnl, 0)

      const tradingDays = [...new Set(trades.map(t => t.date))].sort((a, b) => b.localeCompare(a))
      let rachaDiasLimpios = 0
      for (const day of tradingDays) {
        if (trades.filter(t => t.date === day).some(t => t.tags.includes("Impulsivo") || t.tags.includes("Off-plan"))) break
        rachaDiasLimpios++
      }

      const discipline = {
        heatmapData, rDistribution, violations, weeklyScore, aplusStats, composition,
        costoIndisciplina: parseFloat(costoIndisciplina.toFixed(2)),
        rachaDiasLimpios,
      }

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
      // ── Prop firm enforcement ──────────────────────────────────────────────
      const account = await ctx.prisma.account.findUniqueOrThrow({
        where: { id: input.accountId, userId: ctx.userId },
        select: {
          type:            true,
          ddDailyPct:      true,
          maxTradesPerDay: true,
          allowedSymbols:  true,
          initialBalance:  true,
        },
      })

      if (account.type === "PROP_FIRM" || account.type === "DEMO_PROP") {
        const tradeDate = new Date(input.date)

        if (account.ddDailyPct != null) {
          const todayTrades = await ctx.prisma.trade.findMany({
            where: { accountId: input.accountId, userId: ctx.userId, status: "CLOSED", date: tradeDate },
            select: { pnl: true },
          })
          const todayLoss = todayTrades.reduce((s, t) => s + Math.min(0, Number(t.pnl ?? 0)), 0)
          const violation = checkDailyLossLimit(todayLoss, Number(account.initialBalance), Number(account.ddDailyPct))
          if (violation) throw new TRPCError({ code: "BAD_REQUEST", message: "PROP_FIRM_DAILY_LOSS_LIMIT" })
        }

        if (account.maxTradesPerDay != null) {
          const todayCount = await ctx.prisma.trade.count({
            where: { accountId: input.accountId, userId: ctx.userId, date: tradeDate },
          })
          const violation = checkTradeCountLimit(todayCount, account.maxTradesPerDay)
          if (violation) throw new TRPCError({ code: "BAD_REQUEST", message: "PROP_FIRM_MAX_TRADES" })
        }

        const violation = checkSymbolAllowlist(input.symbol, account.allowedSymbols as string[])
        if (violation) throw new TRPCError({ code: "BAD_REQUEST", message: "PROP_FIRM_SYMBOL_NOT_ALLOWED" })
      }

      const trade = await ctx.prisma.trade.create({
        data: { ...input, userId: ctx.userId, date: new Date(input.date) },
        include: { account: true, setup: true, events: true },
      })

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
