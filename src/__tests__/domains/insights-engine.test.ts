import { describe, it, expect } from "vitest"
import {
  generateInsights,
  detectIntradayDecay,
  detectSetupConcentration,
  detectLosingStreak,
  detectAccountRisk,
  type AnalyticsTrade,
  type InsightInput,
} from "@/domains/analytics/services/insights-engine"

function trade(o: Partial<AnalyticsTrade> & { id: string; date: string; pnl: number }): AnalyticsTrade {
  return {
    id: o.id, accountId: o.accountId ?? "a1", symbol: o.symbol ?? "EURUSD",
    direction: o.direction ?? "LONG", session: o.session ?? "London",
    openTime: o.openTime ?? "08:00", closeTime: o.closeTime ?? "09:00",
    pnl: o.pnl, rMultiple: o.rMultiple ?? (o.pnl >= 0 ? 1 : -1),
    tags: o.tags ?? [], date: o.date, setupId: o.setupId ?? null,
    entry: 1, stop: 0.99, target: 1.02, size: 1,
    emotionBefore: o.emotionBefore ?? null, fomoFlag: o.fomoFlag, revengeFlag: o.revengeFlag,
  }
}

function emptyInput(trades: AnalyticsTrade[]): InsightInput {
  return { trades, setups: [], accounts: [], withdrawals: [] }
}

describe("insights-engine", () => {
  it("returns no insights below the minimum sample size", () => {
    const trades = [trade({ id: "1", date: "2026-01-01", pnl: 10 })]
    expect(generateInsights(emptyInput(trades))).toEqual([])
  })

  it("detects intraday decay when late-day trades underperform", () => {
    const trades: AnalyticsTrade[] = []
    // 10 days, 4 trades each: first 2 win, last 2 lose
    for (let d = 1; d <= 10; d++) {
      const date = `2026-01-${String(d).padStart(2, "0")}`
      trades.push(trade({ id: `${d}-1`, date, pnl: 100, openTime: "08:00" }))
      trades.push(trade({ id: `${d}-2`, date, pnl: 100, openTime: "09:00" }))
      trades.push(trade({ id: `${d}-3`, date, pnl: -80, openTime: "10:00" }))
      trades.push(trade({ id: `${d}-4`, date, pnl: -80, openTime: "11:00" }))
    }
    const insight = detectIntradayDecay(trades)
    expect(insight).not.toBeNull()
    expect(insight!.category).toBe("pattern")
    expect(insight!.metric).toBeGreaterThan(12)
  })

  it("detects setup profit concentration", () => {
    const trades: AnalyticsTrade[] = []
    for (let i = 0; i < 20; i++) {
      // setup A makes big money, others small/none
      trades.push(trade({ id: `a${i}`, date: `2026-02-${String((i % 28) + 1).padStart(2, "0")}`, pnl: 200, setupId: "A" }))
    }
    for (let i = 0; i < 5; i++) {
      trades.push(trade({ id: `b${i}`, date: `2026-03-${String((i % 28) + 1).padStart(2, "0")}`, pnl: 20, setupId: "B" }))
    }
    const insight = detectSetupConcentration({ trades, setups: [{ id: "A", name: "Breakout" }], accounts: [], withdrawals: [] })
    expect(insight).not.toBeNull()
    expect(insight!.severity).toBe("positive")
    expect(insight!.title).toContain("Breakout")
  })

  it("detects a losing streak", () => {
    const trades: AnalyticsTrade[] = []
    for (let i = 0; i < 15; i++) trades.push(trade({ id: `w${i}`, date: `2026-01-${String(i + 1).padStart(2, "0")}`, pnl: 50 }))
    for (let i = 0; i < 6; i++) trades.push(trade({ id: `l${i}`, date: `2026-02-${String(i + 1).padStart(2, "0")}`, pnl: -50 }))
    const insight = detectLosingStreak(trades)
    expect(insight).not.toBeNull()
    expect(insight!.metric).toBeGreaterThanOrEqual(5)
  })

  it("flags locked accounts as critical risk", () => {
    const insights = detectAccountRisk({
      trades: [], setups: [],
      accounts: [{ id: "x", name: "FTMO 100k", locked: true, ddTotalPct: 9 }],
      withdrawals: [],
    })
    expect(insights).toHaveLength(1)
    expect(insights[0].severity).toBe("critical")
    expect(insights[0].title).toContain("FTMO 100k")
  })

  it("ranks critical insights before info", () => {
    const trades: AnalyticsTrade[] = []
    for (let i = 0; i < 25; i++) trades.push(trade({ id: `t${i}`, date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`, pnl: i % 2 ? 50 : -50 }))
    const result = generateInsights({
      trades, setups: [],
      accounts: [{ id: "x", name: "Acct", locked: true, ddTotalPct: null }],
      withdrawals: [],
    })
    expect(result[0].severity).toBe("critical")
  })
})
