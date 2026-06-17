import { describe, it, expect } from "vitest"
import { isPracticeType, accountReality } from "@/domains/trading/account-reality"

describe("account-reality classifier", () => {
  it("classifies real-money account types as 'real'", () => {
    for (const type of ["PERSONAL", "PROP_FIRM"]) {
      expect(accountReality(type)).toBe("real")
      expect(isPracticeType(type)).toBe(false)
    }
  })

  it("classifies demo/backtest/QA account types as 'practice'", () => {
    for (const type of ["DEMO_PERSONAL", "DEMO_PROP", "BACKTEST", "QA"]) {
      expect(accountReality(type)).toBe("practice")
      expect(isPracticeType(type)).toBe(true)
    }
  })

  it("treats null/undefined/unknown types as real (fail-open to real money)", () => {
    expect(accountReality(null)).toBe("real")
    expect(accountReality(undefined)).toBe("real")
    expect(accountReality("SOMETHING_NEW")).toBe("real")
    expect(isPracticeType(null)).toBe(false)
  })
})
