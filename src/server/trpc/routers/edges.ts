// Edges router (S11) — read-only edge analytics: per-instrument edge + prune
// (#24, absorbs Mercados) and per-tag poison/gold (#20, absorbs Etiquetas).
// Deterministic (P2); surfaces in S12.

import { router, protectedProcedure } from "../init"
import { getInstrumentEdges, getTagEdges } from "@/server/services/analytics/edge-service"

export const edgesRouter = router({
  instruments: protectedProcedure.query(({ ctx }) => getInstrumentEdges(ctx.prisma, ctx.userId)),
  tags: protectedProcedure.query(({ ctx }) => getTagEdges(ctx.prisma, ctx.userId)),
})
