# Captura de emoción con procedencia — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un trade cerrado sin emoción deje de esconder el campo, ofrezca el gesto durante 7 días, y que ese dato llegue a la BD marcado por su procedencia y excluido de toda afirmación causal.

**Architecture:** Una columna `emotion_source` (`captured` | `reconstructed`) que el **servidor** deriva por la posición del camino de escritura, nunca el cliente. Una ventana de 7 días anclada en `Trade.date` validada en servidor. Un helper puro `capturedEmotion()` que los tres detectores de `category: "correlation"` usan en lugar de leer `emotionBefore` a pelo. Dos superficies (panel del trade y review semanal) sobre un componente `EmotionCapture` compartido.

**Tech Stack:** Next.js 16 App Router · React 19 · tRPC 11 · Prisma 7.8 (adapter PrismaPg) · Supabase Postgres 17 · Zod 4 · Vitest · Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-27-captura-emocion-reconstruida-design.md`

## Global Constraints

- **Todo comando de test se ejecuta desde `src/`.** El `node_modules` real está ahí, no en la raíz.
- La suite completa se corre antes de cada push: `npm test` desde `src/`. **1413 tests hoy.** No un subconjunto.
- **Exactamente 2 fallos preexistentes** (`sentry-wiring`) por `@sentry/nextjs` ausente de `node_modules`. No son regresión. Si aparecen más fallos, comprobar primero si son `Cannot find module` de `@sentry/nextjs` o `puppeteer-core`.
- **Migración dual:** SQL en `supabase/migrations/` **y** `src/prisma/schema.prisma`, seguido de `npx prisma generate`. `emotion_source` es `TEXT`, no una columna `vector`, así que va en los dos sitios.
- Columna nueva sobre tabla existente: **hereda la RLS de `trades`**. No se crea política nueva.
- **TDD: hay que VER el rojo, y que sea el rojo correcto.** Cada tarea declara el fallo esperado. Si un test sale verde antes de tocar la implementación, el diagnóstico está mal — parar y avisar.
- Valores de emoción: `"calm" | "anxious" | "excited" | "fearful" | "overconfident"`, fuente única en `src/domains/trading/emotions.ts` (`EMOTION_VALUES` / `EMOTION_OPTIONS`). No redefinirlos en ningún sitio.
- Rama de trabajo: `feat/captura-emocion-reconstruida` (ya creada desde `origin/main`, con el spec commiteado).

## Estructura de ficheros

| Fichero | Responsabilidad | Tarea |
|---|---|---|
| `supabase/migrations/20260727120000_trade_emotion_source.sql` | columna + backfill | 1 |
| `src/prisma/schema.prisma` (modelo `Trade`, ~L299) | declarar `emotionSource` | 1 |
| `src/domains/trading/services/emotion-provenance.ts` | **nuevo** — `EmotionSource`, `EMOTION_BACKFILL_WINDOW_DAYS`, `isWithinEmotionWindow()` (puro) | 3 |
| `src/domains/analytics/services/insights-engine.ts` | `AnalyticsTrade.emotionSource`, `capturedEmotion()`, `detectEmotionPerformance` | 2 |
| `src/domains/analytics/services/psychology-insights.ts` | `detectEmotionBeforeLoss`, `detectViolationEmotion` | 2 |
| `src/server/services/trades/trade-write-service.ts` | procedencia posicional + ventana en servidor | 3 |
| `src/server/trpc/routers/trades.ts` | mutación `captureEmotion` | 3 |
| `src/components/trades/emotion-capture.tsx` | **nuevo** — chips + mutación + estado de ventana | 4 |
| `src/components/trades/trade-detail-panel.tsx` (~L640) | superficie A | 5 |
| `src/components/trades/edit-trade-modal.tsx` (~L445) | respetar ventana | 5 |
| `src/server/services/reviews/report-data.ts` | cargar los pendientes de la semana | 6 |
| `src/app/reviews/components/report/view-model.ts` | llevarlos al VM | 6 |
| `src/app/reviews/components/report/sections.tsx` (~L226) | superficie B + etiqueta de reconstruidas | 6 |
| `src/server/services/reviews/review-insights.ts` | `byEmotion` cuenta reconstruidas | 6 |

---

## Task 1: Migración y columna

**Files:**
- Create: `supabase/migrations/20260727120000_trade_emotion_source.sql`
- Modify: `src/prisma/schema.prisma` (modelo `Trade`, junto a `emotionBefore` en ~L299)

**Interfaces:**
- Consumes: nada.
- Produces: `Trade.emotionSource: string | null` en el cliente Prisma generado. Todas las tareas siguientes dependen de este campo.

- [ ] **Step 1: Escribir la migración SQL**

Crear `supabase/migrations/20260727120000_trade_emotion_source.sql`:

```sql
-- Procedencia de la emoción del trade (2026-07-27).
--
-- `emotion_before` no distinguía entre una emoción registrada EN EL MOMENTO
-- (alta o cierre, con el trade vivo y el trader delante) y una reconstruida
-- después. Los detectores de category "correlation" afirman causalidad sobre
-- ese campo; construir esa afirmación sobre recuerdo reconstruido —y revisado
-- a la luz del resultado— es exactamente lo que FREEZE-P2/P3/P6 impiden.
--
-- Valores: 'captured' | 'reconstructed'. NULL cuando no hay emoción.
-- La escribe SIEMPRE el servidor, derivada de la posición del camino de
-- escritura; el cliente no la envía nunca.
--
-- RLS: `trades` ya tiene políticas per-usuario y esta columna las hereda.
-- No es una columna `vector`, así que SÍ se declara en schema.prisma.

ALTER TABLE trades ADD COLUMN IF NOT EXISTS emotion_source TEXT;

ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_emotion_source_check;
ALTER TABLE trades ADD CONSTRAINT trades_emotion_source_check
  CHECK (emotion_source IS NULL OR emotion_source IN ('captured', 'reconstructed'));

-- Backfill honesto: las únicas filas con emoción en prod entraron por
-- register-trade-modal en el momento del alta (simulación del 2026-07-22).
-- Son 15 — no 16: uno de los trades sintéticos no tiene emoción.
UPDATE trades SET emotion_source = 'captured' WHERE emotion_before IS NOT NULL;
```

- [ ] **Step 2: Declarar la columna en Prisma**

En `src/prisma/schema.prisma`, modelo `Trade`, justo debajo de `emotionBefore`:

```prisma
  emotionBefore    String?  @map("emotion_before")    // "calm" | "anxious" | "excited" | "fearful" | "overconfident"
  emotionSource    String?  @map("emotion_source")    // "captured" (en el momento) | "reconstructed" (rellenada después)
```

- [ ] **Step 3: Regenerar el cliente Prisma**

Run desde `src/`: `npx prisma generate`
Expected: `Generated Prisma Client (v7.8.x)` sin errores. Funciona sin red.

- [ ] **Step 4: Verificar que el tipo llegó al cliente generado**

Run desde `src/`: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "emotionSource"`
Expected: `0` — ningún error mencionando `emotionSource`. (Otros errores de `@sentry/nextjs` / `puppeteer-core` son preexistentes.)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260727120000_trade_emotion_source.sql src/prisma/schema.prisma
git commit -m "feat(db): columna emotion_source con check y backfill de las 15 capturadas"
```

---

## Task 2: El contrato de exclusión de correlación

**Files:**
- Modify: `src/domains/analytics/services/insights-engine.ts` (tipo `AnalyticsTrade` ~L68, `detectEmotionPerformance` ~L172)
- Modify: `src/domains/analytics/services/psychology-insights.ts` (`detectEmotionBeforeLoss` L32, `detectViolationEmotion` L106)
- Test: `src/__tests__/domains/emotion-provenance-contract.test.ts` (nuevo)

**Interfaces:**
- Consumes: `Trade.emotionSource` (Task 1).
- Produces: `capturedEmotion(t: AnalyticsTrade): string | null` exportado desde `@/domains/analytics/services/insights-engine`. `AnalyticsTrade` gana `emotionSource?: string | null`.

> **Los detectores de correlación que leen `emotionBefore` son TRES y viven en DOS ficheros.** Mirar sólo `psychology-insights.ts` deja fuera `detectEmotionPerformance` (`insights-engine.ts:172`). Los que NO se tocan —`impulsive-expectancy`, `overconfidence-bias`, `holding-asymmetry`, `clean-streak`— van por `fomoFlag`/`revengeFlag`/tags, `confidenceRating` y tiempos.

- [ ] **Step 1: Escribir el test del contrato**

Crear `src/__tests__/domains/emotion-provenance-contract.test.ts`:

```ts
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

/**
 * Un conjunto que dispara los TRES detectores de correlación a la vez:
 *  - 10 pérdidas en estado negativo + 4 en calma  → emotion-before-loss (share > 50%)
 *  - 8 negativas vs 8 calmadas con P&L muy distinto → emotion-performance
 *  - 8 violaciones (revengeFlag) todas "anxious"    → violation-emotion
 */
function correlationDataset(source: "captured" | "reconstructed"): AnalyticsTrade[] {
  const out: AnalyticsTrade[] = []
  let n = 0
  const day = (i: number) => `2026-03-${String((i % 27) + 1).padStart(2, "0")}`
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
    expect(correlationInsightIds(correlationDataset("reconstructed"))).toEqual([])
  })

  it("emoción sin procedencia se trata como no utilizable para causalidad", () => {
    const sinMarca = correlationDataset("captured").map(t => ({ ...t, emotionSource: null }))
    expect(correlationInsightIds(sinMarca)).toEqual([])
  })
})
```

- [ ] **Step 2: Correr el test y ver el rojo correcto**

Run desde `src/`: `npx vitest run __tests__/domains/emotion-provenance-contract.test.ts`

Expected: el **primer** test PASA (los detectores ya disparan hoy con esos datos) y el **segundo y tercero FALLAN** con algo de la forma:

```
AssertionError: expected [ 'emotion-before-loss', 'emotion-performance', 'violation-emotion' ] to deeply equal []
```

**Ése es el defecto:** hoy la procedencia no existe y los tres detectores disparan igual con datos reconstruidos. Si el segundo test pasa de entrada, la implementación ya está hecha o el dataset no alcanza los umbrales — parar y revisar.

Si el **primer** test falla, el dataset no dispara los detectores y el resto de la tarea no prueba nada. Ajustar el dataset hasta verlo verde antes de seguir.

- [ ] **Step 3: Añadir `emotionSource` al tipo y el helper**

En `src/domains/analytics/services/insights-engine.ts`, extender el tipo (~L68):

```ts
/** A trade enriched with the psychology fields the engine correlates on. */
export type AnalyticsTrade = MinimalTrade & {
  emotionBefore?:    string | null
  /** "captured" (registrada en el momento) | "reconstructed" (rellenada después). */
  emotionSource?:    string | null
  fomoFlag?:         boolean
  revengeFlag?:      boolean
  confidenceRating?: number | null
}

/**
 * La emoción que una afirmación causal puede usar: SÓLO la registrada en el
 * momento. Una emoción reconstruida se revisa a la luz del resultado ya
 * conocido, así que fundar una correlación en ella es afirmar como dato lo que
 * es una historia posterior (FREEZE-P2/P3/P6). Sin marca ⇒ no utilizable.
 *
 * Sigue valiendo para mostrarse, para la cobertura y para el contexto del
 * Coach; la frontera es el TIPO DE AFIRMACIÓN, no la superficie.
 */
export function capturedEmotion(t: AnalyticsTrade): string | null {
  return t.emotionSource === "captured" ? t.emotionBefore ?? null : null
}
```

- [ ] **Step 4: Aplicar el contrato en `detectEmotionPerformance`**

En el mismo fichero (~L172-181), sustituir las cuatro lecturas de `t.emotionBefore` — **incluida la puerta de entrada**:

```ts
// ── 3. Emotion ↔ performance correlation ─────────────────────────────────────
export function detectEmotionPerformance(trades: AnalyticsTrade[]): Insight | null {
  // La puerta cuenta captured-only igual que el cálculo: si admitiera
  // reconstruida, el detector se abriría con datos que luego no puede usar y
  // produciría silencios inexplicables.
  const withEmotion = trades.filter(t => capturedEmotion(t) || t.fomoFlag || t.revengeFlag)
  if (withEmotion.length < 12) return null
  const NEG = new Set(["anxious", "fearful", "frustrated", "overconfident"])
  const neg = trades.filter(t => { const e = capturedEmotion(t); return (e && NEG.has(e)) || t.fomoFlag || t.revengeFlag })
  const calm = trades.filter(t => capturedEmotion(t) === "calm")
  if (neg.length < 6 || calm.length < 6) return null
```

El resto de la función queda igual.

- [ ] **Step 5: Aplicar el contrato en los dos de `psychology-insights.ts`**

Importar el helper al principio del fichero (junto al `import type` existente de la L9):

```ts
import { capturedEmotion, type AnalyticsTrade, type Insight } from "./insights-engine"
```

(sustituye al `import type { AnalyticsTrade, Insight } from "./insights-engine"` actual).

`isNegative` (L16-18) pasa a leer la emoción utilizable:

```ts
function isNegative(t: AnalyticsTrade): boolean {
  const e = capturedEmotion(t)
  return (e != null && NEG_EMOTIONS.has(e)) || t.fomoFlag === true || t.revengeFlag === true
}
```

`detectEmotionBeforeLoss` (L33), la puerta:

```ts
  const losses = trades.filter(t => t.pnl < 0 && (capturedEmotion(t) != null || t.fomoFlag || t.revengeFlag))
```

`detectViolationEmotion` (L107-110), puerta y conteo:

```ts
  const viol = trades.filter(isImpulsive).filter(t => capturedEmotion(t) != null)
  if (viol.length < 6) return null
  const counts = new Map<string, number>()
  for (const t of viol) { const e = capturedEmotion(t)!; counts.set(e, (counts.get(e) ?? 0) + 1) }
```

- [ ] **Step 6: Correr el test del contrato y verlo verde**

Run desde `src/`: `npx vitest run __tests__/domains/emotion-provenance-contract.test.ts`
Expected: 3 passed.

- [ ] **Step 7: Correr los tests de detectores existentes**

Run desde `src/`: `npx vitest run __tests__/domains/insights-engine.test.ts __tests__/domains/analytics`

Expected: los tests existentes que construyen trades con `emotionBefore` pero **sin** `emotionSource` ahora fallan, porque su emoción dejó de ser utilizable. **Es correcto y esperado.** Arreglarlos añadiendo `emotionSource: "captured"` al fixture — no relajando el contrato.

Si algún test de correlación existente resulta imposible de arreglar así, es señal de que ese detector se está alimentando de otra vía: parar y revisar antes de tocarlo.

- [ ] **Step 8: Suite completa**

Run desde `src/`: `npm test`
Expected: 2 failed (`sentry-wiring`), el resto passed.

- [ ] **Step 9: Commit**

```bash
git add src/domains/analytics/services/insights-engine.ts \
        src/domains/analytics/services/psychology-insights.ts \
        src/__tests__/
git commit -m "feat(analytics): la emocion reconstruida no funda insights de correlacion"
```

---

## Task 3: Procedencia posicional y ventana, en servidor

**Files:**
- Create: `src/domains/trading/services/emotion-provenance.ts`
- Modify: `src/server/services/trades/trade-write-service.ts` (`createTrade` ~L60, `updateTrade` L276-282, `closeTrade` L360-372)
- Modify: `src/server/trpc/routers/trades.ts` (mutación nueva)
- Test: `src/__tests__/domains/emotion-provenance-window.test.ts` (nuevo)

**Interfaces:**
- Consumes: `Trade.emotionSource` (Task 1).
- Produces:
  - `EMOTION_BACKFILL_WINDOW_DAYS = 7`
  - `type EmotionSource = "captured" | "reconstructed"`
  - `isWithinEmotionWindow(tradeDate: Date, now: Date): boolean`
  - mutación tRPC `trades.captureEmotion({ tradeId: string, emotion: EmotionBefore }) → SerializedTrade`

> **`updateTrade` hace hoy un spread ciego** (`const { id, ...data } = input; prisma.trade.update({ data })`, L277-280). No hay punto de intercepción: la emoción entra a Prisma sin pasar por ninguna regla. Hay que extraerla explícitamente.
>
> **`closeTrade` promete algo que no cumple.** El comentario de L368-370 dice que un cierre *"nunca sobreescribe una emoción ya registrada"*, pero L371 sólo comprueba `input.emotionBefore != null` — no si el trade ya tenía una. Hoy no se nota porque el nudge sólo se pinta cuando falta, pero el servidor no lo sostiene. Se arregla aquí porque la regla de procedencia depende justo de esa distinción.

- [ ] **Step 1: Escribir el test de la ventana y la procedencia (puro)**

Crear `src/__tests__/domains/emotion-provenance-window.test.ts`:

```ts
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
```

- [ ] **Step 2: Correr y ver el rojo**

Run desde `src/`: `npx vitest run __tests__/domains/emotion-provenance-window.test.ts`
Expected: FAIL — `Failed to resolve import "@/domains/trading/services/emotion-provenance"`.

- [ ] **Step 3: Implementar el módulo puro**

Crear `src/domains/trading/services/emotion-provenance.ts`:

```ts
// ─────────────────────────────────────────────────────────────────────────────
// Procedencia de la emoción del trade (2026-07-27).
//
// Dos cosas que el resto del sistema necesita distinguir y hasta hoy no podía:
// CUÁNDO se registró la emoción, y hasta cuándo se puede seguir registrando.
//
// La marca la deriva SIEMPRE el servidor, por la posición del camino de
// escritura — nunca la declara el cliente. Si el cliente pudiera mandarla, la
// marca no valdría nada: sería una afirmación del mismo sitio del que se
// desconfía.
// ─────────────────────────────────────────────────────────────────────────────

export type EmotionSource = "captured" | "reconstructed"

/**
 * 7 días desde `Trade.date`. Coincide con el ciclo de la review semanal, que es
 * donde el gesto se ofrece (`ensure-analysis.ts` calcula weekStart → +6), así que
 * la ventana y la semana de la review son el mismo objeto. Más allá de una
 * semana, el recuerdo de un trade concreto se disuelve (FREEZE-P3).
 */
export const EMOTION_BACKFILL_WINDOW_DAYS = 7

/**
 * ¿Sigue abierta la casilla para este trade? Se compara a grano de DÍA en UTC:
 * la ventana es un plazo de calendario, no un intervalo de horas, así que operar
 * a las 23:00 no puede dar un día menos de margen que operar a las 09:00.
 */
export function isWithinEmotionWindow(tradeDate: Date, now: Date): boolean {
  const startDay = Date.UTC(tradeDate.getUTCFullYear(), tradeDate.getUTCMonth(), tradeDate.getUTCDate())
  const nowDay   = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const days = (nowDay - startDay) / 86_400_000
  return days >= 0 && days <= EMOTION_BACKFILL_WINDOW_DAYS
}
```

- [ ] **Step 4: Correr y ver verde**

Run desde `src/`: `npx vitest run __tests__/domains/emotion-provenance-window.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit del módulo puro**

```bash
git add src/domains/trading/services/emotion-provenance.ts src/__tests__/domains/emotion-provenance-window.test.ts
git commit -m "feat(trading): ventana de reconstruccion de emocion (7 dias, pura)"
```

- [ ] **Step 6: Escribir el test de procedencia y ventana ANTES de tocar el servicio**

Este test tiene que fallar contra el código **actual**, o no prueba que el defecto existiera. Crear `src/__tests__/services/emotion-capture-service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { updateTrade, captureEmotion } from "@/server/services/trades/trade-write-service"

function prismaWith(tradeDate: string) {
  const update = vi.fn().mockResolvedValue({
    id: "t1", tags: [], date: new Date(tradeDate + "T00:00:00Z"), status: "CLOSED",
    accountId: "a1", symbol: "NQ", direction: "LONG", session: "New York",
    entry: 1, stop: 0.99, size: 1, pnl: 10, rMultiple: 1,
    account: { id: "a1", initialBalance: 1000 }, setup: null, events: [],
  })
  return {
    prisma: {
      trade: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({ date: new Date(tradeDate + "T00:00:00Z") }),
        update,
      },
      market: { findFirst: vi.fn().mockResolvedValue(null) },
    } as never,
    update,
  }
}

const DENTRO = "2026-07-24"   // 3 días
const FUERA  = "2026-06-19"   // 38 días — el trade histórico más reciente de prod

describe("procedencia y ventana en el servicio de escritura", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-07-27T12:00:00Z")) })

  it("updateTrade marca como RECONSTRUIDA la emoción escrita después del momento", async () => {
    const { prisma, update } = prismaWith(DENTRO)
    await updateTrade(prisma, "u1", { id: "t1", emotionBefore: "anxious" })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ emotionBefore: "anxious", emotionSource: "reconstructed" }),
    }))
  })

  it("updateTrade RECHAZA escribir emoción fuera de ventana", async () => {
    const { prisma, update } = prismaWith(FUERA)
    await expect(updateTrade(prisma, "u1", { id: "t1", emotionBefore: "anxious" }))
      .rejects.toThrow(/EMOTION_WINDOW_CLOSED/)
    expect(update).not.toHaveBeenCalled()
  })

  it("captureEmotion dentro de ventana escribe marcada como reconstruida", async () => {
    const { prisma, update } = prismaWith(DENTRO)
    await captureEmotion(prisma, "u1", { tradeId: "t1", emotion: "anxious" })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: { emotionBefore: "anxious", emotionSource: "reconstructed" },
    }))
  })

  it("captureEmotion fuera de ventana rechaza y no escribe nada", async () => {
    const { prisma, update } = prismaWith(FUERA)
    await expect(captureEmotion(prisma, "u1", { tradeId: "t1", emotion: "anxious" }))
      .rejects.toThrow(/EMOTION_WINDOW_CLOSED/)
    expect(update).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 7: Correr y ver los cuatro rojos, que son cuatro rojos DISTINTOS**

Run desde `src/`: `npx vitest run __tests__/services/emotion-capture-service.test.ts`

Expected: 4 failed, y cada uno por su motivo — comprobarlos uno a uno, porque un rojo genérico no prueba el defecto que se cree estar arreglando:

| Test | Rojo esperado |
|---|---|
| `updateTrade` marca reconstruida | la llamada lleva `emotionBefore` **sin** `emotionSource` — el spread ciego de L277-280 |
| `updateTrade` rechaza fuera de ventana | `promise resolved … instead of rejecting` — **hoy se acepta**, que es el defecto |
| `captureEmotion` dentro | `captureEmotion is not a function` |
| `captureEmotion` fuera | `captureEmotion is not a function` |

Si el segundo test **no** da `instead of rejecting`, la ventana ya estaba aplicándose en algún sitio y este plan parte de un diagnóstico equivocado: parar y revisar.

> Si algún test revienta dentro de `serializeTrade` o de las automatizaciones post-update en lugar de en la aserción, ampliar el objeto que devuelve el mock `update` con los campos que falten — **nunca** relajar la aserción para que pase.

- [ ] **Step 8: `createTrade` marca `captured`**

En `trade-write-service.ts`, en el `prisma.trade.create` de `createTrade`, junto a donde ya se escribe `emotionBefore`, añadir:

```ts
      // Procedencia posicional: el alta es EL momento; si viene emoción, es capturada.
      emotionSource: input.emotionBefore != null ? "captured" : null,
```

- [ ] **Step 9: `closeTrade` marca `captured` y deja de sobreescribir**

Sustituir la línea 371 y su comentario por:

```ts
      // S2/OI-2: el cierre no revela nada nuevo sobre el estado con el que se
      // ENTRÓ, así que nunca puede pisar una emoción ya registrada al abrir.
      // El comentario prometía esto desde S2; el código sólo miraba el input.
      // Como consecuencia, si escribe, siempre es primera escritura ⇒ capturada.
      ...(input.emotionBefore != null && trade.emotionBefore == null
        ? { emotionBefore: input.emotionBefore, emotionSource: "captured" as const }
        : {}),
```

(`trade` es el `findUniqueOrThrow` de L344, ya disponible en el scope.)

- [ ] **Step 10: `updateTrade` marca `reconstructed` y respeta la ventana**

Sustituir el cuerpo inicial de `updateTrade` (L277-282) por:

```ts
export async function updateTrade(prisma: PrismaClient, userId: string, input: UpdateTradeInput): Promise<SerializedTrade> {
  const { id, ...rest } = input
  // El spread ciego no deja interceptar nada: la emoción se extrae para que la
  // regla de procedencia y la ventana no dependan de quién llame.
  const { emotionBefore, ...data } = rest

  if (emotionBefore !== undefined) {
    const current = await prisma.trade.findUniqueOrThrow({ where: { id, userId }, select: { date: true } })
    assertEmotionWindowOpen(current.date, new Date())
  }

  const trade = await prisma.trade.update({
    where: { id, userId },
    data: {
      ...data,
      // Toda escritura posterior al momento es reconstrucción — incluida la
      // corrección de una emoción ya registrada: no hay forma de distinguir
      // "me equivoqué de chip" de un recuerdo revisado a la luz del resultado.
      ...(emotionBefore !== undefined
        ? { emotionBefore, emotionSource: emotionBefore == null ? null : "reconstructed" as const }
        : {}),
    },
    include: { account: true, setup: true, events: true },
  })
```

El resto de la función queda igual.

Y añadir el guard cerca de los imports del fichero:

```ts
import { isWithinEmotionWindow, EMOTION_BACKFILL_WINDOW_DAYS } from "@/domains/trading/services/emotion-provenance"

/** La ventana la impone el SERVIDOR. La UI que esconde los chips es cortesía. */
function assertEmotionWindowOpen(tradeDate: Date, now: Date): void {
  if (!isWithinEmotionWindow(tradeDate, now)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `EMOTION_WINDOW_CLOSED:${EMOTION_BACKFILL_WINDOW_DAYS}`,
    })
  }
}
```

- [ ] **Step 11: Añadir `captureEmotion` al write service**

Al final de `trade-write-service.ts`:

```ts
export type CaptureEmotionInput = {
  tradeId: string
  emotion: EmotionBefore
}

/**
 * La vía dedicada de las superficies de backfill (panel del trade y review
 * semanal). No se reutiliza `updateTrade`: allí la emoción viaja entre otros
 * veinte campos y la regla se diluiría.
 */
export async function captureEmotion(prisma: PrismaClient, userId: string, input: CaptureEmotionInput): Promise<SerializedTrade> {
  const current = await prisma.trade.findUniqueOrThrow({
    where:  { id: input.tradeId, userId },
    select: { date: true },
  })
  assertEmotionWindowOpen(current.date, new Date())

  const trade = await prisma.trade.update({
    where:   { id: input.tradeId, userId },
    data:    { emotionBefore: input.emotion, emotionSource: "reconstructed" },
    include: { account: true, setup: true, events: true },
  })
  return serializeTrade(trade)
}
```

- [ ] **Step 12: Exponer la mutación en el router**

En `src/server/trpc/routers/trades.ts`, importar `captureEmotion` en el import de L8 y añadir la procedure junto a `saveChecklistResult`:

```ts
  // Backfill acotado: registrar la emoción de un trade ya cerrado, dentro de la
  // ventana de 7 días. La procedencia la pone el servidor ("reconstructed"), no
  // el cliente; el cliente no puede declararse "capturado".
  captureEmotion: protectedProcedure
    .input(z.object({
      tradeId: z.string().uuid(),
      emotion: z.enum(EMOTION_VALUES),
    }))
    .mutation(({ ctx, input }) => captureEmotion(ctx.prisma, ctx.userId, input)),
```

- [ ] **Step 13: Correr el test del Step 6 y ver los cuatro verdes**

Run desde `src/`: `npx vitest run __tests__/services/emotion-capture-service.test.ts`
Expected: 4 passed.

- [ ] **Step 14: Comprobar que `closeTrade` ya no pisa una emoción existente**

Añadir al mismo fichero de test:

```ts
  it("closeTrade no pisa la emoción registrada al abrir, y así su comentario deja de mentir", async () => {
    const { prisma, update } = prismaWith(DENTRO)
    prisma.trade.findUniqueOrThrow = vi.fn().mockResolvedValue({
      id: "t1", date: new Date(DENTRO + "T00:00:00Z"), direction: "LONG",
      entry: 1, stop: 0.99, size: 1, symbol: "NQ", accountId: "a1",
      emotionBefore: "calm",   // ya la registró al abrir
    })
    await closeTrade(prisma, "u1", { id: "t1", closePrice: 1.02, commission: 0, emotionBefore: "anxious" })
    const data = update.mock.calls[0][0].data
    expect(data).not.toHaveProperty("emotionBefore")
    expect(data).not.toHaveProperty("emotionSource")
  })
```

Importar `closeTrade` junto a los otros dos en la cabecera del fichero.

Run desde `src/`: `npx vitest run __tests__/services/emotion-capture-service.test.ts`
Expected: 5 passed.

> Este test es el que impide que vuelva el defecto que se arregla en el Step 9: el comentario de S2 prometía este comportamiento y el código no lo sostenía.

- [ ] **Step 15: Suite completa**

Run desde `src/`: `npm test`
Expected: 2 failed (`sentry-wiring`), el resto passed.

- [ ] **Step 16: Commit**

```bash
git add src/server/services/trades/trade-write-service.ts src/server/trpc/routers/trades.ts src/__tests__/
git commit -m "feat(trades): procedencia posicional y ventana de 7 dias en servidor"
```

---

## Task 4: El componente `EmotionCapture`

**Files:**
- Create: `src/components/trades/emotion-capture.tsx`
- Test: `src/__tests__/components/emotion-capture.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `trades.captureEmotion` (Task 3), `EMOTION_OPTIONS` de `@/domains/trading/emotions`.
- Produces: `<EmotionCapture tradeId={string} current={string | null} withinWindow={boolean} onCaptured?={() => void} />`

- [ ] **Step 1: Escribir el test**

Crear `src/__tests__/components/emotion-capture.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { EmotionCapture } from "@/components/trades/emotion-capture"

vi.mock("@/lib/trpc/client", () => ({
  trpc: { trades: { captureEmotion: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } },
}))

describe("EmotionCapture", () => {
  it("dentro de ventana ofrece los cinco chips", () => {
    render(<EmotionCapture tradeId="t1" current={null} withinWindow />)
    for (const label of ["Tranquilo", "Ansioso", "Eufórico", "Temeroso", "Sobreconfiado"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument()
    }
  })

  it("fuera de ventana y sin emoción no pinta nada", () => {
    const { container } = render(<EmotionCapture tradeId="t1" current={null} withinWindow={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("fuera de ventana con emoción muestra el valor sin chips", () => {
    render(<EmotionCapture tradeId="t1" current="anxious" withinWindow={false} />)
    expect(screen.getByText("Ansioso")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Correr y ver el rojo**

Run desde `src/`: `npx vitest run __tests__/components/emotion-capture.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/trades/emotion-capture"`.

- [ ] **Step 3: Implementar el componente**

Crear `src/components/trades/emotion-capture.tsx`:

```tsx
"use client"

// ─────────────────────────────────────────────────────────────────────────────
// EmotionCapture — el gesto, en un solo sitio.
//
// Se monta en el panel del trade cerrado y en la review semanal. Que exista
// evita que las dos superficies dupliquen los chips, la mutación y la regla de
// ventana, que es como este proyecto acabó con cinco variantes del bucle de
// candidatos de IA antes de #171.
//
// La ventana que este componente respeta es COMPORTAMIENTO DE UI. La regla la
// impone el servidor (`assertEmotionWindowOpen`): esconder los chips es
// cortesía, no control de acceso.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc/client"
import { EMOTION_OPTIONS, type EmotionBefore } from "@/domains/trading/emotions"

export function EmotionCapture({
  tradeId, current, withinWindow, onCaptured,
}: {
  tradeId:      string
  current:      string | null
  withinWindow: boolean
  onCaptured?:  () => void
}) {
  const [selected, setSelected] = useState<string | null>(current)
  const capture = trpc.trades.captureEmotion.useMutation({ onSuccess: () => onCaptured?.() })

  if (!withinWindow) {
    if (!selected) return null
    const label = EMOTION_OPTIONS.find(o => o.value === selected)?.label ?? selected
    return <span className="text-xs font-medium text-[var(--ink)]">{label}</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {EMOTION_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          disabled={capture.isPending}
          onClick={() => { setSelected(value); capture.mutate({ tradeId, emotion: value as EmotionBefore }) }}
          className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors disabled:opacity-50",
            selected === value
              ? "bg-[var(--be)] text-white"
              : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Correr y ver verde**

Run desde `src/`: `npx vitest run __tests__/components/emotion-capture.test.tsx`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/trades/emotion-capture.tsx src/__tests__/components/emotion-capture.test.tsx
git commit -m "feat(ui): componente EmotionCapture compartido por las dos superficies"
```

---

## Task 5: Superficie A — el trade cerrado deja de esconder el campo

**Files:**
- Modify: `src/components/trades/trade-detail-panel.tsx` (sección Psicología, L638-683)
- Modify: `src/components/trades/edit-trade-modal.tsx` (chips de emoción, ~L445)
- Test: `src/__tests__/components/trade-detail-psychology.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `EmotionCapture` (Task 4), `isWithinEmotionWindow` (Task 3).
- Produces: nada que consuman tareas posteriores.

- [ ] **Step 1: Escribir el test de la sección**

Crear `src/__tests__/components/trade-detail-psychology.test.tsx`. El test ejercita **la decisión de visibilidad**, extraída a una función pura para poder afirmarla sin montar el panel entero:

```ts
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
```

- [ ] **Step 2: Correr y ver el rojo**

Run desde `src/`: `npx vitest run __tests__/components/trade-detail-psychology.test.tsx`
Expected: FAIL — `shouldOfferEmotionCapture is not a function` / no exportada.

- [ ] **Step 3: Implementar el predicado y usarlo en la sección**

En `src/components/trades/trade-detail-panel.tsx`, añadir junto a los imports:

```ts
import { EmotionCapture } from "@/components/trades/emotion-capture"
import { isWithinEmotionWindow } from "@/domains/trading/services/emotion-provenance"

/**
 * Un trade cerrado sin emoción escondía la sección Psicología entera
 * (`if (!hasPsych) return null`): el producto ocultaba justo la casilla que
 * necesita. Se ofrece el gesto mientras la ventana siga abierta; cerrada, se
 * vuelve a callar, porque ahí ya no hay nada que ofrecer.
 */
export function shouldOfferEmotionCapture(
  trade: { status: string; emotionBefore: string | null; date: Date },
  now: Date,
): boolean {
  return trade.status === "CLOSED" && trade.emotionBefore == null && isWithinEmotionWindow(trade.date, now)
}
```

Y en la sección Psicología (L639-641), sustituir la guarda:

```tsx
      {(() => {
        const offerCapture = shouldOfferEmotionCapture(
          { status: trade.status, emotionBefore: trade.emotionBefore ?? null, date: new Date(trade.date) },
          new Date(),
        )
        const hasPsych = trade.emotionBefore || trade.confidenceRating != null || trade.executionQuality != null || trade.fomoFlag || trade.revengeFlag
        if (!hasPsych && !offerCapture) return null
```

Dentro del `<div>` del panel, encima del bloque `{trade.emotionBefore && (…)}`, añadir la oferta:

```tsx
              {offerCapture && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-[var(--ink-3)]">
                    ¿Cómo entraste a este trade? Puedes anotarlo durante 7 días.
                  </span>
                  <EmotionCapture tradeId={trade.id} current={null} withinWindow />
                </div>
              )}
```

- [ ] **Step 4: Correr y ver verde**

Run desde `src/`: `npx vitest run __tests__/components/trade-detail-psychology.test.tsx`
Expected: 4 passed.

- [ ] **Step 5: Cerrar el agujero del modal de edición**

En `src/components/trades/edit-trade-modal.tsx`, los chips de emoción (~L445) sólo se ofrecen dentro de ventana. Sin esto la ventana es decorativa: bastaría abrir el modal para anotar un trade de abril.

Añadir junto a los imports:

```ts
import { isWithinEmotionWindow } from "@/domains/trading/services/emotion-provenance"
```

El bloque actual (L445-458) es el `.map` de `EMOTION_OPTIONS`, precedido por un botón `—` que limpia el valor. Sustituir **desde el botón `—` hasta el cierre del `.map`** por:

```tsx
                {isWithinEmotionWindow(new Date(trade.date), new Date()) ? (
                  <>
                    <button
                      onClick={() => setEmotionBefore(null)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                        !emotionBefore
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                      )}
                    >
                      —
                    </button>
                    {EMOTION_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setEmotionBefore(value)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
                          emotionBefore === value
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--chip)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="text-[11px] text-[var(--ink-3)]">
                    La ventana para registrar la emoción se cerró (7 días desde la fecha del trade).
                  </p>
                )}
```

> El botón `—` (limpiar) también queda fuera de plazo, y es deliberado: borrar una emoción registrada en el momento es tan irreversible como inventarla, y fuera de ventana no hay forma de restituirla.

- [ ] **Step 6: Suite completa**

Run desde `src/`: `npm test`
Expected: 2 failed (`sentry-wiring`), el resto passed.

- [ ] **Step 7: Commit**

```bash
git add src/components/trades/trade-detail-panel.tsx src/components/trades/edit-trade-modal.tsx src/__tests__/
git commit -m "feat(ui): el trade cerrado ofrece la emocion en vez de esconder el campo"
```

---

## Task 6: Superficie B — la review semanal deja de dar una instrucción sin salida

**Files:**
- Modify: `src/server/services/reviews/report-data.ts` (`loadWeeklyReport` L16-29)
- Modify: `src/server/services/reviews/review-insights.ts` (`byEmotion`)
- Modify: `src/app/reviews/components/report/view-model.ts` (`ReviewReportVM`, `weeklyToVM`, `monthlyToVM`)
- Modify: `src/app/reviews/components/report/review-report-shell.tsx:89`
- Modify: `src/app/reviews/components/report/sections.tsx` (`PsychologyPanel` L226-244)
- Test: `src/__tests__/components/psychology-panel.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `EmotionCapture` (Task 4).
- Produces: `ReviewReportVM.pendingEmotion: { id: string; symbol: string; date: string }[]`.

> `TRADE_SELECT` (L14) **no incluye `id` ni `emotionBefore`** y alimenta la matemática del report. No ampliarlo: los pendientes van en una consulta aparte.
>
> `monthlyToVM` también construye un `ReviewReportVM`. La ventana es de 7 días, así que una review **mensual** no puede ofrecer el gesto para casi ninguno de sus trades: `monthlyToVM` pone `pendingEmotion: []`. No es un olvido.

- [ ] **Step 1: Escribir el test del panel**

Crear `src/__tests__/components/psychology-panel.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { PsychologyPanel } from "@/app/reviews/components/report/sections"

vi.mock("@/lib/trpc/client", () => ({
  trpc: { trades: { captureEmotion: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } },
}))

const money = (n: number) => `$${n.toFixed(0)}`

describe("PsychologyPanel", () => {
  it("sin emoción y con pendientes ofrece los chips en vez de la frase muerta", () => {
    render(<PsychologyPanel byEmotion={[]} money={money}
      pendingEmotion={[{ id: "t1", symbol: "NQ", date: "2026-07-24" }]} />)
    expect(screen.queryByText(/Registra tu estado emocional en los trades para ver este análisis/)).not.toBeInTheDocument()
    expect(screen.getByText(/NQ/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ansioso" })).toBeInTheDocument()
  })

  it("sin emoción y sin pendientes explica por qué no hay nada que hacer", () => {
    render(<PsychologyPanel byEmotion={[]} money={money} pendingEmotion={[]} />)
    expect(screen.getByText(/No registraste tu estado emocional/)).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("declara cuántas de cada emoción son reconstruidas", () => {
    render(<PsychologyPanel money={money} pendingEmotion={[]}
      byEmotion={[{ emotion: "calm", trades: 8, reconstructed: 2, winRate: 62, avgPnl: 120 }]} />)
    expect(screen.getByText(/2 reconstruidas/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Correr y ver el rojo**

Run desde `src/`: `npx vitest run __tests__/components/psychology-panel.test.tsx`
Expected: FAIL — el panel no acepta `pendingEmotion` y sigue pintando la frase muerta.

- [ ] **Step 3: Cargar los pendientes de la semana**

En `src/server/services/reviews/report-data.ts`, dentro del `Promise.all` de `loadWeeklyReport`, añadir una consulta:

```ts
    // Los trades de la semana a los que les falta la emoción. Consulta aparte:
    // TRADE_SELECT alimenta la matemática del report y no lleva id ni emoción.
    prisma.trade.findMany({
      where:   { userId, status: "CLOSED", date: { gte: weekStart, lt: weekEnd }, emotionBefore: null },
      select:  { id: true, symbol: true, date: true },
      orderBy: { date: "asc" },
    }),
```

Añadirlo a la desestructuración (`const [user, accounts, setups, weekRows, prevRows, saved, prevSaved, pendingEmotionRows] = …`) y devolverlo en el bundle:

```ts
    pendingEmotion: pendingEmotionRows.map(t => ({
      id: t.id, symbol: t.symbol, date: t.date.toISOString().slice(0, 10),
    })),
```

Extender el tipo `WeeklyReportBundle` con `pendingEmotion: { id: string; symbol: string; date: string }[]`.

- [ ] **Step 4: Contar reconstruidas en `byEmotion`**

`byEmotion` nace en `analytics-bundle.ts` y `review-insights.ts` sólo lo re-mapea. Hay que tocar los dos, o el campo se pierde por el camino.

En `src/domains/analytics/services/analytics-bundle.ts`, el tipo (L24):

```ts
export interface EmotionIntel { emotion: string; trades: number; reconstructed: number; avgPnl: number; winRate: number }
```

Y la construcción (L229-233):

```ts
  const byEmotion: EmotionIntel[] = [...emotions.entries()].map(([emotion, ts]) => ({
    emotion, trades: ts.length,
    // Cuántas de este grupo son recuerdo reconstruido. El número se muestra,
    // pero no se disfraza de lo que no es.
    reconstructed: ts.filter((t) => t.emotionSource === "reconstructed").length,
    avgPnl: round2(ts.reduce((s, t) => s + t.pnl, 0) / ts.length),
    winRate: round1(calcWinRate(ts.filter((t) => isWin({ pnl: t.pnl })).length, ts.length)),
  })).sort((a, b) => b.trades - a.trades)
```

En `src/server/services/reviews/review-insights.ts`, el tipo (L49):

```ts
  byEmotion:   { emotion: string; trades: number; reconstructed: number; avgPnl: number; winRate: number }[]
```

Y el re-mapeo (L61), que hoy descarta todo campo que no liste explícitamente:

```ts
    byEmotion:   b.psychology.byEmotion.slice(0, 6).map(e => ({ emotion: e.emotion, trades: e.trades, reconstructed: e.reconstructed, avgPnl: e.avgPnl, winRate: e.winRate })),
```

> Comprobar que la consulta que alimenta `analytics-bundle` selecciona `emotionSource`. Si el `select` de Prisma que construye esos `AnalyticsTrade` es explícito y no lo incluye, `t.emotionSource` llegará `undefined` y `reconstructed` saldrá **siempre 0** — un cero que parece un dato y es un campo que no se pidió.

- [ ] **Step 5: Llevarlo al VM**

En `src/app/reviews/components/report/view-model.ts`:

```ts
export interface ReviewReportVM {
  // … campos existentes …
  /**
   * Trades de la semana sin emoción, ofrecibles porque la semana de la review
   * ES la ventana de 7 días. Vacío en mensual: una review mensual abarca cuatro
   * semanas y casi ninguno de sus trades sigue en plazo.
   */
  pendingEmotion: { id: string; symbol: string; date: string }[]
}
```

`weeklyToVM` propaga `pendingEmotion: r.pendingEmotion`; `monthlyToVM` fija `pendingEmotion: []`.

- [ ] **Step 6: Pasarlo al panel**

En `review-report-shell.tsx:89`:

```tsx
          <PsychologyPanel byEmotion={vm.analytics.byEmotion} money={money} pendingEmotion={vm.pendingEmotion} />
```

- [ ] **Step 7: Reescribir `PsychologyPanel`**

En `sections.tsx`, sustituir la función completa (L226-244):

```tsx
export function PsychologyPanel({ byEmotion, money, pendingEmotion }: {
  byEmotion: Analytics["byEmotion"]
  money: Money
  pendingEmotion: { id: string; symbol: string; date: string }[]
}) {
  return (
    <Card>
      <Eyebrow>Psicología · emoción vs P&amp;L</Eyebrow>
      {byEmotion.length === 0 ? (
        // Este panel PEDÍA el gesto con una frase que no llevaba a ninguna
        // parte: para cuando el trader la leía, los trades de la semana ya
        // estaban cerrados y el nudge del cierre había desaparecido. La semana
        // de la review ES la ventana, así que aquí el gesto sí se puede hacer.
        pendingEmotion.length > 0 ? (
          <div className="mt-2 flex flex-col gap-3">
            <p className="text-sm text-[var(--ink-3)]">
              Aún puedes registrar cómo entraste a estos trades de la semana:
            </p>
            {pendingEmotion.map((t) => (
              <div key={t.id} className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-[var(--ink-2)]">{t.symbol} <span className="text-[var(--ink-3)]">· {t.date}</span></span>
                <EmotionCapture tradeId={t.id} current={null} withinWindow />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-3)] mt-1">
            No registraste tu estado emocional en los trades de esta semana, y la ventana de 7 días ya se cerró.
          </p>
        )
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          {byEmotion.map((e) => (
            <div key={e.emotion} className="flex items-center justify-between text-[12.5px]">
              <span className="text-[var(--ink-2)] capitalize">
                {e.emotion}{" "}
                <span className="text-[var(--ink-3)]">
                  · {e.trades}
                  {e.reconstructed > 0 && ` · ${e.reconstructed} reconstruidas`}
                  {" "}· WR {e.winRate}%
                </span>
              </span>
              <span className="num font-semibold" style={{ color: pnlColor(e.avgPnl) }}>
                {money(e.avgPnl)}<span className="text-[var(--ink-3)] font-normal">/trade</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
```

Importar `EmotionCapture` al principio de `sections.tsx`.

- [ ] **Step 8: Correr y ver verde**

Run desde `src/`: `npx vitest run __tests__/components/psychology-panel.test.tsx`
Expected: 3 passed.

- [ ] **Step 9: Suite completa + typecheck**

Run desde `src/`: `npm test`
Expected: 2 failed (`sentry-wiring`), el resto passed. Suite total ≈ **1413 → ~1440**.

Run desde `src/`: `npx tsc --noEmit`
Expected: sólo errores preexistentes de `@sentry/nextjs` y `puppeteer-core`.

Run desde `src/`: `npx eslint . --max-warnings=0`
Expected: sin errores.

- [ ] **Step 10: Commit y push**

```bash
git add src/server/services/reviews/ src/app/reviews/ src/__tests__/
git commit -m "feat(reviews): la review semanal ofrece el gesto en vez de una instruccion sin salida"
git push -u origin feat/captura-emocion-reconstruida
```

---

## Cierre: PR, CI y verificación en producción

- [ ] **Step 1: Abrir el PR**

```bash
gh pr create --title "feat: captura de emocion con procedencia, ventana y contrato de correlacion" --body "$(cat <<'EOF'
Cierra el hueco de la palanca A, con el enunciado corregido contra la BD.

## Qué se encontró

Los 52 trades "históricos sin emoción" NO son un trader que salta la casilla:
entraron en una carga masiva (47 en una sola hora, con 0 notas / 0 confianza /
0 calidad de ejecución a la vez), y `csv-import.ts` / `mt4-parser.ts` no
mencionan ningún campo psicológico. Nunca pasaron por un formulario.

Los dos defectos reales:
- `trade-detail-panel:640` escondía la sección Psicología justo cuando faltaba
  el dato (`if (!hasPsych) return null`).
- `PsychologyPanel` pedía el gesto con una frase sin salida: cuando el trader
  la leía, el nudge del cierre ya había desaparecido para siempre.

## Qué se construyó

- Columna `emotion_source` (`captured` | `reconstructed`), derivada por POSICIÓN
  en servidor. El cliente no la envía nunca.
- Ventana de 7 días anclada en `Trade.date` — la misma que agrupa la review
  semanal. Validada en servidor; la UI es cortesía.
- Los tres detectores de `category: "correlation"` (en DOS ficheros:
  `insights-engine.ts:172` se escapa si sólo se mira `psychology-insights.ts`)
  excluyen la emoción reconstruida, con un test que lo afirma sobre el registro
  completo y no detector por detector.
- Superficies A (panel del trade) y B (review semanal) sobre `EmotionCapture`.

De paso: `closeTrade` cumple por fin lo que su comentario prometía desde S2
(nunca pisar una emoción ya registrada al abrir); el código sólo miraba el input.

## Alcance declarado

Con ventana de 7 días **los 52 trades actuales no recuperan psicología nunca**
(el más reciente cerró hace 38 días). La pieza es hacia adelante, y la emoción
reconstruida no enciende los detectores por decisión explícita de diseño.

Suite 1413 → ~1440. Migración dual.
EOF
)"
```

- [ ] **Step 2: Esperar CI verde**

```bash
gh pr checks --watch
```

`gh run watch | tail` devuelve el exit code de `tail`, no el de `gh` — comprobar la conclusión por JSON:

```bash
gh run list --branch feat/captura-emocion-reconstruida --limit 1 --json conclusion,headSha,status
```

Expected: `"conclusion": "success"`. Incluye replay de migraciones desde cero (`FREEZE-P9`) y E2E autenticado.

> `gh` sufre timeouts TLS intermitentes en esta red. **Reintentar en bucle antes de diagnosticar.**

- [ ] **Step 3: Mergear**

```bash
gh pr merge --squash --delete-branch
```

- [ ] **Step 4: Esperar el `migrate-deploy` del SHA del merge**

`migrate-deploy` corre **sólo** en el run del SHA del merge a `main` (~5 min). Identificar ese run por `headSha == HEAD`:

```bash
git checkout main && git pull
gh run list --branch main --limit 5 --json databaseId,headSha,conclusion,name
```

Esperar `migrate-deploy: success` **en el run cuyo `headSha` coincide con `HEAD`**, no en el más reciente.

- [ ] **Step 5: Verificar la columna y el backfill en prod**

Por Supabase MCP (`execute_sql`, proyecto `jpojusluihjjsjvcubdp`):

```sql
select emotion_source, count(*)
from trades
group by 1 order by 2 desc;
```

Expected: `captured` = **15**, `NULL` = **53**. (15 y no 16: uno de los sintéticos no tiene emoción. 53 y no 52: el otro sintético sin emoción cuenta aquí.)

Y que la restricción existe:

```sql
select conname from pg_constraint where conrelid = 'trades'::regclass and conname = 'trades_emotion_source_check';
```

Expected: una fila.

- [ ] **Step 6: Verificación observable con Playwright**

Contra `https://www.tjournalx.com`, usuario QA `ariaoc89@gmail.com` / `S12bVerify!2026`.

Gotchas que cuestan tiempo si se ignoran:
- El botón "Iniciar sesión" **nace `disabled`** por hidratación: usar `press_sequentially` en los campos y esperar en bucle a que se habilite.
- Una **intervención activa** bloquea la app con overlay `fixed inset-0` sin salida y parece un cuelgue: detectar y pulsar "Seguir, asumo el riesgo".
- **No fiarse de heurísticas de "página vacía" sobre el texto del DOM. ABRIR LA CAPTURA.**

Comprobar dos cosas:
1. Un trade cerrado **con fecha dentro de los últimos 7 días** y sin emoción muestra la sección Psicología con los chips. Si no hay ninguno, crearlo desde la app y marcarlo (aria es el banco de simulación: los datos sintéticos ahí son su propósito, pero se marcan siempre y **no se tocan usuario, cuentas ni setups** — el E2E de CI depende de ellos).
2. La review de la semana en curso muestra los chips donde antes estaba *"Registra tu estado emocional en los trades para ver este análisis."*

- [ ] **Step 7: Actualizar el grafo**

**NO** commitear el resultado de `graphify update .` a secas: huerfaniza la capa semántica en silencio (INFERRED 125→53, doc→código 81→4) mientras los nodos suben, así que la guardia anti-shrink no lo frena.

```bash
graphify update .          # respalda el curado en graphify-out/<fecha>/
python graphify-merge-semantic.py <nuevo> <curado> <salida>
```

**Exigir INFERRED y doc→código ≥ los del curado antes de commitear.** `graphify merge-graphs` NO sirve: duplica.

- [ ] **Step 8: Resumen en tres ejes**

Cerrar con backend / observable-en-UI / razón de ser, y actualizar `docs/STATUS.md` con una sección de cabecera fechada.

---

## Notas de método para quien ejecute

- **Un grep de UNA forma concreta no prueba ausencia.** Este plan existe porque `detectEmotionPerformance` vive en otro fichero que los otros dos detectores de correlación. Antes de concluir "no hay más sitios", grepear los **imports** y abrir el consumidor.
- **Reintenta antes de diagnosticar.** `gh` y Playwright tiran timeouts TLS intermitentes en esta red; `curl` a secas da HTTP 000 (bloqueo de comprobación de revocación SSL) y funciona con `--ssl-no-revoke`.
- **Cuando dos superficies se contradigan, ir a la BD y adjudicar.** Es como se estableció que los 52 trades eran una carga masiva y no una conducta.
- **Verifica el rojo, y que sea el rojo correcto.** Un test que nunca se vio fallar no prueba nada.
