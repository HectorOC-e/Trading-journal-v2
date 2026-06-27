// ─────────────────────────────────────────────────────────────────────────────
// Daily risk budget / "max trade today" (#17, ANALYTICS_V3 §8.3) + configurable
// daily reset (#38). Given the room left to the daily DD limit and the trader's
// usual risk-per-trade, derive how many more trades fit before the day is over.
//
// Static daily-DD semantics: the limit is measured from the start-of-day balance,
// so the remaining room is the distance from current equity down to that floor (a
// winning day legitimately widens the room). Pure, no I/O.
//
// S9 surfaces this as a SIGNAL/warn only; the hard pre-trade block is wired in
// S13 (HOY / RiskBudgetMeter) reusing the existing rules/account-lock infra.
// ─────────────────────────────────────────────────────────────────────────────

export interface RiskBudgetInput {
  /** Daily loss limit as a fraction of start-of-day equity (e.g. 0.05); null = no limit. */
  ddDailyPct: number | null
  /** Today's realized P&L as a fraction of start-of-day equity (negative = down). */
  realizedPnlPct: number
  /** Typical risk per trade as a fraction of equity (e.g. 0.01). */
  usualRiskPerTradePct: number
}

export interface RiskBudget {
  hasLimit: boolean
  /** Loss room left today as a fraction of equity; null when there is no limit. */
  remainingPct: number | null
  /** How many more usual-sized trades fit before the daily floor; null when no limit. */
  maxTrades: number | null
  /** True once the limit is reached or breached (no room left). */
  exhausted: boolean
  /** Fraction of the daily budget consumed, clamped to [0, 1]; null when no limit. */
  usedPct: number | null
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export function computeRiskBudget(input: RiskBudgetInput): RiskBudget {
  const { ddDailyPct, realizedPnlPct, usualRiskPerTradePct } = input
  if (ddDailyPct === null || ddDailyPct <= 0) {
    return { hasLimit: false, remainingPct: null, maxTrades: null, exhausted: false, usedPct: null }
  }
  // Distance from current equity down to the static daily floor (−ddDailyPct from open).
  const remainingPct = ddDailyPct + realizedPnlPct
  const room = Math.max(0, remainingPct)
  const maxTrades = usualRiskPerTradePct > 0 ? Math.floor(room / usualRiskPerTradePct) : 0
  return {
    hasLimit: true,
    remainingPct,
    maxTrades,
    exhausted: remainingPct <= 0,
    usedPct: clamp01(1 - remainingPct / ddDailyPct),
  }
}

export interface DailyWindowInput {
  /** Current instant in epoch ms. */
  nowMs: number
  /** Hour of day (0–23, local to the account tz) at which the daily limit resets. */
  resetHour: number
  /** Minutes to add to UTC to get the account's local time (e.g. −300 for UTC−5). */
  tzOffsetMinutes: number
}

export interface DailyWindow {
  startMs: number
  endMs: number
}

const DAY_MS = 24 * 3600 * 1000

/**
 * Resolve the current daily risk window [start, start+24h) for a configurable
 * reset hour (#38). The window starts at the most recent occurrence of
 * `resetHour` in the account's local time; before that hour today, it rolls back
 * to yesterday. Pure (no Date tz parsing): local time is derived from the offset.
 */
export function resolveDailyWindow(input: DailyWindowInput): DailyWindow {
  const { nowMs, resetHour, tzOffsetMinutes } = input
  const offsetMs = tzOffsetMinutes * 60_000
  const localMs = nowMs + offsetMs
  const local = new Date(localMs)
  // Midnight (local) of the current local day, in local-shifted ms.
  const localMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  let localStart = localMidnight + resetHour * 3600 * 1000
  if (localMs < localStart) localStart -= DAY_MS
  const startMs = localStart - offsetMs
  return { startMs, endMs: startMs + DAY_MS }
}
