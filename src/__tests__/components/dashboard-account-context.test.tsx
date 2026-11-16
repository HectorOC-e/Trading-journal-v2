// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { TabOperador } from "@/app/dashboard/tabs/tab-operador"
import { TabPortfolio } from "@/app/dashboard/tabs/tab-portfolio"
import { ChartTooltip } from "@/app/dashboard/components/chart-tooltip"
import { useDashboardStats } from "@/app/dashboard/hooks/use-dashboard-stats"
const queries=vi.hoisted(()=>({accounts:vi.fn()}))
vi.mock("recharts",async importActual=>({...await importActual<any>(),ResponsiveContainer:()=>null}))
vi.mock("@/lib/operational-mode-store",()=>({useOperationalMode:(select:any)=>select({mode:"REAL"})}))
vi.mock("@/lib/trpc/client",()=>({trpc:{goals:{get:{useQuery:()=>({})}},trades:{dashboardStats:{useQuery:()=>({data:{}})}},accounts:{list:{useQuery:(input:any)=>{queries.accounts(input);return{data:[{id:"h",type:"PERSONAL",status:"INACTIVE"}]}}}}}}))
const scope={mode:"REAL",dateBasis:"TRADE_DATE",equityDateBasis:"REALIZATION_DATE",legacyRealizationFallback:true,includeArchived:true,excludedCurrencies:[]}
const accountStats=[
 {accountId:"p",balance:1100,capitalKind:"PERSONAL",availableForTrading:true,status:"ACTIVE"},
 {accountId:"e",balance:100000,capitalKind:"EVALUATION",availableForTrading:true,status:"ACTIVE"},
 {accountId:"h",balance:9000,capitalKind:"PERSONAL",availableForTrading:false,status:"INACTIVE"},
].map(account=>({...account,pnlToday:2,pnlMonth:10,winRate:100,drawdownPct:0,sparkline:[account.balance]}))
const accounts=[{id:"p",name:"Personal",type:"PERSONAL",status:"ACTIVE",initialBalance:2000},{id:"e",name:"Evaluación",type:"PROP_FIRM",status:"ACTIVE",initialBalance:100000},{id:"h",name:"Histórica",type:"PERSONAL",status:"INACTIVE",initialBalance:9000}]
const kpis={netPnl:100,wins:1,total:1,winRate:100,avgR:1,profitFactor:999,sharpeRatio:null,expectancyDollar:100,bestDay:null,worstDay:null,tradeStreak:null,tradesCountWeek:1}
afterEach(cleanup)
it("loads archived account metadata for historical names and contextual labels",()=>{
 const {result}=renderHook(()=>useDashboardStats("ALL"))
 expect(queries.accounts).toHaveBeenCalledWith({includeInactive:true})
 expect(result.current.accounts[0]).toMatchObject({id:"h",status:"INACTIVE"})
})
it("keeps archived operator cards inspectable without a consolidated available balance or USD labels",()=>{
 render(<TabOperador {...{kpis,accountStats,accounts,scope,baseCurrency:"EUR",equityCurve:[],sessionStats:[],pnlBySymbol:[],hourStats:[],recentTrades:[],executionStats:{avgDurationMinutes:null,avgPlannedRisk:null,avgPlannedReward:null,riskRewardRatio:null},period:"ALL",onPeriodChange:vi.fn()} as any} />)
 expect(screen.queryByText(/portfolio consolidado/)).not.toBeInTheDocument()
 expect(screen.getByText("Histórico · no disponible")).toBeInTheDocument()
 expect(screen.getByText("Evaluación · nominal")).toBeInTheDocument()
 expect(screen.queryByText(/USD/)).not.toBeInTheDocument()
 fireEvent.click(screen.getByRole("button",{name:/Histórica/}))
 expect(screen.getByText("Equity · Histórica")).toBeInTheDocument()
 expect(screen.getAllByText("€9,000.00").length).toBeGreaterThan(0)
})
it("weights personal allocation with converted available capital while retaining archived comparison rows",()=>{
 render(<TabPortfolio {...{kpis,accountStats,accounts,scope,baseCurrency:"EUR",equityCurve:[],pnlByDate:[],propFirmStatus:[],discipline:{weeklyScore:[]},period:"ALL",onPeriodChange:vi.fn()} as any} />)
 expect(screen.getByText("100%")).toBeInTheDocument()
 expect(screen.getByText("Histórico · no disponible")).toBeInTheDocument()
 expect(screen.getByText("Últimas 15 sesiones · EUR")).toBeInTheDocument()
})
it("formats monetary chart tooltips with the selected base currency",()=>{
 render(<ChartTooltip active label="02 ene" currency="EUR" payload={[{dataKey:"pnl",name:"P&L",value:2000,color:"red"}]} />)
 expect(screen.getByText("P&L: €2,000")).toBeInTheDocument()
})
