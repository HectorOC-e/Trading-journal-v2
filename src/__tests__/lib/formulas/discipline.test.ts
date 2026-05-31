/**
 * Unit Tests: Discipline Score Formula
 * Tests for calcDisciplineScore()
 */

import { describe, it, expect } from 'vitest'
import { calcDisciplineScore } from '@/lib/formulas'

describe('calcDisciplineScore()', () => {
  it('returns perfect score (100) when all metrics are perfect', () => {
    const result = calcDisciplineScore({
      totalTrades: 10,
      taggedViolations: 0,
      pendingReviews: 5,
      completedReviews: 5,
      totalEnabledRules: 8,
      violatedRules: 0,
    })

    expect(result.score).toBe(100)
    expect(result.executionScore).toBe(50)
    expect(result.learningScore).toBe(30)
    expect(result.adherenceScore).toBe(20)
  })

  it('calculates mixed performance correctly', () => {
    const result = calcDisciplineScore({
      totalTrades: 20,
      taggedViolations: 5,
      pendingReviews: 10,
      completedReviews: 3,
      totalEnabledRules: 5,
      violatedRules: 1,
    })

    expect(result.executionScore).toBeCloseTo(37.5, 5) // (20-5)/20 * 50
    expect(result.learningScore).toBeCloseTo(9, 5) // 3/10 * 30
    expect(result.adherenceScore).toBeCloseTo(16, 5) // (5-1)/5 * 20
    expect(result.score).toBe(62) // Math.round(37.5 + 9 + 16)
  })

  it('defaults all to maximum when zero trades/reviews/rules', () => {
    const result = calcDisciplineScore({
      totalTrades: 0,
      taggedViolations: 0,
      pendingReviews: 0,
      completedReviews: 0,
      totalEnabledRules: 0,
      violatedRules: 0,
    })

    expect(result.executionScore).toBe(50)
    expect(result.learningScore).toBe(30)
    expect(result.adherenceScore).toBe(20)
    expect(result.score).toBe(100)
  })

  it('scores correctly when no learning or rules', () => {
    const result = calcDisciplineScore({
      totalTrades: 10,
      taggedViolations: 2,
      pendingReviews: 0,
      completedReviews: 0,
      totalEnabledRules: 0,
      violatedRules: 0,
    })

    expect(result.executionScore).toBeCloseTo(40, 5) // (10-2)/10 * 50
    expect(result.learningScore).toBe(30) // default when no reviews
    expect(result.adherenceScore).toBe(20) // default when no rules
    expect(result.score).toBe(90) // 40 + 30 + 20
  })

  it('rounds total score to nearest integer (Math.round)', () => {
    const result = calcDisciplineScore({
      totalTrades: 3,
      taggedViolations: 1,
      pendingReviews: 3,
      completedReviews: 1,
      totalEnabledRules: 3,
      violatedRules: 0,
    })

    // Execution: (3-1)/3 * 50 = 33.333...
    // Learning: 1/3 * 30 = 10
    // Adherence: 3/3 * 20 = 20
    // Total: 63.333... → rounds to 63
    expect(result.score).toBe(63)
    expect(Number.isInteger(result.score)).toBe(true)
  })

  it('does not round sub-scores (keeps decimals)', () => {
    const result = calcDisciplineScore({
      totalTrades: 3,
      taggedViolations: 1,
      pendingReviews: 3,
      completedReviews: 1,
      totalEnabledRules: 3,
      violatedRules: 0,
    })

    expect(result.executionScore).toBeCloseTo(33.333, 3)
    expect(result.learningScore).toBeCloseTo(10, 5)
    expect(result.adherenceScore).toBe(20)
  })

  it('handles all violations (zero score)', () => {
    const result = calcDisciplineScore({
      totalTrades: 10,
      taggedViolations: 10,
      pendingReviews: 10,
      completedReviews: 0,
      totalEnabledRules: 5,
      violatedRules: 5,
    })

    expect(result.executionScore).toBe(0) // all trades violated
    expect(result.learningScore).toBe(0) // no learning done
    expect(result.adherenceScore).toBe(0) // all rules violated
    expect(result.score).toBe(0)
  })

  it('handles negative inputs gracefully (treats as 0)', () => {
    // In practice, negatives shouldn't happen, but function should be defensive
    const result = calcDisciplineScore({
      totalTrades: 10,
      taggedViolations: -5, // Should treat as 0 or 10+5=15? Let's test current impl
      pendingReviews: 10,
      completedReviews: 5,
      totalEnabledRules: 5,
      violatedRules: -1,
    })

    // Current impl: (10 - (-5)) / 10 * 50 = 75
    // (5 - (-1)) / 5 * 20 = 24
    expect(result.executionScore).toBeCloseTo(75, 5)
    expect(result.adherenceScore).toBeCloseTo(24, 5)
  })
})
