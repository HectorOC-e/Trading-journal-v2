import { describe, it, expect } from "vitest"
import { buildLearningDigest, type DigestInput } from "@/domains/learning/services/digest-builder"
import { isStreakAtRisk } from "@/domains/learning/services/streak-service"

const d = (iso: string) => new Date(`${iso}T00:00:00Z`)

const base: DigestInput = {
  name: "Héctor",
  todayLocalISO: "2026-06-19",
  streak: { current: 0, best: 21, lastReviewDate: null },
  needsReview: [],
  progress: { minutesThisWeek: 0, goalMinutes: 300 },
  plannedSession: null,
}

describe("isStreakAtRisk", () => {
  it("false when streak is 0 or no last review", () => {
    expect(isStreakAtRisk(null, 5, "2026-06-19")).toBe(false)
    expect(isStreakAtRisk(d("2026-06-18"), 0, "2026-06-19")).toBe(false)
  })
  it("false when already reviewed today", () => {
    expect(isStreakAtRisk(d("2026-06-19"), 5, "2026-06-19")).toBe(false)
  })
  it("true when last review was yesterday", () => {
    expect(isStreakAtRisk(d("2026-06-18"), 5, "2026-06-19")).toBe(true)
  })
  it("false when last review was before yesterday (already broken)", () => {
    expect(isStreakAtRisk(d("2026-06-17"), 5, "2026-06-19")).toBe(false)
  })
})

describe("buildLearningDigest", () => {
  it("isEmpty when nothing to act on (no reviews, no risk, no session)", () => {
    const m = buildLearningDigest(base)
    expect(m.isEmpty).toBe(true)
    expect(m.reviews).toHaveLength(0)
  })

  it("not empty when streak is at risk", () => {
    const m = buildLearningDigest({
      ...base,
      streak: { current: 12, best: 21, lastReviewDate: d("2026-06-18") },
    })
    expect(m.isEmpty).toBe(false)
    expect(m.streak.atRisk).toBe(true)
    expect(m.streak.current).toBe(12)
  })

  it("not empty when there is a planned session even without reviews", () => {
    const m = buildLearningDigest({ ...base, plannedSession: { title: "ICT" } })
    expect(m.isEmpty).toBe(false)
    expect(m.plannedSession?.title).toBe("ICT")
  })

  it("classifies kind: today / overdue / decay and sorts by most overdue", () => {
    const m = buildLearningDigest({
      ...base,
      needsReview: [
        { id: "a", title: "Hoy", nextReviewAt: d("2026-06-19"), isDecay: false },
        { id: "b", title: "Vencido 3", nextReviewAt: d("2026-06-16"), isDecay: false },
        { id: "c", title: "Decay 5", nextReviewAt: d("2026-06-14"), isDecay: true },
      ],
    })
    expect(m.isEmpty).toBe(false)
    expect(m.reviews.map(r => r.id)).toEqual(["c", "b", "a"]) // most overdue first
    expect(m.reviews.find(r => r.id === "a")!.kind).toBe("today")
    expect(m.reviews.find(r => r.id === "b")!.kind).toBe("overdue")
    expect(m.reviews.find(r => r.id === "c")!.kind).toBe("decay")
    expect(m.reviews.find(r => r.id === "b")!.overdueDays).toBe(3)
  })

  it("dedupes by resource id, keeping the most-overdue entry", () => {
    const m = buildLearningDigest({
      ...base,
      needsReview: [
        { id: "x", title: "Dup", nextReviewAt: d("2026-06-18"), isDecay: true },
        { id: "x", title: "Dup", nextReviewAt: d("2026-06-15"), isDecay: false },
      ],
    })
    expect(m.reviewCount).toBe(1)
    expect(m.reviews).toHaveLength(1)
    expect(m.reviews[0].overdueDays).toBe(4)
  })

  it("ignores not-yet-due resources", () => {
    const m = buildLearningDigest({
      ...base,
      needsReview: [{ id: "future", title: "Mañana", nextReviewAt: d("2026-06-25"), isDecay: false }],
    })
    expect(m.reviewCount).toBe(0)
    expect(m.isEmpty).toBe(true)
  })

  it("caps at MAX_REVIEWS but reviewCount reflects the true total", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: `r${i}`, title: `R${i}`, nextReviewAt: d("2026-06-10"), isDecay: false,
    }))
    const m = buildLearningDigest({ ...base, needsReview: many })
    expect(m.reviews).toHaveLength(5)
    expect(m.reviewCount).toBe(8)
  })

  it("computes progress pct clamped 0–100; guards goal=0", () => {
    expect(buildLearningDigest({ ...base, progress: { minutesThisWeek: 210, goalMinutes: 300 } }).progress.pct).toBe(70)
    expect(buildLearningDigest({ ...base, progress: { minutesThisWeek: 999, goalMinutes: 300 } }).progress.pct).toBe(100)
    expect(buildLearningDigest({ ...base, progress: { minutesThisWeek: 50, goalMinutes: 0 } }).progress.pct).toBe(0)
  })

  it("formats a Spanish date label", () => {
    expect(buildLearningDigest(base).dateLabel.toLowerCase()).toContain("jun")
  })
})
