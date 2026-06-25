import { describe, it, expect, vi, afterEach } from "vitest"
import { runRules, runRuleEngine, rulesSourceIsUnified } from "@/domains/rules/engine"
import type { EvalContext } from "@/domains/rules/types"

function mockPrismaRules(rules: unknown[]) {
  return {
    rule: {
      findMany:   vi.fn().mockResolvedValue(rules),
      updateMany: vi.fn().mockResolvedValue({ count: rules.length }),
    },
    automation: {
      findMany:   vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  }
}
const ctx: EvalContext = { riskPct: 3, minsSinceLastLoss: 5, tags: [] }

// Non-regression: runRules must mirror runAutomations exactly (G2 cutover invariant).
describe("runRules — unified-model runner (G2)", () => {
  it("returns early without building context when no rules exist", async () => {
    const p = mockPrismaRules([])
    const ctxFn = vi.fn().mockResolvedValue(ctx)
    const r = await runRules(p as never, "u1", "TRADE_PRE_CREATE", ctxFn)
    expect(r.firedIds).toEqual([])
    expect(ctxFn).not.toHaveBeenCalled()
  })

  it("BLOCKs when the condition matches (pre-trade invariant intact)", async () => {
    const p = mockPrismaRules([
      { id: "r1", name: "No revenge", priority: 0, conditions: { field: "minsSinceLastLoss", cmp: "lt", value: 15 }, actions: [{ type: "BLOCK", params: { message: "Espera 15 min" } }] },
    ])
    const r = await runRules(p as never, "u1", "TRADE_PRE_CREATE", () => ctx)
    expect(r.blocked).toBe(true)
    expect(r.blockMessage).toBe("Espera 15 min")
    expect(r.firedIds).toEqual(["r1"])
    expect(p.rule.updateMany).toHaveBeenCalledOnce()
  })

  it("does not fire when the condition fails", async () => {
    const p = mockPrismaRules([
      { id: "r1", name: "x", priority: 0, conditions: { field: "riskPct", cmp: "gt", value: 5 }, actions: [{ type: "BLOCK" }] },
    ])
    const r = await runRules(p as never, "u1", "TRADE_PRE_CREATE", () => ctx)
    expect(r.blocked).toBe(false)
    expect(r.firedIds).toEqual([])
  })

  it("accumulates ADD_TAG / REMOVE_TAG across rules", async () => {
    const p = mockPrismaRules([
      { id: "r1", name: "tag risky", priority: 1, conditions: { field: "riskPct", cmp: "gt", value: 2 }, actions: [{ type: "ADD_TAG", params: { tag: "Revisar" } }] },
      { id: "r2", name: "always", priority: 0, conditions: {}, actions: [{ type: "REMOVE_TAG", params: { tag: "OK" } }] },
    ])
    const r = await runRules(p as never, "u1", "TRADE_CREATED", () => ctx)
    expect(r.addTags).toContain("Revisar")
    expect(r.removeTags).toContain("OK")
    expect(r.firedIds).toEqual(["r1", "r2"])
  })
})

describe("runRuleEngine — flag routing (default off)", () => {
  const prev = process.env.RULES_SOURCE
  afterEach(() => { if (prev === undefined) delete process.env.RULES_SOURCE; else process.env.RULES_SOURCE = prev })

  it("defaults to automations when the flag is unset", () => {
    delete process.env.RULES_SOURCE
    expect(rulesSourceIsUnified()).toBe(false)
  })

  it("reads automations source when flag is off", async () => {
    delete process.env.RULES_SOURCE
    const p = mockPrismaRules([{ id: "r1", name: "x", priority: 0, conditions: {}, actions: [{ type: "ADD_TAG", params: { tag: "T" } }] }])
    await runRuleEngine(p as never, "u1", "TRADE_CREATED", () => ctx)
    expect(p.automation.findMany).toHaveBeenCalledOnce()
    expect(p.rule.findMany).not.toHaveBeenCalled()
  })

  it("reads the unified rules source when flag = 'rules'", async () => {
    process.env.RULES_SOURCE = "rules"
    expect(rulesSourceIsUnified()).toBe(true)
    const p = mockPrismaRules([{ id: "r1", name: "x", priority: 0, conditions: {}, actions: [{ type: "ADD_TAG", params: { tag: "T" } }] }])
    await runRuleEngine(p as never, "u1", "TRADE_CREATED", () => ctx)
    expect(p.rule.findMany).toHaveBeenCalledOnce()
    expect(p.automation.findMany).not.toHaveBeenCalled()
  })
})
