import { z } from "zod"
import { router, protectedProcedure } from "../init"

const THEMES = ["light", "dark", "system"] as const
const COLOR_THEMES = ["indigo", "violeta", "turquesa", "carmesi", "custom"] as const
const COLOR_SCHEMES = ["default", "deuteranopia", "mono"] as const
const TABLE_DENSITIES = ["compact", "comfortable", "spacious"] as const
const DEFAULT_GRAINS = ["daily", "weekly", "monthly"] as const

const UpdatePreferencesInput = z.object({
  theme:        z.enum(THEMES).optional(),
  colorTheme:   z.enum(COLOR_THEMES).optional(),
  customTheme:  z.string().max(2000).nullable().optional(), // JSON of custom palette roles
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
      const defaults = {
        userId:       ctx.userId,
        theme:        "system" as const,
        colorTheme:   "indigo",
        customTheme:  null as string | null,
        accentHue:    null as number | null,
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
      // Preferences are read GLOBALLY on every page (theme-provider). With the
      // tRPC httpBatchLink, an unhandled error here would fail the WHOLE batch
      // and leave every page without data. So a read failure (e.g. a column not
      // yet migrated in this environment) must degrade gracefully to defaults.
      try {
        const prefs = await ctx.prisma.userPreferences.findUnique({
          where: { userId: ctx.userId },
        })
        return prefs ?? defaults
      } catch (err) {
        console.error("[preferences.get] read failed, falling back to defaults:", err)
        return defaults
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
