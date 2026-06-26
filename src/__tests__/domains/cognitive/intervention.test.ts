import { describe, it, expect } from "vitest"
import {
  priority,
  detectInterventions,
  decideIntervention,
  type DayState,
  type InterventionCandidate,
} from "@/domains/cognitive/intervention/engine"

const base: DayState = {
  tradesToday: 0, lossesToday: 0, consecutiveLosses: 0,
  lastRiskPct: null, avgRiskPct: null, dayPnlPct: 0,
  drawdownPct: 0, ddDailyLimitPct: null, impulsiveToday: 0,
}
const triggers = (s: Partial<DayState>) => detectInterventions({ ...base, ...s }).map((c) => c.trigger)

describe("priority", () => {
  it("multiplies the score factors and applies the fatigue penalty", () => {
    const s = { severity: 1, urgency: 1, confidence: 1, expectedImpact: 1 }
    expect(priority(s)).toBe(1)
    expect(priority(s, 0.5)).toBeCloseTo(0.5, 9)
    expect(priority({ severity: 0.5, urgency: 0.8, confidence: 1, expectedImpact: 0.5 })).toBeCloseTo(0.2, 9)
  })
})

describe("detectInterventions", () => {
  it("fires cascade on 3 consecutive losses", () => {
    expect(triggers({ consecutiveLosses: 3 })).toContain("cascade")
  })
  it("fires revenge on 2 losses + an impulsive trade", () => {
    expect(triggers({ consecutiveLosses: 2, impulsiveToday: 1 })).toContain("revenge")
  })
  it("fires oversizing when last risk ≥ 2× average after a loss", () => {
    expect(triggers({ lossesToday: 1, lastRiskPct: 2.2, avgRiskPct: 1.0 })).toContain("oversizing")
    expect(triggers({ lossesToday: 1, lastRiskPct: 1.2, avgRiskPct: 1.0 })).not.toContain("oversizing")
  })
  it("fires dd_breach (capital override) at/over the daily limit", () => {
    const c = detectInterventions({ ...base, drawdownPct: 5, ddDailyLimitPct: 5 })
    expect(c[0].trigger).toBe("dd_breach")
    expect(c[0].capitalOverride).toBe(true)
  })
  it("fires dd_approach near the limit", () => {
    expect(triggers({ drawdownPct: 4.2, ddDailyLimitPct: 5 })).toContain("dd_approach")
  })
  it("is silent with no risky state", () => {
    expect(detectInterventions(base)).toEqual([])
  })
})

describe("decideIntervention", () => {
  const calm = { activeCount: 0, minsSinceLast: null, shownToday: 0 }
  const cascade = detectInterventions({ ...base, consecutiveLosses: 3 })
  const ddBreach = detectInterventions({ ...base, drawdownPct: 6, ddDailyLimitPct: 5 })

  it("returns null when there are no candidates", () => {
    expect(decideIntervention([], calm)).toBeNull()
  })

  it("shows the best candidate when calm and above θ", () => {
    expect(decideIntervention(cascade, calm)?.trigger).toBe("cascade")
  })

  it("suppresses a non-capital intervention when one is already active", () => {
    expect(decideIntervention(cascade, { ...calm, activeCount: 1 })).toBeNull()
  })

  it("suppresses a non-capital intervention inside the cooldown window", () => {
    expect(decideIntervention(cascade, { ...calm, minsSinceLast: 5 }, { cooldownMins: 30 })).toBeNull()
  })

  it("suppresses once the daily budget is spent", () => {
    expect(decideIntervention(cascade, { ...calm, shownToday: 4 }, { dailyBudget: 4 })).toBeNull()
  })

  it("ALWAYS shows a capital override, ignoring active/cooldown/budget (D14)", () => {
    const fatigued = { activeCount: 3, minsSinceLast: 1, shownToday: 99 }
    expect(decideIntervention(ddBreach, fatigued)?.trigger).toBe("dd_breach")
  })

  it("suppresses below θ", () => {
    const weak: InterventionCandidate[] = [{
      trigger: "oversizing", severity: "warning",
      scores: { severity: 0.2, urgency: 0.2, confidence: 0.2, expectedImpact: 0.2 },
      message: "", suggestedAction: { kind: "none", label: "" }, capitalOverride: false,
    }]
    expect(decideIntervention(weak, calm, { theta: 0.18 })).toBeNull()
  })
})
