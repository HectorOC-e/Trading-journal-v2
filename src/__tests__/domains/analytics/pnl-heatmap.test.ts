import { describe, it, expect } from "vitest"
import { buildPnlHeatmap } from "@/domains/analytics/institutional/pnl-heatmap"

describe("buildPnlHeatmap", () => {
  it("returns an empty result without data", () => {
    const r = buildPnlHeatmap([])
    expect(r.days).toEqual([])
    expect(r.maxAbs).toBe(0)
    expect(r.totalPnl).toBe(0)
    expect(r.bestDay).toBeNull()
    expect(r.worstDay).toBeNull()
  })

  it("aggregates P&L across accounts within a day", () => {
    const r = buildPnlHeatmap([
      { date: "2026-01-01", pnl: 100 },
      { date: "2026-01-01", pnl: -40 },
    ])
    expect(r.days).toHaveLength(1)
    expect(r.days[0].pnl).toBeCloseTo(60, 9)
  })

  it("scales intensity by the largest absolute day", () => {
    const r = buildPnlHeatmap([
      { date: "2026-01-01", pnl: 100 },
      { date: "2026-01-02", pnl: -50 },
      { date: "2026-01-03", pnl: 0 },
    ])
    expect(r.maxAbs).toBe(100)
    const byDate = Object.fromEntries(r.days.map((d) => [d.date, d]))
    expect(byDate["2026-01-01"].intensity).toBeCloseTo(1, 9)
    expect(byDate["2026-01-02"].intensity).toBeCloseTo(-0.5, 9)
    expect(byDate["2026-01-03"].intensity).toBe(0)
  })

  it("buckets days into signed discrete levels", () => {
    const r = buildPnlHeatmap(
      [
        { date: "2026-01-01", pnl: 100 },
        { date: "2026-01-02", pnl: -50 },
        { date: "2026-01-03", pnl: 0 },
      ],
      { levels: 4 },
    )
    const byDate = Object.fromEntries(r.days.map((d) => [d.date, d]))
    expect(byDate["2026-01-01"].level).toBe(4) // full positive
    expect(byDate["2026-01-02"].level).toBe(-2) // half negative
    expect(byDate["2026-01-03"].level).toBe(0)
  })

  it("reports total, best and worst day", () => {
    const r = buildPnlHeatmap([
      { date: "2026-01-01", pnl: 100 },
      { date: "2026-01-02", pnl: -50 },
    ])
    expect(r.totalPnl).toBeCloseTo(50, 9)
    expect(r.bestDay).toEqual({ date: "2026-01-01", pnl: 100 })
    expect(r.worstDay).toEqual({ date: "2026-01-02", pnl: -50 })
  })

  it("sorts days chronologically", () => {
    const r = buildPnlHeatmap([
      { date: "2026-01-03", pnl: 1 },
      { date: "2026-01-01", pnl: 1 },
      { date: "2026-01-02", pnl: 1 },
    ])
    expect(r.days.map((d) => d.date)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"])
  })
})
