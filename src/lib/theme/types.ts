// ─────────────────────────────────────────────────────────────────────────────
// Theme system · types (full-palette redesign)
//
// A "palette" now controls the full atmosphere + accent token set (not just the
// accent). The reserved domain colors (--win / --loss / --be) are NEVER part of
// a palette — green = profit, red = loss are functional semantics, constant.
//
// Single source of truth: derivePalette(config, mode) → TokenSet (see engine.ts).
// Predefined palettes are precompiled to CSS at build time; custom palettes run
// the same engine at runtime. See spec 2026-06-19-theme-palettes-design.md.
// ─────────────────────────────────────────────────────────────────────────────

export type ColorMode = "light" | "dark"

/** The 13 roles a palette controls. Keys map 1:1 to CSS custom properties. */
export interface TokenSet {
  bg:             string
  panel:          string
  panel2:         string
  ink:            string
  ink2:           string
  ink3:           string
  line:           string
  line2:          string
  chip:           string
  accent:         string
  accentH:        string
  accentSoft:     string
  accentContrast: string
}

/** CSS custom-property name for each token role. */
export const TOKEN_CSS_VAR: Record<keyof TokenSet, string> = {
  bg:             "--bg",
  panel:          "--panel",
  panel2:         "--panel-2",
  ink:            "--ink",
  ink2:           "--ink-2",
  ink3:           "--ink-3",
  line:           "--line",
  line2:          "--line-2",
  chip:           "--chip",
  accent:         "--accent",
  accentH:        "--accent-h",
  accentSoft:     "--accent-soft",
  accentContrast: "--accent-contrast",
}

/**
 * Minimal palette definition. The only required field is `hue` (the seed).
 * `chroma` controls atmosphere intensity; `accentL` the accent lightness.
 * `overrides` carries per-role fine-tuning from the creator's "advanced" panel
 * (final CSS values that replace the derived ones), per mode.
 */
export interface PaletteConfig {
  hue:      number                 // 0–360 OKLCH seed hue
  chroma?:  number                 // atmosphere chroma (default ATMOSPHERE_MEDIUM)
  accentL?: number                 // accent lightness 0–1 (light mode reference)
  accentC?: number                 // accent chroma (default DEFAULT_ACCENT_C; low = desaturated/slate)
  overrides?: {
    light?: Partial<TokenSet>
    dark?:  Partial<TokenSet>
  }
}

/** A saved custom palette (library entry). Mirrors the `custom_palette` row. */
export interface CustomPalette {
  id:       string
  name:     string
  config:   PaletteConfig
  position: number
}

/** Active color-theme selection: a predefined id, or `custom:<paletteId>`. */
export type ThemeSelection = string

export const CUSTOM_PREFIX = "custom:"

export function isCustomSelection(sel: string): boolean {
  return sel.startsWith(CUSTOM_PREFIX)
}

export function customPaletteId(sel: string): string | null {
  return isCustomSelection(sel) ? sel.slice(CUSTOM_PREFIX.length) : null
}

export function makeCustomSelection(id: string): ThemeSelection {
  return `${CUSTOM_PREFIX}${id}`
}
