# Resiliencia de IA sobre el free tier — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un fallo transitorio del free tier no llegue al usuario ni degrade el Coach en silencio, con **un** comportamiento de reintento en vez de cinco copias.

**Architecture:** Un ejecutor único (`lib/ai/execute.ts`) posee iterar candidatos, reintentar, esperar y registrar. Un error tipado (`AiCallError`) lleva el status HTTP estructurado para poder clasificar transitorio vs permanente. `usableCandidates` compone una cadena de modelos gratuitos **sólo si el primario ya es OpenRouter**. Los embeddings pasan a tener lista de candidatos y a lanzar en vez de devolver `null` mudo.

**Tech Stack:** TypeScript · Next.js 16 · tRPC 11 · Prisma 7 · Vitest (temporizadores falsos)

## Global Constraints

- **Directorio de trabajo de todos los comandos: `src/`.** El `node_modules` real está ahí.
- **Suite completa antes de cada push:** `pnpm exec vitest run`. Hoy **1333**. No un subconjunto.
- **Fallos locales que NO son regresiones:** 2 de `sentry-wiring` por `@sentry/nextjs` ausente. En CI pasan.
- **TDD: verifica el ROJO antes de implementar.**
- **Los contratos de "lista vacía" NO se mueven al ejecutor.** Cada call-site sigue decidiendo: `NoApiKeyError` (coach, analytics, psychology), `null` (complete), `TRPCError` (routers de reviews). El ejecutor recibe una lista **no vacía**.
- **Nada de `sleep` real en tests.** La espera se inyecta.
- **Parámetros fijados, no negociables** (spec §5): fondo = 3 reintentos, base 500 ms, ×2, jitter ±25 %; interactivo = 1 reintento, 400 ms fijo, techo total **8000 ms**.
- **Cadena gratuita fijada** (spec §4), en este orden exacto:
  `nvidia/nemotron-3-ultra-550b-a55b:free` → `google/gemma-4-31b-it:free` → `openrouter/free` → `google/gemma-4-26b-a4b-it:free`
- **La cadena sólo aplica si `primary.provider === "openrouter"`** (ADR-003 §444).
- **Idioma:** texto de cara al usuario, en español. Comentarios de código, en inglés (patrón del repo).
- Spec: `docs/superpowers/specs/2026-07-24-ai-resilience-free-tier-design.md`.
- **Rama:** `feat/ai-resilience-free-tier` (ya creada, con el spec commiteado).

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/lib/ai/ai-error.ts` | **Nuevo.** `AiCallError` (status estructurado) + `isRetryable`. Puro. |
| `src/lib/ai/retry-profile.ts` | **Nuevo.** Los dos perfiles + cálculo de backoff con jitter. Puro. |
| `src/lib/ai/execute.ts` | **Nuevo.** `executeAiCall` — itera candidatos, reintenta, espera, registra. |
| `src/lib/ai/free-chain.ts` | **Nuevo.** `FREE_MODEL_CHAIN`, la constante única de ids. |
| `src/lib/ai/chat.ts:115-118` | Lanza `AiCallError` en vez de `Error`. |
| `src/lib/ai/coach-agent.ts:116` | Lanza `AiCallError`. |
| `src/lib/ai/embeddings.ts:18-50` | Lanza `AiCallError`; `null` sólo para no-fallo. |
| `src/lib/ai/resolve-provider.ts:93-120` | `usableCandidates` compone la cadena; `resolveEmbeddingCall` → lista. |
| `src/lib/ai/coach-service.ts:170-205` | Migrar al ejecutor + clasificar el catch anidado. |
| `src/lib/ai/analytics-insights-service.ts:59-80` | Migrar al ejecutor. |
| `src/lib/ai/psychology-insights-service.ts:39-60` | Migrar al ejecutor. |
| `src/lib/ai/complete.ts:19-40` | Migrar al ejecutor. |
| `src/server/services/reviews/review-ai.ts:64-80` | Migrar al ejecutor; perfil por parámetro. |

**Un PR.** Orden: piezas puras primero, luego transporte, luego composición, luego migración de call-sites.

---

### Task 1: `AiCallError` y clasificación transitorio/permanente

**Files:**
- Create: `src/lib/ai/ai-error.ts`
- Test: `src/__tests__/lib/ai-error.test.ts`

**Interfaces:**
- Produces:
  - `class AiCallError extends Error` con `readonly status: number | null`, `readonly provider: string`, `readonly model: string`, `readonly kind: "chat" | "tools" | "embeddings"`.
  - `function isRetryable(err: unknown): boolean`
  - `function statusOf(err: unknown): number | null`

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/lib/ai-error.test.ts
import { describe, it, expect } from "vitest"
import { AiCallError, isRetryable, statusOf } from "@/lib/ai/ai-error"

const err = (status: number | null) =>
  new AiCallError({ status, provider: "openrouter", model: "m", kind: "chat", detail: "boom" })

describe("AiCallError", () => {
  it("lleva el status estructurado, no embebido en el texto", () => {
    const e = err(429)
    expect(e.status).toBe(429)
    expect(e).toBeInstanceOf(Error)
    expect(e.name).toBe("AiCallError")
  })

  it("conserva proveedor, modelo y detalle en el mensaje, para el log", () => {
    const e = err(500)
    expect(e.message).toContain("openrouter")
    expect(e.message).toContain("500")
    expect(e.message).toContain("boom")
  })
})

describe("isRetryable", () => {
  it("reintenta 429 y 5xx — el caso común del free tier", () => {
    expect(isRetryable(err(429))).toBe(true)
    expect(isRetryable(err(500))).toBe(true)
    expect(isRetryable(err(503))).toBe(true)
  })

  it("NO reintenta 400, 401 ni 403 — no mejoran esperando", () => {
    expect(isRetryable(err(400))).toBe(false)
    expect(isRetryable(err(401))).toBe(false)
    expect(isRetryable(err(403))).toBe(false)
  })

  it("trata un fallo sin status (red) como transitorio", () => {
    expect(isRetryable(err(null))).toBe(true)
    expect(isRetryable(new TypeError("fetch failed"))).toBe(true)
  })

  it("404 no se reintenta: modelo inexistente no aparece esperando", () => {
    expect(isRetryable(err(404))).toBe(false)
  })
})

describe("statusOf", () => {
  it("extrae el status de un AiCallError y null de cualquier otra cosa", () => {
    expect(statusOf(err(429))).toBe(429)
    expect(statusOf(new Error("nope"))).toBeNull()
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/lib/ai-error.test.ts`
Expected: FAIL — no se resuelve `@/lib/ai/ai-error`.

- [ ] **Step 3: Implementar**

```ts
// src/lib/ai/ai-error.ts
// Typed AI transport error. Before this, streamChat threw
// `new Error("openrouter chat error 429: ...")` — the HTTP status lived INSIDE
// the message string, so no caller could tell a transient 429 from a permanent
// 401 by program. The retry policy needs that distinction to exist.

export type AiCallKind = "chat" | "tools" | "embeddings"

export class AiCallError extends Error {
  readonly status: number | null
  readonly provider: string
  readonly model: string
  readonly kind: AiCallKind

  constructor(input: {
    status: number | null
    provider: string
    model: string
    kind: AiCallKind
    detail?: string
  }) {
    super(`${input.provider} ${input.kind} error ${input.status ?? "network"}: ${input.detail ?? ""}`.trim())
    this.name = "AiCallError"
    this.status = input.status
    this.provider = input.provider
    this.model = input.model
    this.kind = input.kind
  }
}

/** The HTTP status behind a failure, or null when it never had one (network). */
export function statusOf(err: unknown): number | null {
  return err instanceof AiCallError ? err.status : null
}

/**
 * Is it worth trying the SAME model again?
 *
 * 429 (rate limit) and 5xx resolve on their own — that is the common free-tier
 * failure. 400/401/403/404 do not improve by waiting: a malformed request, a bad
 * key or a missing model will fail identically on the next attempt, and retrying
 * only delays the real error. A failure with no status is a network fault,
 * indistinguishable from a hiccup, so it is treated as transient.
 */
export function isRetryable(err: unknown): boolean {
  const status = statusOf(err)
  if (status === null) return true
  if (status === 429) return true
  return status >= 500
}
```

- [ ] **Step 4: Verificar el verde**

Run: `pnpm exec vitest run __tests__/lib/ai-error.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/ai-error.ts src/__tests__/lib/ai-error.test.ts
git commit -m "feat(ai): error tipado con status estructurado + clasificacion transitorio/permanente"
```

---

### Task 2: perfiles de reintento y backoff

**Files:**
- Create: `src/lib/ai/retry-profile.ts`
- Test: `src/__tests__/lib/retry-profile.test.ts`

**Interfaces:**
- Produces:
  - `type RetryProfileName = "interactive" | "background"`
  - `interface RetryProfile { name; retries: number; baseDelayMs: number; factor: number; jitterRatio: number; totalBudgetMs: number | null }`
  - `const RETRY_PROFILES: Record<RetryProfileName, RetryProfile>`
  - `function backoffDelay(profile: RetryProfile, attempt: number, rand?: () => number): number` — `attempt` es 0-based (0 = espera antes del 1er reintento).

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/lib/retry-profile.test.ts
import { describe, it, expect } from "vitest"
import { RETRY_PROFILES, backoffDelay } from "@/lib/ai/retry-profile"

describe("RETRY_PROFILES — los valores fijados en el spec", () => {
  it("fondo: 3 reintentos, base 500ms, x2, jitter 25%, sin techo", () => {
    const p = RETRY_PROFILES.background
    expect(p.retries).toBe(3)
    expect(p.baseDelayMs).toBe(500)
    expect(p.factor).toBe(2)
    expect(p.jitterRatio).toBe(0.25)
    expect(p.totalBudgetMs).toBeNull()
  })

  it("interactivo: 1 reintento, 400ms fijo, techo total 8s", () => {
    const p = RETRY_PROFILES.interactive
    expect(p.retries).toBe(1)
    expect(p.baseDelayMs).toBe(400)
    expect(p.factor).toBe(1) // fijo: no crece
    expect(p.totalBudgetMs).toBe(8000)
  })
})

describe("backoffDelay", () => {
  const mid = () => 0.5 // jitter neutro: 0.5 → sin desviacion

  it("fondo progresa 500 / 1000 / 2000 sin jitter", () => {
    const p = RETRY_PROFILES.background
    expect(backoffDelay(p, 0, mid)).toBe(500)
    expect(backoffDelay(p, 1, mid)).toBe(1000)
    expect(backoffDelay(p, 2, mid)).toBe(2000)
  })

  it("interactivo se queda en 400 fijo", () => {
    const p = RETRY_PROFILES.interactive
    expect(backoffDelay(p, 0, mid)).toBe(400)
    expect(backoffDelay(p, 1, mid)).toBe(400)
  })

  it("el jitter queda ACOTADO a +/-25% en todo el rango de rand()", () => {
    const p = RETRY_PROFILES.background
    for (const r of [0, 0.25, 0.5, 0.75, 1]) {
      const d = backoffDelay(p, 1, () => r) // base 1000
      expect(d).toBeGreaterThanOrEqual(750)
      expect(d).toBeLessThanOrEqual(1250)
    }
  })

  it("el jitter desvia de verdad en los extremos — no es un no-op", () => {
    const p = RETRY_PROFILES.background
    expect(backoffDelay(p, 1, () => 0)).toBe(750)
    expect(backoffDelay(p, 1, () => 1)).toBe(1250)
  })

  it("nunca devuelve un retardo negativo", () => {
    expect(backoffDelay(RETRY_PROFILES.background, 0, () => 0)).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/lib/retry-profile.test.ts`
Expected: FAIL — no se resuelve `@/lib/ai/retry-profile`.

- [ ] **Step 3: Implementar**

```ts
// src/lib/ai/retry-profile.ts
// Retry policy, as pure data + one pure function. Two profiles because the
// caller's situation differs, not the feature's: `weekly_reviews` is called both
// from a router (a user is watching a spinner) and from a cron (nobody waits).

export type RetryProfileName = "interactive" | "background"

export interface RetryProfile {
  name: RetryProfileName
  /** Retries AFTER the first attempt, per candidate. */
  retries: number
  baseDelayMs: number
  /** Growth per attempt. 1 = fixed delay. */
  factor: number
  /** Jitter as a fraction of the delay, applied as +/-. */
  jitterRatio: number
  /** Wall-clock ceiling for the WHOLE chain; null = no ceiling. */
  totalBudgetMs: number | null
}

export const RETRY_PROFILES: Record<RetryProfileName, RetryProfile> = {
  // A user is watching. Failing fast and clearly beats being right late, so one
  // short retry and a hard ceiling across the whole chain.
  interactive: {
    name: "interactive",
    retries: 1,
    baseDelayMs: 400,
    factor: 1,
    jitterRatio: 0.25,
    totalBudgetMs: 8000,
  },
  // Nobody is waiting: crons, embeddings, review analysis. 3 retries sum ~3.5s
  // worst case, well under the 60s maxDuration the cron routes declare.
  background: {
    name: "background",
    retries: 3,
    baseDelayMs: 500,
    factor: 2,
    jitterRatio: 0.25,
    totalBudgetMs: null,
  },
}

/**
 * Delay before retry number `attempt` (0-based).
 *
 * Jitter is not decoration: the outbox dispatcher and the crons fire in batches,
 * and without it their retries re-synchronise against the very rate limit that
 * caused the failure.
 */
export function backoffDelay(profile: RetryProfile, attempt: number, rand: () => number = Math.random): number {
  const base = profile.baseDelayMs * Math.pow(profile.factor, attempt)
  // rand() in [0,1) → offset in [-jitterRatio, +jitterRatio]
  const offset = (rand() * 2 - 1) * profile.jitterRatio
  return Math.max(1, Math.round(base * (1 + offset)))
}
```

- [ ] **Step 4: Verificar el verde**

Run: `pnpm exec vitest run __tests__/lib/retry-profile.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/retry-profile.ts src/__tests__/lib/retry-profile.test.ts
git commit -m "feat(ai): perfiles de reintento interactivo/fondo con backoff y jitter acotado"
```

---

### Task 3: el ejecutor `executeAiCall`

**Files:**
- Create: `src/lib/ai/execute.ts`
- Test: `src/__tests__/lib/execute-ai-call.test.ts`

**Interfaces:**
- Consumes: `AiCallError`/`isRetryable` (Task 1), `RETRY_PROFILES`/`backoffDelay` (Task 2), `ResolvedCall` de `resolve-provider`.
- Produces:
  ```ts
  executeAiCall<T>(opts: {
    candidates: ResolvedCall[]
    profile: RetryProfileName
    feature: string
    run: (candidate: ResolvedCall) => Promise<T>
    sleep?: (ms: number) => Promise<void>
    now?: () => number
    rand?: () => number
  }): Promise<T>
  ```

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/lib/execute-ai-call.test.ts
import { describe, it, expect, vi } from "vitest"
import { executeAiCall } from "@/lib/ai/execute"
import { AiCallError } from "@/lib/ai/ai-error"

const cand = (model: string) =>
  ({ provider: "openrouter" as const, model, apiKey: "k", source: "user" as const })

const fail = (status: number | null, model = "m") =>
  new AiCallError({ status, provider: "openrouter", model, kind: "chat" })

/** Reloj y espera falsos: el tiempo avanza sólo cuando el ejecutor duerme. */
function fakeClock() {
  let t = 0
  const slept: number[] = []
  return {
    now: () => t,
    slept,
    sleep: async (ms: number) => { slept.push(ms); t += ms },
    advance: (ms: number) => { t += ms },
  }
}

describe("executeAiCall — reintento sobre el mismo candidato", () => {
  it("reintenta un 429 y devuelve el exito del segundo intento", async () => {
    const c = fakeClock()
    const run = vi.fn()
      .mockRejectedValueOnce(fail(429))
      .mockResolvedValueOnce("ok")

    const out = await executeAiCall({
      candidates: [cand("a")], profile: "background", feature: "ai_chat",
      run, sleep: c.sleep, now: c.now, rand: () => 0.5,
    })

    expect(out).toBe("ok")
    expect(run).toHaveBeenCalledTimes(2)
    expect(c.slept).toEqual([500])
  })

  it("agota los 3 reintentos de fondo antes de pasar al siguiente candidato", async () => {
    const c = fakeClock()
    const run = vi.fn(async (cd: { model: string }) => {
      if (cd.model === "a") throw fail(500, "a")
      return "desde-b"
    })

    const out = await executeAiCall({
      candidates: [cand("a"), cand("b")], profile: "background", feature: "ai_chat",
      run, sleep: c.sleep, now: c.now, rand: () => 0.5,
    })

    expect(out).toBe("desde-b")
    // 4 intentos sobre "a" (1 + 3 reintentos) + 1 sobre "b"
    expect(run).toHaveBeenCalledTimes(5)
    expect(c.slept).toEqual([500, 1000, 2000])
  })
})

describe("executeAiCall — errores permanentes", () => {
  it("un 401 NO se reintenta: salta al siguiente candidato sin dormir", async () => {
    const c = fakeClock()
    const run = vi.fn(async (cd: { model: string }) => {
      if (cd.model === "a") throw fail(401, "a")
      return "desde-b"
    })

    const out = await executeAiCall({
      candidates: [cand("a"), cand("b")], profile: "background", feature: "ai_chat",
      run, sleep: c.sleep, now: c.now,
    })

    expect(out).toBe("desde-b")
    expect(run).toHaveBeenCalledTimes(2)
    expect(c.slept).toEqual([]) // no esperó: esperar un 401 no sirve de nada
  })
})

describe("executeAiCall — cadena agotada", () => {
  it("propaga la CAUSA REAL del ultimo fallo, no un error generico", async () => {
    const c = fakeClock()
    const run = vi.fn().mockRejectedValue(fail(503, "z"))

    await expect(executeAiCall({
      candidates: [cand("a"), cand("b")], profile: "background", feature: "ai_chat",
      run, sleep: c.sleep, now: c.now, rand: () => 0.5,
    })).rejects.toMatchObject({ name: "AiCallError", status: 503 })
  })

  it("lanza si la lista de candidatos llega vacia — es un bug del llamador", async () => {
    await expect(executeAiCall({
      candidates: [], profile: "background", feature: "ai_chat", run: vi.fn(),
    })).rejects.toThrow()
  })
})

describe("executeAiCall — techo de latencia del perfil interactivo", () => {
  it("deja de intentar cuando se supera el presupuesto total", async () => {
    const c = fakeClock()
    // Cada intento consume 5s de reloj: el 2º supera el techo de 8s.
    const run = vi.fn(async () => { c.advance(5000); throw fail(429) })

    await expect(executeAiCall({
      candidates: [cand("a"), cand("b"), cand("c")], profile: "interactive", feature: "ai_chat",
      run, sleep: c.sleep, now: c.now, rand: () => 0.5,
    })).rejects.toMatchObject({ status: 429 })

    // No recorre los 3 candidatos con su reintento: el techo lo corta antes.
    expect(run.mock.calls.length).toBeLessThan(6)
  })

  it("sin techo (fondo) recorre la cadena entera", async () => {
    const c = fakeClock()
    const run = vi.fn(async () => { c.advance(5000); throw fail(429) })

    await expect(executeAiCall({
      candidates: [cand("a"), cand("b")], profile: "background", feature: "ai_chat",
      run, sleep: c.sleep, now: c.now, rand: () => 0.5,
    })).rejects.toMatchObject({ status: 429 })

    expect(run).toHaveBeenCalledTimes(8) // 2 candidatos x (1 + 3 reintentos)
  })
})

describe("executeAiCall — exito inmediato", () => {
  it("no duerme ni toca el segundo candidato", async () => {
    const c = fakeClock()
    const run = vi.fn().mockResolvedValue("ya")

    const out = await executeAiCall({
      candidates: [cand("a"), cand("b")], profile: "interactive", feature: "ai_chat",
      run, sleep: c.sleep, now: c.now,
    })

    expect(out).toBe("ya")
    expect(run).toHaveBeenCalledTimes(1)
    expect(c.slept).toEqual([])
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/lib/execute-ai-call.test.ts`
Expected: FAIL — no se resuelve `@/lib/ai/execute`.

- [ ] **Step 3: Implementar**

```ts
// src/lib/ai/execute.ts
// The single owner of "try the candidates, retry the transient ones, wait, log".
//
// Before this it lived in FIVE places (coach-service, analytics-insights,
// psychology-insights, complete, review-ai), each a slightly different loop.
// Adding retry to five copies is how you get five behaviours — the same shape as
// the #156 bug, where embedding-model resolution lived in four copies.
//
// What this module does NOT own: what to do when the candidate list is EMPTY.
// That contract differs per call-site (NoApiKeyError / null / TRPCError) and
// belongs to the caller. This executor is handed a non-empty list.

import type { ResolvedCall } from "./resolve-provider"
import { AiCallError, isRetryable } from "./ai-error"
import { RETRY_PROFILES, backoffDelay, type RetryProfileName } from "./retry-profile"
import { logger } from "@/lib/logger"

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface ExecuteAiCallOptions<T> {
  candidates: ResolvedCall[]
  profile: RetryProfileName
  /** For the log line — which AI feature this call belongs to. */
  feature: string
  run: (candidate: ResolvedCall) => Promise<T>
  sleep?: (ms: number) => Promise<void>
  now?: () => number
  rand?: () => number
}

export async function executeAiCall<T>(opts: ExecuteAiCallOptions<T>): Promise<T> {
  const { candidates, feature, run } = opts
  const profile = RETRY_PROFILES[opts.profile]
  const sleep = opts.sleep ?? realSleep
  const now = opts.now ?? Date.now
  const rand = opts.rand ?? Math.random

  if (candidates.length === 0) {
    // The caller must handle the empty case with ITS OWN contract before calling.
    throw new Error("executeAiCall: candidate list is empty (caller must handle this)")
  }

  const startedAt = now()
  const outOfBudget = () =>
    profile.totalBudgetMs !== null && now() - startedAt >= profile.totalBudgetMs

  let lastErr: unknown

  for (const candidate of candidates) {
    for (let attempt = 0; attempt <= profile.retries; attempt++) {
      if (outOfBudget()) {
        logger.warn("ai call budget exhausted", {
          feature, profile: profile.name, elapsedMs: now() - startedAt,
        })
        throw lastErr ?? new Error(`executeAiCall: budget exhausted for ${feature}`)
      }

      try {
        return await run(candidate)
      } catch (err) {
        lastErr = err
        const status = err instanceof AiCallError ? err.status : null
        const retryable = isRetryable(err)

        logger.warn("ai call attempt failed", {
          feature,
          provider: candidate.provider,
          model: candidate.model,
          status,
          attempt,
          retryable,
          profile: profile.name,
        })

        // Permanent for this candidate → do not burn retries; try the next model.
        if (!retryable) break
        // Retries exhausted for this candidate → next model.
        if (attempt === profile.retries) break

        await sleep(backoffDelay(profile, attempt, rand))
      }
    }
  }

  logger.error("ai call chain exhausted", {
    feature,
    candidates: candidates.length,
    lastStatus: lastErr instanceof AiCallError ? lastErr.status : null,
  })
  throw lastErr
}
```

- [ ] **Step 4: Verificar el verde**

Run: `pnpm exec vitest run __tests__/lib/execute-ai-call.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/execute.ts src/__tests__/lib/execute-ai-call.test.ts
git commit -m "feat(ai): ejecutor unico executeAiCall — candidatos, reintento, backoff y log"
```

---

### Task 4: `chat.ts` y `coach-agent.ts` lanzan `AiCallError`

**Files:**
- Modify: `src/lib/ai/chat.ts:115-118`
- Modify: `src/lib/ai/coach-agent.ts:116`
- Test: `src/__tests__/lib/chat-throws-typed.test.ts`

**Interfaces:**
- Consumes: `AiCallError` (Task 1).
- Produces: `streamChat` lanza `AiCallError` con `status` y `kind:"chat"`; `streamCoachAgent` con `kind:"tools"`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/lib/chat-throws-typed.test.ts
import { describe, it, expect, vi, afterEach } from "vitest"
import { streamChat } from "@/lib/ai/chat"
import { AiCallError } from "@/lib/ai/ai-error"

afterEach(() => { vi.unstubAllGlobals() })

describe("streamChat — error tipado", () => {
  it("un 429 del proveedor sale como AiCallError con status 429", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 429, body: null,
      text: async () => "rate limited",
    }))

    const p = streamChat({
      provider: "openrouter", apiKey: "k", model: "m",
      messages: [{ role: "user", content: "hola" }],
    })

    await expect(p).rejects.toBeInstanceOf(AiCallError)
    await expect(p).rejects.toMatchObject({ status: 429, kind: "chat", model: "m" })
  })

  it("conserva el detalle del cuerpo en el mensaje, para el log", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 500, body: null,
      text: async () => "upstream exploded",
    }))

    await expect(streamChat({
      provider: "openrouter", apiKey: "k", model: "m",
      messages: [{ role: "user", content: "x" }],
    })).rejects.toThrow(/upstream exploded/)
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/lib/chat-throws-typed.test.ts`
Expected: FAIL — hoy lanza un `Error` plano, no `AiCallError`, y no tiene `.status`.

- [ ] **Step 3: Implementar**

En `chat.ts`, añadir el import y sustituir el bloque `:115-118`:

```ts
import { AiCallError } from "./ai-error"
```

```ts
  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "")
    throw new AiCallError({
      status: res.status, provider, model: opts.model, kind: "chat", detail: errText,
    })
  }
```

En `coach-agent.ts`, añadir el import y sustituir la línea `:116`:

```ts
import { AiCallError } from "./ai-error"
```

```ts
    throw new AiCallError({
      status: firstRes.status, provider: opts.provider, model: opts.model, kind: "tools",
      detail: await firstRes.text().catch(() => ""),
    })
```

- [ ] **Step 4: Verificar el verde + no-regresión**

Run: `pnpm exec vitest run __tests__/lib/chat-throws-typed.test.ts`
Expected: PASS, 2 tests.
Run: `pnpm exec vitest run __tests__/lib/coach-service.test.ts __tests__/lib/coach-tools.test.ts`
Expected: PASS — el mensaje sigue conteniendo proveedor y status, así que nada que dependa del texto se rompe.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/chat.ts src/lib/ai/coach-agent.ts src/__tests__/lib/chat-throws-typed.test.ts
git commit -m "feat(ai): streamChat y streamCoachAgent lanzan AiCallError con status estructurado"
```

---

### Task 5: cadena gratuita + composición en `usableCandidates`

**Files:**
- Create: `src/lib/ai/free-chain.ts`
- Modify: `src/lib/ai/resolve-provider.ts:93-97`
- Test: `src/__tests__/lib/free-chain.test.ts`

**Interfaces:**
- Produces: `FREE_MODEL_CHAIN: readonly string[]`; `usableCandidates(call)` mantiene su firma **síncrona** y devuelve `ResolvedCall[]` con la cadena añadida.

> **Por qué sigue siendo síncrona:** la cadena sólo aplica cuando el primario ya es OpenRouter, así que **la clave es la misma que la del primario**. No hay que resolver ninguna clave nueva y no se toca prisma.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/lib/free-chain.test.ts
import { describe, it, expect } from "vitest"
import { usableCandidates } from "@/lib/ai/resolve-provider"
import { FREE_MODEL_CHAIN } from "@/lib/ai/free-chain"

const call = (provider: "openrouter" | "anthropic" | "openai", model: string, apiKey = "k") =>
  ({ provider, model, apiKey, source: "user" as const })

describe("FREE_MODEL_CHAIN", () => {
  it("no pone dos modelos del mismo upstream consecutivos", () => {
    const upstream = (id: string) => id.split("/")[0]
    for (let i = 1; i < FREE_MODEL_CHAIN.length; i++) {
      expect(upstream(FREE_MODEL_CHAIN[i])).not.toBe(upstream(FREE_MODEL_CHAIN[i - 1]))
    }
  })

  it("todos los ids son gratuitos (:free) o el meta-router", () => {
    for (const id of FREE_MODEL_CHAIN) {
      expect(id === "openrouter/free" || id.endsWith(":free")).toBe(true)
    }
  })
})

describe("usableCandidates — composicion de la cadena", () => {
  it("con primario OpenRouter anade la cadena gratuita despues del primario", () => {
    const out = usableCandidates({ primary: call("openrouter", "openrouter/free"), fallback: null })
    expect(out[0].model).toBe("openrouter/free")
    expect(out.length).toBeGreaterThan(1)
    expect(out.every(c => c.provider === "openrouter")).toBe(true)
  })

  it("deduplica por provider+model — el primario no se repite en la cadena", () => {
    const out = usableCandidates({ primary: call("openrouter", "openrouter/free"), fallback: null })
    const keys = out.map(c => `${c.provider}/${c.model}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("reutiliza la clave del primario para los eslabones de la cadena", () => {
    const out = usableCandidates({ primary: call("openrouter", "openrouter/free", "sk-abc"), fallback: null })
    expect(out.every(c => c.apiKey === "sk-abc")).toBe(true)
  })

  it("respeta el orden: primario, fallback del usuario, luego la cadena", () => {
    const out = usableCandidates({
      primary: call("openrouter", "mi-primario"),
      fallback: call("openrouter", "mi-fallback"),
    })
    expect(out[0].model).toBe("mi-primario")
    expect(out[1].model).toBe("mi-fallback")
    expect(out[2].model).toBe(FREE_MODEL_CHAIN[0])
  })

  it("con primario ANTHROPIC no anade la cadena — ADR-003, no reenrutar a terceros", () => {
    const out = usableCandidates({ primary: call("anthropic", "claude-x"), fallback: null })
    expect(out).toHaveLength(1)
    expect(out[0].provider).toBe("anthropic")
  })

  it("con primario OPENAI tampoco la anade", () => {
    const out = usableCandidates({ primary: call("openai", "gpt-x"), fallback: null })
    expect(out).toHaveLength(1)
  })

  it("sin clave utilizable sigue devolviendo lista vacia", () => {
    const out = usableCandidates({
      primary: { provider: "openrouter", model: "m", apiKey: "", source: "none" },
      fallback: null,
    })
    expect(out).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/lib/free-chain.test.ts`
Expected: FAIL — no se resuelve `@/lib/ai/free-chain` y `usableCandidates` aún no compone nada.

- [ ] **Step 3: Implementar**

```ts
// src/lib/ai/free-chain.ts
// The default chain of FREE OpenRouter models, used as fallback when the user's
// primary provider is already OpenRouter.
//
// ⚠️ THESE IDS ROT. OpenRouter adds and retires free models continuously. Verify
// against https://openrouter.ai/models?max_price=0 when touching this file.
// A stale id is self-limiting — the executor skips it and moves to the next
// candidate — so the cost of one rotting is a wasted round-trip, not a failure.
//
// ORDER IS DELIBERATE: the two Gemma models share an upstream (Google) and are
// kept apart, so a Google-side rate limit cannot take out two consecutive links.
// `openrouter/free` is a meta-router over free models, not a model — it
// contributes a different resolution path rather than a fourth concrete model.
//
// Only `nvidia/nemotron-3-ultra-550b-a55b:free` has CONFIRMED function-calling
// support. The others are not assumed to have it: a model without tools degrades
// cleanly to the static path (see coach-service).
export const FREE_MODEL_CHAIN: readonly string[] = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "google/gemma-4-31b-it:free",
  "openrouter/free",
  "google/gemma-4-26b-a4b-it:free",
] as const
```

En `resolve-provider.ts`, añadir el import y sustituir `usableCandidates` (`:93-97`):

```ts
import { FREE_MODEL_CHAIN } from "./free-chain"
```

```ts
/**
 * The ordered list of call candidates that actually have a key: the user's
 * primary, their configured fallback, then the default free chain.
 *
 * The free chain is appended ONLY when the primary provider is already
 * OpenRouter. With an OpenAI/Anthropic primary the user still gets retries on
 * their own model, but their data is NOT silently rerouted to a third party they
 * did not choose for that call (ADR-003 §444, minimisation toward third
 * parties) — and they are spared an unexplained quality drop. A cross-provider
 * fallback remains available as an EXPLICIT choice via fallbackProvider.
 *
 * Stays synchronous: the chain only applies when the primary is OpenRouter, so
 * every link reuses the primary's already-resolved key. No new key lookup.
 */
export function usableCandidates(call: ResolvedFeatureCall): ResolvedCall[] {
  const configured = [call.primary, call.fallback].filter(
    (c): c is ResolvedCall => c != null && c.source !== "none" && c.apiKey.length > 0,
  )
  if (configured.length === 0) return []

  const out = [...configured]
  if (call.primary.provider === "openrouter") {
    for (const model of FREE_MODEL_CHAIN) {
      out.push({
        provider: "openrouter",
        model,
        apiKey: call.primary.apiKey,
        source: call.primary.source,
      })
    }
  }

  // Dedupe by provider+model, preserving order (the primary wins over a chain twin).
  const seen = new Set<string>()
  return out.filter((c) => {
    const key = `${c.provider}/${c.model}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
```

- [ ] **Step 4: Verificar el verde + no-regresión**

Run: `pnpm exec vitest run __tests__/lib/free-chain.test.ts`
Expected: PASS, 9 tests.
Run: `pnpm exec vitest run __tests__/lib/resolve-provider.test.ts __tests__/lib/active-ai-features.test.ts`
Expected: PASS. Si `resolve-provider.test.ts` afirmaba "primario + fallback = 2 candidatos" con primario OpenRouter, **actualiza esa expectativa**: ahora incluye la cadena. Es un cambio esperado, no una regresión.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/free-chain.ts src/lib/ai/resolve-provider.ts src/__tests__/lib/free-chain.test.ts src/__tests__/lib/resolve-provider.test.ts
git commit -m "feat(ai): cadena de modelos gratuitos, solo si el primario ya es OpenRouter (ADR-003)"
```

---

### Task 6: embeddings — lista de candidatos y fallo que se distingue

**Files:**
- Modify: `src/lib/ai/embeddings.ts:18-50`
- Modify: `src/lib/ai/resolve-provider.ts` (`resolveEmbeddingCall`)
- Test: `src/__tests__/lib/embeddings-typed.test.ts`

**Interfaces:**
- Produces:
  - `embedText(text, opts): Promise<number[] | null>` — `null` **sólo** si falta clave/modelo/texto; **lanza** `AiCallError` ante un fallo real.
  - `resolveEmbeddingCandidates(prisma, userId): Promise<ResolvedCall[]>` — nueva, devuelve lista. `resolveEmbeddingCall` se mantiene y delega en ella (`[0] ?? {source:"none"}`) para no romper a sus llamadores.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/lib/embeddings-typed.test.ts
import { describe, it, expect, vi, afterEach } from "vitest"
import { embedText } from "@/lib/ai/embeddings"
import { AiCallError } from "@/lib/ai/ai-error"

afterEach(() => { vi.unstubAllGlobals() })

describe("embedText — distingue 'no puedo' de 'no hay nada'", () => {
  it("devuelve null SIN llamar cuando falta la clave", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    expect(await embedText("hola", { model: "m", apiKey: "" })).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("devuelve null con texto vacio", async () => {
    expect(await embedText("   ", { model: "m", apiKey: "k" })).toBeNull()
  })

  it("LANZA AiCallError ante un 429 — antes devolvia null en silencio", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 429, text: async () => "slow down",
    }))
    await expect(embedText("hola", { model: "m", apiKey: "k" }))
      .rejects.toMatchObject({ status: 429, kind: "embeddings" })
  })

  it("LANZA ante un fallo de red, en vez de tragarselo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")))
    await expect(embedText("hola", { model: "m", apiKey: "k" }))
      .rejects.toBeInstanceOf(AiCallError)
  })

  it("devuelve el vector cuando va bien", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ data: [{ embedding: [0.1, 0.2] }] }),
    }))
    expect(await embedText("hola", { model: "m", apiKey: "k" })).toEqual([0.1, 0.2])
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/lib/embeddings-typed.test.ts`
Expected: FAIL — hoy los dos casos de fallo devuelven `null` en vez de lanzar.

- [ ] **Step 3: Implementar**

En `embeddings.ts`, importar y sustituir el cuerpo de `embedText` (`:18-50`):

```ts
import { AiCallError } from "./ai-error"
```

```ts
/**
 * Generate an embedding vector for the given text.
 *
 * Returns null ONLY for "there is nothing to do": no key, no model, empty text.
 * A real failure THROWS `AiCallError` so the caller can retry it. Before this,
 * all four cases collapsed to the same silent null — which is how 3 resources
 * with notes ended up with 0 embeddings and the coach told the trader they had
 * never written anything about it (#156).
 */
export async function embedText(text: string, opts: EmbedOptions): Promise<number[] | null> {
  const model  = opts.model?.trim()
  const apiKey = opts.apiKey
  if (!model || !apiKey || !text.trim()) return null

  const viaOpenRouter = model.includes("/")
  const provider = viaOpenRouter ? "openrouter" : "openai"
  const baseUrl = viaOpenRouter
    ? "https://openrouter.ai/api/v1"
    : "https://api.openai.com/v1"

  let res: Response
  try {
    res = await fetch(`${baseUrl}/embeddings`, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ model, input: text }),
    })
  } catch (err) {
    // Network fault: no status. Transient by classification, so it gets retried.
    throw new AiCallError({
      status: null, provider, model, kind: "embeddings",
      detail: err instanceof Error ? err.message : String(err),
    })
  }

  if (!res.ok) {
    throw new AiCallError({
      status: res.status, provider, model, kind: "embeddings",
      detail: await res.text().catch(() => ""),
    })
  }

  const json = await res.json() as { data?: { embedding: number[] }[] }
  return json.data?.[0]?.embedding ?? null
}
```

En `resolve-provider.ts`, añadir `resolveEmbeddingCandidates` y hacer que `resolveEmbeddingCall` delegue:

```ts
/**
 * Embedding candidates, in order. Same composition rule as usableCandidates: the
 * free chain is appended only when the transport provider is OpenRouter.
 */
export async function resolveEmbeddingCandidates(
  prisma: PrismaClient,
  userId: string,
): Promise<ResolvedCall[]> {
  const primary = await resolveEmbeddingCall(prisma, userId)
  if (primary.source === "none" || primary.apiKey.length === 0) return []
  return usableCandidates({ primary, fallback: null })
}
```

> **Nota:** los ids de `FREE_MODEL_CHAIN` son modelos de **chat**, no de embeddings. `usableCandidates` los añadiría sin sentido. Por eso `resolveEmbeddingCandidates` devuelve **sólo el primario** hasta que exista una cadena de embeddings verificada: sustituye la línea del `return` por `return [primary]` y deja el comentario explicándolo. La ganancia de esta tarea para embeddings es el **retry**, no la cadena.

Sustituir esa última línea por:

```ts
  // FREE_MODEL_CHAIN are CHAT models; appending them to an embedding call would
  // send a request no embedding endpoint can serve. Embeddings gain the retry,
  // not the chain, until a verified free EMBEDDING chain exists.
  return [primary]
}
```

- [ ] **Step 4: Verificar el verde**

Run: `pnpm exec vitest run __tests__/lib/embeddings-typed.test.ts`
Expected: PASS, 5 tests.
Run: `pnpm exec vitest run __tests__/services/retrieval __tests__/services/memory`
Expected: PASS — `recordEpisode` y el pipeline de recuperación siguen tragando el fallo del embedding (es best-effort hacia fuera); lo que cambia es que ahora hay algo que tragar en vez de un null indistinguible.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/embeddings.ts src/lib/ai/resolve-provider.ts src/__tests__/lib/embeddings-typed.test.ts
git commit -m "feat(ai): embedText lanza en vez de devolver null mudo; candidatos de embedding"
```

---

### Task 7: migrar los 3 call-sites de streaming + clasificar el catch anidado del Coach

**Files:**
- Modify: `src/lib/ai/coach-service.ts:170-205`
- Modify: `src/lib/ai/analytics-insights-service.ts:59-80`
- Modify: `src/lib/ai/psychology-insights-service.ts:39-60`
- Test: `src/__tests__/lib/coach-agentic-degradation.test.ts`

**Interfaces:**
- Consumes: `executeAiCall` (Task 3), `isRetryable` (Task 1).
- Produces: los tres siguen devolviendo `ReadableStream` y lanzando `NoApiKeyError` con lista vacía.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/lib/coach-agentic-degradation.test.ts
import { describe, it, expect } from "vitest"
import { shouldDegradeToStatic } from "@/lib/ai/coach-service"
import { AiCallError } from "@/lib/ai/ai-error"

const e = (status: number | null) =>
  new AiCallError({ status, provider: "openrouter", model: "m", kind: "tools" })

describe("shouldDegradeToStatic — por que fallo la ruta agentica", () => {
  it("un 404/400 en la ruta de tools = el modelo no las soporta -> degradar", () => {
    expect(shouldDegradeToStatic(e(404))).toBe(true)
    expect(shouldDegradeToStatic(e(400))).toBe(true)
  })

  it("un 429 NO degrada: es transitorio, hay que reintentar CON tools", () => {
    expect(shouldDegradeToStatic(e(429))).toBe(false)
  })

  it("un 5xx tampoco degrada", () => {
    expect(shouldDegradeToStatic(e(503))).toBe(false)
  })

  it("un 401 no degrada: la clave es mala, la ruta estatica fallaria igual", () => {
    expect(shouldDegradeToStatic(e(401))).toBe(false)
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/lib/coach-agentic-degradation.test.ts`
Expected: FAIL — `shouldDegradeToStatic` no se exporta.

- [ ] **Step 3: Implementar**

En `coach-service.ts`, añadir imports, exportar el predicado y sustituir el bucle (`:170-205`):

```ts
import { executeAiCall } from "./execute"
import { AiCallError, isRetryable } from "./ai-error"
```

```ts
/**
 * Did the agentic path fail because this MODEL cannot do function calling?
 *
 * Falling back to the static path is CORRECT for a model without tools: it will
 * never have them, retrying is pointless, and an answer without tools beats an
 * error. It is WRONG for a transient failure — which is what used to happen: a
 * 429 silently degraded the Coach to a tool-less mode, and the trader concluded
 * the free model "doesn't use its tools" when it had merely been rate-limited.
 *
 * 400/404 on the tools endpoint = unsupported. Transient (429/5xx) and auth
 * (401/403) failures are NOT a tools problem, so they must not degrade.
 */
export function shouldDegradeToStatic(err: unknown): boolean {
  if (!(err instanceof AiCallError)) return false
  if (isRetryable(err)) return false
  return err.status === 400 || err.status === 404
}
```

```ts
  const candidates = usableCandidates(resolved)
  if (candidates.length === 0) {
    throw new NoApiKeyError(resolved.primary.provider)
  }

  return executeAiCall({
    candidates,
    profile: "interactive",
    feature: "ai_chat",
    run: async (c) => {
      try {
        return await streamCoachAgent({
          provider: c.provider,
          apiKey:   c.apiKey,
          model:    c.model,
          system:   systemBlocks,
          messages: opts.messages,
          prisma:   opts.prisma,
          userId:   opts.userId,
        })
      } catch (agentErr) {
        if (!shouldDegradeToStatic(agentErr)) throw agentErr
        console.warn(`[coach] ${c.provider}/${c.model} has no tool support, using static path`)
        return await streamChat({
          provider: c.provider,
          apiKey:   c.apiKey,
          model:    c.model,
          messages: opts.messages,
          system:   systemBlocks,
        })
      }
    },
  })
}
```

En `analytics-insights-service.ts`, sustituir el bucle (`:73-80`):

```ts
import { executeAiCall } from "./execute"
```

```ts
  return executeAiCall({
    candidates, profile: "interactive", feature: "analytics_insights",
    run: (c) => streamChat({
      provider: c.provider, apiKey: c.apiKey, model: c.model,
      system: SYSTEM, messages: [{ role: "user", content: userMsg }], maxTokens: 4096,
    }),
  })
}
```

En `psychology-insights-service.ts`, sustituir el bucle (`:55-60`):

```ts
import { executeAiCall } from "./execute"
```

```ts
  return executeAiCall({
    candidates, profile: "interactive", feature: "psychology_analysis",
    run: (c) => streamChat({
      provider: c.provider, apiKey: c.apiKey, model: c.model,
      system: SYSTEM, messages: [{ role: "user", content: ctx }], maxTokens: 4096,
    }),
  })
}
```

- [ ] **Step 4: Verificar el verde**

Run: `pnpm exec vitest run __tests__/lib/coach-agentic-degradation.test.ts __tests__/lib/coach-service.test.ts`
Expected: PASS.
Run: `pnpm exec tsc --noEmit 2>&1 | grep -viE "sentry|puppeteer"`
Expected: sin salida.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/coach-service.ts src/lib/ai/analytics-insights-service.ts src/lib/ai/psychology-insights-service.ts src/__tests__/lib/coach-agentic-degradation.test.ts
git commit -m "refactor(ai): coach, analytics y psicologia usan el ejecutor; el Coach ya no degrada por un 429"
```

---

### Task 8: migrar `complete.ts` y `review-ai.ts`

**Files:**
- Modify: `src/lib/ai/complete.ts:19-40`
- Modify: `src/server/services/reviews/review-ai.ts:64-80`
- Modify: `src/server/services/reviews/ensure-analysis.ts` (pasa perfil `background`)
- Modify: `src/server/trpc/routers/weekly-reviews.ts:156`, `src/server/trpc/routers/monthly-reviews.ts` (pasan `interactive`)
- Test: `src/__tests__/services/reviews/review-ai-profile.test.ts`

**Interfaces:**
- Produces: `runReviewAnalysis(candidates, prompt, profile: RetryProfileName): Promise<string>` — **tercer parámetro nuevo, obligatorio**, para que el call-site declare si hay alguien esperando.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/__tests__/services/reviews/review-ai-profile.test.ts
import { describe, it, expect, vi } from "vitest"

const streamChat = vi.hoisted(() => vi.fn())
vi.mock("@/lib/ai/chat", () => ({ streamChat }))

import { runReviewAnalysis } from "@/server/services/reviews/review-ai"
import { AiCallError } from "@/lib/ai/ai-error"

const cand = (model: string) =>
  ({ provider: "openrouter" as const, model, apiKey: "k", source: "user" as const })

function streamOf(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(c) { c.enqueue(new TextEncoder().encode(text)); c.close() },
  })
}

describe("runReviewAnalysis — perfil explicito por call-site", () => {
  it("exige el perfil y devuelve el texto del primer candidato que responde", async () => {
    streamChat.mockReset()
    streamChat.mockResolvedValueOnce(streamOf("analisis"))
    const out = await runReviewAnalysis([cand("a")], "prompt", "background")
    expect(out).toBe("analisis")
  })

  it("cae al segundo candidato cuando el primero da un error permanente", async () => {
    streamChat.mockReset()
    streamChat
      .mockRejectedValueOnce(new AiCallError({ status: 401, provider: "openrouter", model: "a", kind: "chat" }))
      .mockResolvedValueOnce(streamOf("desde-b"))
    const out = await runReviewAnalysis([cand("a"), cand("b")], "prompt", "background")
    expect(out).toBe("desde-b")
    expect(streamChat).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Verificar el ROJO**

Run: `pnpm exec vitest run __tests__/services/reviews/review-ai-profile.test.ts`
Expected: FAIL — `runReviewAnalysis` sólo acepta 2 parámetros.

- [ ] **Step 3: Implementar**

`complete.ts` — sustituir el bucle (`:22-40`) por:

```ts
import { executeAiCall } from "./execute"
```

```ts
  const resolved = await resolveAiCall(prisma, userId, feature)
  const candidates = usableCandidates(resolved)
  if (candidates.length === 0) return null // contract preserved: best-effort caller

  return executeAiCall({
    candidates,
    // No user is watching a one-shot completion (thread summarisation, memory
    // extraction): it runs inside a job.
    profile: "background",
    feature,
    run: async (c) => {
      const stream = await streamChat({ provider: c.provider, apiKey: c.apiKey, model: c.model, messages, system })
      const reader = stream.getReader()
      const dec = new TextDecoder()
      let out = ""
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        out += dec.decode(value, { stream: true })
      }
      return out.trim()
    },
  })
}
```

`review-ai.ts` — sustituir `runReviewAnalysis` (`:64-80`) por:

```ts
import { executeAiCall } from "@/lib/ai/execute"
import type { RetryProfileName } from "@/lib/ai/retry-profile"
```

```ts
/**
 * Stream the analysis from the first usable candidate. Throws on failure.
 * `profile` is REQUIRED because this same function serves a router (a user is
 * waiting) and a cron (nobody is) — the situation belongs to the call-site.
 */
export async function runReviewAnalysis(
  candidates: Candidate[],
  prompt: string,
  profile: RetryProfileName,
): Promise<string> {
  return executeAiCall({
    candidates, profile, feature: "weekly_reviews",
    run: async (c) => {
      const stream = await streamChat({
        provider: c.provider, apiKey: c.apiKey, model: c.model,
        messages: [{ role: "user", content: prompt }],
      })
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      let raw = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        raw += decoder.decode(value, { stream: true })
      }
      return raw.trim()
    },
  })
}
```

Actualizar los tres llamadores:
- `weekly-reviews.ts:156` → `runReviewAnalysis(candidates, buildAnalysisPrompt(...), "interactive")`
- `monthly-reviews.ts` (misma llamada) → `"interactive"`
- `ensure-analysis.ts` → `"background"` (lo invoca el cron de digests)

- [ ] **Step 4: Verificar el verde**

Run: `pnpm exec vitest run __tests__/services/reviews`
Expected: PASS.
Run: `pnpm exec tsc --noEmit 2>&1 | grep -viE "sentry|puppeteer"`
Expected: sin salida — el tercer parámetro obligatorio garantiza que ningún llamador se quede sin actualizar.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/complete.ts src/server/services/reviews/review-ai.ts src/server/services/reviews/ensure-analysis.ts src/server/trpc/routers/weekly-reviews.ts src/server/trpc/routers/monthly-reviews.ts src/__tests__/services/reviews/review-ai-profile.test.ts
git commit -m "refactor(ai): complete y review-ai usan el ejecutor; el perfil lo declara el call-site"
```

---

### Task 9: guarda anti-duplicación, suite completa, PR y verificación

**Files:**
- Test: `src/__tests__/lib/single-retry-owner.test.ts`

- [ ] **Step 1: Escribir la guarda**

```ts
// src/__tests__/lib/single-retry-owner.test.ts
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

/**
 * Un solo dueño del reintento.
 *
 * El bucle `for (const c of candidates)` vivía en CINCO módulos, cada uno con su
 * variante. Añadir retry a mano en cada uno produce cinco comportamientos: es la
 * forma del bug #156 (la resolución del modelo de embeddings vivía en cuatro
 * copias). Esta guarda impide que vuelvan.
 */
const MIGRATED = [
  "lib/ai/coach-service.ts",
  "lib/ai/analytics-insights-service.ts",
  "lib/ai/psychology-insights-service.ts",
  "lib/ai/complete.ts",
  "server/services/reviews/review-ai.ts",
]

describe("executeAiCall es el unico que itera candidatos", () => {
  for (const rel of MIGRATED) {
    it(`${rel} no tiene su propio bucle de candidatos`, () => {
      const src = readFileSync(resolve(__dirname, "../../", rel), "utf8")
      expect(src).not.toMatch(/for\s*\(\s*const\s+\w+\s+of\s+candidates\s*\)/)
      expect(src).toContain("executeAiCall")
    })
  }
})
```

- [ ] **Step 2: Verificar que pasa (las tareas 7-8 ya migraron)**

Run: `pnpm exec vitest run __tests__/lib/single-retry-owner.test.ts`
Expected: PASS, 5 tests. Si alguno falla, esa migración quedó a medias.

- [ ] **Step 3: Suite completa + tsc + lint**

```bash
pnpm exec vitest run
pnpm exec tsc --noEmit 2>&1 | grep -viE "sentry|puppeteer"
pnpm exec eslint lib/ai server/services/reviews
```
Expected: suite verde salvo los 2 conocidos de `sentry-wiring`; tsc sin salida; eslint limpio.

- [ ] **Step 4: Commit, push y PR**

```bash
git add src/__tests__/lib/single-retry-owner.test.ts
git commit -m "test(ai): guarda de un solo dueno del reintento"
git push -u origin feat/ai-resilience-free-tier
gh pr create --title "feat(ai): resiliencia sobre el free tier (retry + cadena gratuita + embeddings)" --body "Ver docs/superpowers/specs/2026-07-24-ai-resilience-free-tier-design.md"
```

- [ ] **Step 5: CI verde y merge**

```bash
gh pr checks <n> --watch
gh pr merge <n> --squash --delete-branch
```

- [ ] **Step 6: Verificar en producción**

No hay migración, así que **no** hay que esperar `migrate-deploy`; basta el deploy de Vercel.

1. Abrir el Coach en prod y hacer una pregunta que dispare `semantic_search`. Comprobar en los logs de runtime (Vercel MCP, `get_runtime_logs`) que aparece `ai call attempt failed` **sólo** si hubo fallo, y que la respuesta llega igualmente.
2. Forzar el camino de embeddings desde `/perfil` → "Indexar ahora". Confirmar que sigue llegando a 100 % por corpus.
3. Buscar en los logs `ai call chain exhausted`: **no debería aparecer**. Si aparece, leer el `lastStatus` — es justo el dato que faltaba en julio para no confundir un hipo con una feature rota.

> **Guarda anti-overlay:** si hay una intervención activa, el overlay `fixed inset-0` bloquea la app entera. Comprobarlo antes de automatizar nada con Playwright.

- [ ] **Step 7: graphify + STATUS**

`graphify update .` seguido de la **fusión quirúrgica** (`graphify-merge-semantic.py`, midiendo antes/después; nunca commitear el resultado crudo). Actualizar `docs/STATUS.md`: la resiliencia de IA deja de ser el punto 1 pendiente; declarar que la calidad de redacción sigue aparcada por decisión de usuario.

---

## Auto-revisión del plan

**Cobertura del spec:**

| Sección del spec | Tarea |
|---|---|
| §1 error no clasificable | 1, 4 |
| §1 defecto del catch anidado del Coach | 7 |
| §3 ejecutor único, contratos de lista vacía intactos | 3, 7, 8 |
| §3 inyección de la espera | 3 |
| §4 cadena gratuita + orden + dedupe | 5 |
| §4 regla cross-provider (ADR-003) | 5 |
| §5 clasificación transitorio/permanente | 1 |
| §5 dos perfiles elegidos por call-site | 2, 7, 8 |
| §5 parámetros fijados (500/×2/±25 %, 400/8000) | 2 |
| §6 embeddings: lista + lanzar en vez de null | 6 |
| §7 frontera antes del primer token | por construcción: el ejecutor envuelve la *obtención* del stream |
| §8 log estructurado | 3 |
| §9 testing | todas |

**Desviación declarada respecto al spec:** §6 pedía "lista de candidatos" para embeddings. La Task 6 devuelve **sólo el primario**, porque `FREE_MODEL_CHAIN` son modelos de **chat** y añadirlos a una llamada de embeddings produciría peticiones que ningún endpoint de embeddings puede servir. Los embeddings ganan el **retry**, no la cadena. Queda anotado en el código y aquí; una cadena de embeddings gratuitos verificada es trabajo futuro.

**Sin placeholders.** Todo paso que cambia código lleva el código. Los ids de modelo, los números del backoff y el techo están fijados.

**Consistencia de tipos:** `AiCallError`/`isRetryable`/`statusOf` (T1) se usan con esos nombres en T3, T4, T6, T7. `RETRY_PROFILES`/`backoffDelay`/`RetryProfileName` (T2) en T3 y T8. `executeAiCall` (T3) en T7 y T8 con la misma forma de opciones. `runReviewAnalysis` gana su tercer parámetro en T8 y sus tres llamadores se actualizan en la misma tarea.
