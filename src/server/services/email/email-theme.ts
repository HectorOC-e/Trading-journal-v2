// Resolve an EmailTheme from a user's saved theme preferences, so review/learning
// emails respect the user's light/dark mode + accent color (per the redesign spec §4).
// Email dark-mode is unreliable across clients, so "system" falls back to light; the
// accent (the more robust signal) is always injected when known.

import { resolveTheme, type EmailTheme } from "@/emails/theme"
import { getPredefined } from "@/lib/theme/palettes.config"
import { oklchToRgb } from "@/lib/theme/engine"

export interface ThemePrefs {
  theme?: string | null       // "light" | "dark" | "system"
  colorTheme?: string | null  // "indigo" | … | "custom" | "custom:<id>"
  customTheme?: string | null  // JSON when colorTheme starts with "custom"
}

const hx = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")

function accentHex(prefs?: ThemePrefs | null): string | null {
  const ct = prefs?.colorTheme ?? "indigo"
  if (ct.startsWith("custom")) {
    try {
      const j = JSON.parse(prefs?.customTheme ?? "") as { accent?: string }
      if (typeof j.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(j.accent)) return j.accent
    } catch { /* fall through to default accent */ }
    return null
  }
  const p = getPredefined(ct)
  if (!p) return null
  const { r, g, b } = oklchToRgb({ l: p.config.accentL ?? 0.56, c: p.config.accentC ?? 0.16, h: p.config.hue })
  return `#${hx(r)}${hx(g)}${hx(b)}`
}

export function resolveEmailThemeFor(prefs?: ThemePrefs | null): EmailTheme {
  const base = resolveTheme(prefs?.theme === "dark" ? "dark" : "light") // system → light
  const accent = accentHex(prefs)
  return accent ? { ...base, accent, band: accent } : base
}
