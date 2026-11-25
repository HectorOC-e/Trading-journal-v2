import { expect, it } from "vitest"
import { buildBacktestReport, type BacktestTrade } from "@/domains/learning/backtest-session"
import { renderBacktestHtml } from "@/server/services/learning/backtest-pdf"

it("escapes trader notes and shows missing values, objectives and the approved conclusion", () => {
  const report = buildBacktestReport({
    plan: { title: "Ruptura <script>alert(1)</script>", hypothesis: "Cierre confirmado", symbols: "EURUSD", timeframe: "M15", from: "2024-01-01", to: "2024-01-31", rules: "", invalidation: "", exitRules: "", assumptions: "", setup: null,
      objectives: [{ title: "Muestra mínima", criterion: "Uno", metric: "closed", threshold: 1, minSample: 1 }] },
    workDays: ["2026-11-24"], trades: [], practices: [], signals: [{ date: "2024-01-02", symbol: "EURUSD", context: "Rango", reason: "Sin confirmación" }],
    observations: "", conclusion: "Hallazgo 1", nextStep: "Repetir", evaluations: {}, coach: null, captures: [],
  })
  const html = renderBacktestHtml(report, { number: 2, closedAt: new Date("2026-11-25T02:00:00Z") })
  expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
  expect(html).not.toContain("<script>")
  expect(html).toContain("Versión 2")
  expect(html).toContain("Muestra mínima")
  expect(html).toContain("Hallazgo 1")
  expect(html).toContain("Sin confirmación")
  expect(html).toContain("Sin operaciones ejecutadas")
})

it("distinguishes a session stop adjustment from the stop currently stored in Trades", () => {
  const trade: BacktestTrade = {
    id: "1", date: "2024-01-02", r: 1, pnl: "10", currency: "USD", account: "QA", symbol: "EURUSD", direction: "LONG", status: "CLOSED",
    marketOpenedAt: null, marketClosedAt: null, marketTimeZone: "America/Tegucigalpa", openTime: "09:00", closeTime: "10:00",
    entry: "1.10", stop: "1.11", target: "1.12", closePrice: "1.12", size: "1", risk: "10", commission: null,
    notes: "", planNotes: null, events: [], checklist: null, annotations: { adjustments: [{ date: "2024-01-02", time: "09:30", price: "1.11", reason: "Proteger después del parcial" }] },
  }
  const report = buildBacktestReport({
    plan: { title: "Ruptura", hypothesis: "Cierre confirmado", symbols: "EURUSD", timeframe: "M15", from: "2024-01-01", to: "2024-01-31", rules: "", invalidation: "", exitRules: "", assumptions: "", setup: null, objectives: [] },
    workDays: [], trades: [trade], practices: [], signals: [], observations: "", conclusion: "", nextStep: "", evaluations: {}, coach: null, captures: [],
  })
  const html = renderBacktestHtml(report, { number: 1, closedAt: new Date("2026-11-25T02:00:00Z") })
  expect(html).toContain("Stop registrado")
  expect(html).toContain("Proteger después del parcial")
  expect(html).toContain("2024-01-02 09:30")
  expect(html).not.toContain("Stop inicial")
})
