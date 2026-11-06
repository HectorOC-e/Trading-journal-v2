vi.mock('@/lib/prisma',()=>({prisma:{}}))
vi.mock('@/lib/supabase/server',()=>({createClient:vi.fn()}))
vi.mock('@/server/services/retrieval/pipeline',()=>({scheduleEmbedding:vi.fn()}))
vi.mock('@/server/services/learning/learning-insights-service',()=>({getResourceTransfer:vi.fn()}))
import { weeklyReviewsRouter } from '@/server/trpc/routers/weekly-reviews'
import { monthlyReviewsRouter } from '@/server/trpc/routers/monthly-reviews'
const id='11111111-1111-4111-8111-111111111111'
function db(row:any, kind:string) {
 const p:any={ [kind]:{update:vi.fn(async({data}:any)=>Object.assign(row,data))}, $executeRaw:vi.fn(async()=>0)}
 p.$transaction=vi.fn(async(fn:any)=>fn(p)); return p
}
const ctx=(p:any)=>({prisma:p,userId:'u',supabase:{} as never})
it('weekly title PATCH preserves omitted narrative, metrics and status',async()=>{
 const row={id,executiveSummary:'Long carefully written reflection',whatWorked:'Wait for confirmation',toImprove:'Size smaller',status:'submitted',tradeCount:12,netPnl:250,winRate:60,disciplineScore:90}
 const p=db(row,'weeklyReview'); await weeklyReviewsRouter.createCaller(ctx(p)).update({id,weekLabel:'Corrected title'})
 expect(row).toMatchObject({executiveSummary:'Long carefully written reflection',whatWorked:'Wait for confirmation',toImprove:'Size smaller',status:'submitted',tradeCount:12,netPnl:250,winRate:60,disciplineScore:90})
})
it('monthly score PATCH preserves omitted summary, themes and goals',async()=>{
 const row:any={id,summary:'Important reflection',keyThemes:['patience'],goalsSet:['wait'],goalsMet:['wait'],weeklyIds:[id],createdAt:new Date(),updatedAt:new Date()}
 const p=db(row,'monthlyReview'); await monthlyReviewsRouter.createCaller(ctx(p)).update({id,overallScore:80})
 expect(row).toMatchObject({summary:'Important reflection',keyThemes:['patience'],goalsSet:['wait'],goalsMet:['wait'],weeklyIds:[id]})
})
import { executeCoachTool } from '@/lib/ai/coach-tools'
import { isResourceReviewDue } from '@/domains/learning/services/review-queue'
it('Coach agenda includes manually marked review with no SRS date',async()=>{
 const resource={id,title:'Manual review',type:'LIBRO',status:'IN_PROGRESS',markedForReview:true,nextReviewAt:null}
 const prisma:any={learningResource:{findMany:vi.fn(async({where}:any)=>{return where.nextReviewAt?.not===null?[]:[resource]})},studySession:{findMany:vi.fn(async()=>[])}}
 const answer=await executeCoachTool('get_study_agenda',{}, {prisma,userId:'u'} as any)
 expect(isResourceReviewDue(resource,'2026-11-06')).toBe(true)
 expect(JSON.parse(typeof answer==='string'?answer:answer.text).dueReviews).toEqual([expect.objectContaining({title:'Manual review',overdue:true})])
})
it('review PATCH accepts explicit empty text, arrays, zero and draft status', async () => {
 const weekly = { id, executiveSummary: 'Before', status: 'submitted', tradeCount: 12 }
 await weeklyReviewsRouter.createCaller(ctx(db(weekly,'weeklyReview'))).update({id,executiveSummary:'',status:'draft',tradeCount:0})
 expect(weekly).toMatchObject({executiveSummary:'',status:'draft',tradeCount:0})
 const monthly = {id,summary:'Before',keyThemes:['patience'],createdAt:new Date(),updatedAt:new Date()}
 await monthlyReviewsRouter.createCaller(ctx(db(monthly,'monthlyReview'))).update({id,summary:'',keyThemes:[]})
 expect(monthly).toMatchObject({summary:'',keyThemes:[]})
})
it('Coach agenda includes a manually marked review beyond the SRS horizon', async () => {
 const resource={id,title:'Manual future review',type:'LIBRO',status:'IN_PROGRESS',markedForReview:true,nextReviewAt:new Date('2099-01-01')}
 const prisma:any={learningResource:{findMany:vi.fn(async({where}:any)=>where.OR?.some((condition:any)=>condition.markedForReview===true)?[resource]:[])},studySession:{findMany:vi.fn(async()=>[])}}
 const answer=await executeCoachTool('get_study_agenda',{}, {prisma,userId:'u'} as any)
 expect(JSON.parse(answer.text).dueReviews).toEqual([expect.objectContaining({title:'Manual future review',overdue:true,date:new Date().toISOString().slice(0,10)})])
})
