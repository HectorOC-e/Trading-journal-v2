import { describe, it, expect } from "vitest"
import {
  buildScenario,
  CLEAN_PROFILE,
  DIRTY_PROFILE,
  type ScenarioTrade,
} from "./behavior-scenario"

/**
 * Cuenta los trades que siguen a una pérdida, en orden CRONOLÓGICO real.
 * Escrito aquí a propósito: no delega ni en el generador ni en los verificadores,
 * para que tres instrumentos independientes tengan que coincidir.
 */
function postLossTrades(trades: ScenarioTrade[]): ScenarioTrade[] {
  const sorted = [...trades].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.openTime ?? "").localeCompare(b.openTime ?? ""),
  )
  const out: ScenarioTrade[] = []
  for (let i = 1; i < sorted.length; i++) if (sorted[i - 1].pnl < 0) out.push(sorted[i])
  return out
}

describe("behavior-scenario self-check", () => {
  it("es determinista: la misma semilla da el mismo escenario", () => {
    const a = buildScenario(DIRTY_PROFILE)
    const b = buildScenario(DIRTY_PROFILE)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it("semillas distintas dan escenarios distintos", () => {
    const a = buildScenario(DIRTY_PROFILE)
    const b = buildScenario({ ...DIRTY_PROFILE, seed: DIRTY_PROFILE.seed + 1 })
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b))
  })

  it("produce muestra suficiente para los detectores (MIN_SAMPLE = 20)", () => {
    const { history } = buildScenario(DIRTY_PROFILE)
    expect(history.length).toBeGreaterThanOrEqual(20)
  })

  /**
   * Tolerancia ajustada al redondeo de la cuota exacta (±0.5/n), no al ruido de
   * muestreo. El generador reparte round(n × share) elementos, así que la
   * desviación máxima posible es medio elemento. Si esto empieza a fallar, el
   * generador cambió de estrategia — no lo aflojes, míralo.
   */
  const EXACT_QUOTA_TOLERANCE = 0.02

  it("el perfil sucio contiene la tasa de revancha que declara", () => {
    const { history, profile } = buildScenario(DIRTY_PROFILE)
    const postLoss = postLossTrades(history)
    expect(postLoss.length).toBeGreaterThan(10)
    const flagged = postLoss.filter((t) => t.revengeFlag === true).length
    expect(Math.abs(flagged / postLoss.length - profile.revengeAfterLoss)).toBeLessThan(
      EXACT_QUOTA_TOLERANCE,
    )
  })

  it("cada trade de revancha lleva revengeFlag Y la etiqueta Impulsivo", () => {
    const { history } = buildScenario(DIRTY_PROFILE)
    const flagged = history.filter((t) => t.revengeFlag === true)
    expect(flagged.length).toBeGreaterThan(0)
    for (const t of flagged) expect(t.tags).toContain("Impulsivo")
  })

  it("el perfil sucio contiene la tasa de sobre-tamaño que declara", () => {
    const { history, profile } = buildScenario(DIRTY_PROFILE)
    const postLoss = postLossTrades(history)
    const avgSize = history.reduce((s, t) => s + t.size, 0) / history.length
    const big = postLoss.filter((t) => t.size > avgSize * 2).length
    expect(Math.abs(big / postLoss.length - profile.oversizeAfterLoss)).toBeLessThan(
      EXACT_QUOTA_TOLERANCE,
    )
  })

  it("el perfil sucio contiene la cuota off-plan que declara, por su propia etiqueta", () => {
    const { history, profile } = buildScenario(DIRTY_PROFILE)
    const tagged = history.filter((t) => t.tags.includes("Off-plan")).length
    expect(Math.abs(tagged / history.length - profile.offPlanShare)).toBeLessThan(
      EXACT_QUOTA_TOLERANCE,
    )
  })

  it("el perfil sucio degrada el win rate de los trades tardíos del día", () => {
    const { history } = buildScenario(DIRTY_PROFILE)
    const byDay = new Map<string, ScenarioTrade[]>()
    for (const t of history) byDay.set(t.date, [...(byDay.get(t.date) ?? []), t])
    let earlyW = 0, earlyN = 0, lateW = 0, lateN = 0
    for (const day of byDay.values()) {
      const sorted = [...day].sort((a, b) => (a.openTime ?? "").localeCompare(b.openTime ?? ""))
      sorted.forEach((t, i) => {
        if (i < 2) { earlyN++; if (t.pnl > 0) earlyW++ }
        else { lateN++; if (t.pnl > 0) lateW++ }
      })
    }
    expect(earlyN).toBeGreaterThanOrEqual(10)
    expect(lateN).toBeGreaterThanOrEqual(10)
    expect((earlyW / earlyN) * 100 - (lateW / lateN) * 100).toBeGreaterThan(12)
  })

  it("el perfil limpio no contiene ninguno de los patrones", () => {
    const { history } = buildScenario(CLEAN_PROFILE)
    expect(history.length).toBeGreaterThanOrEqual(20)
    expect(history.filter((t) => t.revengeFlag === true)).toHaveLength(0)
    expect(history.filter((t) => t.tags.includes("Off-plan"))).toHaveLength(0)
    expect(history.filter((t) => t.tags.includes("Impulsivo"))).toHaveLength(0)
  })

  it("el perfil limpio opera 2 veces al día, para no incumplir tradesPerDayBeyond2", () => {
    // Fija la decisión 4 de la Tarea 1: con 3+ trades diarios, el verificador
    // contaría ofensores y el compromiso saldría "broken" pese al perfil limpio.
    expect(CLEAN_PROFILE.tradesPerDay).toBe(2)
    const { history } = buildScenario(CLEAN_PROFILE)
    const byDay = new Map<string, number>()
    for (const t of history) byDay.set(t.date, (byDay.get(t.date) ?? 0) + 1)
    for (const n of byDay.values()) expect(n).toBeLessThanOrEqual(2)
  })

  it("rechaza un tradesPerDay fuera de rango en vez de emitir basura en silencio", () => {
    expect(() => buildScenario({ ...CLEAN_PROFILE, tradesPerDay: 9 })).toThrow(/tradesPerDay/)
  })

  it("los ids van al revés del orden horario dentro de un día (a propósito)", () => {
    const { history } = buildScenario(DIRTY_PROFILE)
    const firstDay = history.filter((t) => t.date === history[0].date)
    const byTime = [...firstDay].sort((a, b) => (a.openTime ?? "").localeCompare(b.openTime ?? ""))
    const byId = [...firstDay].sort((a, b) => a.id.localeCompare(b.id))
    expect(byTime.map((t) => t.id)).toEqual([...byId].reverse().map((t) => t.id))
  })

  it("el día vivo es una cascada: 3+ pérdidas seguidas, con impulso y sobre-tamaño", () => {
    const { liveDay } = buildScenario(DIRTY_PROFILE)
    expect(liveDay.length).toBeGreaterThanOrEqual(3)
    const ordered = [...liveDay].sort((a, b) => (a.openTime ?? "").localeCompare(b.openTime ?? ""))
    let streak = 0
    for (const t of ordered) streak = t.pnl < 0 ? streak + 1 : 0
    expect(streak).toBeGreaterThanOrEqual(3)
    expect(ordered.some((t) => t.revengeFlag === true)).toBe(true)
    const last = ordered[ordered.length - 1]
    expect(last.riskPct).toBeGreaterThan(0)
  })
})
