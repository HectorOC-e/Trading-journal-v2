import { createHash } from "node:crypto"
import { TRPCError } from "@trpc/server"
import type { Prisma, PrismaClient, ReviewModeSnapshot } from "@/lib/generated/prisma/client"
import type { OperationalMode } from "@/domains/trading/operational-mode"

export async function openReviewSnapshot(prisma:PrismaClient,userId:string,kind:"WEEKLY"|"MONTHLY",periodKey:string,mode:OperationalMode) {
  return prisma.reviewModeSnapshot.upsert({
    where:{userId_kind_periodKey_mode:{userId,kind,periodKey,mode}},
    create:{userId,kind,periodKey,mode},update:{},
  })
}

/** CAS on the revision invalidated by writes prevents a stale loader restoring old evidence. */
export async function refreshReviewSnapshot(prisma:PrismaClient,prior:ReviewModeSnapshot,evidence:unknown,metrics:unknown) {
  const evidenceHash=createHash("sha256").update(JSON.stringify({schema:1,mode:prior.mode,kind:prior.kind,period:prior.periodKey,evidence})).digest("hex")
  const updated=await prisma.reviewModeSnapshot.updateMany({
    where:{id:prior.id,userId:prior.userId,revision:prior.revision},
    data:{evidenceHash,metrics:JSON.parse(JSON.stringify(metrics)) as Prisma.InputJsonValue},
  })
  if(updated.count!==1)throw new TRPCError({code:"CONFLICT",message:"La operativa cambió mientras se preparaba la review. Actualiza la página."})
  const current=await prisma.reviewModeSnapshot.findUniqueOrThrow({where:{id:prior.id,userId:prior.userId}})
  const valid=current.evidenceHash===evidenceHash&&current.analysisEvidenceHash===evidenceHash
  return {snapshot:current,evidenceHash,ai:{analysis:valid?current.analysis:null,at:valid?current.analysisAt:null}}
}

export async function saveReviewModeAnalysis(prisma:PrismaClient,snapshot:ReviewModeSnapshot,evidenceHash:string,analysis:string) {
  const at=new Date()
  const saved=await prisma.reviewModeSnapshot.updateMany({
    where:{id:snapshot.id,userId:snapshot.userId,mode:snapshot.mode,revision:snapshot.revision,evidenceHash},
    data:{analysis,analysisAt:at,analysisEvidenceHash:evidenceHash},
  })
  if(saved.count!==1)throw new TRPCError({code:"CONFLICT",message:"La evidencia cambió durante el análisis. Genera uno nuevo."})
  return {analysis,at:at.toISOString()}
}
