import { describe, it, expect, vi, beforeEach } from "vitest"
import { AiCallError } from "@/lib/ai/ai-error"

const { embedText, resolveEmbeddingCall } = vi.hoisted(() => ({
  embedText: vi.fn(),
  resolveEmbeddingCall: vi.fn(),
}))
vi.mock("@/lib/ai/embeddings", () => ({ embedText }))
vi.mock("@/lib/ai/resolve-provider", () => ({ resolveEmbeddingCall }))

import { search, reindex } from "@/server/services/retrieval/pipeline"

const boom = () => new AiCallError({ status: 503, provider: "openrouter", model: "m", kind: "embeddings" })

beforeEach(() => {
  vi.clearAllMocks()
  resolveEmbeddingCall.mockResolvedValue({ source: "user", model: "m", apiKey: "k" })
})

/**
 * Ahora que embedText LANZA en vez de devolver null, el pipeline tiene que
 * seguir honrando la taxonomia de 5 estados. Un fallo del embedding no puede
 * (a) reventar la busqueda, ni (b) reportar "no queda nada pendiente".
 */
describe("search — un embedding que falla NO revienta la busqueda", () => {
  it("devuelve EMBED_FAILED por corpus en vez de propagar el error", async () => {
    embedText.mockRejectedValue(boom())
    const prisma = {} as never

    const out = await search(prisma, "u1", { query: "impaciencia" })

    expect(out.citations).toEqual([])
    expect(out.outcomes.length).toBeGreaterThan(0)
    expect(out.outcomes.every(o => o.state === "EMBED_FAILED")).toBe(true)
  })

  it("reintenta antes de rendirse — no se rinde al primer hipo", async () => {
    embedText.mockRejectedValue(boom())
    await search({} as never, "u1", { query: "x" })
    // Perfil de fondo: 1 intento + 3 reintentos sobre el unico candidato.
    expect(embedText).toHaveBeenCalledTimes(4)
  })
})

describe("reindex — un fallo por fila no aborta el lote", () => {
  /**
   * prisma falso sobre `trade_notes`: la 1a consulta cruda es `pending` (filas a
   * embeber), la 2a es `counts`. Asi el test ejercita el bucle real del pipeline.
   */
  function fakePrisma() {
    let call = 0
    return {
      $queryRaw: vi.fn(async () => {
        call++
        if (call === 1) return [{ id: "a", text: "uno" }, { id: "b", text: "dos" }]
        return [{ total: 2, withText: 2, embedded: 1 }]
      }),
      $executeRaw: vi.fn(),
    } as never
  }

  it("cuenta la fila fallida, embebe la otra y NO lanza", async () => {
    // La 1a fila agota sus 4 intentos; la 2a responde bien.
    embedText
      .mockRejectedValueOnce(boom()).mockRejectedValueOnce(boom())
      .mockRejectedValueOnce(boom()).mockRejectedValueOnce(boom())
      .mockResolvedValue([0.1])

    const out = await reindex(fakePrisma(), "u1", { corpus: "trade_notes", limit: 10 })

    expect(out.failed).toBe(1)
    expect(out.embedded).toBe(1)
  })
})
