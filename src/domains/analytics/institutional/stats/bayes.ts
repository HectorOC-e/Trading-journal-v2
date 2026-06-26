// ─────────────────────────────────────────────────────────────────────────────
// Bayesian estimators — the methodological anchor of Analytics v3 (Sprint 3).
//
// Resolves ADR-002 / FREEZE-D15 (irreversible *method*): every per-user/per-setup
// estimate uses Bayesian shrinkage (partial pooling toward a population prior) and
// reports a CREDIBLE INTERVAL, never a frequentist point or p-value. At retail
// sample sizes (20–200 trades, ~20 detectors) frequentism over-fires; a posterior
// is well-defined at any n ≥ 1 and simply widens its band — that is the honesty
// (FREEZE-D16: "ningún punto sin banda"). Priors are REVERSIBLE (FREEZE-D15).
//
// Pure, no I/O, fully unit-testable. Two families:
//   • Beta-Binomial  → proportions (win-rate)
//   • Normal-Normal  → continuous quantities (expectancy, avg R)
// Plus empirical-Bayes prior builders that pool across a user's groups (setups,
// instruments), and the numerical primitives (incomplete beta, normal CDF).
// ─────────────────────────────────────────────────────────────────────────────

/** Standard honest estimate: a central value with a credible band and its n. */
export interface Estimate {
  /** Posterior mean (the shrunk point estimate). */
  value: number
  /** Lower bound of the credible interval. */
  ciLow: number
  /** Upper bound of the credible interval. */
  ciHigh: number
  /** Observed sample size behind this estimate. */
  sampleSize: number
  /** Standardized magnitude of the deviation from the population baseline. */
  effectSize: number
}

const DEFAULT_CREDIBLE_MASS = 0.95

// ── Numerical primitives ─────────────────────────────────────────────────────

const LANCZOS_G = 7
const LANCZOS_C = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
]

/** Natural log of the gamma function (Lanczos approximation). */
export function logGamma(z: number): number {
  if (z < 0.5) {
    // Reflection formula.
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  }
  z -= 1
  let x = LANCZOS_C[0]
  for (let i = 1; i < LANCZOS_G + 2; i++) x += LANCZOS_C[i] / (z + i)
  const t = z + LANCZOS_G + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b)
}

/** Continued-fraction expansion for the incomplete beta (Numerical Recipes `betacf`). */
function betacf(x: number, a: number, b: number): number {
  const FPMIN = 1e-300
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 3e-12) break
  }
  return h
}

/** Regularized incomplete beta I_x(a,b) = P(Beta(a,b) ≤ x). */
export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - logBeta(a, b))
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betacf(x, a, b)) / a
  }
  return 1 - (front * betacf(1 - x, b, a)) / b
}

/** Inverse of the regularized incomplete beta: find x with I_x(a,b) = p. */
export function betaQuantile(p: number, a: number, b: number): number {
  if (p <= 0) return 0
  if (p >= 1) return 1
  let lo = 0
  let hi = 1
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (regularizedIncompleteBeta(mid, a, b) < p) lo = mid
    else hi = mid
    if (hi - lo < 1e-12) break
  }
  return (lo + hi) / 2
}

/** Error function (Abramowitz & Stegun 7.1.26), odd by construction. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax)
  return sign * y
}

/** Normal CDF Φ((x−mean)/sd). */
export function normalCdf(x: number, mean = 0, sd = 1): number {
  return 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)))
}

/** Two-tailed standard-normal quantile for a given credible mass (e.g. 0.95 → 1.959964). */
function normalZ(credibleMass: number): number {
  // Invert Φ via bisection; symmetric tail p = (1+mass)/2.
  const p = (1 + credibleMass) / 2
  let lo = 0
  let hi = 10
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (normalCdf(mid) < p) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

// ── Beta-Binomial (proportions) ──────────────────────────────────────────────

export interface BetaPrior {
  /** Prior mean of the proportion (population baseline). */
  mean: number
  /** Prior strength as a pseudo-count (α+β); higher = more shrinkage. */
  strength: number
}

const DEFAULT_BETA_PRIOR: BetaPrior = { mean: 0.5, strength: 2 }

/** Cohen's h effect size between two proportions. */
function cohensH(p1: number, p2: number): number {
  const phi = (p: number) => 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, p))))
  return phi(p1) - phi(p2)
}

/**
 * Posterior estimate of a proportion (e.g. win-rate) under a Beta prior.
 * Returns null with no observations (no fabricated band, ADR-002).
 */
export function betaBinomialEstimate(
  successes: number,
  trials: number,
  prior: BetaPrior = DEFAULT_BETA_PRIOR,
  opts: { credibleMass?: number } = {},
): Estimate | null {
  if (trials <= 0) return null
  const credibleMass = opts.credibleMass ?? DEFAULT_CREDIBLE_MASS
  const a0 = prior.mean * prior.strength
  const b0 = (1 - prior.mean) * prior.strength
  const a = a0 + successes
  const b = b0 + (trials - successes)
  const value = a / (a + b)
  const tail = (1 - credibleMass) / 2
  return {
    value,
    ciLow: betaQuantile(tail, a, b),
    ciHigh: betaQuantile(1 - tail, a, b),
    sampleSize: trials,
    effectSize: cohensH(value, prior.mean),
  }
}

export interface DirectionalEstimate extends Estimate {
  /** Posterior probability the true proportion lies on the flagged side of the baseline. */
  confidence: number
}

/**
 * Proportion estimate plus DIRECTIONAL confidence against a baseline — the shape
 * an insight needs: "how sure are we this bucket's rate is below/above the
 * comparison?". `confidence` = posterior P(p ≤ baseline) for "below", its
 * complement for "above"; `effectSize` = Cohen's h vs the baseline. Null with no
 * observations (no fabricated rigor, R6).
 */
export function proportionEstimate(
  successes: number,
  trials: number,
  params: { baseline: number; direction: "below" | "above"; prior?: BetaPrior; credibleMass?: number },
): DirectionalEstimate | null {
  if (trials <= 0) return null
  const prior = params.prior ?? DEFAULT_BETA_PRIOR
  const credibleMass = params.credibleMass ?? DEFAULT_CREDIBLE_MASS
  const a = prior.mean * prior.strength + successes
  const b = (1 - prior.mean) * prior.strength + (trials - successes)
  const value = a / (a + b)
  const tail = (1 - credibleMass) / 2
  const pBelow = regularizedIncompleteBeta(params.baseline, a, b)
  return {
    value,
    ciLow: betaQuantile(tail, a, b),
    ciHigh: betaQuantile(1 - tail, a, b),
    sampleSize: trials,
    effectSize: cohensH(value, params.baseline),
    confidence: params.direction === "below" ? pBelow : 1 - pBelow,
  }
}

/**
 * Empirical-Bayes Beta prior pooled across groups (e.g. a user's setups).
 * Mean = pooled success rate; strength via method of moments on the group rates,
 * falling back to the total trial count when groups are homogeneous.
 */
export function empiricalBetaPrior(groups: { successes: number; trials: number }[]): BetaPrior {
  const valid = groups.filter((g) => g.trials > 0)
  const totalTrials = valid.reduce((s, g) => s + g.trials, 0)
  if (totalTrials === 0) return DEFAULT_BETA_PRIOR
  const totalSucc = valid.reduce((s, g) => s + g.successes, 0)
  const mean = totalSucc / totalTrials
  if (valid.length < 2 || mean <= 0 || mean >= 1) {
    return { mean, strength: Math.max(2, totalTrials) }
  }
  const rates = valid.map((g) => g.successes / g.trials)
  const rateMean = rates.reduce((s, r) => s + r, 0) / rates.length
  const variance = rates.reduce((s, r) => s + (r - rateMean) ** 2, 0) / (rates.length - 1)
  if (variance <= 1e-9) return { mean, strength: Math.max(2, totalTrials) }
  const strength = (mean * (1 - mean)) / variance - 1
  return { mean, strength: strength > 0 ? strength : Math.max(2, totalTrials) }
}

// ── Normal-Normal (continuous) ───────────────────────────────────────────────

export interface NormalPrior {
  /** Prior mean of the quantity (population baseline). */
  mean: number
  /** Prior variance on the unit's true mean (τ²); larger = less shrinkage. */
  variance: number
}

const DEFAULT_NORMAL_PRIOR: NormalPrior = { mean: 0, variance: 1e6 }

function sampleStats(values: number[]): { n: number; mean: number; variance: number } {
  const n = values.length
  const mean = values.reduce((s, v) => s + v, 0) / n
  const variance = n >= 2 ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0
  return { n, mean, variance }
}

/**
 * Posterior estimate of a continuous quantity (expectancy, avg R) under a Normal
 * prior, with shrinkage toward the prior mean driven by sample size. Needs n ≥ 2
 * to form a band (a single point cannot bound its own sampling error) → null.
 */
export function normalEstimate(
  values: number[],
  prior: NormalPrior = DEFAULT_NORMAL_PRIOR,
  opts: { credibleMass?: number } = {},
): Estimate | null {
  if (values.length < 2) return null
  const credibleMass = opts.credibleMass ?? DEFAULT_CREDIBLE_MASS
  const { n, mean, variance } = sampleStats(values)
  // Observation variance: sample variance when informative, else the prior scale.
  const obsVar = variance > 0 ? variance : prior.variance
  // Pseudo-count of prior observations relative to one data point's information.
  const kappa = obsVar / prior.variance
  const postMean = (kappa * prior.mean + n * mean) / (kappa + n)
  const postVar = obsVar / (kappa + n)
  const z = normalZ(credibleMass)
  const halfWidth = z * Math.sqrt(postVar)
  return {
    value: postMean,
    ciLow: postMean - halfWidth,
    ciHigh: postMean + halfWidth,
    sampleSize: n,
    effectSize: Math.sqrt(obsVar) > 0 ? (postMean - prior.mean) / Math.sqrt(obsVar) : 0,
  }
}

/**
 * Empirical-Bayes Normal prior pooled across groups. Mean = grand mean of the
 * group means; variance = between-group variance of those means.
 */
export function empiricalNormalPrior(groups: number[][]): NormalPrior {
  const means = groups.filter((g) => g.length > 0).map((g) => g.reduce((s, v) => s + v, 0) / g.length)
  if (means.length === 0) return DEFAULT_NORMAL_PRIOR
  const mean = means.reduce((s, m) => s + m, 0) / means.length
  const variance =
    means.length >= 2 ? means.reduce((s, m) => s + (m - mean) ** 2, 0) / (means.length - 1) : 0
  return { mean, variance }
}
