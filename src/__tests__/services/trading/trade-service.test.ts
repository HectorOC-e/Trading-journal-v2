import { describe, it, expect } from "vitest"
import {
  computeClosedTradePnl,
  computeRMultiple,
  computeScaleInAvgEntry,
  parsePointValue,
} from "@/domains/trading/services/trade-service"

// ── computeClosedTradePnl ─────────────────────────────────────────────────

describe("computeClosedTradePnl", () => {
  it("LONG: (closePrice - entry) × size - commission", () => {
    const { rawPnl, netPnl } = computeClosedTradePnl("LONG", 100, 110, 2, 5)
    expect(rawPnl).toBe(20)     // (110 - 100) * 2
    expect(netPnl).toBe(15)     // 20 - 5
  })

  it("SHORT: (entry - closePrice) × size - commission", () => {
    const { rawPnl, netPnl } = computeClosedTradePnl("SHORT", 110, 100, 2, 5)
    expect(rawPnl).toBe(20)     // (110 - 100) * 2
    expect(netPnl).toBe(15)
  })

  it("LONG at loss: negative netPnl", () => {
    const { rawPnl, netPnl } = computeClosedTradePnl("LONG", 100, 95, 1, 0)
    expect(rawPnl).toBe(-5)
    expect(netPnl).toBe(-5)
  })

  it("SHORT at loss: negative netPnl", () => {
    const { rawPnl, netPnl } = computeClosedTradePnl("SHORT", 100, 105, 1, 0)
    expect(rawPnl).toBe(-5)
    expect(netPnl).toBe(-5)
  })

  it("commission exceeds gross profit → negative netPnl", () => {
    const { rawPnl, netPnl } = computeClosedTradePnl("LONG", 100, 102, 1, 10)
    expect(rawPnl).toBe(2)
    expect(netPnl).toBe(-8)
  })

  it("zero commission: netPnl equals rawPnl", () => {
    const { rawPnl, netPnl } = computeClosedTradePnl("LONG", 50, 60, 3, 0)
    expect(rawPnl).toBe(30)
    expect(netPnl).toBe(30)
  })

  it("pointValue scales dollar P&L (NQ: $20/pt)", () => {
    // LONG NQ 0.71 contracts, +140 pts: 140 * 0.71 * 20 = 1988.0
    const { rawPnl, netPnl } = computeClosedTradePnl("LONG", 21450, 21590, 0.71, 0, 20)
    expect(rawPnl).toBeCloseTo(1988, 6)
    expect(netPnl).toBeCloseTo(1988, 6)
  })

  it("defaults to pointValue 1 (price-difference instruments)", () => {
    const { rawPnl } = computeClosedTradePnl("LONG", 100, 110, 2, 0)
    expect(rawPnl).toBe(20)
  })
})

// ── computeRMultiple ──────────────────────────────────────────────────────

describe("computeRMultiple", () => {
  it("positive R on profitable trade", () => {
    // entry 100, stop 90 → risk per unit = 10, size 1 → risk = 10
    // pnl 20 → R = 20/10 = 2
    expect(computeRMultiple(20, 100, 90, 1)).toBeCloseTo(2, 10)
  })

  it("negative R on losing trade", () => {
    // pnl -10, risk = 10 → R = -1
    expect(computeRMultiple(-10, 100, 90, 1)).toBeCloseTo(-1, 10)
  })

  it("zero stop distance → returns null", () => {
    expect(computeRMultiple(20, 100, 100, 1)).toBeNull()
  })

  it("R value consistent with pnl / risk-per-unit", () => {
    // entry 200, stop 190, size 5 → risk = 10*5 = 50
    // pnl 100 → R = 100/50 = 2
    expect(computeRMultiple(100, 200, 190, 5)).toBeCloseTo(2, 10)
  })

  it("stop above entry (SHORT-style stop): risk still computed absolutely", () => {
    // entry 100, stop 110 → |100-110| * 2 = 20
    // pnl 20 → R = 1
    expect(computeRMultiple(20, 100, 110, 2)).toBeCloseTo(1, 10)
  })

  it("pointValue cancels in the ratio (R unchanged): NQ 2R", () => {
    // risk = |21450-21380| * 0.71 * 20 = 994; pnl 1988 → R = 2
    expect(computeRMultiple(1988, 21450, 21380, 0.71, 20)).toBeCloseTo(2, 6)
  })
})

// ── parsePointValue ───────────────────────────────────────────────────────

describe("parsePointValue", () => {
  it.each([
    ["$20", 20],
    ["$50", 50],
    ["$10 / lot", 10],
    ["1 BTC", 1],
    ["$1,000", 1000],
    ["", 1],
    [null, 1],
    [undefined, 1],
    ["garbage", 1],
  ])("parses %p → %p", (input, expected) => {
    expect(parsePointValue(input as string | null | undefined)).toBe(expected)
  })
})

// ── computeScaleInAvgEntry ────────────────────────────────────────────────

describe("computeScaleInAvgEntry", () => {
  it("equal sizes → simple average of prices", () => {
    // existing: 1 contract at 100, adding 1 at 110 → avg = (100+110)/2 = 105
    expect(computeScaleInAvgEntry(100, 1, 110, 1)).toBeCloseTo(105, 10)
  })

  it("double size added → weighted toward added price", () => {
    // existing: 1 at 100, adding 2 at 110 → avg = (100*1 + 110*2)/3 = 106.67
    expect(computeScaleInAvgEntry(100, 1, 110, 2)).toBeCloseTo(320 / 3, 10)
  })

  it("zero existing size → returns added price", () => {
    expect(computeScaleInAvgEntry(100, 0, 110, 1)).toBeCloseTo(110, 10)
  })

  it("same price: avg equals that price regardless of size ratio", () => {
    expect(computeScaleInAvgEntry(100, 3, 100, 7)).toBe(100)
  })

  it("large fractional prices: weighted mean is accurate", () => {
    // existing: 2 at 1234.56, adding 3 at 1250.00
    // avg = (1234.56*2 + 1250*3) / 5 = (2469.12 + 3750) / 5 = 6219.12/5 = 1243.824
    expect(computeScaleInAvgEntry(1234.56, 2, 1250, 3)).toBeCloseTo(1243.824, 3)
  })
})
