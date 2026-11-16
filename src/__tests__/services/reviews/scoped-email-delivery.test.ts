import { beforeEach, describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { SendEmailArgs } from "@/server/services/email/resend-client"
import { buildWeeklyReport } from "@/domains/analytics/services/weekly-report"
import { buildMonthlyReport } from "@/domains/analytics/services/monthly-report"

const loaders = vi.hoisted(() => ({ weekly: vi.fn(), monthly: vi.fn() }))
vi.mock("@/server/services/reviews/report-data", () => ({ loadWeeklyReport: loaders.weekly, loadMonthlyReport: loaders.monthly }))
import { sendReviewEmail, type ReviewPeriod } from "@/server/services/email/send-review"

type Mode = "REAL" | "DEMO" | "BACKTEST"
const user = { id: "u", email: "test@example.test", name: null, emailNotifications: true, timezone: "UTC" }
const weekly = { kind: "weekly", weekStart: "2026-06-15" } as const

function bundle(mode: Mode, monthly = false, empty = false) {
  const trades = empty ? [] : [{ accountId: mode, pnl: { REAL: 100, DEMO: 500, BACKTEST: -200 }[mode], rMultiple: 1, date: "2026-06-15", setupId: null, tags: [], session: "NY" }]
  const common = { baseCurrency: "USD", prevTrades: [], accountNames: {}, setupNames: {}, violationTags: [], saved: null }
  return {
    report: monthly
      ? buildMonthlyReport({ ...common, year: 2026, month: 6, monthTrades: trades, monthScore: null, prevScore: null })
      : buildWeeklyReport({ ...common, weekStart: weekly.weekStart, weekLabel: "Semana del 15 jun", weekTrades: trades, weekScore: null, prevScore: null }),
    saved: { aiAnalysis: `analysis-${mode}` }, scope: { mode },
  }
}

function delivery() {
  const sent: SendEmailArgs[] = []
  const logs: Array<Record<string, unknown>> = []
  const pdfs: ReviewPeriod[] = []
  const prisma = {
    notificationPreference: { findUnique: vi.fn(async () => ({ muted: false, channels: ["email"], quietStart: null, quietEnd: null, timezone: "UTC" })) },
    emailLog: { findFirst: vi.fn(async ({ where }) => logs.find(row => row.weekKey === where.weekKey && row.emailType === where.emailType) ?? null), create: vi.fn(async ({ data }) => { logs.push(data) }) },
    userPreferences: { findUnique: vi.fn(async () => null) },
  } as unknown as PrismaClient
  return {
    sent, logs, pdfs,
    deps: {
      prisma, appUrl: "https://journal.test", now: new Date("2026-06-22T12:00:00Z"),
      sendEmail: async (mail: SendEmailArgs) => { sent.push(mail); return { ok: true as const } },
      renderPdf: async ({ period }: { userId: string; period: ReviewPeriod }) => { pdfs.push(period); return Buffer.from(period.mode ?? "MISSING") },
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  loaders.weekly.mockImplementation(async (_db, _user, _week, mode: Mode = "REAL") => bundle(mode))
  loaders.monthly.mockImplementation(async (_db, _user, _year, _month, mode: Mode = "REAL") => bundle(mode, true))
})

describe("separate review email sections", () => {
  it("sends one weekly cron email containing independent labelled modes and no combined financial total", async () => {
    const d = delivery()
    expect(await sendReviewEmail(d.deps, user, weekly)).toEqual({ status: "sent" })
    expect(d.sent).toHaveLength(1)
    const html = d.sent[0].html
    for (const label of ["Real", "Demo", "Backtesting", "$100.00", "$500.00", "-$200.00", "analysis-REAL", "analysis-DEMO", "analysis-BACKTEST"]) expect(html).toContain(label)
    expect(html).not.toContain("$400.00")
    expect(html).not.toContain("$600.00")
    for (const mode of ["REAL", "DEMO", "BACKTEST"]) expect(html).toContain(`mode=${mode}`)
    expect(d.pdfs.map(p => p.mode)).toEqual(["REAL", "DEMO", "BACKTEST"])
    expect(d.sent[0].attachments?.map(a => a.filename)).toEqual([
      "review-weekly-2026-06-15-REAL.pdf", "review-weekly-2026-06-15-DEMO.pdf", "review-weekly-2026-06-15-BACKTEST.pdf",
    ])
    expect(await sendReviewEmail(d.deps, user, weekly)).toEqual({ status: "already_sent" })
    expect(d.sent).toHaveLength(1)
    expect(d.logs).toEqual([{ userId: "u", emailType: "weekly_review", weekKey: "2026-06-15" }])
  })

  it("sends a Demo-only trading week with explicit empty Real and Backtesting sections", async () => {
    const d = delivery()
    loaders.weekly.mockImplementation(async (_db, _user, _week, mode: Mode = "REAL") => bundle(mode, false, mode !== "DEMO"))
    expect(await sendReviewEmail(d.deps, user, weekly)).toEqual({ status: "sent" })
    expect(d.sent[0].html).toContain("$500.00")
    expect(d.sent[0].html.match(/Sin operaciones/g)).toHaveLength(2)
    expect(d.sent[0].html).not.toContain("analysis-REAL")
  })

  it("manual Backtesting email and its attachment use only the selected mode", async () => {
    const d = delivery()
    expect(await sendReviewEmail(d.deps, user, { ...weekly, mode: "BACKTEST" }, { manual: true })).toEqual({ status: "sent" })
    expect(d.sent[0].html).toContain("Backtesting")
    expect(d.sent[0].html).toContain("-$200.00")
    expect(d.sent[0].html).not.toContain("analysis-REAL")
    expect(d.pdfs).toEqual([{ ...weekly, mode: "BACKTEST" }])
    expect(loaders.weekly.mock.calls.map(c => c[3])).toEqual(["BACKTEST"])
  })

  it("defaults an old manual request to Real and keeps the monthly period dedupe independent of mode", async () => {
    const d = delivery()
    const monthly = { kind: "monthly", year: 2026, month: 6 } as const
    expect(await sendReviewEmail(d.deps, user, monthly, { manual: true })).toEqual({ status: "sent" })
    expect(loaders.monthly.mock.calls.map(c => c[4])).toEqual(["REAL"])
    expect(d.sent[0].html).toContain("Real")
    expect(d.sent[0].html).not.toContain("$500.00")
    expect(await sendReviewEmail(d.deps, user, { ...monthly, mode: "DEMO" })).toEqual({ status: "already_sent" })
  })

  it("skips delivery if every mode is empty", async () => {
    const d = delivery()
    loaders.weekly.mockImplementation(async (_db, _user, _week, mode: Mode = "REAL") => bundle(mode, false, true))
    expect(await sendReviewEmail(d.deps, user, weekly)).toEqual({ status: "empty" })
    expect(d.sent).toEqual([])
    expect(d.logs).toEqual([])
  })

  it("uses one provider idempotency key for the period regardless of its requested mode", async () => {
    const d = delivery()
    await sendReviewEmail(d.deps, user, weekly)
    const firstKey = d.sent[0].idempotencyKey
    d.logs.length = 0 // a competing cron attempt can enter before email_log is written
    await sendReviewEmail(d.deps, user, { ...weekly, mode: "DEMO" })
    expect(firstKey).toBe("weekly_review:u:2026-06-15")
    expect(d.sent[1].idempotencyKey).toBe(firstKey)
  })
})
