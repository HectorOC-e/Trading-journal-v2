import { describe, it, expect, vi } from "vitest"
import { executeAiCall } from "@/lib/ai/execute"
import { AiCallError } from "@/lib/ai/ai-error"

const cand = (model: string) =>
  ({ provider: "openrouter" as const, model, apiKey: "k", source: "user" as const })

const fail = (status: number | null, model = "m") =>
  new AiCallError({ status, provider: "openrouter", model, kind: "chat" })

/** Reloj y espera falsos: el tiempo avanza solo cuando el ejecutor duerme. */
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

describe("executeAiCall — techo por intento", () => {
  it("corta un intento colgado: totalBudgetMs decide si ARRANCAR otro, no acota el que ya corre", async () => {
    const c = fakeClock()
    // Nunca resuelve: es la conexion colgada que se observo en vivo (162 s con
    // el trader mirando el spinner, muy por debajo del maxDuration de 300 s).
    const run = vi.fn(() => new Promise(() => {}))

    await expect(executeAiCall({
      candidates: [cand("a")], profile: "interactive", feature: "ai_chat",
      run: run as never, attemptTimeoutMs: 20,
      sleep: c.sleep, now: c.now, rand: () => 0.5,
    })).rejects.toMatchObject({ name: "AiCallError", status: null })

    // Perfil interactivo = 1 reintento, asi que 2 intentos y un backoff.
    expect(run).toHaveBeenCalledTimes(2)
    expect(c.slept).toEqual([400])
  })

  it("aborta la señal que recibe el run, para que el fetch muera de verdad y no solo la promesa", async () => {
    const c = fakeClock()
    let abortada = false
    const run = vi.fn((_c: unknown, signal: AbortSignal) => new Promise((_res, rej) => {
      signal.addEventListener("abort", () => { abortada = true; rej(new Error("aborted")) })
    }))

    await expect(executeAiCall({
      candidates: [cand("a")], profile: "interactive", feature: "ai_chat",
      run: run as never, attemptTimeoutMs: 20,
      sleep: c.sleep, now: c.now, rand: () => 0.5,
    })).rejects.toThrow()

    expect(abortada).toBe(true)
  })

  it("un intento que resuelve a tiempo no se ve afectado", async () => {
    const c = fakeClock()
    const out = await executeAiCall({
      candidates: [cand("a")], profile: "interactive", feature: "ai_chat",
      run: async () => "ok", attemptTimeoutMs: 5000,
      sleep: c.sleep, now: c.now, rand: () => 0.5,
    })
    expect(out).toBe("ok")
    expect(c.slept).toEqual([])
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
    expect(c.slept).toEqual([]) // esperar un 401 no sirve de nada
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
    // Cada intento consume 5s de reloj: el 2o supera el techo de 8s.
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

  it("pasa el candidato completo a run, con su clave y modelo", async () => {
    const run = vi.fn().mockResolvedValue("ya")
    await executeAiCall({
      candidates: [cand("modelo-x")], profile: "interactive", feature: "ai_chat", run,
    })
    // Segundo argumento: la señal del techo por intento, que el call-site pasa al fetch.
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({ model: "modelo-x", apiKey: "k" }),
      expect.any(AbortSignal),
    )
  })
})
