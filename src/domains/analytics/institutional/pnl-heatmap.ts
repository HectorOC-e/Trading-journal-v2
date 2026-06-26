// ─────────────────────────────────────────────────────────────────────────────
// P&L calendar heatmap (C4, #26) — shapes daily P&L into a calendar grid with a
// signed intensity (−1..1) and discrete levels for coloring. ANALYTICS_V3 §3.5;
// feeds off `buildPnlByDate` (daily grain). Pure, no I/O — the UI (S12) renders
// the grid; this module owns the math.
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyPnl {
  date: string
  pnl: number
}

export interface HeatmapDay {
  date: string
  pnl: number
  /** Signed share of the largest absolute day, in [−1, 1]. */
  intensity: number
  /** Signed discrete bucket in [−levels, levels] (0 when flat). */
  level: number
}

export interface HeatmapResult {
  days: HeatmapDay[]
  maxAbs: number
  totalPnl: number
  bestDay: DailyPnl | null
  worstDay: DailyPnl | null
}

const DEFAULT_LEVELS = 4

export function buildPnlHeatmap(daily: DailyPnl[], opts: { levels?: number } = {}): HeatmapResult {
  if (daily.length === 0) {
    return { days: [], maxAbs: 0, totalPnl: 0, bestDay: null, worstDay: null }
  }
  const levels = opts.levels ?? DEFAULT_LEVELS

  // Aggregate P&L per day (input may carry one row per account).
  const byDate = new Map<string, number>()
  for (const d of daily) byDate.set(d.date, (byDate.get(d.date) ?? 0) + d.pnl)

  const aggregated = [...byDate.entries()]
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const maxAbs = aggregated.reduce((m, d) => Math.max(m, Math.abs(d.pnl)), 0)
  let totalPnl = 0
  let bestDay: DailyPnl | null = null
  let worstDay: DailyPnl | null = null

  const days: HeatmapDay[] = aggregated.map((d) => {
    totalPnl += d.pnl
    if (bestDay === null || d.pnl > bestDay.pnl) bestDay = { date: d.date, pnl: d.pnl }
    if (worstDay === null || d.pnl < worstDay.pnl) worstDay = { date: d.date, pnl: d.pnl }
    const intensity = maxAbs > 0 ? d.pnl / maxAbs : 0
    const level = maxAbs > 0 && d.pnl !== 0 ? Math.sign(d.pnl) * Math.ceil((Math.abs(d.pnl) / maxAbs) * levels) : 0
    return { date: d.date, pnl: d.pnl, intensity, level }
  })

  return { days, maxAbs, totalPnl, bestDay, worstDay }
}
