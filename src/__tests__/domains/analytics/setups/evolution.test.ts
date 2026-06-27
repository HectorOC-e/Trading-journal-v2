import { describe, it, expect } from "vitest"
import { buildEdgeEvolution } from "@/domains/analytics/setups/evolution"
import type { Dated } from "@/domains/analytics/longitudinal/rolling-window"
import type { EvolutionPoint } from "@/domains/analytics/setups/evolution"

const pt = (date: string, rMultiple: number | null, pnl: number): Dated<EvolutionPoint> => ({
  date,
  value: { rMultiple, pnl },
})

describe("buildEdgeEvolution (#21)", () => {
  it("computes WR / avgR / netPnl per rolling window", () => {
    const series = [
      pt("2026-01-01", 2, 100),
      pt("2026-01-02", -1, -50),
      pt("2026-01-03", 2, 100),
      pt("2026-01-04", 1, 50),
      pt("2026-01-05", -1, -50),
      pt("2026-01-06", 2, 100),
    ]
    const windows = buildEdgeEvolution(series, { size: { count: 3 }, step: 3 })
    expect(windows).toHaveLength(2)

    expect(windows[0]).toMatchObject({ from: "2026-01-01", to: "2026-01-03" })
    expect(windows[0].value.trades).toBe(3)
    expect(windows[0].value.winRate).toBeCloseTo(66.6667, 3) // 2 wins / 3
    expect(windows[0].value.avgR).toBeCloseTo(1, 9) // (2−1+2)/3
    expect(windows[0].value.netPnl).toBeCloseTo(150, 9)

    expect(windows[1].value.winRate).toBeCloseTo(66.6667, 3) // 1,−1,2 → 2 wins
    expect(windows[1].value.avgR).toBeCloseTo(0.6667, 3)
  })

  it("reports null avgR for a window with no R data but still a win-rate", () => {
    const series = [pt("2026-01-01", null, 100), pt("2026-01-02", null, -50)]
    const windows = buildEdgeEvolution(series, { size: { count: 2 }, step: 2 })
    expect(windows[0].value.avgR).toBeNull()
    expect(windows[0].value.winRate).toBeCloseTo(50, 9)
  })

  it("is empty with no trades", () => {
    expect(buildEdgeEvolution([], { size: { count: 3 }, step: 3 })).toEqual([])
  })
})
