import { TRPCError } from '@trpc/server';
import type { Prisma,PrismaClient } from '@/lib/generated/prisma/client';
import { serializeTax,taxHash,type FiscalJson } from './serializers';
export interface TaxWriteRequest{
 requestId:string;action:string;payload:unknown;periodIds?:string[];expectedRevisions?:Record<string,number>;reason?:string;
 /** Only lifecycle services may use these, never accept them from client payloads. */
 allowClosed?:boolean;invalidatePreparation?:boolean;
}
/** One advisory lock per fiscal owner serializes economic writes without touching trading rows. */
export async function withTaxWrite(db:PrismaClient,userId:string,input:TaxWriteRequest,write:(tx:Prisma.TransactionClient)=>Promise<unknown>):Promise<FiscalJson>{
 const ids=[...new Set(input.periodIds??[])].sort();
 const reason=input.reason??'';
 // Preconditions and privileged options belong to the request identity. A replay
 // uses the original revisions (already incremented by the successful write).
 // Ignore revision entries for periods outside the operation's effective scope.
 const expectedRevisions=Object.fromEntries(ids.filter(id=>input.expectedRevisions?.[id]!==undefined).map(id=>[id,input.expectedRevisions![id]]));
 const payloadHash=taxHash({action:input.action,payload:input.payload,periodIds:ids,reason,expectedRevisions,allowClosed:input.allowClosed??false,invalidatePreparation:input.invalidatePreparation??true});
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`tax:${userId}`},0))`;
  if(await tx.accountDeletionJob.findUnique({where:{userId},select:{userId:true}}))throw new TRPCError({code:'UNAUTHORIZED'});
  const previous=await tx.taxAuditEvent.findUnique({where:{userId_requestId:{userId,requestId:input.requestId}}});
  if(previous){
   if(previous.payloadHash!==payloadHash||previous.action!==input.action)throw new TRPCError({code:'CONFLICT',message:'La solicitud ya existe con otros datos fiscales.'});
   return previous.result as FiscalJson;
  }
  if(input.allowClosed&&!['return.reopen','return.reportFiled','evidence.filingReceiptUpload','evidence.filingReceiptFinalize'].includes(input.action))throw new TRPCError({code:'BAD_REQUEST',message:'Acción fiscal no permitida sobre un ejercicio cerrado.'});
  if(ids.length){
   const periods=await tx.taxPeriod.findMany({where:{userId,id:{in:ids}},select:{id:true,status:true,revision:true}});
   if(periods.length!==ids.length)throw new TRPCError({code:'NOT_FOUND',message:'No se encontró el ejercicio fiscal.'});
   for(const period of periods){
    if(period.status!=='OPEN'&&!input.allowClosed)throw new TRPCError({code:'CONFLICT',message:'El ejercicio fiscal está cerrado. Reábrelo antes de modificar sus registros.'});
    if(input.expectedRevisions?.[period.id]!==undefined&&input.expectedRevisions[period.id]!==period.revision)throw new TRPCError({code:'CONFLICT',message:'El ejercicio cambió. Recarga para revisar sus datos antes de guardar.'});
   }
   // Invalidate before preparing a new immutable revision, not after the close callback.
   await tx.taxPeriod.updateMany({where:{userId,id:{in:ids}},data:{revision:{increment:1}}});
   if(input.invalidatePreparation!==false)await tx.taxReturn.updateMany({where:{userId,periodId:{in:ids},status:'READY',closedAt:null},data:{status:'IN_REVIEW'}});
  }
  const result=serializeTax(await write(tx));
  await tx.taxAuditEvent.create({data:{userId,actorId:userId,periodId:ids[0]??null,entityType:input.action.split('.')[0],action:input.action,requestId:input.requestId,payloadHash,result:result as Prisma.InputJsonValue,reason,detail:{periodIds:ids}}});
  return result;
 },{maxWait:10000,timeout:20000});
}
