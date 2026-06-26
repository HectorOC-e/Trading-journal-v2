// ─────────────────────────────────────────────────────────────────────────────
// Reinforcement planner (BEHAVIOR_ENGINE_V3 §4.4, FREEZE-D13) — pure.
//
// The loop ALWAYS closes with reinforcement (§8.4) — never silence after a window.
// But positive reinforcement uses a VARIABLE RATIO (FREEZE-D13): don't celebrate
// every kept commitment (that breeds dependence / fatigue). Corrective feedback is
// always surfaced. Language stays autonomy-supportive (the copy lives in the UI;
// this module decides KIND + VISIBILITY only).
// ─────────────────────────────────────────────────────────────────────────────

import type { CommitmentResult } from "./commitment-machine"

export type ReinforcementKind = "positive" | "corrective"

export interface ReinforcementPlan {
  kind: ReinforcementKind
  /** Whether to surface it now (corrective: always; positive: variable ratio). */
  visible: boolean
}

/**
 * Variable-ratio schedule for positive reinforcement, indexed by how many times
 * this commitment has already been kept (0-based count of PRIOR keeps). The first
 * keep always lands; after that, celebrations thin out (1st, 2nd, 4th, 7th, 11th…).
 * Pure + deterministic (testable; no RNG that would make outcomes irreproducible).
 */
function positiveIsVisible(priorKeeps: number): boolean {
  // Triangular-ish gaps: show at cumulative counts 0,1,3,6,10,15… (gaps 1,2,3,4,5…).
  const n = priorKeeps
  // visible when n is one of the triangular numbers T_k = k(k+1)/2
  // i.e. 0,1,3,6,10,15,21…  → 8*n+1 is a perfect odd square.
  const x = 8 * n + 1
  const r = Math.round(Math.sqrt(x))
  return r * r === x
}

/**
 * Plan the reinforcement for a window result.
 * - kept    → positive, visible on the variable-ratio schedule.
 * - partial → corrective (mixed: progress + adjust), always visible.
 * - broken  → corrective (micro-reflection + tighten the rule), always visible.
 */
export function planReinforcement(result: CommitmentResult, priorKeeps = 0): ReinforcementPlan {
  if (result === "kept") {
    return { kind: "positive", visible: positiveIsVisible(priorKeeps) }
  }
  return { kind: "corrective", visible: true }
}
