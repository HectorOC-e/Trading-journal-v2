// HOY router (S13) — the prioritized cognitive feed for the HOY surface: insights,
// commitments, suggestions, reinforcements, daily anomaly (#44) and risk budget,
// merged + ranked (assembleTodayFeed, #36). dismiss (C3) feeds ignore telemetry.

import { operationalModeSchema } from "@/domains/trading/operational-mode"
import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { getDailyPlan } from "@/server/services/today/daily-plan-service"
import { getTodayFeed } from "@/server/services/today/today-service"
import { recordIgnore } from "@/server/services/today/feed-ignore-service"

const modeInput = z.object({ mode: operationalModeSchema.default("REAL") }).optional()

export const todayRouter = router({
  plan: protectedProcedure.input(modeInput).query(({ ctx, input }) => getDailyPlan(ctx.prisma, ctx.userId, new Date(), input?.mode ?? "REAL")),
  feed: protectedProcedure.input(modeInput).query(({ ctx, input }) => getTodayFeed(ctx.prisma, ctx.userId, input?.mode ?? "REAL")),

  // C3 — the trader dismisses a signal; the feed learns to demote it.
  dismiss: protectedProcedure
    .input(z.object({ signalId: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => { await recordIgnore(ctx.prisma, ctx.userId, input.signalId); return { ok: true } }),
})
