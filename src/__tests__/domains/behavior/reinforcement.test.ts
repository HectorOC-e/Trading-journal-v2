import { describe, it, expect } from "vitest"
import { planReinforcement } from "@/domains/behavior/reinforcement"

describe("planReinforcement", () => {
  it("always surfaces corrective feedback for broken and partial", () => {
    expect(planReinforcement("broken")).toEqual({ kind: "corrective", visible: true })
    expect(planReinforcement("partial")).toEqual({ kind: "corrective", visible: true })
  })

  it("celebrates the first keep, then thins out (variable ratio, FREEZE-D13)", () => {
    // Triangular schedule: visible at prior-keep counts 0,1,3,6,10; hidden at 2,4,5,7
    expect(planReinforcement("kept", 0)).toEqual({ kind: "positive", visible: true })
    expect(planReinforcement("kept", 1).visible).toBe(true)
    expect(planReinforcement("kept", 2).visible).toBe(false)
    expect(planReinforcement("kept", 3).visible).toBe(true)
    expect(planReinforcement("kept", 4).visible).toBe(false)
    expect(planReinforcement("kept", 5).visible).toBe(false)
    expect(planReinforcement("kept", 6).visible).toBe(true)
    expect(planReinforcement("kept", 10).visible).toBe(true)
  })

  it("never celebrates positively without a keep", () => {
    expect(planReinforcement("broken").kind).toBe("corrective")
  })
})
