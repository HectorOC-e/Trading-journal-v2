# Sprint 6 QA Report

**Auditor:** Staff Engineer — Independent QA  
**Date:** 2026-06-03  
**Branch under review:** Sprint 6 changes  
**Files audited:** 14 files (all listed in sprint manifest)

---

## Overall Assessment: **Major**

Sprint 6 delivers working features but has **two Major-severity bugs** that will cause real user-facing breakage (wrong theme icon in system mode; media listener leak) and **four architecture-level issues** that will silently degrade reliability in production (serverless rate-limiter scope, encryption validation gaps, unguarded DB prefs cast, API-call-per-toggle). None are individually blocking, but the combination warrants fixes before shipping to production.

---

## Blocking Issues (must fix before merge)

_None that are strictly show-stoppers in a single-instance dev environment. However, the two Major issues below will produce visible bugs for users from day one and are effectively blocking for a production release._

---

## Major Issues (should fix before merge)

### M-001 · ThemeProvider media query listener leaks on component unmount

**File:** `src/components/theme-provider.tsx:53–74`  
**Severity:** Major — memory/DOM leak  

**Root cause:** The `useEffect` at line 53 has no `return` cleanup function. React only removes a listener registered by an effect when that effect's cleanup runs. The cleanup inside the body (`mediaListenerRef.current` teardown at lines 59–61) fires at the *start* of the *next* run, but **never** on component unmount. If the `ThemeProvider` ever unmounts while `theme === "system"`, the handler closure calling `applyResolved(getSystemTheme())` on `document.documentElement` is permanently attached to `window.matchMedia`.

**Practical impact today:** `ThemeProvider` lives in `app/layout.tsx` and almost never unmounts in normal navigation. This keeps severity at Major rather than Blocking — but it is a correctness defect, tests in isolation can trigger it, and future refactoring that conditionally renders the provider will cause a hard-to-diagnose stale-listener bug.

**Exact fix:**
```ts
// src/components/theme-provider.tsx  lines 53–74
useEffect(() => {
  const applyResolved = (resolved: ResolvedTheme) => {
    document.documentElement.classList.toggle("dark", resolved === "dark")
  }

  if (mediaListenerRef.current) {
    window.matchMedia("(prefers-color-scheme: dark)")
      .removeEventListener("change", mediaListenerRef.current)
    mediaListenerRef.current = null
  }

  if (theme === "system") {
    applyResolved(getSystemTheme())
    const handler = () => applyResolved(getSystemTheme())
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", handler)
    mediaListenerRef.current = handler
  } else {
    applyResolved(theme)
  }

  localStorage.setItem("tj-theme", theme)

  // ADD THIS RETURN:
  return () => {
    if (mediaListenerRef.current) {
      window.matchMedia("(prefers-color-scheme: dark)")
        .removeEventListener("change", mediaListenerRef.current)
      mediaListenerRef.current = null
    }
  }
}, [theme])
```

---

### M-002 · Sidebar shows wrong theme-toggle icon/tooltip when `theme === "system"`

**File:** `src/components/layout/Sidebar.tsx:128,131,361,367,517,523,529`  
**Severity:** Major — visible wrong state for all users whose saved preference is "system"  

**Root cause:** `ThemeProvider` now exposes both `theme` (the mode: light/dark/system) and `resolvedTheme` (the actual applied theme: light/dark). The Sidebar was updated to destructure `{ theme, toggle }` from `useTheme()`, but the icon and tooltip still read `theme === "dark"` to decide which emoji/label to show. When `theme === "system"` **and OS is in light mode**, the Sidebar shows `🌙 "Modo oscuro"` — the wrong icon — because `"system" === "dark"` is `false`, so it falls to the else branch (moon/dark-mode icon), while the actual rendered state is light.

**Exact fix:** At every occurrence, replace `theme === "dark"` with `resolvedTheme === "dark"`:

```ts
// src/components/layout/Sidebar.tsx
- const { theme, toggle } = useTheme()
+ const { theme, resolvedTheme, toggle } = useTheme()

// Then everywhere:
- {theme === "dark" ? "☀️" : "🌙"}
+ {resolvedTheme === "dark" ? "☀️" : "🌙"}

// And in title/label attributes:
- title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
+ title={resolvedTheme === "dark" ? "Modo claro" : "Modo oscuro"}
```

The `theme` variable can still be shown in a tooltip or indicator if you want to expose "system" mode to the user.

---

### M-003 · `updatePrefs.mutate` fires on every `toggle()` call with no debounce

**File:** `src/components/theme-provider.tsx:96`  
**Severity:** Major — excessive API calls; potential DB write storm  

**Root cause:** `setTheme` calls `updatePrefs.mutate({ theme: t })` synchronously on every toggle. `toggle()` is bound to a button in the Sidebar. A user clicking the toggle three times quickly fires three mutations. Since `useMutation` doesn't coalesce concurrent calls, all three hit the DB. Each response also triggers React Query cache invalidation, which refetches `preferences.get`, causing further unnecessary renders.

**Fix:** Debounce the mutation or use a `useRef` flag to only fire after a stable value:

```ts
// src/components/theme-provider.tsx
import { useRef, useCallback } from "react"

const prefsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

const setTheme = useCallback((t: ThemeMode) => {
  setThemeState(t)
  if (prefsSaveTimer.current) clearTimeout(prefsSaveTimer.current)
  prefsSaveTimer.current = setTimeout(() => {
    updatePrefs.mutate({ theme: t })
  }, 500)
}, [updatePrefs])
```

---

### M-004 · In-memory rate limiter is ineffective in Vercel serverless deployments

**File:** `src/app/api/ai-test/route.ts:9`  
**Severity:** Major — security control silently does not work in production  

**Root cause:** `rateLimitMap` is a module-level `Map`. In a serverless environment (Vercel), each cold start creates a new process instance with an empty map. With default Vercel concurrency settings, a single user can exhaust 5 requests per instance and if requests are routed to different instances they each see count=0. The effective limit becomes `5 × (number of warm instances)`.

Additionally the Map grows unboundedly. Every user who ever hits this endpoint gets a permanent entry; stale entries from users who last called it >60 s ago are never evicted.

**Fix options (choose one):**
1. **Upstash Redis** (recommended for Vercel): Use `@upstash/ratelimit` with a sliding window.
2. **DB-backed**: Store `{ userId, windowStart, count }` in a `RateLimit` table; upsert in a single transaction.
3. **Immediate partial fix** — add eviction to prevent unbounded growth even if cross-instance sharing is not solved:

```ts
// Evict entries older than 2× the window on every check
function checkRateLimit(userId: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  // Evict stale entries
  for (const [id, entry] of rateLimitMap.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) rateLimitMap.delete(id)
  }
  // ... rest of logic unchanged
}
```

**Note in tests:** `__tests__/routers/rate-limit.test.ts` tests a re-extracted pure function and correctly validates the logic. The test suite is sound for the algorithm itself; the issue is the deployment model, not the algorithm.

---

### M-005 · `getEncryptionKey` validates only string length, not hex validity

**File:** `src/lib/ai/key-encryption.ts:5–9`  
**Severity:** Major — misleading error message; silent key truncation  

**Root cause:**
```ts
function getEncryptionKey(secretOverride?: string): Buffer {
  const secret = secretOverride ?? process.env.AI_KEY_ENCRYPTION_SECRET
  if (!secret || secret.length !== 64) {
    throw new Error("AI_KEY_ENCRYPTION_SECRET must be a 64-character hex string (32 bytes)")
  }
  return Buffer.from(secret, "hex")
}
```
`Buffer.from(str, "hex")` silently truncates or drops bytes for non-hex characters — if the 64-char string contains any character outside `[0-9a-fA-F]`, the resulting Buffer is shorter than 32 bytes. Node.js `createCipheriv` will then throw `ERR_CRYPTO_INVALID_KEYLEN` with no indication the root cause is a misconfigured env var. The same problem applies to `rotateEncryptionKey` (see M-006).

**Fix:**
```ts
function getEncryptionKey(secretOverride?: string): Buffer {
  const secret = secretOverride ?? process.env.AI_KEY_ENCRYPTION_SECRET
  if (!secret || secret.length !== 64) {
    throw new Error("AI_KEY_ENCRYPTION_SECRET must be a 64-character hex string (32 bytes)")
  }
  if (!/^[0-9a-fA-F]{64}$/.test(secret)) {
    throw new Error("AI_KEY_ENCRYPTION_SECRET contains non-hex characters")
  }
  return Buffer.from(secret, "hex")
}
```

---

### M-006 · `rotateEncryptionKey` has two validation gaps

**File:** `src/lib/ai/key-encryption.ts:47–49`  
**Severity:** Major — operator error causes silent no-op re-encryption  

**Root cause 1:** Same hex-validity gap as M-005 (length check only).

**Root cause 2:** `rotateEncryptionKey(oldSecret, newSecret, ...)` does not guard against `oldSecret === newSecret`. Passing the same value for both is a common operator mistake. The function succeeds without error, "re-encrypts" every config with the same key (a no-op that writes to DB anyway), and returns `{ rotated: N, failed: 0 }` — a misleading success signal.

**Fix:**
```ts
export async function rotateEncryptionKey(...): Promise<...> {
  if (oldSecret.length !== 64 || newSecret.length !== 64) {
    throw new Error("Both secrets must be 64-character hex strings")
  }
  if (!/^[0-9a-fA-F]{64}$/.test(oldSecret) || !/^[0-9a-fA-F]{64}$/.test(newSecret)) {
    throw new Error("Secrets contain non-hex characters")
  }
  if (oldSecret === newSecret) {
    throw new Error("oldSecret and newSecret must be different")
  }
  // ...rest unchanged
}
```

**Test gap:** `__tests__/lib/key-encryption.test.ts` does not include a test for `oldSecret === newSecret`. Add:
```ts
it("throws if old and new secret are identical", async () => {
  const secret = "c".repeat(64)
  await expect(
    rotateEncryptionKey(secret, secret, async () => [], async () => {}),
  ).rejects.toThrow()
})
```

---

## Minor Issues (fix in follow-up sprint)

### m-001 · `prefs.theme` from DB is cast without validation guard

**File:** `src/components/theme-provider.tsx:45`  
**Severity:** Minor — inconsistency; could produce subtle bugs  

The `localStorage` path (line 48) correctly guards with `CYCLE.includes(saved)` before calling `setThemeState`. The DB prefs path (line 45) does not:
```ts
// localStorage — guarded
if (saved && CYCLE.includes(saved)) setThemeState(saved)

// DB prefs — unguarded
setThemeState(prefs.theme as ThemeMode)  // ← unsafe cast
```
The preferences router does validate `theme` as `z.enum(["light","dark","system"])` on write, so DB values should always be valid. However, stale DB rows from a theoretical earlier schema, or a direct DB mutation in a dev environment, could inject an unexpected string. If `CYCLE.indexOf(theme)` returns -1, `toggle()` computes `CYCLE[(−1+1) % 3] = CYCLE[0]` (recovers to "light" on next toggle), but the `resolveTheme` function would receive an unknown mode and fall to `mode === "system"` false-case, treating it as a literal CSS class selector.

**Fix:**
```ts
if (prefs?.theme) {
  const t = prefs.theme as ThemeMode
  if (CYCLE.includes(t)) setThemeState(t)
}
```

---

### m-002 · Rate limiter window boundary off-by-one

**File:** `src/app/api/ai-test/route.ts:16`  
**Severity:** Minor — users are blocked for 1ms longer than advertised  

Condition: `now - entry.windowStart > RATE_LIMIT_WINDOW` uses strict `>`. At the exact moment `now === windowStart + 60000`, the window has elapsed but the condition is false, so the entry is NOT reset. The user is blocked for exactly 1ms beyond the stated 60-second window.

**Fix:** Change `>` to `>=`:
```ts
if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW) {
```

**Test alignment:** The existing test at line 51 uses `now + RATE_LIMIT_WINDOW + 1`, which passes under both `>` and `>=`. Add a boundary test:
```ts
it("resets at exactly the window boundary", () => {
  const check = makeRateLimiter()
  const now = Date.now()
  for (let i = 0; i < RATE_LIMIT_MAX; i++) check("user-1", now + i)
  const r = check("user-1", now + RATE_LIMIT_WINDOW) // exactly at boundary
  expect(r.allowed).toBe(true)
})
```

---

### m-003 · `accounts.create/update/changeStatus/changePhase/archive` return `Decimal` serialized as strings

**File:** `src/server/trpc/routers/accounts.ts:84,123,183,197`  
**Severity:** Minor — type contract inconsistency between `list` and mutations  

`serializeAccount` is correctly applied in `accounts.list`, returning `initialBalance: number`. However, all mutation endpoints return the raw Prisma `account` object. Since tRPC uses plain `httpBatchLink` with no `superjson` transformer (verified in `src/lib/trpc/provider.tsx`), Prisma's `Decimal` type serializes via its `.toJSON()` method to a **string** (e.g. `"10000.00"`) over the wire.

Current callers only use mutation return values for cache invalidation (not field access), so there is no runtime crash. However, `RouterOutputs["accounts"]["create"]` will have `initialBalance: string` while `RouterOutputs["accounts"]["list"][number]` has `initialBalance: number`. Any future code consuming the mutation result directly will get the wrong type silently.

**Fix:** Apply `serializeAccount` to mutation return values:
```ts
create: protectedProcedure
  .mutation(async ({ ctx, input }) => {
    const account = await ctx.prisma.account.create({ ... })
    // ...log...
    return serializeAccount(account)  // ← add
  }),
```
Apply the same pattern to `update`, `changeStatus`, `changePhase`, and `archive`.

---

### m-004 · `NEUTRAL` outcome filter matches only `netPnl === 0`; no weeks with positive and negative trades netting to zero

**File:** `src/app/reviews/page.tsx:149–150`  
**Severity:** Minor — unexpected filter behavior for real data  

```ts
if (outcomeFilter === "NEUTRAL" && r.netPnl !== 0) return false
```
In practice, a week where the trader had multiple wins and losses that net to exactly `0` is extremely rare. The filter will almost always show zero results when "Neutral" is selected, which looks like a broken filter to the user. The more intuitive definition of "neutral" for a weekly review would be something like `|netPnl| < threshold` (e.g. `±$50` or `<1%` of account balance).

**Recommended fix:** Either broaden the semantics or rename the chip to "Breakeven" so users understand the exact criteria:
```ts
// Option A: rename
{ value: "NEUTRAL", label: "Breakeven" }

// Option B: use a threshold (requires adding a config value)
if (outcomeFilter === "NEUTRAL" && Math.abs(r.netPnl) > 50) return false
```

---

### m-005 · `rotateEncryptionKey` lacks transactional semantics — partial failures leave DB in mixed-key state

**File:** `src/lib/ai/key-encryption.ts:51–60`  
**Severity:** Minor — data integrity risk during key rotation  

The function iterates configs and calls `updateConfig(id, reEncrypted)` one-by-one. If the process crashes or a DB timeout occurs after updating config-1 but before config-2, the DB ends up with config-1 encrypted with `newSecret` and config-2 still encrypted with `oldSecret`. The next `decryptApiKey` call with the now-active `newSecret` will fail for config-2.

**Fix:** The function signature accepts `updateConfig` as a callback, which limits what can be done here. Document the limitation prominently and recommend callers wrap all updates in a DB transaction:
```ts
/**
 * IMPORTANT: updateConfig should be a transactional batch operation.
 * If using Prisma, pass a function that calls prisma.$transaction([...]).
 * Partial failures leave the database in a mixed-encryption state.
 */
```
Alternatively, change the signature to accept a batch-update callback.

---

### m-006 · Accounts router test mock uses plain JS numbers, not `Decimal` objects

**File:** `src/__tests__/routers/accounts.test.ts:52`  
**Severity:** Minor — test does not exercise the actual Decimal-to-number conversion  

The mock `findMany` resolves with `initialBalance: 10000` (a JS number). The real Prisma query returns `initialBalance: Decimal("10000.00")`. The test passes because `Number(10000) === 10000`, but it would also pass if `serializeAccount` were deleted (since the spread would carry the number through unchanged). The test gives false confidence that the Decimal serialization is correct.

**Fix:** Use Prisma's actual `Decimal` type in the mock, or use a compatible stand-in:
```ts
import { Prisma } from "@/lib/generated/prisma/client"

const fakeAccounts = [{
  ...
  initialBalance: new Prisma.Decimal("10000.50"),
  ddDailyPct: new Prisma.Decimal("2.50"),
  // ...
}]
// Then assert:
expect(result[0].initialBalance).toBe(10000.5)
expect(typeof result[0].initialBalance).toBe("number")
```

---

## Nitpick Issues (style/preference)

### n-001 · `FilterChip` in `reviews/page.tsx` is visually inconsistent with `FilterBar` component

**File:** `src/app/reviews/page.tsx:37–61`; compare with `src/components/ui/filter-bar.tsx`  

`FilterChip` uses `rounded-[var(--radius-sm)]` (square corners) and `text-[11px]` with no explicit height. `FilterBar` uses `rounded-full` (pill shape), `text-xs`, and `h-7`. The same filtering concept in two different visual languages in the same product looks accidental.

**Recommendation:** Either inline-use `FilterBar` (it already supports single-select mode which is all `FilterChip` needs), or extract a shared `FilterChip` to `components/ui/` and use it in both places.

---

### n-002 · `ThemeProvider` context default `resolvedTheme: "dark"` is arbitrary

**File:** `src/components/theme-provider.tsx:18–23`  

The context default value (used only in tests or when rendered outside a `ThemeProvider`) hard-codes `resolvedTheme: "dark"`. This could mask bugs in components that accidentally consume `useTheme()` outside the provider. A more transparent default would be `resolvedTheme: "light"` (matches the empty/no-JS state of most web documents) or a defensive approach that throws in development.

---

### n-003 · `mock-data/index.ts` LearningResource cast is verbose

**File:** `src/mock-data/index.ts:265`  

```ts
export const mockResources: LearningResource[] = ((<any>[...]) as LearningResource[])
```

The double-cast `(<any>[...]) as LearningResource[]` is noisier than necessary. Since mock data should never be type-checked strictly:
```ts
// Cleaner alternative:
export const mockResources = [...] as unknown as LearningResource[]
```
`as unknown as T` is the idiomatic TypeScript escape hatch and is more explicit about the unsafe cast.

---

### n-004 · Rate limit test duplicates the algorithm rather than importing it

**File:** `src/__tests__/routers/rate-limit.test.ts:9–25`  

The test file re-implements `checkRateLimit` as a `makeRateLimiter` factory. This means changes to the actual algorithm in `route.ts` don't break these tests. The tests are valid for the algorithm they embed, but they don't catch a regression if the production code diverges.

**Recommendation:** Extract `checkRateLimit` from `route.ts` to a separate importable module (e.g., `lib/rate-limiter.ts`), then import it in both the route and the tests. This is also the correct fix for M-004 (serverless scope) because a standalone module can be replaced with a Redis-backed implementation without changing the route.

---

## What Looks Good

**`serializeAccount` in `accounts.ts` (TD-013):** The spread-plus-override pattern is correct. No fields are lost (the spread carries all non-Decimal fields automatically), and every Decimal field is explicitly converted with null guards. The `createdAt.toISOString()` / `updatedAt.toISOString()` calls are safe because the Prisma schema declares both as non-nullable `DateTime` with `@default(now())`.

**`LearningResource` type alias (TD-014):** The `Omit<SerializedLearningResource, "type"|"status"> & { type: ResourceType; status: ResourceStatus }` pattern is correct TypeScript narrowing. Since `SerializedLearningResource` is derived from `RouterOutputs` (always in sync with the actual router return), and `type`/`status` are re-added as union enums, components get compile-time guarantees on these discriminated values. All required fields (`id`, `title`, `author`, `progressPct`, `isFavorite`, `markedForReview`, etc.) are preserved through the `Omit` spread.

**Sparkline SVG edge cases:** `SetupSparkline` in `playbook/page.tsx` correctly handles all edge cases:
- `data.length < 2` → dashed placeholder line (line 64–71)
- `max === min` (all same value) → `range = max - min || 1` prevents division by zero (line 74)
- Negative numbers → `toY()` formula correctly inverts the scale
- `setup-analytics.ts` guarantees `equityCurve.length >= 2` before the component even sees the data (lines 77–78)

**`rotateEncryptionKey` partial-failure count:** The `try/catch` per config with independent `rotated`/`failed` counters is correct for resilient key rotation. It continues processing remaining configs even if one fails, which is the right behavior for an operational migration script.

**Review filter `useMemo` dependency array:** All five state variables that affect the filtered result (`reviews`, `searchQuery`, `outcomeFilter`, `statusFilter`, `minDisc`) are correctly included in the dependency array at line 158. No stale-closure risk.

**Goal widget exceeded state:** `CircleProgress` uses `Math.min(1, pct)` for the stroke offset, correctly clamping the visual ring at 100% fill even when `pct > 1.0`. The `exceeded` flag is computed as strict `>` (not `>=`), so hitting exactly the goal shows "100%" (not the checkmark), which is the correct and intuitive behavior.

**`PositionLogModal` `onAddEvent` type:** The `AddableType = Exclude<EventType, "OPEN">` narrowing is correct. The modal's internal form only shows `ADDABLE_TYPES` and the `handleAdd` function calls `onAddEvent` with the correctly typed payload. The `trades/page.tsx` caller at line 398 matches the expected signature.

**`accounts.ts` test verifies key behavior:** The `list` test (line 46–70) correctly verifies that `createdAt` is serialized to ISO string format and that the `findMany` where-clause includes the userId guard.

**`key-encryption.test.ts` covers the core cases:** Encrypt/decrypt roundtrip, random IV uniqueness, tampered ciphertext rejection, secretOverride isolation, and `maskApiKey` boundary are all tested.

---

## Recommendations

1. **Immediately fix M-002 (Sidebar icon)** — it produces visibly wrong UI for every user whose preference is "system." This is a one-line fix per occurrence; no risk of regression.

2. **Immediately fix M-001 (listener cleanup)** — add the return function to the `useEffect`. Three-line change, zero risk.

3. **Fix M-003 (debounce)** before beta if active users are expected. At low traffic the database overhead is negligible; at scale it causes unnecessary write amplification.

4. **Plan M-004 (Redis rate limiter) for Sprint 7** — this is an architecture change that requires provisioning an Upstash Redis instance. Document the current limitation with a `// TODO: replace with Redis-backed limiter for multi-instance` comment in `route.ts`.

5. **Fix M-005 and M-006 (encryption validation)** before `rotateEncryptionKey` is ever called in production. The function has never been called yet (it's a one-time migration utility), so there's no urgency, but ship the guards before documenting the rotation procedure.

6. **Consider extracting `checkRateLimit` into `lib/rate-limiter.ts`** (addresses both n-004 and M-004) — this makes the serverless-scope issue easy to fix later by swapping the implementation.

7. **Address m-001 (mutation serialization)** in Sprint 7 when `accounts.create` return type is first consumed outside of a cache-invalidation `onSuccess`. The issue is latent, not active.
