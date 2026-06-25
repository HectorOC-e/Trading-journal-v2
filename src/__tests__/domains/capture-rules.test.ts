import { describe, it, expect } from "vitest"
import {
  REGIME_VALUES,
  isRegime,
  evaluateChecklist,
} from "@/domains/trading/services/capture-rules"

describe("regime (E5.C6)", () => {
  it("accepts the three market regimes", () => {
    expect(REGIME_VALUES).toEqual(["trend", "range", "volatile"])
    expect(isRegime("trend")).toBe(true)
    expect(isRegime("range")).toBe(true)
  })
  it("rejects anything else", () => {
    expect(isRegime("sideways")).toBe(false)
    expect(isRegime(null)).toBe(false)
  })
})

describe("evaluateChecklist — mandatory checklist by setup (E5.C3)", () => {
  it("is complete and not off-plan when the setup has no checklist", () => {
    const r = evaluateChecklist({ setupHasChecklist: false, itemsChecked: 0, itemsTotal: 0 })
    expect(r).toMatchObject({ complete: true, offPlan: false, missing: 0 })
  })

  it("is complete when every required item is checked", () => {
    const r = evaluateChecklist({ setupHasChecklist: true, itemsChecked: 4, itemsTotal: 4 })
    expect(r).toMatchObject({ complete: true, offPlan: false, missing: 0 })
  })

  it("flags off-plan with the count of unchecked items", () => {
    const r = evaluateChecklist({ setupHasChecklist: true, itemsChecked: 1, itemsTotal: 4 })
    expect(r).toMatchObject({ complete: false, offPlan: true, missing: 3 })
  })

  it("never reports negative missing if checked exceeds total", () => {
    const r = evaluateChecklist({ setupHasChecklist: true, itemsChecked: 5, itemsTotal: 4 })
    expect(r.missing).toBe(0)
    expect(r.offPlan).toBe(false)
  })
})