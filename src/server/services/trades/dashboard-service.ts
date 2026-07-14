// ─────────────────────────────────────────────────────────────────────────────
// Dashboard stats service (TD-018) — the dashboardStats orchestration moved out
// of the trades router. Loads accounts/trades/setups/markets, normalizes (FX,
// practice partition, timezone day boundaries) and delegates every computation
// to the pure builders in domains/analytics. Behavior-preserving move.
// ─────────────────────────────────────────────────────────────────────────────
import type { PrismaClient } from "@/lib/generated/prisma/client"
import {
  buildKpis, buildAccountStats, buildEquityCurve, buildPnlByDate,
  buildSessionStats, buildHourStats, buildPnlBySymbol, buildPropFirmStatus,
  buildExecutionStats, buildDiscipline, buildAccountExposure,
} from "@/domains/analytics/services/dashboard-analytics"
import type {
  MinimalTrade, AccountBalance, AccountWithLimits, AccountLimits, Grain,
  KpiSummary, AccountStat, EquityCurvePoint, PnlByDatePoint,
  SessionStat, HourStat, SymbolStat, PropFirmStatus,
} from "@/domains/analytics/services/dashboard-analytics"
import { computeSetupStats, computeSessionMatrix, computeDirectionBreakdown } from "@/domains/analytics/services/setup-analytics"
import type { SetupStats, SessionMatrixRow, DirectionStats } from "@/domains/analytics/services/setup-analytics"
import { isPracticeType } from "@/domains/trading/account-reality"
import { parsePointValue } from "@/domains/trading/services/trade-service"
import { isCacheEnabled, getCachedStats, setCachedStats } from "@/domains/analytics/services/analytics-cache"
import { fxFactor, parseFxRates } from "@/lib/fx"
import { localDateISO, monthStartISO, weekStartISO, addDaysISO } from "@/lib/datetime/local"

export type DashboardOutput = {
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
  baseCurrency: string
}

export type DashboardStatsInput = {
  accountId?:       string
  from?:            string
  to?:              string
  period?:          "7d" | "1M" | "3M" | "6M" | "1Y" | "ALL"
  includePractice?: boolean
}

export async function getDashboardStats(prisma: PrismaClient, userId: string, input?: DashboardStatsInput): Promise<DashboardOutput> {
  // Trading-day boundaries ("today / this week / this month") are computed in the
  // USER's timezone, not UTC — a trade logged at 23:00 local must count toward the
  // local day. See lib/datetime/local.ts.
  const { timezone } = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } })
  const now        = new Date()
  const today      = localDateISO(now, timezone)
  const monthStart = monthStartISO(today)
  const weekStart  = weekStartISO(today)
  const period     = input?.period ?? "3M"

  const periodDays: Record<string, number | null> = { "7d": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "ALL": null }
  const days       = periodDays[period]
  const periodFrom = days != null ? addDaysISO(today, -days) : undefined
  const queryFrom  = input?.from ?? periodFrom
  const queryTo    = input?.to
  const grainMap: Record<string, Grain> = { "7d": "daily", "1M": "daily", "3M": "daily", "6M": "weekly", "1Y": "weekly", "ALL": "monthly" }
  const grain      = grainMap[period]

  // ── Practice (demo/backtest) scope ────────────────────────────────────
  // A single explicit account selection always wins (the user picked it on
  // purpose, even if it is a demo account).
  const singleAccount   = !!input?.accountId
  const includePractice = input?.includePractice ?? false
  const financialScope  = (includePractice || singleAccount) ? "all" : "real"

  // ── Cache lookup (feature-flagged) ────────────────────────────────────
  const cacheKey = `${period}:${input?.accountId ?? "all"}:${financialScope}`
  if (isCacheEnabled()) {
    const hit = await getCachedStats<DashboardOutput>(prisma, userId, cacheKey)
    if (hit) return hit
  }

  // ── Fetch ─────────────────────────────────────────────────────────────
  // Only active/paused accounts; archived (INACTIVE/LOST) are excluded from
  // all dashboard analytics (QA-002/003/004/005/009).
  const activeAccounts = await prisma.account.findMany({
    where: { userId, status: { in: ["ACTIVE", "PAUSED"] } },
    select: {
      id: true, name: true, type: true, status: true, currency: true,
      initialBalance: true, ddDailyPct: true, ddWeeklyPct: true, ddMonthlyPct: true, ddTotalPct: true,
      ddModel: true, maxTradesPerDay: true, allowedSymbols: true,
      maxLeverage: true, targetLeverage: true,
      consistencyPct: true, targetPct: true, minTradingDays: true,
      noWeekendHolding: true,
    },
  })
  const activeAccountIds = activeAccounts.map(a => a.id)

  // ── FX normalization (D-03) ───────────────────────────────────────────
  // Dashboard is portfolio-wide in the user's base currency. Convert each
  // account's amounts (P&L, balance) by its currency→base factor so the
  // aggregates and the account table stay consistent (no mixed divisas).
  const userProfile = await prisma.user.findUnique({ where: { id: userId }, select: { baseCurrency: true, fxRates: true } })
  const baseCurrency = userProfile?.baseCurrency ?? "USD"
  const fxRates = parseFxRates(userProfile?.fxRates)
  const fxByAccount = new Map(activeAccounts.map(a => [a.id, fxFactor(a.currency, baseCurrency, fxRates)]))
  const fx = (accountId: string) => fxByAccount.get(accountId) ?? 1

  const [tradeRows, setupRows, checklistRows, openTradeRows, marketRows] = await Promise.all([
    prisma.trade.findMany({
      where: {
        userId,
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
    prisma.setup.findMany({
      where: { userId },
      select: { id: true, name: true, abbreviation: true, color: true },
    }),
    prisma.tradeChecklistResult.findMany({
      where:  { userId },
      select: { tradeId: true, itemsChecked: true, itemsTotal: true },
    }),
    // OPEN positions + markets feed live leverage exposure (closed-only stats
    // above never see open trades).
    prisma.trade.findMany({
      where:  { userId, status: "OPEN", accountId: { in: activeAccountIds } },
      select: { accountId: true, symbol: true, entry: true, size: true },
    }),
    prisma.market.findMany({
      where:  { userId },
      select: { symbol: true, category: true, pointValue: true },
    }),
  ])

  const setupMap      = new Map(setupRows.map(s => [s.id, s]))
  const checklistMap  = new Map(checklistRows.map(r => [r.tradeId, { checked: r.itemsChecked.length, total: r.itemsTotal }]))

  // ── Normalize trades ──────────────────────────────────────────────────
  const allTrades: MinimalTrade[] = tradeRows.map(t => ({
    id:        t.id,
    accountId: t.accountId,
    symbol:    t.symbol,
    direction: t.direction,
    session:   t.session as string | null,
    openTime:  t.openTime as string | null,
    closeTime: t.closeTime as string | null,
    pnl:       t.pnl       != null ? Number(t.pnl) * fx(t.accountId) : 0,
    rMultiple: t.rMultiple != null ? Number(t.rMultiple) : null,
    tags:      t.tags      as string[],
    date:      (t.date as Date).toISOString().slice(0, 10),
    setupId:   t.setupId,
    entry:     Number(t.entry),
    stop:      Number(t.stop),
    target:    Number(t.target),
    size:      Number(t.size),
  }))

  // ── Practice partition ────────────────────────────────────────────────
  // Financial/performance builders see only real accounts by default;
  // `allTrades` is reserved for behavioural (discipline) metrics, which count
  // practice (demo/backtest) accounts too.
  const practiceIds = new Set(activeAccounts.filter(a => isPracticeType(a.type)).map(a => a.id))
  const trades   = financialScope === "all" ? allTrades      : allTrades.filter(t => !practiceIds.has(t.accountId))
  const accounts = financialScope === "all" ? activeAccounts : activeAccounts.filter(a => !practiceIds.has(a.id))

  const acctBalances: AccountBalance[]     = accounts.map(a => ({ id: a.id, initialBalance: Number(a.initialBalance) * fx(a.id) }))
  const acctWithLimits: AccountWithLimits[] = accounts.map(a => ({
    id:              a.id,
    name:            a.name,
    type:            a.type,
    initialBalance:  Number(a.initialBalance) * fx(a.id),
    ddDailyPct:      a.ddDailyPct  != null ? Number(a.ddDailyPct)  : null,
    ddTotalPct:      a.ddTotalPct  != null ? Number(a.ddTotalPct)  : null,
    ddModel:         a.ddModel,
    maxTradesPerDay: a.maxTradesPerDay,
    allowedSymbols:  a.allowedSymbols as string[],
    // Percentages / day-counts — no FX normalization (not currency amounts).
    consistencyPct:  a.consistencyPct != null ? Number(a.consistencyPct) : null,
    targetPct:       a.targetPct      != null ? Number(a.targetPct)      : null,
    minTradingDays:  a.minTradingDays,
    noWeekendHolding: a.noWeekendHolding,
  }))
  const limitsById: Record<string, AccountLimits> = Object.fromEntries(accounts.map(a => [a.id, {
    id:           a.id,
    type:         a.type,
    ddModel:      a.ddModel,
    ddDailyPct:   a.ddDailyPct   != null ? Number(a.ddDailyPct)   : null,
    ddWeeklyPct:  a.ddWeeklyPct  != null ? Number(a.ddWeeklyPct)  : null,
    ddMonthlyPct: a.ddMonthlyPct != null ? Number(a.ddMonthlyPct) : null,
    ddTotalPct:   a.ddTotalPct   != null ? Number(a.ddTotalPct)   : null,
  }]))

  // ── Core analytics (service delegation) ──────────────────────────────
  const kpis         = buildKpis(trades, today, monthStart, weekStart)
  const accountStats = buildAccountStats(trades, acctBalances, today, monthStart, weekStart, limitsById)

  // ── Live leverage exposure from OPEN positions ───────────────────────────
  const marketBySymbol = new Map(marketRows.map(m => [m.symbol, {
    category:   m.category as string,
    pointValue: parsePointValue(m.pointValue),
  }]))
  const balanceById = new Map(accountStats.map(s => [s.accountId, s.balance]))
  const exposureById = buildAccountExposure(
    openTradeRows.map(t => ({ accountId: t.accountId, symbol: t.symbol, entry: Number(t.entry), size: Number(t.size) })),
    marketBySymbol,
    accounts.map(a => ({
      id: a.id,
      balance: balanceById.get(a.id) ?? Number(a.initialBalance) * fx(a.id),
      maxLeverage: a.maxLeverage ?? null,
      targetLeverage: a.targetLeverage ?? null,
    })),
  )
  for (const s of accountStats) s.exposure = exposureById[s.accountId] ?? null
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
  const todayRaw = await prisma.trade.findMany({
    where:  { userId, date: new Date(today) },
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
  // Discipline is behavioural: it always counts practice accounts too.
  const discipline     = buildDiscipline(allTrades, allTrades.length)

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
    baseCurrency,
  }

  if (isCacheEnabled()) {
    await setCachedStats(prisma, userId, cacheKey, result)
  }

  return result
}
