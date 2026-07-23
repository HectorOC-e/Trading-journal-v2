import { describe, it, expect } from "vitest"
import { CORPORA, getAdapter } from "@/server/services/retrieval/registry"
import { CORPUS_KEYS } from "@/server/services/retrieval/types"

// Guarda de deriva: registrar un corpus nuevo sin cumplir el contrato rompe aqui,
// no en produccion. Mismo patron que __tests__/lib/active-ai-features.test.ts.
describe("registro de corpus", () => {
  it("cubre exactamente las claves declaradas, sin sobrantes ni faltantes", () => {
    expect(Object.keys(CORPORA).sort()).toEqual([...CORPUS_KEYS].sort())
  })

  it.each([...CORPUS_KEYS])("el adaptador %s cumple el contrato entero", (key) => {
    const a = getAdapter(key)
    expect(a.key).toBe(key)
    expect(typeof a.label).toBe("string")
    expect(a.label.length).toBeGreaterThan(0)
    for (const fn of ["knn", "pending", "writeVector", "counts", "hydrate", "rowId", "toCitation"] as const) {
      expect(typeof a[fn], `${key}.${fn} debe ser una funcion`).toBe("function")
    }
  })

  // Detecta un adaptador registrado bajo la clave equivocada: la cita que produce
  // debe declarar su propio corpus y apuntar a su propia superficie.
  it("trade_notes cita hacia /trades y se declara trade_notes", () => {
    const row = { id: "11111111-1111-1111-1111-111111111111", date: new Date("2026-07-21"), symbol: "NQ", direction: "LONG", pnl: 420, rMultiple: 2.1, notes: "nota" }
    const c = getAdapter("trade_notes").toCitation(row as never, 0.9)
    expect(c.corpus).toBe("trade_notes")
    expect(c.href).toBe(`/trades?trade=${row.id}`)
    expect(c.label).toBe("NQ · LONG")
  })

  it("trade_plans se distingue de trade_notes en la etiqueta, no solo en el corpus", () => {
    const row = { id: "33333333-3333-3333-3333-333333333333", date: new Date("2026-07-21"), symbol: "NQ", direction: "LONG", pnl: -280, rMultiple: -1, planNotes: "esperar confirmacion" }
    const c = getAdapter("trade_plans").toCitation(row as never, 0.9)
    expect(c.corpus).toBe("trade_plans")
    expect(c.href).toBe(`/trades?trade=${row.id}`)
    // Ambos corpus citan el MISMO trade: sin marca, el trader veria dos tarjetas
    // identicas sin saber cual es el plan y cual la nota posterior.
    expect(c.label).toBe("NQ · LONG · plan")
    expect(c.positive).toBe(false)
  })

  it("learning_notes cita hacia /aprendizaje y se declara learning_notes", () => {
    const row = { id: "22222222-2222-2222-2222-222222222222", title: "Trading in the Zone", type: "LIBRO", status: "EN_CURSO", progressPct: 60, notes: "nota" }
    const c = getAdapter("learning_notes").toCitation(row as never, 0.9)
    expect(c.corpus).toBe("learning_notes")
    expect(c.href).toBe(`/aprendizaje?resource=${row.id}`)
    expect(c.label).toBe("Trading in the Zone")
  })
})
