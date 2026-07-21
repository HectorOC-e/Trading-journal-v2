import { describe, it, expect } from "vitest"
import {
  detectRevengeTrading,
  detectOversizing,
  type AnalyticsTrade,
} from "@/domains/analytics/services/insights-engine"

/**
 * Ids elegidos AL REVÉS del orden cronológico: "zz" va después de "aa" al ordenar
 * alfabéticamente, pero ocurre ANTES en el reloj. Si el detector ordena por id, ve
 * la revancha antes que la pérdida y no cuenta el par.
 *
 * Los tests que ya existían no podían cazar esto: sus fixtures usan ids `${d}-1..-4`
 * con horas 08:00..11:00, donde ambos órdenes coinciden por accidente.
 */
function t(o: Partial<AnalyticsTrade> & { id: string; date: string; pnl: number }): AnalyticsTrade {
  return {
    id: o.id, accountId: "a1", symbol: "EURUSD", direction: "LONG", session: "London",
    openTime: o.openTime ?? "08:00", closeTime: "12:00",
    pnl: o.pnl, rMultiple: o.pnl >= 0 ? 1 : -1,
    tags: o.tags ?? [], date: o.date, setupId: null,
    entry: 1, stop: 0.99, target: 1.02, size: o.size ?? 1,
    emotionBefore: null, fomoFlag: false, revengeFlag: o.revengeFlag,
  }
}

/** 20 trades de relleno en días propios, sin patrón: solo para pasar MIN_SAMPLE. */
function filler(): AnalyticsTrade[] {
  return Array.from({ length: 20 }, (_, i) =>
    t({ id: `f${String(i).padStart(2, "0")}`, date: `2026-03-${String(i + 1).padStart(2, "0")}`, pnl: 50 }),
  )
}

/**
 * Cada día lleva TRES trades, y el que cierra el día en orden-por-id es una
 * GANANCIA. Sin ese tercer trade, la adyacencia entre días recrea el par por
 * accidente (la pérdida que cierra el día N queda pegada a la revancha que abre
 * el día N+1 en orden alfabético) y el detector dispararía incluso con el bug,
 * dando un falso verde.
 *
 *                08:00        09:00        11:00
 *   cronológico  zz gana      mm pierde    aa revancha   ← 1 par por día
 *   por id       aa revancha  mm pierde    zz gana       ← 0 pares
 */
describe("orden de secuencia intradía (date → openTime → id)", () => {
  it("cuenta la revancha que sigue a una pérdida el MISMO día, con ids anti-cronológicos", () => {
    const days: AnalyticsTrade[] = []
    for (let d = 1; d <= 5; d++) {
      const date = `2026-04-0${d}`
      days.push(t({ id: `zz-${d}`, date, openTime: "08:00", pnl: 120 }))
      days.push(t({ id: `mm-${d}`, date, openTime: "09:00", pnl: -100 }))
      days.push(t({ id: `aa-${d}`, date, openTime: "11:00", pnl: -50, revengeFlag: true, tags: ["Impulsivo"] }))
    }
    const insight = detectRevengeTrading([...filler(), ...days])
    expect(insight).not.toBeNull()
    expect(insight!.id).toBe("revenge-trading")
  })

  it("cuenta el sobre-tamaño que sigue a una pérdida el MISMO día, con ids anti-cronológicos", () => {
    const days: AnalyticsTrade[] = []
    for (let d = 1; d <= 5; d++) {
      const date = `2026-05-0${d}`
      days.push(t({ id: `zz-${d}`, date, openTime: "08:00", pnl: 120, size: 1 }))
      days.push(t({ id: `mm-${d}`, date, openTime: "09:00", pnl: -100, size: 1 }))
      days.push(t({ id: `aa-${d}`, date, openTime: "11:00", pnl: -50, size: 20 }))
    }
    const insight = detectOversizing([...filler(), ...days])
    expect(insight).not.toBeNull()
    expect(insight!.id).toBe("oversizing")
  })
})
