// Unified streaming chat — supports Anthropic SDK, OpenRouter, and OpenAI-compatible APIs.
//
// Provider and API key are passed in EXPLICITLY by the caller (resolved from the
// user's persisted config via resolve-provider.ts). This module no longer reads
// environment variables or guesses the provider from the model name — that was the
// root cause of the "configure ANTHROPIC_API_KEY" inconsistency.

import type { AiProvider } from "./config"

export type ChatMessage = { role: "user" | "assistant"; content: string }

export type StreamChatOptions = {
  provider:  AiProvider
  apiKey:    string
  model:     string
  messages:  ChatMessage[]
  system?:   string
  maxTokens?: number
}

/**
 * Returns a ReadableStream of plain text chunks.
 * Callers pipe this directly to the response without buffering.
 */
export async function streamChat(opts: StreamChatOptions): Promise<ReadableStream<Uint8Array>> {
  const provider = opts.provider
  const key      = opts.apiKey
  const encoder  = new TextEncoder()

  if (!key) throw new Error(`No API key provided for provider "${provider}"`)

  if (provider === "anthropic") {
    // Use Anthropic SDK for direct Anthropic calls
    const { default: Anthropic } = await import("@anthropic-ai/sdk")
    const client = new Anthropic({ apiKey: key })

    const stream = await client.messages.stream({
      model:      opts.model,
      max_tokens: opts.maxTokens ?? 1024,
      ...(opts.system ? { system: opts.system } : {}),
      messages:   opts.messages,
    })

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })
  }

  // OpenRouter and OpenAI share the same OpenAI-compatible streaming format
  const baseUrl = provider === "openrouter"
    ? "https://openrouter.ai/api/v1"
    : "https://api.openai.com/v1"

  const body: Record<string, unknown> = {
    model:      opts.model,
    max_tokens: opts.maxTokens ?? 1024,
    stream:     true,
    messages:   opts.system
      ? [{ role: "system", content: opts.system }, ...opts.messages]
      : opts.messages,
  }

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${key}`,
    "Content-Type":  "application/json",
  }
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL ?? "https://trading-journal.app"
    headers["X-Title"]      = "Trading Journal AI Coach"
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method:  "POST",
    headers,
    body:    JSON.stringify(body),
  })

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "")
    throw new Error(`${provider} chat error ${res.status}: ${errText}`)
  }

  // Parse SSE stream: "data: {json}\n\n" → extract delta text
  const upstream = res.body
  return new ReadableStream({
    async start(controller) {
      const reader  = upstream.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ""

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            const trimmed = line.replace(/^data:\s*/, "")
            if (!trimmed || trimmed === "[DONE]") continue
            try {
              const json = JSON.parse(trimmed) as {
                choices?: { delta?: { content?: string } }[]
              }
              const text = json.choices?.[0]?.delta?.content
              if (text) controller.enqueue(encoder.encode(text))
            } catch {
              // skip malformed SSE lines
            }
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      } finally {
        reader.releaseLock()
      }
    },
  })
}
