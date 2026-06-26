// Coach router (S6) — memory (visible/editable/deletable, ADR-003 §3) + thread
// persistence. The chat stream itself stays on /api/ai-coach; the client persists
// each exchange here and manages memory.

import { z } from "zod"
import { router, protectedProcedure } from "../init"
import {
  listMemory,
  createMemory,
  confirmMemory,
  editMemory,
  deleteMemory,
} from "@/server/services/coach/coach-memory-service"
import {
  ensureThread,
  appendMessage,
  getThreads,
  getThreadMessages,
} from "@/server/services/coach/coach-thread-service"

const MEMORY_KIND = z.enum(["fact", "preference", "identity"])

export const coachRouter = router({
  // ── Memory ────────────────────────────────────────────────────────────────
  memory: protectedProcedure.query(({ ctx }) => listMemory(ctx.prisma, ctx.userId)),

  addMemory: protectedProcedure
    .input(z.object({ kind: MEMORY_KIND, content: z.string().min(1).max(500) }))
    .mutation(({ ctx, input }) => createMemory(ctx.prisma, ctx.userId, input.kind, input.content)),

  confirmMemory: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { await confirmMemory(ctx.prisma, ctx.userId, input.id); return { ok: true } }),

  editMemory: protectedProcedure
    .input(z.object({ id: z.string().uuid(), content: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => { await editMemory(ctx.prisma, ctx.userId, input.id, input.content); return { ok: true } }),

  deleteMemory: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { await deleteMemory(ctx.prisma, ctx.userId, input.id); return { ok: true } }),

  // ── Threads ─────────────────────────────────────────────────────────────────
  threads: protectedProcedure.query(({ ctx }) => getThreads(ctx.prisma, ctx.userId)),

  threadMessages: protectedProcedure
    .input(z.object({ threadId: z.string().uuid() }))
    .query(({ ctx, input }) => getThreadMessages(ctx.prisma, ctx.userId, input.threadId)),

  /** Persist one chat exchange (user + assistant). Ensures/creates the thread. */
  appendExchange: protectedProcedure
    .input(
      z.object({
        threadId: z.string().uuid().nullish(),
        userText: z.string().min(1),
        assistantText: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await ensureThread(ctx.prisma, ctx.userId, input.threadId)
      await appendMessage(ctx.prisma, ctx.userId, thread.id, "user", input.userText)
      await appendMessage(ctx.prisma, ctx.userId, thread.id, "assistant", input.assistantText)
      return { threadId: thread.id }
    }),
})
