import { describe, it, expect } from "vitest"
import { formatErrorForUser } from "@/lib/error-formatter"
import type { TRPCClientError } from "@trpc/client"
import type { AppRouter } from "@/server/trpc/root"

type MockError = Partial<TRPCClientError<AppRouter>> & {
  message: string
  data?: { code?: string }
}

function makeError(message: string, code?: string): TRPCClientError<AppRouter> {
  return { message, data: code ? { code } : undefined } as TRPCClientError<AppRouter>
}

describe("formatErrorForUser", () => {
  it.each([
    ["OPEN_PNL_NOT_REALIZED", "El resultado de una operación abierta se calcula con sus cierres. Registra un cierre parcial o cierra la operación para actualizarlo."],
    ["PARTIAL_HISTORY_REQUIRES_REVIEW", "El historial de cierres parciales necesita revisión. Revisa los precios y cantidades históricos antes de registrar otro movimiento."],
    ["PARTIAL_ACCOUNTING_EDIT", "Esta operación ya tiene cierres parciales. Revisa sus movimientos para corregir los importes; no se pueden editar directamente."],
    ["TRADE_NOT_OPEN", "Esta operación ya no está abierta. Actualiza la página y selecciona una operación abierta para registrar el movimiento."],
    ["INVALID_PARTIAL_SIZE", "La cantidad del cierre parcial supera la posición disponible. Introduce una cantidad positiva que no supere la posición restante."],
    ["INVALID_TRADE_EVENT_VALUE", "El precio y la cantidad del movimiento deben ser números mayores que cero. Revisa los campos e intenta de nuevo."],
    ["INVALID_EVENT_TIMESTAMP", "La fecha u hora del movimiento no es válida. Selecciona una fecha y hora válidas e intenta de nuevo."],
    ["INVALID_COMMISSION", "La comisión debe ser un número igual o mayor que cero. Corrige el importe e intenta de nuevo."],
  ])("translates trading domain message %s with a next action", (code, message) => {
    expect(formatErrorForUser(makeError(code, "BAD_REQUEST"))).toBe(message)
    expect(formatErrorForUser(makeError(code))).toBe(message)
  })

  it("returns server message when user-friendly (short, no jargon)", () => {
    expect(formatErrorForUser(makeError("El nombre no puede estar vacío")))
      .toBe("El nombre no puede estar vacío")
  })

  it("returns server message when precondition_failed has descriptive text", () => {
    const msg = "No hay clave de API configurada. Añade ANTHROPIC_API_KEY en la configuración."
    expect(formatErrorForUser(makeError(msg, "PRECONDITION_FAILED"))).toBe(msg)
  })

  it("returns generic message for INTERNAL_SERVER_ERROR without custom message", () => {
    expect(formatErrorForUser(makeError("Error interno del servidor", "INTERNAL_SERVER_ERROR")))
      .toBe("Error interno del servidor")
  })

  it("maps UNAUTHORIZED code to Spanish message", () => {
    expect(formatErrorForUser(makeError("UNAUTHORIZED", "UNAUTHORIZED")))
      .toBe("No tienes permiso para esta acción")
  })

  it("maps NOT_FOUND to Spanish message", () => {
    expect(formatErrorForUser(makeError("Not found", "NOT_FOUND")))
      .toBe("El elemento ya no existe")
  })

  it("replaces Zod technical error with generic message", () => {
    const zoderror = "Expected number, received string at path .rMultiple"
    const result = formatErrorForUser(makeError(zoderror, "BAD_REQUEST"))
    expect(result).not.toContain("Expected")
    expect(result).not.toContain("received")
    expect(result.length).toBeGreaterThan(5)
  })

  it("replaces Prisma constraint error with generic message", () => {
    const dbError = "violates unique constraint trades_import_ticket_key"
    const result = formatErrorForUser(makeError(dbError, "INTERNAL_SERVER_ERROR"))
    expect(result).not.toContain("constraint")
    expect(result.length).toBeGreaterThan(5)
  })

  it("falls back to default message when code is unknown and message is technical", () => {
    const result = formatErrorForUser(makeError("prisma client error P2002"))
    expect(result).toBe("Operación fallida. Intenta de nuevo")
  })

  it("returns message when message is empty", () => {
    const result = formatErrorForUser(makeError(""))
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })
})
