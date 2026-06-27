import { describe, it, expect } from "vitest"
import { compareVariants } from "@/domains/analytics/setups/variant-compare"

describe("compareVariants (#50)", () => {
  it("names a winner when one variant's edge is significantly better", () => {
    const r = compareVariants(
      { label: "v2", rMultiples: [1.4, 1.5, 1.6, 1.5, 1.4, 1.6] },
      { label: "v1", rMultiples: [0.4, 0.5, 0.6, 0.5, 0.4, 0.6] },
    )!
    expect(r.winner).toBe("v2")
    expect(r.significant).toBe(true)
    expect(r.delta).toBeCloseTo(1, 6)
    expect(r.a.avgR).toBeCloseTo(1.5, 6)
  })

  it("declares no winner when the variants are statistically indistinguishable", () => {
    const r = compareVariants(
      { label: "v2", rMultiples: [1.0, 1.1, 0.9, 1.0, 1.1, 0.9] },
      { label: "v1", rMultiples: [1.05, 0.95, 1.0, 1.1, 0.9, 1.0] },
    )!
    expect(r.winner).toBeNull()
    expect(r.significant).toBe(false)
  })

  it("derives win-rate when P&L is supplied", () => {
    const r = compareVariants(
      { label: "v2", rMultiples: [1, 1, -1, 1], pnls: [10, 10, -10, 10] },
      { label: "v1", rMultiples: [1, -1, -1, -1], pnls: [10, -10, -10, -10] },
    )!
    expect(r.a.winRate).toBeCloseTo(75, 6)
    expect(r.b.winRate).toBeCloseTo(25, 6)
  })

  it("returns null when either variant has too few trades", () => {
    expect(compareVariants({ label: "v2", rMultiples: [1] }, { label: "v1", rMultiples: [1, 2, 3] })).toBeNull()
  })
})
