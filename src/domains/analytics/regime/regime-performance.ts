// ─────────────────────────────────────────────────────────────────────────────
// Performance by market regime (#33, ANALYTICS_V3 §7). "Ganas en tendencia,
// pierdes en rango." Groups trades by their regime label (trend/range/volatile)
// and reports WR/avg R/net P&L per regime + best/worst. The regime is a MANUAL /
// proxy label in v3.0, so the result is flagged EXPERIMENTAL (FREEZE-D18) — the
// UI must not present it as exogenous truth. Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

export interface RegimeTrade {
  regime: string | null
  rMultiple: number | null
  pnl: number
}

export interface RegimeStat {
  regime: string
  trades: number
  winRate: number
  avgR: number | null
  netPnl: number
}

export interface RegimePerformanceResult {
  byRegime: RegimeStat[]
  best: RegimeStat | null
  worst: RegimeStat | null
  /** Always true in v3.0 — the regime label is manual/proxy (FREEZE-D18). */
  experimental: boolean
}

const MIN_SAMPLE = 3
const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length

export function computeRegimePerformance(trades: RegimeTrade[]): RegimePerformanceResult {
  const groups = new Map<string, RegimeTrade[]>()
  for (const t of trades) {
    if (!t.regime) continue
    const g = groups.get(t.regime) ?? []
    g.push(t)
    groups.set(t.regime, g)
  }

  const byRegime: RegimeStat[] = [...groups.entries()].map(([regime, ts]) => {
    const wins = ts.filter((t) => t.pnl > 0).length
    const rs = ts.filter((t) => t.rMultiple != null).map((t) => t.rMultiple!)
    return {
      regime,
      trades: ts.length,
      winRate: (wins / ts.length) * 100,
      avgR: rs.length > 0 ? mean(rs) : null,
      netPnl: ts.reduce((s, t) => s + t.pnl, 0),
    }
  })

  const ranked = byRegime.filter((s) => s.trades >= MIN_SAMPLE && s.avgR != null)
  const sorted = [...ranked].sort((a, b) => (b.avgR ?? 0) - (a.avgR ?? 0))

  return {
    byRegime: byRegime.sort((a, b) => (b.avgR ?? -Infinity) - (a.avgR ?? -Infinity)),
    best: sorted[0] ?? null,
    worst: sorted.length > 1 ? sorted[sorted.length - 1] : null,
    experimental: true,
  }
}
