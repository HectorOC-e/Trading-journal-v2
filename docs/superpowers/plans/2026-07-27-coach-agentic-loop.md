# Bucle agéntico del Coach — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el bucle agéntico del Coach reintente los fallos transitorios de las rondas 2+ en vez de truncar el stream en silencio, y que nunca termine sin que el modelo haya respondido.

**Architecture:** Tres cambios en `src/lib/ai/coach-agent.ts`. (1) `CoachAgentOptions` pasa a recibir un `ResolvedCall` completo en vez de tres campos sueltos, más tres asas de inyección de reloj. (2) La última ronda va con `tool_choice: "none"`, así el modelo no puede pedir más herramientas y se ve forzado a responder — el modo de fallo desaparece por construcción, no por una comprobación. (3) Las rondas 2+ de la rama OpenRouter envuelven su `fetch` en `executeAiCall` con un solo candidato; al agotarse, el error sale por `controller.error` en vez de por un `break` mudo.

**Tech Stack:** TypeScript, Next.js 16, vitest, `@anthropic-ai/sdk` (rama Anthropic), `fetch` crudo (rama OpenAI-compatible).

**Spec:** `docs/superpowers/specs/2026-07-27-coach-agentic-loop-design.md`

## Global Constraints

- **Directorio de trabajo: `src/`.** El `node_modules` real vive ahí, no en la raíz. Todo comando de test se ejecuta desde `src/`.
- **Suite completa antes de cada push:** `npm test` (hoy 1401 tests). No un subconjunto.
- **Línea base local:** 2 fallos preexistentes en `__tests__/lib/sentry-wiring.test.ts` por `@sentry/nextjs` ausente de `node_modules`. **No son regresión.** En CI pasan. Cualquier fallo distinto de esos dos sí lo es.
- **`MAX_ROUNDS = 5`** (`coach-agent.ts:15`) y no está exportado. Los tests lo asumen literalmente.
- **Tests en español**, describiendo el *porqué*, no el *qué*. Convención del repo.
- **Ubicación de tests:** `src/__tests__/lib/<nombre>.test.ts`, importando por alias `@/lib/...`.
- **Backoff con reloj y espera inyectados**, nunca `sleep` real (convención de #171).
- **No tocar** el cliente (`ai-coach-drawer.tsx`), el tuning de prompts, ni las descripciones de tools.
- **Sin migración, sin cambio de esquema, sin variable de entorno nueva.**
- Rama de trabajo: `feat/coach-agentic-loop`, ya creada desde `origin/main`, con el spec ya commiteado (`ae8841d`).

---

## File Structure

| Fichero | Responsabilidad | Acción |
|---|---|---|
| `src/lib/ai/coach-agent.ts` | El bucle agéntico. Único fichero de producción que cambia. | Modificar |
| `src/lib/ai/coach-service.ts` | Call-site: arma el system prompt y elige candidato. Sólo cambia la forma de la llamada. | Modificar (5 líneas) |
| `src/__tests__/lib/coach-agent-loop.test.ts` | Los tests directos que hoy no existen: guardas de contrato + los dos defectos. | Crear |
| `docs/STATUS.md` | Sección de cabecera de la pieza. | Modificar |

No se crean módulos nuevos. `coach-agent.ts` son 181 líneas con una responsabilidad clara (conducir el bucle de tools y devolver un stream); no procede partirlo.

---

## Task 1: Un solo candidato en la interfaz, y asas de reloj

Refactor mecánico, sin cambio de comportamiento. Va primero para que los tests de las tareas siguientes se escriban ya contra la interfaz definitiva y no haya que reescribirlos.

**Por qué:** `coach-service.ts` tiene el `ResolvedCall` en la mano y hoy lo desarma campo a campo para volver a armarlo dentro. Dos fuentes de verdad para el mismo dato. Y `executeAiCall` (Task 4) necesita un `ResolvedCall`; fabricar uno con un `source` inventado sería mentir en el tipo.

**Files:**
- Modify: `src/lib/ai/coach-agent.ts:9-25` (imports + interfaz), `:31-33` (desestructurado), y los usos de `opts.provider` / `opts.apiKey` / `opts.model`
- Modify: `src/lib/ai/coach-service.ts:202-210` (call-site)

**Interfaces:**
- Consumes: `ResolvedCall` de `@/lib/ai/resolve-provider` — `{ provider: AiProvider; model: string; apiKey: string; source: "user" | "env" | "none" }`
- Produces: `CoachAgentOptions` con `candidate: ResolvedCall`, más `sleep?: (ms: number) => Promise<void>`, `now?: () => number`, `rand?: () => number`. Las Tasks 2–4 construyen sus opciones con esta forma.

- [ ] **Step 1: Cambiar imports e interfaz en `coach-agent.ts`**

Sustituir las líneas 9-25 (bloque de imports + `CoachAgentOptions`) por:

```ts
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { ResolvedCall } from "./resolve-provider"
import type { SystemBlock } from "./chat"
import { COACH_TOOLS, executeCoachTool, type ToolResult } from "./coach-tools"
import { AiCallError } from "./ai-error"

const MAX_ROUNDS = 5

export interface CoachAgentOptions {
  /**
   * Provider + modelo + clave, ya resueltos para ESTA llamada. Un objeto y no
   * tres campos sueltos: el llamador ya lo tiene armado, y el reintento por
   * ronda (dentro del bucle) necesita pasárselo a executeAiCall sin fabricar
   * un `source` falso.
   */
  candidate: ResolvedCall
  system:   string | SystemBlock[]
  messages: { role: "user" | "assistant"; content: string }[]
  prisma:   PrismaClient
  userId:   string
  /** Inyectados para que los tests de backoff no quemen segundos de reloj real. Espejo de executeAiCall. */
  sleep?: (ms: number) => Promise<void>
  now?:   () => number
  rand?:  () => number
}
```

Nota: `import type { AiProvider } from "./config"` desaparece — deja de usarse.

- [ ] **Step 2: Desestructurar una sola vez y propagar**

En `streamCoachAgent`, justo debajo de `const encoder = new TextEncoder()`, añadir:

```ts
  const { provider, model, apiKey } = opts.candidate
```

Y sustituir en todo el cuerpo: `opts.provider` → `provider`, `opts.apiKey` → `apiKey`, `opts.model` → `model`. Son 8 usos, en las líneas 46, 48, 59, 87, 89, 90, 110 y 121 del fichero original.

- [ ] **Step 3: Actualizar el call-site en `coach-service.ts`**

Sustituir el objeto pasado a `streamCoachAgent` (líneas 202-210) por:

```ts
        return await streamCoachAgent({
          candidate: c,
          system:    systemBlocks,
          messages:  opts.messages,
          prisma:    opts.prisma,
          userId:    opts.userId,
        })
```

- [ ] **Step 4: Verificar que no hay regresión**

Desde `src/`:

```bash
npx tsc --noEmit 2>&1 | grep -v "sentry\|puppeteer" | head -20
npx vitest run __tests__/lib/coach-service.test.ts __tests__/lib/coach-agentic-degradation.test.ts
```

Esperado: `tsc` sin errores nuevos (los de `@sentry/nextjs` y `puppeteer-core` son preexistentes y se filtran); vitest **PASS** en ambos ficheros. `coach-service.test.ts` sólo asevera sobre `.system`, que no cambia.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/coach-agent.ts src/lib/ai/coach-service.ts
git commit -m "refactor(coach): un ResolvedCall en vez de tres campos sueltos + asas de reloj

El llamador ya tiene el candidato armado y lo desarmaba para volver a armarlo.
Una fuente de verdad, y el reintento por ronda podra pasarselo a executeAiCall
sin fabricar un source falso.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Arnés de test y guardas de lo que ya funciona

**Por qué primero:** es la lección de `createTrade` / `buildContext` / `persistInsights` — cubrir lo que existe **antes** de cambiarlo. Estos tres tests pasan contra el código actual: son guardas de regresión, no TDD rojo-primero. Que pasen a la primera es el resultado correcto aquí.

**Files:**
- Create: `src/__tests__/lib/coach-agent-loop.test.ts`

**Interfaces:**
- Consumes: `streamCoachAgent` de `@/lib/ai/coach-agent` con la `CoachAgentOptions` de Task 1.
- Produces: los helpers `drain()`, `okSse()`, `badRes()`, `textDelta()`, `toolDelta()`, `fakeClock()` y `baseOpts()`, que usan las Tasks 3 y 4.

- [ ] **Step 1: Escribir el fichero de test con los tres guardas**

Crear `src/__tests__/lib/coach-agent-loop.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { ResolvedCall } from "@/lib/ai/resolve-provider"
import { AiCallError } from "@/lib/ai/ai-error"

// COACH_TOOLS se reduce a una sola tool: el bucle no depende del catalogo real,
// y un catalogo de 12 solo haria ilegibles los cuerpos aseverados.
vi.mock("@/lib/ai/coach-tools", () => ({
  COACH_TOOLS: [{
    name: "get_trade_detail",
    description: "detalle de un trade",
    input_schema: { type: "object", properties: {} },
  }],
  executeCoachTool: vi.fn(async () => ({ text: "trade #7: NQ long, +1.2R", cites: [{ id: "t7", label: "NQ" }] })),
}))

import { streamCoachAgent } from "@/lib/ai/coach-agent"
import { executeCoachTool } from "@/lib/ai/coach-tools"

const mockTool = executeCoachTool as ReturnType<typeof vi.fn>

// ── Arnes ────────────────────────────────────────────────────────────────────

/**
 * Respuestas duck-typed en vez de `new Response(...)`: el bucle solo lee .ok,
 * .status, .body y .text(), y asi el arnes no depende de que el entorno de
 * vitest traiga una implementacion de Response que acepte un ReadableStream.
 */
type FakeRes = {
  ok: boolean
  status: number
  body: ReadableStream<Uint8Array> | null
  text: () => Promise<string>
}

const textDelta = (t: string) => ({ choices: [{ delta: { content: t } }] })
const toolDelta = (id: string, name: string, args: string) =>
  ({ choices: [{ delta: { tool_calls: [{ index: 0, id, function: { name, arguments: args } }] } }] })

/** Cuerpo SSE al estilo OpenRouter. */
function okSse(chunks: object[]): FakeRes {
  const payload = chunks.map(c => `data: ${JSON.stringify(c)}\n`).join("") + "data: [DONE]\n"
  return {
    ok: true, status: 200,
    body: new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(new TextEncoder().encode(payload)); c.close() },
    }),
    text: async () => payload,
  }
}

const badRes = (status: number): FakeRes =>
  ({ ok: false, status, body: null, text: async () => `boom ${status}` })

async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const dec = new TextDecoder()
  let out = ""
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    out += dec.decode(value, { stream: true })
  }
  return out
}

/** Reloj y espera falsos: el tiempo avanza solo cuando el ejecutor duerme. */
function fakeClock() {
  let t = 0
  const slept: number[] = []
  return {
    now: () => t,
    slept,
    sleep: async (ms: number) => { slept.push(ms); t += ms },
  }
}

const candidate: ResolvedCall = {
  provider: "openrouter", model: "free/model", apiKey: "k", source: "user",
}

function baseOpts(over: Partial<Parameters<typeof streamCoachAgent>[0]> = {}) {
  return {
    candidate,
    system:   "eres un coach",
    messages: [{ role: "user" as const, content: "como voy este mes?" }],
    prisma:   {} as PrismaClient,
    userId:   "u1",
    ...over,
  }
}

beforeEach(() => { mockTool.mockClear() })
afterEach(() => { vi.unstubAllGlobals() })

// ── Guardas de contrato ──────────────────────────────────────────────────────

describe("streamCoachAgent — contrato con el llamador", () => {
  it("un fallo de PRE-FLIGHT lanza AiCallError con kind 'tools': es la señal que deja al llamador degradar a estatico", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => badRes(400) as unknown as Response))

    await expect(streamCoachAgent(baseOpts())).rejects.toMatchObject({
      name: "AiCallError", status: 400, kind: "tools",
    })
  })

  it("emite la trama {tool} ANTES que {cites}: la primera alimenta el indicador 'consultando' mientras la consulta corre", async () => {
    let n = 0
    vi.stubGlobal("fetch", vi.fn(async () => {
      n++
      return (n === 1
        ? okSse([toolDelta("t1", "get_trade_detail", "{}")])
        : okSse([textDelta("Vas bien.")])) as unknown as Response
    }))

    const out = await drain(await streamCoachAgent(baseOpts()))

    const iTool  = out.indexOf('{"tool":"get_trade_detail"}')
    const iCites = out.indexOf('{"cites"')
    expect(iTool).toBeGreaterThanOrEqual(0)
    expect(iCites).toBeGreaterThan(iTool)
    expect(out).toContain("Vas bien.")
  })

  it("dos llamadas identicas en el mismo turno ejecutan la tool UNA vez: el cache evita la consulta redundante a BD", async () => {
    let n = 0
    vi.stubGlobal("fetch", vi.fn(async () => {
      n++
      if (n > 1) return okSse([textDelta("listo")]) as unknown as Response
      // Dos tool_calls, indices distintos, mismo nombre y mismos argumentos.
      const payload =
        `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [
          { index: 0, id: "a", function: { name: "get_trade_detail", arguments: "{}" } },
          { index: 1, id: "b", function: { name: "get_trade_detail", arguments: "{}" } },
        ] } }] })}\ndata: [DONE]\n`
      return {
        ok: true, status: 200,
        body: new ReadableStream<Uint8Array>({
          start(c) { c.enqueue(new TextEncoder().encode(payload)); c.close() },
        }),
        text: async () => payload,
      } as unknown as Response
    }))

    await drain(await streamCoachAgent(baseOpts()))

    expect(mockTool).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Ejecutar — deben pasar contra el código ACTUAL**

Desde `src/`:

```bash
npx vitest run __tests__/lib/coach-agent-loop.test.ts
```

Esperado: **3 passed**. Si alguno falla, el arnés está mal (no el código de producción): revisar antes de seguir, porque las Tasks 3 y 4 se apoyan en él.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/lib/coach-agent-loop.test.ts
git commit -m "test(coach): guardas de contrato de streamCoachAgent (181 LOC sin un solo test directo)

Pre-flight con kind tools, orden de las tramas NUL, y el cache de tools.
Pasan contra el codigo actual a proposito: cubrir lo que existe ANTES de
cambiarlo, que es la leccion de createTrade/buildContext/persistInsights.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Agotar rondas fuerza una respuesta final (D2, ambas rutas)

TDD rojo-primero. Dos tests nuevos que fallan contra el código actual.

**Files:**
- Modify: `src/__tests__/lib/coach-agent-loop.test.ts` (añadir bloque)
- Modify: `src/lib/ai/coach-agent.ts:57-62` (rama Anthropic), `:108-115` (`doFetch` + pre-flight), `:130-134` (bucle)

**Interfaces:**
- Consumes: helpers de Task 2 (`drain`, `okSse`, `textDelta`, `toolDelta`, `baseOpts`).
- Produces: `doFetch` pasa a tener firma `(toolChoice: "auto" | "none") => Promise<Response>`. Task 4 la envuelve.

- [ ] **Step 1: Escribir los tests que fallan**

Añadir al final de `coach-agent-loop.test.ts`:

```ts
// ── D2: agotar MAX_ROUNDS ────────────────────────────────────────────────────

describe("streamCoachAgent — agotar MAX_ROUNDS no puede terminar sin respuesta", () => {
  it("OpenRouter: la ultima ronda va con tool_choice 'none', asi el modelo cierra con lo recopilado", async () => {
    const bodies: string[] = []
    const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
      bodies.push(init.body)
      const tc = JSON.parse(init.body).tool_choice
      // Un proveedor real que recibe "none" no puede pedir tools: responde.
      return (tc === "none"
        ? okSse([textDelta("Cierro con lo que recopile.")])
        : okSse([toolDelta(`t${bodies.length}`, "get_trade_detail", `{"n":${bodies.length}}`)])) as unknown as Response
    })
    vi.stubGlobal("fetch", fetchMock)

    const out = await drain(await streamCoachAgent(baseOpts()))

    // El techo de peticiones no sube: sigue siendo MAX_ROUNDS.
    expect(fetchMock).toHaveBeenCalledTimes(5)
    // El pre-flight ES la ronda 0 y debe seguir pudiendo pedir tools.
    expect(JSON.parse(bodies[0]).tool_choice).toBe("auto")
    expect(JSON.parse(bodies[4]).tool_choice).toBe("none")
    // Lo que de verdad importa: el trader recibe texto, no silencio.
    expect(out).toContain("Cierro con lo que recopile.")
  })
})
```

Y un fichero hermano para la rama Anthropic, que necesita mockear el SDK a nivel de módulo — crear `src/__tests__/lib/coach-agent-anthropic.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest"
import type { PrismaClient } from "@/lib/generated/prisma/client"
import type { ResolvedCall } from "@/lib/ai/resolve-provider"

// vi.hoisted: vi.mock se iza por encima de los const, y sin esto el mock
// referenciaria una variable en zona muerta temporal.
const h = vi.hoisted(() => ({ anthropicStream: vi.fn() }))

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { stream: (p: unknown) => h.anthropicStream(p) }
  },
}))

vi.mock("@/lib/ai/coach-tools", () => ({
  COACH_TOOLS: [{ name: "get_trade_detail", description: "d", input_schema: { type: "object", properties: {} } }],
  executeCoachTool: vi.fn(async () => ({ text: "trade #7" })),
}))

import { streamCoachAgent } from "@/lib/ai/coach-agent"

/** Un turno del SDK: async-iterable de eventos + finalMessage(). */
function turn(events: unknown[], final: unknown) {
  return {
    async *[Symbol.asyncIterator]() { for (const e of events) yield e },
    finalMessage: async () => final,
  }
}

const TOOL_TURN = () => turn([], {
  stop_reason: "tool_use",
  content: [{ type: "tool_use", id: "t1", name: "get_trade_detail", input: {} }],
})

const TEXT_TURN = () => turn(
  [{ type: "content_block_delta", delta: { type: "text_delta", text: "Cierro con lo que recopile." } }],
  { stop_reason: "end_turn", content: [] },
)

async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const dec = new TextDecoder()
  let out = ""
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    out += dec.decode(value, { stream: true })
  }
  return out
}

const candidate: ResolvedCall = {
  provider: "anthropic", model: "claude-x", apiKey: "k", source: "user",
}

afterEach(() => { h.anthropicStream.mockReset() })

describe("streamCoachAgent (Anthropic) — agotar MAX_ROUNDS no puede terminar sin respuesta", () => {
  it("la ultima ronda va con tool_choice {type:'none'}, asi el modelo cierra con lo recopilado", async () => {
    const params: Array<{ tool_choice?: { type: string } }> = []
    h.anthropicStream.mockImplementation((p: { tool_choice?: { type: string } }) => {
      params.push(p)
      return p.tool_choice?.type === "none" ? TEXT_TURN() : TOOL_TURN()
    })

    const out = await drain(await streamCoachAgent({
      candidate,
      system:   "eres un coach",
      messages: [{ role: "user" as const, content: "como voy?" }],
      prisma:   {} as PrismaClient,
      userId:   "u1",
    }))

    expect(h.anthropicStream).toHaveBeenCalledTimes(5)
    expect(params[0].tool_choice).toBeUndefined()
    expect(params[4].tool_choice).toEqual({ type: "none" })
    expect(out).toContain("Cierro con lo que recopile.")
  })
})
```

- [ ] **Step 2: Ejecutar y VERIFICAR EL ROJO**

```bash
npx vitest run __tests__/lib/coach-agent-loop.test.ts __tests__/lib/coach-agent-anthropic.test.ts
```

Esperado: **2 failed**. Concretamente:
- OpenRouter: `expected 'auto' to be 'none'` en `bodies[4]`, y el `out` sin el texto de cierre.
- Anthropic: `expected undefined to equal { type: 'none' }` en `params[4]`.

Si alguno pasa en verde, el test no está probando nada — parar y arreglarlo antes de implementar.

- [ ] **Step 3: Implementar en la rama Anthropic**

En `coach-agent.ts`, dentro del `for` de la rama Anthropic, sustituir la construcción del stream por:

```ts
          for (let round = 0; round < MAX_ROUNDS; round++) {
            // Ultima ronda: el modelo NO puede pedir mas tools, asi que responde
            // con lo recopilado. Sin esto el bucle ejecuta las tools de la ultima
            // ronda, mete los resultados en la conversacion y cierra el stream
            // sin que el modelo llegue a hablar: el trader ve "consultando" y nada.
            const isLast = round === MAX_ROUNDS - 1
            const stream = client.messages.stream({
              model, max_tokens: 4096,
              ...(systemParam ? { system: systemParam as never } : {}),
              tools: COACH_TOOLS as never,
              ...(isLast ? { tool_choice: { type: "none" as const } as never } : {}),
              messages: convo as never,
            })
```

- [ ] **Step 4: Implementar en la rama OpenRouter**

Parametrizar `doFetch` y el pre-flight:

```ts
  const doFetch = (toolChoice: "auto" | "none") => fetch(`${baseUrl}/chat/completions`, {
    method: "POST", headers,
    body: JSON.stringify({ model, max_tokens: 4096, tools, tool_choice: toolChoice, stream: true, messages }),
  })

  // Pre-flight the first request OUTSIDE the stream: if the model rejects tools,
  // this throws synchronously and the caller falls back to the static path.
  //
  // OJO: este pre-flight ES la ronda 0 — su Response se reutiliza como `res` en
  // la primera vuelta del bucle. Por eso va con "auto" explicito.
  const firstRes = await doFetch("auto")
```

Y en el bucle:

```ts
        for (let round = 0; round < MAX_ROUNDS; round++) {
          const isLast = round === MAX_ROUNDS - 1
          if (round > 0) {
            res = await doFetch(isLast ? "none" : "auto")
            if (!res.ok || !res.body) break
          }
```

- [ ] **Step 5: Ejecutar y verificar el verde**

```bash
npx vitest run __tests__/lib/coach-agent-loop.test.ts __tests__/lib/coach-agent-anthropic.test.ts
```

Esperado: **5 passed** (3 guardas de Task 2 + 2 nuevos).

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/coach-agent.ts src/__tests__/lib/coach-agent-loop.test.ts src/__tests__/lib/coach-agent-anthropic.test.ts
git commit -m "fix(coach): agotar MAX_ROUNDS ya no cierra el stream sin respuesta

Si el modelo pedia tools en la ultima ronda, el codigo las ejecutaba, metia los
resultados en la conversacion y el for terminaba -> controller.close(). El modelo
nunca respondia con esos datos: el trader veia 'consultando' y luego nada.

La ultima ronda va con tool_choice none, asi que el modelo no PUEDE pedir mas
herramientas y el break existente dispara solo. El modo de fallo queda eliminado
por construccion, no evitado. Techo de peticiones intacto (5).

Se cambia tool_choice y no se omiten los tools: el historial ya lleva bloques
tool_use, y cambiar las definiciones de tools invalidaria la cache de prompt del
bloque estatico del system (los tools se renderizan en la posicion 0 del prefijo).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Reintento en las rondas 2+ (D1, sólo OpenRouter)

TDD rojo-primero. Tres tests.

**Por qué sólo OpenRouter:** la rama Anthropic usa `client.messages.stream()`, que *lanza* en vez de devolver un `Response` inspeccionable; ese throw cae en el `catch` de `:81` → `controller.error(err)`. Ya falla de forma visible, y el SDK ya reintenta 429/5xx por su cuenta (`max_retries: 2`). Envolverlo también sería doble reintento.

**Files:**
- Modify: `src/__tests__/lib/coach-agent-loop.test.ts` (añadir bloque)
- Modify: `src/lib/ai/coach-agent.ts` — import de `executeAiCall`, y el `if (round > 0)` del bucle

**Interfaces:**
- Consumes: `executeAiCall` de `./execute` — `executeAiCall<T>({ candidates, profile, feature, run, sleep?, now?, rand? }): Promise<T>`; `AiCallError` de `./ai-error`.
- Produces: nada nuevo hacia fuera. El contrato observable es: al agotarse el reintento, el stream **falla** en vez de cerrarse.

- [ ] **Step 1: Escribir los tests que fallan**

Añadir al final de `coach-agent-loop.test.ts`:

```ts
// ── D1: rondas 2+ ────────────────────────────────────────────────────────────

describe("streamCoachAgent — las rondas 2+ ya no fallan en silencio", () => {
  it("un 429 en la ronda 1 se reintenta y el stream llega entero", async () => {
    const c = fakeClock()
    let n = 0
    vi.stubGlobal("fetch", vi.fn(async () => {
      n++
      if (n === 1) return okSse([toolDelta("t1", "get_trade_detail", "{}")]) as unknown as Response
      if (n === 2) return badRes(429) as unknown as Response
      return okSse([textDelta("Tu peor setup es BL.")]) as unknown as Response
    }))

    const out = await drain(await streamCoachAgent(baseOpts({
      sleep: c.sleep, now: c.now, rand: () => 0.5,
    })))

    expect(n).toBe(3)
    expect(out).toContain("Tu peor setup es BL.")
    // Perfil interactivo: 400 ms base, factor 1, jitter neutralizado con rand 0.5.
    expect(c.slept).toEqual([400])
  })

  it("un 429 que no cede AGOTA el reintento y hace fallar el stream: un truncamiento mudo se lee como torpeza del modelo", async () => {
    const c = fakeClock()
    let n = 0
    vi.stubGlobal("fetch", vi.fn(async () => {
      n++
      return (n === 1
        ? okSse([toolDelta("t1", "get_trade_detail", "{}")])
        : badRes(429)) as unknown as Response
    }))

    const stream = await streamCoachAgent(baseOpts({
      sleep: c.sleep, now: c.now, rand: () => 0.5,
    }))

    await expect(drain(stream)).rejects.toThrow(AiCallError)
    // Pre-flight + 2 intentos (perfil interactivo: 1 reintento).
    expect(n).toBe(3)
  })

  it("un 400 en la ronda 1 falla sin quemar reintentos: es permanente, esperar no lo arregla", async () => {
    const c = fakeClock()
    let n = 0
    vi.stubGlobal("fetch", vi.fn(async () => {
      n++
      return (n === 1
        ? okSse([toolDelta("t1", "get_trade_detail", "{}")])
        : badRes(400)) as unknown as Response
    }))

    const stream = await streamCoachAgent(baseOpts({
      sleep: c.sleep, now: c.now, rand: () => 0.5,
    }))

    await expect(drain(stream)).rejects.toThrow(AiCallError)
    expect(n).toBe(2)
    expect(c.slept).toEqual([])
  })
})
```

- [ ] **Step 2: Ejecutar y VERIFICAR EL ROJO**

```bash
npx vitest run __tests__/lib/coach-agent-loop.test.ts
```

Esperado: **3 failed**, y los mensajes importan porque confirman el defecto:
- Test 1: `expected 2 to be 3` — hoy no hay reintento, el `break` sale tras el 429.
- Tests 2 y 3: `promise resolved instead of rejecting` — hoy el stream se cierra limpio. **Ese verde falso es exactamente el defecto.**

- [ ] **Step 3: Implementar**

Añadir el import en `coach-agent.ts`:

```ts
import { executeAiCall } from "./execute"
```

Y sustituir el bloque `if (round > 0)` del bucle por:

```ts
          if (round > 0) {
            // El reintento vive DENTRO del bucle porque no hay nadie fuera que
            // pueda hacerlo: para cuando corre esta ronda, streamCoachAgent ya
            // DEVOLVIO el ReadableStream y start(controller) corre asincrono.
            // Ni el try/catch del llamador, ni shouldDegradeToStatic, ni el
            // executeAiCall externo siguen en el camino. Es el hueco de #171:
            // su frontera declarada es "antes del primer token".
            res = await executeAiCall({
              candidates: [opts.candidate],   // uno solo: no reenrutar a mitad de conversacion
              profile:    "interactive",      // el trader mira el spinner
              feature:    "ai_chat",
              run: async () => {
                const r = await doFetch(isLast ? "none" : "auto")
                if (!r.ok || !r.body) {
                  throw new AiCallError({
                    status: r.status, provider, model,
                    // "chat" y no "tools": aqui no se juzga si el modelo soporta
                    // function calling. Degradar a la ruta estatica es imposible
                    // con texto ya en pantalla, asi que marcarlo "tools" seria
                    // documentar una intencion que no puede ocurrir.
                    kind: "chat",
                    detail: await r.text().catch(() => ""),
                  })
                }
                return r
              },
              sleep: opts.sleep, now: opts.now, rand: opts.rand,
            })
          }
```

El `break` mudo desaparece. Si `executeAiCall` se agota, lanza, y el `catch` del `start` hace `controller.error(err)`.

- [ ] **Step 4: Ejecutar y verificar el verde**

```bash
npx vitest run __tests__/lib/coach-agent-loop.test.ts __tests__/lib/coach-agent-anthropic.test.ts
```

Esperado: **8 passed** (3 guardas + 2 de D2 + 3 de D1).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/coach-agent.ts src/__tests__/lib/coach-agent-loop.test.ts
git commit -m "fix(coach): reintento en las rondas 2+ del bucle agentico (hueco de #171)

Un 429 en cualquier ronda posterior a la primera hacia break: stream truncado,
sin error, sin reintento. Sobre free tier tiene que estar pasando, y produce
exactamente el sintoma 'el modelo no aprovecha sus herramientas'.

El reintento tiene que vivir DENTRO del bucle porque no hay nadie fuera que
pueda hacerlo: cuando corre la ronda 2, streamCoachAgent ya devolvio el stream.
Se reutiliza executeAiCall (el dueno unico del reintento desde #171) con lista
de UN candidato, para no reenrutar el contexto del trader a otro modelo a mitad
de conversacion. Al agotarse, controller.error en vez de un cierre mudo.

Solo afecta a la rama OpenRouter: la de Anthropic ya lanza y ya reintenta sola.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Suite completa, documentación y PR

- [ ] **Step 1: Suite completa**

Desde `src/`:

```bash
npm test
```

Esperado: **1409 tests** (1401 + 8 nuevos), con **exactamente 2 fallos**, ambos en `__tests__/lib/sentry-wiring.test.ts`. Cualquier otro fallo es regresión de esta pieza — arreglarlo antes de seguir.

- [ ] **Step 2: Lint y tipos**

```bash
npx eslint lib/ai/coach-agent.ts lib/ai/coach-service.ts __tests__/lib/coach-agent-loop.test.ts __tests__/lib/coach-agent-anthropic.test.ts
npx tsc --noEmit 2>&1 | grep -v "sentry\|puppeteer" | head -20
```

Esperado: sin salida en ninguno de los dos.

- [ ] **Step 3: Actualizar `docs/STATUS.md`**

Insertar una sección nueva **justo debajo** de la línea `> Arquitectura canónica: ...` (es decir, por encima de "Resiliencia de IA sobre el free tier"), porque las secciones de cabecera van de más reciente a más antigua:

El número de PR aún no existe: se escribe `PR #PENDIENTE` y se sustituye en el Step 6, que es
donde `gh pr create` lo devuelve. No dejar la cadena `PENDIENTE` en `main`.

```markdown
## El bucle agéntico del Coach cierra siempre (2026-07-27, PR #PENDIENTE)

El síntoma era *"el Coach no aprovecha sus herramientas"*. El tuning no tenía nada que ver
(#168 se sostiene): eran tres defectos mecánicos.

**El hecho que gobierna el arreglo.** El `catch` de `coach-service.ts:211` **no puede ver** un
fallo de ronda 2+: para cuando esa ronda corre, `streamCoachAgent` ya devolvió el
`ReadableStream` y `start(controller)` corre asíncrono. Ni `shouldDegradeToStatic` ni el
`executeAiCall` externo siguen en el camino. De ahí que el reintento tenga que vivir *dentro*
del bucle y la extenuación salir por `controller.error` — no son preferencias de diseño.

**Rondas 2+ con reintento.** Era el hueco declarado de #171, cuya frontera es "antes del primer
token": el `executeAiCall` del llamador sólo cubría el pre-flight. Ahora cada ronda se envuelve
en `executeAiCall` con lista de **un** candidato — reintentar sí, reenrutar a otro modelo a
mitad de conversación no. Al agotarse, el stream falla de forma visible; el `break` mudo que
producía una respuesta truncada con pinta de completa desaparece. Sólo la rama OpenRouter: la
de Anthropic ya lanzaba y ya reintentaba sola.

**Agotar rondas fuerza una respuesta.** La última ronda va con `tool_choice: "none"`, así que el
modelo no *puede* pedir más herramientas y responde con lo recopilado. El modo de fallo queda
eliminado **por construcción**, con el techo de 5 peticiones intacto. Se cambia `tool_choice` y
no se omiten los `tools`: el historial ya lleva bloques `tool_use`, y cambiar las definiciones
invalidaría la caché de prompt del bloque estático del system.

**Los tests que faltaban.** `streamCoachAgent` eran 181 líneas que deciden si las tools funcionan,
con cobertura cero — sólo aparecía mockeado. Mismo patrón que dejó pasar los bugs de
`createTrade` / `buildContext` / `persistInsights`. Ahora tiene 8 tests directos, con el backoff
sobre reloj y espera inyectados.

> **Límite conocido, dicho a propósito.** `ai-coach-drawer.tsx:264` fija
> `setApiError("BAD_REQUEST")`, así que el trader ve un aviso genérico sea un 429 o un 500.
> Ensanchar esa taxonomía es otra pieza.

Suite 1401 → 1409. Sin migración.
```

- [ ] **Step 4: Commit de la doc y push**

```bash
git add docs/STATUS.md
git commit -m "docs(status): el bucle agentico del Coach cierra siempre

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push -u origin feat/coach-agentic-loop
```

- [ ] **Step 5: Abrir el PR**

```bash
gh pr create --base main --title "fix(coach): el bucle agentico reintenta y nunca cierra sin respuesta" --body "$(cat <<'EOF'
Cierra los tres defectos mecanicos auditados el 2026-07-24 que producian el
sintoma "el Coach no aprovecha sus herramientas". El tuning no era la causa.

## El hecho que gobierna el arreglo

El `catch` de `coach-service.ts:211` no puede ver un fallo de ronda 2+: para
cuando esa ronda corre, `streamCoachAgent` ya devolvio el `ReadableStream` y
`start(controller)` corre asincrono. Ni `shouldDegradeToStatic` ni el
`executeAiCall` externo siguen en el camino. El reintento tiene que vivir dentro
del bucle y la extenuacion salir por `controller.error`; no hay otra via.

## Que cambia

- **Rondas 2+ con reintento** (hueco declarado de #171, cuya frontera es "antes
  del primer token"). `executeAiCall` con lista de UN candidato: reintentar si,
  reenrutar a mitad de conversacion no. Al agotarse, `controller.error` en vez
  de un `break` mudo que producia una respuesta truncada con pinta de completa.
  Solo rama OpenRouter: la de Anthropic ya lanzaba y ya reintentaba sola.
- **Agotar `MAX_ROUNDS` fuerza una respuesta**: la ultima ronda va con
  `tool_choice: "none"`. Modo de fallo eliminado por construccion, techo de 5
  peticiones intacto, y la cache de prompt del bloque estatico se preserva
  (cambiar `tool_choice` no la invalida; cambiar los `tools` si).
- **8 tests directos** de `streamCoachAgent`, que tenia cobertura cero.

## Fuera de alcance, declarado

- No se toca el cliente: `ai-coach-drawer.tsx` ya maneja el error a mitad de
  stream y conserva el texto parcial. Su limitacion (`setApiError` fijo a
  `BAD_REQUEST`) se deja viva y anotada en STATUS.
- No se toca el tuning de prompts. Esto no prueba que un modelo de pago no
  ayudaria a la redaccion; arregla el fallo mecanico que se leia como torpeza.

Suite 1401 -> 1409. Sin migracion.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Si `gh pr create` falla con `GraphQL: Something went wrong`, comprobar un incidente de GitHub antes de sospechar del entorno:

```bash
curl -sS --ssl-no-revoke https://www.githubstatus.com/api/v2/summary.json | head -20
```

- [ ] **Step 6: Sustituir el número de PR, esperar CI verde y mergear**

`gh pr create` imprime la URL del PR; el número es su último segmento. Sustituirlo en STATUS y
enmendar antes de que CI termine:

```bash
PR=$(gh pr view --json number --jq .number)
sed -i "s/PR #PENDIENTE/PR #$PR/" docs/STATUS.md
grep -n "PENDIENTE" docs/STATUS.md && echo "QUEDAN PLACEHOLDERS — no mergear" || echo "limpio"
git add docs/STATUS.md && git commit -m "docs(status): numero de PR" && git push
```

Esperado del `grep`: `limpio`. Luego:

```bash
gh pr checks --watch
gh pr merge --squash --delete-branch
```

No hay migración en esta pieza, así que **no** aplica la espera de `migrate-deploy`.

---

## Notas de ejecución

- **El orden de las tareas no es negociable.** Task 1 va primero para que los tests de las Tasks 2–4 se escriban contra la interfaz definitiva; hacerlo al revés obliga a reescribirlos.
- **Verificar el rojo es un paso, no un trámite.** En Task 4 el rojo de los tests 2 y 3 es *"promise resolved instead of rejecting"*: ese verde falso **es** el defecto que se está arreglando. Si aparece verde tras implementar sin haber visto ese rojo, el test no prueba nada.
- **Si `npm test` da más de 2 fallos**, comprobar primero si son `Cannot find module '@sentry/nextjs'` o `puppeteer-core` antes de alarmarse: son ausencias conocidas de `node_modules` en local, no regresiones.
