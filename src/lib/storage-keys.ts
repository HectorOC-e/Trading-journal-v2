// Centralised localStorage keys + a helper to wipe per-session/per-account
// state. The React Query cache is already cleared on logout (see useLogout);
// localStorage that holds conversation/account-scoped data must be cleared the
// same way, otherwise it leaks across sessions (e.g. the AI coach chat showing
// the previous user's conversation after a re-login).

export const STORAGE_KEYS = {
  /** AI coach conversation history (per session — never shared across logins). */
  coachHistory: "tj-coach-history",
} as const

/**
 * Keys that must be removed whenever the session changes (logout or landing on
 * /login after an expired session). Add new conversation/account-scoped keys
 * here — view preferences (theme, "incluir práctica") intentionally persist.
 */
export const SESSION_SCOPED_STORAGE_KEYS: readonly string[] = [
  STORAGE_KEYS.coachHistory,
]

/** Remove all session-scoped localStorage entries. Safe to call anywhere. */
export function clearSessionStorageKeys(): void {
  if (typeof window === "undefined") return
  for (const key of SESSION_SCOPED_STORAGE_KEYS) {
    try { window.localStorage.removeItem(key) } catch { /* ignore */ }
  }
}
