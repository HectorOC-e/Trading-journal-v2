import {it,expect} from 'vitest'
import {realizedRows} from '@/domains/trading/services/realized-history'
it('attributes partial loss to realization date without duplicating it at final close',()=>{
 const partial={timestamp:new Date('2026-11-05T11:00Z'),realizedPnl:-10}
 expect(realizedRows([{pnl:10,status:'CLOSED',date:new Date('2026-11-01'),events:[partial]}])).toEqual([{accountId:undefined,pnl:20,date:new Date('2026-11-01')},{accountId:undefined,pnl:-10,date:new Date("2026-11-05T00:00Z")}])
 expect(realizedRows([{pnl:-10,status:'OPEN',date:new Date('2026-11-01'),events:[partial]}])).toEqual([{accountId:undefined,pnl:-10,date:new Date("2026-11-05T00:00Z")}])
})
it('uses account local trading day near UTC midnight',()=>{
 const rows=realizedRows([{accountId:'a',status:'OPEN',pnl:-10,date:new Date('2026-11-01'),events:[{realizedPnl:-10,timestamp:new Date('2026-11-05T01:00Z')}]}],new Map([['a','America/New_York']]))
 expect(rows[0].date.toISOString()).toBe('2026-11-04T00:00:00.000Z')
})
it('preserves existing unmatched OPEN journal P&L in risk history without inventing events',()=>{
 expect(realizedRows([{accountId:'a',pnl:100,status:'OPEN',date:new Date('2026-11-01'),events:[]}])).toEqual([{accountId:'a',pnl:100,date:new Date('2026-11-01')}])
})
it('does not invent fractional-cent remainder from decimal addition',()=>{
 const rows=realizedRows([{accountId:'a',pnl:0.3,status:'OPEN',date:new Date('2026-11-01'),events:[{realizedPnl:0.1,timestamp:new Date('2026-11-05')},{realizedPnl:0.2,timestamp:new Date('2026-11-06')}]}])
 expect(rows).toHaveLength(2)
})
