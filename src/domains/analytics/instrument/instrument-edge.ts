// ─────────────────────────────────────────────────────────────────────────────
// Edge per instrument (#24, ANALYTICS_V3 §9) — absorbs the Mercados screen: its
// value reappears as a DECISION, not a watchlist. Per symbol: WR, avg R,
// expectancy, n, net P&L and contribution share — plus a PRUNE suggestion when a
// symbol's edge is significantly negative (Welch one-sample vs 0), so "no operar
// US30" is offered on signal, not on a noisy losing streak. Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

import { oneSampleTTest } from "@/domains/analytics/institutional/stats/welch"

export interface InstrumentTrade {
  symbol: string
  rMultiple: number | null
  pnl: number
}

export type EdgeVerdict = "positive" | "negative" | "neutral"

export interface InstrumentEdge {
  symbol: string
  trades: number
  winRate: number
  /** Mean R (= expectancy in R) over trades with an R; null when none. */
  avgR: number | null
  netPnl: number
  /** Share of the total net P&L (signed); null when total is 0. */
  pnlContributionPct: number | null
  /** Edge verdict vs zero expectancy, by significance. */
  edge: EdgeVerdict
  pValue: number | null
  /** True when the edge is significantly negative — a pruning candidate. */
  prune: boolean
}

export interface InstrumentEdgeResult {
  bySymbol: InstrumentEdge[]
  totalNetPnl: number
}

const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length

export function computeInstrumentEdges(
  trades: InstrumentTrade[],
  opts: { minSample?: number; alpha?: number } = {},
): InstrumentEdgeResult {
  const minSample = opts.minSample ?? 8
  const alpha = opts.alpha ?? 0.05

  const groups = new Map<string, InstrumentTrade[]>()
  for (const t of trades) {
    const g = groups.get(t.symbol) ?? []
    g.push(t)
    groups.set(t.symbol, g)
  }

  const totalNetPnl = trades.reduce((s, t) => s + t.pnl, 0)

  const bySymbol: InstrumentEdge[] = [...groups.entries()].map(([symbol, ts]) => {
    const wins = ts.filter((t) => t.pnl > 0).length
    const rs = ts.filter((t) => t.rMultiple != null).map((t) => t.rMultiple!)
    const netPnl = ts.reduce((s, t) => s + t.pnl, 0)

    let edge: EdgeVerdict = "neutral"
    let pValue: number | null = null
    if (ts.length >= minSample && rs.length >= 2) {
      const test = oneSampleTTest(rs, 0)
      if (test) {
        pValue = test.pValue
        if (test.pValue < alpha) edge = test.t < 0 ? "negative" : "positive"
      }
    }

    return {
      symbol,
      trades: ts.length,
      winRate: ts.length > 0 ? (wins / ts.length) * 100 : 0,
      avgR: rs.length > 0 ? mean(rs) : null,
      netPnl,
      pnlContributionPct: totalNetPnl !== 0 ? netPnl / totalNetPnl : null,
      edge,
      pValue,
      prune: edge === "negative",
    }
  })

  // Worst net P&L first — prune candidates surface on top.
  bySymbol.sort((a, b) => a.netPnl - b.netPnl)
  return { bySymbol, totalNetPnl }
}
