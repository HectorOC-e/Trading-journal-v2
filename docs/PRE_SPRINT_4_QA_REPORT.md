# Sprint 4 QA Report — Independent Staff Engineer Audit

**Audited commit:** `bf1a29f`  
**Branch:** `claude/epic-darwin-1XZTX`  
**Audit date:** 2026-06-02  
**Scope:** All Sprint 4 changes (Groups A–F) + regression check against pre-existing codebase  
**Methodology:** Full read of every modified file, cross-reference with plan spec, static analysis, runtime behavior reasoning, test suite execution

---

## Summary

| Severity  | Count |
|-----------|-------|
| Blocking  | 3     |
| Major     | 5     |
| Minor     | 6     |
| Nitpick   | 4     |

**Test suite:** 34 new tests added, all passing. 2 pre-existing test failures (accounts.list, withdrawals.updateStatus) confirmed pre-existing — Sprint 4 did not introduce them.

---

## Blocking Issues

### B-01 · `profile.update` silently drops goal fields (TASK-050a regression)

**File:** `src/server/trpc/routers/profile.ts:41-47`  
**Severity:** BLOCKING — data silently not written to DB

The Zod input schema for `profile.update` accepts `weeklyTradesGoal` and `weeklyPnlGoal`, but the router immediately casts the validated input to `UpdateProfileInput`:

```typescript
const raw = input as UpdateProfileInput
const normalized = normalizeProfileInput(raw)
await ctx.prisma.user.update({ data: normalized })
```

`UpdateProfileInput` in `profile-service.ts` does NOT include `weeklyTradesGoal` or `weeklyPnlGoal`. TypeScript's `as` cast narrows the type, stripping the two fields before they reach Prisma. The validation fires (rejecting values out of range), but valid values are silently thrown away. A user submitting `weeklyTradesGoal: 10` gets no error and no effect.

**Fix:** Extend `UpdateProfileInput` in `profile-service.ts` to include the goal fields, or build the Prisma data object directly in the router without going through `normalizeProfileInput`.

---

### B-02 · Theme toggle has zero visual effect — wrong CSS mechanism

**File:** `src/app/perfil/page.tsx:502-505`  
**Severity:** BLOCKING — TASK-045 deliverable entirely non-functional

The Sprint 4 theme toggle applies `data-theme` attribute to `<html>`:

```typescript
document.documentElement.setAttribute("data-theme", t === "system" ? ... : t)
```

The application's CSS (`globals.css`) exclusively uses the `.dark` class selector — there is no `[data-theme="dark"]` rule anywhere. Meanwhile, `ThemeProvider` (`src/components/theme-provider.tsx`) manages theme via `document.documentElement.classList.toggle("dark", ...)` and reads from `localStorage` key `tj-theme`.

The two systems are completely incompatible:
- `ThemeProvider` uses `.dark` class + `localStorage` → actually applies CSS tokens
- Sprint 4 preferences update sets `data-theme` attribute + DB → has no CSS effect

Clicking "Oscuro" in the profile page writes to the DB but the screen doesn't change. The existing `ThemeProvider` continues to win because it controls the actual `.dark` class. On next page load, `ThemeProvider` restores from `localStorage`, not from the DB preference.

**Fix:** Either (a) integrate `preferences.get` into `ThemeProvider` so it reads from DB on mount and applies `.dark` class correctly, or (b) add `[data-theme="dark"]` selectors to `globals.css` and stop using `ThemeProvider`.

---

### B-03 · `goals.set` returns `weeklyPnlGoal` as `Decimal` string (serialization bug)

**File:** `src/server/trpc/routers/goals.ts:11-20`  
**Severity:** BLOCKING — return value is structurally broken

`goals.set` selects `weeklyPnlGoal: true` from the User model. In the Prisma-generated client, `weeklyPnlGoal` is typed as `runtime.Decimal | null`. When tRPC serializes the response via `JSON.stringify`, `Decimal` objects call `.toJSON()` which returns their string representation (e.g., `"1000.00"`).

The TypeScript return type declares `weeklyPnlGoal` as `Decimal | null`, but at runtime consumers receive a string. Any code that does arithmetic on this value (e.g., comparison to a user's current P&L) will silently produce `NaN`. This follows the same pattern as the Decimal-serialization technical debt already noted for accounts — but here it's in a new router being actively developed, not legacy code.

**Fix:** Serialize `weeklyPnlGoal` to number in the mutation return: `weeklyPnlGoal: result.weeklyPnlGoal != null ? Number(result.weeklyPnlGoal) : null`.

---

## Major Issues

### M-01 · TASK-011 "3 implementations" not fully consolidated — dashboard tab survives

**File:** `src/app/dashboard/tabs/tab-disciplina.tsx:75`, `src/server/trpc/routers/trades.ts:429,445`  
**Severity:** MAJOR — sprint's stated CRITICAL goal partially unmet

The sprint plan states: *"Eliminate the 3-implementation problem for discipline score."*

Two implementations were consolidated correctly (weekly-reviews `prefill` and `computedDisciplineScore` now both call `computeDisciplineScore()` → `calcDisciplineScore()`). However, the dashboard tab still contains a completely independent formula:

```typescript
// trades.ts line 429 — formula: % plan seguido (0–100)
score: parseFloat((v.plan / v.total * 100).toFixed(2))

// tab-disciplina.tsx line 75 — same formula
const disciplineScore = total > 0 ? ((composition.planSeguido / total) * 100).toFixed(2) : "0.00"
```

This is fundamentally different from the canonical multi-factor formula (execution×50 + learning×30 + adherence×20). A user will see their "discipline score" as:
- **52** in the dashboard tab (plan-seguido %, e.g. 52% of trades had a setup and no violation tag)
- **78** in the weekly review (multi-factor score: good execution + full learning + all rules followed)

The triplication problem is now a duplication problem. The TASK-011d acceptance criterion *"No discipline score divergence possible"* is not satisfied.

**Note:** The dashboard's `planSeguido%` serves a different UX purpose (trade composition breakdown) and intentionally uses a different definition. If this divergence is intentional, it must be documented and the variable must not be labeled "score de disciplina" identically to the weekly review score without disambiguation.

---

### M-02 · `useEffect` in create-review-modal has stale closure on `autoFields`

**File:** `src/app/reviews/modals/create-review-modal.tsx:302-306`  
**Severity:** MAJOR — race condition causing wrong discipline score display

```typescript
useEffect(() => {
  if (serverScore && autoFields.has("disciplineScore")) {
    setDisciplineScore(serverScore.score)
  }
}, [serverScore])  // ← autoFields missing from deps
```

`autoFields` is a `Set` state variable. The `useEffect` captures the value of `autoFields` from the render cycle in which it was created. Because `autoFields` is not in the dependency array, the effect always reads a stale `autoFields` reference. In practice:

1. User opens modal → `autoFields` = empty Set
2. `serverScore` arrives → effect fires with stale `autoFields` = empty Set → `autoFields.has("disciplineScore")` is `false` → score not applied
3. User clicks "Auto-generar" → `autoFields` gets `"disciplineScore"` added
4. `serverScore` doesn't change (already resolved) → effect doesn't re-run

The discipline score from the server may never be applied after the initial `prefillData` useEffect, depending on timing. The `prefillData` useEffect (line 293-300) has the same issue: `generated` is read from closure but not in deps, so the guard `if (!generated)` may read stale state.

**Fix:** Add `autoFields` to the deps array of the `serverScore` useEffect. Use the functional form of `setAutoFields` in both effects.

---

### M-03 · Review modal fetches trades with default limit 50 (modal analysis wrong for active traders)

**File:** `src/app/reviews/modals/create-review-modal.tsx:223`  
**Severity:** MAJOR — silent data corruption in local auto-generate

```typescript
const { data: rawTrades } = trpc.trades.list.useQuery()
//                                                    ↑ no limit specified
```

The `trades.list` endpoint defaults to `limit: 50`. A user with more than 50 trades will have the local `generateWeekReview()` function analyze only the 50 most recent trades, potentially missing trades from the selected week entirely if they are older than the 50th most recent trade. The server-provided `prefillData` correctly queries all trades for the week (no limit), so the two data sources will diverge silently.

The `generated` stats (tradeCount, netPnl, winRate displayed in the "Resumen automático" card) may be wrong for any user with > 50 total trades. The score submitted to the server via `handleSave` uses `generated?.tradeCount ?? prefillData?.tradeCount` — preferring the wrong local value if `generated` is set.

**Fix:** Either pass `{ limit: 200 }` to this query (consistent with `reviews/page.tsx` line 27), or remove `generateWeekReview()` entirely and rely exclusively on `prefillData` from the server (simpler and more correct).

---

### M-04 · Edit mode in review modal fetches live `prefill` data for the wrong week

**File:** `src/app/reviews/modals/create-review-modal.tsx:277-289`, `228-237`  
**Severity:** MAJOR — edit mode overwrites saved values with stale server data

When editing an existing review:
1. `useEffect` on `editReview` correctly populates form fields from `editReview` (line 228-237)
2. `selectedWeek` remains at index 0 (the most recent week, not the review's week)
3. `prefill` query fires for `WEEK_OPTIONS[0]` (current week), NOT the review's week
4. The `useEffect` on `prefillData` (line 293-300) then overrides `disciplineScore` with the current week's server-computed score

A user editing a review from 3 weeks ago will have their discipline score silently replaced with today's week's score after the modal opens.

**Fix:** When `isEditMode`, either (a) skip the `prefillData` and `serverScore` queries entirely, or (b) set `selectedWeek` to match the `editReview.weekStart` and query `prefill` for that week.

---

### M-05 · Pre-existing regression: `accounts.list` and `withdrawals.updateStatus` tests fail

**Files:** `src/__tests__/routers/accounts.test.ts`, `src/__tests__/routers/withdrawals.test.ts`  
**Severity:** MAJOR — Sprint 4 was delivered with pre-existing test failures

Two test cases were already failing before Sprint 4 and remain failing:
- `accounts router > list: returns accounts for userId` — test expects `findMany` called without `status` filter but router applies `{ status: { in: ["ACTIVE", "PAUSED"] } }` by default
- `withdrawals router > updateStatus: updates status and creates log` — mock assertion mismatch

These are not regressions introduced by Sprint 4, but they were falsely represented as "349 tests passing" in the Sprint 4 Completion Report. The actual passing count for project tests (excluding worktree artifacts) is lower. Sprint 4 cannot be declared green while known test failures exist, regardless of origin.

---

## Minor Issues

### m-01 · `ThemeProvider` and Sprint 4 preferences are two competing theme systems

**File:** `src/components/theme-provider.tsx`, `src/app/perfil/page.tsx`  
**Severity:** MINOR (subset of B-02, but a separate architectural concern)

Even after fixing B-02's CSS mechanism, two systems will compete:
- `ThemeProvider` persists to `localStorage` key `tj-theme`
- `preferences.update` persists to Supabase DB

On first load after a user changes their theme via the profile page and refreshes on a different device, `ThemeProvider` will restore from `localStorage` (which may have a different value), ignoring the DB preference. The system preference has no cross-device sync.

**Fix:** Remove `ThemeProvider`'s local state entirely. In `preferences.get`, return the stored theme and have `ThemeProvider` (or `AppShell`) apply it on mount via `useQuery`.

---

### m-02 · `create-review-modal` calls `trpc.trades.list.useQuery()` on every open (no filter)

**File:** `src/app/reviews/modals/create-review-modal.tsx:223-224`  
**Severity:** MINOR — unnecessary network request

The modal fetches all trades (50 most recent) on every render, even in edit mode where this data is unused. In edit mode the local `generateWeekReview()` is never called (step jumps directly to "analisis"), but the query fires anyway.

**Fix:** Add `enabled: !isEditMode` to the query options, or conditionally skip it.

---

### m-03 · `defaultTab` and `dateFormat` fields in `preferences.update` have no validation

**File:** `src/server/trpc/routers/preferences.ts:13-19`  
**Severity:** MINOR — free-text fields accept arbitrary strings

```typescript
defaultTab:   z.string().optional(),    // no enum constraint
dateFormat:   z.string().optional(),    // no format constraint
numberLocale: z.string().optional(),    // no BCP-47 validation
```

`defaultTab` should be `z.enum(["portfolio", "discipline", "operator", "playbook"])` (or whatever the valid tab values are). `dateFormat` should be an enum of supported patterns. `numberLocale` should validate against BCP-47 locale codes. As written, a client can store arbitrary garbage that will be read back and potentially applied to date/number formatting functions.

---

### m-04 · `goals.set` allows setting `onboardingCompleted: false` (regression path)

**File:** `src/server/trpc/routers/goals.ts:8`  
**Severity:** MINOR — one-way gate is not enforced server-side

`onboardingCompleted` is semantically a one-way flag. Once set to `true`, it should not be reversible via `goals.set`. The current implementation accepts `onboardingCompleted: false` without restriction, allowing any authenticated user to reset their own onboarding state.

**Fix:** `z.literal(true).optional()` or add a server-side guard: `if (input.onboardingCompleted === false) throw new TRPCError(...)`.

---

### m-05 · Pre-existing bug (not Sprint 4): `archive` logs wrong `from` status

**File:** `src/server/trpc/routers/accounts.ts:175`  
**Severity:** MINOR — audit log data integrity issue (pre-existing, not Sprint 4 authored)

```typescript
const account = await ctx.prisma.account.update({ data: { status: "INACTIVE" } })
const archivePayload = { event: "STATUS_CHANGE", from: account.status, to: "INACTIVE" }
//                                                      ↑ already "INACTIVE" at this point
```

`account` is the result of the update (post-mutation state), so `account.status` is already `"INACTIVE"`. The log entry incorrectly records `from: "INACTIVE"` → `to: "INACTIVE"`. The actual previous status is lost. Noted here because the Sprint 4 `satisfies AccountLogPayload` refactor touched this file without catching the adjacent bug.

---

### m-06 · `tab-disciplina` discipline score variable name misleads

**File:** `src/app/dashboard/tabs/tab-disciplina.tsx:75,167`  
**Severity:** MINOR — naming inconsistency creates user confusion

```typescript
const disciplineScore = total > 0 ? ((composition.planSeguido / total) * 100).toFixed(2) : "0.00"
```

This is displayed as the main numeric in the Disciplina tab (font size 52, dominant KPI). It uses an entirely different formula and name from the `disciplineScore` field in `WeeklyReview`. A user will see `52` on the dashboard and `78` in their weekly review and reasonably conclude the system is inconsistent or broken. Renaming to `executionPct` or `planAdherencePct` would reduce confusion.

---

## Nitpick

### n-01 · TASK-011 acceptance criteria references wrong file path

**File:** `docs/SPRINT_4_IMPLEMENTATION_PLAN.md` (acceptance criteria section)

The sprint plan states: *"Single `computeDisciplineScore()` exported from `lib/trading-formulas.ts`"*. The actual implementation exports `calcDisciplineScore` from `src/lib/formulas/discipline.ts`. The function name and file path both differ from the spec. Documentation should match implementation.

---

### n-02 · `create-review-modal.tsx` initializes `disciplineScore` to hardcoded `75`

**File:** `src/app/reviews/modals/create-review-modal.tsx:217`

```typescript
const [disciplineScore, setDisciplineScore] = useState(75)
```

The hardcoded default `75` shows briefly before `prefillData` arrives. While this is overwritten quickly, there's a flash where the user sees `75` (which appears "auto-calculated" when `autoFields.has("disciplineScore")` becomes true). Initializing to `0` would be more honest about the loading state.

---

### n-03 · `SectionBlock` in `review-detail-panel.tsx` has unused `isBullets` logic

**File:** `src/app/reviews/components/review-detail-panel.tsx:30-55`

`SectionBlock` is only used once (line 179) for the executive summary, which never contains bullet points. The `isBullets` branch with `<ul>` rendering is dead code in current usage. The `whatWorked` and `toImprove` sections are rendered inline (lines 183-201) with their own bullet logic, not through `SectionBlock`. Not a Sprint 4 issue but the Sprint 4 edit added `SectionBlock` import context.

---

### n-04 · Two `disciplineColor`/`disciplineBg` implementations

**Files:** `src/app/reviews/modals/create-review-modal.tsx:61-71`, `src/app/reviews/components/review-detail-panel.tsx:16-19`

Both files define identical `disciplineColor()` and `disciplineBg()` helper functions with the same threshold logic (80→win, 60→be, else→loss). These should live in a shared util file. Not introduced in Sprint 4 but Sprint 4 added `review-detail-panel.tsx` discipline color rendering, perpetuating the duplication.

---

## Deferred Items (Confirmed Not Done — Expected)

Per sprint plan, these were explicitly deferred:

| Item | Status | Notes |
|---|---|---|
| TASK-034 UI (psychology fields in trade form) | Not done | Schema + DB done; form UI missing |
| TASK-045d (theme on app init / cross-page) | Not done | Only applies on profile page click |
| TASK-061a (review auto-save) | Not done | Not in Sprint 4 scope |
| TASK-048a (review filtering) | Not done | Not in Sprint 4 scope |
| TASK-023a (market/retiros any types) | Not done | Partial (TASK-013a done) |

---

## Architecture Assessment

### What was done well

- **`satisfies` operator** on `phasePayload` (TASK-066a): correct use of structural type checking without widening. The fix eliminates the `as never` cast while keeping type safety.
- **`computeDisciplineScore` consolidation**: the two weekly-reviews call sites now share a single implementation. The formula is correct and tested.
- **`preferences.update` upsert pattern**: correct Prisma upsert semantics. The `create: { userId, ...input }` with Prisma schema defaults for unspecified fields is correct — schema defaults apply for unset fields.
- **`protectedProcedure` on all new routers**: authorization is consistent; `ctx.userId` scoping on every query/mutation is correct.
- **`weeklyReviews.update` authorization**: correctly includes `userId: ctx.userId` in the `where` clause — no IDOR vulnerability.

### Architectural risks

1. **Two theme systems** (B-02, m-01): `ThemeProvider` (localStorage + `.dark` class) and `preferences.update` (DB + `data-theme`) must be unified before the theme feature ships.
2. **Decimal serialization systemic issue** (B-03): `goals.set` is the third place where Decimal values cross the tRPC boundary without explicit serialization. A project-wide pattern (e.g., a `serializeUser()` helper similar to `serializeTrade()` in `trades.ts`) would eliminate this class of bug.
3. **`UpdateProfileInput` scope creep** (B-01): `profile-service.ts` exports a strict interface that the router then extends via Zod without keeping the service in sync. The service boundary is leaking — goal fields should either be added to `UpdateProfileInput` or handled in a separate service function.

---

## Validation Checklist (Corrected)

| Item | Status |
|---|---|
| `tsc --noEmit` — 0 errors | ✅ Pass |
| 34 new tests added | ✅ Pass |
| All 34 new Sprint 4 tests pass | ✅ Pass |
| Pre-existing test failures unchanged | ✅ Confirmed pre-existing |
| `preferences.get` returns defaults when no row exists | ✅ Pass |
| `goals.set` rejects `disciplineGoal` outside 0–100 | ✅ Pass |
| `profile.update` rejects invalid goal values | ✅ Pass (validation fires) |
| `profile.update` writes goal values to DB | ❌ **FAIL — B-01: values silently dropped** |
| Theme toggle changes visual appearance | ❌ **FAIL — B-02: data-theme has no CSS effect** |
| `goals.set` returns numeric `weeklyPnlGoal` | ❌ **FAIL — B-03: Decimal returned as string** |
| Review edit mode populates correct week's score | ❌ **FAIL — M-04: uses current week's score** |
| Review modal local stats match server prefill stats | ❌ **FAIL — M-03: local uses 50-trade limit** |
| Dashboard "score de disciplina" consistent with review | ⚠️ **Different formula — M-01** |
| Psychology fields accessible to users | ⚠️ Deferred — schema only, no UI |
| Theme persists across page reloads | ⚠️ **FAIL — m-01: localStorage wins over DB** |
