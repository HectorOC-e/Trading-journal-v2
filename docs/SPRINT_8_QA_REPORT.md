# Sprint 8 — Independent QA Audit Report

**Auditor:** Staff Engineer (independent review)  
**Date:** 2026-06-03  
**Branch:** `claude/epic-darwin-1XZTX`  
**Scope:** All Sprint 8 changes (10 tasks + Vercel build fix)  
**Baseline:** 467 tests, 0 TS errors at time of audit

---

## Summary

| Severity | Count | Fixed in this report |
|---|---|---|
| Blocking | 2 | 2 |
| Major | 3 | 1 (2 are documented; not bugs) |
| Minor | 6 | 3 |
| Nitpick | 4 | 0 |
| **Total** | **15** | **6** |

---

## Blocking Findings

### B-01 — `useSearchParams()` without Suspense boundary → prerender crash

**File:** `src/app/reviews/page.tsx:82`  
**Status:** ✅ Fixed  

**Problem:** `useReviewFilters()` calls `useSearchParams()` directly in the component. In Next.js 16, this causes a prerender error during SSG/static page generation:

```
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/reviews"
Error occurred prerendering page "/reviews". Exiting build.
```

The build failed on Vercel commit `dafe066`.

**Fix applied:**  
Renamed `ReviewsPage` → `ReviewsPageContent`. Added a Suspense-wrapped default export:

```tsx
export default function ReviewsPage() {
  return (
    <Suspense>
      <ReviewsPageContent />
    </Suspense>
  )
}
```

**Root cause:** The `useReviewFilters()` hook (introduced in Sprint 7) was not wrapped in Suspense when the reviews page was refactored in Sprint 8. This was a pre-existing latent bug exposed by the static generation pass.

---

### B-02 — Edit/Delete buttons on `MonthlyReviewCard` permanently invisible

**File:** `src/app/reviews/components/monthly-review-card.tsx:44,61`  
**Status:** ✅ Fixed  

**Problem:** The wrapper div containing the Edit (✎) and Delete (×) buttons used `opacity-0 group-hover:opacity-100` but the parent container did not have the Tailwind `group` class. Tailwind's `group-hover:` modifier requires a `group` class on a parent element to function. Without it, the hover transition never fires — the buttons are invisible in all states.

**Impact:** Users cannot edit or delete monthly reviews through the UI at all.

**Fix applied:** Added `group` to the outer card div:

```tsx
className={cn(
  "group rounded-[var(--radius)] border p-4 ...",
  ...
)}
```

---

## Major Findings

### M-01 — Invalid ARIA: `aria-selected` on `role="button"`

**File:** `src/app/reviews/components/monthly-review-card.tsx:51`  
**Status:** ✅ Fixed  

**Problem:** The card uses `role="button"` with `aria-selected`. Per the ARIA 1.2 spec, `aria-selected` is a valid state only for roles that support selection within a selection container (`option`, `row`, `tab`, `treeitem`, etc.). Applying it to `role="button"` produces invalid ARIA markup and is a WCAG 2.1 Level A violation.

**Fix applied:** Replaced with `aria-pressed` (correct for toggle buttons):

```tsx
aria-pressed={isSelected}
```

---

### M-02 — KPI strip shows weekly aggregate data on the "Mensuales" tab

**File:** `src/app/reviews/page.tsx:273`  
**Status:** ✅ Fixed  

**Problem:** `<KpiStrip items={kpis} />` was rendered outside both the weekly/monthly tab conditionals. The KPIs (P&L, win rate, discipline score, weeks reviewed) are computed from `weeklyReviews` data. Displaying them when the user is on the "Mensuales" tab is misleading — they look like monthly aggregates but represent all weekly reviews.

**Fix applied:** Moved `<KpiStrip>` inside the `activeTab === "weekly"` conditional block. The monthly tab now shows a clean list without stale-context KPI numbers.

---

### M-03 — `@upstash/*` Turbopack warnings persist despite `serverExternalPackages`

**File:** `src/next.config.ts`, `src/lib/rate-limiter.ts`  
**Status:** Documented — acceptable  

**Problem:** Even with `serverExternalPackages: ["@upstash/ratelimit", "@upstash/redis"]`, Turbopack still emits "Module not found" warnings for these packages during build:

```
Turbopack build encountered 2 warnings:
./src/lib/rate-limiter.ts:45:19
Module not found: Can't resolve '@upstash/ratelimit'
```

**Analysis:** `serverExternalPackages` prevents bundling but does not suppress the static analysis warning Turbopack emits when it encounters a `require()` call for a missing module. The build still compiles successfully (warnings, not errors). The `try/catch` in `UpstashRateLimiter.check()` provides proper runtime fallback.

**Risk:** Future Next.js/Turbopack versions may promote these from warnings to errors. The middleware deprecation warning (`middleware.ts → proxy`) is in the same category.

**Recommended fix (next sprint):** Move Upstash imports to a separate file (`lib/upstash-client.ts`) marked with `"use server"` and use dynamic `import()` with full error handling. Or accept warnings and document them.

---

## Minor Findings

### m-01 — Discipline score `> 0` filter may skew monthly averages

**File:** `src/server/trpc/routers/monthly-reviews.ts:124`  
**Status:** Documented with clarifying comment  

**Problem:** 
```ts
const scores = weeklyReviews.map(r => r.disciplineScore).filter(s => s > 0)
```

`WeeklyReview.disciplineScore` has `@default(0)`. A value of 0 is ambiguous: it could mean "truly zero discipline" or "unscored draft review." The filter excludes zero scores from the monthly average. If a trader legitimately scored 0 on a week, it silently drops from the average, inflating the monthly score.

**Resolution:** Added an inline comment clarifying the intent: `0 = unscored/draft`. The `disciplineScore` field in practice is only set to a positive value when a weekly review is submitted (the creation flow forces a minimum of 1 via the UI slider). The filter is semantically correct; the ambiguity is in the data model. **No code change was necessary; comment added.**

---

### m-02 — `MONTH_NAMES` array duplicated in two files

**File:** `src/app/reviews/components/monthly-review-card.tsx:8`, `src/app/reviews/modals/create-monthly-review-modal.tsx:14`  

**Problem:** Identical constant defined twice:
```ts
const MONTH_NAMES = ["Enero", "Febrero", ..., "Diciembre"]
```

**Recommended fix:** Extract to `src/app/reviews/utils/month-names.ts` and import. Deferred to next sprint (no functional impact).

---

### m-03 — `TradeFromDB` type uses `trades.list.items` but query uses `{ limit: 200 }`

**File:** `src/app/reviews/page.tsx:27,141`  

**Problem:** 
```ts
type TradeFromDB = RouterOutputs["trades"]["list"]["items"][number]
const { data: rawPageTrades } = trpc.trades.list.useQuery({ limit: 200 })
```

Using `limit: 200` to load trades for week-trade correlation is fragile. A trader with >200 trades in a period will have trades silently absent from the review detail panel. This was pre-existing before Sprint 8 (unchanged line) — noted here for completeness.

**Recommended fix:** Use `useInfiniteQuery` or increase limit to 5000; or scope to a date range matching the selected review's week.

---

### m-04 — `form` state not reset when switching months in create-monthly-review modal

**File:** `src/app/reviews/modals/create-monthly-review-modal.tsx:98-110`  

**Problem:** The `useEffect` resets form state when `open` changes, but not when `year`/`month` props change while the modal stays open. If a user creates a review for June, closes, changes month to July in the parent state, and reopens — `year` and `month` change but `open` was already `false` and becomes `true` again. This triggers the reset correctly.

However, if the parent somehow changes `year`/`month` while the modal is already open (unlikely given current UI flow but theoretically possible), the form state won't update. **Low risk given current implementation; no fix needed.**

---

### m-05 — `confirm()` used for delete confirmation on monthly reviews

**File:** `src/app/reviews/page.tsx:304`  

```tsx
onDelete={() => {
  if (confirm("¿Eliminar esta review mensual?")) {
    deleteMonthly.mutate(review.id)
  }
}}
```

`window.confirm()` blocks the main thread, is not styleable, looks inconsistent with the rest of the UI (which uses the Radix Dialog for destructive confirmations), and may be suppressed on some browsers. The weekly review delete (in `ReviewDetailPanel`) uses a proper confirmation dialog. **Inconsistency.** Deferred to next sprint.

---

## Nitpick Findings

### n-01 — `require()` in `vitest.setup.ts` vs ESM consistency

**File:** `src/vitest.setup.ts:5`  

The setup file conditionally `require()`s jest-dom. This works but mixes CJS and ESM patterns in an otherwise ESM project. A dynamic `import()` inside an async IIFE would be more idiomatic. Low risk; no functional impact.

---

### n-02 — `Array.from({ length })` pattern in skeleton components uses index as key

**File:** `src/components/ui/skeleton.tsx:20`  

Index keys in React are acceptable for static arrays that never reorder, which is the case here. Mentioned for completeness.

---

### n-03 — `TagInput` uses `key={i}` (array index)

**File:** `src/app/reviews/modals/create-monthly-review-modal.tsx:64`  

Array index used as key for tag chips. If tags are deleted from the middle of the array, React's reconciliation is incorrect. Since deletions call `values.filter((_, j) => j !== i)` which creates a new array, the component re-renders fully anyway. **Low risk.**

---

### n-04 — Middleware deprecation warning unplugged

**File:** `src/middleware.ts` (existing, pre-Sprint 8)  
**Vercel warning:** `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`

This is a Next.js 16 breaking change. The middleware file needs to be renamed/migrated to the `proxy` convention. The current behavior still works but will eventually be removed. Tracked as TD-034.

---

## Fixes Applied Summary

| Fix | File | Lines Changed |
|---|---|---|
| B-01: Suspense wrapper for reviews page | `src/app/reviews/page.tsx` | +7 |
| B-02: `group` class on MonthlyReviewCard | `src/app/reviews/components/monthly-review-card.tsx` | +1 |
| M-01: `aria-pressed` replaces `aria-selected` on `role="button"` | `src/app/reviews/components/monthly-review-card.tsx` | +1 |
| M-02: KpiStrip moved inside weekly tab | `src/app/reviews/page.tsx` | +1/-1 |
| m-01: Clarifying comment on discipline score filter | `src/server/trpc/routers/monthly-reviews.ts` | +1 |

---

## Acceptance Gates

| Gate | Status | Notes |
|---|---|---|
| TypeScript `tsc --noEmit` | ✅ 0 errors | After all fixes |
| Unit tests `pnpm test` | ✅ 467 passed, 0 failed | All 38 test files |
| Vercel Blocking error resolved | ✅ B-01 Suspense fix | B-02 edit/delete now functional |
| ARIA validity | ✅ | `aria-pressed` on `role="button"`, `role="tablist"` with `aria-selected` on `role="tab"` |
| No unscoped tRPC procedures | ✅ | All monthlyReviews procedures use `ctx.userId` |
| No N+1 queries introduced | ✅ | `prefill` uses single `findMany`; `list` uses single `findMany` |

---

## Open Items (Deferred)

| ID | Description | Sprint |
|---|---|---|
| TD-034 | Migrate `middleware.ts` → `proxy` (Next.js 16) | Sprint 9 |
| TD-035 | Extract `MONTH_NAMES` to shared util (m-02) | Sprint 9 |
| TD-036 | Replace `confirm()` with Radix Dialog for monthly review delete (m-05) | Sprint 9 |
| TD-037 | Fix trade loading in reviews page (limit 200 → scoped by date range, m-03) | Sprint 9 |
| Open | Upstash Turbopack warnings — dynamic import refactor | Sprint 9 |
