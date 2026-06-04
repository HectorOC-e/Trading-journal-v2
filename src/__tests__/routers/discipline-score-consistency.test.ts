/**
 * TASK-011d: Discipline Score Consistency Tests
 *
 * Verifies that the server-side discipline score computation is consistent
 * across all call sites. The frontend modal (create-review-modal.tsx) was
 * intentionally updated to use the server prefill value instead of a local
 * calculation — these tests lock in the server formula.
 */
import { describe, it, expect } from "vitest"
import { calcDisciplineScore } from "@/lib/formulas/discipline"
import { computeDisciplineScore } from "@/domains/analytics/services/discipline-service"

// ── Pure formula tests (calcDisciplineScore) ─────────────────────────────────

describe("calcDisciplineScore — canonical formula", () => {
  it("perfect week: returns 100", () => {
    const r = calcDisciplineScore({
      totalTrades: 10, taggedViolations: 0,
      pendingReviews: 5, completedReviews: 5,
      totalEnabledRules: 8, violatedRules: 0,
    })
    expect(r.score).toBe(100)
    expect(r.executionScore).toBe(50)
    expect(r.learningScore).toBe(30)
    expect(r.adherenceScore).toBe(20)
  })

  it("zero trades, zero resources, zero rules → 50 (no trade evidence = 0 execution)", () => {
    const r = calcDisciplineScore({
      totalTrades: 0, taggedViolations: 0,
      pendingReviews: 0, completedReviews: 0,
      totalEnabledRules: 0, violatedRules: 0,
    })
    // No trades → executionScore = 0 (no evidence); learning/adherence default to max
    expect(r.score).toBe(50)
  })

  it("all violations → 0 execution score", () => {
    const r = calcDisciplineScore({
      totalTrades: 5, taggedViolations: 5,
      pendingReviews: 0, completedReviews: 0,
      totalEnabledRules: 0, violatedRules: 0,
    })
    expect(r.executionScore).toBe(0)
    expect(r.score).toBe(50) // 0 (exec) + 30 (learning, no pending) + 20 (adherence, no rules)
  })

  it("mixed performance: 5 violations/20 trades, 3 reviews done / 10 pending, 1 violated rule / 5 total", () => {
    const r = calcDisciplineScore({
      totalTrades: 20, taggedViolations: 5,
      pendingReviews: 10, completedReviews: 3,
      totalEnabledRules: 5, violatedRules: 1,
    })
    // execution: (15/20) * 50 = 37.5
    expect(r.executionScore).toBeCloseTo(37.5)
    // learning: (3/10) * 30 = 9
    expect(r.learningScore).toBeCloseTo(9)
    // adherence: (4/5) * 20 = 16
    expect(r.adherenceScore).toBeCloseTo(16)
    // total: round(37.5 + 9 + 16) = 62 (not 63, because round(62.5) = 63 in JS actually)
    expect(r.score).toBe(Math.round(37.5 + 9 + 16))
  })

  it("only violations (no learning, no rules) → 0 score", () => {
    const r = calcDisciplineScore({
      totalTrades: 3, taggedViolations: 3,
      pendingReviews: 5, completedReviews: 0,
      totalEnabledRules: 3, violatedRules: 3,
    })
    expect(r.executionScore).toBe(0)
    expect(r.learningScore).toBe(0)
    expect(r.adherenceScore).toBe(0)
    expect(r.score).toBe(0)
  })

  it("all learning completed, no pending", () => {
    const r = calcDisciplineScore({
      totalTrades: 0, taggedViolations: 0,
      pendingReviews: 0, completedReviews: 10,
      totalEnabledRules: 0, violatedRules: 0,
    })
    // No pending = full learning score; no trades → execution = 0
    expect(r.learningScore).toBe(30)
    expect(r.score).toBe(50) // 0 (exec) + 30 (learning) + 20 (adherence)
  })

  it("score is always 0–100", () => {
    const extremes = [
      { totalTrades: 0, taggedViolations: 0, pendingReviews: 0, completedReviews: 0, totalEnabledRules: 0, violatedRules: 0 },
      { totalTrades: 100, taggedViolations: 100, pendingReviews: 100, completedReviews: 0, totalEnabledRules: 50, violatedRules: 50 },
      { totalTrades: 1, taggedViolations: 0, pendingReviews: 1, completedReviews: 1, totalEnabledRules: 1, violatedRules: 0 },
    ]
    extremes.forEach(params => {
      const r = calcDisciplineScore(params)
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(100)
    })
  })
})

// ── Service consistency: computeDisciplineScore calls calcDisciplineScore ─────

describe("computeDisciplineScore — calls canonical formula", () => {
  it("delegates to calcDisciplineScore with correct params", async () => {
    const mockPrisma = {
      trade: {
        findMany: async () => [
          { tags: ["A+"] },
          { tags: ["Impulsivo"] }, // violation
          { tags: [] },
        ],
      },
      resourceReview: {
        findMany: async () => [{ id: "rev-1" }],
      },
      learningResource: {
        count: async () => 2, // 2 pending
      },
      rule: {
        findMany: async () => [{ id: "r1" }, { id: "r2" }], // 2 enabled rules
      },
    } as never

    const result = await computeDisciplineScore(
      mockPrisma,
      "user-1",
      { from: new Date("2026-06-02"), to: new Date("2026-06-09") },
    )

    // 3 trades, 1 violation → execution: (2/3)*50 ≈ 33.33
    expect(result.executionScore).toBeCloseTo(33.33, 1)
    // 1 review done / 2 pending → learning: (1/2)*30 = 15
    expect(result.learningScore).toBe(15)
    // 1 violated rule / 2 total → adherence: (1/2)*20 = 10
    expect(result.adherenceScore).toBe(10)
    // total: round(33.33 + 15 + 10) = 58
    expect(result.score).toBe(Math.round(33.33 + 15 + 10))
  })

  it("detail metadata is correct", async () => {
    const mockPrisma = {
      trade: { findMany: async () => [{ tags: [] }, { tags: ["Revanche"] }] },
      resourceReview: { findMany: async () => [] },
      learningResource: { count: async () => 0 },
      rule: { findMany: async () => [{ id: "r1" }] },
    } as never

    const result = await computeDisciplineScore(
      mockPrisma,
      "user-1",
      { from: new Date("2026-06-02"), to: new Date("2026-06-09") },
    )

    expect(result.detail.tradeCount).toBe(2)
    expect(result.detail.violatingTrades).toBe(1)
    expect(result.detail.reviewsDone).toBe(0)
    expect(result.detail.pendingReviews).toBe(0)
    expect(result.detail.enabledRules).toBe(1)
  })
})
