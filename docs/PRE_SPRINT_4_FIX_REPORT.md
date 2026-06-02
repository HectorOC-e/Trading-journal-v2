# Sprint 4 Fix Report

**Date:** 2026-06-02  
**Branch:** `claude/epic-darwin-1XZTX`  
**Source:** Findings from `docs/SPRINT_4_QA_REPORT.md`  
**Scope:** All Blocking (3) and Major (5) findings  
**Test suite:** 354 passed, 0 failed (was 349 before fixes)

---

## Summary

| ID   | Severity | Status  | Description                                      |
|------|----------|---------|--------------------------------------------------|
| B-01 | Blocking | ✅ Fixed | Goal fields silently dropped by type cast        |
| B-02 | Blocking | ✅ Fixed | Theme toggle writes `data-theme`; CSS uses `.dark` |
| B-03 | Blocking | ✅ Fixed | Prisma Decimal not serialized to number          |
| M-01 | Major    | ✅ Fixed | Dashboard metric labeled "Discipline Score" misleadingly |
| M-02 | Major    | ✅ Fixed | Stale closures in useEffect dependency arrays    |
| M-03 | Major    | ✅ Fixed | Trade list capped at 50 in review modal          |
| M-04 | Major    | ✅ Fixed | Edit-mode fires prefill/score queries for wrong week |
| M-05 | Major    | ✅ Fixed | Vitest discovers stale tests in `.claude/worktrees/` |

---

## B-01 · Goal fields dropped by type cast

**File:** `src/domains/profile/services/profile-service.ts`  
**Root cause:** `UpdateProfileInput` interface lacked `weeklyTradesGoal` and `weeklyPnlGoal`, so `const raw = input as UpdateProfileInput` in the router narrowed the TypeScript type away from those fields. While the JavaScript runtime still passed them through (due to `...input` spread), the type contract was broken and any future refactor of `normalizeProfileInput` could silently drop them.

**Fix:**
```diff
 export interface UpdateProfileInput {
   ...
   emailNotifications?: boolean
+  weeklyTradesGoal?:   number | null
+  weeklyPnlGoal?:      number | null
 }
```

**Tests added** (`src/__tests__/routers/profile.test.ts`):
- `passes weeklyTradesGoal to Prisma update data (B-01 type-contract fix)`
- `passes weeklyPnlGoal to Prisma update data (B-01 type-contract fix)`
- `passes null weeklyTradesGoal to clear goal (B-01 type-contract fix)`

---

## B-02 · Theme toggle writes `data-theme`; CSS uses `.dark`

**File:** `src/app/perfil/page.tsx`  
**Root cause:** The theme button's `onClick` called `document.documentElement.setAttribute("data-theme", ...)`. The application's CSS in `globals.css` uses `.dark { ... }` class selectors — there are zero `[data-theme]` rules. The toggle had no visual effect.

**Fix:** Apply the `.dark` class to `<html>` and update `localStorage` under key `tj-theme` to keep `ThemeProvider` in sync.

```diff
-  document.documentElement.setAttribute("data-theme", t === "system"
-    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
-    : t
-  )
+  const isDark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
+  document.documentElement.classList.toggle("dark", isDark)
+  localStorage.setItem("tj-theme", isDark ? "dark" : "light")
```

---

## B-03 · Prisma Decimal not serialized to number in goals.set

**File:** `src/server/trpc/routers/goals.ts`  
**Root cause:** `goals.set` returned the raw Prisma result which includes `weeklyPnlGoal` as a `Prisma.Decimal` object. When serialized to JSON, `Decimal` objects stringify to their string representation (`"500.00"`), causing a type mismatch on the client which expects a `number | null`.

**Fix:** Explicitly convert via `Number()` before returning.

```diff
-  return ctx.prisma.user.update({ ... })
+  const result = await ctx.prisma.user.update({ ... })
+  return {
+    ...result,
+    weeklyPnlGoal: result.weeklyPnlGoal != null ? Number(result.weeklyPnlGoal) : null,
+  }
```

**Tests added** (`src/__tests__/routers/goals.test.ts`):
- `serializes weeklyPnlGoal as a plain number when Decimal-like (B-03 fix)` — mocks a Decimal-like object, asserts `typeof result.weeklyPnlGoal === "number"`
- `returns null for weeklyPnlGoal when null (B-03 fix)`

---

## M-01 · Dashboard metric mislabeled "Discipline Score"

**File:** `src/app/dashboard/tabs/tab-disciplina.tsx`  
**Root cause:** The large KPI on the Disciplina tab was computed as `planSeguido / total * 100` (plan adherence percentage) but labeled "Discipline Score · acumulado". The true discipline score uses the multi-factor formula `execution×50 + learning×30 + adherence×20` computed in weekly reviews. Displaying a single-factor metric under a multi-factor label is misleading.

**Fix:**
- Removed the duplicate `disciplineScore` variable (identical to `planSeguidoPct`)
- Updated JSX to display `planSeguidoPct` in the large number slot
- Renamed the card label from "Discipline Score · acumulado" to "Adherencia al plan · acumulado"

---

## M-02 · Stale closures in useEffect dependency arrays

**File:** `src/app/reviews/modals/create-review-modal.tsx`  
**Root cause:** Two `useEffect` hooks captured stale values of `generated` and `autoFields` because those state variables were missing from the dependency arrays.

**Fix:**
```diff
  useEffect(() => {
-   if (!prefillData) return
+   if (!prefillData || isEditMode) return
    if (!generated) {
      setAutoFields(prev => new Set([...prev, "disciplineScore"]))
      setDisciplineScore(prefillData.disciplineScore)
    }
- }, [prefillData])
+ }, [prefillData, generated, isEditMode])

  useEffect(() => {
    if (serverScore && autoFields.has("disciplineScore")) {
      setDisciplineScore(serverScore.score)
    }
- }, [serverScore])
+ }, [serverScore, autoFields])
```

---

## M-03 · Trade list capped at 50 in review modal

**File:** `src/app/reviews/modals/create-review-modal.tsx`  
**Root cause:** `trpc.trades.list.useQuery()` was called with no arguments, hitting the router's default `limit: 50`. The review modal generates weekly summaries from trades, so traders with more than 50 trades per week would see incomplete stats.

**Fix:**
```diff
- const { data: rawTrades } = trpc.trades.list.useQuery()
+ const { data: rawTrades } = trpc.trades.list.useQuery({ limit: 200 })
```

---

## M-04 · Edit-mode fires prefill/score queries for wrong week

**File:** `src/app/reviews/modals/create-review-modal.tsx`  
**Root cause:** When editing an existing review, both `computedDisciplineScore` and `prefill` queries were enabled and fired using the currently-selected week option (defaulting to the current week), not the review's actual week. This caused stale server data to overwrite the `disciplineScore` field in the edit form.

**Fix:** Disable both queries in edit mode via `{ enabled: !isEditMode }`.

```diff
  const { data: serverScore } = trpc.weeklyReviews.computedDisciplineScore.useQuery(
    { weekStart: week.start, weekEnd: week.end },
+   { enabled: !isEditMode },
  )

  const { data: prefillData } = trpc.weeklyReviews.prefill.useQuery(
    { ... },
-   { staleTime: 60_000 },
+   { staleTime: 60_000, enabled: !isEditMode },
  )
```

---

## M-05 · Vitest discovers stale tests in `.claude/worktrees/`

**File:** `src/vitest.config.ts`  
**Root cause:** Vitest had no `exclude` pattern, so it recursively discovered test files in `.claude/worktrees/` — git worktrees created by Claude Code for isolated sub-tasks. Those copies correspond to older versions of the source and produced 4 spurious failures that masked the real test suite health.

**Fix:**
```diff
  test: {
    environment: "node",
    globals: true,
+   exclude: ["**/.claude/**", "**/node_modules/**"],
  },
```

**Result:** Test count stabilized at a deterministic 354 (all passing), regardless of worktree state.

---

## Files Changed

| File | Finding(s) |
|------|-----------|
| `src/vitest.config.ts` | M-05 |
| `src/domains/profile/services/profile-service.ts` | B-01 |
| `src/server/trpc/routers/goals.ts` | B-03 |
| `src/app/perfil/page.tsx` | B-02 |
| `src/app/dashboard/tabs/tab-disciplina.tsx` | M-01 |
| `src/app/reviews/modals/create-review-modal.tsx` | M-02, M-03, M-04 |
| `src/__tests__/routers/profile.test.ts` | B-01 tests |
| `src/__tests__/routers/goals.test.ts` | B-03 tests |

## Test Results

```
Test Files  25 passed (25)
     Tests  354 passed (354)   ← +5 new tests (B-01 ×3, B-03 ×2)
  Duration  ~2.8s
```
