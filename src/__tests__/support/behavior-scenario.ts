// ─────────────────────────────────────────────────────────────────────────────
// Generador de escenarios conductuales — puro y determinista.
//
// Traduce un PERFIL declarativo ("cuánta revancha, cuánto sobre-tamaño") en dos
// capas temporales que el sistema lee de forma distinta:
//   • history — semanas de trades. Lo que leen los detectores de insight y los
//     verificadores de compromiso.
//   • liveDay — la secuencia de HOY. Lo que alimenta el DayState del motor de
//     intervención, que razona sobre la sesión en curso, no sobre el histórico.
//
// Por qué existe: los 137 trades de prod son ruido sin correlación temporal, así
// que ningún detector puede disparar. Ver el spec del 2026-07-21.
// ─────────────────────────────────────────────────────────────────────────────

import type { AnalyticsTrade } from "@/domains/analytics/services/insights-engine"

/** Superset que satisface a la vez AnalyticsTrade (detectores) y WindowTrade (verificadores). */
export type ScenarioTrade = AnalyticsTrade & { riskPct: number }

export interface BehaviorProfile {
  /** Semilla del PRNG. Mismo seed ⇒ mismo escenario, siempre. */
  seed: number
  /** Semanas de historia (5 días hábiles cada una). */
  weeks: number
  /**
   * Trades por día hábil. Máximo 4 (tantos como horas hay en HOURS).
   * Ojo: con 3+ el verificador tradesPerDayBeyond2 cuenta ofensores, así que un
   * perfil que quiera MANTENER ese compromiso debe usar 2.
   */
  tradesPerDay: number
  /** 0..1 — cuánto cae la probabilidad de ganar del 3er trade del día en adelante. */
  intradayDecay: number
  /** 0..1 — cuota de trades post-pérdida marcados revengeFlag + "Impulsivo". */
  revengeAfterLoss: number
  /** 0..1 — cuota de trades post-pérdida con tamaño OVERSIZE_MULT×. */
  oversizeAfterLoss: number
  /** 0..1 — cuota global de trades etiquetados "Off-plan". */
  offPlanShare: number
}

export interface BehaviorScenario {
  profile: BehaviorProfile
  history: ScenarioTrade[]
  liveDay: ScenarioTrade[]
}

/** 4 horas => hasta 2 "tempranos" (i<2) y 2 "tardíos", que es como bucketea el detector. */
const HOURS = ["08:00", "09:30", "11:00", "13:30"]
const MAX_TRADES_PER_DAY = HOURS.length
const BASE_SIZE = 1
/**
 * 5× y no 3×: el detector compara contra avgSize, que los propios trades grandes
 * empujan hacia arriba. Con fracción f a tamaño m hace falta m > 2(1 + (m-1)f);
 * con m=3 y f≈0.2 el margen es 0.2 y cualquier ajuste del perfil lo rompe.
 */
const OVERSIZE_MULT = 5
const BASE_RISK_PCT = 0.5
const EARLY_WIN_PROB = 0.6
const WIN_PNL = 100
const LOSS_PNL = -80

/** mulberry32 — mismo PRNG que usa scripts/seed-psych-trades.mjs. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** `count` días hábiles consecutivos desde el lunes 2026-01-05. */
function weekdays(count: number): string[] {
  const out: string[] = []
  const d = new Date(Date.UTC(2026, 0, 5))
  while (out.length < count) {
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

function makeTrade(o: {
  id: string
  date: string
  openTime: string
  pnl: number
  size: number
  riskPct: number
  tags: string[]
  revengeFlag: boolean
}): ScenarioTrade {
  return {
    id: o.id,
    accountId: "acc-fixture",
    symbol: "EURUSD",
    direction: "LONG",
    session: "London",
    openTime: o.openTime,
    closeTime: o.openTime,
    pnl: o.pnl,
    rMultiple: o.pnl >= 0 ? 1 : -1,
    tags: o.tags,
    date: o.date,
    setupId: "setup-fixture",
    entry: 1,
    stop: 0.99,
    target: 1.02,
    size: o.size,
    riskPct: o.riskPct,
    emotionBefore: o.revengeFlag ? "revenge" : "calm",
    fomoFlag: false,
    revengeFlag: o.revengeFlag,
    confidenceRating: null,
  }
}

/**
 * Elige EXACTAMENTE round(indices.length × share) elementos, repartidos de forma
 * uniforme a lo largo de la lista y de forma determinista.
 *
 * Por qué cuota exacta y no una tirada Bernoulli por trade: un fixture construye
 * un patrón CONOCIDO, no modela incertidumbre. Con muestreo, la tasa emitida se
 * desvía de la declarada por ruido binomial (con n=80 y p=0.25 la sigma es ~0.048),
 * así que el self-check tendría que aflojarse hasta volverse decorativo — o habría
 * que perseguir semillas hasta dar con una que pase, que es verde por suerte.
 */
function pickExact(indices: number[], share: number): Set<number> {
  const k = Math.round(indices.length * share)
  const out = new Set<number>()
  if (k <= 0) return out
  for (let j = 0; j < k; j++) out.add(indices[Math.floor((j * indices.length) / k)])
  return out
}

export function buildScenario(profile: BehaviorProfile): BehaviorScenario {
  if (profile.tradesPerDay < 1 || profile.tradesPerDay > MAX_TRADES_PER_DAY) {
    throw new Error(`tradesPerDay debe estar entre 1 y ${MAX_TRADES_PER_DAY}`)
  }
  const rnd = mulberry32(profile.seed)
  const days = weekdays(profile.weeks * 5)

  // ── Pasada 1: resultado de cada trade (gana/pierde), que es donde vive la
  // estructura de decay intradía. Esto sí se muestrea: la caída de win rate es
  // una propiedad estadística, no una cuota.
  interface Slot { d: number; i: number; date: string; openTime: string; isWin: boolean }
  const slots: Slot[] = []
  for (let d = 0; d < days.length; d++) {
    for (let i = 0; i < profile.tradesPerDay; i++) {
      const winProb = i >= 2 ? EARLY_WIN_PROB * (1 - profile.intradayDecay) : EARLY_WIN_PROB
      slots.push({ d, i, date: days[d], openTime: HOURS[i], isWin: rnd() < winProb })
    }
  }

  // ── Pasada 2: cuotas exactas sobre el subconjunto post-pérdida.
  // La adyacencia es GLOBAL (el último trade de un día precede al primero del
  // siguiente), igual que la secuencia que recorren detectRevengeTrading y
  // detectOversizing tras ordenar. Si aquí fuera por-día, el self-check y el
  // detector medirían universos distintos.
  const postLoss: number[] = []
  for (let k = 1; k < slots.length; k++) if (!slots[k - 1].isWin) postLoss.push(k)
  const allIdx = slots.map((_, k) => k)

  const revengeSet = pickExact(postLoss, profile.revengeAfterLoss)
  const oversizeSet = pickExact(postLoss, profile.oversizeAfterLoss)
  const offPlanSet = pickExact(allIdx, profile.offPlanShare)

  const history: ScenarioTrade[] = slots.map((s, k) => {
    const isRevenge = revengeSet.has(k)
    const isOversized = oversizeSet.has(k)
    const tags: string[] = []
    if (isRevenge) tags.push("Impulsivo")
    if (offPlanSet.has(k)) tags.push("Off-plan")

    // Id al REVÉS del orden horario dentro del día: hace que el arreglo de
    // ordenamiento de insights-engine sea load-bearing (ver el plan, Tarea 2).
    const idx = profile.tradesPerDay - 1 - s.i
    return makeTrade({
      id: `h${String(s.d).padStart(3, "0")}-${idx}`,
      date: s.date,
      openTime: s.openTime,
      pnl: s.isWin ? WIN_PNL : LOSS_PNL,
      size: isOversized ? BASE_SIZE * OVERSIZE_MULT : BASE_SIZE,
      riskPct: isOversized ? BASE_RISK_PCT * OVERSIZE_MULT : BASE_RISK_PCT,
      tags,
      revengeFlag: isRevenge,
    })
  })

  // ── Día vivo: cascada explícita (3 pérdidas seguidas + impulso + sobre-tamaño).
  // Determinista a mano, no muestreado: el motor de intervención se dispara con
  // consecutiveLosses >= 3 y queremos ese estado exacto, no uno probable.
  const liveDate = "2026-06-15"
  const liveDay: ScenarioTrade[] = [
    makeTrade({ id: "live-2", date: liveDate, openTime: "08:00", pnl: LOSS_PNL, size: BASE_SIZE, riskPct: BASE_RISK_PCT, tags: [], revengeFlag: false }),
    makeTrade({ id: "live-1", date: liveDate, openTime: "09:30", pnl: LOSS_PNL, size: BASE_SIZE, riskPct: BASE_RISK_PCT, tags: ["Impulsivo"], revengeFlag: true }),
    makeTrade({ id: "live-0", date: liveDate, openTime: "11:00", pnl: LOSS_PNL, size: BASE_SIZE * OVERSIZE_MULT, riskPct: BASE_RISK_PCT * OVERSIZE_MULT, tags: ["Impulsivo"], revengeFlag: true }),
  ]

  return { profile, history, liveDay }
}

/** Trader con los cuatro patrones bien por encima de sus umbrales. */
export const DIRTY_PROFILE: BehaviorProfile = {
  seed: 20260721,
  weeks: 4,
  tradesPerDay: 4,
  intradayDecay: 0.6,
  revengeAfterLoss: 0.5,
  oversizeAfterLoss: 0.4,
  offPlanShare: 0.25,
}

/**
 * Trader disciplinado: ningún detector dispara y los cuatro compromisos se mantienen.
 * 2 trades al día a propósito — con 3+ el verificador tradesPerDayBeyond2 contaría
 * ofensores y el compromiso de intraday-decay saldría "broken" pese al perfil limpio.
 */
export const CLEAN_PROFILE: BehaviorProfile = {
  seed: 20260722,
  weeks: 4,
  tradesPerDay: 2,
  intradayDecay: 0,
  revengeAfterLoss: 0,
  oversizeAfterLoss: 0,
  offPlanShare: 0,
}
