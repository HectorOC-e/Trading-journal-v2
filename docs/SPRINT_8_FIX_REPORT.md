# Sprint 8 Fix Report

**Date:** 2026-06-03  
**Branch:** `claude/epic-darwin-1XZTX`  
**Scope:** All Blocking and Major findings from `docs/SPRINT_8_QA_REPORT.md`  
**Baseline:** 467 tests before fixes; 479 tests after regression guards added

---

## Summary

| ID   | Severity | Status       | File(s) touched |
|------|----------|--------------|-----------------|
| B-01 | Blocking | ✅ Fixed      | `src/app/reviews/page.tsx` |
| B-02 | Blocking | ✅ Fixed      | `src/app/reviews/components/monthly-review-card.tsx` |
| M-01 | Major    | ✅ Fixed      | `src/app/reviews/components/monthly-review-card.tsx` |
| M-02 | Major    | ✅ Fixed      | `src/app/reviews/page.tsx` |
| M-03 | Major    | ✅ Documented | `src/next.config.ts`, `src/lib/rate-limiter.ts` |

---

## B-01 — `useSearchParams()` without Suspense boundary → prerender crash

**Root cause:** `ReviewsPage` called `useReviewFilters()` (which calls `useSearchParams()`) at the component's top level. Next.js 16 requires any component that calls `useSearchParams()` to be wrapped in `<Suspense>` for SSG/static page generation to succeed. The Vercel build failed at prerender time with:

```
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/reviews"
Error occurred prerendering page "/reviews". Exiting build.
```

**Fix applied (`src/app/reviews/page.tsx`):**  
Renamed the main component to `ReviewsPageContent` (unexported). Added a new thin default export that wraps it in `<Suspense>`:

```tsx
function ReviewsPageContent() {
  // all hook calls including useReviewFilters() / useSearchParams()
}

export default function ReviewsPage() {
  return (
    <Suspense>
      <ReviewsPageContent />
    </Suspense>
  )
}
```

**Regression guard:** The Vercel build itself is the definitive guard. In addition, `ReviewsPageContent` is not exported — any attempt to remerge the components would require re-exposing it, which is a deliberate barrier.

---

## B-02 — Edit/Delete buttons on `MonthlyReviewCard` permanently invisible

**Root cause:** The wrapper `<div>` containing the Edit and Delete buttons used `opacity-0 group-hover:opacity-100`. Tailwind's `group-hover:` modifier requires a `group` class on an **ancestor** element. The outer card `<div>` did not carry the `group` class, so `group-hover:` never fired and the buttons remained invisible in all states.

**Fix applied (`src/app/reviews/components/monthly-review-card.tsx:44`):**

```tsx
// Before
className={cn("rounded-[var(--radius)] border p-4 cursor-pointer ...", ...)}

// After
className={cn("group rounded-[var(--radius)] border p-4 cursor-pointer ...", ...)}
```

**Regression guard:** `src/__tests__/components/monthly-review-card.test.tsx`
- `outer card div has 'group' class (B-02)` — verifies `container.firstChild.classList.contains("group")`
- `edit button is present in the DOM (B-02)` — verifies the button is accessible via ARIA label
- `delete button is present in the DOM (B-02)` — same for delete
- `edit click fires onEdit and does not bubble to card onClick (B-02)` — stopPropagation guard
- `delete click fires onDelete and does not bubble to card onClick (B-02)` — stopPropagation guard

---

## M-01 — Invalid ARIA: `aria-selected` on `role="button"`

**Root cause:** The `MonthlyReviewCard` outer `<div>` uses `role="button"` and had `aria-selected={isSelected}`. Per the ARIA 1.2 spec, `aria-selected` is a valid state only for selectable roles (`option`, `row`, `tab`, `treeitem`, etc.). Using it on `role="button"` is a WCAG 2.1 Level A violation and produces incorrect screen reader output.

**Fix applied (`src/app/reviews/components/monthly-review-card.tsx:51`):**

```tsx
// Before
aria-selected={isSelected}

// After
aria-pressed={isSelected}
```

`aria-pressed` is the correct ARIA state for a toggle button — it communicates pressed/unpressed state to screen readers without implying a selection container.

**Regression guard:** `src/__tests__/components/monthly-review-card.test.tsx`
- `card has aria-pressed=false when not selected (M-01)` — checks `aria-pressed="false"` and absence of `aria-selected`
- `card has aria-pressed=true when selected (M-01)` — checks `aria-pressed="true"`
- `aria-pressed reflects isSelected toggle across rerenders (M-01)` — rerender round-trip

---

## M-02 — KPI strip shows weekly aggregate data on the "Mensuales" tab

**Root cause:** `<KpiStrip items={kpis} />` was rendered unconditionally outside both the weekly/monthly tab conditionals. The KPI data (P&L, win rate, discipline score, weeks reviewed) is aggregated from `weeklyReviews`. Displaying it on the "Mensuales" tab implied it was monthly data, misleading the user.

**Fix applied (`src/app/reviews/page.tsx:316`):**  
Moved `<KpiStrip>` inside the `{activeTab === "weekly" && ( ... )}` block:

```tsx
{/* ── Weekly reviews tab ── */}
{activeTab === "weekly" && (
  <>
    <KpiStrip items={kpis} className="mb-5" />
    {/* filter bar, review list … */}
  </>
)}
```

The "Mensuales" tab now renders only the monthly reviews list, with no stale-context KPI numbers.

**Regression guard:** The existing E2E smoke test (`src/__tests__/e2e/smoke.test.ts:68`) covers the tab toggle on the reviews page. A dedicated unit test for this conditional would require rendering the full page with mocked tRPC providers; the E2E layer is the appropriate guard here.

---

## M-03 — `@upstash/*` Turbopack warnings persist

**Status: Documented — no code change.**

`serverExternalPackages: ["@upstash/ratelimit", "@upstash/redis"]` in `src/next.config.ts` prevents bundling but does not suppress Turbopack's static analysis warning for `require()` calls to absent modules. The build compiles successfully; these are non-blocking warnings. The `try/catch` in `UpstashRateLimiter.check()` provides proper runtime fallback.

**Recommended fix (Sprint 9 — TD-open):** Move Upstash imports to a dedicated `"use server"` file and use dynamic `import()`.

---

## Tests Added

### New file: `src/__tests__/components/monthly-review-card.test.tsx` (+10 tests)

| Test | Guards |
|------|--------|
| `outer card div has 'group' class (B-02)` | B-02 |
| `edit button is present in the DOM (B-02)` | B-02 |
| `delete button is present in the DOM (B-02)` | B-02 |
| `edit click fires onEdit and does not bubble to card onClick (B-02)` | B-02 |
| `delete click fires onDelete and does not bubble to card onClick (B-02)` | B-02 |
| `card has aria-pressed=false when not selected (M-01)` | M-01 |
| `card has aria-pressed=true when selected (M-01)` | M-01 |
| `aria-pressed reflects isSelected toggle across rerenders (M-01)` | M-01 |
| `clicking the card body fires onClick` | B-02 interaction |
| `Enter key on the card fires onClick (keyboard accessibility)` | B-02 interaction |

### Added to `src/__tests__/routers/monthly-reviews.test.ts` (+2 tests)

| Test | Guards |
|------|--------|
| `prefill: zero disciplineScore is excluded from average (draft/unscored week)` | m-01 (QA minor) |
| `prefill: returns null overallScore when all weekly scores are zero (all drafts)` | m-01 (QA minor) |

---

## Acceptance Gates

| Gate | Status | Notes |
|------|--------|-------|
| TypeScript `tsc --noEmit` | ✅ 0 errors | |
| Unit tests `pnpm test` | ✅ 479 passed, 0 failed | 39 test files (+12 tests from this session) |
| `group` class present on card | ✅ | Verified by unit test + code inspection |
| `aria-pressed` on `role="button"` | ✅ | Verified by unit test |
| KpiStrip inside weekly tab only | ✅ | Verified by code inspection, guarded by E2E |
| Suspense boundary on reviews page | ✅ | Verified by code inspection; definitive guard is Vercel build |
