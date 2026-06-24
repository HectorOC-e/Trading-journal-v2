// Batched per-week extras (Profit Factor + Avg R) for the reviews list cards.
// The list page shows many weeks; computing a full analytics bundle per week would
// be costly, so we fetch every closed trade across the listed weeks' span in ONE
// query, convert to base currency, and bucket by each trade's Monday. Returns a map
// keyed by the review's weekStart (YYYY-MM-DD).

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { fxFactor, parseFxRates } from "@/lib/fx"
import { isWin, calcWinRate, calcProfitFactor } from "@/lib/formulas"

export interface WeeklyCardStat {
  netPnl: number
  winRate: number
  trades: number
  profitFactor: number
  avgR: number
  spark: number[]
}

/** Monday (UTC) of the ISO week containing `iso` (YYYY-MM-DD). */
function mondayOf(iso: string): string {
  const d = new Date(iso + "T00:00:00Z")
  const diff = (d.getUTCDay() + 6) % 7 // 0=Mon … 6=Sun → days back to Monday
  d.setUTCDate(d.getUTCDate() - diff)
  return d.toISOString().slice(0, 10)
}

export async function loadWeeklyCardStats(
  prisma: PrismaClient,
  userId: string,
  weekStarts: string[],
): Promise<Map<string, WeeklyCardStat>> {
  const out = new Map<string, WeeklyCardStat>()
  if (weekStarts.length === 0) return out

  const wanted = new Set(weekStarts)
  const sorted = [...weekStarts].sort()
  const spanStart = new Date(sorted[0] + "T00:00:00Z")
  const spanEnd = new Date(sorted[sorted.length - 1] + "T00:00:00Z")
  spanEnd.setUTCDate(spanEnd.getUTCDate() + 7) // exclusive upper bound of the last week

  const [user, accounts, trades] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { baseCurrency: true, fxRates: true } }),
    prisma.account.findMany({ where: { userId }, select: { id: true, currency: true } }),
    prisma.trade.findMany({
      where: { userId, status: "CLOSED", date: { gte: spanStart, lt: spanEnd } },
      select: { accountId: true, pnl: true, rMultiple: true, date: true },
    }),
  ])

  const baseCurrency = user?.baseCurrency ?? "USD"
  const fxRates = parseFxRates(user?.fxRates)
  const curById = new Map(accounts.map(a => [a.id, a.currency]))

  type Bucket = { netPnl: number; wins: number; total: number; grossWin: number; grossLoss: number; rSum: number; rCount: number; days: number[] }
  const acc = new Map<string, Bucket>()
  for (const t of trades) {
    const dayISO = (t.date as Date).toISOString().slice(0, 10)
    const wk = mondayOf(dayISO)
    if (!wanted.has(wk)) continue
    const pnl = (t.pnl != null ? Number(t.pnl) : 0) * fxFactor(curById.get(t.accountId) ?? baseCurrency, baseCurrency, fxRates)
    const e = acc.get(wk) ?? { netPnl: 0, wins: 0, total: 0, grossWin: 0, grossLoss: 0, rSum: 0, rCount: 0, days: [0, 0, 0, 0, 0, 0, 0] }
    e.netPnl += pnl
    e.total++
    if (isWin({ pnl })) e.wins++
    if (pnl > 0) e.grossWin += pnl
    else if (pnl < 0) e.grossLoss += Math.abs(pnl)
    if (t.rMultiple != null) { e.rSum += Number(t.rMultiple); e.rCount++ }
    const dayIdx = Math.min(6, Math.max(0, Math.round((Date.parse(dayISO + "T00:00:00Z") - Date.parse(wk + "T00:00:00Z")) / 86_400_000)))
    e.days[dayIdx] += pnl
    acc.set(wk, e)
  }

  for (const wk of weekStarts) {
    const e = acc.get(wk)
    // Cumulative (equity) spark across the 7 days, base-currency.
    let running = 0
    const spark = (e?.days ?? [0, 0, 0, 0, 0, 0, 0]).map(d => (running += d, parseFloat(running.toFixed(2))))
    out.set(wk, {
      netPnl: e ? parseFloat(e.netPnl.toFixed(2)) : 0,
      winRate: e ? parseFloat(calcWinRate(e.wins, e.total).toFixed(2)) : 0,
      trades: e?.total ?? 0,
      profitFactor: e ? parseFloat(calcProfitFactor(e.grossWin, e.grossLoss).toFixed(2)) : 0,
      avgR: e && e.rCount ? parseFloat((e.rSum / e.rCount).toFixed(2)) : 0,
      spark,
    })
  }
  return out
}
