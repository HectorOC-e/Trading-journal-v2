import { describe, it, expect, vi, beforeEach } from "vitest"
import { appRouter } from "@/server/trpc/root"

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
const ACCOUNT_ID = "550e8400-e29b-41d4-a716-446655440001"
const WITHDRAWAL_ID = "550e8400-e29b-41d4-a716-446655440002"

describe("withdrawals router", () => {
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

  it("list: returns withdrawals for userId", async () => {
    const fakeWithdrawals = [
      { id: WITHDRAWAL_ID, userId: USER_ID, accountId: ACCOUNT_ID, amount: 500, status: "SOLICITADO" },
    ]
    mockPrisma.withdrawal.findMany.mockResolvedValue(fakeWithdrawals)

    const result = await caller.withdrawals.list({ accountId: ACCOUNT_ID })

    expect(mockPrisma.withdrawal.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, accountId: ACCOUNT_ID },
      include: { account: { select: { name: true, currency: true } } },
      orderBy: { date: "desc" },
    })
    expect(result).toEqual(fakeWithdrawals)
  })

  it("list: returns all withdrawals when no accountId filter", async () => {
    mockPrisma.withdrawal.findMany.mockResolvedValue([])

    await caller.withdrawals.list()

    expect(mockPrisma.withdrawal.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, accountId: undefined },
      include: { account: { select: { name: true, currency: true } } },
      orderBy: { date: "desc" },
    })
  })

  it("create: inserts withdrawal and creates log", async () => {
    const fakeWithdrawal = {
      id: WITHDRAWAL_ID,
      userId: USER_ID,
      accountId: ACCOUNT_ID,
      amount: 1000,
      currency: "USD",
      status: "SOLICITADO",
    }
    mockPrisma.withdrawal.create.mockResolvedValue(fakeWithdrawal)
    mockPrisma.accountLog.create.mockResolvedValue({ id: "log-1" })

    const result = await caller.withdrawals.create({
      accountId: ACCOUNT_ID,
      amount: 1000,
      currency: "USD",
      date: "2025-01-15",
      note: "Monthly profit",
      reference: "REF-001",
    })

    expect(mockPrisma.withdrawal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        accountId: ACCOUNT_ID,
        amount: 1000,
        status: "SOLICITADO",
      }),
    })
    expect(mockPrisma.accountLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        accountId: ACCOUNT_ID,
        event: "WITHDRAWAL",
        payload: expect.objectContaining({ amount: 1000, status: "SOLICITADO" }),
      }),
    })
    expect(result).toEqual(fakeWithdrawal)
  })

  it("updateStatus: updates status and creates log", async () => {
    const updatedWithdrawal = {
      id: WITHDRAWAL_ID,
      userId: USER_ID,
      accountId: ACCOUNT_ID,
      amount: 1000,
      status: "PAGADO",
      reference: "REF-PAID",
    }
    mockPrisma.withdrawal.update.mockResolvedValue(updatedWithdrawal)
    mockPrisma.accountLog.create.mockResolvedValue({ id: "log-2" })

    const result = await caller.withdrawals.updateStatus({
      id: WITHDRAWAL_ID,
      status: "PAGADO",
      reference: "REF-PAID",
    })

    expect(mockPrisma.withdrawal.update).toHaveBeenCalledWith({
      where: { id: WITHDRAWAL_ID, userId: USER_ID },
      data: { status: "PAGADO", reference: "REF-PAID" },
    })
    expect(mockPrisma.accountLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        accountId: ACCOUNT_ID,
        event: "WITHDRAWAL_STATUS",
        payload: expect.objectContaining({ status: "PAGADO" }),
      }),
    })
    expect(result).toEqual(updatedWithdrawal)
  })
})
