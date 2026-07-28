/**
 * @vitest-environment jsdom
 * La DECISIÓN DE VISIBILIDAD de la sección Psicología, extraída a una función
 * pura para poder afirmarla sin montar el panel entero. El defecto que arregla:
 * `if (!hasPsych) return null` escondía la sección justo cuando faltaba el dato.
 */
import { describe, it, expect } from "vitest"
import { shouldOfferEmotionCapture } from "@/components/trades/trade-detail-panel"

const NOW = new Date("2026-07-27T12:00:00Z")
const d = (iso: string) => new Date(iso + "T00:00:00Z")

describe("shouldOfferEmotionCapture", () => {
  it("ofrece el gesto en un trade cerrado, reciente y sin emoción", () => {
    expect(shouldOfferEmotionCapture({ status: "CLOSED", emotionBefore: null, date: d("2026-07-24") }, NOW)).toBe(true)
  })

  it("no lo ofrece si el trade ya tiene emoción", () => {
    expect(shouldOfferEmotionCapture({ status: "CLOSED", emotionBefore: "calm", date: d("2026-07-24") }, NOW)).toBe(false)
  })

  it("no lo ofrece fuera de ventana: ahí no hay nada que ofrecer y un hueco permanente sería ruido", () => {
    expect(shouldOfferEmotionCapture({ status: "CLOSED", emotionBefore: null, date: d("2026-06-19") }, NOW)).toBe(false)
  })

  it("no lo ofrece en un trade abierto: para eso está el nudge del formulario de cierre", () => {
    expect(shouldOfferEmotionCapture({ status: "OPEN", emotionBefore: null, date: d("2026-07-24") }, NOW)).toBe(false)
  })
})
