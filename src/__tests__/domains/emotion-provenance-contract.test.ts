import { describe, it, expect } from "vitest"
import {
  generateInsights,
  type AnalyticsTrade,
  type InsightInput,
} from "@/domains/analytics/services/insights-engine"
import { generatePsychologyInsights } from "@/domains/analytics/services/psychology-insights"

function trade(o: Partial<AnalyticsTrade> & { id: string; date: string; pnl: number }): AnalyticsTrade {
  return {
    id: o.id, accountId: o.accountId ?? "a1", symbol: o.symbol ?? "EURUSD",
    direction: o.direction ?? "LONG", session: o.session ?? "London",
    openTime: o.openTime ?? "08:00", closeTime: o.closeTime ?? "09:00",
    pnl: o.pnl, rMultiple: o.rMultiple ?? (o.pnl >= 0 ? 1 : -1),
    tags: o.tags ?? [], date: o.date, setupId: o.setupId ?? null,
    entry: 1, stop: 0.99, target: 1.02, size: o.size ?? 1,
    emotionBefore: o.emotionBefore ?? null,
    emotionSource: o.emotionSource ?? null,
    fomoFlag: o.fomoFlag, revengeFlag: o.revengeFlag,
  }
}

function emptyInput(trades: AnalyticsTrade[]): InsightInput {
  return { trades, setups: [], accounts: [], withdrawals: [] }
}

type Source = "captured" | "reconstructed"

const day = (i: number) => `2026-03-${String((i % 27) + 1).padStart(2, "0")}`

/**
 * Dataset COMBINADO: enciende los TRES detectores de correlación a la vez.
 * Necesita `revengeFlag` porque `violation-emotion` exige `isImpulsive` — no hay
 * forma de encenderlo sólo con emoción.
 */
function correlationDataset(source: Source): AnalyticsTrade[] {
  const out: AnalyticsTrade[] = []
  let n = 0
  // 8 pérdidas ansiosas, marcadas como violación (alimenta los tres)
  for (let i = 0; i < 8; i++) {
    out.push(trade({ id: `neg${n}`, date: day(n++), pnl: -100, emotionBefore: "anxious", emotionSource: source, revengeFlag: true }))
  }
  // 4 pérdidas temerosas sin violación
  for (let i = 0; i < 4; i++) {
    out.push(trade({ id: `fear${n}`, date: day(n++), pnl: -80, emotionBefore: "fearful", emotionSource: source }))
  }
  // 8 ganadoras en calma
  for (let i = 0; i < 8; i++) {
    out.push(trade({ id: `calm${n}`, date: day(n++), pnl: 200, emotionBefore: "calm", emotionSource: source }))
  }
  return out
}

/**
 * Dataset donde la emoción es la ÚNICA señal capaz de fundar una correlación:
 * sin `fomoFlag`, sin `revengeFlag`, sin tags de violación.
 *
 * Hace falta separarlo del combinado porque `emotion-before-loss` admite el
 * impulso como vía INDEPENDIENTE de la emoción (`… || t.fomoFlag || t.revengeFlag`),
 * y un flag de revancha se registra EN EL MOMENTO: no es recuerdo reconstruido y
 * la marca de procedencia no lo alcanza ni debe alcanzarlo. Sobre el combinado,
 * "cero insights de correlación" sería una afirmación falsa sobre el sistema.
 */
function emotionOnlyDataset(source: Source): AnalyticsTrade[] {
  return correlationDataset(source).map(t => ({ ...t, revengeFlag: false, fomoFlag: false }))
}

const CORRELATION_IDS = ["emotion-performance", "emotion-before-loss", "violation-emotion"]

function correlationInsightIds(trades: AnalyticsTrade[]): string[] {
  const all = [...generateInsights(emptyInput(trades)), ...generatePsychologyInsights(trades)]
  return all.filter(i => i.category === "correlation").map(i => i.id).sort()
}

describe("contrato de procedencia: la emoción reconstruida no funda afirmaciones causales", () => {
  it("con emoción CAPTURADA los tres detectores de correlación disparan", () => {
    const ids = correlationInsightIds(correlationDataset("captured"))
    for (const id of CORRELATION_IDS) expect(ids).toContain(id)
  })

  it("con emoción RECONSTRUIDA no nace NINGÚN insight de category correlation", () => {
    // La frase del spec, afirmada donde puede ser cierta: un conjunto cuya única
    // señal de correlación es la emoción.
    expect(correlationInsightIds(emotionOnlyDataset("reconstructed"))).toEqual([])
  })

  it("los mismos datos marcados CAPTURADA sí producen correlaciones", () => {
    // Sin este gemelo en positivo, el test de arriba pasa por accidente si los
    // umbrales no se alcanzan — que es exactamente cómo revenge y oversizing
    // engañaron antes.
    expect(correlationInsightIds(emotionOnlyDataset("captured")).length).toBeGreaterThan(0)
  })

  it("emoción sin procedencia se trata como no utilizable para causalidad", () => {
    const sinMarca = emotionOnlyDataset("captured").map(t => ({ ...t, emotionSource: null }))
    expect(correlationInsightIds(sinMarca)).toEqual([])
  })

  /**
   * El contrato afirmado sobre el REGISTRO COMPLETO, no sobre las tres funciones
   * que hoy conocemos: la emoción reconstruida es INERTE para `correlation`.
   * Vale sobre el dataset combinado —flags incluidos— porque no afirma silencio,
   * afirma que quitar la emoción reconstruida no cambia NADA. Un detector nuevo
   * que lea `emotionBefore` a pelo rompe aquí el día que se escribe.
   */
  it("la emoción reconstruida es inerte: borrarla no cambia un solo insight de correlación", () => {
    const conReconstruida = correlationDataset("reconstructed")
    const sinEmocion = conReconstruida.map(t => ({ ...t, emotionBefore: null, emotionSource: null }))
    expect(correlationInsightIds(conReconstruida)).toEqual(correlationInsightIds(sinEmocion))
  })

  it("y con emoción CAPTURADA borrarla sí cambia el resultado, o el test anterior no probaría nada", () => {
    const conCapturada = correlationDataset("captured")
    const sinEmocion = conCapturada.map(t => ({ ...t, emotionBefore: null, emotionSource: null }))
    expect(correlationInsightIds(conCapturada)).not.toEqual(correlationInsightIds(sinEmocion))
  })
})
