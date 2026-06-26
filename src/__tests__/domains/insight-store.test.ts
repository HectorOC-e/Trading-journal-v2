import { describe, it, expect } from "vitest"
import { toComputedInsight } from "@/domains/analytics/insights/insight-store"
import type { Insight } from "@/domains/analytics/services/insights-engine"

const base: Insight = {
  id: "intraday-decay",
  category: "risk",
  severity: "warning",
  title: "Tu WR cae en la 3ª operación",
  detail: "...",
  evidence: "n=40",
  recommendation: "Para tras 2 trades",
  metric: 42,
}

describe("toComputedInsight — engine insight → persisted shape", () => {
  it("uses the stable engine id as the fingerprint", () => {
    expect(toComputedInsight(base, 40).fingerprint).toBe("intraday-decay")
  })

  it("carries the real sample size and leaves Bayesian fields undefined without a stat basis (ADR-002)", () => {
    const c = toComputedInsight(base, 40)
    expect(c.sampleSize).toBe(40)
    expect(c.confidence).toBeUndefined()
    expect(c.credibleIntervalLow).toBeUndefined()
    expect(c.effectSize).toBeUndefined()
  })

  it("fills Bayesian fields from the estimator when the detector exposes a stat basis (S3)", () => {
    const withStat: Insight = {
      ...base,
      stat: { kind: "proportion", successes: 5, trials: 20, baseline: 0.6, direction: "below" },
    }
    const c = toComputedInsight(withStat, 40)
    // sampleSize refines to the detector's own n; confidence is the directional posterior.
    expect(c.sampleSize).toBe(20)
    expect(c.confidence).toBeGreaterThan(0.95)
    expect(c.credibleIntervalLow).toBeGreaterThanOrEqual(0)
    expect(c.credibleIntervalHigh).toBeLessThanOrEqual(1)
    expect(c.credibleIntervalLow! < c.credibleIntervalHigh!).toBe(true)
    expect(c.effectSize).toBeLessThan(0) // observed rate below baseline
  })

  it("passes through narrative fields and records the source detector", () => {
    const c = toComputedInsight(base, 40)
    expect(c).toMatchObject({
      type: "intraday-decay",
      category: "risk",
      severity: "warning",
      title: "Tu WR cae en la 3ª operación",
      recommendation: "Para tras 2 trades",
      metric: 42,
    })
  })
})