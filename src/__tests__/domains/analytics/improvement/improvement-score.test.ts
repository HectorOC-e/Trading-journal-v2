import { describe, it, expect } from "vitest"
import { computeImprovementScore, costOfIndiscipline } from "@/domains/analytics/improvement/improvement-score"

describe("computeImprovementScore (#41)", () => {
  it("is 100 when every driver is at its best", () => {
    const r = computeImprovementScore({ disciplineRolling: 1, expectancyR: 1, commitmentKeptRate: 1, costOfIndisciplineRatio: 0 })
    expect(r.score).toBeCloseTo(100, 6)
  })

  it("is 0 when every driver is at its worst", () => {
    const r = computeImprovementScore({ disciplineRolling: 0, expectancyR: -1, commitmentKeptRate: 0, costOfIndisciplineRatio: 1 })
    expect(r.score).toBeCloseTo(0, 6)
  })

  it("decomposes into drivers whose points sum to the score", () => {
    const r = computeImprovementScore({ disciplineRolling: 0.8, expectancyR: 0.5, commitmentKeptRate: 0.6, costOfIndisciplineRatio: 0.2 })
    const sum = r.drivers.reduce((s, d) => s + d.points, 0)
    expect(sum).toBeCloseTo(r.score, 6)
    expect(r.drivers).toHaveLength(4)
    expect(r.drivers.map((d) => d.key).sort()).toEqual(["commitment", "cost", "discipline", "expectancy"])
  })

  it("a higher indiscipline cost lowers the score", () => {
    const lo = computeImprovementScore({ disciplineRolling: 0.7, expectancyR: 0.3, commitmentKeptRate: 0.5, costOfIndisciplineRatio: 0.1 }).score
    const hi = computeImprovementScore({ disciplineRolling: 0.7, expectancyR: 0.3, commitmentKeptRate: 0.5, costOfIndisciplineRatio: 0.7 }).score
    expect(hi).toBeLessThan(lo)
  })

  it("clamps out-of-range inputs and stays within 0–100", () => {
    const r = computeImprovementScore({ disciplineRolling: 2, expectancyR: 5, commitmentKeptRate: 9, costOfIndisciplineRatio: -3 })
    expect(r.score).toBeLessThanOrEqual(100)
    expect(r.score).toBeGreaterThanOrEqual(0)
  })
})

describe("costOfIndiscipline (#49)", () => {
  it("is zero when there are no off-plan trades", () => {
    const r = costOfIndiscipline([{ pnl: 100, offPlan: false }, { pnl: -50, offPlan: false }])
    expect(r.costAbs).toBe(0)
    expect(r.costRatio).toBe(0)
  })

  it("charges the expectancy gap when off-plan trades underperform", () => {
    // clean avg +100, off-plan avg −100 → gap 200 per off-plan trade × 2 = 400
    const r = costOfIndiscipline([
      { pnl: 100, offPlan: false }, { pnl: 100, offPlan: false },
      { pnl: -100, offPlan: true }, { pnl: -100, offPlan: true },
    ])
    expect(r.costAbs).toBeCloseTo(400, 6)
    expect(r.costRatio).toBeGreaterThan(0)
  })

  it("is zero when off-plan trades happen to outperform (no fabricated cost)", () => {
    const r = costOfIndiscipline([
      { pnl: 10, offPlan: false }, { pnl: 200, offPlan: true },
    ])
    expect(r.costAbs).toBe(0)
  })
})
