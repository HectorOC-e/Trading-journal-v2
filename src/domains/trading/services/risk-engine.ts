// ── Risk Engine — single source of truth for account drawdown / loss limits ──
// Centralizes: actual-vs-limit percentages for every period, limit-utilization
// (bar fill), and the auto-lock decision. UI and the trade mutation must both
// read from here so screens never diverge.

import { computeMaxDrawdown, calcDrawdownPct } from "@/lib/formulas/drawdown"

export type RiskLockReason =
  | "DAILY_LOSS_LIMIT"
  | "WEEKLY_LOSS_LIMIT"
  | "MONTHLY_LOSS_LIMIT"
  | "MAX_DRAWDOWN"

/** One limit's display state. `usedPct` is the bar fill (0–100 toward the limit). */
export type LimitGauge = {
  configured: boolean
  actualPct:  number   // realized loss / drawdown as % of initial balance
  limitPct:   number   // configured limit %
  usedPct:    number   // actualPct / limitPct * 100, clamped 0–100 (bar fill)
}

export type AccountRiskInput = {
  initialBalance: number
  ddDailyPct:     number | null
  ddWeeklyPct:    number | null
  ddMonthlyPct:   number | null
  ddTotalPct:     number | null
  /** Net realized P&L for each window (negative = loss). */
  dayPnl:         number
  weekPnl:        number
  monthPnl:       number
  /** Max peak-to-trough drawdown amount (absolute, ≥ 0) over account history. */
  maxDrawdown:    number
}

export type AccountRisk = {
  daily:   LimitGauge
  weekly:  LimitGauge
  monthly: LimitGauge
  total:   LimitGauge
  /** First breached limit (highest precedence), or null when within limits. */
  breach:  { reason: RiskLockReason; limitPct: number; actualPct: number } | null
}

/** Loss % for a window = |min(0, pnl)| / initialBalance * 100. */
function lossPct(pnl: number, initialBalance: number): number {
  if (initialBalance <= 0) return 0
  return Math.abs(Math.min(0, pnl)) / initialBalance * 100
}

function gauge(actualPct: number, limitPct: number | null): LimitGauge {
  if (limitPct == null || limitPct <= 0) {
    return { configured: false, actualPct: round1(actualPct), limitPct: 0, usedPct: 0 }
  }
  const usedPct = Math.min(100, Math.max(0, actualPct / limitPct * 100))
  return { configured: true, actualPct: round1(actualPct), limitPct: round1(limitPct), usedPct: round1(usedPct) }
}

function round1(n: number): number {
  return parseFloat(n.toFixed(1))
}

/**
 * Compute the full risk picture for an account. Drawdown uses the canonical
 * `computeMaxDrawdown` / `calcDrawdownPct` formulas (no inline duplication).
 */
export function computeAccountRisk(input: AccountRiskInput): AccountRisk {
  const { initialBalance } = input

  const daily   = gauge(lossPct(input.dayPnl,   initialBalance), input.ddDailyPct)
  const weekly  = gauge(lossPct(input.weekPnl,  initialBalance), input.ddWeeklyPct)
  const monthly = gauge(lossPct(input.monthPnl, initialBalance), input.ddMonthlyPct)
  const total   = gauge(calcDrawdownPct(input.maxDrawdown, initialBalance), input.ddTotalPct)

  // Precedence: daily → weekly → monthly → total
  const order: Array<[RiskLockReason, LimitGauge]> = [
    ["DAILY_LOSS_LIMIT",   daily],
    ["WEEKLY_LOSS_LIMIT",  weekly],
    ["MONTHLY_LOSS_LIMIT", monthly],
    ["MAX_DRAWDOWN",       total],
  ]
  let breach: AccountRisk["breach"] = null
  for (const [reason, g] of order) {
    if (g.configured && g.actualPct >= g.limitPct) {
      breach = { reason, limitPct: g.limitPct, actualPct: g.actualPct }
      break
    }
  }

  return { daily, weekly, monthly, total, breach }
}

/** Convenience: maxDrawdown from a chronological P&L sequence (canonical formula). */
export function maxDrawdownFromPnl(pnlSequence: number[]): number {
  return computeMaxDrawdown(pnlSequence)
}
