export function computeMaxDrawdown(pnlSequence: number[]): number {
  let cum = 0, peak = 0, maxDd = 0
  for (const pnl of pnlSequence) {
    cum += pnl
    if (cum > peak) peak = cum
    const dd = peak - cum
    if (dd > maxDd) maxDd = dd
  }
  return maxDd
}

export function computeRunningBalance(
  initialBalance: number,
  trades: { pnl: number | null }[],
): number {
  return initialBalance + trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
}

export function computeEquityCurve(
  initialBalance: number,
  trades: { pnl: number | null; date: string }[],
): { date: string; balance: number }[] {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date))
  let balance = initialBalance
  return sorted.map(t => {
    balance += t.pnl ?? 0
    return { date: t.date, balance }
  })
}
