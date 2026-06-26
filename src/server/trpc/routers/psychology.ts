// Psychology router (S8) — pre-session check-in + calibration + mood trend (C7).

import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { submitCheckin, latestCheckin, getCalibration, getMoodTrend } from "@/server/services/psychology/psychology-service"

const score = z.number().int().min(1).max(5)

export const psychologyRouter = router({
  submitCheckin: protectedProcedure
    .input(z.object({ mood: score, energy: score, sleep: score, session: z.string().nullish() }))
    .mutation(({ ctx, input }) => submitCheckin(ctx.prisma, ctx.userId, input)),

  latestCheckin: protectedProcedure.query(({ ctx }) => latestCheckin(ctx.prisma, ctx.userId)),

  calibration: protectedProcedure.query(({ ctx }) => getCalibration(ctx.prisma, ctx.userId)),

  moodTrend: protectedProcedure.query(({ ctx }) => getMoodTrend(ctx.prisma, ctx.userId)),
})
