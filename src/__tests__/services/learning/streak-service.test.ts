import { describe, it, expect } from "vitest"
import { computeNewStreak } from "@/domains/learning/services/streak-service"

const day = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`)

// ── computeNewStreak ──────────────────────────────────────────────────────

describe("computeNewStreak", () => {
  it("first review ever (lastReviewDate = null) → streak 1", () => {
    const { newStreak } = computeNewStreak(null, 0, day("2026-05-30"))
    expect(newStreak).toBe(1)
  })

  it("same day (two reviews on same day) → streak unchanged", () => {
    const { newStreak } = computeNewStreak(day("2026-05-30"), 5, day("2026-05-30"))
    expect(newStreak).toBe(5)
  })

  it("consecutive day → streak + 1", () => {
    const { newStreak } = computeNewStreak(day("2026-05-29"), 5, day("2026-05-30"))
    expect(newStreak).toBe(6)
  })

  it("gap of 2 days → streak resets to 1", () => {
    const { newStreak } = computeNewStreak(day("2026-05-28"), 5, day("2026-05-30"))
    expect(newStreak).toBe(1)
  })

  it("gap of 7 days → streak resets to 1", () => {
    const { newStreak } = computeNewStreak(day("2026-05-23"), 10, day("2026-05-30"))
    expect(newStreak).toBe(1)
  })

  it("returned lastReviewDate is set to today (midnight)", () => {
    const today = day("2026-05-30")
    const { lastReviewDate } = computeNewStreak(null, 0, today)
    expect(lastReviewDate.toISOString().slice(0, 10)).toBe("2026-05-30")
    expect(lastReviewDate.getHours()).toBe(0)
    expect(lastReviewDate.getMinutes()).toBe(0)
  })

  it("building streak over multiple consecutive days", () => {
    let streak = 0
    let last: Date | null = null
    const days = ["2026-05-01", "2026-05-02", "2026-05-03"]
    for (const d of days) {
      const result = computeNewStreak(last, streak, day(d))
      streak = result.newStreak
      last   = result.lastReviewDate
    }
    expect(streak).toBe(3)
  })

  it("streak reset after a gap, then rebuilds from 1", () => {
    let last: Date | null = day("2026-05-01")
    let streak = 7

    // Gap: skip to May 3rd (2-day gap)
    const { newStreak: afterGap, lastReviewDate: d2 } = computeNewStreak(last, streak, day("2026-05-03"))
    expect(afterGap).toBe(1)

    // Consecutive next day
    const { newStreak: afterConsecutive } = computeNewStreak(d2, afterGap, day("2026-05-04"))
    expect(afterConsecutive).toBe(2)
  })
})
