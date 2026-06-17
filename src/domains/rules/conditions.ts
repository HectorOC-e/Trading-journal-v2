// Pure condition-tree evaluator. Recursive AND/OR/NOT + leaf comparisons.
// No I/O — fully unit-testable. An empty node ({}) means "always".

import type { ConditionNode, Cmp, ConditionValue, EvalContext } from "./types"

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "" || typeof v === "boolean") return NaN
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : NaN
}

export function compare(actual: unknown, cmp: Cmp, value: ConditionValue): boolean {
  switch (cmp) {
    case "gt":  { const a = toNum(actual), b = toNum(value); return !Number.isNaN(a) && !Number.isNaN(b) && a > b }
    case "gte": { const a = toNum(actual), b = toNum(value); return !Number.isNaN(a) && !Number.isNaN(b) && a >= b }
    case "lt":  { const a = toNum(actual), b = toNum(value); return !Number.isNaN(a) && !Number.isNaN(b) && a < b }
    case "lte": { const a = toNum(actual), b = toNum(value); return !Number.isNaN(a) && !Number.isNaN(b) && a <= b }
    case "eq":  return actual === value
    case "neq": return actual !== value
    case "contains":
      if (Array.isArray(actual)) return actual.includes(value as string)
      return actual != null && String(actual).toLowerCase().includes(String(value).toLowerCase())
    case "in":
      return Array.isArray(value) ? value.includes(actual as string) : false
    default:
      return false
  }
}

export function evaluate(node: ConditionNode | null | undefined, ctx: EvalContext): boolean {
  if (!node || typeof node !== "object") return true
  if ("op" in node) {
    if (node.op === "and") return node.children.every((c) => evaluate(c, ctx))
    if (node.op === "or")  return node.children.some((c) => evaluate(c, ctx))
    if (node.op === "not") return !evaluate(node.child, ctx)
    return true
  }
  if ("field" in node) return compare(ctx[node.field], node.cmp, node.value)
  return true // {} — always
}
