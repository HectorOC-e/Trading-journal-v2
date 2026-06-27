import { describe, it, expect } from "vitest"
import { detectEdgeDecay } from "@/domains/analytics/setups/edge-decay"

const lowVarAround = (m: number) => [m - 0.1, m, m + 0.1, m, m - 0.1, m + 0.1, m, m]

describe("detectEdgeDecay (#12)", () => {
  it("is insufficient below the minimum sample", () => {
    const r = detectEdgeDecay({ recent: [1, 2], baseline: lowVarAround(1) })
    expect(r.status).toBe("insufficient")
  })

  it("flags decay when a clear, low-noise deterioration beats the noise", () => {
    const r = detectEdgeDecay({ recent: lowVarAround(0.5), baseline: lowVarAround(1.5) })
    expect(r.status).toBe("decaying")
    expect(r.significant).toBe(true)
    expect(r.delta).toBeLessThan(0)
  })

  it("does NOT flag decay when the drop is within the noise (variance, not signal)", () => {
    // recent mean (0.5) below baseline (1) but wildly noisy → not significant
    const r = detectEdgeDecay({
      recent: [-2, 3, -2, 3, -2, 3, -2, 3],
      baseline: [1, 1, 1, 1, 1, 1, 1, 1],
    })
    expect(r.delta).toBeLessThan(0)
    expect(r.significant).toBe(false)
    expect(r.status).toBe("stable")
  })

  it("flags improvement when the edge significantly grows", () => {
    const r = detectEdgeDecay({ recent: lowVarAround(1.6), baseline: lowVarAround(0.6) })
    expect(r.status).toBe("improving")
    expect(r.delta).toBeGreaterThan(0)
  })

  it("falls back to a one-sample test against the defined edge when no baseline window", () => {
    const r = detectEdgeDecay({ recent: lowVarAround(0.5), definedAvgR: 1.5 })
    expect(r.comparison).toBe("one-sample")
    expect(r.status).toBe("decaying")
    expect(r.baselineAvgR).toBeCloseTo(1.5, 9)
  })

  it("is insufficient when there is no baseline at all", () => {
    const r = detectEdgeDecay({ recent: lowVarAround(0.5) })
    expect(r.status).toBe("insufficient")
    expect(r.comparison).toBe("none")
  })
})
