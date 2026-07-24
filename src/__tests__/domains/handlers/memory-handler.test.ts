import { describe, it, expect, vi, beforeEach } from "vitest"

// vi.mock se iza por encima de las declaraciones del módulo: el doble tiene que
// crearse dentro de vi.hoisted para existir cuando corre la factory.
const { recordEpisodeOnce } = vi.hoisted(() => ({ recordEpisodeOnce: vi.fn() }))
vi.mock("@/server/services/memory/memory-episode-service", () => ({ recordEpisodeOnce }))

import { memoryHandler } from "@/domains/cognitive/events/handlers/memory-handler"

const COMMITMENT = {
  text: "No tomar más de 2 trades por día esta semana",
  metricKey: "tradesPerDayBeyond2",
  comparator: "<=",
  target: 0,
  window: "week",
}

const prismaWith = (commitment: unknown) =>
  ({ commitment: { findFirst: vi.fn().mockResolvedValue(commitment) } }) as never

const evt = (type: string) => ({
  id: "evt-9",
  userId: "u1",
  type: type as never,
  payload: { commitmentId: "c1" },
})

beforeEach(() => {
  recordEpisodeOnce.mockReset()
  recordEpisodeOnce.mockResolvedValue("ep1")
})

describe("memoryHandler — commitment.* → episodio de memoria", () => {
  it("commitment.broken escribe un commitment_broken con sourceId = event.id", async () => {
    await memoryHandler(prismaWith(COMMITMENT), evt("commitment.broken"))

    expect(recordEpisodeOnce).toHaveBeenCalledWith(
      expect.anything(),
      "u1",
      expect.objectContaining({ eventType: "commitment_broken", sourceId: "evt-9" }),
    )
  })

  it("el contenido usa el texto del compromiso, no la jerga de la métrica", async () => {
    await memoryHandler(prismaWith(COMMITMENT), evt("commitment.broken"))

    const content = recordEpisodeOnce.mock.calls[0][2].content as string
    expect(content).toBe("Rompiste tu compromiso: No tomar más de 2 trades por día esta semana")
  })

  it("cae a la descripción de la métrica si el compromiso no tiene texto", async () => {
    await memoryHandler(prismaWith({ ...COMMITMENT, text: "   " }), evt("commitment.broken"))

    const content = recordEpisodeOnce.mock.calls[0][2].content as string
    expect(content).toBe("Rompiste tu compromiso: tradesPerDayBeyond2 <= 0 (week)")
  })

  it("cada uno de los cuatro commitment.* mapea a su tipo de episodio", async () => {
    const cases = [
      ["commitment.created", "commitment_created", "Te comprometiste a"],
      ["commitment.broken", "commitment_broken", "Rompiste tu compromiso"],
      ["commitment.kept", "commitment_kept", "Cumpliste tu compromiso"],
      ["commitment.partial", "commitment_kept", "Cumpliste en parte"],
    ] as const

    for (const [eventType, episodeType, verb] of cases) {
      recordEpisodeOnce.mockClear()
      await memoryHandler(prismaWith(COMMITMENT), evt(eventType))
      const input = recordEpisodeOnce.mock.calls[0][2]
      expect(input.eventType).toBe(episodeType)
      expect(input.content).toContain(verb)
    }
  })

  it("no-op sin lanzar si el compromiso fue borrado entre publicación y consumo", async () => {
    await expect(memoryHandler(prismaWith(null), evt("commitment.broken"))).resolves.toBeUndefined()
    expect(recordEpisodeOnce).not.toHaveBeenCalled()
  })

  it("ignora un tipo que no sea commitment.* sin escribir nada", async () => {
    await memoryHandler(prismaWith(COMMITMENT), evt("insight.created"))
    expect(recordEpisodeOnce).not.toHaveBeenCalled()
  })

  it("NO traga el error de recordEpisodeOnce — el dispatcher debe reintentar", async () => {
    recordEpisodeOnce.mockRejectedValueOnce(new Error("db down"))
    await expect(memoryHandler(prismaWith(COMMITMENT), evt("commitment.broken"))).rejects.toThrow("db down")
  })
})
