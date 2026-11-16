import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({ pdf: vi.fn(), getUser: vi.fn() }))
vi.mock("@/server/services/reviews/render-pdf", () => ({ renderReviewPdf: mocks.pdf }))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }))
import { GET } from "@/app/api/reviews/pdf/route"

beforeEach(() => { vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: "u" } } }); mocks.pdf.mockResolvedValue(Buffer.from("pdf")) })

describe("review PDF mode route", () => {
  it.each(["REAL", "DEMO", "BACKTEST"])("exports only explicit %s with its mode in the filename", async mode => {
    const response = await GET(new NextRequest(`https://journal.test/api/reviews/pdf?type=weekly&period=2026-06-15&mode=${mode}`))
    expect(response.status).toBe(200)
    expect(mocks.pdf.mock.calls[0][1].period.mode).toBe(mode)
    expect(response.headers.get("Content-Disposition")).toContain(`2026-06-15-${mode}.pdf`)
  })

  it.each(["ALL", "INTERNAL", "demo", ""])("rejects invalid mode %s before rendering", async mode => {
    const response = await GET(new NextRequest(`https://journal.test/api/reviews/pdf?type=monthly&period=2026-06&mode=${mode}`))
    expect(response.status).toBe(400)
    expect(mocks.pdf).not.toHaveBeenCalled()
  })

  it("defaults omitted mode to Real for existing clients", async () => {
    const response = await GET(new NextRequest("https://journal.test/api/reviews/pdf?type=monthly&period=2026-06"))
    expect(response.status).toBe(200)
    expect(mocks.pdf.mock.calls[0][1].period.mode).toBe("REAL")
  })

  it("keeps authentication required", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const response = await GET(new NextRequest("https://journal.test/api/reviews/pdf?type=weekly&period=2026-06-15&mode=DEMO"))
    expect(response.status).toBe(401)
    expect(mocks.pdf).not.toHaveBeenCalled()
  })
})
