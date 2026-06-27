// Risk & Prop router (S9) — read-only prop quant: risk of ruin, phase-pass
// projection, daily budget, aggregate multi-account exposure. All numbers from
// the deterministic engine (P2). S9 surfaces signals; the hard block lands in S13.

import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { getRiskOverview, getAggregateExposure } from "@/server/services/risk/risk-service"

export const riskRouter = router({
  overview: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .query(({ ctx, input }) => getRiskOverview(ctx.prisma, ctx.userId, input.accountId)),

  aggregateExposure: protectedProcedure
    .input(z.object({ aggregateCapAmount: z.number().positive().nullish() }).optional())
    .query(({ ctx, input }) => getAggregateExposure(ctx.prisma, ctx.userId, input?.aggregateCapAmount ?? null)),
})
