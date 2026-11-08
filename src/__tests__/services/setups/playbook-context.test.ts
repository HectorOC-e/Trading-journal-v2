import { describe, expect, it, vi } from "vitest"
import { getSetupPlaybook } from "@/server/services/setups/playbook-service"

const owner = "owner"
const setupId = "setup"
const date = new Date("2026-11-01")
function fixture(rows: object[] = []) {
  const findMany = vi.fn(async () => rows)
  const findFirst = vi.fn(async () => ({ direction: "AMBAS", expectedWr: null, expectedAvgR: 1, edgeUpdatedAt: null }))
  const prisma = { setup: { findFirst }, trade: { findMany }, tradeChecklistResult: { findMany: vi.fn(async () => [
    { tradeId: "a", itemsChecked: ["one", "two"], itemsTotal: 2 },
    { tradeId: "b", itemsChecked: ["one"], itemsTotal: 2 },
    { tradeId: "c", itemsChecked: [], itemsTotal: 0 },
  ]) } }
  return { prisma, findMany, findFirst }
}

describe("setup evaluation context", () => {
  it.each([
    [undefined, ["PERSONAL", "PROP_FIRM"]],
    ["DEMO", ["DEMO_PERSONAL", "DEMO_PROP"]],
    ["BACKTEST", ["BACKTEST"]],
  ] as const)("constrains the whole evaluation to owned CLOSED %s accounts, excluding QA", async (scope, types) => {
    const f = fixture()
    await getSetupPlaybook(f.prisma as never, owner, setupId, scope)
    expect(f.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: setupId, userId: owner } }))
    expect(f.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: owner, setupId, status: "CLOSED", account: { userId: owner, type: { in: [...types] } } } }))
  })
  it("distinguishes closed sample, usable R and valid checklist denominator without summing currencies", async () => {
    const f = fixture([
      { id: "a", rMultiple: 2, pnl: 100, direction: "LONG", date },
      { id: "b", rMultiple: null, pnl: -200, direction: "SHORT", date },
      { id: "c", rMultiple: -1, pnl: -10, direction: "LONG", date },
      { id: "d", rMultiple: null, pnl: 20, direction: "LONG", date },
    ])
    const result = await getSetupPlaybook(f.prisma as never, owner, setupId)
    expect(result?.context).toEqual({ closedCount: 4, usableRCount: 2, checklistEvaluated: 2, checklistCompliant: 1, checklistUnknown: 2, complianceRate: 50 })
    expect(result?.decay.status).toBe("insufficient")
    expect(result).not.toHaveProperty("netPnl")
    expect(f.prisma.tradeChecklistResult.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: owner, tradeId: { in: ["a", "b", "c", "d"] } } }))
  })
  it("returns null compliance rather than zero when no checklist can be evaluated", async () => {
    const f = fixture([{ id: "d", rMultiple: null, pnl: 0, direction: "LONG", date }])
    expect((await getSetupPlaybook(f.prisma as never, owner, setupId))?.context).toEqual({ closedCount: 1, usableRCount: 0, checklistEvaluated: 0, checklistCompliant: 0, checklistUnknown: 1, complianceRate: null })
  })
  it("returns an empty sample and preserves ownership for an unavailable setup", async () => {
    const f = fixture()
    expect((await getSetupPlaybook(f.prisma as never, owner, setupId))?.context).toMatchObject({ closedCount: 0, usableRCount: 0, complianceRate: null })
    f.findFirst.mockResolvedValueOnce(null as never)
    expect(await getSetupPlaybook(f.prisma as never, owner, setupId)).toBeNull()
  })
  it("preserves the eight-R decay threshold and returns currency-free evolution windows", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, rMultiple: i % 2 ? 2 : -1, pnl: i % 2 ? 100 : -10000, direction: "LONG", date }))
    const f = fixture(rows.slice(0, 7))
    expect((await getSetupPlaybook(f.prisma as never, owner, setupId))?.decay.status).toBe("insufficient")
    f.findMany.mockResolvedValueOnce(rows.slice(0, 8))
    expect((await getSetupPlaybook(f.prisma as never, owner, setupId))?.decay.status).not.toBe("insufficient")
    f.findMany.mockResolvedValueOnce(rows)
    const result = await getSetupPlaybook(f.prisma as never, owner, setupId)
    expect(result?.evolution).toHaveLength(2)
    expect(result?.evolution[0].value).toEqual({ trades: 10, winRate: 50, avgR: 0.5 })
  })

})
