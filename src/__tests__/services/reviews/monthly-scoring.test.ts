import { describe, it, expect } from "vitest"
import { computePillars } from "@/server/services/reviews/pillars"
import { deriveLetterTitle, deriveStructuredThemes } from "@/server/services/reviews/monthly-letter"
import { evaluateGoal } from "@/server/services/reviews/goal-eval"

describe("computePillars", () => {
  it("zeros out an empty month", () => {
    expect(computePillars({ trades: 0, winRate: 0, profitFactor: 0, expectancy: 0, disciplineScore: null, byEmotion: [] }))
      .toEqual({ performance: 0, discipline: 0, psychology: 0, overall: 0 })
  })
  it("scores a strong month high and clamps 0–100", () => {
    const p = computePillars({ trades: 40, winRate: 62, profitFactor: 2.4, expectancy: 30, disciplineScore: 88, byEmotion: [{ emotion: "calm", trades: 30, avgPnl: 50, winRate: 65 }, { emotion: "tilt", trades: 10, avgPnl: -20, winRate: 30 }] })
    expect(p.performance).toBeGreaterThanOrEqual(85)
    expect(p.discipline).toBe(88)
    for (const v of Object.values(p)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100) }
  })
  it("falls back to discipline for psychology when no emotion data", () => {
    const p = computePillars({ trades: 10, winRate: 50, profitFactor: 1.2, expectancy: 5, disciplineScore: 70, byEmotion: [] })
    expect(p.psychology).toBe(70)
  })
})

describe("deriveLetterTitle", () => {
  it("reflects result + discipline", () => {
    expect(deriveLetterTitle("Junio", { netPnl: 1200, winRate: 60, disciplineScore: 85, trades: 40 })).toMatch(/rentable.*sólida/)
    expect(deriveLetterTitle("Junio", { netPnl: -300, winRate: 40, disciplineScore: 50, trades: 12 })).toMatch(/rojo.*floje/)
    expect(deriveLetterTitle("Junio", { netPnl: 0, winRate: 0, disciplineScore: null, trades: 0 })).toMatch(/sin operaciones/)
  })
})

describe("deriveStructuredThemes", () => {
  it("derives up/down themes from setups and violations", () => {
    const themes = deriveStructuredThemes({
      kpis: { winRate: 58, profitFactor: 2.1, trades: 30 },
      deltas: { winRate: 7 },
      setups: [{ name: "Breakout", pnl: 980, trades: 12 }, { name: "Reversal", pnl: -240, trades: 6 }],
      discipline: { violations: 2, costo: -180 },
    })
    expect(themes.some(t => t.sentiment === "up" && t.title.includes("Breakout"))).toBe(true)
    expect(themes.some(t => t.sentiment === "down")).toBe(true)
    expect(themes.length).toBeLessThanOrEqual(4)
  })
})

describe("evaluateGoal", () => {
  it("scores discipline goals from violations", () => {
    expect(evaluateGoal("Reducir revenge trading", { violations: 0, trades: 10, netPnl: 0, winRate: 50 })?.status).toBe("done")
    expect(evaluateGoal("Reducir revenge trading", { violations: 2, trades: 10, netPnl: 0, winRate: 50 })?.status).toBe("partial")
    expect(evaluateGoal("Reducir revenge trading", { violations: 5, trades: 10, netPnl: 0, winRate: 50 })?.status).toBe("pending")
  })
  it("scores study goals from minutes when available", () => {
    expect(evaluateGoal("Estudiar 20 min diarios", { violations: 0, trades: 0, netPnl: 0, winRate: 0, studyMinutes: 600 })?.status).toBe("done")
  })
  it("returns null for non-measurable goals", () => {
    expect(evaluateGoal("Registrar emociones", { violations: 0, trades: 10, netPnl: 0, winRate: 50 })).toBeNull()
  })
})
