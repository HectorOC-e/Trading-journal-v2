import { describe, it, expect } from "vitest"
import { buildMonthlyReport, type ReportTrade } from "@/domains/analytics/services/monthly-report"

const month: ReportTrade[] = [
  { accountId: "a1", pnl: 400, rMultiple: 2,    date: "2026-06-01", setupId: "s1", tags: [], session: "London" },
  { accountId: "a1", pnl: -100, rMultiple: -0.5, date: "2026-06-02", setupId: "s1", tags: ["Impulsivo"], session: "London" },
  { accountId: "a2", pnl: 200, rMultiple: 1,    date: "2026-06-08", setupId: null, tags: [], session: "NY" },
]
const prev: ReportTrade[] = [
  { accountId: "a1", pnl: 100, rMultiple: 1, date: "2026-05-10", setupId: "s1", tags: [], session: "London" },
]

function build() {
  return buildMonthlyReport({
    year: 2026, month: 6, baseCurrency: "USD",
    monthTrades: month, prevTrades: prev,
    accountNames: { a1: "FTMO", a2: "Cuenta EUR" },
    setupNames: { s1: "Breakout" },
    violationTags: ["Impulsivo", "Off-plan", "Revanche"],
    monthScore: 78, prevScore: 70,
    saved: { summary: "Buen mes", keyThemes: ["riesgo"], goalsSet: ["g1"], goalsMet: ["g1"], overallScore: 78 },
  })
}

describe("buildMonthlyReport", () => {
  it("computes month KPIs", () => {
    const r = build()
    expect(r.kpis).toEqual({ netPnl: 500, winRate: 66.67, profitFactor: 6, trades: 3, disciplineScore: 78 })
  })
  it("computes deltas vs previous month", () => {
    const r = build()
    expect(r.deltas.netPnl).toBe(400)        // 500 - 100
    expect(r.deltas.trades).toBe(2)          // 3 - 1
    expect(r.deltas.disciplineScore).toBe(8) // 78 - 70
  })
  it("finds best and worst day", () => {
    const r = build()
    expect(r.bestDay).toEqual({ date: "2026-06-01", pnl: 400 })
    expect(r.worstDay).toEqual({ date: "2026-06-02", pnl: -100 })
  })
  it("aggregates discipline (violations, cost, clean streak)", () => {
    const r = build()
    expect(r.discipline.violations).toBe(1)
    expect(r.discipline.costo).toBe(-100)
    expect(r.discipline.rachaDiasLimpios).toBe(1) // 06-08 clean, 06-02 breaks
  })
  it("lists setups and per-account P&L", () => {
    const r = build()
    expect(r.setups).toEqual([{ name: "Breakout", pnl: 300, trades: 2 }])
    expect(r.byAccount).toEqual([{ name: "FTMO", pnl: 300 }, { name: "Cuenta EUR", pnl: 200 }])
  })
  it("passes through the saved review", () => {
    expect(build().saved?.summary).toBe("Buen mes")
  })
  it("aggregates P&L by session", () => {
    expect(build().sessions).toEqual([
      { session: "London", pnl: 300, trades: 2 },
      { session: "NY", pnl: 200, trades: 1 },
    ])
  })
})
