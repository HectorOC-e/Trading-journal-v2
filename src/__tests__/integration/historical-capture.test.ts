import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest"
vi.mock("@/domains/rules/engine", () => ({ runRules: async () => ({blocked:false,addTags:[],removeTags:[]}) }))
vi.mock("@/server/services/behavior/commitment-service", () => ({ evaluateRuledCommitmentsOnTrade: async () => {} }))
vi.mock("@/server/services/intervention/intervention-service", () => ({ runIntervention: async () => {} }))
vi.mock("@/server/services/retrieval/pipeline", () => ({ scheduleEmbedding: () => {} }))
vi.mock("@/domains/analytics/services/analytics-cache", () => ({ isCacheEnabled: () => false, invalidateCache: async () => {} }))
vi.mock("@/server/services/notifications/emit", () => ({ emitNotification: async () => {} }))
import { prisma, makeUser, dropUser } from "./_helpers"
import { createTrade, updateTrade, addTradeEvent } from "@/server/services/trades/trade-write-service"
import { getDashboardStats } from "@/server/services/trades/dashboard-service"
import { realizedRows } from "@/domains/trading/services/realized-history"

let userId: string, accountId: string
beforeEach(async () => {
  userId = await makeUser()
  const account = await prisma.account.create({data:{userId,name:"Historia sintética",broker:"QA",type:"BACKTEST",status:"INACTIVE",locked:true,lockReason:"MANUAL",initialBalance:1000,currency:"USD",timezone:"America/Tegucigalpa",allowedSymbols:[],ddDailyPct:5}})
  accountId = account.id
})
afterEach(async () => { if (userId) await dropUser(userId) })
afterAll(async () => { await prisma.$disconnect() })
const input = () => ({accountId,direction:"LONG" as const,symbol:"X",entry:100,stop:90,target:120,size:1,date:"2024-01-02",openTime:"01:00",session:"New York" as const,tags:[],notes:"",screenshotUrls:[],status:"CLOSED" as const,pnl:100,captureContext:"HISTORICAL" as const,marketTimeZone:"America/Tegucigalpa",marketClosedAt:"2024-01-03T07:00:00Z"})

describe("historical capture against local PostgreSQL", () => {
  it("preserves a manual lock while importing a historical loss", async () => {
    await prisma.account.update({where:{id:accountId},data:{ddTotalPct:5}})
    await createTrade(prisma,userId,{...input(),pnl:-100})
    expect((await prisma.account.findUniqueOrThrow({where:{id:accountId}})).lockReason).toBe("MANUAL")
  })
  it("writes closed history on archived locked accounts, rejects new exposure, and ignores future capital", async () => {
    await createTrade(prisma,userId,{...input(),date:"2025-01-02",marketClosedAt:"2025-01-03T07:00:00Z",pnl:9000})
    const trade = await createTrade(prisma,userId,{...input(),emotionBefore:"calm"})
    expect(trade).toMatchObject({date:"2024-01-02",marketOpenedAt:"2024-01-02T07:00:00.000Z",marketClosedAt:"2024-01-03T07:00:00.000Z",riskPct:1,operationalMode:"BACKTEST",emotionSource:"reconstructed",emotionContext:"MARKET"})
    expect(trade.emotionRecordedAt).toBeTruthy()
    expect((await prisma.account.findUniqueOrThrow({where:{id:accountId}}))).toMatchObject({status:"INACTIVE",locked:true,lockReason:"MANUAL"})
    await expect(createTrade(prisma,userId,{...input(),captureContext:"HISTORICAL",status:"OPEN"})).rejects.toThrow("HISTORICAL_REQUIRES_CLOSED")
    await expect(createTrade(prisma,userId,{...input(),captureContext:"LIVE",status:"OPEN",pnl:undefined})).rejects.toThrow("ACCOUNT_NOT_AVAILABLE")
  })
  it("carries prior equity while preserving trade-date KPI and archived account provenance", async () => {
    await createTrade(prisma,userId,{...input(),date:"2023-12-30",marketClosedAt:"2023-12-31T07:00:00Z",pnl:9000})
    await createTrade(prisma,userId,input())
    const stats = await getDashboardStats(prisma,userId,{mode:"BACKTEST",period:"ALL",from:"2024-01-01",to:"2024-01-31"})
    expect(stats.kpis.netPnl).toBe(100)
    expect(stats.equityCurve[0].balance).toBe(10000)
    expect(stats.equityCurve.at(-1)?.balance).toBe(10100)
    expect(stats.accountStats[0]).toMatchObject({status:"INACTIVE",availableForTrading:false,capitalKind:"SIMULATED"})
  })
  it("keeps partial plus remainder equal to the total and makes corrections traceable", async () => {
    const trade = await createTrade(prisma,userId,{...input(),size:10})
    await addTradeEvent(prisma,userId,{tradeId:trade.id,type:"PARTIAL_CLOSE",price:110,contracts:3,notes:"Parcial histórico",timestamp:"2024-01-02T08:00:00Z"})
    await expect(updateTrade(prisma,userId,{id:trade.id,date:"2024-01-03",openTime:"01:00"})).rejects.toThrow("INVALID_MARKET_SEQUENCE")
    const partial = await prisma.tradeEvent.findFirstOrThrow({where:{tradeId:trade.id,type:"PARTIAL_CLOSE"}})
    await updateTrade(prisma,userId,{id:trade.id,date:"2024-01-03",openTime:"01:00",marketClosedAt:"2024-01-04T07:00:00Z",eventTimestamps:[{id:partial.id,timestamp:"2024-01-03T08:00:00Z"}]})
    const stored = await prisma.trade.findUniqueOrThrow({where:{id:trade.id},include:{events:true}})
    expect(stored.date.toISOString().slice(0,10)).toBe("2024-01-03")
    expect(Number(stored.pnl)).toBe(100)
    expect(realizedRows([stored]).reduce((sum,row)=>sum+row.pnl,0)).toBe(100)
    expect(stored.events.filter(event=>event.type==="NOTE")).toHaveLength(1)
    expect(stored.events.find(event=>event.type==="OPEN")?.timestamp.toISOString()).toBe("2024-01-03T07:00:00.000Z")
  })
})
