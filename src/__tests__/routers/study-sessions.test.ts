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

describe('history corrections and plan guards', () => {
  const updatedAt = new Date('2026-06-15T18:00:00Z')
  const completed = { id, resourceId: id, resource, status: 'completed', source: 'focus', startedAt: updatedAt, endedAt: updatedAt, durationMin: 30, note: 'before', updatedAt, progressTypeAtFinish: 'minutes', progressUnitsApplied: 30, revisionLog: [] }
  const edit = { id, durationMin: 20, note: 'after', expectedUpdatedAt: updatedAt.toISOString(), adjustProgress: true }
  it('records immutable snapshots and reverses only the correction delta', async () => {
    const { caller, prisma } = setup()
    prisma.studySession.findFirst.mockResolvedValue(completed)
    prisma.learningResource.findUniqueOrThrow.mockResolvedValue({ ...resource, currentUnits: 100, status: 'COMPLETED', completedAt: updatedAt })
    await caller.reviseCompleted(edit)
    expect(prisma.learningResource.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ currentUnits: 90, status: 'IN_PROGRESS', completedAt: null }) }))
    expect(prisma.studySession.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1', status: 'completed' }), data: expect.objectContaining({ progressUnitsApplied: 20, revisionLog: [expect.objectContaining({ before: expect.objectContaining({ durationMin: 30 }), after: expect.objectContaining({ durationMin: 20 }), progressDelta: -10 })] }) }))
  })
  it('changes notes without writing resource progress even if adjustment was selected', async () => {
    const { caller, prisma } = setup()
    prisma.studySession.findFirst.mockResolvedValue(completed)
    await caller.reviseCompleted({ ...edit, durationMin: 30 })
    expect(prisma.learningResource.update).not.toHaveBeenCalled()
  })
  it('rejects stale edits, foreign sessions and replayed voids', async () => {
    const { caller, prisma } = setup()
    prisma.studySession.findFirst.mockResolvedValue(completed)
    await expect(caller.reviseCompleted({ ...edit, expectedUpdatedAt: new Date().toISOString() })).rejects.toMatchObject({ code: 'CONFLICT' })
    prisma.studySession.findFirst.mockResolvedValue(null)
    await expect(caller.voidCompleted(edit)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    prisma.studySession.findFirst.mockResolvedValue({ ...completed, status: 'voided' })
    await expect(caller.voidCompleted(edit)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(prisma.learningResource.update).not.toHaveBeenCalled()
  })
  it('voids without deleting and preserves a legacy contribution when adjustment is declined', async () => {
    const { caller, prisma } = setup()
    prisma.studySession.findFirst.mockResolvedValue({ ...completed, progressTypeAtFinish: null, progressUnitsApplied: null })
    await caller.voidCompleted({ id, expectedUpdatedAt: updatedAt.toISOString(), adjustProgress: false })
    expect(prisma.studySession.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'voided', progressUnitsApplied: null })
    expect(prisma.learningResource.update).not.toHaveBeenCalled()
  })
  it('rejects an impossible negative reversal rather than clamping it', async () => {
    const { caller, prisma } = setup()
    prisma.studySession.findFirst.mockResolvedValue(completed)
    await expect(caller.voidCompleted(edit)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(prisma.studySession.updateMany).not.toHaveBeenCalled()
    expect(prisma.learningResource.update).not.toHaveBeenCalled()
  })
  it('permits explicit legacy adjustment and preserves mastered status', async () => {
    const { caller, prisma } = setup()
    prisma.studySession.findFirst.mockResolvedValue({ ...completed, progressTypeAtFinish: null, progressUnitsApplied: null })
    prisma.learningResource.findUniqueOrThrow.mockResolvedValue({ ...resource, currentUnits: 30, status: 'MASTERED', completedAt: updatedAt })
    await caller.reviseCompleted(edit)
    expect(prisma.learningResource.update.mock.calls[0][0].data).toMatchObject({ currentUnits: 20, status: 'MASTERED' })
  })
  it('records actual contributions for focus and planned finishes', async () => {
    const { caller, prisma } = setup()
    prisma.studySession.findFirst.mockResolvedValue({ ...completed, status: 'active' })
    await caller.finish({ id, durationMin: 25 })
    expect(prisma.studySession.update).toHaveBeenLastCalledWith({ where: { id }, data: { progressTypeAtFinish: 'minutes', progressUnitsApplied: 25 } })
    prisma.studySession.findFirst.mockResolvedValue({ ...completed, status: 'planned', plannedMin: 15 })
    await caller.completePlanned({ id })
    expect(prisma.studySession.update).toHaveBeenLastCalledWith({ where: { id }, data: { progressTypeAtFinish: 'minutes', progressUnitsApplied: 15 } })
  })
  it('guards plan edits and cancellation against concurrent completion', async () => {
    const { caller, prisma } = setup()
    await caller.reschedule({ id, date: '2026-06-20', plannedMin: 45 })
    expect(prisma.studySession.updateMany.mock.calls[0][0]).toMatchObject({ where: { id, userId: 'user-1', status: 'planned' }, data: { plannedMin: 45, startedAt: new Date('2026-06-20T12:00:00Z') } })
    await caller.cancelPlanned({ id })
    expect(prisma.studySession.updateMany.mock.calls[1][0].data.status).toBe('cancelled')
    prisma.studySession.updateMany.mockResolvedValue({ count: 0 })
    await expect(caller.cancelPlanned({ id })).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(caller.reschedule({ id, date: '2026-06-21', plannedMin: 30 })).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

describe('paginated session history', () => {
  it('returns legacy confirmation and a stable cursor without exposing foreign cursors', async () => {
    const { caller, prisma } = setup()
    const updatedAt = new Date('2026-06-15T18:00:00Z')
    const session = { id, resourceId: id, resource, status: 'completed', source: 'focus', startedAt: updatedAt, endedAt: updatedAt, durationMin: 30, plannedMin: null, note: '', updatedAt, progressTypeAtFinish: null, progressUnitsApplied: null, revisionLog: [] }
    prisma.studySession.findMany.mockResolvedValue([session, { ...session, id: '22222222-2222-4222-8222-222222222222' }])
    const result = await caller.history({ limit: 1 })
    expect(result).toMatchObject({ nextCursor: id, items: [{ id, updatedAt: updatedAt.toISOString(), canAdjustProgress: true, needsProgressConfirmation: true, revisionCount: 0 }] })
    expect(prisma.studySession.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1', status: { in: ['completed', 'voided'] } }, orderBy: [{ endedAt: { sort: 'desc', nulls: 'last' } }, { startedAt: 'desc' }, { id: 'desc' }], take: 2 }))
    prisma.studySession.findFirst.mockResolvedValue(null)
    await expect(caller.history({ limit: 1, cursor: id })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('disables incompatible unit adjustment and counts saved revisions', async () => {
    const { caller, prisma } = setup()
    const now = new Date()
    prisma.studySession.findMany.mockResolvedValue([{ id, resourceId: id, resource, status: 'voided', source: 'focus', startedAt: now, endedAt: now, durationMin: 10, plannedMin: null, note: '', updatedAt: now, progressTypeAtFinish: 'sessions', progressUnitsApplied: 1, revisionLog: [{ action: 'void' }] }])
    expect(await caller.history({ limit: 20 })).toMatchObject({ nextCursor: null, items: [{ status: 'voided', canAdjustProgress: false, needsProgressConfirmation: false, revisionCount: 1 }] })
  })
})

describe('simultaneous corrections', () => {
  it('applies one resource delta when an edit races a void with the same version', async () => {
    const { caller, prisma } = setup()
    const updatedAt = new Date('2026-06-15T18:00:00Z')
    const session = { id, resourceId: id, resource, status: 'completed', source: 'focus', startedAt: updatedAt, endedAt: updatedAt, durationMin: 30, note: '', updatedAt, progressTypeAtFinish: 'minutes', progressUnitsApplied: 30, revisionLog: [] }
    let lockTail = Promise.resolve()
    prisma.$transaction.mockImplementation(async fn => {
      let release: (() => void) | undefined
      const tx = { ...prisma, $queryRaw: async (strings: TemplateStringsArray) => {
        if (strings.join('').includes('study_sessions')) {
          const previous = lockTail
          lockTail = new Promise<void>(resolve => { release = resolve })
          await previous
        }
        return [{ id }]
      } }
      try { return await fn(tx) } finally { release?.() }
    })
    prisma.studySession.findFirst.mockImplementation(async () => ({ ...session }))
    prisma.studySession.updateMany.mockImplementation(async ({ data }) => { Object.assign(session, data); return { count: 1 } })
    prisma.learningResource.findUniqueOrThrow.mockResolvedValue({ ...resource, currentUnits: 30 })
    const results = await Promise.allSettled([
      caller.reviseCompleted({ id, durationMin: 20, note: 'corrected', expectedUpdatedAt: updatedAt.toISOString(), adjustProgress: true }),
      caller.voidCompleted({ id, expectedUpdatedAt: updatedAt.toISOString(), adjustProgress: true }),
    ])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1)
    expect(prisma.learningResource.update).toHaveBeenCalledTimes(1)
    expect(session.revisionLog).toHaveLength(1)
  })
})

describe('planned completion locking', () => {
  it('reads the latest plan duration only after obtaining the session lock', async () => {
    const { caller, prisma } = setup()
    let plannedMin = 15
    prisma.$queryRaw.mockImplementation(async (strings: TemplateStringsArray) => {
      // Simulate a reschedule committing while completion waits for the lock.
      if (strings.join('').includes('study_sessions')) plannedMin = 45
      return [{ id }]
    })
    prisma.studySession.findFirst.mockImplementation(async () => ({ id, resourceId: id, status: 'planned', plannedMin }))
    await caller.completePlanned({ id })
    expect(prisma.studySession.updateMany.mock.calls[0][0].data.durationMin).toBe(45)
    expect(prisma.studySession.update.mock.calls[0][0].data.progressUnitsApplied).toBe(45)
  })
})

describe('database timestamp precision and local plan dates', () => {
  it('revises a locked legacy timestamp with sub-millisecond database precision', async () => {
    const { caller, prisma } = setup()
    // PostgreSQL stores .123456; Prisma exposes the millisecond Date .123.
    const updatedAt = new Date('2026-06-15T18:00:00.123Z')
    prisma.studySession.findFirst.mockResolvedValue({ id, resourceId: id, status: 'completed', durationMin: 30, note: '', updatedAt, progressTypeAtFinish: null, progressUnitsApplied: null, revisionLog: [] })
    prisma.studySession.updateMany.mockImplementation(async ({ where }) => ({ count: where.updatedAt ? 0 : 1 }))
    await expect(caller.reviseCompleted({ id, durationMin: 30, note: 'legacy correction', expectedUpdatedAt: updatedAt.toISOString(), adjustProgress: false })).resolves.toEqual({ ok: true })
  })
  it('rejects rescheduling before the profile local day but allows today', async () => {
    const { caller, prisma } = setup()
    // UTC June 16 is still June 15 in the profile timezone.
    await expect(caller.reschedule({ id, date: '2026-06-14', plannedMin: 30 })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    expect(prisma.studySession.updateMany).not.toHaveBeenCalled()
    await expect(caller.reschedule({ id, date: '2026-06-15', plannedMin: 30 })).resolves.toEqual({ ok: true })
  })
})

describe("all planned sessions", () => {
  it("paginates overdue and far-future plans with owner and status filters", async () => {
    const { caller, prisma } = setup()
    prisma.studySession.findMany.mockResolvedValue([
      { id, resourceId: id, resource, startedAt: new Date("2025-01-01T12:00:00Z"), plannedMin: 30 },
      { id: "22222222-2222-4222-8222-222222222222", resourceId: id, resource, startedAt: new Date("2027-01-01T12:00:00Z"), plannedMin: 60 },
    ])
    expect(await caller.plans({ limit: 1 })).toEqual({ items: [{ id, resourceId: id, resourceTitle: "Book", resourceType: "LIBRO", reviewSource: null, date: "2025-01-01", plannedMin: 30 }], nextCursor: id })
    expect(prisma.studySession.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1", status: "planned" }, orderBy: [{ startedAt: "asc" }, { id: "asc" }], take: 2 }))
    prisma.studySession.findFirst.mockResolvedValue(null)
    await expect(caller.plans({ limit: 20, cursor: id })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
  it("uses a valid owned plan cursor and returns the last page", async () => {
    const { caller, prisma } = setup()
    prisma.studySession.findFirst.mockResolvedValue({ id })
    prisma.studySession.findMany.mockResolvedValue([])
    expect(await caller.plans({ limit: 20, cursor: id })).toEqual({ items: [], nextCursor: null })
    expect(prisma.studySession.findFirst).toHaveBeenCalledWith({ where: { id, userId: "user-1", status: "planned" } })
    expect(prisma.studySession.findMany).toHaveBeenCalledWith(expect.objectContaining({ cursor: { id }, skip: 1 }))
  })
})

it.each(["ABANDONED", "MASTERED", "IN_REVIEW"])("study finish keeps %s and records first observed completion", async status => {
  const { caller, prisma } = setup()
  prisma.studySession.findFirst.mockResolvedValue({ id, resourceId: id, status: "active" })
  prisma.learningResource.findUniqueOrThrow.mockResolvedValue({ ...resource, currentUnits: 90, status, completedAt: null })
  await caller.finish({ id, durationMin: 10 })
  const data = prisma.learningResource.update.mock.calls[0][0].data
  expect(data).toMatchObject({ currentUnits: 100, status })
  expect(data).toHaveProperty("completedAt", expect.any(Date))
})
