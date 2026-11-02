import { TRPCError } from "@trpc/server"
import type { Prisma } from "@/lib/generated/prisma/client"
import { applyStudyFinish } from "@/domains/learning/services/study-session-service"

/** Serialize increments for the same resource, including finishes of different
 * sessions. The resource must be read AFTER acquiring its row lock, otherwise
 * two transactions can still write totals computed from the same old value.
 */
export async function applyStudySessionProgress(
  tx: Prisma.TransactionClient,
  userId: string,
  resourceId: string,
  durationMin: number,
  markForReview = false,
) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM public.learning_resources
    WHERE id = ${resourceId}::uuid AND user_id = ${userId}::uuid
    FOR UPDATE
  `
  if (!rows.length) throw new TRPCError({ code: "NOT_FOUND" })
  const resource = await tx.learningResource.findUniqueOrThrow({
    where: { id: resourceId, userId },
    select: { progressType: true, currentUnits: true, totalUnits: true, status: true, completedAt: true },
  })
  const update = applyStudyFinish(resource, durationMin)
  const preserveStatus = ["MASTERED", "IN_REVIEW", "ABANDONED"].includes(resource.status)
  const status = preserveStatus ? resource.status : update?.status ?? resource.status
  const data = update
    ? { currentUnits: update.currentUnits, progressPct: update.progressPct, status }
    : (resource.status === "PENDING" ? { status: "IN_PROGRESS" } : {})
  await tx.learningResource.update({
    where: { id: resourceId, userId },
    data: { ...data,
      ...(update?.status === "COMPLETED" && !resource.completedAt ? { completedAt: new Date() } : {}),
      ...(markForReview ? { markedForReview: true } : {}) },
  })
  return { progressTypeAtFinish: resource.progressType, progressUnitsApplied: update ? update.currentUnits - (resource.currentUnits ?? 0) : 0 }
}
