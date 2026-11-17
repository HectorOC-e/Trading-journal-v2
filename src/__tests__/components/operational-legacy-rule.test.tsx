// @vitest-environment jsdom
import { expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

const { assign } = vi.hoisted(() => ({ assign: vi.fn() }))
vi.mock("@/components/layout/top-bar", () => ({ TopBar: () => null }))
vi.mock("@/lib/use-toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/lib/operational-mode-store", () => ({ useOperationalMode: (selector: any) => selector({ mode: "DEMO" }) }))
vi.mock("@/lib/trpc/client", () => {
  const mutation = () => ({ useMutation: () => ({ mutate: vi.fn(), isPending: false }) })
  return { trpc: { useUtils: () => ({ rules: { list: { invalidate: vi.fn() } } }), rules: {
    list: { useQuery: () => ({ data: [{ id: "legacy", name: "Revisar antes de usar", description: "Edited description", mode: "enforce", trigger: "TRADE_PRE_CREATE", conditions: {}, actions: [{ type: "BLOCK" }], enabled: true, priority: 0, needsModeAssignment: true, globalManual: false, operationalMode: null, sourceInsightId: null, sourceCommitmentId: null }] }) },
    templates: { useQuery: () => ({ data: [] }) },
    createExecutable: mutation(), updateExecutable: mutation(), createFromTemplate: mutation(), toggle: mutation(), delete: mutation(),
    assignMode: { useMutation: () => ({ mutate: assign, isPending: false }) },
  } } }
})
import ReglasPage from "@/app/reglas/page"

it("shows a legacy rule as inert and explicitly assigns it to the selected Demo world", () => {
  render(<ReglasPage />)
  expect(screen.getByText("Necesita revisar ámbito · inactiva")).toBeTruthy()
  fireEvent.click(screen.getByRole("button", { name: "Usar en Demo" }))
  expect(assign).toHaveBeenCalledExactlyOnceWith({ id: "legacy", mode: "DEMO" })
})
