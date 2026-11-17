import { expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST as analytics } from "@/app/api/analytics-ai/route"
import { POST as psychology } from "@/app/api/psychology-ai/route"
import { POST as coach } from "@/app/api/ai-coach/route"
const { seen } = vi.hoisted(() => ({ seen: [] as any[] }))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "synthetic" } } }) } }) }))
vi.mock("@/server/services/coach/coach-memory-service", () => ({ assembleCoachContext: async () => "" }))
const stream = (opts: any) => { seen.push(opts); return Promise.resolve(new ReadableStream({ start(c) { c.close() } })) }
vi.mock("@/lib/ai/analytics-insights-service", () => ({ streamAnalyticsInsights: (o: any) => stream(o) }))
vi.mock("@/lib/ai/psychology-insights-service", () => ({ streamPsychologyInsights: (o: any) => stream(o) }))
vi.mock("@/lib/ai/coach-service", () => ({ streamCoachReply: (o: any) => stream(o) }))
const req = (body: any) => new NextRequest("http://localhost/api/ai", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } })
for (const [name, route] of [["analytics", analytics], ["psychology", psychology], ["coach", coach]] as const) {
  it(`${name} rejects ALL/internal and the obsolete mixed-scope flag`, async () => {
    expect((await route(req({ mode: "ALL", messages: [] }))).status).toBe(400)
    expect((await route(req({ mode: "INTERNAL", messages: [] }))).status).toBe(400)
    expect((await route(req({ mode: null, messages: [] }))).status).toBe(400)
    expect((await route(req({ mode: "DEMO", includePractice: true, messages: [] }))).status).toBe(400)
  })
  it(`${name} forwards an explicit mode and returns its provenance`, async () => {
    const response = await route(req({ mode: "DEMO", messages: [] }))
    expect(response.status).toBe(200)
    expect(seen.at(-1).mode).toBe("DEMO")
    expect(response.headers.get("x-operational-mode")).toBe("DEMO")
  })
}
