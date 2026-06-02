# Sprint 3 QA Report — Independent Audit

> **Auditor:** Staff Engineer (independent review)
> **Audit date:** 2026-06-02 — commit `44255d3`
> **Fix date:** 2026-06-02 — commit `303e982` (B+M), see also SPRINT_3_FIX_REPORT.md
> **Scope:** All 24 files added or modified in Sprint 3
> **Methodology:** Static analysis, code tracing, date-range arithmetic verification, security model review, architecture conformance check. No assumptions about correctness were made.

---

## Executive Summary

Sprint 3 delivered its primary objective (profile backend + toast coverage + TASK-011 refactor) with **good structural decisions** — PROFILE_PUBLIC_FIELDS whitelist, service layer extraction, and the discipline-service consolidation are sound. However, the audit identified **2 Blocking bugs**, **7 Major issues**, **4 Minor issues**, and **3 Nitpicks** that require resolution before this branch is safe to merge.

The most critical finding is a **silent date-range regression** in `computedDisciplineScore` that causes trades on the last day of any week to be excluded from the discipline score calculation. A **security hole** in `deleteAccount` using the anon client for an admin API call is equally blocking.

| Severity  | Count |
|-----------|-------|
| Blocking  | 2     |
| Major     | 7     |
| Minor     | 4     |
| Nitpick   | 3     |
| **Total** | **16** |

---

## BLOCKING

### B-001 · Date Range Regression in `computedDisciplineScore`

**File:** `src/server/trpc/routers/weekly-reviews.ts:107-122`
**Impact:** Discipline scores are now systematically under-calculated for any week that has trades on the final day.

**Root cause:** The old implementation used `date: { gte: weekStart, lte: weekEnd }` (inclusive on both ends). The new implementation delegates to `computeDisciplineScore()` which internally uses `date: { gte: from, lt: to }` (exclusive end). Since `Trade.date` is `@db.Date` (day-precision, midnight UTC), a trade dated `2026-06-01` has `date = 2026-06-01T00:00:00.000Z`. The query `lt: new Date("2026-06-01")` compares as `< 2026-06-01T00:00:00.000Z` and **excludes** that trade.

**Evidence:**
```ts
// weekly-reviews.ts — computedDisciplineScore (line 111)
// weekEnd passed directly → discipline-service uses lt: to → EXCLUDES last-day trades
{ from: new Date(input.weekStart), to: new Date(input.weekEnd) }

// discipline-service.ts (line 43)
date: { gte: from, lt: to }  // lt is EXCLUSIVE
```

**Note:** `prefill` is NOT affected because it adds `+1` day before passing `to` (line 135), making `lt: weekEnd+1` which correctly includes weekEnd trades. The inconsistency between the two procedures compounds the regression.

**Fix:**
```ts
// In computedDisciplineScore, add one day to make the range inclusive:
const to = new Date(input.weekEnd)
to.setDate(to.getDate() + 1)
const result = await computeDisciplineScore(ctx.prisma, ctx.userId, { from: new Date(input.weekStart), to })
```

---

### B-002 · `deleteAccount` Calls Admin API with Anon Client — Will Return 403

**File:** `src/server/trpc/routers/profile.ts:94`
**Impact:** The "Borrar cuenta" feature is completely broken at runtime. Prisma cascade delete succeeds, but auth user deletion always fails silently, leaving orphaned auth records. The UI receives `{ ok: true }` and redirects to `/login` — the user can then log back in with the deleted account.

**Root cause:** `ctx.supabase` is created via `createClient()` in `src/lib/supabase/server.ts`, which uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The Supabase admin API (`auth.admin.deleteUser()`) **requires** the `service_role` key. The anon client exposes the `.admin` object at the TypeScript level (no type error), but all admin calls return a 403 from Supabase.

The current code swallows the error:
```ts
// profile.ts line 94-98
const { error } = await ctx.supabase.auth.admin.deleteUser(ctx.userId)
if (error) {
  console.error("Auth deletion failed after profile deletion:", error.message)
  // returns { ok: true } — user is redirected to /login but can still authenticate!
}
```

**Fix:** Create a separate admin client using `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to client):
```ts
// src/lib/supabase/admin.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```
Then use `createAdminClient().auth.admin.deleteUser()` in `deleteAccount`. If `SUPABASE_SERVICE_ROLE_KEY` is absent, throw a `PRECONDITION_FAILED` error before attempting the Prisma delete.

---

## MAJOR

### M-001 · `saveChecklist` Mutation Has No `onError` Handler

**File:** `src/app/trades/page.tsx:60`
**Impact:** Checklist save failures are silently swallowed. The user sees no indication that the trade was logged but the checklist was not saved.

```ts
const saveChecklist = trpc.trades.saveChecklistResult.useMutation()  // no onError
```

The claim of "46 mutations covered" in the Sprint 3 Completion Report is incorrect — `saveChecklist` was missed.

**Fix:** Add `onError: (err) => toast.error(formatErrorForUser(err))`.

---

### M-002 · `processDecay` Mutation Has No `onError` Handler

**File:** `src/app/aprendizaje/page.tsx:38-45`
**Impact:** The decay transition mutation fires on every page load (via `useEffect`). If it fails (e.g., network error, server restart), the failure is invisible. Resources that should be marked as decayed remain stale.

**Fix:** Add `onError: (err) => toast.error(formatErrorForUser(err))`.

---

### M-003 · `createReview` Mutation Has No `onError` Handler

**File:** `src/app/reviews/modals/create-review-modal.tsx:221-224`
**Impact:** Review creation failures produce no user feedback. The modal stays open with no error message.

**Note:** The adjacent `generateAiSummary` mutation does have an `onError` handler (using `err.message` directly instead of `formatErrorForUser` — inconsistent style but functional). The `createReview` mutation is the gap.

**Fix:** Add `onError: (err) => toast.error(formatErrorForUser(err))` to `createReview`.

---

### M-004 · `handleSaveProfile` Always Invalidates Analytics Cache

**File:** `src/app/perfil/page.tsx:280-289`, `src/domains/profile/services/profile-service.ts:83-85`
**Impact:** Every call to "Guardar cambios" — even if only the name changed — triggers `invalidateAnalyticsCacheIfNeeded`, which deletes all `TradeStatsCache` rows for the user. This forces a full dashboard recompute on the next visit.

**Root cause:** `handleSaveProfile` sends all 6 form fields as defined strings (never `undefined`). `invalidateAnalyticsCacheIfNeeded` checks `input.baseCurrency !== undefined || input.timezone !== undefined` — both are always true when strings are passed.

**Correct behavior:** Cache should only be invalidated when baseCurrency or timezone actually changed from their current value.

**Fix:** Either (a) send only changed fields by diffing against the profile snapshot, or (b) compare the new values against the current profile values before invalidating:
```ts
// In profile.ts update mutation, after normalization:
const currentProfile = await ctx.prisma.user.findUnique({ where: { id: ctx.userId }, select: { baseCurrency: true, timezone: true } })
const hasAnalyticsChange = 
  (normalized.baseCurrency !== undefined && normalized.baseCurrency !== currentProfile?.baseCurrency) ||
  (normalized.timezone !== undefined && normalized.timezone !== currentProfile?.timezone)
if (hasAnalyticsChange) {
  await prisma.tradeStatsCache.deleteMany({ where: { userId } })
}
```

---

### M-005 · `profile.update` Returns Unserialised `Date` Objects (Type Contract Violation)

**File:** `src/server/trpc/routers/profile.ts:41-45`
**Impact:** `profile.update` returns the raw Prisma result, which includes `lastReviewDate: Date | null` and `createdAt: Date`. `profile.get` serializes both to ISO strings. Without a superjson transformer, tRPC sends Dates as ISO strings over the wire, but TypeScript types remain `Date` — causing a client-side type contract mismatch.

While the page works (it ignores the update return value and calls `invalidate()`), any future code that consumes the `updateMut.data` will behave incorrectly due to the type lie.

**Fix:** Mirror the serialization in `profile.get`:
```ts
// profile.ts — update mutation return:
const updated = await ctx.prisma.user.update({ where: { id: ctx.userId }, data: normalized, select: PROFILE_PUBLIC_FIELDS })
return {
  ...updated,
  lastReviewDate: updated.lastReviewDate?.toISOString() ?? null,
  createdAt:      updated.createdAt.toISOString(),
}
```

---

### M-006 · `Cerrar sesión` Redirects to Non-Existent Route (`/api/auth/signout`)

**File:** `src/app/perfil/page.tsx:521`
**Impact:** Clicking "Cerrar sesión" on the profile page results in a 404. This is a complete regression from the existing logout in `Sidebar.tsx` which correctly calls `supabase.auth.signOut()` then pushes to `/login`.

**Root cause:** No `POST /api/auth/signout` route exists in the codebase. The route was added without creating the corresponding handler.

```ts
// Current (broken):
<GhostBtn onClick={() => { window.location.href = "/api/auth/signout" }}>
  Cerrar sesión
</GhostBtn>
```

**Fix:** Replicate the existing Sidebar logout pattern:
```ts
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
// ...
const router = useRouter()
async function handleLogout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  router.push("/login")
  router.refresh()
}
```

---

### M-007 · Form State Initialized via Render-Body `setState` Calls (React Anti-Pattern)

**File:** `src/app/perfil/page.tsx:232-240`
**Impact:** Calling multiple `setState` functions during the render body (outside `useEffect` and not in an event handler) is a React anti-pattern that causes an additional render cycle on initial data load. In React strict mode this triggers a `Warning: Cannot update a component while rendering a different component`. While React 18 batches the 6 state updates, the pattern is fragile and will break with React Compiler.

```ts
// Current — called during render:
if (profile && !formInitialized) {
  setName(profile.name ?? "")
  setTimezone(profile.timezone ?? "America/Tegucigalpa")
  // ... 4 more setState calls
  setFormInitialized(true)
}
```

**Fix:** Move initialization to `useEffect`:
```ts
useEffect(() => {
  if (profile && !formInitialized) {
    setName(profile.name ?? "")
    setTimezone(profile.timezone ?? "America/Tegucigalpa")
    setLanguage((profile.language as "es" | "en") ?? "es")
    setBaseCurrency(profile.baseCurrency ?? "USD")
    setWeeklyGoalMinutes(profile.weeklyGoalMinutes ?? 300)
    setEmailNotifications(profile.emailNotifications ?? true)
    setFormInitialized(true)
  }
}, [profile, formInitialized])
```

---

## MINOR

### m-001 · File Download Fails in Firefox (Missing DOM Attachment)

**File:** `src/app/perfil/page.tsx:296-300`
**Impact:** "Exportar datos (JSON)" works in Chrome but fails silently in Firefox. Firefox requires anchor elements to be appended to the DOM before programmatic `.click()`.

```ts
// Current:
const a = document.createElement("a")
a.href = url
a.download = `...`
a.click()  // Firefox ignores this — element not in DOM
URL.revokeObjectURL(url)
```

**Fix:**
```ts
document.body.appendChild(a)
a.click()
document.body.removeChild(a)
URL.revokeObjectURL(url)
```

---

### m-002 · `exportData` Registered as `useQuery` on Page Mount

**File:** `src/app/perfil/page.tsx:267-269`
**Impact:** Using `trpc.profile.exportData.useQuery(undefined, { enabled: false })` registers the query with TanStack Query's cache on every mount. The query occupies cache space and appears in React Query Devtools as a pending query that never resolves. A `useMutation`-based approach or lazy loading pattern is more appropriate for a one-time export action.

**Fix:** Remove the `useQuery` hook and call the export endpoint via a direct `fetch` or convert `exportData` to a mutation server-side.

---

### m-003 · `ProfileSkeleton` Uses Inline CSS Animation Not in Design System

**File:** `src/app/perfil/page.tsx:188`
**Impact:** `animation: "pulse 1.5s ease-in-out infinite"` relies on the `@keyframes pulse` being injected by Tailwind. This works today (since `skeleton.tsx` uses `animate-pulse` which forces Tailwind to include the keyframe), but is a fragile implicit dependency. The `skeleton.tsx` created in this sprint already provides the correct pattern using `animate-pulse`.

**Fix:** Replace `ProfileSkeleton` with the already-created `<Skeleton>` / `SkeletonAccountCards` components, or add `animate-pulse` class to the placeholder divs.

---

### m-004 · New User Fields (`weeklyTradesGoal`, `weeklyPnlGoal`, `disciplineGoal`, `onboardingCompleted`) Are Schema-Only — No Write Path

**File:** `src/prisma/schema.prisma:23-26`, `src/domains/profile/services/profile-service.ts`
**Impact:** Four fields were added to the schema and Prisma client was regenerated, but:
1. `UpdateProfileInput` does not include them — they cannot be set via `profile.update`
2. `PROFILE_PUBLIC_FIELDS` does not include them — they cannot be read via `profile.get`
3. No migration has been applied to production DB

These fields are dead schema weight until a write path and a migration are added. The Completion Report acknowledges the migration but not the missing write path.

---

## NITPICK

### n-001 · `generateAiSummary` Uses `err.message` Instead of `formatErrorForUser`

**File:** `src/app/reviews/modals/create-review-modal.tsx:233`
**Impact:** Inconsistent error display. The custom Spanish message patterns defined in `formatErrorForUser` will not be applied to AI summary errors.

```ts
// Inconsistent:
onError: (err) => { toast.error(err.message || "Error al generar resumen") }

// Should be:
onError: (err) => toast.error(formatErrorForUser(err))
```

---

### n-002 · Router Name Deviates from Target Architecture

**File:** `src/server/trpc/routers/profile.ts`, `src/server/trpc/root.ts:26`
**Impact:** `target-architecture.md` specifies the router as `src/server/trpc/routers/users.ts` registered as `users:`. Sprint 3 created `profile.ts` registered as `profile:`. The Sprint 3 Implementation Plan overrides this (it explicitly says `profile.ts`), so this is not a blocking issue, but creates a future naming conflict when a `users` admin router is eventually added.

---

### n-003 · `ProfileSkeleton` Duplicates Logic Already in `skeleton.tsx`

**File:** `src/app/perfil/page.tsx:179-194`
**Impact:** The `ProfileSkeleton` component duplicates the card-skeleton pattern using inline styles. The `SkeletonAccountCards` component created in `skeleton.tsx` uses the same visual approach. Two skeleton implementations for the same concept violate the DRY principle established by creating `skeleton.tsx` in the first place.

---

## Architecture Conformance

| Target Architecture Requirement | Status | Notes |
|---------------------------------|--------|-------|
| Supabase used for Auth only; data via Prisma | ✅ | profile router uses Prisma for data |
| Service role key server-side only | ❌ B-002 | `deleteAccount` uses anon client for admin API |
| Domain services own business logic, routers thin | ✅ | `profile-service.ts` extracts validation, normalization, cache logic |
| Single source of truth for formulas | ✅ | TASK-011 eliminates duplicate discipline implementations |
| PROFILE_PUBLIC_FIELDS whitelist | ✅ | Correctly implemented, `updatedAt` excluded |
| tRPC for all domain data; no REST | ✅ | |
| No client-side aggregation over unbounded data | ✅ | profile data is server-fetched |
| Error normalization for user-facing messages | ✅ | `formatErrorForUser` with type broadened to `TRPCClientErrorLike<any>` |

---

## Test Coverage Gap

No tests were added for:
- `src/server/trpc/routers/profile.ts` (the 5 tRPC procedures)
- `src/app/perfil/page.tsx` (the form initialization, export, delete flows)
- Date-range semantics in `weekly-reviews.ts` after the discipline refactor

The existing 291 tests cover the **service layer** correctly but provide no coverage for the **router layer** or the **date regression introduced in B-001**.

---

## Summary of Required Actions Before Merge

| ID    | Action | Severity | Status |
|-------|--------|----------|--------|
| B-001 | Add `+1 day` to `weekEnd` in `computedDisciplineScore` before calling `computeDisciplineScore()` | Blocking | ✅ Fixed |
| B-002 | Create `src/lib/supabase/admin.ts` with service role client; use in `deleteAccount` | Blocking | ✅ Fixed |
| M-001 | Add `onError` to `saveChecklist` mutation in `trades/page.tsx` | Major | ✅ Fixed |
| M-002 | Add `onError` to `processDecay` mutation in `aprendizaje/page.tsx` | Major | ✅ Fixed |
| M-003 | Add `onError` to `createReview` mutation in `create-review-modal.tsx` | Major | ✅ Fixed |
| M-004 | Fix cache invalidation to only trigger on actual value change | Major | ✅ Fixed |
| M-005 | Serialize `Date` fields in `profile.update` return value | Major | ✅ Fixed |
| M-006 | Replace `/api/auth/signout` with existing Supabase `signOut()` pattern | Major | ✅ Fixed |
| M-007 | Move form initialization to `useEffect` | Major | ✅ Fixed |
| m-001 | Append `<a>` to DOM before `.click()` in `handleExport` | Minor | ✅ Fixed |
| m-002 | Remove `exportData` from `useQuery`; use mutation or direct fetch | Minor | ✅ Fixed |
| m-003 | Replace `ProfileSkeleton` inline animation with `animate-pulse` class | Minor | ✅ Fixed |
| m-004 | Add write path for `weeklyTradesGoal`, `disciplineGoal`, `onboardingCompleted` or document as deferred | Minor | 📋 Deferred |
| n-001 | Standardize `generateAiSummary` error handler to use `formatErrorForUser` | Nitpick | ✅ Fixed |
| n-002 | Document the `profile.ts` vs `users.ts` naming decision in CLAUDE.md | Nitpick | 📋 Deferred |
| n-003 | Replace `ProfileSkeleton` with `Skeleton` components from `skeleton.tsx` | Nitpick | 📋 Deferred |
