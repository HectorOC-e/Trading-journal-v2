import { expect, it } from "vitest"
import { queueReviewNotes } from "@/app/reviews/components/report/notes-draft"
it("serializes old writes before latest and allows retry after failure", async () => {
  let release!: () => void
  const calls: string[] = []
  const first = queueReviewNotes("user/week", async () => { calls.push("old"); await new Promise<void>(r => { release = r }) })
  const second = queueReviewNotes("user/week", async () => { calls.push("new") })
  await Promise.resolve(); await Promise.resolve()
  expect(calls).toEqual(["old"])
  release(); await Promise.all([first, second])
  expect(calls).toEqual(["old", "new"])
  await expect(queueReviewNotes("user/week", async () => { throw Error("offline") })).rejects.toThrow("offline")
  await expect(queueReviewNotes("user/week", async () => "retry")).resolves.toBe("retry")
})
