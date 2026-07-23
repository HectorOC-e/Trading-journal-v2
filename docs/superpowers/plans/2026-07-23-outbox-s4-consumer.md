# Primer consumidor S4 del outbox — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estrenar el outbox de eventos con dos consumidores reales (memoria episódica + notificación), resolviendo el gap de registro de handlers por inyección, y re-agendar el cron.

**Architecture:** `dispatchPending` deja de leer un `Map` mutable global y pasa a recibir un mapa estático `HANDLERS` (inyección, opción B del spec). El claim se restringe a los tipos con handler, así que un tipo sin consumidor queda `pending` (replayable) en vez de quemarse. Dos handlers puros por lo demás: `commitment.*` → episodio de memoria (idempotente por `sourceId=event.id`), `insight.created` → notificación (idempotente gratis por `dedupeKey`).

**Tech Stack:** TypeScript · Next.js 16 App Router · tRPC 11 · Prisma 7 (`$queryRaw`) · Supabase Postgres 17 + `pg_cron`/`pg_net` · Vitest

## Global Constraints

- **Directorio de trabajo de todos los comandos: `src/`.** El `node_modules` real está ahí.
- **Suite completa antes de cada push:** `pnpm exec vitest run`. Hoy 1301. No un subconjunto.
- **Fallos locales que NO son regresiones:** 2 de `sentry-wiring` y 9 de `tsc`, por `@sentry/nextjs` y `puppeteer-core` ausentes. En CI pasan.
- **TDD en lo puro: verifica el ROJO antes de implementar.**
- **Los handlers NO tragan sus errores** — dejan que suban para que `planEventTransition` decida el reintento. El único error que se traga es el embedding best-effort de la memoria.
- **`FREEZE-D1/D6` intactos:** cambia la *firma* de `dispatchPending`, no el mecanismo. `planEventTransition`, `publishEvent`, `isKnownEventType` no se tocan.
- **Rama:** este spec+plan se mergean a `main`. La implementación (próxima sesión) arranca creando una rama nueva desde `main` (p.ej. `feat/outbox-s4-consumer`).
- **Idioma:** texto de cara al usuario, en español.
- Spec: `docs/superpowers/specs/2026-07-23-outbox-s4-consumer-design.md`.

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `domains/cognitive/memory/salience.ts` | +`commitment_created` en `MemoryEventType` + su saliencia base. |
| `lib/messages/catalog.ts` | +`INSIGHT_DETECTED` (code de notificación persistida). |
| `server/services/memory/memory-episode-service.ts` | +`recordEpisodeOnce` (idempotente por `sourceId`) + helper `insertEpisode`. |
| `domains/cognitive/events/event-bus.ts` | `dispatchPending(prisma, handlers, batchSize?)`; claim restringido; `EventHandler` recibe `prisma`; borra `Map`/`registerHandler`/`_resetHandlers`. |
| `domains/cognitive/events/handlers/memory-handler.ts` | `commitment.*` → `recordEpisodeOnce`. |
| `domains/cognitive/events/handlers/notification-handler.ts` | `insight.created` → `emitNotification`. |
| `domains/cognitive/events/handlers/index.ts` | `HANDLERS` — el mapa estático (composición). |
| `app/api/cron/dispatch-events/route.ts` | pasa `HANDLERS` a `dispatchPending`; reescribe el comentario. |
| `supabase/migrations/20260723180000_reschedule_dispatch_events_s4.sql` | re-agenda `v3-dispatch-events` con `timeout_milliseconds := 60000`. |

**Un PR** (sprint cohesivo). Orden de tareas: piezas puras primero, luego transporte, handlers, wiring, migración, verificación.

---

### Task 1: `commitment_created` en `MemoryEventType`

**Files:**
- Modify: `src/domains/cognitive/memory/salience.ts:8-22`
- Test: `src/__tests__/domains/salience.test.ts` (crear si no existe; si existe, añadir el caso)

**Interfaces:**
- Produces: `MemoryEventType` incluye `"commitment_created"`; `initialSalience("commitment_created") === 0.55`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/domains/salience.test.ts  (añadir; crear el describe si el fichero no existe)
import { describe, it, expect } from "vitest"
import { initialSalience } from "@/domains/cognitive/memory/salience"

describe("initialSalience — commitment_created", () => {
  it("un compromiso creado es menos memorable que romperlo", () => {
    expect(initialSalience("commitment_created")).toBe(0.55)
    expect(initialSalience("commitment_broken")).toBe(0.85)
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/domains/salience.test.ts`
Expected: FAIL — TypeScript rechaza `"commitment_created"` como `MemoryEventType`, o el valor no es 0.55.

- [ ] **Step 3: Implementar**

En `salience.ts`, añadir el tipo al union (`:8-10`) y su base (`:14-22`):

```ts
export type MemoryEventType =
  | "intervention" | "commitment_broken" | "checkin_red" | "commitment_kept"
  | "commitment_created" | "streak" | "trade_emotional" | "manual"

const BASE: Record<MemoryEventType, number> = {
  intervention: 0.9,
  commitment_broken: 0.85,
  checkin_red: 0.7,
  manual: 0.7,
  commitment_kept: 0.6,
  commitment_created: 0.55, // un propósito es menos memorable que romperlo
  streak: 0.6,
  trade_emotional: 0.5,
}
```

- [ ] **Step 4: Verificar el verde**

Run: `pnpm exec vitest run __tests__/domains/salience.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domains/cognitive/memory/salience.ts src/__tests__/domains/salience.test.ts
git commit -m "feat(memory): tipo de episodio commitment_created (saliencia 0.55)"
```

---

### Task 2: code `INSIGHT_DETECTED` en el catálogo

**Files:**
- Modify: `src/lib/messages/catalog.ts` (añadir la entrada en la sección de "System (persisted)")
- Test: `src/__tests__/lib/messages-catalog.test.ts` (crear si no existe; si existe, añadir el caso)

**Interfaces:**
- Produces: `MESSAGES.INSIGHT_DETECTED` con `persist:true`, `category:"Sistema"`, `priority:"P3"`, `type:"INFO"`, y `es.title`/`es.body` que interpolan `{title}`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/lib/messages-catalog.test.ts (añadir)
import { describe, it, expect } from "vitest"
import { MESSAGES } from "@/lib/messages/catalog"
import { resolveMessage } from "@/lib/messages/resolve"

describe("INSIGHT_DETECTED — notificación de insight", () => {
  it("es persistida, informativa y resuelve el título del insight", () => {
    const def = MESSAGES.INSIGHT_DETECTED
    expect(def.persist).toBe(true)
    expect(def.category).toBe("Sistema")
    expect(def.priority).toBe("P3")
    const m = resolveMessage("INSIGHT_DETECTED", { title: "Operas peor tras 2 pérdidas" }, "es")
    expect(m.body).toContain("Operas peor tras 2 pérdidas")
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/lib/messages-catalog.test.ts`
Expected: FAIL — `MESSAGES.INSIGHT_DETECTED` es `undefined`.

- [ ] **Step 3: Implementar**

En `catalog.ts`, en la sección `// ── System (persisted) ──`, añadir:

```ts
  INSIGHT_DETECTED: {
    type: "INFO", priority: "P3", category: "Sistema", persist: true,
    es: { title: "Nuevo patrón detectado", body: "{title}" },
  },
```

> Nota: `category` es del union cerrado `NotifCategory` (`messages/types.ts`) — "Sistema" es el catch-all correcto; NO añadir una categoría nueva (ampliaría la UI de preferencias). `resolveMessage` interpola `{title}` desde `params`.

- [ ] **Step 4: Verificar el verde**

Run: `pnpm exec vitest run __tests__/lib/messages-catalog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/messages/catalog.ts src/__tests__/lib/messages-catalog.test.ts
git commit -m "feat(notif): code INSIGHT_DETECTED para notificar patrones detectados"
```

---

### Task 3: `recordEpisodeOnce` idempotente

**Files:**
- Modify: `src/server/services/memory/memory-episode-service.ts:22-49`
- Test: `src/__tests__/services/memory/record-episode-once.test.ts`

**Interfaces:**
- Consumes: `RecordEpisodeInput` de `memory-episode-service.ts` (`{eventType, content, sourceId?, occurredAt?}`).
- Produces: `recordEpisodeOnce(prisma, userId, input): Promise<string | null>` — si ya existe un episodio con ese `sourceId`, devuelve su id sin crear; si no, crea (dejando subir errores de BD; el embedding sigue best-effort).

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/services/memory/record-episode-once.test.ts
import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/ai/resolve-provider", () => ({ resolveEmbeddingCall: vi.fn().mockResolvedValue({ source: "none" }) }))
vi.mock("@/lib/ai/embeddings", () => ({ embedText: vi.fn() }))

import { recordEpisodeOnce } from "@/server/services/memory/memory-episode-service"

describe("recordEpisodeOnce — idempotente por sourceId", () => {
  it("no crea si ya existe un episodio con ese sourceId", async () => {
    const create = vi.fn()
    const prisma = {
      memoryEpisode: {
        findFirst: vi.fn().mockResolvedValue({ id: "existing" }),
        create,
      },
    } as never
    const id = await recordEpisodeOnce(prisma, "u1", { eventType: "commitment_broken", content: "x", sourceId: "evt-1" })
    expect(id).toBe("existing")
    expect(create).not.toHaveBeenCalled()
  })

  it("crea cuando no existe uno con ese sourceId", async () => {
    const prisma = {
      memoryEpisode: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "new" }),
      },
    } as never
    const id = await recordEpisodeOnce(prisma, "u1", { eventType: "commitment_broken", content: "x", sourceId: "evt-2" })
    expect(id).toBe("new")
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/services/memory/record-episode-once.test.ts`
Expected: FAIL — `recordEpisodeOnce` no se exporta.

- [ ] **Step 3: Implementar**

Refactorizar `recordEpisode` para extraer un `insertEpisode` (que lanza) y añadir `recordEpisodeOnce`. Sustituir el cuerpo de `recordEpisode` (`:22-49`) por:

```ts
/** Inserta el episodio + embedding best-effort. LANZA si el insert falla. */
async function insertEpisode(prisma: PrismaClient, userId: string, input: RecordEpisodeInput): Promise<string> {
  const ep = await prisma.memoryEpisode.create({
    data: {
      userId,
      eventType: input.eventType,
      content: input.content.trim().slice(0, 1000),
      salience: initialSalience(input.eventType),
      sourceId: input.sourceId ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    },
    select: { id: true },
  })
  try {
    const emb = await resolveEmbeddingCall(prisma, userId)
    if (emb.source !== "none") {
      const vector = await embedText(input.content, { model: emb.model, apiKey: emb.apiKey })
      if (vector) {
        await prisma.$executeRaw`UPDATE memory_episodes SET embedding = ${`[${vector.join(",")}]`}::vector WHERE id = ${ep.id}::uuid`
      }
    }
  } catch { /* embedding is best-effort */ }
  return ep.id
}

/** Append a salient episode (+ best-effort embedding). Never throws (best-effort caller). */
export async function recordEpisode(prisma: PrismaClient, userId: string, input: RecordEpisodeInput): Promise<string | null> {
  try {
    return await insertEpisode(prisma, userId, input)
  } catch {
    return null
  }
}

/**
 * Idempotente por `sourceId`: si ya existe un episodio con ese sourceId, no crea.
 * A diferencia de recordEpisode, PROPAGA errores de BD del insert — lo usa el
 * consumidor del outbox, que necesita que un fallo suba para reintentar.
 */
export async function recordEpisodeOnce(prisma: PrismaClient, userId: string, input: RecordEpisodeInput): Promise<string | null> {
  if (input.sourceId) {
    const existing = await prisma.memoryEpisode.findFirst({
      where: { userId, sourceId: input.sourceId },
      select: { id: true },
    })
    if (existing) return existing.id
  }
  return insertEpisode(prisma, userId, input)
}
```

- [ ] **Step 4: Verificar el verde**

Run: `pnpm exec vitest run __tests__/services/memory/record-episode-once.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/memory/memory-episode-service.ts src/__tests__/services/memory/record-episode-once.test.ts
git commit -m "feat(memory): recordEpisodeOnce idempotente por sourceId (propaga errores)"
```

---

### Task 4: `dispatchPending` por inyección + claim restringido

**Files:**
- Modify: `src/domains/cognitive/events/event-bus.ts:102-181`
- Modify: `src/__tests__/integration/event-bus.integration.test.ts` (reescribir; ya no hay `_resetHandlers`)
- Test: `src/__tests__/domains/dispatch-pending.test.ts`

**Interfaces:**
- Produces:
  - `type EventHandler = (prisma: PrismaClient, event: { id: string; userId: string; type: DomainEventType; payload: unknown }) => Promise<void>`
  - `type HandlerMap = Partial<Record<DomainEventType, EventHandler[]>>`
  - `dispatchPending(prisma, handlers: HandlerMap, batchSize?): Promise<DispatchResult>` — reclama sólo eventos cuyo `type` esté en `handlers`.
- Consumes: `planEventTransition` (sin cambios).

- [ ] **Step 1: Escribir el test unitario que falla**

Este test mockea prisma a nivel del claim y del update. Como el claim es `$queryRaw` y el update es `.update`, se mockean ambos.

```ts
// src/__tests__/domains/dispatch-pending.test.ts
import { describe, it, expect, vi } from "vitest"
import { dispatchPending, type HandlerMap } from "@/domains/cognitive/events/event-bus"

/** prisma falso: $queryRaw devuelve el batch reclamado; capturamos los updates. */
function fakePrisma(claimed: Array<{ id: string; type: string }>) {
  const updates: Array<{ id: string; status: string }> = []
  const prisma = {
    $queryRaw: vi.fn().mockResolvedValue(
      claimed.map(c => ({ id: c.id, user_id: "u1", type: c.type, payload: {}, attempts: 0, max_attempts: 5 })),
    ),
    domainEvent: {
      update: vi.fn(async ({ where, data }: never) => { updates.push({ id: (where as { id: string }).id, status: (data as { status: string }).status }) }),
    },
  } as never
  return { prisma, updates }
}

describe("dispatchPending — inyección de handlers", () => {
  it("procesa un evento cuando su handler resuelve", async () => {
    const { prisma, updates } = fakePrisma([{ id: "e1", type: "commitment.broken" }])
    const handlers: HandlerMap = { "commitment.broken": [vi.fn().mockResolvedValue(undefined)] }
    const r = await dispatchPending(prisma, handlers)
    expect(r.processed).toBe(1)
    expect(updates[0]).toEqual({ id: "e1", status: "processed" })
  })

  it("re-encola cuando el handler lanza (attempts no agotados)", async () => {
    const { prisma, updates } = fakePrisma([{ id: "e1", type: "commitment.broken" }])
    const handlers: HandlerMap = { "commitment.broken": [vi.fn().mockRejectedValue(new Error("boom"))] }
    const r = await dispatchPending(prisma, handlers)
    expect(r.processed).toBe(0)
    expect(updates[0].status).toBe("pending")
  })

  it("con el mapa vacío no reclama nada (tipo sin handler → queda pending)", async () => {
    const queryRaw = vi.fn().mockResolvedValue([])
    const prisma = { $queryRaw: queryRaw, domainEvent: { update: vi.fn() } } as never
    const r = await dispatchPending(prisma, {})
    expect(r.claimed).toBe(0)
    // El claim recibió una lista de tipos vacía → no puede matchear ninguna fila.
    expect(queryRaw).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/domains/dispatch-pending.test.ts`
Expected: FAIL — `dispatchPending` aún tiene la firma vieja (`prisma, batchSize`) y no exporta `HandlerMap`.

- [ ] **Step 3: Implementar**

Sustituir el bloque `// ── Handler registry + dispatcher ──` (`:102-181`) por:

```ts
// ── Handlers (inyectados) + dispatcher ───────────────────────────────────────
// Sin registro mutable global: el mapa de handlers se INYECTA en dispatchPending
// (opción B del spec). Elimina la trampa serverless donde una lambda corría con
// el Map vacío y quemaba los eventos sin handler.

export type EventHandler = (
  prisma: PrismaClient,
  event: { id: string; userId: string; type: DomainEventType; payload: unknown },
) => Promise<void>

export type HandlerMap = Partial<Record<DomainEventType, EventHandler[]>>

export interface DispatchResult {
  claimed: number
  processed: number
  failed: number
}

/**
 * Reclama un batch de eventos pending CUYO TIPO tenga handler y corre sus handlers.
 * Idempotente y seguro en concurrencia: `FOR UPDATE SKIP LOCKED`. Un tipo sin
 * handler no se reclama → queda pending, replayable (FREEZE-D6). El claim con una
 * lista de tipos vacía no matchea ninguna fila.
 */
export async function dispatchPending(prisma: PrismaClient, handlers: HandlerMap, batchSize = 50): Promise<DispatchResult> {
  const handledTypes = Object.keys(handlers)
  const claimed = await prisma.$queryRaw<Array<{ id: string; user_id: string; type: string; payload: unknown; attempts: number; max_attempts: number }>>`
    UPDATE domain_events
       SET status = 'processing'
     WHERE id IN (
       SELECT id FROM domain_events
        WHERE status = 'pending'
          AND type = ANY(${handledTypes}::text[])
        ORDER BY occurred_at ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
     )
    RETURNING id, user_id, type, payload, attempts, max_attempts
  `

  let processed = 0
  let failed = 0

  for (const row of claimed) {
    const type = row.type as DomainEventType
    const list = handlers[type] ?? []
    let outcome: HandlerOutcome = { ok: true }
    try {
      for (const h of list) {
        await h(prisma, { id: row.id, userId: row.user_id, type, payload: row.payload })
      }
    } catch (e) {
      outcome = { ok: false, error: e instanceof Error ? e.message : String(e) }
    }

    const next = planEventTransition({ attempts: row.attempts, maxAttempts: row.max_attempts }, outcome)
    await prisma.domainEvent.update({
      where: { id: row.id },
      data: { status: next.status, attempts: next.attempts, processedAt: next.processedAt, lastError: next.lastError },
    })
    if (next.status === "processed") processed++
    else if (next.status === "failed") failed++
  }

  return { claimed: claimed.length, processed, failed }
}
```

Se borran `registerHandler`, `_resetHandlers` y `const handlers = new Map(...)`. `HandlerOutcome`, `EventTransition`, `DomainEventRecord`, `planEventTransition`, `publishEvent`, `isKnownEventType` NO se tocan.

- [ ] **Step 4: Reescribir el integration test**

`event-bus.integration.test.ts` usa `_resetHandlers` (borrado) y afirma "sin handler → processed" (comportamiento eliminado). Sustituir su cuerpo:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { prisma, makeUser, dropUser } from "./_helpers"
import { publishEvent, dispatchPending, type HandlerMap } from "@/domains/cognitive/events/event-bus"

let userId: string
beforeEach(async () => { userId = await makeUser() })
afterEach(async () => { await dropUser(userId) })

describe("dispatchPending (integration, real Postgres)", () => {
  it("procesa eventos con handler; deja pending los tipos sin handler", async () => {
    await prisma.$transaction(async (tx) => {
      await publishEvent(tx, { userId, type: "insight.created", payload: { insightId: "a" } })
      await publishEvent(tx, { userId, type: "commitment.created", payload: { commitmentId: "c" } })
    })

    const seen: string[] = []
    const handlers: HandlerMap = { "insight.created": [async (_p, e) => { seen.push(e.id) }] }

    const first = await dispatchPending(prisma, handlers, 50)
    expect(first.claimed).toBe(1)          // sólo insight.created tiene handler
    expect(first.processed).toBe(1)
    expect(seen).toHaveLength(1)
    // commitment.created queda pending: no tiene handler, no se reclamó.
    expect(await prisma.domainEvent.count({ where: { userId, type: "commitment.created", status: "pending" } })).toBe(1)

    const second = await dispatchPending(prisma, handlers, 50)
    expect(second.claimed).toBe(0)         // insight.created ya está processed
  })
})
```

- [ ] **Step 5: Verificar el verde (unit) + tsc**

Run: `pnpm exec vitest run __tests__/domains/dispatch-pending.test.ts __tests__/domains/event-bus.test.ts`
Expected: PASS (el unit de `planEventTransition`/`isKnownEventType` sigue verde: no se tocó).
Run: `pnpm exec tsc --noEmit 2>&1 | grep -viE "sentry|puppeteer"`
Expected: sin salida (el integration test compila; corre sólo en CI con BD).

- [ ] **Step 6: Commit**

```bash
git add src/domains/cognitive/events/event-bus.ts src/__tests__/domains/dispatch-pending.test.ts src/__tests__/integration/event-bus.integration.test.ts
git commit -m "refactor(events): dispatchPending por inyeccion + claim restringido a tipos con handler

Elimina el Map mutable global y registerHandler —la trampa serverless donde una
lambda corria con el registro vacio y quemaba los eventos sin handler. El claim
solo reclama tipos con handler, asi que un tipo sin consumidor queda pending
(replayable): protege FREEZE-D6. EventHandler pasa a recibir prisma (inyectable,
testeable)."
```

---

### Task 5: handler de memoria (`commitment.*`)

**Files:**
- Create: `src/domains/cognitive/events/handlers/memory-handler.ts`
- Test: `src/__tests__/domains/handlers/memory-handler.test.ts`

**Interfaces:**
- Consumes: `EventHandler` de `event-bus.ts`; `recordEpisodeOnce` de `memory-episode-service.ts`.
- Produces: `memoryHandler: EventHandler` — maneja `commitment.created/broken/kept/partial`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/domains/handlers/memory-handler.test.ts
import { describe, it, expect, vi } from "vitest"

const recordEpisodeOnce = vi.fn().mockResolvedValue("ep1")
vi.mock("@/server/services/memory/memory-episode-service", () => ({ recordEpisodeOnce }))

import { memoryHandler } from "@/domains/cognitive/events/handlers/memory-handler"

function prismaWith(commitment: unknown) {
  return { commitment: { findFirst: vi.fn().mockResolvedValue(commitment) } } as never
}
const evt = (type: string) => ({ id: "evt-9", userId: "u1", type: type as never, payload: { commitmentId: "c1" } })

describe("memoryHandler — commitment.* → episodio", () => {
  it("commitment.broken escribe un episodio commitment_broken con sourceId=event.id", async () => {
    recordEpisodeOnce.mockClear()
    await memoryHandler(prismaWith({ metricKey: "revengeTradesAfterLoss", comparator: "<=", target: 0, window: "week" }), evt("commitment.broken"))
    expect(recordEpisodeOnce).toHaveBeenCalledWith(
      expect.anything(), "u1",
      expect.objectContaining({ eventType: "commitment_broken", sourceId: "evt-9" }),
    )
  })

  it("commitment.created usa el tipo commitment_created", async () => {
    recordEpisodeOnce.mockClear()
    await memoryHandler(prismaWith({ metricKey: "m", comparator: "<=", target: 1, window: "day" }), evt("commitment.created"))
    expect(recordEpisodeOnce.mock.calls[0][2].eventType).toBe("commitment_created")
  })

  it("no-op sin lanzar si el commitment fue borrado", async () => {
    recordEpisodeOnce.mockClear()
    await memoryHandler(prismaWith(null), evt("commitment.broken"))
    expect(recordEpisodeOnce).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/domains/handlers/memory-handler.test.ts`
Expected: FAIL — no se resuelve `memory-handler`.

- [ ] **Step 3: Implementar**

```ts
// src/domains/cognitive/events/handlers/memory-handler.ts
// Consumidor del outbox: traduce los eventos commitment.* a episodios de memoria
// del coach (E13). Idempotente por sourceId=event.id (recordEpisodeOnce). NO traga
// errores: un fallo sube y el dispatcher reintenta.
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { EventHandler } from "../event-bus"
import type { MemoryEventType } from "@/domains/cognitive/memory/salience"
import { recordEpisodeOnce } from "@/server/services/memory/memory-episode-service"

const EPISODE_FOR: Record<string, { type: MemoryEventType; verb: string }> = {
  "commitment.created": { type: "commitment_created", verb: "Te comprometiste a" },
  "commitment.broken":  { type: "commitment_broken",  verb: "Rompiste tu compromiso" },
  "commitment.kept":    { type: "commitment_kept",    verb: "Cumpliste tu compromiso" },
  "commitment.partial": { type: "commitment_kept",    verb: "Cumpliste en parte" },
}

/** Descripción compacta de un compromiso para el contenido del episodio. */
function describeCommitment(c: { metricKey: string; comparator: string; target: number; window: string }): string {
  return `${c.metricKey} ${c.comparator} ${c.target} (${c.window})`
}

export const memoryHandler: EventHandler = async (prisma: PrismaClient, event) => {
  const map = EPISODE_FOR[event.type]
  if (!map) return
  const { commitmentId } = event.payload as { commitmentId: string }
  const c = await prisma.commitment.findFirst({
    where: { id: commitmentId, userId: event.userId },
    select: { metricKey: true, comparator: true, target: true, window: true },
  })
  if (!c) return // entidad borrada entre publicación y consumo → no-op idempotente
  await recordEpisodeOnce(prisma, event.userId, {
    eventType: map.type,
    content: `${map.verb}: ${describeCommitment(c)}`,
    sourceId: event.id,
  })
}
```

- [ ] **Step 4: Verificar el verde**

Run: `pnpm exec vitest run __tests__/domains/handlers/memory-handler.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domains/cognitive/events/handlers/memory-handler.ts src/__tests__/domains/handlers/memory-handler.test.ts
git commit -m "feat(events): handler de memoria episodica para commitment.*"
```

---

### Task 6: handler de notificación (`insight.created`)

**Files:**
- Create: `src/domains/cognitive/events/handlers/notification-handler.ts`
- Test: `src/__tests__/domains/handlers/notification-handler.test.ts`

**Interfaces:**
- Consumes: `EventHandler` de `event-bus.ts`; `emitNotification` de `server/services/notifications/emit.ts`.
- Produces: `notificationHandler: EventHandler` — maneja `insight.created`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/domains/handlers/notification-handler.test.ts
import { describe, it, expect, vi } from "vitest"

const emitNotification = vi.fn().mockResolvedValue({ id: "n1" })
vi.mock("@/server/services/notifications/emit", () => ({ emitNotification }))

import { notificationHandler } from "@/domains/cognitive/events/handlers/notification-handler"

const prismaWith = (insight: unknown) => ({ insight: { findFirst: vi.fn().mockResolvedValue(insight) } }) as never
const evt = { id: "evt-3", userId: "u1", type: "insight.created" as never, payload: { insightId: "i1" } }

describe("notificationHandler — insight.created → notificación", () => {
  it("emite INSIGHT_DETECTED con dedupeKey insight:<id> y el título", async () => {
    emitNotification.mockClear()
    await notificationHandler(prismaWith({ title: "Operas peor tras 2 pérdidas" }), evt)
    expect(emitNotification).toHaveBeenCalledWith(
      expect.anything(), "u1", "INSIGHT_DETECTED",
      expect.objectContaining({ dedupeKey: "insight:i1", sourceId: "i1", params: { title: "Operas peor tras 2 pérdidas" } }),
    )
  })

  it("no-op sin lanzar si el insight fue borrado", async () => {
    emitNotification.mockClear()
    await notificationHandler(prismaWith(null), evt)
    expect(emitNotification).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/domains/handlers/notification-handler.test.ts`
Expected: FAIL — no se resuelve `notification-handler`.

- [ ] **Step 3: Implementar**

```ts
// src/domains/cognitive/events/handlers/notification-handler.ts
// Consumidor del outbox: insight.created → notificación persistida al trader.
// Idempotente gratis por el dedupeKey (emitNotification hace upsert). NO traga
// errores. El insight se ve en /analytics (AiInsightsPanel + BehaviorLoopPanel).
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { EventHandler } from "../event-bus"
import { emitNotification } from "@/server/services/notifications/emit"

export const notificationHandler: EventHandler = async (prisma: PrismaClient, event) => {
  const { insightId } = event.payload as { insightId: string }
  const insight = await prisma.insight.findFirst({
    where: { id: insightId, userId: event.userId },
    select: { title: true },
  })
  if (!insight) return // insight borrado → no-op idempotente
  await emitNotification(prisma, event.userId, "INSIGHT_DETECTED", {
    params: { title: insight.title },
    sourceId: insightId,
    dedupeKey: `insight:${insightId}`,
    href: "/analytics",
  })
}
```

- [ ] **Step 4: Verificar el verde**

Run: `pnpm exec vitest run __tests__/domains/handlers/notification-handler.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domains/cognitive/events/handlers/notification-handler.ts src/__tests__/domains/handlers/notification-handler.test.ts
git commit -m "feat(events): handler de notificacion para insight.created"
```

---

### Task 7: composición (`HANDLERS`) + wiring del endpoint

**Files:**
- Create: `src/domains/cognitive/events/handlers/index.ts`
- Modify: `src/app/api/cron/dispatch-events/route.ts:1-31`
- Test: `src/__tests__/domains/handlers/registry.test.ts`

**Interfaces:**
- Consumes: `HandlerMap` de `event-bus.ts`; `memoryHandler`, `notificationHandler`.
- Produces: `HANDLERS: HandlerMap`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/domains/handlers/registry.test.ts
import { describe, it, expect } from "vitest"
import { HANDLERS } from "@/domains/cognitive/events/handlers"

describe("HANDLERS — mapa de composición del outbox", () => {
  it("cubre los cuatro commitment.* con el handler de memoria y insight.created con el de notificación", () => {
    for (const t of ["commitment.created", "commitment.broken", "commitment.kept", "commitment.partial"] as const) {
      expect(HANDLERS[t]?.length).toBeGreaterThan(0)
    }
    expect(HANDLERS["insight.created"]?.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/domains/handlers/registry.test.ts`
Expected: FAIL — no se resuelve `handlers/index`.

- [ ] **Step 3: Implementar el mapa y cablear el endpoint**

```ts
// src/domains/cognitive/events/handlers/index.ts
// Punto de composición del outbox: el ÚNICO sitio que conoce a los consumidores
// concretos. El endpoint importa HANDLERS y lo pasa a dispatchPending — el import
// ES el registro (sin Map mutable, sin dependencia de orden de import).
import type { HandlerMap } from "../event-bus"
import { memoryHandler } from "./memory-handler"
import { notificationHandler } from "./notification-handler"

export const HANDLERS: HandlerMap = {
  "commitment.created": [memoryHandler],
  "commitment.broken":  [memoryHandler],
  "commitment.kept":    [memoryHandler],
  "commitment.partial": [memoryHandler],
  "insight.created":    [notificationHandler],
}
```

En `route.ts`, actualizar el import, la llamada y el comentario de cabecera:

```ts
// POST /api/cron/dispatch-events — outbox dispatcher (ADR-001, FREEZE-D1).
//
// Claims pending domain_events whose type has a registered handler and runs them.
// Handlers are injected from handlers/index.ts (HANDLERS) — the import IS the
// registry, so a cold lambda never runs with an empty registry. Scheduled by
// 20260723180000 (v3-dispatch-events, every 5 min).

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { checkCronAuth } from "@/app/api/cron/learning-digest/route"
import { dispatchPending } from "@/domains/cognitive/events/event-bus"
import { HANDLERS } from "@/domains/cognitive/events/handlers"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = checkCronAuth(req.headers.get("authorization"), process.env.CRON_SECRET)
  if (auth === "unconfigured") return new NextResponse("CRON_SECRET not configured", { status: 412 })
  if (auth === "unauthorized") return new NextResponse("Unauthorized", { status: 401 })

  try {
    const result = await dispatchPending(prisma, HANDLERS)
    logger.info("dispatch-events complete", { ...result })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    logger.error("dispatch-events failed", { err })
    return new NextResponse("dispatch failed", { status: 500 })
  }
}
```

- [ ] **Step 4: Verificar el verde + suite completa + tsc**

Run: `pnpm exec vitest run __tests__/domains/handlers/registry.test.ts`
Expected: PASS.
Run: `pnpm exec vitest run` y `pnpm exec tsc --noEmit 2>&1 | grep -viE "sentry|puppeteer"`
Expected: suite verde salvo los 2 de `sentry-wiring`; tsc sin salida.

- [ ] **Step 5: Commit**

```bash
git add src/domains/cognitive/events/handlers/index.ts src/app/api/cron/dispatch-events/route.ts src/__tests__/domains/handlers/registry.test.ts
git commit -m "feat(events): HANDLERS estatico + endpoint pasa el mapa a dispatchPending"
```

---

### Task 8: re-agendar el cron

**Files:**
- Create: `supabase/migrations/20260723180000_reschedule_dispatch_events_s4.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- S4: re-agendar v3-dispatch-events, ahora que existe el primer consumidor.
--
-- 20260721190000 lo des-agendó (S0/R-3) porque no había handlers y dispatchPending
-- quemaba los eventos. Con los handlers inyectados (HANDLERS) y el claim restringido
-- a tipos con handler, el dispatcher ya consume de verdad y deja pending lo que aún
-- no tiene consumidor. Restaura el bloque de 20260626140000 con una diferencia:
-- timeout_milliseconds := 60000.
--
-- POR QUÉ EL TIMEOUT (#155): el default de net.http_post es 5s. Un batch de 50
-- eventos con dos handlers puede pasar de 5s; sin el timeout, pg_net cancelaría a
-- los 5s y registraría el job como fallido aunque el endpoint terminara bien. Los
-- 60s casan con maxDuration=60 del endpoint.
--
-- Ventana de despliegue: migrate-deploy (que corre este cron.schedule) puede
-- completar antes de que Vercel despliegue el código. Si el cron dispara en esa
-- ventana de segundos, pega contra el endpoint sin el bundle nuevo y responde
-- {claimed:0}; no quema nada, porque el claim restringido y los handlers llegan
-- juntos. Benigno.
--
-- Idempotente: unschedule-then-schedule.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'v3-dispatch-events') then
    perform cron.unschedule('v3-dispatch-events');
  end if;
end $$;

select cron.schedule(
  'v3-dispatch-events',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := public.app_setting('app_url') || '/api/cron/dispatch-events',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.app_setting('cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);
```

- [ ] **Step 2: Verificar (no hay unit; la valida el replay de CI)**

Run: `git add supabase/migrations/20260723180000_reschedule_dispatch_events_s4.sql`
No hay test local (necesita pg_cron); el job `Validate migrations (replay from scratch)` de CI valida la sintaxis.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(cron): re-agendar v3-dispatch-events con timeout 60s (#155), ya con consumidor"
```

---

### Task 9: PR, merge y verificación en producción

**Files:** ninguno — verificación.

- [ ] **Step 1: Suite completa + push + PR**

```bash
pnpm exec vitest run   # 1301 + los tests nuevos; sólo los 2 de sentry-wiring rojos
git push -u origin feat/outbox-s4-consumer
gh pr create --title "feat(events): primer consumidor S4 del outbox (memoria + notificacion)" --body "Ver docs/superpowers/specs/2026-07-23-outbox-s4-consumer-design.md"
```

- [ ] **Step 2: Esperar CI verde y mergear**

```bash
gh pr checks <n>          # esperar verde, incluido replay de migraciones + E2E
gh pr merge <n> --squash --delete-branch
```

- [ ] **Step 3: Esperar migrate-deploy por headSha**

`gh run list` justo tras mergear caza un run anterior. Identificar el run por `headSha == HEAD` y esperar ESE `Apply migrations to production: success`. Confirmar en `cron.job` que `v3-dispatch-events` está `active`.

- [ ] **Step 4: Disparar el dispatcher a mano y verificar el estado esperado**

Sin `.env`, disparar por SQL (el mismo `net.http_post` que el cron; el secreto sale de `public.app_setting('cron_secret')`). Luego, por Supabase MCP (`project_id: jpojusluihjjsjvcubdp`):

```sql
-- Antes de disparar: 16 en pending.
select type, status, count(*) from domain_events group by type, status order by status;
-- Después de disparar (esperar ~10s):
--   commitment.broken ×2 + commitment.created ×2 → processed
--   insight.created ×12 → processed
select type, status, count(*) from domain_events group by type, status order by status;
-- 4 episodios nuevos (2 commitment_broken + 2 commitment_created):
select event_type, count(*) from memory_episodes where source_id in (select id::text from domain_events where type like 'commitment.%') group by event_type;
-- 12 notificaciones INSIGHT_DETECTED, deduplicadas por insight:<id>:
select count(*) from notifications where code = 'INSIGHT_DETECTED';
```

Expected: los 16 pasan a `processed`; 4 episodios; hasta 12 notificaciones (una por insight distinto).

- [ ] **Step 5: Criterio FREEZE-D6 — un tipo sin handler queda pending**

Publicar (o localizar) un evento de un tipo sin handler (p.ej. `insight.resolved` si aparece) y confirmar que tras el dispatcher sigue `pending`, no `processed`. Si no hay ninguno natural, es suficiente el test unit `dispatchPending` "mapa vacío no reclama".

- [ ] **Step 6: En vivo (opcional, Playwright, guarda anti-overlay)**

Abrir el drawer del coach → `CoachMemoryPanel` muestra los episodios nuevos. Abrir `/notificaciones` → notificaciones de insight. Comprobar primero que no haya intervención activa (overlay `fixed inset-0`).

- [ ] **Step 7: graphify + STATUS**

`graphify update .` seguido de la fusión quirúrgica (no commitear a secas). Actualizar `docs/STATUS.md`: el outbox tiene su primer consumidor; el cron revivió; el punto 4 del prompt de retoma deja de ser pendiente.

---

## Auto-revisión del plan

**Cobertura del spec:**

| Sección del spec | Tarea |
|---|---|
| §3 inyección (B), claim restringido, borrar Map | 4 |
| §4.1 handler memoria + commitment_created | 1, 5 |
| §4.2 handler notificación + INSIGHT_DETECTED | 2, 6 |
| §5 idempotencia (sourceId / dedupeKey) | 3, 5, 6 |
| §6 re-agendar cron + timeout 60s | 8 |
| §3 wiring del endpoint (HANDLERS) | 7 |
| §8 testing (planEventTransition preservado, dispatch inyección, catálogo) | 4, 2, todas |
| §8 verificación en prod + FREEZE-D6 | 9 |

**Sin placeholders.** Todo paso que cambia código lleva el código. El `href` (`/analytics`), la categoría (`Sistema`) y el campo del insight (`title`) están resueltos contra el código, no diferidos.

**Consistencia de tipos:** `EventHandler` (recibe `prisma`, event) y `HandlerMap` se definen en la Task 4 y se consumen con esos nombres exactos en 5, 6, 7. `recordEpisodeOnce(prisma, userId, input)` se define en la 3 y se usa en la 5. `MemoryEventType` gana `commitment_created` en la 1 y se usa en la 5. `INSIGHT_DETECTED` se define en la 2 y se usa en la 6.
