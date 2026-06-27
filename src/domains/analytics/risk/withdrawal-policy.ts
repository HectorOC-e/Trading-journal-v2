// ─────────────────────────────────────────────────────────────────────────────
// Withdrawal policy (#46, SPRINT_PLAN S9). Honest guidance on how much profit a
// FUNDED account can safely withdraw while keeping a buffer above its total-DD
// floor — withdrawing too aggressively turns a normal losing streak into a blown
// account. Evaluation phases (PHASE_1/2) cannot withdraw. Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

import type { DrawdownModel } from "@/domains/analytics/risk/risk-of-ruin"

export type AccountPhase = "PHASE_1" | "PHASE_2" | "FUNDED" | "NONE"

export interface WithdrawalInput {
  phase: AccountPhase
  currentEquity: number
  initialBalance: number
  /** Total DD limit as a fraction of the initial balance (e.g. 0.10); null = none. */
  ddTotalPct: number | null
  ddModel: DrawdownModel
  /** Profit cushion to retain above the initial balance, as a fraction of it (default 0). */
  minProfitBufferPct?: number
  /** If evaluating a concrete request, the amount asked for. */
  requestedAmount?: number
}

export type WithdrawalReason = "NOT_FUNDED" | "NO_PROFIT" | "OK" | "EXCEEDS_SAFE"

export interface WithdrawalAdvice {
  /** Whether any safe withdrawal is possible right now. */
  eligible: boolean
  /** Largest amount withdrawable while retaining the configured profit buffer. */
  maxSafeAmount: number
  /** For a concrete request: allowed or not (null when no request was supplied). */
  requestAllowed: boolean | null
  /** Distance from post-withdrawal equity to the DD floor, as a fraction of initial (null without a request). */
  bufferToFloorPct: number | null
  reason: WithdrawalReason
}

export function adviseWithdrawal(input: WithdrawalInput): WithdrawalAdvice {
  const { phase, currentEquity, initialBalance, ddTotalPct, requestedAmount } = input
  const bufferPct = input.minProfitBufferPct ?? 0

  if (phase !== "FUNDED") {
    return { eligible: false, maxSafeAmount: 0, requestAllowed: null, bufferToFloorPct: null, reason: "NOT_FUNDED" }
  }

  const profit = currentEquity - initialBalance
  const retained = bufferPct * initialBalance
  const maxSafeAmount = Math.max(0, profit - retained)

  if (maxSafeAmount <= 0) {
    return { eligible: false, maxSafeAmount: 0, requestAllowed: null, bufferToFloorPct: null, reason: "NO_PROFIT" }
  }

  // DD floor (FIXED measures from the initial balance). For TRAILING the floor
  // tracks the peak; conservatively we report distance to the initial-based floor.
  const floor = ddTotalPct !== null ? initialBalance * (1 - ddTotalPct) : initialBalance

  if (requestedAmount === undefined) {
    return { eligible: true, maxSafeAmount, requestAllowed: null, bufferToFloorPct: null, reason: "OK" }
  }

  const allowed = requestedAmount <= maxSafeAmount
  const bufferToFloorPct = (currentEquity - requestedAmount - floor) / initialBalance
  return {
    eligible: true,
    maxSafeAmount,
    requestAllowed: allowed,
    bufferToFloorPct,
    reason: allowed ? "OK" : "EXCEEDS_SAFE",
  }
}
