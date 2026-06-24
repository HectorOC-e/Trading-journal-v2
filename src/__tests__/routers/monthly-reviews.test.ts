import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { appRouter } from "@/server/trpc/root"

vi.mock("@/lib/prisma",        () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

const USER_ID = "user-monthly-test"

function makeMockPrisma() {
  return {
    monthlyReview: {
      findMany:   vi.fn(),
      findFirst:  vi.fn(),
      upsert:     vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(),
    },
    weeklyReview: {
      findMany:   vi.fn(),
    },
    // Used by loadMonthlyCardStats (cover metrics) and the report goals query.
    user:        { findUnique: vi.fn().mockResolvedValue({ baseCurrency: "USD", fxRates: null }) },
    account:     { findMany:   vi.fn().mockResolvedValue([]) },
    trade:       { findMany:   vi.fn().mockResolvedValue([]) },
    monthlyGoal: { findMany:   vi.fn().mockResolvedValue([]) },
  }
}

function makeReview(overrides: Record<string, unknown> = {}) {
  return {
    id:           "mr-1",
    userId:       USER_ID,
    year:         2026,
    month:        6,
    summary:      "Buen mes",
    keyThemes:    ["FOMO controlado"],
    goalsSet:     ["Reducir tamaño"],
    goalsMet:     [],
    overallScore: 74,
    weeklyIds:    ["wr-1", "wr-2"],
    createdAt:    new Date("2026-06-30T00:00:00Z"),
    updatedAt:    new Date("2026-06-30T00:00:00Z"),
    ...overrides,
  }
}

describe("monthlyReviews router", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>
  let caller:     ReturnType<typeof appRouter.createCaller>

  beforeEach(() => {
    mockPrisma = makeMockPrisma()
    caller = appRouter.createCaller({
      prisma:   mockPrisma as never,
      supabase: {} as never,
      userId:   USER_ID,
    })
  })

  // ── list ──────────────────────────────────────────────────────────────────
  it("list: returns serialized monthly reviews sorted by year/month desc", async () => {
    const reviews = [makeReview({ year: 2026, month: 6 }), makeReview({ id: "mr-2", year: 2026, month: 5 })]
    mockPrisma.monthlyReview.findMany.mockResolvedValue(reviews)

    const result = await caller.monthlyReviews.list()

    expect(mockPrisma.monthlyReview.findMany).toHaveBeenCalledWith({
      where:   { userId: USER_ID },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    })
    expect(result).toHaveLength(2)
    expect(typeof result[0].createdAt).toBe("string")
    expect(typeof result[0].updatedAt).toBe("string")
  })

  // ── get ───────────────────────────────────────────────────────────────────
  it("get: returns null when review does not exist", async () => {
    mockPrisma.monthlyReview.findFirst.mockResolvedValue(null)
    const result = await caller.monthlyReviews.get({ year: 2026, month: 1 })
    expect(result).toBeNull()
  })

  it("get: returns serialized review when found", async () => {
    mockPrisma.monthlyReview.findFirst.mockResolvedValue(makeReview())
    const result = await caller.monthlyReviews.get({ year: 2026, month: 6 })
    expect(result).not.toBeNull()
    expect(result!.year).toBe(2026)
    expect(result!.month).toBe(6)
  })

  // ── upsert ────────────────────────────────────────────────────────────────
  it("upsert: creates review with correct userId scope", async () => {
    const review = makeReview()
    mockPrisma.monthlyReview.upsert.mockResolvedValue(review)

    const result = await caller.monthlyReviews.upsert({
      year:         2026,
      month:        6,
      summary:      "Buen mes",
      keyThemes:    ["FOMO controlado"],
      goalsSet:     [],
      goalsMet:     [],
      overallScore: 74,
      weeklyIds:    [],
    })

    expect(mockPrisma.monthlyReview.upsert).toHaveBeenCalledWith({
      where:  { userId_year_month: { userId: USER_ID, year: 2026, month: 6 } },
      create: expect.objectContaining({ userId: USER_ID, year: 2026, month: 6 }),
      update: expect.any(Object),
    })
    expect(result.id).toBe("mr-1")
  })

  // ── delete ────────────────────────────────────────────────────────────────
  it("delete: throws NOT_FOUND for unknown review id", async () => {
    mockPrisma.monthlyReview.findFirst.mockResolvedValue(null)

    await expect(
      caller.monthlyReviews.delete("550e8400-e29b-41d4-a716-446655440001")
    ).rejects.toThrow(TRPCError)
  })

  it("delete: deletes review scoped to userId", async () => {
    const review = makeReview({ id: "550e8400-e29b-41d4-a716-446655440001" })
    mockPrisma.monthlyReview.findFirst.mockResolvedValue(review)
    mockPrisma.monthlyReview.delete.mockResolvedValue(review)

    const result = await caller.monthlyReviews.delete("550e8400-e29b-41d4-a716-446655440001")

    expect(mockPrisma.monthlyReview.delete).toHaveBeenCalledWith({
      where: { id: "550e8400-e29b-41d4-a716-446655440001", userId: USER_ID },
    })
    expect(result).toEqual({ ok: true })
  })

  // ── prefill ───────────────────────────────────────────────────────────────
  it("prefill: returns empty data when no weekly reviews exist", async () => {
    mockPrisma.weeklyReview.findMany.mockResolvedValue([])

    const result = await caller.monthlyReviews.prefill({ year: 2026, month: 6 })

    expect(result.weeklyIds).toHaveLength(0)
    expect(result.overallScore).toBeNull()
    expect(result.tradeCount).toBe(0)
  })

  it("prefill: aggregates discipline scores and trade counts from weekly reviews", async () => {
    mockPrisma.weeklyReview.findMany.mockResolvedValue([
      {
        id:              "wr-1",
        disciplineScore: 80,
        whatWorked:      "Respeté el plan",
        toImprove:       "Sizing",
        netPnl:          { toNumber: () => 500 },
        winRate:         { toNumber: () => 60 },
        tradeCount:      10,
      },
      {
        id:              "wr-2",
        disciplineScore: 60,
        whatWorked:      "Paciencia",
        toImprove:       "Entries",
        netPnl:          { toNumber: () => -200 },
        winRate:         { toNumber: () => 45 },
        tradeCount:      8,
      },
    ])

    const result = await caller.monthlyReviews.prefill({ year: 2026, month: 6 })

    expect(result.weeklyIds).toEqual(["wr-1", "wr-2"])
    expect(result.overallScore).toBe(70) // avg of 80 and 60
    expect(result.tradeCount).toBe(18)   // 10 + 8
    expect(result.netPnl).toBeCloseTo(300)
  })

  // ── prefill: discipline score filter (m-01 regression guard) ────────────

  it("prefill: zero disciplineScore is excluded from average (draft/unscored week)", async () => {
    mockPrisma.weeklyReview.findMany.mockResolvedValue([
      {
        id:              "wr-scored",
        disciplineScore: 80,
        whatWorked:      "Respetó el plan",
        toImprove:       null,
        netPnl:          { toNumber: () => 200 },
        winRate:         { toNumber: () => 65 },
        tradeCount:      8,
      },
      {
        id:              "wr-draft",
        disciplineScore: 0, // unscored/draft — must not drag down the average
        whatWorked:      null,
        toImprove:       null,
        netPnl:          { toNumber: () => 0 },
        winRate:         { toNumber: () => 0 },
        tradeCount:      0,
      },
    ])

    const result = await caller.monthlyReviews.prefill({ year: 2026, month: 6 })

    // With the filter active: avg of [80] = 80, not avg of [80, 0] = 40
    expect(result.overallScore).toBe(80)
  })

  it("prefill: returns null overallScore when all weekly scores are zero (all drafts)", async () => {
    mockPrisma.weeklyReview.findMany.mockResolvedValue([
      {
        id:              "wr-draft-1",
        disciplineScore: 0,
        whatWorked:      null,
        toImprove:       null,
        netPnl:          { toNumber: () => 0 },
        winRate:         { toNumber: () => 0 },
        tradeCount:      0,
      },
    ])

    const result = await caller.monthlyReviews.prefill({ year: 2026, month: 6 })

    expect(result.overallScore).toBeNull()
  })

  // ── ownership check ───────────────────────────────────────────────────────
  it("list: scopes query to authenticated userId only", async () => {
    mockPrisma.monthlyReview.findMany.mockResolvedValue([])

    await caller.monthlyReviews.list()

    const callArg = mockPrisma.monthlyReview.findMany.mock.calls[0][0]
    expect(callArg.where.userId).toBe(USER_ID)
  })
})
