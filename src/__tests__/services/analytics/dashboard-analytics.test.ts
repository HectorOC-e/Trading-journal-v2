import { describe, it, expect } from "vitest"
import {
  buildKpis,
  buildEquityCurve,
  buildPnlByDate,
  buildSessionStats,
  buildPnlBySymbol,
  buildExecutionStats,
  buildDiscipline,
} from "@/domains/analytics/services/dashboard-analytics"
import type { MinimalTrade, AccountBalance } from "@/domains/analytics/services/dashboard-analytics"

function trade(overrides: Partial<MinimalTrade> & { id: string; date: string; pnl: number }): MinimalTrade {
  return {
    accountId: "acc-1",
    symbol:    "EURUSD",
    direction: "LONG",
    session:   "New York",
    openTime:  "09:30",
    closeTime: "10:00",
    rMultiple: null,
    tags:      [],
    setupId:   null,
    entry:     1.1,
    stop:      1.09,
    target:    1.12,
    size:      10,
    ...overrides,
  }
}

// ── buildKpis ──────────────────────────────────────────────────────────────

describe("buildKpis", () => {
  it("empty trades → zero counts", () => {
    const kpis = buildKpis([], "2026-05-31", "2026-05-01")
    expect(kpis.total).toBe(0)
    expect(kpis.wins).toBe(0)
    expect(kpis.losses).toBe(0)
    expect(kpis.netPnl).toBe(0)
    expect(kpis.winRate).toBe(0)
    expect(kpis.tradeStreak).toBeNull()
    expect(kpis.bestDay).toBeNull()
    expect(kpis.worstDay).toBeNull()
  })

  it("counts wins, losses and break-evens correctly", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-01", pnl: 100 }),
      trade({ id: "2", date: "2026-05-01", pnl: -50 }),
      trade({ id: "3", date: "2026-05-01", pnl: 0 }),
    ]
    const kpis = buildKpis(trades, "2026-05-31", "2026-05-01")
    expect(kpis.total).toBe(3)
    expect(kpis.wins).toBe(1)
    expect(kpis.losses).toBe(1)
    expect(kpis.be).toBe(1)
    expect(kpis.netPnl).toBe(50)
  })

  it("pnlToday includes only today's trades", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-31", pnl: 200 }),
      trade({ id: "2", date: "2026-05-30", pnl: -100 }),
    ]
    const kpis = buildKpis(trades, "2026-05-31", "2026-05-01")
    expect(kpis.pnlToday).toBe(200)
    expect(kpis.tradesCountToday).toBe(1)
  })

  it("pnlMonth sums trades from monthStart onwards", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-15", pnl: 300 }),
      trade({ id: "2", date: "2026-04-30", pnl: -200 }),
    ]
    const kpis = buildKpis(trades, "2026-05-31", "2026-05-01")
    expect(kpis.pnlMonth).toBe(300)
  })

  it("winRate = 100 when all trades are wins", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-01", pnl: 100 }),
      trade({ id: "2", date: "2026-05-02", pnl: 200 }),
    ]
    const kpis = buildKpis(trades, "2026-05-31", "2026-05-01")
    expect(kpis.winRate).toBe(100)
  })

  it("tradeStreak correctly identifies current win streak", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-01", pnl: 100 }),
      trade({ id: "2", date: "2026-05-02", pnl: 200 }),
      trade({ id: "3", date: "2026-05-03", pnl: -50 }),  // most recent is a loss
    ]
    const kpis = buildKpis(trades, "2026-05-31", "2026-05-01")
    expect(kpis.tradeStreak).not.toBeNull()
    expect(kpis.tradeStreak?.isWin).toBe(false)
    expect(kpis.tradeStreak?.count).toBe(1)
  })

  it("tradeStreak is null when most recent trade is break-even", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-01", pnl: 100 }),
      trade({ id: "2", date: "2026-05-02", pnl: 0 }),
    ]
    const kpis = buildKpis(trades, "2026-05-31", "2026-05-01")
    expect(kpis.tradeStreak).toBeNull()
  })

  it("bestDay and worstDay are correct", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-01", pnl: 500 }),
      trade({ id: "2", date: "2026-05-01", pnl: 100 }),  // same day → 600 total
      trade({ id: "3", date: "2026-05-02", pnl: -300 }),
    ]
    const kpis = buildKpis(trades, "2026-05-31", "2026-05-01")
    expect(kpis.bestDay?.date).toBe("2026-05-01")
    expect(kpis.bestDay?.pnl).toBe(600)
    expect(kpis.worstDay?.date).toBe("2026-05-02")
    expect(kpis.worstDay?.pnl).toBe(-300)
  })

  it("avgR uses only trades with non-null rMultiple", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-01", pnl: 200, rMultiple: 2 }),
      trade({ id: "2", date: "2026-05-01", pnl: 100, rMultiple: null }),
    ]
    const kpis = buildKpis(trades, "2026-05-31", "2026-05-01")
    expect(kpis.avgR).toBe(2)
  })
})

// ── buildEquityCurve ───────────────────────────────────────────────────────

describe("buildEquityCurve", () => {
  it("empty trades → empty curve", () => {
    const accounts: AccountBalance[] = [{ id: "acc-1", initialBalance: 10_000 }]
    expect(buildEquityCurve([], accounts)).toEqual([])
  })

  it("single account curve starts from initialBalance", () => {
    const accounts: AccountBalance[] = [{ id: "acc-1", initialBalance: 10_000 }]
    const trades = [trade({ id: "1", date: "2026-05-01", pnl: 500 })]
    const curve = buildEquityCurve(trades, accounts)
    expect(curve).toHaveLength(1)
    expect(curve[0].balance).toBe(10_500)
    expect(curve[0].accountId).toBe("acc-1")
  })

  it("multiple accounts each get their own curve points", () => {
    const accounts: AccountBalance[] = [
      { id: "acc-1", initialBalance: 10_000 },
      { id: "acc-2", initialBalance: 5_000 },
    ]
    const trades = [
      trade({ id: "1", date: "2026-05-01", pnl: 100, accountId: "acc-1" }),
      trade({ id: "2", date: "2026-05-01", pnl: 200, accountId: "acc-2" }),
    ]
    const curve = buildEquityCurve(trades, accounts)
    expect(curve.filter(c => c.accountId === "acc-1")[0].balance).toBe(10_100)
    expect(curve.filter(c => c.accountId === "acc-2")[0].balance).toBe(5_200)
  })

  it("cumulates balance correctly over multiple trades", () => {
    const accounts: AccountBalance[] = [{ id: "acc-1", initialBalance: 10_000 }]
    const trades = [
      trade({ id: "1", date: "2026-05-01", pnl:  200 }),
      trade({ id: "2", date: "2026-05-02", pnl: -100 }),
      trade({ id: "3", date: "2026-05-03", pnl:  300 }),
    ]
    const curve = buildEquityCurve(trades, accounts)
    expect(curve.map(c => c.balance)).toEqual([10_200, 10_100, 10_400])
  })

  it("includes accountId on every point", () => {
    const accounts: AccountBalance[] = [{ id: "acc-1", initialBalance: 1_000 }]
    const trades = [trade({ id: "1", date: "2026-05-01", pnl: 50 })]
    const curve = buildEquityCurve(trades, accounts)
    expect(curve[0].accountId).toBe("acc-1")
  })
})

// ── buildPnlByDate ─────────────────────────────────────────────────────────

describe("buildPnlByDate", () => {
  it("daily grain: one point per date per account", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-01", pnl: 100 }),
      trade({ id: "2", date: "2026-05-01", pnl:  50 }),
      trade({ id: "3", date: "2026-05-02", pnl: -30 }),
    ]
    const result = buildPnlByDate(trades, "daily")
    expect(result).toHaveLength(2)
    expect(result.find(r => r.date === "2026-05-01")?.pnl).toBe(150)
    expect(result.find(r => r.date === "2026-05-02")?.pnl).toBe(-30)
  })

  it("weekly grain: groups into ISO weeks", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-04", pnl: 100 }),  // W19
      trade({ id: "2", date: "2026-05-07", pnl:  50 }),  // W19
      trade({ id: "3", date: "2026-05-11", pnl: -30 }),  // W20
    ]
    const result = buildPnlByDate(trades, "weekly")
    expect(result).toHaveLength(2)
    const w19 = result.find(r => r.date === "2026-W19")
    const w20 = result.find(r => r.date === "2026-W20")
    expect(w19?.pnl).toBe(150)
    expect(w20?.pnl).toBe(-30)
  })

  it("monthly grain: groups into YYYY-MM", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-01", pnl:  200 }),
      trade({ id: "2", date: "2026-05-15", pnl:  100 }),
      trade({ id: "3", date: "2026-06-01", pnl: -50 }),
    ]
    const result = buildPnlByDate(trades, "monthly")
    expect(result).toHaveLength(2)
    expect(result.find(r => r.date === "2026-05")?.pnl).toBe(300)
    expect(result.find(r => r.date === "2026-06")?.pnl).toBe(-50)
  })

  it("result is sorted by date ascending", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-10", pnl: 100 }),
      trade({ id: "2", date: "2026-05-01", pnl:  50 }),
    ]
    const result = buildPnlByDate(trades, "daily")
    expect(result[0].date).toBe("2026-05-01")
    expect(result[1].date).toBe("2026-05-10")
  })

  it("empty trades → empty result", () => {
    expect(buildPnlByDate([], "daily")).toEqual([])
  })
})

// ── buildSessionStats ──────────────────────────────────────────────────────

describe("buildSessionStats", () => {
  it("empty trades → empty array", () => {
    expect(buildSessionStats([])).toEqual([])
  })

  it("groups by session and computes win rate", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-01", pnl:  100, session: "New York" }),
      trade({ id: "2", date: "2026-05-02", pnl: -50,  session: "New York" }),
      trade({ id: "3", date: "2026-05-03", pnl:  200, session: "London" }),
    ]
    const result = buildSessionStats(trades)
    const ny = result.find(s => s.session === "New York")!
    expect(ny.trades).toBe(2)
    expect(ny.winRate).toBe(50)
    expect(result.find(s => s.session === "London")?.trades).toBe(1)
  })

  it("null session is grouped as 'Sin sesión'", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-01", pnl: 100, session: null }),
    ]
    const result = buildSessionStats(trades)
    expect(result[0].session).toBe("Sin sesión")
  })
})

// ── buildPnlBySymbol ───────────────────────────────────────────────────────

describe("buildPnlBySymbol", () => {
  it("empty trades → empty array", () => {
    expect(buildPnlBySymbol([], 10)).toEqual([])
  })

  it("aggregates pnl by symbol", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-01", pnl: 100, symbol: "EURUSD" }),
      trade({ id: "2", date: "2026-05-02", pnl:  50, symbol: "EURUSD" }),
      trade({ id: "3", date: "2026-05-03", pnl: -80, symbol: "GBPUSD" }),
    ]
    const result = buildPnlBySymbol(trades, 10)
    const eu = result.find(s => s.symbol === "EURUSD")!
    expect(eu.pnl).toBe(150)
    expect(eu.trades).toBe(2)
    expect(eu.winRate).toBe(100)
  })

  it("respects the limit parameter", () => {
    const trades = Array.from({ length: 15 }, (_, i) =>
      trade({ id: `t${i}`, date: "2026-05-01", pnl: i + 1, symbol: `SYM${i}` }),
    )
    expect(buildPnlBySymbol(trades, 5)).toHaveLength(5)
  })

  it("sorts by absolute pnl descending", () => {
    const trades = [
      trade({ id: "1", date: "2026-05-01", pnl:   50, symbol: "A" }),
      trade({ id: "2", date: "2026-05-01", pnl: -200, symbol: "B" }),
      trade({ id: "3", date: "2026-05-01", pnl:  100, symbol: "C" }),
    ]
    const result = buildPnlBySymbol(trades, 10)
    expect(result[0].symbol).toBe("B")
    expect(result[1].symbol).toBe("C")
    expect(result[2].symbol).toBe("A")
  })
})

// ── buildExecutionStats (TD-018 extraction) ─────────────────────────────────

describe("buildExecutionStats", () => {
  it("empty trades → all null", () => {
    const r = buildExecutionStats([])
    expect(r.avgDurationMinutes).toBeNull()
    expect(r.avgPlannedRisk).toBeNull()
    expect(r.avgPlannedReward).toBeNull()
    expect(r.riskRewardRatio).toBeNull()
  })

  it("computes avg duration from open/close times", () => {
    const r = buildExecutionStats([
      trade({ id: "1", date: "2026-05-01", pnl: 10, openTime: "09:00", closeTime: "09:30" }), // 30m
      trade({ id: "2", date: "2026-05-01", pnl: 10, openTime: "10:00", closeTime: "11:00" }), // 60m
    ])
    expect(r.avgDurationMinutes).toBe(45)
  })

  it("ignores non-positive durations", () => {
    const r = buildExecutionStats([
      trade({ id: "1", date: "2026-05-01", pnl: 10, openTime: "10:00", closeTime: "09:00" }), // negative
      trade({ id: "2", date: "2026-05-01", pnl: 10, openTime: "10:00", closeTime: "10:20" }), // 20m
    ])
    expect(r.avgDurationMinutes).toBe(20)
  })

  it("computes planned risk, reward, and R:R ratio", () => {
    // entry 1.10, stop 1.09, target 1.12, size 10 → risk=0.01*10=0.1, reward=0.02*10=0.2
    const r = buildExecutionStats([
      trade({ id: "1", date: "2026-05-01", pnl: 10, entry: 1.10, stop: 1.09, target: 1.12, size: 10 }),
    ])
    expect(r.avgPlannedRisk).toBeCloseTo(0.1, 5)
    expect(r.avgPlannedReward).toBeCloseTo(0.2, 5)
    expect(r.riskRewardRatio).toBeCloseTo(2, 4)
  })
})

// ── buildDiscipline (TD-018 extraction) ─────────────────────────────────────

describe("buildDiscipline", () => {
  it("empty trades → zeroed summary", () => {
    const d = buildDiscipline([], 0)
    expect(d.heatmapData).toEqual([])
    expect(d.violations).toEqual([])
    expect(d.rachaDiasLimpios).toBe(0)
    expect(d.composition).toEqual({ planSeguido: 0, offPlan: 0, partial: 0 })
    expect(d.rDistribution).toHaveLength(8)
  })

  it("heatmap picks worst severity per day (off-plan=2 > loss=1 > clean=0)", () => {
    const d = buildDiscipline([
      trade({ id: "1", date: "2026-05-01", pnl:  50 }),                       // clean
      trade({ id: "2", date: "2026-05-01", pnl: -50, tags: ["Off-plan"] }),   // off-plan
      trade({ id: "3", date: "2026-05-02", pnl: -50 }),                       // loss
    ], 3)
    const day1 = d.heatmapData.find(h => h.date === "2026-05-01")
    const day2 = d.heatmapData.find(h => h.date === "2026-05-02")
    expect(day1?.severity).toBe(2)
    expect(day2?.severity).toBe(1)
  })

  it("tallies violations by tag and filters zero-counts", () => {
    const d = buildDiscipline([
      trade({ id: "1", date: "2026-05-01", pnl: 10, tags: ["Impulsivo"] }),
      trade({ id: "2", date: "2026-05-01", pnl: 10, tags: ["Revanche"] }),
      trade({ id: "3", date: "2026-05-01", pnl: 10, setupId: "s1" }),
    ], 3)
    const rules = Object.fromEntries(d.violations.map(v => [v.rule, v.count]))
    expect(rules["Flag impulsivo manual"]).toBe(1)
    expect(rules["Revanche / revenge trade"]).toBe(1)
    expect(rules["Sin setup asignado"]).toBe(2) // trades 1 & 2 have no setupId
    expect(rules["Off-plan"]).toBeUndefined()   // zero → filtered out
  })

  it("clean-day streak breaks on most recent off-plan day", () => {
    const d = buildDiscipline([
      trade({ id: "1", date: "2026-05-03", pnl: 10 }),                     // clean (latest)
      trade({ id: "2", date: "2026-05-02", pnl: 10 }),                     // clean
      trade({ id: "3", date: "2026-05-01", pnl: -10, tags: ["Impulsivo"] }), // dirty
    ], 3)
    expect(d.rachaDiasLimpios).toBe(2)
  })

  it("A+ vs standard win-rate split", () => {
    const d = buildDiscipline([
      trade({ id: "1", date: "2026-05-01", pnl:  10, tags: ["A+"] }), // A+ win
      trade({ id: "2", date: "2026-05-01", pnl: -10, tags: ["A+"] }), // A+ loss
      trade({ id: "3", date: "2026-05-01", pnl:  10 }),               // std win
    ], 3)
    expect(d.aplusStats.aplusCount).toBe(2)
    expect(d.aplusStats.stdCount).toBe(1)
    expect(d.aplusStats.aplusWr).toBe(50)
    expect(d.aplusStats.stdWr).toBe(100)
  })

  it("cost of indiscipline sums P&L of off-plan trades only", () => {
    const d = buildDiscipline([
      trade({ id: "1", date: "2026-05-01", pnl: -30, tags: ["Off-plan"] }),
      trade({ id: "2", date: "2026-05-01", pnl: -20, tags: ["Impulsivo"] }),
      trade({ id: "3", date: "2026-05-01", pnl:  50 }), // clean — excluded
    ], 3)
    expect(d.costoIndisciplina).toBe(-50)
  })
})
