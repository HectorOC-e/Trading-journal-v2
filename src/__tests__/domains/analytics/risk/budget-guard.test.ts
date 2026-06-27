import { describe, it, expect } from "vitest"
import { evaluateBudgetGuard } from "@/domains/analytics/risk/budget-guard"

describe("evaluateBudgetGuard (A1 forward-looking)", () => {
  it("blocks a trade whose own risk exceeds the remaining daily budget", () => {
    const g = evaluateBudgetGuard({ remainingPct: 0.01, tradeRiskPct: 0.02, exhausted: false })
    expect(g.block).toBe(true)
    expect(g.level).toBe("over")
    expect(g.message).toMatch(/presupuesto|diari/i)
  })

  it("blocks when the daily budget is already exhausted", () => {
    expect(evaluateBudgetGuard({ remainingPct: 0, tradeRiskPct: 0.005, exhausted: true }).block).toBe(true)
  })

  it("warns (not block) when the trade leaves little room", () => {
    const g = evaluateBudgetGuard({ remainingPct: 0.012, tradeRiskPct: 0.01, exhausted: false })
    expect(g.block).toBe(false)
    expect(g.level).toBe("approaching")
  })

  it("is ok when there is ample room", () => {
    const g = evaluateBudgetGuard({ remainingPct: 0.05, tradeRiskPct: 0.01, exhausted: false })
    expect(g.block).toBe(false)
    expect(g.level).toBe("ok")
  })

  it("never blocks when the trade risk is unknown (0) — no false positive", () => {
    expect(evaluateBudgetGuard({ remainingPct: 0.0001, tradeRiskPct: 0, exhausted: false }).block).toBe(false)
  })
})
