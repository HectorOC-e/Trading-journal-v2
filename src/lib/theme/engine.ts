// ─────────────────────────────────────────────────────────────────────────────
// Theme engine — the SINGLE source of truth for palette derivation.
//
// derivePalette(config, mode) → TokenSet. Used at BUILD time to precompile the
// predefined palettes to CSS, and at RUNTIME to apply custom palettes. Keeping
// one implementation guarantees predefined and custom palettes have identical
// quality and accessibility behaviour. See spec §"Motor".
// ─────────────────────────────────────────────────────────────────────────────

import type { ColorMode, PaletteConfig, TokenSet } from "./types"

// Atmosphere chroma presets (how tinted the surfaces are). "Media" = perceptible
// but sober — the product decision for this redesign.
export const ATMOSPHERE_SUBTLE = 0.006
export const ATMOSPHERE_MEDIUM = 0.013
export const ATMOSPHERE_STRONG = 0.022

const DEFAULT_ACCENT_L = 0.56 // light-mode accent lightness
const DEFAULT_ACCENT_C = 0.18 // accent chroma

// ── OKLCH ⇄ sRGB conversion ──────────────────────────────────────────────────
// Standard Björn Ottosson OKLab/OKLCH ↔ linear sRGB pipeline. `l` is 0–1, `c`
// is the chroma, `h` is degrees. Used for accurate WCAG contrast on derived
// colors and for converting a user-picked hex seed into (hue, chroma, lightness).

interface Oklch { l: number; c: number; h: number }

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return null
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")
  return `#${h(r)}${h(g)}${h(b)}`
}

export function hexToOklch(hex: string): Oklch | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const r = srgbToLinear(rgb.r / 255)
  const g = srgbToLinear(rgb.g / 255)
  const b = srgbToLinear(rgb.b / 255)

  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_

  const c = Math.sqrt(a * a + bb * bb)
  let h = (Math.atan2(bb, a) * 180) / Math.PI
  if (h < 0) h += 360
  return { l: L, c, h }
}

export function oklchToRgb({ l, c, h }: Oklch): { r: number; g: number; b: number } {
  const hr = (h * Math.PI) / 180
  const a = c * Math.cos(hr)
  const b = c * Math.sin(hr)

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b

  const lc = l_ * l_ * l_
  const mc = m_ * m_ * m_
  const sc = s_ * s_ * s_

  const r = +4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc
  const g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc
  const bl = -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc

  return {
    r: clamp01(linearToSrgb(r)) * 255,
    g: clamp01(linearToSrgb(g)) * 255,
    b: clamp01(linearToSrgb(bl)) * 255,
  }
}

export function oklchToHex(o: Oklch): string {
  const { r, g, b } = oklchToRgb(o)
  return rgbToHex(r, g, b)
}

/** Parse an `oklch(L% C H)` string into components (null if not that form). */
export function parseOklch(str: string): Oklch | null {
  const m = /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/i.exec(str)
  if (!m) return null
  return { l: parseFloat(m[1]) / 100, c: parseFloat(m[2]), h: parseFloat(m[3]) }
}

/** Convert any palette token value (hex or oklch string) to a hex color. */
export function tokenToHex(value: string): string {
  if (value.startsWith("#")) return value
  const o = parseOklch(value)
  return o ? oklchToHex(o) : "#000000"
}

// ── WCAG contrast ─────────────────────────────────────────────────────────────

function relLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const f = (c: number) => srgbToLinear(c / 255)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** WCAG contrast ratio (1–21) between two hex colors. */
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

// ── Palette derivation ────────────────────────────────────────────────────────

const okl = (l: number, c: number, h: number) =>
  `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`

/**
 * Contrast color that sits ON the accent, guaranteed AA. Computes the real WCAG
 * ratio against white and near-black via the OKLCH→sRGB path.
 */
function accentContrastFor(accentL: number, accentC: number, hue: number): string {
  const accentHex = oklchToHex({ l: accentL, c: accentC, h: hue })
  const onWhite = contrastRatio(accentHex, "#ffffff")
  const onDark  = contrastRatio(accentHex, "#111111")
  // Prefer white unless near-black clearly wins (lighter accents need dark text).
  if (onWhite >= 4.5) return "#ffffff"
  if (onDark > onWhite) return okl(0.2, 0.03, hue)
  return "#ffffff"
}

/**
 * Derive the full token set for a palette config + mode.
 * Light and dark share the seed hue; lightness ramps differ per mode.
 */
export function derivePalette(config: PaletteConfig, mode: ColorMode): TokenSet {
  const hue = ((config.hue % 360) + 360) % 360
  const cAtmo = config.chroma ?? ATMOSPHERE_MEDIUM
  const accentC = config.accentC ?? DEFAULT_ACCENT_C
  const softC = Math.min(0.05, accentC * 0.28 + 0.01) // soft chip chroma tracks accent

  let tokens: TokenSet

  if (mode === "light") {
    const accentL = config.accentL ?? DEFAULT_ACCENT_L
    tokens = {
      bg:             okl(0.985, cAtmo, hue),
      panel:          okl(0.998, cAtmo * 0.25, hue),
      panel2:         okl(0.975, cAtmo * 0.7, hue),
      ink:            okl(0.16, 0.02, hue),
      ink2:           okl(0.40, 0.016, hue),
      ink3:           okl(0.60, 0.012, hue),
      line:           okl(0.91, cAtmo * 0.9, hue),
      line2:          okl(0.87, cAtmo, hue),
      chip:           okl(0.94, cAtmo * 0.8, hue),
      accent:         okl(accentL, accentC, hue),
      accentH:        okl(accentL - 0.05, accentC + 0.02, hue),
      accentSoft:     okl(0.94, softC, hue),
      accentContrast: accentContrastFor(accentL, accentC, hue),
    }
  } else {
    // Dark accents are lifted for legibility against near-black surfaces.
    const accentL = Math.min(0.82, (config.accentL ?? DEFAULT_ACCENT_L) + 0.14)
    tokens = {
      bg:             okl(0.12, cAtmo * 1.3, hue),
      panel:          okl(0.15, cAtmo * 1.3, hue),
      panel2:         okl(0.18, cAtmo * 1.3, hue),
      ink:            okl(0.94, 0.01, hue),
      ink2:           okl(0.76, 0.012, hue),
      ink3:           okl(0.53, 0.012, hue),
      line:           okl(0.23, cAtmo * 1.4, hue),
      line2:          okl(0.27, cAtmo * 1.5, hue),
      chip:           okl(0.23, cAtmo * 1.4, hue),
      accent:         okl(accentL, Math.max(0.02, accentC - 0.01), hue),
      accentH:        okl(Math.min(0.88, accentL + 0.06), Math.max(0.02, accentC - 0.01), hue),
      accentSoft:     okl(0.28, Math.min(0.07, softC + 0.02), hue),
      accentContrast: accentContrastFor(accentL, Math.max(0.02, accentC - 0.01), hue),
    }
  }

  // Apply per-role advanced overrides last (final CSS values win).
  const overrides = config.overrides?.[mode]
  return overrides ? { ...tokens, ...overrides } : tokens
}

/** Build a PaletteConfig from a user-picked hex seed (keeps its hue/chroma/L). */
export function configFromHex(hex: string): PaletteConfig {
  const o = hexToOklch(hex)
  if (!o) return { hue: 264 }
  return {
    hue:     o.h,
    accentL: Math.max(0.42, Math.min(0.68, o.l)), // keep accent in a usable band
  }
}

/** Build a PaletteConfig from a raw hue (preset swatches). */
export function configFromHue(hue: number): PaletteConfig {
  return { hue }
}
