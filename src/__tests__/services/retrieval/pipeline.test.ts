import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/ai/resolve-provider", () => ({ resolveEmbeddingCall: vi.fn() }))
vi.mock("@/lib/ai/embeddings", () => ({ embedText: vi.fn() }))

import { resolveEmbeddingCall } from "@/lib/ai/resolve-provider"
import { embedText } from "@/lib/ai/embeddings"
import { search } from "@/server/services/retrieval/pipeline"
import { CORPUS_KEYS } from "@/server/services/retrieval/types"

const withKey = { provider: "openai", model: "text-embedding-3-small", apiKey: "k", source: "user" } as const
const noKey   = { provider: "openai", model: "text-embedding-3-small", apiKey: "", source: "none" } as const
const prisma = {} as never

beforeEach(() => {
  vi.mocked(resolveEmbeddingCall).mockReset()
  vi.mocked(embedText).mockReset()
})

describe("pipeline.search", () => {
  it("sin clave devuelve NO_KEY por corpus y no llama a embedText", async () => {
    vi.mocked(resolveEmbeddingCall).mockResolvedValue(noKey as never)
    const out = await search(prisma, "u1", { query: "miedo", corpus: "trade_notes" })
    expect(out.citations).toEqual([])
    expect(out.outcomes).toEqual([{ corpus: "trade_notes", state: "NO_KEY", remaining: 0 }])
    expect(embedText).not.toHaveBeenCalled()
  })

  it("si el embedding falla devuelve EMBED_FAILED, no una ausencia", async () => {
    vi.mocked(resolveEmbeddingCall).mockResolvedValue(withKey as never)
    vi.mocked(embedText).mockResolvedValue(null)
    const out = await search(prisma, "u1", { query: "miedo", corpus: "trade_notes" })
    expect(out.outcomes[0].state).toBe("EMBED_FAILED")
    expect(out.citations).toEqual([])
  })

  it("sin corpus explicito reporta un estado POR corpus, sin colapsarlos", async () => {
    vi.mocked(resolveEmbeddingCall).mockResolvedValue(noKey as never)
    const out = await search(prisma, "u1", { query: "plan" })
    // Derivado de CORPUS_KEYS a proposito: si esta lista se fijara a mano, cada
    // corpus nuevo rompería el test sin que hubiera nada roto.
    expect(out.outcomes.map(o => o.corpus).sort()).toEqual([...CORPUS_KEYS].sort())
    expect(out.outcomes.every(o => o.state === "NO_KEY")).toBe(true)
  })
})
