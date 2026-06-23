import { describe, it, expect } from "vitest"
import { buildAnalysisPrompt } from "@/server/services/reviews/review-ai"
import { buildWeeklyReport } from "@/domains/analytics/services/weekly-report"
import type { Insight } from "@/domains/analytics/services/insights-engine"

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
  it("requests the three structured sections and callout formatting", () => {
    const p = buildAnalysisPrompt(report.weekLabel, "weekly", report)
    expect(p).toContain("### Qué está pasando")
    expect(p).toContain("### Por qué ocurre")
    expect(p).toContain("### Qué hacer")
    expect(p).toContain("[!INSIGHT]")
    expect(p).toContain("[!WARNING]")
    expect(p).toContain("[!RECOMMENDATION]")
    expect(p).toMatch(/NO uses tablas/) // instructs the model away from tables (email/PDF fidelity)
  })
  it("embeds computed setups and sessions from the report", () => {
    const p = buildAnalysisPrompt(report.weekLabel, "weekly", report)
    expect(p).toContain("Breakout")
    expect(p).toContain("NY")
    expect(p).toContain("London")
    expect(p).toContain("Disciplina: 72")
  })
  it("injects detected deterministic signals when provided", () => {
    const insights: Insight[] = [{
      id: "x1", category: "anomaly", severity: "warning",
      title: "Racha de 8 pérdidas", detail: "tu peor racha reciente", recommendation: "regla de parada", evidence: "sobre 106 trades",
    }]
    const p = buildAnalysisPrompt(report.weekLabel, "weekly", report, insights)
    expect(p).toContain("SEÑALES DETECTADAS")
    expect(p).toContain("Racha de 8 pérdidas")
    expect(p).toContain("regla de parada")
  })
  it("notes the absence of signals when none are detected", () => {
    const p = buildAnalysisPrompt(report.weekLabel, "weekly", report, [])
    expect(p).toContain("no detectó señales fuertes")
  })
})
