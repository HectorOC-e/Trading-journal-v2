// ─────────────────────────────────────────────────────────────────────────────
// Multi-account correlation / aggregate exposure (#39, ANALYTICS_V3 §8.4). The
// same symbol held across accounts is ONE real risk, not N nominal ones: a trader
// running BTCUSD long in three funded accounts is 3× exposed, however the broker
// statements read per account. We aggregate gross (sum of |risk|) and net
// (directional) exposure per symbol, plus an aggregate-freeze signal when the
// combined book exceeds a configured cap. Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

export type Direction = "LONG" | "SHORT"

export interface OpenPosition {
  accountId: string
  symbol: string
  /** Risk on this position in a common currency (absolute, ≥ 0). */
  riskAmount: number
  direction: Direction
}

export interface SymbolExposure {
  symbol: string
  /** Sum of |risk| across accounts — the true exposure to this symbol. */
  grossRiskAmount: number
  /** Longs minus shorts; sign gives the net direction. */
  netRiskAmount: number
  netDirection: "LONG" | "SHORT" | "FLAT"
  /** Distinct accounts holding the symbol. */
  accountCount: number
  /** Number of open positions in the symbol. */
  positions: number
}

export interface CorrelationResult {
  /** Per-symbol exposure, sorted by gross exposure descending. */
  bySymbol: SymbolExposure[]
  /** Total gross risk across all symbols and accounts. */
  totalGrossRiskAmount: number
  /** Share of the most-concentrated symbol (gross), 0 when empty. */
  topConcentrationPct: number
}

export function aggregateExposure(positions: OpenPosition[]): CorrelationResult {
  const bySymbolMap = new Map<
    string,
    { gross: number; net: number; accounts: Set<string>; positions: number }
  >()

  for (const p of positions) {
    const entry = bySymbolMap.get(p.symbol) ?? { gross: 0, net: 0, accounts: new Set<string>(), positions: 0 }
    const signed = p.direction === "LONG" ? p.riskAmount : -p.riskAmount
    entry.gross += Math.abs(p.riskAmount)
    entry.net += signed
    entry.accounts.add(p.accountId)
    entry.positions += 1
    bySymbolMap.set(p.symbol, entry)
  }

  const bySymbol: SymbolExposure[] = [...bySymbolMap.entries()]
    .map(([symbol, e]) => ({
      symbol,
      grossRiskAmount: e.gross,
      netRiskAmount: e.net,
      netDirection: e.net > 0 ? "LONG" : e.net < 0 ? "SHORT" : ("FLAT" as SymbolExposure["netDirection"]),
      accountCount: e.accounts.size,
      positions: e.positions,
    }))
    .sort((a, b) => b.grossRiskAmount - a.grossRiskAmount)

  const totalGrossRiskAmount = bySymbol.reduce((s, e) => s + e.grossRiskAmount, 0)
  const topConcentrationPct =
    totalGrossRiskAmount > 0 ? bySymbol[0].grossRiskAmount / totalGrossRiskAmount : 0

  return { bySymbol, totalGrossRiskAmount, topConcentrationPct }
}

export interface AggregateFreezeInput {
  totalGrossRiskAmount: number
  /** Configured aggregate risk cap (common currency); null = no cap configured. */
  aggregateCapAmount: number | null
}

export interface AggregateFreezeSignal {
  /** ok < 0.8 ≤ warn < 1.0 ≤ freeze. */
  level: "ok" | "warn" | "freeze"
  breached: boolean
  /** total / cap; null when no cap is configured. */
  utilizationPct: number | null
}

const WARN_THRESHOLD = 0.8

/**
 * Aggregate-freeze signal (warn-level in S9; the hard freeze is wired in S13).
 * Inert when no cap is configured (no fabricated alarm).
 */
export function aggregateFreezeSignal(input: AggregateFreezeInput): AggregateFreezeSignal {
  const { totalGrossRiskAmount, aggregateCapAmount } = input
  if (aggregateCapAmount === null || aggregateCapAmount <= 0) {
    return { level: "ok", breached: false, utilizationPct: null }
  }
  const utilizationPct = totalGrossRiskAmount / aggregateCapAmount
  const level = utilizationPct >= 1 ? "freeze" : utilizationPct >= WARN_THRESHOLD ? "warn" : "ok"
  return { level, breached: utilizationPct >= 1, utilizationPct }
}
