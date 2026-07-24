// Outbox consumers for the notification surface — the two halves of one insight's
// life: `insight.created` raises the notification, `insight.resolved` retires it.
//
// The producer (insight-store) only PUBLISHES both events; it never notified
// inline. Reacting here is the decoupled place for it, so this duplicates nothing.
//
// Neither handler swallows errors: a failure bubbles up so planEventTransition
// decides the retry.

import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { EventHandler } from "../event-bus"
import { emitNotification } from "@/server/services/notifications/emit"

/**
 * The dedupe key for an insight's notification. ONE source for both handlers:
 * if the raising and the retiring sides ever derived it differently, the archive
 * would match nothing and fail SILENTLY — the notification would outlive the
 * pattern with no error anywhere.
 */
export function insightDedupeKey(insightId: string): string {
  return `insight:${insightId}`
}

/**
 * `insight.created` → a persisted notification for the trader.
 *
 * Idempotent for free: emitNotification upserts by dedupeKey, so reprocessing
 * refreshes the same row instead of stacking duplicates. href verified against
 * the real route: app/analytics/page.tsx renders AiInsightsPanel +
 * BehaviorLoopPanel, the surface where the insight is visible.
 */
export const insightCreatedHandler: EventHandler = async (prisma: PrismaClient, event) => {
  const { insightId } = event.payload as { insightId: string }

  const insight = await prisma.insight.findFirst({
    where: { id: insightId, userId: event.userId },
    select: { title: true },
  })
  // Deleted between publish and consume → no-op, so the event settles.
  if (!insight) return

  await emitNotification(prisma, event.userId, "INSIGHT_DETECTED", {
    params: { title: insight.title },
    sourceId: insightId,
    dedupeKey: insightDedupeKey(insightId),
    href: "/analytics",
  })
}

/**
 * `insight.resolved` → archive that insight's notification.
 *
 * When the engine resolves an insight the pattern NO LONGER HOLDS. Leaving
 * "Nuevo patrón detectado: operas peor tras 2 pérdidas" alive in the bell means
 * the product keeps asserting something about the trader that stopped being
 * true — the class of lie FREEZE-P2 exists to prevent.
 *
 * Archiving, not deleting: the notification is history, still reachable with
 * `includeArchived`. And not marking it read — archiving removes it from the
 * bell, whereas "read" would claim the trader saw it.
 *
 * The insight is NOT loaded: the key is derivable from the payload, so this
 * works even for an insight already deleted. Scoped to `archivedAt: null` so a
 * replay is a no-op and never overwrites the original archive date — nor the
 * trader's own manual archive.
 *
 * Symmetric with emit.ts, which UN-archives on re-emit: if the pattern comes
 * back, the notification comes back. Neither side has to coordinate with the other.
 */
export const insightResolvedHandler: EventHandler = async (prisma: PrismaClient, event) => {
  const { insightId } = event.payload as { insightId: string }

  await prisma.notification.updateMany({
    where: {
      userId: event.userId,
      dedupeKey: insightDedupeKey(insightId),
      archivedAt: null,
    },
    data: { archivedAt: new Date() },
  })
}
