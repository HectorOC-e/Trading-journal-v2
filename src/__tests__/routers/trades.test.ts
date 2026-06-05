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
// Keep the real checkLossLimit (loss-limit tests rely on it); stub the
// count/symbol guards so unrelated create tests always pass them.
vi.mock("@/domains/trading/services/prop-firm-guard", async (importActual) => {
  const actual = await importActual<typeof import("@/domains/trading/services/prop-firm-guard")>()
  return {
    ...actual,
    checkTradeCountLimit: vi.fn().mockReturnValue(false),
    checkSymbolAllowlist: vi.fn().mockReturnValue(false),
  }
})

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
  locked:          false,
  lockReason:      "",
  lockedAt:        null,
  createdAt:       new Date(),
  updatedAt:       new Date(),
}

function makeMockPrisma(accountOverrides: Record<string, unknown> = {}) {
  const trade = { ...BASE_TRADE }
  const account = { ...BASE_ACCOUNT, ...accountOverrides }
  return {
    account: {
      findUniqueOrThrow: vi.fn().mockResolvedValue(account),
      update:            vi.fn().mockResolvedValue(account),
    },
    setup: {
      findUnique: vi.fn().mockResolvedValue({ status: "ACTIVO" }),
    },
    trade: {
      create: vi.fn().mockResolvedValue(trade),
      update: vi.fn().mockResolvedValue(trade),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ ...trade, account: BASE_ACCOUNT, setup: null, events: [] }),
      findMany: vi.fn().mockResolvedValue([]),
      count:   vi.fn().mockResolvedValue(0),
    },
    tradeEvent: {
      create: vi.fn().mockResolvedValue({ id: "ev-1", type: "OPEN", timestamp: new Date() }),
    },
    accountLog: {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
    },
    userAiSettings: {
      findUnique: vi.fn().mockResolvedValue(null),
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

describe("trades.create — tag validation (M-04)", () => {
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

  it("accepts tags within limits (≤20 tags, each ≤30 chars)", async () => {
    const trade = await caller.trades.create({
      ...BASE_CREATE_INPUT,
      tags: ["momentum", "breakout", "news-driven"],
    })
    expect(trade).toBeDefined()
  })

  it("rejects a tag element exceeding 30 characters", async () => {
    await expect(
      caller.trades.create({
        ...BASE_CREATE_INPUT,
        tags: ["a".repeat(31)],
      })
    ).rejects.toThrow()
  })

  it("rejects an empty-string tag element", async () => {
    await expect(
      caller.trades.create({ ...BASE_CREATE_INPUT, tags: [""] })
    ).rejects.toThrow()
  })

  it("rejects more than 20 tags", async () => {
    await expect(
      caller.trades.create({
        ...BASE_CREATE_INPUT,
        tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
      })
    ).rejects.toThrow()
  })
})

describe("trades.update — tag validation (M-04)", () => {
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

  it("accepts valid tag update", async () => {
    const result = await caller.trades.update({
      id:   TRADE_ID,
      tags: ["scalp", "london-open"],
    })
    expect(result).toBeDefined()
  })

  it("rejects a tag element exceeding 30 characters on update", async () => {
    await expect(
      caller.trades.update({ id: TRADE_ID, tags: ["b".repeat(31)] })
    ).rejects.toThrow()
  })

  it("rejects more than 20 tags on update", async () => {
    await expect(
      caller.trades.update({
        id:   TRADE_ID,
        tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
      })
    ).rejects.toThrow()
  })
})

// ── HALLAZGO 1B / 2 — risk-limit lock + setup guard on create ────────────────
describe("trades.create — lock & setup guards", () => {
  let caller: ReturnType<typeof appRouter.createCaller>

  function callerWith(prisma: ReturnType<typeof makeMockPrisma>) {
    return appRouter.createCaller({ prisma: prisma as never, supabase: {} as never, userId: USER_ID })
  }

  it("rejects a trade on a locked account (FORBIDDEN ACCOUNT_LOCKED)", async () => {
    const prisma = makeMockPrisma({ locked: true, lockReason: "DAILY_LOSS_LIMIT" })
    caller = callerWith(prisma)
    await expect(caller.trades.create(BASE_CREATE_INPUT)).rejects.toThrow(/ACCOUNT_LOCKED/)
    expect(prisma.trade.create).not.toHaveBeenCalled()
  })

  it("rejects a trade referencing a PAUSED setup (SETUP_NOT_AVAILABLE)", async () => {
    const prisma = makeMockPrisma()
    prisma.setup.findUnique.mockResolvedValue({ status: "PAUSADO" })
    caller = callerWith(prisma)
    await expect(
      caller.trades.create({ ...BASE_CREATE_INPUT, setupId: "550e8400-e29b-41d4-a716-446655440099" }),
    ).rejects.toThrow(/SETUP_NOT_AVAILABLE/)
    expect(prisma.trade.create).not.toHaveBeenCalled()
  })

  it("allows a trade referencing an active setup", async () => {
    const prisma = makeMockPrisma()
    prisma.setup.findUnique.mockResolvedValue({ status: "ACTIVO" })
    caller = callerWith(prisma)
    const trade = await caller.trades.create({ ...BASE_CREATE_INPUT, setupId: "550e8400-e29b-41d4-a716-446655440099" })
    expect(trade).toBeDefined()
    expect(prisma.trade.create).toHaveBeenCalled()
  })

  it("auto-locks the account when a configured loss limit is already breached", async () => {
    // Weekly limit 5% of $10k = $500. Already-realized week loss = -$600 → breach.
    const prisma = makeMockPrisma({ ddWeeklyPct: 5, initialBalance: 10000 })
    prisma.trade.findMany.mockResolvedValue([{ pnl: -600, date: new Date("2025-01-06") }])
    caller = callerWith(prisma)

    await expect(caller.trades.create(BASE_CREATE_INPUT)).rejects.toThrow(/ACCOUNT_LOCKED:WEEKLY_LOSS_LIMIT/)
    // Account was locked + audited
    expect(prisma.account.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ locked: true, lockReason: "WEEKLY_LOSS_LIMIT" }) }),
    )
    expect(prisma.accountLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ event: "LOCKED" }) }),
    )
    expect(prisma.trade.create).not.toHaveBeenCalled()
  })

  it("allows a trade when realized loss is below the configured limit", async () => {
    const prisma = makeMockPrisma({ ddWeeklyPct: 5, initialBalance: 10000 })
    prisma.trade.findMany.mockResolvedValue([{ pnl: -100, date: new Date("2025-01-06") }]) // 1% < 5%
    caller = callerWith(prisma)
    const trade = await caller.trades.create(BASE_CREATE_INPUT)
    expect(trade).toBeDefined()
    expect(prisma.account.update).not.toHaveBeenCalled()
  })
})
