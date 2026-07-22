// Builds the EvalContext (field → value) for a trade trigger. One closed-trades
// query computes the account metrics; trade fields come from the input (pre) or the
// saved trade (post). Returned lazily by the trade hooks (only when rules exist).

import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { EvalContext } from "./types"

export interface ContextTrade {
  symbol: string
  direction: string
  session: string | null
  setupId: string | null
  size: number
  entry: number
  stop: number
  tags: string[]
  date: string                 // YYYY-MM-DD
  pnl?: number | null          // known post-trade
  rMultiple?: number | null    // known post-trade
  /** Dollar value of one point (NQ = $20). Without it `riskPct` is off by the
   *  instrument multiplier. Defaults to 1 (price-difference instruments). */
  pointValue?: number
}
export interface ContextAccount { id: string; initialBalance: number }

function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

export async function buildContext(
  prisma: PrismaClient,
  userId: string,
  account: ContextAccount,
  t: ContextTrade,
): Promise<EvalContext> {
  const closed = await prisma.trade.findMany({
    where:   { userId, accountId: account.id, status: "CLOSED" },
    select:  { pnl: true, date: true, createdAt: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  })
  const rows = closed.map((c) => ({ pnl: Number(c.pnl ?? 0), day: (c.date as Date).toISOString().slice(0, 10), createdAt: c.createdAt as Date }))

  const weekStart = mondayOf(t.date)
  const dayPnl  = rows.filter((r) => r.day === t.date).reduce((s, r) => s + r.pnl, 0)
  const weekPnl = rows.filter((r) => r.day >= weekStart).reduce((s, r) => s + r.pnl, 0)
  const tradesToday = rows.filter((r) => r.day === t.date).length
  const wins = rows.filter((r) => r.pnl > 0).length
  const winRate = rows.length ? (wins / rows.length) * 100 : 0

  // Max drawdown % over the closed-trade equity path. The walk starts at the
  // initial balance on purpose — drawdown is measured along the whole path.
  let bal = account.initialBalance, peak = bal, ddMax = 0
  for (const r of rows) { bal += r.pnl; peak = Math.max(peak, bal); if (peak > 0) ddMax = Math.max(ddMax, ((peak - bal) / peak) * 100) }
  // …and having walked it, `bal` is the current equity.
  const equity = bal

  // Minutes since the most recent losing trade (for revenge-trade rules).
  const lastLoss = [...rows].reverse().find((r) => r.pnl < 0)
  const minsSinceLastLoss = lastLoss ? Math.max(0, Math.round((Date.now() - lastLoss.createdAt.getTime()) / 60000)) : 999999

  // Percentages divide by EQUITY, not by the initial balance. Dividing by the
  // latter made these three fields a constant 0 on every account whose initial
  // balance was never set (0 — 3 of 5 in production), so a rule conditioned on
  // riskPct/dayPnlPct/weekPnlPct evaluated 0 % forever and protected nothing.
  // Same defect fixed in `createTrade` (#152); same basis used there.
  // Money at risk — needs the point value for the same reason P&L does.
  const risk = Math.abs(t.entry - t.stop) * t.size * (t.pointValue ?? 1)

  return {
    symbol: t.symbol,
    direction: t.direction,
    session: t.session,
    setupId: t.setupId ?? "",
    size: t.size,
    tags: t.tags,
    pnl: t.pnl ?? null,
    rMultiple: t.rMultiple ?? null,
    riskPct: equity > 0 ? (risk / equity) * 100 : 0,
    dayPnlPct: equity > 0 ? (dayPnl / equity) * 100 : 0,
    weekPnlPct: equity > 0 ? (weekPnl / equity) * 100 : 0,
    drawdownPct: ddMax,
    winRate,
    tradesToday,
    minsSinceLastLoss,
  }
}
