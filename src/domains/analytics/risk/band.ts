// ─────────────────────────────────────────────────────────────────────────────
// Jeffreys credible band for a simulated proportion (FREEZE-D16). Every Monte
// Carlo rate (ruin, pass, DD-violation) is reported with this band so the
// estimator's uncertainty is never hidden behind a bare number. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { betaQuantile } from "@/domains/analytics/institutional/stats/bayes"

export interface Band {
  /** Point estimate (successes / trials). */
  value: number
  /** Lower bound of the 95% credible band. */
  ciLow: number
  /** Upper bound of the 95% credible band. */
  ciHigh: number
}

/**
 * 95% Jeffreys interval `Beta(k + 0.5, n − k + 0.5)`, pinned to the hard 0/1
 * edges when the count is degenerate. Zeroed band with no trials.
 */
export function jeffreysBand(successes: number, trials: number): Band {
  if (trials <= 0) return { value: 0, ciLow: 0, ciHigh: 0 }
  const value = successes / trials
  const a = successes + 0.5
  const b = trials - successes + 0.5
  return {
    value,
    ciLow: successes === 0 ? 0 : betaQuantile(0.025, a, b),
    ciHigh: successes === trials ? 1 : betaQuantile(0.975, a, b),
  }
}
