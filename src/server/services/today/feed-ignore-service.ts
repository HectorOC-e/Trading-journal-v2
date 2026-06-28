// ─────────────────────────────────────────────────────────────────────────────
// HOY feed ignore telemetry (C3, v3.2). The producer behind the feed's adaptive
// ignore-penalty: record dismissals, read counts back so assembleTodayFeed demotes
// what the trader keeps ignoring. Keyed by the stable signal id.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from "@/lib/generated/prisma/client"

/** Record (or increment) an ignore for a feed signal. Never throws. */
export async function recordIgnore(prisma: PrismaClient, userId: string, signalKey: string): Promise<void> {
  const key = signalKey.trim().slice(0, 200)
  if (!key) return
  await prisma.feedIgnore.upsert({
    where: { userId_signalKey: { userId, signalKey: key } },
    create: { userId, signalKey: key, count: 1 },
    update: { count: { increment: 1 }, lastAt: new Date() },
  })
}

/** Ignore counts for this user, by signal key — fed into the feed scorer. */
export async function getIgnoreCounts(prisma: PrismaClient, userId: string): Promise<Map<string, number>> {
  const rows = await prisma.feedIgnore.findMany({ where: { userId }, select: { signalKey: true, count: true } })
  return new Map(rows.map((r) => [r.signalKey, r.count]))
}
