import { describe, it, expect } from "vitest"
import {
  classifyMode,
  automationToUnifiedRule,
  descriptiveRuleToUnifiedRule,
  buildNoMappingReport,
  type V2Automation,
  type V2DescriptiveRule,
} from "@/domains/rules/unification"

function auto(o: Partial<V2Automation>): V2Automation {
  return {
    id: o.id ?? "auto-1",
    name: o.name ?? "Regla",
    description: o.description ?? "",
    enabled: o.enabled ?? true,
    priority: o.priority ?? 0,
    trigger: o.trigger ?? "TRADE_CREATED",
    conditions: o.conditions ?? {},
    actions: o.actions ?? [{ type: "NOTIFY", params: { message: "x" } }],
    category: o.category ?? "",
    isSystem: o.isSystem ?? false,
  }
}
function desc(o: Partial<V2DescriptiveRule>): V2DescriptiveRule {
  return {
    id: o.id ?? "rule-1",
    name: o.name ?? "Mi regla",
    description: o.description ?? "",
    severity: o.severity ?? "CRÍTICA",
    isSystem: o.isSystem ?? false,
    enabled: o.enabled ?? true,
  }
}

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

describe("automationToUnifiedRule — the executable side maps cleanly", () => {
  it("carries trigger/conditions/actions and derives mode from BLOCK", () => {
    const u = automationToUnifiedRule(auto({ actions: [{ type: "BLOCK", params: { message: "no" } }], trigger: "TRADE_PRE_CREATE" }))
    expect(u).toMatchObject({
      mode: "enforce",
      trigger: "TRADE_PRE_CREATE",
      sourceAutomationId: "auto-1",
    })
    expect(u.actions).toHaveLength(1)
  })
  it("a notify-only automation becomes a warn rule", () => {
    expect(automationToUnifiedRule(auto({})).mode).toBe("warn")
  })
})

describe("descriptiveRuleToUnifiedRule — the descriptive side has no execution", () => {
  it("is always warn with no trigger and empty conditions/actions", () => {
    const u = descriptiveRuleToUnifiedRule(desc({ severity: "CRÍTICA" }))
    expect(u.mode).toBe("warn")
    expect(u.trigger).toBeNull()
    expect(u.conditions).toEqual({})
    expect(u.actions).toEqual([])
    expect(u.severity).toBe("CRÍTICA")
  })
})

describe("buildNoMappingReport — the human-review artifact for gate G2", () => {
  it("flags descriptive rules that look critical but enforce nothing (false protection, R3)", () => {
    const report = buildNoMappingReport(
      [desc({ id: "r1", name: "Stop diario", severity: "CRÍTICA" })],
      [],
    )
    expect(report.descriptiveWithoutEnforcement.map((r) => r.id)).toEqual(["r1"])
    expect(report.summary.falseProtectionCount).toBe(1)
  })

  it("does not flag a descriptive rule backed by an enforcing automation of the same name", () => {
    const report = buildNoMappingReport(
      [desc({ id: "r1", name: "Anti-revenge", severity: "CRÍTICA" })],
      [auto({ id: "a1", name: "Anti-revenge", actions: [{ type: "BLOCK" }] })],
    )
    expect(report.descriptiveWithoutEnforcement).toEqual([])
  })

  it("flags enabled automations with no actions as ambiguous", () => {
    const report = buildNoMappingReport([], [auto({ id: "a2", actions: [] })])
    expect(report.ambiguousAutomations.map((a) => a.id)).toEqual(["a2"])
  })

  it("counts the unified total (descriptive + automations)", () => {
    const report = buildNoMappingReport([desc({ id: "r1" })], [auto({ id: "a1" }), auto({ id: "a2" })])
    expect(report.summary.unifiedTotal).toBe(3)
  })
})