// ─────────────────────────────────────────────────────────────────────────────
// Account "reality" classifier — single source of truth.
//
// Demo and backtest accounts (personal or prop-firm) hold unreal money: their
// P&L, balance and equity are not real and no withdrawals are possible, so they
// must not contaminate the financial/performance statistics of real accounts.
// Behaviour, however, IS real on a practice account (you still break your plan,
// feel FOMO, revenge-trade), so psychology/discipline always counts them.
//
// Reality is derived purely from `Account.type` — no schema column, no migration.
// ─────────────────────────────────────────────────────────────────────────────

export type AccountReality = "real" | "practice"

/** Account types whose money is not real (demo / backtest / internal QA). */
const PRACTICE_TYPES: ReadonlySet<string> = new Set([
  "DEMO_PERSONAL",
  "DEMO_PROP",
  "BACKTEST",
  "QA",
])

/**
 * True when the account type holds unreal money (demo, backtest, QA).
 * `PERSONAL` and `PROP_FIRM` are real — a prop evaluation/funded account has real
 * consequences and real payouts.
 */
export function isPracticeType(type?: string | null): boolean {
  return type != null && PRACTICE_TYPES.has(type)
}

/** Map an account type to its reality class. */
export function accountReality(type?: string | null): AccountReality {
  return isPracticeType(type) ? "practice" : "real"
}
