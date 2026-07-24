import { describe, it, expect } from "vitest"
import { shouldDegradeToStatic } from "@/lib/ai/coach-service"
import { AiCallError } from "@/lib/ai/ai-error"

const e = (status: number | null) =>
  new AiCallError({ status, provider: "openrouter", model: "m", kind: "tools" })

/**
 * El bucle del Coach tenia un catch anidado que interpretaba CUALQUIER fallo de
 * la ruta agentica como "este modelo no soporta tools" y caia a la ruta estatica.
 * Un 429 transitorio degradaba el Coach a modo sin herramientas en silencio — y
 * eso se lee como "el modelo gratuito no aprovecha sus tools".
 */
describe("shouldDegradeToStatic — por que fallo la ruta agentica", () => {
  it("400/404 en la ruta de tools = el modelo no las soporta -> degradar", () => {
    expect(shouldDegradeToStatic(e(404))).toBe(true)
    expect(shouldDegradeToStatic(e(400))).toBe(true)
  })

  it("un 429 NO degrada: es transitorio, hay que reintentar CON tools", () => {
    expect(shouldDegradeToStatic(e(429))).toBe(false)
  })

  it("un 5xx tampoco degrada", () => {
    expect(shouldDegradeToStatic(e(503))).toBe(false)
    expect(shouldDegradeToStatic(e(500))).toBe(false)
  })

  it("un 401 no degrada: la clave es mala y la ruta estatica fallaria igual", () => {
    expect(shouldDegradeToStatic(e(401))).toBe(false)
    expect(shouldDegradeToStatic(e(403))).toBe(false)
  })

  it("un error sin tipar no degrada — no hay evidencia de que sea por tools", () => {
    expect(shouldDegradeToStatic(new Error("vete a saber"))).toBe(false)
  })

  it("un fallo de red no degrada: es transitorio", () => {
    expect(shouldDegradeToStatic(e(null))).toBe(false)
  })
})
