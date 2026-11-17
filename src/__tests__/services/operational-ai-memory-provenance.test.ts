import { beforeEach, expect, it, vi } from "vitest"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { assembleCoachContext } from "@/server/services/coach/coach-memory-service"
import { getSalientEpisodes, recallEpisodes, recordEpisodeOnce } from "@/server/services/memory/memory-episode-service"
import { recomputeMemoryPatterns, recomputeMemoryPatternsForAll } from "@/server/services/memory/memory-pattern-service"
import { resolveEmbeddingCall } from "@/lib/ai/resolve-provider"
vi.mock("@/lib/ai/resolve-provider", () => ({ resolveEmbeddingCall: vi.fn(async () => ({ source: "none", model: "synthetic", apiKey: "synthetic" })) }))
vi.mock("@/lib/ai/embeddings", () => ({ embedText: vi.fn(async () => [1, 0]) }))
beforeEach(() => vi.mocked(resolveEmbeddingCall).mockResolvedValue({ source: "none", model: "synthetic", apiKey: "synthetic" } as never))

function matches(row: Record<string, any>, where: Record<string, any> = {}): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === "object" && "in" in value) return value.in.includes(row[key])
    return row[key] === value
  })
}
const episode = (id: string, operationalMode: string | null, content = id) => ({ id, userId: "u", operationalMode, content, eventType: "commitment_broken", salience: 0.9, occurredAt: new Date("2026-11-16") })

it("new Demo episodes and patterns enter only Demo context; text prefixes cannot attribute legacy", async () => {
  const episodes = [episode("real-event", "REAL"), episode("demo-event", "DEMO"), episode("legacy-event", null, "[DEMO] mixed legacy")]
  const patterns = [{ userId: "u", operationalMode: "REAL", status: "confirmed", text: "real-pattern", confidence: 0.9 }, { userId: "u", operationalMode: "DEMO", status: "confirmed", text: "demo-pattern", confidence: 0.9 }]
  const prisma = {
    coachMemory: { findMany: async () => [] }, commitment: { findMany: async () => [] }, coachThread: { findFirst: async () => null },
    memoryEpisode: { findMany: async ({ where, take }: any) => episodes.filter(e => matches(e, where)).slice(0, take) },
    memoryPattern: { findMany: async ({ where, take }: any) => patterns.filter(p => matches(p, where)).slice(0, take) },
    memoryIdentity: { findUnique: async () => null },
  } as unknown as PrismaClient
  const text = await assembleCoachContext(prisma, "u", "DEMO")
  expect(text).toContain("demo-event")
  expect(text).toContain("demo-pattern")
  expect(text).not.toContain("real-event")
  expect(text).not.toContain("real-pattern")
  expect(text).not.toContain("mixed legacy")
  const salient = await getSalientEpisodes(prisma, "u", 4, "REAL")
  expect(salient.map(e => e.id)).toEqual(["real-event"])
})

function patternDb() {
  const episodes = [episode("r1", "REAL"), ...Array.from({ length: 500 }, (_, i) => episode(`d${i}`, "DEMO")), episode("old", null)]
  const saved = new Map<string, any>()
  const prisma = {
    memoryEpisode: { findMany: async ({ where, distinct, take }: any = {}) => {
      const rows = episodes.filter(row => matches(row, where))
      if (distinct) return [{ userId: "u", operationalMode: "REAL" }, { userId: "u", operationalMode: "DEMO" }]
      return rows.slice(0, take)
    } },
    memoryPattern: {
      upsert: async ({ create }: any) => { saved.set(`${create.operationalMode}:${create.patternKey}`, create); return create },
      updateMany: async () => ({ count: 0 }),
    },
  } as unknown as PrismaClient
  return { prisma, saved }
}

it("the same pattern key has independent support and confirmation in Real and Demo", async () => {
  const { prisma, saved } = patternDb()
  await recomputeMemoryPatterns(prisma, "u", "REAL")
  await recomputeMemoryPatterns(prisma, "u", "DEMO")
  expect(saved.size).toBe(2)
  expect(saved.get("REAL:commitment_broken")).toMatchObject({ status: "candidate", supportEpisodeIds: ["r1"] })
  expect(saved.get("DEMO:commitment_broken").status).toBe("confirmed")
  expect(saved.get("DEMO:commitment_broken").supportEpisodeIds).not.toContain("r1")
})

it("the daily pattern job computes each persisted user/mode pair without a mixed aggregate", async () => {
  const { prisma, saved } = patternDb()
  const result = await recomputeMemoryPatternsForAll(prisma)
  expect(result).toEqual({ users: 1, patterns: 2 })
  expect([...saved.keys()].sort()).toEqual(["DEMO:commitment_broken", "REAL:commitment_broken"])
})

it("episode deduplication cannot reuse an event belonging to another mode", async () => {
  const existing = { id: "real-existing", userId: "u", sourceId: "event", operationalMode: "REAL" }
  const created: any[] = []
  const prisma = { memoryEpisode: {
    findFirst: async ({ where }: any) => matches(existing, where) ? existing : null,
    create: async ({ data }: any) => { created.push(data); return { id: "new-demo" } },
  } } as unknown as PrismaClient
  const result = await recordEpisodeOnce(prisma, "u", { eventType: "commitment_broken", content: "Demo event", sourceId: "event", operationalMode: "DEMO" })
  expect(result).toBe("new-demo")
  expect(created[0].operationalMode).toBe("DEMO")
})

it("semantic episode recall filters persisted mode before its candidate limit", async () => {
  vi.mocked(resolveEmbeddingCall).mockResolvedValue({ source: "user", model: "synthetic", apiKey: "synthetic" } as never)
  let sql = ""
  let parameters: unknown[] = []
  const prisma = { $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
    sql = strings.join("?"); parameters = values
    return [{ ...episode("demo", "DEMO"), similarity: 0.9 }]
  } } as unknown as PrismaClient
  const result = await recallEpisodes(prisma, "u", "event", 5, "DEMO")
  expect(sql.indexOf("operational_mode")).toBeGreaterThan(0)
  expect(sql.indexOf("operational_mode")).toBeLessThan(sql.indexOf("LIMIT"))
  expect(parameters).toContain("DEMO")
  expect(result[0].operationalMode).toBe("DEMO")
})
