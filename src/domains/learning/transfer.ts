// ─────────────────────────────────────────────────────────────────────────────
// Learning transfer (#31, ANALYTICS_V3 §11 / FREEZE-D17). Compares the edge of a
// setup's trades BEFORE vs AFTER a learning resource was studied/linked. Honest
// by design: this is ASSOCIATION with declared confounds (sample size, regime,
// time), never "cause"/"transfer" in a causal sense — the UI/coach must not claim
// causation (D17). Significance via Welch. Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

import { welchTTest } from "@/domains/analytics/institutional/stats/welch"

export type TransferLabel =
  | "associated-improvement"
  | "associated-decline"
  | "no-association"
  | "insufficient"

export interface TransferInput {
  /** R multiples of the relevant trades before the learning date. */
  before: number[]
  /** R multiples after the learning date. */
  after: number[]
  alpha?: number
}

export interface TransferResult {
  beforeAvgR: number | null
  afterAvgR: number | null
  /** afterAvgR − beforeAvgR. */
  delta: number | null
  significant: boolean
  pValue: number | null
  nBefore: number
  nAfter: number
  label: TransferLabel
  /** Honest confound disclaimer (D17): association, not causation. */
  caveat: string
}

const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length

const CAVEAT =
  "Asociación, no causa: el cambio puede deberse a régimen de mercado, tiempo u otros factores (n declarado). No implica causalidad."

export function computeTransfer(input: TransferInput): TransferResult {
  const { before, after } = input
  const alpha = input.alpha ?? 0.05
  const beforeAvgR = before.length > 0 ? mean(before) : null
  const afterAvgR = after.length > 0 ? mean(after) : null

  if (before.length < 2 || after.length < 2) {
    return {
      beforeAvgR,
      afterAvgR,
      delta: beforeAvgR != null && afterAvgR != null ? afterAvgR - beforeAvgR : null,
      significant: false,
      pValue: null,
      nBefore: before.length,
      nAfter: after.length,
      label: "insufficient",
      caveat: CAVEAT,
    }
  }

  const test = welchTTest(after, before)!
  const delta = afterAvgR! - beforeAvgR!
  const significant = test.pValue < alpha
  let label: TransferLabel = "no-association"
  if (significant) label = delta > 0 ? "associated-improvement" : "associated-decline"

  return {
    beforeAvgR,
    afterAvgR,
    delta,
    significant,
    pValue: test.pValue,
    nBefore: before.length,
    nAfter: after.length,
    label,
    caveat: CAVEAT,
  }
}
