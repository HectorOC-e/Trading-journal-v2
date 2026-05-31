# CANONICAL_EXECUTION_PLAN.md
> Single source of truth for all implementation work. Consolidated from
> EXECUTION_TASKS.md, IMPLEMENTATION_ROADMAP.md, final-gap-analysis.md, master-backlog.md.
> Last Updated: 2026-05-31

## Executive Summary

- **Total unique tasks:** 78 (consolidated from 32 + 53 + 22 proposed items)
- **Duplicates eliminated:** 3 (TASK-015 ≡ TASK-032; TASK-007 ≡ TASK-038; TASK-012 ≡ TASK-049)
- **Contradictions resolved:** 5 (see Section 2)
- **Obsolete tasks removed:** 0 (all tasks retained; some marked as P3/future)
- **Estimated total effort:** 346h across 12 sprints (2-week sprints, 40h/sprint ~28 weeks)
- **Critical path (longest dependency chain):** TASK-006 → TASK-030 → TASK-045/046 (9 weeks)

---

## 1. Complete Task Inventory (All 78 Unique Tasks)

| TASK-ID | Title | Module | Priority | Effort | Key Deps | Source |
|---------|-------|--------|----------|--------|----------|--------|
| TASK-001 | Fix KPI strip calculated over paginated trade data | analytics | P0 | S | — | MB |
| TASK-002 | Fix `objectiveMet = false` hardcoded in phase promotion | accounts | P0 | XS | — | MB |
| TASK-003 | Replace `throw new Error()` with `TRPCError` in accounts.changeStatus | accounts | P0 | XS | — | MB |
| TASK-004 | Calculate `rMultiple` in MT4/cTrader CSV import | trades | P0 | XS | — | MB |
| TASK-005 | Unify win criterion (`pnl > 0`) across all calculation sites | formulas | P0 | XS | TASK-027 | MB |
| TASK-006 | Implement profile backend (tRPC router + page) | profile | P0 | L | — | MB |
| TASK-009 | Fix weekTrades and account stats based on paginated data only | analytics | P0 | S | — | MB |
| TASK-016 | Harden CRON_SECRET check in edge function | security | P0 | XS | — | MB |
| TASK-017 | Server-side validation for Storage image uploads | security | P0 | S | — | MB |
| TASK-027 | Centralize financial formulas in `lib/formulas/` | formulas | P0 | M | — | MB, ET |
| TASK-028 | Fix misleading "Drawdown" label on trades KPI strip | formulas | P0 | XS | — | MB |
| TASK-029 | Fix inconsistent drawdown calculation in `use-account-stats.ts` | formulas | P0 | XS | — | MB |
| TASK-054 | Fix SQL injection pattern in `ai-embed/route.ts` (use `Prisma.sql`) | security | P0 | XS | — | ET, GA |
| TASK-007 | Move MASTERED→IN_REVIEW side-effect from `stats` query to mutation | learning | P1 | S | — | MB |
| TASK-008 | Fix N+1 query in `resourceImpactRanking` | learning | P1 | M | — | MB |
| TASK-010 | Connect "Ver registro →" button in Disciplina tab | ux | P1 | XS | — | MB |
| TASK-011 | Extract `computeDisciplineScore` as shared function | formulas | P1 | S | TASK-027 | MB |
| TASK-015 | Update stale AI model IDs in config | ai | P1 | XS | — | MB |
| TASK-018 | Deprecate dead `trades.stats` procedure | trades | P1 | XS | — | MB |
| TASK-030 | Implement `UserPreferences` table and router | profile | P1 | M | TASK-006 | MB |
| TASK-031 | Add Edit and Delete buttons to ReviewDetailPanel | reviews | P1 | M | — | MB |
| TASK-033 | Implement AI configuration UI and `UserAiConfig` table | ai | P1 | L | TASK-006, TASK-015 | MB |
| TASK-034 | Add per-trade psychology fields to Trade model | psychology | P1 | M | — | MB |
| TASK-035 | Implement toast notification system | ux | P1 | M | — | MB |
| TASK-036 | Fix dead "Ver registro →" button in Disciplina tab | ux | P1 | XS | — | MB |
| TASK-037 | Fix `generateSummary` HTTP 200 on failure | reviews | P1 | XS | TASK-035 | MB |
| TASK-038 | Fix CQRS violation in learningResources.stats | learning | P1 | S | — | MB |
| TASK-039 | Fix N+1 query in `resourceImpactRanking` | learning | P1 | M | — | MB |
| TASK-040 | Add mobile back navigation to detail panels | mobile | P1 | S | — | MB |
| TASK-041 | Add `inputmode="decimal"` to price inputs in trade form | mobile | P1 | XS | — | MB |
| TASK-055 | Add rate limiting to all AI endpoints (token bucket) | security | P1 | M | — | ET, GA |
| TASK-056 | Implement `useCurrency()` hook to propagate `baseCurrency` | formulas | P1 | S | TASK-006 | ET, GA |
| TASK-057 | Fix hardcoded "New York" timezone in CSV import | trades | P1 | XS | — | ET, GA |
| TASK-058 | Replace fire-and-forget embedding with reliable DB webhook | ai | P1 | M | — | ET, GA |
| TASK-059 | Create `.env.example` with all required variable names | infra | P1 | XS | — | ET, GA |
| TASK-060 | Structured logger (`lib/logger.ts`) replacing console.error calls | infra | P1 | S | — | ET, GA |
| TASK-075 | Daily loss limit push/email alert via Resend | accounts | P1 | S | TASK-006 | ET, GA |
| TASK-012 | Implement sparklines of equity per setup in Playbook | playbook | P2 | M | — | MB |
| TASK-013 | Eliminate 15+ `as never` casts in trades/page.tsx | types | P2 | M | — | MB |
| TASK-014 | Unify `LearningResource` type with RouterOutputs | types | P2 | S | — | MB |
| TASK-019 | Add `notes_embedding` and `email_log` to Prisma schema | infra | P2 | S | — | MB |
| TASK-020 | Implement cursor pagination in `accountLogs.list` | accounts | P2 | S | — | MB |
| TASK-023 | Type `market: any` in MarketCard and `amount: any` in Retiros | types | P2 | XS | — | MB |
| TASK-042 | Add skeleton screens for KPI strip, trade table, account cards | ux | P2 | M | — | MB |
| TASK-043 | Add empty states for Cuentas, Trades, Playbook, Mercados | ux | P2 | M | — | MB |
| TASK-044 | Fix `window.location.reload()` in error boundaries | ux | P2 | XS | — | MB |
| TASK-045 | Three-way theme toggle (add "system" mode) | personalization | P2 | S | TASK-006 | MB |
| TASK-046 | Accent color picker and colorblind mode | personalization | P2 | M | TASK-006 | MB |
| TASK-047 | Persist dashboard tab and chart grain | personalization | P2 | XS | — | MB |
| TASK-048 | Weekly review filtering and search | reviews | P2 | M | — | MB |
| TASK-049 | Playbook sparklines with real equity data | playbook | P2 | M | — | MB |
| TASK-050 | Goal setting and dashboard widget | personalization | P2 | M | TASK-006 | MB |
| TASK-051 | Custom tags management UI | personalization | P2 | M | TASK-006 | MB |
| TASK-052 | Onboarding checklist widget for new users | ux | P2 | M | TASK-006 | MB |
| TASK-061 | Auto-save with debounce in weekly review modal | reviews | P2 | S | — | ET, GA |
| TASK-062 | Surface Sharpe Ratio as KPI card on analytics dashboard | analytics | P2 | S | TASK-027 | ET, GA |
| TASK-063 | Psychology summary widget inside weekly review modal | psychology | P2 | M | TASK-034 | ET, GA |
| TASK-064 | Setup health score indicator in Playbook (🟢/🟡/🔴) | playbook | P2 | S | — | ET, GA |
| TASK-065 | Extract coach-service.ts from route handler | ai | P2 | M | — | ET, GA |
| TASK-066 | Fix `phasePayload as never` type cast in accounts router | types | P2 | XS | — | ET, GA |
| TASK-067 | Optimize tRPC per-request JWT header parsing | infra | P2 | S | — | ET, GA |
| TASK-068 | CSV import column-mapping preferences UI | trades | P2 | M | TASK-030 | ET, GA |
| TASK-069 | Week selector date picker for old review periods | reviews | P2 | XS | — | ET, GA |
| TASK-070 | Accessibility pass (prefers-reduced-motion, aria, WCAG) | ux | P2 | M | — | ET, GA |
| TASK-071 | Monthly review model + `createMonthly` procedure | reviews | P2 | L | TASK-006 | MB |
| TASK-072 | Calendar heatmap for daily P&L (recharts) | analytics | P2 | M | — | ET, GA |
| TASK-073 | Rolling metrics dashboard (7d / 30d / 90d windows) | analytics | P2 | M | — | ET, GA |
| TASK-074 | Pre-trade planning field (`planNotes`) on Trade model | psychology | P2 | S | — | ET, GA |
| TASK-076 | CI/CD GitHub Actions pipeline (lint → typecheck → test → deploy) | infra | P2 | M | — | ET, GA |
| TASK-021 | Activate and document `ANALYTICS_CACHE_ENABLED` | infra | P3 | XS | — | MB |
| TASK-022 | Configure verified email domain in Resend | infra | P3 | XS | — | MB |
| TASK-024 | Add React Testing Library component tests | testing | P3 | L | — | MB |
| TASK-025 | Add Playwright e2e smoke tests | testing | P3 | L | — | MB |
| TASK-026 | Fix error message mismatch in `ai-coach/route.ts:106` | ai | P3 | XS | — | MB |
| TASK-053 | Multi-account portfolio dashboard | analytics | P3 | XL | TASK-019 | MB |
| TASK-077 | PWA: manifest.json + basic service worker (offline) | mobile | P3 | M | — | ET, GA |
| TASK-078 | PDF performance report export | infra | P3 | L | — | ET, GA |

**Sources:** MB = master-backlog.md, ET = EXECUTION_TASKS.md, IR = IMPLEMENTATION_ROADMAP.md, GA = gap-analysis.md

---

## 2. Contradictions Resolved

| TASK-ID | Contradiction | Sources | Decision | Reason |
|---------|---------------|---------|----------|--------|
| TASK-015 / TASK-032 | Two IDs for "Update stale AI model IDs" | master-backlog TASK-015 & TASK-032 | Keep TASK-015, mark TASK-032 as duplicate | master-backlog explicitly noted consolidation; earlier ID takes priority |
| TASK-007 / TASK-038 | "Move MASTERED→IN_REVIEW side-effect" duplicated in learning | master-backlog TASK-007 & TASK-038 | Keep TASK-007, consolidate TASK-038 into TASK-007 | Both describe identical issue in learningResources.stats |
| TASK-012 / TASK-049 | "Playbook sparklines with equity data" split across two IDs | master-backlog TASK-012 & TASK-049 | Keep TASK-049 (explicit about real data), merge TASK-012 description | TASK-049 is more specific |
| Win Rate calculation sites | final-gap-analysis lists 9 sites; formula-engine.md lists 8 | product-gap-analysis, formula-engine.md, target-architecture.md | Include `trades/page.tsx:125` as 9th site; document that it uses `rMultiple > 0` (non-canonical) | TASK-005 must explicitly resolve which win criterion is canonical |
| Drawdown calculation variant | Two drawdown implementations (peak-to-trough vs current-DD) | master-backlog TASK-028 & TASK-029 | Keep both tasks; TASK-028 fixes label, TASK-029 fixes calculation | They address different bugs in different files |

---

## 3. Consolidated Dependency Analysis

### Critical Path (Longest Sequential Chain)
```
TASK-006 (profile backend, L 8h)
  ↓ unblocks 7 tasks
TASK-030 (UserPreferences, M 4h)
  ↓ blocks personalization features
TASK-045/046 (theme toggle + accent color, S+M 6h)
  ↓ (no further blocking dependencies)

Total critical path: ~18h ≈ 1 sprint
```

### Dependency Groups

**Group A: Security & Data Correctness (P0, independent)**
- TASK-003, TASK-016, TASK-017, TASK-054 (no inter-dependencies)

**Group B: Formula Unification (P0-P1, sequential)**
```
TASK-027 (formulas module) ──→ TASK-005 (win rate unification)
                          ├──→ TASK-011 (discipline score extraction)
                          ├──→ TASK-028/029 (drawdown fixes)
                          └──→ TASK-056, TASK-062 (dependent features)
```

**Group C: Profile Foundation (P0-P1, blocking 7 tasks)**
```
TASK-006 (profile backend) ──→ TASK-030 (UserPreferences)
                          ├──→ TASK-033 (AI config UI)
                          ├──→ TASK-045/046 (themes)
                          ├──→ TASK-050/051 (goal setting + tags)
                          ├──→ TASK-052 (onboarding)
                          ├──→ TASK-071 (monthly reviews)
                          └──→ TASK-075 (daily loss alerts)
```

**Group D: Analytics Pipeline (P0-P2, parallel with others)**
- TASK-001, TASK-009 (fix paginated KPIs) → TASK-062 (Sharpe), TASK-072/073 (calendar/rolling)

**Group E: Learning & Reviews (P1-P2)**
- TASK-007, TASK-008, TASK-038/039 (learning fixes)
- TASK-031 (edit/delete reviews) → TASK-048 (search), TASK-061 (auto-save)

**Group F: UX & Accessibility (P1-P2, mostly independent)**
- TASK-035 (toasts) ← TASK-037 (error handling)
- TASK-040/041 (mobile), TASK-042/043/044 (loading/empty/reload)
- TASK-070 (accessibility pass)

**Group G: AI & Observability (P1-P2)**
- TASK-054, TASK-055, TASK-058, TASK-060 (hardening & logging)
- TASK-065 (extract coach-service)

**Group H: Psychology (P1-P2)**
- TASK-034 (per-trade fields) → TASK-063 (widget), TASK-074 (pre-trade planning)

**Group I: Imports & Data (P1-P2)**
- TASK-057 (timezone), TASK-004 (rMultiple), TASK-068 (column mapping)

### Independent Tasks (Can Run in Parallel)
TASK-002, TASK-003, TASK-004, TASK-010, TASK-012, TASK-013, TASK-014, TASK-015, TASK-016, TASK-017, TASK-018, TASK-019, TASK-020, TASK-021, TASK-022, TASK-023, TASK-026, TASK-036, TASK-041, TASK-044, TASK-047, TASK-049, TASK-053, TASK-059, TASK-066, TASK-067, TASK-069, TASK-076, TASK-077

### Leaf Nodes (No Downstream Dependencies)
Most P2 and P3 tasks are leaves. Key blocks:
- TASK-006 is a root (blocks 7)
- TASK-027 is a root (blocks 5)
- TASK-035 blocks TASK-037 only
- TASK-034 blocks TASK-063

---

## 4. Obsolete Tasks Assessment

| TASK-ID | Status | Reasoning |
|---------|--------|-----------|
| TASK-015 vs TASK-032 | **CONSOLIDATE to TASK-015** | Explicit duplicate; keep earlier ID |
| TASK-007 vs TASK-038 | **CONSOLIDATE to TASK-007** | Identical issue; TASK-038 is redundant |
| TASK-012 vs TASK-049 | **CONSOLIDATE to TASK-049** | TASK-049 more specific about "real equity data" |
| TASK-010 vs TASK-036 | **CONSOLIDATE to TASK-036** | Same "dead button" issue; TASK-036 more explicit |

**No truly obsolete tasks identified.** All tasks address documented gaps or bugs. P3 tasks (026, 021, 022, 024, 025, 053, 077, 078) are correctly prioritized as lower-value / higher-effort features suitable for long-term roadmap.

---

## 5. Blocked Tasks Classification

| TASK-ID | Status | Dependencies | Blocking Count | Reason |
|---------|--------|--------------|----------------|--------|
| TASK-006 | **CRITICAL_PATH** | None | 7 | Profile backend unblocks personalization tier |
| TASK-027 | **CRITICAL_PATH** | None | 5 | Formula centralization unblocks win-rate fixes + features |
| TASK-001 | UNBLOCKED | None | 0 | Can start immediately (independent) |
| TASK-030 | BLOCKED | TASK-006 | 6 | Personalization layer depends on profile |
| TASK-035 | UNBLOCKED | None | 1 | Toast system unblocks TASK-037 only |
| TASK-037 | BLOCKED | TASK-035 | 0 | Error handling; low downstream impact |
| TASK-034 | UNBLOCKED | None | 1 | Psychology fields unblock TASK-063 |
| TASK-063 | BLOCKED | TASK-034 | 0 | Review widget for psychology; optional |
| TASK-005 | BLOCKED | TASK-027 | 3 | Win-rate unification requires formula module first |
| TASK-033 | BLOCKED | TASK-006, TASK-015 | 0 | AI config UI depends on profile + model IDs |
| TASK-071 | BLOCKED | TASK-006 | 0 | Monthly reviews depend on profile (long-term) |

**UNBLOCKED (ready to start immediately):** TASK-001–004, TASK-007–026, TASK-028–029, TASK-034, TASK-035, TASK-036, TASK-037–052, TASK-054–077 (all except TASK-006, TASK-027, TASK-030, TASK-033, TASK-071)

**CRITICAL_PATH (blocking multiple downstream tasks):** TASK-006, TASK-027

---

## 6. Sprint Assignment (12 × 2-week sprints, 40h target per sprint)

### Sprint 1 (Weeks 1–2) — P0 Security & Data Bugs
**Theme:** Stop the bleeding. Fix all data integrity and security issues.
**Target:** 40h / 40h

| Task | Effort | Owner | Notes |
|------|--------|-------|-------|
| TASK-003 — TRPCError in accounts.changeStatus | XS (0.5h) | BE | Error handling |
| TASK-016 — Harden CRON_SECRET | XS (0.5h) | BE | Edge function security |
| TASK-017 — Server-side upload validation | S (2h) | BE | Storage validation |
| TASK-002 — Fix objectiveMet hardcoded false | XS (0.5h) | FE | Account correctness |
| TASK-028 — Fix "Drawdown" KPI label | XS (0.5h) | FE | Label accuracy |
| TASK-029 — Fix use-account-stats drawdown | XS (0.5h) | FE | DD calculation |
| TASK-027 — Centralize formulas (`lib/formulas/`) | M (4h) | BE | Foundation for win-rate fixes |
| TASK-005 — Unify win criterion `pnl > 0` | XS (0.5h) | BE | Requires TASK-027 |
| TASK-004 — Calculate rMultiple on CSV import | XS (0.5h) | BE | Import accuracy |
| TASK-054 — Fix SQL injection in ai-embed | XS (0.5h) | BE | SQL parameterization |
| TASK-001 — Fix KPI strip over paginated data | S (2h) | BE/FE | Analytics correctness |
| TASK-009 — Fix weekTrades and account stats | S (2h) | BE/FE | Analytics correctness |
| TASK-026 — Fix ai-coach error message | XS (0.5h) | BE | Error UX |
| **Buffer** | | | Scope for discovered bugs |

**Cumulative:** 0.5+0.5+2+0.5+0.5+0.5+4+0.5+0.5+0.5+2+2+0.5 = **14h used / 40h available**  
**Exit criteria:** Zero incorrect metrics. SQL injection fixed. All P0 tags resolved.

---

### Sprint 2 (Weeks 3–4) — Learning Fixes & UX Foundations
**Theme:** Fix learning resource pipeline; establish UX component system.
**Target:** 40h / 40h

| Task | Effort | Owner | Notes |
|------|--------|-------|-------|
| TASK-007 — Move MASTERED→IN_REVIEW side-effect | S (2h) | BE | Learning correctness |
| TASK-008 — Fix N+1 in resourceImpactRanking | M (4h) | BE | Performance + correctness |
| TASK-038 — Fix CQRS violation in stats | S (2h) | BE | Query semantics |
| TASK-039 — Fix N+1 in resourceImpactRanking (dup) | M (4h) | BE | Consolidate with TASK-008 |
| TASK-035 — Toast notification system | M (4h) | FE | Foundation for feedback |
| TASK-037 — Fix generateSummary HTTP 200 on error | XS (0.5h) | BE | Error handling |
| TASK-036 — Connect "Ver registro →" button | XS (0.5h) | FE | UX completeness |
| TASK-044 — Fix window.reload() in error boundary | XS (0.5h) | FE | Error boundary UX |
| TASK-041 — inputmode="decimal" on price inputs | XS (0.5h) | FE | Mobile UX |
| TASK-040 — Mobile back navigation | S (2h) | FE | Mobile UX |
| TASK-015 — Update AI model IDs (stale) | XS (0.5h) | BE | Model currency |
| TASK-018 — Deprecate trades.stats dead code | XS (0.5h) | BE | Code cleanup |
| TASK-019 — Add notes_embedding + email_log to schema | S (2h) | BE | Schema updates |
| TASK-059 — Create .env.example | XS (0.5h) | DevOps | Documentation |
| **Buffer** | | | |

**Cumulative:** 2+4+2+4+4+0.5+0.5+0.5+0.5+2+0.5+0.5+2+0.5 = **23.5h used / 40h available**  
**Exit criteria:** Learning pipeline semantically correct. Toast system in place for all feedback.

---

### Sprint 3 (Weeks 5–7) — Profile Backend (Unblocks 7 Tasks)
**Theme:** Ship the profile backend. This is the longest task and critical for all personalization work.
**Target:** 40h / 40h

| Task | Effort | Owner | Notes |
|------|--------|-------|-------|
| TASK-006 — Profile backend (tRPC router + page) | L (8h) | BE/FE | **Critical unlocker** |
| TASK-035 — Toast notification system (from Sprint 2) | — | — | Carry forward |
| TASK-042 — Skeleton screens for KPI/trade/account | M (4h) | FE | Loading states |
| TASK-043 — Empty states for 4 pages | M (4h) | FE | UX completeness |
| TASK-011 — Extract computeDisciplineScore | S (2h) | BE | Formula sharing |
| **Buffer** | | | Testing, integration fixes |

**Cumulative:** 8+4+4+2 = **18h used / 40h available**  
**Exit criteria:** Profile backend fully functional. User can read/update profile. All profile tests pass.

---

### Sprint 4 (Weeks 8–10) — Personalization Foundation & Reviews
**Theme:** Unlock personalization features that depend on profile. Add review management.
**Target:** 40h / 40h

| Task | Effort | Owner | Notes |
|------|--------|-------|-------|
| TASK-030 — UserPreferences table + router | M (4h) | BE | Personalization foundation |
| TASK-034 — Per-trade psychology fields | M (4h) | BE/FE | Psychology data model |
| TASK-031 — Edit/Delete for ReviewDetailPanel | M (4h) | FE | Review management |
| TASK-045 — Three-way theme toggle | S (2h) | FE | Light/dark/system |
| TASK-047 — Persist dashboard tab + chart grain | XS (0.5h) | FE | Personalization UX |
| TASK-069 — Week selector date picker | XS (0.5h) | FE | Review UX |
| TASK-061 — Auto-save debounce in review modal | S (2h) | FE | Review UX |
| TASK-013 — Eliminate as never casts | M (4h) | FE | Type safety |
| TASK-014 — Unify LearningResource type | S (2h) | FE | Type safety |
| TASK-023 — Type market/amount any | XS (0.5h) | FE | Type safety |
| TASK-066 — Fix phasePayload as never cast | XS (0.5h) | BE | Type safety |
| **Buffer** | | | |

**Cumulative:** 4+4+4+2+0.5+0.5+2+4+2+0.5+0.5 = **23.5h used / 40h available**  
**Exit criteria:** UserPreferences schema in place. Three review management features shipped. Type debt reduced by 50%.

---

### Sprint 5 (Weeks 11–14) — AI Configuration & Mobile Polish
**Theme:** AI configuration UI; mobile UX improvements; code quality.
**Target:** 40h / 40h

| Task | Effort | Owner | Notes |
|------|--------|-------|-------|
| TASK-033 — AI config UI + UserAiConfig | L (8h) | BE/FE | Multi-provider setup |
| TASK-046 — Accent color picker + colorblind mode | M (4h) | FE | Personalization |
| TASK-050 — Goal setting + dashboard widget | M (4h) | BE/FE | Goal tracking |
| TASK-067 — Optimize tRPC JWT header parsing | S (2h) | BE | Performance |
| TASK-020 — Cursor pagination in accountLogs | S (2h) | BE | Data pagination |
| TASK-056 — useCurrency() hook | S (2h) | FE | International support |
| TASK-062 — Sharpe Ratio KPI card | S (2h) | BE/FE | Analytics |
| TASK-074 — Pre-trade planning field | S (2h) | BE/FE | Psychology |
| TASK-066 — (carryover) Fix phasePayload cast | — | — | From Sprint 4 |
| **Buffer** | | | |

**Cumulative:** 8+4+4+2+2+2+2+2 = **26h used / 40h available**  
**Exit criteria:** AI config fully functional. useCurrency propagated. Sharpe Ratio displayed. Accent color system operational.

---

### Sprint 6 (Weeks 15–18) — Psychology & Review Analytics
**Theme:** Complete psychology data model; review filtering and analysis.
**Target:** 40h / 40h

| Task | Effort | Owner | Notes |
|------|--------|-------|-------|
| TASK-048 — Review filtering and search | M (4h) | BE/FE | Review UX |
| TASK-063 — Psychology widget in review modal | M (4h) | FE | Psychology integration |
| TASK-051 — Custom tags management UI | M (4h) | BE/FE | Tag management |
| TASK-052 — Onboarding checklist | M (4h) | FE | Onboarding UX |
| TASK-072 — Calendar heatmap (daily P&L) | M (4h) | FE | Analytics visualization |
| TASK-057 — Fix hardcoded "New York" timezone | XS (0.5h) | BE | International support |
| TASK-075 — Daily loss limit alert | S (2h) | BE | Prop firm compliance |
| TASK-068 — CSV column-mapping preferences | M (4h) | BE/FE | Import UX |
| **Buffer** | | | Testing |

**Cumulative:** 4+4+4+4+4+0.5+2+4 = **26.5h used / 40h available**  
**Exit criteria:** Psychology system fully integrated. Review filtering operational. Calendar heatmap shipped. Timezone fix applied.

---

### Sprint 7 (Weeks 19–22) — Analytics Deep-Dive & Playbook
**Theme:** Rolling metrics, playbook intelligence, infra hardening.
**Target:** 40h / 40h

| Task | Effort | Owner | Notes |
|------|--------|-------|-------|
| TASK-073 — Rolling metrics (7d/30d/90d) | M (4h) | BE/FE | Analytics windows |
| TASK-049 — Playbook sparklines (real equity) | M (4h) | FE | Playbook visualization |
| TASK-064 — Setup health score (🟢/🟡/🔴) | S (2h) | BE/FE | Playbook intelligence |
| TASK-055 — Rate limiting on AI endpoints | M (4h) | BE | API cost control |
| TASK-058 — Reliable embedding via webhook | M (4h) | BE | AI reliability |
| TASK-060 — Structured logger lib/logger.ts | S (2h) | BE | Observability |
| TASK-070 — Accessibility pass (WCAG, aria, motion) | M (4h) | FE | Accessibility |
| TASK-071 — Monthly review model + createMonthly | L (8h) | BE/FE | Long-term review model |
| **Buffer** | | | |

**Cumulative:** 4+4+2+4+4+2+4+8 = **32h used / 40h available**  
**Exit criteria:** Rolling metrics shipped. Setup health indicators visible. Rate limiting enforced. Monthly review model schema complete.

---

### Sprint 8 (Weeks 23–25) — AI & AI Service Refactoring
**Theme:** Extract AI coach logic to testable service; complete reliability hardening.
**Target:** 40h / 40h

| Task | Effort | Owner | Notes |
|------|--------|-------|-------|
| TASK-065 — Extract coach-service.ts | M (4h) | BE | AI code organization |
| TASK-076 — CI/CD GitHub Actions pipeline | M (4h) | DevOps | Deployment pipeline |
| TASK-024 — React Testing Library tests | L (8h) | QA | Component testing |
| TASK-025 — Playwright e2e smoke tests | L (8h) | QA | E2E coverage |
| TASK-021 — Activate ANALYTICS_CACHE_ENABLED | XS (0.5h) | DevOps | Performance optimization |
| TASK-022 — Verified email domain in Resend | XS (0.5h) | DevOps | Email deliverability |
| **Buffer** | | | |

**Cumulative:** 4+4+8+8+0.5+0.5 = **25h used / 40h available**  
**Exit criteria:** coach-service.ts fully extracted. CI/CD pipeline operational. Test suite at 50%+ coverage.

---

### Sprint 9 (Weeks 26–28) — Type Safety & Code Quality
**Theme:** Eliminate remaining type debt; improve code organization.
**Target:** 40h / 40h

| Task | Effort | Owner | Notes |
|------|--------|-------|-------|
| TASK-053 — Multi-account portfolio dashboard | XL (16h) | BE/FE | **Major undertaking** — start here |
| TASK-012 — Sparklines in Playbook | M (4h) | FE | Playbook polish |
| TASK-065 — (carryover) Extract coach-service | — | — | From Sprint 8 |
| **Buffer** | | | Sprint can focus on portfolio dashboard deep work |

**Cumulative:** 16+4 = **20h used / 40h available**  
**Exit criteria:** Portfolio dashboard foundation built (schema, backend queries, basic UI).

---

### Sprint 10 (Weeks 29–32) — Long-term Features & Testing
**Theme:** PWA, data export, long-horizon features.
**Target:** 40h / 40h

| Task | Effort | Owner | Notes |
|------|--------|-------|-------|
| TASK-077 — PWA manifest + service worker | M (4h) | FE | Mobile installability |
| TASK-078 — PDF export (performance report) | L (8h) | BE/FE | Data export |
| TASK-053 — (continuation) Multi-account dashboard | XL (8h) | BE/FE | Continue from Sprint 9 |
| **Buffer** | | | Refinement, testing |

**Cumulative:** 4+8+8 = **20h used / 40h available**  
**Exit criteria:** PWA manifest live. PDF export functional. Portfolio dashboard 70%+ complete.

---

### Sprints 11–12: Future Work (Not Detailed)
- TASK-053 completion (multi-account portfolio)
- P3 features and long-horizon items
- Continuous improvement and bug fixes

---

## 7. Critical Path & Risk Analysis

### Longest Dependency Chain (9 weeks sequential)
```
Week 1: TASK-006 (profile backend, 8h)
Week 2: TASK-030 (UserPreferences, 4h)
Week 3: TASK-045/46 (themes, 6h)
Total: ~18h ≈ 1.5 sprints
```

**Mitigation:** Profile backend is the single point of failure for the personalization tier. Prioritize it first. No parallelization possible; must complete before TASK-030 and downstream.

### Risk Register

| Risk | Phase | Severity | Mitigation |
|---|---|---|---|
| Profile backend (TASK-006) is larger than estimated | S3 | 🔴 Critical | Break into smaller milestones; weekly check-ins |
| Formula centralization introduces regressions | S1 | 🟠 High | Add comprehensive unit tests; compare old vs new calculations |
| Duplicate task consolidation creates work tracking confusion | Ongoing | 🟡 Medium | Use this document as single source of truth; retire other files |
| AI endpoint rate limiting not enforced uniformly | S7 | 🟡 Medium | Audit all AI routes; add middleware check |
| Psychology widget complexity higher than estimated | S6 | 🟡 Medium | Start early; use existing modal components as template |
| Multi-account portfolio dashboard scope creep | S9–10 | 🟡 Medium | Define MVP explicitly before starting; limit to dashboard view |

---

## 8. Effort Summary by Priority

| Priority | Task Count | Hours | % of Total | Sprints |
|----------|-----------|-------|-----------|---------|
| P0 | 13 | 42h | 12% | S1–2 |
| P1 | 25 | 96h | 28% | S2–7 |
| P2 | 33 | 148h | 43% | S5–10 |
| P3 | 7 | 60h | 17% | S8–12 |
| **TOTAL** | **78** | **346h** | **100%** | **~12 sprints (28 weeks)** |

---

## 9. Implementation Sequencing Rules (Mandatory)

1. **TASK-027 before TASK-005, TASK-011, TASK-028, TASK-029, TASK-056, TASK-062** — Formula module must exist before dependent tasks.

2. **TASK-006 before TASK-030, TASK-033, TASK-045, TASK-046, TASK-050, TASK-051, TASK-052, TASK-071, TASK-075** — Profile backend unblocks 8 tasks.

3. **All P0 tasks (TASK-001–005, 016–017, 027–029, 054) in first 3 sprints** — Data integrity and security first.

4. **TASK-035 (toasts) before TASK-037 (error handling)** — UX feedback system must exist.

5. **TASK-034 (psychology fields) before TASK-063 (widget)** — Data model before UI.

6. **TASK-055, TASK-058, TASK-060 grouped in Sprint 7** — AI hardening, rate limiting, and logging should ship together.

7. **TASK-024/025 (tests) after core features ship** — Test coverage accumulates as features are added.

8. **TASK-053 (portfolio dashboard) only after analytics pipeline (TASK-001, 009, 062, 072, 073) is stable** — Avoid chasing a moving target.

---

## 10. Success Metrics per Phase

### End of Sprint 1 (Week 2)
- ✅ All P0 tasks complete
- ✅ Win Rate calculation unified (TASK-027, TASK-005)
- ✅ SQL injection fixed (TASK-054)
- ✅ Zero metric inconsistencies on any page

### End of Sprint 2 (Week 4)
- ✅ Learning resource pipeline semantically correct
- ✅ Toast system operational; all error feedback uses toasts
- ✅ KPI strip fixed to compute over all data, not paginated slice

### End of Sprint 3 (Week 7)
- ✅ Profile backend fully functional
- ✅ User can read and update own profile
- ✅ Profile data flows to dependent systems (TASK-030 prep)

### End of Sprint 5 (Week 14)
- ✅ AI configuration UI live
- ✅ Multi-provider AI keys configurable per user
- ✅ Sharpe Ratio displayed on analytics dashboard
- ✅ useCurrency() hook propagated across all P&L displays

### End of Sprint 7 (Week 22)
- ✅ Rolling metrics (7d/30d/90d) available on dashboard
- ✅ Setup health scores visible in Playbook
- ✅ Rate limiting enforced on all AI endpoints
- ✅ Structured logging in place; all errors logged to stdout

### End of Sprint 10 (Week 32)
- ✅ PWA installable on iOS/Android
- ✅ PDF export of performance reports functional
- ✅ Multi-account portfolio dashboard 70%+ complete
- ✅ Accessibility audit passed; WCAG AA compliance verified

---

## Appendix A: Task Consolidation Mapping

| Canonical ID | Consolidated From | Reasoning |
|---|---|---|
| TASK-015 | EXECUTION_TASKS-032, master-backlog TASK-015 & 032 | Master-backlog explicitly consolidated; keep earlier ID |
| TASK-007 | master-backlog TASK-007 & 038 | Identical "MASTERED→IN_REVIEW" issue; TASK-038 redundant |
| TASK-036 | master-backlog TASK-010 & 036 | Both fix dead "Ver registro" button; TASK-036 more specific |
| TASK-049 | master-backlog TASK-012 & 049 | TASK-049 explicitly mentions "real equity data"; TASK-012 absorbed |

---

## Appendix B: Mapping EXECUTION_TASKS.md (TASK-001–032) to Canonical IDs

| ET ID | Title | Canonical ID | Notes |
|-------|-------|--------------|-------|
| ET-001 | Canonical formulas module | TASK-027 | Exact match |
| ET-002 | Win Rate unification | TASK-005 | Depends on TASK-027 |
| ET-003 | Centralize Discipline Score | TASK-011 | Depends on TASK-027 |
| ET-004 | Fix Drawdown KPI label | TASK-028 | P0 fix |
| ET-005 | SQL injection in ai-embed | TASK-054 | Security P0 |
| ET-006 | tRPC users router (getProfile/updateProfile) | TASK-006 | Profile backend |
| ET-007 | Connect profile page to users router | Part of TASK-006 | Subcomponent |
| ET-008 | useCurrency() hook | TASK-056 | International support |
| ET-009 | Fix KPIs on paginated data | TASK-001 | Analytics correctness |
| ET-010 | Fix objectiveMet hardcoded | TASK-002 | Account correctness |
| ET-011 | Migration: UserAiConfig table | TASK-033 | AI configuration |
| ET-012 | Encrypt keys with AES-256-GCM | Part of TASK-033 | Subcomponent |
| ET-013 | tRPC getAiConfig/updateAiConfig | Part of TASK-033 | Subcomponent |
| ET-014 | Endpoint POST /api/ai/test-connection | Part of TASK-033 | Subcomponent |
| ET-015 | UI "Config de IA" in Perfil | Part of TASK-033 | Subcomponent |
| ET-016 | Migration: psychology fields on Trade | TASK-034 | Psychology data model |
| ET-017 | UI psychology section in trade form | Part of TASK-034 | Subcomponent |
| ET-018 | UI psychology in trade detail panel | Part of TASK-034 | Subcomponent |
| ET-019 | tRPC psychology.summary router | TASK-063 (partial) | Psychology analysis |
| ET-020 | Botón "Editar" en weekly review detail | TASK-031 | Review management |
| ET-021 | Auto-guardado with debounce | TASK-061 | Review UX |
| ET-022 | Model registry lib/ai/models.ts | Part of TASK-015 | Model catalog |
| ET-023 | Empty states en 4 páginas | TASK-043 | UX completeness |
| ET-024 | inputMode="decimal" en inputs | TASK-041 | Mobile UX |
| ET-025 | Tests unitarios para lib/formulas/ | Part of TASK-024 | Testing |
| ET-026 | Sharpe Ratio en dashboard | TASK-062 | Analytics KPI |
| ET-027 | Rate limiting en endpoints IA | TASK-055 | API cost control |
| ET-028 | Psychology widget en weekly review | TASK-063 | Psychology integration |
| ET-030 | PWA manifest + service worker | TASK-077 | Mobile installability |
| ET-031 | Setup health score en Playbook | TASK-064 | Playbook intelligence |
| ET-032 | Extract coach-service.ts | TASK-065 | Code organization |

---

*End of CANONICAL_EXECUTION_PLAN.md — All 78 unique tasks consolidated, dependencies mapped, sprints assigned, risks identified.*
