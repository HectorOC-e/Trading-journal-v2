// ─────────────────────────────────────────────────────────────────────────────
// Benchmark vs plan (C4, #43) — real WR/expectancy against the plan, aggregated
// from the setups' `expectedWr`/`expectedAvgR`, trade-count weighted. ANALYTICS_V3
// §2: "no Δ inventado" — real and expected are compared on the SAME covered
// trades (setups that actually defined an expectation), and everything is null
// when nothing is planned. Pure, no I/O. Units follow the caller (the row's real
// and expected fields must share units).
// ─────────────────────────────────────────────────────────────────────────────

export interface BenchmarkSetupRow {
  setupId: string
  tradeCount: number
  realWr: number
  realAvgR: number
  expectedWr: number | null
  expectedAvgR: number | null
}

export interface BenchmarkResult {
  expectedWr: number | null
  realWr: number
  wrDelta: number | null
  expectedAvgR: number | null
  realAvgR: number
  avgRDelta: number | null
  /** Trades under setups that defined at least one expectation. */
  coveredTrades: number
  totalTrades: number
}

/** Trade-weighted mean of `pick(row)` over rows where the expectation is present. */
function weightedComparison(
  rows: BenchmarkSetupRow[],
  expected: (r: BenchmarkSetupRow) => number | null,
  real: (r: BenchmarkSetupRow) => number,
): { expected: number | null; real: number | null; delta: number | null } {
  const covered = rows.filter((r) => expected(r) !== null && r.tradeCount > 0)
  const weight = covered.reduce((s, r) => s + r.tradeCount, 0)
  if (weight === 0) return { expected: null, real: null, delta: null }
  const exp = covered.reduce((s, r) => s + (expected(r) as number) * r.tradeCount, 0) / weight
  const obs = covered.reduce((s, r) => s + real(r) * r.tradeCount, 0) / weight
  return { expected: exp, real: obs, delta: obs - exp }
}

export function analyzeBenchmark(rows: BenchmarkSetupRow[]): BenchmarkResult {
  const totalTrades = rows.reduce((s, r) => s + r.tradeCount, 0)
  const coveredTrades = rows
    .filter((r) => r.expectedWr !== null || r.expectedAvgR !== null)
    .reduce((s, r) => s + r.tradeCount, 0)

  const wr = weightedComparison(rows, (r) => r.expectedWr, (r) => r.realWr)
  const avgR = weightedComparison(rows, (r) => r.expectedAvgR, (r) => r.realAvgR)

  // When uncovered, fall back to overall trade-weighted real (no delta).
  const overallReal = (pick: (r: BenchmarkSetupRow) => number): number =>
    totalTrades > 0 ? rows.reduce((s, r) => s + pick(r) * r.tradeCount, 0) / totalTrades : 0

  return {
    expectedWr: wr.expected,
    realWr: wr.real ?? overallReal((r) => r.realWr),
    wrDelta: wr.delta,
    expectedAvgR: avgR.expected,
    realAvgR: avgR.real ?? overallReal((r) => r.realAvgR),
    avgRDelta: avgR.delta,
    coveredTrades,
    totalTrades,
  }
}
