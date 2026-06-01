// Unified embeddings — supports OpenAI API and OpenRouter (OpenAI-compatible).
// Anthropic does not offer an embedding API.

import { getEmbeddingModel, getProviderKey, isEmbeddingAvailable } from "./config"

/**
 * Generate a 1536-dim embedding vector for the given text.
 * Returns null if no embedding key is configured or on error.
 */
export async function embedText(text: string): Promise<number[] | null> {
  if (!isEmbeddingAvailable()) return null
  if (!text.trim()) return null

  const model = getEmbeddingModel()

  // Determine base URL and key
  const isOpenRouter = model.includes("/")
  const baseUrl = isOpenRouter
    ? "https://openrouter.ai/api/v1"
    : "https://api.openai.com/v1"
  const key = isOpenRouter
    ? (getProviderKey("openrouter") || getProviderKey("openai"))
    : getProviderKey("openai")

  if (!key) return null

  try {
    const res = await fetch(`${baseUrl}/embeddings`, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
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
