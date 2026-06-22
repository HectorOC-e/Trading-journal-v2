// Monthly review report — pure aggregation over the month's trades (+ previous
// month for deltas) plus the saved MonthlyReview. P&L is in the user's base currency.

import { isWin, calcWinRate, calcProfitFactor, getISOWeekKey } from "@/lib/formulas"

export type ReportTrade = {
  accountId: string
  pnl: number          // already converted to base currency
  rMultiple: number | null
  date: string         // YYYY-MM-DD
  setupId: string | null
  tags: string[]
  session: string      // trading session / time-of-day bucket ("Sin sesión" when unset)
}

/** Aggregate P&L and count by trading session. Shared by weekly + monthly reports. */
export function sessionsOf(trades: ReportTrade[]): { session: string; pnl: number; trades: number }[] {
  const map: Record<string, { pnl: number; trades: number }> = {}
  for (const t of trades) {
    const key = t.session || "Sin sesión"
    const e = (map[key] ??= { pnl: 0, trades: 0 })
    e.pnl += t.pnl; e.trades++
  }
  return Object.entries(map)
    .map(([session, v]) => ({ session, pnl: parseFloat(v.pnl.toFixed(2)), trades: v.trades }))
    .sort((a, b) => b.trades - a.trades)
}

export type MonthlyReport = {
  year: number
  month: number
  baseCurrency: string
  kpis:   { netPnl: number; winRate: number; profitFactor: number; trades: number; disciplineScore: number | null }
  deltas: { netPnl: number; winRate: number; trades: number; disciplineScore: number | null }
  weekTrend:  { week: string; pnl: number }[]
  bestDay:  { date: string; pnl: number } | null
  worstDay: { date: string; pnl: number } | null
  discipline: { violations: number; costo: number; rachaDiasLimpios: number }
  setups:    { name: string; pnl: number; trades: number }[]
  sessions:  { session: string; pnl: number; trades: number }[]
  byAccount: { name: string; pnl: number }[]
  saved: { summary: string; keyThemes: string[]; goalsSet: string[]; goalsMet: string[]; overallScore: number | null } | null
}

const round = (n: number) => parseFloat(n.toFixed(2))

function kpisOf(trades: ReportTrade[], disciplineScore: number | null) {
  const total = trades.length
  const wins  = trades.filter(t => isWin({ pnl: t.pnl })).length
  const netPnl = trades.reduce((s, t) => s + t.pnl, 0)
  const grossWin  = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
  return {
    netPnl: round(netPnl),
    winRate: parseFloat(calcWinRate(wins, total).toFixed(2)),
    profitFactor: parseFloat(calcProfitFactor(grossWin, grossLoss).toFixed(2)),
    trades: total,
    disciplineScore,
  }
}

export function buildMonthlyReport(opts: {
  year: number
  month: number
  baseCurrency: string
  monthTrades: ReportTrade[]
  prevTrades: ReportTrade[]
  accountNames: Record<string, string>
  setupNames: Record<string, string>
  violationTags: readonly string[]
  monthScore: number | null
  prevScore: number | null
  saved: MonthlyReport["saved"]
}): MonthlyReport {
  const { monthTrades, prevTrades, accountNames, setupNames, violationTags } = opts
  const kpis = kpisOf(monthTrades, opts.monthScore)
  const prev = kpisOf(prevTrades, opts.prevScore)

  // Week trend (ISO week within the month)
  const weekMap: Record<string, number> = {}
  for (const t of monthTrades) {
    const key = getISOWeekKey(new Date(t.date))
    weekMap[key] = (weekMap[key] ?? 0) + t.pnl
  }
  const weekTrend = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, pnl]) => ({ week: week.replace(/^\d{4}-/, ""), pnl: round(pnl) }))

  // Best / worst day
  const dayMap: Record<string, number> = {}
  for (const t of monthTrades) dayMap[t.date] = (dayMap[t.date] ?? 0) + t.pnl
  const days = Object.entries(dayMap)
  const bestDay  = days.length ? days.reduce((a, b) => (b[1] > a[1] ? b : a)) : null
  const worstDay = days.length ? days.reduce((a, b) => (b[1] < a[1] ? b : a)) : null

  // Discipline
  const isViol = (t: ReportTrade) => t.tags.some(tag => violationTags.includes(tag))
  const violTrades = monthTrades.filter(isViol)
  const tradingDays = [...new Set(monthTrades.map(t => t.date))].sort((a, b) => b.localeCompare(a))
  let racha = 0
  for (const d of tradingDays) {
    if (monthTrades.filter(t => t.date === d).some(isViol)) break
    racha++
  }

  // Setups del mes (by P&L)
  const setupMap: Record<string, { pnl: number; trades: number }> = {}
  for (const t of monthTrades) {
    if (!t.setupId) continue
    const e = (setupMap[t.setupId] ??= { pnl: 0, trades: 0 })
    e.pnl += t.pnl; e.trades++
  }
  const setups = Object.entries(setupMap)
    .map(([id, v]) => ({ name: setupNames[id] ?? id, pnl: round(v.pnl), trades: v.trades }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))

  // P&L por cuenta
  const accMap: Record<string, number> = {}
  for (const t of monthTrades) accMap[t.accountId] = (accMap[t.accountId] ?? 0) + t.pnl
  const byAccount = Object.entries(accMap)
    .map(([id, pnl]) => ({ name: accountNames[id] ?? id, pnl: round(pnl) }))
    .sort((a, b) => b.pnl - a.pnl)

  return {
    year: opts.year,
    month: opts.month,
    baseCurrency: opts.baseCurrency,
    kpis,
    deltas: {
      netPnl: round(kpis.netPnl - prev.netPnl),
      winRate: parseFloat((kpis.winRate - prev.winRate).toFixed(2)),
      trades: kpis.trades - prev.trades,
      disciplineScore: kpis.disciplineScore != null && prev.disciplineScore != null ? kpis.disciplineScore - prev.disciplineScore : null,
    },
    weekTrend,
    bestDay:  bestDay  ? { date: bestDay[0],  pnl: round(bestDay[1])  } : null,
    worstDay: worstDay ? { date: worstDay[0], pnl: round(worstDay[1]) } : null,
    discipline: {
      violations: violTrades.length,
      costo: round(violTrades.reduce((s, t) => s + t.pnl, 0)),
      rachaDiasLimpios: racha,
    },
    setups,
    sessions: sessionsOf(monthTrades),
    byAccount,
    saved: opts.saved,
  }
}
