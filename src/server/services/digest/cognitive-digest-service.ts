// ─────────────────────────────────────────────────────────────────────────────
// Cognitive digest service (C4 / #28, v3.2). Weekly: composes each active trader's
// cognitive week (improvement delta, commitments kept/broken, top pattern) and
// emits ONE notification — the system reaching out, deduped per ISO week. Empty
// weeks are skipped (P3: don't nag).
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { buildCognitiveDigest } from "@/domains/cognitive/digest/cognitive-digest"
import { getImprovementSeries } from "@/server/services/improvement/improvement-snapshot-service"
import { getConfirmedPatterns } from "@/server/services/memory/memory-pattern-service"
import { emitNotification } from "@/server/services/notifications/emit"

const WEEK_MS = 7 * 86_400_000

function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((t.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
  return `${t.getUTCFullYear()}-W${week}`
}

/** Build + emit one user's weekly cognitive digest (skips empty weeks). */
export async function sendCognitiveDigest(prisma: PrismaClient, userId: string, now = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() - WEEK_MS)
  const [series, patterns, kept, broken] = await Promise.all([
    getImprovementSeries(prisma, userId, 7).catch(() => []),
    getConfirmedPatterns(prisma, userId, 1).catch(() => []),
    prisma.commitmentCheck.count({ where: { userId, result: "kept", createdAt: { gte: since } } }),
    prisma.commitmentCheck.count({ where: { userId, result: "broken", createdAt: { gte: since } } }),
  ])

  const improvementDelta = series.length >= 2 ? series[series.length - 1].score - series[0].score : null
  const digest = buildCognitiveDigest({ improvementDelta, topPattern: patterns[0]?.text ?? null, kept, broken })
  if (!digest.hasContent) return false

  await emitNotification(prisma, userId, "COGNITIVE_DIGEST", {
    params: { summary: digest.summary },
    dedupeKey: `cognitive-digest:${isoWeekKey(now)}`,
  })
  return true
}

/** Weekly pass over active users (those with an improvement snapshot). Best-effort. */
export async function sendCognitiveDigestForAll(prisma: PrismaClient, now = new Date()): Promise<{ users: number; sent: number }> {
  const users = await prisma.improvementScore.findMany({ distinct: ["userId"], select: { userId: true } })
  let sent = 0
  for (const { userId } of users) {
    try { if (await sendCognitiveDigest(prisma, userId, now)) sent++ } catch { /* per-user best-effort */ }
  }
  return { users: users.length, sent }
}
