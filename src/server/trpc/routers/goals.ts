import { z } from "zod"
import { router, protectedProcedure } from "../init"

export const goalsRouter = router({
  get: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUniqueOrThrow({
        where:  { id: ctx.userId },
        select: {
          disciplineGoal:     true,
          weeklyTradesGoal:   true,
          weeklyPnlGoal:      true,
          weeklyGoalMinutes:  true,
          onboardingCompleted: true,
        },
      })
      return {
        disciplineGoal:     user.disciplineGoal,
        weeklyTradesGoal:   user.weeklyTradesGoal,
        weeklyPnlGoal:      user.weeklyPnlGoal != null ? Number(user.weeklyPnlGoal) : null,
        weeklyGoalMinutes:  user.weeklyGoalMinutes,
        onboardingCompleted: user.onboardingCompleted,
      }
    }),

  set: protectedProcedure
    .input(z.object({
      disciplineGoal:      z.number().int().min(0).max(100).optional(),
      weeklyTradesGoal:    z.number().int().min(0).max(500).optional().nullable(),
      weeklyPnlGoal:       z.number().min(0).max(1_000_000).optional().nullable(),
      weeklyGoalMinutes:   z.number().int().min(0).max(10_080).optional().nullable(),
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
          weeklyGoalMinutes:   true,
        },
      })
      return {
        ...result,
        weeklyPnlGoal: result.weeklyPnlGoal != null ? Number(result.weeklyPnlGoal) : null,
      }
    }),
})
