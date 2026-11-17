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

  it("keeps null/undefined/unknown types out of real-money classification", () => {
    expect(accountReality(null)).toBe("unclassified")
    expect(accountReality(undefined)).toBe("unclassified")
    expect(accountReality("SOMETHING_NEW")).toBe("unclassified")
    expect(isPracticeType(null)).toBe(false)
  })
})
