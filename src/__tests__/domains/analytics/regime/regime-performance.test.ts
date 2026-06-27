import { describe, it, expect } from "vitest"
import { computeRegimePerformance, type RegimeTrade } from "@/domains/analytics/regime/regime-performance"

const mk = (regime: string | null, rs: number[]): RegimeTrade[] =>
  rs.map((r) => ({ regime, rMultiple: r, pnl: r * 100 }))

describe("computeRegimePerformance (#33)", () => {
  it("computes WR/avgR/netPnl per regime and is flagged experimental (FREEZE-D18)", () => {
    const r = computeRegimePerformance([...mk("trend", [2, 1, 2, -1]), ...mk("range", [-1, -1, 1, -1])])
    expect(r.experimental).toBe(true)
    const trend = r.byRegime.find((x) => x.regime === "trend")!
    expect(trend.trades).toBe(4)
    expect(trend.avgR).toBeCloseTo(1, 6)
    expect(trend.winRate).toBeCloseTo(75, 6)
  })

  it("identifies best and worst regime by avg R (min sample)", () => {
    const r = computeRegimePerformance([...mk("trend", [2, 2, 2, 1]), ...mk("range", [-1, -1, -1, -2])])
    expect(r.best?.regime).toBe("trend")
    expect(r.worst?.regime).toBe("range")
  })

  it("ignores trades without a regime label", () => {
    const r = computeRegimePerformance([...mk(null, [1, 1, 1]), ...mk("volatile", [2, 2, 2, 2])])
    expect(r.byRegime.map((x) => x.regime)).toEqual(["volatile"])
  })

  it("is empty-safe", () => {
    const r = computeRegimePerformance([])
    expect(r.byRegime).toEqual([])
    expect(r.best).toBeNull()
    expect(r.worst).toBeNull()
  })
})
