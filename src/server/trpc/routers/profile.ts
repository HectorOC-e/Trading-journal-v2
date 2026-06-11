import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure } from "../init"
import { logger } from "@/lib/logger"
import {
  PROFILE_PUBLIC_FIELDS,
  validateProfileUpdate,
  normalizeProfileInput,
  invalidateAnalyticsCacheIfNeeded,
  type UpdateProfileInput,
} from "@/domains/profile/services/profile-service"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseFxRates } from "@/lib/fx"

export const profileRouter = router({
  get: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where:  { id: ctx.userId },
        select: PROFILE_PUBLIC_FIELDS,
      })
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Perfil no encontrado" })
      return {
        ...user,
        fxRates:        parseFxRates(user.fxRates),
        lastReviewDate: user.lastReviewDate?.toISOString() ?? null,
        createdAt:      user.createdAt.toISOString(),
      }
    }),

  update: protectedProcedure
    .input(z.object({
      name:               z.string().optional(),
      timezone:           z.string().optional(),
      baseCurrency:       z.string().optional(),
      language:           z.enum(["es", "en"]).optional(),
      weeklyGoalMinutes:  z.number().int().min(0).max(10080).optional(),
      emailNotifications: z.boolean().optional(),
      // Goal fields (TASK-050a)
      weeklyTradesGoal:   z.number().int().min(1).max(500).nullable().optional(),
      weeklyPnlGoal:      z.number().min(100).max(1_000_000).nullable().optional(),
      // Per-user FX overrides (D-03): { "<CUR>": usdValue }
      fxRates:            z.record(z.string(), z.number().positive()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const raw = input as UpdateProfileInput
      validateProfileUpdate(raw)
      const normalized = normalizeProfileInput(raw)
      await invalidateAnalyticsCacheIfNeeded(ctx.prisma, ctx.userId, normalized)
      // fxRates is stored as a JSON string column → serialize before persisting.
      const { fxRates, ...rest } = normalized
      const data = fxRates !== undefined ? { ...rest, fxRates: JSON.stringify(fxRates) } : rest
      const user = await ctx.prisma.user.update({
        where:  { id: ctx.userId },
        data,
        select: PROFILE_PUBLIC_FIELDS,
      })
      return {
        ...user,
        fxRates:        parseFxRates(user.fxRates),
        lastReviewDate: user.lastReviewDate?.toISOString() ?? null,
        createdAt:      user.createdAt.toISOString(),
      }
    }),

  changePassword: protectedProcedure
    .input(z.object({ newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres") }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.auth.updateUser({ password: input.newPassword })
      if (error) throw new TRPCError({ code: "BAD_REQUEST", message: error.message })
      return { ok: true }
    }),

  exportData: protectedProcedure
    .query(async ({ ctx }) => {
      const [user, trades, accounts, rules, weeklyReviews] = await Promise.all([
        ctx.prisma.user.findUnique({
          where:  { id: ctx.userId },
          select: PROFILE_PUBLIC_FIELDS,
        }),
        ctx.prisma.trade.findMany({
          where:   { userId: ctx.userId },
          orderBy: { date: "desc" },
          take:    5000,
        }),
        ctx.prisma.account.findMany({ where: { userId: ctx.userId } }),
        ctx.prisma.rule.findMany({ where: { userId: ctx.userId } }),
        ctx.prisma.weeklyReview.findMany({
          where:   { userId: ctx.userId },
          orderBy: { weekStart: "desc" },
        }),
      ])

      return {
        exportedAt: new Date().toISOString(),
        user: user ? { ...user, fxRates: parseFxRates(user.fxRates) } : null,
        trades:        trades.map(t => ({ ...t, pnl: t.pnl?.toString() ?? null, rMultiple: t.rMultiple?.toString() ?? null })),
        accounts:      accounts.map(a => ({ ...a, initialBalance: a.initialBalance.toString() })),
        rules,
        weeklyReviews: weeklyReviews.map(r => ({
          ...r,
          netPnl:   r.netPnl.toString(),
          winRate:  r.winRate.toString(),
        })),
      }
    }),

  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Delete all user data via cascade, then delete auth user
      await ctx.prisma.user.delete({ where: { id: ctx.userId } })
      const admin = createAdminClient()
      const { error } = await admin.auth.admin.deleteUser(ctx.userId)
      if (error) {
        logger.error("Auth deletion failed after profile deletion", { userId: ctx.userId, error: error.message })
      }
      return { ok: true }
    }),
})
