import { TRPCError } from "@trpc/server"
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client"
import { accountTypesForMode, operationalModeSchema, type ScopedWindow } from "@/domains/trading/operational-mode"

export async function scopedTradeWhere(prisma: PrismaClient, userId: string, scope: ScopedWindow): Promise<Prisma.TradeWhereInput> {
  if (!operationalModeSchema.safeParse(scope.mode).success) {
    throw new TRPCError({code:"BAD_REQUEST",message:"Selecciona Real, Demo o Backtesting."})
  }
  for (const value of [scope.from, scope.to]) {
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(new Date(value).getTime()) || new Date(value).toISOString().slice(0,10)!==value)) {
      throw new TRPCError({code:"BAD_REQUEST",message:"La fecha no es válida."})
    }
  }
  if (scope.from && scope.to && scope.from>scope.to) throw new TRPCError({code:"BAD_REQUEST",message:"El inicio debe ser anterior al final."})
  const account = {userId,type:{in:accountTypesForMode(scope.mode)},...(!scope.includeArchived?{status:{in:["ACTIVE","PAUSED"]}}:{})}
  if (scope.accountId && !await prisma.account.findFirst({where:{...account,id:scope.accountId},select:{id:true}})) {
    throw new TRPCError({code:"BAD_REQUEST",message:"La cuenta no pertenece a la modalidad seleccionada o no está disponible."})
  }
  return {
    userId, operationalMode:scope.mode, account,
    ...(scope.accountId?{accountId:scope.accountId}:{}),
    ...((scope.from||scope.to)?{date:{...(scope.from?{gte:new Date(scope.from)}:{}),...(scope.to?{lte:new Date(scope.to)}:{})}}:{}),
  }
}
