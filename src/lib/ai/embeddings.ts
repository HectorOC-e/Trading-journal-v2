// Unified embeddings — supports OpenAI API and OpenRouter (OpenAI-compatible).
// Anthropic does not offer an embedding API.
//
// Model + API key are passed in explicitly (resolved from the user's persisted
// config via resolve-provider.ts → resolveEmbeddingCall). No env-var guessing here.

export type EmbedOptions = {
  model:  string
  apiKey: string
}

/**
 * Generate an embedding vector for the given text.
 * Returns null if no key is provided, text is empty, or on error.
 * A slash-style model id ("openai/text-embedding-3-small") routes through
 * OpenRouter; a bare id ("text-embedding-3-small") routes through OpenAI.
 */
export async function embedText(text: string, opts: EmbedOptions): Promise<number[] | null> {
  const model  = opts.model?.trim()
  const apiKey = opts.apiKey
  if (!model || !apiKey || !text.trim()) return null

  const viaOpenRouter = model.includes("/")
  const baseUrl = viaOpenRouter
    ? "https://openrouter.ai/api/v1"
    : "https://api.openai.com/v1"

  try {
    const res = await fetch(`${baseUrl}/embeddings`, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ model, input: text }),
    })

    if (!res.ok) return null

    const json = await res.json() as {
      data?: { embedding: number[] }[]
    }
    return json.data?.[0]?.embedding ?? null
  } catch {
    return null
  }
}
