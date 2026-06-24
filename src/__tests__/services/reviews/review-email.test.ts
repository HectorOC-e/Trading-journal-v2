import { describe, it, expect } from "vitest"
import React from "react"
import { render } from "@react-email/render"
import { ReviewSummary } from "@/emails/templates/review-summary"
import { buildReviewEmailModel } from "@/domains/analytics/services/review-email-model"
import { buildWeeklyReport } from "@/domains/analytics/services/weekly-report"
import { darkTheme } from "@/emails/theme"

const report = buildWeeklyReport({
  weekStart: "2026-06-15", weekLabel: "Semana del 15 jun", baseCurrency: "USD",
  weekTrades: [
    { accountId: "a1", pnl: 980, rMultiple: 2, date: "2026-06-15", setupId: "s1", tags: [], session: "NY" },
    { accountId: "a1", pnl: -240, rMultiple: -1, date: "2026-06-16", setupId: "s2", tags: ["Impulsivo"], session: "London" },
  ],
  prevTrades: [],
  accountNames: { a1: "Cuenta 1" }, setupNames: { s1: "Breakout", s2: "Reversal" },
  violationTags: ["Impulsivo"], weekScore: 80, prevScore: null, saved: null,
})

const model = buildReviewEmailModel({
  kind: "weekly", title: "Semana del 15 jun", reportPath: "/reviews/semanal/2026-06-15",
  report, aiAnalysis: "### Hallazgos clave\n- Breakout fue tu mejor setup.",
})

describe("buildReviewEmailModel", () => {
  it("derives top/worst setup and the empty flag", () => {
    expect(model.isEmpty).toBe(false)
    expect(model.topSetup).toEqual({ name: "Breakout", pnl: 980 })
    expect(model.worstSetup).toEqual({ name: "Reversal", pnl: -240 })
  })
  it("flags empty when there are no trades", () => {
    const empty = buildReviewEmailModel({
      kind: "weekly", title: "x", reportPath: "/x",
      report: buildWeeklyReport({
        weekStart: "2026-06-15", weekLabel: "x", baseCurrency: "USD",
        weekTrades: [], prevTrades: [], accountNames: {}, setupNames: {},
        violationTags: [], weekScore: null, prevScore: null, saved: null,
      }),
      aiAnalysis: null,
    })
    expect(empty.isEmpty).toBe(true)
  })
})

describe("ReviewSummary render", () => {
  it("renders title, CTA link and AI analysis", async () => {
    const html = await render(React.createElement(ReviewSummary, { model, appUrl: "https://x.test" }))
    expect(html).toContain("Semana del 15 jun")
    expect(html).toContain("https://x.test/reviews/semanal/2026-06-15")
    expect(html).toContain("Hallazgos clave")
    expect(html).toContain("Breakout")
  })
  it("renders dark variant", async () => {
    const html = await render(React.createElement(ReviewSummary, { model, theme: darkTheme }))
    expect(html).toContain(darkTheme.accent) // CTA button color in dark mode
    expect(html).toContain(darkTheme.pageBg)
  })

  it("renders inline **bold** and strips LaTeX in the AI analysis", async () => {
    const m = buildReviewEmailModel({
      kind: "weekly", title: "x", reportPath: "/x", report,
      aiAnalysis: "El **profit factor** = $\\frac{ganancias}{pérdidas}$ fue **0.21**.",
    })
    const html = await render(React.createElement(ReviewSummary, { model: m, appUrl: "https://x.test" }))
    expect(html).toContain("<strong")            // bold rendered as <strong>
    expect(html).toContain("profit factor")
    expect(html).not.toContain("**")              // no raw markdown asterisks
    expect(html).not.toContain("\\frac")          // LaTeX command stripped
    expect(html).toContain("ganancias/")          // \frac{a}{b} -> a/b
  })
})
