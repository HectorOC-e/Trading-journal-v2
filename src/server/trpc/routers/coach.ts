// Coach router (S6) — memory (visible/editable/deletable, ADR-003 §3) + thread
// persistence. The chat stream itself stays on /api/ai-coach; the client persists
// each exchange here and manages memory.

import { z } from "zod"
import { operationalModeSchema } from "@/domains/trading/operational-mode"
import { router, protectedProcedure } from "../init"
import {
  listMemory,
  createMemory,
  confirmMemory,
  editMemory,
  deleteMemory,
  summarizeThread,
} from "@/server/services/coach/coach-memory-service"
import {
  appendExchange,
  getThreads,
  getThreadMessages,
} from "@/server/services/coach/coach-thread-service"
import { getIdentity, upsertIdentity } from "@/server/services/memory/memory-identity-service"
import { getSalientEpisodes } from "@/server/services/memory/memory-episode-service"
import { getConfirmedPatterns } from "@/server/services/memory/memory-pattern-service"

const scopeInput = z.object({ mode: operationalModeSchema.default("REAL") }).default({ mode: "REAL" })

const MEMORY_KIND = z.enum(["fact", "preference", "identity"])

export const coachRouter = router({
  // ── Memory ────────────────────────────────────────────────────────────────
  memory: protectedProcedure.input(scopeInput).query(({ ctx, input }) => listMemory(ctx.prisma, ctx.userId, input.mode)),

  addMemory: protectedProcedure
    .input(z.object({ kind: MEMORY_KIND, content: z.string().min(1).max(500), mode: operationalModeSchema.default("REAL") }))
    .mutation(({ ctx, input }) => createMemory(ctx.prisma, ctx.userId, input.kind, input.content, input.mode)),

  confirmMemory: protectedProcedure
    .input(z.object({ id: z.string().uuid(), mode: operationalModeSchema.default("REAL") }))
    .mutation(async ({ ctx, input }) => { await confirmMemory(ctx.prisma, ctx.userId, input.id, input.mode); return { ok: true } }),

  editMemory: protectedProcedure
    .input(z.object({ id: z.string().uuid(), content: z.string().min(1).max(500), mode: operationalModeSchema.default("REAL") }))
    .mutation(async ({ ctx, input }) => { await editMemory(ctx.prisma, ctx.userId, input.id, input.content, input.mode); return { ok: true } }),

  deleteMemory: protectedProcedure
    .input(z.object({ id: z.string().uuid(), mode: operationalModeSchema.default("REAL") }))
    .mutation(async ({ ctx, input }) => { await deleteMemory(ctx.prisma, ctx.userId, input.id, input.mode); return { ok: true } }),

  // ── Hierarchical memory layers — visible/transparent (ADR-003 §3, v3.2) ──────
  // Read-only: episodes are append-only evidence; patterns are data-confirmed (D9).
  episodes: protectedProcedure.input(scopeInput).query(({ ctx, input }) => getSalientEpisodes(ctx.prisma, ctx.userId, 8, input.mode)),
  patterns: protectedProcedure.input(scopeInput).query(({ ctx, input }) => getConfirmedPatterns(ctx.prisma, ctx.userId, 8, input.mode)),

  // ── Identity layer (E15, v3.2) ────────────────────────────────────────────────
  identity: protectedProcedure.query(({ ctx }) => getIdentity(ctx.prisma, ctx.userId)),

  setIdentity: protectedProcedure
    .input(z.object({
      tone: z.string().max(120).nullish(),
      focus: z.string().max(200).nullish(),
      summary: z.string().max(500).nullish(),
    }))
    .mutation(({ ctx, input }) => upsertIdentity(ctx.prisma, ctx.userId, input)),

  // ── Threads ─────────────────────────────────────────────────────────────────
  threads: protectedProcedure.input(scopeInput).query(({ ctx, input }) => getThreads(ctx.prisma, ctx.userId, 30, input.mode)),

  threadMessages: protectedProcedure
    .input(z.object({ threadId: z.string().uuid(), mode: operationalModeSchema.default("REAL") }))
    .query(({ ctx, input }) => getThreadMessages(ctx.prisma, ctx.userId, input.threadId, input.mode)),

  /** Persist one chat exchange (user + assistant). Ensures/creates the thread. */
  appendExchange: protectedProcedure
    .input(
      z.object({
        threadId: z.string().uuid().nullish(),
        mode: operationalModeSchema.default("REAL"),
        userText: z.string().min(1),
        assistantText: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await appendExchange(ctx.prisma, ctx.userId, input)
      // S6 producer: summarize + extract candidate memory (best-effort, cost-gated, no-op without a key).
      void summarizeThread(ctx.prisma, ctx.userId, thread.id, input.mode).catch(() => {})
      return { threadId: thread.id }
    }),
})
