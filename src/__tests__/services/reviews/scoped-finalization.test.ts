import { beforeEach, describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { buildWeeklyReport } from "@/domains/analytics/services/weekly-report"
import { buildMonthlyReport } from "@/domains/analytics/services/monthly-report"

const mocks = vi.hoisted(() => ({ weekly: vi.fn(), monthly: vi.fn(), insights: vi.fn(), analytics: vi.fn(), stream: vi.fn(), resolve: vi.fn() }))
vi.mock("@/server/services/reviews/report-data", () => ({ loadWeeklyReport: mocks.weekly, loadMonthlyReport: mocks.monthly }))
vi.mock("@/server/services/reviews/review-insights", () => ({ loadReviewInsights: mocks.insights, loadReviewAnalytics: mocks.analytics }))
vi.mock("@/lib/ai/chat", () => ({ streamChat: mocks.stream }))
vi.mock("@/lib/ai/resolve-provider", () => ({ resolveAiCall: mocks.resolve, usableCandidates: (c: unknown) => c }))
vi.mock("@/domains/analytics/services/discipline-service", () => ({ computeDisciplineScore: vi.fn(async () => ({ score: 80 })) }))

import { finalizeWeeklyReview } from "@/server/services/reviews/finalize"
import { finalizeMonthlyReview } from "@/server/services/reviews/finalize-monthly"
import { ensureReviewAnalysis } from "@/server/services/reviews/ensure-analysis"

type Mode = "REAL" | "DEMO" | "BACKTEST"
function report(mode: Mode, monthly = false, empty = false) {
  const trades = empty ? [] : [{ accountId: mode, pnl: { REAL: 100, DEMO: 500, BACKTEST: -200 }[mode], rMultiple: 1, date: "2026-06-15", setupId: null, tags: [], session: "NY" }]
  const common = { baseCurrency: "USD", prevTrades: [], accountNames: {}, setupNames: {}, violationTags: [], saved: null }
  return monthly
    ? buildMonthlyReport({ ...common, year: 2026, month: 6, monthTrades: trades, monthScore: null, prevScore: null })
    : buildWeeklyReport({ ...common, weekStart: "2026-06-15", weekLabel: "Semana del 15 jun", weekTrades: trades, weekScore: null, prevScore: null })
}

function database() {
  const rows: Record<string, any> = {}
  let weekly: any = null
  let monthly: any = null
  const writes: Array<{ kind: string; data: Record<string, unknown> }> = []
  const goals = [
    { id: "real", operationalMode: "REAL", text: "Reducir revenge trading", status: "pending" },
    { id: "demo", operationalMode: "DEMO", text: "Reducir revenge trading", status: "pending" },
    { id: "legacy", operationalMode: null, text: "Reducir revenge trading", status: "pending" },
  ]
  const db = {
    weeklyReview: {
      findFirst: vi.fn(async () => weekly),
      create: vi.fn(async ({ data }) => { writes.push({ kind: "weekly", data }); weekly = { id: "w", ...data }; return weekly }),
      update: vi.fn(async ({ data }) => { writes.push({ kind: "weekly", data }); Object.assign(weekly, data); return weekly }),
    },
    monthlyReview: {
      findFirst: vi.fn(async () => monthly),
      upsert: vi.fn(async ({ create, update }) => { const data = monthly ? update : create; writes.push({ kind: "monthly", data }); monthly = { id: "m", ...monthly, ...data }; return monthly }),
    },
    monthlyGoal: {
      findMany: vi.fn(async ({ where }) => goals.filter(g => where.operationalMode === undefined || g.operationalMode === where.operationalMode)),
      update: vi.fn(async ({ where, data }) => Object.assign(goals.find(g => g.id === where.id)!, data)),
    },
    reviewModeSnapshot: {
      updateMany: vi.fn(async ({ where, data }) => { const row = rows[where.id]; if (!row || row.revision !== where.revision || row.evidenceHash !== where.evidenceHash) return { count: 0 }; Object.assign(row, data); return { count: 1 } }),
    },
  }
  const bundle = (mode: Mode = "REAL", isMonthly = false, empty = false) => {
    const id = `${isMonthly ? "monthly" : "weekly"}-${mode}`
    const snapshot = rows[id] ??= { id, userId: "u", mode, revision: 0, evidenceHash: `${id}-hash`, analysis: null }
    return { report: report(mode, isMonthly, empty), saved: isMonthly ? monthly : weekly, snapshot, evidenceHash: snapshot.evidenceHash, scope: { mode } }
  }
  Object.assign(db, { $transaction: async (fn: (tx: typeof db) => unknown) => fn(db), $queryRaw: async () => [] })
  return { db: db as unknown as PrismaClient, bundle, writes, rows, goals, setWeekly: (value: any) => { weekly = value } }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.insights.mockResolvedValue([])
  mocks.analytics.mockResolvedValue({ expectancy: 1, byEmotion: [] })
  mocks.resolve.mockResolvedValue([{ provider: "openrouter", apiKey: "test", model: "test", source: "user" }])
  mocks.stream.mockImplementation(async ({ messages }) => new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(`Analysis ${messages[0].content.split("\n")[0]}`)); c.close() } }))
})

describe("review cron delivery scopes", () => {
  it("finalizes one shared weekly envelope when only Demo traded, without shared automatic fields", async () => {
    const d = database()
    mocks.weekly.mockImplementation(async (_db, _user, _week, mode: Mode = "REAL") => d.bundle(mode, false, mode !== "DEMO"))
    expect(await finalizeWeeklyReview(d.db, "u", "2026-06-15")).toBe("finalized")
    expect(mocks.weekly.mock.calls.map(c => c[3])).toEqual(["REAL", "DEMO", "BACKTEST"])
    expect(d.writes).toHaveLength(2)
    expect(d.writes[0].data).toMatchObject({ status: "draft", userId: "u" })
    expect(d.writes[1].data).toEqual({ status: "submitted" })
    for (const write of d.writes) {
      for (const field of ["tradeCount", "netPnl", "winRate", "disciplineScore", "whatWorked", "toImprove"]) expect(write.data).not.toHaveProperty(field)
    }
  })

  it("preserves manual notes and old mixed AI while only updating weekly status", async () => {
    const d = database()
    d.setWeekly({ id: "w", status: "draft", executiveSummary: "Keep my notes", whatWorked: "Manual", toImprove: "Manual", aiAnalysis: "Old mixed analysis" })
    mocks.weekly.mockImplementation(async (_db, _user, _week, mode: Mode = "REAL") => d.bundle(mode))
    await finalizeWeeklyReview(d.db, "u", "2026-06-15")
    expect(d.writes).toEqual([{ kind: "weekly", data: { status: "submitted" } }])
  })

  it("skips a week empty in every world", async () => {
    const d = database()
    mocks.weekly.mockImplementation(async (_db, _user, _week, mode: Mode = "REAL") => d.bundle(mode, false, true))
    expect(await finalizeWeeklyReview(d.db, "u", "2026-06-15")).toBe("skipped")
    expect(d.writes).toEqual([])
  })

  it("evaluates monthly goals against their own mode and leaves unscoped legacy goals alone", async () => {
    const d = database()
    mocks.monthly.mockImplementation(async (_db, _user, _year, _month, mode: Mode = "REAL") => {
      const bundle = d.bundle(mode, true)
      bundle.report.discipline.violations = mode === "DEMO" ? 5 : 0
      return bundle
    })
    expect(await finalizeMonthlyReview(d.db, "u", 2026, 6)).toBe("finalized")
    expect(d.goals.map(g => [g.id, g.status])).toEqual([["real", "done"], ["demo", "pending"], ["legacy", "pending"]])
    expect(d.writes).toEqual([{ kind: "monthly", data: { userId: "u", year: 2026, month: 6, status: "submitted" } }])
  })

  it("stores cron analysis independently in all three mode snapshots", async () => {
    const d = database()
    mocks.weekly.mockImplementation(async (_db, _user, _week, mode: Mode = "REAL") => d.bundle(mode))
    await ensureReviewAnalysis(d.db, "u", { kind: "weekly", weekStart: "2026-06-15" })
    expect(Object.values(d.rows).map(row => row.analysisEvidenceHash)).toEqual(["weekly-REAL-hash", "weekly-DEMO-hash", "weekly-BACKTEST-hash"])
    expect(mocks.insights.mock.calls.map(c => c[2].mode)).toEqual(["REAL", "DEMO", "BACKTEST"])
    expect(d.writes.every(w => !Object.hasOwn(w.data, "aiAnalysis"))).toBe(true)
  })

  it("creates the notes envelope before loading explicit Backtesting evidence and labels its AI prompt", async () => {
    const d = database()
    mocks.weekly.mockImplementation(async (_db, _user, _week, mode: Mode = "REAL") => {
      expect(d.writes[0]?.data.status).toBe("draft")
      return d.bundle(mode)
    })
    await ensureReviewAnalysis(d.db, "u", { kind: "weekly", weekStart: "2026-06-15", mode: "BACKTEST" })
    const prompt = mocks.stream.mock.calls[0][0].messages[0].content
    expect(prompt).toContain("BACKTEST")
    expect(prompt).toContain("Backtesting")
    expect(prompt).toContain("-200.00")
    expect(prompt).not.toContain("datos reales")
    expect(Object.keys(d.rows)).toEqual(["weekly-BACKTEST"])
  })
})
