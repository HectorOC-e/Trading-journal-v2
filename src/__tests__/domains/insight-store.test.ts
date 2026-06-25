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

  it("carries the real sample size and leaves Bayesian fields undefined (ADR-002)", () => {
    const c = toComputedInsight(base, 40)
    expect(c.sampleSize).toBe(40)
    expect(c.confidence).toBeUndefined()
    expect(c.credibleIntervalLow).toBeUndefined()
    expect(c.effectSize).toBeUndefined()
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