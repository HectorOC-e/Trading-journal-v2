import { TRPCError } from "@trpc/server"
import type { PrismaClient, Commitment, CommitmentCheck, StudySession, LearningPractice } from "@/lib/generated/prisma/client"
import { deriveCommitmentSpec } from "@/domains/behavior/commitment-machine"
import { publishEvent } from "@/domains/cognitive/events/event-bus"
import { addDaysISO } from "@/lib/datetime/local"
import { readReviewSource, type ReviewSource } from "@/domains/learning/review-source"

async function requireReview(prisma: PrismaClient, userId: string, source: ReviewSource) {
  const review = await prisma.weeklyReview.findFirst({ where: { userId, weekStart: new Date(source.weekStart + "T00:00:00Z") }, select: { id: true } })
  if (!review) throw new TRPCError({ code: "NOT_FOUND", message: "Guarda primero la review de origen." })
}
export async function createReviewCommitment(prisma: PrismaClient, userId: string, input: { id: string; source: ReviewSource; insightType: string }) {
  const spec = deriveCommitmentSpec(input.insightType)
  if (!spec) throw new TRPCError({ code: "BAD_REQUEST", message: "Elige un compromiso medible disponible." })
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM public.users WHERE id=${userId}::uuid FOR UPDATE`
    await requireReview(tx as PrismaClient, userId, input.source)
    const existing = await tx.commitment.findFirst({ where: { id: input.id, userId } })
    if (existing) {
      if (JSON.stringify(readReviewSource(existing.reviewSource)) !== JSON.stringify(input.source) || existing.metricKey !== spec.metricKey) throw new TRPCError({code:"CONFLICT",message:"Esta acción ya se guardó con otros datos."})
      return { id: existing.id }
    }
    const startAt = new Date(), endAt = new Date(startAt.getTime() + 7 * 86400000)
    const row = await tx.commitment.create({ data: { id: input.id, userId, text: spec.text, metricKey: spec.metricKey, comparator: spec.comparator, target: spec.target, window: spec.window, startAt, endAt, status: "active", createdVia: "review", reviewSource: input.source } })
    await publishEvent(tx, { userId, type: "commitment.created", payload: { commitmentId: row.id } })
    return { id: row.id }
  })
}
export async function planReviewPractice(prisma: PrismaClient, userId: string, input: { id: string; source: ReviewSource; resourceId: string; date: string; plannedMin: number }) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM public.users WHERE id=${userId}::uuid FOR UPDATE`
    await requireReview(tx as PrismaClient, userId, input.source)
    const resource = await tx.learningResource.findFirst({ where: { id: input.resourceId, userId }, select: { id: true } })
    if (!resource) throw new TRPCError({ code: "NOT_FOUND" })
    const existing = await tx.studySession.findFirst({ where: { id: input.id, userId } })
    if (existing) {
      if (JSON.stringify(readReviewSource(existing.reviewSource)) !== JSON.stringify(input.source) || existing.resourceId !== input.resourceId || existing.startedAt.toISOString().slice(0,10) !== input.date || existing.plannedMin !== input.plannedMin) throw new TRPCError({code:"CONFLICT",message:"Esta acción ya se guardó con otros datos."})
      return { id: existing.id }
    }
    const row = await tx.studySession.create({ data: { id: input.id, userId, resourceId: resource.id, status: "planned", source: "planned", startedAt: new Date(input.date + "T12:00:00Z"), plannedMin: input.plannedMin, note: input.source.conclusion, reviewSource: input.source } })
    return { id: row.id }
  })
}
function serializeCommitment(c: Commitment & {checks: CommitmentCheck[]}, before?: Date) {
  return { id:c.id, text:c.text, status:before ? c.checks[0]?.result ?? (c.status === "expired" && c.updatedAt < before ? "expired" : "active") : c.status, target:c.target, comparator:c.comparator, observedValue:c.checks[0]?.observedValue ?? null, reviewSource:readReviewSource(c.reviewSource) }
}
function serializePlan(s:StudySession & {resource:{title:string}}, before?:Date) {
  return {id:s.id,resourceId:s.resourceId,title:s.resource.title,status:before && (s.status === "completed" ? (s.endedAt ?? s.startedAt) >= before : s.updatedAt >= before) ? "planned" : s.status,date:s.startedAt.toISOString().slice(0,10),plannedMin:s.plannedMin,reviewSource:readReviewSource(s.reviewSource)}
}
function serializePractice(p:LearningPractice) {
 return {id:p.id,title:p.title,assessment:p.assessment,plannedSessionId:p.plannedSessionId,reviewSource:readReviewSource(p.reviewSource)}
}
export async function loadReviewFollowUp(prisma: PrismaClient, userId: string, weekStart: string) {
 const from=new Date(weekStart+"T00:00:00Z"),to=new Date(addDaysISO(weekStart,7)+"T00:00:00Z")
 const origin={userId,reviewSource:{path:["weekStart"],equals:weekStart}}
 const historical={userId,reviewSource:{path:["kind"],equals:"weekly"},NOT:{reviewSource:{path:["weekStart"],equals:weekStart}}}
 const [commitments,plans,practices,originCommitments,originPlans,originPractices]=await Promise.all([
  prisma.commitment.findMany({where:{...historical,archivedAt:null,createdAt:{lt:to},startAt:{lt:to},endAt:{gte:from}},include:{checks:{where:{evaluatedAt:{lt:to}},orderBy:{evaluatedAt:"desc"},take:1}},orderBy:{createdAt:"desc"}}),
  prisma.studySession.findMany({where:{...historical,createdAt:{lt:to},startedAt:{gte:from,lt:to}},include:{resource:{select:{title:true}}},orderBy:{startedAt:"asc"}}),
  prisma.learningPractice.findMany({where:{...historical,date:{gte:from,lt:to}},orderBy:{date:"desc"}}),
  prisma.commitment.findMany({where:{...origin,archivedAt:null},include:{checks:{orderBy:{evaluatedAt:"desc"},take:1}},orderBy:{createdAt:"desc"}}),
  prisma.studySession.findMany({where:origin,include:{resource:{select:{title:true}}},orderBy:{startedAt:"asc"}}),
  prisma.learningPractice.findMany({where:origin,orderBy:{date:"desc"}}),
 ])
 return {
  commitments:commitments.map(c=>serializeCommitment(c,to)),plans:plans.map(p=>serializePlan(p,to)),practices:practices.map(serializePractice),
  originActions:{commitments:originCommitments.map(c=>serializeCommitment(c)),plans:originPlans.map(p=>serializePlan(p)),practices:originPractices.map(serializePractice)},
 }
}
