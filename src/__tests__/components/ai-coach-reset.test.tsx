// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { AiCoachDrawer } from "@/components/ai-coach/ai-coach-drawer"
const m = vi.hoisted(() => ({ append: vi.fn() }))
vi.mock("@/lib/trpc/client", () => ({ trpc: { coach: { appendExchange: { useMutation: () => ({ mutate: m.append }) } } } }))
vi.mock("@/components/ai-coach/coach-memory-panel", () => ({ CoachMemoryPanel: () => null }))
vi.mock("@/components/ui/markdown", () => ({ Markdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock("@/lib/dialog-open-store", () => ({ useAnyDialogOpen: () => false }))
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }
function reply(text: string) {
  let sent = false
  return { headers: new Headers({ "content-type": "text/event-stream" }), body: { getReader: () => ({ read: async () => sent ? { done: true } : (sent = true, { done: false, value: new TextEncoder().encode(text) }) }) } }
}
beforeEach(() => { localStorage.clear(); m.append.mockReset(); Element.prototype.scrollIntoView = vi.fn() })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
function open() { render(<AiCoachDrawer />); act(() => { window.dispatchEvent(new Event("coach:open")) }) }
function send(text: string) { fireEvent.change(screen.getByPlaceholderText("Pregunta algo sobre tu trading…"), { target: { value: text } }); fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" })) }
it("ignores an old fetch response after clearing and allows a fresh request", async () => {
  const old = deferred<unknown>()
  vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(old.promise).mockResolvedValue(reply("Nueva respuesta")))
  open(); send("Anterior")
  fireEvent.click(screen.getByRole("button", { name: "Borrar conversación" }))
  await act(async () => { old.resolve(reply("Respuesta vieja")) })
  expect(screen.queryByText("Respuesta vieja")).toBeNull()
  expect(m.append).not.toHaveBeenCalled()
  send("Nueva")
  await waitFor(() => expect(m.append).toHaveBeenCalledWith(expect.objectContaining({ threadId: null, userText: "Nueva" }), expect.anything()))
})
it("does not let a late persisted exchange restore the cleared thread", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => reply("Respuesta")))
  open(); send("Primera")
  await waitFor(() => expect(m.append).toHaveBeenCalledTimes(1))
  const oldSuccess = m.append.mock.calls[0][1].onSuccess
  act(() => { oldSuccess({ threadId: "old-thread" }) })
  fireEvent.click(screen.getByRole("button", { name: "Borrar conversación" }))
  act(() => { oldSuccess({ threadId: "old-thread" }) })
  send("Segunda")
  await waitFor(() => expect(m.append).toHaveBeenCalledTimes(2))
  expect(m.append.mock.calls[1][0].threadId).toBeNull()
})
