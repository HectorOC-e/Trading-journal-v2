import { describe, it, expect } from "vitest"
import { ruleDataFromExecutableInput, ruleDataFromTemplate } from "@/domains/rules/rule-write"
import type { RuleAction } from "@/domains/rules/types"

const BLOCK: RuleAction[] = [{ type: "BLOCK", params: { message: "no" } }]
const NOTIFY: RuleAction[] = [{ type: "NOTIFY", params: { message: "ojo" } }]

describe("ruleDataFromExecutableInput", () => {
  const base = {
    name: "Regla X", description: "d", trigger: "TRADE_PRE_CREATE" as const,
    conditions: { field: "riskPct", cmp: "gt" as const, value: 2 },
    category: "Riesgo", priority: 1, enabled: true,
  }

  it("BLOCK ⇒ mode enforce + severity CRÍTICA (espejo de rule-sync)", () => {
    const d = ruleDataFromExecutableInput({ ...base, actions: BLOCK })
    expect(d.mode).toBe("enforce")
    expect(d.severity).toBe("CRÍTICA")
    expect(d.isSystem).toBe(false)
    expect(d.trigger).toBe("TRADE_PRE_CREATE")
  })

  it("sin BLOCK ⇒ warn + MEDIA", () => {
    const d = ruleDataFromExecutableInput({ ...base, actions: NOTIFY })
    expect(d.mode).toBe("warn")
    expect(d.severity).toBe("MEDIA")
  })

  it("preserva conditions/actions/priority/category tal cual", () => {
    const d = ruleDataFromExecutableInput({ ...base, actions: NOTIFY })
    expect(d.conditions).toEqual(base.conditions)
    expect(d.actions).toEqual(NOTIFY)
    expect(d.priority).toBe(1)
    expect(d.category).toBe("Riesgo")
  })
})

describe("ruleDataFromTemplate", () => {
  it("instancia una plantilla ejecutable (psychology-revenge ⇒ enforce)", () => {
    const d = ruleDataFromTemplate("psychology-revenge")
    expect(d).not.toBeNull()
    expect(d!.name).toBe("Bloquear revenge trade")
    expect(d!.mode).toBe("enforce")
    expect(d!.trigger).toBe("TRADE_PRE_CREATE")
    expect(d!.enabled).toBe(true)
  })

  it("plantilla de protección de la galería fusionada (daily-loss-stop)", () => {
    const d = ruleDataFromTemplate("daily-loss-stop")
    expect(d).not.toBeNull()
    expect(d!.mode).toBe("enforce")
  })

  it("id desconocido ⇒ null", () => {
    expect(ruleDataFromTemplate("nope")).toBeNull()
  })
})
