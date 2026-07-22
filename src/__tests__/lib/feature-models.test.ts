import { describe, it, expect } from "vitest"
import {
  resolveFeatureModel, parseFeatureModels, pickAutoModel, DEFAULT_AI_SETTINGS,
  AI_FEATURES, type AiSettings,
} from "@/lib/ai/feature-models"

function settings(over: Partial<AiSettings> = {}): AiSettings {
  return { ...DEFAULT_AI_SETTINGS, ...over }
}

describe("resolveFeatureModel", () => {
  it("uses global default when no per-feature override", () => {
    const r = resolveFeatureModel(settings({ defaultProvider: "anthropic", defaultModel: "claude-sonnet-4-6" }), "ai_chat")
    expect(r.primary).toEqual({ provider: "anthropic", model: "claude-sonnet-4-6" })
    expect(r.fallback).toBeNull()
  })

  it("uses per-feature override when present", () => {
    const r = resolveFeatureModel(settings({
      defaultProvider: "anthropic", defaultModel: "claude-sonnet-4-6",
      featureModels: { ai_chat: { provider: "openrouter", model: "anthropic/claude-haiku-4-5" } },
    }), "ai_chat")
    expect(r.primary).toEqual({ provider: "openrouter", model: "anthropic/claude-haiku-4-5" })
  })

  it("override on one feature does not affect another", () => {
    const s = settings({
      defaultModel: "claude-sonnet-4-6", defaultProvider: "anthropic",
      featureModels: { embeddings: { provider: "openai", model: "text-embedding-3-small" } },
    })
    expect(resolveFeatureModel(s, "ai_chat").primary.model).toBe("claude-sonnet-4-6")
    expect(resolveFeatureModel(s, "embeddings").primary.model).toBe("text-embedding-3-small")
  })

  it("includes global fallback when configured and distinct", () => {
    const r = resolveFeatureModel(settings({
      defaultProvider: "anthropic", defaultModel: "claude-sonnet-4-6",
      fallbackProvider: "openai", fallbackModel: "gpt-4o-mini",
    }), "ai_chat")
    expect(r.fallback).toEqual({ provider: "openai", model: "gpt-4o-mini" })
  })

  it("drops fallback identical to primary", () => {
    const r = resolveFeatureModel(settings({
      defaultProvider: "anthropic", defaultModel: "claude-sonnet-4-6",
      fallbackProvider: "anthropic", fallbackModel: "claude-sonnet-4-6",
    }), "ai_chat")
    expect(r.fallback).toBeNull()
  })
})

describe("parseFeatureModels", () => {
  it("returns empty for non-objects", () => {
    expect(parseFeatureModels(null)).toEqual({})
    expect(parseFeatureModels("x")).toEqual({})
  })

  it("keeps only valid feature entries", () => {
    const parsed = parseFeatureModels({
      ai_chat:        { provider: "openrouter", model: "anthropic/claude-sonnet-4-6" },
      bogus_feature:  { provider: "openai", model: "x" },
      trade_analysis: { provider: "invalid", model: "y" }, // bad provider → dropped
      embeddings:     { provider: "openai", model: "" },   // empty model → dropped
    })
    expect(parsed.ai_chat).toEqual({ provider: "openrouter", model: "anthropic/claude-sonnet-4-6" })
    expect(Object.keys(parsed)).toEqual(["ai_chat"])
  })

  it("covers exactly the declared feature set", () => {
    expect(AI_FEATURES).toContain("ai_chat")
    expect(AI_FEATURES).toContain("embeddings")
    expect(AI_FEATURES).toContain("analytics_insights")
    expect(AI_FEATURES.length).toBe(8)
  })
})

describe("costPriority auto-pick (ladders)", () => {
  it("'auto' default model resolves via ladder by priority", () => {
    const quality = resolveFeatureModel(settings({ defaultProvider: "anthropic", defaultModel: "auto", costPriority: "quality" }), "ai_chat")
    expect(quality.primary.model).toBe("claude-opus-4-8")
    const speed = resolveFeatureModel(settings({ defaultProvider: "anthropic", defaultModel: "auto", costPriority: "speed" }), "ai_chat")
    expect(speed.primary.model).toBe("claude-haiku-4-5-20251001")
  })

  it("blank model is treated as auto", () => {
    const r = resolveFeatureModel(settings({ defaultProvider: "openai", defaultModel: "", costPriority: "cost" }), "ai_chat")
    expect(r.primary.model).toBe("gpt-4o-mini")
  })

  it("embeddings auto picks an embedding model, not a chat model", () => {
    const r = resolveFeatureModel(settings({ defaultProvider: "openai", defaultModel: "auto", costPriority: "quality" }), "embeddings")
    expect(r.primary.model).toBe("text-embedding-3-small")
  })

  // El caso de producción: el default global NO es "auto", es un modelo de chat
  // explícito. Sin override por feature, embeddings lo heredaba y `embedText`
  // fallaba en cada llamada (EMBED_FAILED), en silencio. Un modelo de chat no
  // puede embeber, así que el default global nunca debe aplicarse a embeddings.
  it("embeddings never inherit an explicit chat default (the prod bug)", () => {
    const r = resolveFeatureModel(
      settings({ defaultProvider: "openrouter", defaultModel: "openrouter/free" }),
      "embeddings",
    )
    expect(r.primary.model).toBe("openai/text-embedding-3-small")
    expect(r.primary.provider).toBe("openrouter")
  })

  it("embeddings still honour an explicit per-feature override", () => {
    const r = resolveFeatureModel(
      settings({
        defaultProvider: "openrouter", defaultModel: "openrouter/free",
        featureModels: { embeddings: { provider: "openai", model: "text-embedding-3-large" } },
      }),
      "embeddings",
    )
    expect(r.primary).toEqual({ provider: "openai", model: "text-embedding-3-large" })
  })

  it("the embeddings fallback is an embedding model too, never the chat fallback", () => {
    const r = resolveFeatureModel(
      settings({
        defaultProvider: "openrouter", defaultModel: "openrouter/free",
        fallbackProvider: "openai", fallbackModel: "gpt-4o",
      }),
      "embeddings",
    )
    expect(r.fallback).toEqual({ provider: "openai", model: "text-embedding-3-small" })
  })

  it("chat features are untouched by the embeddings rule", () => {
    const r = resolveFeatureModel(
      settings({ defaultProvider: "openrouter", defaultModel: "openrouter/free" }),
      "ai_chat",
    )
    expect(r.primary).toEqual({ provider: "openrouter", model: "openrouter/free" })
  })

  it("pickAutoModel routes openrouter cost to a cheap model", () => {
    expect(pickAutoModel("openrouter", "cost", "ai_chat")).toBe("openai/gpt-4o-mini")
  })

  it("explicit model is never overridden by priority", () => {
    const r = resolveFeatureModel(settings({ defaultProvider: "anthropic", defaultModel: "claude-sonnet-4-6", costPriority: "cost" }), "ai_chat")
    expect(r.primary.model).toBe("claude-sonnet-4-6")
  })
})
