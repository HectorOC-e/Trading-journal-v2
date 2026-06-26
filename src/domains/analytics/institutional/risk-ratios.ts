// ─────────────────────────────────────────────────────────────────────────────
// Institutional risk ratios (C4, #22) — Sortino, Calmar, fractional Kelly, plus
// the existing Sharpe. All computed over R multiples; rolling variants are built
// on the S0 `rollingWindow` primitive (ANALYTICS_V3 §3.4). Pure, no I/O.
//
// Kelly is reported as full AND half (the prudent sizing the spec recommends).
// Each ratio returns null when undefined (e.g. no downside, no drawdown) rather
// than a misleading 0 — honesty over a fabricated number.
// ─────────────────────────────────────────────────────────────────────────────

import { calcSharpeRatio } from "@/lib/formulas"
import { computeMaxDrawdown } from "@/lib/formulas/drawdown"
import { rollingWindow, type Dated, type Window, type WindowSize } from "@/domains/analytics/longitudinal/rolling-window"

const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length

/**
 * Sortino ratio: mean excess return over downside deviation (target = 0).
 * Null with < 2 points or no downside dispersion.
 */
export function sortinoRatio(rMultiples: number[], target = 0): number | null {
  if (rMultiples.length < 2) return null
  const m = mean(rMultiples)
  const downsideSq = rMultiples.reduce((s, r) => s + (r < target ? (r - target) ** 2 : 0), 0)
  const downsideDev = Math.sqrt(downsideSq / rMultiples.length)
  if (downsideDev === 0) return null
  return (m - target) / downsideDev
}

/**
 * Calmar ratio: total return (R) over the worst peak-to-trough drawdown (R) of
 * the cumulative curve. Null when there was no drawdown (undefined ratio).
 */
export function calmarRatio(rMultiples: number[]): number | null {
  if (rMultiples.length === 0) return null
  const maxDd = computeMaxDrawdown(rMultiples)
  if (maxDd === 0) return null
  const total = rMultiples.reduce((s, r) => s + r, 0)
  return total / maxDd
}

export interface Kelly {
  full: number
  half: number
}

/** Kelly fraction f* = W − (1−W)/Rr, with the prudent half-Kelly alongside. */
export function kellyCriterion(winRate: number, payoffRatio: number): Kelly {
  const full = payoffRatio > 0 ? winRate - (1 - winRate) / payoffRatio : winRate
  return { full, half: full / 2 }
}

export interface KellyFromR extends Kelly {
  winRate: number
  payoffRatio: number
}

/**
 * Derive win-rate and payoff ratio (avg win / |avg loss|) from R multiples, then
 * Kelly. Null unless there is at least one win AND one loss (payoff undefined).
 */
export function kellyFromR(rMultiples: number[]): KellyFromR | null {
  const wins = rMultiples.filter((r) => r > 0)
  const losses = rMultiples.filter((r) => r < 0)
  if (wins.length === 0 || losses.length === 0) return null
  const decided = wins.length + losses.length
  const winRate = wins.length / decided
  const avgWin = mean(wins)
  const avgLoss = Math.abs(mean(losses))
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : 0
  return { winRate, payoffRatio, ...kellyCriterion(winRate, payoffRatio) }
}

export interface RiskRatios {
  sharpe: number | null
  sortino: number | null
  calmar: number | null
  kellyFull: number | null
  kellyHalf: number | null
}

/** Bundle all institutional ratios for one set of R multiples. */
export function computeRiskRatios(rMultiples: number[]): RiskRatios {
  const kelly = kellyFromR(rMultiples)
  return {
    sharpe: calcSharpeRatio(rMultiples),
    sortino: sortinoRatio(rMultiples),
    calmar: calmarRatio(rMultiples),
    kellyFull: kelly?.full ?? null,
    kellyHalf: kelly?.half ?? null,
  }
}

/** Rolling risk-ratio bundles over a dated R series (built on `rollingWindow`). */
export function rollingRiskRatios(
  series: Dated<number>[],
  opts: { size: WindowSize; step: number },
): Window<RiskRatios>[] {
  return rollingWindow(series, {
    ...opts,
    agg: (items) => computeRiskRatios(items.map((d) => d.value)),
  })
}
