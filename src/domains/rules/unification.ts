// ─────────────────────────────────────────────────────────────────────────────
// Rule/Automation unification — the SEMANTIC merge (C6, FREEZE-D8/D9, gate G2).
//
// v2 has two models: `Rule` (descriptive — name/severity, what the coach reads,
// no execution) and `Automation` (executable — trigger/conditions/actions/BLOCK).
// v3 unifies them into ONE `Rule` with `mode: 'enforce' | 'warn'`.
//
// This is NOT a 1:1 row merge: a descriptive rule has no executable semantics, so
// it can only become a `warn` rule. `buildNoMappingReport` surfaces exactly those
// cases — a "CRÍTICA" descriptive rule that enforces nothing is FALSE PROTECTION
// (audit risk R3) and must be reviewed by a human before the enforcement cutover.
//
// These functions are PURE so the migration's classification is testable without a
// database. The SQL backfill mirrors `classifyMode` (BLOCK ⇒ enforce).
// ─────────────────────────────────────────────────────────────────────────────

import type { Trigger, ConditionNode, RuleAction } from "./types"

export type RuleMode = "enforce" | "warn"

/** v2 executable automation (subset of fields the merge needs). */
export interface V2Automation {
  id: string
  name: string
  description: string
  enabled: boolean
  priority: number
  trigger: Trigger
  conditions: ConditionNode
  actions: RuleAction[]
  category: string
  isSystem: boolean
}

/** v2 descriptive rule (subset). */
export interface V2DescriptiveRule {
  id: string
  name: string
  description: string
  severity: string
  isSystem: boolean
  enabled: boolean
}

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

function severityForMode(mode: RuleMode): string {
  return mode === "enforce" ? "CRÍTICA" : "MEDIA"
}

export function automationToUnifiedRule(a: V2Automation): UnifiedRule {
  const mode = classifyMode(a.actions)
  return {
    name: a.name,
    description: a.description,
    severity: severityForMode(mode),
    mode,
    enabled: a.enabled,
    isSystem: a.isSystem,
    trigger: a.trigger,
    conditions: a.conditions,
    actions: a.actions,
    priority: a.priority,
    category: a.category,
    sourceAutomationId: a.id,
    sourceCommitmentId: null,
    sourceInsightId: null,
  }
}

export function descriptiveRuleToUnifiedRule(r: V2DescriptiveRule): UnifiedRule {
  // A descriptive rule has no executable semantics → it can only WARN.
  return {
    name: r.name,
    description: r.description,
    severity: r.severity,
    mode: "warn",
    enabled: r.enabled,
    isSystem: r.isSystem,
    trigger: null,
    conditions: {},
    actions: [],
    priority: 0,
    category: "",
    sourceAutomationId: null,
    sourceCommitmentId: null,
    sourceInsightId: null,
  }
}

export interface NoMappingReport {
  /** Descriptive rules that look critical but enforce nothing → false protection (R3). */
  descriptiveWithoutEnforcement: V2DescriptiveRule[]
  /** Automations whose mapping is ambiguous (enabled but no actions to run). */
  ambiguousAutomations: V2Automation[]
  summary: {
    descriptiveCount: number
    automationCount: number
    unifiedTotal: number
    falseProtectionCount: number
  }
}

function looksCritical(r: V2DescriptiveRule): boolean {
  return /crít/i.test(r.severity)
}

/**
 * Produce the human-review artifact for gate G2. The enforcement cutover must not
 * happen until these are triaged.
 */
export function buildNoMappingReport(
  rules: V2DescriptiveRule[],
  automations: V2Automation[],
): NoMappingReport {
  const enforcingNames = new Set(
    automations.filter((a) => classifyMode(a.actions) === "enforce").map((a) => a.name.trim().toLowerCase()),
  )

  const descriptiveWithoutEnforcement = rules.filter(
    (r) => looksCritical(r) && !enforcingNames.has(r.name.trim().toLowerCase()),
  )
  const ambiguousAutomations = automations.filter((a) => a.enabled && a.actions.length === 0)

  return {
    descriptiveWithoutEnforcement,
    ambiguousAutomations,
    summary: {
      descriptiveCount: rules.length,
      automationCount: automations.length,
      unifiedTotal: rules.length + automations.length,
      falseProtectionCount: descriptiveWithoutEnforcement.length,
    },
  }
}
