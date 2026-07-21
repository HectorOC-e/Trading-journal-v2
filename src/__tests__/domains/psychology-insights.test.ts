import { describe, it, expect } from "vitest"
import {
  generatePsychologyInsights,
  detectEmotionBeforeLoss,
  detectImpulsiveExpectancy,
  detectCleanStreak,
  detectOverconfidence,
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

  // ── OI-3.5: cobertura de `stat` ────────────────────────────────────────────
  // `overconfidence-bias` compara la win rate de los trades de alta confianza
  // contra la media del propio trader: successes/trials Bernoulli con baseline
  // explícito, la misma forma que `intraday-decay`. Exponer `stat` deja que
  // `toComputedInsight` le ponga intervalo creíble en vez de un n coarse.
  describe("detectOverconfidence — base estadística (OI-3.5)", () => {
    // 10 de alta confianza con 2 victorias (20% WR) + 10 normales con 8 (80%).
    // Media global = 10/20 = 50% → la alta confianza rinde MUY por debajo.
    function overconfidentTrades(): AnalyticsTrade[] {
      const trades: AnalyticsTrade[] = []
      for (let i = 0; i < 10; i++) {
        trades.push(trade({ id: `h${i}`, date: `2026-01-${String(i + 1).padStart(2, "0")}`, pnl: i < 2 ? 50 : -50, confidenceRating: 5 }))
      }
      for (let i = 0; i < 10; i++) {
        trades.push(trade({ id: `n${i}`, date: `2026-02-${String(i + 1).padStart(2, "0")}`, pnl: i < 8 ? 50 : -50, confidenceRating: 2 }))
      }
      return trades
    }

    it("expone stat de proporción con los conteos reales y el baseline global", () => {
      const insight = detectOverconfidence(overconfidentTrades())
      expect(insight).not.toBeNull()
      expect(insight!.stat).toEqual({
        kind: "proportion",
        successes: 2,   // victorias entre los de alta confianza
        trials: 10,     // trades de alta confianza
        baseline: 0.5,  // win rate global (10/20), como fracción
        direction: "below",
      })
    })

    it("el n de stat es el de alta confianza, no el total de trades", () => {
      const insight = detectOverconfidence(overconfidentTrades())
      // El punto de OI-3.5/DT-1: sin `stat` el sampleSize sería 20 (coarse).
      expect(insight!.stat!.trials).toBe(10)
      expect(insight!.stat!.trials).toBeLessThan(20)
    })

    it("no emite insight (ni stat) cuando la confianza SÍ está calibrada", () => {
      const trades: AnalyticsTrade[] = []
      for (let i = 0; i < 10; i++) trades.push(trade({ id: `h${i}`, date: `2026-01-${String(i + 1).padStart(2, "0")}`, pnl: i < 6 ? 50 : -50, confidenceRating: 5 }))
      for (let i = 0; i < 10; i++) trades.push(trade({ id: `n${i}`, date: `2026-02-${String(i + 1).padStart(2, "0")}`, pnl: i < 5 ? 50 : -50, confidenceRating: 2 }))
      expect(detectOverconfidence(trades)).toBeNull()
    })
  })
})
