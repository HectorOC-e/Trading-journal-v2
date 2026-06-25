import { describe, it, expect } from "vitest"
import { ruleFieldsFromAutomation } from "@/domains/rules/rule-sync"

describe("ruleFieldsFromAutomation — dual-write mapping (G2)", () => {
  const auto = {
    id: "a1", name: "No revenge", description: "d", category: "Psicología",
    trigger: "TRADE_PRE_CREATE", conditions: { field: "x", cmp: "lt", value: 1 },
    actions: [{ type: "BLOCK" }], priority: 2, enabled: true, isSystem: false,
  }

  it("derives enforce mode + CRÍTICA severity from a BLOCK action", () => {
    const f = ruleFieldsFromAutomation(auto)
    expect(f.mode).toBe("enforce")
    expect(f.severity).toBe("CRÍTICA")
    expect(f.sourceAutomationId).toBe("a1")
    expect(f.trigger).toBe("TRADE_PRE_CREATE")
    expect(f.priority).toBe(2)
  })

  it("derives warn mode + MEDIA severity when no action blocks", () => {
    const f = ruleFieldsFromAutomation({ ...auto, actions: [{ type: "NOTIFY" }] })
    expect(f.mode).toBe("warn")
    expect(f.severity).toBe("MEDIA")
  })
})