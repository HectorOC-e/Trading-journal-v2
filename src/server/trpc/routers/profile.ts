import { requestAccountDeletion } from "@/server/services/profile/account-deletion";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import {
  PROFILE_PUBLIC_FIELDS,
  validateProfileUpdate,
  normalizeProfileInput,
  invalidateAnalyticsCacheIfNeeded,
  type UpdateProfileInput,
} from "@/domains/profile/services/profile-service";
import { parseFxRates } from "@/lib/fx";
import { PROFILE_EXPORT_SECTIONS } from "@/domains/profile/export-sections";
import { exportProfilePage } from "@/server/services/profile/export-profile";

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: PROFILE_PUBLIC_FIELDS,
    });
    if (!user)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Perfil no encontrado",
      });
    return {
      ...user,
      fxRates: parseFxRates(user.fxRates),
      lastReviewDate: user.lastReviewDate?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        timezone: z.string().optional(),
        baseCurrency: z.string().optional(),
        language: z.enum(["es", "en"]).optional(),
        weeklyGoalMinutes: z.number().int().min(0).max(10080).optional(),
        emailNotifications: z.boolean().optional(),
        learningReminderTime: z
          .string()
          .regex(
            /^([01]\d|2[0-3]):[0-5]\d$/,
            "Usa el formato de 24 horas HH:mm",
          )
          .optional(),
        // Goal fields (TASK-050a)
        weeklyTradesGoal: z
          .number()
          .int()
          .min(1)
          .max(500)
          .nullable()
          .optional(),
        weeklyPnlGoal: z.number().min(100).max(1_000_000).nullable().optional(),
        // Per-user FX overrides (D-03): { "<CUR>": usdValue }
        fxRates: z.record(z.string(), z.number().positive()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const raw = input as UpdateProfileInput;
      validateProfileUpdate(raw);
      const normalized = normalizeProfileInput(raw);
      await invalidateAnalyticsCacheIfNeeded(
        ctx.prisma,
        ctx.userId,
        normalized,
      );
      // fxRates is stored as a JSON string column → serialize before persisting.
      const { fxRates, ...rest } = normalized;
      const data =
        fxRates !== undefined
          ? { ...rest, fxRates: JSON.stringify(fxRates) }
          : rest;
      const user = await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data,
        select: PROFILE_PUBLIC_FIELDS,
      });
      return {
        ...user,
        fxRates: parseFxRates(user.fxRates),
        lastReviewDate: user.lastReviewDate?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        newPassword: z
          .string()
          .min(8, "La contraseña debe tener al menos 8 caracteres"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.auth.updateUser({
        password: input.newPassword,
      });
      if (error)
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      return { ok: true };
    }),

  exportPage: protectedProcedure
    .input(
      z.object({
        section: z.enum(PROFILE_EXPORT_SECTIONS),
        cursor: z.uuid().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .query(({ ctx, input }) =>
      exportProfilePage(ctx.prisma, ctx.userId, input),
    ),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) =>
    requestAccountDeletion(ctx.prisma, ctx.userId),
  ),
});
