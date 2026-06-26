// ─────────────────────────────────────────────────────────────────────────────
// Commitment state machine (BEHAVIOR_ENGINE_V3 §3, §4) — pure.
//
// Maps an insight type to a verifiable commitment spec (metricKey/comparator/
// target/window), and decides the outcome of a window from an observed value.
// State: ACTIVE → {KEPT, PARTIAL, BROKEN, EXPIRED}. EXPIRED = no data to judge.
//
// "Ningún insight sin CTA" (§8.1): an insight WITHOUT a spec here still offers
// study/note — `deriveCommitmentSpec` returns null and the caller routes to the
// non-commit CTA. No fabricated verifiability (FREEZE-D7).
// ─────────────────────────────────────────────────────────────────────────────

import { hasVerifier, type MetricKey } from "./verifiers"

export type Comparator = "<=" | ">=" | "=="
export type CommitmentWindow = "day" | "week" | "month"
export type CommitmentResult = "kept" | "partial" | "broken"
export type CommitmentStatus = "active" | "kept" | "partial" | "broken" | "expired"

export interface CommitmentSpec {
  metricKey: MetricKey
  comparator: Comparator
  target: number
  window: CommitmentWindow
  text: string
}

/** Deterministic insight-type → commitment-spec map (BEHAVIOR_ENGINE_V3 §4.1). */
const INSIGHT_SPECS: Record<string, CommitmentSpec> = {
  "intraday-decay": {
    metricKey: "tradesPerDayBeyond2",
    comparator: "<=",
    target: 0,
    window: "week",
    text: "No tomar más de 2 trades por día esta semana",
  },
  "revenge-trading": {
    metricKey: "revengeTradesAfterLoss",
    comparator: "<=",
    target: 0,
    window: "week",
    text: "Cero trades de revancha tras una pérdida esta semana",
  },
  oversizing: {
    metricKey: "oversizedTrades",
    comparator: "<=",
    target: 0,
    window: "week",
    text: "Respetar mi límite de riesgo por trade esta semana",
  },
  "off-plan": {
    metricKey: "offPlanTrades",
    comparator: "<=",
    target: 0,
    window: "week",
    text: "Operar solo dentro del plan esta semana",
  },
}

/** Derive the commitment spec for an insight type, or null if it has no verifier. */
export function deriveCommitmentSpec(insightType: string): CommitmentSpec | null {
  const spec = INSIGHT_SPECS[insightType]
  if (!spec) return null
  // Defensive: a spec must point at a real verifier (FREEZE-D7).
  return hasVerifier(spec.metricKey) ? spec : null
}

/** Whether an insight type can be turned into a verified commitment. */
export function canCommit(insightType: string): boolean {
  return deriveCommitmentSpec(insightType) !== null
}

/** The partial-tolerance band for count-style targets (kept ≤ target < partial ≤ band). */
function partialBand(target: number): number {
  return target + Math.max(1, Math.ceil(Math.abs(target) * 0.25))
}

/**
 * Decide the result of a window from the observed value vs the target/comparator.
 * For "<=": kept if within target, partial within the tolerance band, else broken.
 * For ">=": symmetric. For "==": kept on exact match, else broken (no partial).
 */
export function evaluateResult(observedValue: number, target: number, comparator: Comparator): CommitmentResult {
  switch (comparator) {
    case "<=":
      if (observedValue <= target) return "kept"
      return observedValue <= partialBand(target) ? "partial" : "broken"
    case ">=":
      if (observedValue >= target) return "kept"
      return observedValue >= target - Math.max(1, Math.ceil(Math.abs(target) * 0.25)) ? "partial" : "broken"
    case "==":
      return observedValue === target ? "kept" : "broken"
  }
}

/** Map a result to the terminal commitment status. */
export function statusFromResult(result: CommitmentResult): CommitmentStatus {
  return result // 'kept' | 'partial' | 'broken' are valid statuses
}
