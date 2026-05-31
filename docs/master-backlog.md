# Master Backlog — Trading Journal v2

> **Generated:** 2026-05-31  
> **Sources:** repository-audit-report · product-gap-analysis · feature-opportunities · ai-architecture-recommendations · personalization-roadmap · ux-improvement-roadmap  
> **ID range:** TASK-001 – TASK-053 (TASK-001–026 from audit report; TASK-027–053 are new)

---

## Complete Task Table

| ID | Title | Module | Priority | Effort | Dependencies | Status |
|---|---|---|---|---|---|---|
| TASK-001 | Fix KPI strip calculated over paginated trade data | analytics | P0 | S | — | TODO |
| TASK-002 | Fix `objectiveMet = false` hardcoded in phase promotion | accounts | P0 | XS | — | TODO |
| TASK-003 | Replace `throw new Error()` with `TRPCError` in accounts.changeStatus | accounts | P0 | XS | — | TODO |
| TASK-004 | Calculate `rMultiple` in MT4/cTrader CSV import | trades | P0 | XS | — | TODO |
| TASK-005 | Unify win criterion (`pnl > 0`) across all calculation sites | formulas | P0 | XS | TASK-027 | TODO |
| TASK-006 | Implement profile backend (tRPC router + page) | profile | P0 | L | — | TODO |
| TASK-007 | Move MASTERED→IN_REVIEW side-effect from `stats` query to mutation | learning | P1 | S | — | TODO |
| TASK-008 | Fix N+1 query in `resourceImpactRanking` | learning | P1 | M | — | TODO |
| TASK-009 | Fix weekTrades and account stats based on first 50 trades only | analytics | P0 | S | — | TODO |
| TASK-010 | Connect "Ver registro →" button in Disciplina tab | ux | P1 | XS | — | TODO |
| TASK-011 | Extract `computeDisciplineScore` as shared function | formulas | P2 | S | TASK-027 | TODO |
| TASK-012 | Implement sparklines of equity per setup in Playbook | playbook | P2 | M | — | TODO |
| TASK-013 | Eliminate 15+ `as never` casts in trades/page.tsx | types | P2 | M | — | TODO |
| TASK-014 | Unify `LearningResource` type with RouterOutputs | types | P2 | S | — | TODO |
| TASK-015 | Update stale AI model IDs in config | ai | P1 | XS | — | TODO |
| TASK-016 | Harden CRON_SECRET check in edge function | security | P0 | XS | — | TODO |
| TASK-017 | Server-side validation for Storage image uploads | security | P0 | S | — | TODO |
| TASK-018 | Deprecate dead `trades.stats` procedure | trades | P2 | XS | — | TODO |
| TASK-019 | Add `notes_embedding` and `email_log` to Prisma schema | infra | P3 | S | — | TODO |
| TASK-054 | Fix SQL injection pattern in `ai-embed/route.ts` (use `Prisma.sql`) | security | P0 | XS | — | TODO |
| TASK-055 | Add rate limiting to all AI endpoints (AiUsageLog token bucket) | security | P1 | M | — | TODO |
| TASK-056 | Implement `useCurrency()` hook to propagate `baseCurrency` across app | formulas | P1 | S | TASK-006 | TODO |
| TASK-057 | Fix hardcoded "New York" timezone in CSV import session | trades | P1 | XS | — | TODO |
| TASK-058 | Replace fire-and-forget embedding with reliable DB webhook or queue | ai | P1 | M | — | TODO |
| TASK-059 | Create `.env.example` with all required variable names and descriptions | infra | P1 | XS | — | TODO |
| TASK-060 | Structured logger (`lib/logger.ts`) replacing all `console.error` calls | infra | P1 | S | — | TODO |
| TASK-061 | Auto-save with debounce in weekly review modal | reviews | P2 | S | — | TODO |
| TASK-062 | Surface Sharpe Ratio as KPI card on analytics dashboard | analytics | P2 | S | TASK-027 | TODO |
| TASK-063 | Psychology summary widget inside weekly review modal | psychology | P2 | M | TASK-034 | TODO |
| TASK-064 | Setup health score indicator in Playbook (green/yellow/red signal) | playbook | P2 | S | — | TODO |
| TASK-065 | Extract coach-service.ts from route handler to `domains/ai/services/` | ai | P2 | M | — | TODO |
| TASK-066 | Fix `phasePayload as never` type cast in accounts router (TD-012) | types | P2 | XS | — | TODO |
| TASK-067 | Optimize tRPC per-request JWT header parsing (TD-019) | infra | P2 | S | — | TODO |
| TASK-068 | CSV import column-mapping preferences UI | trades | P2 | M | TASK-030 | TODO |
| TASK-069 | Week selector date picker for review periods older than 6 weeks | reviews | P2 | XS | — | TODO |
| TASK-070 | Accessibility pass: `prefers-reduced-motion`, `aria-live`, `role="radiogroup"`, WCAG contrast | ux | P2 | M | — | TODO |
| TASK-071 | Monthly review model + `createMonthly` tRPC procedure | reviews | P2 | L | TASK-006 | TODO |
| TASK-072 | Calendar heatmap for daily P&L (recharts, analytics page) | analytics | P2 | M | — | TODO |
| TASK-073 | Rolling metrics dashboard (7d / 30d / 90d windows) | analytics | P2 | M | — | TODO |
| TASK-074 | Pre-trade planning field (`planNotes`) on Trade model and form | psychology | P2 | S | — | TODO |
| TASK-075 | Daily loss limit push/email alert via Resend | accounts | P1 | S | TASK-006 | TODO |
| TASK-076 | CI/CD GitHub Actions pipeline (lint → typecheck → test → deploy) | infra | P2 | M | — | TODO |
| TASK-077 | PWA: manifest.json + basic service worker (offline shell) | mobile | P3 | M | — | TODO |
| TASK-078 | PDF performance report export | infra | P3 | L | — | TODO |
| TASK-020 | Implement cursor pagination in `accountLogs.list` | accounts | P3 | S | — | TODO |
| TASK-021 | Activate and document `ANALYTICS_CACHE_ENABLED` for production | infra | P3 | XS | — | TODO |
| TASK-022 | Configure verified email domain in Resend | infra | P3 | XS | — | TODO |
| TASK-023 | Type `market: any` in MarketCard and `amount: any` in Retiros | types | P3 | XS | — | TODO |
| TASK-024 | Add React Testing Library component tests | testing | P3 | L | — | TODO |
| TASK-025 | Add Playwright e2e smoke tests | testing | P3 | L | — | TODO |
| TASK-026 | Fix error message mismatch in `ai-coach/route.ts:106` | ai | P3 | XS | — | TODO |
| TASK-027 | Centralize financial formulas in `lib/trading-formulas.ts` | formulas | P0 | M | — | TODO |
| TASK-028 | Fix misleading "Drawdown" label on trades KPI strip | formulas | P0 | XS | — | TODO |
| TASK-029 | Fix inconsistent drawdown calculation in `use-account-stats.ts` | formulas | P0 | XS | — | TODO |
| TASK-030 | Implement `UserPreferences` table and router | profile | P1 | M | TASK-006 | TODO |
| TASK-031 | Add Edit and Delete buttons to ReviewDetailPanel | reviews | P1 | M | — | TODO |
| TASK-032 | Update stale AI model IDs in config (coach + summary) | ai | P1 | XS | — | TODO |
| TASK-033 | Implement AI configuration UI and `UserAiConfig` table | ai | P1 | L | TASK-006, TASK-032 | TODO |
| TASK-034 | Add per-trade psychology fields to Trade model | psychology | P1 | M | — | TODO |
| TASK-035 | Implement toast notification system | ux | P1 | M | — | TODO |
| TASK-036 | Fix dead "Ver registro →" button in Disciplina tab | ux | P1 | XS | — | TODO |
| TASK-037 | Fix `generateSummary` HTTP 200 on failure | reviews | P1 | XS | TASK-035 | TODO |
| TASK-038 | Fix `learningResources.stats` CQRS violation | learning | P1 | S | — | TODO |
| TASK-039 | Fix N+1 query in `resourceImpactRanking` | learning | P1 | M | — | TODO |
| TASK-040 | Add mobile back navigation to detail panels | mobile | P1 | S | — | TODO |
| TASK-041 | Add `inputmode="decimal"` to price inputs in trade form | mobile | P2 | XS | — | TODO |
| TASK-042 | Add skeleton screens for KPI strip, trade table, account cards | ux | P2 | M | — | TODO |
| TASK-043 | Add empty states for Cuentas, Trades, Playbook, Mercados | ux | P2 | M | — | TODO |
| TASK-044 | Fix `window.location.reload()` in error boundaries | ux | P2 | XS | — | TODO |
| TASK-045 | Three-way theme toggle (add "system" mode) | personalization | P2 | S | TASK-006 | TODO |
| TASK-046 | Accent color picker and colorblind mode | personalization | P2 | M | TASK-006 | TODO |
| TASK-047 | Persist dashboard tab and chart grain | personalization | P2 | XS | — | TODO |
| TASK-048 | Weekly review filtering and search | reviews | P2 | M | — | TODO |
| TASK-049 | Playbook sparklines with real equity data | playbook | P2 | M | — | TODO |
| TASK-050 | Goal setting and dashboard widget | personalization | P2 | M | TASK-006 | TODO |
| TASK-051 | Custom tags management UI | personalization | P2 | M | TASK-006 | TODO |
| TASK-052 | Onboarding checklist widget for new users | ux | P2 | M | TASK-006 | TODO |
| TASK-053 | Multi-account portfolio dashboard | analytics | P3 | XL | TASK-019 | TODO |

---

## Tasks by Module

### formulas
Core financial formula unification. All 5 tasks here should be treated as a single coordinated effort.
- **TASK-027** — Create `lib/trading-formulas.ts` as single source of truth for all financial calculations
- **TASK-005** — Unify win criterion `pnl > 0` (depends on TASK-027 for `isWin` helper)
- **TASK-028** — Fix "Drawdown" KPI label on trades page (misleading "peor día")
- **TASK-029** — Fix current-DD vs max-DD confusion in `use-account-stats.ts`
- **TASK-011** — Extract shared `computeDisciplineScore` function (completes formula centralization)

### analytics
Server-side computation and KPI correctness.
- **TASK-001** — Fix KPI strip using paginated trade data (max 50)
- **TASK-009** — Fix weekTrades and account stats using paginated trade data
- **TASK-053** — Multi-account portfolio dashboard (P3, long-term)

### accounts
Prop-firm account management correctness.
- **TASK-002** — Fix `objectiveMet = false` hardcoded in phase promotion modal
- **TASK-003** — Replace `throw new Error()` with `TRPCError` in accounts.changeStatus
- **TASK-020** — Cursor pagination for `accountLogs.list` (P3)

### trades
Trade CRUD and import correctness.
- **TASK-004** — Calculate `rMultiple` on CSV import
- **TASK-018** — Deprecate dead `trades.stats` procedure

### profile
The entire settings/personalization surface depends on this module being functional.
- **TASK-006** — Implement profile backend (tRPC router, all procedures) — P0, unblocks 7 tasks
- **TASK-030** — Implement `UserPreferences` table for all UI personalization (depends TASK-006)

### ai
AI coach, embeddings, and multi-provider configuration.
- **TASK-015** / **TASK-032** — Update stale model IDs (same task, consolidated as TASK-032)
- **TASK-033** — Full AI config UI with per-user keys, model selection, connectivity test
- **TASK-026** — Fix error message mismatch in ai-coach route

### reviews
Weekly review creation, editing, and analysis.
- **TASK-009** — Fix week-trade stats based on paginated data (shared with analytics)
- **TASK-031** — Add Edit and Delete to ReviewDetailPanel
- **TASK-037** — Fix generateSummary HTTP 200 on failure
- **TASK-048** — Review list filtering and search

### learning
Learning resources module quality and performance.
- **TASK-007** / **TASK-038** — Fix CQRS violation in `stats` procedure (consolidated as TASK-038)
- **TASK-008** / **TASK-039** — Fix N+1 query in `resourceImpactRanking` (consolidated as TASK-039)
- **TASK-014** — Unify `LearningResource` type with RouterOutputs

### psychology
Per-trade behavioral and emotional tracking.
- **TASK-034** — Add structured psychology fields to Trade model (emotionBefore, fomoFlag, revengeFlag, confidenceRating, executionQuality)

### playbook
Setup management and analytics.
- **TASK-012** / **TASK-049** — Playbook setup sparklines with real equity data (consolidated as TASK-049)

### security
Hardening of endpoints and storage.
- **TASK-016** — Harden CRON_SECRET check in edge function
- **TASK-017** — Server-side validation for Supabase Storage image uploads

### ux
User experience, feedback, and interaction quality.
- **TASK-010** / **TASK-036** — Fix dead "Ver registro →" button (consolidated as TASK-036)
- **TASK-035** — Toast notification system
- **TASK-040** — Mobile back navigation for detail panels
- **TASK-041** — `inputmode="decimal"` on price inputs
- **TASK-042** — Skeleton screens for loading states
- **TASK-043** — Empty states for 4 pages
- **TASK-044** — Fix `window.location.reload()` in error boundary
- **TASK-052** — Onboarding checklist widget

### personalization
Theme, colors, layout, and preferences persistence.
- **TASK-045** — Three-way theme toggle (add "system" mode)
- **TASK-046** — Accent color picker and colorblind mode
- **TASK-047** — Persistent dashboard tab and chart grain
- **TASK-050** — Goal setting and dashboard widget
- **TASK-051** — Custom tags management UI

### types
TypeScript correctness and type safety.
- **TASK-013** — Eliminate 15+ `as never` casts in trades/page.tsx
- **TASK-023** — Type `market: any` and `amount: any` props

### infra
Schema, infrastructure, and observability.
- **TASK-019** — Add `notes_embedding` and `email_log` to Prisma schema
- **TASK-021** — Activate `ANALYTICS_CACHE_ENABLED` in production
- **TASK-022** — Configure verified email domain in Resend

### testing
Automated test coverage.
- **TASK-024** — React Testing Library component tests
- **TASK-025** — Playwright e2e smoke tests

---

## Sprint Planning

### Sprint 1 (Weeks 1–2) — P0 Bugs and Security
**Goal:** Eliminate all data-integrity bugs and security risks. All metrics must be accurate.

| Task | Effort | Owner |
|---|---|---|
| TASK-003 — TRPCError in accounts.changeStatus | XS | BE |
| TASK-026 — Fix ai-coach error message | XS | BE |
| TASK-016 — Harden CRON_SECRET | XS | BE |
| TASK-002 — Fix phase promotion objectiveMet | XS | FE |
| TASK-004 — rMultiple on CSV import | XS | BE |
| TASK-028 — Fix drawdown label | XS | FE |
| TASK-029 — Fix use-account-stats drawdown | XS | FE |
| TASK-027 — Centralize formulas (trading-formulas.ts) | M | BE |
| TASK-005 — Unify win criterion | XS | BE |
| TASK-017 — Server-side upload validation | S | BE |

**Sprint 1 exit criteria:** No incorrect metrics on any page. No security bypass possible on edge function or Storage.

---

### Sprint 2 (Weeks 3–4) — Data Correctness and Critical UX
**Goal:** Fix remaining data bugs; ship quick UX wins.

| Task | Effort | Owner |
|---|---|---|
| TASK-001 — Fix KPI strip over paginated data | S | BE/FE |
| TASK-009 — Fix weekTrades and account stats | S | BE/FE |
| TASK-036 — Fix dead "Ver registro →" button | XS | FE |
| TASK-037 — Fix generateSummary error handling | XS | BE |
| TASK-044 — Fix window.reload() in error boundary | XS | FE |
| TASK-038 — Fix CQRS violation in learningResources.stats | S | BE |
| TASK-039 — Fix N+1 in resourceImpactRanking | M | BE |
| TASK-032 — Update AI model IDs | XS | BE |

---

### Sprint 3 (Weeks 5–7) — Profile Backend (Unblocks 7 Tasks)
**Goal:** Ship the profile backend. This is the longest single task and unblocks the entire personalization phase.

| Task | Effort | Owner |
|---|---|---|
| TASK-006 — Profile backend (tRPC router + page) | L | BE/FE |
| TASK-035 — Toast notification system | M | FE |
| TASK-040 — Mobile back navigation | S | FE |
| TASK-041 — inputmode decimal on price inputs | XS | FE |

---

### Sprint 4 (Weeks 8–10) — Reviews, Psychology, Personalization Foundation
**Goal:** Complete high-value P1 features that depend on Sprint 3 being done.

| Task | Effort | Owner |
|---|---|---|
| TASK-030 — UserPreferences table and router | M | BE |
| TASK-031 — Edit/Delete for ReviewDetailPanel | M | FE |
| TASK-034 — Per-trade psychology fields | M | BE/FE |
| TASK-047 — Persist dashboard tab and chart grain | XS | FE |
| TASK-045 — Three-way theme toggle | S | FE |
| TASK-011 — Shared computeDisciplineScore | S | BE |

---

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

---

### Sprint 6 (Weeks 15–18) — Personalization and Playbook
**Goal:** Complete personalization features; playbook real data; reviews filter.

| Task | Effort | Owner |
|---|---|---|
| TASK-046 — Accent color + colorblind mode | M | FE |
| TASK-048 — Review filtering and search | M | BE/FE |
| TASK-049 — Playbook sparklines with real data | M | FE |
| TASK-050 — Goal setting + dashboard widget | M | BE/FE |
| TASK-051 — Custom tags management | M | BE/FE |
| TASK-052 — Onboarding checklist | M | FE |

---

### Sprint 7 (Weeks 19–22) — Infrastructure, Testing, P3 Backlog
**Goal:** Infra hardening, test coverage, begin long-term features.

| Task | Effort | Owner |
|---|---|---|
| TASK-019 — Prisma schema sync | S | BE |
| TASK-020 — AccountLogs cursor pagination | S | BE |
| TASK-021 — Activate analytics cache | XS | DevOps |
| TASK-022 — Verified email domain | XS | DevOps |
| TASK-024 — RTL component tests | L | QA |
| TASK-025 — Playwright e2e tests | L | QA |
| TASK-053 — Portfolio dashboard (start) | XL | BE/FE |

---

### Sprint 8 (Weeks 23–25) — Security Hardening and Observability

**Goal:** Close the SQL injection gap in the AI embed route; add rate limiting so AI API costs are bounded; install structured logging so future debugging is possible.

| Task | Effort | Owner |
|---|---|---|
| TASK-054 — Fix SQL injection in ai-embed route | XS | BE |
| TASK-055 — Rate limiting on AI endpoints | M | BE |
| TASK-059 — Create `.env.example` | XS | DevOps |
| TASK-060 — Structured logger `lib/logger.ts` | S | BE |
| TASK-058 — Reliable embedding via DB webhook/queue | M | BE |
| TASK-076 — CI/CD GitHub Actions pipeline | M | DevOps |

**Sprint 8 exit criteria:** Zero unparameterized raw SQL in AI paths. All AI endpoints enforce per-user token quotas. Deployment pipeline runs lint + typecheck + test before merge.

---

### Sprint 9 (Weeks 26–28) — Data Correctness: Currency, Timezone, Formula Additions

**Goal:** Fix international trader blockers; add missing KPIs; close TD-012 and TD-019.

| Task | Effort | Owner |
|---|---|---|
| TASK-057 — Fix hardcoded "New York" timezone in CSV import | XS | BE |
| TASK-056 — `useCurrency()` hook for baseCurrency propagation | S | FE |
| TASK-062 — Sharpe Ratio KPI card on analytics dashboard | S | BE/FE |
| TASK-072 — Calendar heatmap (daily P&L) | M | FE |
| TASK-073 — Rolling metrics 7d/30d/90d dashboard | M | BE/FE |
| TASK-066 — Fix `phasePayload as never` (TD-012) | XS | BE |
| TASK-067 — Optimize tRPC per-request JWT parsing (TD-019) | S | BE |

---

### Sprint 10 (Weeks 29–32) — Psychology Depth, Reviews, Accessibility

**Goal:** Complete the psychology data model; add review UX improvements; close the accessibility deficit.

| Task | Effort | Owner |
|---|---|---|
| TASK-074 — Pre-trade planning field on Trade model | S | BE/FE |
| TASK-063 — Psychology widget in weekly review modal | M | FE |
| TASK-061 — Auto-save with debounce in review modal | S | FE |
| TASK-069 — Week selector date picker for old review periods | XS | FE |
| TASK-071 — Monthly review model + createMonthly procedure | L | BE/FE |
| TASK-070 — Accessibility pass (WCAG, aria, reduced-motion) | M | FE |

---

### Sprint 11 (Weeks 33–36) — Playbook Intelligence and AI Extraction

**Goal:** Raise Playbook from display to actionable intelligence; refactor AI code to domain layer.

| Task | Effort | Owner |
|---|---|---|
| TASK-064 — Setup health score in Playbook | S | BE/FE |
| TASK-065 — Extract coach-service.ts to domains/ai/services/ | M | BE |
| TASK-068 — CSV import column-mapping preferences | M | BE/FE |
| TASK-075 — Daily loss limit push/email alert | S | BE |

---

### Sprint 12 (Weeks 37–40) — P3 Features and Long-horizon Items

**Goal:** PWA baseline; data export; portfolio view; tax groundwork.

| Task | Effort | Owner |
|---|---|---|
| TASK-077 — PWA manifest.json + service worker | M | FE |
| TASK-078 — PDF performance report export | L | BE/FE |
| TASK-053 — Multi-account portfolio dashboard (continue) | XL | BE/FE |

---

## EXECUTION_TASKS Reconciliation Note

`docs/EXECUTION_TASKS.md` uses an independent TASK-001–032 numbering scheme that **does not align** with this file's TASK-001–078 sequence. The mapping below resolves the conflict for the items that were unique to EXECUTION_TASKS and are now promoted to this backlog.

| EXECUTION_TASKS ID | Description | master-backlog equivalent |
|---|---|---|
| EXEC TASK-001 | Canonical formulas module | TASK-027 |
| EXEC TASK-005 | SQL injection in ai-embed | **TASK-054** (new) |
| EXEC TASK-008 | useCurrency() hook | **TASK-056** (new) |
| EXEC TASK-021 | Auto-save debounce in review modal | **TASK-061** (new) |
| EXEC TASK-026 | Sharpe Ratio in analytics | **TASK-062** (new) |
| EXEC TASK-027 | Rate limiting on AI endpoints | **TASK-055** (new) |
| EXEC TASK-028 | Psychology widget in weekly review | **TASK-063** (new) |
| EXEC TASK-030 | PWA manifest + service worker | **TASK-077** (new) |
| EXEC TASK-031 | Setup health score in Playbook | **TASK-064** (new) |
| EXEC TASK-032 | Extract coach-service.ts | **TASK-065** (new) |

All other EXECUTION_TASKS items (EXEC TASK-002, 003, 004, 006, 007, 009–020, 022–025, 029) map to existing TASK-001–053 entries. EXECUTION_TASKS.md should be considered superseded by this file for sprint planning purposes.
