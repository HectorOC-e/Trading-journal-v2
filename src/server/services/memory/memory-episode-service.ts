// ─────────────────────────────────────────────────────────────────────────────
// Episodic memory service (E13, v3.2 §6). Append-only producer + hybrid recall
// (kNN over the pgvector embedding × decayed salience). Embedding is best-effort
// (no-op without an AI key); recall falls back to most-salient-recent without one.
// Episodes are EVIDENCE — never edited (distinct from semantic/identity memory).
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { embedText } from "@/lib/ai/embeddings"
import { resolveEmbeddingCall } from "@/lib/ai/resolve-provider"
import { initialSalience, decayedSalience, recallScore, type MemoryEventType } from "@/domains/cognitive/memory/salience"

const DAY_MS = 86_400_000

export interface RecordEpisodeInput {
  eventType: MemoryEventType
  content: string
  sourceId?: string | null
  occurredAt?: Date
}

/** Append a salient episode (+ best-effort embedding). Never throws. */
export async function recordEpisode(prisma: PrismaClient, userId: string, input: RecordEpisodeInput): Promise<string | null> {
  try {
    const ep = await prisma.memoryEpisode.create({
      data: {
        userId,
        eventType: input.eventType,
        content: input.content.trim().slice(0, 1000),
        salience: initialSalience(input.eventType),
        sourceId: input.sourceId ?? null,
        occurredAt: input.occurredAt ?? new Date(),
      },
      select: { id: true },
    })
    try {
      const emb = await resolveEmbeddingCall(prisma, userId)
      if (emb.source !== "none") {
        const vector = await embedText(input.content, { model: emb.model, apiKey: emb.apiKey })
        if (vector) {
          await prisma.$executeRaw`UPDATE memory_episodes SET embedding = ${`[${vector.join(",")}]`}::vector WHERE id = ${ep.id}::uuid`
        }
      }
    } catch { /* embedding is best-effort */ }
    return ep.id
  } catch {
    return null
  }
}

export interface RecalledEpisode {
  id: string
  content: string
  eventType: string
  salience: number
  occurredAt: string
  similarity: number
  score: number
}

type EpisodeRow = { id: string; content: string; eventType: string; salience: number; occurredAt: Date }

function rankBySalience(rows: EpisodeRow[], limit: number): RecalledEpisode[] {
  const now = Date.now()
  return rows
    .map((r) => {
      const ageDays = (now - new Date(r.occurredAt).getTime()) / DAY_MS
      const sal = decayedSalience(r.salience, ageDays)
      return { id: r.id, content: r.content, eventType: r.eventType, salience: sal, occurredAt: new Date(r.occurredAt).toISOString(), similarity: 0, score: sal }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Top salient-recent episodes (no query) — for the coach context block (D10). */
export async function getSalientEpisodes(prisma: PrismaClient, userId: string, limit = 4): Promise<RecalledEpisode[]> {
  const rows = await prisma.memoryEpisode.findMany({
    where: { userId },
    orderBy: { occurredAt: "desc" },
    take: 40,
    select: { id: true, content: true, eventType: true, salience: true, occurredAt: true },
  })
  return rankBySalience(rows, limit)
}

/** Hybrid recall: kNN by embedding × decayed salience. Falls back to most-salient
 *  recent episodes when there is no embedding/key. */
export async function recallEpisodes(prisma: PrismaClient, userId: string, queryText: string, limit = 5): Promise<RecalledEpisode[]> {
  const emb = await resolveEmbeddingCall(prisma, userId).catch(() => ({ source: "none" as const, model: "", apiKey: "" }))
  const vector = emb.source !== "none" ? await embedText(queryText, { model: emb.model, apiKey: emb.apiKey }).catch(() => null) : null

  if (!vector) {
    const rows = await prisma.memoryEpisode.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      take: 40,
      select: { id: true, content: true, eventType: true, salience: true, occurredAt: true },
    })
    return rankBySalience(rows, limit)
  }

  const vec = `[${vector.join(",")}]`
  const candidates = await prisma.$queryRaw<{ id: string; content: string; eventType: string; salience: number; occurredAt: Date; similarity: number }[]>`
    SELECT id, content, event_type AS "eventType", salience, occurred_at AS "occurredAt",
      (1 - (embedding <=> ${vec}::vector)) AS similarity
    FROM memory_episodes
    WHERE user_id = ${userId}::uuid AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vec}::vector
    LIMIT 40`

  const now = Date.now()
  return candidates
    .map((c) => {
      const ageDays = (now - new Date(c.occurredAt).getTime()) / DAY_MS
      const sal = decayedSalience(c.salience, ageDays)
      return { id: c.id, content: c.content, eventType: c.eventType, salience: sal, occurredAt: new Date(c.occurredAt).toISOString(), similarity: c.similarity, score: recallScore({ salience: sal, similarity: c.similarity }) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
