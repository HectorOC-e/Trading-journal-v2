// ─────────────────────────────────────────────────────────────────────────────
// Trade capture derivation (#27 — campos derivados, FREEZE E5.C2).
//
// Less friction = more registration = more signal (audit C7). Fields the system
// can deduce should not be typed by hand. These PURE helpers pre-fill `session`
// and `riskPct`; the form keeps them editable (inline edit), they are not forced.
//
// Session windows are a documented APPROXIMATION on the open hour (no timezone
// data on the field); the user can override. The labels match SESSION_VALUES.
// ─────────────────────────────────────────────────────────────────────────────

export type SessionLabel = "Asia" | "London" | "New York" | "London Close"

/** Parse "HH:MM" (24h) → hour 0–23, or null if malformed. */
function parseHour(openTime: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(openTime.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h
}

/**
 * Pre-fill the trading session from the open hour (editable approximation):
 *   [00,08) Asia · [08,13) London · [13,17) New York · [17,21) London Close ·
 *   [21,24) Asia (next session).
 */
export function deriveSession(openTime: string): SessionLabel | null {
  const h = parseHour(openTime)
  if (h === null) return null
  if (h < 8) return "Asia"
  if (h < 13) return "London"
  if (h < 17) return "New York"
  if (h < 21) return "London Close"
  return "Asia"
}

export interface RiskInput {
  entry: number
  stop: number
  size: number
}

/** Money at risk = |entry − stop| × size. */
export function deriveRiskAmount({ entry, stop, size }: RiskInput): number {
  return Math.abs(entry - stop) * size
}

/** Risk as % of account balance, rounded to 2dp. Null when balance ≤ 0. */
export function deriveRiskPct({ entry, stop, size, balance }: RiskInput & { balance: number }): number | null {
  if (!(balance > 0)) return null
  const pct = (deriveRiskAmount({ entry, stop, size }) / balance) * 100
  return Math.round(pct * 100) / 100
}
