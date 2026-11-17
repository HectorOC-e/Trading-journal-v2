import { z } from "zod"
import { operationalModeSchema } from "@/domains/trading/operational-mode"
// Edges router (S11) — read-only edge analytics: per-instrument edge + prune
// (#24, absorbs Mercados) and per-tag poison/gold (#20, absorbs Etiquetas).
// Deterministic (P2); surfaces in S12.

import { router, protectedProcedure } from "../init"
import { getInstrumentEdges, getTagEdges } from "@/server/services/analytics/edge-service"

export const edgesRouter = router({
  instruments: protectedProcedure.input(z.object({mode:operationalModeSchema.default("REAL")}).optional()).query(({ ctx,input }) => getInstrumentEdges(ctx.prisma, ctx.userId,input?.mode)),
  tags: protectedProcedure.input(z.object({mode:operationalModeSchema.default("REAL")}).optional()).query(({ ctx,input }) => getTagEdges(ctx.prisma, ctx.userId,input?.mode)),
})
