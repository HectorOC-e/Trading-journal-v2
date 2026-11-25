import { describe, expect, it } from "vitest"
import { buildBacktestReport, type BacktestTrade } from "@/domains/learning/backtest-session"

const makeTrade = (id: string, date: string, r: number | null, extra: Partial<BacktestTrade> = {}): BacktestTrade => ({
  id, date, r, symbol: "EURUSD", direction: "LONG", account: "Backtest", currency: "USD", status: "CLOSED",
  marketOpenedAt: null, marketClosedAt: null, marketTimeZone: null, openTime: "09:00", closeTime: null,
  entry: "1.1", stop: "1.09", target: "1.12", closePrice: null, size: "1", risk: null, commission: null,
  pnl: null, notes: "", planNotes: null, events: [], annotations: null, checklist: null, ...extra,
})

const plan = {
  title: "Ruptura", hypothesis: "Confirmar el cierre", symbols: "EURUSD", timeframe: "M15",
  from: "2024-01-01", to: "2024-01-31", rules: "Esperar confirmación", invalidation: "Stop inicial", exitRules: "Dos R",
  assumptions: "", setup: null,
  objectives: [{ title: "Expectativa", criterion: "Igual o mayor que 0.75 R", metric: "expectancy" as const, threshold: 0.75, minSample: 2 }],
}

const input = { plan, workDays: ["2026-11-24"], practices: [], signals: [], observations: "", conclusion: "Hallazgo", nextStep: "Repetir", evaluations: {}, coach: null, captures: [] }

describe("backtesting session report", () => {
  it("counts a trade once and computes expectancy and drawdown using the available R", () => {
    const first = makeTrade("a", "2024-01-01", 2, { pnl: "120.25", checklist: { compliant: true, source: "journal" } })
    const third = makeTrade("c", "2024-01-03", null, { pnl: "0", currency: "EUR" })
    const report = buildBacktestReport({ ...input, trades: [third, first, makeTrade("b", "2024-01-02", -1, { pnl: "-60.12" }), first] })
    expect(report.metrics).toMatchObject({ closed: 3, rCoverage: 2, expectancy: 0.5, drawdown: 1, wins: 1, losses: 1, neutral: 1, checklistCoverage: 1, checklistPct: 100, money: { USD: 60.13, EUR: 0 } })
    expect(report.metrics.curve.map(row => row.r)).toEqual([0, 2, 1])
    expect(report.objectives[0]).toMatchObject({ state: "repeat", observed: 0.5, sample: 2 })
  })

  it("reports open and out-of-range trades without treating missing R as zero", () => {
    const report = buildBacktestReport({ ...input, trades: [makeTrade("open", "2024-02-01", null, { status: "OPEN" }), makeTrade("closed", "2024-01-31", null)] })
    expect(report.metrics).toMatchObject({ closed: 1, rCoverage: 0, expectancy: null, drawdown: null })
    expect(report.objectives[0]?.state).toBe("insufficient")
    expect(report.blockers).toHaveLength(2)
    expect(report.trades.find(row => row.id === "open")).toMatchObject({ outsideRange: true, included: false })
  })

  it("uses opening market time in its timezone and permits a documented open exclusion", () => {
    const report = buildBacktestReport({ ...input, trades: [makeTrade("a", "2024-02-01", 1, { marketOpenedAt: "2024-02-01T02:00:00Z", marketTimeZone: "America/Tegucigalpa" }), makeTrade("open", "2024-01-31", null, { status: "OPEN", annotations: { excluded: "La operación sigue abierta" } })] })
    expect(report.trades.find(row => row.id === "a")).toMatchObject({ outsideRange: false, included: true })
    expect(report.blockers).toEqual([])
  })
})
