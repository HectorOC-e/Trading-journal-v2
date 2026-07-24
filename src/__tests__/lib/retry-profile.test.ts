import { describe, it, expect } from "vitest"
import { RETRY_PROFILES, backoffDelay } from "@/lib/ai/retry-profile"

describe("RETRY_PROFILES — los valores fijados en el spec", () => {
  it("fondo: 3 reintentos, base 500ms, x2, jitter 25%, sin techo", () => {
    const p = RETRY_PROFILES.background
    expect(p.retries).toBe(3)
    expect(p.baseDelayMs).toBe(500)
    expect(p.factor).toBe(2)
    expect(p.jitterRatio).toBe(0.25)
    expect(p.totalBudgetMs).toBeNull()
  })

  it("interactivo: 1 reintento, 400ms fijo, techo total 8s", () => {
    const p = RETRY_PROFILES.interactive
    expect(p.retries).toBe(1)
    expect(p.baseDelayMs).toBe(400)
    expect(p.factor).toBe(1) // fijo: no crece
    expect(p.totalBudgetMs).toBe(8000)
  })
})

describe("backoffDelay", () => {
  const mid = () => 0.5 // jitter neutro: 0.5 -> sin desviacion

  it("fondo progresa 500 / 1000 / 2000 sin jitter", () => {
    const p = RETRY_PROFILES.background
    expect(backoffDelay(p, 0, mid)).toBe(500)
    expect(backoffDelay(p, 1, mid)).toBe(1000)
    expect(backoffDelay(p, 2, mid)).toBe(2000)
  })

  it("interactivo se queda en 400 fijo", () => {
    const p = RETRY_PROFILES.interactive
    expect(backoffDelay(p, 0, mid)).toBe(400)
    expect(backoffDelay(p, 1, mid)).toBe(400)
  })

  it("el jitter queda ACOTADO a +/-25% en todo el rango de rand()", () => {
    const p = RETRY_PROFILES.background
    for (const r of [0, 0.25, 0.5, 0.75, 1]) {
      const d = backoffDelay(p, 1, () => r) // base 1000
      expect(d).toBeGreaterThanOrEqual(750)
      expect(d).toBeLessThanOrEqual(1250)
    }
  })

  it("el jitter desvia de verdad en los extremos — no es un no-op", () => {
    const p = RETRY_PROFILES.background
    expect(backoffDelay(p, 1, () => 0)).toBe(750)
    expect(backoffDelay(p, 1, () => 1)).toBe(1250)
  })

  it("nunca devuelve un retardo negativo ni cero", () => {
    expect(backoffDelay(RETRY_PROFILES.background, 0, () => 0)).toBeGreaterThan(0)
  })
})
