import { describe, it, expect } from "vitest"
import {
  computeMaxDrawdown,
  computeRunningBalance,
  computeEquityCurve,
} from "@/domains/trading/services/account-service"

// ── computeMaxDrawdown ────────────────────────────────────────────────────

describe("computeMaxDrawdown", () => {
  it("empty sequence → 0", () => {
    expect(computeMaxDrawdown([])).toBe(0)
  })

  it("monotonically increasing → 0 drawdown", () => {
    expect(computeMaxDrawdown([100, 200, 150, 300])).toBe(0)
  })

  it("one drawdown then recovery → correct peak-to-trough", () => {
    // cum: 100, 50, 250, 100, 200 → peak 250, trough 100 → dd 150
    expect(computeMaxDrawdown([100, -50, 200, -150, 100])).toBe(150)
  })

  it("multiple drawdowns → returns maximum", () => {
    // cum: 100, 60, 80, 20, 60 → peak stays at 100; max trough is 20 → dd = 80
    expect(computeMaxDrawdown([100, -40, 20, -60, 40])).toBe(80)
  })

  it("all losses → drawdown equals absolute cumulative loss from 0", () => {
    // cum: -10, -30, -50 → peak stays 0, maxDd = 50
    expect(computeMaxDrawdown([-10, -20, -20])).toBe(50)
  })

  it("single value positive → 0 drawdown", () => {
    expect(computeMaxDrawdown([100])).toBe(0)
  })

  it("single value negative → drawdown equals absolute value", () => {
    expect(computeMaxDrawdown([-50])).toBe(50)
  })
})

// ── computeRunningBalance ─────────────────────────────────────────────────

describe("computeRunningBalance", () => {
  it("no trades → returns initial balance", () => {
    expect(computeRunningBalance(10_000, [])).toBe(10_000)
  })

  it("profitable trades → balance above initial", () => {
    expect(computeRunningBalance(10_000, [
      { pnl: 500 },
      { pnl: 300 },
    ])).toBe(10_800)
  })

  it("losing trades → balance below initial", () => {
    expect(computeRunningBalance(10_000, [
      { pnl: -200 },
      { pnl: -100 },
    ])).toBe(9_700)
  })

  it("null pnl (open trades) treated as 0", () => {
    expect(computeRunningBalance(10_000, [
      { pnl: 500 },
      { pnl: null },
    ])).toBe(10_500)
  })
})

// ── computeEquityCurve ────────────────────────────────────────────────────

describe("computeEquityCurve", () => {
  it("empty trades → empty curve", () => {
    expect(computeEquityCurve(10_000, [])).toEqual([])
  })

  it("curve starts from initialBalance, not 0", () => {
    const curve = computeEquityCurve(10_000, [{ pnl: 200, date: "2026-01-01" }])
    expect(curve[0].balance).toBe(10_200)
  })

  it("returns chronologically sorted points", () => {
    const curve = computeEquityCurve(10_000, [
      { pnl: -100, date: "2026-01-03" },
      { pnl:  200, date: "2026-01-01" },
      { pnl:  50,  date: "2026-01-02" },
    ])
    expect(curve.map(c => c.date)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"])
    expect(curve.map(c => c.balance)).toEqual([10_200, 10_250, 10_150])
  })

  it("null pnl entries contribute 0 to balance", () => {
    const curve = computeEquityCurve(5_000, [
      { pnl: null, date: "2026-01-01" },
      { pnl: 100,  date: "2026-01-02" },
    ])
    expect(curve[0].balance).toBe(5_000)
    expect(curve[1].balance).toBe(5_100)
  })

  it("does not mutate the input array", () => {
    const trades = [
      { pnl: -100, date: "2026-01-03" },
      { pnl:  200, date: "2026-01-01" },
    ]
    const copy = [...trades]
    computeEquityCurve(10_000, trades)
    expect(trades).toEqual(copy)
  })
})
