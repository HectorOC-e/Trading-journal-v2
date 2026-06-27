import { describe, it, expect } from "vitest"
import { deriveRiskInputs } from "@/domains/analytics/risk/inputs"

const account = {
  initialBalance: 100_000,
  ddTotalPct: 10, // percent units, as stored on Account
  ddDailyPct: 5,
  targetPct: 8,
  ddModel: "FIXED" as const,
}

describe("deriveRiskInputs", () => {
  it("converts percent-unit account limits to fractions", () => {
    const i = deriveRiskInputs(account, [2, -1, 1], [1, 1, 2])
    expect(i.ruinThresholdPct).toBeCloseTo(0.1, 9)
    expect(i.ddDailyPct).toBeCloseTo(0.05, 9)
    expect(i.targetPct).toBeCloseTo(0.08, 9)
    expect(i.ddModel).toBe("FIXED")
    expect(i.rMultiples).toEqual([2, -1, 1])
  })

  it("uses the median risk-per-trade from history (in fractions)", () => {
    expect(deriveRiskInputs(account, [1], [1, 1, 2]).riskPerTradePct).toBeCloseTo(0.01, 9)
    expect(deriveRiskInputs(account, [1], [2, 4]).riskPerTradePct).toBeCloseTo(0.03, 9) // median of 2,4 = 3 → 0.03
  })

  it("falls back to the default risk-per-trade when history has no risk data", () => {
    expect(deriveRiskInputs(account, [1], [], { fallbackRiskPct: 1 }).riskPerTradePct).toBeCloseTo(0.01, 9)
  })

  it("leaves the daily limit null when the account has none", () => {
    const i = deriveRiskInputs({ ...account, ddDailyPct: null }, [1], [1])
    expect(i.ddDailyPct).toBeNull()
  })

  it("defaults a missing total DD and target to safe zeros/nulls", () => {
    const i = deriveRiskInputs({ ...account, ddTotalPct: null, targetPct: null }, [1], [1])
    expect(i.ruinThresholdPct).toBeNull()
    expect(i.targetPct).toBeNull()
  })
})
