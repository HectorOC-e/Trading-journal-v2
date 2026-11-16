import { expect,it,vi } from 'vitest';
import { learningResourcesRouter } from '@/server/trpc/routers/learning-resources';
import { studySessionsRouter } from '@/server/trpc/routers/study-sessions';
import { computeNextReview } from '@/domains/learning/srs';
vi.mock('@/lib/prisma',()=>({prisma:{}}));
vi.mock('@/lib/supabase/server',()=>({createClient:vi.fn()}));
vi.mock('@/server/services/retrieval/pipeline',()=>({scheduleEmbedding:vi.fn()}));
function setup() {
 const resource={id:'11111111-1111-4111-8111-111111111111',title:'Study',type:'NOTA',completedAt:new Date('2026-11-10'),linkedSetups:[{id:'s',name:'Setup'}],reviewInterval:6,status:'COMPLETED'};
 const p={user:{findUniqueOrThrow:vi.fn(async()=>({timezone:'UTC',weeklyGoalMinutes:300,currentStreak:0,bestStreak:0,lastReviewDate:null})),update:vi.fn()},learningResource:{findUniqueOrThrow:vi.fn(async()=>resource),findMany:vi.fn(async()=>[resource]),update:vi.fn(async({data}:{data:{reviewInterval?:number}})=>data)},studySession:{findMany:vi.fn(async()=>[])},trade:{findMany:vi.fn(async(_query:{where:Record<string,unknown>})=>[])},resourceReview:{count:vi.fn(async()=>2),create:vi.fn(async({data}:any)=>({...data,id:'review',createdAt:new Date()}))},$transaction:vi.fn()};
 p.$transaction.mockImplementation(async fn=>fn(p));const ctx={userId:'u',prisma:p as never,supabase:{} as never};
 return {p,resource,resources:learningResourcesRouter.createCaller(ctx),study:studySessionsRouter.createCaller(ctx)};
}
it('scopes setup impact and uses executed practice dates for simulated evidence',async()=>{
 const {p,resource,resources}=setup();await resources.setupImpact({resourceId:resource.id,mode:'BACKTEST'});
 expect(p.trade.findMany.mock.calls[0][0].where).toMatchObject({operationalMode:'BACKTEST',practiceLinks:{some:{role:'EXECUTED',practice:{date:{gte:resource.completedAt}}}}});
 expect(p.trade.findMany.mock.calls[0][0].where).not.toHaveProperty('date');
});
it('filters resource impact ranking by mode before reading evidence',async()=>{
 const {p,resources}=setup();await resources.resourceImpactRanking({mode:'DEMO'});
 expect(p.trade.findMany.mock.calls[0][0].where).toMatchObject({userId:'u',operationalMode:'DEMO'});
});
it('keeps home study shared but the weakest setup suggestion scoped',async()=>{
 const {p,study}=setup();const result=await study.home({mode:'BACKTEST'});
 expect(p.trade.findMany.mock.calls[0][0].where).toMatchObject({userId:'u',operationalMode:'BACKTEST'});
 expect(result.week).toMatchObject({hoursMin:0,goalMin:300});
});
it('schedules global memory review from recall without consulting operational trades',async()=>{
 const {p,resources,resource}=setup();await resources.createReview({resourceId:resource.id,learned:'Regla recordada',rating:4,masteryLevel:4});
 expect(p.trade.findMany).not.toHaveBeenCalled();
 const expected=computeNextReview({currentInterval:6,reps:2,ease:2.5,grade:4,performance:null});
 expect(p.learningResource.update.mock.calls[0][0].data.reviewInterval).toBe(expected.interval);
});
