/**
 * Win Rate Formulas
 * Canonical implementations for all win-rate calculations across the platform.
 * Single source of truth to eliminate duplication.
 *
 * Decision 1.4: Canonical Criterion — pnl > 0
 * A trade IS a win if and only if P&L is strictly positive (> 0).
 */

/**
 * Determine if a single trade is a "win" (made money).
 *
 * @param trade - Trade with pnl field
 * @returns true if pnl > 0, false otherwise (includes pnl = 0 as loss)
 *
 * @example
 * isWin({ pnl: 100 })    // true
 * isWin({ pnl: 0 })      // false (breakeven is not a win)
 * isWin({ pnl: -50 })    // false
 * isWin({ pnl: null })   // false (null treated as 0)
 */
export function isWin(trade: { pnl: number | null }): boolean {
  return (trade.pnl ?? 0) > 0
}

/**
 * Calculate win rate as a percentage (0–100).
 *
 * @param wins - Number of winning trades (pnl > 0)
 * @param total - Total number of trades
 * @returns Win rate as percentage (e.g., 65.5 = 65.5% win rate)
 *
 * @example
 * calcWinRate(65, 100)   // 65.0
 * calcWinRate(0, 10)     // 0.0
 * calcWinRate(10, 10)    // 100.0
 * calcWinRate(5, 7)      // 71.42857...
 * calcWinRate(1, 0)      // 0.0 (safe when total = 0)
 */
export function calcWinRate(wins: number, total: number): number {
  return total > 0 ? (wins / total) * 100 : 0
}
