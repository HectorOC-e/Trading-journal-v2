export type SetupHealthStatus = "healthy" | "warning" | "critical" | "insufficient"

export interface SetupHealthParams {
  winRate:     number        // 0–100
  avgR:        number        // average R-multiple
  expectedWr:  number | null // user-set expectation (0–100)
  expectedAvgR: number | null // user-set min avg R
  tradeCount:  number
}

/**
 * Classify a setup's health based on actual vs expected performance.
 *
 * - insufficient: fewer than 5 trades (too little data to judge)
 * - healthy:  winRate ≥ expectedWr AND avgR ≥ expectedAvgR
 * - critical: winRate < expectedWr × 0.7 OR avgR < 0
 * - warning:  everything else
 *
 * When expectedWr or expectedAvgR is null, the respective check is skipped
 * and the remaining criterion determines the status.
 */
export function calcSetupHealth(params: SetupHealthParams): SetupHealthStatus {
  const { winRate, avgR, expectedWr, expectedAvgR, tradeCount } = params
  if (tradeCount < 5) return "insufficient"

  const wrOk  = expectedWr   == null || winRate >= expectedWr
  const rOk   = expectedAvgR == null || avgR >= expectedAvgR
  const wrBad = expectedWr   != null && winRate < expectedWr * 0.7
  const rBad  = avgR < 0

  if (wrBad || rBad) return "critical"
  if (wrOk && rOk)   return "healthy"
  return "warning"
}
