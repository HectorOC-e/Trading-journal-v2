import { expect, it, vi } from "vitest"
import { tradesRouter } from "@/server/trpc/routers/trades"
import { search } from "@/server/services/retrieval/pipeline"
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/server/services/retrieval/pipeline", () => ({ search: vi.fn(async () => ({ citations: [], outcomes: [] })), reindex: vi.fn() }))

it("semanticSearch passes the selected mode, defaults only omission to Real and rejects mixed scopes", async () => {
  const prisma = {}
  const caller = tradesRouter.createCaller({ userId: "synthetic", prisma } as never)
  await caller.semanticSearch({ query: "evidence", mode: "DEMO" } as never)
  expect(vi.mocked(search).mock.calls.at(-1)).toEqual([prisma, "synthetic", { query: "evidence", mode: "DEMO", limit: 5 }])
  await caller.semanticSearch({ query: "evidence" } as never)
  expect(vi.mocked(search).mock.calls.at(-1)![2].mode).toBe("REAL")
  await expect(caller.semanticSearch({ query: "evidence", mode: "ALL" } as never)).rejects.toThrow()
  await expect(caller.semanticSearch({ query: "evidence", mode: null } as never)).rejects.toThrow()
})
