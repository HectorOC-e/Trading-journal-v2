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
