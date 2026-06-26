import { describe, it, expect } from "vitest"
import { analyzeMaeMfe, type MaeMfeTrade } from "@/domains/analytics/institutional/mae-mfe"

const t = (pnlR: number, maeR: number | null, mfeR: number | null): MaeMfeTrade => ({ pnlR, maeR, mfeR })

describe("analyzeMaeMfe", () => {
  it("returns an empty result without data", () => {
    const r = analyzeMaeMfe([])
    expect(r.count).toBe(0)
    expect(r.exitEfficiency).toBeNull()
    expect(r.winnerMaeAvg).toBeNull()
    expect(r.avgMae).toBe(0)
    expect(r.avgMfe).toBe(0)
  })

  it("computes exit efficiency as mean(pnlR / mfeR) over trades with favorable excursion", () => {
    const r = analyzeMaeMfe([t(1, -0.5, 2), t(2, -0.2, 2)])
    // efficiencies 0.5 and 1.0 → 0.75
    expect(r.exitEfficiency).toBeCloseTo(0.75, 9)
  })

  it("ignores trades with no favorable excursion in the efficiency", () => {
    const r = analyzeMaeMfe([t(1, -0.5, 2), t(-1, -1, 0)])
    expect(r.exitEfficiency).toBeCloseTo(0.5, 9) // only the first trade
  })

  it("summarizes stop quality from MAE in winners (magnitudes)", () => {
    const r = analyzeMaeMfe([t(1, -0.5, 2), t(2, -0.2, 3), t(-1, -1.2, 0.3)])
    // winners: mae magnitudes 0.5, 0.2
    expect(r.winnerMaeAvg).toBeCloseTo(0.35, 9)
    expect(r.winnerMaeMax).toBeCloseTo(0.5, 9)
  })

  it("averages MAE/MFE magnitudes over the trades that captured them", () => {
    const r = analyzeMaeMfe([t(1, -0.4, 2), t(2, -0.6, 4)])
    expect(r.avgMae).toBeCloseTo(0.5, 9)
    expect(r.avgMfe).toBeCloseTo(3, 9)
    expect(r.count).toBe(2)
  })

  it("excludes trades missing MAE/MFE from the captured count", () => {
    const r = analyzeMaeMfe([t(1, -0.4, 2), t(2, null, null)])
    expect(r.count).toBe(1)
  })
})
