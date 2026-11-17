import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { prisma, makeUser, dropUser } from "./_helpers"
import { loadWeeklyReport, loadMonthlyReport } from "@/server/services/reviews/report-data"
import { saveReviewModeAnalysis } from "@/server/services/reviews/mode-snapshots"

let userId:string
beforeAll(async()=>{
  userId=await makeUser()
  for(const [type,pnl] of [["PERSONAL",100],["DEMO_PERSONAL",500],["BACKTEST",-200]] as const){
    const account=await prisma.account.create({data:{userId,name:type,broker:"QA",type,initialBalance:1000,allowedSymbols:[]}})
    await prisma.trade.create({data:{userId,accountId:account.id,direction:"LONG",symbol:"EURUSD",entry:1.1,stop:1.09,target:1.12,size:1,date:new Date("2024-02-10T00:00:00Z"),openTime:"09:30",session:"London",tags:[],screenshotUrls:[],status:"CLOSED",pnl,rMultiple:pnl/100}})
  }
  await prisma.weeklyReview.create({data:{userId,weekLabel:"QA",weekRange:"QA",weekStart:new Date("2024-02-05"),weekEnd:new Date("2024-02-11"),disciplineScore:99,aiAnalysis:"Análisis antiguo mezclado",executiveSummary:"Nota histórica del usuario"}})
})
afterAll(async()=>{if(userId)await dropUser(userId);await prisma.$disconnect()})
describe("review reports use the same independent cohorts",()=>{
  it.each([["REAL",100],["DEMO",500],["BACKTEST",-200]] as const)("keeps weekly and monthly %s results isolated",async(mode,pnl)=>{
    const weekly=await loadWeeklyReport(prisma,userId,"2024-02-05",mode)
    const monthly=await loadMonthlyReport(prisma,userId,2024,2,mode)
    expect(weekly.report.kpis.netPnl).toBe(pnl)
    expect(monthly.report.kpis.netPnl).toBe(pnl)
    expect(weekly.report.kpis.trades).toBe(1)
    expect(weekly.saved?.executiveSummary).toBe("Nota histórica del usuario")
    expect(weekly.saved?.aiAnalysis).toBeNull()
    expect(weekly.report.kpis.disciplineScore).not.toBe(99)
  })
  it("does not invalidate a real analysis when only a demo trade changes",async()=>{
    const before=await loadWeeklyReport(prisma,userId,"2024-02-05","REAL")
    await saveReviewModeAnalysis(prisma,before.snapshot,before.evidenceHash,"Análisis exclusivo de Real")
    const demo=await prisma.trade.findFirstOrThrow({where:{userId,operationalMode:"DEMO"}})
    await prisma.trade.update({where:{id:demo.id},data:{pnl:900}})
    const after=await loadWeeklyReport(prisma,userId,"2024-02-05","REAL")
    expect(after.saved?.aiAnalysis).toBe("Análisis exclusivo de Real")
  })
  it("rejects an analysis generated before the source trade changed",async()=>{
    const before=await loadWeeklyReport(prisma,userId,"2024-02-05","REAL")
    const real=await prisma.trade.findFirstOrThrow({where:{userId,operationalMode:"REAL"}})
    await prisma.trade.update({where:{id:real.id},data:{pnl:120}})
    await expect(saveReviewModeAnalysis(prisma,before.snapshot,before.evidenceHash,"Obsoleto")).rejects.toMatchObject({code:"CONFLICT"})
    expect((await loadWeeklyReport(prisma,userId,"2024-02-05","REAL")).saved?.aiAnalysis).toBeNull()
  })
  it("rejects a late analysis when the reporting currency changed",async()=>{
    const before=await loadWeeklyReport(prisma,userId,"2024-02-05","REAL")
    await prisma.user.update({where:{id:userId},data:{baseCurrency:"EUR"}})
    await expect(saveReviewModeAnalysis(prisma,before.snapshot,before.evidenceHash,"Divisa obsoleta")).rejects.toMatchObject({code:"CONFLICT"})
  })
})
