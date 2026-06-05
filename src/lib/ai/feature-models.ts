// Expanded AI configuration — feature → model resolution with global fallback.
// Pure, dependency-free: easy to unit-test and reuse in any AI call site.

import type { AiProvider } from "./config"
export type { AiProvider } from "./config"

/** AI-powered capabilities that can each use a distinct model. */
export const AI_FEATURES = [
  "trade_analysis",
  "review_generation",
  "psychology_analysis",
  "learning_insights",
  "weekly_reviews",
  "ai_chat",
  "embeddings",
] as const

export type AiFeature = typeof AI_FEATURES[number]

export const AI_PROVIDERS_LIST: AiProvider[] = ["openrouter", "anthropic", "openai"]

export type CostPriority = "quality" | "speed" | "cost"

export type ModelRef = { provider: AiProvider; model: string }

/** Shape persisted in user_ai_settings (featureModels is a partial map). */
export type AiSettings = {
  defaultProvider:  AiProvider
  defaultModel:     string
  fallbackProvider: AiProvider | null
  fallbackModel:    string | null
  costPriority:     CostPriority
  featureModels:    Partial<Record<AiFeature, ModelRef>>
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  defaultProvider:  "anthropic",
  defaultModel:     "claude-sonnet-4-6",
  fallbackProvider: null,
  fallbackModel:    null,
  costPriority:     "quality",
  featureModels:    {},
}

export type ResolvedFeatureModel = {
  primary:  ModelRef
  fallback: ModelRef | null
}

/**
 * Resolve which model to use for a feature:
 *   1. per-feature override if set,
 *   2. otherwise the global default,
 *   3. plus the global fallback (when configured and distinct from primary).
 */
export function resolveFeatureModel(settings: AiSettings, feature: AiFeature): ResolvedFeatureModel {
  const override = settings.featureModels[feature]
  const primary: ModelRef = override?.model
    ? { provider: override.provider, model: override.model }
    : { provider: settings.defaultProvider, model: settings.defaultModel }

  let fallback: ModelRef | null = null
  if (settings.fallbackModel && settings.fallbackProvider) {
    const fb: ModelRef = { provider: settings.fallbackProvider, model: settings.fallbackModel }
    // No point falling back to the exact same model
    if (!(fb.provider === primary.provider && fb.model === primary.model)) {
      fallback = fb
    }
  }
  return { primary, fallback }
}

/** Validate + normalize a raw featureModels JSON blob from the DB into a typed map. */
export function parseFeatureModels(raw: unknown): Partial<Record<AiFeature, ModelRef>> {
  if (!raw || typeof raw !== "object") return {}
  const out: Partial<Record<AiFeature, ModelRef>> = {}
  for (const feature of AI_FEATURES) {
    const entry = (raw as Record<string, unknown>)[feature]
    if (entry && typeof entry === "object") {
      const e = entry as Record<string, unknown>
      const provider = e.provider
      const model    = e.model
      if (
        typeof model === "string" && model.length > 0 &&
        (provider === "openrouter" || provider === "anthropic" || provider === "openai")
      ) {
        out[feature] = { provider, model }
      }
    }
  }
  return out
}
