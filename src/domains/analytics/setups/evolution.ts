// ─────────────────────────────────────────────────────────────────────────────
// Setup edge evolution curve (#21, ANALYTICS_V3 §5.2). A time series of
// WR / avg R / net P&L per setup, built on the S0 `rollingWindow` primitive from
// the trade history — the data behind `EdgeEvolutionChart` (UI lands in S12).
// Computed on the fly from trades; persisting `SetupEdgeSnapshot` (E18) is a
// later optimization (ImprovementScore / recompute). Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

import { rollingWindow, type Dated, type Window, type WindowSize } from "@/domains/analytics/longitudinal/rolling-window"

export interface EvolutionPoint {
  rMultiple: number | null
  pnl: number
}

export interface EvolutionMetrics {
  trades: number
  /** Win-rate in percent. */
  winRate: number
  /** Mean R over trades that carry an R; null when none do. */
  avgR: number | null
  netPnl: number
}

function summarize(items: EvolutionPoint[]): EvolutionMetrics {
  const trades = items.length
  const wins = items.filter((i) => i.pnl > 0).length
  const withR = items.filter((i) => i.rMultiple != null).map((i) => i.rMultiple!)
  const netPnl = items.reduce((s, i) => s + i.pnl, 0)
  return {
    trades,
    winRate: trades > 0 ? (wins / trades) * 100 : 0,
    avgR: withR.length > 0 ? withR.reduce((s, r) => s + r, 0) / withR.length : null,
    netPnl,
  }
}

/** Rolling WR/avgR/netPnl windows over a dated trade series for one setup. */
export function buildEdgeEvolution(
  series: Dated<EvolutionPoint>[],
  opts: { size: WindowSize; step: number },
): Window<EvolutionMetrics>[] {
  return rollingWindow(series, {
    ...opts,
    agg: (items) => summarize(items.map((d) => d.value)),
  })
}
