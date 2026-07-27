// Retry policy, as pure data + one pure function.
//
// Two profiles because the caller's SITUATION differs, not the feature's:
// `weekly_reviews` is called both from a router (a user is watching a spinner)
// and from a cron (nobody waits). Tying the profile to the feature would tie it
// to the wrong thing.

export type RetryProfileName = "interactive" | "background"

export interface RetryProfile {
  name: RetryProfileName
  /** Retries AFTER the first attempt, per candidate. */
  retries: number
  baseDelayMs: number
  /** Growth per attempt. 1 = fixed delay. */
  factor: number
  /** Jitter as a fraction of the delay, applied as +/-. */
  jitterRatio: number
  /** Wall-clock ceiling for the WHOLE chain; null = no ceiling. */
  totalBudgetMs: number | null
  /**
   * Techo para UN intento, en milisegundos.
   *
   * No confundir con `totalBudgetMs`: ése decide si **arrancar** otro intento, y
   * se comprueba ANTES de llamar al proveedor — no acota uno ya en vuelo. Sin
   * este campo nada corta una conexión colgada, y el intento corre hasta que la
   * plataforma mata la función (`maxDuration = 300` en la ruta del Coach). Se
   * observó en vivo el 2026-07-27: un intento de 162 s con el trader mirando el
   * spinner.
   *
   * Acota el tiempo hasta las CABECERAS, no la duración del cuerpo: los
   * call-sites de streaming resuelven su promesa al recibir cabeceras y siguen
   * leyendo el cuerpo después, así que una respuesta larga legítima no se corta.
   */
  attemptTimeoutMs: number
}

export const RETRY_PROFILES: Record<RetryProfileName, RetryProfile> = {
  // A user is watching. Failing fast and clearly beats being right late, so one
  // short retry and a hard ceiling across the whole chain.
  interactive: {
    name: "interactive",
    retries: 1,
    baseDelayMs: 400,
    factor: 1,
    jitterRatio: 0.25,
    totalBudgetMs: 8000,
    // Holgado a propósito: el caso sano observado en vivo va de 8 a 40 s de
    // punta a punta, así que 45 s no corta nada legítimo y sí una conexión
    // colgada. Apretarlo a los 8 s de totalBudgetMs fabricaría fallos donde hoy
    // no los hay.
    attemptTimeoutMs: 45_000,
  },
  // Nobody is waiting: crons, embeddings, review analysis. Three retries sum to
  // ~3.5s worst case, well under the 60s maxDuration the cron routes declare.
  background: {
    name: "background",
    retries: 3,
    baseDelayMs: 500,
    factor: 2,
    jitterRatio: 0.25,
    totalBudgetMs: null,
    // Nadie espera, pero la función serverless sí muere: por debajo del
    // maxDuration de 300 s para que el fallo sea nuestro y tipado, no un corte
    // opaco de la plataforma.
    attemptTimeoutMs: 90_000,
  },
}

/**
 * Delay before retry number `attempt` (0-based).
 *
 * Jitter is not decoration: the outbox dispatcher and the crons fire in batches,
 * and without it their retries re-synchronise against the very rate limit that
 * caused the failure in the first place.
 */
export function backoffDelay(
  profile: RetryProfile,
  attempt: number,
  rand: () => number = Math.random,
): number {
  const base = profile.baseDelayMs * Math.pow(profile.factor, attempt)
  // rand() in [0,1] -> offset in [-jitterRatio, +jitterRatio]
  const offset = (rand() * 2 - 1) * profile.jitterRatio
  return Math.max(1, Math.round(base * (1 + offset)))
}
