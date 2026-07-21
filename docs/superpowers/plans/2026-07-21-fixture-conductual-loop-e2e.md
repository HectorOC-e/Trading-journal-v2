# Fixture conductual + validación del loop — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un generador determinista de historiales de trading con patrón conductual real, y tests permanentes que asserten que la cadena `insight → commitment → rule → verificación → reinforcement` se encadena de verdad.

**Architecture:** Un módulo puro (`behavior-scenario.ts`) traduce un perfil conductual declarativo en dos capas temporales — una historia de semanas que alimenta a los detectores de insight, y un día vivo que alimenta la decisión de intervención. Encima, tests de dominio puro (suite normal) y un test de integración contra Postgres real. Por el camino se corrige un defecto de ordenamiento en `insights-engine.ts` que hace que "el trade siguiente a una pérdida" se resuelva por UUID en vez de por hora.

**Tech Stack:** TypeScript, vitest, Prisma, Postgres (supabase local para integración).

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-07-21-fixture-conductual-loop-e2e-design.md`.
- Rama: `feat/behavior-fixture-loop-e2e`. Ya existe, con el spec commiteado en `0e13ab4`.
- Todos los comandos se corren **desde `src/`** (ahí viven `package.json`, `vitest.config.ts` y `node_modules`).
- Node 20 (`.nvmrc`, engines `>=20.12.0`). Binarios con `pnpm exec` o `npx`.
- **La suite completa antes de cada push**, nunca un subconjunto: `pnpm exec vitest run`.
- `pnpm exec tsc --noEmit` y `pnpm exec eslint .` limpios antes de cada push. ESLint falla solo en errores; hay ~75 warnings aceptados a propósito — no "arreglarlos".
- El generador vive en `src/__tests__/support/` y **no** lleva sufijo `.test.ts`: `vitest.config.ts` recogería el fichero como suite y fallaría por no tener tests dentro.
- **No sembrar prod.** Todo local/CI. El guard de `src/__tests__/integration/_helpers.ts` rechaza cualquier `DATABASE_URL` cuyo host no sea `localhost`/`127.0.0.1`.
- El test de integración **no se declara verde sin haberlo visto pasar**. Hoy el daemon de Docker no responde en la máquina de desarrollo (§7 del spec).

---

## Mapa de ficheros

| Fichero | Responsabilidad | Tarea |
|---|---|---|
| `src/__tests__/support/behavior-scenario.ts` | **Crear.** Generador puro: perfil → escenario determinista | 1 |
| `src/__tests__/support/behavior-scenario.selfcheck.test.ts` | **Crear.** Verifica que el escenario contiene lo que su perfil declara | 1 |
| `src/domains/analytics/services/insights-engine.ts` | **Modificar** L89-91. `bySymbolDate` → `date → openTime → id` | 2 |
| `src/__tests__/domains/insights-engine-ordering.test.ts` | **Crear.** No-regresión del ordenamiento | 2 |
| `src/__tests__/behavior/behavior-loop.test.ts` | **Crear.** Detectores disparan/callan, cadena pura, día vivo | 3, 4, 5 |
| `src/__tests__/integration/behavior-loop.integration.test.ts` | **Crear.** Cadena persistida contra Postgres real, incl. commitment + `linkRule` | 6, 7 |

---

### Task 1: El generador de escenarios y su self-check

El generador es código nuevo que produce los datos de los que dependerá todo lo demás. Si deriva en silencio, los tests siguientes pasan por la razón equivocada. Por eso el self-check va **en la misma tarea**: el generador no se da por bueno sin él.

**Files:**
- Create: `src/__tests__/support/behavior-scenario.ts`
- Test: `src/__tests__/support/behavior-scenario.selfcheck.test.ts`

**Interfaces:**
- Consumes: `AnalyticsTrade` de `@/domains/analytics/services/insights-engine`.
- Produces:
  - `type ScenarioTrade = AnalyticsTrade & { riskPct: number }`
  - `interface BehaviorProfile { seed: number; weeks: number; tradesPerDay: number; intradayDecay: number; revengeAfterLoss: number; oversizeAfterLoss: number; offPlanShare: number }`
  - `interface BehaviorScenario { profile: BehaviorProfile; history: ScenarioTrade[]; liveDay: ScenarioTrade[] }`
  - `function buildScenario(profile: BehaviorProfile): BehaviorScenario`
  - `const DIRTY_PROFILE: BehaviorProfile` y `const CLEAN_PROFILE: BehaviorProfile`

**Decisiones de diseño que el implementador NO debe cambiar sin releer el spec:**

1. **Los ids dentro de un día van al REVÉS del orden cronológico** (el trade de las 08:00 recibe el id con sufijo más alto). Es deliberado: hace que el arreglo de la Tarea 2 sea *load-bearing*. Sin el arreglo, los detectores de secuencia leen el día invertido y las aserciones de la Tarea 3 fallan. Un fixture cuyo orden de id coincidiera con el horario escondería el defecto, que es exactamente cómo se escondió hasta ahora (§4.1 del spec).
2. **`OVERSIZE_MULT = 5`, no 3.** El detector compara contra `avgSize`, que los propios trades grandes empujan hacia arriba. Con una fracción `f` de trades a tamaño `m`, hace falta `m > 2(1 + (m-1)f)`. Con `m=3` y `f≈0.2` el margen queda en 0.2 y cualquier ajuste del perfil lo rompe; con `m=5` el margen es holgado.
3. **`revengeAfterLoss` marca `revengeFlag: true` Y la etiqueta `"Impulsivo"`.** `"Impulsivo"` pertenece también a `OFF_PLAN_TAGS`, así que los trades de revancha cuentan para off-plan. Es correcto —un trade de revancha *está* fuera de plan— pero significa que `offPlanShare` no es la tasa off-plan total. El self-check mide cada etiqueta por separado para que la interacción quede visible en vez de sorprender luego.
4. **`CLEAN_PROFILE` opera 2 trades al día, no 4.** El verificador `tradesPerDayBeyond2` cuenta todo trade a partir del 3º del día. Un perfil "limpio" con 4 trades diarios daría `observedValue = 40` y **rompería** el compromiso de `intraday-decay` — correctamente, porque un trader que opera 4 veces al día *sí* incumple ese compromiso concreto, por muy disciplinado que sea en lo demás. Bajarlo a 2 es lo que hace que "limpio" signifique limpio en los cuatro ejes a la vez. De paso, con 2 trades diarios `lateN = 0` y `detectIntradayDecay` devuelve `null`, que es justo el caso negativo que busca la Tarea 3.

- [ ] **Step 1: Escribir el self-check (falla: el módulo no existe)**

Crear `src/__tests__/support/behavior-scenario.selfcheck.test.ts`:

```ts
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

  it("el perfil sucio contiene la tasa de revancha que declara", () => {
    const { history, profile } = buildScenario(DIRTY_PROFILE)
    const postLoss = postLossTrades(history)
    expect(postLoss.length).toBeGreaterThan(10)
    const flagged = postLoss.filter((t) => t.revengeFlag === true).length
    expect(flagged / postLoss.length).toBeCloseTo(profile.revengeAfterLoss, 1)
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
    expect(big / postLoss.length).toBeCloseTo(profile.oversizeAfterLoss, 1)
  })

  it("el perfil sucio contiene la cuota off-plan que declara, por su propia etiqueta", () => {
    const { history, profile } = buildScenario(DIRTY_PROFILE)
    const tagged = history.filter((t) => t.tags.includes("Off-plan")).length
    expect(tagged / history.length).toBeCloseTo(profile.offPlanShare, 1)
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
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `cd src && pnpm exec vitest run __tests__/support/behavior-scenario.selfcheck.test.ts`
Expected: FAIL — `Failed to resolve import "./behavior-scenario"`.

- [ ] **Step 3: Implementar el generador**

Crear `src/__tests__/support/behavior-scenario.ts`:

```ts
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

export function buildScenario(profile: BehaviorProfile): BehaviorScenario {
  if (profile.tradesPerDay < 1 || profile.tradesPerDay > MAX_TRADES_PER_DAY) {
    throw new Error(`tradesPerDay debe estar entre 1 y ${MAX_TRADES_PER_DAY}`)
  }
  const rnd = mulberry32(profile.seed)
  const days = weekdays(profile.weeks * 5)
  const history: ScenarioTrade[] = []

  for (let d = 0; d < days.length; d++) {
    const date = days[d]
    let prevWasLoss = false

    for (let i = 0; i < profile.tradesPerDay; i++) {
      const isLate = i >= 2
      const winProb = isLate ? EARLY_WIN_PROB * (1 - profile.intradayDecay) : EARLY_WIN_PROB
      const isWin = rnd() < winProb

      const isRevenge = prevWasLoss && rnd() < profile.revengeAfterLoss
      const isOversized = prevWasLoss && rnd() < profile.oversizeAfterLoss
      const isOffPlan = rnd() < profile.offPlanShare

      const tags: string[] = []
      if (isRevenge) tags.push("Impulsivo")
      if (isOffPlan) tags.push("Off-plan")

      // Id al REVÉS del orden horario dentro del día: hace que el arreglo de
      // ordenamiento de insights-engine sea load-bearing (ver el plan, Tarea 2).
      const idx = profile.tradesPerDay - 1 - i
      history.push(
        makeTrade({
          id: `h${String(d).padStart(3, "0")}-${idx}`,
          date,
          openTime: HOURS[i],
          pnl: isWin ? WIN_PNL : LOSS_PNL,
          size: isOversized ? BASE_SIZE * OVERSIZE_MULT : BASE_SIZE,
          riskPct: isOversized ? BASE_RISK_PCT * OVERSIZE_MULT : BASE_RISK_PCT,
          tags,
          revengeFlag: isRevenge,
        }),
      )
      prevWasLoss = !isWin
    }
  }

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
```

- [ ] **Step 4: Correr el self-check hasta verde**

Run: `cd src && pnpm exec vitest run __tests__/support/behavior-scenario.selfcheck.test.ts`
Expected: PASS, 13 tests.

Si alguna tasa no cae dentro de `toBeCloseTo(..., 1)` (tolerancia ±0.05), **no aflojes la tolerancia**: ajusta el perfil o la semilla. La tolerancia laxa es justo lo que convierte al self-check en decorativo. Si `intradayDecay` no llega a 12 puntos de caída, súbelo hacia 0.7-0.8 antes que tocar el umbral.

- [ ] **Step 5: Verificar que vitest no recoge el generador como suite**

Run: `cd src && pnpm exec vitest run __tests__/support/ --reporter=verbose`
Expected: solo aparece `behavior-scenario.selfcheck.test.ts`. `behavior-scenario.ts` **no** debe listarse ni dar error de "no test suite found".

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/support/behavior-scenario.ts src/__tests__/support/behavior-scenario.selfcheck.test.ts
git commit -m "test(fixture): generador determinista de escenarios conductuales + self-check"
```

---

### Task 2: Arreglar el ordenamiento de secuencia en insights-engine

Va **antes** de las aserciones sobre el escenario porque el generador emite ids anti-cronológicos: sin este arreglo, los detectores de secuencia leen los días al revés y la Tarea 3 no puede pasar.

**Files:**
- Create: `src/__tests__/domains/insights-engine-ordering.test.ts`
- Modify: `src/domains/analytics/services/insights-engine.ts:89-91`

**Interfaces:**
- Consumes: `detectRevengeTrading`, `detectOversizing`, `type AnalyticsTrade` de `@/domains/analytics/services/insights-engine`.
- Produces: nada nuevo. Cambia el comportamiento interno de `bySymbolDate`, que es privada.

- [ ] **Step 1: Escribir el test de no-regresión**

Crear `src/__tests__/domains/insights-engine-ordering.test.ts`:

```ts
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

describe("orden de secuencia intradía (date → openTime → id)", () => {
  it("cuenta la revancha que sigue a una pérdida el MISMO día, con ids anti-cronológicos", () => {
    // 5 días: a las 09:00 una pérdida (id "zz…"), a las 11:00 la revancha (id "aa…").
    const pairs: AnalyticsTrade[] = []
    for (let d = 1; d <= 5; d++) {
      const date = `2026-04-0${d}`
      pairs.push(t({ id: `zz-${d}`, date, openTime: "09:00", pnl: -100 }))
      pairs.push(t({ id: `aa-${d}`, date, openTime: "11:00", pnl: -50, revengeFlag: true, tags: ["Impulsivo"] }))
    }
    const insight = detectRevengeTrading([...filler(), ...pairs])
    expect(insight).not.toBeNull()
    expect(insight!.id).toBe("revenge-trading")
  })

  it("cuenta el sobre-tamaño que sigue a una pérdida el MISMO día, con ids anti-cronológicos", () => {
    const pairs: AnalyticsTrade[] = []
    for (let d = 1; d <= 5; d++) {
      const date = `2026-05-0${d}`
      pairs.push(t({ id: `zz-${d}`, date, openTime: "09:00", pnl: -100, size: 1 }))
      pairs.push(t({ id: `aa-${d}`, date, openTime: "11:00", pnl: -50, size: 20 }))
    }
    const insight = detectOversizing([...filler(), ...pairs])
    expect(insight).not.toBeNull()
    expect(insight!.id).toBe("oversizing")
  })
})
```

- [ ] **Step 2: Correr el test y verificar que FALLA**

Run: `cd src && pnpm exec vitest run __tests__/domains/insights-engine-ordering.test.ts`
Expected: **FAIL** — ambos tests dan `expected null not to be null`.

Este paso no es ceremonia. Un test de regresión que nunca se vio en rojo no prueba que el arreglo haga algo. **Si pasa en verde antes del arreglo, para**: significa que el fixture no reproduce el defecto y hay que rehacerlo, no seguir adelante.

- [ ] **Step 3: Aplicar el arreglo**

En `src/domains/analytics/services/insights-engine.ts`, sustituir la función de la L89:

```ts
function bySymbolDate(a: AnalyticsTrade, b: AnalyticsTrade): number {
  return a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
}
```

por:

```ts
// Orden CRONOLÓGICO real. Antes ordenaba date→id, así que "el trade que sigue a
// una pérdida" se resolvía por orden alfabético de UUID dentro del mismo día — no
// por el reloj. Los tres consumidores (detectLosingStreak, detectRevengeTrading,
// detectOversizing) dependen de la secuencia, así que los tres estaban afectados.
// Alineado con sortByDateTime de domains/behavior/verifiers.ts, que ya lo hacía bien.
function bySymbolDate(a: AnalyticsTrade, b: AnalyticsTrade): number {
  return (
    a.date.localeCompare(b.date) ||
    (a.openTime ?? "").localeCompare(b.openTime ?? "") ||
    a.id.localeCompare(b.id)
  )
}
```

- [ ] **Step 4: Correr el test nuevo y el existente**

Run: `cd src && pnpm exec vitest run __tests__/domains/insights-engine-ordering.test.ts __tests__/domains/insights-engine.test.ts`
Expected: PASS ambos ficheros.

Se **espera** que `insights-engine.test.ts` siga verde: sus fixtures alinean id y hora. Si alguno se pone rojo, no es ruido — su expectativa dependía del orden por UUID. Léela entera antes de tocarla y anota el hallazgo en el PR.

- [ ] **Step 5: Suite completa**

Run: `cd src && pnpm exec vitest run`
Expected: PASS todo (línea base 1204 tests + los nuevos).

- [ ] **Step 6: Commit**

```bash
git add src/domains/analytics/services/insights-engine.ts src/__tests__/domains/insights-engine-ordering.test.ts
git commit -m "fix(insights): ordenar la secuencia por hora, no por UUID, en los detectores"
```

---

### Task 3: Los detectores disparan sobre el patrón y callan sin él

**Files:**
- Create: `src/__tests__/behavior/behavior-loop.test.ts`

**Interfaces:**
- Consumes: `buildScenario`, `DIRTY_PROFILE`, `CLEAN_PROFILE` de `../support/behavior-scenario`; los cuatro detectores de `@/domains/analytics/services/insights-engine`.
- Produces: el fichero que las Tareas 4 y 5 amplían con más bloques `describe`.

- [ ] **Step 1: Escribir los tests**

Crear `src/__tests__/behavior/behavior-loop.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { buildScenario, CLEAN_PROFILE, DIRTY_PROFILE } from "../support/behavior-scenario"
import {
  detectIntradayDecay,
  detectRevengeTrading,
  detectOversizing,
  detectOffPlan,
} from "@/domains/analytics/services/insights-engine"

const dirty = buildScenario(DIRTY_PROFILE)
const clean = buildScenario(CLEAN_PROFILE)

describe("detectores sobre un escenario con patrón", () => {
  it("intraday-decay dispara", () => {
    const i = detectIntradayDecay(dirty.history)
    expect(i).not.toBeNull()
    expect(i!.id).toBe("intraday-decay")
    expect(i!.metric).toBeGreaterThanOrEqual(12)
  })

  it("revenge-trading dispara", () => {
    const i = detectRevengeTrading(dirty.history)
    expect(i).not.toBeNull()
    expect(i!.id).toBe("revenge-trading")
    expect(i!.metric).toBeGreaterThanOrEqual(30)
  })

  it("oversizing dispara", () => {
    const i = detectOversizing(dirty.history)
    expect(i).not.toBeNull()
    expect(i!.id).toBe("oversizing")
    expect(i!.metric).toBeGreaterThanOrEqual(20)
  })

  it("off-plan dispara", () => {
    const i = detectOffPlan(dirty.history)
    expect(i).not.toBeNull()
    expect(i!.id).toBe("off-plan")
    expect(i!.metric).toBeGreaterThanOrEqual(20)
  })
})

describe("los detectores CALLAN sobre un escenario limpio", () => {
  it("ninguno de los cuatro dispara", () => {
    expect(detectIntradayDecay(clean.history)).toBeNull()
    expect(detectRevengeTrading(clean.history)).toBeNull()
    expect(detectOversizing(clean.history)).toBeNull()
    expect(detectOffPlan(clean.history)).toBeNull()
  })
})

describe("frontera del umbral de off-plan (rate >= 0.20)", () => {
  // revengeAfterLoss = 0 para que la cuota off-plan sea SOLO offPlanShare:
  // "Impulsivo" también cuenta como off-plan y contaminaría la medición.
  const base = { ...CLEAN_PROFILE, revengeAfterLoss: 0 }

  it("calla justo por debajo del umbral", () => {
    const s = buildScenario({ ...base, seed: 4242, offPlanShare: 0.1 })
    expect(detectOffPlan(s.history)).toBeNull()
  })

  it("dispara justo por encima del umbral", () => {
    const s = buildScenario({ ...base, seed: 4242, offPlanShare: 0.3 })
    expect(detectOffPlan(s.history)).not.toBeNull()
  })
})
```

- [ ] **Step 2: Correr y ajustar**

Run: `cd src && pnpm exec vitest run __tests__/behavior/behavior-loop.test.ts`
Expected: PASS, 7 tests.

Si el caso frontera no separa limpiamente con 0.1 / 0.3, mueve los valores más lejos del umbral (p. ej. 0.05 y 0.4) **antes** que relajar la aserción. Con 80 trades la varianza binomial de una cuota del 20 % es de unos ±4 puntos, así que 0.19/0.21 es demasiado apretado para un muestreo — de ahí 0.1/0.3.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/behavior/behavior-loop.test.ts
git commit -m "test(behavior): los 4 detectores disparan con patron y callan sin el"
```

---

### Task 4: La cadena pura hasta reinforcement

**Files:**
- Modify: `src/__tests__/behavior/behavior-loop.test.ts` (añadir bloques al final)

**Interfaces:**
- Consumes: `canCommit`, `deriveCommitmentSpec`, `evaluateResult`, `statusFromResult` de `@/domains/behavior/commitment-machine`; `getVerifier` de `@/domains/behavior/verifiers`; `planReinforcement` de `@/domains/behavior/reinforcement`.
- Produces: nada que consuman tareas posteriores.

- [ ] **Step 1: Añadir los imports**

Al bloque de imports de `src/__tests__/behavior/behavior-loop.test.ts`, añadir:

```ts
import { canCommit, deriveCommitmentSpec, evaluateResult, statusFromResult } from "@/domains/behavior/commitment-machine"
import { getVerifier, type WindowTrade } from "@/domains/behavior/verifiers"
import { planReinforcement } from "@/domains/behavior/reinforcement"
```

- [ ] **Step 2: Añadir los tests de la cadena**

Al final del fichero:

```ts
describe("cadena insight → commitment → verificación → reinforcement", () => {
  const TYPES = ["intraday-decay", "revenge-trading", "oversizing", "off-plan"] as const

  it("los cuatro tipos detectados son comprometibles", () => {
    for (const type of TYPES) expect(canCommit(type)).toBe(true)
  })

  it("cada tipo deriva una spec que apunta a un verificador vivo", () => {
    for (const type of TYPES) {
      const spec = deriveCommitmentSpec(type)
      expect(spec).not.toBeNull()
      expect(getVerifier(spec!.metricKey)).not.toBeNull()
    }
  })

  it("el escenario sucio ROMPE el compromiso y produce refuerzo correctivo", () => {
    for (const type of TYPES) {
      const spec = deriveCommitmentSpec(type)!
      const verifier = getVerifier(spec.metricKey)!
      const { observedValue } = verifier(dirty.history as WindowTrade[])
      const result = evaluateResult(observedValue, spec.target, spec.comparator)

      expect(observedValue).toBeGreaterThan(spec.target)
      expect(result).toBe("broken")
      expect(statusFromResult(result)).toBe("broken")

      const plan = planReinforcement(result)
      expect(plan.kind).toBe("corrective")
      expect(plan.visible).toBe(true) // el correctivo SIEMPRE se muestra (§8.4)
    }
  })

  it("el escenario limpio MANTIENE el compromiso y el primer refuerzo positivo se muestra", () => {
    for (const type of TYPES) {
      const spec = deriveCommitmentSpec(type)!
      const verifier = getVerifier(spec.metricKey)!
      const { observedValue } = verifier(clean.history as WindowTrade[])
      const result = evaluateResult(observedValue, spec.target, spec.comparator)

      expect(result).toBe("kept")
      expect(planReinforcement(result, 0)).toEqual({ kind: "positive", visible: true })
    }
  })

  it("el refuerzo positivo se ralea con la razón variable (FREEZE-D13)", () => {
    // Visible en los triangulares 0,1,3,6,10; silencioso en el resto.
    expect(planReinforcement("kept", 0).visible).toBe(true)
    expect(planReinforcement("kept", 1).visible).toBe(true)
    expect(planReinforcement("kept", 2).visible).toBe(false)
    expect(planReinforcement("kept", 3).visible).toBe(true)
    expect(planReinforcement("kept", 4).visible).toBe(false)
    expect(planReinforcement("kept", 6).visible).toBe(true)
  })

  it("el verificador señala como evidencia trades que existen en el escenario", () => {
    const spec = deriveCommitmentSpec("revenge-trading")!
    const { evidence } = getVerifier(spec.metricKey)!(dirty.history as WindowTrade[])
    expect(evidence.tradeIds.length).toBeGreaterThan(0)
    const ids = new Set(dirty.history.map((t) => t.id))
    for (const id of evidence.tradeIds) expect(ids.has(id)).toBe(true)
  })
})
```

- [ ] **Step 3: Correr**

Run: `cd src && pnpm exec vitest run __tests__/behavior/behavior-loop.test.ts`
Expected: PASS, 13 tests.

El escenario limpio da `observedValue === 0` en los cuatro verificadores. Que `tradesPerDayBeyond2` dé 0 depende de que `CLEAN_PROFILE.tradesPerDay === 2` (decisión 4 de la Tarea 1): con 3 o más, ese verificador contaría ofensores y el compromiso saldría `broken` pese al perfil limpio. Si este test falla ahí, revisa el perfil antes que el test.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/behavior/behavior-loop.test.ts src/__tests__/support/behavior-scenario.ts src/__tests__/support/behavior-scenario.selfcheck.test.ts
git commit -m "test(behavior): cadena pura commitment -> verificacion -> reinforcement"
```

---

### Task 5: El día vivo dispara la decisión de intervención

**Files:**
- Modify: `src/__tests__/behavior/behavior-loop.test.ts` (añadir bloque al final)

**Interfaces:**
- Consumes: `detectInterventions`, `decideIntervention`, `priority`, `type DayState`, `type FatigueState` de `@/domains/cognitive/intervention/engine`.
- Produces: nada.

- [ ] **Step 1: Añadir imports y helper de estado**

Añadir al bloque de imports:

```ts
import {
  detectInterventions,
  decideIntervention,
  priority,
  type DayState,
  type FatigueState,
} from "@/domains/cognitive/intervention/engine"
import type { ScenarioTrade } from "../support/behavior-scenario"
```

- [ ] **Step 2: Añadir los tests**

Al final del fichero:

```ts
describe("día vivo → decisión de intervención", () => {
  /** Compone el DayState que el motor lee, desde el día vivo + la media histórica. */
  function dayState(liveDay: ScenarioTrade[], history: ScenarioTrade[]): DayState {
    const ordered = [...liveDay].sort((a, b) => (a.openTime ?? "").localeCompare(b.openTime ?? ""))
    let consecutiveLosses = 0
    for (const t of ordered) consecutiveLosses = t.pnl < 0 ? consecutiveLosses + 1 : 0
    const last = ordered[ordered.length - 1]
    return {
      tradesToday: ordered.length,
      lossesToday: ordered.filter((t) => t.pnl < 0).length,
      consecutiveLosses,
      lastRiskPct: last.riskPct,
      avgRiskPct: history.reduce((s, t) => s + t.riskPct, 0) / history.length,
      dayPnlPct: -2,
      drawdownPct: 0,
      ddDailyLimitPct: null,
      impulsiveToday: ordered.filter((t) => t.revengeFlag === true).length,
    }
  }

  const silent: FatigueState = { activeCount: 0, minsSinceLast: null, shownToday: 0 }

  it("la cascada del día vivo produce candidatos", () => {
    const candidates = detectInterventions(dayState(dirty.liveDay, dirty.history))
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.map((c) => c.trigger)).toContain("cascade")
  })

  it("la cascada supera θ y se elige para mostrar", () => {
    const state = dayState(dirty.liveDay, dirty.history)
    const chosen = decideIntervention(detectInterventions(state), silent)
    expect(chosen).not.toBeNull()
    expect(chosen!.trigger).toBe("cascade")
    expect(chosen!.severity).toBe("critical")
    expect(chosen!.suggestedAction.kind).toBe("stop_for_day")
    expect(priority(chosen!.scores)).toBeGreaterThan(0.18) // θ por defecto
  })

  it("un día limpio no produce ninguna intervención", () => {
    const calm: DayState = {
      tradesToday: 2, lossesToday: 0, consecutiveLosses: 0,
      lastRiskPct: 0.5, avgRiskPct: 0.5, dayPnlPct: 1,
      drawdownPct: 0, ddDailyLimitPct: null, impulsiveToday: 0,
    }
    expect(detectInterventions(calm)).toEqual([])
    expect(decideIntervention(detectInterventions(calm), silent)).toBeNull()
  })

  it("respeta la anti-fatiga: con una intervención ya activa, calla", () => {
    const state = dayState(dirty.liveDay, dirty.history)
    const busy: FatigueState = { activeCount: 1, minsSinceLast: 5, shownToday: 1 }
    expect(decideIntervention(detectInterventions(state), busy)).toBeNull()
  })
})
```

- [ ] **Step 3: Correr**

Run: `cd src && pnpm exec vitest run __tests__/behavior/behavior-loop.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 4: Suite completa + gates**

Run:
```bash
cd src && pnpm exec vitest run && pnpm exec tsc --noEmit && pnpm exec eslint .
```
Expected: suite verde, `tsc` sin salida, `eslint` con 0 errores (los warnings preexistentes son aceptados).

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/behavior/behavior-loop.test.ts
git commit -m "test(behavior): el dia vivo dispara la decision de intervencion"
```

---

### Task 6: La cadena persistida contra Postgres real

**Files:**
- Create: `src/__tests__/integration/behavior-loop.integration.test.ts`

**Interfaces:**
- Consumes: `prisma`, `makeUser`, `dropUser` de `./_helpers`; `persistInsights`, `toComputedInsight` de `@/domains/analytics/insights/insight-store`; los detectores; `deriveCommitmentSpec`, `getVerifier`, `planReinforcement`.
- Produces: nada.

**Precondición:** el stack de Supabase local levantado. Si `docker info` falla, esta tarea **no se puede verificar** y hay que decirlo explícitamente en el PR en vez de marcarla hecha.

- [ ] **Step 1: Levantar el stack local**

```bash
docker info                      # debe responder sin error
cd src && npx supabase start     # imprime el DATABASE_URL local
```
Expected: `supabase start` imprime `DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

Si `docker info` sale con error: **para aquí**, deja la tarea sin marcar y anota en el PR que la capa de integración queda para CI.

- [ ] **Step 2: Escribir el test**

Crear `src/__tests__/integration/behavior-loop.integration.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { prisma, makeUser, dropUser } from "./_helpers"
import { persistInsights, toComputedInsight } from "@/domains/analytics/insights/insight-store"
import {
  detectIntradayDecay,
  detectRevengeTrading,
  detectOversizing,
  detectOffPlan,
} from "@/domains/analytics/services/insights-engine"
import { buildScenario, DIRTY_PROFILE } from "../support/behavior-scenario"
import { deriveCommitmentSpec, evaluateResult } from "@/domains/behavior/commitment-machine"
import { getVerifier, type WindowTrade } from "@/domains/behavior/verifiers"
import { planReinforcement } from "@/domains/behavior/reinforcement"

const scenario = buildScenario(DIRTY_PROFILE)

/** Los 4 insights que el escenario debe producir, ya en forma persistible. */
function computed() {
  const engine = [
    detectIntradayDecay(scenario.history),
    detectRevengeTrading(scenario.history),
    detectOversizing(scenario.history),
    detectOffPlan(scenario.history),
  ].filter((i) => i !== null)
  return engine.map((i) => toComputedInsight(i!, scenario.history.length))
}

let userId: string
beforeEach(async () => {
  userId = await makeUser()
})
afterEach(async () => {
  await dropUser(userId)
})

describe("loop conductual (integración, Postgres real)", () => {
  it("el escenario produce los 4 insights y los persiste con su evento", async () => {
    const ci = computed()
    expect(ci).toHaveLength(4)

    const r = await persistInsights(userId, ci, prisma)
    expect(r.created).toBe(4)

    const rows = await prisma.insight.findMany({ where: { userId } })
    expect(rows.map((x) => x.type).sort()).toEqual(
      ["intraday-decay", "off-plan", "oversizing", "revenge-trading"],
    )
  })

  it("los eventos del outbox se ACUMULAN en pending (el dispatcher está des-agendado)", async () => {
    await persistInsights(userId, computed(), prisma)
    const events = await prisma.domainEvent.findMany({ where: { userId, type: "insight.created" } })
    expect(events).toHaveLength(4)
    // El cron v3-dispatch-events lo des-agendó la migración 20260721190000 hasta que
    // exista el primer consumidor de S4. Los eventos se acumulan en vez de quemarse:
    // esa acumulación es el comportamiento correcto HOY, y esto la fija.
    for (const e of events) expect(e.status).toBe("pending")
  })

  it("cada insight persistido encadena hasta un refuerzo correctivo", async () => {
    await persistInsights(userId, computed(), prisma)
    const rows = await prisma.insight.findMany({ where: { userId } })

    for (const row of rows) {
      const spec = deriveCommitmentSpec(row.type)
      expect(spec).not.toBeNull()

      const { observedValue, evidence } = getVerifier(spec!.metricKey)!(
        scenario.history as WindowTrade[],
      )
      const result = evaluateResult(observedValue, spec!.target, spec!.comparator)
      expect(result).toBe("broken")
      expect(evidence.tradeIds.length).toBeGreaterThan(0)

      const plan = planReinforcement(result)
      expect(plan).toEqual({ kind: "corrective", visible: true })
    }
  })

  it("borrar el usuario cascadea insights y eventos", async () => {
    await persistInsights(userId, computed(), prisma)
    expect(await prisma.insight.count({ where: { userId } })).toBe(4)
    await dropUser(userId)
    expect(await prisma.insight.count({ where: { userId } })).toBe(0)
    expect(await prisma.domainEvent.count({ where: { userId } })).toBe(0)
    userId = await makeUser() // repuesto para que el afterEach no falle
  })
})
```

- [ ] **Step 3: Correr la suite de integración**

Run:
```bash
cd src && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" pnpm exec vitest run --config vitest.integration.config.ts
```
Expected: PASS, incluidos los ficheros de integración preexistentes (`event-bus`, `insight-store`, `smoke`).

- [ ] **Step 4: Gates finales**

Run:
```bash
cd src && pnpm exec vitest run && pnpm exec tsc --noEmit && pnpm exec eslint .
```
Expected: todo verde.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/integration/behavior-loop.integration.test.ts
git commit -m "test(behavior): cadena persistida del loop contra Postgres real"
```

---

### Task 7: Commitment persistido y regla enlazada (linkRule)

Cierra el eslabón que el spec §5.2 pone entre el insight y la verificación: crear la fila de `commitment` y respaldarla con una regla de enforcement.

**Hallazgo que este test fija:** `linkRule` lanza `NotEnforceableError` cuando la métrica no es prevenible pre-trade. `proposeRuleForCommitment` (`rule-linking.ts:39`) sólo cubre `tradesPerDayBeyond2`, `revengeTradesAfterLoss` y `oversizedTrades` — **`offPlanTrades` devuelve `null`**. Es decir: **3 de los 4 compromisos se pueden respaldar con una regla y off-plan no**, por diseño (no puedes bloquear pre-trade algo que sólo se sabe al etiquetar después). El test asserta ambos lados; no lo trates como un fallo a arreglar.

**Files:**
- Modify: `src/__tests__/integration/behavior-loop.integration.test.ts` (añadir bloque al final)

**Interfaces:**
- Consumes: `linkRule`, `NotEnforceableError` de `@/server/services/behavior/rule-suggestion-service`.
- Produces: nada.

- [ ] **Step 1: Añadir imports**

```ts
import { linkRule, NotEnforceableError } from "@/server/services/behavior/rule-suggestion-service"
```

- [ ] **Step 2: Añadir los tests**

Al final del fichero:

```ts
describe("commitment persistido y regla enlazada", () => {
  /** Crea la fila de commitment que deriva de un insight ya persistido. */
  async function commitFrom(insightId: string, type: string) {
    const spec = deriveCommitmentSpec(type)!
    const endAt = new Date()
    endAt.setDate(endAt.getDate() + 7) // ventana "week"
    return prisma.commitment.create({
      data: {
        userId,
        sourceInsightId: insightId,
        text: spec.text,
        metricKey: spec.metricKey,
        target: spec.target,
        comparator: spec.comparator,
        window: spec.window,
        endAt,
        createdVia: "self",
      },
    })
  }

  it("un insight persistido produce un commitment activo con su spec", async () => {
    await persistInsights(userId, computed(), prisma)
    const insight = await prisma.insight.findFirstOrThrow({ where: { userId, type: "revenge-trading" } })

    const c = await commitFrom(insight.id, insight.type)
    expect(c.status).toBe("active")
    expect(c.metricKey).toBe("revengeTradesAfterLoss")
    expect(c.target).toBe(0)
    expect(c.comparator).toBe("<=")
    expect(c.sourceInsightId).toBe(insight.id)
  })

  it("linkRule respalda el commitment con una regla enforce y los enlaza en ambos sentidos", async () => {
    await persistInsights(userId, computed(), prisma)
    const insight = await prisma.insight.findFirstOrThrow({ where: { userId, type: "revenge-trading" } })
    const c = await commitFrom(insight.id, insight.type)

    const rule = await linkRule(prisma, userId, c.id)

    expect(rule.mode).toBe("enforce")
    expect(rule.trigger).toBe("TRADE_PRE_CREATE")
    expect(rule.sourceCommitmentId).toBe(c.id)
    expect(rule.sourceInsightId).toBe(insight.id) // hereda el origen del commitment

    const updated = await prisma.commitment.findUniqueOrThrow({ where: { id: c.id } })
    expect(updated.ruleId).toBe(rule.id) // enlace en el otro sentido
  })

  it("los 3 tipos prevenibles pre-trade se respaldan con regla", async () => {
    await persistInsights(userId, computed(), prisma)
    for (const type of ["intraday-decay", "revenge-trading", "oversizing"]) {
      const insight = await prisma.insight.findFirstOrThrow({ where: { userId, type } })
      const c = await commitFrom(insight.id, type)
      const rule = await linkRule(prisma, userId, c.id)
      expect(rule.mode).toBe("enforce")
    }
    expect(await prisma.rule.count({ where: { userId } })).toBe(3)
  })

  it("off-plan NO es prevenible pre-trade y linkRule lo rechaza explícitamente", async () => {
    // Por diseño: off-plan se conoce al etiquetar el trade, no antes de abrirlo.
    // Un "enforce" ahí sería falsa protección (R3), así que el servicio se niega.
    await persistInsights(userId, computed(), prisma)
    const insight = await prisma.insight.findFirstOrThrow({ where: { userId, type: "off-plan" } })
    const c = await commitFrom(insight.id, "off-plan")

    await expect(linkRule(prisma, userId, c.id)).rejects.toBeInstanceOf(NotEnforceableError)
    expect(await prisma.rule.count({ where: { userId } })).toBe(0)
  })
})
```

- [ ] **Step 3: Correr la suite de integración**

Run:
```bash
cd src && DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" pnpm exec vitest run --config vitest.integration.config.ts
```
Expected: PASS todo.

- [ ] **Step 4: Gates finales**

Run:
```bash
cd src && pnpm exec vitest run && pnpm exec tsc --noEmit && pnpm exec eslint .
```
Expected: suite verde, `tsc` sin salida, `eslint` con 0 errores.

- [ ] **Step 5: Commit y push**

```bash
git add src/__tests__/integration/behavior-loop.integration.test.ts
git commit -m "test(behavior): commitment persistido + linkRule, con off-plan no enforzable"
git push -u origin feat/behavior-fixture-loop-e2e
```

- [ ] **Step 6: Abrir el PR**

```bash
gh pr create --title "test(behavior): fixture conductual + validacion del loop de punta a punta" --body-file ../pr-body.md
```

Escribir `pr-body.md` (fuera de `src/`, y borrarlo tras crear el PR) con exactamente estas secciones:

1. **Por qué.** Los detectores del Behavior Engine nunca se habían visto disparar. Los 137 trades de prod son 85 sembrados con psicología aleatoria sin correlación temporal + 52 reales sin psicología, y el seed etiqueta en minúscula mientras `detectOffPlan` busca `Off-plan`/`Impulsivo`/`Revanche`. No disparan porque no hay patrón, no por falta de volumen.
2. **Qué se arregla.** El ordenamiento de secuencia en `insights-engine.ts:89`, con la nota de que los tests existentes no podían cazarlo porque sus fixtures alinean orden de id y de hora por accidente.
3. **Qué se añade.** Generador determinista + self-check, tests de dominio puro, tests de integración.
4. **Hallazgo.** `linkRule` no cubre off-plan: 3 de 4 compromisos son respaldables con regla. Es por diseño y ahora está fijado por un test.
5. **Lo que NO cierra.** No consigue un usuario real con volumen; no persiste `interventions` (OI-7.3 sigue sin ser validable); no construye el consumidor S4 (S0/R-3 sigue abierto).
6. **Estado de verificación.** Si la capa de integración no se pudo correr en local por Docker, **decirlo explícitamente** y señalar que queda al job de integración de CI. No escribir "todo verde" si no se vio.

---

## Al terminar

Resumir en tres ejes, como pide la regla de trabajo:

- **Backend:** qué se arregló (`bySymbolDate`) y qué se añadió (generador + 4 ficheros de test).
- **Observable en UI:** nada. Esta pieza no toca superficies — es instrumentación. Decirlo en claro en vez de inventar un efecto visible.
- **Razón de ser:** el sistema pasa de "vivo pero dormido, según el doc" a "se ha visto funcionar, y hay una red que avisa si deja de hacerlo".

**Lo que esta pieza NO cierra**, y conviene repetirlo al entregar para que nadie lo lea de más:
- No consigue un usuario real con volumen. Ese sigue siendo el cuello de botella.
- No persiste filas en `interventions` → **OI-7.3 sigue sin ser validable**.
- No construye el consumidor S4 del outbox → **S0/R-3 sigue abierto**.
