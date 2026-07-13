// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers for WRITING executable rules into the unified `rules` model
// (post-G2: `rules` is both the enforcement source and the editable source).
// Mirrors the mode/severity derivation the retired rule-sync used, so rows
// written directly are indistinguishable from the old mirrored ones.
// ─────────────────────────────────────────────────────────────────────────────

import { classifyMode } from "./unification"
import { TEMPLATE_MAP } from "./templates"
import type { Trigger, ConditionNode, RuleAction } from "./types"

export interface ExecutableRuleInput {
  name: string
  description: string
  trigger: Trigger
  conditions: ConditionNode
  actions: RuleAction[]
  category: string
  priority: number
  enabled: boolean
}

/** Flat `rules` row fields for an executable rule; mode/severity derived. */
export function ruleDataFromExecutableInput(i: ExecutableRuleInput) {
  const mode = classifyMode(i.actions)
  return {
    name:        i.name,
    description: i.description,
    severity:    mode === "enforce" ? "CRÍTICA" : "MEDIA",
    mode,
    enabled:     i.enabled,
    isSystem:    false,
    trigger:     i.trigger,
    conditions:  i.conditions,
    actions:     i.actions,
    priority:    i.priority,
    category:    i.category,
  }
}

/** Same fields instantiated from a gallery template; null when the id is unknown. */
export function ruleDataFromTemplate(templateId: string) {
  const t = TEMPLATE_MAP[templateId]
  if (!t) return null
  return ruleDataFromExecutableInput({
    name: t.name, description: t.description, trigger: t.trigger,
    conditions: t.conditions, actions: t.actions,
    category: t.category, priority: 0, enabled: true,
  })
}
