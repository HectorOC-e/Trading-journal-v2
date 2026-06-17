import { describe, it, expect, vi } from "vitest"
import { buildTraderContext } from "@/domains/analytics/ai-context"

function mkTrade(over: Partial<Record<string, unknown>>) {
  return {
    id: "t", accountId: "a1", symbol: "EURUSD", direction: "LONG",
    session: "NY", openTime: "9:00", closeTime: "10:00",
    tags: [], setupId: "s1", entry: 1.1, stop: 1.09, target: 1.12, size: 1,
    ...over,
  }
}

const TRADES = [
  mkTrade({ id: "t1", pnl: 400, rMultiple: 2,    date: new Date("2026-06-01") }),
  mkTrade({ id: "t2", pnl: -200, rMultiple: -1,  date: new Date("2026-06-02") }),
  mkTrade({ id: "t3", pnl: 300, rMultiple: 1.5,  date: new Date("2026-06-03") }),
  mkTrade({ id: "t4", pnl: -100, rMultiple: -0.5,date: new Date("2026-06-04") }),
  mkTrade({ id: "t5", pnl: 200, rMultiple: 1,    date: new Date("2026-06-05") }),
]

function makePrisma() {
  return {
    trade: { findMany: vi.fn().mockImplementation(({ where }: { where: { tags?: unknown } }) =>
      Promise.resolve(where.tags ? [] : TRADES)) },
    learningResource: { findMany: vi.fn().mockResolvedValue([]) },
    weeklyReview:     { findMany: vi.fn().mockResolvedValue([]) },
    setup:            { findMany: vi.fn().mockResolvedValue([
      { id: "s1", name: "Breakout London", abbreviation: "BL", market: "Forex", direction: "AMBAS", status: "ACTIVO", expectedWr: 55, expectedAvgR: 1.2 },
    ]) },
    user:             { findUnique: vi.fn().mockResolvedValue({
      weeklyPnlGoal: null, weeklyTradesGoal: null, disciplineGoal: null, weeklyGoalMinutes: null,
      baseCurrency: "USD", fxRates: "{}",
    }) },
    account:          { findMany: vi.fn().mockResolvedValue([
      { id: "a1", name: "Cuenta EUR", type: "PERSONAL", currency: "EUR", phase: "NONE", status: "ACTIVE", locked: false, lockReason: "", initialBalance: 30000, ddDailyPct: null, ddTotalPct: null, targetPct: null },
    ]) },
    withdrawal:       { findMany: vi.fn().mockResolvedValue([
      { currency: "USD", status: "PAGADO", amount: 5000 },
      { currency: "USD", status: "PAGADO", amount: 3500 },
      { currency: "EUR", status: "SOLICITADO", amount: 500 },
    ]) },
    rule:             { findMany: vi.fn().mockResolvedValue([{ name: "Max 2 trades/día", severity: "CRÍTICA" }]) },
    tradingSessionLog:{ findMany: vi.fn().mockResolvedValue([{ preMood: 4, energyLevel: 5 }, { preMood: 2, energyLevel: 3 }]) },
    market:           { findMany: vi.fn().mockResolvedValue([{ symbol: "EURUSD", name: "Euro / Dólar" }]) },
    studySession:     { findMany: vi.fn().mockResolvedValue([]) },
  }
}

describe("buildTraderContext — global context (Fase 1 IA)", () => {
  it("includes accounts with equity converted to base currency (FX)", async () => {
    const ctx = await buildTraderContext("u1", makePrisma() as never)
    expect(ctx.baseCurrency).toBe("USD")
    expect(ctx.accounts).toHaveLength(1)
    // net = 400-200+300-100+200 = 600; equity = 30600 EUR → * 1.08 = 33048 USD
    expect(ctx.accounts[0].name).toBe("Cuenta EUR")
    expect(ctx.accounts[0].balance).toBeCloseTo(33048, 2)
  })

  it("computes per-setup stats + health", async () => {
    const ctx = await buildTraderContext("u1", makePrisma() as never)
    const s = ctx.setups[0]
    expect(s.name).toBe("Breakout London")
    expect(s.tradeCount).toBe(5)
    expect(s.winRate).toBe(60)            // 3/5
    expect(s.avgR).toBeCloseTo(0.6, 4)    // (2-1+1.5-0.5+1)/5
    expect(s.health).toBe("warning")      // wr ok but avgR 0.6 < expected 1.2
  })

  it("aggregates withdrawals by currency and status", async () => {
    const ctx = await buildTraderContext("u1", makePrisma() as never)
    expect(ctx.withdrawals.USD.PAGADO).toEqual({ count: 2, amount: 8500 })
    expect(ctx.withdrawals.EUR.SOLICITADO).toEqual({ count: 1, amount: 500 })
  })

  it("summarizes psychology, rules and markets", async () => {
    const ctx = await buildTraderContext("u1", makePrisma() as never)
    expect(ctx.psychology).toEqual({ sessions: 2, avgPreMood: 3, avgEnergy: 4 })
    expect(ctx.rules[0].name).toBe("Max 2 trades/día")
    expect(ctx.markets[0].symbol).toBe("EURUSD")
  })

  it("never exposes credential-like fields on accounts", async () => {
    const ctx = await buildTraderContext("u1", makePrisma() as never)
    const keys = Object.keys(ctx.accounts[0])
    for (const forbidden of ["apiKey", "apiKeyEnc", "password", "token"]) {
      expect(keys).not.toContain(forbidden)
    }
  })
})

describe("buildTraderContext — practice (demo/backtest) isolation", () => {
  // 3 real trades on a1 (net 500) + 2 demo trades on a2 (unreal +1000 each).
  // One demo trade is off-plan, to prove behaviour still counts practice.
  const MIXED = [
    mkTrade({ id: "r1", accountId: "a1", pnl: 400, rMultiple: 2,  date: new Date("2026-06-01") }),
    mkTrade({ id: "r2", accountId: "a1", pnl: -200, rMultiple: -1,date: new Date("2026-06-02") }),
    mkTrade({ id: "r3", accountId: "a1", pnl: 300, rMultiple: 1.5,date: new Date("2026-06-03") }),
    mkTrade({ id: "d1", accountId: "a2", pnl: 1000, rMultiple: 5, date: new Date("2026-06-04") }),
    mkTrade({ id: "d2", accountId: "a2", pnl: 1000, rMultiple: 5, date: new Date("2026-06-05"), tags: ["Off-plan"] }),
  ]

  function makeMixedPrisma() {
    const p = makePrisma()
    p.trade.findMany = vi.fn().mockImplementation(({ where }: { where: { tags?: unknown } }) =>
      Promise.resolve(where.tags ? [] : MIXED)) as never
    p.account.findMany = vi.fn().mockResolvedValue([
      { id: "a1", name: "Real",  type: "PERSONAL",      currency: "USD", phase: "NONE", status: "ACTIVE", locked: false, lockReason: "", initialBalance: 10000, ddDailyPct: null, ddTotalPct: null, targetPct: null },
      { id: "a2", name: "Demo",  type: "DEMO_PERSONAL", currency: "USD", phase: "NONE", status: "ACTIVE", locked: false, lockReason: "", initialBalance: 10000, ddDailyPct: null, ddTotalPct: null, targetPct: null },
    ]) as never
    return p
  }

  it("excludes practice trades from financial performance", async () => {
    const ctx = await buildTraderContext("u1", makeMixedPrisma() as never)
    expect(ctx.performance.totalTrades).toBe(3)        // only real
    expect(ctx.performance.netPnl).toBe(500)           // 400-200+300, no unreal +2000
  })

  it("counts practice trades in behavioural metrics (habit is real)", async () => {
    const ctx = await buildTraderContext("u1", makeMixedPrisma() as never)
    // off-plan rate is over ALL 5 trades (1/5 = 20%), even though the off-plan
    // trade was on a demo account.
    expect(ctx.behavior.offPlanPct).toBe(20)
  })

  it("still lists every account (practice included, labelled by type)", async () => {
    const ctx = await buildTraderContext("u1", makeMixedPrisma() as never)
    expect(ctx.accounts.map(a => a.type).sort()).toEqual(["DEMO_PERSONAL", "PERSONAL"])
  })
})
