import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { learningResourcesRouter } from "@/server/trpc/routers/learning-resources"
vi.mock("@/server/services/learning/learning-insights-service", () => ({ getResourceTransfer: vi.fn().mockResolvedValue(null) }))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/server/services/retrieval/pipeline", () => ({ scheduleEmbedding: vi.fn() }))
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-06-30T12:30:00Z")) })
afterEach(() => vi.useRealTimers())
it("uses the local day and one review queue, with completed study metrics", async () => {
  const rows = [
    { id: "today", status: "COMPLETED", nextReviewAt: new Date("2026-07-01T00:00:00Z") },
    { id: "marked", status: "MASTERED", nextReviewAt: null, markedForReview: true },
    { id: "mastered", status: "MASTERED", nextReviewAt: new Date("2026-06-01T00:00:00Z") },
    { id: "archived", status: "ABANDONED", nextReviewAt: null, markedForReview: true },
    { id: "tomorrow", status: "COMPLETED", nextReviewAt: new Date("2026-07-02T00:00:00Z") },
  ].map(r => ({ title: r.id, type: "LIBRO", completedAt: new Date("2026-06-30T12:00:00Z"), ...r }))
  const prisma = {
    user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ timezone: "Pacific/Kiritimati", weeklyGoalMinutes: 300, currentStreak: 99, bestStreak: 99 }) },
    learningResource: { findMany: vi.fn().mockResolvedValue(rows) },
    studySession: { findMany: vi.fn().mockResolvedValue([
      { startedAt: new Date("2026-06-30T11:00:00Z"), durationMin: 60, status: "completed", source: "timer", plannedMin: null, endedAt: null },
      { startedAt: new Date("2026-06-29T11:00:00Z"), durationMin: 30, status: "completed", source: "timer", plannedMin: null, endedAt: null },
    ]) },
  }
  const caller = learningResourcesRouter.createCaller({ prisma: prisma as never, supabase: {} as never, userId: "u" })
  const stats = await caller.stats()
  expect(stats.pendingReviewsCount).toBe(2)
  expect(stats.urgentReviews.map(r => r.id).sort()).toEqual(["marked", "today"])
  expect(["marked", "today"]).toContain(stats.focusResource?.id)
  expect(stats.completedThisMonth).toBe(4)
  expect(stats.minutesThisWeek).toBe(90)
  expect(stats.estimatedHoursThisWeek).toBe(1.5)
  expect(stats.currentStreak).toBe(2)
  expect(stats.bestStreak).toBe(2)
})
it("uses completion timestamps for legacy manual plans and ignores stale legacy counters", async () => {
  const prisma = {
    user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ timezone: "Invalid/Zone", weeklyGoalMinutes: 120, currentStreak: 99, bestStreak: 99 }) },
    learningResource: { findMany: vi.fn().mockResolvedValue([]) },
    studySession: { findMany: vi.fn().mockResolvedValue([
      { startedAt: new Date("2026-06-01T12:00:00Z"), endedAt: new Date("2026-06-30T12:00:00Z"), durationMin: 40, status: "completed", source: "manual", plannedMin: 40 },
      { startedAt: new Date("2026-06-30T13:00:00Z"), endedAt: null, durationMin: 80, status: "completed", source: "timer", plannedMin: null },
      { startedAt: new Date("2026-06-30T10:00:00Z"), endedAt: null, durationMin: 0, status: "completed", source: "timer", plannedMin: null },
    ]) },
  }
  const caller = learningResourcesRouter.createCaller({ prisma: prisma as never, supabase: {} as never, userId: "u" })
  const stats = await caller.stats()
  expect(stats.minutesThisWeek).toBe(40)
  expect(stats.currentStreak).toBe(1)
  expect(stats.bestStreak).toBe(1)
  expect(stats.pendingReviewsCount).toBe(0)
  expect(stats.focusResource).toBeNull()
})

it("schedules reviews and materialized streaks from the profile calendar day", async () => {
  const prisma = {
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ timezone: "Pacific/Kiritimati", currentStreak: 3, bestStreak: 3, lastReviewDate: new Date("2026-06-30T00:00:00Z") }),
      update: vi.fn().mockResolvedValue({}),
    },
    learningResource: { findUniqueOrThrow: vi.fn().mockResolvedValue({ status: "COMPLETED", reviewInterval: 1 }), update: vi.fn().mockResolvedValue({}) },
    resourceReview: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockImplementation(async ({ data }) => ({ ...data, createdAt: new Date() })),
    },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation(async fn => fn(prisma))
  const caller = learningResourcesRouter.createCaller({ prisma: prisma as never, supabase: {} as never, userId: "u" })
  await caller.createReview({ resourceId: "11111111-1111-4111-8111-111111111111", learned: "Lesson", rating: 4, masteryLevel: 3 })
  expect(prisma.resourceReview.create.mock.calls[0][0].data.nextReviewAt).toEqual(new Date("2026-07-02T00:00:00Z"))
  expect(prisma.user.update.mock.calls[0][0].data).toMatchObject({ currentStreak: 4, lastReviewDate: new Date("2026-07-01T00:00:00Z") })
})
it("evaluates decay on the profile day at the interval boundary", async () => {
  const prisma = {
    user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ timezone: "Pacific/Kiritimati" }) },
    learningResource: {
      findMany: vi.fn().mockResolvedValue([{ id: "r", status: "MASTERED", nextReviewAt: new Date("2026-06-28T00:00:00Z"), reviewInterval: 1 }]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  }
  const caller = learningResourcesRouter.createCaller({ prisma: prisma as never, supabase: {} as never, userId: "u" })
  expect(await caller.processDecayTransitions()).toEqual({ transitioned: 1 })
})
