import { describe, it, expect, vi, type Mock } from "vitest"
import { computeDisciplineScore } from "@/domains/analytics/services/discipline-service"
import type { PrismaClient } from "@/lib/generated/prisma/client"

function makePrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    trade: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    resourceReview: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    learningResource: {
      count: vi.fn().mockResolvedValue(0),
    },
    rule: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    ...overrides,
  } as unknown as PrismaClient
}

const period = {
  from: new Date("2026-05-26"),
  to:   new Date("2026-06-01"),
}

describe("computeDisciplineScore", () => {
  it("returns perfect score when no trades and no violations", async () => {
    const prisma = makePrisma()
    const result = await computeDisciplineScore(prisma, "user-1", period)

    expect(result.score).toBe(100)
    expect(result.executionScore).toBe(50)
    expect(result.learningScore).toBe(30)
    expect(result.adherenceScore).toBe(20)
  })

  it("reduces execution score proportional to violation tags", async () => {
    const prisma = makePrisma({
      trade: {
        findMany: vi.fn().mockResolvedValue([
          { tags: ["A+", "Plan"] },           // clean
          { tags: ["Impulsivo"] },             // violation
          { tags: ["Off-plan"] },              // violation
          { tags: [] },                        // clean
        ]),
      },
    })
    const result = await computeDisciplineScore(prisma, "user-1", period)

    // 2 violations out of 4 trades → execution = (4-2)/4 * 50 = 25
    expect(result.executionScore).toBe(25)
    expect(result.detail.violatingTrades).toBe(2)
    expect(result.detail.tradeCount).toBe(4)
  })

  it("reduces learning score when pending reviews exceed completed", async () => {
    const prisma = makePrisma({
      learningResource: { count: vi.fn().mockResolvedValue(10) },
      resourceReview:   { findMany: vi.fn().mockResolvedValue([{}, {}, {}]) }, // 3 done
    })
    const result = await computeDisciplineScore(prisma, "user-1", period)

    // 3/10 learning resources reviewed → learning = (3/10) * 30 = 9
    expect(result.learningScore).toBe(9)
    expect(result.detail.reviewsDone).toBe(3)
    expect(result.detail.pendingReviews).toBe(10)
  })

  it("reduces adherence score when violations exceed zero", async () => {
    const prisma = makePrisma({
      trade: {
        findMany: vi.fn().mockResolvedValue([
          { tags: ["Impulsivo"] }, // violation
          { tags: [] },
        ]),
      },
      rule: {
        findMany: vi.fn().mockResolvedValue([{ id: "r1" }, { id: "r2" }, { id: "r3" }]),
      },
    })
    const result = await computeDisciplineScore(prisma, "user-1", period)

    // 1 violation, 3 rules → violatedRules = min(1, 3) = 1
    // adherence = (3-1)/3 * 20 ≈ 13.33
    expect(result.adherenceScore).toBeCloseTo(13.33, 1)
    expect(result.detail.enabledRules).toBe(3)
  })

  it("caps violatedRules at totalEnabledRules", async () => {
    // 5 violations but only 2 rules — violatedRules should be capped at 2
    const prisma = makePrisma({
      trade: {
        findMany: vi.fn().mockResolvedValue([
          { tags: ["Impulsivo"] },
          { tags: ["Off-plan"] },
          { tags: ["Revanche"] },
          { tags: ["Impulsivo"] },
          { tags: ["Off-plan"] },
        ]),
      },
      rule: {
        findMany: vi.fn().mockResolvedValue([{ id: "r1" }, { id: "r2" }]),
      },
    })
    const result = await computeDisciplineScore(prisma, "user-1", period)
    // adherence = (2 - min(5,2)) / 2 * 20 = 0/2 * 20 = 0
    expect(result.adherenceScore).toBe(0)
  })

  it("passes accountId filter to trade query", async () => {
    const prisma = makePrisma()
    const tradeFindMany = prisma.trade.findMany as Mock

    await computeDisciplineScore(prisma, "user-1", period, "account-abc")

    expect(tradeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ accountId: "account-abc" }),
      })
    )
  })

  it("populates detail correctly", async () => {
    const prisma = makePrisma({
      trade: {
        findMany: vi.fn().mockResolvedValue([
          { tags: ["A+"] },
          { tags: [] },
        ]),
      },
      resourceReview:   { findMany: vi.fn().mockResolvedValue([{}, {}]) },
      learningResource: { count: vi.fn().mockResolvedValue(4) },
      rule:             { findMany: vi.fn().mockResolvedValue([{ id: "r1" }]) },
    })
    const result = await computeDisciplineScore(prisma, "user-1", period)

    expect(result.detail.tradeCount).toBe(2)
    expect(result.detail.violatingTrades).toBe(0)
    expect(result.detail.reviewsDone).toBe(2)
    expect(result.detail.pendingReviews).toBe(4)
    expect(result.detail.enabledRules).toBe(1)
  })
})
