// Parsing / validation for stored palette configs and theme selections.

import { PREDEFINED_IDS } from "./palettes.config"
import { isCustomSelection, type PaletteConfig } from "./types"

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined

/** Validate + normalize a PaletteConfig coming from the DB / network (untrusted). */
export function parsePaletteConfig(input: unknown): PaletteConfig | null {
  if (!input || typeof input !== "object") return null
  const o = input as Record<string, unknown>
  const hue = num(o.hue)
  if (hue === undefined) return null
  const config: PaletteConfig = { hue: ((hue % 360) + 360) % 360 }
  const chroma = num(o.chroma);   if (chroma !== undefined) config.chroma = Math.max(0, Math.min(0.05, chroma))
  const accentL = num(o.accentL); if (accentL !== undefined) config.accentL = Math.max(0.2, Math.min(0.85, accentL))
  const accentC = num(o.accentC); if (accentC !== undefined) config.accentC = Math.max(0, Math.min(0.3, accentC))
  if (o.overrides && typeof o.overrides === "object") {
    config.overrides = o.overrides as PaletteConfig["overrides"]
  }
  return config
}

/** Parse a JSON string into a PaletteConfig (or null). */
export function parsePaletteConfigJson(json: string | null | undefined): PaletteConfig | null {
  if (!json) return null
  try { return parsePaletteConfig(JSON.parse(json)) } catch { return null }
}

/** Is the stored selection a known predefined id or a custom selection? */
export function isValidSelection(sel: string | null | undefined): boolean {
  if (!sel) return false
  return PREDEFINED_IDS.has(sel) || isCustomSelection(sel)
}
