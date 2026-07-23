import { SNIPPET_CHARS, type Citation, type Hit } from "./types"

/**
 * Mapea hits→citas conservando el orden del kNN.
 *
 * Clave: la similitud se toma de un Map por id, NUNCA de un array paralelo.
 * `embedding-service.ts:58-64` filtraba `trades` por las filas que hidrataron y
 * dejaba `similarity` sin filtrar, así que una fila que no hidratara desplazaba
 * todas las siguientes y cada trade recibía la similitud del vecino.
 */
export function orderByHits<Row>(
  hits: Hit[],
  rows: Row[],
  rowId: (r: Row) => string,
  toCitation: (r: Row, similarity: number) => Citation,
): Citation[] {
  const byId = new Map(rows.map(r => [rowId(r), r]))
  const out: Citation[] = []
  for (const hit of hits) {
    const row = byId.get(hit.id)
    if (!row) continue
    out.push(toCitation(row, roundSimilarity(hit.similarity)))
  }
  return out
}

export function truncate(text: string, max: number = SNIPPET_CHARS): string {
  const t = (text ?? "").trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

export function roundSimilarity(n: number): number {
  return parseFloat(Number(n).toFixed(3))
}

export function dedupeCitations(cs: Citation[]): Citation[] {
  const seen = new Set<string>()
  return cs.filter(c => {
    const key = `${c.corpus}:${c.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
