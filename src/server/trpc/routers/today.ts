// HOY router (S13) — the prioritized cognitive feed for the HOY surface: insights,
// commitments, suggestions, reinforcements, daily anomaly (#44) and risk budget,
// merged + ranked (assembleTodayFeed, #36). dismiss (C3) feeds ignore telemetry.

import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { getTodayFeed } from "@/server/services/today/today-service"
import { recordIgnore } from "@/server/services/today/feed-ignore-service"

export const todayRouter = router({
  feed: protectedProcedure.query(({ ctx }) => getTodayFeed(ctx.prisma, ctx.userId)),

  // C3 — the trader dismisses a signal; the feed learns to demote it.
  dismiss: protectedProcedure
    .input(z.object({ signalId: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => { await recordIgnore(ctx.prisma, ctx.userId, input.signalId); return { ok: true } }),
})
