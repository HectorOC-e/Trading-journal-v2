// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { FocusSession } from "@/app/aprendizaje/components/focus-session"
import { useStudySessionStore } from "@/lib/study-session-store"

const mocks = vi.hoisted(() => ({ finish: vi.fn(), invalidate: vi.fn(), updatedAt: 0, finishSuccess: undefined as undefined | ((result: unknown, input: { id: string; durationMin: number }) => void), cancelSuccess: undefined as undefined | ((result: unknown, input: { id: string }) => void), active: null as null | { id: string; resourceId: string; resourceTitle: string; resourceType: string; startedAt: string } }))
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  useUtils: () => ({ studySessions: { invalidate: mocks.invalidate }, learningResources: { invalidate: mocks.invalidate } }),
  studySessions: {
    active: { useQuery: () => ({ data: mocks.active, dataUpdatedAt: mocks.updatedAt }) },
    start: { useMutation: () => ({ mutate: vi.fn() }) },
    finish: { useMutation: (options: { onSuccess: NonNullable<typeof mocks.finishSuccess> }) => { mocks.finishSuccess = options.onSuccess; return { mutate: mocks.finish, isPending: false } } },
    cancel: { useMutation: (options: { onSuccess: NonNullable<typeof mocks.cancelSuccess> }) => { mocks.cancelSuccess = options.onSuccess; return { mutate: vi.fn() } } },
  },
} }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-06-16T12:00:00Z"))
  sessionStorage.clear()
  localStorage.clear()
  mocks.updatedAt = 0
  mocks.active = null
  mocks.finish.mockClear()
  useStudySessionStore.getState().setSession({ id: "s1", resourceId: "r1", resourceTitle: "Book", resourceType: "LIBRO", startedAtMs: Date.now() })
})
afterEach(() => { cleanup(); useStudySessionStore.getState().setSession(null); vi.useRealTimers(); vi.restoreAllMocks() })

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


it("restores a pause shared by another tab", () => {
  localStorage.setItem("tj-study-timer:s1", JSON.stringify({ sessionId: "s1", runStartMs: Date.now(), accumSec: 60, paused: true, note: "Shared note", markForReview: true }))
  render(<FocusSession />)
  expect(screen.getByText("En pausa")).toBeInTheDocument()
  expect(screen.getByText("01:00")).toBeInTheDocument()
  expect(screen.getByRole("textbox")).toHaveValue("Shared note")
})

it("applies another tab's pause and closes when that tab ends the session", () => {
  render(<FocusSession />)
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: "tj-study-timer:s1", newValue: JSON.stringify({ sessionId: "s1", runStartMs: Date.now(), accumSec: 60, paused: true, note: "Shared", markForReview: false }) })))
  expect(screen.getByText("En pausa")).toBeInTheDocument()
  expect(screen.getByText("01:00")).toBeInTheDocument()
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: "tj-study-timer:s1", newValue: null })))
  expect(useStudySessionStore.getState().session).toBeNull()
})

it("reconciles an active session that the server says has ended", () => {
  mocks.updatedAt = Date.now()
  render(<FocusSession />)
  expect(useStudySessionStore.getState().session).toBeNull()
})

it("does not reopen a closed session from an in-flight stale server response", () => {
  const view = render(<FocusSession />)
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: "tj-study-timer:s1", newValue: null })))
  mocks.active = { id: "s1", resourceId: "r1", resourceTitle: "Book", resourceType: "LIBRO", startedAt: new Date().toISOString() }
  mocks.updatedAt = Date.now()
  view.rerender(<FocusSession />)
  expect(useStudySessionStore.getState().session).toBeNull()
})

for (const operation of ["finish", "cancel"] as const) {
  it(`does not close a newer session after an old ${operation} response`, () => {
    render(<FocusSession />)
    act(() => useStudySessionStore.getState().setSession({ id: "s2", resourceId: "r1", resourceTitle: "New", resourceType: "LIBRO", startedAtMs: Date.now() }))
    act(() => operation === "finish" ? mocks.finishSuccess?.({}, { id: "s1", durationMin: 1 }) : mocks.cancelSuccess?.({}, { id: "s1" }))
    expect(useStudySessionStore.getState().session?.id).toBe("s2")
    expect(localStorage.getItem("tj-study-timer:s2")).not.toBeNull()
  })
}

it("keeps legacy sessionStorage recovery when shared storage is unavailable", () => {
  sessionStorage.setItem("tj-study-timer:s1", JSON.stringify({ sessionId: "s1", runStartMs: Date.now(), accumSec: 60, paused: true, note: "Legacy", markForReview: false }))
  const getItem = Storage.prototype.getItem
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (this: Storage, key: string) {
    if (this === localStorage) throw new Error("Storage unavailable")
    return getItem.call(this, key)
  })
  render(<FocusSession />)
  expect(screen.getByText("En pausa")).toBeInTheDocument()
  expect(screen.getByRole("textbox")).toHaveValue("Legacy")
})
