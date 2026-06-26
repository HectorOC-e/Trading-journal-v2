import { describe, it, expect } from "vitest"
import { analyzeDrawdown, type EquityPoint } from "@/domains/analytics/institutional/drawdown"

const pt = (date: string, equity: number): EquityPoint => ({ date, equity })

describe("analyzeDrawdown", () => {
  it("returns an empty result for no data", () => {
    const r = analyzeDrawdown([])
    expect(r.series).toEqual([])
    expect(r.maxDrawdownPct).toBe(0)
    expect(r.maxDrawdownAbs).toBe(0)
    expect(r.maxDrawdownDate).toBeNull()
    expect(r.currentDrawdownPct).toBe(0)
    expect(r.inDrawdown).toBe(false)
    expect(r.drawdownDurationDays).toBe(0)
  })

  it("reports zero drawdown for a monotonically rising curve", () => {
    const r = analyzeDrawdown([pt("2026-01-01", 1000), pt("2026-01-02", 1100), pt("2026-01-03", 1300)])
    expect(r.maxDrawdownPct).toBe(0)
    expect(r.currentDrawdownPct).toBe(0)
    expect(r.inDrawdown).toBe(false)
    expect(r.drawdownDurationDays).toBe(0)
  })

  it("computes max drawdown %, $, and trough date", () => {
    const r = analyzeDrawdown([
      pt("2026-01-01", 1000),
      pt("2026-01-02", 1200),
      pt("2026-01-03", 900),
      pt("2026-01-05", 1100),
    ])
    // peak 1200, trough 900 → DD $300 = 25% of peak; trough on 01-03
    expect(r.maxDrawdownAbs).toBeCloseTo(300, 6)
    expect(r.maxDrawdownPct).toBeCloseTo(25, 6)
    expect(r.maxDrawdownDate).toBe("2026-01-03")
  })

  it("reports current drawdown and its duration since the last peak", () => {
    const r = analyzeDrawdown([
      pt("2026-01-01", 1000),
      pt("2026-01-02", 1200),
      pt("2026-01-03", 900),
      pt("2026-01-05", 1100),
    ])
    // last point 1100 vs running peak 1200 → still in DD of $100 (8.33%)
    expect(r.currentDrawdownAbs).toBeCloseTo(100, 6)
    expect(r.currentDrawdownPct).toBeCloseTo((100 / 1200) * 100, 6)
    expect(r.inDrawdown).toBe(true)
    // last peak on 01-02, last point 01-05 → 3 days underwater
    expect(r.drawdownDurationDays).toBe(3)
  })

  it("sorts unsorted input and emits a dd point per date", () => {
    const r = analyzeDrawdown([pt("2026-01-03", 900), pt("2026-01-01", 1000), pt("2026-01-02", 1200)])
    expect(r.series.map((p) => p.date)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"])
    expect(r.series[2].drawdownPct).toBeCloseTo(25, 6)
  })

  it("guards against non-positive peaks (blown account)", () => {
    const r = analyzeDrawdown([pt("2026-01-01", 0), pt("2026-01-02", -500)])
    expect(Number.isFinite(r.maxDrawdownPct)).toBe(true)
    expect(r.maxDrawdownPct).toBe(0)
  })
})
