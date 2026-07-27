import { describe, it, expect, vi, afterEach } from "vitest"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { ResolvedCall } from "@/lib/ai/resolve-provider"

// vi.hoisted: vi.mock se iza por encima de los const, y sin esto el mock
// referenciaria una variable en zona muerta temporal.
const h = vi.hoisted(() => ({ anthropicStream: vi.fn() }))

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { stream: (p: unknown) => h.anthropicStream(p) }
  },
}))

vi.mock("@/lib/ai/coach-tools", () => ({
  COACH_TOOLS: [{ name: "get_trade_detail", description: "d", input_schema: { type: "object", properties: {} } }],
  executeCoachTool: vi.fn(async () => ({ text: "trade #7" })),
}))

import { streamCoachAgent } from "@/lib/ai/coach-agent"

/** Un turno del SDK: async-iterable de eventos + finalMessage(). */
function turn(events: unknown[], final: unknown) {
  return {
    async *[Symbol.asyncIterator]() { for (const e of events) yield e },
    finalMessage: async () => final,
  }
}

const TOOL_TURN = () => turn([], {
  stop_reason: "tool_use",
  content: [{ type: "tool_use", id: "t1", name: "get_trade_detail", input: {} }],
})

const TEXT_TURN = () => turn(
  [{ type: "content_block_delta", delta: { type: "text_delta", text: "Cierro con lo que recopile." } }],
  { stop_reason: "end_turn", content: [] },
)

async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const dec = new TextDecoder()
  let out = ""
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    out += dec.decode(value, { stream: true })
  }
  return out
}

const candidate: ResolvedCall = {
  provider: "anthropic", model: "claude-x", apiKey: "k", source: "user",
}

afterEach(() => { h.anthropicStream.mockReset() })

describe("streamCoachAgent (Anthropic) — agotar MAX_ROUNDS no puede terminar sin respuesta", () => {
  it("la ultima ronda va con tool_choice {type:'none'}, asi el modelo cierra con lo recopilado", async () => {
    const params: Array<{ tool_choice?: { type: string } }> = []
    h.anthropicStream.mockImplementation((p: { tool_choice?: { type: string } }) => {
      params.push(p)
      return p.tool_choice?.type === "none" ? TEXT_TURN() : TOOL_TURN()
    })

    const out = await drain(await streamCoachAgent({
      candidate,
      system:   "eres un coach",
      messages: [{ role: "user" as const, content: "como voy?" }],
      prisma:   {} as PrismaClient,
      userId:   "u1",
    }))

    expect(h.anthropicStream).toHaveBeenCalledTimes(5)
    expect(params[0].tool_choice).toBeUndefined()
    expect(params[4].tool_choice).toEqual({ type: "none" })
    expect(out).toContain("Cierro con lo que recopile.")
  })
})
