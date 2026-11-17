import {afterAll,afterEach,beforeEach,describe,expect,it} from "vitest"
import {prisma,makeUser,dropUser} from "./_helpers"
let userId:string,tradeId:string,practiceId:string
beforeEach(async()=>{
  userId=await makeUser()
  const account=await prisma.account.create({data:{userId,name:"Demo",broker:"QA",type:"DEMO_PERSONAL",allowedSymbols:[]}})
  const trade=await prisma.trade.create({data:{userId,accountId:account.id,direction:"LONG",symbol:"EURUSD",entry:1.1,stop:1.09,target:1.12,size:1,date:new Date("2024-02-10"),openTime:"09:30",session:"London",tags:[],screenshotUrls:[],status:"CLOSED",pnl:100}})
  tradeId=trade.id
  const practice=await prisma.learningPractice.create({data:{userId,title:"Ejercicio",date:new Date("2026-11-15"),durationMin:30,exercise:"Validar entrada",kind:"EXECUTION",operationalMode:"DEMO"}})
  practiceId=practice.id
  await prisma.practiceTradeLink.create({data:{userId,practiceId,tradeId,role:"EXECUTED"}})
})
afterEach(async()=>{await dropUser(userId)})
afterAll(async()=>{await prisma.$disconnect()})
describe("evidence invalidation preserves economic writes",()=>{
  it("changes trade P&L while invalidating linked feedback",async()=>{
    const prior=await prisma.learningPractice.findUniqueOrThrow({where:{id:practiceId}})
    await prisma.trade.update({where:{id:tradeId},data:{pnl:200}})
    expect(Number((await prisma.trade.findUniqueOrThrow({where:{id:tradeId}})).pnl)).toBe(200)
    expect((await prisma.learningPractice.findUniqueOrThrow({where:{id:practiceId}})).version).toBeGreaterThan(prior.version)
  })
  it("deleting a practice never deletes its operational evidence",async()=>{
    await prisma.learningPractice.delete({where:{id:practiceId}})
    expect(await prisma.trade.findUnique({where:{id:tradeId}})).not.toBeNull()
    expect(await prisma.practiceTradeLink.count({where:{tradeId}})).toBe(0)
  })
})
