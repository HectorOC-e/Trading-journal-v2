import { describe, it, expect } from "vitest"
import { analyzeRDistribution } from "@/domains/analytics/institutional/r-distribution"

describe("analyzeRDistribution", () => {
  it("returns an empty result for no data", () => {
    const r = analyzeRDistribution([])
    expect(r.count).toBe(0)
    expect(r.mean).toBe(0)
    expect(r.median).toBe(0)
    expect(r.std).toBe(0)
    expect(r.skewness).toBe(0)
    expect(r.bins).toEqual([])
    expect(r.leftTailDominant).toBe(false)
  })

  it("computes mean and median (odd and even n)", () => {
    expect(analyzeRDistribution([1, 2, 3]).median).toBe(2)
    expect(analyzeRDistribution([1, 2, 3, 4]).median).toBe(2.5)
    expect(analyzeRDistribution([1, 2, 3]).mean).toBeCloseTo(2, 9)
  })

  it("computes sample standard deviation", () => {
    // [1,3]: mean 2, sample var = (1+1)/1 = 2 → std √2
    expect(analyzeRDistribution([1, 3]).std).toBeCloseTo(Math.SQRT2, 9)
  })

  it("flags a symmetric distribution as not left-tail dominant", () => {
    const r = analyzeRDistribution([-2, -1, 0, 1, 2])
    expect(Math.abs(r.skewness)).toBeLessThan(0.1)
    expect(r.leftTailDominant).toBe(false)
  })

  it("flags left-tail dominance when a fat negative outlier skews the returns", () => {
    // Many small wins + one large loss → strong negative skew.
    const r = analyzeRDistribution([1, 1, 1, 1, -5])
    expect(r.skewness).toBeLessThan(0)
    expect(r.leftTailDominant).toBe(true)
    expect(r.min).toBe(-5)
    expect(r.max).toBe(1)
  })

  it("buckets returns into fixed-width bins", () => {
    const r = analyzeRDistribution([0.1, 0.2, 0.6, 0.9], { binWidth: 0.5 })
    // [0,0.5) → 2 ; [0.5,1.0) → 2
    expect(r.bins.map((b) => b.count)).toEqual([2, 2])
    expect(r.bins[0]).toMatchObject({ from: 0, to: 0.5, count: 2 })
  })

  it("includes the maximum value in the last bin (inclusive upper edge)", () => {
    const r = analyzeRDistribution([0, 0.5, 1.0], { binWidth: 0.5 })
    const total = r.bins.reduce((s, b) => s + b.count, 0)
    expect(total).toBe(3)
  })
})
