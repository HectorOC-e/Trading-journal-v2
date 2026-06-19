import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({ prisma: { user: { findMany: vi.fn() } } }))
vi.mock("@/server/services/email/send-learning-digest", async (importActual) => {
  const actual = await importActual<typeof import("@/server/services/email/send-learning-digest")>()
  return { ...actual, sendLearningDigestForUser: vi.fn() }
})

import { POST, checkCronAuth } from "@/app/api/cron/learning-digest/route"
import { localHour } from "@/server/services/email/send-learning-digest"
import { prisma } from "@/lib/prisma"
import { sendLearningDigestForUser } from "@/server/services/email/send-learning-digest"

const SECRET = "test-secret"

function req(headers: Record<string, string>, body: unknown = {}) {
  return new NextRequest("http://localhost/api/cron/learning-digest", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
}

describe("checkCronAuth", () => {
  it("unconfigured when no secret set", () => {
    expect(checkCronAuth("Bearer x", undefined)).toBe("unconfigured")
  })
  it("unauthorized when header missing or wrong", () => {
    expect(checkCronAuth(null, SECRET)).toBe("unauthorized")
    expect(checkCronAuth("Bearer nope", SECRET)).toBe("unauthorized")
  })
  it("ok with matching bearer token", () => {
    expect(checkCronAuth(`Bearer ${SECRET}`, SECRET)).toBe("ok")
  })
})

describe("localHour", () => {
  it("converts UTC instant to local hour", () => {
    const t = new Date("2026-06-19T22:00:00Z")
    expect(localHour(t, "UTC")).toBe(22)
    expect(localHour(t, "America/Tegucigalpa")).toBe(16) // UTC-6
  })
})

describe("POST /api/cron/learning-digest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = SECRET
  })

  it("returns 412 when CRON_SECRET not configured", async () => {
    delete process.env.CRON_SECRET
    const res = await POST(req({ authorization: `Bearer ${SECRET}` }))
    expect(res.status).toBe(412)
  })

  it("returns 401 on bad token", async () => {
    const res = await POST(req({ authorization: "Bearer wrong" }))
    expect(res.status).toBe(401)
  })

  it("processes all users and tallies statuses with force:true", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u1", timezone: "UTC" }, { id: "u2", timezone: "UTC" },
    ] as never)
    vi.mocked(sendLearningDigestForUser)
      .mockResolvedValueOnce({ status: "sent" })
      .mockResolvedValueOnce({ status: "empty" })

    const res = await POST(req({ authorization: `Bearer ${SECRET}` }, { force: true }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.processed).toBe(2)
    expect(json.sent).toBe(1)
    expect(json.empty).toBe(1)
    expect(sendLearningDigestForUser).toHaveBeenCalledTimes(2)
  })
})
