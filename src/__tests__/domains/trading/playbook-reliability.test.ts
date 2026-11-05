import { describe, it, expect } from "vitest"
import { setupFormSchema } from "@/domains/trading/schemas/setup-form-schema"
import { parseEdgeNumber, duplicateSetup, activeSetupPnl } from "@/domains/trading/services/playbook-reliability"

describe("playbook reliability", () => {
  it("sends explicit null when an Edge value is cleared, accepts comma decimals", () => {
    expect(parseEdgeNumber("")).toBeNull()
    expect(parseEdgeNumber(" 1,25 ")).toBe(1.25)
    expect(() => parseEdgeNumber("12oops")).toThrow()
  })
  it("duplicates images and every Edge field", () => {
    const original = { name: "X", abbreviation: "X", market: "FX", direction: "LONG" as const, description: "", color: "red", images: ["a.png"], aplusChecklist: ["A"], standardChecklist: ["B"], expectedWr: "60", expectedAvgR: "2", minR: "1", maxR: "4" }
    expect(duplicateSetup(original)).toMatchObject({ images: ["a.png"], expectedWr: 60, expectedAvgR: 2, minR: 1, maxR: 4, status: "EN_PRUEBA" })
  })
  it("counts PnL only for active setups", () => {
    expect(activeSetupPnl([{ id: "a", status: "ACTIVO" }, { id: "b", status: "PAUSADO" }], { a: { netPnl: 100 }, b: { netPnl: -300 } })).toBe(100)
  })
  it("validates strict finite Edge numbers, ranges and abbreviation", () => {
    const base = { name: "X", abbr: "X", market: "FX", direction: "LONG", status: "ACTIVO", description: "", color: "red", images: [], aplusChecklist: [], standardChecklist: [], expectedWr: "", expectedAvgR: "", minR: "", maxR: "" }
    for (const change of [{ expectedWr: "101" }, { expectedAvgR: "1abc" }, { maxR: "Infinity" }, { minR: "3", maxR: "2" }, { abbr: "ABCDE" }]) expect(setupFormSchema.safeParse({ ...base, ...change }).success).toBe(false)
    expect(setupFormSchema.safeParse({ ...base, expectedWr: "55,5" }).success).toBe(true)
  })
})
