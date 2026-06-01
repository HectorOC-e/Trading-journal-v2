export type PropFirmViolation =
  | { type: "DAILY_LOSS_LIMIT";   limitPct:  number; currentPct: number }
  | { type: "MAX_TRADES";          limit:     number; current:    number }
  | { type: "SYMBOL_NOT_ALLOWED";  symbol:    string; allowed:    string[] }

export function checkDailyLossLimit(
  todayLoss:      number,   // sum of negative-only P&L (≤ 0)
  initialBalance: number,
  ddDailyPct:     number,
): PropFirmViolation | null {
  if (initialBalance <= 0) return null
  const currentPct = Math.abs(Math.min(0, todayLoss)) / initialBalance * 100
  if (currentPct >= ddDailyPct) {
    return { type: "DAILY_LOSS_LIMIT", limitPct: ddDailyPct, currentPct }
  }
  return null
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
