# Sprint 8 Completion Report

**Date:** 2026-06-03  
**Branch:** `claude/epic-darwin-1XZTX`  
**Duration:** Sprint 8 (post-Sprint 7 retrospective)

---

## Executive Summary

Sprint 8 delivered the testing infrastructure, accessibility layer, monthly reviews feature, CI/CD pipeline, and two architecture cleanup tasks. All 10 planned tasks completed. Vercel build failure (from Sprint 7 commit) diagnosed and fixed. Test baseline increased from 438 → 467 (+29).

---

## Deliverables

### 1. Modified Files

| File | Change | Task |
|---|---|---|
| `.github/workflows/ci.yml` | `claude/*` branch trigger, env vars, unit test step | TASK-076 |
| `src/next.config.ts` | `serverExternalPackages` for `@upstash/*` (Turbopack fix) | Vercel fix |
| `src/vitest.config.ts` | `setupFiles`, e2e excluded, component env resolved via docblock | TASK-024 |
| `src/tsconfig.json` | `"types": ["vitest/globals"]` | TASK-024 |
| `src/prisma/schema.prisma` | `MonthlyReview` model + User relation | TASK-071 |
| `src/server/trpc/root.ts` | `monthlyReviews: monthlyReviewsRouter` | TASK-071 |
| `src/app/api/ai-coach/route.ts` | Delegates to `streamCoachReply()` (109 → 42 lines) | TASK-065 |
| `src/components/ui/filter-bar.tsx` | `role="tablist"`, `aria-selected`, `aria-pressed`, focus ring | TASK-070 |
| `src/components/ui/kpi-card.tsx` | Composite `aria-label`, icon `aria-hidden` | TASK-070 |
| `src/app/dashboard/page.tsx` | `<main>` landmark, `aria-busy`, `aria-live`, skeleton loading | TASK-070/042 |
| `src/app/reviews/page.tsx` | Semanales/Mensuales tab toggle, monthly reviews list | TASK-071 |
| `src/app/trades/page.tsx` | `SkeletonTableRows` on loading, `EmptyState` when empty | TASK-042/043 |
| `src/app/cuentas/page.tsx` | `SkeletonAccountCards` replaces inline spinner | TASK-042 |
| `src/package.json` | `e2e` + `e2e:ui` scripts | TASK-025 |
| `src/pnpm-lock.yaml` | Lockfile updated for new devDependencies | TASK-024/025 |
| `docs/technical-debt.md` | TD-012 + TD-023 closed; test baseline 467 | docs |
| `docs/backlog.md` | Sprint 8 CLOSED; 10 tasks marked DONE | docs |
| `docs/changelog.md` | Sprint 8 entry added | docs |
| `src/.env.example` | Analytics cache, Upstash, Resend, E2E vars documented | TASK-021/022 |

### 2. New Files

| File | Purpose | Task |
|---|---|---|
| `src/vitest.setup.ts` | Conditional jest-dom import | TASK-024 |
| `src/vitest.d.ts` | jest-dom type augmentation | TASK-024 |
| `src/playwright.config.ts` | Playwright config (CI retries, base URL, Chromium) | TASK-025 |
| `src/__tests__/e2e/smoke.test.ts` | 3 smoke test suites with credential guards | TASK-025 |
| `src/__tests__/components/filter-bar.test.tsx` | 5 ARIA unit tests | TASK-024/070 |
| `src/__tests__/components/kpi-card.test.tsx` | 4 ARIA unit tests | TASK-024/070 |
| `src/__tests__/components/localStorage-fallback.test.tsx` | 6 M-02 regression tests | TASK-024 |
| `src/__tests__/routers/monthly-reviews.test.ts` | 8 tRPC router tests | TASK-071 |
| `src/__tests__/lib/coach-service.test.ts` | 5 service unit tests | TASK-065 |
| `src/lib/ai/coach-service.ts` | Extracted AI coach business logic | TASK-065 |
| `src/server/trpc/routers/monthly-reviews.ts` | Monthly reviews tRPC router (list/get/upsert/delete/update/prefill) | TASK-071 |
| `src/app/reviews/modals/create-monthly-review-modal.tsx` | Monthly review create/edit modal with TagInput | TASK-071 |
| `src/app/reviews/components/monthly-review-card.tsx` | Monthly review card with ScoreBadge | TASK-071 |
| `docs/EMAIL_SETUP.md` | Resend DNS setup guide | TASK-022 |
| `docs/QUALITY_GATES.md` | 5-gate definition-of-done (Gate 5 new) | pre-sprint |

---

## Tests Added

| File | Count | What |
|---|---|---|
| `filter-bar.test.tsx` | 5 | tablist role, aria-selected, onChange callback, ariaLabel prop, multiSelect aria-pressed |
| `kpi-card.test.tsx` | 4 | composite aria-label, sub in label, icon aria-hidden, value visible |
| `localStorage-fallback.test.tsx` | 6 | M-02 regression: SecurityError, QuotaExceededError, invalid saved value, defaults |
| `monthly-reviews.test.ts` | 8 | list serialization, get null/found, upsert userId scope, delete ownership, prefill aggregation |
| `coach-service.test.ts` | 5 | context building, message passing, system prompt content, ReadableStream return, model selection |
| **Total** | **28** | (438 → 467, +29 including 1 existing test from localStorage) |

---

## Risks Detected

| ID | Severity | Risk | Mitigation |
|---|---|---|---|
| R-01 | Medium | Turbopack breaks optional `require()` peer deps — already triggered with `@upstash/*` | Fixed: `serverExternalPackages` in `next.config.ts`; pattern documented in QUALITY_GATES.md |
| R-02 | Low | `middleware.ts` deprecation warning from Next.js 16 — should migrate to `proxy` | Next sprint item; does not affect functionality |
| R-03 | Low | RTL component tests use `@vitest-environment jsdom` docblock — if file is moved without docblock, tests silently run in node | Convention documented; CI will catch failures |
| R-04 | Low | `MonthlyReview.prefill` does full weekly review aggregation on every call — could be slow at scale | Acceptable at current volume; add caching if > 100 reviews |

---

## Technical Debt Created

| ID | Description | Priority |
|---|---|---|
| TD-034 | `middleware.ts` should migrate to `proxy` convention (Next.js 16 deprecation warning) | Low |
| TD-035 | Playbook and Mercados pages use inline empty states instead of `EmptyState` component | Low |

---

## Validation Checklist

- [x] **TypeScript:** `pnpm exec tsc --noEmit` → 0 errors
- [x] **Unit tests:** `pnpm test` → 467 passed, 0 failed (38 test files)
- [x] **Vercel build root cause:** Identified as Turbopack static `require()` analysis on `@upstash/*`
- [x] **Vercel fix applied:** `serverExternalPackages` in `next.config.ts`
- [x] **Supabase migration:** `sprint8_monthly_reviews` applied via MCP; `monthly_reviews` table exists with RLS
- [x] **Prisma client:** Regenerated after `MonthlyReview` model added
- [x] **New router registered:** `monthlyReviews` in `appRouter` (root.ts)
- [x] **Accessibility:** `role="tablist"` on reviews page tab toggle (satisfies E2E smoke test expectation)
- [x] **CI gate:** `.github/workflows/ci.yml` runs `pnpm test` before `next build`
- [x] **Backlog:** Sprint 8 tasks marked DONE
- [x] **Changelog:** Sprint 8 entry added
- [x] **Technical debt:** TD-012 + TD-023 closed; 2 new items (TD-034, TD-035) documented

---

## Acceptance Criteria by Task

| Task | Criterion | Status |
|---|---|---|
| TASK-076 CI/CD | `pnpm test` runs in CI on `claude/*` branches | ✅ |
| TASK-024 RTL tests | ≥ 3 component test files with ARIA assertions | ✅ (3 files, 15 tests) |
| TASK-025 Playwright | Smoke tests scaffold; can run with credentials | ✅ |
| TASK-065 Coach service | `streamCoachReply()` extracted; route < 50 lines | ✅ (42 lines) |
| TASK-070 Accessibility | FilterBar, KpiCard, Dashboard pass ARIA review | ✅ |
| TASK-071 Monthly reviews | CRUD + prefill; Mensuales tab in reviews page | ✅ |
| TASK-042 Skeletons | Skeleton on trades loading, accounts loading, dashboard loading | ✅ |
| TASK-043 Empty states | EmptyState on trades when empty | ✅ |
| TASK-021 Cache docs | `ANALYTICS_CACHE_ENABLED` documented in `.env.example` | ✅ |
| TASK-022 Email docs | `docs/EMAIL_SETUP.md` + Resend vars in `.env.example` | ✅ |
