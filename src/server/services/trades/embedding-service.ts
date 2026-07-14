// ─────────────────────────────────────────────────────────────────────────────
// Trade notes embedding service (TD-018) — pgvector I/O for semantic search.
// scheduleEmbedding is fire-and-forget (never throws); search/backfill are the
// T-VI-004 surfaces moved out of the trades router.
// ─────────────────────────────────────────────────────────────────────────────
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { embedText } from "@/lib/ai/embeddings"
import { resolveEmbeddingCall } from "@/lib/ai/resolve-provider"
import { serializeTrade } from "./serializers"

/** Fire-and-forget: embed trade notes and store vector. Errors are silent. */
export function scheduleEmbedding(prisma: PrismaClient, userId: string, tradeId: string, notes: string): void {
  if (!notes.trim()) return
  void (async () => {
    try {
      const emb = await resolveEmbeddingCall(prisma, userId)
      if (emb.source === "none") return
      const vector = await embedText(notes, { model: emb.model, apiKey: emb.apiKey })
      if (!vector) return
      await prisma.$executeRaw`
        UPDATE trades
        SET notes_embedding = ${`[${vector.join(",")}]`}::vector
        WHERE id = ${tradeId}::uuid
      `
    } catch {
      // best-effort, never throw
    }
  })()
}

/** T-VI-004: Semantic search over trade notes (pgvector cosine distance). */
export async function semanticSearch(prisma: PrismaClient, userId: string, input: { query: string; limit: number }) {
  const emb = await resolveEmbeddingCall(prisma, userId)
  if (emb.source === "none") {
    return { trades: [], similarity: [], error: "NO_EMBEDDING_KEY" as const }
  }
  const queryVector = await embedText(input.query, { model: emb.model, apiKey: emb.apiKey })
  if (!queryVector) {
    return { trades: [], similarity: [], error: "EMBED_FAILED" as const }
  }

  type SearchRow = { id: string; similarity: number }
  const rows = await prisma.$queryRaw<SearchRow[]>`
    SELECT id, (1 - (notes_embedding <=> ${`[${queryVector.join(",")}]`}::vector)) AS similarity
    FROM trades
    WHERE user_id = ${userId}::uuid
      AND notes_embedding IS NOT NULL
    ORDER BY notes_embedding <=> ${`[${queryVector.join(",")}]`}::vector
    LIMIT ${input.limit}
  `
  if (!rows.length) return { trades: [], similarity: [] }

  const tradeIds = rows.map(r => r.id)
  const found = await prisma.trade.findMany({
    where:   { id: { in: tradeIds }, userId },
    include: { account: true, setup: true, events: { orderBy: { timestamp: "asc" } } },
  })
  const ordered = tradeIds
    .map(id => found.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t)
  return {
    trades:     ordered.map(serializeTrade),
    similarity: rows.map(r => r.similarity),
  }
}

// Backfill: embed trade notes that were written before semantic search existed
// (or before a key was configured). Idempotent — only touches rows whose notes
// are non-empty and notes_embedding IS NULL. Call repeatedly until remaining=0.
export async function backfillEmbeddings(prisma: PrismaClient, userId: string, limit: number) {
  const emb = await resolveEmbeddingCall(prisma, userId)
  if (emb.source === "none") {
    return { embedded: 0, failed: 0, remaining: 0, error: "NO_EMBEDDING_KEY" as const }
  }
  const pending = await prisma.$queryRaw<{ id: string; notes: string }[]>`
    SELECT id, notes FROM trades
    WHERE user_id = ${userId}::uuid
      AND notes <> ''
      AND notes_embedding IS NULL
    ORDER BY date DESC
    LIMIT ${limit}
  `
  let embedded = 0, failed = 0
  for (const t of pending) {
    const vector = await embedText(t.notes, { model: emb.model, apiKey: emb.apiKey })
    if (!vector) { failed++; continue }
    await prisma.$executeRaw`
      UPDATE trades SET notes_embedding = ${`[${vector.join(",")}]`}::vector
      WHERE id = ${t.id}::uuid
    `
    embedded++
  }
  const remainingRows = await prisma.$queryRaw<{ remaining: number }[]>`
    SELECT COUNT(*)::int AS remaining FROM trades
    WHERE user_id = ${userId}::uuid AND notes <> '' AND notes_embedding IS NULL
  `
  return { embedded, failed, remaining: remainingRows[0]?.remaining ?? 0 }
}
