import { router, protectedProcedure } from "../init"

/** Read-only access to the curated prop-firm catalog (global reference data). */
export const propFirmPresetsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.propFirmPreset.findMany({
      where:   { enabled: true },
      orderBy: [{ firm: "asc" }, { program: "asc" }, { phase: "asc" }],
    })
    return rows.map((p) => ({
      ...p,
      accountSize:    p.accountSize    != null ? Number(p.accountSize)    : null,
      ddDailyPct:     p.ddDailyPct     != null ? Number(p.ddDailyPct)     : null,
      ddTotalPct:     p.ddTotalPct     != null ? Number(p.ddTotalPct)     : null,
      targetPct:      p.targetPct      != null ? Number(p.targetPct)      : null,
      consistencyPct: p.consistencyPct != null ? Number(p.consistencyPct) : null,
      verifiedAt:     p.verifiedAt != null ? p.verifiedAt.toISOString() : null,
      createdAt:      p.createdAt.toISOString(),
      updatedAt:      p.updatedAt.toISOString(),
    }))
  }),
})
