// ─────────────────────────────────────────────────────────────────────────────
// rollingWindow — fundational longitudinal primitive (Sprint 0)
//
// Resolves the blocking gap C3 ("no longitudinal analysis"). EVERY temporal
// detector in Analytics v3 (Δ vs previous, trend, edge evolution, calibration…)
// is built on top of this one PURE function. No I/O, no dates library — fully
// unit-testable.
//
// Scope (FREEZE §10, ANALYTICS_V3 §1): produce a series of aggregated windows
// over a dated series, by COUNT (last N items) or by TIME (fixed-day buckets),
// plus the standard `current vs previous` comparator. Nothing else lives here
// yet — consumers (KPIs, detectors) arrive in later sprints.
// ─────────────────────────────────────────────────────────────────────────────

/** A value stamped with an ISO date (`YYYY-MM-DD`). Lexicographic sort == chronological. */
export interface Dated<T> {
  date: string
  value: T
}

/** Window size: either a count of items or a span of days. */
export type WindowSize = { count: number } | { days: number }

export interface RollingWindowOpts<T, R> {
  size: WindowSize
  /** How far to advance between windows. Count windows: items; time windows: days. */
  step: number
  /** Reduce the items of one window to its aggregated metric. */
  agg: (items: Dated<T>[]) => R
}

export interface Window<R> {
  from: string
  to: string
  count: number
  value: R
}

function isCount(size: WindowSize): size is { count: number } {
  return "count" in size
}

function sortByDate<T>(series: Dated<T>[]): Dated<T>[] {
  return [...series].sort((a, b) => a.date.localeCompare(b.date))
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function windowOf<T, R>(items: Dated<T>[], agg: (items: Dated<T>[]) => R): Window<R> {
  return {
    from: items[0].date,
    to: items[items.length - 1].date,
    count: items.length,
    value: agg(items),
  }
}

/**
 * Slide a window over a dated series and aggregate each window.
 * Returns one `Window` per step that contains at least one item.
 */
export function rollingWindow<T, R>(series: Dated<T>[], opts: RollingWindowOpts<T, R>): Window<R>[] {
  if (series.length === 0) return []
  const sorted = sortByDate(series)

  if (isCount(opts.size)) {
    const { count } = opts.size
    const out: Window<R>[] = []
    for (let end = count; end <= sorted.length; end += opts.step) {
      out.push(windowOf(sorted.slice(end - count, end), opts.agg))
    }
    return out
  }

  // Time-based: fixed-day buckets anchored at the first item's date.
  const { days } = opts.size
  const out: Window<R>[] = []
  const start = sorted[0].date
  const lastDate = sorted[sorted.length - 1].date
  for (let offset = 0; addDays(start, offset) <= lastDate; offset += opts.step) {
    const bucketStart = addDays(start, offset)
    const bucketEnd = addDays(bucketStart, days) // exclusive
    const items = sorted.filter((d) => d.date >= bucketStart && d.date < bucketEnd)
    if (items.length > 0) out.push(windowOf(items, opts.agg))
  }
  return out
}

export interface Comparison<R> {
  current: R | null
  previous: R | null
  delta: R extends number ? number | null : null
}

/**
 * Compare the two most recent windows of equal length.
 * `delta` is `current − previous` for numeric aggregates; null when no previous
 * window exists (no fabricated delta — ANALYTICS_V3 §2 "estado vacío explícito").
 */
export function compareCurrentVsPrevious<T>(
  series: Dated<T>[],
  opts: { size: WindowSize; agg: (items: Dated<T>[]) => number },
): Comparison<number> {
  const windows = rollingWindow(series, { ...opts, step: 1 })
  if (windows.length === 0) return { current: null, previous: null, delta: null }
  const current = windows[windows.length - 1].value
  const previous = windows.length >= 2 ? windows[windows.length - 2].value : null
  const delta = previous === null ? null : current - previous
  return { current, previous, delta } as Comparison<number>
}
