import { describe, it, expect } from "vitest"
import {
  applyStudyFinish,
  effectiveStudyStartedAt,
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

  it("counts local study days across UTC midnight", () => {
    expect(studyStreak([
      new Date("2026-06-16T05:30:00Z"), // Mon 23:30
      new Date("2026-06-16T06:30:00Z"), // Tue 00:30 (same UTC day)
    ], new Date("2026-06-17T07:00:00Z"), "America/Tegucigalpa")).toBe(2)
  })

  it("keeps consecutive days across a DST change", () => {
    expect(studyStreak([
      new Date("2026-03-08T04:30:00Z"), // Mar 7, 23:30 EST
      new Date("2026-03-09T03:30:00Z"), // Mar 8, 23:30 EDT
    ], new Date("2026-03-10T02:00:00Z"), "America/New_York")).toBe(2)
  })
})

describe("minutesThisWeek", () => {
  it("uses the local Monday and excludes future sessions", () => {
    const total = minutesThisWeek([
      { startedAt: new Date("2026-06-15T05:30:00Z"), durationMin: 60 }, // local Sunday
      { startedAt: new Date("2026-06-15T06:30:00Z"), durationMin: 25 }, // local Monday
      { startedAt: new Date("2026-06-23T08:00:00Z"), durationMin: 90 }, // future
    ], new Date("2026-06-17T12:00:00Z"), "America/Tegucigalpa")
    expect(total).toBe(25)
  })

  it("includes local Monday before UTC Monday in UTC+14", () => {
    expect(minutesThisWeek([
      { startedAt: new Date("2026-06-14T11:00:00Z"), durationMin: 40 },
    ], new Date("2026-06-15T00:00:00Z"), "Pacific/Kiritimati")).toBe(40)
  })

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
    expect(s?.title).toBe("2 repasos pendientes")
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

 describe("legacy voided dates", () => {
  it("retains the actual completion instant after voiding a legacy planned completion", () => {
    const startedAt = new Date("2026-06-20T12:00:00Z")
    const endedAt = new Date("2026-06-15T18:00:00Z")
    expect(effectiveStudyStartedAt({ startedAt, endedAt, source: "manual", plannedMin: 30, status: "voided" })).toEqual(endedAt)
  })
})
