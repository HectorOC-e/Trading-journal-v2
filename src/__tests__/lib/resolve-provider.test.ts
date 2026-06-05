import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock only the env-key reader; everything else (resolver, key-encryption) is real.
vi.mock("@/lib/ai/config", () => ({
  getProviderKey: vi.fn(),
}))

import {
  resolveProviderKey, resolveAiCall, resolveEmbeddingCall, usableCandidates,
} from "@/lib/ai/resolve-provider"
import { getProviderKey } from "@/lib/ai/config"
import { encryptApiKey } from "@/lib/ai/key-encryption"

const mockEnvKey = getProviderKey as ReturnType<typeof vi.fn>

/** Build a prisma stub with given settings row + per-provider saved key rows. */
function makePrisma(opts: {
  settings?: Record<string, unknown> | null
  keys?: Partial<Record<"openrouter" | "anthropic" | "openai", string>> // plaintext → stored encrypted
}) {
  const settings = opts.settings === undefined ? null : opts.settings
  const keyRows = Object.fromEntries(
    Object.entries(opts.keys ?? {}).map(([provider, plain]) => [
      provider,
      { apiKeyEnc: encryptApiKey(plain as string), isActive: true },
    ]),
  )
  return {
    userAiSettings: { findUnique: vi.fn().mockResolvedValue(settings) },
    userAiConfig: {
      findUnique: vi.fn(({ where }: { where: { userId_provider: { provider: string } } }) =>
        Promise.resolve(keyRows[where.userId_provider.provider] ?? null),
      ),
    },
  } as never
}

beforeEach(() => {
  mockEnvKey.mockReset()
  mockEnvKey.mockReturnValue("") // no env keys by default
})

describe("resolveProviderKey — key resolution order", () => {
  it("prefers the persisted user key (source=user)", async () => {
    const prisma = makePrisma({ keys: { openrouter: "sk-or-v1-USERKEY" } })
    const r = await resolveProviderKey(prisma, "u1", "openrouter")
    expect(r.source).toBe("user")
    expect(r.apiKey).toBe("sk-or-v1-USERKEY")
  })

  it("falls back to the env key when no persisted key (source=env)", async () => {
    mockEnvKey.mockImplementation((p: string) => (p === "openrouter" ? "sk-or-ENV" : ""))
    const prisma = makePrisma({})
    const r = await resolveProviderKey(prisma, "u1", "openrouter")
    expect(r.source).toBe("env")
    expect(r.apiKey).toBe("sk-or-ENV")
  })

  it("returns none when neither persisted nor env key exists", async () => {
    const prisma = makePrisma({})
    const r = await resolveProviderKey(prisma, "u1", "anthropic")
    expect(r.source).toBe("none")
    expect(r.apiKey).toBe("")
  })
})

describe("resolveAiCall — Case 1: OpenRouter, no fallback, no feature models", () => {
  it("uses provider=openrouter + the global default model, with a usable candidate", async () => {
    const prisma = makePrisma({
      settings: {
        defaultProvider: "openrouter", defaultModel: "anthropic/claude-sonnet-4-6",
        fallbackProvider: null, fallbackModel: null, costPriority: "quality", featureModels: {},
      },
      keys: { openrouter: "sk-or-v1-KEY" },
    })
    const call = await resolveAiCall(prisma, "u1", "ai_chat")
    expect(call.primary.provider).toBe("openrouter")
    expect(call.primary.model).toBe("anthropic/claude-sonnet-4-6")
    expect(call.primary.source).toBe("user")
    expect(call.fallback).toBeNull()
    expect(usableCandidates(call)).toHaveLength(1)
  })
})

describe("resolveAiCall — Case 2/3: empty feature models + empty fallback never fail", () => {
  it("uses the global model and produces no fallback (no errors)", async () => {
    const prisma = makePrisma({
      settings: {
        defaultProvider: "openrouter", defaultModel: "openai/gpt-4o-mini",
        fallbackProvider: null, fallbackModel: null, costPriority: "cost", featureModels: {},
      },
      keys: { openrouter: "sk-or-v1-KEY" },
    })
    const call = await resolveAiCall(prisma, "u1", "weekly_reviews")
    expect(call.primary.model).toBe("openai/gpt-4o-mini")
    expect(call.fallback).toBeNull()
    expect(usableCandidates(call).length).toBeGreaterThan(0)
  })
})

describe("resolveAiCall — Case 4: feature without model resolves via ladder (auto)", () => {
  it("'auto' global model → concrete model from the cost ladder", async () => {
    const prisma = makePrisma({
      settings: {
        defaultProvider: "openrouter", defaultModel: "auto",
        fallbackProvider: null, fallbackModel: null, costPriority: "speed", featureModels: {},
      },
      keys: { openrouter: "sk-or-v1-KEY" },
    })
    const call = await resolveAiCall(prisma, "u1", "ai_chat")
    // openrouter + speed → "anthropic/claude-haiku-4-5" per CHAT_LADDER
    expect(call.primary.model).toBe("anthropic/claude-haiku-4-5")
    expect(call.primary.provider).toBe("openrouter")
  })

  it("per-feature override takes precedence over the global model", async () => {
    const prisma = makePrisma({
      settings: {
        defaultProvider: "openrouter", defaultModel: "openai/gpt-4o-mini",
        fallbackProvider: null, fallbackModel: null, costPriority: "quality",
        featureModels: { ai_chat: { provider: "anthropic", model: "claude-opus-4-8" } },
      },
      keys: { openrouter: "sk-or-v1-KEY", anthropic: "sk-ant-KEY" },
    })
    const call = await resolveAiCall(prisma, "u1", "ai_chat")
    expect(call.primary.provider).toBe("anthropic")
    expect(call.primary.model).toBe("claude-opus-4-8")
    expect(call.primary.source).toBe("user")
  })
})

describe("resolveEmbeddingCall — routes slash models via OpenRouter key", () => {
  it("uses the openrouter key for a slash embedding model", async () => {
    const prisma = makePrisma({
      settings: {
        defaultProvider: "openrouter", defaultModel: "auto",
        fallbackProvider: null, fallbackModel: null, costPriority: "quality", featureModels: {},
      },
      keys: { openrouter: "sk-or-v1-KEY" },
    })
    const emb = await resolveEmbeddingCall(prisma, "u1")
    expect(emb.model).toContain("/")          // "openai/text-embedding-3-small"
    expect(emb.provider).toBe("openrouter")
    expect(emb.source).toBe("user")
  })
})
