import { isWin, calcWinRate, calcProfitFactor, calcExpectancyR, calcSharpeRatio, getISOWeekKey } from "@/lib/formulas"
import { computeEquityCurve } from "@/domains/trading/services/account-service"
import { computeAccountRisk, accountDrawdown, type AccountRisk } from "@/domains/trading/services/risk-engine"
import { buildPropFirmExtras, type PropFirmExtras } from "@/domains/trading/services/prop-firm-status"
import { computeNotional, computeLeverageMetrics, leverageBand, type LeverageBand } from "@/domains/trading/services/leverage"

export type MinimalTrade = {
  id:        string
  accountId: string
  symbol:    string
  direction: string
  session:   string | null
  openTime:  string | null
  closeTime: string | null
  pnl:       number
  rMultiple: number | null
  tags:      string[]
  date:      string
  setupId:   string | null
  entry:     number
  stop:      number
  target:    number
  size:      number
  /**
   * Valor en dólares de un punto completo del instrumento (NQ = $20, ES = $50).
   * Sin él, cualquier cifra de DINERO derivada de precios queda mal por el
   * multiplicador. Opcional y con defecto 1 para instrumentos donde 1 unidad
   * = $1, la misma convención que `computeClosedTradePnl`.
   */
  pointValue?: number
}

export type AccountBalance = { id: string; initialBalance: number }

export type AccountWithLimits = {
  id:              string
  name:            string
  type:            string
  initialBalance:  number
  ddDailyPct:      number | null
  ddTotalPct:      number | null
  ddModel?:        string | null   // FIXED | TRAILING — drives prop-firm drawdown rule
  maxTradesPerDay: number | null
  allowedSymbols:  string[]
  // Prop-firm phase / rule config (POST-6). Optional so non-dashboard callers/tests
  // that build a minimal AccountWithLimits don't need to supply them.
  consistencyPct?:   number | null
  targetPct?:        number | null
  minTradingDays?:   number | null
  noWeekendHolding?: boolean
}

export type TodayTrade = { accountId: string; pnl: number | null; status: string }

export type KpiSummary = {
  total:             number
  wins:              number
  losses:            number
  be:                number
  winRate:           number
  avgR:              number
  netPnl:            number
  pnlMonth:          number
  pnlWeek:           number
  pnlToday:          number
  tradesCountToday:  number
  tradesCountWeek:   number
  expectancyR:       number
  expectancyDollar:  number
  profitFactor:      number
  sharpeRatio:       number | null
  bestDay:  { date: string; pnl: number } | null
  worstDay: { date: string; pnl: number } | null
  tradeStreak: { count: number; isWin: boolean } | null
}

export type AccountStat = {
  accountId:    string
  balance:      number
  netPnl:       number
  pnlMonth:     number
  pnlWeek:      number
  pnlToday:     number
  tradesToday:  number
  tradesMonth:  number
  tradesTotal:  number
  winRate:      number
  avgR:         number
  drawdownPct:  number
  sparkline:    number[]
  risk:         AccountRisk   // single source of truth for limit gauges + breach
  exposure?:    AccountExposure | null  // live open-position leverage, if any
}

/** Live market exposure from an account's currently OPEN positions. */
export type AccountExposure = {
  openPositions:     number
  notional:          number
  effectiveLeverage: number | null
  band:              LeverageBand | null
}

/**
 * Aggregate the notional + effective leverage of every account's OPEN positions.
 * Effective leverage = total open notional / current balance, banded against the
 * account's healthy target. Closed-only stats never see this, so it lives apart.
 */
export function buildAccountExposure(
  openTrades:     { accountId: string; symbol: string; entry: number; size: number }[],
  marketBySymbol: Map<string, { category: string; pointValue: number }>,
  accounts:       { id: string; balance: number; maxLeverage: number | null; targetLeverage: number | null }[],
): Record<string, AccountExposure> {
  const byAccount: Record<string, AccountExposure> = {}
  for (const a of accounts) {
    const ot = openTrades.filter(t => t.accountId === a.id)
    let notional = 0
    for (const t of ot) {
      const m = marketBySymbol.get(t.symbol)
      const n = m ? computeNotional({ category: m.category, pointValue: m.pointValue, price: t.entry, contracts: t.size }) : null
      if (n != null) notional += n
    }
    const lev = computeLeverageMetrics({ notional, balance: a.balance, maxLeverage: a.maxLeverage })
    byAccount[a.id] = {
      openPositions:     ot.length,
      notional:          parseFloat(notional.toFixed(2)),
      effectiveLeverage: lev.effectiveLeverage != null ? parseFloat(lev.effectiveLeverage.toFixed(2)) : null,
      band:              leverageBand(lev.effectiveLeverage, a.targetLeverage),
    }
  }
  return byAccount
}

export type AccountLimits = {
  id:           string
  type?:        string   // account type — drives prop-firm drawdown semantics
  ddModel?:     string | null   // FIXED | TRAILING — drives prop-firm drawdown rule
  ddDailyPct:   number | null
  ddWeeklyPct:  number | null
  ddMonthlyPct: number | null
  ddTotalPct:   number | null
}

export type EquityCurvePoint  = { date: string; balance: number; accountId: string }
export type PnlByDatePoint    = { date: string; pnl: number; accountId: string }
export type SessionStat       = { session: string; trades: number; winRate: number; avgR: number }
export type HourStat          = { hour: number;   trades: number; winRate: number; avgR: number }
export type SymbolStat        = { symbol: string; pnl: number; trades: number; winRate: number }
export type PropFirmStatus    = {
  accountId:      string
  name:           string
  ddPctUsed:      number   // % of allowed max-drawdown consumed (bar fill)
  ddActualPct:    number   // actual max drawdown as % of balance
  ddLimitPct:     number   // configured max-drawdown limit %
  dailyLossPct:   number   // % of allowed daily loss consumed (bar fill)
  dailyActualPct: number   // actual today loss as % of balance
  dailyLimitPct:  number   // configured daily-loss limit %
  tradesUsed:       number
  tradesMax:        number
  status:           "OK" | "ALERTA"
  allowedSymbols:   string[]
  noWeekendHolding: boolean   // POST-6: rule enabled → show weekend indicator
} & PropFirmExtras   // POST-6: trailing / consistency / phase progress (dashboard bars)

export type Grain = "daily" | "weekly" | "monthly"

// ── buildKpis ─────────────────────────────────────────────────────────────────

export function buildKpis(
  trades: MinimalTrade[],
  today: string,
  monthStart: string,
  weekStart?: string,
): KpiSummary {
  const total   = trades.length
  const wins    = trades.filter(t => isWin({ pnl: t.pnl })).length
  const losses  = trades.filter(t => t.pnl < 0).length
  const be      = total - wins - losses
  const netPnl  = trades.reduce((s, t) => s + t.pnl, 0)
  const winRate = calcWinRate(wins, total)

  const withR      = trades.filter(t => t.rMultiple != null)
  const avgR       = withR.length > 0 ? withR.reduce((s, t) => s + t.rMultiple!, 0) / withR.length : 0
  const grossWin   = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
  const grossLoss  = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
  const profitFactor  = calcProfitFactor(grossWin, grossLoss)
  const expectancyR   = calcExpectancyR(trades.map(t => ({ rMultiple: t.rMultiple })))
  const sharpeRatio   = calcSharpeRatio(withR.map(t => t.rMultiple!))

  // Expectancy in $ is the average realized P&L per closed trade — the dollar
  // analogue of expectancyR, and consistent with analytics-bundle (netPnl/total).
  // The previous win/loss decomposition (avgWin*wr − avgLoss*(1−wr)) folded
  // breakeven trades into the loss weight (1−wr counts them, but avgLoss excludes
  // them), biasing the figure more negative than the true mean per trade.
  const expectancyDollar = total > 0 ? netPnl / total : 0

  const pnlMonth        = trades.filter(t => t.date >= monthStart).reduce((s, t) => s + t.pnl, 0)
  const pnlToday        = trades.filter(t => t.date === today).reduce((s, t) => s + t.pnl, 0)
  const tradesCountToday = trades.filter(t => t.date === today).length
  const effectiveWeekStart = weekStart ?? today
  const pnlWeek         = trades.filter(t => t.date >= effectiveWeekStart && t.date <= today).reduce((s, t) => s + t.pnl, 0)
  const tradesCountWeek  = trades.filter(t => t.date >= effectiveWeekStart && t.date <= today).length

  const pnlByDateMap: Record<string, number> = {}
  for (const t of trades) pnlByDateMap[t.date] = (pnlByDateMap[t.date] ?? 0) + t.pnl
  const dateEntries = Object.entries(pnlByDateMap)
  const bestDay  = dateEntries.length > 0 ? dateEntries.reduce((a, b) => b[1] > a[1] ? b : a) : null
  const worstDay = dateEntries.length > 0 ? dateEntries.reduce((a, b) => b[1] < a[1] ? b : a) : null

  const sorted = [...trades].sort((a, b) =>
    b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  )
  let tradeStreak: { count: number; isWin: boolean } | null = null
  if (sorted.length > 0 && sorted[0].pnl !== 0) {
    const streakIsWin = isWin({ pnl: sorted[0].pnl })
    let count = 0
    for (const t of sorted) {
      if (streakIsWin ? isWin({ pnl: t.pnl }) : t.pnl < 0) count++
      else break
    }
    tradeStreak = { count, isWin: streakIsWin }
  }

  return {
    total,
    wins,
    losses,
    be,
    winRate:          parseFloat(winRate.toFixed(2)),
    avgR:             parseFloat(avgR.toFixed(4)),
    netPnl:           parseFloat(netPnl.toFixed(2)),
    pnlMonth:         parseFloat(pnlMonth.toFixed(2)),
    pnlWeek:          parseFloat(pnlWeek.toFixed(2)),
    pnlToday:         parseFloat(pnlToday.toFixed(2)),
    tradesCountToday,
    tradesCountWeek,
    expectancyR:      parseFloat(expectancyR.toFixed(4)),
    expectancyDollar: parseFloat(expectancyDollar.toFixed(2)),
    profitFactor:     parseFloat(profitFactor.toFixed(4)),
    sharpeRatio:      sharpeRatio != null ? parseFloat(sharpeRatio.toFixed(4)) : null,
    bestDay:  bestDay  ? { date: bestDay[0],  pnl: parseFloat(bestDay[1].toFixed(2))  } : null,
    worstDay: worstDay ? { date: worstDay[0], pnl: parseFloat(worstDay[1].toFixed(2)) } : null,
    tradeStreak,
  }
}

// ── buildAccountStats ─────────────────────────────────────────────────────────

export function buildAccountStats(
  trades:     MinimalTrade[],
  accounts:   AccountBalance[],
  today:      string,
  monthStart: string,
  weekStart:  string,
  limitsById: Record<string, AccountLimits> = {},
): AccountStat[] {
  return accounts.map(a => {
    const at = trades.filter(t => t.accountId === a.id)
    const initBal    = a.initialBalance
    const acctNetPnl = at.reduce((s, t) => s + t.pnl, 0)
    const acctWins   = at.filter(t => isWin({ pnl: t.pnl })).length
    const acctWithR  = at.filter(t => t.rMultiple != null)
    const monthT     = at.filter(t => t.date >= monthStart)
    const weekT      = at.filter(t => t.date >= weekStart)
    const todayT     = at.filter(t => t.date === today)

    const pnlMonth = monthT.reduce((s, t) => s + t.pnl, 0)
    const pnlWeek  = weekT.reduce((s, t) => s + t.pnl, 0)
    const pnlToday = todayT.reduce((s, t) => s + t.pnl, 0)

    // Equity at the start of each loss window = initial + P&L realized BEFORE the
    // window opened. Loss limits measure against this moving base (real prop-firm
    // behaviour), so today's daily allowance is a % of yesterday's closing equity.
    const monthBaseBalance = initBal + at.filter(t => t.date <  monthStart).reduce((s, t) => s + t.pnl, 0)
    const weekBaseBalance  = initBal + at.filter(t => t.date <  weekStart ).reduce((s, t) => s + t.pnl, 0)
    const dayBaseBalance   = initBal + at.filter(t => t.date <  today     ).reduce((s, t) => s + t.pnl, 0)

    const limits = limitsById[a.id] ?? { id: a.id, type: undefined, ddModel: undefined, ddDailyPct: null, ddWeeklyPct: null, ddMonthlyPct: null, ddTotalPct: null }
    // Prop firms with a FIXED model measure max loss from the initial balance,
    // not peak-to-trough — single source of truth: risk-engine.accountDrawdown.
    const isPropFirm = limits.type === "PROP_FIRM" || limits.type === "DEMO_PROP"
    const maxDd = accountDrawdown(at.map(t => t.pnl), { isPropFirm, ddModel: limits.ddModel })
    const sparkline = [initBal, ...computeEquityCurve(initBal, at).map(c => parseFloat(c.balance.toFixed(2)))]

    const risk = computeAccountRisk({
      initialBalance: initBal,
      ddDailyPct:   limits.ddDailyPct,
      ddWeeklyPct:  limits.ddWeeklyPct,
      ddMonthlyPct: limits.ddMonthlyPct,
      ddTotalPct:   limits.ddTotalPct,
      dayPnl:       pnlToday,
      weekPnl:      pnlWeek,
      monthPnl:     pnlMonth,
      dayBaseBalance,
      weekBaseBalance,
      monthBaseBalance,
      maxDrawdown:  maxDd,
    })

    return {
      accountId:   a.id,
      balance:     parseFloat((initBal + acctNetPnl).toFixed(2)),
      netPnl:      parseFloat(acctNetPnl.toFixed(2)),
      pnlMonth:    parseFloat(pnlMonth.toFixed(2)),
      pnlWeek:     parseFloat(pnlWeek.toFixed(2)),
      pnlToday:    parseFloat(pnlToday.toFixed(2)),
      tradesToday: todayT.length,
      tradesMonth: monthT.length,
      tradesTotal: at.length,
      winRate:     calcWinRate(acctWins, at.length),
      avgR:        acctWithR.length > 0 ? acctWithR.reduce((s, t) => s + t.rMultiple!, 0) / acctWithR.length : 0,
      drawdownPct: risk.total.actualPct,
      sparkline,
      risk,
    }
  })
}

// ── buildEquityCurve ──────────────────────────────────────────────────────────

export function buildEquityCurve(
  trades:   MinimalTrade[],
  accounts: AccountBalance[],
): EquityCurvePoint[] {
  const result: EquityCurvePoint[] = []
  for (const a of accounts) {
    const at = trades.filter(t => t.accountId === a.id)
    for (const point of computeEquityCurve(a.initialBalance, at)) {
      result.push({ date: point.date, balance: parseFloat(point.balance.toFixed(2)), accountId: a.id })
    }
  }
  return result
}

// ── buildPnlByDate ────────────────────────────────────────────────────────────

export function buildPnlByDate(
  trades: MinimalTrade[],
  grain:  Grain,
): PnlByDatePoint[] {
  const groupKey = grain === "weekly"
    ? (d: string) => getISOWeekKey(new Date(d))
    : grain === "monthly"
      ? (d: string) => d.slice(0, 7)
      : (d: string) => d

  const buckets: Record<string, Record<string, number>> = {}
  for (const t of trades) {
    const key = groupKey(t.date)
    if (!buckets[t.accountId]) buckets[t.accountId] = {}
    buckets[t.accountId][key] = (buckets[t.accountId][key] ?? 0) + t.pnl
  }

  const result: PnlByDatePoint[] = []
  for (const [accountId, dates] of Object.entries(buckets)) {
    for (const [date, pnl] of Object.entries(dates)) {
      result.push({ date, pnl: parseFloat(pnl.toFixed(2)), accountId })
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date))
}

// ── buildSessionStats ─────────────────────────────────────────────────────────

export function buildSessionStats(trades: MinimalTrade[]): SessionStat[] {
  const bySession: Record<string, { trades: number; wins: number; rSum: number }> = {}
  for (const t of trades) {
    const s = t.session ?? "Sin sesión"
    if (!bySession[s]) bySession[s] = { trades: 0, wins: 0, rSum: 0 }
    bySession[s].trades++
    if (isWin({ pnl: t.pnl })) bySession[s].wins++
    bySession[s].rSum += t.rMultiple ?? 0
  }
  return Object.entries(bySession)
    .map(([session, v]) => ({
      session,
      trades:  v.trades,
      winRate: calcWinRate(v.wins, v.trades),
      avgR:    v.trades > 0 ? v.rSum / v.trades : 0,
    }))
    .sort((a, b) => b.trades - a.trades)
}

// ── buildHourStats ────────────────────────────────────────────────────────────

export function buildHourStats(trades: MinimalTrade[]): HourStat[] {
  const byHour: Record<number, { trades: number; wins: number; rSum: number }> = {}
  for (const t of trades) {
    if (!t.openTime) continue
    const hour = parseInt(t.openTime.split(":")[0])
    if (isNaN(hour)) continue
    if (!byHour[hour]) byHour[hour] = { trades: 0, wins: 0, rSum: 0 }
    byHour[hour].trades++
    if (isWin({ pnl: t.pnl })) byHour[hour].wins++
    byHour[hour].rSum += t.rMultiple ?? 0
  }
  return Object.entries(byHour)
    .map(([h, v]) => ({
      hour:    parseInt(h),
      trades:  v.trades,
      winRate: calcWinRate(v.wins, v.trades),
      avgR:    v.trades > 0 ? v.rSum / v.trades : 0,
    }))
    .sort((a, b) => b.avgR - a.avgR)
}

// ── buildPnlBySymbol ──────────────────────────────────────────────────────────

export function buildPnlBySymbol(trades: MinimalTrade[], limit: number): SymbolStat[] {
  const bySymbol: Record<string, { pnl: number; trades: number; wins: number }> = {}
  for (const t of trades) {
    if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { pnl: 0, trades: 0, wins: 0 }
    bySymbol[t.symbol].pnl += t.pnl
    bySymbol[t.symbol].trades++
    if (isWin({ pnl: t.pnl })) bySymbol[t.symbol].wins++
  }
  return Object.entries(bySymbol)
    .map(([symbol, v]) => ({
      symbol,
      pnl:     parseFloat(v.pnl.toFixed(2)),
      trades:  v.trades,
      winRate: calcWinRate(v.wins, v.trades),
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, limit)
}

// ── buildPropFirmStatus ───────────────────────────────────────────────────────

export function buildPropFirmStatus(
  accounts:     AccountWithLimits[],
  closedTrades: MinimalTrade[],
  todayTrades:  TodayTrade[],
): PropFirmStatus[] {
  return accounts
    .filter(a => a.type === "PROP_FIRM" || a.type === "DEMO_PROP")
    .map(a => {
      const at      = closedTrades.filter(t => t.accountId === a.id)
      const initBal = a.initialBalance

      // Prop firms: FIXED model → loss from initial; TRAILING → peak-to-trough.
      const maxDd        = accountDrawdown(at.map(t => t.pnl), { isPropFirm: true, ddModel: a.ddModel })
      const ddTotalLimit = Number(a.ddTotalPct ?? 5)
      const ddActualPct  = initBal > 0 ? (maxDd / initBal) * 100 : 0
      const ddPctUsed    = ddTotalLimit > 0 ? ddActualPct / ddTotalLimit * 100 : 0

      const todayAt      = todayTrades.filter(t => t.accountId === a.id && t.status === "CLOSED")
      const todayLoss    = Math.abs(Math.min(0, todayAt.reduce((s, t) => s + Number(t.pnl ?? 0), 0)))
      const ddDailyLim   = Number(a.ddDailyPct ?? 1)
      const dailyActualPct = initBal > 0 ? (todayLoss / initBal) * 100 : 0
      const dailyLossPct = ddDailyLim > 0 ? dailyActualPct / ddDailyLim * 100 : 0

      const tradesUsed = todayTrades.filter(t => t.accountId === a.id).length
      const tradesMax  = a.maxTradesPerDay ?? 0
      const status: "OK" | "ALERTA" = ddPctUsed >= 70 || dailyLossPct >= 80 ? "ALERTA" : "OK"

      // ── Phase / trailing / consistency extras (POST-6) ──────────────────────
      // Derive the equity curve from this account's closed trades (already loaded,
      // chronological). currentEquity = initial + realized P&L; peakEquity = the
      // running high-water mark. dailyProfits groups net P&L per calendar day.
      const pnls = at.map(t => t.pnl)
      const currentEquity = initBal + pnls.reduce((s, p) => s + p, 0)
      let equity = initBal
      let peakEquity = initBal
      for (const p of pnls) { equity += p; if (equity > peakEquity) peakEquity = equity }
      const byDay = new Map<string, number>()
      for (const t of at) byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.pnl)
      const dailyProfits = [...byDay.values()]

      const extras = buildPropFirmExtras({
        initialBalance: initBal,
        currentEquity,
        peakEquity,
        ddTotalPct:     a.ddTotalPct,
        ddModel:        a.ddModel === "TRAILING" ? "TRAILING" : "FIXED",
        dailyProfits,
        consistencyPct: a.consistencyPct ?? null,
        targetPct:      a.targetPct ?? null,
        tradingDays:    byDay.size,
        minTradingDays: a.minTradingDays ?? null,
      })

      return {
        accountId:      a.id,
        name:           a.name,
        ddPctUsed:      parseFloat(ddPctUsed.toFixed(1)),
        ddActualPct:    parseFloat(ddActualPct.toFixed(1)),
        ddLimitPct:     parseFloat(ddTotalLimit.toFixed(1)),
        dailyLossPct:   parseFloat(dailyLossPct.toFixed(1)),
        dailyActualPct: parseFloat(dailyActualPct.toFixed(1)),
        dailyLimitPct:  parseFloat(ddDailyLim.toFixed(1)),
        tradesUsed,
        tradesMax,
        status,
        allowedSymbols:   a.allowedSymbols,
        noWeekendHolding: a.noWeekendHolding ?? false,
        ...extras,
      }
    })
}

// ── Execution stats ───────────────────────────────────────────────────────────

export type ExecutionStats = {
  avgDurationMinutes: number | null
  avgPlannedRisk:     number | null
  avgPlannedReward:   number | null
  riskRewardRatio:    number | null
}

/** Average trade duration (open→close minutes), planned risk/reward, R:R ratio. */
export function buildExecutionStats(trades: MinimalTrade[]): ExecutionStats {
  const durations: number[] = []
  const risks:     number[] = []
  const rewards:   number[] = []
  for (const t of trades) {
    if (t.openTime && t.closeTime) {
      const [oh, om] = t.openTime.split(":").map(Number)
      const [ch, cm] = t.closeTime.split(":").map(Number)
      const mins = (ch * 60 + cm) - (oh * 60 + om)
      if (mins > 0) durations.push(mins)
    }
    // Riesgo y recompensa PLANIFICADOS, en dinero: necesitan el valor del punto
    // igual que el P&L. `riskRewardRatio`, más abajo, es inmune — al ser un
    // cociente el factor se cancela, y por eso era correcto sin esto.
    const pv     = t.pointValue ?? 1
    const risk   = Math.abs(t.entry - t.stop)   * t.size * pv
    const reward = Math.abs(t.target - t.entry) * t.size * pv
    if (risk   > 0) risks.push(risk)
    if (reward > 0) rewards.push(reward)
  }
  const avg = (xs: number[]) => xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : null
  const avgDuration      = avg(durations)
  const avgPlannedRisk   = avg(risks)
  const avgPlannedReward = avg(rewards)
  return {
    avgDurationMinutes: avgDuration      != null ? parseFloat(avgDuration.toFixed(1))      : null,
    avgPlannedRisk:     avgPlannedRisk   != null ? parseFloat(avgPlannedRisk.toFixed(2))   : null,
    avgPlannedReward:   avgPlannedReward != null ? parseFloat(avgPlannedReward.toFixed(2)) : null,
    riskRewardRatio:    avgPlannedRisk && avgPlannedReward ? parseFloat((avgPlannedReward / avgPlannedRisk).toFixed(4)) : null,
  }
}

// ── Discipline ─────────────────────────────────────────────────────────────────

export type DisciplineSummary = {
  heatmapData:   { date: string; severity: 0 | 1 | 2 }[]
  rDistribution: { bucket: string; count: number }[]
  violations:    { rule: string; count: number; severity: "mayor" | "menor" }[]
  weeklyScore:   { week: string; score: number }[]
  aplusStats: {
    aplusCount: number; stdCount: number
    aplusWr: number | null; stdWr: number | null
    aplusAvgR: number | null; stdAvgR: number | null
  }
  composition:       { planSeguido: number; offPlan: number; partial: number }
  costoIndisciplina: number
  rachaDiasLimpios:  number
}

const R_BUCKETS = ["-3R","-2R","-1R","0R","+1R","+2R","+3R","+4R+"] as const

/** Behavioral discipline aggregation: heatmap, R-distribution, violations, weekly compliance, A+ vs std, clean-day streak. */
export function buildDiscipline(trades: MinimalTrade[], totalTrades: number): DisciplineSummary {
  const isOff = (t: MinimalTrade) => t.tags.includes("Impulsivo") || t.tags.includes("Off-plan")

  // Heatmap: worst severity per day (0 clean, 1 loss, 2 off-plan)
  const dateMap: Record<string, 0 | 1 | 2> = {}
  for (const t of trades) {
    const sev: 0 | 1 | 2 = isOff(t) ? 2 : t.pnl < 0 ? 1 : 0
    const cur = dateMap[t.date]
    if (cur === undefined || sev > cur) dateMap[t.date] = sev
  }
  const heatmapData = Object.entries(dateMap).map(([date, severity]) => ({ date, severity }))

  // R-multiple distribution
  const bucketMap: Record<string, number> = Object.fromEntries(R_BUCKETS.map(b => [b, 0]))
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
  const rDistribution = R_BUCKETS.map(b => ({ bucket: b, count: bucketMap[b] }))

  // Violation tallies
  const tally = (tag: string) => trades.filter(t => t.tags.includes(tag)).length
  const violations = [
    { rule: "Flag impulsivo manual",    count: tally("Impulsivo"),                  severity: "mayor" as const },
    { rule: "Off-plan",                 count: tally("Off-plan"),                   severity: "mayor" as const },
    { rule: "Revanche / revenge trade", count: tally("Revanche"),                   severity: "mayor" as const },
    { rule: "Sin setup asignado",       count: trades.filter(t => !t.setupId).length, severity: "menor" as const },
  ].filter(v => v.count > 0)

  // Weekly plan-adherence score (last 12 weeks)
  const byWeek: Record<string, { plan: number; total: number }> = {}
  for (const t of trades) {
    const key = getISOWeekKey(new Date(t.date))
    if (!byWeek[key]) byWeek[key] = { plan: 0, total: 0 }
    byWeek[key].total++
    if (t.setupId != null && !isOff(t)) byWeek[key].plan++
  }
  const weeklyScore = Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, v]) => ({ week: week.replace(/^\d{4}-/, ""), score: parseFloat((v.plan / v.total * 100).toFixed(2)) }))

  // A+ vs standard performance
  const aplus = trades.filter(t => t.tags.includes("A+"))
  const std   = trades.filter(t => !t.tags.includes("A+"))
  const avgR  = (xs: MinimalTrade[]) => xs.length > 0 ? xs.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / xs.length : null
  const aplusStats = {
    aplusCount: aplus.length,
    stdCount:   std.length,
    aplusWr:    aplus.length > 0 ? calcWinRate(aplus.filter(t => isWin({ pnl: t.pnl })).length, aplus.length) : null,
    stdWr:      std.length   > 0 ? calcWinRate(std.filter(t => isWin({ pnl: t.pnl })).length, std.length)     : null,
    aplusAvgR:  avgR(aplus),
    stdAvgR:    avgR(std),
  }

  // Composition + cost of indiscipline
  const planSeguido = trades.filter(t => t.setupId != null && !isOff(t)).length
  const offPlan     = trades.filter(isOff).length
  const composition = { planSeguido, offPlan, partial: Math.max(0, totalTrades - planSeguido - offPlan) }
  const costoIndisciplina = trades.filter(isOff).reduce((s, t) => s + t.pnl, 0)

  // Clean-day streak (consecutive most-recent days with no off-plan trade)
  const tradingDays = [...new Set(trades.map(t => t.date))].sort((a, b) => b.localeCompare(a))
  let rachaDiasLimpios = 0
  for (const day of tradingDays) {
    if (trades.filter(t => t.date === day).some(isOff)) break
    rachaDiasLimpios++
  }

  return {
    heatmapData, rDistribution, violations, weeklyScore, aplusStats, composition,
    costoIndisciplina: parseFloat(costoIndisciplina.toFixed(2)),
    rachaDiasLimpios,
  }
}
