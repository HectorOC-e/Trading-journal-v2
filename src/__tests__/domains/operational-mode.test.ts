import { describe, expect, it } from "vitest"
import { classifyAccountType, operationalModeSchema } from "@/domains/trading/operational-mode"
import { accountReality } from "@/domains/trading/account-reality"

describe("operational provenance", () => {
  it.each([
    ["PERSONAL", "REAL"], ["PROP_FIRM", "REAL"],
    ["DEMO_PERSONAL", "DEMO"], ["DEMO_PROP", "DEMO"],
    ["BACKTEST", "BACKTEST"], ["QA", "INTERNAL"],
    [null, null], [undefined, null], ["SOMETHING_NEW", null],
  ])("keeps %s in its own cohort", (type, expected) => {
    expect(classifyAccountType(type)).toBe(expected)
  })

  it("does not classify missing or unknown provenance as real money", () => {
    expect(accountReality(null)).toBe("unclassified")
    expect(accountReality("SOMETHING_NEW")).toBe("unclassified")
  })

  it("rejects mixed and internal scopes at the user-facing boundary", () => {
    for (const value of ["ALL", "INTERNAL", "practice", null]) {
      expect(operationalModeSchema.safeParse(value).success).toBe(false)
    }
    expect(operationalModeSchema.parse("BACKTEST")).toBe("BACKTEST")
  })
})
