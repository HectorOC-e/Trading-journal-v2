import { describe, it, expect } from "vitest"
import { jeffreysBand } from "@/domains/analytics/risk/band"

describe("jeffreysBand", () => {
  it("returns the point rate with a credible band around it", () => {
    const b = jeffreysBand(50, 100)
    expect(b.value).toBeCloseTo(0.5, 9)
    expect(b.ciLow).toBeLessThan(0.5)
    expect(b.ciHigh).toBeGreaterThan(0.5)
  })

  it("pins the band to 0 with no successes and to 1 with all successes", () => {
    expect(jeffreysBand(0, 100)).toMatchObject({ value: 0, ciLow: 0 })
    expect(jeffreysBand(100, 100)).toMatchObject({ value: 1, ciHigh: 1 })
  })

  it("widens as the sample shrinks", () => {
    const wide = jeffreysBand(1, 2)
    const narrow = jeffreysBand(500, 1000)
    expect(wide.ciHigh - wide.ciLow).toBeGreaterThan(narrow.ciHigh - narrow.ciLow)
  })

  it("returns a zeroed band with no trials", () => {
    expect(jeffreysBand(0, 0)).toMatchObject({ value: 0, ciLow: 0, ciHigh: 0 })
  })
})
