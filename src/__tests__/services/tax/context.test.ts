import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@/lib/generated/prisma/client';
import { withTaxWrite } from '@/server/services/tax/context';
import { serializeTax } from '@/server/services/tax/serializers';
const owner='00000000-0000-4000-8000-000000000001';
const periodId='00000000-0000-4000-8000-000000000002';
const requestId='00000000-0000-4000-8000-000000000003';
function fixture(status='OPEN',revision=1){
 const period={id:periodId,userId:owner,status,revision};const audits:any[]=[];const tx:any={
 $queryRaw:vi.fn().mockResolvedValue([]),
 accountDeletionJob:{findUnique:vi.fn().mockResolvedValue(null)},
 taxPeriod:{findMany:vi.fn(({where}:any)=>Promise.resolve(where.userId===owner?[{...period}]:[])),updateMany:vi.fn(({data}:any)=>{if(data.revision)period.revision++;return Promise.resolve({count:1})})},
 taxReturn:{updateMany:vi.fn().mockResolvedValue({count:0})},
 taxAuditEvent:{findUnique:vi.fn(({where}:any)=>Promise.resolve(audits.find(a=>a.userId===where.userId_requestId.userId&&a.requestId===where.userId_requestId.requestId)??null)),create:vi.fn(({data}:any)=>{audits.push(data);return Promise.resolve(data)})},
 };
 return {db:{$transaction:async(fn:any)=>fn(tx)} as any,period,tx,audits};
}
const input={requestId,action:'income.save',payload:{amount:'100.01'},periodIds:[periodId],expectedRevisions:{[periodId]:1}};
describe('fiscal write boundary',()=>{
 it('executes one write and returns the original response for an identical retry',async()=>{
  const {db,period}=fixture();let writes=0;
  const run=()=>withTaxWrite(db,owner,input,async()=>({amount:new Prisma.Decimal('100.01'),write:++writes}));
  expect(await run()).toEqual({amount:'100.01',write:1});expect(await run()).toEqual({amount:'100.01',write:1});expect(period.revision).toBe(2);
 });
 it('rejects a reused id with a different economic payload',async()=>{
  const {db}=fixture();await withTaxWrite(db,owner,input,async()=>({saved:true}));
  await expect(withTaxWrite(db,owner,{...input,payload:{amount:'200'}},async()=>({saved:false}))).rejects.toMatchObject({code:'CONFLICT'});
 });
 it.each([['CLOSED',1],['OPEN',2]])('rejects closed or stale exercise before changing money (%s)',async(status,revision)=>{
  const {db}=fixture(status as string,revision as number);let amount='0';
  await expect(withTaxWrite(db,owner,input,async()=>{amount='100';return {amount}})).rejects.toBeDefined();expect(amount).toBe('0');
 });
 it('does not accept another owner exercise',async()=>{
  const {db}=fixture();await expect(withTaxWrite(db,'00000000-0000-4000-8000-000000000099',input,async()=>({saved:true}))).rejects.toMatchObject({code:'NOT_FOUND'});
 });
 it('keeps decimals and calendar dates exact in JSON',()=>{
  expect(serializeTax({amount:new Prisma.Decimal('99999999999999999999.123456789012345678'),date:new Date('2026-12-31T00:00:00Z'),createdAt:new Date('2026-12-31T19:00:00Z')})).toEqual({amount:'99999999999999999999.123456789012345678',date:'2026-12-31',createdAt:'2026-12-31T19:00:00.000Z'});
 });
});
