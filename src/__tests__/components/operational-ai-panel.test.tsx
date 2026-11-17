// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { IntelligencePanel } from "@/components/ui/intelligence-panel"
vi.mock("@/components/ui/markdown", () => ({ Markdown: ({ content }: { content: string }) => <p>{content}</p> }))
vi.mock("@/components/ui/insight-cards", () => ({ InsightCards: () => null }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const props = { insights: [], isLoading: false, endpoint: "/api/analytics-ai", period: "3M", title: "IA", subtitle: "Analizar" }

it("sends the selected modality to AI generation", async () => {
  const fetcher = vi.fn<(url: RequestInfo | URL, init?: RequestInit) => Promise<Response>>().mockResolvedValue(new Response("Demo result", { headers: { "content-type": "text/plain" } }))
  vi.stubGlobal("fetch", fetcher)
  render(<IntelligencePanel {...props} mode="DEMO" />)
  fireEvent.click(screen.getByRole("button", { name: "Generar análisis" }))
  await screen.findByText("Demo result")
  expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({ period: "3M", mode: "DEMO" })
})

it("immediately clears old narrative and ignores a late Real response after switching to Demo", async () => {
  let answer!: (response: Response) => void
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { answer = resolve })))
  const view = render(<IntelligencePanel {...props} mode="REAL" />)
  fireEvent.click(screen.getByRole("button", { name: "Generar análisis" }))
  view.rerender(<IntelligencePanel {...props} mode="DEMO" />)
  await act(async () => answer(new Response("Late Real evidence", { headers: { "content-type": "text/plain" } })))
  await waitFor(() => expect(screen.queryByText("Late Real evidence")).toBeNull())
  expect(screen.getByRole("button", { name: "Generar análisis" }).hasAttribute("disabled")).toBe(false)
})
