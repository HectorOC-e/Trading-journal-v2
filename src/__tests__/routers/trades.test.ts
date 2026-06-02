/**
 * TASK-034 regression tests: trades.create and trades.update accept psychology fields.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { appRouter } from "@/server/trpc/root"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/ai/config", () => ({
  isEmbeddingAvailable: vi.fn().mockReturnValue(false),
}))
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

const BASE_TRADE = {
  id:             TRADE_ID,
  userId:         USER_ID,
  accountId:      ACCOUNT_ID,
  setupId:        null,
  direction:      "LONG",
  symbol:         "MNQ",
  entry:          { toNumber: () => 21000 },
  stop:           { toNumber: () => 20900 },
  target:         { toNumber: () => 21200 },
  size:           { toNumber: () => 1 },
  pnl:            null,
  rMultiple:      null,
  closePrice:     null,
  commission:     null,
  date:           new Date("2025-01-06"),
  openTime:       "09:30",
  closeTime:      null,
  session:        "New York",
  tags:           [],
  notes:          "",
  screenshotUrls: [],
  status:         "OPEN",
  createdAt:      new Date(),
  updatedAt:      new Date(),
  // Psychology fields
  emotionBefore:    null,
  confidenceRating: null,
  executionQuality: null,
  fomoFlag:         false,
  revengeFlag:      false,
}

const BASE_ACCOUNT = {
  id:              ACCOUNT_ID,
  userId:          USER_ID,
  type:            "PERSONAL",
  ddDailyPct:      null,
  maxTradesPerDay: null,
  allowedSymbols:  [],
  initialBalance:  { toNumber: () => 10000 },
  name:            "Personal",
  broker:          "Apex",
  currency:        "USD",
  timezone:        "America/New_York",
  ddWeeklyPct:     null,
  ddMonthlyPct:    null,
  ddTotalPct:      null,
  targetPct:       null,
  ddModel:         null,
  phase:           "NONE",
  minTradingDays:  null,
  status:          "ACTIVE",
  statusNote:      "",
  createdAt:       new Date(),
  updatedAt:       new Date(),
}

function makeMockPrisma() {
  const trade = { ...BASE_TRADE }
  return {
    account: {
      findUniqueOrThrow: vi.fn().mockResolvedValue(BASE_ACCOUNT),
    },
    trade: {
      create: vi.fn().mockResolvedValue(trade),
      update: vi.fn().mockResolvedValue(trade),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ ...trade, account: BASE_ACCOUNT, setup: null, events: [] }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    tradeEvent: {
      create: vi.fn().mockResolvedValue({ id: "ev-1", type: "OPEN", timestamp: new Date() }),
    },
    tradeChecklistResult: {},
  }
}

const BASE_CREATE_INPUT = {
  accountId:      ACCOUNT_ID,
  direction:      "LONG" as const,
  symbol:         "MNQ",
  entry:          21000,
  stop:           20900,
  target:         21200,
  size:           1,
  date:           "2025-01-06",
  openTime:       "09:30",
  session:        "New York" as const,
  tags:           [],
  notes:          "",
  screenshotUrls: [],
}

describe("trades.create — psychology fields", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller = appRouter.createCaller({
      prisma: mockPrisma as never,
      supabase: {} as never,
      userId: USER_ID,
    })
  })

  it("accepts a create call without psychology fields (all optional)", async () => {
    const trade = await caller.trades.create(BASE_CREATE_INPUT)
    expect(trade).toBeDefined()
    expect(mockPrisma.trade.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ symbol: "MNQ" }) })
    )
  })

  it("accepts emotionBefore field", async () => {
    const trade = await caller.trades.create({
      ...BASE_CREATE_INPUT,
      emotionBefore: "calm",
    })
    expect(trade).toBeDefined()
    expect(mockPrisma.trade.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ emotionBefore: "calm" }),
      })
    )
  })

  it("accepts confidenceRating and executionQuality (1-5)", async () => {
    const trade = await caller.trades.create({
      ...BASE_CREATE_INPUT,
      confidenceRating: 4,
      executionQuality: 3,
    })
    expect(trade).toBeDefined()
    expect(mockPrisma.trade.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ confidenceRating: 4, executionQuality: 3 }),
      })
    )
  })

  it("accepts fomoFlag and revengeFlag", async () => {
    const trade = await caller.trades.create({
      ...BASE_CREATE_INPUT,
      fomoFlag:    true,
      revengeFlag: false,
    })
    expect(trade).toBeDefined()
    expect(mockPrisma.trade.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fomoFlag: true, revengeFlag: false }),
      })
    )
  })

  it("rejects confidenceRating outside 1-5 range", async () => {
    await expect(
      caller.trades.create({ ...BASE_CREATE_INPUT, confidenceRating: 6 })
    ).rejects.toThrow()
  })

  it("rejects invalid emotionBefore value", async () => {
    await expect(
      caller.trades.create({ ...BASE_CREATE_INPUT, emotionBefore: "happy" as never })
    ).rejects.toThrow()
  })
})

describe("trades.update — psychology fields", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller = appRouter.createCaller({
      prisma: mockPrisma as never,
      supabase: {} as never,
      userId: USER_ID,
    })
  })

  it("accepts update with psychology fields", async () => {
    const result = await caller.trades.update({
      id:              TRADE_ID,
      emotionBefore:   "anxious",
      confidenceRating: 2,
      executionQuality: 5,
      fomoFlag:        true,
      revengeFlag:     true,
    })
    expect(result).toBeDefined()
    expect(mockPrisma.trade.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emotionBefore:    "anxious",
          confidenceRating: 2,
          executionQuality: 5,
          fomoFlag:         true,
          revengeFlag:      true,
        }),
      })
    )
  })

  it("accepts null values for psychology fields (clearing them)", async () => {
    const result = await caller.trades.update({
      id:               TRADE_ID,
      emotionBefore:    null,
      confidenceRating: null,
      executionQuality: null,
    })
    expect(result).toBeDefined()
  })
})

// M-03 fix: emotionBefore null-sentinel — trades.create must accept undefined (not empty string)
// The form now uses null as the "no emotion" sentinel, converted to undefined before mutation.
describe("trades.create — emotionBefore null-sentinel contract (M-03)", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller = appRouter.createCaller({
      prisma: mockPrisma as never,
      supabase: {} as never,
      userId: USER_ID,
    })
  })

  it("accepts undefined emotionBefore (no emotion selected — null sentinel converted at call site)", async () => {
    const trade = await caller.trades.create({
      ...BASE_CREATE_INPUT,
      emotionBefore: undefined,
    })
    expect(trade).toBeDefined()
    expect(mockPrisma.trade.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ emotionBefore: "" }),
      })
    )
  })

  it("rejects empty string emotionBefore (form bug would reach server if coercion were removed)", async () => {
    await expect(
      caller.trades.create({ ...BASE_CREATE_INPUT, emotionBefore: "" as never })
    ).rejects.toThrow()
  })
})
