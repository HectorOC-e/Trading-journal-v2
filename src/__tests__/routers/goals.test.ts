/**
 * TASK-050c: Goal Validation Tests
 * Verifies min/max constraints on goal fields.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { appRouter } from "@/server/trpc/root"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

const USER_ID = "550e8400-e29b-41d4-a716-446655440001"

const GOAL_RESULT = {
  disciplineGoal:      75,
  onboardingCompleted: false,
  weeklyTradesGoal:    null,
  weeklyPnlGoal:       null,
}

function makeMockPrisma() {
  return {
    user: {
      update: vi.fn().mockResolvedValue(GOAL_RESULT),
    },
  }
}

const mockSupabase = { auth: {} }

describe("goals.set", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller     = appRouter.createCaller({ prisma: mockPrisma as any, supabase: mockSupabase as any, userId: USER_ID })
  })

  it("sets disciplineGoal between 0 and 100", async () => {
    await expect(caller.goals.set({ disciplineGoal: 75 })).resolves.not.toThrow()
    await expect(caller.goals.set({ disciplineGoal: 0 })).resolves.not.toThrow()
    await expect(caller.goals.set({ disciplineGoal: 100 })).resolves.not.toThrow()
  })

  it("rejects disciplineGoal > 100", async () => {
    await expect(caller.goals.set({ disciplineGoal: 101 })).rejects.toThrow()
  })

  it("rejects disciplineGoal < 0", async () => {
    await expect(caller.goals.set({ disciplineGoal: -1 })).rejects.toThrow()
  })

  it("sets onboardingCompleted to true", async () => {
    mockPrisma.user.update.mockResolvedValue({ ...GOAL_RESULT, onboardingCompleted: true })
    const result = await caller.goals.set({ onboardingCompleted: true })
    expect(result.onboardingCompleted).toBe(true)
  })

  it("updates only provided fields", async () => {
    await caller.goals.set({ disciplineGoal: 80 })
    const call = mockPrisma.user.update.mock.calls[0][0]
    expect(call.data).toEqual({ disciplineGoal: 80 })
    expect(call.data.onboardingCompleted).toBeUndefined()
  })

  it("allows empty update (no fields)", async () => {
    await expect(caller.goals.set({})).resolves.not.toThrow()
  })
})

describe("profile.update — weeklyTradesGoal validation", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller: ReturnType<typeof appRouter.createCaller>

  const BASE_USER_SELECT = {
    id:                 USER_ID,
    email:              "trader@example.com",
    name:               "Test",
    role:               "USER",
    timezone:           "UTC",
    baseCurrency:       "USD",
    language:           "es",
    weeklyGoalMinutes:  300,
    emailNotifications: true,
    currentStreak:      0,
    bestStreak:         0,
    lastReviewDate:     null,
    createdAt:          new Date(),
  }

  beforeEach(() => {
    mockPrisma = {
      user: {
        update: vi.fn().mockResolvedValue(BASE_USER_SELECT),
        findUnique: vi.fn(),
      },
      tradeStatsCache: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    } as never
    caller = appRouter.createCaller({ prisma: mockPrisma as any, supabase: mockSupabase as any, userId: USER_ID })
  })

  it("accepts weeklyTradesGoal 1–500", async () => {
    await expect(caller.profile.update({ weeklyTradesGoal: 1 })).resolves.not.toThrow()
    await expect(caller.profile.update({ weeklyTradesGoal: 500 })).resolves.not.toThrow()
  })

  it("rejects weeklyTradesGoal = 0", async () => {
    await expect(caller.profile.update({ weeklyTradesGoal: 0 })).rejects.toThrow()
  })

  it("rejects weeklyTradesGoal > 500", async () => {
    await expect(caller.profile.update({ weeklyTradesGoal: 501 })).rejects.toThrow()
  })

  it("accepts weeklyPnlGoal 100–1_000_000", async () => {
    await expect(caller.profile.update({ weeklyPnlGoal: 100 })).resolves.not.toThrow()
    await expect(caller.profile.update({ weeklyPnlGoal: 1_000_000 })).resolves.not.toThrow()
  })

  it("rejects weeklyPnlGoal < 100", async () => {
    await expect(caller.profile.update({ weeklyPnlGoal: 99 })).rejects.toThrow()
  })

  it("rejects weeklyPnlGoal > 1_000_000", async () => {
    await expect(caller.profile.update({ weeklyPnlGoal: 1_000_001 })).rejects.toThrow()
  })

  it("accepts null to clear goal", async () => {
    await expect(caller.profile.update({ weeklyTradesGoal: null })).resolves.not.toThrow()
    await expect(caller.profile.update({ weeklyPnlGoal: null })).resolves.not.toThrow()
  })
})
