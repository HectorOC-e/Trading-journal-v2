// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { FocusSession } from "@/app/aprendizaje/components/focus-session"
import { useStudySessionStore } from "@/lib/study-session-store"

const mocks = vi.hoisted(() => ({ finish: vi.fn(), invalidate: vi.fn() }))
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  useUtils: () => ({ studySessions: { invalidate: mocks.invalidate }, learningResources: { invalidate: mocks.invalidate } }),
  studySessions: {
    active: { useQuery: () => ({ data: null }) },
    start: { useMutation: () => ({ mutate: vi.fn() }) },
    finish: { useMutation: () => ({ mutate: mocks.finish, isPending: false }) },
    cancel: { useMutation: () => ({ mutate: vi.fn() }) },
  },
} }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-06-16T12:00:00Z"))
  sessionStorage.clear()
  mocks.finish.mockClear()
  useStudySessionStore.getState().setSession({ id: "s1", resourceId: "r1", resourceTitle: "Book", resourceType: "LIBRO", startedAtMs: Date.now() })
})
afterEach(() => { cleanup(); useStudySessionStore.getState().setSession(null); vi.useRealTimers() })

it("restores a paused session on reload and saves only study minutes", () => {
  const first = render(<FocusSession />)
  act(() => vi.advanceTimersByTime(60000))
  fireEvent.click(screen.getByRole("button", { name: "Pausar" }))
  first.unmount()
  act(() => vi.advanceTimersByTime(3600000))
  render(<FocusSession />)
  expect(screen.getByText("01:00")).toBeInTheDocument()
  expect(screen.getByText("En pausa")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Terminar" }))
  expect(mocks.finish).toHaveBeenCalledWith(expect.objectContaining({ id: "s1", durationMin: 1 }))
})

for (const paused of [false, true]) {
  it(`restores the note and review draft while ${paused ? "paused" : "running"}`, () => {
    const first = render(<FocusSession />)
    fireEvent.change(screen.getByPlaceholderText("Nota rápida de la sesión…"), { target: { value: "Remember this" } })
    fireEvent.click(screen.getByRole("checkbox"))
    if (paused) fireEvent.click(screen.getByRole("button", { name: "Pausar" }))
    first.unmount()
    render(<FocusSession />)
    expect(screen.getByRole("textbox")).toHaveValue("Remember this")
    expect(screen.getByRole("checkbox")).toBeChecked()
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } })
    fireEvent.click(screen.getByRole("checkbox"))
    cleanup()
    render(<FocusSession />)
    expect(screen.getByRole("textbox")).toHaveValue("")
    expect(screen.getByRole("checkbox")).not.toBeChecked()
  })
}

it("does not carry a draft into a different session", () => {
  const first = render(<FocusSession />)
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Old session" } })
  fireEvent.click(screen.getByRole("checkbox"))
  first.unmount()
  act(() => useStudySessionStore.getState().setSession({ id: "s2", resourceId: "r1", resourceTitle: "Book", resourceType: "LIBRO", startedAtMs: Date.now() }))
  render(<FocusSession />)
  expect(screen.getByRole("textbox")).toHaveValue("")
  expect(screen.getByRole("checkbox")).not.toBeChecked()
})

it("limits note drafts to the accepted 2000 characters", () => {
  render(<FocusSession />)
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "n".repeat(2001) } })
  expect(screen.getByRole("textbox")).toHaveValue("n".repeat(2000))
  expect(JSON.parse(sessionStorage.getItem("tj-study-timer:s1")!).note).toHaveLength(2000)
  fireEvent.click(screen.getByRole("button", { name: "Terminar" }))
  expect(mocks.finish).toHaveBeenCalledWith(expect.objectContaining({ note: "n".repeat(2000) }))
})
