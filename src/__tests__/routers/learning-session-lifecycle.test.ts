import { describe, it, expect, vi } from 'vitest'
import { studySessionsRouter } from '@/server/trpc/routers/study-sessions'
vi.mock('@/lib/prisma',()=>({prisma:{}}))
vi.mock('@/lib/supabase/server',()=>({createClient:vi.fn()}))
const id='11111111-1111-4111-8111-111111111111'
function fixture(status='IN_PROGRESS'){
 const resource={id,title:'QA',type:'CURSO',status,progressType:'minutes',currentUnits:90,totalUnits:100}
 const prisma:any={studySession:{findFirst:vi.fn().mockResolvedValue(null),create:vi.fn().mockImplementation(async({data}:any)=>({...data,id:crypto.randomUUID(),startedAt:new Date(),endedAt:null,plannedMin:null,durationMin:null,note:'',resource})),updateMany:vi.fn().mockResolvedValue({count:1})},learningResource:{findFirst:vi.fn().mockResolvedValue(resource),findUniqueOrThrow:vi.fn().mockResolvedValue(resource),update:vi.fn().mockResolvedValue({})},$queryRaw:vi.fn().mockResolvedValue([{id}]),$transaction:vi.fn()}
 prisma.$transaction.mockImplementation(async(fn:any)=>fn(prisma))
 return {prisma,caller:studySessionsRouter.createCaller({prisma,userId:id,supabase:{} as never})}
}
describe('audit probes: desired invariants',()=>{
 it('simultaneous starts must share a single active session',async()=>{
  const {caller,prisma}=fixture()
  let active:any=null;let tail=Promise.resolve()
  prisma.studySession.findFirst.mockImplementation(async()=>active)
  prisma.studySession.create.mockImplementation(async({data}:any)=>{active={...data,id:crypto.randomUUID(),startedAt:new Date(),endedAt:null,plannedMin:null,durationMin:null,note:'',resource:{title:'QA',type:'CURSO'}};return active})
  prisma.$transaction.mockImplementation(async(fn:any)=>{let release:any;const tx={...prisma,$queryRaw:async()=>{const prev=tail;tail=new Promise<void>(r=>{release=r});await prev;return[{id}]}};try{return await fn(tx)}finally{release?.()}})
  const result=await Promise.all([caller.start({resourceId:id}),caller.start({resourceId:id})])
  expect(new Set(result.map(x=>x.id)).size).toBe(1)
  expect(prisma.studySession.create).toHaveBeenCalledTimes(1)
 })
 it('a study completion reaching 100% must stamp completedAt',async()=>{
  const {caller,prisma}=fixture()
  prisma.studySession.findFirst.mockResolvedValue({id,resourceId:id,status:'active'})
  await caller.finish({id,durationMin:10})
  expect(prisma.learningResource.update.mock.calls[0][0].data).toMatchObject({status:'COMPLETED',completedAt:expect.any(Date)})
 })
 it.each(['MASTERED','IN_REVIEW','ABANDONED'])('studying must preserve lifecycle state %s',async(status)=>{
  const {caller,prisma}=fixture(status)
  prisma.learningResource.findUniqueOrThrow.mockResolvedValue({status,progressType:'minutes',currentUnits:100,totalUnits:100})
  prisma.studySession.findFirst.mockResolvedValue({id,resourceId:id,status:'active'})
  await caller.finish({id,durationMin:10})
  expect(prisma.learningResource.update.mock.calls[0][0].data.status).toBe(status)
  expect(prisma.learningResource.update.mock.calls[0][0].data.completedAt).toBeInstanceOf(Date)
 })
 it('preserves the first completion date on subsequent sessions',async()=>{
  const {caller,prisma}=fixture('COMPLETED')
  const completedAt=new Date('2026-10-01T12:00:00Z')
  prisma.learningResource.findUniqueOrThrow.mockResolvedValue({status:'COMPLETED',progressType:'minutes',currentUnits:100,totalUnits:100,completedAt})
  prisma.studySession.findFirst.mockResolvedValue({id,resourceId:id,status:'active'})
  await caller.finish({id,durationMin:10})
  expect(prisma.learningResource.update.mock.calls[0][0].data).not.toHaveProperty('completedAt')
 })
 it('records completion metadata when completing a planned block',async()=>{
  const {caller,prisma}=fixture()
  prisma.studySession.findFirst.mockResolvedValue({id,resourceId:id,status:'planned',plannedMin:10})
  await caller.completePlanned({id})
  expect(prisma.learningResource.update.mock.calls[0][0].data).toMatchObject({status:'COMPLETED',completedAt:expect.any(Date)})
 })

})
