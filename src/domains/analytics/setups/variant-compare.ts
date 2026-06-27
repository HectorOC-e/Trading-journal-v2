// ─────────────────────────────────────────────────────────────────────────────
// Variant comparison — the A/B base for setup variants (#50, ANALYTICS_V3 §5 /
// FREEZE POST-7). Compares the realized edge (avg R) of two cohorts of trades and
// names a winner ONLY when the difference is significant (Welch t-test) — so a
// redefinition or variant isn't crowned on noise. The full A/B framework
// (assignment, versioned trade tagging) stays POST-7; this is the primitive it
// will build on. Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

import { welchTTest } from "@/domains/analytics/institutional/stats/welch"

export interface VariantCohort {
  label: string
  rMultiples: number[]
  /** Optional per-trade P&L to derive a win-rate. */
  pnls?: number[]
}

export interface VariantSide {
  label: string
  avgR: number
  winRate: number | null
  n: number
}

export interface VariantComparison {
  a: VariantSide
  b: VariantSide
  /** a.avgR − b.avgR. */
  delta: number
  /** Label of the better variant when significant, else null. */
  winner: string | null
  significant: boolean
  pValue: number | null
}

const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length

function side(c: VariantCohort): VariantSide {
  return {
    label: c.label,
    avgR: mean(c.rMultiples),
    winRate: c.pnls && c.pnls.length > 0 ? (c.pnls.filter((p) => p > 0).length / c.pnls.length) * 100 : null,
    n: c.rMultiples.length,
  }
}

/** Compare two variants' edge. Null unless both have ≥ 2 trades. */
export function compareVariants(
  a: VariantCohort,
  b: VariantCohort,
  opts: { alpha?: number } = {},
): VariantComparison | null {
  if (a.rMultiples.length < 2 || b.rMultiples.length < 2) return null
  const alpha = opts.alpha ?? 0.05
  const sa = side(a)
  const sb = side(b)
  const test = welchTTest(a.rMultiples, b.rMultiples)
  const pValue = test?.pValue ?? null
  const significant = pValue != null && pValue < alpha
  const delta = sa.avgR - sb.avgR
  return {
    a: sa,
    b: sb,
    delta,
    winner: significant ? (delta > 0 ? sa.label : sb.label) : null,
    significant,
    pValue,
  }
}
