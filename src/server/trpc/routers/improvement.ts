// Improvement router (S14) — the North Star: ImprovementScore + drivers (#41),
// per-regime performance (#33), cost of indiscipline (#49). Read-only (P2).

import { z } from "zod"
import { operationalModeSchema } from "@/domains/trading/operational-mode"
import { router, protectedProcedure } from "../init"
import { getImprovement } from "@/server/services/improvement/improvement-service"
import { getImprovementSeries } from "@/server/services/improvement/improvement-snapshot-service"

export const improvementRouter = router({
  overview: protectedProcedure.input(z.object({ mode: operationalModeSchema.default("REAL") }).optional()).query(async ({ ctx, input }) => {
    const [overview, series] = await Promise.all([
      getImprovement(ctx.prisma, ctx.userId, input?.mode ?? "REAL"),
      getImprovementSeries(ctx.prisma, ctx.userId, 90, input?.mode ?? "REAL"),
    ])
    return { ...overview, series }
  }),
})
