import { describe, it, expect } from "vitest"
import { buildScenario, CLEAN_PROFILE, DIRTY_PROFILE } from "../support/behavior-scenario"
import {
  detectIntradayDecay,
  detectRevengeTrading,
  detectOversizing,
  detectOffPlan,
} from "@/domains/analytics/services/insights-engine"

const dirty = buildScenario(DIRTY_PROFILE)
const clean = buildScenario(CLEAN_PROFILE)

describe("detectores sobre un escenario con patrón", () => {
  it("intraday-decay dispara", () => {
    const i = detectIntradayDecay(dirty.history)
    expect(i).not.toBeNull()
    expect(i!.id).toBe("intraday-decay")
    expect(i!.metric).toBeGreaterThanOrEqual(12)
  })

  it("revenge-trading dispara", () => {
    const i = detectRevengeTrading(dirty.history)
    expect(i).not.toBeNull()
    expect(i!.id).toBe("revenge-trading")
    expect(i!.metric).toBeGreaterThanOrEqual(30)
  })

  it("oversizing dispara", () => {
    const i = detectOversizing(dirty.history)
    expect(i).not.toBeNull()
    expect(i!.id).toBe("oversizing")
    expect(i!.metric).toBeGreaterThanOrEqual(20)
  })

  it("off-plan dispara", () => {
    const i = detectOffPlan(dirty.history)
    expect(i).not.toBeNull()
    expect(i!.id).toBe("off-plan")
    expect(i!.metric).toBeGreaterThanOrEqual(20)
  })
})

describe("los detectores CALLAN sobre un escenario limpio", () => {
  it("ninguno de los cuatro dispara", () => {
    expect(detectIntradayDecay(clean.history)).toBeNull()
    expect(detectRevengeTrading(clean.history)).toBeNull()
    expect(detectOversizing(clean.history)).toBeNull()
    expect(detectOffPlan(clean.history)).toBeNull()
  })
})

describe("frontera del umbral de off-plan (rate >= 0.20)", () => {
  // revengeAfterLoss = 0 para que la cuota off-plan sea SOLO offPlanShare:
  // "Impulsivo" también cuenta como off-plan y contaminaría la medición.
  const base = { ...CLEAN_PROFILE, revengeAfterLoss: 0 }

  it("calla justo por debajo del umbral", () => {
    const s = buildScenario({ ...base, seed: 4242, offPlanShare: 0.1 })
    expect(detectOffPlan(s.history)).toBeNull()
  })

  it("dispara justo por encima del umbral", () => {
    const s = buildScenario({ ...base, seed: 4242, offPlanShare: 0.3 })
    expect(detectOffPlan(s.history)).not.toBeNull()
  })
})
