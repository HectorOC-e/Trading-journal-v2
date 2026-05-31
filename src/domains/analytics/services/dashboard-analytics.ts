import { calcProfitFactor, calcExpectancyR, calcSharpeRatio, getISOWeekKey } from "@/lib/formulas"
import { computeMaxDrawdown, computeEquityCurve } from "@/domains/trading/services/account-service"

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
}

export type AccountBalance = { id: string; initialBalance: number }

export type AccountWithLimits = {
  id:              string
  name:            string
  type:            string
  initialBalance:  number
  ddDailyPct:      number | null
  ddTotalPct:      number | null
  maxTradesPerDay: number | null
  allowedSymbols:  string[]
}

export type TodayTrade = { accountId: string; pnl: number | null; status: string }

export type KpiSummary = {
  total:            number
  wins:             number
  losses:           number
  be:               number
  winRate:          number
  avgR:             number
  netPnl:           number
  pnlMonth:         number
  pnlToday:         number
  tradesCountToday: number
  expectancyR:      number
  expectancyDollar: number
  profitFactor:     number
  sharpeRatio:      number | null
  bestDay:  { date: string; pnl: number } | null
  worstDay: { date: string; pnl: number } | null
  tradeStreak: { count: number; isWin: boolean } | null
}

export type AccountStat = {
  accountId:   string
  balance:     number
  netPnl:      number
  pnlMonth:    number
  pnlToday:    number
  tradesToday: number
  winRate:     number
  avgR:        number
  drawdownPct: number
  sparkline:   number[]
}

export type EquityCurvePoint  = { date: string; balance: number; accountId: string }
export type PnlByDatePoint    = { date: string; pnl: number; accountId: string }
export type SessionStat       = { session: string; trades: number; winRate: number; avgR: number }
export type HourStat          = { hour: number;   trades: number; winRate: number; avgR: number }
export type SymbolStat        = { symbol: string; pnl: number; trades: number; winRate: number }
export type PropFirmStatus    = {
  accountId:      string
  name:           string
  ddPctUsed:      number
  dailyLossPct:   number
  tradesUsed:     number
  tradesMax:      number
  status:         "OK" | "ALERTA"
  allowedSymbols: string[]
}

export type Grain = "daily" | "weekly" | "monthly"

// ── buildKpis ─────────────────────────────────────────────────────────────────

export function buildKpis(
  trades: MinimalTrade[],
  today: string,
  monthStart: string,
): KpiSummary {
  const total   = trades.length
  const wins    = trades.filter(t => t.pnl > 0).length
  const losses  = trades.filter(t => t.pnl < 0).length
  const be      = total - wins - losses
  const netPnl  = trades.reduce((s, t) => s + t.pnl, 0)
  const winRate = total > 0 ? (wins / total) * 100 : 0

  const withR      = trades.filter(t => t.rMultiple != null)
  const avgR       = withR.length > 0 ? withR.reduce((s, t) => s + t.rMultiple!, 0) / withR.length : 0
  const grossWin   = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
  const grossLoss  = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
  const profitFactor  = calcProfitFactor(grossWin, grossLoss)
  const expectancyR   = calcExpectancyR(trades.map(t => ({ rMultiple: t.rMultiple, pnl: t.pnl })))
  const sharpeRatio   = calcSharpeRatio(withR.map(t => t.rMultiple!))

  const winsT   = trades.filter(t => t.pnl > 0)
  const lossesT = trades.filter(t => t.pnl < 0)
  const avgWin  = winsT.length   > 0 ? winsT.reduce((s, t) => s + t.pnl, 0) / winsT.length : 0
  const avgLoss = lossesT.length > 0 ? Math.abs(lossesT.reduce((s, t) => s + t.pnl, 0) / lossesT.length) : 0
  const wr      = total > 0 ? winsT.length / total : 0
  const expectancyDollar = avgWin * wr - avgLoss * (1 - wr)

  const pnlMonth        = trades.filter(t => t.date >= monthStart).reduce((s, t) => s + t.pnl, 0)
  const pnlToday        = trades.filter(t => t.date === today).reduce((s, t) => s + t.pnl, 0)
  const tradesCountToday = trades.filter(t => t.date === today).length

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
    const isWin = sorted[0].pnl > 0
    let count = 0
    for (const t of sorted) {
      if (isWin ? t.pnl > 0 : t.pnl < 0) count++
      else break
    }
    tradeStreak = { count, isWin }
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
    pnlToday:         parseFloat(pnlToday.toFixed(2)),
    tradesCountToday,
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
): AccountStat[] {
  return accounts.map(a => {
    const at = trades.filter(t => t.accountId === a.id)
    const initBal    = a.initialBalance
    const acctNetPnl = at.reduce((s, t) => s + t.pnl, 0)
    const acctWins   = at.filter(t => t.pnl > 0).length
    const acctWithR  = at.filter(t => t.rMultiple != null)
    const monthT     = at.filter(t => t.date >= monthStart)
    const todayT     = at.filter(t => t.date === today)

    const maxDd = computeMaxDrawdown(at.map(t => t.pnl))
    const sparkline = [initBal, ...computeEquityCurve(initBal, at).map(c => parseFloat(c.balance.toFixed(2)))]

    return {
      accountId:   a.id,
      balance:     parseFloat((initBal + acctNetPnl).toFixed(2)),
      netPnl:      parseFloat(acctNetPnl.toFixed(2)),
      pnlMonth:    parseFloat(monthT.reduce((s, t) => s + t.pnl, 0).toFixed(2)),
      pnlToday:    parseFloat(todayT.reduce((s, t) => s + t.pnl, 0).toFixed(2)),
      tradesToday: todayT.length,
      winRate:     at.length > 0 ? (acctWins / at.length) * 100 : 0,
      avgR:        acctWithR.length > 0 ? acctWithR.reduce((s, t) => s + t.rMultiple!, 0) / acctWithR.length : 0,
      drawdownPct: initBal > 0 ? (maxDd / initBal) * 100 : 0,
      sparkline,
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
    if (t.pnl > 0) bySession[s].wins++
    bySession[s].rSum += t.rMultiple ?? 0
  }
  return Object.entries(bySession)
    .map(([session, v]) => ({
      session,
      trades:  v.trades,
      winRate: v.trades > 0 ? v.wins / v.trades * 100 : 0,
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
    if (t.pnl > 0) byHour[hour].wins++
    byHour[hour].rSum += t.rMultiple ?? 0
  }
  return Object.entries(byHour)
    .map(([h, v]) => ({
      hour:    parseInt(h),
      trades:  v.trades,
      winRate: v.trades > 0 ? v.wins / v.trades * 100 : 0,
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
    if (t.pnl > 0) bySymbol[t.symbol].wins++
  }
  return Object.entries(bySymbol)
    .map(([symbol, v]) => ({
      symbol,
      pnl:     parseFloat(v.pnl.toFixed(2)),
      trades:  v.trades,
      winRate: v.trades > 0 ? v.wins / v.trades * 100 : 0,
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

      const maxDd        = computeMaxDrawdown(at.map(t => t.pnl))
      const ddTotalLimit = Number(a.ddTotalPct ?? 5)
      const ddPctUsed    = initBal > 0 && ddTotalLimit > 0
        ? (maxDd / initBal) / (ddTotalLimit / 100) * 100
        : 0

      const todayAt     = todayTrades.filter(t => t.accountId === a.id && t.status === "CLOSED")
      const todayLoss   = Math.abs(Math.min(0, todayAt.reduce((s, t) => s + Number(t.pnl ?? 0), 0)))
      const ddDailyLim  = Number(a.ddDailyPct ?? 1)
      const dailyLossPct = initBal > 0 && ddDailyLim > 0
        ? (todayLoss / initBal) / (ddDailyLim / 100) * 100
        : 0

      const tradesUsed = todayTrades.filter(t => t.accountId === a.id).length
      const tradesMax  = a.maxTradesPerDay ?? 0
      const status: "OK" | "ALERTA" = ddPctUsed >= 70 || dailyLossPct >= 80 ? "ALERTA" : "OK"

      return {
        accountId:      a.id,
        name:           a.name,
        ddPctUsed:      parseFloat(ddPctUsed.toFixed(1)),
        dailyLossPct:   parseFloat(dailyLossPct.toFixed(1)),
        tradesUsed,
        tradesMax,
        status,
        allowedSymbols: a.allowedSymbols,
      }
    })
}
