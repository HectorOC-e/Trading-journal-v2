import { describe, it, expect, vi } from "vitest"
import { setupsRouter } from "@/server/trpc/routers/setups"
import { tagsRouter } from "@/server/trpc/routers/tags"
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/server/services/retrieval/pipeline", () => ({ scheduleEmbedding: vi.fn() }))
const userId = "550e8400-e29b-41d4-a716-446655440001"

describe("playbook mutations", () => {
 it("persists explicit null but preserves omitted Edge fields", async () => {
  const update = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: userId, ...data }))
  const caller = setupsRouter.createCaller({ userId, prisma: { setup: { update, findUniqueOrThrow: vi.fn(async () => ({ minR: 1, maxR: 3 })) } }, supabase: {} } as never)
  await caller.update({ id: userId, expectedWr: null, expectedAvgR: null, minR: null, maxR: null })
  expect(update.mock.calls[0][0].data).toEqual({ expectedWr: null, expectedAvgR: null, minR: null, maxR: null })
  await caller.update({ id: userId, name: "Changed" })
  expect(update.mock.calls[1][0].data).toEqual({ name: "Changed" })
 })
 it("validates partial ranges against owned persisted values before any writes", async () => {
  const update = vi.fn(async () => ({ id: userId }))
  const findUniqueOrThrow = vi.fn(async () => ({ minR: "1", maxR: "3" }))
  const createVersion = vi.fn()
  const caller = setupsRouter.createCaller({ userId, prisma: { setup: { update, findUniqueOrThrow }, setupVersion: { create: createVersion } }, supabase: {} } as never)
  await expect(caller.update({ id: userId, minR: 5, direction: "LONG" })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  await expect(caller.update({ id: userId, maxR: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  expect(findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: userId, userId } })
  expect(update).not.toHaveBeenCalled()
  expect(createVersion).not.toHaveBeenCalled()
  await expect(caller.update({ id: userId, minR: null })).resolves.toEqual({ id: userId })
  await expect(caller.update({ id: userId, maxR: null })).resolves.toEqual({ id: userId })
  await expect(caller.update({ id: userId, minR: 2 })).resolves.toEqual({ id: userId })
 })
 it("merges with a distinct result and counts distinct tags per trade", async () => {
  const execute = vi.fn(async () => 1)
  const query = vi.fn(async () => [])
  const prisma = { tag: { findUnique: vi.fn(async () => null), findMany: vi.fn(async () => []) }, $executeRaw: execute, $queryRaw: query, $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma) }
  const caller = tagsRouter.createCaller({ userId, prisma, supabase: {} } as never)
  await caller.merge({ dying: "A", survivor: "B" })
  const mergeSql = (execute.mock.calls[0] as unknown as [TemplateStringsArray])[0].join("?")
  expect(mergeSql).toContain("SELECT DISTINCT value")
  await caller.list()
  const countSql = (query.mock.calls[0] as unknown as [TemplateStringsArray])[0].join("?")
  expect(countSql).toContain("SELECT DISTINCT unnest(tags)")
 })
})
