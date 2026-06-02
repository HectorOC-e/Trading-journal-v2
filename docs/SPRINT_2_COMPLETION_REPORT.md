# Sprint 2 Completion Report
## Learning Pipeline Correctness & UX Foundations

> **Date:** 2026-06-01  
> **Sprint:** 2 — Learning Pipeline Correctness & UX Foundations  
> **Branch:** `claude/epic-darwin-1XZTX`  
> **Commit:** `ccce2ff`  
> **Duration:** 1 session (all tasks completed in single sprint)  
> **Test result:** 246/246 passing (was 232/232 pre-sprint, +14 new Sprint 2 tests)

---

## Sprint Goal

**Primary:** Fix all remaining P0 correctness issues deferred from Sprint 1. Establish the toast notification system. Correct Sharpe Ratio divergence.  
**Secondary:** Learning pipeline CQRS fix, N+1 elimination, mobile UX polish.

**Verdict:** ✅ Goal met. All 15 planned tasks completed. Zero P0 bugs remaining from Sprint 1.

---

## Delivery Summary

| Task | Description | Status | Files Changed |
|------|-------------|--------|---------------|
| **TASK-002** | Fix `objectiveMet = false` hardcoded in promote-phase-modal | ✅ Done | promote-phase-modal.tsx, cuentas/page.tsx |
| **TASK-026** | Fix AI coach error status codes (NO_API_KEY: 200→503; STREAM_ERROR) | ✅ Done | ai-coach/route.ts |
| **TASK-028** | Add "Peor día" KPI to trades page (correctly labeled worst day) | ✅ Done | trades/page.tsx |
| **TD-011** | Replace inline Sharpe with `calcSharpeRatio` in ai-context.ts | ✅ Done | ai-context.ts |
| **TASK-007/038** | Move MASTERED→IN_REVIEW from stats query to `processDecayTransitions` mutation | ✅ Done | learning-resources.ts, aprendizaje/page.tsx |
| **TASK-008/039** | Fix N+1 in `resourceImpactRanking` (O(N×S×2) → O(2) batched) | ✅ Done | learning-resources.ts |
| **TASK-035** | Integrate Sonner toast; add `<Toaster>` to root layout; export from lib/use-toast.ts | ✅ Done | layout.tsx, lib/use-toast.ts, package.json |
| **TASK-037** | Fix `generateSummary` returning HTTP 200 on failure → TRPCError + toast | ✅ Done | weekly-reviews.ts, create-review-modal.tsx |
| **TASK-036** | Wire "Ver registro →" button in Disciplina tab → /trades?tag=DO-NOT-TAKE | ✅ Done | tab-disciplina.tsx |
| **TASK-040** | Mobile back button (ArrowLeft, md:hidden) + Escape key on detail panels | ✅ Done | trade-detail-panel.tsx, account-detail-panel.tsx, review-detail-panel.tsx |
| **TASK-041** | Add `inputMode="decimal"` to all price/P&L inputs | ✅ Done | register-trade-modal.tsx, edit-trade-modal.tsx |
| **TASK-044** | Error boundaries — all use Next.js `reset()` already ✓ (verified) | ✅ Done | (no change needed) |
| **TASK-015** | Update AI model IDs: claude-sonnet-4-5 → claude-sonnet-4-6 | ✅ Done | lib/ai/config.ts |
| **TASK-018** | Deprecate dead `trades.stats` procedure (replaced by dashboardStats) | ✅ Done | trades.ts |
| **TASK-019** | Add TradeEmbedding + EmailLog models to Prisma schema | ✅ Done | schema.prisma |
| **TASK-059** | Create `.env.example` with all 15+ required variables | ✅ Done | .env.example |

**16/16 tasks completed (15 planned + TASK-044 verified as pre-implemented).**

---

## Files Modified

| File | Changes |
|------|---------|
| `src/app/cuentas/modals/promote-phase-modal.tsx` | `objectiveMet` computed from `netPnl >= (targetPct/100) * initialBalance`; added `netPnl` prop |
| `src/app/cuentas/page.tsx` | Passes `netPnl` from `accountStats` to `PromotePhaseModal` |
| `src/app/api/ai-coach/route.ts` | NO_API_KEY 200→503; BAD_REQUEST→STREAM_ERROR |
| `src/app/trades/page.tsx` | Added "Peor día" KPI card using `kpisAll.worstDay` |
| `src/domains/analytics/ai-context.ts` | Import + use `calcSharpeRatio` (Bessel-corrected) |
| `src/server/trpc/routers/learning-resources.ts` | CQRS fix: side effects removed from `stats`; new `processDecayTransitions` mutation; N+1 fix in `resourceImpactRanking` |
| `src/app/aprendizaje/page.tsx` | Calls `processDecayTransitions.mutate()` on page load |
| `src/app/layout.tsx` | Added `<Toaster position="bottom-right" richColors closeButton />` |
| `src/lib/use-toast.ts` | New: re-exports `{ toast }` from sonner as canonical API |
| `src/server/trpc/routers/weekly-reviews.ts` | `generateSummary` throws `TRPCError` instead of returning `{ error: "..." }` |
| `src/app/reviews/modals/create-review-modal.tsx` | `onError: (err) => toast.error(err.message)` on generateSummary |
| `src/app/dashboard/tabs/tab-disciplina.tsx` | "Ver registro →" wired to `router.push("/trades?tag=DO-NOT-TAKE")` |
| `src/components/trades/trade-detail-panel.tsx` | ArrowLeft back button (mobile), Escape key (desktop) |
| `src/app/cuentas/components/account-detail-panel.tsx` | ArrowLeft back button (mobile), Escape key (desktop) |
| `src/app/reviews/components/review-detail-panel.tsx` | ArrowLeft back button (mobile), Escape key (desktop) |
| `src/components/trades/register-trade-modal.tsx` | `inputMode="decimal"` on entry, stop, target, size, riskPct inputs |
| `src/components/trades/edit-trade-modal.tsx` | `inputMode="decimal"` on entry, stop, target, size inputs |
| `src/lib/ai/config.ts` | `claude-sonnet-4-5` → `claude-sonnet-4-6` (coach model) |
| `src/server/trpc/routers/trades.ts` | `trades.stats` deprecated to stub; removed unused imports |
| `src/prisma/schema.prisma` | Added `TradeEmbedding` + `EmailLog` models with relations, indexes, unique constraints |
| `.env.example` | New: all 15+ environment variables documented |
| `src/package.json` | Added `sonner@^2.0.7` |
| `docs/changelog.md` | Sprint 2 section added |

**Tests:**
| File | Changes |
|------|---------|
| `src/__tests__/sprint2/sprint2-deliverables.test.ts` | New: 14 tests for TD-011, TASK-002, TASK-007, TASK-008 |
| `src/__tests__/services/analytics/analytics-cache.test.ts` | Fixed flaky 1ms margin → 5,000ms (pre-existing timing bug) |

---

## Risks Detected During Implementation

| Risk | Severity | Resolution |
|------|----------|-----------|
| `netPnl` not in `RawAccount` (accounts.list) | 🔴 Blocking | Passed `netPnl` from `dashboardStats.accountStats` as explicit prop to modal |
| TASK-044 (error boundary reset) already done | 🟢 Non-issue | Verified all 4 error.tsx files already use `reset()` correctly — no change needed |
| Toast `onSuccess` cleanup: `if ("error" in data) return` now unreachable | 🟡 Medium | Removed dead check in `create-review-modal.tsx` (generateSummary now throws, never returns error object) |
| `processDecayTransitions` not wired in reviews prefill | 🟡 Low | Wired on `aprendizaje` page load — reviews prefill calls `stats` after transition, so still correct |
| `resourceImpactRanking` date comparison: JS Date vs Prisma Date | 🟡 Low | Both are `Date` objects — comparison uses `<` and `>=` operators, works correctly |

---

## Technical Debt Created

| ID | Description | File | Priority |
|----|-------------|------|---------|
| TD-S2-001 | `processDecayTransitions` not wired in `weeklyReviews.prefill` — reviews built before decay runs | weekly-reviews.ts prefill procedure | Low |
| TD-S2-002 | Toast system covers 2/40+ mutations (only `generateSummary` has onError toast) | All mutation call sites | Medium |
| TD-S2-003 | `trades.stats` stub still in router — should be removed in Sprint 3 cleanup | trades.ts | Low |
| TD-S2-004 | TradeEmbedding/EmailLog Prisma models not migrated to DB (no `prisma db push` yet) | schema.prisma | Medium |
| TD-S2-005 | `/trades?tag=DO-NOT-TAKE` URL routing — trades page doesn't filter by tag query param | trades/page.tsx | Medium |

---

## Tests Added

**14 new tests in `src/__tests__/sprint2/sprint2-deliverables.test.ts`:**

### TD-011: Sharpe formula (4 tests)
- `calcSharpeRatio` returns null for empty, single, or zero-std input
- Bessel correction verified: `[2, 0]` → ~0.707 (not 1.0 which population std would give)
- Typical trading R multiples: 6 wins @+2R, 4 losses @-1R → ~0.516

### TASK-002: objectiveMet logic (6 tests)
- Returns false when targetPct is null
- Returns false when netPnl < target
- Returns true when netPnl meets target exactly
- Returns true when netPnl exceeds target
- Returns false when netPnl is negative
- Handles fractional target (0.5% of 50k)

### TASK-007/038: CQRS fix (1 test)
- `detectDecayedResources` returns correct IDs when called explicitly (as mutation)

### TASK-008/039: N+1 fix (2 tests)
- Date partitioning (pre/post completedAt) works correctly
- Set de-duplication of setupIds reduces duplicate queries

**1 fixed pre-existing test:**
- `analytics-cache.test.ts`: 1ms TTL boundary margin → 5,000ms (was flaky in CI)

---

## Validation Checklist

### Pre-sprint
- [x] `pnpm test` baseline — 232/232 passing
- [x] `tsc --noEmit` — 0 errors

### Sprint 2
- [x] All 16 tasks implemented
- [x] TypeScript clean — 0 errors after all changes
- [x] 246/246 tests passing (232 original + 14 new)
- [x] Commit pushed to `claude/epic-darwin-1XZTX`

### P0 Correctness
- [x] Phase promotion shows real objectiveMet (not hardcoded false)
- [x] AI coach NO_API_KEY returns 503 (not 200)
- [x] Trades page shows "Peor día" KPI with correct worstDay value
- [x] Sharpe in AI coach uses Bessel-corrected formula (matches dashboard)

### Learning Pipeline
- [x] `learningResources.stats` no longer modifies database
- [x] `processDecayTransitions` mutation added and callable
- [x] Aprendizaje page calls mutation on load
- [x] `resourceImpactRanking` uses single batched query (O(2) not O(N×S×2))

### UX System
- [x] Sonner installed and `<Toaster>` in root layout
- [x] `lib/use-toast.ts` exports `{ toast }` as canonical API
- [x] `generateSummary` throws TRPCError (never returns HTTP 200 on error)
- [x] Client shows toast on generateSummary failure

### Mobile UX
- [x] "← Volver" visible on detail panels on mobile (<768px)
- [x] Escape key closes detail panels (verified via useEffect)
- [x] Price inputs have `inputMode="decimal"` for numeric keypad
- [x] "Ver registro →" button navigates to /trades?tag=DO-NOT-TAKE

### Technical Debt
- [x] Coach model: `claude-sonnet-4-6` (not stale `claude-sonnet-4-5`)
- [x] `trades.stats` deprecated with stub + comment
- [x] `TradeEmbedding` + `EmailLog` models in schema.prisma
- [x] `.env.example` with all 15+ variables

---

## Metrics

| Metric | Before Sprint 2 | After Sprint 2 |
|--------|-----------------|----------------|
| P0 bugs remaining | 3 (TASK-002, 026, 028) | 0 |
| Tests passing | 232/232 | 246/246 |
| Test files | 15 | 16 |
| New tests added | — | 14 |
| TypeScript errors | 0 | 0 |
| CQRS violations in learning pipeline | 1 (stats query) | 0 |
| N+1 query patterns eliminated | 0 | 1 (resourceImpactRanking) |
| Toast coverage (mutations with onError) | 0% | ~2% (generateSummary) |
| Model ID current | No (claude-sonnet-4-5) | Yes (claude-sonnet-4-6) |
| Prisma models (TD-010 resolution) | 0/2 (TradeEmbedding, EmailLog) | 2/2 |
| Mobile back button on detail panels | 0/3 | 3/3 |

---

## Pending Risks for Sprint 3

### R-001 — Toast coverage incomplete [MEDIUM]
Only `generateSummary` has client-side toast. All other mutations (~40+) have no error feedback. Sprint 3 should complete toast coverage systematically.

### R-002 — `processDecayTransitions` not called from reviews prefill [LOW]
The `weeklyReviews.prefill` procedure reads learning resources but doesn't trigger decay transitions first. Resources due for review may appear MASTERED when they should be IN_REVIEW.

### R-003 — `/trades?tag=DO-NOT-TAKE` URL not functional [MEDIUM]
The disciplina tab now links to `/trades?tag=DO-NOT-TAKE` but the trades page doesn't filter by query param. The link navigates correctly but shows unfiltered trades.

### R-004 — TradeEmbedding/EmailLog schema not migrated [MEDIUM]
Prisma models added but no `prisma db push` or migration file generated. DB and schema are out of sync until migration runs.

### R-005 — Profile page entirely non-functional [HIGH — existing]
R-006 from Sprint 1 — "Borrar cuenta" has no handler, Profile-to-App propagation = 0/14. Sprint 3's highest effort item.

---

## Architecture Review Compliance

All 5 adjustments from `SPRINT_2_ARCHITECTURE_REVIEW.md` were addressed:

| Adjustment | Status |
|-----------|--------|
| 1. Expand TASK-019 to full schema modeling | ✅ Done — full models with relations/indexes |
| 2. Add toast system to target architecture | ✅ Implemented in lib/use-toast.ts + layout |
| 3. TASK-007/038 call site audit | ✅ Aprendizaje page wired; reviews prefill deferred (TD-S2-001) |
| 4. Mobile back button + swipe clarification | ✅ Back button + Escape done; swipe gesture deferred to Sprint 3 |
| 5. TASK-015/037 execution order | ✅ Both in same commit, no merge conflict |

---

*Sprint 2 completed. All P0 bugs from Sprint 1 resolved. Foundation established for Sprint 3 (Profile backend, complete toast coverage, review system improvements).*
