import { z } from "zod"
import { router, protectedProcedure } from "../init"

const THEMES = ["light", "dark", "system"] as const
const COLOR_SCHEMES = ["default", "deuteranopia", "mono"] as const
const TABLE_DENSITIES = ["compact", "comfortable", "spacious"] as const
const DEFAULT_GRAINS = ["daily", "weekly", "monthly"] as const

const UpdatePreferencesInput = z.object({
  theme:        z.enum(THEMES).optional(),
  accentHue:    z.number().int().min(0).max(360).nullable().optional(),
  colorScheme:  z.enum(COLOR_SCHEMES).optional(),
  defaultTab:   z.string().optional(),
  kpiOrder:     z.array(z.string()).optional(),
  kpiHidden:    z.array(z.string()).optional(),
  defaultGrain: z.enum(DEFAULT_GRAINS).optional(),
  tableDensity: z.enum(TABLE_DENSITIES).optional(),
  dateFormat:   z.string().optional(),
  numberLocale: z.string().optional(),
})

export const preferencesRouter = router({
  get: protectedProcedure
    .query(async ({ ctx }) => {
      const prefs = await ctx.prisma.userPreferences.findUnique({
        where: { userId: ctx.userId },
      })
      // Return defaults if no preferences row exists yet
      return prefs ?? {
        userId:       ctx.userId,
        theme:        "system" as const,
        accentHue:    null,
        colorScheme:  "default" as const,
        defaultTab:   "portfolio",
        kpiOrder:     [] as string[],
        kpiHidden:    [] as string[],
        defaultGrain: "daily" as const,
        tableDensity: "comfortable" as const,
        dateFormat:   "DD/MM/YYYY",
        numberLocale: "es-HN",
        createdAt:    new Date(),
        updatedAt:    new Date(),
      }
    }),

  update: protectedProcedure
    .input(UpdatePreferencesInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.userPreferences.upsert({
        where:  { userId: ctx.userId },
        create: { userId: ctx.userId, ...input },
        update: input,
      })
    }),
})
