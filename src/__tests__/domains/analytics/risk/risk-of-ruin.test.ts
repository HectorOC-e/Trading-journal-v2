import { describe, it, expect } from "vitest"
import {
  mulberry32,
  analyticRiskOfRuin,
  monteCarloRiskOfRuin,
  riskOfRuin,
} from "@/domains/analytics/risk/risk-of-ruin"

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect(a()).toBe(b())
    expect(a()).toBe(b())
  })

  it("produces values in [0, 1)", () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe("analyticRiskOfRuin (diffusion barrier, infinite horizon)", () => {
  it("matches exp(-2·μ·a/σ²) for a known case", () => {
    // distance to ruin a = ruin% / risk% = 0.10 / 0.01 = 10 R units
    // P = exp(-2 · 0.1 · 10 / 1²) = exp(-2) ≈ 0.13534
    const p = analyticRiskOfRuin({ meanR: 0.1, sdR: 1, riskPerTradePct: 0.01, ruinThresholdPct: 0.1 })
    expect(p).toBeCloseTo(Math.exp(-2), 6)
  })

  it("is certain ruin (1) without a positive edge", () => {
    expect(analyticRiskOfRuin({ meanR: 0, sdR: 1, riskPerTradePct: 0.01, ruinThresholdPct: 0.1 })).toBe(1)
    expect(analyticRiskOfRuin({ meanR: -0.2, sdR: 1, riskPerTradePct: 0.01, ruinThresholdPct: 0.1 })).toBe(1)
  })

  it("is zero ruin when there is edge and no variance", () => {
    expect(analyticRiskOfRuin({ meanR: 0.1, sdR: 0, riskPerTradePct: 0.01, ruinThresholdPct: 0.1 })).toBe(0)
  })

  it("falls as the edge grows and rises as risk-per-trade grows", () => {
    const base = analyticRiskOfRuin({ meanR: 0.1, sdR: 1, riskPerTradePct: 0.01, ruinThresholdPct: 0.1 })
    const moreEdge = analyticRiskOfRuin({ meanR: 0.2, sdR: 1, riskPerTradePct: 0.01, ruinThresholdPct: 0.1 })
    const moreRisk = analyticRiskOfRuin({ meanR: 0.1, sdR: 1, riskPerTradePct: 0.02, ruinThresholdPct: 0.1 })
    expect(moreEdge).toBeLessThan(base)
    expect(moreRisk).toBeGreaterThan(base)
  })
})

describe("monteCarloRiskOfRuin (finite horizon, empirical R)", () => {
  const base = {
    riskPerTradePct: 0.01,
    ruinThresholdPct: 0.05,
    horizon: 20,
    trials: 2000,
    seed: 123,
  }

  it("is 0 when every trade wins (FIXED)", () => {
    const r = monteCarloRiskOfRuin({ ...base, rMultiples: [1], ddModel: "FIXED" })
    expect(r.value).toBe(0)
  })

  it("is 1 when every trade loses past the threshold (FIXED)", () => {
    // each loss = -1R = -1% equity; 5 losses → -5% = ruin within a 20-trade horizon
    const r = monteCarloRiskOfRuin({ ...base, rMultiples: [-1], ddModel: "FIXED" })
    expect(r.value).toBe(1)
  })

  it("returns a credible band around the point (FREEZE-D16)", () => {
    const r = monteCarloRiskOfRuin({ ...base, rMultiples: [2, 2, -1, -1, -1], ddModel: "FIXED" })
    expect(r.value).toBeGreaterThan(0)
    expect(r.value).toBeLessThan(1)
    expect(r.ciLow).toBeLessThanOrEqual(r.value)
    expect(r.ciHigh).toBeGreaterThanOrEqual(r.value)
    expect(r.trials).toBe(base.trials)
  })

  it("is reproducible for a fixed seed", () => {
    const input = { ...base, rMultiples: [2, -1, -1], ddModel: "FIXED" as const }
    expect(monteCarloRiskOfRuin(input).value).toBe(monteCarloRiskOfRuin(input).value)
  })

  it("TRAILING ruins more often than FIXED for the same series", () => {
    // a win first lifts the peak, so a trailing drawdown ruins more easily
    const series = { ...base, rMultiples: [3, -1, -1, -1, -1, -1], horizon: 30 }
    const fixed = monteCarloRiskOfRuin({ ...series, ddModel: "FIXED" })
    const trailing = monteCarloRiskOfRuin({ ...series, ddModel: "TRAILING" })
    expect(trailing.value).toBeGreaterThanOrEqual(fixed.value)
  })
})

describe("riskOfRuin (bundle)", () => {
  it("returns both the analytic estimate and the Monte Carlo band", () => {
    const r = riskOfRuin({
      rMultiples: [2, 2, -1, -1, -1],
      riskPerTradePct: 0.01,
      ruinThresholdPct: 0.1,
      horizon: 50,
      ddModel: "FIXED",
      trials: 1000,
      seed: 9,
    })!
    expect(r.analytic).toBeGreaterThanOrEqual(0)
    expect(r.analytic).toBeLessThanOrEqual(1)
    expect(r.monteCarlo.value).toBeGreaterThanOrEqual(0)
    expect(r.monteCarlo.value).toBeLessThanOrEqual(1)
    expect(r.sampleSize).toBe(5)
  })

  it("returns null when there is no R history to resample", () => {
    expect(
      riskOfRuin({
        rMultiples: [],
        riskPerTradePct: 0.01,
        ruinThresholdPct: 0.1,
        horizon: 50,
        ddModel: "FIXED",
      }),
    ).toBeNull()
  })
})
