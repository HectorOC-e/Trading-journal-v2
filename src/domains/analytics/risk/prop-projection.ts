// ─────────────────────────────────────────────────────────────────────────────
// Prop phase-pass projection (#15, ANALYTICS_V3 §8.2). Monte Carlo over the
// trader's empirical R distribution against the firm's rules (profit target,
// total DD, daily DD, min trading days, pace). Answers four honest questions:
//
//   • P(pass the phase)            — as a credible band, never a point (FREEZE-D16)
//   • P(violate a DD limit first)  — the failure path
//   • expected sessions to pass    — among the paths that pass, with a band
//   • the bottleneck limit         — which rule fails most (DAILY_DD/TOTAL_DD/TIMEOUT)
//
// Prop projections are non-stationary (FREEZE-D16): we report distributions, and
// the coach narrates them with their instability — never "72%" bare. Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

import { mulberry32, type DrawdownModel } from "@/domains/analytics/risk/risk-of-ruin"
import { jeffreysBand, type Band } from "@/domains/analytics/risk/band"

export type PassOutcome = "PASS" | "DAILY_DD" | "TOTAL_DD" | "TIMEOUT"
export type Bottleneck = "DAILY_DD" | "TOTAL_DD" | "TIMEOUT" | "NONE"

export interface PropProjectionInput {
  /** Empirical R multiples to resample (bootstrap). */
  rMultiples: number[]
  /** Fraction of equity risked per trade (e.g. 0.01). */
  riskPerTradePct: number
  /** Profit target to pass the phase, as a fraction of equity (e.g. 0.08). */
  targetPct: number
  /** Total drawdown limit, as a fraction of equity (e.g. 0.10). */
  ddTotalPct: number
  /** Daily loss limit from the start-of-day balance; null/undefined = no daily limit. */
  ddDailyPct?: number | null
  /** FIXED (loss from initial) vs TRAILING (loss from peak) for the TOTAL limit. */
  ddModel: DrawdownModel
  /** Trades placed per session/day (pace). */
  tradesPerSession: number
  /** Horizon cap in sessions; not reaching target by here = TIMEOUT. */
  maxSessions: number
  /** Firm's minimum trading days before a pass counts (null = none). */
  minTradingDays?: number | null
  /** Monte Carlo trials (default 10 000). */
  trials?: number
  seed?: number
}

export interface SessionEstimate {
  value: number
  ciLow: number
  ciHigh: number
}

export interface PropProjectionResult {
  passProbability: Band
  violateDdFirstProbability: Band
  /** Sessions-to-pass among passing paths (mean + 2.5/97.5 empirical band); null if none pass. */
  expectedSessions: SessionEstimate | null
  /** The most common failure reason; NONE when every path passes. */
  bottleneck: Bottleneck
  trials: number
}

const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length

/** Empirical percentile of a NUMERICALLY SORTED array (nearest-rank, clamped). */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))
  return sorted[idx]
}

export function projectPhasePass(input: PropProjectionInput): PropProjectionResult | null {
  const { rMultiples, riskPerTradePct, targetPct, ddTotalPct, ddModel, tradesPerSession, maxSessions } = input
  if (rMultiples.length === 0) return null

  const trials = input.trials ?? 10_000
  const minDays = input.minTradingDays ?? 0
  const dailyLimit = input.ddDailyPct ?? null
  const rng = mulberry32(input.seed ?? 0)
  const n = rMultiples.length

  let passes = 0
  let failDaily = 0
  let failTotal = 0
  let failTimeout = 0
  const passSessions: number[] = []

  for (let t = 0; t < trials; t++) {
    let equity = 1
    let peak = 1
    let outcome: PassOutcome = "TIMEOUT"
    let sessionsUsed = 0

    sessions: for (let session = 0; session < maxSessions; session++) {
      sessionsUsed = session + 1
      const dayStart = equity
      for (let trade = 0; trade < tradesPerSession; trade++) {
        equity += rMultiples[Math.floor(rng() * n)] * riskPerTradePct
        if (equity > peak) peak = equity

        const totalFloor = ddModel === "TRAILING" ? peak - ddTotalPct : 1 - ddTotalPct
        if (equity <= totalFloor) {
          outcome = "TOTAL_DD"
          break sessions
        }
        if (dailyLimit !== null && equity <= dayStart - dailyLimit) {
          outcome = "DAILY_DD"
          break sessions
        }
        if (equity >= 1 + targetPct && sessionsUsed >= minDays) {
          outcome = "PASS"
          break sessions
        }
      }
    }

    switch (outcome) {
      case "PASS":
        passes++
        passSessions.push(sessionsUsed)
        break
      case "DAILY_DD":
        failDaily++
        break
      case "TOTAL_DD":
        failTotal++
        break
      default:
        failTimeout++
    }
  }

  let expectedSessions: SessionEstimate | null = null
  if (passSessions.length > 0) {
    const sorted = [...passSessions].sort((a, b) => a - b)
    expectedSessions = {
      value: mean(passSessions),
      ciLow: percentile(sorted, 0.025),
      ciHigh: percentile(sorted, 0.975),
    }
  }

  let bottleneck: Bottleneck = "NONE"
  if (passes < trials) {
    const ranked: [Bottleneck, number][] = [
      ["DAILY_DD", failDaily],
      ["TOTAL_DD", failTotal],
      ["TIMEOUT", failTimeout],
    ]
    bottleneck = ranked.reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0]
  }

  return {
    passProbability: jeffreysBand(passes, trials),
    violateDdFirstProbability: jeffreysBand(failDaily + failTotal, trials),
    expectedSessions,
    bottleneck,
    trials,
  }
}
