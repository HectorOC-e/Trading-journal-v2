// Psychology router (S8) — pre-session check-in + calibration + mood trend (C7).

import { operationalModeSchema } from "@/domains/trading/operational-mode"
import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { submitCheckin, latestCheckin, getCalibration, getMoodTrend } from "@/server/services/psychology/psychology-service"

const modeInput = z.object({ mode: operationalModeSchema.default("REAL") }).optional()
const score = z.number().int().min(1).max(5)

export const psychologyRouter = router({
  submitCheckin: protectedProcedure
    .input(z.object({ mode: operationalModeSchema.default("REAL"), mood: score, energy: score, sleep: score, session: z.string().nullish() }))
    .mutation(({ ctx, input }) => submitCheckin(ctx.prisma, ctx.userId, input)),

  latestCheckin: protectedProcedure.input(modeInput).query(({ ctx, input }) => latestCheckin(ctx.prisma, ctx.userId, input?.mode ?? "REAL")),

  calibration: protectedProcedure.input(modeInput).query(({ ctx, input }) => getCalibration(ctx.prisma, ctx.userId, input?.mode ?? "REAL")),

  moodTrend: protectedProcedure.input(modeInput).query(({ ctx, input }) => getMoodTrend(ctx.prisma, ctx.userId, input?.mode ?? "REAL")),
})
