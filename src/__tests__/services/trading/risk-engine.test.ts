import { describe, it, expect } from "vitest"
import { computeAccountRisk, maxDrawdownFromPnl } from "@/domains/trading/services/risk-engine"

const NO_LIMITS = { ddDailyPct: null, ddWeeklyPct: null, ddMonthlyPct: null, ddTotalPct: null }

function base(over: Partial<Parameters<typeof computeAccountRisk>[0]> = {}) {
  return computeAccountRisk({
    initialBalance: 10_000,
    ...NO_LIMITS,
    dayPnl: 0, weekPnl: 0, monthPnl: 0, maxDrawdown: 0,
    ...over,
  })
}

describe("computeAccountRisk — gauges", () => {
  it("unconfigured limits → not configured, no breach", () => {
    const r = base()
    expect(r.total.configured).toBe(false)
    expect(r.breach).toBeNull()
  })

  it("evidence case: $75 balance, $4.90 max DD, 12% limit → 6.5% actual, 54% used", () => {
    // Reproduces the reported bug: bar should fill ~54% but DISPLAY 6.5% / 12%.
    const r = computeAccountRisk({
      initialBalance: 75, ...NO_LIMITS, ddTotalPct: 12,
      dayPnl: 0, weekPnl: 0, monthPnl: 0, maxDrawdown: 4.9,
    })
    expect(r.total.actualPct).toBeCloseTo(6.5, 1)   // 4.9/75*100
    expect(r.total.limitPct).toBe(12)
    expect(r.total.usedPct).toBeCloseTo(54.4, 0)    // 6.53/12*100
    expect(r.breach).toBeNull()                      // below limit
  })

  it("usedPct is clamped to 100", () => {
    const r = computeAccountRisk({ initialBalance: 100, ...NO_LIMITS, ddTotalPct: 5, dayPnl: 0, weekPnl: 0, monthPnl: 0, maxDrawdown: 50 }) // 50% vs 5%
    expect(r.total.usedPct).toBe(100)
  })
})

describe("computeAccountRisk — auto-lock breach (BUG#1 PROBLEMA B)", () => {
  it("DAILY loss breach", () => {
    const r = base({ ddDailyPct: 2, dayPnl: -200 }) // 2% of 10k
    expect(r.breach?.reason).toBe("DAILY_LOSS_LIMIT")
  })

  it("WEEKLY loss breach", () => {
    const r = base({ ddWeeklyPct: 5, weekPnl: -600 }) // 6% > 5%
    expect(r.breach?.reason).toBe("WEEKLY_LOSS_LIMIT")
  })

  it("MONTHLY loss breach", () => {
    const r = base({ ddMonthlyPct: 8, monthPnl: -900 }) // 9% > 8%
    expect(r.breach?.reason).toBe("MONTHLY_LOSS_LIMIT")
  })

  it("MAX_DRAWDOWN breach", () => {
    const r = base({ ddTotalPct: 10, maxDrawdown: 1200 }) // 12% > 10%
    expect(r.breach?.reason).toBe("MAX_DRAWDOWN")
  })

  it("precedence: daily wins over total when both breached", () => {
    const r = base({ ddDailyPct: 2, dayPnl: -300, ddTotalPct: 10, maxDrawdown: 1500 })
    expect(r.breach?.reason).toBe("DAILY_LOSS_LIMIT")
  })

  it("no breach when all within limits", () => {
    const r = base({ ddDailyPct: 5, dayPnl: -100, ddTotalPct: 10, maxDrawdown: 400 })
    expect(r.breach).toBeNull()
  })

  it("profit (positive pnl) never breaches a loss limit", () => {
    const r = base({ ddDailyPct: 2, dayPnl: 500 })
    expect(r.breach).toBeNull()
    expect(r.daily.actualPct).toBe(0)
  })
})

describe("maxDrawdownFromPnl", () => {
  it("peak-to-trough", () => {
    expect(maxDrawdownFromPnl([100, 200, -300, 200])).toBe(300)
    expect(maxDrawdownFromPnl([100, 200, 300])).toBe(0)
    expect(maxDrawdownFromPnl([])).toBe(0)
  })
})
