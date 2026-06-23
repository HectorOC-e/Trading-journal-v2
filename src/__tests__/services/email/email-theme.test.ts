import { describe, it, expect } from "vitest"
import { resolveEmailThemeFor } from "@/server/services/email/email-theme"

describe("resolveEmailThemeFor", () => {
  it("uses light base for system/undefined and dark for dark mode", () => {
    expect(resolveEmailThemeFor(null).mode).toBe("light")
    expect(resolveEmailThemeFor({ theme: "system" }).mode).toBe("light")
    expect(resolveEmailThemeFor({ theme: "dark" }).mode).toBe("dark")
  })

  it("injects a valid hex accent from a preset palette", () => {
    const t = resolveEmailThemeFor({ theme: "light", colorTheme: "carmesi" })
    expect(t.accent).toMatch(/^#[0-9a-f]{6}$/i)
    expect(t.band).toBe(t.accent)
    // different palettes give different accents
    expect(resolveEmailThemeFor({ colorTheme: "turquesa" }).accent)
      .not.toBe(resolveEmailThemeFor({ colorTheme: "carmesi" }).accent)
  })

  it("reads a custom accent hex from customTheme JSON", () => {
    const t = resolveEmailThemeFor({ colorTheme: "custom", customTheme: JSON.stringify({ accent: "#ab12cd" }) })
    expect(t.accent).toBe("#ab12cd")
  })

  it("falls back to the base accent on unknown/invalid palette", () => {
    const base = resolveEmailThemeFor({ colorTheme: "custom", customTheme: "not-json" })
    expect(base.accent).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
