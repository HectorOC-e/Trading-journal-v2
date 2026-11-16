import { localDateISO } from '@/lib/datetime/local'
import type { PrismaClient } from '@/lib/generated/prisma/client'
type Amount = unknown
type Row = { accountId?: string; pnl: Amount; date: Date; status?: string; marketClosedAt?: Date | null; marketTimeZone?: string | null; events?: {realizedPnl: Amount; timestamp: Date}[] }
/** Explicit closes use their market day. Legacy unmatched amounts keep Trade.date
 * for compatibility; a missing close timestamp is never reconstructed. */
export function realizedRows(trades: Row[], zoneByAccount = new Map<string,string>()) {
 return trades.flatMap(t => {
  const events=(t.events ?? []).filter(e=>e.realizedPnl!=null)
  const partials=events.reduce((sum,e)=>sum+Number(e.realizedPnl),0)
  // Preserve any legacy unmatched journal amount; never invent a missing event.
  const remainder=Math.round((Number(t.pnl ?? 0)-partials)*100)/100
  const includeRemainder=t.status !== 'OPEN' || remainder !== 0
  return [
   ...(includeRemainder ? [{accountId:t.accountId!,pnl:remainder,date:t.marketClosedAt ? new Date(`${localDateISO(t.marketClosedAt, t.marketTimeZone ?? zoneByAccount.get(t.accountId!) ?? "UTC")}T00:00:00Z`) : t.date}] : []),
   ...events.map(e=>({accountId:t.accountId!,pnl:Number(e.realizedPnl),date:new Date(`${localDateISO(e.timestamp, t.marketTimeZone ?? zoneByAccount.get(t.accountId!) ?? "UTC")}T00:00:00Z`)})),
  ]
 })
}
export async function loadRealizedPnlHistory(db: Pick<PrismaClient,'trade'>,userId:string,accountIds?:string[]) {
 const trades=await db.trade.findMany({where:{userId,status:{in:['OPEN','CLOSED']},...(accountIds ? {accountId:{in:accountIds}} : {})},select:{accountId:true,pnl:true,date:true,status:true,marketClosedAt:true,marketTimeZone:true,account:{select:{timezone:true}},events:{where:{realizedPnl:{not:null}},select:{realizedPnl:true,timestamp:true}}},orderBy:[{date:'asc'},{createdAt:'asc'}]})
 return realizedRows(trades,new Map(trades.map(t=>[t.accountId,t.account?.timezone ?? "UTC"]))).sort((a,b)=>a.date.getTime()-b.date.getTime())
}
