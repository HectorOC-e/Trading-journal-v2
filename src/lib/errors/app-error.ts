// AppError — a typed, catalog-backed error. Throw it from server routers/services
// so every user-facing failure carries a stable code that maps to lib/messages.
//
//   throw new AppError("WITHDRAWAL_EXCEEDS_BALANCE", { amount, available })
//
// On the client, toUserMessage(err, lang) resolves any error (AppError, tRPC, or
// raw) into a ResolvedMessage from the catalog — one place to edit error copy.

import { resolveMessage, isMessageCode } from "@/lib/messages/resolve"
import type { MessageCode } from "@/lib/messages/catalog"
import type { Lang, ResolvedMessage } from "@/lib/messages/types"

export class AppError extends Error {
  readonly isAppError = true
  constructor(
    public readonly code: MessageCode,
    public readonly params: Record<string, unknown> = {},
  ) {
    super(code)
    this.name = "AppError"
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError || (typeof e === "object" && e != null && (e as { isAppError?: boolean }).isAppError === true)
}

// Map raw tRPC/HTTP error codes to catalog codes for errors not yet using AppError.
const TRPC_TO_CODE: Record<string, MessageCode> = {
  UNAUTHORIZED:          "UNAUTHORIZED",
  FORBIDDEN:             "UNAUTHORIZED",
  NOT_FOUND:             "NOT_FOUND",
  TOO_MANY_REQUESTS:     "RATE_LIMITED",
  BAD_REQUEST:           "VALIDATION_ERROR",
  PRECONDITION_FAILED:   "AI_NO_KEY",
  TIMEOUT:               "NETWORK_ERROR",
}

/**
 * Resolve any thrown value into a catalog-backed ResolvedMessage.
 * Order: AppError code → message-is-a-code → tRPC data.code mapping → generic.
 */
export function toUserMessage(error: unknown, lang: Lang = "es"): ResolvedMessage {
  if (isAppError(error)) {
    return resolveMessage(error.code, error.params, lang)
  }
  const anyErr = error as { message?: unknown; params?: Record<string, unknown>; data?: { code?: string } } | null
  if (anyErr && isMessageCode(anyErr.message)) {
    return resolveMessage(anyErr.message, anyErr.params ?? {}, lang)
  }
  const trpcCode = anyErr?.data?.code
  if (trpcCode && TRPC_TO_CODE[trpcCode]) {
    return resolveMessage(TRPC_TO_CODE[trpcCode], {}, lang)
  }
  return resolveMessage("GENERIC_ERROR", {}, lang)
}
