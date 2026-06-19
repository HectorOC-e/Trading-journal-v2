// ─────────────────────────────────────────────────────────────────────────────
// Runtime application of a color theme.
//
// Predefined palettes are served as static CSS ([data-theme="x"]); we just flip
// the attribute. Custom palettes are derived on the fly and injected as inline
// CSS variables for the active mode. We also cache the computed var strings in
// localStorage so the <head> bootstrap script can re-apply them before paint
// (no flash). See spec §"Capa de aplicación".
// ─────────────────────────────────────────────────────────────────────────────

import { derivePalette } from "./engine"
import { DEFAULT_PALETTE_ID } from "./palettes.config"
import {
  TOKEN_CSS_VAR,
  customPaletteId,
  isCustomSelection,
  type ColorMode,
  type CustomPalette,
  type TokenSet,
} from "./types"

export const LS_COLOR_THEME  = "tj-color-theme"
export const LS_CUSTOM_LIGHT = "tj-custom-vars-light"
export const LS_CUSTOM_DARK  = "tj-custom-vars-dark"
// Legacy keys cleared on apply (old accent-only system).
const LEGACY_KEYS = ["tj-custom-theme"]
const LEGACY_VARS = ["--accent", "--accent-h", "--accent-soft", "--accent-contrast"]

/** Serialize a token set to an inline cssText fragment. */
export function tokensToCssText(tokens: TokenSet): string {
  return (Object.keys(TOKEN_CSS_VAR) as (keyof TokenSet)[])
    .map(k => `${TOKEN_CSS_VAR[k]}:${tokens[k]}`)
    .join(";")
}

function clearInlineTokens(root: HTMLElement) {
  for (const cssVar of Object.values(TOKEN_CSS_VAR)) root.style.removeProperty(cssVar)
  for (const cssVar of LEGACY_VARS) root.style.removeProperty(cssVar)
}

function injectInline(root: HTMLElement, tokens: TokenSet) {
  for (const k of Object.keys(TOKEN_CSS_VAR) as (keyof TokenSet)[]) {
    root.style.setProperty(TOKEN_CSS_VAR[k], tokens[k])
  }
}

/**
 * Apply the active color-theme selection.
 * @param selection      predefined id ("indigo"…) or "custom:<paletteId>"
 * @param customPalettes the user's library (to resolve a custom selection)
 * @param mode           the resolved light/dark mode
 */
export function applyColorTheme(
  selection: string,
  customPalettes: CustomPalette[],
  mode: ColorMode,
): void {
  if (typeof document === "undefined") return
  const root = document.documentElement

  clearInlineTokens(root)
  for (const k of LEGACY_KEYS) { try { localStorage.removeItem(k) } catch {} }

  if (isCustomSelection(selection)) {
    const id = customPaletteId(selection)
    const palette = customPalettes.find(p => p.id === id)
    if (palette) {
      root.setAttribute("data-theme", "custom")
      const light = derivePalette(palette.config, "light")
      const dark  = derivePalette(palette.config, "dark")
      try {
        localStorage.setItem(LS_CUSTOM_LIGHT, tokensToCssText(light))
        localStorage.setItem(LS_CUSTOM_DARK, tokensToCssText(dark))
        localStorage.setItem(LS_COLOR_THEME, selection)
      } catch {}
      injectInline(root, mode === "dark" ? dark : light)
      return
    }
    // Unknown custom id → fall back to default.
  }

  // Predefined.
  try {
    localStorage.removeItem(LS_CUSTOM_LIGHT)
    localStorage.removeItem(LS_CUSTOM_DARK)
    localStorage.setItem(LS_COLOR_THEME, selection)
  } catch {}

  if (selection === DEFAULT_PALETTE_ID || isCustomSelection(selection)) {
    root.removeAttribute("data-theme")
  } else {
    root.setAttribute("data-theme", selection)
  }
}

/** Re-inject the active custom palette's inline vars for a (new) mode. */
export function reapplyCustomForMode(customPalettes: CustomPalette[], selection: string, mode: ColorMode): void {
  if (typeof document === "undefined" || !isCustomSelection(selection)) return
  const id = customPaletteId(selection)
  const palette = customPalettes.find(p => p.id === id)
  if (!palette) return
  const tokens = derivePalette(palette.config, mode)
  injectInline(document.documentElement, tokens)
  try {
    localStorage.setItem(mode === "dark" ? LS_CUSTOM_DARK : LS_CUSTOM_LIGHT, tokensToCssText(tokens))
  } catch {}
}
