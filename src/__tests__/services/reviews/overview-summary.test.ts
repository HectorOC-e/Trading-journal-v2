import { describe, it, expect } from "vitest"
import { buildPeriodSummary } from "@/server/services/reviews/overview"

describe("buildPeriodSummary", () => {
  it("returns an empty summary when there are no weeks", () => {
    expect(buildPeriodSummary([])).toEqual({ weeks: 0, greenStreak: 0, best: null, worst: null })
  })

  it("counts weeks and picks the best/worst by net P&L", () => {
    const s = buildPeriodSummary([
      { label: "S20", net: 300 },
      { label: "S21", net: -800 },
      { label: "S22", net: 1200 },
    ])
    expect(s.weeks).toBe(3)
    expect(s.best).toEqual({ label: "S22", net: 1200 })
    expect(s.worst).toEqual({ label: "S21", net: -800 })
  })

  it("counts the trailing run of green weeks (net ≥ 0) from the end", () => {
    expect(buildPeriodSummary([
      { label: "S1", net: 100 },
      { label: "S2", net: -50 },
      { label: "S3", net: 0 },     // zero counts as green
      { label: "S4", net: 200 },
    ]).greenStreak).toBe(2)
  })

  it("breaks the streak at the most recent red week", () => {
    expect(buildPeriodSummary([
      { label: "S1", net: 100 },
      { label: "S2", net: 100 },
      { label: "S3", net: -10 },
    ]).greenStreak).toBe(0)
  })
})
