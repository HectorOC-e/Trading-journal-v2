import { describe, expect, it, vi } from "vitest"
import {
  buildValidationEvidenceSignature,
  getSetupValidationEvidence,
  getSetupValidationOverview,
  getValidationPolicy,
} from "@/server/services/setups/validation-service"

const owner = "owner"
const setupId = "11111111-1111-4111-8111-111111111111"
const date = new Date("2026-10-05T12:00:00Z")
const setup = {
  id: setupId,
  userId: owner,
  name: "Ruptura",
  market: "FX",
  direction: "LONG",
  description: "Ruptura y retroceso",
  expectedWr: 55,
  expectedAvgR: 0.4,
  aplusChecklist: ["Confirmación"],
  standardChecklist: [],
  updatedAt: new Date("2026-10-01T00:00:00Z"),
  edgeUpdatedAt: new Date("2026-09-01T00:00:00Z"),
}
const policy = {
  id: "22222222-2222-4222-8222-222222222222",
  userId: owner,
  setupId,
  version: 1,
  backtestMinClosed: 2,
  backtestMinRCoveragePct: 50,
  backtestMinChecklistCoveragePct: 50,
  backtestRequirePositiveExpectancy: true,
  demoMinClosed: 2,
  demoMinDistinctWeeks: 1,
  demoMinChecklistCompliancePct: 50,
  demoRequirePositiveExpectancy: true,
  realMonitorMinClosed: 2,
  realMonitorMinDistinctWeeks: 1,
  criteria: {},
  createdAt: date,
  updatedAt: date,
}

function fixture() {
  const rows = {
    BACKTEST: [
      { id: "bt-1", date, rMultiple: 2, pnl: 5000, direction: "LONG", updatedAt: date },
      { id: "bt-2", date: new Date("2026-10-06T12:00:00Z"), rMultiple: -1, pnl: -20, direction: "LONG", updatedAt: date },
    ],
    DEMO: [
      { id: "dm-1", date, rMultiple: 0.5, pnl: 50, direction: "LONG", updatedAt: date },
      { id: "dm-2", date, rMultiple: 0.5, pnl: 60, direction: "LONG", updatedAt: date },
    ],
    REAL: [
      { id: "rl-1", date, rMultiple: null, pnl: 9000, direction: "LONG", updatedAt: date },
    ],
  }
  const tradeFindMany = vi.fn(async (args: { where: { operationalMode: keyof typeof rows } }) => rows[args.where.operationalMode])
  const policyUpsert = vi.fn(async () => policy)
  const prisma = {
    setup: { findFirst: vi.fn(async () => setup) },
    setupValidationPolicy: { upsert: policyUpsert },
    setupValidationDecision: { findMany: vi.fn(async () => [
      { action: "PROMOTE", fromStage: "HYPOTHESIS", toStage: "BACKTEST", createdAt: new Date("2026-09-01") },
      { action: "PROMOTE", fromStage: "BACKTEST", toStage: "DEMO", createdAt: new Date("2026-10-01") },
    ]) },
    trade: { findMany: tradeFindMany },
    tradeChecklistResult: { findMany: vi.fn(async ({ where }: { where: { tradeId: { in: string[] } } }) =>
      where.tradeId.in.map((tradeId) => ({ tradeId, itemsChecked: ["Confirmación"], itemsTotal: 1 }))) },
    practiceTradeLink: { findMany: vi.fn(async ({ where }: { where: { tradeId: { in: string[] } } }) =>
      where.tradeId.in[0]?.startsWith("bt") ? [
        { role: "EXECUTED", tradeId: "bt-1", practice: { id: "p-1", kind: "EXECUTION", updatedAt: date, attachments: [{ id: "a-1" }, { id: "a-2" }] } },
        { role: "REVIEWED", tradeId: "bt-2", practice: { id: "p-2", kind: "REVIEW", updatedAt: date, attachments: [{ id: "a-2" }] } },
      ] : []) },
  }
  return { prisma, tradeFindMany, policyUpsert }
}

describe("setup validation service", () => {
  it("checks setup ownership before materializing one default policy", async () => {
    const f = fixture()
    expect(await getValidationPolicy(f.prisma as never, owner, setupId)).toMatchObject({ version: 1, backtestMinClosed: 2 })
    expect(f.prisma.setup.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: setupId, userId: owner } }))
    expect(f.policyUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_setupId: { userId: owner, setupId } },
      create: expect.objectContaining({ userId: owner, setupId }),
      update: {},
    }))

    f.prisma.setup.findFirst.mockResolvedValueOnce(null as never)
    expect(await getValidationPolicy(f.prisma as never, "other", setupId)).toBeNull()
    expect(f.policyUpsert).toHaveBeenCalledTimes(1)
  })

  it("queries one owned closed mode and returns R evidence without a monetary total", async () => {
    const f = fixture()
    const evidence = await getSetupValidationEvidence(f.prisma as never, owner, setupId, "BACKTEST")

    expect(f.tradeFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: owner,
        operationalMode: "BACKTEST",
        account: { userId: owner, type: { in: ["BACKTEST"] } },
        setupId,
        status: "CLOSED",
      },
    }))
    expect(evidence).toMatchObject({
      stage: "BACKTEST",
      mode: "BACKTEST",
      closedCount: 2,
      expectancyR: 0.5,
      cumulativeR: 1,
      practiceContext: { executedPractices: 1, reviewPractices: 1, captures: 2 },
    })
    expect(evidence).not.toHaveProperty("netPnl")
    expect(evidence).not.toHaveProperty("currency")
    expect(evidence?.signature).toMatch(/^[a-f0-9]{64}$/)
  })

  it("builds a three-mode comparison with no aggregate and replays the current stage", async () => {
    const f = fixture()
    const overview = await getSetupValidationOverview(f.prisma as never, owner, setupId)

    expect(f.tradeFindMany.mock.calls.map(([args]) => args.where.operationalMode)).toEqual(["BACKTEST", "DEMO", "REAL"])
    expect(overview?.comparison.map((row) => row.mode)).toEqual(["BACKTEST", "DEMO", "REAL"])
    expect(overview?.comparison).toEqual([
      expect.objectContaining({ mode: "BACKTEST", closedCount: 2, expectancyR: 0.5 }),
      expect.objectContaining({ mode: "DEMO", closedCount: 2, expectancyR: 0.5 }),
      expect.objectContaining({ mode: "REAL", closedCount: 1, expectancyR: null }),
    ])
    expect(overview?.state).toEqual({ currentStage: "DEMO", suspended: false })
    expect(overview).not.toHaveProperty("total")
    expect(overview).not.toHaveProperty("netPnl")
  })

  it("uses canonical signatures that change with policy or source revisions", () => {
    const left = buildValidationEvidenceSignature({
      schemaVersion: 1,
      mode: "BACKTEST",
      trades: [{ id: "b", updatedAt: "2026-10-02" }, { id: "a", updatedAt: "2026-10-01" }],
      evidence: { closedCount: 2, averageR: 0.5 },
    }, 1)
    const same = buildValidationEvidenceSignature({
      evidence: { averageR: 0.5, closedCount: 2 },
      trades: [{ updatedAt: "2026-10-02", id: "b" }, { updatedAt: "2026-10-01", id: "a" }],
      mode: "BACKTEST",
      schemaVersion: 1,
    }, 1)
    const changedTrade = buildValidationEvidenceSignature({
      schemaVersion: 1,
      mode: "BACKTEST",
      trades: [{ id: "b", updatedAt: "2026-10-03" }, { id: "a", updatedAt: "2026-10-01" }],
      evidence: { closedCount: 2, averageR: 0.5 },
    }, 1)

    expect(same).toBe(left)
    expect(changedTrade).not.toBe(left)
    expect(buildValidationEvidenceSignature({ value: 1 }, 2)).not.toBe(buildValidationEvidenceSignature({ value: 1 }, 1))
  })
})
