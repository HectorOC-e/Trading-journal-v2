import { describe, it, expect } from "vitest"
import {
  applyStudyFinish,
  studyStreak,
  minutesThisWeek,
  startOfWeekUTC,
  pickStudySuggestion,
} from "@/domains/learning/services/study-session-service"

describe("applyStudyFinish", () => {
  it("adds minutes to currentUnits for progressType=minutes", () => {
    const u = applyStudyFinish({ progressType: "minutes", currentUnits: 30, totalUnits: 120 }, 27)
    expect(u).toEqual({ currentUnits: 57, progressPct: 48, status: "IN_PROGRESS" })
  })

  it("completes when units reach total", () => {
    const u = applyStudyFinish({ progressType: "minutes", currentUnits: 100, totalUnits: 120 }, 40)
    expect(u?.status).toBe("COMPLETED")
    expect(u?.progressPct).toBe(100)
  })

  it("increments by 1 for progressType=sessions", () => {
    const u = applyStudyFinish({ progressType: "sessions", currentUnits: 2, totalUnits: 5 }, 99)
    expect(u?.currentUnits).toBe(3)
  })

  it("returns null (time-only) for pages / manual / null", () => {
    expect(applyStudyFinish({ progressType: "pages", currentUnits: 0, totalUnits: 200 }, 30)).toBeNull()
    expect(applyStudyFinish({ progressType: null, currentUnits: null, totalUnits: null }, 30)).toBeNull()
  })
})

describe("studyStreak", () => {
  const day = (iso: string) => new Date(iso + "T12:00:00Z")
  const now = day("2026-06-16")

  it("counts consecutive days ending today", () => {
    expect(studyStreak([day("2026-06-16"), day("2026-06-15"), day("2026-06-14")], now)).toBe(3)
  })

  it("today without a session does not break the streak (counts from yesterday)", () => {
    expect(studyStreak([day("2026-06-15"), day("2026-06-14")], now)).toBe(2)
  })

  it("a gap resets the streak", () => {
    expect(studyStreak([day("2026-06-16"), day("2026-06-13")], now)).toBe(1)
  })

  it("no sessions → 0", () => {
    expect(studyStreak([], now)).toBe(0)
  })
})

describe("minutesThisWeek", () => {
  it("sums durationMin within the current ISO week", () => {
    const now = new Date("2026-06-17T10:00:00Z") // Wednesday
    const monday = startOfWeekUTC(now)
    expect(monday.getUTCDay()).toBe(1) // Monday
    const total = minutesThisWeek(
      [
        { startedAt: new Date("2026-06-15T09:00:00Z"), durationMin: 30 }, // Mon, in week
        { startedAt: new Date("2026-06-17T08:00:00Z"), durationMin: 45 }, // Wed, in week
        { startedAt: new Date("2026-06-14T08:00:00Z"), durationMin: 60 }, // Sun prev week, out
        { startedAt: new Date("2026-06-16T08:00:00Z"), durationMin: null }, // no duration
      ],
      now,
    )
    expect(total).toBe(75)
  })
})

describe("pickStudySuggestion", () => {
  const base = { overdueReviews: [], weakness: null, weekMinutes: 300, goalMinutes: 300, streak: 3 }

  it("prioritises overdue reviews", () => {
    const s = pickStudySuggestion({ ...base, overdueReviews: [{ id: "r1", title: "Wyckoff" }, { id: "r2", title: "ICT" }] })
    expect(s?.kind).toBe("overdue_review")
    expect(s?.resourceId).toBe("r1")
    expect(s?.title).toContain("2 repasos")
  })

  it("falls back to weakness→resource when nothing is due", () => {
    const s = pickStudySuggestion({ ...base, weakness: { setup: "Breakout", winRate: 32, resource: { id: "r9", title: "Trading in the Zone" } } })
    expect(s?.kind).toBe("weakness")
    expect(s?.resourceId).toBe("r9")
    expect(s?.reason).toContain("32%")
  })

  it("suggests closing the weekly-goal gap", () => {
    const s = pickStudySuggestion({ ...base, weekMinutes: 120, goalMinutes: 300 })
    expect(s?.kind).toBe("goal_gap")
    expect(s?.title).toContain("180 min")
  })

  it("nudges to restart a broken streak", () => {
    const s = pickStudySuggestion({ ...base, streak: 0 })
    expect(s?.kind).toBe("streak")
  })

  it("returns null when on track", () => {
    expect(pickStudySuggestion(base)).toBeNull()
  })
})
