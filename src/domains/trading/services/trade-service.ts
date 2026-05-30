export function computeClosedTradePnl(
  direction:  "LONG" | "SHORT",
  entry:      number,
  closePrice: number,
  size:       number,
  commission: number,
): { rawPnl: number; netPnl: number } {
  const rawPnl =
    direction === "LONG"
      ? (closePrice - entry) * size
      : (entry - closePrice) * size
  return { rawPnl, netPnl: rawPnl - commission }
}

export function computeRMultiple(
  pnl:   number,
  entry: number,
  stop:  number,
  size:  number,
): number | null {
  const risk = Math.abs(entry - stop) * size
  return risk > 0 ? pnl / risk : null
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
