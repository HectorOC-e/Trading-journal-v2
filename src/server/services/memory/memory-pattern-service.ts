// ─────────────────────────────────────────────────────────────────────────────
// Memory Agent (E14, v3.2 §6) — derives SEMANTIC patterns from EPISODES and
// confirms them deterministically (P6/D9: the data confirms, never the LLM). Runs
// daily in the recompute-insights cron. Patterns carry their support episode ids.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { detectPatterns } from "@/domains/cognitive/memory/pattern-detection"

/** Re-derive + upsert this user's semantic patterns from their episodes. */
export async function recomputeMemoryPatterns(prisma: PrismaClient, userId: string): Promise<number> {
  const episodes = await prisma.memoryEpisode.findMany({
    where: { userId },
    select: { id: true, eventType: true },
    orderBy: { occurredAt: "desc" },
    take: 500,
  })
  const patterns = detectPatterns(episodes)
  for (const p of patterns) {
    await prisma.memoryPattern.upsert({
      where: { userId_patternKey: { userId, patternKey: p.key } },
      create: { userId, patternKey: p.key, text: p.text, status: p.status, supportEpisodeIds: p.supportEpisodeIds, confidence: p.confidence },
      update: { text: p.text, status: p.status, supportEpisodeIds: p.supportEpisodeIds, confidence: p.confidence },
    })
  }
  return patterns.length
}

/** Daily pass over every user with episodes. Best-effort per user. */
export async function recomputeMemoryPatternsForAll(prisma: PrismaClient): Promise<{ users: number; patterns: number }> {
  const users = await prisma.memoryEpisode.findMany({ distinct: ["userId"], select: { userId: true } })
  let patterns = 0
  for (const { userId } of users) {
    try { patterns += await recomputeMemoryPatterns(prisma, userId) } catch { /* per-user best-effort */ }
  }
  return { users: users.length, patterns }
}

/** Confirmed patterns for the coach context (P6 — only what the data confirmed). */
export async function getConfirmedPatterns(prisma: PrismaClient, userId: string, limit = 5): Promise<{ text: string; confidence: number }[]> {
  const rows = await prisma.memoryPattern.findMany({
    where: { userId, status: "confirmed" },
    orderBy: { confidence: "desc" },
    take: limit,
    select: { text: true, confidence: true },
  })
  return rows.map((r) => ({ text: r.text, confidence: r.confidence }))
}
