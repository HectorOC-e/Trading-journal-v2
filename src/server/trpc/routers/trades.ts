import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import type { Prisma } from "@/lib/generated/prisma/client"
import { getISOWeekKey, calcProfitFactor, calcExpectancyR } from "@/lib/formulas"
import type { AccountLogPayload } from "@/types"
import { computeClosedTradePnl, computeRMultiple, computeScaleInAvgEntry } from "@/domains/trading/services/trade-service"
import { checkDailyLossLimit, checkTradeCountLimit, checkSymbolAllowlist } from "@/domains/trading/services/prop-firm-guard"
import { computeMaxDrawdown } from "@/domains/trading/services/account-service"
import {
  buildKpis, buildAccountStats, buildEquityCurve, buildPnlByDate,
  buildSessionStats, buildHourStats, buildPnlBySymbol, buildPropFirmStatus,
} from "@/domains/analytics/services/dashboard-analytics"
import type { MinimalTrade, AccountBalance, AccountWithLimits, Grain } from "@/domains/analytics/services/dashboard-analytics"
import { computeSetupStats, computeSessionMatrix, computeDirectionBreakdown } from "@/domains/analytics/services/setup-analytics"
import type { DirectionStats } from "@/domains/analytics/services/setup-analytics"

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

      // ── Fetch ─────────────────────────────────────────────────────────────
      const [tradeRows, accounts, setupRows] = await Promise.all([
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
      ])

      const setupMap = new Map(setupRows.map(s => [s.id, s]))

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
      const setupStats     = setupIds.map((id, i) => computeSetupStats(id, trades, setupMetas[i])).sort((a, b) => b.trades - a.trades)
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
        aplusWr:    aplusTrades.length > 0 ? aplusTrades.filter(t => t.pnl > 0).length / aplusTrades.length * 100 : null,
        stdWr:      stdTrades.length   > 0 ? stdTrades.filter(t => t.pnl > 0).length   / stdTrades.length   * 100 : null,
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

      return {
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
          return { trade: serializeTrade(updated), accountDeactivated: true }
        }
      }

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

      const wins    = trades.filter(t => Number(t.pnl ?? 0) > 0).length
      const losses  = trades.filter(t => Number(t.pnl ?? 0) < 0).length
      const be      = total - wins - losses
      const winRate = Math.round((wins / total) * 100)
      const netPnl  = trades.reduce((s: number, t) => s + Number(t.pnl ?? 0), 0)

      const closedWithR = trades.filter(t => t.rMultiple != null)
      const avgR = closedWithR.length > 0
        ? closedWithR.reduce((s: number, t) => s + Number(t.rMultiple!), 0) / closedWithR.length
        : 0

      const grossWin  = trades.filter(t => Number(t.pnl ?? 0) > 0).reduce((s: number, t) => s + Number(t.pnl ?? 0), 0)
      const grossLoss = Math.abs(trades.filter(t => Number(t.pnl ?? 0) < 0).reduce((s: number, t) => s + Number(t.pnl ?? 0), 0))
      const profitFactor = calcProfitFactor(grossWin, grossLoss)

      const expectancy = calcExpectancyR(
        trades.map(t => ({ rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null, pnl: t.pnl != null ? Number(t.pnl) : null })),
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
