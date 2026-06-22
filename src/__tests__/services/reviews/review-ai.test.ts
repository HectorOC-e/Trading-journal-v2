import { describe, it, expect } from "vitest"
import { buildAnalysisPrompt } from "@/server/services/reviews/review-ai"
import { buildWeeklyReport } from "@/domains/analytics/services/weekly-report"

const report = buildWeeklyReport({
  weekStart: "2026-06-15", weekLabel: "Semana del 15 jun", baseCurrency: "USD",
  weekTrades: [
    { accountId: "a1", pnl: 100, rMultiple: 1, date: "2026-06-15", setupId: "s1", tags: [], session: "NY" },
    { accountId: "a1", pnl: -40, rMultiple: -0.5, date: "2026-06-16", setupId: "s1", tags: ["Impulsivo"], session: "London" },
  ],
  prevTrades: [],
  accountNames: { a1: "Cuenta 1" }, setupNames: { s1: "Breakout" },
  violationTags: ["Impulsivo"], weekScore: 72, prevScore: null, saved: null,
})

describe("buildAnalysisPrompt", () => {
  it("includes the three required sections", () => {
    const p = buildAnalysisPrompt(report.weekLabel, "weekly", report)
    expect(p).toContain("### Hallazgos clave")
    expect(p).toContain("### Banderas de riesgo")
    expect(p).toContain("### Foco para el próximo periodo")
  })
  it("embeds computed setups and sessions from the report", () => {
    const p = buildAnalysisPrompt(report.weekLabel, "weekly", report)
    expect(p).toContain("Breakout")
    expect(p).toContain("NY")
    expect(p).toContain("London")
    expect(p).toContain("Disciplina: 72")
  })
})
