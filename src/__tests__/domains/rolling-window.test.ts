import { describe, it, expect } from "vitest"
import {
  rollingWindow,
  compareCurrentVsPrevious,
  type Dated,
} from "@/domains/analytics/longitudinal/rolling-window"

// Helper: a dated numeric point.
function pt(date: string, value: number): Dated<number> {
  return { date, value }
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

describe("rollingWindow — count-based windows", () => {
  it("produces one window per step over the last N items", () => {
    const series = [
      pt("2026-01-01", 1),
      pt("2026-01-02", 2),
      pt("2026-01-03", 3),
      pt("2026-01-04", 4),
    ]
    const windows = rollingWindow(series, { size: { count: 2 }, step: 1, agg: (xs) => mean(xs.map((d) => d.value)) })
    // 4 items, size 2, step 1 → windows ending at index 1,2,3 → [1,2],[2,3],[3,4]
    expect(windows.map((w) => w.value)).toEqual([1.5, 2.5, 3.5])
  })

  it("each window carries its from/to dates and item count", () => {
    const series = [pt("2026-01-01", 10), pt("2026-01-02", 20), pt("2026-01-03", 30)]
    const windows = rollingWindow(series, { size: { count: 2 }, step: 1, agg: (xs) => xs.length })
    expect(windows[0]).toMatchObject({ from: "2026-01-01", to: "2026-01-02", count: 2, value: 2 })
    expect(windows[1]).toMatchObject({ from: "2026-01-02", to: "2026-01-03", count: 2, value: 2 })
  })

  it("returns empty when there are fewer items than one window", () => {
    const series = [pt("2026-01-01", 1)]
    const windows = rollingWindow(series, { size: { count: 2 }, step: 1, agg: (xs) => xs.length })
    expect(windows).toEqual([])
  })
})

describe("rollingWindow — time-based windows", () => {
  it("groups items into fixed-duration buckets", () => {
    // Two 7-day buckets.
    const series = [
      pt("2026-01-01", 1),
      pt("2026-01-03", 1),
      pt("2026-01-08", 1),
      pt("2026-01-10", 1),
    ]
    const windows = rollingWindow(series, {
      size: { days: 7 },
      step: 7,
      agg: (xs) => xs.reduce((a, b) => a + b.value, 0),
    })
    // bucket [01-01,01-08) → 2 items; bucket [01-08,01-15) → 2 items
    expect(windows.map((w) => w.value)).toEqual([2, 2])
  })

  it("does not invent empty trailing buckets beyond the data", () => {
    const series = [pt("2026-01-01", 5), pt("2026-01-02", 5)]
    const windows = rollingWindow(series, { size: { days: 7 }, step: 7, agg: (xs) => xs.length })
    expect(windows).toHaveLength(1)
    expect(windows[0].value).toBe(2)
  })
})

describe("rollingWindow — input safety", () => {
  it("sorts unsorted input by date before windowing", () => {
    const series = [pt("2026-01-03", 3), pt("2026-01-01", 1), pt("2026-01-02", 2)]
    const windows = rollingWindow(series, { size: { count: 3 }, step: 1, agg: (xs) => xs.map((d) => d.value).join(",") })
    expect(windows[0].value).toBe("1,2,3")
  })

  it("returns empty for an empty series", () => {
    expect(rollingWindow([], { size: { count: 4 }, step: 1, agg: () => 0 })).toEqual([])
  })
})

describe("compareCurrentVsPrevious", () => {
  it("returns current, previous and delta for the two most recent windows", () => {
    const series = [pt("a", 1), pt("b", 2), pt("c", 3), pt("d", 5)]
    const cmp = compareCurrentVsPrevious(series, { size: { count: 2 }, agg: (xs) => mean(xs.map((d) => d.value)) })
    // windows: [1,2]=1.5, [2,3]=2.5, [3,5]=4 → current=4, previous=2.5
    expect(cmp).toMatchObject({ current: 4, previous: 2.5, delta: 1.5 })
  })

  it("marks previous as null (no delta) when only one window exists", () => {
    const series = [pt("a", 1), pt("b", 2)]
    const cmp = compareCurrentVsPrevious(series, { size: { count: 2 }, agg: (xs) => mean(xs.map((d) => d.value)) })
    expect(cmp.current).toBe(1.5)
    expect(cmp.previous).toBeNull()
    expect(cmp.delta).toBeNull()
  })

  it("returns an empty (null) comparison when there is no data", () => {
    const cmp = compareCurrentVsPrevious([], { size: { count: 2 }, agg: () => 0 })
    expect(cmp).toEqual({ current: null, previous: null, delta: null })
  })
})
