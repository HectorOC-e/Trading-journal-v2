import { afterAll, beforeEach, afterEach, expect, it } from "vitest"
import { randomUUID } from "node:crypto"
import { prisma, makeUser, dropUser } from "./_helpers"
import { createReviewCommitment, loadReviewFollowUp } from "@/server/services/reviews/continuity"
import { loadWeeklyReport } from "@/server/services/reviews/report-data"
import { saveReviewModeAnalysis } from "@/server/services/reviews/mode-snapshots"
import { monthlyReviewsRouter } from "@/server/trpc/routers/monthly-reviews"

let userId:string
const source={kind:"weekly" as const,weekStart:"2024-02-05",conclusion:"Respetar el plan"}
beforeEach(async()=>{userId=await makeUser()})
afterEach(async()=>dropUser(userId))
afterAll(async()=>prisma.$disconnect())
async function envelope(){return prisma.weeklyReview.create({data:{userId,weekLabel:"QA",weekRange:"QA",weekStart:new Date(source.weekStart),weekEnd:new Date("2024-02-11")}})}

it("stamps the selected world on review commitments and rejects reuse in another world",async()=>{
 await envelope()
 const input={id:randomUUID(),source,insightType:"revenge-trading",mode:"DEMO" as const}
 await createReviewCommitment(prisma,userId,input)
 expect((await prisma.commitment.findUniqueOrThrow({where:{id:input.id}})).operationalMode).toBe("DEMO")
 await expect(createReviewCommitment(prisma,userId,{...input,mode:"REAL"})).rejects.toMatchObject({code:"CONFLICT"})
})
it("keeps source practices and commitments apart while conceptual learning stays shared",async()=>{
 await envelope()
 for(const mode of ["REAL","DEMO","BACKTEST"] as const){
  await createReviewCommitment(prisma,userId,{id:randomUUID(),source,insightType:"revenge-trading",mode})
  await prisma.learningPractice.create({data:{userId,title:mode,exercise:"Revisar",date:new Date("2024-02-10"),durationMin:20,kind:"REVIEW",operationalMode:mode,reviewSource:source}})
 }
 await prisma.learningPractice.create({data:{userId,title:"Concepto compartido",exercise:"Lectura",date:new Date("2024-02-10"),durationMin:10,kind:"CONCEPT",reviewSource:source}})
 const result=await loadReviewFollowUp(prisma,userId,source.weekStart,"DEMO")
 expect(result.originActions.commitments).toHaveLength(1)
 expect(result.originActions.practices.map(p=>p.title).sort()).toEqual(["Concepto compartido","DEMO"])
})
it("does not expire a valid analysis when its initially absent blank envelope is created",async()=>{
 const before=await loadWeeklyReport(prisma,userId,source.weekStart,"DEMO")
 await envelope()
 await saveReviewModeAnalysis(prisma,before.snapshot,before.evidenceHash,"Análisis Demo vigente")
 const after=await loadWeeklyReport(prisma,userId,source.weekStart,"DEMO")
 expect(after.saved?.aiAnalysis).toBe("Análisis Demo vigente")
})
it("prefills from the chosen world's trades even without a saved weekly review",async()=>{
 const account=await prisma.account.create({data:{userId,name:"Demo QA",broker:"QA",type:"DEMO_PERSONAL",initialBalance:1000,allowedSymbols:[]}})
 await prisma.trade.create({data:{userId,accountId:account.id,direction:"LONG",symbol:"EURUSD",entry:1.1,stop:1.09,target:1.12,size:1,date:new Date("2024-02-10"),openTime:"09:30",session:"London",tags:[],screenshotUrls:[],status:"CLOSED",pnl:125}})
 const caller=monthlyReviewsRouter.createCaller({prisma,userId,supabase:{} as never})
 const demo=await caller.prefill({year:2024,month:2,mode:"DEMO"})
 expect(demo).toMatchObject({netPnl:125,tradeCount:1,weeklyIds:[]})
 expect((await caller.prefill({year:2024,month:2,mode:"REAL"})).netPnl).toBe(0)
})
