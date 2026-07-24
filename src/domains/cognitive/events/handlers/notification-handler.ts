// Outbox consumer: `insight.created` → a persisted notification for the trader.
// Idempotent for free: emitNotification upserts by dedupeKey, so reprocessing an
// event refreshes the same row instead of stacking duplicates.
//
// The producer (insight-store) only PUBLISHES the event; it never notified
// inline. Reacting here is the decoupled place for it, so this duplicates nothing.
//
// Does NOT swallow errors: a failure bubbles up so planEventTransition retries.
// href verified against the real route: app/analytics/page.tsx renders
// AiInsightsPanel + BehaviorLoopPanel, the surface where the insight is visible.

import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { EventHandler } from "../event-bus"
import { emitNotification } from "@/server/services/notifications/emit"

export const notificationHandler: EventHandler = async (prisma: PrismaClient, event) => {
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
    // Keyed on the INSIGHT, not the event: the notification is about the insight,
    // so a replay (or a re-published event) refreshes one row per insight.
    dedupeKey: `insight:${insightId}`,
    href: "/analytics",
  })
}
