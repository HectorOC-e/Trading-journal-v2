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
    expect(e.model).toBe("m")
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

  it("404 no se reintenta: un modelo inexistente no aparece esperando", () => {
    expect(isRetryable(err(404))).toBe(false)
  })
})

describe("statusOf", () => {
  it("extrae el status de un AiCallError y null de cualquier otra cosa", () => {
    expect(statusOf(err(429))).toBe(429)
    expect(statusOf(new Error("nope"))).toBeNull()
  })
})
