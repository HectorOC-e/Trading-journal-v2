import { describe, it, expect } from "vitest"
import { computeNextReview } from "@/domains/learning/srs"

describe("computeNextReview (#45)", () => {
  it("schedules the first successful review at 1 day", () => {
    const r = computeNextReview({ currentInterval: null, reps: 0, ease: 2.5, grade: 5 })
    expect(r.interval).toBe(1)
    expect(r.reps).toBe(1)
    expect(r.lapsed).toBe(false)
  })

  it("schedules the second successful review at 6 days", () => {
    expect(computeNextReview({ currentInterval: 1, reps: 1, ease: 2.5, grade: 4 }).interval).toBe(6)
  })

  it("multiplies by the ease factor from the third review on", () => {
    const r = computeNextReview({ currentInterval: 6, reps: 2, ease: 2.5, grade: 4 })
    expect(r.interval).toBe(15) // round(6 × 2.5)
    expect(r.reps).toBe(3)
  })

  it("lapses to 1 day and resets reps on a failed recall", () => {
    const r = computeNextReview({ currentInterval: 30, reps: 5, ease: 2.5, grade: 2 })
    expect(r.lapsed).toBe(true)
    expect(r.interval).toBe(1)
    expect(r.reps).toBe(0)
  })

  it("shortens the interval when the linked setup's edge is decaying (#45)", () => {
    const base = computeNextReview({ currentInterval: 6, reps: 2, ease: 2.5, grade: 4 }).interval
    const decaying = computeNextReview({ currentInterval: 6, reps: 2, ease: 2.5, grade: 4, performance: "decaying" }).interval
    expect(decaying).toBeLessThan(base)
  })

  it("lengthens the interval when the linked setup's edge is improving", () => {
    const base = computeNextReview({ currentInterval: 6, reps: 2, ease: 2.5, grade: 4 }).interval
    const improving = computeNextReview({ currentInterval: 6, reps: 2, ease: 2.5, grade: 4, performance: "improving" }).interval
    expect(improving).toBeGreaterThan(base)
  })

  it("clamps the ease factor at the SM-2 floor of 1.3", () => {
    let ease = 1.3
    for (let i = 0; i < 5; i++) ease = computeNextReview({ currentInterval: 10, reps: 3, ease, grade: 3 }).ease
    expect(ease).toBeGreaterThanOrEqual(1.3)
  })
})
