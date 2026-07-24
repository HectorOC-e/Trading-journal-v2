import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

/**
 * Un solo dueño del reintento.
 *
 * El bucle `for (const c of candidates)` vivía en CINCO módulos, cada uno con su
 * variante. Añadir retry a mano en cada uno produce cinco comportamientos: es la
 * forma exacta del bug #156, donde la resolución del modelo de embeddings vivía
 * en cuatro copias y sólo se arregló en una. Esta guarda impide que vuelvan.
 */
const MIGRATED = [
  "lib/ai/coach-service.ts",
  "lib/ai/analytics-insights-service.ts",
  "lib/ai/psychology-insights-service.ts",
  "lib/ai/complete.ts",
  "server/services/reviews/review-ai.ts",
]

describe("executeAiCall es el unico que itera candidatos", () => {
  for (const rel of MIGRATED) {
    it(`${rel} delega en el ejecutor y no tiene bucle propio`, () => {
      const src = readFileSync(resolve(__dirname, "../../", rel), "utf8")
      expect(src).not.toMatch(/for\s*\(\s*const\s+\w+\s+of\s+candidates\s*\)/)
      expect(src).toContain("executeAiCall")
    })
  }

  it("el pipeline de recuperacion tambien pasa por el ejecutor", () => {
    const src = readFileSync(resolve(__dirname, "../../server/services/retrieval/pipeline.ts"), "utf8")
    expect(src).toContain("executeAiCall")
  })
})
