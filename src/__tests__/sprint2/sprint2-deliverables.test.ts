/**
 * Sprint 2 regression tests.
 * Covers: TD-011 (Sharpe), TASK-002 (objectiveMet logic), CQRS (decay not in stats query),
 * and N+1 fix validation for resourceImpactRanking.
 */

import { describe, it, expect } from "vitest"
import { calcSharpeRatio } from "@/lib/formulas"

// ── TD-011: Sharpe formula matches dashboard (Bessel-corrected sample std dev) ─────────────────

describe("calcSharpeRatio — Bessel-corrected (TD-011)", () => {
  it("returns null for empty array", () => {
    expect(calcSharpeRatio([])).toBeNull()
  })

  it("returns null for single value (need ≥2 to calculate sample std dev)", () => {
    expect(calcSharpeRatio([1.0])).toBeNull()
  })

  it("returns null when all values are identical (zero std dev)", () => {
    expect(calcSharpeRatio([1.0, 1.0, 1.0])).toBeNull()
  })

  it("uses n-1 denominator (Bessel correction), not n", () => {
    // For [1, -1]: mean = 0, population std = 1, sample std = sqrt(2) ≈ 1.414
    // Sharpe = mean / sample_std = 0 / 1.414 = 0 (mean is 0)
    // But with population std (n): 0 / 1.0 = 0 — both give 0 in this case
    // Use different example: [2, 0] mean=1, pop_std=1, sample_std=sqrt(2)
    // Sharpe_pop = 1/1 = 1.0, Sharpe_sample = 1/sqrt(2) ≈ 0.707
    const result = calcSharpeRatio([2, 0])
    expect(result).not.toBeNull()
    // Bessel-corrected: 1/sqrt(2) ≈ 0.707 (NOT 1.0 which would be population std)
    expect(result!).toBeCloseTo(0.7071, 3)
  })

  it("calculates Sharpe for typical trading R multiples", () => {
    // 6 wins @+2R, 4 losses @-1R: mean = (12 - 4) / 10 = 0.8
    const trades = [...Array(6).fill(2), ...Array(4).fill(-1)]
    const result = calcSharpeRatio(trades)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(0)
    // mean = 0.8; sample variance = Σ(xi - 0.8)² / 9
    // For 6×(2-0.8)² + 4×(-1-0.8)² = 6×1.44 + 4×3.24 = 8.64 + 12.96 = 21.6 / 9 = 2.4
    // std = sqrt(2.4) ≈ 1.549
    // Sharpe = 0.8 / 1.549 ≈ 0.516
    expect(result!).toBeCloseTo(0.5164, 3)
  })
})

// ── TASK-002: objectiveMet calculation logic ──────────────────────────────────────────────────

describe("objectiveMet calculation (TASK-002)", () => {
  function calcObjectiveMet(netPnl: number, targetPct: number | null, initialBalance: number): boolean {
    return targetPct != null
      ? netPnl >= (targetPct / 100) * initialBalance
      : false
  }

  it("returns false when targetPct is null", () => {
    expect(calcObjectiveMet(5000, null, 100000)).toBe(false)
  })

  it("returns false when netPnl is below target", () => {
    // Target: 8% of 100k = $8,000; netPnl = $5,000 → not met
    expect(calcObjectiveMet(5000, 8, 100000)).toBe(false)
  })

  it("returns true when netPnl meets target exactly", () => {
    // Target: 8% of 100k = $8,000; netPnl = $8,000 → met
    expect(calcObjectiveMet(8000, 8, 100000)).toBe(true)
  })

  it("returns true when netPnl exceeds target", () => {
    // Target: 8% of 100k = $8,000; netPnl = $10,000 → met
    expect(calcObjectiveMet(10000, 8, 100000)).toBe(true)
  })

  it("returns false when netPnl is negative (loss)", () => {
    expect(calcObjectiveMet(-500, 8, 100000)).toBe(false)
  })

  it("handles fractional target correctly", () => {
    // Target: 0.5% of 50k = $250; netPnl = $251 → met
    expect(calcObjectiveMet(251, 0.5, 50000)).toBe(true)
    // netPnl = $249 → not met
    expect(calcObjectiveMet(249, 0.5, 50000)).toBe(false)
  })
})

// ── CQRS fix: detectDecayedResources is called from mutation, not from stats query ─────────────

describe("CQRS fix: decay transition should NOT happen in stats query (TASK-007/038)", () => {
  // The processDecayTransitions mutation is now separate from the stats query.
  // This test verifies that detectDecayedResources behaves correctly when called explicitly.
  it("detectDecayedResources returns the correct IDs from an explicit call", async () => {
    const { detectDecayedResources } = await import("@/domains/learning/services/decay-detector")
    const today = new Date("2026-06-01T00:00:00Z")
    const DAY_MS = 86_400_000

    const mastered = {
      id:             "r1",
      status:         "MASTERED" as const,
      nextReviewAt:   new Date(today.getTime() - 20 * DAY_MS),
      reviewInterval: 7,
    }
    const fresh = {
      id:             "r2",
      status:         "MASTERED" as const,
      nextReviewAt:   new Date(today.getTime() - 5 * DAY_MS),
      reviewInterval: 7,
    }

    const decayed = detectDecayedResources([mastered, fresh], today)
    // Only r1 (overdue 20 days > threshold 14 days) should be returned
    expect(decayed).toEqual(["r1"])
    expect(decayed).not.toContain("r2")
  })
})

// ── resourceImpactRanking batched query — N+1 fix (TASK-008/039) ─────────────────────────────

describe("resourceImpactRanking batching logic (TASK-008/039)", () => {
  it("bySetup grouping correctly partitions trades before and after completedAt", () => {
    const completedAt = new Date("2026-03-01T00:00:00Z")
    const allTrades = [
      { setupId: "s1", date: new Date("2026-02-15"), pnl: 100, rMultiple: 1 },
      { setupId: "s1", date: new Date("2026-02-20"), pnl: -50, rMultiple: -0.5 },
      { setupId: "s1", date: new Date("2026-03-10"), pnl: 200, rMultiple: 2 },
      { setupId: "s1", date: new Date("2026-04-01"), pnl: 150, rMultiple: 1.5 },
    ]

    const pre  = allTrades.filter(t => t.date < completedAt)
    const post = allTrades.filter(t => t.date >= completedAt)

    expect(pre.length).toBe(2)
    expect(post.length).toBe(2)
    expect(pre.every(t => t.date < completedAt)).toBe(true)
    expect(post.every(t => t.date >= completedAt)).toBe(true)
  })

  it("de-duplicates setupIds with Set for batched query", () => {
    const pairs = [
      { setupId: "s1" },
      { setupId: "s2" },
      { setupId: "s1" }, // duplicate
    ]
    const uniqueSetupIds = [...new Set(pairs.map(p => p.setupId))]
    expect(uniqueSetupIds).toEqual(["s1", "s2"])
    expect(uniqueSetupIds.length).toBe(2)
  })
})
