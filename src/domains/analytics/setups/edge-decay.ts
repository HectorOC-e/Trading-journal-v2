// ─────────────────────────────────────────────────────────────────────────────
// Edge decay by expectancy, not just win-rate (#12, ANALYTICS_V3 §5.1). Compares
// a setup's RECENT R window against its baseline — either a historical window or
// the trader's DEFINED expected avg R — and only flags decay when the
// deterioration is statistically significant for the sample size (Welch / one-
// sample t-test). This replaces the naive fixed-20 window that fires on variance
// alone: "decay must not trigger on noise". Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

import { welchTTest, oneSampleTTest } from "@/domains/analytics/institutional/stats/welch"

export type EdgeDecayStatus = "decaying" | "improving" | "stable" | "insufficient"

export interface EdgeDecayInput {
  /** Recent R multiples for the setup. */
  recent: number[]
  /** Historical baseline R multiples; preferred comparison when ≥ 2 points. */
  baseline?: number[] | null
  /** Setup's defined expected avg R; used as a one-sample reference when no baseline window. */
  definedAvgR?: number | null
  /** Minimum recent sample to evaluate (default 8). */
  minSample?: number
  /** Significance threshold (default 0.05). */
  alpha?: number
}

export interface EdgeDecayResult {
  status: EdgeDecayStatus
  recentAvgR: number | null
  baselineAvgR: number | null
  /** recentAvgR − baselineAvgR. */
  delta: number | null
  significant: boolean
  pValue: number | null
  sampleSize: number
  comparison: "two-sample" | "one-sample" | "none"
}

const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length

const insufficient = (recent: number[], comparison: EdgeDecayResult["comparison"]): EdgeDecayResult => ({
  status: "insufficient",
  recentAvgR: recent.length > 0 ? mean(recent) : null,
  baselineAvgR: null,
  delta: null,
  significant: false,
  pValue: null,
  sampleSize: recent.length,
  comparison,
})

export function detectEdgeDecay(input: EdgeDecayInput): EdgeDecayResult {
  const { recent } = input
  const minSample = input.minSample ?? 8
  const alpha = input.alpha ?? 0.05

  if (recent.length < minSample) return insufficient(recent, "none")

  const hasBaselineWindow = (input.baseline?.length ?? 0) >= 2
  const hasDefined = input.definedAvgR != null
  if (!hasBaselineWindow && !hasDefined) return insufficient(recent, "none")

  const recentAvgR = mean(recent)
  const comparison: "two-sample" | "one-sample" = hasBaselineWindow ? "two-sample" : "one-sample"
  const baselineAvgR = hasBaselineWindow ? mean(input.baseline!) : input.definedAvgR!
  const delta = recentAvgR - baselineAvgR

  const test = hasBaselineWindow ? welchTTest(recent, input.baseline!) : oneSampleTTest(recent, input.definedAvgR!)
  const pValue = test?.pValue ?? null
  const significant = pValue != null && pValue < alpha

  let status: EdgeDecayStatus = "stable"
  if (significant) status = delta < 0 ? "decaying" : "improving"

  return { status, recentAvgR, baselineAvgR, delta, significant, pValue, sampleSize: recent.length, comparison }
}
