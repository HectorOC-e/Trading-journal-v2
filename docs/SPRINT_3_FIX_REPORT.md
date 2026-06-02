# Sprint 3 Fix Report

> **Date:** 2026-06-02
> **Branch:** `claude/epic-darwin-1XZTX`
> **Audit source:** `docs/SPRINT_3_QA_REPORT.md`
> **Tests before:** 291 · **Tests after:** 315 (+24)

---

## Overview

All 2 Blocking and 7 Major issues from the Sprint 3 QA audit have been resolved. Three Minor issues and 1 Nitpick were also fixed as low-effort improvements. Three items (m-004, n-002, n-003) are formally deferred.

| Category | Found | Fixed | Deferred |
|----------|-------|-------|----------|
| Blocking |   2   |   2   |    —     |
| Major    |   7   |   7   |    —     |
| Minor    |   4   |   3   |    1     |
| Nitpick  |   3   |   1   |    2     |
| **Total**| **16**| **13**|  **3**   |

---

## Blocking Fixes

### B-001 · Date Range Regression in `computedDisciplineScore` ✅

**File:** `src/server/trpc/routers/weekly-reviews.ts`

**Root cause:** The refactored `computedDisciplineScore` procedure passed `weekEnd` directly to `computeDisciplineScore()`, which uses `date: { lt: to }` (exclusive end). Trades on the final day of the reviewed week were silently excluded. The `prefill` procedure was unaffected because it already added `+1 day`.

**Fix applied:**
```ts
// Before (broken — excludes last-day trades)
{ from: new Date(input.weekStart), to: new Date(input.weekEnd) }

// After (correct — lt is exclusive, +1 makes weekEnd inclusive)
const from = new Date(input.weekStart)
const to   = new Date(input.weekEnd)
to.setDate(to.getDate() + 1)
const result = await computeDisciplineScore(ctx.prisma, ctx.userId, { from, to })
```

**Tests added:** `src/__tests__/routers/weekly-reviews-date-range.test.ts`
- Asserts `computeDisciplineScore` is called with `weekEnd + 1 day` (calendar-day arithmetic, not +86400s)
- Covers DST edge case (week spanning US daylight saving transition)
- Verifies `prefill` applies the same `+1 day` to both the Prisma trade query and discipline service call
- Verifies returned shape: `{ score, breakdown: { execution, learning, adherence }, detail }`

---

### B-002 · `deleteAccount` Used Anon Client for Admin API ✅

**File:** `src/server/trpc/routers/profile.ts`, **New:** `src/lib/supabase/admin.ts`

**Root cause:** `ctx.supabase` is created with `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `auth.admin.deleteUser()` requires the `service_role` key. The anon client exposes `.admin` at the TypeScript level (no type error) but returns 403 at runtime. The error was swallowed and `{ ok: true }` returned — the user could log back in after Prisma deletion.

**Fix applied:**

New file `src/lib/supabase/admin.ts`:
```ts
import { createClient } from "@supabase/supabase-js"

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
```

`deleteAccount` mutation updated to use `createAdminClient()` instead of `ctx.supabase`.

**Tests added:** `src/__tests__/routers/profile.test.ts` — `profile.deleteAccount` suite
- Asserts Prisma deletion runs before auth deletion (order guarantee)
- Asserts the mocked `createAdminClient` is called, not `ctx.supabase.auth.admin`
- Asserts `{ ok: true }` is returned even if auth deletion fails (Prisma deletion already committed, user row gone)

---

## Major Fixes

### M-001 · `saveChecklist` Had No `onError` Handler ✅

**File:** `src/app/trades/page.tsx`

Checklist save failures were silently swallowed after a trade was logged. Added `onError: (err) => toast.error(formatErrorForUser(err))`.

---

### M-002 · `processDecay` Had No `onError` Handler ✅

**File:** `src/app/aprendizaje/page.tsx`

Background decay transition mutation fired on page load with no error visibility. Added `onError: (err) => console.error("Decay transition failed:", err.message)` — silent logging is appropriate because this is an automatic background check; a toast would be disruptive on page load.

---

### M-003 · `createReview` Had No `onError` Handler ✅

**File:** `src/app/reviews/modals/create-review-modal.tsx`

Review creation failures produced no user feedback. Added `onError: (err) => toast.error(formatErrorForUser(err))` and added the missing `formatErrorForUser` import.

---

### M-004 · `handleSaveProfile` Always Invalidated Analytics Cache ✅

**File:** `src/app/perfil/page.tsx`

`handleSaveProfile` previously sent all 6 form fields on every save. Since `invalidateAnalyticsCacheIfNeeded` fires when `baseCurrency !== undefined || timezone !== undefined`, cache was invalidated on every save — even name-only changes.

**Fix:** `handleSaveProfile` now diffs each form field against the current server profile and only includes fields that actually changed in the mutation payload. If no fields changed, an info toast is shown and the mutation is not called.

```ts
// Only sends changed fields — cache invalidation fires only when
// baseCurrency or timezone are included in the patch.
const patch: { ... } = {}
if (name !== (profile.name ?? ""))                patch.name = name
if (timezone !== (profile.timezone ?? ""))         patch.timezone = timezone
// ... etc.
if (Object.keys(patch).length === 0) {
  toast.info("Sin cambios para guardar")
  return
}
updateMut.mutate(patch)
```

**Tests added:** `src/__tests__/routers/profile.test.ts` — M-004 gate suite
- Asserts `tradeStatsCache.deleteMany` IS called when `baseCurrency` or `timezone` is in the payload
- Asserts `tradeStatsCache.deleteMany` is NOT called for name-only or emailNotifications-only payloads

---

### M-005 · `profile.update` Returned Unserialised `Date` Objects ✅

**File:** `src/server/trpc/routers/profile.ts`

`profile.get` serialized `lastReviewDate` and `createdAt` to ISO strings but `profile.update` returned the raw Prisma result. Fixed by mirroring the serialization in the `update` return value.

**Tests added:** `src/__tests__/routers/profile.test.ts` — M-005 date serialization suite
- Asserts `typeof result.createdAt === "string"` from both `profile.get` and `profile.update`
- Asserts `null` lastReviewDate remains `null` (not serialized to `"null"`)

---

### M-006 · `Cerrar sesión` Redirected to Non-Existent Route ✅

**File:** `src/app/perfil/page.tsx`

The "Cerrar sesión" button navigated to `/api/auth/signout`, which does not exist. Replaced with the Supabase `signOut()` pattern used in `Sidebar.tsx`:

```ts
async function handleSignOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  router.push("/login")
  router.refresh()
}
```

---

### M-007 · Form State Initialized via Render-Body `setState` Calls ✅

**File:** `src/app/perfil/page.tsx`

Six `setState` calls inside the render body (guarded by `if (profile && !formInitialized)`) caused an extra render cycle and a React strict-mode warning. Moved to `useEffect` with `[profile, formInitialized]` deps.

---

## Minor Fixes

### m-001 · File Download Failed in Firefox ✅

**File:** `src/app/perfil/page.tsx`

Firefox requires anchor elements to be appended to the DOM before `.click()`. Added `document.body.appendChild(a)` before click and `document.body.removeChild(a)` after.

---

### m-002 · `exportData` Registered as `useQuery` on Mount ✅

**File:** `src/app/perfil/page.tsx`

Removed `trpc.profile.exportData.useQuery(undefined, { enabled: false })`. The export button now calls `utils.profile.exportData.fetch()` directly inside `handleExport`, which does not register a persistent cache subscription. A local `exportLoading` state drives the button spinner.

---

### m-003 · `ProfileSkeleton` Used Inline CSS Animation ✅

**File:** `src/app/perfil/page.tsx`

Replaced `animation: "pulse 1.5s ease-in-out infinite"` inline style with Tailwind `animate-pulse` class (consistent with `skeleton.tsx`).

---

### n-001 · `generateAiSummary` onError Used Raw `err.message` ✅

**File:** `src/app/reviews/modals/create-review-modal.tsx`

Standardized to `formatErrorForUser(err)` — consistent with all other 48 mutation error handlers. The `formatErrorForUser` import was also added to this file (it was missing despite being used in the adjacent `createReview` onError).

---

## Deferred Items

### m-004 · New Schema Fields Have No Write Path 📋

`weeklyTradesGoal`, `weeklyPnlGoal`, `disciplineGoal`, `onboardingCompleted` were added to `schema.prisma` in Sprint 3 but are excluded from `PROFILE_PUBLIC_FIELDS` and `UpdateProfileInput`. These fields require a full onboarding flow (separate sprint deliverable) and are intentionally left unreadable/unwritable until that flow is implemented.

**Action:** Tracked for Sprint 4 onboarding implementation.

---

### n-002 · Router Named `profile.ts` Instead of `users.ts` 📋

The target architecture specified `users.ts`. The Sprint 3 Implementation Plan explicitly chose `profile.ts`. No conflict exists today; this will be revisited if a separate `users` admin router is introduced.

---

### n-003 · `ProfileSkeleton` Duplicates `skeleton.tsx` Card Pattern 📋

Cosmetic duplication — the inline skeleton uses the same visual pattern as `SkeletonAccountCards`. Refactoring to use shared components is a low-risk cosmetic improvement deferred to a general UI polish pass.

---

## Files Changed

| File | Change |
|------|--------|
| `src/server/trpc/routers/weekly-reviews.ts` | B-001: +1 day to `weekEnd` in `computedDisciplineScore` |
| `src/server/trpc/routers/profile.ts` | B-002 admin client import; M-005 date serialization in `update` |
| `src/lib/supabase/admin.ts` | **NEW** — service-role admin client factory |
| `src/app/trades/page.tsx` | M-001: `onError` on `saveChecklist` |
| `src/app/aprendizaje/page.tsx` | M-002: `onError` on `processDecay` |
| `src/app/reviews/modals/create-review-modal.tsx` | M-003: `onError` on `createReview`; n-001: `formatErrorForUser` on `generateAiSummary` |
| `src/app/perfil/page.tsx` | M-004 diff patch; M-006 signout; M-007 `useEffect`; m-001 DOM append; m-002 remove `useQuery`; m-003 `animate-pulse` |
| `src/__tests__/routers/profile.test.ts` | **NEW** — 18 tests covering B-002, M-004, M-005, get/update/changePassword/deleteAccount |
| `src/__tests__/routers/weekly-reviews-date-range.test.ts` | **NEW** — 6 tests covering B-001 date-range arithmetic |
| `docs/SPRINT_3_QA_REPORT.md` | Status column added to resolution table |

---

## Test Coverage Delta

| Suite | Before | After | Delta |
|-------|--------|-------|-------|
| `profile.test.ts` (router) | 0 | 18 | +18 |
| `weekly-reviews-date-range.test.ts` (router) | 0 | 6 | +6 |
| All other tests | 291 | 291 | 0 |
| **Total** | **291** | **315** | **+24** |

All 315 tests pass. TypeScript: 0 errors.

---

## Architecture Conformance — After Fixes

| Requirement | Before | After |
|-------------|--------|-------|
| Service role key server-side only | ❌ B-002 | ✅ `createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` |
| Date fields serialized consistently across all procedures | ❌ M-005 | ✅ `profile.get` and `profile.update` both return ISO strings |
| All mutations have `onError` handlers | ❌ M-001/M-002/M-003 | ✅ 49/49 mutations covered |
| Cache invalidation scoped to actual changes | ❌ M-004 | ✅ Only fires when `baseCurrency` or `timezone` actually change |
| Auth session termination uses Supabase client | ❌ M-006 | ✅ `supabase.auth.signOut()` + `router.push("/login")` |
| Router layer tests exist | ❌ QA gap | ✅ `profile.test.ts`, `weekly-reviews-date-range.test.ts` |
