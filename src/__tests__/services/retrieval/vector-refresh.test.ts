import { describe, expect, it, vi } from "vitest"
import { CORPORA } from "@/server/services/retrieval/registry"

const corpora = Object.values(CORPORA).filter(adapter => !["weekly_reviews", "monthly_reviews"].includes(adapter.key))
describe.each(corpora)("$key edited text refresh", adapter => {
  it("refreshes an existing vector for current text and rejects a late old-text write", async () => {
    const row = { id: "record", userId: "owner", text: "B", vector: "[1]" }
    const execute = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const [vector, id, userId, source] = values
      const sql = strings.join("?")
      expect(sql).toContain("user_id = ?::uuid")
      expect(sql).toMatch(/AND \w+ = \?/)
      // Model the SQL WHERE over an already indexed row edited from A to B.
      if (id !== row.id || userId !== row.userId || source !== row.text) return 0
      if (/AND \w+_embedding IS NULL/.test(sql) && row.vector !== null) return 0
      row.vector = vector as string
      return 1
    })
    const db = { $executeRaw: execute } as never
    expect(await adapter.writeVector(db, "record", "[2]", "B", "owner")).toBe(1)
    expect(row.vector).toBe("[2]")
    expect(await adapter.writeVector(db, "record", "[1]", "A", "owner")).toBe(0)
    expect(row.vector).toBe("[2]")
    expect(await adapter.writeVector(db, "record", "[3]", "B", "other-owner")).toBe(0)
    expect(row.vector).toBe("[2]")
  })
  it("keeps blank text excluded from retrieval and repair restricted to absent vectors", async () => {
    const query = vi.fn().mockResolvedValue([])
    const db = { $queryRaw: query } as never
    await adapter.knn(db, "owner", "[1]", 5)
    expect(query.mock.calls[0][0].join("?")).toContain("BTRIM(")
    await adapter.pending(db, "owner", 5)
    expect(query.mock.calls[1][0].join("?")).toContain("IS NULL")
  })
})
