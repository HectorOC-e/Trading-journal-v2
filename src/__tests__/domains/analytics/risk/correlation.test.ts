import { describe, it, expect } from "vitest"
import { aggregateExposure, aggregateFreezeSignal } from "@/domains/analytics/risk/correlation"

describe("aggregateExposure (#39)", () => {
  it("sums same-symbol risk across accounts — real risk is the sum, not per-account", () => {
    const r = aggregateExposure([
      { accountId: "a", symbol: "BTCUSD", riskAmount: 100, direction: "LONG" },
      { accountId: "b", symbol: "BTCUSD", riskAmount: 150, direction: "LONG" },
    ])
    const btc = r.bySymbol[0]
    expect(btc.symbol).toBe("BTCUSD")
    expect(btc.grossRiskAmount).toBe(250)
    expect(btc.netRiskAmount).toBe(250)
    expect(btc.netDirection).toBe("LONG")
    expect(btc.accountCount).toBe(2)
    expect(r.totalGrossRiskAmount).toBe(250)
  })

  it("nets opposing directions but keeps gross exposure visible", () => {
    const r = aggregateExposure([
      { accountId: "a", symbol: "EURUSD", riskAmount: 100, direction: "LONG" },
      { accountId: "b", symbol: "EURUSD", riskAmount: 40, direction: "SHORT" },
    ])
    const eur = r.bySymbol[0]
    expect(eur.grossRiskAmount).toBe(140)
    expect(eur.netRiskAmount).toBe(60)
    expect(eur.netDirection).toBe("LONG")
  })

  it("sorts symbols by gross exposure and reports concentration share", () => {
    const r = aggregateExposure([
      { accountId: "a", symbol: "BTCUSD", riskAmount: 300, direction: "LONG" },
      { accountId: "a", symbol: "US30", riskAmount: 100, direction: "SHORT" },
    ])
    expect(r.bySymbol.map((s) => s.symbol)).toEqual(["BTCUSD", "US30"])
    expect(r.totalGrossRiskAmount).toBe(400)
    expect(r.topConcentrationPct).toBeCloseTo(0.75, 9)
  })

  it("is empty with no open positions", () => {
    const r = aggregateExposure([])
    expect(r.bySymbol).toEqual([])
    expect(r.totalGrossRiskAmount).toBe(0)
    expect(r.topConcentrationPct).toBe(0)
  })
})

describe("aggregateFreezeSignal", () => {
  it("is ok below the warn threshold", () => {
    const s = aggregateFreezeSignal({ totalGrossRiskAmount: 500, aggregateCapAmount: 1000 })
    expect(s.level).toBe("ok")
    expect(s.breached).toBe(false)
    expect(s.utilizationPct).toBeCloseTo(0.5, 9)
  })

  it("warns as it approaches the cap", () => {
    expect(aggregateFreezeSignal({ totalGrossRiskAmount: 850, aggregateCapAmount: 1000 }).level).toBe("warn")
  })

  it("flags a freeze once the cap is reached", () => {
    const s = aggregateFreezeSignal({ totalGrossRiskAmount: 1100, aggregateCapAmount: 1000 })
    expect(s.level).toBe("freeze")
    expect(s.breached).toBe(true)
  })

  it("is inert when no cap is configured", () => {
    const s = aggregateFreezeSignal({ totalGrossRiskAmount: 1100, aggregateCapAmount: null })
    expect(s.level).toBe("ok")
    expect(s.breached).toBe(false)
    expect(s.utilizationPct).toBeNull()
  })
})
