# Recuperación semántica consolidada + citación en el Coach — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un solo camino de recuperación semántica sobre ambos corpus que no pueda mentir, y cuya evidencia el trader pueda leer y abrir desde la conversación con el Coach.

**Architecture:** Módulo nuevo `src/server/services/retrieval/` con un pipeline genérico único (resolución de modelo, embedding, taxonomía de 5 estados, auto-reparación acotada, conformado del resultado) y un adaptador por corpus que aporta **consultas literales** — ningún identificador SQL se interpola. Los tres caminos duplicados de hoy (`embedding-service`, la inline de `coach-tools`, los dos scripts) se colapsan en él. El Coach pasa de dos tools a una con `corpus` enumerado, y emite las citas por una segunda trama NUL sobre el canal de transparencia que ya existe.

**Tech Stack:** TypeScript · Next.js 16 App Router · tRPC 11 · Prisma 7 (`$queryRaw` tagged templates) · Supabase Postgres 17 + pgvector · Vitest · React 19

## Global Constraints

- **Directorio de trabajo de todos los comandos: `src/`.** El `node_modules` real está ahí, no en la raíz.
- **Suite completa antes de cada push:** `pnpm exec vitest run`. Hoy 1269 tests. No un subconjunto.
- **Fallos locales que NO son regresiones:** 2 de `sentry-wiring` y 9 errores de `tsc`, por `@sentry/nextjs` y `puppeteer-core` ausentes de `node_modules`. En CI pasan. Si un fallo dice `Cannot find module` de esos dos, ignóralo.
- **TDD obligatorio en lo puro: verifica el ROJO antes de implementar.** Un test que nunca viste fallar no prueba nada.
- **Ningún identificador SQL (tabla o columna) se interpola jamás.** Sólo el vector y los parámetros, vía tagged template de Prisma.
- **Constantes únicas** (`SNIPPET_CHARS`, `REPAIR_BATCH`, `DEFAULT_LIMIT`, `MAX_LIMIT`) viven sólo en `types.ts`. Ningún número mágico duplicado.
- **Rama:** `feat/retrieval-semantica-coach` (ya creada, spec commiteado en `eb0f22f`).
- **Idioma:** todo el texto de cara al usuario y al LLM, en español.
- Spec de referencia: `docs/superpowers/specs/2026-07-23-recuperacion-semantica-coach-design.md`.

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `retrieval/types.ts` | Tipos y las 4 constantes. Sin lógica. |
| `retrieval/classify.ts` | **Puro.** Los 5 estados a partir de 5 booleanos/contadores. |
| `retrieval/shape.ts` | **Puro.** Orden por hit, dedup, truncado, redondeo. |
| `retrieval/corpora/trade-notes.ts` | Adaptador: consultas literales sobre `trades`. |
| `retrieval/corpora/resource-notes.ts` | Adaptador: consultas literales sobre `learning_resources`. |
| `retrieval/registry.ts` | `CORPORA` — el mapa de adaptadores. |
| `retrieval/pipeline.ts` | Impuro: orquesta modelo + embedding + reparación + adaptadores. |

**Fronteras de PR.** Tareas 1-6 → PR 1 (módulo, sin UI, mergeable sola). Tareas 7-11 → PR 2 (re-cableado). Tareas 12-15 → PR 3 (citas y deep-link).

---

# PR 1 — El módulo `retrieval` (sin UI)

### Task 1: Tipos y constantes

**Files:**
- Create: `src/server/services/retrieval/types.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `CorpusKey`, `RetrievalState`, `Citation`, `CorpusOutcome`, `SearchResult`, `IndexStatus`, `Hit`, `PendingRow`, `CorpusAdapter`, y las constantes `SNIPPET_CHARS = 240`, `REPAIR_BATCH = 50`, `DEFAULT_LIMIT = 5`, `MAX_LIMIT = 10`.

- [ ] **Step 1: Crear el fichero de tipos**

```ts
// src/server/services/retrieval/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Contratos de la recuperación semántica. Un adaptador por corpus aporta
// consultas LITERALES; el pipeline es genérico y único. Ver el spec
// 2026-07-23-recuperacion-semantica-coach-design.md §3.
// ─────────────────────────────────────────────────────────────────────────────
import type { PrismaClient } from "@/lib/generated/prisma/client"

/** Corpus indexables. Añadir uno = añadir un adaptador y registrarlo. */
export type CorpusKey = "trade_notes" | "learning_notes"

export const CORPUS_KEYS = ["trade_notes", "learning_notes"] as const

/**
 * Los 5 estados + OK. La regla vinculante (spec §6): sólo EMPTY_CORPUS y
 * NO_MATCHES pueden redactarse como ausencia. Los otros tres dicen
 * "no pude buscar", nunca "no hay".
 */
export type RetrievalState =
  | "OK"
  | "NO_KEY"
  | "EMBED_FAILED"
  | "NOT_INDEXED"
  | "EMPTY_CORPUS"
  | "NO_MATCHES"

/** Truncado del fragmento de nota. UNA sola constante: hoy hay deriva 200/240. */
export const SNIPPET_CHARS = 240
/** Tope de filas que la auto-reparación embebe por llamada. */
export const REPAIR_BATCH = 50
export const DEFAULT_LIMIT = 5
export const MAX_LIMIT = 10

export interface Citation {
  corpus:     CorpusKey
  id:         string
  label:      string   // "NQ · LONG" | título del recurso
  sublabel:   string   // "2026-07-21" | "LIBRO · EN_CURSO"
  outcome:    string   // "+2.1R · +$420" | "60% completado"
  positive:   boolean | null  // colorea el outcome; null = neutro
  snippet:    string
  similarity: number
  href:       string
}

export interface CorpusOutcome {
  corpus:    CorpusKey
  state:     RetrievalState
  /** Filas con texto y sin vector que siguen pendientes tras la reparación. */
  remaining: number
}

export interface SearchResult {
  citations: Citation[]
  /** Un estado POR corpus. Nunca se colapsan (spec §6). */
  outcomes:  CorpusOutcome[]
}

export interface IndexStatus {
  corpus:   CorpusKey
  total:    number
  withText: number
  embedded: number
}

export interface Hit { id: string; similarity: number }
export interface PendingRow { id: string; text: string }
export interface CorpusCounts { total: number; withText: number; embedded: number }

/**
 * Un adaptador NO lleva lógica: aporta consultas literales y forma.
 * `vec` llega ya formateado como "[0.1,0.2,…]" — el formateo vive en el pipeline.
 */
export interface CorpusAdapter<Row = never> {
  key:  CorpusKey
  /** Etiqueta humana para /perfil. */
  label: string
  knn(prisma: PrismaClient, userId: string, vec: string, limit: number): Promise<Hit[]>
  pending(prisma: PrismaClient, userId: string, limit: number): Promise<PendingRow[]>
  writeVector(prisma: PrismaClient, id: string, vec: string): Promise<void>
  counts(prisma: PrismaClient, userId: string): Promise<CorpusCounts>
  hydrate(prisma: PrismaClient, userId: string, ids: string[]): Promise<Row[]>
  rowId(row: Row): string
  toCitation(row: Row, similarity: number): Citation
}
```

- [ ] **Step 2: Verificar que compila**

Run (desde `src/`): `pnpm exec tsc --noEmit 2>&1 | grep retrieval`
Expected: sin salida (los 9 errores conocidos de sentry/puppeteer no mencionan `retrieval`).

- [ ] **Step 3: Commit**

```bash
git add src/server/services/retrieval/types.ts
git commit -m "feat(retrieval): contratos y constantes del modulo de recuperacion"
```

---

### Task 2: La taxonomía de 5 estados (el corazón, TDD)

**Files:**
- Create: `src/server/services/retrieval/classify.ts`
- Test: `src/__tests__/services/retrieval/classify.test.ts`

**Interfaces:**
- Consumes: `RetrievalState` de `types.ts`.
- Produces: `classify(input: ClassifyInput): RetrievalState` donde `ClassifyInput = { hasKey: boolean; embedOk: boolean; withText: number; embedded: number; hits: number }`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/services/retrieval/classify.test.ts
import { describe, it, expect } from "vitest"
import { classify } from "@/server/services/retrieval/classify"

const base = { hasKey: true, embedOk: true, withText: 10, embedded: 10, hits: 3 }

describe("classify — taxonomia de recuperacion", () => {
  it("sin clave gana sobre todo lo demas", () => {
    expect(classify({ ...base, hasKey: false })).toBe("NO_KEY")
    expect(classify({ hasKey: false, embedOk: false, withText: 0, embedded: 0, hits: 0 })).toBe("NO_KEY")
  })

  it("fallo de embedding gana sobre el estado del corpus", () => {
    expect(classify({ ...base, embedOk: false })).toBe("EMBED_FAILED")
    expect(classify({ ...base, embedOk: false, withText: 0 })).toBe("EMBED_FAILED")
  })

  it("sin texto escrito es EMPTY_CORPUS, no NOT_INDEXED", () => {
    expect(classify({ ...base, withText: 0, embedded: 0, hits: 0 })).toBe("EMPTY_CORPUS")
  })

  // ── EL test del sprint: el estado exacto de produccion hoy ──────────────────
  it("con texto y CERO vectores dice NOT_INDEXED, jamas NO_MATCHES", () => {
    expect(classify({ hasKey: true, embedOk: true, withText: 4, embedded: 0, hits: 0 })).toBe("NOT_INDEXED")
  })

  it("indexado a medias y sin hits dice NOT_INDEXED: no se busco en todo", () => {
    expect(classify({ hasKey: true, embedOk: true, withText: 4, embedded: 2, hits: 0 })).toBe("NOT_INDEXED")
  })

  it("indexado del todo y sin hits es la UNICA ausencia real", () => {
    expect(classify({ hasKey: true, embedOk: true, withText: 4, embedded: 4, hits: 0 })).toBe("NO_MATCHES")
  })

  it("con hits es OK aunque queden filas sin indexar", () => {
    expect(classify({ hasKey: true, embedOk: true, withText: 10, embedded: 6, hits: 2 })).toBe("OK")
  })
})
```

- [ ] **Step 2: Correr el test y VERIFICAR EL ROJO**

Run: `pnpm exec vitest run __tests__/services/retrieval/classify.test.ts`
Expected: FAIL — `Failed to resolve import "@/server/services/retrieval/classify"`.
**No sigas si no viste este rojo.**

- [ ] **Step 3: Implementar**

```ts
// src/server/services/retrieval/classify.ts
import type { RetrievalState } from "./types"

export interface ClassifyInput {
  hasKey:   boolean
  embedOk:  boolean
  withText: number
  embedded: number
  hits:     number
}

/**
 * El orden de las guardas ES la semántica.
 *
 * La distinción que este sprint existe para hacer: cuando hay texto pero faltan
 * vectores, la respuesta honesta es NOT_INDEXED ("no pude buscar en todo"), no
 * NO_MATCHES ("no hay nada parecido"). Colapsarlas es lo que hacía que el Coach
 * afirmara "no has anotado nada sobre eso" sobre un trader que sí había anotado.
 */
export function classify(input: ClassifyInput): RetrievalState {
  if (!input.hasKey)  return "NO_KEY"
  if (!input.embedOk) return "EMBED_FAILED"
  if (input.withText === 0) return "EMPTY_CORPUS"
  if (input.embedded === 0) return "NOT_INDEXED"
  if (input.hits > 0) return "OK"
  // Sin hits: sólo es ausencia real si se buscó sobre TODO el texto escrito.
  if (input.embedded < input.withText) return "NOT_INDEXED"
  return "NO_MATCHES"
}
```

- [ ] **Step 4: Correr el test y verificar el verde**

Run: `pnpm exec vitest run __tests__/services/retrieval/classify.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/retrieval/classify.ts src/__tests__/services/retrieval/classify.test.ts
git commit -m "feat(retrieval): taxonomia de 5 estados con su tabla de decision

El caso que da nombre al sprint: withText=4, embedded=0, hits=0 devuelve
NOT_INDEXED y jamas NO_MATCHES. Es el estado exacto de produccion hoy, y el
que hacia que el Coach narrara un [] como 'no has anotado nada sobre eso'."
```

---

### Task 3: Conformado del resultado (puro, TDD)

**Files:**
- Create: `src/server/services/retrieval/shape.ts`
- Test: `src/__tests__/services/retrieval/shape.test.ts`

**Interfaces:**
- Consumes: `Hit`, `Citation`, `SNIPPET_CHARS` de `types.ts`.
- Produces:
  - `orderByHits<Row>(hits: Hit[], rows: Row[], rowId: (r: Row) => string, toCitation: (r: Row, sim: number) => Citation): Citation[]`
  - `truncate(text: string, max?: number): string`
  - `roundSimilarity(n: number): number`
  - `dedupeCitations(cs: Citation[]): Citation[]`

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/services/retrieval/shape.test.ts
import { describe, it, expect } from "vitest"
import { orderByHits, truncate, roundSimilarity, dedupeCitations } from "@/server/services/retrieval/shape"
import type { Citation, Hit } from "@/server/services/retrieval/types"
import { SNIPPET_CHARS } from "@/server/services/retrieval/types"

type Row = { id: string; text: string }
const rowId = (r: Row) => r.id
const toCitation = (r: Row, sim: number): Citation => ({
  corpus: "trade_notes", id: r.id, label: r.id, sublabel: "", outcome: "",
  positive: null, snippet: r.text, similarity: sim, href: `/trades?trade=${r.id}`,
})

describe("shape — conformado del resultado", () => {
  it("respeta el orden del kNN, no el de la hidratacion", () => {
    const hits: Hit[] = [{ id: "c", similarity: 0.9 }, { id: "a", similarity: 0.8 }, { id: "b", similarity: 0.7 }]
    const rows: Row[] = [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }]
    expect(orderByHits(hits, rows, rowId, toCitation).map(c => c.id)).toEqual(["c", "a", "b"])
  })

  // ── Regresion del defecto de embedding-service.ts:58-64 ─────────────────────
  it("si una fila no hidrata, las demas CONSERVAN su similitud", () => {
    const hits: Hit[] = [{ id: "a", similarity: 0.9 }, { id: "b", similarity: 0.5 }, { id: "c", similarity: 0.1 }]
    const rows: Row[] = [{ id: "a", text: "A" }, { id: "c", text: "C" }] // "b" fue borrada
    const out = orderByHits(hits, rows, rowId, toCitation)
    expect(out.map(c => c.id)).toEqual(["a", "c"])
    // Con arrays paralelos, "c" habria heredado el 0.5 de "b".
    expect(out.map(c => c.similarity)).toEqual([0.9, 0.1])
  })

  it("trunca al limite unico y marca el corte", () => {
    const long = "x".repeat(SNIPPET_CHARS + 50)
    expect(truncate(long)).toHaveLength(SNIPPET_CHARS + 1) // + el caracter de elipsis
    expect(truncate(long).endsWith("…")).toBe(true)
    expect(truncate("corto")).toBe("corto")
  })

  it("redondea la similitud a 3 decimales", () => {
    expect(roundSimilarity(0.8765432)).toBe(0.877)
    expect(roundSimilarity(1)).toBe(1)
  })

  it("deduplica por (corpus, id) conservando la primera aparicion", () => {
    const a = toCitation({ id: "a", text: "A" }, 0.9)
    const dup = { ...a, similarity: 0.4 }
    const b = toCitation({ id: "b", text: "B" }, 0.8)
    const out = dedupeCitations([a, b, dup])
    expect(out.map(c => c.id)).toEqual(["a", "b"])
    expect(out[0].similarity).toBe(0.9)
  })

  it("el mismo id en corpus distintos NO se deduplica", () => {
    const t = toCitation({ id: "same", text: "T" }, 0.9)
    const l: Citation = { ...t, corpus: "learning_notes" }
    expect(dedupeCitations([t, l])).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Correr el test y VERIFICAR EL ROJO**

Run: `pnpm exec vitest run __tests__/services/retrieval/shape.test.ts`
Expected: FAIL — no se resuelve `@/server/services/retrieval/shape`.

- [ ] **Step 3: Implementar**

```ts
// src/server/services/retrieval/shape.ts
import { SNIPPET_CHARS, type Citation, type Hit } from "./types"

/**
 * Mapea hits→citas conservando el orden del kNN.
 *
 * Clave: la similitud se toma de un Map por id, NUNCA de un array paralelo.
 * `embedding-service.ts:58-64` filtraba `trades` y no `similarity`, así que una
 * fila que no hidratara desplazaba todas las siguientes.
 */
export function orderByHits<Row>(
  hits: Hit[],
  rows: Row[],
  rowId: (r: Row) => string,
  toCitation: (r: Row, similarity: number) => Citation,
): Citation[] {
  const byId = new Map(rows.map(r => [rowId(r), r]))
  const out: Citation[] = []
  for (const hit of hits) {
    const row = byId.get(hit.id)
    if (!row) continue
    out.push(toCitation(row, roundSimilarity(hit.similarity)))
  }
  return out
}

export function truncate(text: string, max: number = SNIPPET_CHARS): string {
  const t = (text ?? "").trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

export function roundSimilarity(n: number): number {
  return parseFloat(Number(n).toFixed(3))
}

export function dedupeCitations(cs: Citation[]): Citation[] {
  const seen = new Set<string>()
  return cs.filter(c => {
    const key = `${c.corpus}:${c.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
```

- [ ] **Step 4: Correr el test y verificar el verde**

Run: `pnpm exec vitest run __tests__/services/retrieval/shape.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/retrieval/shape.ts src/__tests__/services/retrieval/shape.test.ts
git commit -m "feat(retrieval): conformado puro + regresion de similitudes desalineadas

embedding-service.ts:58-64 filtraba `trades` por las filas que hidrataron y
dejaba `similarity` sin filtrar: dos arrays paralelos que se desplazan si un id
no hidrata, dando a cada trade la similitud del siguiente. orderByHits lo
elimina por construccion usando un Map por id."
```

---

### Task 4: Adaptador `trade_notes`

**Files:**
- Create: `src/server/services/retrieval/corpora/trade-notes.ts`

**Interfaces:**
- Consumes: `CorpusAdapter`, `Citation`, `Hit`, `PendingRow`, `CorpusCounts` de `types.ts`; `truncate` de `shape.ts`.
- Produces: `tradeNotesAdapter: CorpusAdapter<TradeRow>` con `TradeRow = { id, date, symbol, direction, pnl, rMultiple, notes }`.

- [ ] **Step 1: Implementar el adaptador**

```ts
// src/server/services/retrieval/corpora/trade-notes.ts
// Adaptador del corpus de notas de trades. Sólo consultas LITERALES y forma:
// ninguna decisión vive aquí (spec §3).
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { Citation, CorpusAdapter, CorpusCounts, Hit, PendingRow } from "../types"
import { truncate } from "../shape"

export interface TradeRow {
  id:        string
  date:      Date
  symbol:    string
  direction: string
  pnl:       unknown          // Prisma Decimal | null
  rMultiple: unknown          // Prisma Decimal | null
  notes:     string | null
}

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v)

export const tradeNotesAdapter: CorpusAdapter<TradeRow> = {
  key:   "trade_notes",
  label: "Notas de trades",

  async knn(prisma: PrismaClient, userId: string, vec: string, limit: number): Promise<Hit[]> {
    return prisma.$queryRaw<Hit[]>`
      SELECT id, (1 - (notes_embedding <=> ${vec}::vector)) AS similarity
      FROM trades
      WHERE user_id = ${userId}::uuid AND notes_embedding IS NOT NULL
      ORDER BY notes_embedding <=> ${vec}::vector
      LIMIT ${limit}`
  },

  async pending(prisma: PrismaClient, userId: string, limit: number): Promise<PendingRow[]> {
    return prisma.$queryRaw<PendingRow[]>`
      SELECT id, notes AS text FROM trades
      WHERE user_id = ${userId}::uuid AND notes <> '' AND notes_embedding IS NULL
      ORDER BY date DESC
      LIMIT ${limit}`
  },

  async writeVector(prisma: PrismaClient, id: string, vec: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE trades SET notes_embedding = ${vec}::vector WHERE id = ${id}::uuid`
  },

  async counts(prisma: PrismaClient, userId: string): Promise<CorpusCounts> {
    const rows = await prisma.$queryRaw<CorpusCounts[]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE notes <> '')::int AS "withText",
             COUNT(*) FILTER (WHERE notes_embedding IS NOT NULL)::int AS embedded
      FROM trades WHERE user_id = ${userId}::uuid`
    return rows[0] ?? { total: 0, withText: 0, embedded: 0 }
  },

  async hydrate(prisma: PrismaClient, userId: string, ids: string[]): Promise<TradeRow[]> {
    return prisma.trade.findMany({
      where:  { id: { in: ids }, userId },
      select: { id: true, date: true, symbol: true, direction: true, pnl: true, rMultiple: true, notes: true },
    }) as unknown as Promise<TradeRow[]>
  },

  rowId: (row: TradeRow) => row.id,

  toCitation(row: TradeRow, similarity: number): Citation {
    const pnl = num(row.pnl)
    const r   = num(row.rMultiple)
    const parts: string[] = []
    if (r !== null)   parts.push(`${r >= 0 ? "+" : ""}${r.toFixed(1)}R`)
    if (pnl !== null) parts.push(`${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toLocaleString("es")}`)
    return {
      corpus:     "trade_notes",
      id:         row.id,
      label:      `${row.symbol} · ${row.direction}`,
      sublabel:   new Date(row.date).toISOString().slice(0, 10),
      outcome:    parts.join(" · "),
      positive:   pnl === null ? null : pnl >= 0,
      snippet:    truncate(row.notes ?? ""),
      similarity,
      href:       `/trades?trade=${row.id}`,
    }
  },
}
```

- [ ] **Step 2: Verificar que compila**

Run: `pnpm exec tsc --noEmit 2>&1 | grep retrieval`
Expected: sin salida.

- [ ] **Step 3: Commit**

```bash
git add src/server/services/retrieval/corpora/trade-notes.ts
git commit -m "feat(retrieval): adaptador del corpus de notas de trades"
```

---

### Task 5: Adaptador `learning_notes` + registro + guarda de contrato

**Files:**
- Create: `src/server/services/retrieval/corpora/resource-notes.ts`
- Create: `src/server/services/retrieval/registry.ts`
- Test: `src/__tests__/services/retrieval/registry.test.ts`

**Interfaces:**
- Consumes: `CorpusAdapter`, `CORPUS_KEYS` de `types.ts`; `truncate` de `shape.ts`.
- Produces: `resourceNotesAdapter: CorpusAdapter<ResourceRow>`; `CORPORA: Record<CorpusKey, CorpusAdapter<never>>`; `getAdapter(key: CorpusKey)`.

- [ ] **Step 1: Escribir la guarda de contrato que falla**

```ts
// src/__tests__/services/retrieval/registry.test.ts
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

  it("learning_notes cita hacia /aprendizaje y se declara learning_notes", () => {
    const row = { id: "22222222-2222-2222-2222-222222222222", title: "Trading in the Zone", type: "LIBRO", status: "EN_CURSO", progressPct: 60, notes: "nota" }
    const c = getAdapter("learning_notes").toCitation(row as never, 0.9)
    expect(c.corpus).toBe("learning_notes")
    expect(c.href).toBe(`/aprendizaje?resource=${row.id}`)
    expect(c.label).toBe("Trading in the Zone")
  })
})
```

- [ ] **Step 2: Correr el test y VERIFICAR EL ROJO**

Run: `pnpm exec vitest run __tests__/services/retrieval/registry.test.ts`
Expected: FAIL — no se resuelve `@/server/services/retrieval/registry`.

- [ ] **Step 3: Implementar el adaptador de recursos**

```ts
// src/server/services/retrieval/corpora/resource-notes.ts
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { Citation, CorpusAdapter, CorpusCounts, Hit, PendingRow } from "../types"
import { truncate } from "../shape"

export interface ResourceRow {
  id:          string
  title:       string
  type:        string
  status:      string
  progressPct: number | null
  notes:       string | null
}

export const resourceNotesAdapter: CorpusAdapter<ResourceRow> = {
  key:   "learning_notes",
  label: "Apuntes de aprendizaje",

  async knn(prisma: PrismaClient, userId: string, vec: string, limit: number): Promise<Hit[]> {
    return prisma.$queryRaw<Hit[]>`
      SELECT id, (1 - (notes_embedding <=> ${vec}::vector)) AS similarity
      FROM learning_resources
      WHERE user_id = ${userId}::uuid AND notes_embedding IS NOT NULL
      ORDER BY notes_embedding <=> ${vec}::vector
      LIMIT ${limit}`
  },

  async pending(prisma: PrismaClient, userId: string, limit: number): Promise<PendingRow[]> {
    return prisma.$queryRaw<PendingRow[]>`
      SELECT id, notes AS text FROM learning_resources
      WHERE user_id = ${userId}::uuid AND notes <> '' AND notes_embedding IS NULL
      ORDER BY updated_at DESC
      LIMIT ${limit}`
  },

  async writeVector(prisma: PrismaClient, id: string, vec: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE learning_resources SET notes_embedding = ${vec}::vector WHERE id = ${id}::uuid`
  },

  async counts(prisma: PrismaClient, userId: string): Promise<CorpusCounts> {
    const rows = await prisma.$queryRaw<CorpusCounts[]>`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE notes <> '')::int AS "withText",
             COUNT(*) FILTER (WHERE notes_embedding IS NOT NULL)::int AS embedded
      FROM learning_resources WHERE user_id = ${userId}::uuid`
    return rows[0] ?? { total: 0, withText: 0, embedded: 0 }
  },

  async hydrate(prisma: PrismaClient, userId: string, ids: string[]): Promise<ResourceRow[]> {
    return prisma.learningResource.findMany({
      where:  { id: { in: ids }, userId },
      select: { id: true, title: true, type: true, status: true, progressPct: true, notes: true },
    }) as unknown as Promise<ResourceRow[]>
  },

  rowId: (row: ResourceRow) => row.id,

  toCitation(row: ResourceRow, similarity: number): Citation {
    return {
      corpus:     "learning_notes",
      id:         row.id,
      label:      row.title,
      sublabel:   `${row.type} · ${row.status}`,
      outcome:    row.progressPct === null ? "" : `${row.progressPct}% completado`,
      positive:   null,
      snippet:    truncate(row.notes ?? ""),
      similarity,
      href:       `/aprendizaje?resource=${row.id}`,
    }
  },
}
```

- [ ] **Step 4: Implementar el registro**

```ts
// src/server/services/retrieval/registry.ts
// Añadir un corpus = añadir su adaptador aquí. La guarda de contrato
// (__tests__/services/retrieval/registry.test.ts) falla si el adaptador está
// incompleto o registrado bajo la clave equivocada.
import type { CorpusAdapter, CorpusKey } from "./types"
import { tradeNotesAdapter } from "./corpora/trade-notes"
import { resourceNotesAdapter } from "./corpora/resource-notes"

export const CORPORA = {
  trade_notes:    tradeNotesAdapter,
  learning_notes: resourceNotesAdapter,
} as unknown as Record<CorpusKey, CorpusAdapter<never>>

export function getAdapter(key: CorpusKey): CorpusAdapter<never> {
  const a = CORPORA[key]
  if (!a) throw new Error(`Corpus desconocido: ${key}`)
  return a
}
```

- [ ] **Step 5: Correr el test y verificar el verde**

Run: `pnpm exec vitest run __tests__/services/retrieval/registry.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/services/retrieval/corpora/resource-notes.ts src/server/services/retrieval/registry.ts src/__tests__/services/retrieval/registry.test.ts
git commit -m "feat(retrieval): adaptador de apuntes de aprendizaje + registro con guarda de contrato"
```

---

### Task 6: El pipeline — búsqueda, auto-reparación y estado

**Files:**
- Create: `src/server/services/retrieval/pipeline.ts`
- Test: `src/__tests__/services/retrieval/pipeline.test.ts`

**Interfaces:**
- Consumes: `getAdapter`, `CORPORA`; `classify`; `orderByHits`, `dedupeCitations`; `resolveEmbeddingCall` (`@/lib/ai/resolve-provider`, devuelve `{provider, model, apiKey, source}` con `source: "user"|"env"|"none"`); `embedText` (`@/lib/ai/embeddings`, devuelve `number[] | null`); `logger` (`@/lib/logger`).
- Produces:
  - `search(prisma, userId, { query, corpus?, limit? }): Promise<SearchResult>`
  - `reindex(prisma, userId, { corpus?, limit? }): Promise<{ embedded: number; failed: number; remaining: number }>`
  - `indexStatus(prisma, userId): Promise<IndexStatus[]>`
  - `scheduleEmbedding(prisma, userId, corpus, id, text): void` — fire-and-forget, sustituye al de `embedding-service`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/services/retrieval/pipeline.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/ai/resolve-provider", () => ({ resolveEmbeddingCall: vi.fn() }))
vi.mock("@/lib/ai/embeddings", () => ({ embedText: vi.fn() }))

import { resolveEmbeddingCall } from "@/lib/ai/resolve-provider"
import { embedText } from "@/lib/ai/embeddings"
import { search } from "@/server/services/retrieval/pipeline"

const withKey  = { provider: "openai", model: "text-embedding-3-small", apiKey: "k", source: "user" } as const
const noKey    = { provider: "openai", model: "text-embedding-3-small", apiKey: "", source: "none" } as const
const prisma = {} as never

beforeEach(() => {
  vi.mocked(resolveEmbeddingCall).mockReset()
  vi.mocked(embedText).mockReset()
})

describe("pipeline.search", () => {
  it("sin clave devuelve NO_KEY por corpus y no llama a embedText", async () => {
    vi.mocked(resolveEmbeddingCall).mockResolvedValue(noKey as never)
    const out = await search(prisma, "u1", { query: "miedo", corpus: "trade_notes" })
    expect(out.citations).toEqual([])
    expect(out.outcomes).toEqual([{ corpus: "trade_notes", state: "NO_KEY", remaining: 0 }])
    expect(embedText).not.toHaveBeenCalled()
  })

  it("si el embedding falla devuelve EMBED_FAILED, no una ausencia", async () => {
    vi.mocked(resolveEmbeddingCall).mockResolvedValue(withKey as never)
    vi.mocked(embedText).mockResolvedValue(null)
    const out = await search(prisma, "u1", { query: "miedo", corpus: "trade_notes" })
    expect(out.outcomes[0].state).toBe("EMBED_FAILED")
  })

  it("con varios corpus reporta un estado POR corpus, sin colapsarlos", async () => {
    vi.mocked(resolveEmbeddingCall).mockResolvedValue(withKey as never)
    vi.mocked(embedText).mockResolvedValue([0.1, 0.2])
    const out = await search(prisma, "u1", { query: "plan" }) // sin corpus = todos
    expect(out.outcomes.map(o => o.corpus).sort()).toEqual(["learning_notes", "trade_notes"])
  })
})
```

> El implementador inyecta los adaptadores falsos como prefiera (p. ej. `vi.mock` sobre
> `@/server/services/retrieval/registry`) para los casos que necesiten `knn`/`counts`.
> Los tres tests de arriba deben pasar **sin** tocar el registro: cubren las salidas tempranas.

- [ ] **Step 2: Correr el test y VERIFICAR EL ROJO**

Run: `pnpm exec vitest run __tests__/services/retrieval/pipeline.test.ts`
Expected: FAIL — no se resuelve `@/server/services/retrieval/pipeline`.

- [ ] **Step 3: Implementar el pipeline**

```ts
// src/server/services/retrieval/pipeline.ts
// ─────────────────────────────────────────────────────────────────────────────
// Único camino de recuperación semántica. Resuelve el modelo, embebe, repara lo
// que falte (acotado), consulta cada corpus por su adaptador y conforma el
// resultado. Ningún estado se colapsa: cada corpus reporta el suyo (spec §6).
// ─────────────────────────────────────────────────────────────────────────────
import type { PrismaClient } from "@/lib/generated/prisma/client"
import { resolveEmbeddingCall } from "@/lib/ai/resolve-provider"
import { embedText } from "@/lib/ai/embeddings"
import { logger } from "@/lib/logger"
import { classify } from "./classify"
import { dedupeCitations, orderByHits } from "./shape"
import { CORPORA, getAdapter } from "./registry"
import {
  CORPUS_KEYS, DEFAULT_LIMIT, MAX_LIMIT, REPAIR_BATCH,
  type CorpusKey, type CorpusOutcome, type IndexStatus, type SearchResult,
} from "./types"

const toVec = (v: number[]): string => `[${v.join(",")}]`
const clamp = (n: number | undefined, def: number, max: number) =>
  Math.min(max, Math.max(1, Number(n) || def))

export interface SearchInput { query: string; corpus?: CorpusKey; limit?: number }

export async function search(
  prisma: PrismaClient, userId: string, input: SearchInput,
): Promise<SearchResult> {
  const keys: CorpusKey[] = input.corpus ? [input.corpus] : [...CORPUS_KEYS]
  const limit = clamp(input.limit, DEFAULT_LIMIT, MAX_LIMIT)

  const emb = await resolveEmbeddingCall(prisma, userId)
  if (emb.source === "none") {
    return { citations: [], outcomes: keys.map(c => ({ corpus: c, state: "NO_KEY" as const, remaining: 0 })) }
  }

  const vector = await embedText(input.query, { model: emb.model, apiKey: emb.apiKey })
  if (!vector) {
    return { citations: [], outcomes: keys.map(c => ({ corpus: c, state: "EMBED_FAILED" as const, remaining: 0 })) }
  }
  const vec = toVec(vector)

  const citations = []
  const outcomes: CorpusOutcome[] = []

  for (const key of keys) {
    const adapter = getAdapter(key)
    // Auto-reparación acotada ANTES de buscar: la feature no puede quedarse muda.
    const remaining = await repairCorpus(prisma, userId, key, emb.model, emb.apiKey)
    const counts = await adapter.counts(prisma, userId)
    const hits = counts.embedded > 0 ? await adapter.knn(prisma, userId, vec, limit) : []
    const rows = hits.length ? await adapter.hydrate(prisma, userId, hits.map(h => h.id)) : []
    citations.push(...orderByHits(hits, rows, adapter.rowId, adapter.toCitation))
    outcomes.push({
      corpus: key,
      state: classify({
        hasKey: true, embedOk: true,
        withText: counts.withText, embedded: counts.embedded, hits: hits.length,
      }),
      remaining,
    })
  }

  return {
    citations: dedupeCitations(citations).sort((a, b) => b.similarity - a.similarity).slice(0, limit),
    outcomes,
  }
}

/**
 * Embebe hasta REPAIR_BATCH filas pendientes. Devuelve cuántas SIGUEN pendientes
 * tras el intento: ese número viaja al llamante como `remaining` para que la tool
 * pueda decir "busqué, pero N no están indexadas". Sin eso, una reparación
 * acotada reintroduce la misma mentira a menor escala (spec §7).
 *
 * Concurrencia: dos búsquedas simultáneas pueden embeber la misma fila dos veces.
 * `pending` filtra IS NULL y `writeVector` es idempotente, así que el peor caso es
 * gasto duplicado, no corrupción. Asumido a propósito, sin lock.
 */
async function repairCorpus(
  prisma: PrismaClient, userId: string, key: CorpusKey, model: string, apiKey: string,
): Promise<number> {
  const adapter = getAdapter(key)
  try {
    const pending = await adapter.pending(prisma, userId, REPAIR_BATCH)
    for (const row of pending) {
      const v = await embedText(row.text, { model, apiKey })
      if (!v) continue
      await adapter.writeVector(prisma, row.id, toVec(v))
    }
    const after = await adapter.counts(prisma, userId)
    return Math.max(0, after.withText - after.embedded)
  } catch (err) {
    // Se reporta, NO se traga. Es la lección de #160 y del `catch {}` mudo de
    // embedding-service.ts:25 — la búsqueda sigue sobre lo que haya.
    logger.warn("retrieval: fallo la auto-reparacion", { corpus: key, err: String(err) })
    return 0
  }
}

export async function reindex(
  prisma: PrismaClient, userId: string, input?: { corpus?: CorpusKey; limit?: number },
): Promise<{ embedded: number; failed: number; remaining: number }> {
  const keys: CorpusKey[] = input?.corpus ? [input.corpus] : [...CORPUS_KEYS]
  const limit = clamp(input?.limit, REPAIR_BATCH, 500)
  const emb = await resolveEmbeddingCall(prisma, userId)
  if (emb.source === "none") return { embedded: 0, failed: 0, remaining: 0 }

  let embedded = 0, failed = 0, remaining = 0
  for (const key of keys) {
    const adapter = getAdapter(key)
    const pending = await adapter.pending(prisma, userId, limit)
    for (const row of pending) {
      const v = await embedText(row.text, { model: emb.model, apiKey: emb.apiKey })
      if (!v) { failed++; continue }
      await adapter.writeVector(prisma, row.id, toVec(v))
      embedded++
    }
    const after = await adapter.counts(prisma, userId)
    remaining += Math.max(0, after.withText - after.embedded)
  }
  return { embedded, failed, remaining }
}

export async function indexStatus(prisma: PrismaClient, userId: string): Promise<IndexStatus[]> {
  const out: IndexStatus[] = []
  for (const key of CORPUS_KEYS) {
    const counts = await CORPORA[key].counts(prisma, userId)
    out.push({ corpus: key, ...counts })
  }
  return out
}

/** Fire-and-forget tras escribir texto. Nunca lanza; loguea en vez de tragar. */
export function scheduleEmbedding(
  prisma: PrismaClient, userId: string, corpus: CorpusKey, id: string, text: string,
): void {
  if (!text.trim()) return
  void (async () => {
    try {
      const emb = await resolveEmbeddingCall(prisma, userId)
      if (emb.source === "none") return
      const v = await embedText(text, { model: emb.model, apiKey: emb.apiKey })
      if (!v) { logger.warn("retrieval: embedText devolvio null", { corpus, id }); return }
      await getAdapter(corpus).writeVector(prisma, id, toVec(v))
    } catch (err) {
      logger.warn("retrieval: scheduleEmbedding fallo", { corpus, id, err: String(err) })
    }
  })()
}
```

- [ ] **Step 4: Correr el test y verificar el verde**

Run: `pnpm exec vitest run __tests__/services/retrieval/pipeline.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Suite completa + tsc**

Run: `pnpm exec vitest run` y `pnpm exec tsc --noEmit`
Expected: los mismos fallos conocidos de sentry/puppeteer y **nada más**.

- [ ] **Step 6: Commit y abrir PR 1**

```bash
git add src/server/services/retrieval/pipeline.ts src/__tests__/services/retrieval/pipeline.test.ts
git commit -m "feat(retrieval): pipeline unico con auto-reparacion acotada

La reparacion devuelve cuantas filas SIGUEN pendientes; ese numero viaja al
llamante para que la tool pueda decir 'busque, pero N no estan indexadas'. Sin
eso una reparacion acotada reintroduce la misma mentira a menor escala."
git push -u origin feat/retrieval-semantica-coach
gh pr create --title "feat(retrieval): modulo unico de recuperacion semantica" --body "Ver docs/superpowers/specs/2026-07-23-recuperacion-semantica-coach-design.md. PR 1 de 3: modulo sin UI, mergeable solo."
```

---

# PR 2 — Re-cableado

### Task 7: Tool única del Coach con `corpus` enumerado

**Files:**
- Modify: `src/lib/ai/coach-tools.ts:71-79` (definición), `:105-113` (borrar), `:308-331` (reemplazar), `:433-456` (borrar), `:163` (firma)
- Modify: `src/__tests__/lib/coach-tools.test.ts` (lista de nombres + ~8 llamadas)

**Interfaces:**
- Consumes: `search` de `@/server/services/retrieval/pipeline`; `Citation`, `CorpusKey` de `../types`.
- Produces: `executeCoachTool(name, input, ctx): Promise<{ text: string; cites?: Citation[] }>`.

- [ ] **Step 1: Cambiar la definición de la tool**

Sustituye la entrada `semantic_search` (`:71-79`) por esta y **borra entera** la entrada `search_learning_resources` (`:105-113`):

```ts
  {
    name: "semantic_search",
    description: "Búsqueda semántica por SIGNIFICADO sobre lo que el trader ha escrito. Corpus: 'trade_notes' (notas de sus trades) y 'learning_notes' (apuntes de libros/cursos). Omite 'corpus' para buscar en todos. Útil para 'trades donde rompí mi plan por FOMO' o 'dónde anoté algo sobre gestión de riesgo'.",
    input_schema: {
      type: "object",
      properties: {
        query:  { type: "string", description: "Lo que se busca, en lenguaje natural" },
        corpus: { type: "string", enum: ["trade_notes", "learning_notes"], description: "Opcional. Omitir para buscar en todos." },
        limit:  { type: "number", description: "Máximo de resultados (1-10, por defecto 5)" },
      },
      required: ["query"],
    },
  },
```

- [ ] **Step 2: Cambiar la firma de `executeCoachTool` y envolver los retornos**

En `:163`, la firma pasa a:

```ts
export type ToolResult = { text: string; cites?: Citation[] }

/** Ejecuta una tool. `text` va al modelo; `cites` va al cliente (spec §5). */
export async function executeCoachTool(name: string, input: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult> {
```

Cada `return JSON.stringify(x)` existente pasa a `return { text: JSON.stringify(x) }`. **No cambies ningún payload**: sólo el envoltorio.

- [ ] **Step 3: Reemplazar la implementación de `semantic_search`**

Borra `:308-331` y `:433-456` completos y pon, en el sitio del primero:

```ts
    if (name === "semantic_search") {
      const query = String(input.query ?? "").trim()
      if (!query) return { text: JSON.stringify({ error: "Falta la consulta." }) }
      const corpus = typeof input.corpus === "string" ? input.corpus as CorpusKey : undefined
      if (corpus && corpus !== "trade_notes" && corpus !== "learning_notes") {
        return { text: JSON.stringify({ error: `Corpus desconocido: ${corpus}` }) }
      }
      const result = await search(prisma, userId, { query, corpus, limit: Number(input.limit) || undefined })
      return {
        text: JSON.stringify({
          resultados: result.citations.map(c => ({
            corpus: c.corpus, etiqueta: c.label, cuando: c.sublabel,
            desenlace: c.outcome, nota: c.snippet, similitud: c.similarity,
          })),
          // La redacción por estado. Sólo EMPTY_CORPUS y NO_MATCHES son ausencia.
          estado: result.outcomes.map(o => ({ corpus: o.corpus, ...explainState(o) })),
        }),
        cites: result.citations,
      }
    }
```

Y añade este helper junto a `executeCoachTool`:

```ts
/**
 * Traduce el estado a algo que el modelo pueda narrar sin mentir.
 * REGLA VINCULANTE (spec §6): sólo EMPTY_CORPUS y NO_MATCHES pueden redactarse
 * como ausencia. NO_KEY / EMBED_FAILED / NOT_INDEXED dicen "no pude buscar".
 */
function explainState(o: { state: string; remaining: number }): { pudeBuscar: boolean; explicacion: string } {
  switch (o.state) {
    case "NO_KEY":
      return { pudeBuscar: false, explicacion: "No pude buscar: no hay clave de embeddings configurada. Dile al trader que la configure en /perfil. NO afirmes que no ha escrito nada." }
    case "EMBED_FAILED":
      return { pudeBuscar: false, explicacion: "No pude buscar: fallo transitorio del proveedor de embeddings. Sugiere reintentar. NO afirmes que no ha escrito nada." }
    case "NOT_INDEXED":
      return { pudeBuscar: false, explicacion: `No pude buscar en todo: quedan ${o.remaining} textos sin indexar. NO afirmes que no ha escrito nada sobre el tema.` }
    case "EMPTY_CORPUS":
      return { pudeBuscar: true, explicacion: "El trader todavía no ha escrito nada en este corpus." }
    case "NO_MATCHES":
      return { pudeBuscar: true, explicacion: "Busqué sobre todo lo indexado y no hay nada parecido." }
    default:
      return { pudeBuscar: true, explicacion: o.remaining > 0 ? `Encontré resultados, pero quedan ${o.remaining} textos sin indexar.` : "Encontré resultados." }
  }
}
```

- [ ] **Step 4: Actualizar el test de nombres y las ~8 llamadas**

En `src/__tests__/lib/coach-tools.test.ts`, la lista de `:8-13` pierde `search_learning_resources`:

```ts
    expect(COACH_TOOLS.map(t => t.name)).toEqual([
      "get_account_detail", "get_setup_detail", "search_trades",
      "get_trade_detail", "get_period_stats", "semantic_search",
      "get_learning_resources", "get_study_agenda", "suggest_study",
      "get_recent_notifications", "propose_commitment", "propose_rule",
    ])
```

Cada `JSON.parse(await executeCoachTool(...))` pasa a `JSON.parse((await executeCoachTool(...)).text)`. Y añade:

```ts
  it("semantic_search rechaza un corpus desconocido", async () => {
    const out = JSON.parse((await executeCoachTool("semantic_search", { query: "x", corpus: "inventado" }, ctx({}))).text)
    expect(out.error).toMatch(/Corpus desconocido/)
  })
```

- [ ] **Step 5: Correr los tests**

Run: `pnpm exec vitest run __tests__/lib/coach-tools.test.ts`
Expected: PASS (9 tests: los 8 de antes con `.text` + el nuevo).

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/coach-tools.ts src/__tests__/lib/coach-tools.test.ts
git commit -m "feat(coach): una sola tool semantic_search con corpus enumerado

Desaparece search_learning_resources: con cinco corpus previstos, tools casi
identicas degradan la eleccion del modelo. Y explainState hace vinculante la
regla del spec §6 — NO_KEY/EMBED_FAILED/NOT_INDEXED dicen 'no pude buscar',
nunca 'no hay'. Es lo que hacia que el Coach narrara un [] como 'no has
anotado nada sobre eso'."
```

---

### Task 8: `coach-agent` emite la segunda trama con las citas

**Files:**
- Modify: `src/lib/ai/coach-agent.ts:37-38` (emisor), `:63-71` (Anthropic), `:92-99` y `:155-160` (OpenAI)

**Interfaces:**
- Consumes: `ToolResult` de `./coach-tools`.
- Produces: sobre el stream, dos tramas NUL por llamada — `{tool}` antes, `{cites}` después.

- [ ] **Step 1: Generalizar el emisor**

Sustituye `emitTool` (`:37-38`) por:

```ts
  // Eventos NUL-framed que el cliente separa del texto. Se emiten DOS por llamada:
  // {tool} antes de ejecutar (alimenta el indicador "consultando" mientras corre)
  // y {cites} después. Mover el primero detrás mataría esa señal de vida.
  const emit = (controller: ReadableStreamDefaultController<Uint8Array>, payload: object) =>
    controller.enqueue(encoder.encode(` ${JSON.stringify(payload)} `))
```

- [ ] **Step 2: Camino Anthropic**

En `:64-70`, el bucle pasa a:

```ts
            for (const block of final.content) {
              if (block.type === "tool_use") {
                emit(controller, { tool: block.name })
                const out = await executeCoachTool(block.name, block.input as Record<string, unknown>, tctx)
                if (out.cites?.length) emit(controller, { cites: out.cites })
                results.push({ type: "tool_result", tool_use_id: block.id, content: out.text })
              }
            }
```

- [ ] **Step 3: Camino OpenAI-compatible**

`runTool` (`:92-99`) cachea `ToolResult` en vez de `string`:

```ts
  const toolCache = new Map<string, ToolResult>()
  const runTool = async (name: string, args: Record<string, unknown>) => {
    const key = `${name}:${JSON.stringify(args)}`
    const hit = toolCache.get(key)
    if (hit != null) return hit
    const out = await executeCoachTool(name, args, tctx)
    toolCache.set(key, out)
    return out
  }
```

Y `:155-160`:

```ts
          for (const c of calls.values()) {
            let args: Record<string, unknown> = {}
            try { args = JSON.parse(c.args || "{}") } catch { /* ignore */ }
            emit(controller, { tool: c.name })
            const out = await runTool(c.name, args)
            if (out.cites?.length) emit(controller, { cites: out.cites })
            messages.push({ role: "tool", tool_call_id: c.id, content: out.text })
          }
```

Añade el import: `import { COACH_TOOLS, executeCoachTool, type ToolResult } from "./coach-tools"`.

- [ ] **Step 4: tsc**

Run: `pnpm exec tsc --noEmit 2>&1 | grep -E "coach-agent|coach-tools"`
Expected: sin salida.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/coach-agent.ts
git commit -m "feat(coach): segunda trama NUL con las citas, sin perder el chip inmediato"
```

---

### Task 9: Re-cablear tRPC y borrar `embedding-service` y los scripts

**Files:**
- Modify: `src/server/trpc/routers/trades.ts:4,171-183`
- Modify: `src/server/trpc/routers/learning-resources.ts:20,28`
- Modify: todo call-site de `scheduleEmbedding` en `src/server/services/trades/trade-write-service.ts`
- Delete: `src/server/services/trades/embedding-service.ts`, `src/scripts/backfill-embeddings.mjs`, `src/scripts/backfill-resource-embeddings.mjs`

- [ ] **Step 1: Localizar los call-sites antes de borrar**

Run: `grep -rn "embedding-service\|scheduleEmbedding" src --include=*.ts --include=*.tsx | grep -v generated`
Expected: la lista exacta a re-cablear. **Abre cada consumidor**; no te fíes del grep del nombre.

- [ ] **Step 2: Re-cablear `trades.ts`**

Import: `import { search, reindex } from "@/server/services/retrieval/pipeline"` (borra el de `embedding-service`). Y `:171-183`:

```ts
  // Búsqueda semántica (pgvector). Se conserva sin consumidor de UI a propósito:
  // da una vía de verificación independiente del LLM.
  semanticSearch: protectedProcedure
    .input(z.object({
      query:  z.string().min(1).max(500),
      corpus: z.enum(["trade_notes", "learning_notes"]).optional(),
      limit:  z.number().int().min(1).max(10).default(5),
    }))
    .query(({ ctx, input }) => search(ctx.prisma, ctx.userId, input)),

  backfillEmbeddings: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).default(200) }).optional())
    .mutation(({ ctx, input }) => reindex(ctx.prisma, ctx.userId, { limit: input?.limit ?? 200 })),
```

- [ ] **Step 3: Re-cablear `learning-resources.ts`**

Sustituye la escritura inline de `:20-30` por `scheduleEmbedding(prismaClient, userId, "learning_notes", resourceId, notes)`, y el `SET notes_embedding = NULL` (`:20`) se conserva tal cual — sigue siendo la invalidación correcta al cambiar el texto.

- [ ] **Step 4: Re-cablear `trade-write-service.ts`**

Cada `scheduleEmbedding(prisma, userId, tradeId, notes)` pasa a `scheduleEmbedding(prisma, userId, "trade_notes", tradeId, notes)`, importado del pipeline.

- [ ] **Step 5: Borrar lo muerto**

```bash
git rm src/server/services/trades/embedding-service.ts src/scripts/backfill-embeddings.mjs src/scripts/backfill-resource-embeddings.mjs
```

- [ ] **Step 6: Suite completa + tsc**

Run: `pnpm exec vitest run` y `pnpm exec tsc --noEmit`
Expected: sólo los fallos conocidos de sentry/puppeteer.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(retrieval): un solo dueno de notes_embedding

Se borran embedding-service y los dos scripts standalone: la app pasa a tener
la superficie que ellos suplian. La resolucion del modelo de embeddings deja de
vivir en cuatro copias — que es lo que dejo muda a search_learning_resources
cuando #156 arreglo a su gemela."
```

---

### Task 10: `aiConfig.indexStatus` + `aiConfig.reindex`

**Files:**
- Modify: `src/server/trpc/routers/ai-config.ts` (tras `healthCheck`, `:129`)

- [ ] **Step 1: Añadir las procedures**

```ts
  // Estado real de indexación por corpus. El diagnóstico de arriba comprueba que
  // hay clave y que el proveedor responde; esto comprueba lo otro: si existe
  // algún vector. Sin esto la feature figura activa sin estarlo.
  indexStatus: protectedProcedure
    .query(({ ctx }) => indexStatus(ctx.prisma, ctx.userId)),

  reindex: protectedProcedure
    .input(z.object({
      corpus: z.enum(["trade_notes", "learning_notes"]).optional(),
      limit:  z.number().int().min(1).max(500).default(200),
    }).optional())
    .mutation(({ ctx, input }) => reindex(ctx.prisma, ctx.userId, input)),
```

Import: `import { indexStatus, reindex } from "@/server/services/retrieval/pipeline"`.

- [ ] **Step 2: tsc**

Run: `pnpm exec tsc --noEmit 2>&1 | grep ai-config`
Expected: sin salida.

- [ ] **Step 3: Commit**

```bash
git add src/server/trpc/routers/ai-config.ts
git commit -m "feat(perfil): procedures de estado de indexacion y reindexado"
```

---

### Task 11: Bloque "Indexación semántica" en `/perfil`

**Files:**
- Modify: `src/app/perfil/components/ai-models-card.tsx` (tras el bloque "Diagnóstico IA", `:227`)

- [ ] **Step 1: Añadir el bloque**

Junto a `healthMut` (`:80`), añade:

```tsx
  const { data: indexRows = [], refetch: refetchIndex } = trpc.aiConfig.indexStatus.useQuery()
  const reindexMut = trpc.aiConfig.reindex.useMutation({ onSuccess: () => { void refetchIndex() } })
```

Y tras el bloque de "Diagnóstico IA":

```tsx
      {/* ── Indexación semántica ── */}
      <div style={{ marginTop: 20 }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Indexación semántica</p>
          <button
            onClick={() => reindexMut.mutate({})}
            disabled={reindexMut.isPending}
            className="inline-flex items-center h-7 px-2.5 rounded-full text-[12px] font-medium bg-[var(--panel)] border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors active:scale-[0.97] disabled:opacity-50"
          >
            {reindexMut.isPending ? "Indexando…" : "Indexar ahora"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
          Cuántas de tus notas puede encontrar el Coach por significado.
        </p>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {indexRows.map(row => {
            const done = row.withText > 0 && row.embedded >= row.withText
            return (
              <div key={row.corpus} className="flex items-center justify-between">
                <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                  {row.corpus === "trade_notes" ? "Notas de trades" : "Apuntes de aprendizaje"}
                </span>
                <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 700, color: done ? "var(--win)" : "var(--ink-3)" }}>
                  {row.embedded}/{row.withText} indexadas
                </span>
              </div>
            )
          })}
        </div>
        {reindexMut.data && (
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>
            Indexadas {reindexMut.data.embedded} · fallaron {reindexMut.data.failed} · quedan {reindexMut.data.remaining}
          </p>
        )}
      </div>
```

- [ ] **Step 2: Verificar en el navegador**

Arranca la app y abre `/perfil`. Expected: dos filas — `Notas de trades 16/16` en verde y `Apuntes de aprendizaje 0/4` en gris.

- [ ] **Step 3: Suite completa, commit y abrir PR 2**

```bash
pnpm exec vitest run
git add src/app/perfil/components/ai-models-card.tsx
git commit -m "feat(perfil): bloque de indexacion semantica por corpus"
git push
```

---

# PR 3 — Citas abribles y deep-link

### Task 12: `trades.byId`

**Files:**
- Modify: `src/server/services/trades/trade-read-service.ts` (añadir `getTradeById`)
- Modify: `src/server/trpc/routers/trades.ts`

**Interfaces:**
- Produces: `getTradeById(prisma, userId, id): Promise<SerializedTrade | null>`; procedure `trades.byId`.

- [ ] **Step 1: Añadir el servicio**

En `trade-read-service.ts`, reutilizando el `include` y el `serializeTrade` que ya usa `listTrades`:

```ts
/** Un trade por id. Necesario para el deep-link: `list` pagina de 50 y el trade
 *  citado por el Coach puede no estar en la página cargada. */
export async function getTradeById(prisma: PrismaClient, userId: string, id: string) {
  const trade = await prisma.trade.findFirst({
    where:   { id, userId },
    include: { account: true, setup: true, events: { orderBy: { timestamp: "asc" } } },
  })
  return trade ? serializeTrade(trade) : null
}
```

- [ ] **Step 2: Exponerlo**

En `trades.ts`:

```ts
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => getTradeById(ctx.prisma, ctx.userId, input.id)),
```

- [ ] **Step 3: tsc + commit**

Run: `pnpm exec tsc --noEmit 2>&1 | grep trades`
Expected: sin salida.

```bash
git add src/server/services/trades/trade-read-service.ts src/server/trpc/routers/trades.ts
git commit -m "feat(trades): procedure byId para el deep-link de las citas"
```

---

### Task 13: Tarjetas de cita en el drawer

**Files:**
- Modify: `src/components/ai-coach/ai-coach-drawer.tsx:17` (tipo del mensaje), `:200-230` (parser), `:453-465` (render)

- [ ] **Step 1: Ensanchar el tipo del mensaje y el parser**

En `:17`, junto a `tools?: string[]`, añade `cites?: Citation[]` (importa el tipo de `@/server/services/retrieval/types`).

En el parser (`:219`), la trama pasa a llevar cualquiera de las dos formas:

```tsx
            const ev = JSON.parse(buf.slice(start + 1, end)) as { tool?: string; cites?: Citation[] }
            if (ev.tool) newTools.push(ev.tool)
            if (ev.cites?.length) newCites.push(...ev.cites)
```

Declara `newCites: Citation[] = []` junto a `newTools`, y en el `setMessages` (`:228`) acumula y deduplica:

```tsx
            ? { ...m,
                content: m.content + text,
                tools:   [...(m.tools ?? []), ...newTools],
                cites:   dedupeById([...(m.cites ?? []), ...newCites]) }
```

con un helper local:

```tsx
function dedupeById(cs: Citation[]): Citation[] {
  const seen = new Set<string>()
  return cs.filter(c => {
    const k = `${c.corpus}:${c.id}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
```

- [ ] **Step 2: Renderizar las tarjetas bajo los chips**

Tras el bloque de chips (`:453-465`):

```tsx
                    {isAssistant && m.cites && m.cites.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        <p className="text-[10px] uppercase tracking-[.07em] text-[var(--ink-3)]">
                          Tus notas en las que me apoyo
                        </p>
                        {m.cites.map(c => (
                          <CiteCard key={`${c.corpus}:${c.id}`} cite={c} />
                        ))}
                      </div>
                    )}
```

Y el componente, al final del fichero:

```tsx
function CiteCard({ cite }: { cite: Citation }) {
  const [open, setOpen] = useState(false)
  const outcomeColor = cite.positive === null ? "var(--ink-3)" : cite.positive ? "var(--win)" : "var(--loss)"
  return (
    <div className="rounded-[var(--radius-xs)] border border-[var(--line-2)] bg-[var(--panel)] p-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-bold text-[var(--ink)]">{cite.label}</span>
        {cite.outcome && (
          <span className="font-mono text-[12px] font-bold" style={{ color: outcomeColor }}>{cite.outcome}</span>
        )}
      </div>
      <p className="text-[11px] text-[var(--ink-3)]">{cite.sublabel}</p>
      <p className={cn("text-[12px] text-[var(--ink-2)] mt-1", !open && "line-clamp-2")}>{cite.snippet}</p>
      <div className="flex items-center gap-3 mt-1.5">
        <button onClick={() => setOpen(o => !o)} className="text-[11px] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors">
          {open ? "Menos" : "Leer entera"}
        </button>
        <a href={cite.href} className="text-[11px] font-medium text-[var(--accent)] hover:underline">
          Abrir
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ai-coach/ai-coach-drawer.tsx
git commit -m "feat(coach): tarjetas de cita abribles bajo la respuesta"
```

---

### Task 14: Deep-link en `/trades` y `/aprendizaje`

**Files:**
- Modify: `src/app/trades/page.tsx:27`
- Modify: `src/app/aprendizaje/page.tsx` (junto a `:38-42`)

- [ ] **Step 1: `/trades?trade=<id>`**

Junto a `selectedId` (`:27`), siguiendo el patrón client-only de `aprendizaje:38-42`:

```tsx
  // Deep-link via ?trade= (client-only — mismo patron que /aprendizaje:38).
  const [deepLinkId, setDeepLinkId] = useState<string | null>(null)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("trade")
    if (id) { setSelectedId(id); setDeepLinkId(id) }
  }, [])

  // `list` pagina de 50: el trade citado puede no estar cargado.
  const inList = trades.some(t => t.id === deepLinkId)
  const { data: deepLinkTrade } = trpc.trades.byId.useQuery(
    { id: deepLinkId! },
    { enabled: !!deepLinkId && !inList },
  )
```

Y en el `useMemo` del trade seleccionado (`:177-178`):

```tsx
  const selected = useMemo(
    () => trades.find(t => t.id === selectedId) ?? (selectedId === deepLinkId ? deepLinkTrade ?? null : null),
    [trades, selectedId, deepLinkId, deepLinkTrade],
  )
```

- [ ] **Step 2: `/aprendizaje?resource=<id>`**

Junto al `useEffect` de `?tab=` (`:39-42`), sin necesidad de fetch por id — `learningResources.list` (`:51`) trae todo:

```tsx
  // Deep-link via ?resource= (citas del Coach). Mismo patron client-only.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("resource")
    if (!id || !rawResources.length) return
    const r = rawResources.find(x => x.id === id)
    if (r) { setTab("biblioteca"); setDrawerResource(r) }
  }, [rawResources])
```

- [ ] **Step 3: Suite completa + tsc**

Run: `pnpm exec vitest run` y `pnpm exec tsc --noEmit`
Expected: sólo los fallos conocidos.

- [ ] **Step 4: Commit**

```bash
git add src/app/trades/page.tsx src/app/aprendizaje/page.tsx
git commit -m "feat(nav): deep-link ?trade= y ?resource= para las citas del Coach"
```

---

### Task 15: Verificación contra producción y en vivo

**Files:** ninguno — es verificación.

- [ ] **Step 1: Mergear y esperar el despliegue**

```bash
gh pr merge --squash
gh run list --limit 5
```

**Identifica el run por `headSha == HEAD`**, no el primero de la lista: `gh run list` justo tras mergear suele cazar un run anterior. Espera `migrate-deploy: success` de **ese** run (~5 min).

- [ ] **Step 2: Reindexar los recursos y comprobar que el contador se mueve**

Abre `/perfil` y pulsa "Indexar ahora". Después, por Supabase MCP (`project_id: jpojusluihjjsjvcubdp`):

```sql
select count(*) filter (where notes <> '') as with_notes,
       count(notes_embedding)              as embedded
from learning_resources;
```

Expected: `with_notes = 4`, `embedded = 4`. **Antes era 4 y 0** — es el criterio de éxito §10.

- [ ] **Step 3: Aserción de búsqueda con respuesta conocida**

Llama a `trades.semanticSearch` con `query: "entré antes de tiempo fuera de plan"`.
Expected: el primer resultado es la nota *"Ya llevaba horas delante. Entré fuera de plan, buscando algo que no estaba ahí."* — el par que #156 dejó establecido. Si no sale primero, **para y diagnostica**: no lo declares fallo transitorio sin reintentar.

- [ ] **Step 4: En vivo con Playwright**

**Primero comprueba que no haya una intervención activa** — el overlay `fixed inset-0` no tiene salida salvo "Detener por hoy" / "Seguir, asumo el riesgo", y cualquier automatización muere ahí pareciendo un cuelgue.

Abre el drawer del Coach y pregunta *"¿cuándo he entrado fuera de plan por impaciencia?"*. Expected: el chip `consultó semantic_search`, tarjetas de cita bajo la respuesta con símbolo, fecha, R/P&L y fragmento, y que "Abrir" navegue a `/trades?trade=<id>` con el panel de detalle desplegado. **Abre la captura y míralo** — no te fíes de heurísticas sobre el texto del DOM.

- [ ] **Step 5: Actualizar el grafo de graphify**

`graphify update .` a secas huerfaniza la capa semántica en silencio mientras los nodos suben. Mide antes y después, restaura el curado (`git checkout -- graphify-out/` o el respaldo en `graphify-out/<fecha>/`) y fusiona preservando la capa semántica. **No commitees el resultado a secas.**

- [ ] **Step 6: Actualizar `docs/STATUS.md`**

Corrige la afirmación *"`semanticSearch` y `backfillEmbeddings` siguen expuestos sólo en tRPC, sin ningún consumidor"* — era literalmente cierta pero engañosa, y ahora es falsa. Registra: la consolidación, el defecto de similitudes desalineadas, y que `/api/ai-embed` queda como deuda residual declarada.

---

## Auto-revisión del plan

**Cobertura del spec:**

| Sección del spec | Tarea |
|---|---|
| §3 A′ registro + adaptadores | 1, 4, 5 |
| §4 consolidación y borrados | 9 |
| §5 tool única, dos tramas, forma de cita | 7, 8, 13 |
| §5 navegación / `trades.byId` | 12, 14 |
| §6 taxonomía de 5 estados | 2, 7 (`explainState`) |
| §6 estado por corpus sin colapsar | 6 (`search`), test de pipeline |
| §7 auto-reparación + `remaining` | 6 (`repairCorpus`) |
| §7 `/perfil` | 10, 11 |
| §8 regresión de similitudes | 3 |
| §8 guarda de contrato de adaptadores | 5 |
| §8 verificación en prod + Playwright | 15 |
| §10 criterios de éxito | 15 |

**Sin placeholders.** Todo paso que cambia código lleva el código.

**Consistencia de tipos:** `CorpusKey`, `Citation`, `CorpusOutcome`, `SearchResult`, `IndexStatus`, `Hit`, `PendingRow`, `CorpusCounts`, `CorpusAdapter` se definen en la Task 1 y se usan con esos nombres exactos en 4, 5, 6, 7, 13. `executeCoachTool` devuelve `ToolResult` desde la Task 7 y se consume así en la 8. `scheduleEmbedding` gana el parámetro `corpus` en la 6 y todos sus call-sites se actualizan en la 9.
