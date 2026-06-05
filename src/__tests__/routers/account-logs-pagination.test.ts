/**
 * TASK-020: Cursor pagination for accountLogs.list
 * Gate 3: Validates pagination serialization and nextCursor logic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { appRouter } from "@/server/trpc/root"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

const USER_ID    = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1"
const ACCOUNT_ID = "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2"

function makeLog(id: string, n: number) {
  return {
    id,
    userId:    USER_ID,
    accountId: ACCOUNT_ID,
    event:     "NOTE",
    payload:   {},
    createdAt: new Date(`2025-01-${String(n).padStart(2, "0")}T12:00:00Z`),
  }
}

function buildCaller(findManyImpl: (args: { take?: number }) => Promise<ReturnType<typeof makeLog>[]>) {
  const mockPrisma = {
    accountLog: { findMany: vi.fn().mockImplementation(findManyImpl) },
  }
  return appRouter.createCaller({ prisma: mockPrisma as never, supabase: {} as never, userId: USER_ID })
}

describe("accountLogs.list — cursor pagination (TASK-020)", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("returns items and null nextCursor when total <= limit", async () => {
    const logs = [makeLog("id-1", 5), makeLog("id-2", 4), makeLog("id-3", 3)]
    const caller = buildCaller(() => Promise.resolve(logs))
    const result = await caller.accountLogs.list({ accountId: ACCOUNT_ID, limit: 20 })
    expect(result.items).toHaveLength(3)
    expect(result.nextCursor).toBeNull()
  })

  it("returns nextCursor when there are more items", async () => {
    const logs = Array.from({ length: 21 }, (_, i) => makeLog(`id-${i + 1}`, 21 - i))
    const caller = buildCaller(() => Promise.resolve(logs))
    const result = await caller.accountLogs.list({ accountId: ACCOUNT_ID, limit: 20 })
    expect(result.items).toHaveLength(20)
    expect(result.nextCursor).toBe("id-20")
  })

  it("serializes createdAt as ISO string (Gate 3)", async () => {
    const log    = makeLog("id-1", 5)
    const caller = buildCaller(() => Promise.resolve([log]))
    const result = await caller.accountLogs.list({ accountId: ACCOUNT_ID })
    expect(typeof result.items[0].createdAt).toBe("string")
    expect(result.items[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it("returns empty items and null nextCursor for empty list", async () => {
    const caller = buildCaller(() => Promise.resolve([]))
    const result = await caller.accountLogs.list({ accountId: ACCOUNT_ID })
    expect(result.items).toHaveLength(0)
    expect(result.nextCursor).toBeNull()
  })

  it("passes cursor filter when cursor is provided", async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const mockPrisma = { accountLog: { findMany } }
    const caller = appRouter.createCaller({ prisma: mockPrisma as never, supabase: {} as never, userId: USER_ID })
    const CURSOR_ID = "d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4"
    await caller.accountLogs.list({ accountId: ACCOUNT_ID, cursor: CURSOR_ID })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: CURSOR_ID },
        skip:   1,
      })
    )
  })
})
