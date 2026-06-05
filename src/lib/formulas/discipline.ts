/**
 * Discipline Score Formula
 * Composite scoring from execution, learning, and rule adherence.
 * Replaces 3 different implementations across platform.
 */

export interface DisciplineParams {
  totalTrades: number
  taggedViolations: number
  pendingReviews: number
  completedReviews: number
  totalEnabledRules: number
  violatedRules: number
}

export interface DisciplineBreakdown {
  score: number
  executionScore: number
  learningScore: number
  adherenceScore: number
}

/**
 * Calculate composite discipline score (0–100) from behavioral metrics.
 *
 * Composition:
 * - Execution Score (0–50): % of trades without behavioral violations
 * - Learning Score (0–30): % of learning resources completed
 * - Adherence Score (0–20): % of enabled rules followed
 *
 * @param params - Discipline calculation parameters
 * @returns Breakdown with total score (rounded) and sub-scores (decimal)
 *
 * @example
 * // Perfect score: all trades clean, all learning done, all rules followed
 * calcDisciplineScore({
 *   totalTrades: 10, taggedViolations: 0,
 *   pendingReviews: 5, completedReviews: 5,
 *   totalEnabledRules: 8, violatedRules: 0,
 * })
 * // { score: 100, executionScore: 50, learningScore: 30, adherenceScore: 20 }
 *
 * // Mixed performance
 * calcDisciplineScore({
 *   totalTrades: 20, taggedViolations: 5,
 *   pendingReviews: 10, completedReviews: 3,
 *   totalEnabledRules: 5, violatedRules: 1,
 * })
 * // { score: 62, executionScore: 37.5, learningScore: 9, adherenceScore: 16 }
 *
 * // Zero trades (defaults to max for available component)
 * calcDisciplineScore({
 *   totalTrades: 0, taggedViolations: 0,
 *   pendingReviews: 0, completedReviews: 0,
 *   totalEnabledRules: 0, violatedRules: 0,
 * })
 * // { score: 100, executionScore: 50, learningScore: 30, adherenceScore: 20 }
 */
export function calcDisciplineScore(
  params: DisciplineParams,
): DisciplineBreakdown {
  const {
    totalTrades,
    taggedViolations,
    pendingReviews,
    completedReviews,
    totalEnabledRules,
    violatedRules,
  } = params

  // Execution: % of trades without behavioral tags (FOMO, Off-plan, etc.)
  // Returns 0 when there are no trades — no evidence of discipline without activity.
  const executionScore =
    totalTrades > 0
      ? ((totalTrades - taggedViolations) / totalTrades) * 50
      : 0

  // Learning: % of learning resources completed for review
  const learningScore =
    pendingReviews > 0 ? (completedReviews / pendingReviews) * 30 : 30

  // Adherence: % of enabled rules that were followed
  const adherenceScore =
    totalEnabledRules > 0
      ? ((totalEnabledRules - violatedRules) / totalEnabledRules) * 20
      : 20

  return {
    score: Math.round(executionScore + learningScore + adherenceScore),
    executionScore,
    learningScore,
    adherenceScore,
  }
}
