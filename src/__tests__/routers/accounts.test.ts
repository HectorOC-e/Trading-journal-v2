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
})
