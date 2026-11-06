import {it,expect,vi} from 'vitest'
import {loadAccountRisk,assertTradeable} from '@/domains/trading/services/risk-enforcement'
it('ignores future losses in every risk window and drawdown',async()=>{
 const account={id:'a',type:'PERSONAL',initialBalance:1000,locked:false,lockReason:'',ddDailyPct:5,ddWeeklyPct:5,ddMonthlyPct:5,ddTotalPct:5,ddModel:'FIXED'}
 const db={trade:{findMany:async()=>[{accountId:'a',status:'CLOSED',pnl:-100,date:new Date('2026-11-07'),events:[]}]}}
 expect(await loadAccountRisk(db as never,'u',account as never,'2026-11-06')).toEqual(await loadAccountRisk({trade:{findMany:async()=>[]}} as never,'u',account as never,'2026-11-06'))
})

it('excludes future realizations from the ENFORCE trailing equity curve',async()=>{
 const account={id:'a',type:'PROP_FIRM',initialBalance:1000,locked:false,lockReason:'',ddDailyPct:null,ddWeeklyPct:null,ddMonthlyPct:null,ddTotalPct:5,ddModel:'TRAILING',enforceMode:'ENFORCE'}
 const db={trade:{findMany:async()=>[{accountId:'a',status:'CLOSED',pnl:-100,date:new Date('2026-11-07'),events:[]}]},account:{update:vi.fn().mockResolvedValue({name:'A'})},accountLog:{create:vi.fn()}}
 await expect(assertTradeable(db as never,'u',account,'2026-11-06')).resolves.toBeUndefined()
 expect(db.account.update).not.toHaveBeenCalled()
})
