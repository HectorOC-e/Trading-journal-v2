# Backlog — Trading Journal v2

> **Last Updated: 2026-06-03**  
> Complete 53-task backlog (TASK-001–053) organized by module and sprint. Sources: repository-audit-report, product-gap-analysis, feature-opportunities, ai-architecture-recommendations, personalization-roadmap, ux-improvement-roadmap, master-remediation-plan.
> **Sprint 5 closed:** TASK-020, TASK-033, TASK-046, TASK-050, TASK-056, TASK-062, TASK-074 (7 tasks, 389 tests, 4 Blocking QA findings fixed pre-ship).
> **Sprint 6 closed:** TASK-045 (system theme), TASK-048 (review filters), TASK-049+TASK-012 (sparklines), TASK-013 (type safety), TASK-014 (LearningResource type) + P0.1 (quality gates), P3.1 (key rotation), P3.3 (rate limiting). 407 tests (+18). QA: 0 Blocking, 6 Major fixed.
> **Sprint 7 closed:** TASK-031 (review edit/delete), TASK-011 (discipline score), TASK-051 (custom tags), TASK-073 (7d rolling window), TASK-064 (setup health), TASK-058 (webhook embedding), TASK-060 (structured logger) + rate-limiter abstraction + review URL persistence + TD-029–TD-033 (Sprint 6 deferred). 438 tests (+31). QA: 2 Blocking + 4 Major fixed post-ship.

---

## Executive Summary

| Priority | Count | Open | Done | Estimated Remaining |
|---|---|---|---|---|
| P0 | 12 | 0 | 12 | — |
| P1 | 17 | 0 | 17 | — |
| P2 | 17 | 3 | 14 | ~9 days |
| P3 | 10 | 7 | 3 | ~50+ days |
| **Total** | **56** | **10** | **46** | **~60+ days** |

> **Sprint 1 closed:** TASK-001, TASK-003, TASK-004, TASK-005, TASK-009, TASK-016, TASK-017, TASK-027, TASK-029 (9 tasks).  
> **Sprint 2 closed:** TASK-002, TASK-007, TASK-008, TASK-015, TASK-018, TASK-019, TASK-026, TASK-028, TASK-035, TASK-036, TASK-037, TASK-038, TASK-039, TASK-040, TASK-041, TASK-044 (16 tasks).  
> **Sprint 3 closed:** TASK-006 (profile backend unblocks 7 downstream tasks), TASK-030 (UserPreferences) (2 core tasks + QA audit fixes).  
> **Sprint 4 closed:** TASK-034 (psychology fields), TASK-047, TASK-061, TASK-069, TASK-023 (partial), TASK-013 (67% complete) (6 tasks, all Major findings resolved).  
> **Sprint 5 closed:** TASK-020, TASK-033, TASK-046, TASK-050, TASK-056, TASK-062, TASK-074 (7 tasks, 4 Blocking QA findings fixed pre-ship).  
> **Sprint 6 closed:** TASK-045, TASK-048, TASK-049, TASK-012, TASK-013, TASK-014 + quality gates + key rotation + rate limiting. 407 tests (+18). QA: 0 Blocking, 6 Major fixed.
> **Sprint 7 closed:** TASK-031, TASK-011, TASK-051, TASK-073, TASK-064, TASK-058, TASK-060 + rate-limiter abstraction + review URL persistence + TD-029–TD-033. 438 tests (+31). QA: 2 Blocking + 4 Major found and fixed.

**Critical path:** All P0 and P1 items closed. P2 focus: TASK-042 (skeleton screens), TASK-043 (empty states), TASK-052 (onboarding). Sprint 8 targets accessibility (TASK-070), monthly review model (TASK-071), and architecture cleanup (TD-012, TD-018).

---

## Complete Task Table

| ID | Title | Module | Priority | Effort | Dependencies | Status |
|---|---|---|---|---|---|---|
| TASK-001 | Fix KPI strip calculated over paginated trade data | analytics | P0 | S | — | DONE |
| TASK-002 | Fix `objectiveMet = false` hardcoded in phase promotion | accounts | P0 | XS | — | DONE |
| TASK-003 | Replace `throw new Error()` with `TRPCError` in accounts.changeStatus | accounts | P0 | XS | — | DONE |
| TASK-004 | Calculate `rMultiple` in MT4/cTrader CSV import | trades | P0 | XS | — | DONE |
| TASK-005 | Unify win criterion (`pnl > 0`) across all calculation sites | formulas | P0 | XS | TASK-027 | DONE |
| TASK-006 | Implement profile backend (tRPC router + page) | profile | P0 | L | — | DONE |
| TASK-007 | Move MASTERED→IN_REVIEW side-effect from `stats` query to mutation | learning | P1 | S | — | DONE |
| TASK-008 | Fix N+1 query in `resourceImpactRanking` | learning | P1 | M | — | DONE |
| TASK-009 | Fix weekTrades and account stats based on first 50 trades only | analytics | P0 | S | — | DONE |
| TASK-010 | Connect "Ver registro →" button in Disciplina tab | ux | P1 | XS | — | DONE |
| TASK-011 | Extract `computeDisciplineScore` as shared function | formulas | P2 | S | TASK-027 | **DONE** Sprint 7 |
| TASK-012 | Implement sparklines of equity per setup in Playbook | playbook | P2 | M | — | **DONE** Sprint 6 (consolidated → TASK-049) |
| TASK-013 | Eliminate 15+ `as never` casts in trades/page.tsx | types | P2 | M | — | **DONE** Sprint 6 |
| TASK-014 | Unify `LearningResource` type with RouterOutputs | types | P2 | S | — | **DONE** Sprint 6 |
| TASK-015 | Update stale AI model IDs in config | ai | P1 | XS | — | DONE |
| TASK-016 | Harden CRON_SECRET check in edge function | security | P0 | XS | — | DONE |
| TASK-017 | Server-side validation for Storage image uploads | security | P0 | S | — | DONE |
| TASK-018 | Deprecate dead `trades.stats` procedure | trades | P2 | XS | — | DONE |
| TASK-019 | Add `notes_embedding` and `email_log` to Prisma schema | infra | P3 | S | — | DONE |
| TASK-020 | Implement cursor pagination in `accountLogs.list` | accounts | P3 | S | — | DONE |
| TASK-021 | Activate and document `ANALYTICS_CACHE_ENABLED` for production | infra | P3 | XS | — | TODO |
| TASK-022 | Configure verified email domain in Resend | infra | P3 | XS | — | TODO |
| TASK-023 | Type `market: any` in MarketCard and `amount: any` in Retiros | types | P3 | XS | — | TODO |
| TASK-024 | Add React Testing Library component tests | testing | P3 | L | — | TODO |
| TASK-025 | Add Playwright e2e smoke tests | testing | P3 | L | — | TODO |
| TASK-026 | Fix error message mismatch in `ai-coach/route.ts:106` | ai | P0 | XS | — | DONE |
| TASK-027 | Centralize financial formulas in `lib/trading-formulas.ts` | formulas | P0 | M | — | DONE |
| TASK-028 | Fix misleading "Drawdown" label on trades KPI strip | formulas | P0 | XS | — | DONE |
| TASK-029 | Fix inconsistent drawdown calculation in `use-account-stats.ts` | formulas | P0 | XS | — | DONE |
| TASK-030 | Implement `UserPreferences` table and router | profile | P1 | M | TASK-006 | DONE |
| TASK-031 | Add Edit and Delete buttons to ReviewDetailPanel | reviews | P1 | M | — | **DONE** Sprint 7 |
| TASK-032 | Update stale AI model IDs in config (coach + summary) | ai | P1 | XS | — | DONE |
| TASK-033 | Implement AI configuration UI and `UserAiConfig` table | ai | P1 | L | TASK-006, TASK-032 | DONE |
| TASK-034 | Add per-trade psychology fields to Trade model | psychology | P1 | M | — | **DONE** Sprint 4 |
| TASK-035 | Implement toast notification system | ux | P1 | M | — | DONE |
| TASK-036 | Fix dead "Ver registro →" button in Disciplina tab | ux | P1 | XS | — | DONE |
| TASK-037 | Fix `generateSummary` HTTP 200 on failure | reviews | P1 | XS | TASK-035 | DONE |
| TASK-038 | Fix `learningResources.stats` CQRS violation | learning | P1 | S | — | DONE |
| TASK-039 | Fix N+1 query in `resourceImpactRanking` | learning | P1 | M | — | DONE |
| TASK-040 | Add mobile back navigation to detail panels | mobile | P1 | S | — | DONE |
| TASK-041 | Add `inputmode="decimal"` to price inputs in trade form | mobile | P2 | XS | — | DONE |
| TASK-042 | Add skeleton screens for KPI strip, trade table, account cards | ux | P2 | M | — | TODO |
| TASK-043 | Add empty states for Cuentas, Trades, Playbook, Mercados | ux | P2 | M | — | TODO |
| TASK-044 | Fix `window.location.reload()` in error boundaries | ux | P2 | XS | — | DONE |
| TASK-045 | Three-way theme toggle (add "system" mode) | personalization | P2 | S | TASK-006 | **DONE** Sprint 6 |
| TASK-046 | Accent color picker and colorblind mode | personalization | P2 | M | TASK-006 | DONE |
| TASK-047 | Persist dashboard tab and chart grain | personalization | P2 | XS | — | DONE |
| TASK-048 | Weekly review filtering and search | reviews | P2 | M | — | **DONE** Sprint 6 |
| TASK-049 | Playbook sparklines with real equity data | playbook | P2 | M | — | **DONE** Sprint 6 |
| TASK-050 | Goal setting and dashboard widget | personalization | P2 | M | TASK-006 | DONE |
| TASK-051 | Custom tags management UI | personalization | P2 | M | TASK-006 | **DONE** Sprint 7 |
| TASK-052 | Onboarding checklist widget for new users | ux | P2 | M | TASK-006 | TODO |
| TASK-053 | Multi-account portfolio dashboard | analytics | P3 | XL | TASK-019 | TODO |
| TASK-056 | Create `useCurrency()` hook for currency symbol propagation | profile | P1 | S | TASK-006 | DONE |
| TASK-062 | Surface Sharpe Ratio as KPI on dashboard | analytics | P2 | S | — | DONE |
| TASK-074 | Add `planNotes` field for pre-trade planning | trades | P1 | S | — | DONE |

**Effort scale:** XS = <4h · S = 1–2 days · M = 3–7 days · L = 1–3 weeks · XL = 3–6 weeks

---

## Tasks by Module

### formulas — Formula Unification (5 tasks)

Treat as a coordinated effort. TASK-027 is the prerequisite for all others.

| ID | Title | Priority | Effort |
|---|---|---|---|
| TASK-027 | Create `lib/trading-formulas.ts` — single source for all financial calculations | P0 | M |
| TASK-005 | Unify win criterion `pnl > 0` — depends on TASK-027 for `isWin` helper | P0 | XS |
| TASK-028 | Fix "Drawdown" KPI label on trades page (shows "peor día", not drawdown) | P0 | XS |
| TASK-029 | Fix current-DD vs max-DD confusion in `use-account-stats.ts` | P0 | XS |
| TASK-011 | Extract shared `computeDisciplineScore` function (completes centralization) | P2 | S |

**Key detail:** Win Rate has 8 separate inline implementations across `dashboard-analytics.ts`, `trades.ts`, `weekly-reviews.ts` (×2), `create-review-modal.tsx`, `trading-sessions.ts`, `learning-resources.ts`, and `use-account-stats.ts`. Discipline Score has 3. Sharpe Ratio has 2 (with different std-dev methods).

### analytics — KPI Correctness (3 tasks)

| ID | Title | Priority | Effort |
|---|---|---|---|
| TASK-001 | Fix KPI strip using paginated trade data (max 50) | P0 | S |
| TASK-009 | Fix weekTrades and account stats using paginated trade data | P0 | S |
| TASK-053 | Multi-account portfolio dashboard (P3, long-term) | P3 | XL |

### accounts — Prop-Firm Correctness (3 tasks)

| ID | Title | Priority | Effort |
|---|---|---|---|
| TASK-002 | Fix `objectiveMet = false` hardcoded in phase promotion modal | P0 | XS |
| TASK-003 | Replace `throw new Error()` with `TRPCError` in accounts.changeStatus | P0 | XS |
| TASK-020 | Cursor pagination for `accountLogs.list` | P3 | S |

### profile — Settings Surface (2 tasks, unblocks 7)

| ID | Title | Priority | Effort |
|---|---|---|---|
| TASK-006 | Implement profile backend (tRPC router, 5 procedures) — P0, unblocks 7 tasks | P0 | L |
| TASK-030 | Implement `UserPreferences` table for all UI personalization (depends TASK-006) | P1 | M |

### ai — AI Provider and Configuration (4 tasks)

| ID | Title | Priority | Effort |
|---|---|---|---|
| TASK-015/TASK-032 | Update stale model IDs (consolidated as TASK-032) | P1 | XS |
| TASK-033 | Full AI config UI with per-user keys, model selection, connectivity test | P1 | L |
| TASK-026 | Fix error message mismatch in ai-coach route | P3 | XS |

### reviews — Weekly Review Quality (4 tasks)

| ID | Title | Priority | Effort |
|---|---|---|---|
| TASK-009 | Fix week-trade stats based on paginated data (shared with analytics) | P0 | S |
| TASK-031 | Add Edit and Delete to ReviewDetailPanel | P1 | M |
| TASK-037 | Fix generateSummary HTTP 200 on failure | P1 | XS |
| TASK-048 | Review list filtering and search | P2 | M |

### learning — SRS Performance and Correctness (3 tasks)

| ID | Title | Priority | Effort |
|---|---|---|---|
| TASK-007/TASK-038 | Fix CQRS violation in `stats` procedure (consolidated as TASK-038) | P1 | S |
| TASK-008/TASK-039 | Fix N+1 query in `resourceImpactRanking` (consolidated as TASK-039) | P1 | M |
| TASK-014 | Unify `LearningResource` type with RouterOutputs | P2 | S |

### psychology — Per-Trade Behavioral Tracking (1 task)

| ID | Title | Priority | Effort |
|---|---|---|---|
| TASK-034 | Add structured psychology fields to Trade model (emotionBefore, fomoFlag, revengeFlag, confidenceRating, executionQuality) | P1 | M |

### playbook — Setup Analytics (2 tasks)

| ID | Title | Priority | Effort |
|---|---|---|---|
| TASK-012/TASK-049 | Setup sparklines with real equity data (consolidated as TASK-049) | P2 | M |

### security — Hardening (2 tasks)

| ID | Title | Priority | Effort |
|---|---|---|---|
| TASK-016 | Harden CRON_SECRET check in edge function | P0 | XS |
| TASK-017 | Server-side validation for Supabase Storage image uploads | P0 | S |

### ux — User Experience (8 tasks)

| ID | Title | Priority | Effort |
|---|---|---|---|
| TASK-010/TASK-036 | Fix dead "Ver registro →" button (consolidated as TASK-036) | P1 | XS |
| TASK-035 | Toast notification system | P1 | M |
| TASK-040 | Mobile back navigation for detail panels | P1 | S |
| TASK-041 | `inputmode="decimal"` on price inputs | P2 | XS |
| TASK-042 | Skeleton screens for loading states | P2 | M |
| TASK-043 | Empty states for 4 pages | P2 | M |
| TASK-044 | Fix `window.location.reload()` in error boundary | P2 | XS |
| TASK-052 | Onboarding checklist widget | P2 | M |

### personalization — Theme and Preferences (5 tasks)

| ID | Title | Priority | Effort |
|---|---|---|---|
| TASK-045 | Three-way theme toggle (add "system" mode) | P2 | S |
| TASK-046 | Accent color picker and colorblind mode | P2 | M |
| TASK-047 | Persistent dashboard tab and chart grain | P2 | XS |
| TASK-050 | Goal setting and dashboard widget | P2 | M |
| TASK-051 | Custom tags management UI | P2 | M |

### types — TypeScript Correctness (3 tasks)

| ID | Title | Priority | Effort |
|---|---|---|---|
| ~~TASK-013~~ | ~~Eliminate 15+ `as never` casts in trades/page.tsx~~ | P2 | M | **DONE Sprint 6** |
| TASK-023 | Type `market: any` and `amount: any` props | P3 | XS | DONE Sprint 4 |

### infra — Schema and Infrastructure (4 tasks)

| ID | Title | Priority | Effort |
|---|---|---|---|
| TASK-019 | Add `notes_embedding` and `email_log` to Prisma schema | P3 | S |
| TASK-021 | Activate `ANALYTICS_CACHE_ENABLED` in production | P3 | XS |
| TASK-022 | Configure verified email domain in Resend | P3 | XS |

### testing — Automated Coverage (2 tasks)

| ID | Title | Priority | Effort |
|---|---|---|---|
| TASK-024 | React Testing Library component tests | P3 | L |
| TASK-025 | Playwright e2e smoke tests | P3 | L |

---

## Dependency Graph

```
TASK-027 (formula centralization) ──┬──► TASK-005 (win criterion)
                                    └──► TASK-011 (discipline score)

TASK-006 (profile backend) ─────────┬──► TASK-030 (UserPreferences) ✅
                                    ├──► TASK-033 (AI config UI) ✅
                                    ├──► TASK-045 (system theme) ✅
                                    ├──► TASK-046 (accent color) ✅
                                    ├──► TASK-050 (goal setting) ✅
                                    └──► TASK-051 (custom tags) [TODO]

TASK-035 (toast system) ────────────────► TASK-037 (review error handling)
TASK-032 (model IDs) ───────────────────► TASK-033 (AI config UI)
TASK-004 (rMultiple) ───────────────────► TASK-001 (KPI strip, correct R data)
TASK-019 (schema sync) ─────────────────► TASK-053 (portfolio dashboard)
```

---

## Sprint Planning

### ~~Sprint 1 (Weeks 1–2) — P0 Bugs and Security~~ ✅ CLOSED 2026-06-01
**Goal:** Eliminate all data-integrity bugs and security risks. All metrics must be accurate.

| Task | Effort | Owner | Status |
|---|---|---|---|
| TASK-027 — Centralize formulas (`src/lib/formulas/`) | M | BE | ✅ DONE |
| TASK-005 — Unify win criterion (`isWin()`) | XS | BE | ✅ DONE |
| TASK-003 — TRPCError in accounts.changeStatus | XS | BE | ✅ DONE |
| TASK-016 — Harden CRON_SECRET | XS | BE | ✅ DONE |
| TASK-017 — Server-side upload validation | S | BE | ✅ DONE |
| TASK-004 — rMultiple on CSV import | XS | BE | ✅ DONE |
| TASK-029 — Fix use-account-stats drawdown | XS | FE | ✅ DONE (file deleted; page migrated to dashboardStats) |
| TASK-001 — Fix KPI strip over paginated data | S | BE/FE | ✅ DONE (pulled from Sprint 2) |
| TASK-009 — Fix weekTrades and account stats | S | BE/FE | ✅ DONE (pulled from Sprint 2) |
| TASK-002 — Fix phase promotion objectiveMet | XS | FE | ⏭ DEFERRED → Sprint 2 |
| TASK-026 — Fix ai-coach error message | XS | BE | ⏭ DEFERRED → Sprint 2 |
| TASK-028 — Fix drawdown label | XS | FE | ⏭ DEFERRED → Sprint 2 |

**Exit criteria met:** All data-integrity bugs fixed. Security bypass on edge function and Storage eliminated. 232/232 tests passing. TypeScript clean.  
**QA report:** `docs/SPRINT_1_QA_REPORT.md` | **Fix report:** `docs/SPRINT_1_FIX_REPORT.md` | **Retrospective:** `docs/SPRINT_1_RETROSPECTIVE.md`

### Sprint 2 (Weeks 3–4) — Deferred P0s and Critical UX
**Goal:** Close deferred Sprint 1 P0s; ship quick UX wins; fix learning resource bugs.

| Task | Effort | Owner |
|---|---|---|
| TASK-002 — Fix phase promotion objectiveMet (deferred from Sprint 1) | XS | FE |
| TASK-026 — Fix ai-coach error message (deferred from Sprint 1) | XS | BE |
| TASK-028 — Fix drawdown label (deferred from Sprint 1) | XS | FE |
| TASK-036 — Fix dead "Ver registro →" button | XS | FE |
| TASK-037 — Fix generateSummary error handling | XS | BE |
| TASK-044 — Fix window.reload() in error boundary | XS | FE |
| TASK-038 — Fix CQRS violation in learningResources.stats | S | BE |
| TASK-039 — Fix N+1 in resourceImpactRanking | M | BE |
| TASK-032 — Update AI model IDs | XS | BE |

**Exit criteria:** Zero open P0 bugs. Learning resources page is read-only. All mutations have correct error semantics.

### ~~Sprint 3 (Weeks 5–7) — Profile Backend (Unblocks 7 Tasks)~~ ✅ CLOSED 2026-06-02
**Goal:** Ship the profile backend. Longest single task; unblocks all personalization.

| Task | Effort | Owner | Status |
|---|---|---|---|
| TASK-006 — Profile backend (tRPC router + page) | L | BE/FE | ✅ DONE |
| TASK-035 — Toast notification system | M | FE | ✅ DONE (Sprint 2) |
| TASK-040 — Mobile back navigation | S | FE | ✅ DONE (Sprint 2) |
| TASK-041 — inputmode decimal on price inputs | XS | FE | ✅ DONE (Sprint 2) |

**Exit criteria:** All profile fields saved and loaded. All mutations show toast feedback.  
**QA audit:** 16 findings (2 Blocking, 7 Major, 4 Minor, 3 Nitpick) — 13 fixed, 3 deferred. Tests: 291 → 315 (+24 new). TypeScript: clean.

### Sprint 4 (Weeks 8–10) — Reviews, Psychology, Personalization Foundation
**Goal:** High-value P1 features that depend on Sprint 3.

| Task | Effort | Owner |
|---|---|---|
| TASK-030 — UserPreferences table and router | M | BE |
| TASK-031 — Edit/Delete for ReviewDetailPanel | M | FE |
| TASK-034 — Per-trade psychology fields | M | BE/FE |
| TASK-047 — Persist dashboard tab and chart grain | XS | FE |
| TASK-045 — Three-way theme toggle | S | FE |
| TASK-011 — Shared computeDisciplineScore | S | BE |

### Sprint 5 (Weeks 11–14) — AI Config, UX Polish, Type Safety
**Goal:** Ship AI configuration; polish UX; eliminate type debt.

| Task | Effort | Owner |
|---|---|---|
| TASK-033 — AI configuration UI + UserAiConfig | L | BE/FE |
| TASK-042 — Skeleton screens | M | FE |
| TASK-043 — Empty states | M | FE |
| TASK-013 — Eliminate as never casts | M | FE |
| TASK-014 — Unify LearningResource type | S | FE |
| TASK-018 — Deprecate trades.stats dead code | XS | BE |
| TASK-023 — Fix any props in mercados/retiros | XS | FE |

### ~~Sprint 6 (Weeks 15–18) — Personalization and Playbook~~ ✅ CLOSED 2026-06-03
**Goal:** Complete personalization features; playbook real data; reviews filter.

| Task | Effort | Owner | Status |
|---|---|---|---|
| TASK-045 — Three-way theme toggle (light/dark/system) | S | FE | ✅ DONE |
| TASK-048 — Review filtering and search | M | BE/FE | ✅ DONE |
| TASK-049 — Playbook sparklines with real data | M | FE | ✅ DONE |
| TASK-012 — Setup sparklines (consolidated → TASK-049) | M | FE | ✅ DONE |
| TASK-013 — Eliminate remaining `as never` casts | M | FE | ✅ DONE (TD-013 closed) |
| TASK-014 — Unify LearningResource type | S | FE | ✅ DONE (TD-014 closed) |
| P0.1 — QUALITY_GATES.md | XS | BE | ✅ DONE |
| P3.1 — Key rotation utility | S | BE | ✅ DONE |
| P3.3 — AI test rate limiter | S | BE | ✅ DONE |

**QA Audit (independent):** 0 Blocking · 6 Major (all fixed) · 6 Minor (deferred) · 4 Nitpick (deferred)  
**Exit criteria:** 407 tests · TypeScript clean · all Major QA findings resolved  
**Docs:** `docs/SPRINT_6_COMPLETION_REPORT.md` · `docs/SPRINT_6_QA_REPORT.md` · `docs/SPRINT_6_FIX_REPORT.md` · `docs/SPRINT_6_RETROSPECTIVE.md`

### ~~Sprint 7 (Weeks 19–22) — Reviews, Discipline Score, Infra Hardening~~ ✅ CLOSED 2026-06-03
**Goal:** Close remaining P1 items; fix TD-002 (CRITICAL); harden infrastructure; start P3 testing backlog.

| Task | Effort | Owner | Status |
|---|---|---|---|
| TASK-031 — Edit/Delete in ReviewDetailPanel | M | FE | ✅ DONE |
| TASK-011 — Extract `computeDisciplineScore` | S | BE | ✅ DONE (TD-002 closed) |
| `lib/rate-limiter.ts` + Upstash abstraction | M | BE | ✅ DONE (TD-033 closed) |
| TD-031 — `serializeAccount` on mutations | XS | BE | ✅ DONE |
| Review URL persistence | S | FE | ✅ DONE |
| TASK-051 — Custom tags management | M | BE/FE | ✅ DONE |
| TD-029 — Guard `CYCLE.includes` on DB prefs cast | XS | FE | ✅ DONE |
| TD-030 — Rate limiter boundary `>=` | XS | BE | ✅ DONE |
| TD-032 — `Prisma.Decimal` in accounts test mock | XS | QA | ✅ DONE |
| TASK-073 — Rolling metrics (7d window) | M | BE/FE | ✅ DONE |
| TASK-064 — Setup health score in Playbook | S | BE/FE | ✅ DONE |
| TASK-058 — Reliable embedding via webhook | M | BE | ✅ DONE (TD-020 closed) |
| TASK-060 — Structured logger `lib/logger.ts` | S | BE | ✅ DONE |
| TASK-021 — Activate analytics cache | XS | DevOps | ⏭ Deferred to Sprint 8 |
| TASK-024 — RTL component tests | L | QA | ⏭ Deferred to Sprint 8 |
| TASK-025 — Playwright e2e tests | L | QA | ⏭ Deferred to Sprint 8 |

**QA Audit (independent):** 2 Blocking (IDOR + DoS) · 4 Major (all fixed) · 4 Minor (deferred) · 5 Nitpick (deferred)  
**Exit criteria:** 438 tests · TypeScript clean · all Blocking + Major QA findings resolved  
**Docs:** `docs/SPRINT_7_COMPLETION_REPORT.md` · `docs/SPRINT_7_QA_REPORT.md` · `docs/SPRINT_7_FIX_REPORT.md` · `docs/SPRINT_7_RETROSPECTIVE.md`

---

## Definition of Done

A task is **Done** when:
1. Code is merged to main branch
2. No TypeScript errors (`tsc --noEmit` passes)
3. No ESLint suppressions added (`eslint-disable` count does not increase)
4. Unit test added or updated for any pure function or business logic change
5. No new `as never` or `as unknown as` casts introduced
6. Product behavior matches acceptance criteria (verified by PR author)
7. Relevant documentation updated (this backlog status → DONE; architecture.md if applicable)

For schema migrations:
- Migration tested on Supabase branch before applying to production
- `schema.prisma` updated to reflect actual DB state

---

## Metrics to Track

| Metric | Baseline | After Sprint 1 | Target (Sprint 8) |
|---|---|---|---|
| P0 bugs open | 10 | 3 | 0 |
| `as never` count in app code | 15+ | 15+ | 0 |
| Win rate calculation sites | 8 | 1 | 1 |
| Discipline score implementations | 3 | 3 | 1 |
| Profile fields persisted | 0/14 | 0/14 | 14/14 |
| Pages with >1000 LOC | 4 | 4 | 0 |
| Tests passing | 229/232 | 232/232 | 232+ |
| Test files | 11 (unit only) | 15 (unit only) | 20+ (unit + RTL + e2e) |
| eslint-disable count | Unknown | Unknown | Decreasing sprint-over-sprint |
| Dashboard load time (500 trades) | ~1500ms | ~1500ms | <200ms |
