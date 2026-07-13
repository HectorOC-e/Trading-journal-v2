import { describe, it, expect } from "vitest"
import { classifyMode } from "@/domains/rules/unification"

describe("classifyMode — enforce vs warn (FREEZE-D8)", () => {
  it("is enforce when any action blocks", () => {
    expect(classifyMode([{ type: "NOTIFY" }, { type: "BLOCK" }])).toBe("enforce")
  })
  it("is warn when no action blocks", () => {
    expect(classifyMode([{ type: "NOTIFY" }, { type: "ADD_TAG" }])).toBe("warn")
  })
  it("is warn for an empty action list", () => {
    expect(classifyMode([])).toBe("warn")
  })
})
