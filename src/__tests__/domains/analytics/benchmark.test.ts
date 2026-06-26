import { describe, it, expect } from "vitest"
import { analyzeBenchmark, type BenchmarkSetupRow } from "@/domains/analytics/institutional/benchmark"

const rows: BenchmarkSetupRow[] = [
  { setupId: "a", tradeCount: 10, realWr: 0.6, realAvgR: 1.0, expectedWr: 0.5, expectedAvgR: 0.8 },
  { setupId: "b", tradeCount: 30, realWr: 0.4, realAvgR: 0.5, expectedWr: 0.45, expectedAvgR: 0.6 },
  { setupId: "c", tradeCount: 5, realWr: 0.8, realAvgR: 2.0, expectedWr: null, expectedAvgR: null },
]

describe("analyzeBenchmark", () => {
  it("returns nulls when nothing is planned", () => {
    const r = analyzeBenchmark([{ setupId: "x", tradeCount: 5, realWr: 0.5, realAvgR: 1, expectedWr: null, expectedAvgR: null }])
    expect(r.expectedWr).toBeNull()
    expect(r.wrDelta).toBeNull()
    expect(r.expectedAvgR).toBeNull()
    expect(r.avgRDelta).toBeNull()
    expect(r.coveredTrades).toBe(0)
    expect(r.totalTrades).toBe(5)
  })

  it("aggregates expected WR weighted by trade count", () => {
    const r = analyzeBenchmark(rows)
    // (0.5·10 + 0.45·30) / 40 = 0.4625
    expect(r.expectedWr).toBeCloseTo(0.4625, 9)
  })

  it("compares real vs expected on the same covered trades", () => {
    const r = analyzeBenchmark(rows)
    // real WR over covered (a,b): (0.6·10 + 0.4·30)/40 = 0.45
    expect(r.realWr).toBeCloseTo(0.45, 9)
    expect(r.wrDelta).toBeCloseTo(0.45 - 0.4625, 9)
  })

  it("aggregates expected avg R and its delta", () => {
    const r = analyzeBenchmark(rows)
    // expected (0.8·10 + 0.6·30)/40 = 0.65 ; real (1.0·10 + 0.5·30)/40 = 0.625
    expect(r.expectedAvgR).toBeCloseTo(0.65, 9)
    expect(r.realAvgR).toBeCloseTo(0.625, 9)
    expect(r.avgRDelta).toBeCloseTo(-0.025, 9)
  })

  it("counts covered vs total trades", () => {
    const r = analyzeBenchmark(rows)
    expect(r.coveredTrades).toBe(40)
    expect(r.totalTrades).toBe(45)
  })
})
