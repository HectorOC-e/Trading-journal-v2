// Behavior Engine router (S4) — the loop's API surface: surface actionable
// insights with a "commit" CTA, create commitments, evaluate them, list/archive.
// Json fields are mapped to plain shapes before returning (avoids the deep-inference
// TS2589 seen with Prisma Json over tRPC+React Query — see rules.list).

import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import { canCommit } from "@/domains/behavior/commitment-machine"
import {
  createCommitmentFromInsight,
  evaluateCommitment,
  carryOverCommitments,
  NoVerifierError,
} from "@/server/services/behavior/commitment-service"

interface Evidence {
  tradeIds?: string[]
  note?: string
}

export const behaviorRouter = router({
  /** Active persisted insights with whether each can become a verified commitment. */
  openInsights: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.insight.findMany({
      where: { userId: ctx.userId, status: "active" },
      orderBy: [{ severity: "asc" }, { lastSeenAt: "desc" }],
      select: {
        id: true, type: true, title: true, detail: true, severity: true, category: true,
        recommendation: true, confidence: true, sampleSize: true,
      },
    })
    return rows.map((i) => ({ ...i, canCommit: canCommit(i.type) }))
  }),

  /** Active + recently-closed commitments with their latest check (review carry-over, #5). */
  commitments: protectedProcedure
    .input(z.object({ sinceDays: z.number().int().min(1).max(120).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await carryOverCommitments(ctx.prisma, ctx.userId, input?.sinceDays ?? 14)
      return rows.map((c) => {
        const latest = c.checks[0]
        const evidence = (latest?.evidence ?? null) as Evidence | null
        return {
          id: c.id,
          text: c.text,
          metricKey: c.metricKey,
          target: c.target,
          comparator: c.comparator,
          window: c.window,
          status: c.status,
          createdVia: c.createdVia,
          keptCount: c.keptCount,
          startAt: c.startAt,
          endAt: c.endAt,
          sourceInsightId: c.sourceInsightId,
          ruleId: c.ruleId,
          latestCheck: latest
            ? {
                result: latest.result,
                observedValue: latest.observedValue,
                evaluatedAt: latest.evaluatedAt,
                tradeIds: evidence?.tradeIds ?? [],
                note: evidence?.note ?? null,
              }
            : null,
        }
      })
    }),

  /** Create a verified commitment from an insight. Rejects insights with no verifier. */
  createFromInsight: protectedProcedure
    .input(
      z.object({
        insightId: z.string().uuid(),
        text: z.string().min(1).max(280).optional(),
        target: z.number().optional(),
        window: z.enum(["day", "week", "month"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const c = await createCommitmentFromInsight(ctx.prisma, ctx.userId, input.insightId, {
          text: input.text,
          target: input.target,
          window: input.window,
          createdVia: "self",
        })
        return { id: c.id, status: c.status, text: c.text, endAt: c.endAt }
      } catch (err) {
        if (err instanceof NoVerifierError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este insight no es verificable: estúdialo o anótalo." })
        }
        throw err
      }
    }),

  /** Evaluate a commitment now (manual trigger; the cron does this at window end). */
  evaluate: protectedProcedure
    .input(z.object({ commitmentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return evaluateCommitment(ctx.prisma, ctx.userId, input.commitmentId)
    }),

  /** Archive a commitment (privacy/declutter — §8.5). */
  archive: protectedProcedure
    .input(z.object({ commitmentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.commitment.updateMany({
        where: { id: input.commitmentId, userId: ctx.userId },
        data: { archivedAt: new Date() },
      })
      return { ok: true }
    }),
})
