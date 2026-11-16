// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import DashboardPage from "@/app/dashboard/page"
const state = vi.hoisted(() => ({ loading: true, error: false, mode:"REAL", planQuery: vi.fn(), feedQuery:vi.fn() }))
vi.mock("@/lib/operational-mode-store",()=>({useOperationalMode:(select:any)=>select({mode:state.mode})}))
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()})}))
vi.mock("@/app/dashboard/hooks/use-dashboard-stats", () => ({ useDashboardStats: () => ({ isLoading: state.loading, isError: state.error, mode:state.mode, accounts: [], stats: { scope:{mode:state.mode,dateBasis:"TRADE_DATE",equityDateBasis:"REALIZATION_DATE",legacyRealizationFallback:false,excludedCurrencies:[],includeArchived:true},baseCurrency:"EUR",accountStats:[],kpis: { netPnl: 0, total: 0, winRate: 0 } } }) }))
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  preferences: { get: { useQuery: () => ({}) }, update: { useMutation: () => ({ mutate: vi.fn() }) } },
  today: { plan: { useQuery: (input:any) => { state.planQuery(input); return { isLoading: true } } },feed:{useQuery:(input:any)=>{state.feedQuery(input);return{data:{feed:[{id:"signal",kind:"insight",severity:"info",title:"Señal de la modalidad",body:"Evidencia del ámbito",cta:null}],budget:null},isLoading:false}}},dismiss:{useMutation:()=>({mutate:vi.fn()})} },
  useUtils:()=>({today:{feed:{invalidate:vi.fn()}}}),
} }))
vi.mock("@/components/trades/operational-comparison",()=>({OperationalComparison:()=>null}))
vi.mock("@/components/layout/top-bar", () => ({ TopBar: () => null }))
vi.mock("@/components/ui/filter-bar", () => ({ FilterBar: () => null }))
vi.mock("@/components/ui/segmented-tabs", () => ({ SegmentedTabs: () => null }))
vi.mock("@/components/ui/practice-toggle", () => ({ PracticeToggle: () => null }))
vi.mock("@/components/ui/skeleton", () => ({ SkeletonKpiStrip: () => null }))
vi.mock("@/components/onboarding/onboarding-welcome", () => ({ OnboardingWelcome: () => null }))
vi.mock("@/components/onboarding/onboarding-checklist", () => ({ OnboardingChecklist: () => null }))
vi.mock("@/app/dashboard/tabs/tab-portfolio", () => ({ TabPortfolio: () => null }))
vi.mock("@/app/dashboard/tabs/tab-operador", () => ({ TabOperador: () => null }))
vi.mock("@/app/dashboard/tabs/tab-disciplina", () => ({ TabDisciplina: () => null }))
vi.mock("@/app/dashboard/tabs/tab-playbook", () => ({ TabPlaybook: () => null }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
it.each(["REAL","DEMO","BACKTEST"].flatMap(mode=>[{ mode,loading: true, error: false }, { mode,loading: false, error: true }, { mode,loading: false, error: false }]))("starts the plan independently of dashboard analytics in every mode: %j", next => {
  Object.assign(state, next)
  render(<DashboardPage />)
  expect(screen.getByRole("region", { name: "Plan del día" })).toBeInTheDocument()
  expect(state.planQuery).toHaveBeenCalledWith({mode:next.mode})
  if (!next.loading && !next.error) {
    expect(screen.getByRole("region",{name:"Hoy"})).toBeInTheDocument()
    expect(screen.getByText("Señal de la modalidad")).toBeInTheDocument()
    expect(state.feedQuery).toHaveBeenCalledWith({mode:next.mode})
  }
})
