import { describe, it, expect } from "vitest"
import { masteryLevel, masteryStageIndex, isMastered, isReviewDue, MASTERY_MAX } from "@/app/aprendizaje/utils/mastery"

describe("mastery", () => {
  it("maps status to a 0–5 level; MASTERED is max", () => {
    expect(masteryLevel("PENDING")).toBe(0)
    expect(masteryLevel("IN_PROGRESS")).toBe(1)
    expect(masteryLevel("COMPLETED")).toBe(2)
    expect(masteryLevel("IN_REVIEW")).toBe(3)
    expect(masteryLevel("MASTERED")).toBe(MASTERY_MAX)
    expect(masteryLevel("ABANDONED")).toBe(0)
  })

  it("isMastered only for MASTERED", () => {
    expect(isMastered("MASTERED")).toBe(true)
    expect(isMastered("IN_REVIEW")).toBe(false)
  })

  it("stage index stays within bounds", () => {
    expect(masteryStageIndex("PENDING")).toBe(0)
    expect(masteryStageIndex("MASTERED")).toBe(4)
  })

  it("isReviewDue true for today/past, false for future/null", () => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today.getTime() - 86_400_000).toISOString()
    const tomorrow  = new Date(today.getTime() + 86_400_000).toISOString()
    expect(isReviewDue(yesterday)).toBe(true)
    expect(isReviewDue(today.toISOString())).toBe(true)
    expect(isReviewDue(tomorrow)).toBe(false)
    expect(isReviewDue(null)).toBe(false)
  })
})
