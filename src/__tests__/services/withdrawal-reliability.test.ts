import { describe, it, expect, vi } from 'vitest'
import { createWithdrawal, changeWithdrawalStatus } from '@/server/services/accounts/withdrawal-service'
import { loadAccountCashAdjustments } from '@/server/services/accounts/cash-adjustments'
const userId='550e8400-e29b-41d4-a716-446655440000',accountId='550e8400-e29b-41d4-a716-446655440001',requestId='550e8400-e29b-41d4-a716-446655440002'
const input={accountId,amount:800,currency:'USD',date:'2026-11-05',note:'',reference:''}
function fixture(){
 const rows:any[]=[];let queue=Promise.resolve();let fail=false
 const tx:any={
 $queryRaw:vi.fn(async()=>[{id:accountId}]),account:{findUniqueOrThrow:vi.fn(async()=>({id:accountId,initialBalance:1000,currency:'USD'}))},user:{findUniqueOrThrow:vi.fn(async()=>({fxRates:null}))},trade:{findMany:vi.fn(async()=>[])},
 withdrawal:{findMany:vi.fn(async({where}:any)=>rows.filter(w=>w.userId===userId&&(!where.status||w.status!=='RECHAZADO'))),findUnique:vi.fn(async({where}:any)=>rows.find(w=>w.id===where.id&&w.userId===where.userId)??null),findUniqueOrThrow:vi.fn(async({where}:any)=>{const w=rows.find(w=>w.id===where.id&&w.userId===where.userId);if(!w)throw Error('not found');return {...w}}),create:vi.fn(async({data}:any)=>{const w={id:requestId+rows.length,...data};rows.push(w);return {...w}}),update:vi.fn(async({where,data}:any)=>Object.assign(rows.find(w=>w.id===where.id),data))},accountLog:{findMany:vi.fn(async()=>[]),create:vi.fn(async()=>{if(fail)throw Error('log unavailable');return {}})}}
 const db:any={...tx,$transaction:(fn:any)=>{const next=queue.then(async()=>{const snap=structuredClone(rows);try{return await fn(tx)}catch(e){rows.splice(0,rows.length,...snap);throw e}});queue=next.then(()=>{},()=>{});return next}}
 return {db,rows,tx,failLog:()=>{fail=true}}
}
describe('withdrawal reliability',()=>{
 it('honors negative broker corrections before reserving cash',async()=>{const f=fixture();f.tx.accountLog.findMany.mockResolvedValue([{accountId,payload:{variance:-200}}]);await expect(createWithdrawal(f.db,userId,{...input,amount:900})).rejects.toThrow(/saldo disponible/);expect(f.rows).toHaveLength(0)})
 it('allows legitimate positive broker corrections without inventing trading PnL',async()=>{const f=fixture();f.tx.accountLog.findMany.mockResolvedValue([{accountId,payload:{variance:200}}]);await expect(createWithdrawal(f.db,userId,{...input,amount:1100})).resolves.toMatchObject({amount:1100})})
 it('serializes reservations and rejects the second request exceeding cash',async()=>{const f=fixture();const r=await Promise.allSettled([createWithdrawal(f.db,userId,input),createWithdrawal(f.db,userId,input)]);expect(r.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect(f.rows.reduce((s,w)=>s+w.amount,0)).toBe(800);expect(f.tx.$queryRaw).toHaveBeenCalledTimes(2)})
 it('rejects mixed currencies before reserving',async()=>{const f=fixture();await expect(createWithdrawal(f.db,userId,{...input,currency:'EUR'})).rejects.toThrow(/moneda/i);expect(f.rows).toHaveLength(0)})
 it('rechecks rejected reservation before reactivation',async()=>{const f=fixture();const w=await createWithdrawal(f.db,userId,input);await changeWithdrawalStatus(f.db,userId,{id:w.id,status:'RECHAZADO'});await createWithdrawal(f.db,userId,input);await expect(changeWithdrawalStatus(f.db,userId,{id:w.id,status:'PAGADO'})).rejects.toThrow(/saldo disponible/i);expect(f.rows[0].status).toBe('RECHAZADO')})
 it('rolls back when log fails',async()=>{const f=fixture();f.failLog();await expect(createWithdrawal(f.db,userId,input)).rejects.toThrow('log unavailable');expect(f.rows).toHaveLength(0)})
 it('retries request id without reserving twice',async()=>{const f=fixture();const a=await createWithdrawal(f.db,userId,{...input,requestId}),b=await createWithdrawal(f.db,userId,{...input,requestId});expect(a.id).toBe(b.id);expect(f.rows).toHaveLength(1);await expect(createWithdrawal(f.db,userId,{...input,amount:100,requestId})).rejects.toThrow(/solicitud/i)})
 it('refuses to invent missing legacy FX rates',async()=>{const f=fixture();f.rows.push({userId,accountId,currency:'BRL',amount:100,status:'PAGADO'});await expect(loadAccountCashAdjustments(f.db,userId,[{id:accountId,currency:'USD'}])).rejects.toThrow(/tasa.*BRL/i)})
 it('converts legacy payments and pending reserves separately',async()=>{const f=fixture();f.rows.push({userId,accountId,currency:'EUR',amount:100,status:'PAGADO'},{userId,accountId,currency:'USD',amount:50,status:'SOLICITADO'},{userId,accountId,currency:'USD',amount:999,status:'RECHAZADO'});const m=await loadAccountCashAdjustments(f.db,userId,[{id:accountId,currency:'USD'}],{EUR:2});expect(m.get(accountId)).toEqual({paid:200,reserved:50,correction:0})})
})
