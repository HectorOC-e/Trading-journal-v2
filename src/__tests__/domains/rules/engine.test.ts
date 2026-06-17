import { describe, it, expect, vi } from "vitest"
import { runAutomations } from "@/domains/rules/engine"
import type { EvalContext } from "@/domains/rules/types"

function mockPrisma(autos: unknown[]) {
  return {
    automation: {
      findMany:   vi.fn().mockResolvedValue(autos),
      updateMany: vi.fn().mockResolvedValue({ count: autos.length }),
    },
  }
}
const ctx: EvalContext = { riskPct: 3, minsSinceLastLoss: 5, tags: [] }

describe("runAutomations", () => {
  it("returns early and does not build context when no rules exist", async () => {
    const p = mockPrisma([])
    const ctxFn = vi.fn().mockResolvedValue(ctx)
    const r = await runAutomations(p as never, "u1", "TRADE_PRE_CREATE", ctxFn)
    expect(r.firedIds).toEqual([])
    expect(ctxFn).not.toHaveBeenCalled()
  })

  it("BLOCK action when condition matches", async () => {
    const p = mockPrisma([
      { id: "a1", name: "No revenge", priority: 0, conditions: { field: "minsSinceLastLoss", cmp: "lt", value: 15 }, actions: [{ type: "BLOCK", params: { message: "Espera 15 min" } }] },
    ])
    const r = await runAutomations(p as never, "u1", "TRADE_PRE_CREATE", () => ctx)
    expect(r.blocked).toBe(true)
    expect(r.blockMessage).toBe("Espera 15 min")
    expect(r.firedIds).toEqual(["a1"])
    expect(p.automation.updateMany).toHaveBeenCalledOnce() // lastFiredAt bump
  })

  it("does not fire when condition fails", async () => {
    const p = mockPrisma([
      { id: "a1", name: "x", priority: 0, conditions: { field: "riskPct", cmp: "gt", value: 5 }, actions: [{ type: "BLOCK" }] },
    ])
    const r = await runAutomations(p as never, "u1", "TRADE_PRE_CREATE", () => ctx)
    expect(r.blocked).toBe(false)
    expect(r.firedIds).toEqual([])
  })

  it("ADD_TAG / REMOVE_TAG accumulate mutations across rules", async () => {
    const p = mockPrisma([
      { id: "a1", name: "tag risky", priority: 1, conditions: { field: "riskPct", cmp: "gt", value: 2 }, actions: [{ type: "ADD_TAG", params: { tag: "Revisar" } }] },
      { id: "a2", name: "always", priority: 0, conditions: {}, actions: [{ type: "REMOVE_TAG", params: { tag: "OK" } }] },
    ])
    const r = await runAutomations(p as never, "u1", "TRADE_CREATED", () => ctx)
    expect(r.addTags).toContain("Revisar")
    expect(r.removeTags).toContain("OK")
    expect(r.firedIds).toEqual(["a1", "a2"])
  })

  it("empty conditions ({}) always fire", async () => {
    const p = mockPrisma([{ id: "a1", name: "x", priority: 0, conditions: {}, actions: [{ type: "ADD_TAG", params: { tag: "T" } }] }])
    const r = await runAutomations(p as never, "u1", "TRADE_CREATED", () => ctx)
    expect(r.addTags).toEqual(["T"])
  })
})
