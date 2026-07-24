import { describe, it, expect, vi } from "vitest"

// El embedding es best-effort y sale de la ruta de IA: lo neutralizamos para que
// el test hable sólo de la idempotencia por sourceId.
vi.mock("@/lib/ai/resolve-provider", () => ({
  resolveEmbeddingCall: vi.fn().mockResolvedValue({ source: "none" }),
}))
vi.mock("@/lib/ai/embeddings", () => ({ embedText: vi.fn() }))

import { recordEpisodeOnce, recordEpisode } from "@/server/services/memory/memory-episode-service"

function fakePrisma(existing: { id: string } | null, createResult: { id: string } | Error = { id: "new" }) {
  const create = vi.fn(async () => {
    if (createResult instanceof Error) throw createResult
    return createResult
  })
  return {
    prisma: {
      memoryEpisode: { findFirst: vi.fn().mockResolvedValue(existing), create },
      $executeRaw: vi.fn(),
    } as never,
    create,
  }
}

describe("recordEpisodeOnce — idempotente por sourceId", () => {
  it("no crea si ya existe un episodio con ese sourceId", async () => {
    const { prisma, create } = fakePrisma({ id: "existing" })
    const id = await recordEpisodeOnce(prisma, "u1", {
      eventType: "commitment_broken", content: "x", sourceId: "evt-1",
    })
    expect(id).toBe("existing")
    expect(create).not.toHaveBeenCalled()
  })

  it("crea cuando no existe uno con ese sourceId", async () => {
    const { prisma, create } = fakePrisma(null)
    const id = await recordEpisodeOnce(prisma, "u1", {
      eventType: "commitment_created", content: "x", sourceId: "evt-2",
    })
    expect(id).toBe("new")
    expect(create).toHaveBeenCalledTimes(1)
  })

  it("PROPAGA el error del insert — el dispatcher necesita reintentar", async () => {
    const { prisma } = fakePrisma(null, new Error("db down"))
    await expect(
      recordEpisodeOnce(prisma, "u1", { eventType: "commitment_broken", content: "x", sourceId: "evt-3" }),
    ).rejects.toThrow("db down")
  })
})

describe("recordEpisode — sigue tragando errores (best-effort)", () => {
  it("devuelve null en vez de lanzar cuando el insert falla", async () => {
    const { prisma } = fakePrisma(null, new Error("db down"))
    await expect(
      recordEpisode(prisma, "u1", { eventType: "commitment_broken", content: "x" }),
    ).resolves.toBeNull()
  })
})
