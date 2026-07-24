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

  it("no tiene ids duplicados", () => {
    expect(new Set(FREE_MODEL_CHAIN).size).toBe(FREE_MODEL_CHAIN.length)
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
