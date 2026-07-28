import { describe, it, expect } from "vitest"
import {
  EMOTION_BACKFILL_WINDOW_DAYS,
  isWithinEmotionWindow,
} from "@/domains/trading/services/emotion-provenance"

const NOW = new Date("2026-07-27T12:00:00Z")
const d = (iso: string) => new Date(iso + "T00:00:00Z")

describe("ventana de reconstrucción de emoción", () => {
  it("la ventana son 7 días", () => {
    expect(EMOTION_BACKFILL_WINDOW_DAYS).toBe(7)
  })

  it("admite el mismo día", () => {
    expect(isWithinEmotionWindow(d("2026-07-27"), NOW)).toBe(true)
  })

  it("admite el último día de la ventana", () => {
    expect(isWithinEmotionWindow(d("2026-07-20"), NOW)).toBe(true)
  })

  it("rechaza el día siguiente al límite", () => {
    expect(isWithinEmotionWindow(d("2026-07-19"), NOW)).toBe(false)
  })

  it("rechaza los trades históricos de prod (el más reciente cerró hace 38 días)", () => {
    expect(isWithinEmotionWindow(d("2026-06-19"), NOW)).toBe(false)
  })

  it("rechaza una fecha futura", () => {
    expect(isWithinEmotionWindow(d("2026-07-28"), NOW)).toBe(false)
  })

  it("no depende de la hora del día", () => {
    const tarde = new Date("2026-07-27T23:59:59Z")
    expect(isWithinEmotionWindow(d("2026-07-20"), tarde)).toBe(true)
  })
})
