// Batched per-month metrics for the "Ediciones" cover grid: one trade query across the
// listed months (fx-converted) + one goals query. Returns a map keyed by "YYYY-M".

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { fxFactor, parseFxRates } from "@/lib/fx"
import { isWin, calcWinRate, calcProfitFactor, getISOWeekKey } from "@/lib/formulas"

export interface MonthlyCardStat {
  netPnl: number
  winRate: number
  profitFactor: number
  totalR: number
  trades: number
  weeks: number[]        // per-ISO-week net P&L within the month (cover sparkline)
  goalsTotal: number
  goalsDone: number
  goalsPartial: number
}

const key = (year: number, month: number) => `${year}-${month}`

export async function loadMonthlyCardStats(
  prisma: PrismaClient,
  userId: string,
  months: { year: number; month: number }[],
): Promise<Map<string, MonthlyCardStat>> {
  const out = new Map<string, MonthlyCardStat>()
  if (months.length === 0) return out

  const sorted = [...months].sort((a, b) => (a.year - b.year) || (a.month - b.month))
  const spanStart = new Date(sorted[0].year, sorted[0].month - 1, 1)
  const last = sorted[sorted.length - 1]
  const spanEnd = new Date(last.year, last.month, 1) // exclusive (1st of month after last)

  const [user, accounts, trades, goals] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { baseCurrency: true, fxRates: true } }),
    prisma.account.findMany({ where: { userId }, select: { id: true, currency: true } }),
    prisma.trade.findMany({
      where: { userId, status: "CLOSED", date: { gte: spanStart, lt: spanEnd } },
      select: { accountId: true, pnl: true, rMultiple: true, date: true },
    }),
    prisma.monthlyGoal.findMany({
      where: { userId, OR: months.map(m => ({ year: m.year, month: m.month })) },
      select: { year: true, month: true, status: true },
    }),
  ])

  const baseCurrency = user?.baseCurrency ?? "USD"
  const fxRates = parseFxRates(user?.fxRates)
  const curById = new Map(accounts.map(a => [a.id, a.currency]))

  type Bucket = { netPnl: number; wins: number; total: number; grossWin: number; grossLoss: number; rSum: number; weeks: Record<string, number> }
  const acc = new Map<string, Bucket>()
  const wanted = new Set(months.map(m => key(m.year, m.month)))

  for (const t of trades) {
    const d = t.date as Date
    const k = key(d.getFullYear(), d.getMonth() + 1)
    if (!wanted.has(k)) continue
    const pnl = (t.pnl != null ? Number(t.pnl) : 0) * fxFactor(curById.get(t.accountId) ?? baseCurrency, baseCurrency, fxRates)
    const e = acc.get(k) ?? { netPnl: 0, wins: 0, total: 0, grossWin: 0, grossLoss: 0, rSum: 0, weeks: {} }
    e.netPnl += pnl
    e.total++
    if (isWin({ pnl })) e.wins++
    if (pnl > 0) e.grossWin += pnl
    else if (pnl < 0) e.grossLoss += Math.abs(pnl)
    if (t.rMultiple != null) e.rSum += Number(t.rMultiple)
    const wk = getISOWeekKey(d)
    e.weeks[wk] = (e.weeks[wk] ?? 0) + pnl
    acc.set(k, e)
  }

  const goalAgg = new Map<string, { total: number; done: number; partial: number }>()
  for (const g of goals) {
    const k = key(g.year, g.month)
    const e = goalAgg.get(k) ?? { total: 0, done: 0, partial: 0 }
    e.total++
    if (g.status === "done") e.done++
    else if (g.status === "partial") e.partial++
    goalAgg.set(k, e)
  }

  for (const m of months) {
    const k = key(m.year, m.month)
    const e = acc.get(k)
    const g = goalAgg.get(k) ?? { total: 0, done: 0, partial: 0 }
    const weeks = e ? Object.entries(e.weeks).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => parseFloat(v.toFixed(2))) : []
    out.set(k, {
      netPnl: e ? parseFloat(e.netPnl.toFixed(2)) : 0,
      winRate: e ? parseFloat(calcWinRate(e.wins, e.total).toFixed(2)) : 0,
      profitFactor: e ? parseFloat(calcProfitFactor(e.grossWin, e.grossLoss).toFixed(2)) : 0,
      totalR: e ? parseFloat(e.rSum.toFixed(2)) : 0,
      trades: e?.total ?? 0,
      weeks,
      goalsTotal: g.total,
      goalsDone: g.done,
      goalsPartial: g.partial,
    })
  }
  return out
}
