import { describe, it, expect } from "vitest"
import { evaluate, compare } from "@/domains/rules/conditions"
import type { ConditionNode, EvalContext } from "@/domains/rules/types"

describe("compare", () => {
  it("numeric comparisons", () => {
    expect(compare(3, "gt", 2)).toBe(true)
    expect(compare(2, "gt", 2)).toBe(false)
    expect(compare(2, "gte", 2)).toBe(true)
    expect(compare(1, "lt", 2)).toBe(true)
    expect(compare(2, "lte", 2)).toBe(true)
  })
  it("eq / neq are strict", () => {
    expect(compare("LONG", "eq", "LONG")).toBe(true)
    expect(compare("LONG", "neq", "SHORT")).toBe(true)
  })
  it("contains works on arrays and strings", () => {
    expect(compare(["A+", "FOMO"], "contains", "FOMO")).toBe(true)
    expect(compare(["A+"], "contains", "FOMO")).toBe(false)
    expect(compare("EURUSD", "contains", "eur")).toBe(true)
  })
  it("in checks membership of value list", () => {
    expect(compare("London", "in", ["Asia", "London"])).toBe(true)
    expect(compare("NY", "in", ["Asia", "London"])).toBe(false)
  })
  it("missing/non-numeric actual fails numeric comparisons", () => {
    expect(compare(undefined, "gt", 2)).toBe(false)
    expect(compare(null, "lt", 2)).toBe(false)
  })
})

const ctx: EvalContext = { riskPct: 2.4, winRate: 45, drawdownPct: 12, direction: "LONG", tags: ["FOMO"] }

describe("evaluate", () => {
  it("empty node is always true", () => {
    expect(evaluate({}, ctx)).toBe(true)
    expect(evaluate(null, ctx)).toBe(true)
  })
  it("leaf condition", () => {
    expect(evaluate({ field: "riskPct", cmp: "gt", value: 2 }, ctx)).toBe(true)
    expect(evaluate({ field: "riskPct", cmp: "gt", value: 3 }, ctx)).toBe(false)
  })
  it("AND requires all", () => {
    const n: ConditionNode = { op: "and", children: [
      { field: "riskPct", cmp: "gt", value: 2 },
      { field: "winRate", cmp: "lt", value: 50 },
    ] }
    expect(evaluate(n, ctx)).toBe(true)
    expect(evaluate({ op: "and", children: [{ field: "riskPct", cmp: "gt", value: 3 }] }, ctx)).toBe(false)
  })
  it("OR requires any", () => {
    const n: ConditionNode = { op: "or", children: [
      { field: "winRate", cmp: "gt", value: 90 },
      { field: "drawdownPct", cmp: "gt", value: 10 },
    ] }
    expect(evaluate(n, ctx)).toBe(true)
  })
  it("NOT negates", () => {
    expect(evaluate({ op: "not", child: { field: "direction", cmp: "eq", value: "SHORT" } }, ctx)).toBe(true)
  })
  it("nested: riskPct>2 AND (winRate<50 OR drawdown>10)", () => {
    const n: ConditionNode = { op: "and", children: [
      { field: "riskPct", cmp: "gt", value: 2 },
      { op: "or", children: [
        { field: "winRate", cmp: "lt", value: 50 },
        { field: "drawdownPct", cmp: "gt", value: 10 },
      ] },
    ] }
    expect(evaluate(n, ctx)).toBe(true)
  })
})
