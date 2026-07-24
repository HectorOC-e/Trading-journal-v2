import { describe, it, expect, vi, afterEach } from "vitest"
import { embedText } from "@/lib/ai/embeddings"
import { AiCallError } from "@/lib/ai/ai-error"

afterEach(() => { vi.unstubAllGlobals() })

describe("embedText — distingue 'no pude' de 'no hay nada'", () => {
  it("devuelve null SIN llamar cuando falta la clave", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    expect(await embedText("hola", { model: "m", apiKey: "" })).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("devuelve null con texto vacio", async () => {
    expect(await embedText("   ", { model: "m", apiKey: "k" })).toBeNull()
  })

  it("devuelve null sin modelo", async () => {
    expect(await embedText("hola", { model: "  ", apiKey: "k" })).toBeNull()
  })

  it("LANZA AiCallError ante un 429 — antes devolvia null en silencio", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 429, text: async () => "slow down",
    }))
    await expect(embedText("hola", { model: "m", apiKey: "k" }))
      .rejects.toMatchObject({ status: 429, kind: "embeddings" })
  })

  it("LANZA ante un fallo de red, en vez de tragarselo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")))
    const p = embedText("hola", { model: "m", apiKey: "k" })
    await expect(p).rejects.toBeInstanceOf(AiCallError)
    await expect(p).rejects.toMatchObject({ status: null }) // sin status: red
  })

  it("devuelve el vector cuando va bien", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ data: [{ embedding: [0.1, 0.2] }] }),
    }))
    expect(await embedText("hola", { model: "m", apiKey: "k" })).toEqual([0.1, 0.2])
  })

  it("un id con barra enruta por OpenRouter y uno sin barra por OpenAI", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ data: [{ embedding: [1] }] }),
    })
    vi.stubGlobal("fetch", fetchSpy)

    await embedText("hola", { model: "openai/text-embedding-3-small", apiKey: "k" })
    expect(fetchSpy.mock.calls[0][0]).toContain("openrouter.ai")

    await embedText("hola", { model: "text-embedding-3-small", apiKey: "k" })
    expect(fetchSpy.mock.calls[1][0]).toContain("api.openai.com")
  })
})
