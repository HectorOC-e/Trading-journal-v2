import { describe, it, expect, vi, beforeEach } from "vitest"
import { appRouter } from "@/server/trpc/root"
import { TRPCError } from "@trpc/server"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

const mockDeleteUser = vi.fn().mockResolvedValue({ error: null })
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { deleteUser: mockDeleteUser } },
  }),
}))

const USER_ID = "550e8400-e29b-41d4-a716-446655440001"

const BASE_USER = {
  id:                 USER_ID,
  email:              "trader@example.com",
  name:               "Test Trader",
  role:               "USER",
  timezone:           "America/Tegucigalpa",
  baseCurrency:       "USD",
  language:           "es",
  weeklyGoalMinutes:  300,
  emailNotifications: true,
  currentStreak:      5,
  bestStreak:         12,
  lastReviewDate:     new Date("2026-05-20T00:00:00.000Z"),
  createdAt:          new Date("2025-01-10T00:00:00.000Z"),
}

function makeMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn().mockResolvedValue({}),
    },
    trade:       { findMany: vi.fn().mockResolvedValue([]) },
    account:     { findMany: vi.fn().mockResolvedValue([]) },
    rule:        { findMany: vi.fn().mockResolvedValue([]) },
    weeklyReview:{ findMany: vi.fn().mockResolvedValue([]) },
    tradeStatsCache: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
  }
}

const mockSupabase = {
  auth: {
    updateUser: vi.fn().mockResolvedValue({ error: null }),
  },
}

describe("profile.get", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller = appRouter.createCaller({ prisma: mockPrisma as any, supabase: mockSupabase as any, userId: USER_ID })
    vi.clearAllMocks()
    mockDeleteUser.mockResolvedValue({ error: null })
  })

  it("returns user data with Date fields serialized to ISO strings", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(BASE_USER)

    const result = await caller.profile.get()

    expect(typeof result.lastReviewDate).toBe("string")
    expect(typeof result.createdAt).toBe("string")
    expect(result.lastReviewDate).toBe("2026-05-20T00:00:00.000Z")
    expect(result.createdAt).toBe("2025-01-10T00:00:00.000Z")
  })

  it("serializes null lastReviewDate to null (not ISO string)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...BASE_USER, lastReviewDate: null })

    const result = await caller.profile.get()

    expect(result.lastReviewDate).toBeNull()
  })

  it("throws NOT_FOUND when user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    await expect(caller.profile.get()).rejects.toThrow(TRPCError)
    await expect(caller.profile.get()).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("queries with userId scope", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(BASE_USER)

    await caller.profile.get()

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: USER_ID } }),
    )
  })
})

describe("profile.update — M-005 date serialization + M-004 cache gate", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller = appRouter.createCaller({ prisma: mockPrisma as any, supabase: mockSupabase as any, userId: USER_ID })
    vi.clearAllMocks()
    mockDeleteUser.mockResolvedValue({ error: null })
    mockPrisma.user.update.mockResolvedValue(BASE_USER)
  })

  it("returns Date fields as ISO strings, not Date objects", async () => {
    const result = await caller.profile.update({ name: "New Name" })

    expect(typeof result.createdAt).toBe("string")
    expect(typeof result.lastReviewDate).toBe("string")
    expect(result.createdAt).toBe("2025-01-10T00:00:00.000Z")
  })

  it("returns null for null lastReviewDate", async () => {
    mockPrisma.user.update.mockResolvedValue({ ...BASE_USER, lastReviewDate: null })

    const result = await caller.profile.update({ name: "New Name" })

    expect(result.lastReviewDate).toBeNull()
  })

  it("invalidates analytics cache when baseCurrency is sent (M-004 gate)", async () => {
    await caller.profile.update({ baseCurrency: "EUR" })

    expect(mockPrisma.tradeStatsCache.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
  })

  it("invalidates analytics cache when timezone is sent (M-004 gate)", async () => {
    await caller.profile.update({ timezone: "Europe/London" })

    expect(mockPrisma.tradeStatsCache.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
  })

  it("does NOT invalidate analytics cache when only name is sent (M-004 gate)", async () => {
    await caller.profile.update({ name: "New Name" })

    expect(mockPrisma.tradeStatsCache.deleteMany).not.toHaveBeenCalled()
  })

  it("does NOT invalidate analytics cache for emailNotifications-only change (M-004 gate)", async () => {
    await caller.profile.update({ emailNotifications: false })

    expect(mockPrisma.tradeStatsCache.deleteMany).not.toHaveBeenCalled()
  })

  it("throws BAD_REQUEST for invalid timezone", async () => {
    await expect(caller.profile.update({ timezone: "Not/ATimezone" })).rejects.toThrow(TRPCError)
  })

  it("throws BAD_REQUEST for invalid currency code", async () => {
    await expect(caller.profile.update({ baseCurrency: "US" })).rejects.toThrow(TRPCError)
  })
})

describe("profile.changePassword", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller = appRouter.createCaller({ prisma: mockPrisma as any, supabase: mockSupabase as any, userId: USER_ID })
    vi.clearAllMocks()
    mockDeleteUser.mockResolvedValue({ error: null })
  })

  it("returns { ok: true } on success", async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null })

    const result = await caller.profile.changePassword({ newPassword: "newpass123" })

    expect(result).toEqual({ ok: true })
  })

  it("throws BAD_REQUEST when supabase returns an error", async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({ error: { message: "Auth error" } })

    await expect(caller.profile.changePassword({ newPassword: "newpass123" })).rejects.toThrow(TRPCError)
    await expect(caller.profile.changePassword({ newPassword: "newpass123" })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  it("rejects passwords shorter than 8 chars at the input validation level", async () => {
    await expect(caller.profile.changePassword({ newPassword: "short" })).rejects.toThrow()
  })
})

describe("profile.deleteAccount — B-002 admin client fix", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller = appRouter.createCaller({ prisma: mockPrisma as any, supabase: mockSupabase as any, userId: USER_ID })
    vi.clearAllMocks()
    mockDeleteUser.mockResolvedValue({ error: null })
  })

  it("deletes user via Prisma and returns { ok: true }", async () => {
    const result = await caller.profile.deleteAccount()

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } })
    expect(result).toEqual({ ok: true })
  })

  it("calls the admin client deleteUser (not anon client) — B-002 fix", async () => {
    await caller.profile.deleteAccount()

    // The anon supabase ctx (ctx.supabase) must NOT have been used for admin.deleteUser.
    // The mocked createAdminClient's deleteUser must have been called instead.
    expect(mockDeleteUser).toHaveBeenCalledWith(USER_ID)
  })

  it("still returns { ok: true } when auth deletion fails (Prisma deletion already done)", async () => {
    mockDeleteUser.mockResolvedValue({ error: { message: "Auth error" } })

    const result = await caller.profile.deleteAccount()

    expect(result).toEqual({ ok: true })
  })

  it("performs Prisma deletion before auth deletion", async () => {
    const callOrder: string[] = []
    mockPrisma.user.delete.mockImplementation(() => { callOrder.push("prisma"); return Promise.resolve({}) })
    mockDeleteUser.mockImplementation(() => { callOrder.push("auth"); return Promise.resolve({ error: null }) })

    await caller.profile.deleteAccount()

    expect(callOrder).toEqual(["prisma", "auth"])
  })
})
