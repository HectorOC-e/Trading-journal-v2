import { expect, it, vi } from "vitest"
import { writeReviewText } from "@/server/services/retrieval/review-write"

it.each(["weekly_reviews", "monthly_reviews"] as const)("%s invalidates before commit, including clearing notes", async corpus => {
  const events: string[] = []
  const execute = vi.fn<(sql: TemplateStringsArray, ...values: unknown[]) => Promise<number>>(async () => { events.push("invalidate"); return 1 })
  const db = { $transaction: async (run: (tx: unknown) => Promise<unknown>) => {
    events.push("begin")
    const row = await run({ $executeRaw: execute })
    events.push("commit")
    return row
  } }
  const row = await writeReviewText(db as never, corpus, true, async () => {
    events.push("save empty notes")
    return { id: "review" }
  })
  expect(row).toEqual({ id: "review" })
  expect(events).toEqual(["begin", "save empty notes", "invalidate", "commit"])
  expect(execute.mock.calls[0][0].join("")).toContain(`${corpus} SET summary_embedding = NULL`)
})

it("status-only saves preserve the current vector", async () => {
  const execute = vi.fn()
  const db = { $transaction: (run: (tx: unknown) => Promise<unknown>) => run({ $executeRaw: execute }) }
  await writeReviewText(db as never, "weekly_reviews", false, async () => ({ id: "review" }))
  expect(execute).not.toHaveBeenCalled()
})
