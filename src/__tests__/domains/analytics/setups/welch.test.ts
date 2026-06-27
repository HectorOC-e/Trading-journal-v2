import { describe, it, expect } from "vitest"
import { welchTTest, oneSampleTTest } from "@/domains/analytics/institutional/stats/welch"

describe("welchTTest", () => {
  it("computes the t statistic and Welch df for a known case", () => {
    // a=[10,11,12] mean 11 var 1; b=[13,14,15] mean 14 var 1; n=3 each
    // t = (11−14)/√(1/3+1/3) = −3/√0.6667 = −3.6742 ; Welch df = 4
    const r = welchTTest([10, 11, 12], [13, 14, 15])!
    expect(r.t).toBeCloseTo(-3.6742, 3)
    expect(r.df).toBeCloseTo(4, 6)
    // two-sided p for |t|=3.674, df=4 ≈ 0.0214
    expect(r.pValue).toBeGreaterThan(0.015)
    expect(r.pValue).toBeLessThan(0.03)
  })

  it("returns p≈1 when the means are identical", () => {
    const r = welchTTest([1, 2, 3], [1, 2, 3])!
    expect(r.t).toBeCloseTo(0, 9)
    expect(r.pValue).toBeCloseTo(1, 9)
  })

  it("shrinks the p-value as separation grows (same variance)", () => {
    const near = welchTTest([10, 11, 12], [11, 12, 13])!.pValue
    const far = welchTTest([10, 11, 12], [20, 21, 22])!.pValue
    expect(far).toBeLessThan(near)
  })

  it("a noisier sample yields a larger p-value than a tight one for the same mean gap", () => {
    const tight = welchTTest([10, 10, 10, 10], [12, 12, 12, 12])!.pValue
    const noisy = welchTTest([2, 18, 6, 14], [4, 20, 8, 16])!.pValue // same means, huge variance
    expect(noisy).toBeGreaterThan(tight)
  })

  it("returns null with fewer than two points in either sample", () => {
    expect(welchTTest([1], [1, 2, 3])).toBeNull()
    expect(welchTTest([1, 2, 3], [])).toBeNull()
  })
})

describe("oneSampleTTest", () => {
  it("tests a sample mean against a reference value", () => {
    // [9,10,11] mean 10 var 1 n3 vs mu=7 → t=(10−7)/(1/√3)=3/0.5774=5.196, df=2
    const r = oneSampleTTest([9, 10, 11], 7)!
    expect(r.t).toBeCloseTo(5.196, 2)
    expect(r.df).toBe(2)
    expect(r.pValue).toBeLessThan(0.05)
  })

  it("is p≈1 when the sample mean equals the reference", () => {
    const r = oneSampleTTest([4, 5, 6], 5)!
    expect(r.t).toBeCloseTo(0, 9)
    expect(r.pValue).toBeCloseTo(1, 9)
  })

  it("returns null with fewer than two points", () => {
    expect(oneSampleTTest([5], 3)).toBeNull()
  })
})
