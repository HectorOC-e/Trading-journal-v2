import { describe, it, expect, vi, beforeEach } from "vitest"

const { streamChat } = vi.hoisted(() => ({ streamChat: vi.fn() }))
vi.mock("@/lib/ai/chat", () => ({ streamChat }))

import { runReviewAnalysis } from "@/server/services/reviews/review-ai"
import { AiCallError } from "@/lib/ai/ai-error"

const cand = (model: string) =>
  ({ provider: "openrouter" as const, model, apiKey: "k", source: "user" as const })

function streamOf(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(c) { c.enqueue(new TextEncoder().encode(text)); c.close() },
  })
}

beforeEach(() => { streamChat.mockReset() })

describe("runReviewAnalysis — el perfil lo declara el call-site", () => {
  it("devuelve el texto del primer candidato que responde", async () => {
    streamChat.mockResolvedValueOnce(streamOf("analisis"))
    const out = await runReviewAnalysis([cand("a")], "prompt", "background")
    expect(out).toBe("analisis")
  })

  it("cae al segundo candidato cuando el primero da un error permanente", async () => {
    streamChat
      .mockRejectedValueOnce(new AiCallError({ status: 401, provider: "openrouter", model: "a", kind: "chat" }))
      .mockResolvedValueOnce(streamOf("desde-b"))

    const out = await runReviewAnalysis([cand("a"), cand("b")], "prompt", "background")

    expect(out).toBe("desde-b")
    expect(streamChat).toHaveBeenCalledTimes(2) // sin reintentar el 401
  })

  it("propaga la causa real cuando se agota la cadena", async () => {
    streamChat.mockRejectedValue(new AiCallError({ status: 400, provider: "openrouter", model: "a", kind: "chat" }))
    await expect(runReviewAnalysis([cand("a")], "prompt", "background"))
      .rejects.toMatchObject({ status: 400 })
  })

  // El discriminador real frente al bucle viejo: aquel NUNCA reintentaba el mismo
  // candidato, asi que con uno solo un 429 transitorio era fatal.
  it("REINTENTA el mismo candidato ante un 429, con un unico candidato", async () => {
    streamChat
      .mockRejectedValueOnce(new AiCallError({ status: 429, provider: "openrouter", model: "a", kind: "chat" }))
      .mockResolvedValueOnce(streamOf("a la segunda"))

    const out = await runReviewAnalysis([cand("a")], "prompt", "background")

    expect(out).toBe("a la segunda")
    expect(streamChat).toHaveBeenCalledTimes(2)
  })
})
