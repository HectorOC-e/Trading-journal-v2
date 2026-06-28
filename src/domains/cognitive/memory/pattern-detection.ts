// ─────────────────────────────────────────────────────────────────────────────
// Semantic memory derivation (E14, v3.2 §6). The Memory Agent's DETERMINISTIC
// half (P6 / FREEZE-D9): a semantic pattern is generalized from EPISODES and only
// CONFIRMED when enough episodes support it — never asserted by the LLM. Episodic
// (E13) → semantic (E14) with supportEpisodeIds. Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

export interface EpisodeForPattern {
  id: string
  eventType: string
}

export type PatternStatus = "candidate" | "confirmed"

export interface DetectedPattern {
  key: string
  text: string
  status: PatternStatus
  supportEpisodeIds: string[]
  confidence: number
}

const DEFAULT_MIN_SUPPORT = 3

// Human pattern text per recurring event type. "manual" (user notes) is excluded —
// it is not a behavioral pattern to generalize.
const PATTERN_TEXT: Record<string, string> = {
  intervention: "Patrón recurrente: el coach ha tenido que intervenir en el momento del error",
  commitment_broken: "Patrón recurrente: rompes compromisos que te marcaste",
  commitment_kept: "Patrón positivo: cumples los compromisos que te marcas",
  checkin_red: "Patrón recurrente: llegas a la sesión en mal estado (check-in rojo)",
  trade_emotional: "Patrón recurrente: operas en estado emocional",
  streak: "Patrón recurrente: rachas perdedoras",
}

export function detectPatterns(episodes: EpisodeForPattern[], opts: { minSupport?: number } = {}): DetectedPattern[] {
  const minSupport = opts.minSupport ?? DEFAULT_MIN_SUPPORT
  const groups = new Map<string, string[]>()
  for (const e of episodes) {
    if (!(e.eventType in PATTERN_TEXT)) continue
    const g = groups.get(e.eventType) ?? []
    g.push(e.id)
    groups.set(e.eventType, g)
  }

  return [...groups.entries()].map(([key, ids]) => ({
    key,
    text: PATTERN_TEXT[key],
    status: ids.length >= minSupport ? ("confirmed" as const) : ("candidate" as const),
    supportEpisodeIds: ids,
    // Saturating confidence in support count — more episodes ⇒ more sure.
    confidence: ids.length / (ids.length + 2),
  }))
}
