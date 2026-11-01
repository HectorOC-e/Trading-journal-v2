import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { studySessionsRouter } from "@/server/trpc/routers/study-sessions"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

const id = "11111111-1111-4111-8111-111111111111"
const resource = { id, title: "Book", type: "LIBRO", progressType: "minutes", currentUnits: 0, totalUnits: 100, status: "PENDING", nextReviewAt: null, linkedSetups: [] }

function setup(sessions: { startedAt: Date; durationMin: number; status: string }[] = []) {
  const prisma = {
    user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ timezone: "America/Tegucigalpa", weeklyGoalMinutes: 300 }) },
    learningResource: { findMany: vi.fn().mockResolvedValue([resource]), update: vi.fn().mockResolvedValue({}) },
    studySession: {
      findMany: vi.fn().mockImplementation(async ({ where }) => sessions.filter(s => {
        if (typeof where.status === "string" && s.status !== where.status) return false
        if (where.status?.in && !where.status.in.includes(s.status)) return false
        return (!where.startedAt?.gte || s.startedAt >= where.startedAt.gte) && (!where.startedAt?.lt || s.startedAt < where.startedAt.lt)
      }).map(s => ({ ...s, id, resourceId: id, resource, plannedMin: 30 }))),
      findFirst: vi.fn(), update: vi.fn().mockResolvedValue({}), updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    trade: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation(async (fn) => typeof fn === "function" ? fn(prisma) : Promise.all(fn))
  const caller = studySessionsRouter.createCaller({ prisma: prisma as never, supabase: {} as never, userId: "user-1" })
  return { prisma, caller }
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-06-16T01:00:00Z")) })
afterEach(() => vi.useRealTimers())

describe("study session calendar", () => {
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
    await expect(caller.finish({ id, durationMin: 30 })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(prisma.learningResource.update).not.toHaveBeenCalled()
  })
})
