/**
 * Unit Tests: Risk & Performance Formulas
 * Tests for calcRMultiple, calcAvgR, calcExpectancyR, calcSharpeRatio, calcProfitFactor, calcNetPnl
 */

import { describe, it, expect } from 'vitest'
import {
  calcRMultiple,
  calcAvgR,
  calcExpectancyR,
  calcSharpeRatio,
  calcProfitFactor,
  calcNetPnl,
} from '@/lib/formulas'

describe('calcRMultiple()', () => {
  it('calculates LONG win correctly', () => {
    const r = calcRMultiple('LONG', 100, 95, 110)
    expect(r).toBeCloseTo(2.0, 5)
  })

  it('calculates SHORT win correctly', () => {
    const r = calcRMultiple('SHORT', 100, 105, 90)
    expect(r).toBeCloseTo(2.0, 5)
  })

  it('calculates LONG loss correctly', () => {
    const r = calcRMultiple('LONG', 100, 95, 92)
    expect(r).toBeCloseTo(-1.6, 5)
  })

  it('returns null when risk distance is 0', () => {
    expect(calcRMultiple('LONG', 100, 100, 110)).toBeNull()
  })

  it('calculates breakeven (close = entry)', () => {
    const r = calcRMultiple('LONG', 100, 95, 100)
    expect(r).toBeCloseTo(0, 5)
  })

  it('handles decimal values', () => {
    const r = calcRMultiple('LONG', 100.5, 99.5, 102.5)
    expect(r).toBeCloseTo(2.0, 5)
  })
})

describe('calcAvgR()', () => {
  it('returns 0 for empty array', () => {
    expect(calcAvgR([])).toBe(0)
  })

  it('returns 0 when all rMultiples are null', () => {
    expect(calcAvgR([{ rMultiple: null }])).toBe(0)
  })

  it('calculates average of multiple R values', () => {
    const avg = calcAvgR([
      { rMultiple: 2.0 },
      { rMultiple: 1.5 },
      { rMultiple: -1.0 },
    ])
    expect(avg).toBeCloseTo(2.5 / 3, 5) // 0.833...
  })

  it('ignores null rMultiples in calculation', () => {
    const avg = calcAvgR([
      { rMultiple: 2.0 },
      { rMultiple: 1.5 },
      { rMultiple: -1.0 },
      { rMultiple: null },
    ])
    expect(avg).toBeCloseTo(2.5 / 3, 5) // Same as above
  })

  it('handles all positive R', () => {
    const avg = calcAvgR([
      { rMultiple: 2.0 },
      { rMultiple: 2.0 },
      { rMultiple: 2.0 },
    ])
    expect(avg).toBe(2.0)
  })

  it('handles all negative R', () => {
    const avg = calcAvgR([
      { rMultiple: -1.0 },
      { rMultiple: -1.0 },
      { rMultiple: -1.0 },
    ])
    expect(avg).toBe(-1.0)
  })
})

describe('calcExpectancyR()', () => {
  it('returns 0 for empty array', () => {
    expect(calcExpectancyR([])).toBe(0)
  })

  it('calculates positive expectancy correctly', () => {
    // 3 wins (2R each), 2 losses (1R each)
    // E = (0.6 * 2.0) - (0.4 * 1.0) = 1.2 - 0.4 = 0.8
    const exp = calcExpectancyR([
      { rMultiple: 2.0 },
      { rMultiple: 2.0 },
      { rMultiple: 2.0 },
      { rMultiple: -1.0 },
      { rMultiple: -1.0 },
    ])
    expect(exp).toBeCloseTo(0.8, 5)
  })

  it('calculates negative expectancy correctly', () => {
    // 1 win (1R), 3 losses (2R each)
    // E = (0.25 * 1.0) - (0.75 * 2.0) = 0.25 - 1.5 = -1.25
    const exp = calcExpectancyR([
      { rMultiple: 1.0 },
      { rMultiple: -2.0 },
      { rMultiple: -2.0 },
      { rMultiple: -2.0 },
    ])
    expect(exp).toBeCloseTo(-1.25, 5)
  })

  it('defaults avgLossR to 1.0 when no losses', () => {
    // All wins (3R each), no losses
    // E = (1.0 * 3.0) - (0 * 1.0) = 3.0
    const exp = calcExpectancyR([
      { rMultiple: 3.0 },
      { rMultiple: 3.0 },
      { rMultiple: 3.0 },
    ])
    expect(exp).toBe(3.0)
  })

  it('handles all losses', () => {
    // No wins, only losses (-1R each)
    // E = (0 * 0) - (1.0 * 1.0) = -1.0
    const exp = calcExpectancyR([
      { rMultiple: -1.0 },
      { rMultiple: -1.0 },
      { rMultiple: -1.0 },
    ])
    expect(exp).toBe(-1.0)
  })

  it('ignores null rMultiples', () => {
    const exp = calcExpectancyR([
      { rMultiple: 2.0 },
      { rMultiple: -1.0 },
      { rMultiple: null },
    ])
    expect(exp).toBeCloseTo(0.5, 5) // (0.5 * 2) - (0.5 * 1) = 0.5
  })
})

describe('calcSharpeRatio()', () => {
  it('returns null when < 2 data points', () => {
    expect(calcSharpeRatio([])).toBeNull()
    expect(calcSharpeRatio([1.0])).toBeNull()
  })

  it('returns null when zero std dev (all same)', () => {
    expect(calcSharpeRatio([1.0, 1.0, 1.0])).toBeNull()
  })

  it('calculates Sharpe for consistent returns (high Sharpe)', () => {
    const sharpe = calcSharpeRatio([1.0, 1.2, 0.9, 1.1, 1.0])
    expect(sharpe).toBeGreaterThan(5) // high Sharpe for low volatility
  })

  it('calculates Sharpe for volatile returns (low Sharpe)', () => {
    const sharpe = calcSharpeRatio([3.0, -2.0, 4.0, -1.5, 2.0])
    expect(sharpe).toBeGreaterThan(0) // positive mean
    expect(sharpe).toBeLessThan(1) // low Sharpe for high volatility
  })

  it('uses Bessel correction (n-1 denominator)', () => {
    // 2 data points: mean=1.5, variance=(0.5^2 + 0.5^2)/(2-1) = 0.5
    // std = sqrt(0.5) = 0.707..., sharpe = 1.5 / 0.707 = 2.12...
    const sharpe = calcSharpeRatio([1.0, 2.0])
    expect(sharpe).toBeCloseTo(2.121, 3)
  })
})

describe('calcProfitFactor()', () => {
  it('calculates profit factor for normal case', () => {
    expect(calcProfitFactor(10000, -5000)).toBe(2.0)
  })

  it('returns 999 when no losses (perfect)', () => {
    expect(calcProfitFactor(10000, 0)).toBe(999)
  })

  it('returns 0 when no wins', () => {
    expect(calcProfitFactor(0, -5000)).toBe(0)
  })

  it('handles negative gross loss (already absolute)', () => {
    expect(calcProfitFactor(10000, -3000)).toBeCloseTo(3.333, 3)
  })

  it('calculates for losing trader (PF < 1)', () => {
    expect(calcProfitFactor(1000, -10000)).toBeCloseTo(0.1, 5)
  })

  it('handles zero wins and zero losses', () => {
    expect(calcProfitFactor(0, 0)).toBe(0)
  })

  it('handles large numbers', () => {
    expect(calcProfitFactor(500000, -250000)).toBe(2.0)
  })
})

describe('calcNetPnl()', () => {
  it('returns 0 for empty array', () => {
    expect(calcNetPnl([])).toBe(0)
  })

  it('sums positive and negative P&L', () => {
    const netPnl = calcNetPnl([
      { pnl: 100 },
      { pnl: -50 },
      { pnl: 200 },
    ])
    expect(netPnl).toBe(250)
  })

  it('treats null pnl as 0', () => {
    const netPnl = calcNetPnl([
      { pnl: 100 },
      { pnl: null },
      { pnl: -50 },
    ])
    expect(netPnl).toBe(50)
  })

  it('handles all losses', () => {
    const netPnl = calcNetPnl([
      { pnl: -50 },
      { pnl: -100 },
      { pnl: -25 },
    ])
    expect(netPnl).toBe(-175)
  })

  it('handles all null pnl', () => {
    expect(calcNetPnl([{ pnl: null }, { pnl: null }])).toBe(0)
  })

  it('handles decimal values', () => {
    const netPnl = calcNetPnl([
      { pnl: 100.5 },
      { pnl: -50.25 },
      { pnl: 25.75 },
    ])
    expect(netPnl).toBeCloseTo(76, 5)
  })
})
