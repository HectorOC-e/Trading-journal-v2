/**
 * B-001 regression tests: computedDisciplineScore must add +1 day to weekEnd
 * before calling computeDisciplineScore(), because the service uses `lt: to`
 * (exclusive end). Without the +1, trades dated on the last day of the week
 * are excluded from the score.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { appRouter } from "@/server/trpc/root"

vi.mock("@/lib/prisma",          () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/supabase/admin",  () => ({ createAdminClient: vi.fn() }))
vi.mock("@/lib/ai/chat",         () => ({ streamChat: vi.fn() }))
vi.mock("@/lib/ai/config",       () => ({
  isAnyKeyConfigured:    vi.fn().mockReturnValue(false),
  getWeeklySummaryModel: vi.fn().mockReturnValue("claude-haiku"),
}))

vi.mock("@/domains/analytics/services/discipline-service", () => ({
  computeDisciplineScore: vi.fn(),
}))

import { computeDisciplineScore } from "@/domains/analytics/services/discipline-service"

const USER_ID = "test-user-id"

const MOCK_SCORE = {
  score:          80,
  executionScore: 70,
  learningScore:  90,
  adherenceScore: 80,
  detail:         {},
}

function makeMockPrisma() {
  return {
    trade:        { findMany: vi.fn().mockResolvedValue([]) },
    weeklyReview: {
      findMany:   vi.fn().mockResolvedValue([]),
      findFirst:  vi.fn().mockResolvedValue(null),
      create:     vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(),
    },
  }
}

describe("weeklyReviews.computedDisciplineScore — B-001 date-range fix", () => {
  let caller: ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(computeDisciplineScore).mockResolvedValue(MOCK_SCORE as any)
    caller = appRouter.createCaller({
      prisma:   makeMockPrisma() as any,
      supabase: {} as any,
      userId:   USER_ID,
    })
  })

  it("passes weekEnd + 1 day as `to` so that trades on the last day are included", async () => {
    await caller.weeklyReviews.computedDisciplineScore({
      weekStart: "2026-05-26",
      weekEnd:   "2026-06-01",
    })

    expect(computeDisciplineScore).toHaveBeenCalledWith(
      expect.anything(),
      USER_ID,
      {
        from: new Date("2026-05-26"),
        to:   new Date("2026-06-02"), // +1 day
      },
    )
  })

  it("the `to` date is exactly weekEnd + 1 calendar day, not 24 hours later (DST-safe)", async () => {
    await caller.weeklyReviews.computedDisciplineScore({
      weekStart: "2026-03-09",  // week spanning US DST transition
      weekEnd:   "2026-03-14",
    })

    const callArg = vi.mocked(computeDisciplineScore).mock.calls[0][2]
    const expectedTo = new Date("2026-03-14")
    expectedTo.setDate(expectedTo.getDate() + 1)  // 2026-03-15

    expect(callArg.to).toEqual(expectedTo)
  })

  it("returns the score / breakdown / detail shape from the service result", async () => {
    const result = await caller.weeklyReviews.computedDisciplineScore({
      weekStart: "2026-05-26",
      weekEnd:   "2026-06-01",
    })

    expect(result).toEqual({
      score:     80,
      breakdown: { execution: 70, learning: 90, adherence: 80 },
      detail:    {},
    })
  })
})

describe("weeklyReviews.prefill — date-range consistency", () => {
  let caller: ReturnType<typeof appRouter.createCaller>
  let mockPrisma: ReturnType<typeof makeMockPrisma>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(computeDisciplineScore).mockResolvedValue(MOCK_SCORE as any)
    mockPrisma = makeMockPrisma()
    caller = appRouter.createCaller({
      prisma:   mockPrisma as any,
      supabase: {} as any,
      userId:   USER_ID,
    })
  })

  it("prefill passes weekEnd + 1 day to both trade query and discipline service", async () => {
    await caller.weeklyReviews.prefill({
      weekStart: "2026-05-26",
      weekEnd:   "2026-06-01",
    })

    // computeDisciplineScore called with +1 day
    const [, , dateRange] = vi.mocked(computeDisciplineScore).mock.calls[0]
    expect(dateRange.to).toEqual(new Date("2026-06-02"))

    // Prisma trade query also uses +1 day (lt: exclusive)
    const tradeQuery = mockPrisma.trade.findMany.mock.calls[0][0]
    expect(tradeQuery.where.date.lt).toEqual(new Date("2026-06-02"))
    expect(tradeQuery.where.date.gte).toEqual(new Date("2026-05-26"))
  })

  it("prefill returns tradeCount and disciplineScore from service results", async () => {
    mockPrisma.trade.findMany.mockResolvedValue([
      { pnl: "100", rMultiple: "2", setupId: null, tags: [] },
      { pnl: "-50", rMultiple: "-1", setupId: null, tags: [] },
    ])

    const result = await caller.weeklyReviews.prefill({
      weekStart: "2026-05-26",
      weekEnd:   "2026-06-01",
    })

    expect(result.tradeCount).toBe(2)
    expect(result.netPnl).toBe(50)
    expect(result.disciplineScore).toBe(80) // from MOCK_SCORE
  })
})
