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
    setup: { findMany: vi.fn().mockResolvedValue([]) },
    tradeChecklistResult: { findMany: vi.fn().mockResolvedValue([]) },
    market: { findMany: vi.fn().mockResolvedValue([]) },
  } as never
}

describe("getDashboardStats — practice partition", () => {
  it("excludes practice accounts from financial stats by default, keeps them in discipline", async () => {
    const out = await getDashboardStats(mockPrisma(), USER, undefined)
    expect(out.accountStats.map(s => s.accountId)).toEqual([REAL])
    expect(out.recentTrades).toHaveLength(1)
    expect(out.recentTrades[0].pnl).toBe(100)
    // Discipline is behavioural: it sees trades from BOTH accounts.
    expect(out.discipline.rDistribution.reduce((n, b) => n + b.count, 0)).toBe(2)
  })

  it("includes practice accounts when includePractice=true", async () => {
    const out = await getDashboardStats(mockPrisma(), USER, { includePractice: true })
    expect(out.accountStats.map(s => s.accountId).sort()).toEqual([REAL, DEMO].sort())
    expect(out.recentTrades).toHaveLength(2)
  })
})
