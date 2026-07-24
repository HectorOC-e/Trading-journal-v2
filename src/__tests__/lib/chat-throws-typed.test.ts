import { describe, it, expect, vi, afterEach } from "vitest"
import { streamChat } from "@/lib/ai/chat"
import { AiCallError } from "@/lib/ai/ai-error"

afterEach(() => { vi.unstubAllGlobals() })

describe("streamChat — error tipado", () => {
  it("un 429 del proveedor sale como AiCallError con status 429", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 429, body: null,
      text: async () => "rate limited",
    }))

    const p = streamChat({
      provider: "openrouter", apiKey: "k", model: "m",
      messages: [{ role: "user", content: "hola" }],
    })

    await expect(p).rejects.toBeInstanceOf(AiCallError)
  })

  it("expone status, kind y modelo de forma estructurada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 503, body: null,
      text: async () => "unavailable",
    }))

    await streamChat({
      provider: "openrouter", apiKey: "k", model: "modelo-x",
      messages: [{ role: "user", content: "hola" }],
    }).then(
      () => { throw new Error("deberia haber lanzado") },
      (e: AiCallError) => {
        expect(e.status).toBe(503)
        expect(e.kind).toBe("chat")
        expect(e.model).toBe("modelo-x")
      },
    )
  })

  it("conserva el detalle del cuerpo en el mensaje, para el log", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 500, body: null,
      text: async () => "upstream exploded",
    }))

    await expect(streamChat({
      provider: "openrouter", apiKey: "k", model: "m",
      messages: [{ role: "user", content: "x" }],
    })).rejects.toThrow(/upstream exploded/)
  })
})
