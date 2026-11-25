import { expect, it } from "vitest"
import { buildBacktestReport } from "@/domains/learning/backtest-session"
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
