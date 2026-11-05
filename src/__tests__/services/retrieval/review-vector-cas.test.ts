import { describe, expect, it, vi } from "vitest"
import { weeklyReviewNotesAdapter } from "@/server/services/retrieval/corpora/weekly-review-notes"
import { monthlyReviewNotesAdapter } from "@/server/services/retrieval/corpora/monthly-review-notes"

describe.each([weeklyReviewNotesAdapter, monthlyReviewNotesAdapter])("$key vector integrity", adapter => {
  it("only writes an absent vector for the exact source text and owner", async () => {
    const execute = vi.fn().mockResolvedValue(0)
    await adapter.writeVector({ $executeRaw: execute } as never, "id", "[1]", "source", "owner")
    const [strings, ...values] = execute.mock.calls[0]
    const sql = strings.join("?")
    expect(sql).toContain("IS NULL")
    expect(sql).toContain("user_id")
    expect(values).toContain("source")
    expect(values).toContain("owner")
  })
  it("does not retrieve or count blank notes carrying old vectors", async () => {
    const query = vi.fn().mockResolvedValue([])
    const db = { $queryRaw: query } as never
    await adapter.knn(db, "owner", "[1]", 5)
    await adapter.counts(db, "owner")
    for (const [strings] of query.mock.calls) expect(strings.join("?")).toContain("BTRIM(")
  })
})
