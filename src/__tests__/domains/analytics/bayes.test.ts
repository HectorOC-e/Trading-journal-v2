import { describe, it, expect } from "vitest"
import {
  betaBinomialEstimate,
  proportionEstimate,
  normalEstimate,
  empiricalBetaPrior,
  empiricalNormalPrior,
  regularizedIncompleteBeta,
  betaQuantile,
  normalCdf,
} from "@/domains/analytics/institutional/stats/bayes"

const approx = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps

describe("regularizedIncompleteBeta — I_x(a,b)", () => {
  it("reduces to the identity for the uniform Beta(1,1)", () => {
    // I_x(1,1) = x
    for (const x of [0.1, 0.25, 0.5, 0.8]) {
      expect(approx(regularizedIncompleteBeta(x, 1, 1), x, 1e-9)).toBe(true)
    }
  })

  it("is 0.5 at the midpoint for a symmetric Beta(a,a)", () => {
    expect(approx(regularizedIncompleteBeta(0.5, 3, 3), 0.5, 1e-9)).toBe(true)
    expect(approx(regularizedIncompleteBeta(0.5, 10, 10), 0.5, 1e-9)).toBe(true)
  })

  it("clamps the boundaries", () => {
    expect(regularizedIncompleteBeta(0, 2, 5)).toBe(0)
    expect(regularizedIncompleteBeta(1, 2, 5)).toBe(1)
  })
})

describe("betaQuantile — inverse of the regularized incomplete beta", () => {
  it("inverts regularizedIncompleteBeta", () => {
    const a = 9
    const b = 3
    for (const x of [0.2, 0.4, 0.6, 0.85]) {
      const p = regularizedIncompleteBeta(x, a, b)
      expect(approx(betaQuantile(p, a, b), x, 1e-5)).toBe(true)
    }
  })
})

describe("betaBinomialEstimate — proportion (win-rate) with partial pooling", () => {
  it("returns null with no data (no fabricated band)", () => {
    expect(betaBinomialEstimate(0, 0)).toBeNull()
  })

  it("posterior mean is the shrunk proportion under a uniform prior", () => {
    // Uniform prior Beta(1,1): posterior Beta(1+k, 1+(n-k)); mean=(k+1)/(n+2)
    const e = betaBinomialEstimate(8, 10)! // 8 wins / 10
    expect(e).not.toBeNull()
    expect(approx(e.value, 9 / 12, 1e-9)).toBe(true) // 0.75
    expect(e.sampleSize).toBe(10)
  })

  it("shrinks small samples harder toward the prior mean than large ones", () => {
    // Same observed 100% win-rate; the smaller sample stays closer to the 0.5 prior.
    const small = betaBinomialEstimate(2, 2, { mean: 0.5, strength: 4 })!
    const large = betaBinomialEstimate(20, 20, { mean: 0.5, strength: 4 })!
    expect(small.value).toBeLessThan(large.value)
    expect(large.value).toBeGreaterThan(0.8)
  })

  it("never reports a point without a band, ordered low < value < high", () => {
    const e = betaBinomialEstimate(7, 10)!
    expect(e.ciLow).toBeLessThan(e.value)
    expect(e.value).toBeLessThan(e.ciHigh)
    expect(e.ciLow).toBeGreaterThanOrEqual(0)
    expect(e.ciHigh).toBeLessThanOrEqual(1)
  })

  it("produces a wider band for n=3 than for n=300 at the same rate", () => {
    const wide = betaBinomialEstimate(2, 3)!
    const narrow = betaBinomialEstimate(200, 300)!
    expect(wide.ciHigh - wide.ciLow).toBeGreaterThan(narrow.ciHigh - narrow.ciLow)
  })

  it("effect size is ~0 when the observed rate matches the prior mean", () => {
    const e = betaBinomialEstimate(50, 100, { mean: 0.5, strength: 2 })!
    expect(Math.abs(e.effectSize)).toBeLessThan(0.05)
  })
})

describe("proportionEstimate — directional confidence vs a baseline", () => {
  it("returns null with no observations", () => {
    expect(proportionEstimate(0, 0, { baseline: 0.5, direction: "below" })).toBeNull()
  })

  it("is highly confident a low bucket rate is below a high baseline", () => {
    // 5/20 = 25% vs a 60% baseline → strongly 'below'.
    const e = proportionEstimate(5, 20, { baseline: 0.6, direction: "below" })!
    expect(e.confidence).toBeGreaterThan(0.95)
    expect(e.value).toBeLessThan(0.6)
    expect(e.effectSize).toBeLessThan(0)
  })

  it("is highly confident a high bucket rate is above a low baseline", () => {
    const e = proportionEstimate(15, 20, { baseline: 0.3, direction: "above" })!
    expect(e.confidence).toBeGreaterThan(0.95)
    expect(e.value).toBeGreaterThan(0.3)
  })

  it("keeps confidence in [0,1] and the band ordered", () => {
    const e = proportionEstimate(7, 10, { baseline: 0.5, direction: "above" })!
    expect(e.confidence).toBeGreaterThanOrEqual(0)
    expect(e.confidence).toBeLessThanOrEqual(1)
    expect(e.ciLow).toBeLessThan(e.value)
    expect(e.value).toBeLessThan(e.ciHigh)
  })
})

describe("empiricalBetaPrior — pool across groups", () => {
  it("derives a prior mean equal to the pooled success rate", () => {
    const prior = empiricalBetaPrior([
      { successes: 5, trials: 10 },
      { successes: 15, trials: 30 },
    ])
    // pooled rate = 20/40 = 0.5
    expect(approx(prior.mean, 0.5, 1e-9)).toBe(true)
    expect(prior.strength).toBeGreaterThan(0)
  })
})

describe("normalCdf", () => {
  it("is 0.5 at the mean and symmetric", () => {
    expect(approx(normalCdf(0, 0, 1), 0.5, 1e-9)).toBe(true)
    expect(approx(normalCdf(1, 0, 1) + normalCdf(-1, 0, 1), 1, 1e-9)).toBe(true)
  })

  it("matches the known 1-sigma mass", () => {
    expect(approx(normalCdf(1, 0, 1), 0.8413447, 1e-5)).toBe(true)
  })
})

describe("normalEstimate — continuous (expectancy / avgR) with shrinkage", () => {
  it("returns null without enough data to form a band", () => {
    expect(normalEstimate([])).toBeNull()
    expect(normalEstimate([0.5])).toBeNull() // n=1, no prior variance → cannot band
  })

  it("shrinks the sample mean toward the prior mean", () => {
    const sample = [1, 1, 1, 1] // sample mean 1.0
    const e = normalEstimate(sample, { mean: 0, variance: 1 })!
    expect(e.value).toBeGreaterThan(0)
    expect(e.value).toBeLessThan(1) // pulled toward prior mean 0
    expect(e.sampleSize).toBe(4)
  })

  it("shrinks less as the sample grows", () => {
    const few = normalEstimate([2, 2, 2, 2], { mean: 0, variance: 1 })!
    const many = normalEstimate(Array(100).fill(2), { mean: 0, variance: 1 })!
    expect(many.value).toBeGreaterThan(few.value) // larger n → closer to observed 2
  })

  it("reports an ordered credible band", () => {
    const e = normalEstimate([0.5, 1.5, -0.5, 2.0, 0.0], { mean: 0, variance: 4 })!
    expect(e.ciLow).toBeLessThan(e.value)
    expect(e.value).toBeLessThan(e.ciHigh)
  })
})

describe("empiricalNormalPrior — pool continuous groups", () => {
  it("derives a prior mean equal to the grand mean of the groups", () => {
    const prior = empiricalNormalPrior([[0, 0, 0], [2, 2, 2]])
    expect(approx(prior.mean, 1, 1e-9)).toBe(true)
    expect(prior.variance).toBeGreaterThanOrEqual(0)
  })
})
