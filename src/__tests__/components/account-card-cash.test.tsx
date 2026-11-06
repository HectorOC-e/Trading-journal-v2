// @vitest-environment jsdom
import { render, cleanup, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AccountCard, type RawAccount, type TradeStats } from '@/app/cuentas/components/account-card'
import { formatMoney } from '@/lib/format/money'
vi.mock('@/lib/trpc/client',()=>({trpc:{accounts:{getBalanceVariance:{useQuery:()=>({data:{totalVariance:0}})}}}}))
vi.mock('@/components/ui/mini-sparkline',()=>({MiniSparkline:()=>null}))
afterEach(cleanup)
it.each([
 ['USD',1000,0,0],
 ['MXN',10000,10100,5],
])('uses authoritative native %s cash including payments and corrections', (currency,initialBalance,currentBalance,netPnl)=>{
 const rawAccount={id:'a',name:'Cash account',broker:'B',type:'PERSONAL',status:'ACTIVE',currency,initialBalance,currentBalance,balanceCorrection:0,allowedSymbols:[],createdAt:'2026-01-01',locked:false} as unknown as RawAccount
 render(<AccountCard rawAccount={rawAccount} selected={false} onClick={()=>{}} stats={{netPnl,sparkline:[],risk:{},tradesTotal:0,drawdownPct:0,tradesMonth:0,tradesToday:0,pnlMonth:0,pnlToday:0,pnlWeek:0,winRate:0,avgR:0} as unknown as TradeStats}/> )
 expect(screen.getByTitle(formatMoney(currentBalance,{currency,decimals:2}))).toBeInTheDocument()
})
