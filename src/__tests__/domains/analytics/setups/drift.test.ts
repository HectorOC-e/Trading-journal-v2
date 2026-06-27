import { describe, it, expect } from "vitest"
import { detectSetupDrift, type DriftTrade } from "@/domains/analytics/setups/drift"

const mk = (n: number, o: Partial<DriftTrade>): DriftTrade[] =>
  Array.from({ length: n }, () => ({ direction: "LONG", rMultiple: 1, pnl: 1, ...o }))

describe("detectSetupDrift (#32)", () => {
  it("is insufficient below the minimum sample", () => {
    const r = detectSetupDrift({ definition: { direction: "LONG", expectedWr: 50, expectedAvgR: 1 }, trades: mk(3, {}) })
    expect(r.status).toBe("insufficient")
  })

  it("flags direction drift when traded against the defined side", () => {
    const trades = [...mk(6, { direction: "SHORT" }), ...mk(2, { direction: "LONG" })]
    const r = detectSetupDrift({ definition: { direction: "LONG", expectedWr: null, expectedAvgR: null }, trades })
    expect(r.status).toBe("drifting")
    expect(r.topDrift?.dimension).toBe("direction")
    expect(r.topDrift?.actual).toBe("SHORT")
  })

  it("flags avg-R drift (operated 0.8 vs defined 1.5)", () => {
    const r = detectSetupDrift({
      definition: { direction: "AMBAS", expectedWr: null, expectedAvgR: 1.5 },
      trades: mk(8, { rMultiple: 0.8 }),
    })
    expect(r.topDrift?.dimension).toBe("avgR")
    expect(r.topDrift?.flagged).toBe(true)
    expect(r.topDrift?.actual).toBeCloseTo(0.8, 9)
  })

  it("flags win-rate drift", () => {
    const trades = [...mk(3, { pnl: 1 }), ...mk(5, { pnl: -1 })] // 37.5% WR
    const r = detectSetupDrift({ definition: { direction: "AMBAS", expectedWr: 60, expectedAvgR: null }, trades })
    expect(r.topDrift?.dimension).toBe("winRate")
    expect(r.topDrift?.flagged).toBe(true)
  })

  it("is aligned when execution matches the definition", () => {
    const trades = [...mk(4, { direction: "LONG", pnl: 1, rMultiple: 1 }), ...mk(4, { direction: "LONG", pnl: -1, rMultiple: 1 })]
    const r = detectSetupDrift({ definition: { direction: "LONG", expectedWr: 50, expectedAvgR: 1 }, trades })
    expect(r.status).toBe("aligned")
    expect(r.topDrift?.flagged ?? false).toBe(false)
  })

  it("is insufficient when nothing is defined to compare against", () => {
    const r = detectSetupDrift({ definition: { direction: "AMBAS", expectedWr: null, expectedAvgR: null }, trades: mk(10, {}) })
    expect(r.status).toBe("insufficient")
    expect(r.dimensions).toHaveLength(0)
  })
})
