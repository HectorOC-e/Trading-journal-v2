// ─────────────────────────────────────────────────────────────────────────────
// Welch's t-test (unequal variances) + one-sample t-test. The significance
// backbone for edge decay (#12) and variant comparison (#50): a difference in
// means is only "real" when it beats the noise expected for the sample size —
// the antidote to flagging decay on variance alone. Two-sided p-value from the
// Student-t survival function via the regularized incomplete beta (reuses bayes).
// Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

import { regularizedIncompleteBeta } from "@/domains/analytics/institutional/stats/bayes"

export interface TTestResult {
  /** The t statistic (sign follows mean(a) − mean(b)). */
  t: number
  /** Degrees of freedom (Welch–Satterthwaite for two samples). */
  df: number
  /** Two-sided p-value. */
  pValue: number
}

const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length

/** Sample variance (Bessel-corrected). Caller guarantees length ≥ 2. */
function sampleVariance(xs: number[], m: number): number {
  return xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1)
}

/**
 * Two-sided Student-t p-value for |t| at ν degrees of freedom:
 * `p = I_x(ν/2, 1/2)` with `x = ν/(ν + t²)`. t = 0 ⇒ 1; t → ∞ ⇒ 0.
 */
export function studentTTwoSidedP(t: number, df: number): number {
  if (df <= 0) return 1
  if (t === 0) return 1
  if (!Number.isFinite(t)) return 0
  const x = df / (df + t * t)
  return regularizedIncompleteBeta(x, df / 2, 0.5)
}

/** Welch's unequal-variance t-test. Null unless both samples have ≥ 2 points. */
export function welchTTest(a: number[], b: number[]): TTestResult | null {
  if (a.length < 2 || b.length < 2) return null
  const ma = mean(a)
  const mb = mean(b)
  const va = sampleVariance(a, ma)
  const vb = sampleVariance(b, mb)
  const sa = va / a.length
  const sb = vb / b.length
  const se = sa + sb

  if (se === 0) {
    // No variance in either sample: identical means ⇒ no difference, else certain.
    const t = ma === mb ? 0 : ma > mb ? Infinity : -Infinity
    return { t, df: a.length + b.length - 2, pValue: ma === mb ? 1 : 0 }
  }

  const t = (ma - mb) / Math.sqrt(se)
  const df = (se * se) / ((sa * sa) / (a.length - 1) + (sb * sb) / (b.length - 1))
  return { t, df, pValue: studentTTwoSidedP(t, df) }
}

/** One-sample t-test of a sample mean against a reference `mu`. */
export function oneSampleTTest(sample: number[], mu: number): TTestResult | null {
  if (sample.length < 2) return null
  const m = mean(sample)
  const v = sampleVariance(sample, m)
  const df = sample.length - 1
  if (v === 0) {
    const t = m === mu ? 0 : m > mu ? Infinity : -Infinity
    return { t, df, pValue: m === mu ? 1 : 0 }
  }
  const t = (m - mu) / Math.sqrt(v / sample.length)
  return { t, df, pValue: studentTTwoSidedP(t, df) }
}
