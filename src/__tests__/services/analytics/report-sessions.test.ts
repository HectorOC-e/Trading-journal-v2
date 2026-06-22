import { describe, it, expect } from "vitest"
import { sessionsOf, buildMonthlyReport, type ReportTrade } from "@/domains/analytics/services/monthly-report"
import { buildWeeklyReport } from "@/domains/analytics/services/weekly-report"

function t(over: Partial<ReportTrade>): ReportTrade {
  return {
    accountId: "a1", pnl: 0, rMultiple: null, date: "2026-06-15",
    setupId: null, tags: [], session: "London", ...over,
  }
}

describe("sessionsOf", () => {
  it("groups P&L and count by session, sorted by trade count desc", () => {
    const rows = [
      t({ session: "London", pnl: 100 }),
      t({ session: "London", pnl: -30 }),
      t({ session: "NY", pnl: 50 }),
      t({ session: "", pnl: 10 }), // empty → "Sin sesión"
    ]
    const out = sessionsOf(rows)
    expect(out[0]).toEqual({ session: "London", pnl: 70, trades: 2 })
    expect(out.find(s => s.session === "NY")).toEqual({ session: "NY", pnl: 50, trades: 1 })
    expect(out.find(s => s.session === "Sin sesión")).toEqual({ session: "Sin sesión", pnl: 10, trades: 1 })
  })

  it("returns empty array for no trades", () => {
    expect(sessionsOf([])).toEqual([])
  })
})

describe("report builders expose sessions", () => {
  const base = {
    accountNames: { a1: "Cuenta 1" }, setupNames: {}, violationTags: [] as string[],
  }

  it("buildWeeklyReport includes sessions", () => {
    const r = buildWeeklyReport({
      weekStart: "2026-06-15", weekLabel: "Semana", baseCurrency: "USD",
      weekTrades: [t({ session: "Asia", pnl: 40 })], prevTrades: [],
      weekScore: null, prevScore: null, saved: null, ...base,
    })
    expect(r.sessions).toEqual([{ session: "Asia", pnl: 40, trades: 1 }])
  })

  it("buildMonthlyReport includes sessions", () => {
    const r = buildMonthlyReport({
      year: 2026, month: 6, baseCurrency: "USD",
      monthTrades: [t({ session: "NY", pnl: 80 })], prevTrades: [],
      monthScore: null, prevScore: null, saved: null, ...base,
    })
    expect(r.sessions).toEqual([{ session: "NY", pnl: 80, trades: 1 }])
  })
})
