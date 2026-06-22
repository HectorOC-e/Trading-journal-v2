import { describe, it, expect } from "vitest"
import { renderReviewReportHtml } from "@/server/services/reviews/pdf-report-html"
import { buildWeeklyReport } from "@/domains/analytics/services/weekly-report"

const report = buildWeeklyReport({
  weekStart: "2026-06-15", weekLabel: "Semana del 15 jun", baseCurrency: "USD",
  weekTrades: [
    { accountId: "a1", pnl: 300, rMultiple: 1.5, date: "2026-06-15", setupId: "s1", tags: [], session: "NY" },
    { accountId: "a1", pnl: -80, rMultiple: -0.4, date: "2026-06-16", setupId: "s2", tags: ["Impulsivo"], session: "London" },
  ],
  prevTrades: [],
  accountNames: { a1: "Cuenta 1" },
  setupNames: { s1: "Breakout", s2: "<b>Reversal</b>" }, // contains HTML to verify escaping
  violationTags: ["Impulsivo"], weekScore: 78, prevScore: null, saved: null,
})

describe("renderReviewReportHtml", () => {
  const html = renderReviewReportHtml({
    kind: "weekly", title: "Semana del 15 jun", subtitle: "Review semanal · 2 trades · moneda base USD",
    report, aiAnalysis: "### Hallazgos clave\n- Breakout fue tu mejor setup.",
  })

  it("produces a full HTML document with the title and an inline SVG chart", () => {
    expect(html).toContain("<!doctype html>")
    expect(html).toContain("Semana del 15 jun")
    expect(html).toContain("<svg")
    expect(html).toContain("@page")
  })

  it("includes setups, sessions and the AI analysis", () => {
    expect(html).toContain("Breakout")
    expect(html).toContain("NY")
    expect(html).toContain("Hallazgos clave")
  })

  it("HTML-escapes user-controlled content", () => {
    expect(html).toContain("&lt;b&gt;Reversal&lt;/b&gt;")
    expect(html).not.toContain("<b>Reversal</b>")
  })
})
