import { expect, it, vi } from "vitest"
import { gatherDigestInput, type DigestUser } from "@/server/services/email/send-learning-digest"
import { buildLearningDigest } from "@/domains/learning/services/digest-builder"
const user = { id:"u", name:"U", timezone:"America/New_York",weeklyGoalMinutes:300,currentStreak:99,bestStreak:99,lastReviewDate:null } as DigestUser
it("derives digest metrics from actual completed study instants",async()=>{
 const sessions=[4,5].map(day=>({startedAt:new Date("2026-10-01"),endedAt:new Date(`2026-11-0${day}T20:00Z`),source:"manual",plannedMin:30,status:"completed",durationMin:30}))
 const prisma={learningResource:{findMany:vi.fn(async()=>[])},studySession:{findFirst:vi.fn(async()=>null),findMany:vi.fn(async()=>sessions)}}
 const input=await gatherDigestInput(prisma as never,user,new Date("2026-11-05T22:00Z"))
 expect(input.progress.minutesThisWeek).toBe(60)
 expect(input.streak).toMatchObject({current:2,best:2})
 expect(buildLearningDigest(input).streak.atRisk).toBe(false)
})
it.each([null,new Date("2027-01-01")])("includes marked review with due %s",async nextReviewAt=>{
 const prisma={learningResource:{findMany:vi.fn(async()=>[{id:"r",title:"Manual",status:"PENDING",markedForReview:true,nextReviewAt}])},studySession:{findFirst:vi.fn(async()=>null),findMany:vi.fn(async()=>[])}}
 expect(buildLearningDigest(await gatherDigestInput(prisma as never,user,new Date("2026-11-05T22:00Z"))).reviewCount).toBe(1)
})
it.each(["2026-03-08","2026-11-01"])("finds resource-free plans on local DST day %s",async day=>{
 const prisma={learningResource:{findMany:vi.fn(async()=>[])},studySession:{findFirst:vi.fn(async()=>null),findMany:vi.fn(async({where})=>where.status==="planned"?[{startedAt:new Date(`${day}T23:00Z`),resource:null}]:[])}}
 expect((await gatherDigestInput(prisma as never,user,new Date(`${day}T18:00Z`))).plannedSession?.title).toBeTruthy()
})

it.each([
 ["2026-03-08", "2026-03-09T03:30Z"],
 ["2026-11-01", "2026-11-02T04:30Z"],
])("excludes previous UTC-overlap day and includes late local plans on %s",async(day,late)=>{
 const prisma={learningResource:{findMany:vi.fn(async()=>[])},studySession:{findMany:vi.fn(async({where})=>where.status==="planned"?[
  {startedAt:new Date(`${day}T02:00Z`),resource:{title:"Previous day"}},
  {startedAt:new Date(late),resource:{title:"Late local session"}},
 ]:[])}}
 const input=await gatherDigestInput(prisma as never,user,new Date(`${day}T18:00Z`))
 expect(input.plannedSession?.title).toBe("Late local session")
})
