import { describe, it, expect } from "vitest"
import { detectDecayedResources } from "@/domains/learning/services/decay-detector"
import type { ResourceForDecay } from "@/domains/learning/services/decay-detector"

const DAY_MS = 86_400_000
const today  = new Date("2026-05-31T00:00:00Z")

function daysAgo(n: number): Date {
  return new Date(today.getTime() - n * DAY_MS)
}

function resource(overrides: Partial<ResourceForDecay> & { id: string }): ResourceForDecay {
  return {
    id:             overrides.id,
    status:         overrides.status         ?? "MASTERED",
    nextReviewAt:   overrides.nextReviewAt   ?? null,
    reviewInterval: overrides.reviewInterval ?? 7,
  }
}

// ── detectDecayedResources ────────────────────────────────────────────────

describe("detectDecayedResources", () => {
  it("empty list → no ids", () => {
    expect(detectDecayedResources([], today)).toEqual([])
  })

  it("MASTERED resource overdue by reviewInterval×2 + 1 day → decayed", () => {
    // interval 7, threshold = 14 days; overdue by 15 days → decayed
    const r = resource({ id: "r1", nextReviewAt: daysAgo(15), reviewInterval: 7 })
    expect(detectDecayedResources([r], today)).toContain("r1")
  })

  it("MASTERED resource overdue by exactly reviewInterval×2 → NOT decayed (> not >=)", () => {
    // overdue by exactly 14 days → not past threshold
    const r = resource({ id: "r1", nextReviewAt: daysAgo(14), reviewInterval: 7 })
    expect(detectDecayedResources([r], today)).toEqual([])
  })

  it("MASTERED resource overdue by reviewInterval×2 - 1 → NOT decayed", () => {
    const r = resource({ id: "r1", nextReviewAt: daysAgo(13), reviewInterval: 7 })
    expect(detectDecayedResources([r], today)).toEqual([])
  })

  it("non-MASTERED status (IN_REVIEW) → not returned even if overdue", () => {
    const r = resource({ id: "r1", status: "IN_REVIEW", nextReviewAt: daysAgo(30) })
    expect(detectDecayedResources([r], today)).toEqual([])
  })

  it("MASTERED with null nextReviewAt → not returned", () => {
    const r = resource({ id: "r1", nextReviewAt: null })
    expect(detectDecayedResources([r], today)).toEqual([])
  })

  it("uses reviewInterval 7 as default when reviewInterval is null", () => {
    // null interval → default 7; threshold 14 days; overdue 15 → decayed
    const r = resource({ id: "r1", nextReviewAt: daysAgo(15), reviewInterval: null })
    expect(detectDecayedResources([r], today)).toContain("r1")
  })

  it("returns only the ids of decayed resources when list is mixed", () => {
    const decayed  = resource({ id: "r1", nextReviewAt: daysAgo(20) })
    const ok       = resource({ id: "r2", nextReviewAt: daysAgo(5) })
    const noDate   = resource({ id: "r3", nextReviewAt: null })
    const inReview = resource({ id: "r4", status: "IN_REVIEW", nextReviewAt: daysAgo(30) })

    const result = detectDecayedResources([decayed, ok, noDate, inReview], today)
    expect(result).toEqual(["r1"])
  })

  it("custom reviewInterval 30: threshold = 60 days", () => {
    const r61 = resource({ id: "r1", nextReviewAt: daysAgo(61), reviewInterval: 30 })
    const r60 = resource({ id: "r2", nextReviewAt: daysAgo(60), reviewInterval: 30 })
    const result = detectDecayedResources([r61, r60], today)
    expect(result).toContain("r1")
    expect(result).not.toContain("r2")
  })
})
