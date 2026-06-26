import { describe, it, expect } from "vitest"
import {
  proposeRuleForCommitment,
  suggestRuleForInsight,
  canEnforce,
} from "@/domains/behavior/rule-linking"

describe("proposeRuleForCommitment", () => {
  it("over-trading → BLOCK when tradesToday ≥ 2", () => {
    const r = proposeRuleForCommitment("tradesPerDayBeyond2")!
    expect(r.mode).toBe("enforce")
    expect(r.trigger).toBe("TRADE_PRE_CREATE")
    expect(r.conditions).toEqual({ field: "tradesToday", cmp: "gte", value: 2 })
    expect(r.actions[0].type).toBe("BLOCK")
  })

  it("revenge → cooldown on minsSinceLastLoss < 15", () => {
    const r = proposeRuleForCommitment("revengeTradesAfterLoss")!
    expect(r.conditions).toEqual({ field: "minsSinceLastLoss", cmp: "lt", value: 15 })
  })

  it("oversizing → BLOCK over the risk threshold (default + custom)", () => {
    expect(proposeRuleForCommitment("oversizedTrades")!.conditions).toEqual({ field: "riskPct", cmp: "gt", value: 1.5 })
    expect(proposeRuleForCommitment("oversizedTrades", { oversizeThresholdPct: 1 })!.conditions).toEqual({
      field: "riskPct", cmp: "gt", value: 1,
    })
  })

  it("off-plan can't be enforced pre-trade → null", () => {
    expect(proposeRuleForCommitment("offPlanTrades")).toBeNull()
    expect(proposeRuleForCommitment("nope")).toBeNull()
    expect(canEnforce("offPlanTrades")).toBe(false)
    expect(canEnforce("tradesPerDayBeyond2")).toBe(true)
  })
})

describe("suggestRuleForInsight", () => {
  it("maps a verifiable insight to a proposed enforce rule + reason", () => {
    const s = suggestRuleForInsight("intraday-decay")!
    expect(s.proposedRule.mode).toBe("enforce")
    expect(s.proposedRule.conditions).toEqual({ field: "tradesToday", cmp: "gte", value: 2 })
    expect(s.reason).toContain("intraday-decay")
  })

  it("returns null for insights with no verifier / no enforceable rule", () => {
    expect(suggestRuleForInsight("weekday-discipline")).toBeNull()
    expect(suggestRuleForInsight("unknown")).toBeNull()
  })
})
