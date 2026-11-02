/** @vitest-environment jsdom */
import React from "react"
import { afterEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { AddEditResourceModal } from "@/app/aprendizaje/modals/add-edit-resource-modal"

const boundary = vi.hoisted(() => ({ update: vi.fn(), create: vi.fn() }))
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  useUtils: () => ({}),
  learningResources: {
    create: { useMutation: () => ({ mutate: boundary.create, isPending: false }) },
    update: { useMutation: () => ({ mutate: boundary.update, isPending: false }) },
  },
} }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

const resource = {
  id: "resource-1", type: "LIBRO", title: "Book", author: "Author",
  source: "", date: "2026-11-02", notes: "Before", tags: ["trading"],
  markedForReview: false, totalUnits: 200, currentUnits: 107, reviewInterval: 7,
} as React.ComponentProps<typeof AddEditResourceModal>["editTarget"]

it("saving notes preserves progress added after the editor opened", () => {
  render(<AddEditResourceModal open onOpenChange={() => {}} editTarget={resource} />)
  const latest = { currentUnits: 108, notes: "Before" }
  boundary.update.mockImplementation((patch) => Object.assign(latest, patch))
  fireEvent.change(screen.getByPlaceholderText("¿Qué aprendiste? ¿Cómo aplicarlo al trading?"), { target: { value: "After" } })
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
  expect(latest).toMatchObject({ notes: "After", currentUnits: 108 })
  expect(boundary.update).toHaveBeenCalledWith({ id: "resource-1", notes: "After" })
})

it("keeps the original baseline and draft when the same resource refreshes", () => {
  const { rerender } = render(<AddEditResourceModal open onOpenChange={() => {}} editTarget={resource} />)
  fireEvent.change(screen.getByPlaceholderText("¿Qué aprendiste? ¿Cómo aplicarlo al trading?"), { target: { value: "Draft" } })
  rerender(<AddEditResourceModal open onOpenChange={() => {}} editTarget={{ ...resource!, currentUnits: 108 }} />)
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
  expect(boundary.update).toHaveBeenCalledWith({ id: "resource-1", notes: "Draft" })
})

it("sends intentionally changed progress and explicit null clearing", () => {
  render(<AddEditResourceModal open onOpenChange={() => {}} editTarget={resource} />)
  const [current, total] = screen.getAllByRole("spinbutton")
  fireEvent.change(current, { target: { value: "109" } })
  fireEvent.change(total, { target: { value: "" } })
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
  expect(boundary.update).toHaveBeenCalledWith({ id: "resource-1", currentUnits: 109, totalUnits: null })
})

it("clears progress when deliberately switching to a type without progress", () => {
  render(<AddEditResourceModal open onOpenChange={() => {}} editTarget={resource} />)
  fireEvent.click(screen.getByTitle("NOTA"))
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))
  expect(boundary.update).toHaveBeenCalledWith({ id: "resource-1", type: "NOTA", currentUnits: null, totalUnits: null })
})

it("creates resources with the complete payload", () => {
  render(<AddEditResourceModal open onOpenChange={() => {}} editTarget={null} />)
  fireEvent.change(screen.getByPlaceholderText("Ej. Trading in the Zone"), { target: { value: "New book" } })
  fireEvent.click(screen.getByRole("button", { name: "Guardar recurso" }))
  expect(boundary.create).toHaveBeenCalledWith({
    title: "New book", type: "LIBRO", author: "", source: "", notes: "", tags: [],
    date: new Date().toISOString().slice(0, 10), markedForReview: false,
    currentUnits: null, totalUnits: null, reviewInterval: 7,
  })
})
