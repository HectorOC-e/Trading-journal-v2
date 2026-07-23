import { describe, it, expect } from "vitest"
import { orderByHits, truncate, roundSimilarity, dedupeCitations } from "@/server/services/retrieval/shape"
import type { Citation, Hit } from "@/server/services/retrieval/types"
import { SNIPPET_CHARS } from "@/server/services/retrieval/types"

type Row = { id: string; text: string }
const rowId = (r: Row) => r.id
const toCitation = (r: Row, sim: number): Citation => ({
  corpus: "trade_notes", id: r.id, label: r.id, sublabel: "", outcome: "",
  positive: null, snippet: r.text, similarity: sim, href: `/trades?trade=${r.id}`,
})

describe("shape — conformado del resultado", () => {
  it("respeta el orden del kNN, no el de la hidratacion", () => {
    const hits: Hit[] = [{ id: "c", similarity: 0.9 }, { id: "a", similarity: 0.8 }, { id: "b", similarity: 0.7 }]
    const rows: Row[] = [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }]
    expect(orderByHits(hits, rows, rowId, toCitation).map(c => c.id)).toEqual(["c", "a", "b"])
  })

  // ── Regresion del defecto de embedding-service.ts:58-64 ─────────────────────
  it("si una fila no hidrata, las demas CONSERVAN su similitud", () => {
    const hits: Hit[] = [{ id: "a", similarity: 0.9 }, { id: "b", similarity: 0.5 }, { id: "c", similarity: 0.1 }]
    const rows: Row[] = [{ id: "a", text: "A" }, { id: "c", text: "C" }] // "b" fue borrada
    const out = orderByHits(hits, rows, rowId, toCitation)
    expect(out.map(c => c.id)).toEqual(["a", "c"])
    // Con arrays paralelos, "c" habria heredado el 0.5 de "b".
    expect(out.map(c => c.similarity)).toEqual([0.9, 0.1])
  })

  it("trunca al limite unico y marca el corte", () => {
    const long = "x".repeat(SNIPPET_CHARS + 50)
    expect(truncate(long)).toHaveLength(SNIPPET_CHARS + 1) // + el caracter de elipsis
    expect(truncate(long).endsWith("…")).toBe(true)
    expect(truncate("corto")).toBe("corto")
  })

  it("redondea la similitud a 3 decimales", () => {
    expect(roundSimilarity(0.8765432)).toBe(0.877)
    expect(roundSimilarity(1)).toBe(1)
  })

  it("deduplica por (corpus, id) conservando la primera aparicion", () => {
    const a = toCitation({ id: "a", text: "A" }, 0.9)
    const dup = { ...a, similarity: 0.4 }
    const b = toCitation({ id: "b", text: "B" }, 0.8)
    const out = dedupeCitations([a, b, dup])
    expect(out.map(c => c.id)).toEqual(["a", "b"])
    expect(out[0].similarity).toBe(0.9)
  })

  it("el mismo id en corpus distintos NO se deduplica", () => {
    const t = toCitation({ id: "same", text: "T" }, 0.9)
    const l: Citation = { ...t, corpus: "learning_notes" }
    expect(dedupeCitations([t, l])).toHaveLength(2)
  })
})
