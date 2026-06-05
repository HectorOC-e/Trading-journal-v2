export type LossLimitPeriod = "DAILY" | "WEEKLY" | "MONTHLY"

export type PropFirmViolation =
  | { type: "DAILY_LOSS_LIMIT";   limitPct:  number; currentPct: number }
  | { type: "WEEKLY_LOSS_LIMIT";  limitPct:  number; currentPct: number }
  | { type: "MONTHLY_LOSS_LIMIT"; limitPct:  number; currentPct: number }
  | { type: "MAX_TRADES";          limit:     number; current:    number }
  | { type: "SYMBOL_NOT_ALLOWED";  symbol:    string; allowed:    string[] }

const LOSS_LIMIT_TYPE: Record<LossLimitPeriod, "DAILY_LOSS_LIMIT" | "WEEKLY_LOSS_LIMIT" | "MONTHLY_LOSS_LIMIT"> = {
  DAILY:   "DAILY_LOSS_LIMIT",
  WEEKLY:  "WEEKLY_LOSS_LIMIT",
  MONTHLY: "MONTHLY_LOSS_LIMIT",
}

/**
 * Generic loss-limit check. `periodLoss` is the net realized P&L over the period
 * (negative for a net loss). Returns a violation when the realized loss reaches the
 * configured percentage of the initial balance. Applies to ALL account types — a
 * daily/weekly/monthly loss cap is a universal risk rule, not prop-firm-only.
 */
export function checkLossLimit(
  period:         LossLimitPeriod,
  periodLoss:     number,
  initialBalance: number,
  limitPct:       number | null,
): PropFirmViolation | null {
  if (limitPct == null || limitPct <= 0 || initialBalance <= 0) return null
  const currentPct = Math.abs(Math.min(0, periodLoss)) / initialBalance * 100
  if (currentPct >= limitPct) {
    return { type: LOSS_LIMIT_TYPE[period], limitPct, currentPct }
  }
  return null
}

/** @deprecated use checkLossLimit("DAILY", …). Retained for existing call sites/tests. */
export function checkDailyLossLimit(
  todayLoss:      number,
  initialBalance: number,
  ddDailyPct:     number,
): PropFirmViolation | null {
  return checkLossLimit("DAILY", todayLoss, initialBalance, ddDailyPct)
}

export function checkTradeCountLimit(
  todayCount:      number,
  maxTradesPerDay: number,
): PropFirmViolation | null {
  if (todayCount >= maxTradesPerDay) {
    return { type: "MAX_TRADES", limit: maxTradesPerDay, current: todayCount }
  }
  return null
}

export function checkSymbolAllowlist(
  symbol:         string,
  allowedSymbols: string[],
): PropFirmViolation | null {
  if (allowedSymbols.length === 0) return null
  const upper   = symbol.toUpperCase()
  const allowed = allowedSymbols.map(s => s.toUpperCase())
  if (!allowed.includes(upper)) {
    return { type: "SYMBOL_NOT_ALLOWED", symbol, allowed: allowedSymbols }
  }
  return null
}
