// ─────────────────────────────────────────────────────────────────────────────
// Errors → study cards (#42, SPRINT_PLAN S11). Turns RECURRING mistake tags into
// prioritized study-card candidates, each carrying the real cost of the error (R
// and P&L) so the most expensive recurring mistake is studied first. Pure, no
// I/O; the surface layer persists/offers the cards (and a rule/commitment).
// ─────────────────────────────────────────────────────────────────────────────

export interface ErrorTrade {
  tags: string[]
  rMultiple: number | null
  pnl: number
}

export interface ErrorCard {
  errorTag: string
  occurrences: number
  /** Sum of R across trades carrying the error tag (negative = costly). */
  costR: number
  costPnl: number
  avgR: number | null
  front: string
  back: string
}

export interface ErrorCardInput {
  trades: ErrorTrade[]
  /** Which tags count as errors (e.g. ["Off-plan","Impulsivo","dudé","Revanche"]). */
  errorTags: string[]
  /** Minimum occurrences to surface a card (default 3). */
  minOccurrences?: number
}

export function generateErrorCards(input: ErrorCardInput): ErrorCard[] {
  const minOccurrences = input.minOccurrences ?? 3
  const errorSet = new Set(input.errorTags)

  const groups = new Map<string, ErrorTrade[]>()
  for (const t of input.trades) {
    for (const tag of t.tags) {
      if (!errorSet.has(tag)) continue
      const g = groups.get(tag) ?? []
      g.push(t)
      groups.set(tag, g)
    }
  }

  const cards: ErrorCard[] = []
  for (const [errorTag, ts] of groups.entries()) {
    if (ts.length < minOccurrences) continue
    const rs = ts.map((t) => t.rMultiple).filter((r): r is number => r != null)
    const costR = rs.reduce((s, r) => s + r, 0)
    const costPnl = ts.reduce((s, t) => s + t.pnl, 0)
    cards.push({
      errorTag,
      occurrences: ts.length,
      costR,
      costPnl,
      avgR: rs.length > 0 ? costR / rs.length : null,
      front: `¿Qué patrón se repite cuando etiquetas "${errorTag}"?`,
      back: `${ts.length} trades con "${errorTag}" suman ${costR.toFixed(1)}R (${costPnl.toFixed(0)}). Define una regla o compromiso para evitar este error.`,
    })
  }

  // Most expensive mistake first (most negative cost in R).
  cards.sort((a, b) => a.costR - b.costR)
  return cards
}
