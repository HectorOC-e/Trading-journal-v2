import { TRPCError } from '@trpc/server'
import type { Prisma } from '@/lib/generated/prisma/client'
import { computeProgressPct, computeResourceStatus } from '@/domains/learning/services/review-scheduler'

type Contribution = { durationMin: number | null; progressTypeAtFinish: string | null; progressUnitsApplied: number | null }
export function revisionProgressDelta(session: Contribution, progressType: string | null, durationMin: number, voided: boolean) {
  if (!['minutes', 'sessions'].includes(progressType ?? '') || ((session.progressUnitsApplied != null || session.progressTypeAtFinish != null) && session.progressTypeAtFinish !== progressType)) {
    throw new TRPCError({ code: 'CONFLICT', message: 'La unidad de progreso cambió; conserva el progreso actual.' })
  }
  const previous = session.progressUnitsApplied ?? (progressType === 'minutes' ? session.durationMin ?? 0 : 1)
  // A duration correction changes only the minutes delta. This preserves any
  // previously retained contribution when an earlier edit skipped adjustment.
  return voided ? -previous : progressType === 'minutes' ? durationMin - (session.durationMin ?? 0) : 0
}

export async function reviseSession(tx: Prisma.TransactionClient, userId: string, input: {
  id: string; expectedUpdatedAt: string; adjustProgress: boolean; durationMin?: number; note?: string
}, voided: boolean) {
  await tx.$queryRaw`SELECT id FROM public.study_sessions WHERE id = ${input.id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`
  const session = await tx.studySession.findFirst({ where: { id: input.id, userId } })
  if (!session) throw new TRPCError({ code: 'NOT_FOUND' })
  if (session.source === 'practice') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Gestiona esta sesión vinculada desde Prácticas.' })
  if (session.status !== 'completed' || session.updatedAt.toISOString() !== input.expectedUpdatedAt) {
    throw new TRPCError({ code: 'CONFLICT', message: 'La sesión cambió. Actualiza el historial.' })
  }
  const durationMin = input.durationMin ?? session.durationMin ?? 0
  let progressUnitsApplied = session.progressUnitsApplied
  let progressTypeAtFinish = session.progressTypeAtFinish
  let delta = 0
  if (input.adjustProgress && (voided || durationMin !== session.durationMin)) {
    await tx.$queryRaw`SELECT id FROM public.learning_resources WHERE id = ${session.resourceId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`
    const resource = await tx.learningResource.findUniqueOrThrow({ where: { id: session.resourceId, userId } })
    delta = revisionProgressDelta(session, resource.progressType, durationMin, voided)
    const next = (resource.currentUnits ?? 0) + delta
    const previousContribution = session.progressUnitsApplied ?? (resource.progressType === 'minutes' ? session.durationMin ?? 0 : 1)
    progressUnitsApplied = previousContribution + delta
    if (next < 0 || progressUnitsApplied < 0 || next > 2_147_483_647) throw new TRPCError({ code: 'CONFLICT', message: 'El ajuste produciría un progreso inválido.' })
    progressTypeAtFinish = resource.progressType
    const preserveStatus = ['MASTERED', 'IN_REVIEW', 'ABANDONED'].includes(resource.status)
    const status = preserveStatus ? resource.status : computeResourceStatus(next, resource.totalUnits)
    await tx.learningResource.update({ where: { id: resource.id, userId }, data: {
      currentUnits: next, progressPct: computeProgressPct(next, resource.totalUnits), status,
      ...(!preserveStatus ? { completedAt: status === 'COMPLETED' ? resource.completedAt ?? new Date() : null } : {}),
    } })
  }
  const before = { status: session.status, durationMin: session.durationMin, note: session.note, progressTypeAtFinish: session.progressTypeAtFinish, progressUnitsApplied: session.progressUnitsApplied }
  const after = { status: voided ? 'voided' : 'completed', durationMin, note: input.note ?? session.note, progressTypeAtFinish, progressUnitsApplied }
  const revisions = Array.isArray(session.revisionLog) ? session.revisionLog : []
  const updatedAt = new Date(Math.max(Date.now(), session.updatedAt.getTime() + 1))
  // The row lock and serialized version check above guard this write. Avoid
  // SQL equality against a JS Date: legacy timestamps can retain microseconds.
  const result = await tx.studySession.updateMany({ where: { id: session.id, userId, status: 'completed' }, data: {
    ...after, updatedAt, revisionLog: [...revisions, { at: updatedAt.toISOString(), actorId: userId, action: voided ? 'void' : 'revise', adjustProgress: input.adjustProgress, progressDelta: delta, before, after }],
  } })
  if (result.count !== 1) throw new TRPCError({ code: 'CONFLICT' })
  return { ok: true }
}
