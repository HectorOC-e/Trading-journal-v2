# Sprint 4 QA Report — Independent Staff Engineer Audit

**Date:** 2026-06-02  
**Auditor:** Independent (no implementation bias)  
**Branch:** `claude/epic-darwin-1XZTX`  
**Scope:** All Sprint 4 deliverables — TASK-034, TASK-061, TASK-069, TASK-047, TASK-023, TASK-013  
**Test baseline:** 362 passing / 0 failing

---

## Executive Summary

Sprint 4 delivered 6 tasks across psychology UI, auto-save, week selector expansion, dashboard persistence, and type safety cleanup. Core functionality is working correctly at runtime. No blocking regressions detected. However, 5 major findings were identified — 2 pre-existing issues that entered Sprint 4 code scope unchanged, and 3 introduced by Sprint 4 changes. 6 minor findings and 4 nitpicks are also documented.

The most significant risk is a misleading drawdown visualization for prop-firm users (hardcoded bar widths) and an `any`-typed editing state that partially defeats TASK-023's type safety goal.

---

## Findings

### BLOCKING — 0

No blocking findings. The one suspected issue (`emotionBefore: ""` empty string) is correctly handled at each call site via falsy coercion (`|| undefined` in create path, `|| null` in edit path).

---

### MAJOR — 5 ✅ All resolved (see `docs/SPRINT_4_FIX_REPORT.md`)

#### M-01 · `editing` state is `any` in `mercados/page.tsx` — TASK-023 incomplete
**File:** `src/app/mercados/page.tsx:272`

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const [editing, setEditing] = useState<any | null>(null)
```

TASK-023 added `type MarketItem = RouterOutputs["markets"]["list"][number]` (correctly typed) but left the editing state as `any`. The `setEditing(...)` call on line 387 constructs an object from `m` fields — this bypasses the type system entirely. Should be `useState<(MarketForm & { id: string }) | null>(null)`.

**Impact:** TypeScript cannot catch shape mismatches between the edit-modal initial value and the form type. Any field rename or addition would silently pass.

---

#### M-02 · `WithdrawalRow` ignores `updating` prop — fake loading state via setTimeout
**File:** `src/app/retiros/page.tsx:119-173`

The component declares `updating?: boolean` in its prop type but does not destructure it:
```typescript
function WithdrawalRow({ w, onStatusChange }: {    // ← 'updating' not destructured
  w: WithdrawalItem
  onStatusChange: (id: string, status: WithdrawalStatus, reference?: string) => void
  updating?: boolean
}) {
  const [updating, setUpdating] = useState(false)  // ← shadows the prop
```

The parent (`RetirosPage`) passes the real mutation pending state (`updating={updateStatus.isPending}`) but it is ignored. A 800ms `setTimeout` creates a fake optimistic loading UX that is decoupled from the actual network request. If the mutation takes longer than 800ms or fails, the UI has already cleared the spinner.

**Impact:** Loading state is misleading; error states during status update are invisible to the user.

---

#### M-03 · `emotionBefore: ""` propagates as explicit type through modal boundary
**Files:** `src/components/trades/register-trade-modal.tsx`, `src/app/trades/page.tsx:192-239`

`FormState.emotionBefore` is typed `EmotionBefore | ""` and `handleModalSubmit` explicitly carries `""` in its type signature. The call site applies falsy coercion (`form.emotionBefore || undefined`) before calling `createTrade.mutate`, which correctly resolves `"" → undefined`. At runtime there is no bug. The risk is architectural:

1. Any future consumer of `RegisterTradeModal.onSubmit` that passes `emotionBefore` directly to a mutation without this coercion would send an invalid enum value to Zod.
2. The modal's public contract advertises `""` as a valid emotion value, which is incorrect.

**Correct fix:** Type `FormState.emotionBefore` as `EmotionBefore | null`, use `null` as the empty-selection sentinel, remove the `|| undefined` coercion at the call site.

---

#### M-04 · Drawdown progress bars have hardcoded widths — misleading for prop-firm users
**File:** `src/components/trades/trade-detail-panel.tsx:438,449`

```typescript
<div className="h-full rounded-full bg-[var(--loss)]" style={{ width: "20%" }} />   // DD máx
<div className="h-full rounded-full bg-[var(--be)]"   style={{ width: "10%" }} />   // Pérd. diaria
```

Both drawdown progress bars are rendered at constant widths (20% and 10%) regardless of actual account drawdown data. The label below correctly reads actual `ddTotalPct`/`ddDailyPct` values, but the visual bar does not reflect them. A prop-firm trader using an account with 5% max drawdown at 4% usage would see the same 20% bar as one at 0.1% usage.

**Impact:** Core risk management visualization is decorative — could mislead traders about their proximity to drawdown limits.

---

#### M-05 · Psychology fields absent from `Trade` type in `@/types` — requires unsafe cast
**File:** `src/components/trades/trade-detail-panel.tsx:549-555`

```typescript
const t = trade as {
  emotionBefore?: string | null
  confidenceRating?: number | null
  executionQuality?: number | null
  fomoFlag?: boolean
  revengeFlag?: boolean
}
```

The `Trade` type imported from `@/types/index.ts` does not include psychology fields. Sprint 4 added them to Prisma schema and the tRPC router, but the shared TypeScript type was not updated. The `as` cast bypasses type safety — if a field is renamed or retyped in the router, the panel silently shows stale data without a compile error.

**Fix:** Add all 5 psychology fields to the `Trade` interface in `src/types/index.ts`.

---

### MINOR — 6

#### m-01 · Auto-save skips when only `disciplineScore` changes
**File:** `src/app/reviews/modals/create-review-modal.tsx:319-323`

```typescript
if (!executiveSummary && !whatWorked && !toImprove) return
```

This guard prevents auto-save when all text fields are empty, but it also prevents saving when the user changes only `disciplineScore` with empty text fields. Since `disciplineScore` is in the effect dependencies, a score-only change will fire the effect but immediately return without saving.

---

#### m-02 · `autoSaveStatus` never resets from "saved" to "idle"
**File:** `src/app/reviews/modals/create-review-modal.tsx:255-258`

```typescript
const autoSaveReview = trpc.weeklyReviews.update.useMutation({
    onSuccess: () => { utils.weeklyReviews.list.invalidate(); setAutoSaveStatus("saved") },
    onError:   () => { setAutoSaveStatus("idle") },
  })
```

`setAutoSaveStatus("saved")` is called on success but never reset to `"idle"`. The "Guardado ✓" indicator remains visible for the entire session after the first save. Expected behavior: it should fade/disappear after 3–4 seconds.

---

#### m-03 · `WEEK_OPTIONS` computed at module load — stale weeks if app kept open across week boundary
**File:** `src/app/reviews/modals/create-review-modal.tsx:58`

```typescript
const WEEK_OPTIONS = generateWeekOptions(24)
```

This executes once when the module is first imported. If the user keeps the SPA open overnight into a new week (common for traders reviewing Sunday evening → Monday), the week list will not include the new current week until a page reload. The options should be generated inside the component body or within a `useMemo` with a daily revalidation.

---

#### m-04 · Auto-save effect suppresses real exhaustive-deps warning
**File:** `src/app/reviews/modals/create-review-modal.tsx:338`

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [executiveSummary, whatWorked, toImprove, disciplineScore, isEditMode])
```

Missing deps: `editReview` (used in the guard `if (!editReview)` and `editReview.id`) and `autoSaveReview` (the mutation). If `editReview` prop changes while a 2s timer is pending, the timer fires with the stale review ID. Low-probability but valid stale closure. Fix: add `editReview?.id` (not the full object) and `autoSaveReview.mutate` to deps, or use `useCallback`.

---

#### m-05 · `updatePrefs.mutate` has no error handler — silent failure on tab save
**File:** `src/app/dashboard/page.tsx:47`

```typescript
tabDebounceRef.current = setTimeout(() => {
      updatePrefs.mutate({ defaultTab: newTab })
    }, 500)
```

No `onError` callback. If the preferences mutation fails (e.g., auth timeout), the user's tab selection is not persisted but they receive no feedback. Should at minimum log to `console.error` or display a toast.

---

#### m-06 · Week selector card loses visual selection when view is collapsed after selecting a later week
**File:** `src/app/reviews/modals/create-review-modal.tsx:437-439`

If the user expands to 24 weeks, selects week index 15, then collapses back to 8 weeks, `selectedWeek === 15` but none of the 8 visible cards have `i === 15`, so the selected state disappears. The week is still selected (data-wise), but no visual indicator confirms it. The collapse button should either scroll to/show the selected week, or revert the selection to the nearest visible week.

---

### NITPICK — 4

#### n-01 · Misleading `as EmotionBefore` cast before `|| null`
**File:** `src/components/trades/edit-trade-modal.tsx:128`

```typescript
emotionBefore: (emotionBefore as EmotionBefore) || null,
```

The cast `as EmotionBefore` is applied to `emotionBefore` which may be `""`. The `||` then short-circuits the casted `""` to `null` (since `""` is falsy), making the cast immediately irrelevant. The correct expression is `emotionBefore || null` — no cast needed, same runtime behavior, clearer intent.

---

#### n-02 · `generateWeekReview` at 55 lines mixes domain logic with text generation
**File:** `src/app/reviews/modals/create-review-modal.tsx:95-149`

The function computes trade stats (domain logic) and generates Spanish narrative text (presentation). These concerns should be separated. The stat computation belongs in `src/lib/formulas/` or a service layer; the narrative template belongs in the component. This also makes it impossible to unit-test the stat computation independently.

---

#### n-03 · No test coverage for the client-side `emotionBefore: "" → undefined` coercion
**File:** `src/__tests__/routers/trades.test.ts`

The 8 psychology tests cover the server-side Zod schema validation but not the client-side normalization in `trades/page.tsx:handleModalSubmit`. If the `|| undefined` coercion is ever removed or changed, no test would catch it. A unit test for `handleModalSubmit` or an integration test for `RegisterTradeModal` is warranted.

---

#### n-04 · 4 remaining `as never` casts in `trades/page.tsx` documented as TD-013
**File:** `src/app/trades/page.tsx:256,374,376,399`

These casts bridge the `trade.account` field from `trades.list` (where `initialBalance` is serialized as `number`) against the `Account` type from `accounts.list` (where `initialBalance` remains a Prisma `Decimal`). The annotations `// TD-013` are correct but the underlying type inconsistency should be resolved by standardizing serialization in the `accounts.list` router to match `serializeTrade`.

---

## Coverage Matrix

| Task | Feature | Status | Findings |
|------|---------|--------|----------|
| TASK-034 | Psychology fields — create/update | ✅ Working | M-03 (type design), M-05 (Trade type) |
| TASK-034 | Psychology fields — display | ✅ Working | M-05 (requires cast) |
| TASK-061 | Auto-save (edit mode, 2s debounce) | ✅ Working | m-01, m-02, m-04 |
| TASK-069 | Extended week selector (8→24) | ✅ Working | m-03, m-06 |
| TASK-047 | Dashboard tab persistence | ✅ Working | m-05 |
| TASK-023 | Type safety — mercados, retiros | ⚠️ Partial | M-01 (editing: any) |
| TASK-013 | Reduce `as never` casts | ✅ 67% reduction | n-04 (4 remain, TD-013) |

---

## Architecture Review

### What is correct

- TASK-011 discipline score consolidation: `calcDisciplineScore` → `computeDisciplineScore` → two tRPC procedures. Single source of truth maintained.
- `serializeTrade()` correctly handles all Decimal fields; psychology fields (String/Int/Boolean) pass through without conversion — no regression risk.
- Zod schemas for `create` and `update` use `.optional().nullable()` for String/Int fields and `.optional()` (no nullable) for Boolean fields with DB defaults — correctly mirrors the Prisma schema.
- Auto-save in `create-review-modal.tsx` uses `useRef` + `clearTimeout` pattern correctly — no double-fire, no memory leak on unmount.
- `{ enabled: !isEditMode }` guards on `prefill` and `computedDisciplineScore` queries prevent prefill logic from running during edit mode — Pre-Sprint 4 M-04 fix is intact.
- `prefsLoaded` boolean guard in `dashboard/page.tsx` prevents preferences from overwriting user tab changes after initial load.

### What needs attention

- The `Trade` type in `@/types` is diverging from the actual Prisma schema. Two sprints of schema changes (psychology fields, potential future additions) have not been reflected in the shared type. This is the root cause of M-05 and will compound over time.
- `WithdrawalRow` component architecture (M-02) inverts control — the parent should own loading state, not a component-level timer.

---

## Security Review

- Psychology fields are user-supplied strings/ints/booleans — all validated by Zod before persistence. No injection risk.
- `screenshotUrls: z.string().url().array()` — the Zod `.url()` validator is present in the `create` schema, blocking non-URL values including potential `javascript:` URIs.
- No new raw SQL queries introduced in Sprint 4 (the `$executeRaw` for embedding was pre-existing).
- `emotionBefore` enum validation on the server prevents arbitrary string storage even if the client sends unexpected values.

---

## Fix Status

| Finding | Status | Detail |
|---------|--------|--------|
| M-01 | ✅ Fixed | `editing` typed as `(MarketForm & { id: string }) \| null` |
| M-02 | ✅ Fixed | Per-row `updatingId` in parent; `updating` prop wired correctly |
| M-03 | ✅ Fixed | `null` sentinel across all 3 files; `??` coercion; +2 regression tests |
| M-04 | ✅ Fixed | Hardcoded bars replaced with actual limit value badges |
| M-05 | ✅ Fixed | `as` cast removed; `trade.*` accessed directly via `Trade` type |

Minor and Nitpick findings remain open — deferred to next sprint quality pass.

See `docs/SPRINT_4_FIX_REPORT.md` for full fix details.

---

## Test Suite

**364 passing / 0 failing** after fixes (+2 from 362 at audit time).

Remaining test gaps (minor findings):
- No test for `autoSaveStatus` reset behavior
- No test for week selector index consistency when toggling `showAllWeeks`

---

*Audit performed against branch `claude/epic-darwin-1XZTX` as of 2026-06-02.*  
*Fixes applied same day — see `docs/SPRINT_4_FIX_REPORT.md`.*
