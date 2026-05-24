/**
 * Pure financial formula functions — platform-agnostic, importable from
 * both the tRPC server router and React client components.
 */

type TradeForFormula = {
  rMultiple: number | null
  pnl:       number | null
}

/**
 * Expectancy in R-multiples: E[R] = winRate × avgWinR − lossRate × avgLossR
 *
 * Only trades that have a recorded rMultiple contribute to the calculation.
 * avgLossR falls back to 1.0 when there are no closed losing trades yet.
 */
export function calcExpectancyR(trades: TradeForFormula[]): number {
  const withR = trades.filter(
    (t): t is TradeForFormula & { rMultiple: number } => t.rMultiple != null,
  )
  if (withR.length === 0) return 0

  const wins   = withR.filter(t => t.rMultiple > 0)
  const losses = withR.filter(t => t.rMultiple <= 0)

  const avgWinR  = wins.length   > 0
    ? wins.reduce((s, t) => s + t.rMultiple, 0) / wins.length
    : 0
  const avgLossR = losses.length > 0
    ? Math.abs(losses.reduce((s, t) => s + t.rMultiple, 0) / losses.length)
    : 1

  const wr = wins.length / withR.length
  return wr * avgWinR - (1 - wr) * avgLossR
}

/**
 * Sharpe ratio using sample standard deviation (Bessel's correction: n−1).
 * Returns null when fewer than 2 data points (variance is undefined).
 * Returns null when std dev = 0 (all returns identical).
 */
export function calcSharpeRatio(rMultiples: number[]): number | null {
  if (rMultiples.length < 2) return null
  const mean     = rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length
  const variance = rMultiples.reduce((a, b) => a + (b - mean) ** 2, 0) / (rMultiples.length - 1)
  const std      = Math.sqrt(variance)
  return std > 0 ? mean / std : null
}

/**
 * Profit factor: gross winning PnL ÷ gross losing PnL (absolute value).
 * Returns 999 when no losses exist and there are wins (effectively infinite).
 * Returns 0 when there are no wins.
 */
export function calcProfitFactor(grossWin: number, grossLoss: number): number {
  if (grossLoss === 0) return grossWin > 0 ? 999 : 0
  return grossWin / grossLoss
}

/**
 * ISO 8601–correct week grouping key: "YYYY-WNN".
 * The week containing the first Thursday of the year is week 1.
 * Correct for boundary years (e.g. 2024-12-30 → "2025-W01").
 */
export function getISOWeekKey(date: Date): string {
  const d = new Date(date.getTime())
  d.setHours(0, 0, 0, 0)
  // Shift to nearest Thursday (Mon=0 … Sun=6)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const jan4    = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(
    ((d.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getDay() + 6) % 7)) / 7,
  )
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`
}
