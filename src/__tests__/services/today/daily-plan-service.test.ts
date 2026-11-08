import { describe, expect, it, vi } from "vitest"
import { getDailyPlan } from "@/server/services/today/daily-plan-service"

function setup(timezone = "Pacific/Kiritimati") {
  const prisma = {
    user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ timezone }) },
    commitment: { findMany: vi.fn().mockResolvedValue([]) },
    account: { findMany: vi.fn().mockResolvedValue([]) },
    learningResource: { findMany: vi.fn().mockResolvedValue([]) },
    studySession: { findMany: vi.fn().mockResolvedValue([]) },
    learningPractice: { aggregate: vi.fn().mockResolvedValue({ _count: { id: 0 }, _sum: { durationMin: null } }) },
  }
  return { prisma, run: () => getDailyPlan(prisma as never, "owner", new Date("2026-11-06T11:00:00Z")) }
}

describe("daily plan", () => {
  it("uses profile day bounds and scopes every source to the owner", async () => {
    const { prisma, run } = setup()
    const plan = await run()
    expect(plan.today).toBe("2026-11-07")
    expect(prisma.commitment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "owner", status: "active", archivedAt: null, startAt: { lt: new Date("2026-11-07T10:00:00Z") }, endAt: { gte: new Date("2026-11-06T10:00:00Z") } }) }))
    for (const source of [prisma.account.findMany, prisma.learningResource.findMany, prisma.studySession.findMany, prisma.learningPractice.aggregate]) {
      expect(source.mock.calls[0][0].where.userId).toBe("owner")
    }
    expect(plan.practices).toMatchObject({ sessions: 0, minutes: 0, href: "/aprendizaje?tab=practicas&register=1" })
    expect(plan.commitments).toEqual([])
    expect(plan.accounts).toEqual([])
    expect(prisma.account.findMany.mock.calls[0][0].where).toMatchObject({ status: "ACTIVE", type: { notIn: ["DEMO_PERSONAL", "DEMO_PROP", "BACKTEST", "QA"] } })
    expect(prisma.studySession.findMany.mock.calls[0][0].where).toMatchObject({ status: "planned", resource: { userId: "owner" } })
  })
  it("includes manual and SRS reviews and classifies plans using stored calendar days", async () => {
    const { prisma, run } = setup()
    prisma.learningResource.findMany.mockResolvedValue([
      { id: "manual", title: "Manual", status: "MASTERED", markedForReview: true, nextReviewAt: null },
      { id: "due", title: "SRS", status: "IN_PROGRESS", nextReviewAt: new Date("2026-11-07") },
      { id: "future", title: "Later", status: "IN_PROGRESS", nextReviewAt: new Date("2026-11-08") },
    ] as never)
    prisma.studySession.findMany.mockResolvedValue(["2026-11-06", "2026-11-07", "2026-11-08"].map((day, i) => ({ id: String(i), resourceId: "due", resource: { title: "SRS" }, startedAt: new Date(day + "T12:00:00Z"), plannedMin: 20 })) as never)
    const plan = await run()
    expect(plan.resources.map(r => r.id)).toEqual(["due", "manual"])
    expect(plan.resources[0].href).toBe("/aprendizaje?tab=repaso&resource=due")
    expect(plan.sessions.map(s => s.timing)).toEqual(["overdue", "today", "upcoming"])
    expect(plan.sessions[1].href).toBe("/aprendizaje?tab=hoy")
    expect(prisma.learningPractice.aggregate.mock.calls[0][0].where.date).toEqual({ gte: new Date("2026-11-02"), lt: new Date("2026-11-08") })
  })
  it("uses the 25-hour profile day when DST ends and handles invalid legacy zones", async () => {
    const { prisma } = setup("America/New_York")
    await getDailyPlan(prisma as never, "owner", new Date("2026-11-01T18:00:00Z"))
    expect(prisma.commitment.findMany.mock.calls[0][0].where).toMatchObject({
      startAt: { lt: new Date("2026-11-02T05:00:00Z") }, endAt: { gte: new Date("2026-11-01T04:00:00Z") },
    })
    expect((await setup("invalid/legacy").run()).timezone).toBe("UTC")
  })
  it("preserves optional weekly review origins without inventing completion", async () => {
    const { prisma, run } = setup()
    const source = { kind: "weekly", weekStart: "2026-11-02", conclusion: "Medir disciplina" }
    prisma.commitment.findMany.mockResolvedValue([{ id: "c", text: "Respetar plan", startAt: new Date("2026-11-02"), endAt: new Date("2026-11-09"), reviewSource: source }] as never)
    const plan = await run()
    expect(plan.commitments[0].reviewHref).toBe("/reviews/semanal/2026-11-02")
    expect(plan.commitments[0].reviewSource).toEqual(source)
  })
  it("propagates query failures so the card can offer retry", async () => {
    const { prisma, run } = setup()
    prisma.account.findMany.mockRejectedValue(new Error("offline"))
    await expect(run()).rejects.toThrow("offline")
  })
})
