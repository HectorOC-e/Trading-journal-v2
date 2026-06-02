import { z } from "zod"
import { router, protectedProcedure } from "../init"

export const goalsRouter = router({
  set: protectedProcedure
    .input(z.object({
      disciplineGoal:      z.number().int().min(0).max(100).optional(),
      onboardingCompleted: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.user.update({
        where:  { id: ctx.userId },
        data:   input,
        select: {
          disciplineGoal:      true,
          onboardingCompleted: true,
          weeklyTradesGoal:    true,
          weeklyPnlGoal:       true,
        },
      })
      return {
        ...result,
        weeklyPnlGoal: result.weeklyPnlGoal != null ? Number(result.weeklyPnlGoal) : null,
      }
    }),
})
