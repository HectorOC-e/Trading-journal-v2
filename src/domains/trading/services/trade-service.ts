export function computeClosedTradePnl(
  direction:  "LONG" | "SHORT",
  entry:      number,
  closePrice: number,
  size:       number,
  commission: number,
  // Dollar value of one full point per contract/unit (e.g. NQ = $20, ES = $50).
  // Defaults to 1 so price-difference instruments (1 unit = $1) are unchanged.
  pointValue: number = 1,
): { rawPnl: number; netPnl: number } {
  const points =
    direction === "LONG"
      ? closePrice - entry
      : entry - closePrice
  const rawPnl = points * size * pointValue
  return { rawPnl, netPnl: rawPnl - commission }
}

export function computeRMultiple(
  pnl:   number,
  entry: number,
  stop:  number,
  size:  number,
  // Must match the pointValue used for pnl so the ratio stays consistent.
  pointValue: number = 1,
): number | null {
  const risk = Math.abs(entry - stop) * size * pointValue
  return risk > 0 ? pnl / risk : null
}

/**
 * Extract the numeric dollar value from a market's pointValue string, e.g.
 * "$20" → 20, "$10 / lot" → 10, "1 BTC" → 1. Returns 1 when it can't be parsed
 * (price-difference instruments where 1 unit = $1).
 */
export function parsePointValue(pv: string | null | undefined): number {
  if (!pv) return 1
  const match = pv.replace(/,/g, "").match(/\$?\s*([\d.]+)/)
  if (!match) return 1
  const n = parseFloat(match[1])
  return isNaN(n) || n <= 0 ? 1 : n
}

export function computeScaleInAvgEntry(
  existingEntry:   number,
  existingSize:    number,
  addedPrice:      number,
  addedContracts:  number,
): number {
  const newSize = existingSize + addedContracts
  if (newSize <= 0) return existingEntry
  return (existingEntry * existingSize + addedPrice * addedContracts) / newSize
}
