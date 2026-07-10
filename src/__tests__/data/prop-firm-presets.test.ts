import { describe, it, expect } from "vitest"
import { PROP_FIRM_PRESETS, FIRMS } from "@/domains/trading/data/prop-firm-presets"

describe("PROP_FIRM_PRESETS", () => {
  it("covers the 3 anchor firms", () => {
    expect(FIRMS).toEqual(["FTMO", "Topstep", "MyFundedFX"])
  })

  it("every preset has a firm/program/phase and a source url", () => {
    for (const p of PROP_FIRM_PRESETS) {
      expect(p.firm).toBeTruthy()
      expect(p.program).toBeTruthy()
      expect(["PHASE_1", "PHASE_2", "FUNDED"]).toContain(p.phase)
      expect(p.sourceUrl).toMatch(/^https:\/\//)
    }
  })

  it("Topstep uses a TRAILING drawdown model", () => {
    const topstep = PROP_FIRM_PRESETS.filter((p) => p.firm === "Topstep")
    expect(topstep.length).toBeGreaterThan(0)
    expect(topstep.every((p) => p.ddModel === "TRAILING")).toBe(true)
  })
})
