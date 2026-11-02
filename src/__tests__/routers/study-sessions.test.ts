import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { studySessionsRouter } from "@/server/trpc/routers/study-sessions"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

const id = "11111111-1111-4111-8111-111111111111"
const resource = { id, title: "Book", type: "LIBRO", progressType: "minutes", currentUnits: 0, totalUnits: 100, status: "PENDING", nextReviewAt: null, linkedSetups: [] }

function setup(sessions: { startedAt: Date; durationMin: number; status: string }[] = []) {
  const prisma = {
    user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ timezone: "America/Tegucigalpa", weeklyGoalMinutes: 300 }) },
    learningResource: { findMany: vi.fn().mockResolvedValue([resource]), findFirst: vi.fn().mockResolvedValue({ id }), findUniqueOrThrow: vi.fn().mockResolvedValue(resource), update: vi.fn().mockResolvedValue({}) },
    studySession: {
      findMany: vi.fn().mockImplementation(async ({ where }) => sessions.filter(s => {
        if (typeof where.status === "string" && s.status !== where.status) return false
        if (where.status?.in && !where.status.in.includes(s.status)) return false
        return (!where.startedAt?.gte || s.startedAt >= where.startedAt.gte) && (!where.startedAt?.lt || s.startedAt < where.startedAt.lt)
      }).map(s => ({ ...s, id, resourceId: id, resource, plannedMin: 30 }))),
      findFirst: vi.fn(), create: vi.fn(), update: vi.fn().mockResolvedValue({}), updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    trade: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn(),
    $queryRaw: vi.fn().mockResolvedValue([{ id }]),
  }
  prisma.$transaction.mockImplementation(async (fn) => typeof fn === "function" ? fn(prisma) : Promise.all(fn))
  const caller = studySessionsRouter.createCaller({ prisma: prisma as never, supabase: {} as never, userId: "user-1" })
  return { prisma, caller }
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-06-16T01:00:00Z")) })
afterEach(() => vi.useRealTimers())

describe("study session calendar", () => {
  it("rejects starting or planning a resource outside the authenticated user's library", async () => {
    const { caller, prisma } = setup()
    prisma.learningResource.findFirst.mockResolvedValue(null)
    await expect(caller.start({ resourceId: id })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(caller.plan({ resourceId: id, date: "2026-06-16", plannedMin: 30 })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(prisma.studySession.create).not.toHaveBeenCalled()
  })
  it("returns the local day and includes today's plan even after its placeholder time", async () => {
    const { caller } = setup([{ startedAt: new Date("2026-06-15T12:00:00Z"), durationMin: 0, status: "planned" }])
    const home = await caller.home()
    expect(home.weekDays.find(d => d.isToday)?.date).toBe("2026-06-15")
    expect(home.agenda).toHaveLength(1)
  })

  it("retains streaks longer than 60 days and ignores zero-minute sessions", async () => {
    const dates = Array.from({ length: 90 }, (_, i) => ({
      startedAt: new Date(new Date("2026-06-15T18:00:00Z").getTime() - i * 86400000), durationMin: 30, status: "completed",
    }))
    const { caller } = setup(dates)
    expect((await caller.home()).week.streak).toBe(90)
    const empty = setup([{ startedAt: new Date("2026-06-15T18:00:00Z"), durationMin: 0, status: "completed" }])
    expect((await empty.caller.home()).week.streak).toBe(0)
  })

  it("records a planned completion on the actual study day", async () => {
    const { caller, prisma } = setup()
    prisma.studySession.findFirst.mockResolvedValue({ id, resourceId: id, resource, status: "planned", plannedMin: 30, startedAt: new Date("2026-06-10T12:00:00Z") })
    await caller.completePlanned({ id })
    const write = prisma.studySession.updateMany.mock.calls[0]?.[0] ?? prisma.studySession.update.mock.calls[0]?.[0]
    expect(write.data.startedAt).toEqual(new Date())
    expect(write.data.durationMin).toBe(30)
  })

  it("does not apply progress again when finish is retried", async () => {
    const { caller, prisma } = setup()
    prisma.studySession.findFirst.mockResolvedValue({ id, resourceId: id, resource, status: "completed" })
    prisma.studySession.updateMany.mockResolvedValue({ count: 0 })
    await expect(caller.finish({ id, durationMin: 30, note: "retry", markForReview: true })).resolves.toEqual({ ok: true })
    expect(prisma.studySession.updateMany).not.toHaveBeenCalled()
    expect(prisma.learningResource.update).not.toHaveBeenCalled()
  })

  it("recovers a concurrent finish after another request claims the session", async () => {
    const { caller, prisma } = setup()
    prisma.studySession.findFirst
      .mockResolvedValueOnce({ id, resourceId: id, status: "active" })
      .mockResolvedValueOnce({ id, resourceId: id, status: "completed", durationMin: 20, note: "original" })
    prisma.studySession.updateMany.mockResolvedValue({ count: 0 })
    await expect(caller.finish({ id, durationMin: 30, note: "retry", markForReview: true })).resolves.toEqual({ ok: true })
    expect(prisma.learningResource.update).not.toHaveBeenCalled()
    expect(prisma.studySession.findFirst).toHaveBeenLastCalledWith({ where: { id, userId: "user-1" } })
  })

  it.each([1441, 2_147_483_647])("preserves the full duration of a session lasting %s minutes", async durationMin => {
    const { caller, prisma } = setup()
    prisma.studySession.findFirst.mockResolvedValue({ id, resourceId: id, status: "active" })
    await expect(caller.finish({ id, durationMin })).resolves.toEqual({ ok: true })
    expect(prisma.studySession.updateMany.mock.calls[0][0].data.durationMin).toBe(durationMin)
    expect(prisma.learningResource.update.mock.calls[0][0].data.currentUnits).toBe(durationMin)
  })

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648])("rejects invalid duration %s before changing a session", async durationMin => {
    const { caller, prisma } = setup()
    await expect(caller.finish({ id, durationMin })).rejects.toMatchObject({ code: "BAD_REQUEST" })
    expect(prisma.studySession.updateMany).not.toHaveBeenCalled()
  })

  it("retains the first completion when its response is lost and the client retries", async () => {
    const { caller, prisma } = setup()
    const session = { id, resourceId: id, status: "active", durationMin: 0, note: "" }
    prisma.studySession.findFirst.mockImplementation(async () => ({ ...session }))
    prisma.studySession.updateMany.mockImplementation(async ({ data }) => {
      Object.assign(session, data)
      return { count: 1 }
    })
    await caller.finish({ id, durationMin: 20, note: "original" })
    await expect(caller.finish({ id, durationMin: 30, note: "retry", markForReview: true })).resolves.toEqual({ ok: true })
    expect(session).toMatchObject({ status: "completed", durationMin: 20, note: "original" })
    expect(prisma.learningResource.update).toHaveBeenCalledTimes(1)
    expect(prisma.learningResource.update.mock.calls[0][0].data.currentUnits).toBe(20)
    expect(prisma.studySession.updateMany).toHaveBeenCalledTimes(1)
  })

  it("does not finish planned sessions or sessions outside the user's library", async () => {
    const { caller, prisma } = setup()
    prisma.studySession.findFirst.mockResolvedValue({ id, resourceId: id, status: "planned" })
    prisma.studySession.updateMany.mockResolvedValue({ count: 0 })
    await expect(caller.finish({ id, durationMin: 30 })).rejects.toMatchObject({ code: "CONFLICT" })
    prisma.studySession.findFirst.mockResolvedValue(null)
    await expect(caller.finish({ id, durationMin: 30 })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(prisma.studySession.findFirst).toHaveBeenLastCalledWith({ where: { id, userId: "user-1" } })
    expect(prisma.learningResource.update).not.toHaveBeenCalled()
  })

  it("adds both completions when different sessions finish the same resource concurrently", async () => {
    const { caller, prisma } = setup()
    const otherId = "22222222-2222-4222-8222-222222222222"
    let currentUnits = 0
    let lockTail = Promise.resolve()
    prisma.$transaction.mockImplementation(async fn => {
      let release: (() => void) | undefined
      const tx = {
        ...prisma,
        $queryRaw: async () => {
          const previous = lockTail
          lockTail = new Promise<void>(resolve => { release = resolve })
          await previous
          return [{ id }]
        },
      }
      try { return await fn(tx) } finally { release?.() }
    })
    prisma.studySession.findFirst.mockImplementation(async ({ where }) => ({
      id: where.id, resourceId: id, status: "active", resource: { ...resource, currentUnits },
    }))
    prisma.learningResource.findUniqueOrThrow.mockImplementation(async () => ({ ...resource, currentUnits }))
    prisma.learningResource.update.mockImplementation(async ({ data }) => {
      currentUnits = data.currentUnits
      return { ...resource, ...data }
    })
    await Promise.all([caller.finish({ id, durationMin: 20 }), caller.finish({ id: otherId, durationMin: 30 })])
    expect(currentUnits).toBe(50)
  })

  it("counts an old planned completion on the actual day even if its planned date was in the future", async () => {
    const { caller, prisma } = setup()
    prisma.studySession.findMany.mockResolvedValue([{
      id, resourceId: id, resource, status: "completed", source: "manual", plannedMin: 30,
      startedAt: new Date("2026-06-20T12:00:00Z"), endedAt: new Date("2026-06-15T18:00:00Z"), durationMin: 30,
    }])
    const result = await caller.home()
    expect(result.week.hoursMin).toBe(30)
    expect(result.week.streak).toBe(1)
    expect(result.weekDays.find(d => d.date === "2026-06-15")?.sessions).toBe(1)
    expect((await caller.recent())[0].startedAt).toBe("2026-06-15T18:00:00.000Z")
  })

  it("uses the shared review queue including manually marked mastered resources", async () => {
    const { caller, prisma } = setup()
    prisma.learningResource.findMany.mockResolvedValue([
      { ...resource, id: "marked", status: "MASTERED", markedForReview: true },
      { ...resource, id: "due", nextReviewAt: new Date("2026-06-15T00:00:00Z") },
      { ...resource, id: "tomorrow", nextReviewAt: new Date("2026-06-16T00:00:00Z") },
      { ...resource, id: "archived", status: "ABANDONED", markedForReview: true },
    ])
    expect((await caller.home()).due.map(r => r.id).sort()).toEqual(["due", "marked"])
  })

  it("uses UTC consistently for an invalid legacy profile timezone", async () => {
    const { caller, prisma } = setup()
    prisma.user.findUniqueOrThrow.mockResolvedValue({ timezone: "Invalid/Legacy", weeklyGoalMinutes: 300 })
    const home = await caller.home()
    expect(home.timezone).toBe("UTC")
    expect(home.todayKey).toBe("2026-06-16")
  })
})
