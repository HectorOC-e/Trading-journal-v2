import { beforeEach, describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { buildWeeklyReport } from "@/domains/analytics/services/weekly-report"
import { buildMonthlyReport } from "@/domains/analytics/services/monthly-report"

const mocks = vi.hoisted(() => ({ weekly: vi.fn(), monthly: vi.fn(), analytics: vi.fn(), html: "", closed: false }))
vi.mock("@/server/services/reviews/report-data", () => ({ loadWeeklyReport: mocks.weekly, loadMonthlyReport: mocks.monthly }))
vi.mock("@/server/services/reviews/review-insights", () => ({ loadReviewAnalytics: mocks.analytics }))
vi.mock("@sparticuz/chromium", () => ({ default: { executablePath: async () => "/test/chromium", args: [] } }))
vi.mock("puppeteer-core", () => ({ default: { launch: async () => ({ newPage: async () => ({
  setContent: async (html: string) => { mocks.html = html }, pdf: async () => Buffer.from("PDF"),
}), close: async () => { mocks.closed = true } }) } }))

import { renderReviewPdf } from "@/server/services/reviews/render-pdf"

type Mode = "REAL" | "DEMO" | "BACKTEST"
beforeEach(() => {
  vi.clearAllMocks()
  mocks.html = ""
  mocks.closed = false
  const makeBundle = (mode: Mode, monthly: boolean) => {
    const trades = [{ accountId: mode, pnl: { REAL: 100, DEMO: 500, BACKTEST: -200 }[mode], rMultiple: 1, date: "2026-06-15", setupId: null, tags: [], session: "NY" }]
    const common = { baseCurrency: "USD", prevTrades: [], accountNames: {}, setupNames: {}, violationTags: [], saved: null }
    return { report: monthly
      ? buildMonthlyReport({ ...common, year: 2026, month: 6, monthTrades: trades, monthScore: null, prevScore: null })
      : buildWeeklyReport({ ...common, weekStart: "2026-06-15", weekLabel: "Semana del 15 jun", weekTrades: trades, weekScore: null, prevScore: null }), saved: { aiAnalysis: `analysis-${mode}` } }
  }
  mocks.weekly.mockImplementation(async (_db, _user, _week, mode: Mode = "REAL") => makeBundle(mode, false))
  mocks.monthly.mockImplementation(async (_db, _user, _year, _month, mode: Mode = "REAL") => makeBundle(mode, true))
  mocks.analytics.mockResolvedValue({ expectancy: 1, avgR: 1, avgWin: 100, avgLoss: 0, equityCurve: [], markets: [], byEmotion: [] })
})

describe("review PDF operational evidence", () => {
  it("labels Real and keeps its 100 separate from Demo 500", async () => {
    await renderReviewPdf({} as PrismaClient, { userId: "u", period: { kind: "weekly", weekStart: "2026-06-15", mode: "REAL" } })
    expect(mocks.html).toContain("Real")
    expect(mocks.html).toContain("100.00")
    expect(mocks.html).not.toContain("600.00")
    expect(mocks.html).not.toContain("analysis-DEMO")
    expect(mocks.html).toContain("Fecha de operación")
    expect(mocks.analytics.mock.calls[0][2].mode).toBe("REAL")
    expect(mocks.closed).toBe(true)
  })

  it("monthly Backtesting PDF scopes both analytics and financial report", async () => {
    await renderReviewPdf({} as PrismaClient, { userId: "u", period: { kind: "monthly", year: 2026, month: 6, mode: "BACKTEST" } })
    expect(mocks.html).toContain("Backtesting")
    expect(mocks.html).toContain("200.00")
    expect(mocks.html).toContain("analysis-BACKTEST")
    expect(mocks.html).not.toContain("analysis-REAL")
    expect(mocks.monthly.mock.calls[0][4]).toBe("BACKTEST")
    expect(mocks.analytics.mock.calls[0][2].mode).toBe("BACKTEST")
  })
})
