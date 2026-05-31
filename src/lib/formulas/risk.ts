/**
 * Risk/Reward Formulas
 * R-multiple calculation and expectancy metrics.
 */

/**
 * Calculate risk/reward multiple (R) for a single trade.
 *
 * R = (Profit / Risk Distance)
 * - Risk Distance = |entry - stop|
 * - Profit = adjusted for direction (LONG vs SHORT)
 *
 * @param direction - Trade direction ("LONG" | "SHORT")
 * @param entry - Entry price
 * @param stop - Stop loss price
 * @param closePrice - Price where trade was closed
 * @returns R-multiple (positive for wins, negative for losses, null if zero risk)
 *
 * @example
 * // LONG: entry 100, stop 95 (risk 5), close 110 (profit 10) = 2.0R
 * calcRMultiple("LONG", 100, 95, 110)  // 2.0
 *
 * // SHORT: entry 100, stop 105 (risk 5), close 90 (profit 10) = 2.0R
 * calcRMultiple("SHORT", 100, 105, 90) // 2.0
 *
 * // Loss: entry 100, stop 95 (risk 5), close 92 (loss 8) = -1.6R
 * calcRMultiple("LONG", 100, 95, 92)   // -1.6
 *
 * // Zero risk distance (can't calculate)
 * calcRMultiple("LONG", 100, 100, 110) // null
 */
export function calcRMultiple(
  direction: "LONG" | "SHORT",
  entry: number,
  stop: number,
  closePrice: number,
): number | null {
  const riskDistance = Math.abs(entry - stop)
  if (riskDistance === 0) return null

  return direction === "LONG"
    ? (closePrice - entry) / riskDistance
    : (entry - closePrice) / riskDistance
}

/**
 * Calculate average R-multiple across trades.
 *
 * @param trades - Array of trades with rMultiple field
 * @returns Average R (includes positive and negative, ignores null)
 *
 * @example
 * // [2.0, 1.5, -1.0, null] → avg of [2.0, 1.5, -1.0] = 0.833...
 * calcAvgR([
 *   { rMultiple: 2.0 },
 *   { rMultiple: 1.5 },
 *   { rMultiple: -1.0 },
 *   { rMultiple: null },
 * ])  // 0.8333...
 *
 * calcAvgR([])                          // 0
 * calcAvgR([{ rMultiple: null }])       // 0
 * calcAvgR([{ rMultiple: 0 }])          // 0
 */
export function calcAvgR(trades: { rMultiple: number | null }[]): number {
  const withR = trades.filter((t) => t.rMultiple != null)
  if (withR.length === 0) return 0
  return withR.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / withR.length
}

/**
 * Calculate expectancy in R terms (expected value per trade).
 *
 * E[R] = (Win% × Avg Win R) - (Loss% × Avg Loss R)
 *
 * @param trades - Array of trades with rMultiple field
 * @returns Expected R per trade (positive is profitable, negative is losing)
 *
 * @example
 * // 3 wins (2.0R each), 2 losses (1.0R each)
 * // E = (0.6 × 2.0) - (0.4 × 1.0) = 1.2 - 0.4 = 0.8R (positive expectancy)
 * calcExpectancyR([
 *   { rMultiple: 2.0 }, { rMultiple: 2.0 }, { rMultiple: 2.0 },
 *   { rMultiple: -1.0 }, { rMultiple: -1.0 },
 * ])  // 0.8
 *
 * calcExpectancyR([])                     // 0
 * calcExpectancyR([{ rMultiple: null }])  // 0
 * calcExpectancyR([{ rMultiple: 3.0 }])   // 3.0 (all wins, no losses)
 */
export function calcExpectancyR(
  trades: { rMultiple: number | null }[],
): number {
  const withR = trades.filter((t) => t.rMultiple != null)
  if (withR.length === 0) return 0

  const wins = withR.filter((t) => (t.rMultiple ?? 0) > 0)
  const losses = withR.filter((t) => (t.rMultiple ?? 0) <= 0)

  const wr = wins.length / withR.length
  const avgWinR =
    wins.length > 0
      ? wins.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / wins.length
      : 0
  const avgLossR =
    losses.length > 0
      ? Math.abs(
          losses.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / losses.length,
        )
      : 1

  return wr * avgWinR - (1 - wr) * avgLossR
}
