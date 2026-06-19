// ─────────────────────────────────────────────────────────────────────────────
// Predefined palettes (full-palette redesign).
//
// These are the SOURCE for both:
//   • the build-time CSS generator (scripts/gen-theme-css.ts), and
//   • the in-app palette picker swatches (derived live via derivePalette).
//
// Ids are stable: "indigo|violeta|turquesa|carmesi" are preserved from the old
// accent-only system so existing user selections keep working. Four are new.
// ─────────────────────────────────────────────────────────────────────────────

import { ATMOSPHERE_MEDIUM, ATMOSPHERE_SUBTLE } from "./engine"
import type { PaletteConfig } from "./types"

export interface PredefinedPalette {
  id:     string
  label:  string
  blurb:  string
  config: PaletteConfig
}

export const PREDEFINED_PALETTES: PredefinedPalette[] = [
  {
    id: "indigo", label: "Indigo", blurb: "Confianza y lógica · por defecto",
    config: { hue: 264, chroma: ATMOSPHERE_MEDIUM, accentL: 0.56, accentC: 0.18 },
  },
  {
    id: "violeta", label: "Violeta", blurb: "Premium y creativo",
    config: { hue: 300, chroma: ATMOSPHERE_MEDIUM, accentL: 0.53, accentC: 0.16 },
  },
  {
    id: "turquesa", label: "Turquesa", blurb: "Calma y tecnología",
    config: { hue: 200, chroma: ATMOSPHERE_MEDIUM, accentL: 0.60, accentC: 0.11 },
  },
  {
    id: "carmesi", label: "Dorado / Carmesí", blurb: "Atmósfera intensa · acento cálido",
    config: { hue: 80, chroma: ATMOSPHERE_MEDIUM, accentL: 0.66, accentC: 0.13 },
  },
  {
    id: "oceano", label: "Océano", blurb: "Azul clásico · sobrio",
    config: { hue: 245, chroma: ATMOSPHERE_MEDIUM, accentL: 0.55, accentC: 0.16 },
  },
  {
    id: "rosa", label: "Rosa", blurb: "Vibrante y cálido",
    config: { hue: 354, chroma: ATMOSPHERE_MEDIUM, accentL: 0.57, accentC: 0.17 },
  },
  {
    id: "grafito", label: "Grafito", blurb: "Neutro / minimalista · sin distracción",
    config: { hue: 264, chroma: ATMOSPHERE_SUBTLE, accentL: 0.40, accentC: 0.02 },
  },
  {
    id: "esmeralda", label: "Esmeralda", blurb: "Verde · ojo con el verde de profit",
    config: { hue: 160, chroma: ATMOSPHERE_MEDIUM, accentL: 0.58, accentC: 0.15 },
  },
]

/** Default palette id (= old behaviour, base :root tokens, no data-theme block). */
export const DEFAULT_PALETTE_ID = "indigo"

export const PREDEFINED_IDS = new Set(PREDEFINED_PALETTES.map(p => p.id))

export function getPredefined(id: string): PredefinedPalette | undefined {
  return PREDEFINED_PALETTES.find(p => p.id === id)
}
