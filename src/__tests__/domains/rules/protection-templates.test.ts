import { describe, it, expect } from "vitest"
import {
  PROTECTION_TEMPLATES,
  PROTECTION_TEMPLATE_MAP,
  templateToUnifiedRule,
} from "@/domains/rules/protection-templates"

describe("PROTECTION_TEMPLATES — the #8 capital-protection catalog", () => {
  it("contains the five protection templates", () => {
    expect(PROTECTION_TEMPLATES.map((t) => t.id).sort()).toEqual(
      [
        "cooldown-after-loss",
        "daily-loss-stop",
        "no-size-increase-after-loss",
        "no-trade-low-energy",
        "weekly-loss-limit",
      ],
    )
  })

  it("templates that map to existing condition fields are available and enforce", () => {
    for (const id of ["daily-loss-stop", "weekly-loss-limit", "cooldown-after-loss"]) {
      const t = PROTECTION_TEMPLATE_MAP[id]
      expect(t.available, id).toBe(true)
      expect(t.mode, id).toBe("enforce")
      expect(t.rule?.actions.some((a) => a.type === "BLOCK"), id).toBe(true)
    }
  })

  it("daily-loss-stop blocks pre-trade on the daily P&L field", () => {
    const t = PROTECTION_TEMPLATE_MAP["daily-loss-stop"]
    expect(t.rule?.trigger).toBe("TRADE_PRE_CREATE")
    expect(JSON.stringify(t.rule?.conditions)).toContain("dayPnlPct")
  })

  it("templates needing fields that do not exist yet are gated (no faked enforcement)", () => {
    const energy = PROTECTION_TEMPLATE_MAP["no-trade-low-energy"]
    expect(energy.available).toBe(false)
    expect(energy.requires).toMatch(/energ|check-in/i)

    const noSize = PROTECTION_TEMPLATE_MAP["no-size-increase-after-loss"]
    expect(noSize.available).toBe(false)
    expect(noSize.requires).toBeTruthy()
  })
})

describe("templateToUnifiedRule", () => {
  it("builds an enforce UnifiedRule from an available template", () => {
    const u = templateToUnifiedRule("daily-loss-stop")
    expect(u).toMatchObject({ mode: "enforce", trigger: "TRADE_PRE_CREATE", sourceAutomationId: null })
    expect(u.actions.some((a) => a.type === "BLOCK")).toBe(true)
  })

  it("refuses to build a rule from a gated template", () => {
    expect(() => templateToUnifiedRule("no-trade-low-energy")).toThrow()
  })
})