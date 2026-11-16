import { afterEach, beforeEach, expect, it, vi } from "vitest"
vi.mock("@/domains/trading/services/risk-enforcement",()=>({assertTradeable:async()=>{},evaluateAndLock:async()=>null}))
vi.mock("@/domains/rules/engine",()=>({runRules:async()=>({blocked:false,addTags:[],removeTags:[]})}))
vi.mock("@/server/services/behavior/commitment-service",()=>({evaluateRuledCommitmentsOnTrade:async()=>{}}))
vi.mock("@/domains/analytics/services/analytics-cache",()=>({isCacheEnabled:()=>false,invalidateCache:async()=>{}}))
vi.mock("@/server/services/retrieval/pipeline",()=>({scheduleEmbedding:()=>{}}))
vi.mock("@/server/services/trades/serializers",()=>({serializeTrade:(trade:unknown)=>trade}))
vi.mock("@/server/services/memory/memory-episode-service",()=>({recordEpisode:async()=>{}}))
import { addTradeEvent, closeTrade } from "@/server/services/trades/trade-write-service"

beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date("2026-11-16T00:30:00Z"))})
afterEach(()=>vi.useRealTimers())
function journal(context:"LIVE"|"HISTORICAL",operation:"close"|"partial") {
  const account={id:"a",type:"BACKTEST",timezone:"America/Tegucigalpa",initialBalance:1000,locked:false,lockReason:"",ddDailyPct:null,ddTotalPct:null}
  let trade={id:"t",accountId:"a",userId:"u",symbol:"X",direction:"LONG",entry:100,stop:90,size:2,status:context==="HISTORICAL"&&operation==="partial"?"CLOSED":"OPEN",date:new Date("2024-01-02"),captureContext:context==="HISTORICAL"&&operation==="close"?"LIVE":context,marketOpenedAt:new Date("2024-01-02T07:00Z"),marketClosedAt:context==="HISTORICAL"&&operation==="partial"?new Date("2024-01-04T07:00Z"):null,realizedPnl:0,pnl:0,originalRiskMoney:20,originalSize:2,commission:0,account}
  const alerts:Record<string,unknown>[]=[]
  const events:Record<string,unknown>[]=[]
  const lossRows=Array.from({length:3},()=>({pnl:-10,riskPct:1,tags:[],fomoFlag:false,revengeFlag:false}))
  const targetDay=context==="HISTORICAL"?"2024-01-02":"2026-11-15"
  const db={
    $queryRaw:async()=>[], $transaction:async(callback:(tx:unknown)=>unknown)=>callback(db),
    trade:{findUniqueOrThrow:async()=>({...trade,events}),update:async({data}:any)=>(trade={...trade,...data}),findMany:async({where}:any)=>where.date?.toISOString().slice(0,10)===targetDay?lossRows:[]},
    tradeEvent:{create:async({data}:any)=>{events.push(data);return{id:"e",...data}}},
    market:{findFirst:async()=>({pointValue:"1"})},account:{findFirst:async()=>account,findUnique:async()=>account},
    intervention:{count:async()=>0,findFirst:async()=>null,create:async({data}:any)=>{alerts.push(data);return{id:"alert"}}},
  }
  return{db:db as never,alerts}
}
it.each(["close","partial"] as const)("does not turn a historical %s into a persisted current intervention",async operation=>{
  const store=journal("HISTORICAL",operation)
  if(operation==="close") await closeTrade(store.db,"u",{id:"t",closePrice:90,commission:0,captureContext:"HISTORICAL",marketClosedAt:"2024-01-04T07:00:00Z"})
  else await addTradeEvent(store.db,"u",{tradeId:"t",type:"PARTIAL_CLOSE",price:90,contracts:1,notes:"Replay",timestamp:"2024-01-03T07:00:00Z"})
  expect(store.alerts).toEqual([])
})
it.each(["close","partial"] as const)("uses the current account-local day for LIVE %s even with an old Trade.date",async operation=>{
  const store=journal("LIVE",operation)
  if(operation==="close") await closeTrade(store.db,"u",{id:"t",closePrice:90,commission:0})
  else await addTradeEvent(store.db,"u",{tradeId:"t",type:"PARTIAL_CLOSE",price:90,contracts:1,notes:""})
  expect(store.alerts).toHaveLength(1)
  expect(store.alerts[0]).toMatchObject({accountId:"a",operationalMode:"BACKTEST",trigger:"cascade",status:"active"})
})
it("returns the reconciled lock state if a permanent lock appears during the risk read",async()=>{
  const {reconcileTemporalLock}=await vi.importActual<typeof import("@/domains/trading/services/risk-enforcement")>("@/domains/trading/services/risk-enforcement")
  const account={id:"a",type:"PERSONAL",initialBalance:1000,locked:true,lockReason:"DAILY_LOSS_LIMIT",ddModel:null,ddDailyPct:5,ddWeeklyPct:null,ddMonthlyPct:null,ddTotalPct:null}
  const db={trade:{findMany:async()=>{account.lockReason="MANUAL";return[]}}}
  expect(await reconcileTemporalLock(db as never,"u",account,"2026-11-15")).toEqual({locked:true,lockReason:"MANUAL"})
})
