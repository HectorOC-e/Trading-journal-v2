// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { computeAccountRisk } from "@/domains/trading/services/risk-engine"
import { DailyPlan } from "@/components/today/daily-plan"
const query = vi.hoisted(() => ({ data: undefined as unknown, isLoading: true, isError: false, refetch: vi.fn() }))
vi.mock("@/lib/trpc/client", () => ({ trpc: { today: { plan: { useQuery: () => query } } } }))
afterEach(() => { cleanup(); query.data = undefined; query.isLoading = true; query.isError = false; vi.clearAllMocks() })
describe("daily plan card", () => {
  it("shows loading and retry instead of hiding failures", () => {
    const { rerender } = render(<DailyPlan />)
    expect(screen.getByText("Cargando plan…")).toBeInTheDocument()
    query.isLoading = false; query.isError = true
    rerender(<DailyPlan />)
    fireEvent.click(screen.getByRole("button", { name: "Reintentar plan" }))
    expect(query.refetch).toHaveBeenCalledOnce()
  })
  it("keeps empty states and the practice registration action visible", () => {
    query.isLoading = false
    query.data = { today: "2026-11-07", timezone: "UTC", commitments: [], accounts: [], resources: [], sessions: [], practices: { sessions: 0, minutes: 0, href: "/aprendizaje?tab=practicas&register=1" } }
    render(<DailyPlan />)
    expect(screen.getByText("Sin compromisos vigentes.")).toBeInTheDocument()
    expect(screen.getByText("Sin cuentas reales activas.")).toBeInTheDocument()
    expect(screen.getByText("Sin repasos pendientes.")).toBeInTheDocument()
    expect(screen.getByText("Sin sesiones programadas.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Registrar práctica" })).toHaveAttribute("href", "/aprendizaje?tab=practicas&register=1")
  })
  it("shows actual configured daily risk and database locks, with no invented zero before metrics load", () => {
    query.isLoading = false
    query.data = { today: "2026-11-07", timezone: "UTC", commitments: [], accounts: [{ id: "a", name: "Real", locked: true, lockReason: "MANUAL", href: "/cuentas" }], resources: [], sessions: [], practices: { sessions: 0, minutes: 0, href: "/aprendizaje?tab=practicas&register=1" } }
    const { rerender } = render(<DailyPlan />)
    expect(screen.getByText("Bloqueada")).toBeInTheDocument()
    expect(screen.getByText("Revisar límites del día")).toBeInTheDocument()
    expect(screen.queryByText(/0%/)).not.toBeInTheDocument()
    const risk = computeAccountRisk({ initialBalance: 1000, ddDailyPct: 5, ddWeeklyPct: null, ddMonthlyPct: null, ddTotalPct: null, dayPnl: -60, weekPnl: -60, monthPnl: -60, maxDrawdown: 60 })
    rerender(<DailyPlan accountStats={[{ accountId: "a", risk }]} />)
    expect(screen.getByText("Pérdida diaria: 6% / límite 5%")).toBeInTheDocument()
    expect(screen.getByText("En riesgo")).toBeInTheDocument()
  })
  it("renders supplied links, plan timing and commitment periods", () => {
    query.isLoading = false
    query.data = { today: "2026-11-07", timezone: "UTC", commitments: [{ id: "c", title: "Disciplina", start: "2026-11-02", end: "2026-11-08", href: "/analytics" }], accounts: [{ id: "a", name: "Real", href: "/cuentas" }], resources: [{ id: "r", title: "Libro", reason: "Marcado por ti", href: "/aprendizaje?tab=repaso&resource=r" }], sessions: [{ id: "s", title: "Estudio", date: "2026-11-06", timing: "overdue", minutes: 20, href: "/aprendizaje?tab=hoy" }], practices: { sessions: 2, minutes: 40, href: "/aprendizaje?tab=practicas&register=1" } }
    render(<DailyPlan />)
    expect(screen.getByText(/02 nov.*08 nov/)).toBeInTheDocument()
    expect(screen.getByText(/Pendiente anterior/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Libro/ })).toHaveAttribute("href", "/aprendizaje?tab=repaso&resource=r")
    expect(screen.getByText(/2 prácticas.*40 min/)).toBeInTheDocument()
  })
})
