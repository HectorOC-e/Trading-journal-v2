import { describe, it, expect, vi, beforeEach } from "vitest"
import { sendLearningDigestForUser, type DigestUser, type DigestDeps } from "@/server/services/email/send-learning-digest"

const now = new Date("2026-06-19T22:00:00Z") // 19:00 in America/Tegucigalpa (UTC-6) ≈ evening

const user = (over: Partial<DigestUser> = {}): DigestUser => ({
  id: "u1", email: "u@test.com", name: "Héctor", emailNotifications: true,
  timezone: "UTC", weeklyGoalMinutes: 300, currentStreak: 12, bestStreak: 21,
  lastReviewDate: new Date("2026-06-18T00:00:00Z"), ...over,
})

interface FakeData {
  pref?: unknown
  alreadyLogged?: boolean
  active?: unknown[]
  mastered?: unknown[]
  minutes?: unknown[]
}

function fakePrisma(data: FakeData) {
  return {
    notificationPreference: { findUnique: vi.fn(async () => data.pref ?? null) },
    userPreferences: { findUnique: vi.fn(async () => null) },
    emailLog: {
      findFirst: vi.fn(async () => (data.alreadyLogged ? { id: "log1" } : null)),
      create: vi.fn(async () => ({ id: "log2" })),
    },
    learningResource: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if ((where.status as { notIn?: string[] })?.notIn) return data.active ?? []
        if (where.status === "MASTERED") return data.mastered ?? []
        if (where.progressType === "minutes") return data.minutes ?? []
        return []
      }),
    },
    studySession: { findFirst: vi.fn(async () => null) },
  }
}

const enabledPref = { muted: false, channels: ["in_app", "email"], quietStart: null, quietEnd: null, timezone: "UTC" }

function deps(prisma: unknown, sent: ReturnType<typeof vi.fn>): DigestDeps {
  return { prisma: prisma as DigestDeps["prisma"], now, sendEmail: sent as unknown as DigestDeps["sendEmail"], appUrl: "https://x.test" }
}

describe("sendLearningDigestForUser", () => {
  let send: ReturnType<typeof vi.fn>
  beforeEach(() => { send = vi.fn(async () => ({ ok: true })) })

  it("ineligible when no email preference (opt-in)", async () => {
    const prisma = fakePrisma({ pref: null })
    const r = await sendLearningDigestForUser(deps(prisma, send), user())
    expect(r.status).toBe("ineligible")
    expect(send).not.toHaveBeenCalled()
  })

  it("already_sent when email_log has today's entry", async () => {
    const prisma = fakePrisma({ pref: enabledPref, alreadyLogged: true })
    const r = await sendLearningDigestForUser(deps(prisma, send), user())
    expect(r.status).toBe("already_sent")
    expect(send).not.toHaveBeenCalled()
  })

  it("empty (no send) when nothing to act on and streak not at risk", async () => {
    const prisma = fakePrisma({ pref: enabledPref })
    const r = await sendLearningDigestForUser(deps(prisma, send), user({ currentStreak: 0, lastReviewDate: null }))
    expect(r.status).toBe("empty")
    expect(send).not.toHaveBeenCalled()
  })

  it("sends and logs when streak is at risk", async () => {
    const prisma = fakePrisma({ pref: enabledPref })
    const r = await sendLearningDigestForUser(deps(prisma, send), user())
    expect(r.status).toBe("sent")
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0].subject).toContain("racha")
    expect(prisma.emailLog.create).toHaveBeenCalledTimes(1)
  })

  it("sends with overdue reviews and reports send_failed without logging on error", async () => {
    const failing = vi.fn(async () => ({ ok: false, error: "boom" }))
    const prisma = fakePrisma({
      pref: enabledPref,
      active: [{ id: "r1", title: "Order Flow", nextReviewAt: new Date("2026-06-16T00:00:00Z") }],
    })
    const r = await sendLearningDigestForUser(deps(prisma, failing) as DigestDeps, user({ currentStreak: 0, lastReviewDate: null }))
    expect(failing).toHaveBeenCalledTimes(1)
    expect(r.status).toBe("send_failed")
    expect(prisma.emailLog.create).not.toHaveBeenCalled()
  })
})
