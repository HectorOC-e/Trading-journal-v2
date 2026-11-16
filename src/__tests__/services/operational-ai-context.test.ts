import { describe, expect, it } from "vitest"
import { buildTraderContext } from "@/domains/analytics/ai-context"
import { executeCoachTool } from "@/lib/ai/coach-tools"
import type { PrismaClient } from "@/lib/generated/prisma/client"

const account = (id: string, type: string) => ({ id, name: id, userId: "u", type, currency: "USD", phase: null, status: "ACTIVE", locked: false, lockReason: null, initialBalance: 1000, ddDailyPct: null, ddTotalPct: null, targetPct: null })
const accounts = [account("real", "PERSONAL"), account("demo", "DEMO_PERSONAL"), account("back", "BACKTEST"), account("qa", "QA"), account("unknown", "FUTURE")]
const trade = (id: string, accountId: string, operationalMode: string | null, pnl: number, date = "2026-11-16") => ({ id, userId: "u", accountId, account: accounts.find(a => a.id === accountId), operationalMode, status: "CLOSED", date: new Date(date), createdAt: new Date(date), symbol: id, direction: "LONG", session: null, openTime: null, closeTime: null, pnl, rMultiple: pnl / 100, tags: pnl < 0 ? ["Off-plan"] : [], setupId: "setup", entry: 10, stop: 9, target: 12, size: 1, notes: id, setup: { name: "Setup" }, events: [] })

// A query-aware repository double: a missing server filter changes actual output,
// and applies take only after where, as the database does.
function matches(row: Record<string, any>, where: Record<string, any> = {}): boolean {
  return Object.entries(where).every(([key, val]) => {
    if (key === "AND") return (Array.isArray(val) ? val : [val]).every(v => matches(row, v))
    if (key === "OR") return val.some((v: any) => matches(row, v))
    if (val === undefined) return true
    const value = row[key]
    if (val && typeof val === "object" && !(val instanceof Date)) {
      if ("in" in val) return val.in.includes(value)
      if ("contains" in val) return String(value).toLowerCase().includes(val.contains.toLowerCase())
      if ("not" in val) return value !== val.not
      if ("hasSome" in val) return val.hasSome.some((x: string) => value.includes(x))
      if ("gte" in val || "lte" in val) return (!val.gte || value >= val.gte) && (!val.lte || value <= val.lte)
      return matches(value ?? {}, val)
    }
    return value === val
  })
}
function db(rows: ReturnType<typeof trade>[]) {
  const selectRows = (data: any[]) => ({ where = {}, take }: any = {}) => Promise.resolve(data.filter(row => matches(row, where)).slice(0, take))
  const empty = { findMany: async () => [] }
  return {
    trade: { findMany: selectRows(rows), findFirst: async ({ where }: any) => rows.find(t => matches(t, where)) ?? null },
    account: { findMany: selectRows(accounts), findFirst: async ({ where }: any) => accounts.find(a => matches(a, where)) ?? null },
    learningResource: empty, weeklyReview: empty, setup: { findMany: async () => [], findFirst: async () => ({ id: "setup", name: "Setup", expectedWr: null, expectedAvgR: null }) },
    user: { findUnique: async () => ({ baseCurrency: "USD", fxRates: {}, weeklyPnlGoal: null }) },
    withdrawal: empty, rule: empty, tradingSessionLog: empty, market: empty, studySession: empty,
  } as unknown as PrismaClient
}

describe("AI evidence operational isolation", () => {
  it("filters before the 500-row context limit so backtests cannot hide Real", async () => {
    const prisma = db([...Array.from({ length: 500 }, (_, i) => trade(`back-${i}`, "back", "BACKTEST", -200, "2024-01-01")), trade("real-trade", "real", "REAL", 100)])
    const result = await buildTraderContext("u", prisma, undefined, "REAL")
    expect(result.performance.netPnl).toBe(100)
    expect(result.performance.totalTrades).toBe(1)
    expect(result.recentTrades).toEqual([expect.objectContaining({ id: "real-trade", operationalMode: "REAL", accountId: "real", accountName: "real", accountType: "PERSONAL", currency: "USD" })])
    expect(result.accounts.map(a => a.name)).toEqual(["real"])
    expect(result.behavior.violationCount).toBe(0)
  })

  it("Demo has its own performance, discipline and recent evidence, excluding unknown and internal", async () => {
    const prisma = db([trade("real-trade", "real", "REAL", 100), trade("demo-trade", "demo", "DEMO", -50), trade("qa-trade", "qa", "INTERNAL", -900), trade("unknown-trade", "unknown", null, -700)])
    const result = await buildTraderContext("u", prisma, undefined, "DEMO")
    expect(result.performance.netPnl).toBe(-50)
    expect(result.behavior.violationCount).toBe(1)
    expect(result.recentTrades.map(t => t.id)).toEqual(["demo-trade"])
    expect(result.scope.mode).toBe("DEMO")
  })

  it("setup details and trade searches keep only the requested mode", async () => {
    const prisma = db([trade("real-trade", "real", "REAL", 100), trade("demo-trade", "demo", "DEMO", -50)])
    const ctx = { userId: "u", prisma, mode: "DEMO" as const }
    const setup = JSON.parse((await executeCoachTool("get_setup_detail", { name: "Setup" }, ctx)).text)
    expect(setup.trades).toBe(1)
    expect(setup.winRate).toBe(0)
    expect(setup.operationalMode).toBe("DEMO")
    const found = JSON.parse((await executeCoachTool("search_trades", {}, ctx)).text)
    expect(found.trades).toEqual([expect.objectContaining({ id: "demo-trade", operationalMode: "DEMO", accountId: "demo", accountType: "DEMO_PERSONAL", currency: "USD" })])
    const inaccessible = JSON.parse((await executeCoachTool("get_trade_detail", { id: "real-trade" }, ctx)).text)
    expect(inaccessible.error).toBeTruthy()
  })
})

 it("context converts native amounts once and explicitly excludes missing FX", async () => {
  const eurAccount = { ...accounts[0], currency: "EUR" }
  const rows = [{ ...trade("eur", "real", "REAL", 100), account: eurAccount }]
  const prisma = db(rows)
  Object.assign(prisma.account, { findMany: async () => [eurAccount] })
  const result = await buildTraderContext("u", prisma, undefined, "REAL")
  expect(result.performance.netPnl).toBe(108)
  expect(result.recentTrades[0]).toMatchObject({ pnl: 100, currency: "EUR" })
  const missing = { ...eurAccount, currency: "ZZZ" }
  rows[0].account = missing
  Object.assign(prisma.account, { findMany: async () => [missing] })
  const incomplete = await buildTraderContext("u", prisma, undefined, "REAL")
  expect(incomplete.performance.netPnl).toBe(0)
  expect(incomplete.scope.excludedCurrencies).toEqual(["ZZZ"])
})

it("recent notifications exclude operational evidence from other modes and legacy", async () => {
  const prisma = db([])
  const rows = [
    { title: "Real alert", params: { mode: "REAL" }, createdAt: new Date() },
    { title: "Demo alert", params: { mode: "DEMO" }, createdAt: new Date() },
    { title: "Mixed legacy alert", params: {}, createdAt: new Date() },
  ]
  Object.assign(prisma, { notification: { findMany: async ({ where }: any) => rows.filter(row => !where.params || row.params.mode === where.params.equals) } })
  const result = JSON.parse((await executeCoachTool("get_recent_notifications", {}, { userId: "u", prisma, mode: "DEMO" })).text)
  expect(result.notifications.map((n: any) => n.title)).toEqual(["Demo alert"])
})

it("period statistics declare missing FX instead of adding native currency as dollars", async () => {
  const foreign = { ...accounts[0], currency: "ZZZ" }
  const prisma = db([{ ...trade("foreign", "real", "REAL", 100), account: foreign }])
  Object.assign(prisma.account, { findMany: async () => [foreign] })
  const result = JSON.parse((await executeCoachTool("get_period_stats", { period: "ALL" }, { userId: "u", prisma, mode: "REAL" })).text)
  expect(result.netPnl).toBe(0)
  expect(result.excludedCurrencies).toEqual(["ZZZ"])
})

it("context preserves explicit manual global rules and excludes rules derived in another mode", async () => {
  const prisma = db([])
  const rows = [
    { userId: "u", enabled: true, name: "Manual global", globalManual: true, operationalMode: null, sourceInsightId: null, sourceCommitmentId: null },
    { userId: "u", enabled: true, name: "Real derived", operationalMode: "REAL", sourceInsightId: "r", sourceCommitmentId: null },
    { userId: "u", enabled: true, name: "Demo derived", operationalMode: "DEMO", sourceInsightId: "d", sourceCommitmentId: null },
    { userId: "u", enabled: true, name: "Unknown origin without source", globalManual: false, operationalMode: null, sourceInsightId: null, sourceCommitmentId: null },
    { userId: "u", enabled: true, name: "Legacy derived", operationalMode: null, sourceInsightId: "old", sourceCommitmentId: null },
  ]
  Object.assign(prisma, { rule: { findMany: async ({ where }: any) => rows.filter(row => matches(row, where)) } })
  const result = await buildTraderContext("u", prisma, undefined, "DEMO")
  expect(result.rules.map(r => r.name)).toEqual(["Manual global", "Demo derived"])
})

it("psychology sessions use only records with the requested persisted modality", async () => {
  const prisma = db([])
  const rows = [
    { userId: "u", operationalMode: "REAL", preMood: 1, energyLevel: 1 },
    { userId: "u", operationalMode: "DEMO", preMood: 4, energyLevel: 5 },
    { userId: "u", operationalMode: null, preMood: 2, energyLevel: 2 },
  ]
  Object.assign(prisma, { tradingSessionLog: { findMany: async ({ where }: any) => rows.filter(row => matches(row, where)) } })
  const result = await buildTraderContext("u", prisma, undefined, "DEMO")
  expect(result.psychology).toEqual({ sessions: 1, avgPreMood: 4, avgEnergy: 5 })
})
