// Unified embeddings — supports OpenAI API and OpenRouter (OpenAI-compatible).
// Anthropic does not offer an embedding API.
//
// Model + API key are passed in explicitly (resolved from the user's persisted
// config via resolve-provider.ts → resolveEmbeddingCall). No env-var guessing here.

import { AiCallError } from "./ai-error"

export type EmbedOptions = {
  model:  string
  apiKey: string
}

/**
 * Generate an embedding vector for the given text.
 *
 * Returns null ONLY for "there is nothing to do": no key, no model, empty text.
 * A real failure THROWS `AiCallError`, so the caller can retry it.
 *
 * Before this, all four cases collapsed to the same silent null — which is how 3
 * resources with notes ended up with 0 embeddings while the coach told the trader
 * they had never written anything about it (#156). An empty result and a failed
 * call must not look alike.
 *
 * A slash-style model id ("openai/text-embedding-3-small") routes through
 * OpenRouter; a bare id ("text-embedding-3-small") routes through OpenAI.
 */
export async function embedText(text: string, opts: EmbedOptions): Promise<number[] | null> {
  const model  = opts.model?.trim()
  const apiKey = opts.apiKey
  if (!model || !apiKey || !text.trim()) return null

  const viaOpenRouter = model.includes("/")
  const provider = viaOpenRouter ? "openrouter" : "openai"
  const baseUrl = viaOpenRouter
    ? "https://openrouter.ai/api/v1"
    : "https://api.openai.com/v1"

  let res: Response
  try {
    res = await fetch(`${baseUrl}/embeddings`, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ model, input: text }),
    })
  } catch (err) {
    // Network fault: no status. Classified as transient, so it gets retried.
    throw new AiCallError({
      status: null, provider, model, kind: "embeddings",
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  if (!res.ok) {
    throw new AiCallError({
      status: res.status, provider, model, kind: "embeddings",
      detail: await res.text().catch(() => ""),
    })
  }

  const json = await res.json() as {
    data?: { embedding: number[] }[]
  }
  return json.data?.[0]?.embedding ?? null
}
