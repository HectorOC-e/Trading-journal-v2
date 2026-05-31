import { describe, it, expect } from "vitest"
import { calcExpectancyR, calcSharpeRatio, calcProfitFactor, getISOWeekKey } from "./formulas"

// ── calcExpectancyR ────────────────────────────────────────────────────────

describe("calcExpectancyR", () => {
  it("returns 0 for empty array", () => {
    expect(calcExpectancyR([])).toBe(0)
  })

  it("returns 0 when all rMultiple values are null (open trades)", () => {
    expect(calcExpectancyR([
      { rMultiple: null },
      { rMultiple: null },
    ])).toBe(0)
  })

  it("computes expectancy correctly with known wins and losses", () => {
    // 3 wins of 2R each, 2 losses of -1R each
    // avgWinR = 2, avgLossR = 1, winRate = 3/5 = 0.6
    // E = 0.6 * 2 - 0.4 * 1 = 1.2 - 0.4 = 0.8
    const trades = [
      { rMultiple: 2 },
      { rMultiple: 2 },
      { rMultiple: 2 },
      { rMultiple: -1 },
      { rMultiple: -1 },
    ]
    expect(calcExpectancyR(trades)).toBeCloseTo(0.8, 10)
  })

  it("uses real avgLossR (not hardcoded 1)", () => {
    // 1 win of 3R, 1 loss of -2R → E = 0.5*3 - 0.5*2 = 0.5
    const trades = [
      { rMultiple: 3 },
      { rMultiple: -2 },
    ]
    expect(calcExpectancyR(trades)).toBeCloseTo(0.5, 10)
  })

  it("handles all wins (no losses): avgLossR falls back to 1", () => {
    // 2 wins of 1.5R → winRate = 1, avgWinR = 1.5, avgLossR = 1 (fallback)
    // E = 1 * 1.5 - 0 * 1 = 1.5
    const trades = [
      { rMultiple: 1.5 },
      { rMultiple: 1.5 },
    ]
    expect(calcExpectancyR(trades)).toBeCloseTo(1.5, 10)
  })

  it("handles all losses: avgWinR = 0", () => {
    // 2 losses of -1R → winRate = 0, avgLossR = 1
    // E = 0 * 0 - 1 * 1 = -1
    const trades = [
      { rMultiple: -1 },
      { rMultiple: -1 },
    ]
    expect(calcExpectancyR(trades)).toBeCloseTo(-1, 10)
  })

  it("ignores null rMultiple entries when mixed with valid ones", () => {
    // null entries are excluded; only 2R win and -1R loss contribute
    // E = 0.5*2 - 0.5*1 = 0.5
    const trades = [
      { rMultiple: 2 },
      { rMultiple: -1 },
      { rMultiple: null },   // open trade — excluded
    ]
    expect(calcExpectancyR(trades)).toBeCloseTo(0.5, 10)
  })
})

// ── calcSharpeRatio ────────────────────────────────────────────────────────

describe("calcSharpeRatio", () => {
  it("returns null for empty array", () => {
    expect(calcSharpeRatio([])).toBeNull()
  })

  it("returns null for single element (no variance)", () => {
    expect(calcSharpeRatio([2])).toBeNull()
  })

  it("returns null when all returns are identical (std dev = 0)", () => {
    expect(calcSharpeRatio([1, 1, 1, 1])).toBeNull()
  })

  it("computes Sharpe with sample std dev (Bessel correction n-1)", () => {
    // data: [1, -1, 2, -2]  mean=0  variance=(1+1+4+4)/3 = 10/3  std=sqrt(10/3)
    // Sharpe = 0 / sqrt(10/3) = 0
    expect(calcSharpeRatio([1, -1, 2, -2])).toBeCloseTo(0, 10)
  })

  it("returns positive Sharpe for consistently positive returns", () => {
    // data: [1, 2, 1.5, 2.5]  mean=1.75  all > 0 → Sharpe > 0
    const result = calcSharpeRatio([1, 2, 1.5, 2.5])
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThan(0)
  })

  it("returns negative Sharpe for consistently negative returns", () => {
    // all losses → mean < 0 → Sharpe < 0
    const result = calcSharpeRatio([-1, -0.5, -2, -1.5])
    expect(result).not.toBeNull()
    expect(result!).toBeLessThan(0)
  })

  it("uses n-1 denominator (not n)", () => {
    // For [2, 4]: mean=3, variance with n-1 = ((2-3)^2+(4-3)^2)/1 = 2, std=sqrt(2)
    // Sharpe = 3/sqrt(2) ≈ 2.1213
    // With n: variance = 1, std=1, Sharpe = 3 (wrong)
    const result = calcSharpeRatio([2, 4])
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(3 / Math.sqrt(2), 10)
  })
})

// ── calcProfitFactor ───────────────────────────────────────────────────────

describe("calcProfitFactor", () => {
  it("returns 0 when no wins and no losses", () => {
    expect(calcProfitFactor(0, 0)).toBe(0)
  })

  it("returns 999 when no losses (infinite profit factor)", () => {
    expect(calcProfitFactor(500, 0)).toBe(999)
  })

  it("returns 0 when no wins but has losses", () => {
    expect(calcProfitFactor(0, 300)).toBe(0)
  })

  it("computes correct ratio for balanced wins and losses", () => {
    // 600 gross win, 200 gross loss → PF = 3
    expect(calcProfitFactor(600, 200)).toBeCloseTo(3, 10)
  })

  it("returns < 1 when losses exceed wins", () => {
    // 100 gross win, 400 gross loss → PF = 0.25
    expect(calcProfitFactor(100, 400)).toBeCloseTo(0.25, 10)
  })

  it("returns exactly 1 when wins equal losses", () => {
    expect(calcProfitFactor(250, 250)).toBe(1)
  })
})

// ── getISOWeekKey ──────────────────────────────────────────────────────────

describe("getISOWeekKey", () => {
  it("formats key as YYYY-WNN with zero-padded week number", () => {
    // 2026-01-05 is week 2 of 2026
    expect(getISOWeekKey(new Date("2026-01-05"))).toBe("2026-W02")
  })

  it("week 1 of 2026 (contains first Thursday = Jan 1, 2026)", () => {
    // Jan 1 2026 is a Thursday → it's in week 1 of 2026
    expect(getISOWeekKey(new Date("2026-01-01"))).toBe("2026-W01")
  })

  it("handles year boundary: 2024-12-30 belongs to 2025-W01", () => {
    // 2024-12-30 is Monday of the week containing Thu Jan 2, 2025 → 2025-W01
    expect(getISOWeekKey(new Date("2024-12-30"))).toBe("2025-W01")
  })

  it("handles year boundary: 2025-01-01 also belongs to 2025-W01", () => {
    expect(getISOWeekKey(new Date("2025-01-01"))).toBe("2025-W01")
  })

  it("last week of 2024: 2024-12-23 is 2024-W52", () => {
    expect(getISOWeekKey(new Date("2024-12-23"))).toBe("2024-W52")
  })

  it("week number is zero-padded for single-digit weeks", () => {
    // 2026-01-05 → W02 (not W2)
    const key = getISOWeekKey(new Date("2026-01-05"))
    expect(key).toMatch(/W\d{2}$/)
  })

  it("2026-12-28 → 2026-W53 (year starting on Thursday has 53 ISO weeks)", () => {
    expect(getISOWeekKey(new Date("2026-12-28"))).toBe("2026-W53")
  })
})
