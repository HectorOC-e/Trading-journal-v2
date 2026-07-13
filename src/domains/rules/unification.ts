// ─────────────────────────────────────────────────────────────────────────────
// Unified rule model — types + mode classification (C6, FREEZE-D8/D9).
//
// The v2 Rule/Automation merge is COMPLETE (gate G2 closed 2026-07-13): the
// unified `rules` table is both the enforcement source and the editable source,
// and `automations` is an archived table with no code paths. What remains here
// is the shared vocabulary: the UnifiedRule concept, the RuleMode, and
// `classifyMode` (BLOCK ⇒ enforce), which rule writers still derive from.
// ─────────────────────────────────────────────────────────────────────────────

import type { Trigger, ConditionNode, RuleAction } from "./types"

export type RuleMode = "enforce" | "warn"

/** The unified Rule concept (FREEZE-E2). */
export interface UnifiedRule {
  name: string
  description: string
  severity: string
  mode: RuleMode
  enabled: boolean
  isSystem: boolean
  trigger: Trigger | null
  conditions: ConditionNode
  actions: RuleAction[]
  priority: number
  category: string
  sourceAutomationId: string | null
  sourceCommitmentId: string | null
  sourceInsightId: string | null
}

/** A rule enforces iff at least one of its actions blocks the operation. */
export function classifyMode(actions: RuleAction[]): RuleMode {
  return actions.some((a) => a.type === "BLOCK") ? "enforce" : "warn"
}
