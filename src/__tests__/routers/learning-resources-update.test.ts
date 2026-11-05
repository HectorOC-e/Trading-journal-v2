import { expect, it, vi } from "vitest"
import { learningResourcesRouter } from "@/server/trpc/routers/learning-resources"
vi.mock("@/server/services/learning/learning-insights-service", () => ({ getResourceTransfer: vi.fn().mockResolvedValue(null) }))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/server/services/retrieval/pipeline", () => ({ scheduleEmbedding: vi.fn() }))

const id = "11111111-1111-4111-8111-111111111111"
function setup() {
  const row = { id, currentUnits: 108, totalUnits: 200, progressPct: 54, notes: "Before", author: "Author", source: "Source", tags: ["trading"], markedForReview: true, status: "MASTERED" }
  const prisma = {
    learningResource: {
      findUniqueOrThrow: vi.fn(async () => ({ ...row })),
      update: vi.fn(async ({ data }) => Object.assign(row, data)),
    },
    $executeRaw: vi.fn(async () => 1),
    $queryRaw: vi.fn(async () => [{ id }]),
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation(async fn => fn(prisma))
  return { row, prisma, caller: learningResourcesRouter.createCaller({ prisma: prisma as never, userId: "u", supabase: {} as never }) }
}

it.each([
  [{ currentUnits: 110 }, { currentUnits: 110, totalUnits: 200, progressPct: 55 }],
  [{ totalUnits: 300 }, { currentUnits: 108, totalUnits: 300, progressPct: 36 }],
  [{ currentUnits: null }, { currentUnits: null, totalUnits: 200, progressPct: null }],
  [{ totalUnits: null }, { currentUnits: 108, totalUnits: null, progressPct: null }],
])("recomputes progress for partial units patch %j", async (patch, expected) => {
  const { caller, row } = setup()
  await caller.update({ id, ...patch })
  expect(row).toMatchObject({ ...expected, status: "MASTERED", notes: "Before", author: "Author", source: "Source", tags: ["trading"], markedForReview: true })
})

it("notes-only edits preserve authoritative progress without a transaction", async () => {
  const { caller, row, prisma } = setup()
  await caller.update({ id, notes: "" })
  expect(row).toMatchObject({ currentUnits: 108, totalUnits: 200, progressPct: 54, notes: "", author: "Author", source: "Source", tags: ["trading"], markedForReview: true, status: "MASTERED" })
  expect(prisma.$transaction).not.toHaveBeenCalled()
  expect(prisma.learningResource.findUniqueOrThrow).not.toHaveBeenCalled()
})

it("reads the counterpart after acquiring the resource row lock", async () => {
  const { caller, row, prisma } = setup()
  prisma.$queryRaw.mockImplementation(async () => {
    // A study completion commits while this editor waits to acquire the lock.
    row.currentUnits = 120
    return [{ id }]
  })
  await caller.update({ id, totalUnits: 300 })
  expect(row).toMatchObject({ currentUnits: 120, totalUnits: 300, progressPct: 40 })
})

it("editor completion and reopening preserve the first completion date", async () => {
  const { caller, row, prisma } = setup()
  Object.assign(row, { status: "IN_PROGRESS", completedAt: null })
  await caller.update({ id, currentUnits: 200 })
  expect(row).toMatchObject({ status: "COMPLETED", progressPct: 100, completedAt: expect.any(Date) })
  const completedAt = (row as typeof row & { completedAt: Date }).completedAt
  await caller.update({ id, currentUnits: 100 })
  expect(row).toMatchObject({ status: "IN_PROGRESS", completedAt })
  await caller.update({ id, currentUnits: 200 })
  expect(row).toMatchObject({ status: "COMPLETED", completedAt })
  expect(prisma.$queryRaw).toHaveBeenCalledTimes(3)
})

it.each(["ABANDONED", "MASTERED", "IN_REVIEW"])("unit edits preserve explicit %s lifecycle", async status => {
  const { caller, row } = setup()
  Object.assign(row, { status, completedAt: null })
  await caller.update({ id, currentUnits: 200 })
  expect(row).toMatchObject({ status, completedAt: null, progressPct: 100 })
})

it("updateProgress locks before reading and uses the same completion lifecycle", async () => {
  const { caller, row, prisma } = setup()
  Object.assign(row, { status: "IN_PROGRESS", completedAt: null, date: new Date(), createdAt: new Date(), updatedAt: new Date() })
  prisma.$queryRaw.mockImplementation(async () => { row.totalUnits = 110; return [{ id }] })
  await caller.updateProgress({ id, currentUnits: 110 })
  expect(row).toMatchObject({ status: "COMPLETED", progressPct: 100, completedAt: expect.any(Date) })
  expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  expect(prisma.learningResource.findUniqueOrThrow).toHaveBeenCalledWith(expect.objectContaining({ where: { id, userId: "u" } }))
})

it("reopened resources retain their historical setup-impact baseline", async () => {
  const { caller, row, prisma } = setup()
  const completedAt = new Date("2026-06-01T12:00:00Z")
  Object.assign(row, { status: "COMPLETED", completedAt, linkedSetups: [{ id: "setup", name: "Setup" }] })
  await caller.update({ id, currentUnits: 100 })
  const trade = { findMany: vi.fn().mockResolvedValue([]) }
  const impactCaller = learningResourcesRouter.createCaller({ prisma: { ...prisma, trade } as never, userId: "u", supabase: {} as never })
  expect(await impactCaller.setupImpact(id)).toEqual([expect.objectContaining({ setupId: "setup", completedAt: completedAt.toISOString() })])
  expect(row.status).toBe("IN_PROGRESS")
  expect(trade.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u", setupId: "setup", date: { gte: completedAt }, status: "CLOSED" } }))
})
