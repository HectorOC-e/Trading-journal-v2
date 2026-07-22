/**
 * TASK-074: planNotes roundtrip — create and update with planNotes field.
 * Gate 3: Validates serialization of planNotes through tRPC stack.
 */
import { describe, it, expect, vi } from "vitest"
import { appRouter } from "@/server/trpc/root"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/ai/config", () => ({ isEmbeddingAvailable: vi.fn().mockReturnValue(false) }))
vi.mock("@/lib/ai/embeddings", () => ({ embedText: vi.fn() }))
vi.mock("@/domains/analytics/services/analytics-cache", () => ({
  isCacheEnabled: vi.fn().mockReturnValue(false),
  getCachedStats: vi.fn(),
  setCachedStats: vi.fn(),
  invalidateCache: vi.fn(),
}))
vi.mock("@/domains/trading/services/prop-firm-guard", () => ({
  checkDailyLossLimit:  vi.fn().mockReturnValue(false),
  checkTradeCountLimit: vi.fn().mockReturnValue(false),
  checkSymbolAllowlist: vi.fn().mockReturnValue(false),
}))

const USER_ID    = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1"
const ACCOUNT_ID = "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2"
const TRADE_ID   = "c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3"

const BASE_ACCOUNT = {
  id: ACCOUNT_ID, userId: USER_ID, type: "PERSONAL",
  ddDailyPct: null, maxTradesPerDay: null, allowedSymbols: [],
  initialBalance: { toNumber: () => 10000 },
}

function makeTrade(planNotes: string | null = null) {
  return {
    id: TRADE_ID, userId: USER_ID, accountId: ACCOUNT_ID, setupId: null,
    direction: "LONG", symbol: "MNQ",
    entry: { toNumber: () => 21000 }, stop: { toNumber: () => 20900 }, target: { toNumber: () => 21200 },
    size: { toNumber: () => 1 },
    pnl: null, rMultiple: null, closePrice: null, commission: null,
    date: new Date("2025-01-06"), openTime: "09:30", closeTime: null,
    session: "New York", tags: [], notes: "", screenshotUrls: [], status: "OPEN",
    emotionBefore: null, confidenceRating: null, executionQuality: null,
    fomoFlag: false, revengeFlag: false,
    planNotes,
    createdAt: new Date(), updatedAt: new Date(),
    account: { ...BASE_ACCOUNT, name: "Personal", broker: "Apex", currency: "USD", timezone: "America/New_York",
      ddWeeklyPct: null, ddMonthlyPct: null, ddTotalPct: null, targetPct: null, ddModel: null, phase: "NONE",
      minTradingDays: null, status: "ACTIVE", statusNote: "", createdAt: new Date(), updatedAt: new Date() },
    setup: null, events: [],
  }
}

function buildCreateCaller(planNotes: string | null) {
  const trade = makeTrade(planNotes)
  const mockPrisma = {
    account:    { findUniqueOrThrow: vi.fn().mockResolvedValue(BASE_ACCOUNT) },
    // `aggregate` backs the riskPct fallback's equity lookup (initial balance +
    // realised P&L); no closed trades here, so equity is the initial balance.
    trade:      { create: vi.fn().mockResolvedValue(trade), findUniqueOrThrow: vi.fn().mockResolvedValue(trade), update: vi.fn().mockResolvedValue(trade), aggregate: vi.fn().mockResolvedValue({ _sum: { pnl: 0 } }) },
    tradeEvent: { create: vi.fn().mockResolvedValue({}) },
    tag:        { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    rule: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  }
  return appRouter.createCaller({ prisma: mockPrisma as never, supabase: {} as never, userId: USER_ID })
}

const BASE_CREATE_INPUT = {
  accountId: ACCOUNT_ID, direction: "LONG" as const, symbol: "MNQ",
  entry: 21000, stop: 20900, target: 21200, size: 1,
  date: "2025-01-06", openTime: "09:30", session: "New York" as const,
}

describe("trades.create — planNotes field (TASK-074)", () => {
  it("accepts planNotes and returns it serialized", async () => {
    const planNote = "Breaking news catalyst — trading above VWAP with strong volume"
    const caller   = buildCreateCaller(planNote)
    const result   = await caller.trades.create({ ...BASE_CREATE_INPUT, planNotes: planNote })

    // Gate 3: planNotes is serialized as a string (not null, not Buffer)
    expect(result.planNotes).toBe(planNote)
    expect(typeof result.planNotes).toBe("string")
  })

  it("accepts null planNotes (field is optional)", async () => {
    const caller = buildCreateCaller(null)
    const result = await caller.trades.create({ ...BASE_CREATE_INPUT })
    expect(result.planNotes).toBeNull()
  })

  it("rejects planNotes longer than 500 chars (Zod validation)", async () => {
    const caller = buildCreateCaller(null)
    await expect(
      caller.trades.create({ ...BASE_CREATE_INPUT, planNotes: "x".repeat(501) })
    ).rejects.toThrow()
  })
})

describe("trades.update — planNotes field (TASK-074)", () => {
  it("updates planNotes and returns updated value", async () => {
    const updatedNote = "Updated plan: added FVG confluence"
    const mockPrisma  = { trade: { update: vi.fn().mockResolvedValue(makeTrade(updatedNote)) } }
    const caller      = appRouter.createCaller({ prisma: mockPrisma as never, supabase: {} as never, userId: USER_ID })
    const result      = await caller.trades.update({ id: TRADE_ID, planNotes: updatedNote })
    expect(result.planNotes).toBe(updatedNote)
  })

  it("clears planNotes when set to null", async () => {
    const mockPrisma = { trade: { update: vi.fn().mockResolvedValue(makeTrade(null)) } }
    const caller     = appRouter.createCaller({ prisma: mockPrisma as never, supabase: {} as never, userId: USER_ID })
    const result     = await caller.trades.update({ id: TRADE_ID, planNotes: null })
    expect(result.planNotes).toBeNull()
  })
})
