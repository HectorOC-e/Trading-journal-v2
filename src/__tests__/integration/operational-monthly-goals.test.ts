import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { prisma, makeUser, dropUser } from "./_helpers"
import { monthlyGoalsRouter } from "@/server/trpc/routers/monthly-goals"
let userId:string
beforeAll(async()=>{userId=await makeUser()})
afterAll(async()=>{if(userId)await dropUser(userId);await prisma.$disconnect()})
describe("monthly goals have one operational cohort",()=>{
  it("does not put a demo goal or an unclassified historical goal into real progress",async()=>{
    const api=monthlyGoalsRouter.createCaller({prisma,userId,supabase:{} as never})
    await prisma.monthlyGoal.create({data:{userId,year:2026,month:11,text:"Objetivo histórico",status:"done"}})
    const demo=await api.add({year:2026,month:11,text:"Practicar en Demo",mode:"DEMO"})
    expect(demo.operationalMode).toBe("DEMO")
    expect(await api.list({year:2026,month:11,mode:"REAL"})).toHaveLength(0)
    expect(await api.list({year:2026,month:11,mode:"DEMO"})).toHaveLength(1)
    await expect(api.setStatus({id:demo.id,status:"done",mode:"REAL"})).rejects.toThrow()
    expect((await api.list({year:2026,month:11,mode:"DEMO"}))[0].status).toBe("pending")
  })
})
