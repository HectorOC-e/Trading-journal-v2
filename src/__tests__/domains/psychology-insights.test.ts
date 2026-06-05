import { describe, it, expect } from "vitest"
import {
  generatePsychologyInsights,
  detectEmotionBeforeLoss,
  detectImpulsiveExpectancy,
  detectCleanStreak,
} from "@/domains/analytics/services/psychology-insights"
import type { AnalyticsTrade } from "@/domains/analytics/services/insights-engine"

function trade(o: Partial<AnalyticsTrade> & { id: string; date: string; pnl: number }): AnalyticsTrade {
  return {
    id: o.id, accountId: "a1", symbol: "EURUSD", direction: "LONG",
    session: "London", openTime: o.openTime ?? "08:00", closeTime: o.closeTime ?? "09:00",
    pnl: o.pnl, rMultiple: o.rMultiple ?? (o.pnl >= 0 ? 1 : -1), tags: o.tags ?? [],
    date: o.date, setupId: null, entry: 1, stop: 0.99, target: 1.02, size: 1,
    emotionBefore: o.emotionBefore ?? null, fomoFlag: o.fomoFlag, revengeFlag: o.revengeFlag,
    confidenceRating: o.confidenceRating ?? null,
  }
}

describe("psychology-insights", () => {
  it("detects negative emotion preceding losses", () => {
    const trades: AnalyticsTrade[] = []
    for (let i = 0; i < 10; i++) trades.push(trade({ id: `l${i}`, date: `2026-01-${String(i + 1).padStart(2, "0")}`, pnl: -50, emotionBefore: "anxious" }))
    for (let i = 0; i < 2; i++) trades.push(trade({ id: `c${i}`, date: `2026-02-${String(i + 1).padStart(2, "0")}`, pnl: -30, emotionBefore: "calm" }))
    const insight = detectEmotionBeforeLoss(trades)
    expect(insight).not.toBeNull()
    expect(insight!.metric).toBeGreaterThanOrEqual(50)
  })

  it("detects negative expectancy of impulsive trades", () => {
    const trades: AnalyticsTrade[] = []
    for (let i = 0; i < 8; i++) trades.push(trade({ id: `i${i}`, date: `2026-01-${String(i + 1).padStart(2, "0")}`, pnl: -80, revengeFlag: true }))
    for (let i = 0; i < 8; i++) trades.push(trade({ id: `p${i}`, date: `2026-02-${String(i + 1).padStart(2, "0")}`, pnl: 60 }))
    const insight = detectImpulsiveExpectancy(trades)
    expect(insight).not.toBeNull()
    expect(insight!.severity).toBe("critical")
  })

  it("rewards a clean discipline streak", () => {
    const trades: AnalyticsTrade[] = []
    for (let i = 0; i < 20; i++) trades.push(trade({ id: `t${i}`, date: `2026-03-${String(i + 1).padStart(2, "0")}`, pnl: i % 2 ? 40 : -20 }))
    const insight = detectCleanStreak(trades)
    expect(insight).not.toBeNull()
    expect(insight!.severity).toBe("positive")
  })

  it("returns nothing for tiny samples", () => {
    expect(generatePsychologyInsights([trade({ id: "1", date: "2026-01-01", pnl: 10 })])).toEqual([])
  })
})
