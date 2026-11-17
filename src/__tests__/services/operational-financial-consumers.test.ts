import { describe, expect, it, vi } from "vitest"
import { getInstrumentEdges, getTagEdges } from "@/server/services/analytics/edge-service"
import { setupsRouter } from "@/server/trpc/routers/setups"
import { getAggregateExposure } from "@/server/services/risk/risk-service"
import type { OperationalMode } from "@/domains/trading/operational-mode"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

const setupId = "550e8400-e29b-41d4-a716-446655440001"

function fixture() {
  const accounts = [
    ...["PERSONAL", "DEMO_PERSONAL", "BACKTEST"].flatMap((type, index) => [
      { id: `${type}-eur`, type, status: "INACTIVE", currency: "EUR", operationalMode: ["REAL", "DEMO", "BACKTEST"][index], pnl: 10 },
      { id: `${type}-usd`, type, status: "ACTIVE", currency: "USD", operationalMode: ["REAL", "DEMO", "BACKTEST"][index], pnl: -5 },
      { id: `${type}-brl`, type, status: "ACTIVE", currency: "BRL", operationalMode: ["REAL", "DEMO", "BACKTEST"][index], pnl: 10000 },
    ]),
    { id: "qa", type: "QA", status: "ACTIVE", currency: "USD", operationalMode: "INTERNAL", pnl: 100000 },
    { id: "unknown", type: "UNRECOGNIZED", status: "ACTIVE", currency: "USD", operationalMode: "REAL", pnl: 100000 },
  ]
  const rows = accounts.map(account => ({
    id: `trade-${account.id}`, accountId: account.id, account,
    operationalMode: account.operationalMode, symbol: "ES", tags: ["A+"],
    rMultiple: account.pnl > 0 ? 2 : -1, pnl: account.pnl, setupId,
    date: new Date("2026-11-10"), direction: "LONG", session: "New York",
    openTime: "10:00", closeTime: "10:30", entry: 100, stop: 99, target: 102, size: 1,
  }))
  return {
    user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ baseCurrency: "USD", fxRates: { EUR: 2 } }) },
    trade: { findMany: vi.fn(async ({ where }) => rows.filter(row =>
      row.operationalMode === where.operationalMode &&
      where.account.type.in.includes(row.account.type) &&
      (!where.account.status || where.account.status.in.includes(row.account.status)),
    )) },
    setup: { findMany: vi.fn().mockResolvedValue([{ id: setupId, name: "Breakout", abbreviation: "BO", color: "blue", expectedWr: null, expectedAvgR: null }]) },
    tradeChecklistResult: { findMany: vi.fn().mockResolvedValue([]) },
  }
}

describe.each<OperationalMode>(["REAL", "DEMO", "BACKTEST"])("%s financial consumers", mode => {
  it("normalizes instrument edges and excludes unavailable FX with evidence", async () => {
    const result = await getInstrumentEdges(fixture() as never, "user", mode)
    expect(result.totalNetPnl).toBe(15)
    expect(result.bySymbol).toEqual([expect.objectContaining({ trades: 2, netPnl: 15, avgR: 0.5, winRate: 50 })])
    expect(result).toMatchObject({ baseCurrency: "USD", scope: { mode, includeArchived: true, excludedCurrencies: ["BRL"] } })
  })

  it("normalizes tag edges and excludes unavailable FX with evidence", async () => {
    const result = await getTagEdges(fixture() as never, "user", mode)
    expect(result.byTag).toEqual([expect.objectContaining({ tag: "A+", trades: 2, netPnl: 15, avgR: 0.5 })])
    expect(result).toMatchObject({ baseCurrency: "USD", scope: { mode, includeArchived: true, excludedCurrencies: ["BRL"] } })
  })

  it("normalizes Setup totals and equity before ranking profitability", async () => {
    const caller = setupsRouter.createCaller({ prisma: fixture() as never, userId: "user", supabase: {} as never })
    const result = await caller.performanceStats({ mode })
    expect(result.setupStats).toEqual([expect.objectContaining({ trades: 2, netPnl: 15, equityCurve: [20, 15], winRate: 50, avgR: 0.5 })])
    expect(result.playbookSummary?.mostProfitable.netPnl).toBe(15)
    expect(result).toMatchObject({ baseCurrency: "USD", scope: { mode, includeArchived: true, excludedCurrencies: ["BRL"] } })
  })
})

it("keeps aggregate open-position exposure inside the selected operational world", async () => {
  const trades = [
    { accountId: "real", operationalMode: "REAL", symbol: "ES", riskPct: 1, direction: "LONG" },
    { accountId: "demo", operationalMode: "DEMO", symbol: "NQ", riskPct: 2, direction: "SHORT" },
  ]
  const db = {
    trade: { findMany: vi.fn(async ({ where }) => trades.filter(row => !where.operationalMode || row.operationalMode === where.operationalMode)) },
    account: { findMany: vi.fn().mockResolvedValue([{ id: "demo", initialBalance: 1000 }]) },
  }
  const result = await getAggregateExposure(db as never, "user", "DEMO")
  expect(db.trade.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ operationalMode: "DEMO" }) }))
  expect(result.exposure.totalGrossRiskAmount).toBe(20)
  expect(result.scope).toEqual({ mode: "DEMO" })
})
