// Weekly review report — pure aggregation over the week's trades (+ previous
// week for deltas) plus the saved WeeklyReview. P&L is in the user's base
// currency. Mirrors buildMonthlyReport but trends day-by-day instead of week.

import { isWin, calcWinRate, calcProfitFactor } from "@/lib/formulas"
import { sessionsOf, type ReportTrade } from "./monthly-report"

export type { ReportTrade }

export type WeeklyReport = {
  weekStart: string            // YYYY-MM-DD (Monday)
  weekLabel: string            // e.g. "Semana del 2 jun"
  baseCurrency: string
  kpis:   { netPnl: number; winRate: number; profitFactor: number; trades: number; disciplineScore: number | null }
  deltas: { netPnl: number; winRate: number; trades: number; disciplineScore: number | null }
  dayTrend:  { day: string; date: string; pnl: number; trades: number }[]
  bestDay:  { date: string; pnl: number } | null
  worstDay: { date: string; pnl: number } | null
  discipline: { violations: number; costo: number; rachaDiasLimpios: number }
  setups:    { name: string; pnl: number; trades: number }[]
  sessions:  { session: string; pnl: number; trades: number }[]
  byAccount: { name: string; pnl: number }[]
  saved: { executiveSummary: string; whatWorked: string; toImprove: string; status: string } | null
}

const round = (n: number) => parseFloat(n.toFixed(2))
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

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

export function buildWeeklyReport(opts: {
  weekStart: string
  weekLabel: string
  baseCurrency: string
  weekTrades: ReportTrade[]
  prevTrades: ReportTrade[]
  accountNames: Record<string, string>
  setupNames: Record<string, string>
  violationTags: readonly string[]
  weekScore: number | null
  prevScore: number | null
  saved: WeeklyReport["saved"]
}): WeeklyReport {
  const { weekTrades, prevTrades, accountNames, setupNames, violationTags } = opts
  const kpis = kpisOf(weekTrades, opts.weekScore)
  const prev = kpisOf(prevTrades, opts.prevScore)

  // Day trend — the 7 days from weekStart (Mon→Sun), zero-filled.
  const start = new Date(opts.weekStart + "T00:00:00")
  const dayMap: Record<string, { pnl: number; trades: number }> = {}
  for (const t of weekTrades) {
    const e = (dayMap[t.date] ??= { pnl: 0, trades: 0 })
    e.pnl += t.pnl; e.trades++
  }
  const dayTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const date = d.toISOString().slice(0, 10)
    const e = dayMap[date] ?? { pnl: 0, trades: 0 }
    return { day: DAY_LABELS[d.getDay()], date, pnl: round(e.pnl), trades: e.trades }
  })

  // Best / worst day (only days with trades)
  const days = Object.entries(dayMap)
  const bestDay  = days.length ? days.reduce((a, b) => (b[1].pnl > a[1].pnl ? b : a)) : null
  const worstDay = days.length ? days.reduce((a, b) => (b[1].pnl < a[1].pnl ? b : a)) : null

  // Discipline
  const isViol = (t: ReportTrade) => t.tags.some(tag => violationTags.includes(tag))
  const violTrades = weekTrades.filter(isViol)
  const tradingDays = [...new Set(weekTrades.map(t => t.date))].sort((a, b) => b.localeCompare(a))
  let racha = 0
  for (const d of tradingDays) {
    if (weekTrades.filter(t => t.date === d).some(isViol)) break
    racha++
  }

  // Setups (by |P&L|)
  const setupMap: Record<string, { pnl: number; trades: number }> = {}
  for (const t of weekTrades) {
    if (!t.setupId) continue
    const e = (setupMap[t.setupId] ??= { pnl: 0, trades: 0 })
    e.pnl += t.pnl; e.trades++
  }
  const setups = Object.entries(setupMap)
    .map(([id, v]) => ({ name: setupNames[id] ?? id, pnl: round(v.pnl), trades: v.trades }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))

  // P&L por cuenta
  const accMap: Record<string, number> = {}
  for (const t of weekTrades) accMap[t.accountId] = (accMap[t.accountId] ?? 0) + t.pnl
  const byAccount = Object.entries(accMap)
    .map(([id, pnl]) => ({ name: accountNames[id] ?? id, pnl: round(pnl) }))
    .sort((a, b) => b.pnl - a.pnl)

  return {
    weekStart: opts.weekStart,
    weekLabel: opts.weekLabel,
    baseCurrency: opts.baseCurrency,
    kpis,
    deltas: {
      netPnl: round(kpis.netPnl - prev.netPnl),
      winRate: parseFloat((kpis.winRate - prev.winRate).toFixed(2)),
      trades: kpis.trades - prev.trades,
      disciplineScore: kpis.disciplineScore != null && prev.disciplineScore != null ? kpis.disciplineScore - prev.disciplineScore : null,
    },
    dayTrend,
    bestDay:  bestDay  ? { date: bestDay[0],  pnl: round(bestDay[1].pnl)  } : null,
    worstDay: worstDay ? { date: worstDay[0], pnl: round(worstDay[1].pnl) } : null,
    discipline: {
      violations: violTrades.length,
      costo: round(violTrades.reduce((s, t) => s + t.pnl, 0)),
      rachaDiasLimpios: racha,
    },
    setups,
    sessions: sessionsOf(weekTrades),
    byAccount,
    saved: opts.saved,
  }
}
