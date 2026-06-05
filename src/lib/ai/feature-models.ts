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

// ── Cost-priority ladders ──────────────────────────────────────────────────────
// When a model is left as "auto" (or blank), the model is picked from these
// ladders by the user's costPriority. Embeddings have their own fixed ladder
// because Anthropic has no embedding API.
const CHAT_LADDER: Record<AiProvider, Record<CostPriority, string>> = {
  anthropic: {
    quality: "claude-opus-4-8",
    speed:   "claude-haiku-4-5-20251001",
    cost:    "claude-haiku-4-5-20251001",
  },
  openrouter: {
    quality: "anthropic/claude-opus-4-8",
    speed:   "anthropic/claude-haiku-4-5",
    cost:    "openai/gpt-4o-mini",
  },
  openai: {
    quality: "gpt-4o",
    speed:   "gpt-4o-mini",
    cost:    "gpt-4o-mini",
  },
}

const EMBEDDING_LADDER: Record<AiProvider, string> = {
  openai:     "text-embedding-3-small",
  openrouter: "openai/text-embedding-3-small",
  anthropic:  "openai/text-embedding-3-small", // Anthropic has no embeddings → route via OpenAI-compatible
}

function isAutoModel(model: string | undefined | null): boolean {
  const m = (model ?? "").trim().toLowerCase()
  return m === "" || m === "auto"
}

/** Pick a concrete model from the ladders for a provider + cost posture. */
export function pickAutoModel(provider: AiProvider, costPriority: CostPriority, feature: AiFeature): string {
  if (feature === "embeddings") return EMBEDDING_LADDER[provider]
  return CHAT_LADDER[provider][costPriority]
}

/**
 * Resolve which model to use for a feature:
 *   1. per-feature override if set (explicit model, or "auto" → ladder by costPriority),
 *   2. otherwise the global default (explicit, or "auto" → ladder by costPriority),
 *   3. plus the global fallback (when configured and distinct from primary).
 */
export function resolveFeatureModel(settings: AiSettings, feature: AiFeature): ResolvedFeatureModel {
  const override = settings.featureModels[feature]
  const provider = override?.provider ?? settings.defaultProvider
  const rawModel = override ? override.model : settings.defaultModel
  const model    = isAutoModel(rawModel)
    ? pickAutoModel(provider, settings.costPriority, feature)
    : rawModel
  const primary: ModelRef = { provider, model }

  let fallback: ModelRef | null = null
  if (settings.fallbackModel && settings.fallbackProvider) {
    const fbModel = isAutoModel(settings.fallbackModel)
      ? pickAutoModel(settings.fallbackProvider, settings.costPriority, feature)
      : settings.fallbackModel
    const fb: ModelRef = { provider: settings.fallbackProvider, model: fbModel }
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
