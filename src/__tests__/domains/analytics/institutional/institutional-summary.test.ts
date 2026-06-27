import { describe, it, expect } from "vitest"
import { summarizeInstitutional } from "@/domains/analytics/institutional/institutional-summary"

describe("summarizeInstitutional", () => {
  it("bundles R distribution, ratios and drawdown from trades", () => {
    const trades = [
      { rMultiple: 2, pnl: 200, date: "2026-01-01" },
      { rMultiple: -1, pnl: -100, date: "2026-01-02" },
      { rMultiple: 1, pnl: 100, date: "2026-01-03" },
      { rMultiple: -1, pnl: -100, date: "2026-01-04" },
      { rMultiple: 2, pnl: 200, date: "2026-01-05" },
    ]
    const s = summarizeInstitutional(trades)
    expect(s.sampleSize).toBe(5)
    expect(s.rDistribution.count).toBe(5)
    expect(s.ratios.kellyFull).not.toBeNull()
    // equity 200,100,200,100,300 → peak 200 then trough 100 → max DD 50%
    expect(s.drawdown.maxDrawdownPct).toBeCloseTo(50, 6)
  })

  it("ignores trades without an R for the distribution but keeps P&L in the curve", () => {
    const s = summarizeInstitutional([
      { rMultiple: null, pnl: 100, date: "2026-01-01" },
      { rMultiple: 1, pnl: 100, date: "2026-01-02" },
      { rMultiple: -1, pnl: -50, date: "2026-01-03" },
    ])
    expect(s.rDistribution.count).toBe(2)
    expect(s.drawdown.series.length).toBe(3)
  })

  it("uses the supplied equity curve for drawdown (real capital basis)", () => {
    // R from trades, but drawdown from a real-capital equity curve (10k → 9.5k = 5%)
    const s = summarizeInstitutional(
      [{ rMultiple: 1, pnl: 100, date: "2026-01-01" }, { rMultiple: -1, pnl: -500, date: "2026-01-02" }],
      { equityCurve: [{ date: "2026-01-01", equity: 10000 }, { date: "2026-01-02", equity: 9500 }] },
    )
    expect(s.drawdown.maxDrawdownPct).toBeCloseTo(5, 6)
    expect(s.rDistribution.count).toBe(2)
  })

  it("is empty-safe with no trades", () => {
    const s = summarizeInstitutional([])
    expect(s.sampleSize).toBe(0)
    expect(s.rDistribution.count).toBe(0)
    expect(s.drawdown.maxDrawdownPct).toBe(0)
  })
})
