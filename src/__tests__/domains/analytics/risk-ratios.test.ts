import { describe, it, expect } from "vitest"
import {
  sortinoRatio,
  calmarRatio,
  kellyCriterion,
  kellyFromR,
  computeRiskRatios,
  rollingRiskRatios,
} from "@/domains/analytics/institutional/risk-ratios"
import type { Dated } from "@/domains/analytics/longitudinal/rolling-window"

describe("sortinoRatio", () => {
  it("returns null with fewer than two points", () => {
    expect(sortinoRatio([1])).toBeNull()
  })

  it("returns null when there is no downside deviation", () => {
    expect(sortinoRatio([1, 2, 3])).toBeNull()
  })

  it("divides mean return by downside deviation", () => {
    // [2,-1,2,-1]: mean 0.5; downside dev = √((1+1)/4) = √0.5
    expect(sortinoRatio([2, -1, 2, -1])).toBeCloseTo(0.5 / Math.sqrt(0.5), 9)
  })
})

describe("calmarRatio", () => {
  it("is total return over max peak-to-trough drawdown (in R)", () => {
    // cumR 1,2,1,3 → maxDD 1 ; total 3 → calmar 3
    expect(calmarRatio([1, 1, -1, 2])).toBeCloseTo(3, 9)
  })

  it("returns null with no drawdown (undefined ratio)", () => {
    expect(calmarRatio([1, 1, 1])).toBeNull()
  })
})

describe("kellyCriterion", () => {
  it("computes full and half Kelly from win-rate and payoff", () => {
    // W=0.6, Rr=2 → f = 0.6 − 0.4/2 = 0.4
    const k = kellyCriterion(0.6, 2)
    expect(k.full).toBeCloseTo(0.4, 9)
    expect(k.half).toBeCloseTo(0.2, 9)
  })
})

describe("kellyFromR", () => {
  it("derives win-rate and payoff from R multiples", () => {
    const k = kellyFromR([2, 2, 2, -1, -1])!
    expect(k.winRate).toBeCloseTo(0.6, 9)
    expect(k.payoffRatio).toBeCloseTo(2, 9)
    expect(k.full).toBeCloseTo(0.4, 9)
    expect(k.half).toBeCloseTo(0.2, 9)
  })

  it("returns null without both wins and losses", () => {
    expect(kellyFromR([1, 1, 1])).toBeNull()
    expect(kellyFromR([])).toBeNull()
  })
})

describe("computeRiskRatios", () => {
  it("bundles sharpe, sortino, calmar and kelly", () => {
    const r = computeRiskRatios([2, -1, 2, -1])
    expect(r.sharpe).not.toBeNull()
    expect(r.sortino).toBeCloseTo(0.5 / Math.sqrt(0.5), 9)
    expect(r.kellyFull).not.toBeNull()
  })
})

describe("rollingRiskRatios", () => {
  it("computes a ratios bundle per rolling window", () => {
    const series: Dated<number>[] = [
      { date: "2026-01-01", value: 2 },
      { date: "2026-01-02", value: -1 },
      { date: "2026-01-03", value: 2 },
      { date: "2026-01-04", value: -1 },
      { date: "2026-01-05", value: 2 },
      { date: "2026-01-06", value: -1 },
    ]
    const windows = rollingRiskRatios(series, { size: { count: 3 }, step: 3 })
    expect(windows).toHaveLength(2)
    expect(windows[0]).toMatchObject({ from: "2026-01-01", to: "2026-01-03" })
    expect(windows[0].value.sortino).not.toBeUndefined()
  })
})
