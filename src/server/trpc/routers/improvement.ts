// Improvement router (S14) — the North Star: ImprovementScore + drivers (#41),
// per-regime performance (#33), cost of indiscipline (#49). Read-only (P2).

import { router, protectedProcedure } from "../init"
import { getImprovement } from "@/server/services/improvement/improvement-service"

export const improvementRouter = router({
  overview: protectedProcedure.query(({ ctx }) => getImprovement(ctx.prisma, ctx.userId)),
})
