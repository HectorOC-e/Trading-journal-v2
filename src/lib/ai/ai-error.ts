// Typed AI transport error.
//
// Before this, streamChat threw `new Error("openrouter chat error 429: ...")` —
// the HTTP status lived INSIDE the message string, so no caller could tell a
// transient 429 from a permanent 401 by program. The retry policy needs that
// distinction to exist before it can act on it.

export type AiCallKind = "chat" | "tools" | "embeddings"

export class AiCallError extends Error {
  readonly status: number | null
  readonly provider: string
  readonly model: string
  readonly kind: AiCallKind

  constructor(input: {
    status: number | null
    provider: string
    model: string
    kind: AiCallKind
    detail?: string
  }) {
    super(`${input.provider} ${input.kind} error ${input.status ?? "network"}: ${input.detail ?? ""}`.trim())
    this.name = "AiCallError"
    this.status = input.status
    this.provider = input.provider
    this.model = input.model
    this.kind = input.kind
  }
}

/** The HTTP status behind a failure, or null when it never had one (network). */
export function statusOf(err: unknown): number | null {
  return err instanceof AiCallError ? err.status : null
}

/**
 * Is it worth trying the SAME model again?
 *
 * 429 (rate limit) and 5xx resolve on their own — that is the common free-tier
 * failure. 400/401/403/404 do not improve by waiting: a malformed request, a bad
 * key or a missing model fails identically on the next attempt, and retrying
 * only delays the real error. A failure with no status is a network fault,
 * indistinguishable from a hiccup, so it is treated as transient.
 */
export function isRetryable(err: unknown): boolean {
  const status = statusOf(err)
  if (status === null) return true
  if (status === 429) return true
  return status >= 500
}
