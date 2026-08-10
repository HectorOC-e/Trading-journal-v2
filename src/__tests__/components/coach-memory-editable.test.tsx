/**
 * @vitest-environment jsdom
 *
 * El panel PROMETÍA "Tú decides: confirma, edita o borra" y su cabecera se
 * describía como "visible / editable / deletable" (ADR-003 §3), pero sólo
 * cableaba `confirmMemory` y `deleteMemory`. `editMemory` existía en el router
 * (`coach.ts:39-41`) y en el servicio desde S6, y NINGÚN componente la llamaba.
 *
 * Es el mismo defecto que mató la captura de emoción: el producto pide un gesto
 * y no deja hacerlo. Aquí la afirmación se hace sobre el GESTO, no sobre el
 * texto: que exista el botón, que llame a la mutación con el contenido nuevo, y
 * que cancelar no escriba nada.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CoachMemoryPanel } from "@/components/ai-coach/coach-memory-panel"

const editMutate = vi.fn()
const confirmMutate = vi.fn()
const removeMutate = vi.fn()

const MEMORY = [
  { id: "11111111-1111-4111-8111-111111111111", kind: "fact", status: "confirmed", content: "Opero NQ por las mañanas" },
  { id: "22222222-2222-4222-8222-222222222222", kind: "preference", status: "candidate", content: "Prefiere respuestas cortas" },
]

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({ coach: { memory: { invalidate: vi.fn() } } }),
    coach: {
      memory: { useQuery: () => ({ data: MEMORY, isLoading: false }) },
      addMemory: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      confirmMemory: { useMutation: () => ({ mutate: confirmMutate, isPending: false }) },
      editMemory: { useMutation: () => ({ mutate: editMutate, isPending: false }) },
      deleteMemory: { useMutation: () => ({ mutate: removeMutate, isPending: false }) },
    },
  },
}))

// Hijos con sus propias consultas tRPC — fuera del alcance de esta pieza.
vi.mock("@/components/ai-coach/coach-identity-editor", () => ({ CoachIdentityEditor: () => null }))
vi.mock("@/components/ai-coach/coach-memory-layers", () => ({ CoachMemoryLayers: () => null }))

beforeEach(() => {
  editMutate.mockClear()
  confirmMutate.mockClear()
  removeMutate.mockClear()
})

describe("CoachMemoryPanel — la promesa de 'edita' tiene que ser alcanzable", () => {
  it("ofrece un gesto de edición por cada memoria, no sólo confirmar y borrar", () => {
    render(<CoachMemoryPanel />)
    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(MEMORY.length)
  })

  it("guardar llama a editMemory con el id y el contenido NUEVO", () => {
    render(<CoachMemoryPanel />)
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0])

    const input = screen.getByRole("textbox", { name: "Editar memoria" })
    fireEvent.change(input, { target: { value: "Opero NQ sólo en la sesión de Londres" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))

    expect(editMutate).toHaveBeenCalledWith({ id: MEMORY[0].id, content: "Opero NQ sólo en la sesión de Londres" })
  })

  it("cancelar cierra la edición sin escribir nada", () => {
    render(<CoachMemoryPanel />)
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0])
    fireEvent.change(screen.getByRole("textbox", { name: "Editar memoria" }), { target: { value: "basura" } })
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(editMutate).not.toHaveBeenCalled()
    expect(screen.queryByRole("textbox", { name: "Editar memoria" })).not.toBeInTheDocument()
  })

  it("no envía una memoria vacía — el servidor exige min(1) y fallaría con un 400 mudo", () => {
    render(<CoachMemoryPanel />)
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0])
    fireEvent.change(screen.getByRole("textbox", { name: "Editar memoria" }), { target: { value: "   " } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))

    expect(editMutate).not.toHaveBeenCalled()
  })

  it("los otros dos gestos que la cabecera promete siguen en pie", () => {
    render(<CoachMemoryPanel />)
    // Confirmar sólo tiene sentido sobre el candidato.
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    expect(confirmMutate).toHaveBeenCalledWith({ id: MEMORY[1].id })

    fireEvent.click(screen.getAllByRole("button", { name: "Borrar" })[0])
    expect(removeMutate).toHaveBeenCalledWith({ id: MEMORY[0].id })
  })
})
