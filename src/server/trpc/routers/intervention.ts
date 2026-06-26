// Intervention router (S7) — the client reads the active intervention (persisted by
// the fast-path in trades.close) and records the trader's response.

import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { respondIntervention } from "@/server/services/intervention/intervention-service"

interface SuggestedAction { kind?: string; label?: string }

export const interventionRouter = router({
  /** The most recent unanswered intervention (drives the overlay), or null. */
  active: protectedProcedure.query(async ({ ctx }) => {
    const iv = await ctx.prisma.intervention.findFirst({
      where: { userId: ctx.userId, status: "active" },
      orderBy: { shownAt: "desc" },
      select: { id: true, trigger: true, severity: true, message: true, suggestedAction: true },
    })
    if (!iv) return null
    const action = (iv.suggestedAction ?? {}) as SuggestedAction
    return {
      id: iv.id,
      trigger: iv.trigger,
      severity: iv.severity,
      message: iv.message,
      actionKind: action.kind ?? "none",
      actionLabel: action.label ?? "Activar protección",
    }
  }),

  respond: protectedProcedure
    .input(z.object({ interventionId: z.string().uuid(), response: z.enum(["accepted", "dismissed"]) }))
    .mutation(({ ctx, input }) => respondIntervention(ctx.prisma, ctx.userId, input.interventionId, input.response)),
})
