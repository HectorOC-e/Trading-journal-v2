import { describe, it, expect } from "vitest"
import { buildPropFirmExtras } from "@/domains/trading/services/prop-firm-status"

describe("buildPropFirmExtras", () => {
  it("reports trailing status and phase progress", () => {
    const extras = buildPropFirmExtras({
      initialBalance: 100_000,
      currentEquity:  105_000,
      peakEquity:     108_000,
      ddTotalPct:     10,
      ddModel:        "TRAILING",
      dailyProfits:   [3000, 2000],
      consistencyPct: 40,
      targetPct:      10,
      tradingDays:    5,
      minTradingDays: 4,
    })
    expect(extras.trailing.model).toBe("TRAILING")
    expect(extras.phase.passed).toBe(false) // +5% < 10% target
    expect(extras.consistency?.limitPct).toBe(40)
  })

  it("consistency is null when unconfigured", () => {
    const extras = buildPropFirmExtras({
      initialBalance: 100_000, currentEquity: 100_000, peakEquity: 100_000,
      ddTotalPct: 10, ddModel: "FIXED", dailyProfits: [], consistencyPct: null,
      targetPct: null, tradingDays: 0, minTradingDays: null,
    })
    expect(extras.consistency).toBeNull()
  })
})
