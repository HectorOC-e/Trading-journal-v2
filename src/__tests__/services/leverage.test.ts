import { describe, it, expect } from "vitest"
import {
  computeNotional, computeLeverageMetrics, leverageBand,
} from "@/domains/trading/services/leverage"

describe("computeNotional", () => {
  it("futures: pointValue × price × contracts", () => {
    // NQ: $20/pt at 21,450, 1 contract → 429,000
    expect(computeNotional({ category: "FUTUROS", pointValue: 20, price: 21450, contracts: 1 })).toBe(429_000)
  })

  it("equities: $1/share × price × shares", () => {
    expect(computeNotional({ category: "EQUITIES", pointValue: 1, price: 180, contracts: 100 })).toBe(18_000)
  })

  it("crypto: 1 × price × units", () => {
    expect(computeNotional({ category: "CRIPTO", pointValue: 1, price: 60000, contracts: 0.5 })).toBe(30_000)
  })

  it("fx: lots × 100k × price (standard lot)", () => {
    expect(computeNotional({ category: "FX", pointValue: 10, price: 1.08, contracts: 1 })).toBeCloseTo(108_000)
  })

  it("returns null for missing/invalid inputs", () => {
    expect(computeNotional({ category: "FUTUROS", pointValue: 20, price: 0, contracts: 1 })).toBeNull()
    expect(computeNotional({ category: "FUTUROS", pointValue: 0, price: 100, contracts: 1 })).toBeNull()
    expect(computeNotional({ category: "FUTUROS", pointValue: 20, price: 100, contracts: 0 })).toBeNull()
  })
})

describe("computeLeverageMetrics", () => {
  it("computes effective leverage, margin and free margin", () => {
    const m = computeLeverageMetrics({ notional: 60_000, balance: 2_000, maxLeverage: 30 })
    expect(m.effectiveLeverage).toBe(30)        // 60k / 2k
    expect(m.marginRequired).toBe(2_000)        // 60k / 30
    expect(m.freeMargin).toBe(0)                // 2k - 2k
    expect(m.exceedsAccount).toBe(false)
  })

  it("flags when required margin exceeds balance", () => {
    const m = computeLeverageMetrics({ notional: 120_000, balance: 2_000, maxLeverage: 30 })
    expect(m.marginRequired).toBe(4_000)
    expect(m.freeMargin).toBe(-2_000)
    expect(m.exceedsAccount).toBe(true)
  })

  it("handles missing maxLeverage and zero balance", () => {
    const m = computeLeverageMetrics({ notional: 50_000, balance: 0, maxLeverage: null })
    expect(m.effectiveLeverage).toBeNull()
    expect(m.marginRequired).toBeNull()
    expect(m.freeMargin).toBeNull()
    expect(m.exceedsAccount).toBe(false)
  })
})

describe("leverageBand", () => {
  it("bands against the per-account target", () => {
    expect(leverageBand(4, 5)).toBe("good")   // ≤ target
    expect(leverageBand(5, 5)).toBe("good")
    expect(leverageBand(8, 5)).toBe("warn")   // ≤ 2× target
    expect(leverageBand(10, 5)).toBe("warn")
    expect(leverageBand(12, 5)).toBe("high")  // > 2× target
  })

  it("defaults to a conservative 5x target when none set", () => {
    expect(leverageBand(5)).toBe("good")
    expect(leverageBand(11)).toBe("high")
  })

  it("returns null when effective leverage is unknown", () => {
    expect(leverageBand(null, 5)).toBeNull()
  })
})
