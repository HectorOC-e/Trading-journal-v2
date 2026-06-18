import { describe, it, expect, vi, beforeEach } from "vitest"
import { Prisma } from "@/lib/generated/prisma/client"
import { appRouter } from "@/server/trpc/root"

// Mock modules that rely on env / external services
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

function makeFakeAccount(overrides = {}) {
  const now = new Date("2026-01-01T00:00:00Z")
  return {
    id: "acc-1", name: "Main", userId: "test-user-id", broker: "IBKR",
    type: "PERSONAL", status: "ACTIVE",
    // TD-032: use Prisma.Decimal to match actual DB return type
    initialBalance: new Prisma.Decimal("10000.50"),
    ddDailyPct: null, ddWeeklyPct: null, ddMonthlyPct: null,
    ddTotalPct: null, ddModel: null, targetPct: null,
    currency: "USD", timezone: "America/New_York", phase: "NONE",
    allowedSymbols: [], maxTradesPerDay: null, minTradingDays: null,
    statusNote: null, archivedAt: null,
    locked: false, lockReason: "", lockedAt: null,
    createdAt: now, updatedAt: now,
    ...overrides,
  }
}

function makeMockPrisma() {
  return {
    account: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    accountLog: {
      create: vi.fn(),
    },
    trade: {
      // list() aggregates realized P&L per account for the current balance.
      groupBy: vi.fn().mockResolvedValue([]),
    },
    withdrawal: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  }
}

const USER_ID = "test-user-id"

describe("accounts router", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller = appRouter.createCaller({
      prisma: mockPrisma as any,
      supabase: {} as any,
      userId: USER_ID,
    })
  })

  it("list: serializes Prisma.Decimal initialBalance to number", async () => {
    const fakeAccounts = [makeFakeAccount()]
    mockPrisma.account.findMany.mockResolvedValue(fakeAccounts)

    const result = await caller.accounts.list()

    expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, status: { in: ["ACTIVE", "PAUSED"] } },
      orderBy: { createdAt: "asc" },
    })
    // TD-032: assert Decimal is serialized to number
    expect(typeof result[0].initialBalance).toBe("number")
    expect(result[0].initialBalance).toBe(10000.5)
    expect(result[0].id).toBe("acc-1")
  })

  it("create: inserts account, creates a log entry, and serializes Decimal", async () => {
    const fakeAccount = makeFakeAccount({
      id: "acc-2", name: "Prop", broker: "FTMO", type: "PROP_FIRM",
      initialBalance: new Prisma.Decimal("10000"),
    })
    mockPrisma.account.create.mockResolvedValue(fakeAccount)
    mockPrisma.accountLog.create.mockResolvedValue({ id: "log-1" })

    const result = await caller.accounts.create({
      name: "Prop",
      broker: "FTMO",
      type: "PROP_FIRM" as const,
      initialBalance: 10000,
    })

    expect(mockPrisma.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Prop", userId: USER_ID }),
    })
    expect(mockPrisma.accountLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: USER_ID, accountId: fakeAccount.id, event: "CREATED" }),
    })
    // TD-031: create mutation must return serialized account
    expect(typeof result.initialBalance).toBe("number")
    expect(result.initialBalance).toBe(10000)
  })

  it("delete: removes account by id", async () => {
    const fakeAccount = { id: "acc-3", name: "Old", userId: USER_ID }
    mockPrisma.account.delete.mockResolvedValue(fakeAccount)

    const result = await caller.accounts.delete("550e8400-e29b-41d4-a716-446655440000")

    expect(mockPrisma.account.delete).toHaveBeenCalledWith({
      where: { id: "550e8400-e29b-41d4-a716-446655440000", userId: USER_ID },
    })
    expect(result).toEqual(fakeAccount)
  })

  it("archive: audit log captures pre-update status in 'from' field (M-01)", async () => {
    // Account is ACTIVE before archiving
    const prevAccount = makeFakeAccount({ id: "acc-4", status: "ACTIVE" })
    const updatedAccount = makeFakeAccount({ id: "acc-4", status: "INACTIVE" })

    mockPrisma.account.findUniqueOrThrow.mockResolvedValue({ status: "ACTIVE" })
    mockPrisma.account.update.mockResolvedValue(updatedAccount)
    mockPrisma.accountLog.create.mockResolvedValue({ id: "log-2" })

    await caller.accounts.archive("550e8400-e29b-41d4-a716-446655440001")

    // findUniqueOrThrow must be called BEFORE update to capture pre-mutation status
    expect(mockPrisma.account.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "550e8400-e29b-41d4-a716-446655440001", userId: USER_ID },
      select: { status: true },
    })
    expect(mockPrisma.accountLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        payload: expect.objectContaining({
          event: "STATUS_CHANGE",
          from:  "ACTIVE",   // must be the pre-update value, not post-update "INACTIVE"
          to:    "INACTIVE",
        }),
      }),
    })

    void prevAccount // referenced to avoid lint warning
  })

  // ── HALLAZGO 1B — manual lock / unlock ─────────────────────────────────────
  it("lock: sets locked state + writes a LOCKED audit log", async () => {
    mockPrisma.account.update.mockResolvedValue(makeFakeAccount({ locked: true, lockReason: "MANUAL", lockedAt: new Date() }))
    mockPrisma.accountLog.create.mockResolvedValue({ id: "log-lock" })

    const result = await caller.accounts.lock({ id: "550e8400-e29b-41d4-a716-446655440002", reason: "MANUAL" })

    expect(mockPrisma.account.update).toHaveBeenCalledWith({
      where: { id: "550e8400-e29b-41d4-a716-446655440002", userId: USER_ID },
      data:  expect.objectContaining({ locked: true, lockReason: "MANUAL" }),
    })
    expect(mockPrisma.accountLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        event:   "LOCKED",
        payload: expect.objectContaining({ event: "LOCKED", reason: "MANUAL", auto: false }),
      }),
    })
    expect(result.locked).toBe(true)
    expect(typeof result.initialBalance).toBe("number")
  })

  it("unlock: clears locked state + writes an UNLOCKED audit log", async () => {
    mockPrisma.account.update.mockResolvedValue(makeFakeAccount({ locked: false, lockReason: "", lockedAt: null }))
    mockPrisma.accountLog.create.mockResolvedValue({ id: "log-unlock" })

    const result = await caller.accounts.unlock({ id: "550e8400-e29b-41d4-a716-446655440002" })

    expect(mockPrisma.account.update).toHaveBeenCalledWith({
      where: { id: "550e8400-e29b-41d4-a716-446655440002", userId: USER_ID },
      data:  { locked: false, lockReason: "", lockedAt: null },
    })
    expect(mockPrisma.accountLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ event: "UNLOCKED" }),
    })
    expect(result.locked).toBe(false)
  })
})
