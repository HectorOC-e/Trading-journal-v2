import { z } from "zod"
import { router, protectedProcedure } from "../init"
import {
  AI_FEATURES, DEFAULT_AI_SETTINGS, parseFeatureModels,
  type AiSettings, type AiProvider,
} from "@/lib/ai/feature-models"

const PROVIDERS = ["openrouter", "anthropic", "openai"] as const
const COST_PRIORITIES = ["quality", "speed", "cost"] as const

const ModelRefInput = z.object({
  provider: z.enum(PROVIDERS),
  model:    z.string().min(1).max(100),
})

const FeatureModelsInput = z.object(
  Object.fromEntries(AI_FEATURES.map(f => [f, ModelRefInput.nullable().optional()])) as
    Record<(typeof AI_FEATURES)[number], z.ZodOptional<z.ZodNullable<typeof ModelRefInput>>>,
).partial()

function toSettings(row: {
  defaultProvider: string; defaultModel: string
  fallbackProvider: string | null; fallbackModel: string | null
  costPriority: string; featureModels: unknown
} | null): AiSettings {
  if (!row) return DEFAULT_AI_SETTINGS
  return {
    defaultProvider:  row.defaultProvider as AiProvider,
    defaultModel:     row.defaultModel,
    fallbackProvider: (row.fallbackProvider as AiProvider | null) ?? null,
    fallbackModel:    row.fallbackModel ?? null,
    costPriority:     (row.costPriority as AiSettings["costPriority"]) ?? "quality",
    featureModels:    parseFeatureModels(row.featureModels),
  }
}

export const aiSettingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const row = await ctx.prisma.userAiSettings.findUnique({ where: { userId: ctx.userId } })
    return toSettings(row)
  }),

  update: protectedProcedure
    .input(z.object({
      defaultProvider:  z.enum(PROVIDERS).optional(),
      defaultModel:     z.string().min(1).max(100).optional(),
      fallbackProvider: z.enum(PROVIDERS).nullable().optional(),
      fallbackModel:    z.string().max(100).nullable().optional(),
      costPriority:     z.enum(COST_PRIORITIES).optional(),
      featureModels:    FeatureModelsInput.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Strip null/empty feature entries so they fall back to the global default.
      const cleanedFeatures = input.featureModels
        ? Object.fromEntries(
            Object.entries(input.featureModels).filter(([, v]) => v && v.model),
          )
        : undefined

      const data = {
        ...(input.defaultProvider  !== undefined && { defaultProvider:  input.defaultProvider }),
        ...(input.defaultModel     !== undefined && { defaultModel:     input.defaultModel }),
        ...(input.fallbackProvider !== undefined && { fallbackProvider: input.fallbackProvider }),
        ...(input.fallbackModel    !== undefined && { fallbackModel:    input.fallbackModel }),
        ...(input.costPriority     !== undefined && { costPriority:     input.costPriority }),
        ...(cleanedFeatures        !== undefined && { featureModels:    cleanedFeatures }),
      }

      const row = await ctx.prisma.userAiSettings.upsert({
        where:  { userId: ctx.userId },
        create: { userId: ctx.userId, ...data },
        update: data,
      })
      return toSettings(row)
    }),
})
