import { beforeAll,beforeEach,afterEach,afterAll,describe,it,expect } from 'vitest';
import { prisma,makeUser,dropUser } from './_helpers';
import { replacePracticeTradeLinks } from '@/server/services/learning/practice-trades-service';
import { learningPracticesRouter } from '@/server/trpc/routers/learning-practices';
import { randomUUID } from 'node:crypto';
let owner:string,other:string;
beforeAll(async()=>{
  for(const table of ['accounts','trades','learning_practices']) {
    const rows=await prisma.$queryRawUnsafe<{relrowsecurity:boolean}[]>(`SELECT relrowsecurity FROM pg_class WHERE oid='public.${table}'::regclass`);
    if(!rows[0].relrowsecurity) {
      await prisma.$executeRawUnsafe(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      await prisma.$executeRawUnsafe(`CREATE POLICY qa_owned_rows ON public.${table} TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id)`);
    }
    await prisma.$executeRawUnsafe(`GRANT SELECT,INSERT,UPDATE,DELETE ON public.${table} TO authenticated`);
  }
  await prisma.$executeRawUnsafe('GRANT USAGE ON SCHEMA public,auth TO authenticated');
});
beforeEach(async()=>{owner=await makeUser();other=await makeUser()});
afterEach(async()=>{await dropUser(owner);await dropUser(other)});
afterAll(async()=>prisma.$disconnect());
async function trade(type='BACKTEST',userId=owner) {
 const account=await prisma.account.create({data:{userId,name:'Practice QA',broker:'QA',type,initialBalance:1000,allowedSymbols:[]}});
 return prisma.trade.create({data:{userId,accountId:account.id,direction:'LONG',symbol:'EURUSD',entry:1.1,stop:1.09,target:1.12,size:1,date:new Date('2024-01-01'),openTime:'09:30',session:'London',tags:[],screenshotUrls:[],status:'CLOSED',pnl:100}});
}
async function practice(kind='EXECUTION',operationalMode:string|null='BACKTEST',userId=owner) {
 return prisma.learningPractice.create({data:{userId,title:'Replay',exercise:'Tres ejemplos',date:new Date('2026-11-16'),durationMin:45,kind,operationalMode}});
}
async function asUser<T>(userId:string,fn:(tx:any)=>Promise<T>) {
 return prisma.$transaction(async tx=>{await tx.$executeRawUnsafe('SET LOCAL ROLE authenticated');await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub',${userId},true)`;return fn(tx)});
}
describe('practice evidence PostgreSQL ownership and invalidation',()=>{
 it('atomically creates and edits practice fields with links using the final database version',async()=>{
  const t=await trade();const caller=learningPracticesRouter.createCaller({prisma,userId:owner,supabase:{} as never});
  const fields={id:randomUUID(),title:'Replay saved',exercise:'Esperar confirmación',date:'2026-01-01',durationMin:45,kind:'EXECUTION' as const,operationalMode:'BACKTEST' as const,links:[{tradeId:t.id,role:'EXECUTED' as const}]};
  const created=await caller.create(fields);expect(created.tradeLinks).toHaveLength(1);expect(created.version).toBeGreaterThan(1);
  const updated=await caller.update({...fields,expectedVersion:created.version,kind:'REVIEW',links:[{tradeId:t.id,role:'REVIEWED'}]});
  expect(updated.version).toBeGreaterThan(created.version);expect(updated.tradeLinks[0].role).toBe('REVIEWED');expect(updated.durationMin).toBe(45);
  expect((await prisma.trade.findUniqueOrThrow({where:{id:t.id}})).pnl?.toNumber()).toBe(100);
 });
 it('allows an authenticated owner to create and remove valid evidence with monotonic invalidation',async()=>{
  const p=await practice(),t=await trade();
  const link=await asUser(owner,tx=>tx.practiceTradeLink.create({data:{userId:owner,practiceId:p.id,tradeId:t.id,role:'EXECUTED'}})) as {id:string};
  const linked=await prisma.learningPractice.findUniqueOrThrow({where:{id:p.id}});expect(linked.version).toBeGreaterThan(p.version);
  await asUser(owner,tx=>tx.practiceTradeLink.delete({where:{id:link.id}}));
  expect((await prisma.learningPractice.findUniqueOrThrow({where:{id:p.id}})).version).toBeGreaterThan(linked.version);
 });
 it('links existing market history without copying money or effort and returns the final opaque version',async()=>{
  const p=await practice();const trades=await Promise.all([trade(),trade(),trade()]);
  const result=await replacePracticeTradeLinks(prisma,owner,{practiceId:p.id,expectedVersion:p.version,links:trades.map(t=>({tradeId:t.id,role:'EXECUTED'}))});
  const row=await prisma.learningPractice.findUniqueOrThrow({where:{id:p.id},include:{tradeLinks:true}});
  expect(result.version).toBe(row.version);expect(result.version).toBeGreaterThan(p.version);expect(row.durationMin).toBe(45);expect(row.tradeLinks).toHaveLength(3);
  expect(await prisma.trade.count({where:{userId:owner}})).toBe(3);
  expect((await prisma.trade.aggregate({where:{userId:owner},_sum:{pnl:true}}))._sum.pnl?.toNumber()).toBe(300);
  expect((await prisma.trade.findUniqueOrThrow({where:{id:trades[0].id}})).date.toISOString().slice(0,10)).toBe('2024-01-01');
 });
 it('rejects cross-owner links in the service and authenticated SQL, hiding the other owner evidence',async()=>{
  const p=await practice();const foreign=await trade('BACKTEST',other);
  await expect(replacePracticeTradeLinks(prisma,owner,{practiceId:p.id,expectedVersion:p.version,links:[{tradeId:foreign.id,role:'EXECUTED'}]})).rejects.toMatchObject({code:'NOT_FOUND'});
  await expect(asUser(owner,tx=>tx.practiceTradeLink.create({data:{userId:owner,practiceId:p.id,tradeId:foreign.id,role:'EXECUTED'}}))).rejects.toThrow();
  const own=await trade();await replacePracticeTradeLinks(prisma,owner,{practiceId:p.id,expectedVersion:p.version,links:[{tradeId:own.id,role:'EXECUTED'}]});
  expect(await asUser(other,tx=>tx.practiceTradeLink.findMany({where:{practiceId:p.id}}))).toEqual([]);
  await expect(asUser(other,tx=>tx.practiceTradeLink.create({data:{userId:owner,practiceId:p.id,tradeId:own.id,role:'REVIEWED'}}))).rejects.toThrow();
 });
 it('enforces one execution globally while allowing repeat reviews',async()=>{
  const a=await practice(),b=await practice(),r=await practice('REVIEW');const t=await trade();
  await replacePracticeTradeLinks(prisma,owner,{practiceId:a.id,expectedVersion:a.version,links:[{tradeId:t.id,role:'EXECUTED'}]});
  await expect(replacePracticeTradeLinks(prisma,owner,{practiceId:b.id,expectedVersion:b.version,links:[{tradeId:t.id,role:'EXECUTED'}]})).rejects.toMatchObject({code:'CONFLICT'});
  await expect(asUser(owner,tx=>tx.practiceTradeLink.create({data:{userId:owner,practiceId:b.id,tradeId:t.id,role:'EXECUTED'}}))).rejects.toThrow();
  expect((await replacePracticeTradeLinks(prisma,owner,{practiceId:r.id,expectedVersion:r.version,links:[{tradeId:t.id,role:'REVIEWED'}]})).linkedTradeCount).toBe(1);
 });
 it('rejects mixed modes and real execution while keeping conceptual and real review practices valid',async()=>{
  const p=await practice(),demo=await trade('DEMO_PERSONAL');
  await expect(replacePracticeTradeLinks(prisma,owner,{practiceId:p.id,expectedVersion:p.version,links:[{tradeId:demo.id,role:'EXECUTED'}]})).rejects.toMatchObject({code:'BAD_REQUEST'});
  await expect(practice('EXECUTION','REAL')).rejects.toThrow();
  await expect(practice('EXECUTION',null)).rejects.toThrow();
  await expect(practice('CONCEPT','DEMO')).rejects.toThrow();
  expect((await practice('CONCEPT',null)).kind).toBe('CONCEPT');
  const r=await practice('REVIEW','REAL'),real=await trade('PERSONAL');
  expect((await replacePracticeTradeLinks(prisma,owner,{practiceId:r.id,expectedVersion:r.version,links:[{tradeId:real.id,role:'REVIEWED'}]})).linkedTradeCount).toBe(1);
 });
 it('invalidates feedback on trade edits/deletions and keeps the practice after evidence deletion',async()=>{
  const p=await practice(),t=await trade();const linked=await replacePracticeTradeLinks(prisma,owner,{practiceId:p.id,expectedVersion:p.version,links:[{tradeId:t.id,role:'EXECUTED'}]});
  await prisma.trade.update({where:{id:t.id},data:{notes:'Corrección'}});
  const edited=await prisma.learningPractice.findUniqueOrThrow({where:{id:p.id}});expect(edited.version).toBeGreaterThan(linked.version);
  await expect(replacePracticeTradeLinks(prisma,owner,{practiceId:p.id,expectedVersion:linked.version,links:[]})).rejects.toMatchObject({code:'CONFLICT'});
  await prisma.trade.delete({where:{id:t.id}});const kept=await prisma.learningPractice.findUniqueOrThrow({where:{id:p.id},include:{tradeLinks:true}});
  expect(kept.version).toBeGreaterThan(edited.version);expect(kept.tradeLinks).toEqual([]);expect(kept.durationMin).toBe(45);
 });
 it('deleting a practice removes only its links and leaves the original trade',async()=>{
  const p=await practice(),t=await trade();await replacePracticeTradeLinks(prisma,owner,{practiceId:p.id,expectedVersion:p.version,links:[{tradeId:t.id,role:'EXECUTED'}]});
  await prisma.learningPractice.delete({where:{id:p.id}});expect(await prisma.trade.findUnique({where:{id:t.id}})).not.toBeNull();expect(await prisma.practiceTradeLink.count({where:{tradeId:t.id}})).toBe(0);
 });
});
