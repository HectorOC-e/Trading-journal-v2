// Agentic loop for the coach: resolves read-only tool calls on demand, then
// returns the answer as a stream. Supports Anthropic (native streaming tool use)
// and OpenAI-compatible providers (OpenRouter/OpenAI function calling). If tool
// calling fails (e.g. the model doesn't support tools) the caller falls back to
// the static-context streaming path.

import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { AiProvider } from "./config"
import type { SystemBlock } from "./chat"
import { COACH_TOOLS, executeCoachTool } from "./coach-tools"

const MAX_ROUNDS = 5

export interface CoachAgentOptions {
  provider: AiProvider
  apiKey:   string
  model:    string
  system:   string | SystemBlock[]
  messages: { role: "user" | "assistant"; content: string }[]
  prisma:   PrismaClient
  userId:   string
}

function systemToString(system: string | SystemBlock[]): string {
  return typeof system === "string" ? system : system.map(b => b.text).join("\n\n")
}

export async function streamCoachAgent(opts: CoachAgentOptions): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder()
  const tctx = { userId: opts.userId, prisma: opts.prisma }

  if (opts.provider === "anthropic") {
    const { default: Anthropic } = await import("@anthropic-ai/sdk")
    const client = new Anthropic({ apiKey: opts.apiKey })
    const systemParam = typeof opts.system === "string"
      ? opts.system
      : opts.system.map(b => ({ type: "text" as const, text: b.text, ...(b.cache ? { cache_control: { type: "ephemeral" as const } } : {}) }))

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const convo: { role: "user" | "assistant"; content: unknown }[] = opts.messages.map(m => ({ role: m.role, content: m.content }))
          for (let round = 0; round < MAX_ROUNDS; round++) {
            const stream = client.messages.stream({
              model: opts.model, max_tokens: 4096,
              ...(systemParam ? { system: systemParam as never } : {}),
              tools: COACH_TOOLS as never, messages: convo as never,
            })
            for await (const ev of stream) {
              if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") controller.enqueue(encoder.encode(ev.delta.text))
            }
            const final = await stream.finalMessage()
            if (final.stop_reason !== "tool_use") break
            convo.push({ role: "assistant", content: final.content })
            const results: { type: "tool_result"; tool_use_id: string; content: string }[] = []
            for (const block of final.content) {
              if (block.type === "tool_use") {
                const out = await executeCoachTool(block.name, block.input as Record<string, unknown>, tctx)
                results.push({ type: "tool_result", tool_use_id: block.id, content: out })
              }
            }
            convo.push({ role: "user", content: results })
          }
          controller.close()
        } catch (err) { controller.error(err) }
      },
    })
  }

  // ── OpenAI-compatible (OpenRouter / OpenAI) — non-streaming tool loop ────────
  const baseUrl = opts.provider === "openrouter" ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1"
  const tools = COACH_TOOLS.map(t => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }))
  const headers: Record<string, string> = { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" }
  if (opts.provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL ?? "https://trading-journal.app"
    headers["X-Title"] = "Trading Journal AI Coach"
  }
  type OAIMsg = { role: string; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[]; tool_call_id?: string }
  const messages: OAIMsg[] = [{ role: "system", content: systemToString(opts.system) }, ...opts.messages.map(m => ({ role: m.role, content: m.content }))]

  // Cache identical tool calls within this turn (avoid redundant DB queries).
  const toolCache = new Map<string, string>()
  const runTool = async (name: string, args: Record<string, unknown>) => {
    const key = `${name}:${JSON.stringify(args)}`
    const hit = toolCache.get(key)
    if (hit != null) return hit
    const out = await executeCoachTool(name, args, tctx)
    toolCache.set(key, out)
    return out
  }

  const doFetch = () => fetch(`${baseUrl}/chat/completions`, {
    method: "POST", headers,
    body: JSON.stringify({ model: opts.model, max_tokens: 4096, tools, tool_choice: "auto", stream: true, messages }),
  })

  // Pre-flight the first request OUTSIDE the stream: if the model rejects tools,
  // this throws synchronously and the caller falls back to the static path.
  const firstRes = await doFetch()
  if (!firstRes.ok || !firstRes.body) {
    throw new Error(`${opts.provider} tools error ${firstRes.status}: ${await firstRes.text().catch(() => "")}`)
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let res: Response = firstRes
        for (let round = 0; round < MAX_ROUNDS; round++) {
          if (round > 0) {
            res = await doFetch()
            if (!res.ok || !res.body) break
          }
          // Parse the SSE stream: emit content deltas live, accumulate tool_calls (by index).
          const calls = new Map<number, { id: string; name: string; args: string }>()
          let assistantText = ""
          const reader = res.body!.getReader(); const decoder = new TextDecoder(); let buf = ""
          const handle = (line: string) => {
            const t = line.replace(/^data:\s*/, "")
            if (!t || t === "[DONE]") return
            try {
              const j = JSON.parse(t) as { choices?: { delta?: { content?: string; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] } }[] }
              const d = j.choices?.[0]?.delta
              if (d?.content) { assistantText += d.content; controller.enqueue(encoder.encode(d.content)) }
              for (const tc of d?.tool_calls ?? []) {
                const cur = calls.get(tc.index) ?? { id: "", name: "", args: "" }
                if (tc.id) cur.id = tc.id
                if (tc.function?.name) cur.name = tc.function.name
                if (tc.function?.arguments) cur.args += tc.function.arguments
                calls.set(tc.index, cur)
              }
            } catch { /* skip malformed SSE */ }
          }
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split("\n"); buf = lines.pop() ?? ""
            for (const l of lines) handle(l)
          }
          if (buf.trim()) handle(buf)

          if (calls.size === 0) break // final answer already streamed

          // Execute the requested tools and loop with their results.
          messages.push({ role: "assistant", content: assistantText || null, tool_calls: [...calls.values()].map(c => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: c.args } })) })
          for (const c of calls.values()) {
            let args: Record<string, unknown> = {}
            try { args = JSON.parse(c.args || "{}") } catch { /* ignore */ }
            messages.push({ role: "tool", tool_call_id: c.id, content: await runTool(c.name, args) })
          }
        }
        controller.close()
      } catch (err) { controller.error(err) }
    },
  })
}
