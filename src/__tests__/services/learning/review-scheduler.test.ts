import { describe, it, expect } from "vitest"
import {
  calcNextReviewAt,
  computeProgressPct,
  computeResourceStatus,
} from "@/domains/learning/services/review-scheduler"

const TODAY = new Date("2026-05-31T00:00:00Z")

function daysFromToday(n: number): Date {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + n)
  return d
}

// ── calcNextReviewAt ──────────────────────────────────────────────────────

describe("calcNextReviewAt", () => {
  it("masteryLevel 1 with interval 7 → 4 days (ceil(7/2))", () => {
    const result = calcNextReviewAt(7, 1, TODAY)
    expect(result.toDateString()).toBe(daysFromToday(4).toDateString())
  })

  it("masteryLevel 2 with interval 7 → 4 days (same as level 1)", () => {
    const result = calcNextReviewAt(7, 2, TODAY)
    expect(result.toDateString()).toBe(daysFromToday(4).toDateString())
  })

  it("masteryLevel 1 with interval 1 → 1 day (clamped from 0.5 → 1)", () => {
    const result = calcNextReviewAt(1, 1, TODAY)
    expect(result.toDateString()).toBe(daysFromToday(1).toDateString())
  })

  it("masteryLevel 3 with interval 7 → 7 days (no scaling)", () => {
    const result = calcNextReviewAt(7, 3, TODAY)
    expect(result.toDateString()).toBe(daysFromToday(7).toDateString())
  })

  it("masteryLevel 3 with interval 14 → 14 days", () => {
    const result = calcNextReviewAt(14, 3, TODAY)
    expect(result.toDateString()).toBe(daysFromToday(14).toDateString())
  })

  it("masteryLevel 4 with interval 7 → 11 days (round(7 × 1.5) = 11)", () => {
    const result = calcNextReviewAt(7, 4, TODAY)
    expect(result.toDateString()).toBe(daysFromToday(11).toDateString())
  })

  it("masteryLevel 5 with interval 7 → 11 days (same as level 4)", () => {
    const result = calcNextReviewAt(7, 5, TODAY)
    expect(result.toDateString()).toBe(daysFromToday(11).toDateString())
  })

  it("masteryLevel 4 with interval 30 → 45 days (round(30 × 1.5))", () => {
    const result = calcNextReviewAt(30, 4, TODAY)
    expect(result.toDateString()).toBe(daysFromToday(45).toDateString())
  })
})

// ── computeProgressPct ────────────────────────────────────────────────────

describe("computeProgressPct", () => {
  it("null totalUnits → null", () => {
    expect(computeProgressPct(5, null)).toBeNull()
  })

  it("totalUnits 0 → null", () => {
    expect(computeProgressPct(0, 0)).toBeNull()
  })

  it("halfway through → 50", () => {
    expect(computeProgressPct(50, 100)).toBe(50)
  })

  it("exceeding totalUnits is capped at 100", () => {
    expect(computeProgressPct(120, 100)).toBe(100)
  })

  it("zero progress → 0", () => {
    expect(computeProgressPct(0, 100)).toBe(0)
  })

  it("rounds to nearest integer", () => {
    // 1/3 = 33.33... → 33
    expect(computeProgressPct(1, 3)).toBe(33)
  })
})

// ── computeResourceStatus ─────────────────────────────────────────────────

describe("computeResourceStatus", () => {
  it("null totalUnits, no progress → PENDING", () => {
    expect(computeResourceStatus(0, null)).toBe("PENDING")
  })

  it("null totalUnits, some progress → IN_PROGRESS", () => {
    expect(computeResourceStatus(5, null)).toBe("IN_PROGRESS")
  })

  it("currentUnits === totalUnits → COMPLETED", () => {
    expect(computeResourceStatus(100, 100)).toBe("COMPLETED")
  })

  it("currentUnits > totalUnits → COMPLETED (overflow)", () => {
    expect(computeResourceStatus(110, 100)).toBe("COMPLETED")
  })

  it("currentUnits > 0, < totalUnits → IN_PROGRESS", () => {
    expect(computeResourceStatus(50, 100)).toBe("IN_PROGRESS")
  })

  it("currentUnits === 0 → PENDING", () => {
    expect(computeResourceStatus(0, 100)).toBe("PENDING")
  })
})
