# Sprint 7 QA Report

**Auditor:** Staff Engineer — Independent QA  
**Date:** 2026-06-03  
**Branch under review:** `claude/epic-darwin-1XZTX` (commit `53cc7ba`)  
**Files audited:** 31 (all listed in sprint manifest)  
**Method:** 7 independent finder angles × verify — not a rubber stamp of the completion report

---

## Overall Assessment: **Blocking**

Sprint 7 delivers substantial features and closes 8 long-standing technical debt items. Tests pass (430/430). TypeScript is clean. However, the audit found **two Blocking security regressions** introduced by the Sprint 7 refactor of `ai-embed/route.ts`, plus four Major issues (one data-integrity regression, one crash-on-iOS, one ops-reliability gap, one validation gap). All Blocking and Major items must be resolved before this branch reaches production.

---

## Blocking Issues

### B-01 · `ai-embed` direct-call path: IDOR — any authenticated user can read and overwrite any trade's embedding

**File:** `src/app/api/ai-embed/route.ts:70`  
**Introduced by:** Sprint 7 refactor (regression — the pre-Sprint-7 route scoped the `findUnique` to the authenticated user's userId)  
**Confirmed by:** 2 independent finder angles + 1 explicit verifier (CONFIRMED)

**Root cause:**  
The webhook-support refactor moved `user` assignment into the `else` branch (direct-call path, lines 47–50) but then merged both paths into a single `prisma.trade.findUnique` on line 70 — **without passing `userId` into the query**:

```ts
// lines 70-74  — MISSING userId filter
const trade = await prisma.trade.findUnique({
  where:  { id: tradeId },   // ← no userId: user.id
  select: { notes: true },
})
```

The raw UPDATE on line 87 is similarly unscoped (`WHERE id = ${tradeId}::uuid` with no `AND user_id`).

**Attack scenario:**  
Authenticated User A obtains (or guesses) the UUID of User B's trade. A sends:
```
POST /api/ai-embed
Cookie: <valid session>
Body: { "tradeId": "<user-B-trade-uuid>" }
```
The endpoint authenticates A, fetches B's trade notes with no restriction, generates an embedding from B's notes, and writes it back to B's `notes_embedding` column — with no error, no log, and no rate limit.

This is also an information-disclosure vulnerability: the AI model processes B's private trade notes on behalf of A's session.

**Fix:**
```ts
// Direct path: scope to authenticated user
const trade = await prisma.trade.findUnique({
  where:  { id: tradeId, userId: user!.id },  // add userId filter
  select: { notes: true },
})
// AND update the raw UPDATE:
await prisma.$executeRaw(
  Prisma.sql`
    UPDATE trades
    SET notes_embedding = ${vectorStr}::vector
    WHERE id = ${tradeId}::uuid
      AND user_id = ${userId}::uuid  -- add this
  `,
)
```
For the webhook path (no session), the `user` variable is `null`; the fetch and update should still be unscoped (the secret is the auth), so the fix requires passing `userId: string | null` through the auth branches and conditionally adding the filter.

---

### B-02 · `ai-embed` webhook path: leaked `SUPABASE_WEBHOOK_SECRET` grants cross-user write access to `notes_embedding` with no audit trail

**File:** `src/app/api/ai-embed/route.ts:39–44`  
**Introduced by:** Sprint 7 (new attack surface)  
**Confirmed by:** security angle (CONFIRMED) + removed-behavior angle (CONFIRMED)

**Root cause:**  
The webhook path intentionally skips userId scoping (the secret IS the auth). But this means a single 64-character hex secret is the only gate between an attacker and full cross-user embedding write access. There is no rate limiting, no body-size cap, no audit log, and no per-trade ownership check on the webhook path.

```ts
// lines 39-44 — webhook path
if (receivedSecret !== null) {
  if (!webhookSecret || receivedSecret !== webhookSecret) {
    logger.warn("ai-embed: invalid webhook secret")
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  // Passes: no further validation. No rate limit. No user scope.
}
```

**Attack scenario:**  
Secret leaks via Vercel env-var logs, a compromised Supabase dashboard account, or a misconfigured CI pipeline. Attacker can:
1. Enumerate or guess trade UUIDs (UUIDs are not secret; they appear in URLs and API responses)
2. For each UUID: `POST /api/ai-embed` with `x-webhook-secret: <leaked>` and `{ "tradeId": "<uuid>" }` — overwrites any trade's embedding
3. Use with crafted vectors to corrupt the AI Coach's semantic search results for any user

The `body = await req.json()` parse at line 58 also has no body-size limit, making this a potential DoS vector even without the secret.

**Secondary issue — timing side-channel (PLAUSIBLE):**  
Line 41 uses `receivedSecret !== webhookSecret` — JavaScript string equality that short-circuits on the first differing character. In theory, a timing oracle attack can recover the secret one byte at a time. In practice, serverless latency jitter makes this difficult; it is included for completeness and should use `crypto.timingSafeEqual` in any hardened implementation.

**Mitigations to add:**
- Rate-limit the webhook endpoint (max N calls/minute per source IP)  
- Add `Content-Length` or body-size cap before `req.json()`  
- Log every webhook call with `tradeId` for audit  
- Consider `crypto.timingSafeEqual(Buffer.from(receivedSecret), Buffer.from(webhookSecret))` for the comparison

---

## Major Issues

### M-01 · `accounts.archive` audit log records `from: "INACTIVE"` for every archived account

**File:** `src/server/trpc/routers/accounts.ts:190–198`  
**Status:** Pre-existing bug, revealed and confirmed by Sprint 7 review  
**Confirmed by:** 2 independent finder angles + 1 explicit verifier (CONFIRMED)

**Root cause:**  
The `archive` mutation runs `ctx.prisma.account.update(...)` (setting `status = "INACTIVE"`) and then reads `account.status` from the returned post-update record to build the `from` field of the audit log:

```ts
const account = await ctx.prisma.account.update({     // sets status = "INACTIVE"
  where: { id: input, userId: ctx.userId },
  data:  { status: "INACTIVE" },
})
// account.status is now "INACTIVE" — the update already ran
const archivePayload: AccountLogPayload = {
  event: "STATUS_CHANGE",
  from: account.status,   // ← always "INACTIVE" — wrong
  to: "INACTIVE",
  note: "Archivada",
}
```

The `changeStatus` mutation correctly fetches `prev` with a separate `findUniqueOrThrow` **before** the update (lines 105–108). The `archive` mutation does not.

**Impact:** Every `AccountLog` entry for an archive event records `STATUS_CHANGE from: INACTIVE → INACTIVE`. The actual prior status (ACTIVE, PAUSED, etc.) is permanently lost from the audit trail.

**Fix:**
```ts
archive: protectedProcedure
  .input(z.string().uuid())
  .mutation(async ({ ctx, input }) => {
    const prev = await ctx.prisma.account.findUniqueOrThrow({   // add this
      where: { id: input, userId: ctx.userId },
      select: { status: true },
    })
    const account = await ctx.prisma.account.update({
      where: { id: input, userId: ctx.userId },
      data:  { status: "INACTIVE" },
    })
    const archivePayload: AccountLogPayload = {
      event: "STATUS_CHANGE",
      from: prev.status,   // ← use pre-update status
      to: "INACTIVE",
      note: "Archivada",
    }
    // ...rest unchanged
  })
```

---

### M-02 · `localStorage` calls not in try/catch — crashes useEffect on iOS Safari private mode

**File:** `src/app/dashboard/page.tsx:43,60`  
**Introduced by:** Sprint 7 (new `localStorage` integration for period persistence)  
**Confirmed by:** finder angle + explicit verifier (CONFIRMED)

**Root cause:**  
Two `localStorage` calls in `dashboard/page.tsx` are unguarded:

```ts
// line 43 — inside useEffect
const savedPeriod = localStorage.getItem(PERIOD_STORAGE_KEY) as Period | null
// ...
setPrefsLoaded(true)   // line 47 — never reached if getItem throws

// line 60 — inside handlePeriodChange
localStorage.setItem(PERIOD_STORAGE_KEY, p)
```

In iOS Safari private browsing mode (and when storage quota is exceeded on any browser), `localStorage.getItem()` and `localStorage.setItem()` throw `SecurityError` / `QuotaExceededError`.

**Failure scenario:**  
A user opens the dashboard in iOS Safari private mode → `getItem` throws → `setPrefsLoaded(true)` at line 47 never runs → `prefsLoaded` stays `false` → the `useEffect` re-fires on every subsequent `prefs` refetch → infinite crash loop. Clicking a period selector → `setItem` throws → uncaught exception propagates to React's event handler → error boundary or white-screen crash.

**Fix:**
```ts
// wrap both calls
useEffect(() => {
  if (!prefs || prefsLoaded) return
  if (prefs.defaultTab && [...].includes(prefs.defaultTab)) setTab(...)
  try {
    const savedPeriod = localStorage.getItem(PERIOD_STORAGE_KEY) as Period | null
    if (savedPeriod && VALID_PERIODS.includes(savedPeriod)) setPeriod(savedPeriod)
  } catch { /* storage unavailable — use default */ }
  setPrefsLoaded(true)
}, [prefs, prefsLoaded])

function handlePeriodChange(p: Period) {
  setPeriod(p)
  try { localStorage.setItem(PERIOD_STORAGE_KEY, p) } catch { /* silent */ }
}
```

**Secondary issue (low):** The first render always fetches with the hardcoded `"3M"` default before `localStorage` is consulted, causing one wasted network request on every page load. The tRPC query fires immediately with `period = "3M"`, then `setPeriod` may change it, firing a second query. This is cosmetic and resolved naturally if the period is moved to a URL param or preferences DB field.

---

### M-03 · `SUPABASE_WEBHOOK_SECRET` absent in production silently rejects all webhook-triggered embeddings with no alarm

**File:** `src/app/api/ai-embed/route.ts:37–44`  
**Introduced by:** Sprint 7  
**Confirmed by:** removed-behavior angle (CONFIRMED)

**Root cause:**  
The `.env.example` marks `SUPABASE_WEBHOOK_SECRET` as optional with a comment. If an operator configures the Supabase database webhook to call `POST /api/ai-embed` but forgets to set the env var, line 41 evaluates `!webhookSecret` as `true` and returns `401` for every webhook call — silently, with only `logger.warn("ai-embed: invalid webhook secret")` emitted to logs.

```ts
const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET  // undefined if unset
const receivedSecret = req.headers.get("x-webhook-secret")
if (receivedSecret !== null) {
  if (!webhookSecret || receivedSecret !== webhookSecret) {  // !undefined = true → always 401
    logger.warn("ai-embed: invalid webhook secret")
    return NextResponse.json({ ok: false }, { status: 401 })
  }
}
```

**Impact:** All trade notes silently stop being embedded. The AI Coach's semantic search degrades to returning no results or stale results. There is no alerting, no metric, and no UI indication.

**Mitigations:**
1. Add a startup check in the route: `if (!process.env.SUPABASE_WEBHOOK_SECRET) logger.warn("ai-embed: SUPABASE_WEBHOOK_SECRET not set — webhook path will reject all calls")`  
2. Document in `README`/`ARCHITECTURE.md` that this env var must be set when the Supabase webhook is configured  
3. Consider a `/api/health` endpoint that checks embedding availability

---

### M-04 · Tags have no length or count validation on trade `create` / `update`

**File:** `src/server/trpc/routers/trades.ts:501,587`  
**Status:** Pre-existing gap; in-scope because Sprint 7 shipped `trade-tags.ts` without closing it  
**Confirmed by:** architecture angle (CONFIRMED)

**Root cause:**  
The `trades.create` and `trades.update` inputs validate tags as bare string arrays with no constraints:

```ts
// trades.create (line 501)
tags: z.array(z.string()).default([])

// trades.update (line 587)
tags: z.array(z.string()).optional()
```

The new `trade-tags.ts` router correctly validates `newTag: z.string().min(1).max(30)` in the `rename` operation — but that only applies to the management operations, not to the original trade-creation path.

**Impact:** A malicious or buggy client can write tags of arbitrary length (e.g., `"A".repeat(100_000)`) or create hundreds of tags per trade via the trade creation API. These unbounded strings flow directly into the `tags text[]` column, making `unnest(tags)` aggregation in `tradeTags.list` progressively more expensive and potentially breaking the tag management UI when tags exceed the expected 30-character display budget.

**Fix:**
```ts
// trades.create
tags: z.array(z.string().min(1).max(30)).max(20).default([])

// trades.update
tags: z.array(z.string().min(1).max(30)).max(20).optional()
```

---

## Minor Issues

### N-01 · Non-constant-time comparison of `SUPABASE_WEBHOOK_SECRET` enables timing side-channel

**File:** `src/app/api/ai-embed/route.ts:41`  
**Introduced by:** Sprint 7  
**Confirmed by:** security angle (PLAUSIBLE)

```ts
if (!webhookSecret || receivedSecret !== webhookSecret) {
```

JavaScript `!==` on strings short-circuits on the first differing character, leaking timing information proportional to the length of the common prefix. In a serverless environment, latency jitter (cold starts, DB queries elsewhere in the request) typically overwhelms the signal, making exploitation very difficult in practice. However, it is not zero-risk and the fix is a one-liner:

```ts
import { timingSafeEqual } from "crypto"

function secretsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

// in POST handler:
if (!webhookSecret || !secretsMatch(receivedSecret, webhookSecret)) {
```

---

### N-02 · `setups.performanceStats` `PeriodEnum` diverges from `trades.dashboardStats` — missing `"7d"`

**File:** `src/server/trpc/routers/setups.ts:7`  
**Introduced by:** Sprint 7 (added "7d" to trades but not setups)  
**Confirmed by:** cross-file tracer (CONFIRMED)

```ts
// setups.ts line 7 — does NOT include "7d"
const PeriodEnum = z.enum(["1M", "3M", "6M", "1Y", "ALL"])

// trades.ts — correctly includes "7d"
period: z.enum(["7d", "1M", "3M", "6M", "1Y", "ALL"]).optional().default("3M")
```

The Playbook tab currently does not expose a period selector, so this causes no user-visible bug today. But the two enums are now diverged: if a period selector is added to the Playbook tab and `"7d"` is passed to `setups.performanceStats`, Zod will return a 400 validation error at runtime with no compile-time warning.

**Fix:** Extract a shared `PERIOD_ENUM` constant in `src/lib/constants.ts` and use it in both routers.

---

### N-03 · Merge dialog shows no options and no explanation when user has only 1 tag

**File:** `src/app/etiquetas/page.tsx:120–126, 188`  
**Introduced by:** Sprint 7  
**Confirmed by:** cleanup angle (PLAUSIBLE)

The Merge button is rendered for every row regardless of available survivor count. When the user has exactly one tag, clicking Merge opens a dialog with only the placeholder option (`"Selecciona el tag destino…"`). The Fusionar button stays disabled (no crash), but the UX is broken: the user cannot proceed and receives no explanation of why.

**Fix (option A):** Disable the Merge button when `tags.length <= 1`:
```tsx
<button
  onClick={() => { setMerging({ dying: tag }); setMergeSurvivor("") }}
  title={tags.length <= 1 ? "Se necesitan al menos 2 tags para fusionar" : "Fusionar con otro tag"}
  disabled={tags.length <= 1}
  ...
>
```

**Fix (option B):** Add a "No hay otros tags disponibles" message inside the dialog body when the filtered survivor list is empty.

---

## Nitpick Issues

### X-01 · Dynamic `import()` inside hot query handler for `calcSetupHealth`

**File:** `src/server/trpc/routers/setups.ts:197`

```ts
// Current — resolves the module on every performanceStats request
const { calcSetupHealth } = await import("@/lib/formulas/setup")
```

`lib/formulas/setup.ts` is a pure-function module with no side effects and no reason to be dynamically loaded. The dynamic import bypasses static analysis, prevents tree-shaking, and adds module-resolution overhead on every query invocation. Replace with a static import at the top of `setups.ts`.

---

### X-02 · `useReviewFilters` reads `searchParams.get()` twice per filter parameter

**File:** `src/app/reviews/page.tsx:77–78`

```ts
// Current — calls searchParams.get("outcome") twice
const outcome = (VALID_OUTCOMES.has(searchParams.get("outcome") ?? "")
  ? searchParams.get("outcome") : "ALL") as OutcomeFilter
```

If the key string is ever mistyped in one of the two calls, the guard and the value silently diverge. Fix:

```ts
const rawOutcome = searchParams.get("outcome") ?? ""
const outcome = (VALID_OUTCOMES.has(rawOutcome) ? rawOutcome : "ALL") as OutcomeFilter
```

---

### X-03 · `accounts.changePhase` throws plain `Error` instead of `TRPCError` (pre-existing)

**File:** `src/server/trpc/routers/accounts.ts:151`

```ts
// Current
throw new Error("El objetivo no ha sido alcanzado. Confirma la promoción manual.")

// Should be
throw new TRPCError({ code: "BAD_REQUEST", message: "El objetivo no ha sido alcanzado. Confirma la promoción manual." })
```

The plain `Error` is re-thrown by tRPC as `INTERNAL_SERVER_ERROR`, so the client sees a generic 500 instead of a 400 BAD_REQUEST with the actionable Spanish message. Pre-existing, not introduced by Sprint 7, but touched file is in scope.

---

### X-04 · `useReviewFilters` hook defined inline in page file (inconsistency with project convention)

**File:** `src/app/reviews/page.tsx:71–106`

The project has `src/hooks/` (contains only `useCurrency.ts`). `useReviewFilters` (~35 lines, touches 3 Next.js router hooks, exposes 5 setters) is non-trivial enough to warrant extraction to `src/hooks/use-review-filters.ts`. Low urgency, but the file is already 332 lines and the hook would be harder to test or reuse inline.

---

## Pre-existing Issues Confirmed In-Scope

The following were confirmed during the Sprint 7 review of touched files but were not introduced by Sprint 7:

| Issue | File | Notes |
|---|---|---|
| `archive` reads post-update `account.status` for `from` field (see M-01) | `accounts.ts` | Pre-existing; Sprint 7 touched the file |
| Tag strings not validated on trade create/update (see M-04) | `trades.ts` | Pre-existing; Sprint 7 added tag management without closing the gap |
| `changePhase` throws `Error` not `TRPCError` (see X-03) | `accounts.ts` | Pre-existing |

---

## Validation Checklist

| Gate | Item | Status |
|---|---|---|
| TypeScript | `tsc --noEmit` 0 errors | ✅ |
| Tests | 430/430 passing | ✅ |
| Security | `ai-embed` direct path userId scoping | ❌ **B-01** |
| Security | Webhook secret comparison timing-safe | ❌ **N-01** |
| Security | Tag input validated on create/update | ❌ **M-04** |
| Data integrity | `archive` audit log `from` field | ❌ **M-01** |
| Reliability | `localStorage` guarded with try/catch | ❌ **M-02** |
| Ops | `SUPABASE_WEBHOOK_SECRET` misconfiguration detectable | ❌ **M-03** |
| Contract | `setups.PeriodEnum` includes "7d" | ❌ **N-02** |
| UX | Merge button disabled/explained when 1 tag | ❌ **N-03** |
| Architecture | `calcSetupHealth` statically imported | ❌ **X-01** |
| Architecture | `useReviewFilters` extracted to hooks/ | ⚠️ Optional |
| Features | `tradeTags` list/rename/delete/merge work | ✅ |
| Features | `ReviewDetailPanel` edit/delete buttons work | ✅ |
| Features | Setup health score renders in Playbook | ✅ |
| Features | Dashboard "7d" period works | ✅ |
| Features | Review filters persist to URL | ✅ |
| Features | Embedding webhook shape accepted | ✅ |

---

## Summary

| Class | Count | Items |
|---|---|---|
| Blocking | 2 | B-01, B-02 |
| Major | 4 | M-01, M-02, M-03, M-04 |
| Minor | 3 | N-01, N-02, N-03 |
| Nitpick | 4 | X-01, X-02, X-03, X-04 |

**Priority fixes before production deploy:**
1. **B-01** — Add `userId` filter to `prisma.trade.findUnique` (and the raw UPDATE) in `ai-embed/route.ts` for the direct-call path
2. **B-02** — Add rate-limiting, body-size cap, and audit log to the webhook path in `ai-embed/route.ts`
3. **M-02** — Wrap both `localStorage` calls in `dashboard/page.tsx` with `try/catch`
4. **M-01** — Add `findUniqueOrThrow` pre-fetch before the update in `accounts.archive`
5. **M-03** — Add startup warning when webhook is configured but secret is absent
6. **M-04** — Add `.min(1).max(30)` per-element and `.max(20)` to the array on trade `create` / `update` tag inputs

**Sprint 8 backlog candidates:**
- N-01, N-02, N-03, X-01–X-04
