// ─────────────────────────────────────────────────────────────────────────────
// Setup drift — defined vs operated (#32, ANALYTICS_V3 §5.3). Compares the
// setup's DEFINITION (direction, expected WR, expected avg R) against how it is
// actually being TRADED, and surfaces the dimension that has drifted most:
// "you defined this LONG but you're trading it SHORT", "your avg R is 0.8 vs the
// 1.5 you defined". Only dimensions the trader actually defined are evaluated —
// no fabricated expectation. Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

export type DriftDimensionKey = "direction" | "winRate" | "avgR"

export interface SetupDefinition {
  direction: "LONG" | "SHORT" | "AMBAS"
  /** Expected win-rate in PERCENT (0–100); null = not defined. */
  expectedWr: number | null
  /** Expected average R; null = not defined. */
  expectedAvgR: number | null
}

export interface DriftTrade {
  direction: "LONG" | "SHORT"
  rMultiple: number | null
  pnl: number
}

export interface DriftDimension {
  dimension: DriftDimensionKey
  defined: string | number
  actual: string | number
  /** Normalized drift magnitude (0 = aligned; larger = further off). */
  drift: number
  flagged: boolean
}

export interface DriftResult {
  status: "aligned" | "drifting" | "insufficient"
  dimensions: DriftDimension[]
  /** The most-drifted evaluated dimension, or null when none were evaluable. */
  topDrift: DriftDimension | null
}

export interface DriftInput {
  definition: SetupDefinition
  trades: DriftTrade[]
  /** Minimum trades to evaluate (default 8). */
  minSample?: number
}

// Flag thresholds (reversible defaults).
const DIRECTION_OFF_SHARE = 0.3 // > 30% traded against the defined side
const WR_DIFF_PP = 15 // > 15 percentage points off the defined WR
const AVGR_REL_DIFF = 0.3 // > 30% relative deviation from the defined avg R

const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length

export function detectSetupDrift(input: DriftInput): DriftResult {
  const { definition, trades } = input
  const minSample = input.minSample ?? 8
  if (trades.length < minSample) return { status: "insufficient", dimensions: [], topDrift: null }

  const dimensions: DriftDimension[] = []

  // ── direction (only when a single side was defined) ─────────────────────────
  if (definition.direction === "LONG" || definition.direction === "SHORT") {
    const offShare = trades.filter((t) => t.direction !== definition.direction).length / trades.length
    const longs = trades.filter((t) => t.direction === "LONG").length
    const actualMajority = longs >= trades.length - longs ? "LONG" : "SHORT"
    dimensions.push({
      dimension: "direction",
      defined: definition.direction,
      actual: actualMajority,
      drift: offShare,
      flagged: offShare > DIRECTION_OFF_SHARE,
    })
  }

  // ── win-rate ────────────────────────────────────────────────────────────────
  if (definition.expectedWr != null) {
    const actualWr = (trades.filter((t) => t.pnl > 0).length / trades.length) * 100
    const diffPp = Math.abs(actualWr - definition.expectedWr)
    dimensions.push({
      dimension: "winRate",
      defined: definition.expectedWr,
      actual: actualWr,
      drift: diffPp / 100,
      flagged: diffPp > WR_DIFF_PP,
    })
  }

  // ── avg R ─────────────────────────────────────────────────────────────────--
  if (definition.expectedAvgR != null) {
    const withR = trades.filter((t) => t.rMultiple != null).map((t) => t.rMultiple!)
    if (withR.length > 0) {
      const actualAvgR = mean(withR)
      const denom = Math.abs(definition.expectedAvgR) || 1
      const relDiff = Math.abs(actualAvgR - definition.expectedAvgR) / denom
      dimensions.push({
        dimension: "avgR",
        defined: definition.expectedAvgR,
        actual: actualAvgR,
        drift: relDiff,
        flagged: relDiff > AVGR_REL_DIFF,
      })
    }
  }

  if (dimensions.length === 0) return { status: "insufficient", dimensions: [], topDrift: null }

  const topDrift = dimensions.reduce((best, cur) => (cur.drift > best.drift ? cur : best))
  return { status: topDrift.flagged ? "drifting" : "aligned", dimensions, topDrift }
}
