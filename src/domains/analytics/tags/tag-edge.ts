// ─────────────────────────────────────────────────────────────────────────────
// Tag analytics (#20, ANALYTICS_V3 §10) — absorbs part of the Etiquetas screen:
// P&L / avg R / WR per tag, highlighting POISON tags ("dudé" = −0.4R) and GOLD
// tags ("A+" = +1.8R) by statistical significance (Welch one-sample vs 0), not by
// a raw average that noise could fake. Each row is meant to become an action
// (commitment/rule) in the surface layer. Pure, no I/O.
// ─────────────────────────────────────────────────────────────────────────────

import { oneSampleTTest } from "@/domains/analytics/institutional/stats/welch"

export interface TagTrade {
  tags: string[]
  rMultiple: number | null
  pnl: number
}

export type TagClass = "gold" | "poison" | "neutral"

export interface TagEdge {
  tag: string
  trades: number
  winRate: number
  avgR: number | null
  netPnl: number
  classification: TagClass
  pValue: number | null
}

export interface TagEdgeResult {
  byTag: TagEdge[]
}

const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length

export function computeTagEdges(
  trades: TagTrade[],
  opts: { minSample?: number; alpha?: number } = {},
): TagEdgeResult {
  const minSample = opts.minSample ?? 8
  const alpha = opts.alpha ?? 0.05

  const groups = new Map<string, TagTrade[]>()
  for (const t of trades) {
    for (const tag of t.tags) {
      const g = groups.get(tag) ?? []
      g.push(t)
      groups.set(tag, g)
    }
  }

  const byTag: TagEdge[] = [...groups.entries()].map(([tag, ts]) => {
    const wins = ts.filter((t) => t.pnl > 0).length
    const rs = ts.filter((t) => t.rMultiple != null).map((t) => t.rMultiple!)
    const netPnl = ts.reduce((s, t) => s + t.pnl, 0)

    let classification: TagClass = "neutral"
    let pValue: number | null = null
    if (ts.length >= minSample && rs.length >= 2) {
      const test = oneSampleTTest(rs, 0)
      if (test) {
        pValue = test.pValue
        if (test.pValue < alpha) classification = test.t > 0 ? "gold" : "poison"
      }
    }

    return {
      tag,
      trades: ts.length,
      winRate: ts.length > 0 ? (wins / ts.length) * 100 : 0,
      avgR: rs.length > 0 ? mean(rs) : null,
      netPnl,
      classification,
      pValue,
    }
  })

  // Best avg R first — gold tags surface on top, poison at the bottom.
  byTag.sort((a, b) => (b.avgR ?? -Infinity) - (a.avgR ?? -Infinity))
  return { byTag }
}
