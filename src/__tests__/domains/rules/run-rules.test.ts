import { describe, it, expect, vi } from "vitest"
import { runRules } from "@/domains/rules/engine"
import type { EvalContext } from "@/domains/rules/types"

function mockPrismaRules(rules: unknown[]) {
  return {
    rule: {
      findMany:   vi.fn().mockResolvedValue(rules),
      updateMany: vi.fn().mockResolvedValue({ count: rules.length }),
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
