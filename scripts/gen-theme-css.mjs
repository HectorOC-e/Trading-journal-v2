// ─────────────────────────────────────────────────────────────────────────────
// Build-time generator: predefined palettes → static CSS.
//
// Mirrors the OKLCH derivation in src/lib/theme/engine.ts and the configs in
// src/lib/theme/palettes.config.ts. Run with:  node scripts/gen-theme-css.mjs
// Emits src/app/theme-palettes.generated.css (committed).
//
// Uses html[data-theme="…"] / html.dark[data-theme="…"] so the blocks win over
// :root / .dark by specificity regardless of @import order. Indigo = base
// :root/.dark (no block). Custom palettes are derived at runtime by engine.ts.
//
// ⚠ Keep this math in sync with engine.ts. If you change the engine, re-run this.
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const ATMOSPHERE_MEDIUM = 0.013
const ATMOSPHERE_SUBTLE = 0.006
const DEFAULT_ACCENT_C = 0.18

// Non-default palettes (indigo = base tokens, intentionally omitted).
const PALETTES = [
  { id: "violeta",   config: { hue: 300, chroma: ATMOSPHERE_MEDIUM, accentL: 0.53, accentC: 0.16 } },
  { id: "turquesa",  config: { hue: 200, chroma: ATMOSPHERE_MEDIUM, accentL: 0.60, accentC: 0.11 } },
  { id: "carmesi",   config: { hue: 80,  chroma: ATMOSPHERE_MEDIUM, accentL: 0.66, accentC: 0.13 } },
  { id: "oceano",    config: { hue: 245, chroma: ATMOSPHERE_MEDIUM, accentL: 0.55, accentC: 0.16 } },
  { id: "rosa",      config: { hue: 354, chroma: ATMOSPHERE_MEDIUM, accentL: 0.57, accentC: 0.17 } },
  { id: "grafito",   config: { hue: 264, chroma: ATMOSPHERE_SUBTLE, accentL: 0.40, accentC: 0.02 } },
  { id: "esmeralda", config: { hue: 160, chroma: ATMOSPHERE_MEDIUM, accentL: 0.58, accentC: 0.15 } },
]

// ── color math (mirror of engine.ts) ──
const clamp01 = n => Math.max(0, Math.min(1, n))
const srgbToLinear = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const linearToSrgb = c => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)

function oklchToRgb(l, c, h) {
  const hr = (h * Math.PI) / 180
  const a = c * Math.cos(hr), b = c * Math.sin(hr)
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b
  const lc = l_ ** 3, mc = m_ ** 3, sc = s_ ** 3
  const r = +4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc
  const g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc
  const bl = -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc
  return [clamp01(linearToSrgb(r)) * 255, clamp01(linearToSrgb(g)) * 255, clamp01(linearToSrgb(bl)) * 255]
}
const hexToRgb = hex => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null
}
const relLum = ([r, g, b]) => {
  const f = c => srgbToLinear(c / 255)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function contrastRatio(hexA, hexB) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB)
  if (!a || !b) return 1
  const la = relLum(a), lb = relLum(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}
const to2 = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")
const oklchToHex = (l, c, h) => { const [r, g, b] = oklchToRgb(l, c, h); return `#${to2(r)}${to2(g)}${to2(b)}` }
const okl = (l, c, h) => `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`

function accentContrastFor(l, c, h) {
  const hex = oklchToHex(l, c, h)
  const onWhite = contrastRatio(hex, "#ffffff"), onDark = contrastRatio(hex, "#111111")
  if (onWhite >= 4.5) return "#ffffff"
  if (onDark > onWhite) return okl(0.2, 0.03, h)
  return "#ffffff"
}

function derivePalette(config, mode) {
  const hue = ((config.hue % 360) + 360) % 360
  const cAtmo = config.chroma ?? ATMOSPHERE_MEDIUM
  const accentC = config.accentC ?? DEFAULT_ACCENT_C
  const softC = Math.min(0.05, accentC * 0.28 + 0.01)
  if (mode === "light") {
    const aL = config.accentL ?? 0.56
    return {
      "--bg": okl(0.985, cAtmo, hue), "--panel": okl(0.998, cAtmo * 0.25, hue), "--panel-2": okl(0.975, cAtmo * 0.7, hue),
      "--ink": okl(0.16, 0.02, hue), "--ink-2": okl(0.40, 0.016, hue), "--ink-3": okl(0.60, 0.012, hue),
      "--line": okl(0.91, cAtmo * 0.9, hue), "--line-2": okl(0.87, cAtmo, hue), "--chip": okl(0.94, cAtmo * 0.8, hue),
      "--accent": okl(aL, accentC, hue), "--accent-h": okl(aL - 0.05, accentC + 0.02, hue),
      "--accent-soft": okl(0.94, softC, hue), "--accent-contrast": accentContrastFor(aL, accentC, hue),
    }
  }
  const aL = Math.min(0.82, (config.accentL ?? 0.56) + 0.14)
  const aC = Math.max(0.02, accentC - 0.01)
  return {
    "--bg": okl(0.12, cAtmo * 1.3, hue), "--panel": okl(0.15, cAtmo * 1.3, hue), "--panel-2": okl(0.18, cAtmo * 1.3, hue),
    "--ink": okl(0.94, 0.01, hue), "--ink-2": okl(0.76, 0.012, hue), "--ink-3": okl(0.53, 0.012, hue),
    "--line": okl(0.23, cAtmo * 1.4, hue), "--line-2": okl(0.27, cAtmo * 1.5, hue), "--chip": okl(0.23, cAtmo * 1.4, hue),
    "--accent": okl(aL, aC, hue), "--accent-h": okl(Math.min(0.88, aL + 0.06), aC, hue),
    "--accent-soft": okl(0.28, Math.min(0.07, softC + 0.02), hue), "--accent-contrast": accentContrastFor(aL, aC, hue),
  }
}

const block = (selector, tokens) =>
  `${selector} {\n${Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`

let out = `/* AUTO-GENERATED by scripts/gen-theme-css.mjs — DO NOT EDIT BY HAND.
   Predefined full palettes (light + dark). Indigo = base :root/.dark.
   Selectors use html[data-theme] to win over :root by specificity. */\n\n`

for (const p of PALETTES) {
  out += block(`html[data-theme="${p.id}"]`, derivePalette(p.config, "light")) + "\n\n"
  out += block(`html.dark[data-theme="${p.id}"]`, derivePalette(p.config, "dark")) + "\n\n"
}

const target = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "app", "theme-palettes.generated.css")
writeFileSync(target, out.trimEnd() + "\n")
console.log(`Wrote ${target} (${PALETTES.length} palettes × 2 modes)`)
