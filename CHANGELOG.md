# Changelog — Trading Journal v2

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

### Sprint 4 QA Fix (2026-06-02) — Major Finding Resolution

**Fixed — Major (5)**
- **M-01:** `editing` state typed `any` in mercados page — now `(MarketForm & { id: string }) | null`
- **M-02:** `WithdrawalRow` ignored `updating` prop; per-row `updatingId` state added to `RetirosPage`; removed `setTimeout(800)` fake loading hack
- **M-03:** `emotionBefore: ""` empty-string sentinel — changed to `null` across `FormState`, `INITIAL`, deselect handler, and `edit-trade-modal`; mutation coercion changed from `||` to `??`
- **M-04:** Drawdown progress bars hardcoded to 20%/10% — replaced with styled limit badges showing actual `ddTotalPct`/`ddDailyPct` values
- **M-05:** Removed unnecessary `as` cast for psychology fields in `trade-detail-panel` — Prisma-generated `Trade` type already includes all 5 fields

**Tests**
- Added 2 regression tests for M-03 null-sentinel contract
- Test suite: 364 passing, 0 failing (+2 from baseline)

**Documentation**
- Created `docs/SPRINT_4_FIX_REPORT.md` — detailed fix documentation for all 5 major findings

---

### Sprint 4 (2026-06-02) — Personalization, Psychology & Review Management

**Added**
- **TASK-034:** Per-trade psychology fields — collapsible "Psicología" section in register/edit modals; display in trade detail panel; 5 fields: `emotionBefore`, `confidenceRating`, `executionQuality`, `fomoFlag`, `revengeFlag` (all optional, backward compatible)
- **TASK-061:** Auto-save with 2s debounce in weekly review modal (edit mode only) — "Guardando…/Guardado ✓" indicator
- **TASK-069:** Extended week selector — 8 weeks shown by default, "Ver más" expands to 24 weeks
- **TASK-047:** Dashboard tab persisted to UserPreferences — active tab restored across page reloads

**Fixed**
- **TASK-023:** Replaced `market: any` in mercados page and `amount: any` in retiros page with proper `RouterOutputs` types
- **TASK-013:** Reduced `as never` casts in `trades/page.tsx` from 12 to 4 (67% reduction); remaining 4 annotated as TD-013

**Tests**
- Added 8 new tests for psychology fields: create/update acceptance, optional handling, Zod validation enforcement
- Test suite: 362 passing, 0 failing (+8 from baseline)

**Documentation**
- Created `docs/SPRINT_4_COMPLETION_REPORT.md` — full sprint delivery summary
- Updated `docs/master-backlog.md` — Sprint 4 marked complete

---

### Pre-Sprint 4 (2026-06-02) — QA Audit & Fixes

> **Note:** This is a pre-sprint QA audit of Sprints 1–3 before beginning Sprint 4. All 8 findings were critical blockers that would have caused production issues. Sprint 4 (Reviews, Psychology, Personalization) is scheduled as the next delivery phase.

**Fixed — Blocking (3)**
- **B-01:** Goal fields dropped by type cast in profile router — extended `UpdateProfileInput` interface to include `weeklyTradesGoal` and `weeklyPnlGoal`
- **B-02:** Theme toggle CSS mechanism broken — replaced inert `data-theme` attribute with `.dark` class toggle and localStorage sync
- **B-03:** Prisma Decimal not serialized to number in goals.set — added explicit `Number()` conversion before returning

**Fixed — Major (5)**
- **M-01:** Dashboard metric mislabeled "Discipline Score" instead of "Adherencia al plan" — renamed UI label and clarified metric definition
- **M-02:** Stale closures in create-review-modal useEffects — added missing deps (autoFields, generated, isEditMode)
- **M-03:** Trade list capped at 50 in review modal — raised limit to 200 via `{ limit: 200 }` query option
- **M-04:** Edit-mode fires prefill/score queries for wrong week — added `{ enabled: !isEditMode }` guards to both queries
- **M-05:** Vitest discovers stale tests in `.claude/worktrees/` — added exclude pattern to vitest.config.ts

**Tests**
- Added 5 new tests for critical fixes: B-01 (3 tests), B-03 (2 tests)
- Test suite: 354 passing, 0 failing (+5 from baseline)

**Documentation**
- Created `docs/PRE_SPRINT_4_QA_REPORT.md` — independent audit of all Sprints 1–3 implementations
- Created `docs/PRE_SPRINT_4_FIX_REPORT.md` — detailed fix documentation for all 8 findings
- Created `docs/PRE_SPRINT_4_RETROSPECTIVE.md` — lessons learned and recommendations for Sprint 4 onwards

---

### Sprint 3 (2026-06-01) — Profile Backend & Admin Fixes

**Fixed — Blocking (1)**
- **B-02:** Supabase admin client not used for user deletion — corrected profile.deleteAccount to call `createAdminClient()` instead of anon client

**Added**
- Profile page fully functional: get, update, changePassword, deleteAccount, exportData endpoints
- UserPreferences router: get, update with theme, accent color, dashboard layout settings
- Goals router: set discipline goals with min/max validation

**Tests**
- 24 new tests for profile, preferences, and goals routers
- Test suite: 232 passing, 0 failing

---

### Sprint 2 (2026-05-31) — Formula Fixes & Security Hardening

**Fixed (9 items)**
- TD-005: Phase promotion `objectiveMet = false` hardcoded
- TD-008, TD-009: N+1 query and CQRS violation in learning resources
- TD-010, TD-011: Schema and formula mismatches
- TD-015: Deprecated dead `trades.stats` procedure
- TD-025, TD-027, TD-028: Drawdown label, AI model IDs, error handling

---

### Sprint 1 (2026-05-30) — Data Integrity & Foundations

**Fixed (6 items)**
- TD-001: Win rate calculation centralized to `src/lib/formulas/`
- TD-004, TD-009: KPI strip and account stats pagination fixes
- TD-006, TD-007: CRON_SECRET and CSV rMultiple fixes
- TD-026: Drawdown calculation corrected

---

## Legend

- **Added** — New features or components
- **Fixed** — Bug fixes or correctness issues
- **Changed** — Modified behavior or refactored code
- **Deprecated** — Features marked for removal
- **Removed** — Deleted or archived code
- **Tests** — Test suite changes

## Branch Strategy

- **main** — production-ready code
- **develop** — integration branch for next release
- **claude/epic-*** — feature branches with fixes and implementations
