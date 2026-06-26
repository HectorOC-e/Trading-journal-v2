// ─────────────────────────────────────────────────────────────────────────────
// Confidence calibration (S8, C7/#23) — does the trader's stated confidence (1–5
// per trade) predict the real outcome? We bucket by rating and estimate each
// bucket's win rate vs the overall baseline with the Bayesian estimator (ADR-002),
// so a tiny bucket can't masquerade as a strong signal (R6). Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { proportionEstimate, type DirectionalEstimate } from "../institutional/stats/bayes"

export interface CalibrationTrade {
  confidenceRating?: number | null // 1..5
  win: boolean
}

export interface ConfidenceBucket {
  rating: number
  trades: number
  wins: number
  winRate: number | null
  /** Win-rate estimate of this bucket vs the overall baseline (direction below). */
  estimate: DirectionalEstimate | null
}

export type CalibrationVerdict = "overconfident" | "underconfident" | "calibrated" | "insufficient"

export interface CalibrationResult {
  baseline: number
  buckets: ConfidenceBucket[]
  verdict: CalibrationVerdict
  detail: string
}

const CONF = 0.8 // posterior threshold to flag a miscalibration
const MIN_GROUP = 5 // min trades in a confidence group to trust the flag

/**
 * Calibrate stated confidence against realised win rate. High-confidence trades
 * (rating ≥ 4) winning credibly LESS than baseline ⇒ overconfident; low-confidence
 * (rating ≤ 2) winning credibly MORE ⇒ underconfident.
 */
export function calibration(trades: CalibrationTrade[]): CalibrationResult {
  const rated = trades.filter((t) => t.confidenceRating != null && t.confidenceRating >= 1 && t.confidenceRating <= 5)
  const total = rated.length
  const totalWins = rated.filter((t) => t.win).length
  const baseline = total > 0 ? totalWins / total : 0

  const buckets: ConfidenceBucket[] = [1, 2, 3, 4, 5].map((rating) => {
    const inBucket = rated.filter((t) => Math.round(t.confidenceRating as number) === rating)
    const wins = inBucket.filter((t) => t.win).length
    return {
      rating,
      trades: inBucket.length,
      wins,
      winRate: inBucket.length > 0 ? wins / inBucket.length : null,
      estimate: inBucket.length > 0 ? proportionEstimate(wins, inBucket.length, { baseline, direction: "below" }) : null,
    }
  })

  if (total < 2 * MIN_GROUP) {
    return { baseline, buckets, verdict: "insufficient", detail: "Aún no hay suficientes trades con confianza registrada para calibrar." }
  }
  // Degenerate baseline (almost everyone wins/loses) — calibration is moot.
  if (baseline >= 0.95 || baseline <= 0.05) {
    return { baseline, buckets, verdict: "calibrated", detail: "Sin variación de resultados suficiente para evaluar la calibración." }
  }

  const high = rated.filter((t) => (t.confidenceRating as number) >= 4)
  const low = rated.filter((t) => (t.confidenceRating as number) <= 2)
  const highWins = high.filter((t) => t.win).length
  const lowWins = low.filter((t) => t.win).length

  const highEst = high.length >= MIN_GROUP ? proportionEstimate(highWins, high.length, { baseline, direction: "below" }) : null
  const lowEst = low.length >= MIN_GROUP ? proportionEstimate(lowWins, low.length, { baseline, direction: "above" }) : null

  if (highEst && highEst.value < baseline && highEst.confidence >= CONF) {
    return {
      baseline,
      buckets,
      verdict: "overconfident",
      detail: `Cuando dices estar muy seguro (4–5) ganas ${(highEst.value * 100).toFixed(0)}% — por debajo de tu media (${(baseline * 100).toFixed(0)}%). Tu confianza no predice el resultado.`,
    }
  }
  if (lowEst && lowEst.value > baseline && lowEst.confidence >= CONF) {
    return {
      baseline,
      buckets,
      verdict: "underconfident",
      detail: `Cuando dudas (1–2) ganas ${(lowEst.value * 100).toFixed(0)}% — por encima de tu media (${(baseline * 100).toFixed(0)}%). Te subestimas en esos setups.`,
    }
  }
  return { baseline, buckets, verdict: "calibrated", detail: "Tu confianza está razonablemente calibrada con tus resultados." }
}
