// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { AiCoachDrawer } from "@/components/ai-coach/ai-coach-drawer"
import { useOperationalModeStore } from "@/lib/operational-mode-store"
import { STORAGE_KEYS } from "@/lib/storage-keys"
const { persisted } = vi.hoisted(() => ({ persisted: [] as any[] }))
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  profile: { get: { useQuery: () => ({ data: { id: "synthetic-user" } }) } },
  coach: { appendExchange: { useMutation: () => ({ mutate: (input: any) => persisted.push(input) }) } },
} }))
vi.mock("@/components/ai-coach/coach-memory-panel", () => ({ CoachMemoryPanel: () => null }))
vi.mock("@/components/ui/markdown", () => ({ Markdown: ({ content }: { content: string }) => <p>{content}</p> }))
vi.mock("@/lib/dialog-open-store", () => ({ useAnyDialogOpen: () => false }))
beforeEach(() => {
  localStorage.clear(); persisted.length = 0
  window.history.replaceState({}, "", "/?mode=REAL")
  useOperationalModeStore.setState({ mode: "REAL" })
  HTMLElement.prototype.scrollIntoView = vi.fn()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const open = () => act(() => { window.dispatchEvent(new Event("coach:open")) })

it("starts separate conversations per user and mode and sends mode with new exchanges", async () => {
  localStorage.setItem(STORAGE_KEYS.coachHistory, JSON.stringify([{ id: "old", role: "assistant", content: "Legacy mixed history" }]))
  const fetcher = vi.fn<(url: RequestInfo | URL, init?: RequestInit) => Promise<Response>>().mockResolvedValue(new Response("Scoped answer", { headers: { "content-type": "text/plain" } }))
  vi.stubGlobal("fetch", fetcher)
  render(<AiCoachDrawer />)
  open()
  expect(screen.queryByText("Legacy mixed history")).toBeNull()
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Review my evidence" } })
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" })
  await screen.findByText("Scoped answer")
  expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string).mode).toBe("REAL")
  expect(persisted[0].mode).toBe("REAL")
  act(() => useOperationalModeStore.getState().setMode("DEMO"))
  open()
  expect(screen.queryByText("Scoped answer")).toBeNull()
  act(() => useOperationalModeStore.getState().setMode("REAL"))
  open()
  expect(await screen.findByText("Scoped answer")).toBeTruthy()
})
