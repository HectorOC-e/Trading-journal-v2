// @vitest-environment jsdom
import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SetupValidationRoute } from "@/components/playbook/setup-validation-route"

const state = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  create: vi.fn(),
  updatePolicy: vi.fn(),
  retry: vi.fn(),
  invalidate: vi.fn(),
}))

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({ playbook: {
      validationOverview: { invalidate: state.invalidate },
      validationHistory: { invalidate: state.invalidate },
    } }),
    playbook: {
      validationOverview: { useQuery: () => ({ ...state.query, refetch: state.retry }) },
      createValidationDecision: { useMutation: (options: { onSuccess?: () => void }) => ({
        mutate: (input: unknown) => { state.create(input); options.onSuccess?.() },
        isPending: false,
        error: null,
      }) },
      updateValidationPolicy: { useMutation: (options: { onSuccess?: () => void }) => ({
        mutate: (input: unknown) => { state.updatePolicy(input); options.onSuccess?.() },
        isPending: false,
        error: null,
      }) },
    },
  },
}))

const policy = {
  version: 1,
  backtestMinClosed: 30,
  backtestMinRCoveragePct: 80,
  backtestMinChecklistCoveragePct: 70,
  backtestRequirePositiveExpectancy: true,
  demoMinClosed: 20,
  demoMinDistinctWeeks: 4,
  demoMinChecklistCompliancePct: 80,
  demoRequirePositiveExpectancy: true,
  realMonitorMinClosed: 20,
  realMonitorMinDistinctWeeks: 4,
}

function evidence(stage: string, mode: string | null, verdict = "ELIGIBLE") {
  return {
    stage,
    mode,
    verdict,
    monitoringOnly: stage === "REAL",
    closedCount: mode === "REAL" ? 0 : 30,
    usableRCount: mode === "REAL" ? 0 : 27,
    rCoveragePct: mode === "REAL" ? 0 : 90,
    winRatePct: mode === "REAL" ? null : 55,
    averageR: mode === "REAL" ? null : 0.4,
    expectancyR: mode === "REAL" ? null : 0.4,
    cumulativeR: mode === "REAL" ? null : 12,
    maxDrawdownR: mode === "REAL" ? null : 3,
    distinctWeeks: mode === "REAL" ? 0 : 5,
    checklistEvaluated: mode === "REAL" ? 0 : 25,
    checklistCompliant: mode === "REAL" ? 0 : 22,
    checklistCoveragePct: mode === "REAL" ? 0 : 83.3,
    checklistCompliancePct: mode === "REAL" ? null : 88,
    criteria: [
      { key: "closedCount", met: verdict === "ELIGIBLE", actual: mode === "REAL" ? 0 : 30, target: 30 },
    ],
    warnings: [] as Array<"EDGE_DECAY" | "DEFINITION_DRIFT">,
    practiceContext: { executedPractices: 2, reviewPractices: 1, captures: 3 },
    intelligence: { decay: "stable", drift: "aligned" },
    signature: `${mode}-signature`,
  }
}

function overview(currentStage = "BACKTEST", verdict = "ELIGIBLE") {
  return {
    setup: { id: "550e8400-e29b-41d4-a716-446655440002", name: "Ruptura" },
    policy,
    hypothesis: { ...evidence("HYPOTHESIS", null), closedCount: 0 },
    stages: {
      BACKTEST: evidence("BACKTEST", "BACKTEST", verdict),
      DEMO: evidence("DEMO", "DEMO", "INSUFFICIENT"),
      REAL: evidence("REAL", "REAL", "INCOMPLETE"),
    },
    comparison: [
      { mode: "BACKTEST", closedCount: 30, expectancyR: 0.4, averageR: 0.4, maxDrawdownR: 3, checklistCompliancePct: 88, verdict },
      { mode: "DEMO", closedCount: 30, expectancyR: 0.4, averageR: 0.4, maxDrawdownR: 3, checklistCompliancePct: 88, verdict: "INSUFFICIENT" },
      { mode: "REAL", closedCount: 0, expectancyR: null, averageR: null, maxDrawdownR: null, checklistCompliancePct: null, verdict: "INCOMPLETE" },
    ],
    state: { currentStage, suspended: false },
    history: [] as Array<{
      id: string
      action: string
      fromStage: string
      toStage: string
      note: string
      exceptionReason: string | null
      createdAt: Date
    }>,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  state.query = { data: overview() }
})
afterEach(cleanup)

describe("strategy validation route", () => {
  it("shows four accessible stages and an explicitly separated comparison", () => {
    render(<SetupValidationRoute setupId="550e8400-e29b-41d4-a716-446655440002" setupName="Ruptura" />)
    expect(screen.getByRole("tablist", { name: /ruta de validación/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /hipótesis/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /backtesting/i })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: /demo/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /real/i })).toBeInTheDocument()
    expect(screen.getByRole("table", { name: /comparación por modalidad/i })).toBeInTheDocument()
    expect(screen.getAllByText("Backtesting").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Demo").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Real").length).toBeGreaterThan(0)
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
    expect(screen.queryByText(/total combinado|p&l total/i)).not.toBeInTheDocument()
  })

  it("changes the evidence panel without changing the financial scope", () => {
    render(<SetupValidationRoute setupId="550e8400-e29b-41d4-a716-446655440002" setupName="Ruptura" />)
    fireEvent.click(screen.getByRole("tab", { name: /demo/i }))
    expect(screen.getByRole("tabpanel")).toHaveTextContent("En evaluación")
    expect(screen.getByRole("tabpanel")).toHaveTextContent("30 operaciones")
    expect(screen.getByRole("tabpanel")).toHaveTextContent("2 prácticas de ejecución")
  })

  it("requires an exception reason before promoting evidence with pending criteria", () => {
    state.query = { data: overview("BACKTEST", "INSUFFICIENT") }
    render(<SetupValidationRoute setupId="550e8400-e29b-41d4-a716-446655440002" setupName="Ruptura" />)
    fireEvent.click(screen.getByRole("button", { name: /revisar avance/i }))
    expect(screen.getByRole("dialog", { name: /decisión de validación/i })).toBeInTheDocument()
    const confirm = screen.getByRole("button", { name: /confirmar decisión/i })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/motivo de excepción/i), { target: { value: "Continuaré con supervisión y una muestra ampliada." } })
    fireEvent.click(confirm)
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({
      setupId: "550e8400-e29b-41d4-a716-446655440002",
      action: "PROMOTE",
      targetStage: "DEMO",
      expectedPolicyVersion: 1,
      expectedCurrentStage: "BACKTEST",
      exceptionReason: "Continuaré con supervisión y una muestra ampliada.",
    }))
  })

  it("labels Real as continuous monitoring and never offers completion", () => {
    const data = overview("REAL")
    data.stages.REAL = { ...evidence("REAL", "REAL", "WARNING"), warnings: ["EDGE_DECAY"] }
    state.query = { data }
    render(<SetupValidationRoute setupId="550e8400-e29b-41d4-a716-446655440002" setupName="Ruptura" />)
    expect(screen.getAllByText(/monitoreo continuo/i).length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: /finalizar|completar real/i })).not.toBeInTheDocument()
  })

  it("shows the immutable decision history without turning it into combined performance", () => {
    const data = overview("DEMO")
    data.history = [{
      id: "550e8400-e29b-41d4-a716-446655440099",
      action: "PROMOTE",
      fromStage: "BACKTEST",
      toStage: "DEMO",
      note: "Muestra revisada",
      exceptionReason: null,
      createdAt: new Date("2026-11-18T12:00:00.000Z"),
    }]
    state.query = { data }
    render(<SetupValidationRoute setupId="550e8400-e29b-41d4-a716-446655440002" setupName="Ruptura" />)
    expect(screen.getByRole("heading", { name: /historial de decisiones/i })).toBeInTheDocument()
    expect(screen.getByText(/^backtesting → demo$/i)).toBeInTheDocument()
    expect(screen.getByText("Muestra revisada")).toBeInTheDocument()
  })

  it("renders loading and recoverable error states", () => {
    state.query = { isLoading: true }
    const view = render(<SetupValidationRoute setupId="550e8400-e29b-41d4-a716-446655440002" setupName="Ruptura" />)
    expect(screen.getByRole("status")).toHaveTextContent(/cargando ruta/i)
    view.unmount()

    state.query = { isError: true }
    render(<SetupValidationRoute setupId="550e8400-e29b-41d4-a716-446655440002" setupName="Ruptura" />)
    expect(screen.getByRole("alert")).toHaveTextContent(/no se pudo cargar/i)
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }))
    expect(state.retry).toHaveBeenCalledOnce()
  })
})
