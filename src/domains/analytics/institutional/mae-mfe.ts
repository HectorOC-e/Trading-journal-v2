// ─────────────────────────────────────────────────────────────────────────────
// MAE / MFE analytics (C4, #35) — consumes the S2 capture columns (`maeR`,
// `mfeR`). ANALYTICS_V3 §3.3:
//   • Exit efficiency = pnlR / mfeR  → how much of the favorable move you capture.
//   • Stop quality    = MAE in winners → do your stops survive noise, or shake
//                       you out just before the trade works?
//
// Convention: `maeR` is the adverse excursion (stored signed; negative = against
// you); we report it as a positive magnitude. `mfeR` is the favorable excursion
// (positive). Trades that did not capture an excursion are excluded. Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

export interface MaeMfeTrade {
  pnlR: number
  maeR: number | null
  mfeR: number | null
}

export interface MaeMfeResult {
  /** Trades that captured BOTH excursions. */
  count: number
  /** Mean adverse excursion magnitude (R). */
  avgMae: number
  /** Mean favorable excursion magnitude (R). */
  avgMfe: number
  /** Mean of pnlR / mfeR over trades with a favorable excursion; null if none. */
  exitEfficiency: number | null
  /** Mean adverse excursion magnitude among winners (stop quality); null if none. */
  winnerMaeAvg: number | null
  /** Worst adverse excursion magnitude survived by a winner; null if none. */
  winnerMaeMax: number | null
}

const EMPTY: MaeMfeResult = {
  count: 0,
  avgMae: 0,
  avgMfe: 0,
  exitEfficiency: null,
  winnerMaeAvg: null,
  winnerMaeMax: null,
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0)

export function analyzeMaeMfe(trades: MaeMfeTrade[]): MaeMfeResult {
  if (trades.length === 0) return EMPTY

  const maeMags = trades.filter((t) => t.maeR !== null).map((t) => Math.abs(t.maeR as number))
  const mfeMags = trades.filter((t) => t.mfeR !== null).map((t) => Math.abs(t.mfeR as number))
  const captured = trades.filter((t) => t.maeR !== null && t.mfeR !== null)

  const favorable = trades.filter((t) => t.mfeR !== null && (t.mfeR as number) > 0)
  const efficiencies = favorable.map((t) => t.pnlR / (t.mfeR as number))

  const winnerMae = trades
    .filter((t) => t.pnlR > 0 && t.maeR !== null)
    .map((t) => Math.abs(t.maeR as number))

  return {
    count: captured.length,
    avgMae: mean(maeMags),
    avgMfe: mean(mfeMags),
    exitEfficiency: efficiencies.length ? mean(efficiencies) : null,
    winnerMaeAvg: winnerMae.length ? mean(winnerMae) : null,
    winnerMaeMax: winnerMae.length ? Math.max(...winnerMae) : null,
  }
}
