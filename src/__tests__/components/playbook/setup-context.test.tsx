// @vitest-environment jsdom
import React from "react"
import { fireEvent, render, screen, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SetupIntelligencePanel } from "@/components/playbook/setup-intelligence-panel"
const state = vi.hoisted(() => ({ result: {} as Record<string, unknown>, inputs: [] as object[], retry: vi.fn() }))
vi.mock("@/lib/trpc/client", () => ({ trpc: { playbook: { setup: { useQuery: (input: object) => { state.inputs.push(input); return { ...state.result, refetch: state.retry } } } } } }))
vi.mock("@/components/playbook/edge-evolution-chart", () => ({ EdgeEvolutionChart: () => <div /> }))
afterEach(() => { cleanup(); state.inputs = []; state.retry.mockClear() })
describe("setup sample context", () => {
  it("keeps the scope selector available without closed trades and queries each selected scope", () => {
    state.result = { data: { hasData: false } }
    render(<SetupIntelligencePanel setupId="s" />)
    const select = screen.getByRole("combobox", { name: /alcance/i })
    expect(select).toHaveValue("REAL")
    fireEvent.change(select, { target: { value: "DEMO" } })
    expect(state.inputs.at(-1)).toEqual({ setupId: "s", scope: "DEMO" })
    fireEvent.change(select, { target: { value: "BACKTEST" } })
    expect(state.inputs.at(-1)).toEqual({ setupId: "s", scope: "BACKTEST" })
  })
  it("offers retry on query failure", () => {
    state.result = { isError: true }
    render(<SetupIntelligencePanel setupId="s" />)
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }))
    expect(state.retry).toHaveBeenCalledOnce()
  })
  it("shows unknown compliance and R coverage without assuming zero compliance", () => {
    state.result = { data: { hasData: true, context: { closedCount: 4, usableRCount: 0, checklistEvaluated: 0, checklistCompliant: 0, checklistUnknown: 4, complianceRate: null }, decay: { status: "insufficient", recentAvgR: null, baselineAvgR: null }, drift: { status: "insufficient" }, evolution: [], redefinition: null } }
    render(<SetupIntelligencePanel setupId="s" />)
    expect(screen.getByText(/4 cierres · 0 con R válido/)).toBeInTheDocument()
    expect(screen.getByText(/Sin evaluación de checklist/)).toBeInTheDocument()
    expect(screen.getByText(/0 evaluados.*4 sin evaluación/)).toBeInTheDocument()
    expect(screen.getByText(/Muestra limitada/)).toBeInTheDocument()
    expect(screen.queryByText("0%" )).not.toBeInTheDocument()
  })
})
