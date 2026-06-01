/**
 * Performance & Profit Formulas
 * Sharpe ratio, profit factor, and net P&L calculations.
 */

/**
 * Calculate Sharpe Ratio from R-multiple sequence.
 *
 * Sharpe = Mean(R) / StdDev(R)
 * Uses Bessel-corrected sample standard deviation (n-1 denominator).
 *
 * @param rMultiples - Array of R-multiple values in sequence
 * @returns Sharpe ratio (higher = more consistent returns), or null if < 2 points or zero std dev
 *
 * @example
 * // Consistent returns: [1.0, 1.2, 0.9, 1.1, 1.0] → high Sharpe
 * calcSharpeRatio([1.0, 1.2, 0.9, 1.1, 1.0])  // ≈ 10.2
 *
 * // Volatile returns: [3.0, -2.0, 4.0, -1.5, 2.0] → low Sharpe
 * calcSharpeRatio([3.0, -2.0, 4.0, -1.5, 2.0]) // ≈ 0.5
 *
 * calcSharpeRatio([])           // null (no data)
 * calcSharpeRatio([1.0])        // null (< 2 points)
 * calcSharpeRatio([1.0, 1.0])   // null (zero std dev)
 */
export function calcSharpeRatio(rMultiples: number[]): number | null {
  if (rMultiples.length < 2) return null

  const mean = rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length

  // Bessel-corrected sample std dev (n-1 denominator)
  const variance =
    rMultiples.reduce((a, b) => a + (b - mean) ** 2, 0) /
    (rMultiples.length - 1)
  const std = Math.sqrt(variance)

  return std > 0 ? mean / std : null
}

/**
 * Calculate profit factor (wins / losses ratio).
 *
 * Profit Factor = Total Wins / Absolute(Total Losses)
 * - > 1: Profitable (earn more than lose)
 * - = 1: Breakeven
 * - < 1: Losing (lose more than earn)
 * - 999: No losses (perfect; treated as infinite)
 *
 * @param grossWin - Total P&L from all winning trades
 * @param grossLoss - Total P&L from all losing trades (usually negative)
 * @returns Profit factor ratio (0–999)
 *
 * @example
 * // Win $10k, lose $5k → PF = 2.0 (earn $2 for every $1 lost)
 * calcProfitFactor(10000, -5000)  // 2.0
 *
 * // Win $10k, no losses → PF = 999 (perfect)
 * calcProfitFactor(10000, 0)      // 999
 *
 * // No wins → PF = 0
 * calcProfitFactor(0, -5000)      // 0
 *
 * // Losing trader: win $1k, lose $10k → PF = 0.1
 * calcProfitFactor(1000, -10000)  // 0.1
 */
export function calcProfitFactor(grossWin: number, grossLoss: number): number {
  if (grossLoss === 0 && grossWin > 0) return 999
  if (grossWin === 0) return 0
  return grossWin / Math.abs(grossLoss)
}

/**
 * Calculate total net P&L from array of trades.
 *
 * @param trades - Array of trades with pnl field
 * @returns Sum of all P&L values (null treated as 0)
 *
 * @example
 * calcNetPnl([
 *   { pnl: 100 },
 *   { pnl: -50 },
 *   { pnl: null },
 *   { pnl: 200 },
 * ])  // 250
 *
 * calcNetPnl([])                // 0
 * calcNetPnl([{ pnl: null }])   // 0
 */
export function calcNetPnl(trades: { pnl: number | null }[]): number {
  return trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0)
}
