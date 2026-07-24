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
