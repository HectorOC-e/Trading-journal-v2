// Playbook router (S10) — read-only setup intelligence: edge decay (#12),
// definition-vs-execution drift (#32), edge-evolution curve (#21), redefinition
// before/after (#50). Deterministic (P2); UI surfaces in S12.

import { z } from "zod"
import { router, protectedProcedure } from "../init"
import { getSetupPlaybook } from "@/server/services/setups/playbook-service"

export const playbookRouter = router({
  setup: protectedProcedure
    .input(z.object({ setupId: z.string().uuid() }))
    .query(({ ctx, input }) => getSetupPlaybook(ctx.prisma, ctx.userId, input.setupId)),
})
