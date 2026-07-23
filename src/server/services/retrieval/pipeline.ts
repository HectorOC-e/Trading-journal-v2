// ─────────────────────────────────────────────────────────────────────────────
// Único camino de recuperación semántica. Resuelve el modelo, embebe, repara lo
// que falte (acotado), consulta cada corpus por su adaptador y conforma el
// resultado. Ningún estado se colapsa: cada corpus reporta el suyo (spec §6).
// ─────────────────────────────────────────────────────────────────────────────
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { resolveEmbeddingCall } from "@/lib/ai/resolve-provider"
import { embedText } from "@/lib/ai/embeddings"
import { logger } from "@/lib/logger"
import { classify } from "./classify"
import { dedupeCitations, orderByHits } from "./shape"
import { CORPORA, getAdapter } from "./registry"
import {
  CORPUS_KEYS, DEFAULT_LIMIT, MAX_LIMIT, REPAIR_BATCH,
  type Citation, type CorpusKey, type CorpusOutcome, type IndexStatus, type SearchResult,
} from "./types"

const toVec = (v: number[]): string => `[${v.join(",")}]`
const clamp = (n: number | undefined, def: number, max: number) =>
  Math.min(max, Math.max(1, Number(n) || def))

export interface SearchInput { query: string; corpus?: CorpusKey; limit?: number }

export async function search(
  prisma: PrismaClient, userId: string, input: SearchInput,
): Promise<SearchResult> {
  const keys: CorpusKey[] = input.corpus ? [input.corpus] : [...CORPUS_KEYS]
  const limit = clamp(input.limit, DEFAULT_LIMIT, MAX_LIMIT)

  const emb = await resolveEmbeddingCall(prisma, userId)
  if (emb.source === "none") {
    return { citations: [], outcomes: keys.map(c => ({ corpus: c, state: "NO_KEY" as const, remaining: 0 })) }
  }

  const vector = await embedText(input.query, { model: emb.model, apiKey: emb.apiKey })
  if (!vector) {
    return { citations: [], outcomes: keys.map(c => ({ corpus: c, state: "EMBED_FAILED" as const, remaining: 0 })) }
  }
  const vec = toVec(vector)

  const citations: Citation[] = []
  const outcomes: CorpusOutcome[] = []

  for (const key of keys) {
    const adapter = getAdapter(key)
    // Auto-reparación acotada ANTES de buscar: la feature no puede quedarse muda.
    const remaining = await repairCorpus(prisma, userId, key, emb.model, emb.apiKey)
    const counts = await adapter.counts(prisma, userId)
    const hits = counts.embedded > 0 ? await adapter.knn(prisma, userId, vec, limit) : []
    const rows = hits.length ? await adapter.hydrate(prisma, userId, hits.map(h => h.id)) : []
    citations.push(...orderByHits(hits, rows, adapter.rowId, adapter.toCitation))
    outcomes.push({
      corpus: key,
      state: classify({
        hasKey: true, embedOk: true,
        withText: counts.withText, embedded: counts.embedded, hits: hits.length,
      }),
      remaining,
    })
  }

  return {
    citations: dedupeCitations(citations).sort((a, b) => b.similarity - a.similarity).slice(0, limit),
    outcomes,
  }
}

/**
 * Embebe hasta REPAIR_BATCH filas pendientes. Devuelve cuántas SIGUEN pendientes
 * tras el intento: ese número viaja al llamante como `remaining` para que la tool
 * pueda decir "busqué, pero N no están indexadas". Sin eso, una reparación
 * acotada reintroduce la misma mentira a menor escala (spec §7).
 *
 * Concurrencia: dos búsquedas simultáneas pueden embeber la misma fila dos veces.
 * `pending` filtra IS NULL y `writeVector` es idempotente, así que el peor caso es
 * gasto duplicado, no corrupción. Asumido a propósito, sin lock.
 */
async function repairCorpus(
  prisma: PrismaClient, userId: string, key: CorpusKey, model: string, apiKey: string,
): Promise<number> {
  const adapter = getAdapter(key)
  try {
    const pending = await adapter.pending(prisma, userId, REPAIR_BATCH)
    for (const row of pending) {
      const v = await embedText(row.text, { model, apiKey })
      if (!v) continue
      await adapter.writeVector(prisma, row.id, toVec(v))
    }
    const after = await adapter.counts(prisma, userId)
    return Math.max(0, after.withText - after.embedded)
  } catch (err) {
    // Se reporta, NO se traga. Es la lección de #160 y del `catch {}` mudo de
    // embedding-service.ts:25 — la búsqueda sigue sobre lo que haya.
    logger.warn("retrieval: fallo la auto-reparacion", { corpus: key, err: String(err) })
    return 0
  }
}

export async function reindex(
  prisma: PrismaClient, userId: string, input?: { corpus?: CorpusKey; limit?: number },
): Promise<{ embedded: number; failed: number; remaining: number }> {
  const keys: CorpusKey[] = input?.corpus ? [input.corpus] : [...CORPUS_KEYS]
  const limit = clamp(input?.limit, REPAIR_BATCH, 500)
  const emb = await resolveEmbeddingCall(prisma, userId)
  if (emb.source === "none") return { embedded: 0, failed: 0, remaining: 0 }

  let embedded = 0, failed = 0, remaining = 0
  for (const key of keys) {
    const adapter = getAdapter(key)
    const pending = await adapter.pending(prisma, userId, limit)
    for (const row of pending) {
      const v = await embedText(row.text, { model: emb.model, apiKey: emb.apiKey })
      if (!v) { failed++; continue }
      await adapter.writeVector(prisma, row.id, toVec(v))
      embedded++
    }
    const after = await adapter.counts(prisma, userId)
    remaining += Math.max(0, after.withText - after.embedded)
  }
  return { embedded, failed, remaining }
}

export async function indexStatus(prisma: PrismaClient, userId: string): Promise<IndexStatus[]> {
  const out: IndexStatus[] = []
  for (const key of CORPUS_KEYS) {
    const counts = await CORPORA[key].counts(prisma, userId)
    out.push({ corpus: key, ...counts })
  }
  return out
}

/** Fire-and-forget tras escribir texto. Nunca lanza; loguea en vez de tragar. */
export function scheduleEmbedding(
  prisma: PrismaClient, userId: string, corpus: CorpusKey, id: string, text: string,
): void {
  if (!text.trim()) return
  void (async () => {
    try {
      const emb = await resolveEmbeddingCall(prisma, userId)
      if (emb.source === "none") return
      const v = await embedText(text, { model: emb.model, apiKey: emb.apiKey })
      if (!v) { logger.warn("retrieval: embedText devolvio null", { corpus, id }); return }
      await getAdapter(corpus).writeVector(prisma, id, toVec(v))
    } catch (err) {
      logger.warn("retrieval: scheduleEmbedding fallo", { corpus, id, err: String(err) })
    }
  })()
}
