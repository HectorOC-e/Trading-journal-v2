// ─────────────────────────────────────────────────────────────────────────────
// Risk of ruin (#17, ANALYTICS_V3 §8.1) — the probability of touching the prop
// account's total drawdown limit. Two honest views (FREEZE-D15/D16):
//
//   • analytic  — a fast, closed-form diffusion-barrier approximation for the
//                 INFINITE horizon. Assumes additive R units and a normal drift;
//                 good for "is my edge survivable at all?".
//   • monteCarlo — resamples your EMPIRICAL R distribution over the phase horizon
//                 and counts ruin, so skew/fat tails are respected. Non-stationary
//                 by nature → reported as a CREDIBLE BAND, never a single point.
//
// Both honour the prop DD model: FIXED (loss from the initial balance) vs
// TRAILING (loss from the running equity peak). Pure, no I/O. R units are
// converted to equity via riskPerTradePct (a +2R trade at 1% risk = +2% equity).
// ─────────────────────────────────────────────────────────────────────────────

import { jeffreysBand } from "@/domains/analytics/risk/band"

export type DrawdownModel = "FIXED" | "TRAILING"

/**
 * Mulberry32 — a tiny, fast, seedable PRNG. Deterministic for a given seed so the
 * Monte Carlo is reproducible in tests and across recomputes (no `Math.random`).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  const variance = xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1)
  return Math.sqrt(variance)
}

export interface AnalyticRuinInput {
  /** Expectancy in R per trade. */
  meanR: number
  /** Standard deviation of R per trade. */
  sdR: number
  /** Fraction of equity risked per trade (e.g. 0.01 for 1%). */
  riskPerTradePct: number
  /** Total drawdown that counts as ruin, as a fraction of equity (e.g. 0.10). */
  ruinThresholdPct: number
}

/**
 * Closed-form infinite-horizon ruin via the diffusion approximation
 * `P = exp(-2·μ·a/σ²)`, where `a` is the distance to ruin expressed in R units
 * (`ruinThresholdPct / riskPerTradePct`). No positive edge ⇒ ruin is certain (1);
 * positive edge with zero variance ⇒ ruin is impossible (0). Clamped to [0, 1].
 */
export function analyticRiskOfRuin(input: AnalyticRuinInput): number {
  const { meanR, sdR, riskPerTradePct, ruinThresholdPct } = input
  if (riskPerTradePct <= 0 || ruinThresholdPct <= 0) return 0
  if (meanR <= 0) return 1
  if (sdR === 0) return 0
  const a = ruinThresholdPct / riskPerTradePct
  const p = Math.exp((-2 * meanR * a) / (sdR * sdR))
  return Math.min(1, Math.max(0, p))
}

export interface MonteCarloRuinInput {
  /** Empirical R multiples to resample (bootstrap). */
  rMultiples: number[]
  riskPerTradePct: number
  ruinThresholdPct: number
  /** Number of trades in the phase horizon. */
  horizon: number
  ddModel: DrawdownModel
  /** Monte Carlo trials (default 10 000). */
  trials?: number
  seed?: number
}

export interface RuinBand {
  /** Point estimate: fraction of simulated paths that hit ruin. */
  value: number
  /** Lower bound of the 95% credible band (Jeffreys Beta interval). */
  ciLow: number
  /** Upper bound of the 95% credible band. */
  ciHigh: number
  /** Monte Carlo trials behind the estimate. */
  trials: number
}

/**
 * Finite-horizon ruin by bootstrapping the empirical R distribution over the
 * phase. Equity starts at 1; each step adds `r · riskPerTradePct`. A path is
 * ruined when equity drops `ruinThresholdPct` below the initial balance (FIXED)
 * or below the running peak (TRAILING). The point estimate is wrapped in a 95%
 * Jeffreys credible band so the inherent Monte Carlo / non-stationarity noise is
 * never hidden behind a bare number (FREEZE-D16).
 */
export function monteCarloRiskOfRuin(input: MonteCarloRuinInput): RuinBand {
  const { rMultiples, riskPerTradePct, ruinThresholdPct, horizon, ddModel } = input
  const trials = input.trials ?? 10_000
  const rng = mulberry32(input.seed ?? 0)
  const n = rMultiples.length

  let ruined = 0
  for (let t = 0; t < trials; t++) {
    let equity = 1
    let peak = 1
    for (let step = 0; step < horizon; step++) {
      const r = rMultiples[Math.floor(rng() * n)]
      equity += r * riskPerTradePct
      if (equity > peak) peak = equity
      const floor = ddModel === "TRAILING" ? peak - ruinThresholdPct : 1 - ruinThresholdPct
      if (equity <= floor) {
        ruined++
        break
      }
    }
  }

  return { ...jeffreysBand(ruined, trials), trials }
}

export interface RiskOfRuinInput {
  rMultiples: number[]
  riskPerTradePct: number
  ruinThresholdPct: number
  horizon: number
  ddModel: DrawdownModel
  trials?: number
  seed?: number
}

export interface RiskOfRuinResult {
  /** Infinite-horizon closed-form estimate. */
  analytic: number
  /** Finite-horizon empirical Monte Carlo band. */
  monteCarlo: RuinBand
  /** Number of R observations behind the estimate. */
  sampleSize: number
}

/**
 * Bundle both views from a single R history. Null with no R history to resample
 * (no fabricated rigor, R6).
 */
export function riskOfRuin(input: RiskOfRuinInput): RiskOfRuinResult | null {
  if (input.rMultiples.length === 0) return null
  return {
    analytic: analyticRiskOfRuin({
      meanR: mean(input.rMultiples),
      sdR: stdDev(input.rMultiples),
      riskPerTradePct: input.riskPerTradePct,
      ruinThresholdPct: input.ruinThresholdPct,
    }),
    monteCarlo: monteCarloRiskOfRuin(input),
    sampleSize: input.rMultiples.length,
  }
}
