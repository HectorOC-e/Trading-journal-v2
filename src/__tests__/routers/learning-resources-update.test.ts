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
