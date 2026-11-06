import { describe,it,expect,vi } from 'vitest'
vi.mock('@/domains/trading/services/risk-enforcement',()=>({assertTradeable:vi.fn(),evaluateAndLock:vi.fn().mockResolvedValue(null)}))
vi.mock('@/domains/analytics/services/analytics-cache',()=>({isCacheEnabled:()=>false,invalidateCache:vi.fn()}))
vi.mock('@/server/services/behavior/commitment-service',()=>({evaluateRuledCommitmentsOnTrade:vi.fn().mockResolvedValue(null)}))
vi.mock('@/server/services/intervention/intervention-service',()=>({runIntervention:vi.fn().mockResolvedValue(null)}))
vi.mock('@/server/services/retrieval/pipeline',()=>({scheduleEmbedding:vi.fn()}))
vi.mock('@/server/services/trades/serializers',()=>({serializeTrade:(t:unknown)=>t}))
import {assertTradeable,evaluateAndLock} from '@/domains/trading/services/risk-enforcement'
import {addTradeEvent,closeTrade,updateTrade} from '@/server/services/trades/trade-write-service'
function store(overrides={}) {
 let trade={id:'t',accountId:'a',userId:'u',symbol:'X',direction:'LONG',entry:100,stop:90,size:2,status:'OPEN',date:new Date('2026-11-05'),pnl:null as number|null,realizedPnl:0 as number|null,originalRiskMoney:20 as number|null,commission:0,account:{initialBalance:1000},...overrides}
 const events:unknown[]=[]
 const db={$queryRaw:vi.fn().mockResolvedValue([]),$transaction:async(fn:(tx:unknown)=>unknown)=>fn(db),trade:{findUniqueOrThrow:async()=>({...trade,events}),update:async({data}:{data:object})=>(trade={...trade,...data})},tradeEvent:{findMany:async()=>events,create:async({data}:{data:object})=>{events.push(data);return{id:'e',...data}}},market:{findFirst:async()=>({pointValue:'1'})},account:{findUnique:async()=>null}}
 return{db:db as never,trade:()=>trade,events}
}
const partial=(contracts=1,price=110)=>({tradeId:'t',type:'PARTIAL_CLOSE' as const,contracts,price,notes:''})
describe('realized portions',()=>{
 it('retains partial and final gross with original R and charges commission once',async()=>{const s=store();await addTradeEvent(s.db,'u',partial());expect(s.trade().pnl).toBe(10);await addTradeEvent(s.db,'u',{tradeId:'t',type:'STOP_MOVE',price:100,notes:''});await closeTrade(s.db,'u',{id:'t',closePrice:120,commission:3});expect(s.trade().pnl).toBe(27);expect(s.trade()).toHaveProperty('rMultiple',1.5)})
 it('keeps partial losses',async()=>{const s=store();await addTradeEvent(s.db,'u',partial(1,90));expect(s.trade().pnl).toBe(-10);await closeTrade(s.db,'u',{id:'t',closePrice:120,commission:0});expect(s.trade().pnl).toBe(10)})
 it('closes a full partial and rejects another close',async()=>{const s=store();await addTradeEvent(s.db,'u',partial(2));expect(s.trade().status).toBe('CLOSED');expect(s.trade().pnl).toBe(20);await expect(closeTrade(s.db,'u',{id:'t',closePrice:120,commission:0})).rejects.toThrow()})
 it.each([[0,110],[-1,110],[3,110],[1,0],[1,NaN]])('rejects invalid quantity/price %s %s',async(q,p)=>{const s=store();await expect(addTradeEvent(s.db,'u',partial(q,p))).rejects.toThrow();expect(s.trade().size).toBe(2);expect(s.events).toHaveLength(0)})
 it('refuses ambiguous legacy history',async()=>{const s=store({realizedPnl:null,originalRiskMoney:null});s.events.push({type:'PARTIAL_CLOSE',price:null,contracts:1});await expect(addTradeEvent(s.db,'u',partial())).rejects.toThrow('PARTIAL_HISTORY_REQUIRES_REVIEW')})
 it('preserves previously booked commissions when no new commission is supplied',async()=>{const s=store({commission:3});await addTradeEvent(s.db,'u',partial());expect(s.trade().pnl).toBe(7);await closeTrade(s.db,'u',{id:'t',closePrice:120,commission:0});expect(s.trade().pnl).toBe(27);expect(s.trade().commission).toBe(3)})

 it('rejects manual monetary edits after partial realization',async()=>{const s=store();await addTradeEvent(s.db,'u',partial());await expect(updateTrade(s.db,'u',{id:'t',pnl:100})).rejects.toThrow('PARTIAL_ACCOUNTING_EDIT');expect(s.trade().pnl).toBe(10)})

 it('snapshots ordinary legacy risk before a stop edit',async()=>{const s=store({realizedPnl:null,originalRiskMoney:null});await addTradeEvent(s.db,'u',{tradeId:'t',type:'STOP_MOVE',price:100,notes:''});await addTradeEvent(s.db,'u',partial());await closeTrade(s.db,'u',{id:'t',closePrice:120,commission:0});expect(s.trade()).toHaveProperty('rMultiple',1.5)})

 it('rejects arbitrary OPEN P&L edits before any partial',async()=>{const s=store();await expect(updateTrade(s.db,'u',{id:'t',pnl:100})).rejects.toThrow('OPEN_PNL_NOT_REALIZED');expect(s.trade().pnl).toBeNull()})
 it.each([{entry:110},{stop:95},{size:1},{rMultiple:2}])('refuses snapshot initialization through legacy OPEN monetary edit %j',async(patch)=>{const s=store({pnl:100,realizedPnl:null,originalRiskMoney:null});await expect(updateTrade(s.db,'u',{id:'t',...patch})).rejects.toThrow('PARTIAL_HISTORY_REQUIRES_REVIEW');expect(s.trade().realizedPnl).toBeNull();expect(s.trade().pnl).toBe(100)})
 it('preserves ambiguous legacy OPEN P&L rather than replacing its cash history',async()=>{const s=store({pnl:100,realizedPnl:null,originalRiskMoney:null});await expect(addTradeEvent(s.db,'u',partial())).rejects.toThrow('PARTIAL_HISTORY_REQUIRES_REVIEW');expect(s.trade().pnl).toBe(100);expect(s.events).toHaveLength(0)})

})

it('corrects initial size and risk before management',async()=>{const s=store({size:1,originalSize:1,originalRiskMoney:10});await updateTrade(s.db,'u',{id:'t',size:2});await closeTrade(s.db,'u',{id:'t',closePrice:110,commission:0});expect(s.trade()).toMatchObject({originalSize:2,originalRiskMoney:20,pnl:20,rMultiple:1})})
it('rejects locked scale-in while allowing reductions',async()=>{const s=store();vi.mocked(assertTradeable).mockRejectedValueOnce(new Error('ACCOUNT_LOCKED:MANUAL'));await expect(addTradeEvent(s.db,'u',{tradeId:'t',type:'SCALE_IN',price:100,contracts:1,notes:''})).rejects.toThrow('ACCOUNT_LOCKED:MANUAL');expect(s.trade().size).toBe(2);expect(s.events).toHaveLength(0);await addTradeEvent(s.db,'u',partial());expect(s.trade().size).toBe(1)})
it('rejects scale-in exceeding daily risk budget',async()=>{vi.mocked(assertTradeable).mockReset();const s=store({account:{initialBalance:1000,ddDailyPct:5}});Object.assign((s.db as any).trade,{findMany:async()=>[]});await expect(addTradeEvent(s.db,'u',{tradeId:'t',type:'SCALE_IN',price:100,contracts:6,notes:''})).rejects.toThrow();expect(s.trade().size).toBe(2);expect(s.events).toHaveLength(0)})

it('uses the current account-local day for scale-in despite caller event date',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-06T00:30:00Z'))
 try {
  const actual=await vi.importActual<typeof import('@/domains/trading/services/risk-enforcement')>('@/domains/trading/services/risk-enforcement')
  vi.mocked(assertTradeable).mockImplementationOnce(actual.assertTradeable)
  const s=store({account:{initialBalance:1000,timezone:'America/Tegucigalpa',locked:true,lockReason:'DAILY_LOSS_LIMIT',ddDailyPct:5}})
  Object.assign((s.db as any).trade,{findMany:async()=>[{accountId:'a',status:'CLOSED',pnl:-100,date:new Date('2026-11-05'),events:[]}]})
  Object.assign(s.db,{account:{update:async()=>({name:'A'})},accountLog:{create:async()=>({})}})
  await expect(addTradeEvent(s.db,'u',{tradeId:'t',type:'SCALE_IN',price:100,contracts:1,notes:'',timestamp:'2026-11-07T12:00:00Z'})).rejects.toThrow('ACCOUNT_LOCKED:DAILY_LOSS_LIMIT')
  expect(s.trade().size).toBe(2);expect(s.events).toHaveLength(0)
 }finally{vi.useRealTimers()}
})

it.each(['update','close','partial'])('does not let future %s metadata lock the account today',async(kind)=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-06T00:30:00Z'))
 const actual=await vi.importActual<typeof import('@/domains/trading/services/risk-enforcement')>('@/domains/trading/services/risk-enforcement')
 vi.mocked(evaluateAndLock).mockImplementation(actual.evaluateAndLock)
 try{
  const account={id:'a',type:'PERSONAL',timezone:'America/Tegucigalpa',initialBalance:1000,locked:false,lockReason:'',ddDailyPct:null,ddWeeklyPct:null,ddMonthlyPct:null,ddTotalPct:5,ddModel:'FIXED'}
  const s=store({account,date:new Date('2026-11-06'),status:kind==='update'?'CLOSED':'OPEN'})
  const writes=vi.fn(async({data}:any)=>Object.assign(account,data,{name:'A'}))
  Object.assign(s.db,{account:{findUnique:async()=>account,update:writes},accountLog:{create:vi.fn()}})
  Object.assign((s.db as any).trade,{findMany:async()=>[{...s.trade(),events:s.events}]})
  if(kind==='update')await updateTrade(s.db,'u',{id:'t',pnl:-100})
  if(kind==='close')await closeTrade(s.db,'u',{id:'t',closePrice:50,commission:0})
  if(kind==='partial')await addTradeEvent(s.db,'u',{...partial(2,50),timestamp:'2026-11-06T12:00:00Z'})
  expect(account.locked).toBe(false);expect(writes).not.toHaveBeenCalled()
 }finally{vi.mocked(evaluateAndLock).mockReset();vi.useRealTimers()}
})
