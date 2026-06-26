import { describe, it, expect } from "vitest"
import {
  verifyRevengeTrades,
  verifyTradesPerDayBeyond2,
  verifyOversizedTrades,
  verifyOffPlanTrades,
  getVerifier,
  hasVerifier,
  type WindowTrade,
} from "@/domains/behavior/verifiers"

const t = (over: Partial<WindowTrade> & { id: string }): WindowTrade => ({
  date: "2026-01-01", pnl: 0, rMultiple: null, tags: [], ...over,
})

describe("verifyRevengeTrades", () => {
  it("counts revenge-flagged and Revanche-tagged trades with evidence", () => {
    const r = verifyRevengeTrades([
      t({ id: "a", revengeFlag: true }),
      t({ id: "b", tags: ["Revanche"] }),
      t({ id: "c" }),
    ])
    expect(r.observedValue).toBe(2)
    expect(r.evidence.tradeIds.sort()).toEqual(["a", "b"])
  })
})

describe("verifyTradesPerDayBeyond2", () => {
  it("counts trades beyond the 2nd of each day", () => {
    const r = verifyTradesPerDayBeyond2([
      t({ id: "a", date: "2026-01-01", openTime: "09:00" }),
      t({ id: "b", date: "2026-01-01", openTime: "10:00" }),
      t({ id: "c", date: "2026-01-01", openTime: "11:00" }),
      t({ id: "d", date: "2026-01-01", openTime: "12:00" }),
      t({ id: "e", date: "2026-01-02", openTime: "09:00" }),
    ])
    expect(r.observedValue).toBe(2) // c,d on day 1; day 2 has only 1
    expect(r.evidence.tradeIds).toEqual(["c", "d"])
  })

  it("is zero when no day exceeds 2 trades", () => {
    expect(verifyTradesPerDayBeyond2([t({ id: "a" }), t({ id: "b" })]).observedValue).toBe(0)
  })
})

describe("verifyOversizedTrades", () => {
  it("counts trades over the default 1.5% risk threshold", () => {
    const r = verifyOversizedTrades([
      t({ id: "a", riskPct: 2.0 }),
      t({ id: "b", riskPct: 1.0 }),
      t({ id: "c", riskPct: null }),
    ])
    expect(r.observedValue).toBe(1)
    expect(r.evidence.tradeIds).toEqual(["a"])
  })

  it("honors a custom threshold", () => {
    const r = verifyOversizedTrades([t({ id: "a", riskPct: 2.0 }), t({ id: "b", riskPct: 3.0 })], { oversizeThresholdPct: 2.5 })
    expect(r.observedValue).toBe(1) // only b > 2.5
  })
})

describe("verifyOffPlanTrades", () => {
  it("counts off-plan / impulsive tagged trades", () => {
    const r = verifyOffPlanTrades([
      t({ id: "a", tags: ["Off-plan"] }),
      t({ id: "b", tags: ["Impulsivo", "A+"] }),
      t({ id: "c", tags: ["A+"] }),
    ])
    expect(r.observedValue).toBe(2)
  })
})

describe("registry", () => {
  it("resolves known verifiers and reports unknown ones", () => {
    expect(hasVerifier("tradesPerDayBeyond2")).toBe(true)
    expect(getVerifier("tradesPerDayBeyond2")).toBeTypeOf("function")
    expect(hasVerifier("edge-decay")).toBe(false)
    expect(getVerifier("nope")).toBeNull()
  })
})
