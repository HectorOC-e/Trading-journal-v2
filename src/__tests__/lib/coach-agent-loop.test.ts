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

const mockTool = executeCoachTool as unknown as ReturnType<typeof vi.fn>

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

  it("antes de romper deja una trama {error} con el status: sin ella el cliente no puede distinguir un 429 de un 500", async () => {
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

    // Se lee a mano: drain() re-lanza y perderiamos lo ya encolado.
    const reader = stream.getReader()
    const dec = new TextDecoder()
    let raw = ""
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        raw += dec.decode(value, { stream: true })
      }
      throw new Error("deberia haber roto el stream")
    } catch (err) {
      expect((err as Error).message).not.toBe("deberia haber roto el stream")
    }

    expect(raw).toContain('{"error":{"status":429,"kind":"chat"}}')
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
