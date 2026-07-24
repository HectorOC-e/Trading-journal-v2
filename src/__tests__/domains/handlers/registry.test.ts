import { describe, it, expect } from "vitest"
import { HANDLERS } from "@/domains/cognitive/events/handlers"
import { DOMAIN_EVENT_TYPES } from "@/domains/cognitive/events/event-types"

describe("HANDLERS — mapa de composición del outbox", () => {
  it("cubre los cuatro commitment.* y insight.created", () => {
    for (const t of ["commitment.created", "commitment.broken", "commitment.kept", "commitment.partial"] as const) {
      expect(HANDLERS[t]?.length).toBeGreaterThan(0)
    }
    expect(HANDLERS["insight.created"]?.length).toBeGreaterThan(0)
  })

  it("sólo declara tipos del catálogo congelado (una clave con typo nunca se reclamaría)", () => {
    for (const key of Object.keys(HANDLERS)) {
      expect(DOMAIN_EVENT_TYPES).toContain(key)
    }
  })

  it("cada entrada tiene al menos un handler invocable", () => {
    for (const [key, list] of Object.entries(HANDLERS)) {
      expect(list, key).toBeDefined()
      expect(list!.length, key).toBeGreaterThan(0)
      for (const h of list!) expect(typeof h, key).toBe("function")
    }
  })
})
