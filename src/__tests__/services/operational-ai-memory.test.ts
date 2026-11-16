import { expect, it } from "vitest"
import { assembleCoachContext, editMemory, listMemory } from "@/server/services/coach/coach-memory-service"
import { ensureThread } from "@/server/services/coach/coach-thread-service"
import type { PrismaClient } from "@/lib/generated/prisma/client"

function matches(row: Record<string, unknown>, where: Record<string, any>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return value.some((w: any) => matches(row, w))
    if (key === "AND") return value.every((w: any) => matches(row, w))
    if (value && typeof value === "object") {
      if ("in" in value) return value.in.includes(row[key])
      if ("not" in value) return row[key] !== value.not
    }
    return row[key] === value
  })
}

it("only scoped memory and explicitly shared manual identity/preferences enter the prompt", async () => {
  const records = [
    { userId: "u", status: "confirmed", kind: "fact", source: "llm", content: "real-performance", operationalMode: "REAL" },
    { userId: "u", status: "confirmed", kind: "fact", source: "llm", content: "demo-performance", operationalMode: "DEMO" },
    { userId: "u", status: "confirmed", kind: "fact", source: "llm", content: "legacy-mixed", operationalMode: null },
    { userId: "u", status: "confirmed", kind: "preference", source: "user", content: "manual-tone", operationalMode: null },
    { userId: "u", status: "confirmed", kind: "fact", source: "user", content: "historical-manual-note", operationalMode: null },
  ]
  const prisma = {
    coachMemory: { findMany: async ({ where }: any) => records.filter(r => matches(r, where)) },
    commitment: { findMany: async () => [] }, coachThread: { findFirst: async () => null },
    memoryEpisode: { findMany: async () => [] }, memoryPattern: { findMany: async () => [] },
    memoryIdentity: { findUnique: async () => null }, improvementSnapshot: { findMany: async () => [] },
  } as unknown as PrismaClient
  const text = await assembleCoachContext(prisma, "u", "DEMO")
  expect(text).toContain("demo-performance")
  expect(text).toContain("manual-tone")
  expect(text).not.toContain("real-performance")
  expect(text).not.toContain("legacy-mixed")
  expect(text).not.toContain("historical-manual-note")
  const visible = await listMemory(prisma, "u", "DEMO")
  expect(visible.map(row => row.content)).toContain("historical-manual-note")
})

it("a Real thread cannot receive a Demo exchange", async () => {
  const created: any[] = []
  const prisma = {
    coachThread: {
      findFirst: async ({ where }: any) => matches({ id: "real", userId: "u", operationalMode: "REAL" }, where) ? { id: "real" } : null,
      create: async ({ data }: any) => { created.push(data); return { id: "new" } },
    },
  } as unknown as PrismaClient
  const thread = await ensureThread(prisma, "u", "real", "DEMO")
  expect(thread.id).toBe("new")
  expect(created).toEqual([{ userId: "u", operationalMode: "DEMO" }])
})

it("editing a memory in Demo cannot alter a Real fact", async () => {
  const record = { id: "fact", userId: "u", operationalMode: "REAL", content: "Original", source: "llm", kind: "fact" }
  const prisma = { coachMemory: { updateMany: async ({ where, data }: any) => {
    if (matches(record, where)) Object.assign(record, data)
    return { count: 1 }
  } } } as unknown as PrismaClient
  await editMemory(prisma, "u", "fact", "Changed from Demo", "DEMO")
  expect(record.content).toBe("Original")
})
