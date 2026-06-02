/**
 * Drawdown Formulas
 * Peak-to-trough drawdown calculation and percentage conversion.
 * Moved from account-service.ts to centralized formula module.
 *
 * Decision 1.5: Variant — Peak-to-Trough (maximum unrealized loss from any peak)
 * Format — Percentage 0–100 (e.g., 12.5 means 12.5% drawdown)
 */

/**
 * Calculate maximum peak-to-trough drawdown from a P&L sequence.
 *
 * Algorithm: Track cumulative P&L, maintain peak value, measure max decline from peak.
 *
 * @param pnlSequence - Array of P&L values in chronological order
 * @returns Maximum drawdown amount (absolute, always ≥ 0)
 *
 * @example
 * // Equity curve: [1000, 1200, 900, 1100]
 * // Peak 1200, trough 900 → DD = 300
 * computeMaxDrawdown([100, 200, -300, 200]) // 300
 *
 * computeMaxDrawdown([])                     // 0
 * computeMaxDrawdown([100, 200, 300])        // 0 (no drawdown)
 * computeMaxDrawdown([-100, 50, -100])       // 150
 */
export function computeMaxDrawdown(pnlSequence: number[]): number {
  let cum = 0
  let peak = 0
  let maxDd = 0

  for (const pnl of pnlSequence) {
    cum += pnl
    if (cum > peak) peak = cum
    const dd = peak - cum
    if (dd > maxDd) maxDd = dd
  }

  return maxDd
}

/**
 * Convert maximum drawdown amount to percentage of initial balance.
 *
 * @param maxDdDollar - Max drawdown in dollar/point amount
 * @param initBal - Initial account balance
 * @returns Drawdown as percentage (0–100, e.g., 12.5 = 12.5%)
 *
 * @example
 * // $2,000 drawdown on $10,000 account = 20% drawdown
 * calcDrawdownPct(2000, 10000)  // 20.0
 *
 * calcDrawdownPct(0, 10000)     // 0.0
 * calcDrawdownPct(10000, 10000) // 100.0 (100% wipeout)
 * calcDrawdownPct(1000, 0)      // 0.0 (safe when initial = 0)
 * calcDrawdownPct(15000, 10000) // 150.0 (over 100% blown account)
 */
export function calcDrawdownPct(
  maxDdDollar: number,
  initBal: number,
): number {
  return initBal > 0 ? (maxDdDollar / initBal) * 100 : 0
}
