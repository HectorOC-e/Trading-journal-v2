// ─────────────────────────────────────────────────────────────────────────────
// R-multiple distribution (C4, #19) — histogram + shape of the returns in R.
//
// Surfaces left-tail dominance: a book that wins small and loses big (negative
// skew) carries hidden outlier risk even with a positive win-rate. ANALYTICS_V3
// §3.2. Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

export interface RBin {
  from: number
  to: number
  count: number
}

export interface RDistributionResult {
  count: number
  mean: number
  median: number
  /** Sample standard deviation (n−1). */
  std: number
  /** Moment skewness (Fisher); negative = left tail. */
  skewness: number
  min: number
  max: number
  bins: RBin[]
  /** True when the left tail dominates (fat negative returns). */
  leftTailDominant: boolean
}

const EMPTY: RDistributionResult = {
  count: 0,
  mean: 0,
  median: 0,
  std: 0,
  skewness: 0,
  min: 0,
  max: 0,
  bins: [],
  leftTailDominant: false,
}

const DEFAULT_BIN_WIDTH = 0.5
const LEFT_TAIL_SKEW_THRESHOLD = -0.5

function median(sorted: number[]): number {
  const n = sorted.length
  const mid = Math.floor(n / 2)
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function analyzeRDistribution(
  rMultiples: number[],
  opts: { binWidth?: number } = {},
): RDistributionResult {
  const n = rMultiples.length
  if (n === 0) return EMPTY
  const binWidth = opts.binWidth ?? DEFAULT_BIN_WIDTH

  const sorted = [...rMultiples].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[n - 1]
  const mean = rMultiples.reduce((s, v) => s + v, 0) / n

  // Central moments (population) for std/skew shape.
  const m2 = rMultiples.reduce((s, v) => s + (v - mean) ** 2, 0) / n
  const m3 = rMultiples.reduce((s, v) => s + (v - mean) ** 3, 0) / n
  const std = n >= 2 ? Math.sqrt((m2 * n) / (n - 1)) : 0
  const skewness = m2 > 0 ? m3 / m2 ** 1.5 : 0

  // Fixed-width histogram spanning the data, max inclusive in the last bin.
  const from = Math.floor(min / binWidth) * binWidth
  let to = Math.ceil(max / binWidth) * binWidth
  if (to <= from) to = from + binWidth
  const binCount = Math.max(1, Math.round((to - from) / binWidth))
  const bins: RBin[] = Array.from({ length: binCount }, (_, i) => ({
    from: from + i * binWidth,
    to: from + (i + 1) * binWidth,
    count: 0,
  }))
  for (const v of rMultiples) {
    let idx = Math.floor((v - from) / binWidth)
    if (idx >= binCount) idx = binCount - 1
    if (idx < 0) idx = 0
    bins[idx].count++
  }

  return {
    count: n,
    mean,
    median: median(sorted),
    std,
    skewness,
    min,
    max,
    bins,
    leftTailDominant: skewness < LEFT_TAIL_SKEW_THRESHOLD,
  }
}
