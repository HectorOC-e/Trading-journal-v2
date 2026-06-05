import { describe, it, expect } from "vitest"
import {
  resolveFeatureModel, parseFeatureModels, DEFAULT_AI_SETTINGS,
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
    expect(AI_FEATURES.length).toBe(7)
  })
})
