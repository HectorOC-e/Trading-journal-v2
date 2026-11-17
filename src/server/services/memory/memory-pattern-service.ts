// ─────────────────────────────────────────────────────────────────────────────
// Memory Agent (E14, v3.2 §6) — derives SEMANTIC patterns from EPISODES and
// confirms them deterministically (P6/D9: the data confirms, never the LLM). Runs
// daily in the recompute-insights cron. Patterns carry their support episode ids.
// ─────────────────────────────────────────────────────────────────────────────

import { OPERATIONAL_MODES, operationalModeSchema, type OperationalMode } from "@/domains/trading/operational-mode"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { detectPatterns } from "@/domains/cognitive/memory/pattern-detection"

/** Re-derive + upsert this user's semantic patterns from their episodes. */
export async function recomputeMemoryPatterns(prisma: PrismaClient, userId: string, mode: OperationalMode = "REAL"): Promise<number> {
  operationalModeSchema.parse(mode)
  const episodes = await prisma.memoryEpisode.findMany({
    where: { userId, operationalMode: mode },
    select: { id: true, eventType: true },
    orderBy: { occurredAt: "desc" },
    take: 500,
  })
  const patterns = detectPatterns(episodes)
  for (const p of patterns) {
    await prisma.memoryPattern.upsert({
      where: { userId_patternKey_operationalMode: { userId, patternKey: p.key, operationalMode: mode } },
      create: { userId, operationalMode: mode, patternKey: p.key, text: p.text, status: p.status, supportEpisodeIds: p.supportEpisodeIds, confidence: p.confidence },
      update: { text: p.text, status: p.status, supportEpisodeIds: p.supportEpisodeIds, confidence: p.confidence },
    })
  }
  return patterns.length
}

/** Daily pass over every user with episodes. Best-effort per user. */
export async function recomputeMemoryPatternsForAll(prisma: PrismaClient): Promise<{ users: number; patterns: number }> {
  const scopes = await prisma.memoryEpisode.findMany({
    where: { operationalMode: { in: [...OPERATIONAL_MODES] } },
    distinct: ["userId", "operationalMode"], select: { userId: true, operationalMode: true },
  })
  let patterns = 0
  const users = new Set<string>()
  for (const { userId, operationalMode } of scopes) {
    const parsed = operationalModeSchema.safeParse(operationalMode)
    if (!parsed.success) continue
    users.add(userId)
    try { patterns += await recomputeMemoryPatterns(prisma, userId, parsed.data) } catch { /* per-scope best-effort */ }
  }
  return { users: users.size, patterns }
}

/** Confirmed patterns for the coach context (P6 — only what the data confirmed). */
export async function getConfirmedPatterns(prisma: PrismaClient, userId: string, limit = 5, mode: OperationalMode = "REAL"): Promise<{ text: string; confidence: number; operationalMode: OperationalMode }[]> {
  operationalModeSchema.parse(mode)
  const rows = await prisma.memoryPattern.findMany({
    where: { userId, operationalMode: mode, status: "confirmed" },
    orderBy: { confidence: "desc" },
    take: limit,
    select: { text: true, confidence: true },
  })
  return rows.map((r) => ({ text: r.text, confidence: r.confidence, operationalMode: mode }))
}
