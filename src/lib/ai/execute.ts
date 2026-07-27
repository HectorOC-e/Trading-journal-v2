// The single owner of "try the candidates, retry the transient ones, wait, log".
//
// Before this it lived in FIVE places (coach-service, analytics-insights,
// psychology-insights, complete, review-ai), each a slightly different loop.
// Adding retry to five copies is how you get five behaviours — the same shape as
// the #156 bug, where embedding-model resolution lived in four copies.
//
// What this module does NOT own: what to do when the candidate list is EMPTY.
// That contract differs per call-site (NoApiKeyError / null / TRPCError) and
// belongs to the caller. This executor is handed a non-empty list.
//
// Scope boundary: everything here happens BEFORE the first token. streamChat
// throws before returning the stream, so a failure at that point is invisible to
// the user and safe to retry. A mid-stream failure is out of scope by design —
// text is already on screen and retrying would contradict it.

import type { ResolvedCall } from "./resolve-provider"
import { AiCallError, isRetryable } from "./ai-error"
import { RETRY_PROFILES, backoffDelay, type RetryProfileName } from "./retry-profile"
import { logger } from "@/lib/logger"

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Centinela interno del techo por intento; nunca sale de este modulo. */
const TIMED_OUT = Symbol("ai-attempt-timeout")

export interface ExecuteAiCallOptions<T> {
  candidates: ResolvedCall[]
  profile: RetryProfileName
  /** For the log line — which AI feature this call belongs to. */
  feature: string
  /**
   * `signal` se aborta cuando el intento agota `attemptTimeoutMs`. Pásalo al
   * `fetch` (o al SDK): sin eso el temporizador dispara pero la conexión sigue
   * viva y el intento no se corta.
   */
  run: (candidate: ResolvedCall, signal: AbortSignal) => Promise<T>
  /** Techo por intento; por defecto el del perfil. Los tests lo bajan a milisegundos. */
  attemptTimeoutMs?: number
  /** Injected so backoff tests do not burn wall-clock seconds. */
  sleep?: (ms: number) => Promise<void>
  now?: () => number
  rand?: () => number
}

export async function executeAiCall<T>(opts: ExecuteAiCallOptions<T>): Promise<T> {
  const { candidates, feature, run } = opts
  const profile = RETRY_PROFILES[opts.profile]
  const sleep = opts.sleep ?? realSleep
  const now = opts.now ?? Date.now
  const rand = opts.rand ?? Math.random

  if (candidates.length === 0) {
    // The caller must handle the empty case with ITS OWN contract before calling.
    throw new Error("executeAiCall: candidate list is empty (caller must handle this)")
  }

  const startedAt = now()
  const outOfBudget = () =>
    profile.totalBudgetMs !== null && now() - startedAt >= profile.totalBudgetMs

  let lastErr: unknown

  for (const candidate of candidates) {
    for (let attempt = 0; attempt <= profile.retries; attempt++) {
      if (outOfBudget()) {
        logger.warn("ai call budget exhausted", {
          feature, profile: profile.name, elapsedMs: now() - startedAt,
        })
        throw lastErr ?? new Error(`executeAiCall: budget exhausted for ${feature}`)
      }

      // Un intento colgado no lo corta `outOfBudget`: ése se comprueba ARRIBA,
      // antes de llamar. Sin este temporizador la llamada corre hasta que la
      // plataforma mata la función.
      const attemptTimeoutMs = opts.attemptTimeoutMs ?? profile.attemptTimeoutMs
      const ac = new AbortController()
      let timedOut = false
      let fire: () => void = () => {}
      // Se CARRERA contra el temporizador ademas de abortar la señal. Abortar
      // sola no basta: si el `run` no honra el signal —o lo honra tarde— el
      // await se queda colgado igual y el techo no existe. El abort sigue
      // haciendo falta para que el fetch subyacente muera de verdad y no se
      // filtre una conexion.
      const expired = new Promise<never>((_res, rej) => { fire = () => rej(TIMED_OUT) })
      const timer = setTimeout(() => { timedOut = true; ac.abort(); fire() }, attemptTimeoutMs)

      try {
        return await Promise.race([run(candidate, ac.signal), expired])
      } catch (rawErr) {
        // Se traduce a AiCallError con status null = transitorio (isRetryable),
        // que es lo correcto: una conexión que se cuelga suele ceder al segundo
        // intento. Sin traducir, el abort saldría como un error sin tipar y el
        // log no diría por qué murió.
        const err = timedOut
          ? new AiCallError({
              status: null, provider: candidate.provider, model: candidate.model,
              kind: "chat", detail: `attempt timeout after ${attemptTimeoutMs}ms`,
            })
          : rawErr
        lastErr = err
        const retryable = isRetryable(err)

        logger.warn("ai call attempt failed", {
          feature,
          provider: candidate.provider,
          model: candidate.model,
          status: err instanceof AiCallError ? err.status : null,
          attempt,
          retryable,
          profile: profile.name,
        })

        // Permanent for this candidate → do not burn retries; try the next model.
        if (!retryable) break
        // Retries exhausted for this candidate → next model.
        if (attempt === profile.retries) break

        await sleep(backoffDelay(profile, attempt, rand))
      } finally {
        // Sin esto el temporizador sobrevive al intento: en serverless un timer
        // pendiente puede mantener viva la lambda.
        clearTimeout(timer)
      }
    }
  }

  logger.error("ai call chain exhausted", {
    feature,
    candidates: candidates.length,
    lastStatus: lastErr instanceof AiCallError ? lastErr.status : null,
  })
  throw lastErr
}
