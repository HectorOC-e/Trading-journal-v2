// HOY router (S13) — the prioritized cognitive feed for the HOY surface: insights,
// commitments, suggestions, reinforcements, daily anomaly (#44) and risk budget,
// merged + ranked (assembleTodayFeed, #36). Read-only; deterministic (P2).

import { router, protectedProcedure } from "../init"
import { getTodayFeed } from "@/server/services/today/today-service"

export const todayRouter = router({
  feed: protectedProcedure.query(({ ctx }) => getTodayFeed(ctx.prisma, ctx.userId)),
})
