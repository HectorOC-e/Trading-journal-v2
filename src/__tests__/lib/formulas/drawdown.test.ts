/**
 * Unit Tests: Drawdown Formulas
 * Tests for computeMaxDrawdown() and calcDrawdownPct()
 */

import { describe, it, expect } from 'vitest'
import { computeMaxDrawdown, computeDrawdownFromInitial, calcDrawdownPct } from '@/lib/formulas'

describe('computeMaxDrawdown()', () => {
  it('returns 0 for empty array', () => {
    expect(computeMaxDrawdown([])).toBe(0)
  })

  it('returns 0 for monotonic gains (no drawdown)', () => {
    expect(computeMaxDrawdown([100, 200, 300])).toBe(0)
  })

  it('calculates single drawdown correctly', () => {
    // Cumulative: [100, 200, 0, 100]
    // Peak at 200, trough at 0 → DD = 200
    expect(computeMaxDrawdown([100, 100, -200, 100])).toBe(200)
  })

  it('returns maximum of multiple drawdowns', () => {
    // Cumulative: [100, 150, 50, 100, 80]
    // Peak 150, trough 50 → DD1 = 100
    // Peak 100, trough 80 → DD2 = 20
    // Max = 100
    expect(computeMaxDrawdown([100, 50, -100, 50, -20])).toBe(100)
  })

  it('handles negative initial sequence', () => {
    // Cumulative: [-100, -50, -200]
    // Peak 0, trough -200 → DD = 200
    expect(computeMaxDrawdown([-100, 50, -150])).toBe(200)
  })

  it('example from spec: [100, 200, -300, 200]', () => {
    // Cumulative: [100, 300, 0, 200]
    // Peak 300, trough 0 → DD = 300
    expect(computeMaxDrawdown([100, 200, -300, 200])).toBe(300)
  })

  it('single trade: no drawdown', () => {
    expect(computeMaxDrawdown([100])).toBe(0)
  })

  it('handles large numbers', () => {
    expect(computeMaxDrawdown([1000000, -500000])).toBe(500000)
  })

  it('handles decimal values', () => {
    const dd = computeMaxDrawdown([10.5, -5.2, 3.1])
    expect(dd).toBeCloseTo(5.2, 5)
  })
})

describe('computeDrawdownFromInitial()', () => {
  it('returns 0 for empty array', () => {
    expect(computeDrawdownFromInitial([])).toBe(0)
  })

  it('returns 0 while equity stays at or above initial', () => {
    // Cumulative: [100, 300, 200] — never below initial (0)
    expect(computeDrawdownFromInitial([100, 200, -100])).toBe(0)
  })

  it('ignores prior profit — only counts drop below initial (FTMO rule)', () => {
    // Cumulative: [200, -100] → deepest point -100 below initial
    // (peak-to-trough would be 300; from-initial is 100)
    expect(computeDrawdownFromInitial([200, -300])).toBe(100)
  })

  it('matches the worst point below initial across the sequence', () => {
    // Cumulative: [-100, -50, -150] → deepest -150
    expect(computeDrawdownFromInitial([-100, 50, -100])).toBe(150)
  })

  it('reproduces the FTMO card scenario (small win then losses)', () => {
    // +164 then two losses to net -6236 → deepest below initial = 6236
    expect(computeDrawdownFromInitial([164, -3200, -3200])).toBe(6236)
  })

  it('single losing trade', () => {
    expect(computeDrawdownFromInitial([-500])).toBe(500)
  })
})

describe('calcDrawdownPct()', () => {
  it('returns 0 when maxDd = 0', () => {
    expect(calcDrawdownPct(0, 10000)).toBe(0)
  })

  it('calculates percentage correctly for normal case', () => {
    expect(calcDrawdownPct(2000, 10000)).toBe(20)
    expect(calcDrawdownPct(5000, 10000)).toBe(50)
  })

  it('returns 100 when drawdown equals initial balance (100% wipeout)', () => {
    expect(calcDrawdownPct(10000, 10000)).toBe(100)
  })

  it('handles drawdown > initial balance (over 100%)', () => {
    expect(calcDrawdownPct(15000, 10000)).toBe(150)
  })

  it('returns 0 when initial balance = 0 (safe default)', () => {
    expect(calcDrawdownPct(1000, 0)).toBe(0)
  })

  it('returns 0 when initial balance is negative (safe default)', () => {
    expect(calcDrawdownPct(1000, -5000)).toBe(0)
  })

  it('preserves decimal precision', () => {
    const dd = calcDrawdownPct(1500, 10000)
    expect(dd).toBeCloseTo(15, 5)
  })

  it('handles large numbers', () => {
    expect(calcDrawdownPct(500000, 10000000)).toBe(5)
  })

  it('handles small percentages', () => {
    const dd = calcDrawdownPct(100, 1000000)
    expect(dd).toBeCloseTo(0.01, 5)
  })
})
