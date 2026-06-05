// ─────────────────────────────────────────────────────────────────────────────
// Theme system (UI/UX redesign · Fase 1)
//
// A "color theme" changes ONLY the accent + atmosphere tokens.
// The reserved domain colors (--win / --loss / --be) are NEVER touched here —
// green = profit, red = loss are functional semantics, constant across themes.
//
// 4 predefined themes + a fully custom palette (persisted as JSON).
// Shared by theme-provider.tsx (apply) and perfil/page.tsx (configure).
// ─────────────────────────────────────────────────────────────────────────────

export type ColorTheme = "indigo" | "violeta" | "turquesa" | "carmesi" | "custom"

export interface ThemeMeta {
  id:       ColorTheme
  label:    string
  /** Swatch shown in the picker (representative accent). */
  swatch:   string
  /** Representative surface for the preview chip. */
  surface:  string
  blurb:    string
}

export const PREDEFINED_THEMES: ThemeMeta[] = [
  { id: "indigo",   label: "Indigo",   swatch: "oklch(56% 0.18 264)", surface: "oklch(96% 0.01 264)", blurb: "Confianza y lógica · por defecto" },
  { id: "violeta",  label: "Violeta",  swatch: "oklch(52% 0.15 295)", surface: "oklch(96% 0.01 295)", blurb: "Premium y creativo" },
  { id: "turquesa", label: "Turquesa", swatch: "oklch(58% 0.12 215)", surface: "oklch(96% 0.01 215)", blurb: "Calma y tecnología" },
  { id: "carmesi",  label: "Carmesí",  swatch: "oklch(64% 0.13 75)",  surface: "oklch(96% 0.01 25)",  blurb: "Atmósfera intensa · accent dorado" },
]

// ── Custom theme ──────────────────────────────────────────────────────────────
// Multi-role palette the user can tune from Perfil → Apariencia.
// Stored as JSON in user_preferences.custom_theme.
export interface CustomTheme {
  /** Primary / accent (actions). */
  accent:        string
  /** Hover state for accent. */
  accentH:       string
  /** Soft accent background (chips, active nav). */
  accentSoft:    string
  /** Text/icon color that sits on accent. */
  accentContrast: string
}

export const DEFAULT_CUSTOM: CustomTheme = {
  accent:         "oklch(56% 0.18 264)",
  accentH:        "oklch(51% 0.20 264)",
  accentSoft:     "oklch(94% 0.04 264)",
  accentContrast: "#ffffff",
}

/** Build a CustomTheme from a single OKLCH hue (quick custom). */
export function customFromHue(hue: number): CustomTheme {
  return {
    accent:         `oklch(56% 0.18 ${hue})`,
    accentH:        `oklch(51% 0.20 ${hue})`,
    accentSoft:     `oklch(94% 0.05 ${hue})`,
    accentContrast: "#ffffff",
  }
}

// ── Color math (WCAG) ─────────────────────────────────────────────────────────
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return null
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")
  return `#${h(r)}${h(g)}${h(b)}`
}

function relLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const f = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = hexToRgb(hexA), b = hexToRgb(hexB)
  if (!a || !b) return 1
  const la = relLuminance(a), lb = relLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Pick #fff or #111 — whichever has higher contrast on `hex`. */
export function bestContrastOn(hex: string): string {
  return contrastRatio(hex, "#ffffff") >= contrastRatio(hex, "#111111") ? "#ffffff" : "#111111"
}

function mix(hex: string, withHex: string, weight: number): string {
  const a = hexToRgb(hex), b = hexToRgb(withHex)
  if (!a || !b) return hex
  return rgbToHex(
    a.r + (b.r - a.r) * weight,
    a.g + (b.g - a.g) * weight,
    a.b + (b.b - a.b) * weight,
  )
}

/**
 * Build a full CustomTheme from a single primary hex.
 * Derives hover (darker), soft (translucent tint) and an AA-safe contrast color.
 */
export function customFromHex(hex: string): CustomTheme {
  return {
    accent:         hex,
    accentH:        mix(hex, "#000000", 0.14),
    accentSoft:     hexToRgb(hex) ? `rgba(${hexToRgb(hex)!.r}, ${hexToRgb(hex)!.g}, ${hexToRgb(hex)!.b}, 0.16)` : hex,
    accentContrast: bestContrastOn(hex),
  }
}

const CUSTOM_VARS: Record<keyof CustomTheme, string> = {
  accent:         "--accent",
  accentH:        "--accent-h",
  accentSoft:     "--accent-soft",
  accentContrast: "--accent-contrast",
}

/**
 * Apply a color theme to <html>.
 * - predefined: sets data-theme (CSS handles the rest) and clears inline custom vars.
 * - custom:     sets data-theme="custom" and injects inline vars from the palette.
 */
export function applyColorTheme(theme: ColorTheme, custom?: CustomTheme | null) {
  if (typeof document === "undefined") return
  const root = document.documentElement

  // Clear previously injected inline custom vars first.
  for (const cssVar of Object.values(CUSTOM_VARS)) root.style.removeProperty(cssVar)

  if (theme === "custom" && custom) {
    root.setAttribute("data-theme", "custom")
    for (const [key, cssVar] of Object.entries(CUSTOM_VARS)) {
      const value = custom[key as keyof CustomTheme]
      if (value) root.style.setProperty(cssVar, value)
    }
    return
  }

  if (theme === "indigo") {
    root.removeAttribute("data-theme") // indigo = base tokens
  } else {
    root.setAttribute("data-theme", theme)
  }
}

export function parseCustomTheme(json: string | null | undefined): CustomTheme | null {
  if (!json) return null
  try {
    const parsed = JSON.parse(json) as Partial<CustomTheme>
    return { ...DEFAULT_CUSTOM, ...parsed }
  } catch {
    return null
  }
}
