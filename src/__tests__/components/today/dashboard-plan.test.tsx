// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import DashboardPage from "@/app/dashboard/page"
const state = vi.hoisted(() => ({ loading: true, error: false, planQuery: vi.fn() }))
vi.mock("@/app/dashboard/hooks/use-dashboard-stats", () => ({ useDashboardStats: () => ({ isLoading: state.loading, isError: state.error, accounts: [], stats: { kpis: { netPnl: 0, total: 0, winRate: 0 } } }) }))
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  preferences: { get: { useQuery: () => ({}) }, update: { useMutation: () => ({ mutate: vi.fn() }) } },
  today: { plan: { useQuery: () => { state.planQuery(); return { isLoading: true } } } },
} }))
vi.mock("@/components/today/today-feed", () => ({ TodayFeed: () => <div>Existing signals</div> }))
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
it.each([{ loading: true, error: false }, { loading: false, error: true }, { loading: false, error: false }])("starts the plan independently of dashboard analytics: %j", next => {
  Object.assign(state, next)
  render(<DashboardPage />)
  expect(screen.getByRole("region", { name: "Plan del día" })).toBeInTheDocument()
  expect(state.planQuery).toHaveBeenCalled()
  if (!next.loading && !next.error) expect(screen.getByText("Existing signals")).toBeInTheDocument()
})
