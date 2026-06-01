// AI provider configuration — reads env vars at call time (supports Next.js runtime env)

export type AiProvider = "openrouter" | "anthropic" | "openai"

/**
 * Detect which provider to use.
 * Priority: if model name contains "/" → likely OpenRouter model ID.
 * Otherwise key priority: OPENROUTER > ANTHROPIC > OPENAI.
 */
export function detectProvider(modelName?: string): AiProvider {
  if (modelName?.includes("/")) {
    if (process.env.OPENROUTER_API_KEY) return "openrouter"
    if (process.env.OPENAI_API_KEY)     return "openai"     // openai-compatible base
  }
  if (process.env.OPENROUTER_API_KEY) return "openrouter"
  if (process.env.ANTHROPIC_API_KEY)  return "anthropic"
  if (process.env.OPENAI_API_KEY)     return "openai"
  return "anthropic"
}

export function getProviderKey(provider: AiProvider): string {
  switch (provider) {
    case "openrouter": return process.env.OPENROUTER_API_KEY ?? ""
    case "anthropic":  return process.env.ANTHROPIC_API_KEY  ?? ""
    case "openai":     return process.env.OPENAI_API_KEY     ?? ""
  }
}

export function isAnyKeyConfigured(): boolean {
  return !!(
    process.env.OPENROUTER_API_KEY ||
    process.env.ANTHROPIC_API_KEY  ||
    process.env.OPENAI_API_KEY
  )
}

// ── Per-feature model defaults ────────────────────────────────────────────────

function resolveModel(envVar: string, anthropicDefault: string, openrouterDefault: string): string {
  if (process.env[envVar]) return process.env[envVar]!
  const provider = detectProvider()
  return provider === "anthropic" ? anthropicDefault : openrouterDefault
}

export function getCoachModel(): string {
  return resolveModel(
    "AI_COACH_MODEL",
    "claude-sonnet-4-6",
    "anthropic/claude-sonnet-4-6",
  )
}

export function getEmbeddingModel(): string {
  if (process.env.EMBEDDING_MODEL) return process.env.EMBEDDING_MODEL
  // Embeddings only via OpenAI or OpenRouter (Anthropic has no embedding API)
  return "openai/text-embedding-3-small"
}

export function getWeeklySummaryModel(): string {
  return resolveModel(
    "WEEKLY_SUMMARY_MODEL",
    "claude-haiku-4-5-20251001",
    "anthropic/claude-haiku-4-5",
  )
}

export function isEmbeddingAvailable(): boolean {
  return !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY)
}
