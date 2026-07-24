// Outbox consumer: turns `commitment.*` events into episodic memories for the
// coach (E13). Idempotent by `sourceId = event.id` — NOT by commitmentId, because
// creating and then breaking the same commitment are two legitimate, distinct
// episodes; dedupeing by commitment would make the second overwrite the first.
//
// Does NOT swallow errors: a failure bubbles up so `planEventTransition` decides
// the retry. The only best-effort part is the embedding, inside the service.

import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { EventHandler } from "../event-bus"
import type { MemoryEventType } from "@/domains/cognitive/memory/salience"
import { recordEpisodeOnce } from "@/server/services/memory/memory-episode-service"

const EPISODE_FOR: Record<string, { type: MemoryEventType; verb: string }> = {
  "commitment.created": { type: "commitment_created", verb: "Te comprometiste a" },
  "commitment.broken": { type: "commitment_broken", verb: "Rompiste tu compromiso" },
  "commitment.kept": { type: "commitment_kept", verb: "Cumpliste tu compromiso" },
  "commitment.partial": { type: "commitment_kept", verb: "Cumpliste en parte" },
}

type CommitmentShape = {
  text: string | null
  metricKey: string
  comparator: string
  target: number
  window: string
}

/**
 * What the trader actually promised, for the episode body. `text` is the
 * human-written commitment ("No tomar más de 2 trades por día esta semana") and
 * is what belongs in a memory the coach will quote back. The metric form is only
 * a fallback for commitments created without text.
 */
function describeCommitment(c: CommitmentShape): string {
  const text = c.text?.trim()
  if (text) return text
  return `${c.metricKey} ${c.comparator} ${c.target} (${c.window})`
}

export const memoryHandler: EventHandler = async (prisma: PrismaClient, event) => {
  const mapping = EPISODE_FOR[event.type]
  if (!mapping) return

  const { commitmentId } = event.payload as { commitmentId: string }
  const commitment = await prisma.commitment.findFirst({
    where: { id: commitmentId, userId: event.userId },
    select: { text: true, metricKey: true, comparator: true, target: true, window: true },
  })
  // Deleted between publish and consume → no-op, so the event settles instead of
  // retrying forever against something that no longer exists.
  if (!commitment) return

  await recordEpisodeOnce(prisma, event.userId, {
    eventType: mapping.type,
    content: `${mapping.verb}: ${describeCommitment(commitment)}`,
    sourceId: event.id,
  })
}
