import { describe,it,expect,vi } from 'vitest'
vi.mock('@/domains/trading/services/risk-enforcement',()=>({assertTradeable:vi.fn(),evaluateAndLock:vi.fn().mockResolvedValue(null)}))
vi.mock('@/domains/analytics/services/analytics-cache',()=>({isCacheEnabled:()=>false,invalidateCache:vi.fn()}))
vi.mock('@/server/services/behavior/commitment-service',()=>({evaluateRuledCommitmentsOnTrade:vi.fn().mockResolvedValue(null)}))
vi.mock('@/server/services/intervention/intervention-service',()=>({runIntervention:vi.fn().mockResolvedValue(null)}))
vi.mock('@/server/services/retrieval/pipeline',()=>({scheduleEmbedding:vi.fn()}))
vi.mock('@/server/services/trades/serializers',()=>({serializeTrade:(t:unknown)=>t}))
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

 it('snapshots ordinary legacy risk before a stop edit',async()=>{const s=store({realizedPnl:null,originalRiskMoney:null});await updateTrade(s.db,'u',{id:'t',stop:100});await addTradeEvent(s.db,'u',partial());await closeTrade(s.db,'u',{id:'t',closePrice:120,commission:0});expect(s.trade()).toHaveProperty('rMultiple',1.5)})

 it('rejects arbitrary OPEN P&L edits before any partial',async()=>{const s=store();await expect(updateTrade(s.db,'u',{id:'t',pnl:100})).rejects.toThrow('OPEN_PNL_NOT_REALIZED');expect(s.trade().pnl).toBeNull()})
 it.each([{entry:110},{stop:95},{size:1},{rMultiple:2}])('refuses snapshot initialization through legacy OPEN monetary edit %j',async(patch)=>{const s=store({pnl:100,realizedPnl:null,originalRiskMoney:null});await expect(updateTrade(s.db,'u',{id:'t',...patch})).rejects.toThrow('PARTIAL_HISTORY_REQUIRES_REVIEW');expect(s.trade().realizedPnl).toBeNull();expect(s.trade().pnl).toBe(100)})
 it('preserves ambiguous legacy OPEN P&L rather than replacing its cash history',async()=>{const s=store({pnl:100,realizedPnl:null,originalRiskMoney:null});await expect(addTradeEvent(s.db,'u',partial())).rejects.toThrow('PARTIAL_HISTORY_REQUIRES_REVIEW');expect(s.trade().pnl).toBe(100);expect(s.events).toHaveLength(0)})

})
