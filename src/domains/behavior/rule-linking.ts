// ─────────────────────────────────────────────────────────────────────────────
// Rule linking + suggestions (Behavior Engine II, S5 — BEHAVIOR_ENGINE_V3 §4.2/§4.5).
//
// Closes the loop insight → commitment → RULE: a commitment's metricKey maps to an
// ENFORCE rule (pre-trade BLOCK) so breaking the commitment becomes PREVENTED, not
// just measured. And critical insights map to a RuleSuggestion ("Activar regla
// anti-X").
//
// HONESTY (FREEZE-P3): only metrics the pre-trade engine can actually evaluate get a
// rule (fields exist in domains/rules/fields.ts). `offPlanTrades` is a post-hoc tag
// → cannot be prevented pre-trade → no rule (null), never a fake no-op.
// ─────────────────────────────────────────────────────────────────────────────

import type { ConditionNode, RuleAction } from "@/domains/rules/types"
import { deriveCommitmentSpec } from "./commitment-machine"

export interface ProposedRule {
  name: string
  trigger: "TRADE_PRE_CREATE"
  conditions: ConditionNode
  actions: RuleAction[]
  mode: "enforce"
}

const DEFAULT_OVERSIZE_PCT = 1.5

function block(message: string): RuleAction[] {
  return [{ type: "BLOCK", params: { message } }]
}

/**
 * The enforce rule that PREVENTS breaking a commitment on a given metric.
 * Null when the metric can't be enforced pre-trade (e.g. off-plan tagging).
 */
export function proposeRuleForCommitment(
  metricKey: string,
  opts: { oversizeThresholdPct?: number } = {},
): ProposedRule | null {
  switch (metricKey) {
    case "tradesPerDayBeyond2":
      return {
        name: "Máx. 2 trades por día",
        trigger: "TRADE_PRE_CREATE",
        conditions: { field: "tradesToday", cmp: "gte", value: 2 },
        actions: block("Ya tomaste 2 trades hoy — tu compromiso es parar aquí."),
        mode: "enforce",
      }
    case "revengeTradesAfterLoss":
      return {
        name: "Enfriamiento tras una pérdida",
        trigger: "TRADE_PRE_CREATE",
        conditions: { field: "minsSinceLastLoss", cmp: "lt", value: 15 },
        actions: block("Enfriamiento activo tras una pérdida (anti-revenge)."),
        mode: "enforce",
      }
    case "oversizedTrades": {
      const threshold = opts.oversizeThresholdPct ?? DEFAULT_OVERSIZE_PCT
      return {
        name: `Riesgo máx. ${threshold}% por trade`,
        trigger: "TRADE_PRE_CREATE",
        conditions: { field: "riskPct", cmp: "gt", value: threshold },
        actions: block(`Este trade supera tu límite de ${threshold}% de riesgo.`),
        mode: "enforce",
      }
    }
    // offPlanTrades: off-plan is a post-hoc tag, not knowable pre-trade → no rule.
    default:
      return null
  }
}

export interface RuleSuggestionProposal {
  proposedRule: ProposedRule
  reason: string
}

/**
 * Suggest an enforce rule for a (critical) insight: derive its commitment spec,
 * then the rule that would prevent it. Null when the insight has no verifier or no
 * enforceable rule.
 */
export function suggestRuleForInsight(insightType: string): RuleSuggestionProposal | null {
  const spec = deriveCommitmentSpec(insightType)
  if (!spec) return null
  const proposedRule = proposeRuleForCommitment(spec.metricKey)
  if (!proposedRule) return null
  return {
    proposedRule,
    reason: `Detectamos "${insightType}". Esta regla lo previene en el momento de operar.`,
  }
}

/** Whether a commitment on this metric can be backed by an enforce rule. */
export function canEnforce(metricKey: string): boolean {
  return proposeRuleForCommitment(metricKey) !== null
}
