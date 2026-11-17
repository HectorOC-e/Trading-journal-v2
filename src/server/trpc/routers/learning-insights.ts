// Learning insights router (S11) — read-only: transfer before/after a resource
// (#31, honest association per D17) with the linked-setup performance signal that
// adapts SRS cadence (#45), and errors→cards (#42). Surfaces in S12.

import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { getResourceTransfer, getErrorCards } from "@/server/services/learning/learning-insights-service"

export const learningInsightsRouter = router({
  transfer: protectedProcedure
    .input(z.object({ resourceId: z.string().uuid(), mode: z.enum(["REAL", "DEMO", "BACKTEST"]).default("REAL") }))
    .query(({ ctx, input }) => getResourceTransfer(ctx.prisma, ctx.userId, input.resourceId, input.mode)),

  errorCards: protectedProcedure.input(z.object({ mode: z.enum(["REAL", "DEMO", "BACKTEST"]).default("REAL") }).optional()).query(({ ctx, input }) => getErrorCards(ctx.prisma, ctx.userId, input?.mode ?? "REAL")),
})
