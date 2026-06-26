// ─────────────────────────────────────────────────────────────────────────────
// Drawdown analytics (C4, #3/#34) — longitudinal peak-to-trough over the equity
// curve. ANALYTICS_V3 §3.1: dd_t = (equity_t − peak_t)/peak_t ≤ 0.
//
// The canonical scalar helpers (`computeMaxDrawdown`, lib/formulas/drawdown.ts)
// answer "how big is the worst drop?" over a P&L sequence; this module adds the
// dated, longitudinal view the institutional quadrant needs: max DD %/$/date,
// current DD, days underwater, and the per-date dd series for the chart.
// Pure, no I/O. Caller aggregates per-account equity into one portfolio series.
// ─────────────────────────────────────────────────────────────────────────────

export interface EquityPoint {
  date: string
  equity: number
}

export interface DrawdownPoint {
  date: string
  equity: number
  peak: number
  /** Drawdown as a positive magnitude in % of the running peak (0 when at peak). */
  drawdownPct: number
  /** Drawdown as a positive magnitude in account currency. */
  drawdownAbs: number
}

export interface DrawdownResult {
  series: DrawdownPoint[]
  maxDrawdownPct: number
  maxDrawdownAbs: number
  /** Trough date of the deepest drawdown, or null with no data. */
  maxDrawdownDate: string | null
  currentDrawdownPct: number
  currentDrawdownAbs: number
  inDrawdown: boolean
  /** Calendar days from the most recent equity peak to the last point (0 if at peak). */
  drawdownDurationDays: number
}

const EMPTY: DrawdownResult = {
  series: [],
  maxDrawdownPct: 0,
  maxDrawdownAbs: 0,
  maxDrawdownDate: null,
  currentDrawdownPct: 0,
  currentDrawdownAbs: 0,
  inDrawdown: false,
  drawdownDurationDays: 0,
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime()
  const to = new Date(`${toIso}T00:00:00Z`).getTime()
  return Math.round((to - from) / 86_400_000)
}

export function analyzeDrawdown(points: EquityPoint[]): DrawdownResult {
  if (points.length === 0) return EMPTY
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))

  const series: DrawdownPoint[] = []
  let peak = sorted[0].equity
  let maxPct = 0
  let maxAbs = 0
  let maxDate: string | null = null
  let lastPeakDate = sorted[0].date

  for (const p of sorted) {
    if (p.equity >= peak) {
      peak = p.equity
      lastPeakDate = p.date
    }
    const abs = Math.max(0, peak - p.equity)
    const pct = peak > 0 ? (abs / peak) * 100 : 0
    series.push({ date: p.date, equity: p.equity, peak, drawdownPct: pct, drawdownAbs: abs })
    if (pct > maxPct) {
      maxPct = pct
      maxAbs = abs
      maxDate = p.date
    }
  }

  const last = series[series.length - 1]
  const inDrawdown = last.drawdownAbs > 0
  return {
    series,
    maxDrawdownPct: maxPct,
    maxDrawdownAbs: maxAbs,
    maxDrawdownDate: maxDate,
    currentDrawdownPct: last.drawdownPct,
    currentDrawdownAbs: last.drawdownAbs,
    inDrawdown,
    drawdownDurationDays: inDrawdown ? daysBetween(lastPeakDate, last.date) : 0,
  }
}
