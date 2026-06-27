import { describe, it, expect } from "vitest"
import { projectPhasePass } from "@/domains/analytics/risk/prop-projection"

const base = {
  riskPerTradePct: 0.01,
  targetPct: 0.08,
  ddTotalPct: 0.1,
  ddModel: "FIXED" as const,
  tradesPerSession: 4,
  maxSessions: 40,
  trials: 2000,
  seed: 7,
}

describe("projectPhasePass", () => {
  it("returns null without an R history to resample", () => {
    expect(projectPhasePass({ ...base, rMultiples: [] })).toBeNull()
  })

  it("is near-certain to pass with a strong edge and a loose DD", () => {
    // every trade +1R = +1% → reaches +8% in 8 trades, well within horizon, no DD risk
    const r = projectPhasePass({ ...base, rMultiples: [1], ddDailyPct: null })!
    expect(r.passProbability.value).toBe(1)
    expect(r.violateDdFirstProbability.value).toBe(0)
    expect(r.expectedSessions!.value).toBeGreaterThan(0)
    expect(r.bottleneck).toBe("NONE")
  })

  it("never passes and blames total DD when every trade loses", () => {
    const r = projectPhasePass({ ...base, rMultiples: [-1], ddDailyPct: null })!
    expect(r.passProbability.value).toBe(0)
    expect(r.violateDdFirstProbability.value).toBe(1)
    expect(r.bottleneck).toBe("TOTAL_DD")
    expect(r.expectedSessions).toBeNull()
  })

  it("blames timeout when the edge is too weak to reach target in the horizon", () => {
    // tiny pace + tiny horizon, no losses → cannot reach target, but never breaches DD
    const r = projectPhasePass({
      ...base,
      rMultiples: [0.1],
      ddDailyPct: null,
      tradesPerSession: 1,
      maxSessions: 5,
    })!
    expect(r.passProbability.value).toBe(0)
    expect(r.violateDdFirstProbability.value).toBe(0)
    expect(r.bottleneck).toBe("TIMEOUT")
  })

  it("can fail on the daily DD before the total DD", () => {
    // one big losing trade per session breaches a tight daily limit immediately
    const r = projectPhasePass({
      ...base,
      rMultiples: [-3],
      ddDailyPct: 0.02,
      tradesPerSession: 4,
    })!
    expect(r.passProbability.value).toBe(0)
    expect(r.bottleneck).toBe("DAILY_DD")
  })

  it("reports a credible band and is reproducible for a fixed seed", () => {
    const input = { ...base, rMultiples: [2, 2, -1, -1, -1], ddDailyPct: 0.04 }
    const a = projectPhasePass(input)!
    const b = projectPhasePass(input)!
    expect(a.passProbability.value).toBe(b.passProbability.value)
    expect(a.passProbability.ciLow).toBeLessThanOrEqual(a.passProbability.value)
    expect(a.passProbability.ciHigh).toBeGreaterThanOrEqual(a.passProbability.value)
    expect(a.trials).toBe(base.trials)
  })

  it("honours a minimum-trading-days requirement (cannot pass too early)", () => {
    // strong edge would pass in ~2 sessions, but the firm requires 10 days
    const r = projectPhasePass({ ...base, rMultiples: [1], ddDailyPct: null, minTradingDays: 10 })!
    expect(r.expectedSessions!.value).toBeGreaterThanOrEqual(10)
  })
})
