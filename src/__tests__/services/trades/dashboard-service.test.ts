/**
 * TD-018: first direct coverage of the dashboardStats orchestration (previously
 * inline in the trades router with zero tests). Documents the practice-partition
 * contract: financial stats exclude DEMO/BACKTEST accounts by default, while
 * discipline (behavioural) always counts them.
 */
import { describe, it, expect, vi } from "vitest"
import { getDashboardStats } from "@/server/services/trades/dashboard-service"

vi.mock("@/domains/analytics/services/analytics-cache", () => ({
  isCacheEnabled: vi.fn().mockReturnValue(false),
  getCachedStats: vi.fn(), setCachedStats: vi.fn(), invalidateCache: vi.fn(),
}))

const USER = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1"
const REAL = "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2"
const DEMO = "d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4"

function acct(id: string, type: string) {
  return {
    id, name: type, type, status: "ACTIVE", currency: "USD",
    initialBalance: 10000, ddDailyPct: null, ddWeeklyPct: null, ddMonthlyPct: null,
    ddTotalPct: null, ddModel: null, maxTradesPerDay: null, allowedSymbols: [],
    maxLeverage: null, targetLeverage: null, consistencyPct: null, targetPct: null,
    minTradingDays: null, noWeekendHolding: false,
  }
}
function tradeRow(accountId: string, pnl: number) {
  return {
    id: `t-${accountId}`, accountId, symbol: "MNQ", direction: "LONG",
    session: "New York", openTime: "09:30", closeTime: "10:00",
    pnl, rMultiple: 1, tags: [], date: new Date("2026-07-10"),
    setupId: null, entry: 100, stop: 99, target: 102, size: 1,
  }
}
function mockPrisma() {
  return {
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ timezone: "UTC" }),
      findUnique: vi.fn().mockResolvedValue({ baseCurrency: "USD", fxRates: null }),
    },
    account: { findMany: vi.fn().mockResolvedValue([acct(REAL, "PERSONAL"), acct(DEMO, "DEMO_PERSONAL")]) },
    trade: {
      findMany: vi.fn()
        .mockResolvedValueOnce([tradeRow(REAL, 100), tradeRow(DEMO, 500)]) // closed
        .mockResolvedValueOnce([])                                          // open
        .mockResolvedValueOnce([]),                                         // today
    },
    withdrawal: { findMany: vi.fn().mockResolvedValue([]) },
    setup: { findMany: vi.fn().mockResolvedValue([]) },
    tradeChecklistResult: { findMany: vi.fn().mockResolvedValue([]) },
    market: { findMany: vi.fn().mockResolvedValue([]) },
  } as never
}

describe("getDashboardStats — practice partition", () => {
  it("excludes practice accounts from financial stats by default, keeps them in discipline", async () => {
    const out = await getDashboardStats(mockPrisma(), USER, { period: "ALL" })
    expect(out.accountStats.map(s => s.accountId)).toEqual([REAL])
    expect(out.recentTrades).toHaveLength(1)
    expect(out.recentTrades[0].pnl).toBe(100)
    // Discipline is behavioural: it sees trades from BOTH accounts.
    expect(out.discipline.rDistribution.reduce((n, b) => n + b.count, 0)).toBe(2)
  })

  it("includes practice accounts when includePractice=true", async () => {
    const out = await getDashboardStats(mockPrisma(), USER, { includePractice: true, period: "ALL" })
    expect(out.accountStats.map(s => s.accountId).sort()).toEqual([REAL, DEMO].sort())
    expect(out.recentTrades).toHaveLength(2)
  })
})

describe("dashboard financial reliability", () => {
  function fixture() {
    const db = mockPrisma() as any
    const today = new Date().toISOString().slice(0, 10)
    const rows = [
      { ...tradeRow(REAL, 1000), date: new Date("2020-01-01"), status: "CLOSED" },
      { ...tradeRow(REAL, -5), date: new Date(today), status: "CLOSED" },
    ]
    db.account.findMany.mockResolvedValue([{ ...acct(REAL, "PROP_FIRM"), currency: "MXN", ddDailyPct: 1 }])
    db.user.findUniqueOrThrow.mockResolvedValue({ timezone: "UTC", baseCurrency: "USD", fxRates: null })
    db.trade.findMany.mockReset().mockImplementation(async ({ where }: any) => rows.filter(t => {
      if (where.status && t.status !== where.status) return false
      if (typeof where.accountId === "string" && t.accountId !== where.accountId) return false
      if (where.accountId?.in && !where.accountId.in.includes(t.accountId)) return false
      if (where.date instanceof Date) return t.date.getTime() === where.date.getTime()
      return (!where.date?.gte || t.date >= where.date.gte) && (!where.date?.lte || t.date <= where.date.lte)
    }))
    db.fixtureRows = rows
    return db
  }
  it("keeps original planned risk and size after a full partial close and normalizes FX", async () => {
    const db = fixture()
    db.fixtureRows.splice(0,db.fixtureRows.length,{...tradeRow(REAL,20),status:"CLOSED",date:new Date("2020-01-01"),entry:100,stop:100,target:130,size:0,originalSize:2,originalRiskMoney:20})
    const result = await getDashboardStats(db,USER,{period:"ALL"})
    expect(result.executionStats.avgPlannedRisk).toBe(1.16)
    expect(result.executionStats.avgPlannedReward).toBe(3.48)
  })
  it("sorts partial realization dates before computing drawdown", async () => {
    const db = fixture()
    db.account.findMany.mockResolvedValue([{...acct(REAL,"PERSONAL"),ddTotalPct:20}])
    db.fixtureRows.splice(0,db.fixtureRows.length,
      {...tradeRow(REAL,0),status:"CLOSED",date:new Date("2020-01-01"),events:[{realizedPnl:100,timestamp:new Date("2020-01-05T12:00:00Z")}]},
      {...tradeRow(REAL,-100),status:"CLOSED",date:new Date("2020-01-02")})
    const result = await getDashboardStats(db,USER,{period:"ALL"})
    expect(result.accountStats[0].drawdownPct).toBe(2)
  })
  it("includes open partial realization in live balance and risk without counting an extra closed trade", async () => {
    const db = fixture()
    const today = new Date().toISOString().slice(0,10)
    db.fixtureRows.push({ ...tradeRow(REAL, -50), status: "OPEN", date: new Date("2020-01-01"), events: [{realizedPnl:-50,timestamp:new Date(today+"T12:00:00Z")}] })
    const result = await getDashboardStats(db, USER, { period: "ALL" })
    expect(result.accountStats[0].balance).toBeCloseTo(10945 * .058, 2)
    expect(result.accountStats[0].pnlToday).toBeCloseTo(-55 * .058, 2)
    expect(result.accountStats[0].tradesTotal).toBe(2)
    expect(result.propFirmStatus[0].dailyLossPct).toBe(55)
  })
  it("paid cash reduces live balance but never trading performance or drawdown", async () => {
    const db = fixture()
    const before = await getDashboardStats(db, USER, { period: "ALL" })
    db.withdrawal.findMany.mockResolvedValue([{accountId:REAL,amount:1000,currency:"MXN",status:"PAGADO"}])
    const after = await getDashboardStats(db, USER, { period: "ALL" })
    expect(after.accountStats[0].balance).toBeCloseTo(before.accountStats[0].balance - 1000 * .058, 2)
    expect(after.accountStats[0].netPnl).toBe(before.accountStats[0].netPnl)
    expect(after.accountStats[0].risk).toEqual(before.accountStats[0].risk)
    expect(after.kpis).toEqual(before.kpis)
  })
  it("keeps lifetime balance/risk independent of period and converts daily loss once", async () => {
    const db = fixture()
    const all = await getDashboardStats(db, USER, { period: "ALL" })
    const recent = await getDashboardStats(db, USER, { period: "7d" })
    expect(recent.kpis.netPnl).toBeCloseTo(-5 * .058)
    expect(recent.accountStats[0].balance).toBeCloseTo(10995 * .058, 2)
    expect(recent.accountStats[0].risk).toEqual(all.accountStats[0].risk)
    expect(recent.propFirmStatus[0].dailyLossPct).toBe(5)
    expect(recent.propFirmStatus[0]).toEqual(all.propFirmStatus[0])
  })
  it("excludes future days from current state while honoring the performance range", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-06T00:30:00Z"))
    try {
      const db = fixture()
      db.user.findUniqueOrThrow.mockResolvedValue({ timezone: "America/Tegucigalpa", baseCurrency: "USD", fxRates: null })
      db.fixtureRows[1].date = new Date("2026-11-05")
      const before = await getDashboardStats(db, USER, { period: "ALL", to: "2026-11-05" })
      db.fixtureRows.push({ ...tradeRow(REAL, -5000), date: new Date("2026-11-06"), status: "CLOSED" })
      const current = await getDashboardStats(db, USER, { period: "ALL", to: "2026-11-05" })
      expect(current.accountStats).toEqual(before.accountStats)
      expect(current.propFirmStatus).toEqual(before.propFirmStatus)
      const futureRange = await getDashboardStats(db, USER, { period: "ALL", from: "2026-11-06", to: "2026-11-06" })
      expect(futureRange.kpis.netPnl).toBeCloseTo(-5000 * .058)
      expect(futureRange.accountStats).toEqual(before.accountStats)
      expect(futureRange.propFirmStatus).toEqual(before.propFirmStatus)
    } finally {
      vi.useRealTimers()
    }
  })
  it("aggregates mixed USD/MXN amounts once in the portfolio currency", async () => {
    const db = fixture()
    db.account.findMany.mockResolvedValue([
      { ...acct(REAL, "PROP_FIRM"), currency: "MXN", ddDailyPct: 1 },
      acct("usd", "PERSONAL"),
    ])
    db.fixtureRows.push({ ...tradeRow("usd", 100), date: new Date(), status: "CLOSED" })
    const out = await getDashboardStats(db, USER, { period: "ALL" })
    expect(out.kpis.netPnl).toBeCloseTo(995 * .058 + 100)
    expect(out.accountStats.find(s => s.accountId === "usd")?.balance).toBe(10100)
    expect(out.propFirmStatus[0].dailyLossPct).toBe(5)
  })
  it("serves an unchanged cached request without reading trade history", async () => {
    const cache = await import("@/domains/analytics/services/analytics-cache")
    const db = fixture()
    vi.mocked(cache.isCacheEnabled).mockReturnValue(false)
    const result = await getDashboardStats(db, USER, { period: "ALL" })
    db.trade.findMany.mockClear()
    vi.mocked(cache.isCacheEnabled).mockReturnValue(true)
    vi.mocked(cache.getCachedStats).mockResolvedValue(result)
    expect(await getDashboardStats(db, USER, { period: "ALL" })).toEqual(result)
    expect(db.trade.findMany).not.toHaveBeenCalled()
    vi.mocked(cache.isCacheEnabled).mockReturnValue(false)
  })
  it("separates explicit ranges and FX dependencies in versioned cache keys", async () => {
    const cache = await import("@/domains/analytics/services/analytics-cache")
    vi.mocked(cache.isCacheEnabled).mockReturnValue(true)
    vi.mocked(cache.getCachedStats).mockResolvedValue(null)
    const db = fixture()
    await getDashboardStats(db, USER, { period: "ALL", from: "2020-01-01", to: "2020-01-01" })
    await getDashboardStats(db, USER, { period: "ALL", from: "2026-01-01", to: "2026-01-01" })
    db.user.findUniqueOrThrow.mockResolvedValue({ timezone: "UTC", baseCurrency: "EUR", fxRates: null })
    await getDashboardStats(db, USER, { period: "ALL", from: "2026-01-01", to: "2026-01-01" })
    const keys = vi.mocked(cache.getCachedStats).mock.calls.slice(-3).map(call => call[2])
    expect(new Set(keys).size).toBe(3)
    expect(keys[0]).toContain("v2")
    vi.mocked(cache.isCacheEnabled).mockReturnValue(false)
  })
})
