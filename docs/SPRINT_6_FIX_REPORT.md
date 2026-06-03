# Sprint 6 Fix Report

**Date:** 2026-06-03  
**Branch:** `claude/epic-darwin-1XZTX`  
**Source:** Findings from `docs/SPRINT_6_QA_REPORT.md`  
**Test result after fixes:** 404 → 407 passing (+3 tests) | TypeScript: clean (`tsc --noEmit`)

---

## Summary

All 6 Major findings from the QA audit were resolved. No Blocking findings were identified. Minor and Nitpick items are deferred to Sprint 7.

---

## Fixes Applied

### M-001 — ThemeProvider media query listener leaks on unmount

**File:** `src/components/theme-provider.tsx`

Added a `return` cleanup function to the second `useEffect` (the one that registers the `matchMedia` change listener). Previously the listener was only removed at the start of the *next* effect run, never on unmount. The new cleanup ensures the handler is removed if `ThemeProvider` ever unmounts while `theme === "system"`.

```ts
return () => {
  if (mediaListenerRef.current) {
    window.matchMedia("(prefers-color-scheme: dark)")
      .removeEventListener("change", mediaListenerRef.current)
    mediaListenerRef.current = null
  }
}
```

---

### M-002 — Sidebar shows wrong icon when `theme === "system"` with OS in light mode

**File:** `src/components/layout/Sidebar.tsx`

Changed `useTheme()` destructuring from `{ theme, toggle }` to `{ resolvedTheme, toggle }` and replaced all 7 occurrences of `theme === "dark"` with `resolvedTheme === "dark"`. This ensures the sun/moon icon and tooltip text always reflect the *actual applied theme*, not the mode setting, so "system" mode in light OS shows the moon (correct) rather than the sun (wrong).

---

### M-003 — `updatePrefs.mutate` fires on every toggle with no debounce

**File:** `src/components/theme-provider.tsx`

Added a `prefsSaveTimer` ref and wrapped the `updatePrefs.mutate` call in a 500ms debounce inside `setTheme`. Rapid toggling now fires only a single DB mutation once the user stops clicking, eliminating unnecessary write amplification.

```ts
const prefsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

const setTheme = (t: ThemeMode) => {
  setThemeState(t)
  if (prefsSaveTimer.current) clearTimeout(prefsSaveTimer.current)
  prefsSaveTimer.current = setTimeout(() => {
    updatePrefs.mutate({ theme: t })
  }, 500)
}
```

---

### M-004 — In-memory rate limiter grows unboundedly; silently ineffective in multi-instance Vercel

**File:** `src/app/api/ai-test/route.ts`

Added per-check eviction of Map entries older than `2 × RATE_LIMIT_WINDOW` (120 s) to prevent unbounded memory growth. Added a `// TODO` comment documenting the multi-instance limitation and directing Sprint 7 to replace this with an Upstash Redis-backed implementation.

```ts
// Evict entries older than 2× the window to prevent unbounded Map growth
for (const [id, e] of rateLimitMap.entries()) {
  if (now - e.windowStart > RATE_LIMIT_WINDOW * 2) rateLimitMap.delete(id)
}
```

Note: The cross-instance scope limitation is a Sprint 7 architecture task; this fix addresses the memory leak without requiring infrastructure changes.

---

### M-005 — `getEncryptionKey` validates only string length, not hex validity

**File:** `src/lib/ai/key-encryption.ts`

Added a `/^[0-9a-fA-F]{64}$/` regex guard after the length check in `getEncryptionKey`. Without this, a 64-char string containing non-hex characters (e.g. `z...z`) passes the length check but `Buffer.from(str, "hex")` silently produces a short buffer, causing `createCipheriv` to throw `ERR_CRYPTO_INVALID_KEYLEN` with no indication that the env var is misconfigured.

```ts
if (!/^[0-9a-fA-F]{64}$/.test(secret)) {
  throw new Error("AI_KEY_ENCRYPTION_SECRET contains non-hex characters")
}
```

**Test added:** `"throws on non-hex secret"` in `__tests__/lib/key-encryption.test.ts`.

---

### M-006 — `rotateEncryptionKey` allows `oldSecret === newSecret` (silent no-op)

**File:** `src/lib/ai/key-encryption.ts`

Added two guards after the existing length check in `rotateEncryptionKey`:

1. Hex character validation (same `/^[0-9a-fA-F]{64}$/` regex as M-005) for both secrets.
2. Equality guard: `oldSecret === newSecret` now throws rather than silently "re-encrypting" every config to the same key and returning `{ rotated: N, failed: 0 }`.

```ts
if (!/^[0-9a-fA-F]{64}$/.test(oldSecret) || !/^[0-9a-fA-F]{64}$/.test(newSecret)) {
  throw new Error("Secrets contain non-hex characters")
}
if (oldSecret === newSecret) {
  throw new Error("oldSecret and newSecret must be different")
}
```

**Tests added:**
- `"throws if secrets contain non-hex characters"`
- `"throws if old and new secret are identical"`

---

## Files Modified

| File | Fix(es) |
|------|---------|
| `src/components/theme-provider.tsx` | M-001, M-003 |
| `src/components/layout/Sidebar.tsx` | M-002 |
| `src/app/api/ai-test/route.ts` | M-004 |
| `src/lib/ai/key-encryption.ts` | M-005, M-006 |
| `src/__tests__/lib/key-encryption.test.ts` | M-005 test, M-006 tests (×2) |

---

## Tests Added

| File | Tests | Covers |
|------|-------|--------|
| `__tests__/lib/key-encryption.test.ts` | +3 | Non-hex secret validation (M-005), non-hex rotation secrets (M-006), identical secrets guard (M-006) |

**Total: 404 → 407 tests**

---

## Deferred Items (Minor / Nitpick)

The following findings from the QA report are deferred to Sprint 7:

| ID | Description | Sprint 7 Task |
|----|-------------|---------------|
| m-001 | DB prefs `theme` cast lacks `CYCLE.includes` guard | TD-015 |
| m-002 | Rate limit window boundary off-by-one (`>` vs `>=`) | TD-016 |
| m-003 | Mutation endpoints (`create/update/changeStatus`) return unserialized `Decimal` | TD-017 |
| m-004 | `NEUTRAL` outcome filter matches only exact zero P&L | Backlog |
| m-005 | `rotateEncryptionKey` lacks transactional semantics | Runbook doc |
| m-006 | `accounts.test.ts` mock uses plain number instead of `Prisma.Decimal` | TD-018 |
| n-001 | `FilterChip` visual inconsistency vs `FilterBar` component | UX debt |
| n-002 | Context default `resolvedTheme: "dark"` is arbitrary | Cleanup |
| n-003 | `mock-data` cast verbosity | Cleanup |
| n-004 | Rate limit test duplicates algorithm instead of importing it | TD-019 |

---

## Validation Checklist

- [x] `tsc --noEmit` — 0 errors
- [x] `npx vitest run` — 407 tests, 0 failures
- [x] `ThemeProvider` useEffect returns cleanup function on unmount
- [x] Sidebar icon reflects `resolvedTheme` (not raw `theme` mode)
- [x] `setTheme` debounces DB mutation by 500ms
- [x] `checkRateLimit` evicts stale entries on every call
- [x] `getEncryptionKey` rejects non-hex secrets with clear error
- [x] `rotateEncryptionKey` rejects non-hex secrets and identical key pair

---

**Document Prepared:** 2026-06-03
