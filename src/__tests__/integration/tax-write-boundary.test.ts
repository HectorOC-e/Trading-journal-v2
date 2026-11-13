import { afterAll,beforeEach,describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@/lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { withTaxWrite } from '@/server/services/tax/context';
const url=process.env.FISCAL_TEST_DATABASE_URL;
if(url&&(!['localhost','127.0.0.1'].includes(new URL(url).hostname)||!new URL(url).pathname.startsWith('/fiscal_')))throw Error('Fiscal tests require the isolated local fiscal_* database');
const db=url?new PrismaClient({adapter:new PrismaPg({connectionString:url,max:4})}):null;
const owner='00000000-0000-4000-8000-000000000001',periodId='00000000-0000-4000-8000-000000000012',profileId='00000000-0000-4000-8000-000000000011';
describe.skipIf(!db)('fiscal write boundary on isolated PostgreSQL',()=>{
 beforeEach(async()=>{await db!.taxPeriod.update({where:{id:periodId},data:{status:'OPEN'}})});
 afterAll(async()=>{await db?.$disconnect()});
 async function input(action='account.save'){
  const period=await db!.taxPeriod.findUniqueOrThrow({where:{id:periodId}});
  return {requestId:randomUUID(),action,payload:{name:'integration-'+randomUUID()},periodIds:[periodId],expectedRevisions:{[periodId]:period.revision}};
 }
 it('serializes concurrent identical retries as one economic write',async()=>{
  const request=await input();
  const write=()=>withTaxWrite(db!,owner,request,tx=>tx.taxAssetAccount.create({data:{userId:owner,profileId,name:request.payload.name,kind:'BANK'}}));
  const [a,b]=await Promise.all([write(),write()]);expect(a).toEqual(b);
  expect(await db!.taxAssetAccount.count({where:{userId:owner,name:request.payload.name}})).toBe(1);
 });
 it('rolls back the business record, revision and audit if the callback fails',async()=>{
  const request=await input();
  await expect(withTaxWrite(db!,owner,request,async tx=>{await tx.taxAssetAccount.create({data:{userId:owner,profileId,name:request.payload.name,kind:'BANK'}});throw Error('force local rollback')})).rejects.toThrow('force local rollback');
  expect(await db!.taxAssetAccount.count({where:{name:request.payload.name}})).toBe(0);
  expect((await db!.taxPeriod.findUniqueOrThrow({where:{id:periodId}})).revision).toBe(request.expectedRevisions[periodId]);
  expect(await db!.taxAuditEvent.count({where:{userId:owner,requestId:request.requestId}})).toBe(0);
 });
 it('rejects a writer queued after a closing transaction',async()=>{
  const close=await input('return.close');close.payload.name='close';
  const write={...close,requestId:randomUUID(),action:'account.save',payload:{name:'must-not-exist-'+randomUUID()}};
  await withTaxWrite(db!,owner,{...close,invalidatePreparation:false},tx=>tx.taxPeriod.update({where:{id:periodId},data:{status:'CLOSED'}}));
  await expect(withTaxWrite(db!,owner,write,tx=>tx.taxAssetAccount.create({data:{userId:owner,profileId,name:write.payload.name,kind:'BANK'}}))).rejects.toMatchObject({code:'CONFLICT'});
  expect(await db!.taxAssetAccount.count({where:{name:write.payload.name}})).toBe(0);
 });
 it('stores and replays a null callback result using the actual Prisma client',async()=>{
  const request=await input('nullable.metadata');
  expect(await withTaxWrite(db!,owner,request,async()=>null)).toBe(null);
  expect(await withTaxWrite(db!,owner,request,async()=>null)).toBe(null);
 });
});
