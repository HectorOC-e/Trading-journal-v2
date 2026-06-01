/**
 * Unit Tests: Win Rate Formulas
 * Tests for isWin() and calcWinRate() functions
 */

import { describe, it, expect } from 'vitest'
import { isWin, calcWinRate } from '@/lib/formulas'

describe('isWin()', () => {
  it('returns true when pnl > 0', () => {
    expect(isWin({ pnl: 0.01 })).toBe(true)
    expect(isWin({ pnl: 100 })).toBe(true)
    expect(isWin({ pnl: 0.001 })).toBe(true)
  })

  it('returns false when pnl = 0 (breakeven is not a win)', () => {
    expect(isWin({ pnl: 0 })).toBe(false)
  })

  it('returns false when pnl < 0', () => {
    expect(isWin({ pnl: -0.01 })).toBe(false)
    expect(isWin({ pnl: -100 })).toBe(false)
  })

  it('treats null pnl as 0 (loss)', () => {
    expect(isWin({ pnl: null })).toBe(false)
  })

  it('handles edge case: Infinity', () => {
    expect(isWin({ pnl: Infinity })).toBe(true)
    expect(isWin({ pnl: -Infinity })).toBe(false)
  })

  it('handles edge case: very small positive', () => {
    expect(isWin({ pnl: 0.0000001 })).toBe(true)
  })
})

describe('calcWinRate()', () => {
  it('returns 0 when wins = 0', () => {
    expect(calcWinRate(0, 10)).toBe(0)
  })

  it('returns 100 when all trades are wins', () => {
    expect(calcWinRate(10, 10)).toBe(100)
  })

  it('returns correct percentage for mixed results', () => {
    expect(calcWinRate(5, 10)).toBe(50)
    expect(calcWinRate(6, 10)).toBe(60)
    expect(calcWinRate(3, 7)).toBeCloseTo(42.857142857, 5)
  })

  it('returns 0 when total = 0 (safe default)', () => {
    expect(calcWinRate(0, 0)).toBe(0)
    expect(calcWinRate(5, 0)).toBe(0)
  })

  it('preserves decimal precision (does not round)', () => {
    const wr = calcWinRate(1, 3)
    expect(wr).toBeCloseTo(33.33333, 5)
    expect(wr).not.toBe(33)
  })

  it('handles large numbers', () => {
    expect(calcWinRate(600, 1000)).toBe(60)
    expect(calcWinRate(1, 1000000)).toBeCloseTo(0.0001, 5)
  })

  it('handles edge case: wins > total (should not happen, but graceful)', () => {
    // This shouldn't happen in practice, but function should handle it
    expect(calcWinRate(100, 10)).toBe(1000)
  })
})
