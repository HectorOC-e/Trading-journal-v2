// Unified streaming chat — supports Anthropic SDK, OpenRouter, and OpenAI-compatible APIs.
//
// Provider and API key are passed in EXPLICITLY by the caller (resolved from the
// user's persisted config via resolve-provider.ts). This module no longer reads
// environment variables or guesses the provider from the model name — that was the
// root cause of the "configure ANTHROPIC_API_KEY" inconsistency.

import type { AiProvider } from "./config"

export type ChatMessage = { role: "user" | "assistant"; content: string }

/** A system-prompt segment. `cache: true` marks it for provider-side prompt caching. */
export type SystemBlock = { text: string; cache?: boolean }

export type StreamChatOptions = {
  provider:  AiProvider
  apiKey:    string
  model:     string
  messages:  ChatMessage[]
  system?:   string | SystemBlock[]
  maxTokens?: number
}

/** Flatten system blocks (or a plain string) into one string — for providers without explicit caching. */
function systemToString(system: string | SystemBlock[] | undefined): string | undefined {
  if (system == null) return undefined
  return typeof system === "string" ? system : system.map(b => b.text).join("\n\n")
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

    // System blocks → cache_control for prompt caching (large static block reused
    // across requests within the 5-min window). Plain string passes through.
    const systemParam = typeof opts.system === "string" || opts.system == null
      ? opts.system
      : opts.system.map(b => ({
          type: "text" as const,
          text: b.text,
          ...(b.cache ? { cache_control: { type: "ephemeral" as const } } : {}),
        }))

    const stream = await client.messages.stream({
      model:      opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      ...(systemParam ? { system: systemParam } : {}),
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
          console.error("[streamChat:anthropic] stream error", { model: opts.model, err })
          controller.error(err)
        }
      },
    })
  }

  // OpenRouter and OpenAI share the same OpenAI-compatible streaming format
  const baseUrl = provider === "openrouter"
    ? "https://openrouter.ai/api/v1"
    : "https://api.openai.com/v1"

  // OpenAI/OpenRouter cache automatically by prefix (no flag) — flatten blocks to
  // one system message; keeping the static part first maximizes prefix-cache hits.
  const systemText = systemToString(opts.system)
  const body: Record<string, unknown> = {
    model:      opts.model,
    max_tokens: opts.maxTokens ?? 4096,
    stream:     true,
    messages:   systemText
      ? [{ role: "system", content: systemText }, ...opts.messages]
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

      const processLine = (line: string) => {
        const trimmed = line.replace(/^data:\s*/, "")
        if (!trimmed || trimmed === "[DONE]") return
        try {
          const json = JSON.parse(trimmed) as { choices?: { delta?: { content?: string } }[] }
          const text = json.choices?.[0]?.delta?.content
          if (text) controller.enqueue(encoder.encode(text))
        } catch {
          // skip malformed SSE lines
        }
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""
          for (const line of lines) processLine(line)
        }
        // Flush any trailing buffered line that arrived without a final newline
        // (otherwise the last chunk of the reply is silently dropped → truncation).
        buffer += decoder.decode()
        if (buffer.trim()) processLine(buffer)
        controller.close()
      } catch (err) {
        console.error(`[streamChat:${provider}] stream error`, { model: opts.model, err })
        controller.error(err)
      } finally {
        reader.releaseLock()
      }
    },
  })
}
