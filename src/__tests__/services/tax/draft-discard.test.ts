import {describe,it,expect} from 'vitest';
import {discardTransaction} from '@/server/services/tax/ledger-service';
const user='00000000-0000-4000-8000-000000000001', periodId='00000000-0000-4000-8000-000000000002',id='00000000-0000-4000-8000-000000000003';
function fixture(status='DRAFT',periodStatus='OPEN'){
 let present=true;const row={id,userId:user,periodId,status,revision:2,reconciliations:[]};
 const tx:any={$queryRaw:async()=>[],accountDeletionJob:{findUnique:async()=>null},taxAuditEvent:{findUnique:async()=>null,create:async({data}:any)=>data},taxPeriod:{findMany:async()=>[{id:periodId,status:periodStatus,revision:3}],updateMany:async()=>({count:1})},taxReturn:{updateMany:async()=>({count:0})},taxTransaction:{findFirst:async({where}:any)=>where.userId===user?row:null,delete:async()=>{present=false;return row}}};
 return {db:{$transaction:async(fn:any)=>fn(tx)} as any,present:()=>present};
}
const input={requestId:'00000000-0000-4000-8000-000000000004',periodId,expectedRevision:3,id,recordRevision:2,reason:'Borrador creado por error'};
describe('discard fiscal draft',()=>{
 it('removes an unused draft without posting a monetary movement',async()=>{const f=fixture();expect(await discardTransaction(f.db,user,input)).toEqual({id,discarded:true});expect(f.present()).toBe(false)});
 it.each(['POSTED','REVERSED'])('keeps confirmed history: %s',async status=>{const f=fixture(status);await expect(discardTransaction(f.db,user,input)).rejects.toMatchObject({code:'CONFLICT'});expect(f.present()).toBe(true)});
 it('rejects another owner and a closed exercise',async()=>{const a=fixture();await expect(discardTransaction(a.db,'00000000-0000-4000-8000-000000000099',input)).rejects.toMatchObject({code:'NOT_FOUND'});expect(a.present()).toBe(true);const b=fixture('DRAFT','CLOSED');await expect(discardTransaction(b.db,user,input)).rejects.toMatchObject({code:'CONFLICT'});expect(b.present()).toBe(true)});
});
