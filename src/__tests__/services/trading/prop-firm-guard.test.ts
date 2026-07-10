import { describe, it, expect } from "vitest"
import {
  checkConsistency,
  checkDailyLossLimit,
  checkLossLimit,
  checkTradeCountLimit,
  checkSymbolAllowlist,
  checkTrailingDrawdown,
  checkWeekendHolding,
} from "@/domains/trading/services/prop-firm-guard"

// ── checkLossLimit (HALLAZGO 1B — generic daily/weekly/monthly) ─────────────

describe("checkLossLimit", () => {
  it("null when no limit configured", () => {
    expect(checkLossLimit("WEEKLY", -5000, 10_000, null)).toBeNull()
    expect(checkLossLimit("WEEKLY", -5000, 10_000, 0)).toBeNull()
  })

  it("null when initial balance is non-positive", () => {
    expect(checkLossLimit("MONTHLY", -500, 0, 5)).toBeNull()
  })

  it("no violation when loss below limit", () => {
    expect(checkLossLimit("WEEKLY", -300, 10_000, 5)).toBeNull()
  })

  it("weekly violation at exactly the limit", () => {
    const r = checkLossLimit("WEEKLY", -500, 10_000, 5)
    expect(r?.type).toBe("WEEKLY_LOSS_LIMIT")
    if (r?.type === "WEEKLY_LOSS_LIMIT") {
      expect(r.limitPct).toBe(5)
      expect(r.currentPct).toBeCloseTo(5, 5)
    }
  })

  it("monthly violation when loss exceeds limit", () => {
    expect(checkLossLimit("MONTHLY", -1200, 10_000, 10)?.type).toBe("MONTHLY_LOSS_LIMIT")
  })

  it("positive period P&L never violates", () => {
    expect(checkLossLimit("DAILY", 800, 10_000, 2)).toBeNull()
  })
})

// ── checkDailyLossLimit ───────────────────────────────────────────────────

describe("checkDailyLossLimit", () => {
  it("no violation when loss is below limit", () => {
    // 1% loss on $10k balance, 2% limit → ok
    expect(checkDailyLossLimit(-100, 10_000, 2)).toBeNull()
  })

  it("violation when loss exactly equals limit", () => {
    // 2% of $10k = $200 loss → at limit
    const result = checkDailyLossLimit(-200, 10_000, 2)
    expect(result).not.toBeNull()
    if (result?.type !== "DAILY_LOSS_LIMIT") throw new Error("wrong type")
    expect(result.limitPct).toBe(2)
  })

  it("violation when loss exceeds limit", () => {
    // $250 loss on $10k = 2.5% → over 2% limit
    const result = checkDailyLossLimit(-250, 10_000, 2)
    expect(result).not.toBeNull()
    if (result?.type !== "DAILY_LOSS_LIMIT") throw new Error("wrong type")
    expect(result.currentPct).toBeCloseTo(2.5, 5)
  })

  it("no violation when all trades are wins (todayLoss = 0)", () => {
    expect(checkDailyLossLimit(0, 10_000, 2)).toBeNull()
  })

  it("no violation when initialBalance is 0 (guard against division by zero)", () => {
    expect(checkDailyLossLimit(-500, 0, 2)).toBeNull()
  })

  it("positive todayLoss (mixed calc) treated as no loss", () => {
    // If sum includes wins somehow (shouldn't happen in practice)
    expect(checkDailyLossLimit(100, 10_000, 2)).toBeNull()
  })
})

// ── checkTradeCountLimit ──────────────────────────────────────────────────

describe("checkTradeCountLimit", () => {
  it("no violation when below limit", () => {
    expect(checkTradeCountLimit(2, 5)).toBeNull()
  })

  it("violation when at limit", () => {
    const result = checkTradeCountLimit(5, 5)
    expect(result).not.toBeNull()
    if (result?.type !== "MAX_TRADES") throw new Error("wrong type")
    expect(result.limit).toBe(5)
    expect(result.current).toBe(5)
  })

  it("violation when over limit", () => {
    const result = checkTradeCountLimit(6, 5)
    expect(result).not.toBeNull()
    expect(result!.type).toBe("MAX_TRADES")
  })

  it("no violation when todayCount is 0", () => {
    expect(checkTradeCountLimit(0, 3)).toBeNull()
  })
})

// ── checkSymbolAllowlist ──────────────────────────────────────────────────

describe("checkSymbolAllowlist", () => {
  it("no violation when allowedSymbols is empty (all symbols permitted)", () => {
    expect(checkSymbolAllowlist("EURUSD", [])).toBeNull()
  })

  it("no violation when symbol is in allowlist (exact match)", () => {
    expect(checkSymbolAllowlist("EURUSD", ["EURUSD", "XAUUSD"])).toBeNull()
  })

  it("violation when symbol is not in allowlist", () => {
    const result = checkSymbolAllowlist("GBPUSD", ["EURUSD", "XAUUSD"])
    expect(result).not.toBeNull()
    if (result?.type !== "SYMBOL_NOT_ALLOWED") throw new Error("wrong type")
    expect(result.symbol).toBe("GBPUSD")
  })

  it("case-insensitive: lowercase symbol matches uppercase allowlist", () => {
    expect(checkSymbolAllowlist("eurusd", ["EURUSD"])).toBeNull()
  })

  it("case-insensitive: uppercase symbol matches lowercase allowlist", () => {
    expect(checkSymbolAllowlist("EURUSD", ["eurusd"])).toBeNull()
  })

  it("case-insensitive: mixed case is normalized correctly", () => {
    expect(checkSymbolAllowlist("EurUsd", ["EURUSD", "XAUUSD"])).toBeNull()
  })
})

// ── checkTrailingDrawdown ────────────────────────────────────────────────

describe("checkTrailingDrawdown", () => {
  it("null when no limit configured", () => {
    expect(checkTrailingDrawdown(9000, 10_000, 10_000, null, "TRAILING")).toBeNull()
    expect(checkTrailingDrawdown(9000, 10_000, 10_000, 0, "TRAILING")).toBeNull()
  })

  it("FIXED: violation when equity falls limitPct% below initial", () => {
    // 10% of 10k = 1000 → floor 9000; equity 9000 → at floor
    const r = checkTrailingDrawdown(9000, 12_000, 10_000, 10, "FIXED")
    expect(r?.type).toBe("MAX_DRAWDOWN")
  })

  it("FIXED: no violation while above the fixed floor even if below peak", () => {
    // floor 9000; equity 9500 → ok (FIXED ignores the 12k peak)
    expect(checkTrailingDrawdown(9500, 12_000, 10_000, 10, "FIXED")).toBeNull()
  })

  it("TRAILING: floor follows the peak", () => {
    // peak 12k, limit $1000 → floor 11_000; equity 10_900 → violation
    const r = checkTrailingDrawdown(10_900, 12_000, 10_000, 10, "TRAILING")
    expect(r?.type).toBe("TRAILING_DRAWDOWN")
    if (r?.type === "TRAILING_DRAWDOWN") expect(r.limitPct).toBe(10)
  })

  it("TRAILING: no violation just above the trailing floor", () => {
    // peak 12k, floor 11_000; equity 11_100 → ok
    expect(checkTrailingDrawdown(11_100, 12_000, 10_000, 10, "TRAILING")).toBeNull()
  })

  it("null when initialBalance non-positive", () => {
    expect(checkTrailingDrawdown(0, 0, 0, 10, "TRAILING")).toBeNull()
  })
})

// ── checkConsistency ─────────────────────────────────────────────────────

describe("checkConsistency", () => {
  it("null when no limit configured", () => {
    expect(checkConsistency([100, 200], null)).toBeNull()
    expect(checkConsistency([100, 200], 0)).toBeNull()
  })

  it("null when total profit is non-positive", () => {
    expect(checkConsistency([-100, -50], 40)).toBeNull()
  })

  it("violation when one day exceeds the consistency share", () => {
    // total 1000; best day 500 = 50% > 40% limit
    const r = checkConsistency([500, 300, 200], 40)
    expect(r?.type).toBe("CONSISTENCY")
    if (r?.type === "CONSISTENCY") expect(r.currentPct).toBeCloseTo(50, 5)
  })

  it("no violation when best day within share", () => {
    // total 1000; best day 300 = 30% <= 40%
    expect(checkConsistency([300, 300, 400], 40)).toBeNull()
  })

  it("ignores losing days when finding the best day", () => {
    // total 400; best day 300 = 75% > 40%
    expect(checkConsistency([300, 200, -100], 40)?.type).toBe("CONSISTENCY")
  })
})

// ── checkWeekendHolding ──────────────────────────────────────────────────

describe("checkWeekendHolding", () => {
  it("null for an intraday weekday trade", () => {
    // Wed 2026-07-08 open & close
    expect(checkWeekendHolding(new Date("2026-07-08T10:00:00Z"), new Date("2026-07-08T14:00:00Z"))).toBeNull()
  })

  it("null when held Wed→Thu (no weekend crossed)", () => {
    expect(checkWeekendHolding(new Date("2026-07-08T10:00:00Z"), new Date("2026-07-09T10:00:00Z"))).toBeNull()
  })

  it("violation when held Fri→Mon (crosses the weekend)", () => {
    // Fri 2026-07-10 → Mon 2026-07-13
    expect(checkWeekendHolding(new Date("2026-07-10T20:00:00Z"), new Date("2026-07-13T08:00:00Z"))?.type)
      .toBe("WEEKEND_HOLDING")
  })

  it("violation when the open day itself is Saturday", () => {
    expect(checkWeekendHolding(new Date("2026-07-11T10:00:00Z"), new Date("2026-07-11T12:00:00Z"))?.type)
      .toBe("WEEKEND_HOLDING")
  })
})
