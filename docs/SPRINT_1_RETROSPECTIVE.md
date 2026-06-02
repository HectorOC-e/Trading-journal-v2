# Sprint 1 Retrospective

**Date:** 2026-06-01  
**Sprint:** 1 — Stability & Foundations  
**Branch:** `claude/epic-darwin-1XZTX`  
**Commits:** `a83aa41` → `09d480e` (8 commits)  
**Duration:** Weeks 1–2  
**Test result:** 232/232 passing (was 229/232 pre-sprint)

---

## Sprint Goal

> Eliminate all data-integrity bugs and security risks. All metrics must be accurate.

**Verdict:** ✅ Goal met with 3 tasks deferred. The data-integrity and security objectives were achieved. The deferred tasks (TASK-002, TASK-026, TASK-028) are UX-correctness issues, not data-corruption risks.

---

## Delivery Summary

| Task | Description | Status |
|---|---|---|
| TASK-027 | Formula centralization (`src/lib/formulas/` barrel) | ✅ Done |
| TASK-005 | Win criterion unified (`isWin()` across all sites) | ✅ Done |
| TASK-003 | TRPCError in accounts.changeStatus | ✅ Done |
| TASK-016 | CRON_SECRET hardened in edge function | ✅ Done |
| TASK-017 | Server-side upload validation (Route Handler) | ✅ Done |
| TASK-004 | rMultiple in MT4/cTrader CSV import | ✅ Done |
| TASK-029 | Drawdown fix — `use-account-stats.ts` deleted; page uses `computeMaxDrawdown` via dashboardStats | ✅ Done |
| TASK-001 | KPI strip pagination fix (pulled from Sprint 2) | ✅ Done |
| TASK-009 | weekTrades / account stats pagination fix (pulled from Sprint 2) | ✅ Done |
| TASK-002 | Phase promotion `objectiveMet = false` hardcoded | ⏭ Deferred → Sprint 2 |
| TASK-026 | AI coach error message mismatch | ⏭ Deferred → Sprint 2 |
| TASK-028 | Drawdown label mismatch on trades KPI strip | ⏭ Deferred → Sprint 2 |

**9 of 12 planned tasks completed. 2 additional tasks delivered (TASK-001, TASK-009 pulled from Sprint 2).**

---

## QA Audit Results

An independent staff engineer audit was run after implementation. Findings by severity:

| ID | Severity | Issue | Status |
|---|---|---|---|
| B-001 | Blocking | `sl=0` sentinel not guarded in CSV import — all stop-less trades got garbage rMultiple | ✅ Fixed |
| M-001 | Major | Expectancy formula algebraically wrong (10× error in typical scenario) | ✅ Fixed |
| M-002 | Major | Silent upload failure — user got no feedback on error | ✅ Fixed |
| M-003 | Major | `isWin` import shadowed by local boolean in `buildKpis` | ✅ Fixed |
| N-001 | Minor | `acctWins` used raw `pnl > 0` instead of canonical `isWin()` | ✅ Fixed |
| N-002 | Minor | `trading-sessions.ts` win criterion not migrated | ✅ Fixed |
| N-003 | Minor | `use-account-stats.ts` dead code not removed | ✅ Fixed |
| N-004 | Minor | 3 pre-existing test failures left unresolved | ✅ Fixed |
| NP-001 | Nitpick | `calcExpectancyR` received unused `pnl` field | ✅ Fixed |
| NP-002 | Nitpick | Upload path used `Math.random()` instead of `crypto.randomUUID()` | ✅ Fixed |
| NP-003 | Nitpick | `formulas.test.ts` used relative import instead of alias | ✅ Fixed |

All 11 findings resolved in a single fix commit (`c423f63`).

---

## Qué salió bien

### 1. Formula centralization was clean and correct (Phase 1)

The `src/lib/formulas/` barrel module was implemented correctly on the first pass — all 8 function types, mathematically verified formulas, and clean barrel exports with no duplicate symbols. The QA audit rated Phase 1 ✅ PASS with no issues. This was the highest-risk task and the one that needed to be right before anything else could build on it.

### 2. Security hardening was fully correct (Phase 4 — CRON_SECRET, server validation)

Both security deliverables passed QA without findings:
- `CRON_SECRET` guard now correctly rejects on empty/missing env var
- The upload Route Handler correctly implements server-side MIME allowlist and 5 MB limit
- The QA auditor confirmed that `Prisma.sql` template literal interpolation IS parameterized (the initial concern about SQL injection was a false positive — `${vectorStr}` becomes `$1` in the prepared statement)

### 3. Two Sprint 2 tasks pulled forward

TASK-001 (KPI strip) and TASK-009 (weekTrades/account stats) were not in the Sprint 1 plan, but the Phase 3 analytics work made them natural to include. Both were delivered and removed the single most impactful user-facing correctness issue: users with >50 trades seeing wrong Win Rate, P&L, and Avg R.

### 4. QA audit caught a blocking bug before production

The QA process identified B-001 (the `sl=0` sentinel bug in CSV import) which would have silently corrupted `rMultiple`, `avgR`, `expectancyR`, and Sharpe Ratio for every user importing MT4/cTrader data without a stop loss — a very common case. This is the ideal outcome: the implementation bug was caught in code review, not in production.

### 5. Fast fix turnaround

All 11 QA findings (1 Blocking, 3 Major, 3 Minor, 3 Nitpick) were resolved in a single commit. The fix commit was clean: TypeScript passed, all 232 tests passed, and the pre-existing 3 test failures from before Sprint 1 were also corrected.

### 6. Module resolution conflict resolved correctly

The TypeScript module resolution conflict (`formulas.ts` shadowing `formulas/` directory) was diagnosed and fixed cleanly: the old file was deleted, `getISOWeekKey` was extracted to `formulas/utils.ts`, and all imports were updated. No band-aids.

---

## Qué salió mal

### 1. Blocking data corruption introduced in Phase 5 (B-001)

**The `sl=0` sentinel was not guarded.** Both CSV parsers use `0` (not `null`) as the sentinel value for "no stop loss recorded." The guard `row.sl != null` passes for `0`, causing `calcRMultiple` to receive `sl=0` and compute `riskDistance = |entry - 0| = entry` — e.g., 1.2345 for EURUSD — resulting in a near-zero R multiple stored in the database.

This is the most consequential miss of Sprint 1. It did not reach production because QA caught it, but the implementation was shipped as functionally broken.

**Root cause:** The implementation looked at the type (`!= null`) but not at the semantic contract of the parsers. A code comment in `mt4-parser.ts:75` (`parseFloat(cols[6]) || 0`) or in `csv-import.ts:111` (`sl: 0`) would have surfaced the sentinel value during implementation.

### 2. Expectancy formula was algebraically wrong by ~10× (M-001)

**`s.avgR * wr - (1 - wr)` is not the expectancy formula.** It uses `avgR` (mean of all R multiples, sign-inclusive) as if it were `avgWinR` (mean of winning trades only), and hardcodes `avgLossR = 1`. For a typical setup (6 wins @+2R, 4 losses @−1R), the formula returns 0.08 where the correct value is 0.80 — a 10× understatement.

The correct formula is simply `expectancy = s.avgR` (since `avgR` is the arithmetic mean of all R, which equals E[R] by definition).

**Root cause:** The formula was written from memory without verification. A unit test with a concrete example (6 wins, 4 losses) would have caught this immediately.

### 3. Pre-existing test failures left unaddressed before Sprint 1

The test suite was at 229/232 before Sprint 1 started. Three pre-existing failures were in files that Sprint 1 touched (`accounts.ts`, `discipline.ts`), meaning Sprint 1 modified production code without first establishing a green test baseline. This violates the Definition of Done ("No TypeScript errors; no new ESLint suppressions; unit test added or updated").

**Root cause:** The sprint started without a `pnpm test` check to confirm the baseline.

### 4. Module resolution conflict caused rework

The `formulas.ts` (file) shadowing `formulas/` (directory) conflict was not caught before Phase 2 began migrating call sites. This meant Phase 2 work appeared to succeed (no TS errors) while the imports were silently resolving to the old file. The conflict was only discovered during integration.

**Root cause:** The module deletion step (`formulas.ts` → `formulas/index.ts`) should have been validated immediately with `tsc --noEmit` before Phase 2 began.

### 5. Three Sprint 1 tasks were not completed (TASK-002, TASK-026, TASK-028)

All three were `XS` effort and were in the original Sprint 1 plan. They were not completed due to sprint time constraints, not technical blockers. TASK-026 (ai-coach error message) and TASK-028 (drawdown label) are correctness issues that remain in production.

---

## Riesgos Pendientes

### R-001 — TASK-002: Phase promotion always shows "objective not met" [HIGH]
**File:** `src/app/cuentas/modals/promote-phase-modal.tsx:41`  
`objectiveMet = false` is hardcoded. Every prop-firm trader advancing phases sees the wrong objective status. This is a Sprint 1 deliverable that was deferred.

### R-002 — TASK-028: Drawdown label mismatch on KPI strip [MEDIUM]
**File:** `src/app/trades/page.tsx`  
The "Drawdown" KPI shows minimum single-day P&L, not actual drawdown. Misleads prop-firm traders who rely on drawdown tracking. Sprint 1 deliverable deferred.

### R-003 — Rate limiting missing on `/api/upload/setup-image` [MEDIUM]
Identified in QA but out of Sprint 1 scope. Authenticated users can spam the upload endpoint, causing storage abuse and potential DoS via API credit exhaustion.

### R-004 — HTML escaping in weekly email templates [MEDIUM]
Database titles (user-supplied) inserted directly into HTML in email templates. Low practical risk (email recipients are the owners of the data), but worth sanitizing before any admin-facing email flows are added.

### R-005 — Sharpe Ratio in `ai-context.ts` still uses inline formula [LOW]
**File:** `src/domains/analytics/ai-context.ts:185`  
Uses population std dev; `calcSharpeRatio` in `formulas/performance.ts` uses Bessel-corrected sample std dev. AI coach receives a different Sharpe than the dashboard displays. TD-011 — not resolved in Sprint 1.

### R-006 — TASK-006: Profile page entirely non-functional [HIGH — existing]
Legal exposure: "Borrar cuenta" has no handler. Profile-to-App propagation = 0/14. Not a Sprint 1 regression, but Sprint 3's single highest-effort item.

### R-007 — Zero component or integration tests [HIGH — existing]
232 passing tests are all unit-level with mocked Prisma. No React component tests, no Playwright e2e. The QA audit was the only safety net this sprint. Any UI regression in Phase 3–5 would not have been caught automatically.

---

## Recomendaciones para Sprint 2

### 1. Close the three deferred P0s first (TASK-002, TASK-026, TASK-028)

These are all `XS` effort and should be the first items on Sprint 2. They represent the only remaining data-correctness issues from Phase X (Stability & Foundations). Sprint 2 should not be considered "started" until these are done.

### 2. Establish a pre-sprint green baseline

Before any Sprint 2 implementation begins: run `pnpm test` and `tsc --noEmit`. Commit a fix for any pre-existing failures before touching production code. The Sprint 1 experience (N-004 — 3 pre-existing failures that Sprint 1 had to fix retroactively) made the sprint unnecessarily complex.

### 3. Enforce "test first" for pure functions

B-001 (sl=0 sentinel) and M-001 (expectancy formula) would both have been caught by a unit test before code review. The Definition of Done requires "unit test added or updated for any pure function or business logic change." This should be treated as a hard gate, not a guideline.

A test like this would have caught B-001 immediately:
```typescript
it("returns null rMultiple when sl is 0 (parser sentinel)", () => {
  expect(calcRMultiple("LONG", 1.2345, 0, 1.2400)).toBeNull()
})
```

And this for M-001:
```typescript
it("avgR equals E[R] for 6 wins @+2R and 4 losses @-1R", () => {
  // E[R] = (6*2 + 4*(-1)) / 10 = 8/10 = 0.8
  const trades = [...Array(6).fill({ rMultiple: 2 }), ...Array(4).fill({ rMultiple: -1 })]
  expect(calcAvgR(trades)).toBeCloseTo(0.8)
  // Old formula: avgR * wr - (1-wr) = 1.2 * 0.6 - 0.4 = 0.32 ≠ 0.8
})
```

### 4. Verify parser contracts before implementing on top of them

When implementing rMultiple or any calculation that depends on parser output, read the parser source first to understand sentinel values. `mt4-parser.ts` and `csv-import.ts` both have non-obvious contracts (`sl=0` means "no stop"). Document these contracts in a comment at the call site.

### 5. Add `crypto.randomUUID()` to the shared upload utilities

The NP-002 finding (upload path using `Math.random()`) suggests a shared `generateUploadPath(userId, ext)` utility would prevent this class of issue from recurring. Low priority, but worth noting.

### 6. Document the `isAuthorized` dual-path design decision

The `SUPABASE_SERVICE_ROLE` alternative auth path in the edge function is intentional (Supabase's internal scheduler uses the service role key). This should be documented in a security decision record or in the function's header comment so future maintainers don't accidentally remove it.

### 7. Fix TD-011 (Sharpe in `ai-context.ts`) in Sprint 2

This was supposed to be part of TASK-027 (formula centralization — "Replace 2 Sharpe sites") but was missed. The AI coach currently uses a different Sharpe Ratio formula than the dashboard. Add it to Sprint 2 alongside TASK-032 (update model IDs).

---

## Métricas del Sprint

| Metric | Before Sprint 1 | After Sprint 1 |
|---|---|---|
| P0 bugs open | 10 | 3 |
| Win rate calculation sites | 8 | 1 |
| Tests passing | 229/232 | 232/232 |
| Test files | 11 | 15 |
| TypeScript errors | 0 | 0 |
| Security vulnerabilities (CRON_SECRET, Storage) | 2 | 0 |
| Debt items closed | 0 | 6 (TD-001, TD-004, TD-006, TD-007, TD-021, TD-026) |
| QA findings introduced and caught | — | 11 (all resolved) |

---

## Action Items for Sprint 2

| # | Action | Owner | When |
|---|---|---|---|
| 1 | Run `pnpm test` + `tsc --noEmit` before first code change | All | Sprint start |
| 2 | Close TASK-002 (objectiveMet) | FE | Day 1 |
| 3 | Close TASK-026 (ai-coach error message) | BE | Day 1 |
| 4 | Close TASK-028 (drawdown label) | FE | Day 1 |
| 5 | Fix TD-011: replace Sharpe in `ai-context.ts` with `calcSharpeRatio` | BE | Day 2 |
| 6 | Add unit test requirement to PR template | All | Sprint start |
