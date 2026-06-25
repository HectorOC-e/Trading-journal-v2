// ─────────────────────────────────────────────────────────────────────────────
// Trade capture rules — regime (E5.C6) + mandatory checklist (E5.C3).
//
// Pure logic so the capture flow can enforce/derive without a DB. The capture UI
// and the create mutation consume these; the analytics that read `regime` /
// off-plan tags live in later sprints.
// ─────────────────────────────────────────────────────────────────────────────

/** Market regime captured on the trade (v3.0 manual; ATR-derived is future). */
export const REGIME_VALUES = ["trend", "range", "volatile"] as const
export type Regime = (typeof REGIME_VALUES)[number]

export function isRegime(x: unknown): x is Regime {
  return typeof x === "string" && (REGIME_VALUES as readonly string[]).includes(x)
}

export interface ChecklistState {
  setupHasChecklist: boolean
  itemsChecked: number
  itemsTotal: number
}

export interface ChecklistEvaluation {
  complete: boolean
  /** True when the setup requires a checklist and items are missing → tag "Off-plan". */
  offPlan: boolean
  missing: number
}

/**
 * Evaluate the pre-entry checklist for a setup. A setup WITHOUT a checklist imposes
 * no requirement. A setup WITH a checklist that is not fully ticked is off-plan
 * (E5.C3) — the capture flow tags it "Off-plan" automatically.
 */
export function evaluateChecklist({ setupHasChecklist, itemsChecked, itemsTotal }: ChecklistState): ChecklistEvaluation {
  if (!setupHasChecklist || itemsTotal <= 0) {
    return { complete: true, offPlan: false, missing: 0 }
  }
  const missing = Math.max(0, itemsTotal - itemsChecked)
  return { complete: missing === 0, offPlan: missing > 0, missing }
}
