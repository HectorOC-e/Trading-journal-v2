export type LossLimitPeriod = "DAILY" | "WEEKLY" | "MONTHLY"

export type PropFirmViolation =
  | { type: "DAILY_LOSS_LIMIT";   limitPct:  number; currentPct: number }
  | { type: "WEEKLY_LOSS_LIMIT";  limitPct:  number; currentPct: number }
  | { type: "MONTHLY_LOSS_LIMIT"; limitPct:  number; currentPct: number }
  | { type: "MAX_TRADES";          limit:     number; current:    number }
  | { type: "SYMBOL_NOT_ALLOWED";  symbol:    string; allowed:    string[] }
  | { type: "TRAILING_DRAWDOWN"; limitPct: number; currentPct: number }
  | { type: "MAX_DRAWDOWN";      limitPct: number; currentPct: number }
  | { type: "CONSISTENCY";       limitPct: number; currentPct: number }
  | { type: "WEEKEND_HOLDING" }

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

/**
 * Total-drawdown check. FIXED: floor is limitPct% below the INITIAL balance.
 * TRAILING: floor is the same dollar amount below the running PEAK equity (the
 * max-loss line trails new highs). `currentPct` reports realized loss vs initial.
 * Uses realized/journaled equity — no live unrealized P&L (documented limitation).
 */
export function checkTrailingDrawdown(
  currentEquity:  number,
  peakEquity:     number,
  initialBalance: number,
  limitPct:       number | null,
  model:          "FIXED" | "TRAILING",
): PropFirmViolation | null {
  if (limitPct == null || limitPct <= 0 || initialBalance <= 0) return null
  const dollarLimit = (limitPct / 100) * initialBalance
  const anchor      = model === "TRAILING" ? Math.max(peakEquity, initialBalance) : initialBalance
  const floor       = anchor - dollarLimit
  if (currentEquity <= floor) {
    const currentPct = (initialBalance - currentEquity) / initialBalance * 100
    return {
      type: model === "TRAILING" ? "TRAILING_DRAWDOWN" : "MAX_DRAWDOWN",
      limitPct,
      currentPct,
    }
  }
  return null
}

/**
 * Consistency rule: no single winning day may exceed `consistencyPct`% of the net
 * total profit over the period. `dailyProfits` is net P&L per day. Only meaningful
 * when the period is net-positive; returns null otherwise.
 */
export function checkConsistency(
  dailyProfits:   number[],
  consistencyPct: number | null,
): PropFirmViolation | null {
  if (consistencyPct == null || consistencyPct <= 0) return null
  const total = dailyProfits.reduce((s, d) => s + d, 0)
  if (total <= 0) return null
  const bestDay    = Math.max(0, ...dailyProfits)
  const currentPct = bestDay / total * 100
  if (currentPct > consistencyPct) {
    return { type: "CONSISTENCY", limitPct: consistencyPct, currentPct }
  }
  return null
}

/**
 * Weekend-holding restriction: a position must not span (or open on) a Saturday or
 * Sunday. Walks each UTC calendar day in [open, close] and flags if any is a weekend.
 */
export function checkWeekendHolding(openDate: Date, closeDate: Date): PropFirmViolation | null {
  const dayMs = 24 * 60 * 60 * 1000
  const start = Date.UTC(openDate.getUTCFullYear(), openDate.getUTCMonth(), openDate.getUTCDate())
  const end   = Date.UTC(closeDate.getUTCFullYear(), closeDate.getUTCMonth(), closeDate.getUTCDate())
  for (let t = start; t <= end; t += dayMs) {
    const dow = new Date(t).getUTCDay() // 0 = Sun, 6 = Sat
    if (dow === 0 || dow === 6) return { type: "WEEKEND_HOLDING" }
  }
  return null
}
