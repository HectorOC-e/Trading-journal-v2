import { describe, it, expect } from "vitest"
import { calibration } from "@/domains/analytics/psychology/calibration"
import { checkinVerdict } from "@/domains/analytics/psychology/checkin"
import { moodTrend } from "@/domains/analytics/psychology/mood"

const mk = (rating: number, win: boolean, n: number) => Array.from({ length: n }, () => ({ confidenceRating: rating, win }))

describe("calibration (#23)", () => {
  it("flags overconfidence: high confidence wins less than baseline", () => {
    // low conf wins a lot, high conf wins little → high conf below baseline
    const trades = [...mk(1, true, 9), ...mk(2, true, 8), ...mk(4, false, 8), ...mk(5, false, 9)]
    const r = calibration(trades)
    expect(r.verdict).toBe("overconfident")
    expect(r.buckets.find((b) => b.rating === 5)?.trades).toBe(9)
  })

  it("flags underconfidence: low confidence wins more than baseline", () => {
    // low (1–2) all win; a weak mid bucket drags the baseline below low's rate.
    const u = [...mk(1, true, 9), ...mk(2, true, 8), ...mk(3, false, 17), ...mk(4, true, 5), ...mk(5, true, 5)]
    expect(calibration(u).verdict).toBe("underconfident")
  })

  it("does not flag when everyone wins (degenerate baseline)", () => {
    expect(calibration(mk(5, true, 20)).verdict).toBe("calibrated")
  })

  it("returns insufficient under the minimum sample", () => {
    expect(calibration(mk(5, true, 3)).verdict).toBe("insufficient")
  })

  it("ignores trades without a confidence rating", () => {
    const r = calibration([{ win: true }, { confidenceRating: null, win: false }, ...mk(3, true, 10)])
    expect(r.buckets.find((b) => b.rating === 3)?.trades).toBe(10)
  })
})

describe("checkinVerdict (#30)", () => {
  it("a single floored dimension forces no_go (red recommends not trading)", () => {
    const r = checkinVerdict({ mood: 1, energy: 5, sleep: 5 })
    expect(r.verdict).toBe("no_go")
    expect(r.recommendation).toMatch(/no es un buen día|descansa/i)
    expect(r.reasons[0]).toMatch(/ánimo/)
  })

  it("low average → no_go; mid → caution; high → go", () => {
    expect(checkinVerdict({ mood: 2, energy: 2, sleep: 2 }).verdict).toBe("no_go")
    expect(checkinVerdict({ mood: 3, energy: 3, sleep: 3 }).verdict).toBe("caution")
    expect(checkinVerdict({ mood: 5, energy: 4, sleep: 5 }).verdict).toBe("go")
  })

  it("clamps out-of-range inputs", () => {
    expect(checkinVerdict({ mood: 9, energy: 9, sleep: 9 }).verdict).toBe("go")
    expect(checkinVerdict({ mood: 0, energy: 0, sleep: 0 }).verdict).toBe("no_go")
  })
})

describe("moodTrend (longitudinal)", () => {
  const day = (i: number) => `2026-06-${String(i + 1).padStart(2, "0")}`
  it("detects an improving trend", () => {
    const samples = Array.from({ length: 12 }, (_, i) => ({ date: day(i), mood: 1 + i * 0.3, energy: 3 }))
    const r = moodTrend(samples, { windowCount: 3, step: 3 })
    expect(r.trend).toBe("improving")
    expect(r.windows.length).toBeGreaterThan(1)
  })
  it("detects a declining trend", () => {
    const samples = Array.from({ length: 12 }, (_, i) => ({ date: day(i), mood: 5 - i * 0.3, energy: 3 }))
    expect(moodTrend(samples, { windowCount: 3, step: 3 }).trend).toBe("declining")
  })
  it("insufficient with too few windows", () => {
    expect(moodTrend([{ date: day(0), mood: 3 }], { windowCount: 3 }).trend).toBe("insufficient")
  })
})
