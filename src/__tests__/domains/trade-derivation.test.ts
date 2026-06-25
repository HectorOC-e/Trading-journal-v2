import { describe, it, expect } from "vitest"
import {
  deriveSession,
  deriveRiskAmount,
  deriveRiskPct,
} from "@/domains/trading/services/trade-derivation"

describe("deriveSession — auto-fill session from open time (#27)", () => {
  it("maps hours to the standard sessions", () => {
    expect(deriveSession("02:00")).toBe("Asia")
    expect(deriveSession("09:30")).toBe("London")
    expect(deriveSession("14:00")).toBe("New York")
    expect(deriveSession("18:15")).toBe("London Close")
  })
  it("wraps late night back to Asia", () => {
    expect(deriveSession("22:30")).toBe("Asia")
  })
  it("returns null for an unparseable time (so the user picks manually)", () => {
    expect(deriveSession("")).toBeNull()
    expect(deriveSession("nope")).toBeNull()
    expect(deriveSession("25:00")).toBeNull()
  })
})

describe("deriveRiskAmount — money at risk (#27)", () => {
  it("is |entry − stop| × size", () => {
    expect(deriveRiskAmount({ entry: 100, stop: 95, size: 2 })).toBe(10)
    expect(deriveRiskAmount({ entry: 1.105, stop: 1.1, size: 100 })).toBeCloseTo(0.5, 5)
  })
  it("is zero when entry equals stop", () => {
    expect(deriveRiskAmount({ entry: 100, stop: 100, size: 3 })).toBe(0)
  })
})

describe("deriveRiskPct — % of balance risked (#27)", () => {
  it("is riskAmount / balance × 100, rounded to 2dp", () => {
    expect(deriveRiskPct({ entry: 100, stop: 95, size: 2, balance: 1000 })).toBe(1)
    expect(deriveRiskPct({ entry: 100, stop: 90, size: 1, balance: 800 })).toBe(1.25)
  })
  it("returns null when balance is missing or non-positive (no divide-by-zero)", () => {
    expect(deriveRiskPct({ entry: 100, stop: 95, size: 2, balance: 0 })).toBeNull()
    expect(deriveRiskPct({ entry: 100, stop: 95, size: 2, balance: -5 })).toBeNull()
  })
})