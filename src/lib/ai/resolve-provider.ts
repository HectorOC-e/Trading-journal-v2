// Server-side AI call resolver — the SINGLE place that decides, for a given user
// and feature: which provider, which model, and which API KEY to use.
//
// Key resolution order (per provider):
//   1. The user's PERSISTED key in user_ai_configs (decrypted).   → source "user"
//   2. The matching environment variable (platform-level key).    → source "env"
//   3. None.                                                       → source "none"
//
// This is what makes the AI features honor the user's saved configuration instead
// of silently reading only environment variables. See
// docs/AI_CONFIGURATION_CONSISTENCY_REPORT.md.

import type { PrismaClient } from "@/lib/generated/prisma/client"
import { decryptApiKey } from "./key-encryption"
import { getProviderKey } from "./config"
import { resolveModelForFeature, loadAiSettings } from "./resolve-model"
import {
  type AiProvider, type AiFeature, type ModelRef,
} from "./feature-models"

export type KeySource = "user" | "env" | "none"

export type ResolvedCall = {
  provider: AiProvider
  model:    string
  apiKey:   string      // "" when source === "none"
  source:   KeySource
}

export type ResolvedFeatureCall = {
  primary:  ResolvedCall
  fallback: ResolvedCall | null
}

/** Thrown when neither the user nor the environment provides a usable key. */
export class NoApiKeyError extends Error {
  constructor(public provider: AiProvider) {
    super(`No API key configured for provider "${provider}"`)
    this.name = "NoApiKeyError"
  }
}

/** Resolve the API key for a provider: persisted user key first, then env var. */
export async function resolveProviderKey(
  prisma:   PrismaClient,
  userId:   string,
  provider: AiProvider,
): Promise<{ apiKey: string; source: KeySource }> {
  // 1. Persisted, encrypted user key.
  try {
    const row = await prisma.userAiConfig.findUnique({
      where: { userId_provider: { userId, provider } },
    })
    if (row?.apiKeyEnc && row.isActive !== false) {
      const key = decryptApiKey(row.apiKeyEnc)
      if (key) return { apiKey: key, source: "user" }
    }
  } catch {
    // decryption / lookup failure → fall through to env, never throw here
  }
  // 2. Environment fallback (platform key).
  const envKey = getProviderKey(provider)
  if (envKey) return { apiKey: envKey, source: "env" }
  // 3. Nothing.
  return { apiKey: "", source: "none" }
}

async function toCall(prisma: PrismaClient, userId: string, ref: ModelRef): Promise<ResolvedCall> {
  const { apiKey, source } = await resolveProviderKey(prisma, userId, ref.provider)
  return { provider: ref.provider, model: ref.model, apiKey, source }
}

/**
 * Resolve a full AI call (provider + model + key, plus fallback) for a feature,
 * honoring the user's persisted settings and keys.
 */
export async function resolveAiCall(
  prisma:  PrismaClient,
  userId:  string,
  feature: AiFeature,
): Promise<ResolvedFeatureCall> {
  const { primary, fallback } = await resolveModelForFeature(prisma, userId, feature)
  const primaryCall  = await toCall(prisma, userId, primary)
  const fallbackCall = fallback ? await toCall(prisma, userId, fallback) : null
  return { primary: primaryCall, fallback: fallbackCall }
}

/**
 * Return the ordered list of call candidates that actually have a key.
 * Primary first, then fallback. Empty when nothing is configured.
 */
export function usableCandidates(call: ResolvedFeatureCall): ResolvedCall[] {
  return [call.primary, call.fallback].filter(
    (c): c is ResolvedCall => c != null && c.source !== "none" && c.apiKey.length > 0,
  )
}

/**
 * Embeddings are special: Anthropic has no embedding API, so a slash-style model
 * id (e.g. "openai/text-embedding-3-small") routes through OpenRouter (then OpenAI),
 * while a bare model id (e.g. "text-embedding-3-small") routes through OpenAI.
 * Resolves the model from settings, then the key for the correct transport provider.
 */
export async function resolveEmbeddingCall(
  prisma: PrismaClient,
  userId: string,
): Promise<ResolvedCall> {
  const { primary } = await resolveModelForFeature(prisma, userId, "embeddings")
  const model = primary.model
  const viaOpenRouter = model.includes("/")

  if (viaOpenRouter) {
    const or = await resolveProviderKey(prisma, userId, "openrouter")
    if (or.source !== "none") return { provider: "openrouter", model, apiKey: or.apiKey, source: or.source }
    const oa = await resolveProviderKey(prisma, userId, "openai")
    return { provider: "openai", model, apiKey: oa.apiKey, source: oa.source }
  }
  const oa = await resolveProviderKey(prisma, userId, "openai")
  return { provider: "openai", model, apiKey: oa.apiKey, source: oa.source }
}

// ── Diagnostics ─────────────────────────────────────────────────────────────

export type ProviderKeyStatus = { provider: AiProvider; source: KeySource; configured: boolean }

export type AiDiagnostics = {
  defaultProvider:  AiProvider
  defaultModel:     string
  fallbackProvider: AiProvider | null
  fallbackModel:    string | null
  costPriority:     string
  keys:             ProviderKeyStatus[]
  features:         Array<{
    feature:  AiFeature
    active:   boolean            // true = actually consumed by an LLM call-site
    provider: AiProvider
    model:    string
    source:   KeySource
    fallback: { provider: AiProvider; model: string; source: KeySource } | null
  }>
}

/** Features that are actually consumed by a live LLM call-site today. */
export const ACTIVE_AI_FEATURES: AiFeature[] = ["ai_chat", "weekly_reviews", "embeddings"]

const ALL_PROVIDERS: AiProvider[] = ["openrouter", "anthropic", "openai"]

/**
 * Build a full diagnostics snapshot of the EFFECTIVE configuration for a user:
 * effective provider/model/fallback, key status per provider, and per-feature
 * resolution. Never returns key material.
 */
export async function buildAiDiagnostics(prisma: PrismaClient, userId: string): Promise<AiDiagnostics> {
  const settings = await loadAiSettings(prisma, userId)

  const keys: ProviderKeyStatus[] = await Promise.all(
    ALL_PROVIDERS.map(async (provider) => {
      const { source } = await resolveProviderKey(prisma, userId, provider)
      return { provider, source, configured: source !== "none" }
    }),
  )

  const { AI_FEATURES } = await import("./feature-models")
  const features = await Promise.all(
    AI_FEATURES.map(async (feature) => {
      const call = await resolveAiCall(prisma, userId, feature)
      return {
        feature,
        active:   ACTIVE_AI_FEATURES.includes(feature),
        provider: call.primary.provider,
        model:    call.primary.model,
        source:   call.primary.source,
        fallback: call.fallback
          ? { provider: call.fallback.provider, model: call.fallback.model, source: call.fallback.source }
          : null,
      }
    }),
  )

  return {
    defaultProvider:  settings.defaultProvider,
    defaultModel:     settings.defaultModel,
    fallbackProvider: settings.fallbackProvider,
    fallbackModel:    settings.fallbackModel,
    costPriority:     settings.costPriority,
    keys,
    features,
  }
}
