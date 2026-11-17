// @vitest-environment jsdom
import { act, fireEvent, render, screen, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
const m = vi.hoisted(() => ({ save: vi.fn(), mode: "REAL" }))
const { save } = m
vi.mock("@/lib/operational-mode-store", () => ({ useOperationalMode: (selector: (state: { mode: string }) => unknown) => selector({ mode: m.mode }) }))
vi.mock("@/lib/trpc/client", () => ({ trpc: { weeklyReviews: { saveReview: { useMutation: () => ({ mutateAsync: save }) } }, monthlyReviews: { saveReview: { useMutation: () => ({ mutateAsync: save }) } } } }))
vi.mock("@/lib/use-toast", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("@/lib/error-formatter", () => ({ formatErrorForUser: () => "error" }))
vi.mock("@/app/reviews/components/report/send-email-button", () => ({ SendReviewEmailButton: () => null }))
import { readReviewDraft } from "@/app/reviews/components/report/notes-draft"
import { ReviewNotes } from "@/app/reviews/components/report/review-lifecycle"
const week = { kind: "weekly" as const, weekStart: "2026-06-08" }
beforeEach(() => { m.mode = "REAL"; vi.useFakeTimers(); localStorage.clear(); save.mockReset(); save.mockResolvedValue({ status: "draft", notes: "" }) })
afterEach(async () => { cleanup(); await act(async () => { await Promise.resolve() }); vi.useRealTimers() })
it("flushes navigation before 800ms and keeps the user/period recovery draft until confirmed", async () => {
  let resolve!: (value: unknown) => void
  save.mockImplementationOnce(() => new Promise(r => { resolve = r }))
  const view = render(<ReviewNotes period={week} initialNotes="" userId="u" />)
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "fast note" } })
  expect(readReviewDraft("review-notes:u:week:2026-06-08")).toBe("fast note")
  view.unmount()
  await act(async () => { await Promise.resolve() })
  expect(save).toHaveBeenCalledWith({ weekStart: week.weekStart, mode: "REAL", notes: "fast note" })
  await act(async () => { resolve({ notes: "fast note" }); await Promise.resolve() })
  expect(readReviewDraft("review-notes:u:week:2026-06-08")).toBeNull()
})
it("serializes edits including returning to the original text and confirms only the latest save", async () => {
  let resolve!: (value: unknown) => void
  save.mockImplementationOnce(() => new Promise(r => { resolve = r }))
  render(<ReviewNotes period={week} initialNotes="original" userId="u" />)
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "second" } })
  await act(async () => { vi.advanceTimersByTime(800) })
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "original" } })
  await act(async () => { vi.advanceTimersByTime(800) })
  expect(save).toHaveBeenCalledTimes(1)
  expect(screen.queryByText("Guardado ✓")).toBeNull()
  await act(async () => { resolve({ notes: "second" }); await Promise.resolve() })
  expect(save).toHaveBeenLastCalledWith({ weekStart: week.weekStart, mode: "REAL", notes: "original" })
  expect(screen.getByText("Guardado ✓")).toBeTruthy()
})
it("recovers a failed draft and exposes retry", async () => {
  save.mockRejectedValueOnce(Error("offline"))
  render(<ReviewNotes period={week} initialNotes="" userId="u" />)
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "recover me" } })
  await act(async () => { vi.advanceTimersByTime(800) })
  expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy()
  expect(readReviewDraft("review-notes:u:week:2026-06-08")).toBe("recover me")
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Reintentar" })) })
  expect(screen.getByText("Guardado ✓")).toBeTruthy()
})
it("does not transfer a note when the period changes", async () => {
  const view = render(<ReviewNotes period={week} initialNotes="" userId="u" />)
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "week one" } })
  view.rerender(<ReviewNotes period={{ kind: "monthly", year: 2026, month: 6 }} initialNotes="month" userId="u" />)
  await act(async () => { await Promise.resolve() })
  expect(screen.getByRole("textbox")).toHaveProperty("value", "month")
  expect(save).toHaveBeenCalledWith({ weekStart: week.weekStart, mode: "REAL", notes: "week one" })
})
it("recovers the current user's period draft without loading another user's note", async () => {
  localStorage.setItem("review-notes:u:week:2026-06-08", "recovered")
  localStorage.setItem("review-notes:other:week:2026-06-08", "private")
  const view = render(<ReviewNotes period={week} initialNotes="server" userId="u" />)
  await act(async () => { await Promise.resolve() })
  expect(screen.getByRole("textbox")).toHaveProperty("value", "server")
  expect(save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Restaurar borrador" }))
  await act(async () => { vi.advanceTimersByTime(800) })
  expect(screen.getByRole("textbox")).toHaveProperty("value", "recovered")
  expect(save).toHaveBeenCalledWith({ weekStart: week.weekStart, mode: "REAL", notes: "recovered" })
  view.rerender(<ReviewNotes period={week} initialNotes="other server" userId="third" />)
  expect(screen.getByRole("textbox")).toHaveProperty("value", "other server")
  expect(localStorage.getItem("review-notes:other:week:2026-06-08")).toBe("private")
})
it("retains the latest draft during an older request and browser unload", async () => {
  let resolve!: (value: unknown) => void
  save.mockImplementationOnce(() => new Promise(r => { resolve = r }))
  render(<ReviewNotes period={week} initialNotes="" userId="u" />)
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "old" } })
  await act(async () => { vi.advanceTimersByTime(800) })
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "latest" } })
  window.dispatchEvent(new Event("beforeunload"))
  expect(save).toHaveBeenCalledTimes(1)
  expect(readReviewDraft("review-notes:u:week:2026-06-08")).toBe("latest")
  await act(async () => { resolve({ notes: "old" }); await Promise.resolve() })
  expect(save).toHaveBeenLastCalledWith({ weekStart: week.weekStart, mode: "REAL", notes: "latest" })
})

it("keeps one shared period note and recovery key when the operational mode changes", async () => {
  const view = render(<ReviewNotes period={week} initialNotes="shared" userId="u" />)
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "same period reflection" } })
  m.mode = "BACKTEST"
  view.rerender(<ReviewNotes period={week} initialNotes="shared" userId="u" />)
  expect(screen.getByRole("textbox")).toHaveProperty("value", "same period reflection")
  expect(readReviewDraft("review-notes:u:week:2026-06-08")).toBe("same period reflection")
  await act(async () => { vi.advanceTimersByTime(800) })
  expect(save).toHaveBeenCalledWith({ weekStart: week.weekStart, mode: "BACKTEST", notes: "same period reflection" })
  expect(Object.keys(localStorage).filter(key => key.includes("review-notes:"))).toEqual([])
})
