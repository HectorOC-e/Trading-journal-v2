import { describe, it, expect, vi, beforeEach } from "vitest"
import { appRouter } from "@/server/trpc/root"

// Mock modules that rely on env / external services
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

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

  it("list: returns accounts for userId", async () => {
    const fakeAccounts = [
      { id: "acc-1", name: "Main", userId: USER_ID, broker: "IBKR", type: "PERSONAL" },
    ]
    mockPrisma.account.findMany.mockResolvedValue(fakeAccounts)

    const result = await caller.accounts.list()

    expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: "asc" },
    })
    expect(result).toEqual(fakeAccounts)
  })

  it("create: inserts account and creates a log entry", async () => {
    const fakeAccount = {
      id: "acc-2",
      name: "Prop",
      broker: "FTMO",
      type: "PROP_FIRM",
      initialBalance: 10000,
      currency: "USD",
      timezone: "America/New_York",
      allowedSymbols: [],
      userId: USER_ID,
    }
    mockPrisma.account.create.mockResolvedValue(fakeAccount)
    mockPrisma.accountLog.create.mockResolvedValue({ id: "log-1" })

    const input = {
      name: "Prop",
      broker: "FTMO",
      type: "PROP_FIRM" as const,
      initialBalance: 10000,
    }

    const result = await caller.accounts.create(input)

    expect(mockPrisma.account.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Prop", userId: USER_ID }),
    })
    expect(mockPrisma.accountLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        accountId: fakeAccount.id,
        event: "CREATED",
      }),
    })
    expect(result).toEqual(fakeAccount)
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
