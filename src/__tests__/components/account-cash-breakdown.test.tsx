// @vitest-environment jsdom
import { render, screen, within, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AccountDetailPanel } from '@/app/cuentas/components/account-detail-panel'
import type { RawAccount } from '@/app/cuentas/components/account-card'
import { formatMoney } from '@/lib/format/money'
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}))
vi.mock('@/lib/trpc/client',()=>({trpc:{accounts:{getBalanceVariance:{useQuery:()=>({data:{totalVariance:0}})}}}}))
vi.mock('@/components/ui/mini-sparkline',()=>({MiniSparkline:()=>null}))
vi.mock('@/components/risk/account-risk-panel',()=>({AccountRiskPanel:()=>null}))
afterEach(cleanup)
it.each(['USD','EUR','MXN'])('explains reconciled native %s cash without requiring dashboard statistics', currency=>{
 const account={id:'a',name:'Cuenta conciliada',broker:'B',type:'PERSONAL',status:'ACTIVE',currency,initialBalance:1000,realizedPnl:100,balanceCorrection:-100,paidWithdrawals:200,reservedWithdrawals:50,currentBalance:800,availableBalance:750,allowedSymbols:[],createdAt:'2026-01-01',locked:false} as unknown as RawAccount
 render(<AccountDetailPanel account={account} onClose={()=>{}} />)
 const breakdown=screen.getByRole('region',{name:'Cómo se calcula tu saldo'})
 expect(within(breakdown).getByText('Resultado realizado')).toBeVisible()
 expect(within(breakdown).getByText(formatMoney(100,{currency,decimals:2,signed:true}))).toBeVisible()
 expect(within(breakdown).getByText(formatMoney(-200,{currency,decimals:2,signed:true}))).toBeVisible()
 expect(within(breakdown).getByText(formatMoney(800,{currency,decimals:2}))).toBeVisible()
 expect(within(breakdown).getByText(formatMoney(750,{currency,decimals:2}))).toBeVisible()
})
it('shows negative available cash honestly without clamping it to zero',()=>{
 const account={id:'a',name:'Cuenta',broker:'B',type:'PERSONAL',status:'ACTIVE',currency:'USD',initialBalance:0,realizedPnl:-20,balanceCorrection:0,paidWithdrawals:0,reservedWithdrawals:10,currentBalance:-20,availableBalance:-30,allowedSymbols:[],createdAt:'2026-01-01',locked:false} as unknown as RawAccount
 render(<AccountDetailPanel account={account} onClose={()=>{}} />)
 expect(within(screen.getByRole('region',{name:'Cómo se calcula tu saldo'})).getByText(formatMoney(-30,{decimals:2}))).toBeVisible()
})
