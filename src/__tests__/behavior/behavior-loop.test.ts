import { describe, it, expect } from "vitest"
import { buildScenario, CLEAN_PROFILE, DIRTY_PROFILE } from "../support/behavior-scenario"
import {
  detectIntradayDecay,
  detectRevengeTrading,
  detectOversizing,
  detectOffPlan,
} from "@/domains/analytics/services/insights-engine"
import {
  canCommit,
  deriveCommitmentSpec,
  evaluateResult,
  statusFromResult,
} from "@/domains/behavior/commitment-machine"
import { getVerifier, type WindowTrade } from "@/domains/behavior/verifiers"
import { planReinforcement } from "@/domains/behavior/reinforcement"

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

describe("cadena insight → commitment → verificación → reinforcement", () => {
  const TYPES = ["intraday-decay", "revenge-trading", "oversizing", "off-plan"] as const

  it("los cuatro tipos detectados son comprometibles", () => {
    for (const type of TYPES) expect(canCommit(type)).toBe(true)
  })

  it("cada tipo deriva una spec que apunta a un verificador vivo", () => {
    for (const type of TYPES) {
      const spec = deriveCommitmentSpec(type)
      expect(spec).not.toBeNull()
      expect(getVerifier(spec!.metricKey)).not.toBeNull()
    }
  })

  it("el escenario sucio ROMPE el compromiso y produce refuerzo correctivo", () => {
    for (const type of TYPES) {
      const spec = deriveCommitmentSpec(type)!
      const verifier = getVerifier(spec.metricKey)!
      const { observedValue } = verifier(dirty.history as WindowTrade[])
      const result = evaluateResult(observedValue, spec.target, spec.comparator)

      expect(observedValue).toBeGreaterThan(spec.target)
      expect(result).toBe("broken")
      expect(statusFromResult(result)).toBe("broken")

      const plan = planReinforcement(result)
      expect(plan.kind).toBe("corrective")
      expect(plan.visible).toBe(true) // el correctivo SIEMPRE se muestra (§8.4)
    }
  })

  it("el escenario limpio MANTIENE el compromiso y el primer refuerzo positivo se muestra", () => {
    for (const type of TYPES) {
      const spec = deriveCommitmentSpec(type)!
      const verifier = getVerifier(spec.metricKey)!
      const { observedValue } = verifier(clean.history as WindowTrade[])
      const result = evaluateResult(observedValue, spec.target, spec.comparator)

      expect(result).toBe("kept")
      expect(planReinforcement(result, 0)).toEqual({ kind: "positive", visible: true })
    }
  })

  it("el refuerzo positivo se ralea con la razón variable (FREEZE-D13)", () => {
    // Visible en los triangulares 0,1,3,6,10; silencioso en el resto.
    expect(planReinforcement("kept", 0).visible).toBe(true)
    expect(planReinforcement("kept", 1).visible).toBe(true)
    expect(planReinforcement("kept", 2).visible).toBe(false)
    expect(planReinforcement("kept", 3).visible).toBe(true)
    expect(planReinforcement("kept", 4).visible).toBe(false)
    expect(planReinforcement("kept", 6).visible).toBe(true)
  })

  it("el verificador señala como evidencia trades que existen en el escenario", () => {
    const spec = deriveCommitmentSpec("revenge-trading")!
    const { evidence } = getVerifier(spec.metricKey)!(dirty.history as WindowTrade[])
    expect(evidence.tradeIds.length).toBeGreaterThan(0)
    const ids = new Set(dirty.history.map((t) => t.id))
    for (const id of evidence.tradeIds) expect(ids.has(id)).toBe(true)
  })
})
