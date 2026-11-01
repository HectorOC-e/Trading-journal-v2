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
