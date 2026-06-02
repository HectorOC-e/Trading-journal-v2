import type { TRPCClientErrorLike } from "@trpc/client"

// Map TRPC error codes to user-friendly Spanish messages
const ERROR_CODE_MESSAGES: Record<string, string> = {
  UNAUTHORIZED:          "No tienes permiso para esta acción",
  FORBIDDEN:             "Acceso denegado",
  NOT_FOUND:             "El elemento ya no existe",
  CONFLICT:              "Este elemento ya existe (duplicado detectado)",
  PAYLOAD_TOO_LARGE:     "El archivo o datos son demasiado grandes",
  TOO_MANY_REQUESTS:     "Demasiadas solicitudes. Espera un momento e intenta de nuevo",
  INTERNAL_SERVER_ERROR: "Error interno. Intenta de nuevo o contacta soporte",
  BAD_REQUEST:           "Datos inválidos. Revisa los campos e intenta de nuevo",
  PRECONDITION_FAILED:   "Falta configuración requerida",
  TIMEOUT:               "La operación tardó demasiado. Intenta de nuevo",
  METHOD_NOT_SUPPORTED:  "Operación no soportada",
}

// Patterns that indicate a raw technical error message (not user-facing)
const TECHNICAL_PATTERNS = [
  "prisma",
  "Expected ",
  " received ",
  "constraint",
  "null value",
  "Cannot read",
  "stack trace",
  "at Object.",
]

function isTechnicalMessage(msg: string): boolean {
  const lower = msg.toLowerCase()
  return TECHNICAL_PATTERNS.some(p => lower.includes(p.toLowerCase()))
}

// Auto-generated TRPC messages that are NOT custom — replace with Spanish translations
const GENERIC_TRPC_MESSAGES = new Set([
  "unauthorized", "bad request", "forbidden", "not found", "conflict",
  "payload too large", "too many requests", "internal server error",
  "precondition failed", "timeout", "method not supported", "client closed request",
  "bad_request", "not_found", "payload_too_large", "too_many_requests",
  "internal_server_error", "precondition_failed", "method_not_supported",
  "client_closed_request",
])

function isGenericTrpcMessage(msg: string): boolean {
  return GENERIC_TRPC_MESSAGES.has(msg.toLowerCase())
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatErrorForUser(error: TRPCClientErrorLike<any>): string {
  const msg = error.message ?? ""
  const code = (error.data as { code?: string } | undefined)?.code

  // Skip generic TRPC auto-generated messages (replace with Spanish translation)
  const isCustomMessage = msg.length > 0 && !isGenericTrpcMessage(msg) && !isTechnicalMessage(msg) && msg.length < 200

  if (isCustomMessage) {
    return msg
  }

  // Use Spanish translation for known error codes
  if (code && ERROR_CODE_MESSAGES[code]) {
    return ERROR_CODE_MESSAGES[code]
  }

  return "Operación fallida. Intenta de nuevo"
}
