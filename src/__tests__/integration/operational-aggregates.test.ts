import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { prisma, makeUser, dropUser } from "./_helpers"
import { getDashboardStats } from "@/server/services/trades/dashboard-service"
import { buildAnalyticsBundle } from "@/domains/analytics/services/analytics-bundle"
import { getInstrumentEdges } from "@/server/services/analytics/edge-service"
import type { OperationalMode } from "@/domains/trading/operational-mode"

let userId: string
const accounts: Record<string, string> = {}
beforeAll(async () => {
  userId = await makeUser()
  for (const [type, pnl] of [["PERSONAL",100],["DEMO_PERSONAL",500],["BACKTEST",-200]] as const) {
    const account = await prisma.account.create({data:{userId,name:type,broker:"QA",type,initialBalance:1000,allowedSymbols:[]}})
    accounts[type] = account.id
    await prisma.trade.create({data:{userId,accountId:account.id,direction:"LONG",symbol:"EURUSD",entry:1.1,stop:1.09,target:1.12,size:1,date:new Date("2024-02-10T00:00:00Z"),openTime:"09:30",session:"London",tags:[],screenshotUrls:[],status:"CLOSED",pnl,rMultiple:pnl/100}})
  }
})
afterAll(async () => { if(userId)await dropUser(userId); await prisma.$disconnect() })

describe("isolated operational aggregates on PostgreSQL", () => {
  it.each([["REAL",100],["DEMO",500],["BACKTEST",-200]] as const)("keeps Dashboard, Analytics and Edges in %s", async (mode, pnl) => {
    const dash = await getDashboardStats(prisma,userId,{period:"ALL",mode})
    const analytics = await buildAnalyticsBundle(userId,prisma,undefined,mode)
    const edges = await getInstrumentEdges(prisma,userId,mode)
    expect(dash.kpis.netPnl).toBe(pnl)
    expect(analytics.performance.netPnl).toBe(pnl)
    expect(analytics.raw.allTrades).toHaveLength(1)
    expect(edges.totalNetPnl).toBe(pnl)
  })
  it("rejects a selected account from another modality rather than expanding the scope", async () => {
    await expect(getDashboardStats(prisma,userId,{period:"ALL",mode:"REAL",accountId:accounts.DEMO_PERSONAL})).rejects.toMatchObject({code:"BAD_REQUEST"})
  })
  it("does not offer a legacy flag that mixes real and simulated results", async () => {
    await expect(getDashboardStats(prisma,userId,{period:"ALL",includePractice:true})).rejects.toMatchObject({code:"BAD_REQUEST"})
  })
  it("keeps archived performance without treating an unknown FX rate as USD", async () => {
    await prisma.account.update({where:{id:accounts.PERSONAL},data:{status:"INACTIVE"}})
    expect((await getDashboardStats(prisma,userId,{period:"ALL",mode:"REAL"})).kpis.netPnl).toBe(100)
    const foreign=await prisma.account.create({data:{userId,name:"Unknown FX",broker:"QA",type:"PERSONAL",currency:"ZAR",initialBalance:1000,allowedSymbols:[]}})
    await prisma.trade.create({data:{userId,accountId:foreign.id,direction:"LONG",symbol:"EURUSD",entry:1.1,stop:1.09,target:1.12,size:1,date:new Date("2024-02-10T00:00:00Z"),openTime:"09:30",session:"London",tags:[],screenshotUrls:[],status:"CLOSED",pnl:50000}})
    const dash=await getDashboardStats(prisma,userId,{period:"ALL",mode:"REAL"})
    const analytics=await buildAnalyticsBundle(userId,prisma,undefined,"REAL")
    expect(dash.kpis.netPnl).toBe(100)
    expect(analytics.performance.netPnl).toBe(100)
    expect(dash.scope.excludedCurrencies).toEqual(["ZAR"])
    await prisma.account.delete({where:{id:foreign.id}})
    await prisma.account.update({where:{id:accounts.PERSONAL},data:{status:"ACTIVE"}})
  })
  it("does not discard real trades or truncate practice aggregates after 1100 backtests", async () => {
    await prisma.trade.createMany({data:Array.from({length:1100},(_,i)=>({userId,accountId:accounts.BACKTEST,direction:"LONG",symbol:"EURUSD",entry:1.1,stop:1.09,target:1.12,size:1,date:new Date("2020-01-01T00:00:00Z"),openTime:"09:30",session:"London",tags:[],screenshotUrls:[],status:"CLOSED",pnl:1,notes:`old-${i}`}))})
    for (const mode of ["REAL","BACKTEST"] as OperationalMode[]) {
      const out=await buildAnalyticsBundle(userId,prisma,undefined,mode)
      expect(out.performance.totalTrades).toBe(mode==="REAL"?1:1101)
      expect(out.performance.netPnl).toBe(mode==="REAL"?100:900)
    }
  })
})
