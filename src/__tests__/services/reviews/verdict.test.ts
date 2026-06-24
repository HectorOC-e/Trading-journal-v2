import { describe, it, expect } from "vitest"
import { deriveGrade, deriveVerdict, splitChips, metricChips, deriveChipsFromReport } from "@/server/services/reviews/verdict"

describe("deriveGrade", () => {
  it("returns a dash when there are no trades", () => {
    expect(deriveGrade({ disciplineScore: 0, winRate: 0, netPnl: 0, profitFactor: 0, trades: 0 }).letter).toBe("—")
  })
  it("rewards profitable, disciplined weeks", () => {
    const g = deriveGrade({ disciplineScore: 85, winRate: 60, netPnl: 1200, profitFactor: 2.1, trades: 14 })
    expect(g.tone).toBe("good")
    expect(["A+", "A", "A−", "B+"]).toContain(g.letter)
  })
  it("penalizes red, undisciplined weeks", () => {
    const g = deriveGrade({ disciplineScore: 40, winRate: 30, netPnl: -800, profitFactor: 0.6, trades: 10 })
    expect(g.tone).toBe("bad")
    expect(["D", "F"]).toContain(g.letter)
  })
})

describe("deriveVerdict", () => {
  it("prefers the first substantive line of the AI analysis", () => {
    const v = deriveVerdict({
      aiAnalysis: "### Qué está pasando\n- Tu Breakout cargó la semana con disciplina sólida.",
      netPnl: 100, winRate: 55, disciplineScore: 80, trades: 5,
    })
    expect(v).toContain("Breakout")
    expect(v).not.toContain("###")
    expect(v).not.toMatch(/^[-•*]/)
  })
  it("falls back to a metric sentence without AI", () => {
    expect(deriveVerdict({ aiAnalysis: null, netPnl: 500, winRate: 60, disciplineScore: 82, trades: 8 })).toMatch(/rentable/i)
    expect(deriveVerdict({ aiAnalysis: null, netPnl: -300, winRate: 35, disciplineScore: 50, trades: 8 })).toMatch(/rojo/i)
    expect(deriveVerdict({ aiAnalysis: null, netPnl: 0, winRate: 0, disciplineScore: null, trades: 0 })).toMatch(/sin trades/i)
  })
})

describe("splitChips", () => {
  it("splits lines and strips markdown, capping at max", () => {
    expect(splitChips("- Breakout +$980\n• Cumpliste plan\n- extra\n- más", 3)).toEqual(["Breakout +$980", "Cumpliste plan", "extra"])
    expect(splitChips("", 3)).toEqual([])
    expect(splitChips(null)).toEqual([])
  })
})

describe("metricChips", () => {
  it("derives worked/improve from headline metrics", () => {
    const c = metricChips({ netPnl: 900, winRate: 60, profitFactor: 1.8, disciplineScore: 85, trades: 12 })
    expect(c.worked.length).toBeGreaterThan(0)
    expect(c.toImprove).toEqual([])
  })
  it("returns nothing for an empty week", () => {
    expect(metricChips({ netPnl: 0, winRate: 0, profitFactor: 0, disciplineScore: null, trades: 0 })).toEqual({ worked: [], toImprove: [] })
  })
})

describe("deriveChipsFromReport", () => {
  it("uses best setup and violations", () => {
    const c = deriveChipsFromReport({
      kpis: { winRate: 58, trades: 14, profitFactor: 2.1 },
      setups: [{ name: "Breakout", pnl: 980 }, { name: "Reversal", pnl: -240 }],
      discipline: { violations: 1, costo: -120 },
      bestDay: { pnl: 600 },
    })
    expect(c.worked.some(w => w.includes("Breakout"))).toBe(true)
    expect(c.toImprove.some(t => t.toLowerCase().includes("violación"))).toBe(true)
  })
})
