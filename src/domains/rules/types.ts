// Rules engine — shared types. WHEN (trigger) / IF (condition tree) / THEN (actions).
// See docs/superpowers/specs/2026-06-17-rules-engine-design.md

export type Trigger = "TRADE_PRE_CREATE" | "TRADE_CREATED" | "TRADE_CLOSED" | "TRADE_UPDATED"
export const TRIGGERS: Trigger[] = ["TRADE_PRE_CREATE", "TRADE_CREATED", "TRADE_CLOSED", "TRADE_UPDATED"]
/** Triggers that run synchronously before the write and may block the operation. */
export const PRE_TRIGGERS: Trigger[] = ["TRADE_PRE_CREATE"]

export type Cmp = "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "contains" | "in"
export type ConditionValue = string | number | boolean | string[]

export type LeafCondition = { field: string; cmp: Cmp; value: ConditionValue }
export type ConditionNode =
  | { op: "and" | "or"; children: ConditionNode[] }
  | { op: "not"; child: ConditionNode }
  | LeafCondition
  | Record<string, never> // {} = always true (no conditions)

export type EvalContext = Record<string, string | number | boolean | string[] | null | undefined>

export type RuleActionType =
  | "NOTIFY" | "CRITICAL_ALERT" | "ADD_TAG" | "REMOVE_TAG" | "BLOCK" | "CREATE_REMINDER"
export interface RuleAction {
  type: RuleActionType
  /** Action-specific params, e.g. { message } for NOTIFY, { tag } for ADD_TAG. */
  params?: Record<string, unknown>
}
