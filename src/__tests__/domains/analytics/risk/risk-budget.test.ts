import { describe, it, expect } from "vitest"
import { computeRiskBudget, resolveDailyWindow } from "@/domains/analytics/risk/risk-budget"

describe("computeRiskBudget", () => {
  it("reports full room and trade count when flat at the open", () => {
    const b = computeRiskBudget({ ddDailyPct: 0.05, realizedPnlPct: 0, usualRiskPerTradePct: 0.01 })
    expect(b.hasLimit).toBe(true)
    expect(b.remainingPct).toBeCloseTo(0.05, 9)
    expect(b.maxTrades).toBe(5)
    expect(b.exhausted).toBe(false)
    expect(b.usedPct).toBeCloseTo(0, 9)
  })

  it("shrinks the room and trade count as the day loses", () => {
    const b = computeRiskBudget({ ddDailyPct: 0.05, realizedPnlPct: -0.03, usualRiskPerTradePct: 0.01 })
    expect(b.remainingPct).toBeCloseTo(0.02, 9)
    expect(b.maxTrades).toBe(2)
    expect(b.usedPct).toBeCloseTo(0.6, 9)
    expect(b.exhausted).toBe(false)
  })

  it("is exhausted (no trades) once the daily limit is reached or breached", () => {
    const b = computeRiskBudget({ ddDailyPct: 0.05, realizedPnlPct: -0.05, usualRiskPerTradePct: 0.01 })
    expect(b.remainingPct).toBeCloseTo(0, 9)
    expect(b.maxTrades).toBe(0)
    expect(b.exhausted).toBe(true)
    expect(b.usedPct).toBeCloseTo(1, 9)
  })

  it("a winning day extends the room toward the static daily floor", () => {
    const b = computeRiskBudget({ ddDailyPct: 0.05, realizedPnlPct: 0.02, usualRiskPerTradePct: 0.01 })
    expect(b.remainingPct).toBeCloseTo(0.07, 9)
    expect(b.maxTrades).toBe(7)
    expect(b.usedPct).toBeCloseTo(0, 9) // clamped, never negative
  })

  it("returns a null budget when there is no daily limit configured", () => {
    const b = computeRiskBudget({ ddDailyPct: null, realizedPnlPct: -0.03, usualRiskPerTradePct: 0.01 })
    expect(b.hasLimit).toBe(false)
    expect(b.remainingPct).toBeNull()
    expect(b.maxTrades).toBeNull()
    expect(b.exhausted).toBe(false)
  })
})

describe("resolveDailyWindow (configurable reset, #38)", () => {
  it("resets at midnight UTC by default", () => {
    const now = Date.parse("2026-06-26T10:00:00Z")
    const w = resolveDailyWindow({ nowMs: now, resetHour: 0, tzOffsetMinutes: 0 })
    expect(new Date(w.startMs).toISOString()).toBe("2026-06-26T00:00:00.000Z")
    expect(w.endMs - w.startMs).toBe(24 * 3600 * 1000)
  })

  it("rolls back to the previous day before the reset hour", () => {
    const now = Date.parse("2026-06-26T10:00:00Z")
    const w = resolveDailyWindow({ nowMs: now, resetHour: 17, tzOffsetMinutes: 0 })
    expect(new Date(w.startMs).toISOString()).toBe("2026-06-25T17:00:00.000Z")
  })

  it("honours a negative timezone offset (US Eastern)", () => {
    // 02:00Z is 21:00 the previous day in UTC-5; reset at local midnight
    const now = Date.parse("2026-06-26T02:00:00Z")
    const w = resolveDailyWindow({ nowMs: now, resetHour: 0, tzOffsetMinutes: -300 })
    expect(new Date(w.startMs).toISOString()).toBe("2026-06-25T05:00:00.000Z")
  })
})
