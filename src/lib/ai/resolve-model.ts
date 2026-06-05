// Server-side bridge: load a user's UserAiSettings and resolve a feature's model.
// Keeps the pure resolver (feature-models.ts) free of Prisma.

import type { PrismaClient } from "@/lib/generated/prisma/client"
import {
  resolveFeatureModel, parseFeatureModels, DEFAULT_AI_SETTINGS,
  type AiSettings, type AiProvider, type AiFeature, type ResolvedFeatureModel,
} from "./feature-models"

/** Load the user's AI settings, falling back to platform defaults. */
export async function loadAiSettings(prisma: PrismaClient, userId: string): Promise<AiSettings> {
  const row = await prisma.userAiSettings.findUnique({ where: { userId } })
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

/** Load settings + resolve the model (primary + fallback) for a feature. */
export async function resolveModelForFeature(
  prisma: PrismaClient,
  userId: string,
  feature: AiFeature,
): Promise<ResolvedFeatureModel> {
  const settings = await loadAiSettings(prisma, userId)
  return resolveFeatureModel(settings, feature)
}
