import { expect, it, vi } from "vitest"
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/server/services/coach/coach-memory-service", () => ({ summarizeThread: vi.fn(async () => {}) }))
import { coachRouter } from "@/server/trpc/routers/coach"
const id = "11111111-1111-4111-8111-111111111111"

it.each([id, null])("rolls back the entire exchange and thread creation before safe retry (%s)", async threadId => {
  let messages: { role: string }[] = []
  let threads = threadId ? [{ id }] : []
  let fail = true
  const prisma: any = {
    coachThread: {
      findFirst: async () => threads[0],
      create: async () => { const thread = { id }; threads.push(thread); return thread },
      update: async () => ({ id }),
    },
    coachMessage: { create: async ({ data }: any) => {
      if (data.role === "assistant" && fail) { fail = false; throw Error("transient failure") }
      messages.push(data); return data
    } },
    $transaction: async (operation: any) => {
      const beforeMessages = [...messages], beforeThreads = [...threads]
      try { return typeof operation === "function" ? await operation(prisma) : await Promise.all(operation) }
      catch (error) { messages = beforeMessages; threads = beforeThreads; throw error }
    },
  }
  const caller = coachRouter.createCaller({ prisma, userId: "u", supabase: {} as never })
  const input = { threadId, userText: "Question", assistantText: "Answer" }
  await expect(caller.appendExchange(input)).rejects.toThrow("transient failure")
  expect(messages).toEqual([])
  expect(threads).toHaveLength(threadId ? 1 : 0)
  await caller.appendExchange(input)
  expect(messages.map(m => m.role)).toEqual(["user", "assistant"])
  expect(threads).toHaveLength(1)
})
