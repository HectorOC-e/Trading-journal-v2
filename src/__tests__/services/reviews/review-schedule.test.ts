import { describe, it, expect } from "vitest"
import { previousWeekStart, previousMonth, duePeriods } from "@/server/services/reviews/review-schedule"

describe("previousWeekStart / previousMonth", () => {
  it("returns the Monday a week earlier", () => {
    expect(previousWeekStart("2024-01-08")).toBe("2024-01-01")
  })
  it("returns the previous calendar month, wrapping the year", () => {
    expect(previousMonth("2024-02-01")).toEqual({ year: 2024, month: 1 })
    expect(previousMonth("2024-01-01")).toEqual({ year: 2023, month: 12 })
  })
})

describe("duePeriods", () => {
  // 2024-01-01 is a Monday AND day 1 → both fire.
  it("fires weekly + monthly on a Monday that is also the 1st", () => {
    expect(duePeriods("2024-01-01")).toEqual([
      { kind: "weekly", weekStart: "2023-12-25" },
      { kind: "monthly", year: 2023, month: 12 },
    ])
  })
  it("fires only weekly on a non-first Monday", () => {
    expect(duePeriods("2024-01-08")).toEqual([{ kind: "weekly", weekStart: "2024-01-01" }])
  })
  it("fires only monthly on a 1st that is not Monday", () => {
    // 2024-02-01 is a Thursday.
    expect(duePeriods("2024-02-01")).toEqual([{ kind: "monthly", year: 2024, month: 1 }])
  })
  it("fires nothing on an ordinary day", () => {
    // 2024-01-09 is a Tuesday.
    expect(duePeriods("2024-01-09")).toEqual([])
  })
})
