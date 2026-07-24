import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

/**
 * Guarda de un solo escritor.
 *
 * `commitment-service` publica `commitment.{kept,partial,broken}` al outbox Y
 * escribía ADEMÁS el episodio de memoria inline (`recordEpisode`, sourceId = id
 * del compromiso). Con el consumidor del outbox (memoryHandler) escribiendo su
 * propio episodio (sourceId = id del EVENTO), el mismo hecho producía DOS
 * episodios, y ningún dedupe podía verlo: las dos claves son distintas por diseño.
 *
 * El outbox es el sitio correcto para la reacción (desacoplado), así que el
 * productor deja de escribir. Esta guarda impide que la escritura inline vuelva.
 */
const SRC = resolve(__dirname, "../../../server/services/behavior/commitment-service.ts")

describe("episodios de commitment — un solo escritor (el consumidor del outbox)", () => {
  const source = readFileSync(SRC, "utf8")

  it("commitment-service publica el evento pero NO escribe el episodio", () => {
    expect(source).toContain("publishEvent(tx, { userId, type: `commitment.${result}`")
    expect(source).not.toMatch(/recordEpisode\s*\(/)
  })

  it("tampoco importa el servicio de episodios", () => {
    expect(source).not.toContain("memory-episode-service")
  })
})
