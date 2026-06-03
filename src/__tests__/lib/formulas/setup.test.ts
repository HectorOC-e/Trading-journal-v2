import { describe, it, expect } from "vitest"
import { calcSetupHealth } from "@/lib/formulas/setup"

const base = { winRate: 0.6, avgR: 1.5, expectedWr: 0.55, expectedAvgR: 1.0, tradeCount: 10 }

describe("calcSetupHealth()", () => {
  it("returns 'insufficient' when tradeCount < 5", () => {
    expect(calcSetupHealth({ ...base, tradeCount: 4 })).toBe("insufficient")
    expect(calcSetupHealth({ ...base, tradeCount: 0 })).toBe("insufficient")
  })

  it("returns 'healthy' when both metrics meet expectations", () => {
    expect(calcSetupHealth(base)).toBe("healthy")
  })

  it("returns 'healthy' when expectations are null (unconstrained)", () => {
    expect(calcSetupHealth({ winRate: 0.3, avgR: 0.5, expectedWr: null, expectedAvgR: null, tradeCount: 10 })).toBe("healthy")
  })

  it("returns 'critical' when winRate is below 70% of expectedWr", () => {
    // expectedWr = 0.55, 70% threshold = 0.385; winRate 0.38 < 0.385
    expect(calcSetupHealth({ ...base, winRate: 0.38 })).toBe("critical")
  })

  it("returns 'critical' when avgR is negative", () => {
    expect(calcSetupHealth({ ...base, avgR: -0.1 })).toBe("critical")
  })

  it("returns 'warning' when winRate misses target but not below critical threshold", () => {
    // winRate 0.45 < expectedWr 0.55 but >= 0.55 * 0.7 = 0.385
    expect(calcSetupHealth({ ...base, winRate: 0.45 })).toBe("warning")
  })

  it("returns 'warning' when avgR misses target but is non-negative", () => {
    // avgR 0.5 < expectedAvgR 1.0
    expect(calcSetupHealth({ ...base, avgR: 0.5 })).toBe("warning")
  })

  it("returns 'healthy' when winRate expectation is null but avgR meets target", () => {
    expect(calcSetupHealth({ ...base, expectedWr: null })).toBe("healthy")
  })

  it("returns 'healthy' when avgR expectation is null but winRate meets target", () => {
    expect(calcSetupHealth({ ...base, expectedAvgR: null })).toBe("healthy")
  })

  it("returns 'critical' when avgR < 0 regardless of expectations being null", () => {
    expect(calcSetupHealth({ winRate: 0.8, avgR: -0.01, expectedWr: null, expectedAvgR: null, tradeCount: 10 })).toBe("critical")
  })

  it("tradeCount exactly 5 is not insufficient", () => {
    expect(calcSetupHealth({ ...base, tradeCount: 5 })).not.toBe("insufficient")
  })
})
