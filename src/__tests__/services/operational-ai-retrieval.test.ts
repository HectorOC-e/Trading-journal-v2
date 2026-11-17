import { describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { tradeNotesAdapter } from "@/server/services/retrieval/corpora/trade-notes"
import { tradePlansAdapter } from "@/server/services/retrieval/corpora/trade-plans"
import { tradeEventNotesAdapter } from "@/server/services/retrieval/corpora/trade-event-notes"
import { search, scheduleEmbedding } from "@/server/services/retrieval/pipeline"
vi.mock("@/lib/ai/resolve-provider", () => ({ resolveEmbeddingCall: vi.fn(async () => ({ source: "none" })) }))
import { resolveEmbeddingCall } from "@/lib/ai/resolve-provider"

for (const adapter of [tradeNotesAdapter, tradePlansAdapter, tradeEventNotesAdapter]) {
  describe(adapter.key, () => {
    it("constrains nearest-neighbour ranking to Demo before LIMIT", async () => {
      let emitted = ""
      let parameters: unknown[] = []
      const prisma = { $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
        emitted = strings.join("?")
        parameters = values
        return []
      } } as unknown as PrismaClient
      await adapter.knn(prisma, "user", "[1,0]", 5, "DEMO")
      // SQL is our external database contract; missing this boundary filter allows
      // closer backtest hits to consume the whole ranking before hydration.
      expect(emitted.indexOf("operational_mode")).toBeGreaterThan(0)
      expect(emitted.indexOf("operational_mode")).toBeLessThan(emitted.indexOf("LIMIT"))
      expect(parameters).toContain("DEMO")
    })
  })
}

it("a note citation retains account, mode and native currency", () => {
  const citation = tradeNotesAdapter.toCitation({ id: "t", date: new Date("2026-11-16"), symbol: "NQ", direction: "LONG", pnl: 100, rMultiple: 1, notes: "evidence", operationalMode: "DEMO", accountId: "a", account: { name: "Practice", type: "DEMO_PROP", currency: "EUR" } }, 0.9)
  expect(citation).toMatchObject({ operationalMode: "DEMO", accountId: "a", accountName: "Practice", accountType: "DEMO_PROP", currency: "EUR" })
  expect(citation.outcome).toContain("EUR")
  expect(citation.href).toContain("mode=DEMO")
})

it("legacy review analysis cannot enter a scoped semantic result", async () => {
  const result = await search({} as PrismaClient, "u", { query: "mis resultados", corpus: "weekly_reviews", mode: "DEMO" })
  expect(result.citations).toEqual([])
  expect(result.outcomes).toEqual([{ corpus: "weekly_reviews", state: "UNSCOPED_LEGACY", remaining: 0 }])
})

it("maintenance pending rows span all three known modes instead of silently indexing only Real", async () => {
  const parameters: unknown[][] = []
  const prisma = { $queryRaw: async (_strings: TemplateStringsArray, ...values: unknown[]) => { parameters.push(values); return [] } } as unknown as PrismaClient
  await tradeNotesAdapter.pending(prisma, "u", 50)
  await tradePlansAdapter.counts(prisma, "u")
  expect(parameters[0]).toContainEqual(["REAL", "DEMO", "BACKTEST"])
  expect(parameters[1]).toContainEqual(["REAL", "DEMO", "BACKTEST"])
})

it("background indexing skips internal or unclassified trades before resolving provider configuration", async () => {
  vi.mocked(resolveEmbeddingCall).mockClear()
  const prisma = { trade: { findFirst: async ({ where }: any) => {
    return where.operationalMode?.in?.includes("INTERNAL") === false ? null : { id: "qa" }
  } } } as unknown as PrismaClient
  scheduleEmbedding(prisma, "u", "trade_notes", "qa", "Internal evidence")
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(resolveEmbeddingCall).not.toHaveBeenCalled()
})

it("semantic searches require an explicit public mode at the service boundary", async () => {
  await expect(search({} as PrismaClient, "u", { query: "evidence" } as never)).rejects.toThrow()
})
