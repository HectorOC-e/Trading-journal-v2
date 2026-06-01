# SPRINT_MASTER_PLAN.md
> Detailed sprint execution plan derived from CANONICAL_EXECUTION_PLAN.md
> Each sprint defined with objective, deliverables, dependencies, risks, acceptance criteria, user value, and duration.
> Last Updated: 2026-05-31

---

## Overview

- **Total Sprints:** 12 (2-week sprints, ~40h per sprint)
- **Timeline:** ~28 weeks (7 months)
- **Total Effort:** 346 hours
- **Each Sprint Goal:** Deliver functional value visible to users

---

## SPRINT 1: P0 Security & Data Integrity (Weeks 1–2)
**Status:** READY TO START (No blocking dependencies)

### Sprint Objective
Stop the bleeding. Fix all critical data correctness bugs and security vulnerabilities. Establish the formula centralization foundation that unblocks subsequent P1/P2 work.

### Grouped Functionalities

#### Group A: Security Hardening (4 tasks, ~3.5h)
- **TASK-016** — Harden CRON_SECRET validation in edge function (XS, 0.5h)
- **TASK-017** — Server-side validation for Storage image uploads (S, 2h)
- **TASK-054** — Fix SQL injection pattern in `ai-embed/route.ts` using `Prisma.sql` (XS, 0.5h)
- **TASK-003** — Replace `throw new Error()` with `TRPCError` in accounts.changeStatus (XS, 0.5h)

#### Group B: Formula Centralization & Unification (5 tasks, ~5h)
- **TASK-027** — Centralize financial formulas in `lib/formulas/` module (M, 4h) **← CRITICAL PREREQUISITE**
- **TASK-005** — Unify win criterion (`pnl > 0`) across all calculation sites, requires TASK-027 (XS, 0.5h)
- **TASK-028** — Fix misleading "Drawdown" label on trades KPI strip (XS, 0.5h)
- **TASK-029** — Fix inconsistent drawdown calculation in `use-account-stats.ts` (XS, 0.5h)
- **TASK-004** — Calculate `rMultiple` in MT4/cTrader CSV import (XS, 0.5h)

#### Group C: Analytics Data Correctness (3 tasks, ~6h)
- **TASK-001** — Fix KPI strip calculated over paginated trade data only, not all trades (S, 2h)
- **TASK-009** — Fix `weekTrades` and account stats based on all data, not pagination (S, 2h)
- **TASK-002** — Fix `objectiveMet = false` hardcoded in phase promotion logic (XS, 0.5h)

#### Group D: Code Cleanliness (1 task, ~0.5h)
- **TASK-026** — Fix error message mismatch in `ai-coach/route.ts:106` (XS, 0.5h)

### Dependencies
- **TASK-027** must complete BEFORE TASK-005, TASK-028, TASK-029 (they depend on formula module)
- All other tasks are independent and can run in parallel
- No external dependencies from previous sprints

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Formula centralization introduces regressions | 🔴 High | Comprehensive unit tests; compare old vs new calculations side-by-side; have QA team validate metrics |
| SQL injection fix breaks embedding process | 🟡 Medium | Test embedding with various note lengths; verify vector storage in DB |
| Data migration for drawdown changes affects historical data | 🟡 Medium | Validate drawdown calculations match expectations for 3+ historical trades |

### Acceptance Criteria
1. ✅ All 4 security tasks merged and deployed
2. ✅ `lib/formulas/` module exists with 100% test coverage
3. ✅ Win criterion unified: all 9 sites use `pnl > 0` (or documented exception)
4. ✅ KPI strip calculations match data for all-trades view (not paginated subset)
5. ✅ Zero SQL injection patterns in database operations
6. ✅ Drawdown label and calculations are consistent
7. ✅ CSV import includes `rMultiple` in all records

### User-Visible Outcomes
- **Traders see correct metrics** on dashboard (KPI strip, Win Rate, Drawdown)
- **No more inconsistencies** in statistics across pages
- **Security baseline established** for API and data endpoints

### Estimated Duration
- **Total effort:** 14h (of 40h available)
- **Buffer:** 26h for discovered bugs, QA, testing
- **Recommended pacing:** TASK-027 first (day 1–2), then parallel groups A/B/C/D

### Definition of Done
- All tasks merged to `main` with pull request reviews
- Unit tests pass (formula tests at 90%+ coverage)
- Manual QA sign-off on 3+ accounts' metrics
- No regressions in existing tests

---

## SPRINT 2: Learning Pipeline & UX Foundations (Weeks 3–4)
**Unblocks:** None (independent of Sprint 1)

### Sprint Objective
Fix the learning resource acquisition pipeline semantics. Establish the toast notification system as the foundation for all user feedback. Begin mobile UX polish.

### Grouped Functionalities

#### Group A: Learning Pipeline Correctness (4 tasks, ~12h)
- **TASK-007** — Move MASTERED→IN_REVIEW side-effect from query to mutation (S, 2h)
- **TASK-008** — Fix N+1 query in `resourceImpactRanking` query (M, 4h)
- **TASK-038** — Fix CQRS violation in `learningResources.stats` (S, 2h)
- **TASK-039** — Fix N+1 query in `resourceImpactRanking` (consolidation with TASK-008) (M, 4h)

#### Group B: UX Feedback System (2 tasks, ~4.5h)
- **TASK-035** — Toast notification system (M, 4h) **← UNBLOCKS TASK-037**
- **TASK-037** — Fix `generateSummary` returning HTTP 200 on failure; use toast for errors (XS, 0.5h)

#### Group C: Mobile & Form UX (3 tasks, ~3h)
- **TASK-040** — Add mobile back navigation to detail panels (S, 2h)
- **TASK-041** — Add `inputmode="decimal"` to price inputs in trade form (XS, 0.5h)
- **TASK-036** — Connect "Ver registro →" button in Disciplina tab (XS, 0.5h)
- **TASK-044** — Fix `window.location.reload()` in error boundaries (XS, 0.5h)

#### Group D: Technical Debt & Setup (2 tasks, ~2.5h)
- **TASK-015** — Update stale AI model IDs in config (XS, 0.5h)
- **TASK-018** — Deprecate dead `trades.stats` procedure (XS, 0.5h)
- **TASK-019** — Add `notes_embedding` and `email_log` columns to Prisma schema (S, 2h)
- **TASK-059** — Create `.env.example` with all required variable names (XS, 0.5h)

### Dependencies
- **TASK-035** must complete BEFORE TASK-037 (toast system required for error feedback)
- All N+1 query fixes (TASK-008, TASK-039) can run in parallel (same issue, separate instances)
- No blocking dependencies from Sprint 1 (can run in parallel if needed)

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| CQRS fix changes query semantics; impacts dashboard | 🟡 Medium | Test learning stats against 5+ accounts; verify impact ranking is consistent |
| Toast system integration incomplete; some errors still use alert() | 🟡 Medium | Audit all error paths; replace all `alert()` with toast calls during sprint |
| Mobile navigation back button conflicts with browser back | 🟠 High | Use routing state instead of history; test on iOS/Android |

### Acceptance Criteria
1. ✅ MASTERED→IN_REVIEW transition only happens in mutations, not queries
2. ✅ `resourceImpactRanking` query completes in <500ms (no N+1)
3. ✅ Toast system fully integrated; all errors use toasts (no `alert()` calls)
4. ✅ Mobile back button navigation works on all detail panels
5. ✅ CSV import column `inputmode="decimal"` on price fields
6. ✅ `.env.example` includes all 15+ required variables

### User-Visible Outcomes
- **Traders see toast notifications** for all errors and successes (consistent UX)
- **Mobile users can navigate** back from detail panels with dedicated button
- **Learning analytics** are accurate (no accidental mastered→review transitions)

### Estimated Duration
- **Total effort:** 23.5h (of 40h available)
- **Buffer:** 16.5h for UI refinement, mobile testing, learning data validation
- **Recommended pacing:** Parallel Groups A & B (day 1), then C & D (day 4+)

### Definition of Done
- All tasks merged with pull request reviews
- Toast system tested on 3+ error scenarios
- Mobile navigation tested on physical devices (iOS + Android)
- Learning stats validated against expectations on 3+ test accounts

---

## SPRINT 3: Profile Backend Foundation (Weeks 5–7)
**Status:** CRITICAL PATH — Longest single task
**Unblocks:** 7 downstream tasks (TASK-030, 033, 045–046, 050–052, 071, 075)

### Sprint Objective
Ship the profile backend (tRPC router + React page). This is the longest task and the single point of failure for the personalization tier. Once complete, 7 P1/P2 features become unblocked.

### Grouped Functionalities

#### Group A: Profile Backend (1 task, 8h) — CRITICAL
- **TASK-006** — Implement profile backend (tRPC router + page) (L, 8h)
  - **Subcomponents:**
    - `tRPC router/users.ts` with `getProfile()`, `updateProfile()` endpoints
    - Profile page (`app/profile/page.tsx`) with form
    - Prisma schema update for profile fields (name, email, avatar, preferences)
    - Server-side validation; client-side loading/error states

#### Group B: UX Loading States (2 tasks, ~8h)
- **TASK-042** — Skeleton screens for KPI strip, trade table, account cards (M, 4h)
- **TASK-043** — Empty states for Cuentas, Trades, Playbook, Mercados pages (M, 4h)

#### Group C: Formula Support (1 task, ~2h)
- **TASK-011** — Extract `computeDisciplineScore` as shared function in formulas module (S, 2h)

### Dependencies
- **TASK-006** has NO external dependencies (ready to start immediately)
- **TASK-006** must complete BEFORE any of: TASK-030, 033, 045–046, 050–052, 071, 075
- **TASK-011** depends on TASK-027 from Sprint 1 (formula module exists)

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Profile backend takes longer than 8h estimate | 🔴 Critical | **This is the critical path.** Daily check-ins; if >4h in, break into milestones (schema → router → page) |
| Profile data migration affects existing users | 🟠 High | Run migration on staging with 100% of prod data; test all profile read/write paths |
| Schema change introduces type mismatches | 🟡 Medium | Run `prisma generate` immediately; regenerate types; test all clients |
| Loading skeleton screens don't match content dimensions | 🟡 Medium | Create skeleton in same layout as content; measure dimensions before styling |

### Acceptance Criteria
1. ✅ Profile backend fully functional (CRUD operations)
2. ✅ User can read own profile (getProfile returns user data)
3. ✅ User can update name, email, preferences (updateProfile works)
4. ✅ Skeleton screens render while data loads
5. ✅ Empty states show when data is absent
6. ✅ All profile tests pass (>80% coverage)
7. ✅ No type errors in generated Prisma types

### User-Visible Outcomes
- **Traders can view and edit their profile** (name, email, avatar)
- **App shows loading skeleton screens** instead of blank spaces
- **Empty states guide users** when no data exists

### Estimated Duration
- **Total effort:** 18h (of 40h available)
- **Buffer:** 22h for testing, type fixes, data migration validation
- **Recommended pacing:** TASK-006 sprint weeks 5–6 (parallel with sprint 2 if needed), TASK-042/043 week 7, TASK-011 end of week 7

### Definition of Done
- TASK-006 deployed to staging with full QA sign-off
- All profile read/write operations tested
- Skeleton screens and empty states match design
- Type generation passes without errors
- 7 dependent tasks are ready to unblock

---

## SPRINT 4: Personalization & Review Management (Weeks 8–10)
**Unblocks:** More personalization features (TASK-045/046 features)
**Depends on:** TASK-006 (profile backend from Sprint 3)

### Sprint Objective
Unlock personalization features that depend on profile backend. Implement user preferences table. Add review management (edit/delete). Begin type safety cleanup.

### Grouped Functionalities

#### Group A: Personalization Foundation (2 tasks, ~6h)
- **TASK-030** — Implement `UserPreferences` table and tRPC router (M, 4h)
- **TASK-047** — Persist dashboard tab and chart grain selection (XS, 0.5h)
- **TASK-069** — Week selector date picker for old review periods (XS, 0.5h)

#### Group B: Review Management (3 tasks, ~9h)
- **TASK-031** — Add Edit and Delete buttons to ReviewDetailPanel (M, 4h)
- **TASK-061** — Auto-save with debounce in weekly review modal (S, 2h)
- **TASK-048** — Implement review filtering and search (M, 4h) **[Note: Listed in Sprint 6, moved here for review grouping]**

#### Group C: Psychology Data Model (1 task, 4h)
- **TASK-034** — Add per-trade psychology fields to Trade model (emotion, confidence, pre-trade planning prep) (M, 4h)

#### Group D: Theme Personalization (2 tasks, ~3.5h)
- **TASK-045** — Three-way theme toggle (light/dark/system) (S, 2h)
- **TASK-047** — (Overlap; see Group A)

#### Group E: Type Safety (4 tasks, ~7.5h)
- **TASK-013** — Eliminate 15+ `as never` type casts in trades/page.tsx (M, 4h)
- **TASK-014** — Unify `LearningResource` type with RouterOutputs (S, 2h)
- **TASK-023** — Type `market: any` in MarketCard, `amount: any` in Retiros (XS, 0.5h)
- **TASK-066** — Fix `phasePayload as never` type cast in accounts router (XS, 0.5h)

### Dependencies
- **TASK-030** depends on TASK-006 (profile backend must exist)
- **TASK-034** is independent (psychology fields are new)
- **TASK-045** depends on TASK-006 (theme toggle stores in UserPreferences)
- All type safety tasks are independent

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Review filtering complexity exceeds estimate | 🟡 Medium | Use existing filter patterns from Playbook; limit filters to: date range + setup + outcome |
| Auto-save in modal causes excessive API calls | 🟡 Medium | Implement debounce with 2-second delay; batch updates |
| Type casting elimination breaks compilation | 🔴 Critical | Start with 2–3 casts, validate, then expand; type-check after each change |

### Acceptance Criteria
1. ✅ UserPreferences table created and synced
2. ✅ Users can create, read, update preferences (theme, filters, etc.)
3. ✅ Reviews can be edited (text, tags, rating) with auto-save
4. ✅ Reviews can be deleted with confirmation dialog
5. ✅ Review filtering works by date range, setup, outcome
6. ✅ Psychology fields stored in Trade model (emotion, confidence, planNotes)
7. ✅ Type `as never` casts reduced by 80%+
8. ✅ Zero TypeScript errors in build

### User-Visible Outcomes
- **Traders select light/dark/system theme** and it persists
- **Traders see preference controls** (theme, analytics display, review filters)
- **Traders can edit and delete weekly reviews** with data persistence
- **Psychology fields** appear in trade form and review details

### Estimated Duration
- **Total effort:** 23.5h (of 40h available)
- **Buffer:** 16.5h for filtering UX refinement, type casting edge cases
- **Recommended pacing:** TASK-030 first (day 1), then parallel TASK-034 + type safety (day 2), TASK-031/048/061 (day 5+)

### Definition of Done
- All personalization and review features merged and tested
- UserPreferences synced with all dependent features
- Type errors reduced by 80%+
- Review edit/delete tested with 5+ test cases

---

## SPRINT 5: AI Configuration & Core Analytics (Weeks 11–14)
**Unblocks:** Advanced personalization
**Depends on:** TASK-006, TASK-015 (model IDs from Sprint 2)

### Sprint Objective
Implement AI configuration UI for multi-provider keys. Add accent color picker. Propagate currency hook across P&L displays. Surface Sharpe Ratio as KPI. Polish performance optimizations.

### Grouped Functionalities

#### Group A: AI Configuration (2 tasks, ~8h)
- **TASK-033** — Implement AI configuration UI and `UserAiConfig` table (L, 8h)
  - **Subcomponents:**
    - Prisma migration: `UserAiConfig` table with encrypted keys
    - tRPC endpoints: `getAiConfig()`, `updateAiConfig()`
    - UI form: Select provider (Anthropic/OpenRouter/OpenAI), paste API key, test connection
    - Encryption/decryption: AES-256-GCM
    - Validation: Key format per provider

#### Group B: Personalization (2 tasks, ~6h)
- **TASK-046** — Accent color picker and colorblind mode (M, 4h)
- **TASK-050** — Goal setting and dashboard widget (M, 4h)

#### Group C: International Support & Analytics (3 tasks, ~6h)
- **TASK-056** — Implement `useCurrency()` hook to propagate `baseCurrency` globally (S, 2h)
- **TASK-062** — Surface Sharpe Ratio as KPI card on analytics dashboard (S, 2h)
- **TASK-074** — Add pre-trade planning field (`planNotes`) to Trade model (S, 2h)

#### Group D: Performance & Data Pagination (2 tasks, ~4h)
- **TASK-067** — Optimize tRPC per-request JWT header parsing (S, 2h)
- **TASK-020** — Implement cursor pagination in `accountLogs.list` (S, 2h)

### Dependencies
- **TASK-033** depends on TASK-006 (profile backend for user context)
- **TASK-033** depends on TASK-015 (model IDs must be known)
- **TASK-046** depends on TASK-006 (accent color preference stored in UserPreferences)
- **TASK-050** depends on TASK-006 (goal data needs user context)
- **TASK-056** independent (hook creation)
- **TASK-062** depends on TASK-027 (formula module has Sharpe Ratio calculation)
- **TASK-074** independent (new field)

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| API key encryption/decryption fails; keys exposed | 🔴 Critical | Use Node crypto.randomBytes for IV; test encrypt/decrypt cycle; audit key storage |
| Sharpe Ratio formula incorrect; doesn't match spreadsheet | 🟡 Medium | Compare calculations with manual Excel sheet for 3+ accounts |
| useCurrency hook not propagated to all P&L displays | 🟠 High | Audit all price displays; test with non-USD account |
| Colorblind mode CSS doesn't provide sufficient contrast | 🟡 Medium | Test with WCAG contrast checker; use APCA for better accuracy |

### Acceptance Criteria
1. ✅ UserAiConfig table created with encrypted key storage
2. ✅ Users can add, update, delete AI provider keys
3. ✅ Test connection endpoint works (calls provider API, confirms valid key)
4. ✅ Accent color picker functional; color applies to all UI
5. ✅ Colorblind mode toggle switches palette (protanopia, deuteranopia, tritanopia)
6. ✅ useCurrency() hook propagated to all P&L displays (Win Rate %, R:R, Sharpe, etc.)
7. ✅ Sharpe Ratio displayed on analytics dashboard
8. ✅ Pre-trade planning field appears in trade form

### User-Visible Outcomes
- **Traders configure their own AI provider** (Anthropic, OpenRouter, OpenAI) with encrypted keys
- **Traders pick accent color** to personalize dashboard
- **Traders see Sharpe Ratio** as premium analytics KPI
- **All metrics display in trader's base currency** (USD, EUR, GBP, etc.)

### Estimated Duration
- **Total effort:** 26h (of 40h available)
- **Buffer:** 14h for key validation edge cases, currency propagation testing
- **Recommended pacing:** TASK-033 first (day 1–3), then parallel TASK-046/050/056/062/074 (day 4+)

### Definition of Done
- AI config UI fully functional with key validation
- All provider integrations tested (at least one key per provider)
- Sharpe Ratio calculation validated against manual spreadsheet
- useCurrency hook used in 5+ price displays
- Accent color and colorblind modes tested

---

## SPRINT 6: Psychology & Analytics Visualization (Weeks 15–18)
**Depends on:** TASK-034 (psychology fields from Sprint 4), TASK-030 (preferences)

### Sprint Objective
Complete psychology data model integration. Implement advanced analytics visualization (calendar heatmap, rolling metrics setup). Add custom tags management. Implement daily loss alerts.

### Grouped Functionalities

#### Group A: Psychology Integration (2 tasks, ~8h)
- **TASK-063** — Psychology summary widget inside weekly review modal (M, 4h)
  - Shows: emotion distribution, confidence trend, pre-trade planning adherence
- **TASK-051** — Custom tags management UI (M, 4h)
  - Create, rename, delete tags; apply to trades

#### Group B: Analytics Visualization (3 tasks, ~10h)
- **TASK-072** — Calendar heatmap for daily P&L (recharts) (M, 4h)
- **TASK-048** — Weekly review filtering and search **[Moved from Sprint 4]** (M, 4h)
- **TASK-052** — Onboarding checklist widget for new users (M, 4h)

#### Group C: Risk Management & Compliance (2 tasks, ~4h)
- **TASK-075** — Daily loss limit push/email alert via Resend (S, 2h)
- **TASK-057** — Fix hardcoded "New York" timezone in CSV import (XS, 0.5h)

#### Group D: Data Import (1 task, ~4h)
- **TASK-068** — CSV import column-mapping preferences UI (M, 4h)
  - Let users define which CSV columns → Trade fields

### Dependencies
- **TASK-063** depends on TASK-034 (psychology fields must exist)
- **TASK-051** depends on TASK-030 (tag preferences stored in UserPreferences)
- **TASK-075** depends on TASK-006 (daily loss limit in profile settings)
- All other tasks are independent

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Calendar heatmap renders slowly for 1000+ trades | 🟡 Medium | Aggregate daily P&L; use recharts responsibly (lazy load); test with large datasets |
| Psychology widget doesn't fit in review modal; UX cramped | 🟡 Medium | Use accordion or collapsible section; keep to 4–5 key metrics |
| CSV column mapping too complex; users confused | 🟠 High | Provide presets for popular brokers (MT4, cTrader, ThinkorSwim); show examples |
| Daily loss alert emails not delivered | 🔴 Critical | Test Resend integration; validate verified domain; check bounce rate |

### Acceptance Criteria
1. ✅ Psychology widget shows in weekly review modal with 4+ metrics
2. ✅ Custom tags management (create/rename/delete) works
3. ✅ Calendar heatmap renders daily P&L (color gradient)
4. ✅ Calendar renders in <2 seconds for 1000+ trades
5. ✅ Review filtering works by date, setup, outcome, tags
6. ✅ Onboarding checklist appears for new users; disappears when complete
7. ✅ Daily loss limit alert sent via email/push when exceeded
8. ✅ CSV column mapping preferences saved and reused
9. ✅ Timezone import fix applied to all CSV imports

### User-Visible Outcomes
- **Traders see psychology trends** (emotion, confidence) in weekly review
- **Traders tag trades** for custom organization and analysis
- **Traders visualize daily P&L** on interactive calendar heatmap
- **Traders get alerted** when daily loss exceeds configured limit
- **New traders see onboarding checklist** guiding them through first steps

### Estimated Duration
- **Total effort:** 26.5h (of 40h available)
- **Buffer:** 13.5h for psychology widget refinement, heatmap performance, timezone testing
- **Recommended pacing:** TASK-063/051 first (day 1–3), then TASK-072/048 (day 4), TASK-075/068 (day 7+)

### Definition of Done
- All analytics visualizations rendered and performant
- Psychology widget integrated into review workflow
- Custom tags fully functional
- Daily loss alert tested (email delivery confirmed)
- CSV column mapping presets for 3+ brokers

---

## SPRINT 7: Rate Limiting, Logging & Monthly Reviews (Weeks 19–22)
**Depends on:** TASK-027 (formulas)

### Sprint Objective
Harden AI endpoints with rate limiting. Implement structured logging. Add setup health score to Playbook. Ship monthly review model.

### Grouped Functionalities

#### Group A: Analytics & Insights (2 tasks, ~6h)
- **TASK-073** — Rolling metrics dashboard (7d / 30d / 90d windows) (M, 4h)
- **TASK-064** — Setup health score indicator in Playbook (🟢/🟡/🔴) (S, 2h)

#### Group B: AI Hardening (2 tasks, ~8h)
- **TASK-055** — Add rate limiting to all AI endpoints (token bucket) (M, 4h)
- **TASK-058** — Replace fire-and-forget embedding with reliable DB webhook (M, 4h)

#### Group C: Observability (1 task, ~2h)
- **TASK-060** — Structured logger (`lib/logger.ts`) replacing console.error calls (S, 2h)

#### Group D: Review Model (1 task, ~8h)
- **TASK-071** — Monthly review model + `createMonthly` procedure (L, 8h)

#### Group E: Accessibility (1 task, ~4h)
- **TASK-070** — Accessibility pass (prefers-reduced-motion, ARIA labels, WCAG AA) (M, 4h)

#### Group F: Playbook Visualization (1 task, ~4h)
- **TASK-049** — Playbook sparklines with real equity data (M, 4h)

### Dependencies
- **TASK-073** depends on TASK-027 (rolling metrics calculated with centralized formulas)
- **TASK-071** depends on TASK-006 (monthly review UI needs user context)
- All other tasks are independent

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Rate limiting too strict; blocks legitimate users | 🟡 Medium | Set generous token bucket (100 req/min); monitor usage; adjust if needed |
| Rate limiting too loose; doesn't prevent abuse | 🟡 Medium | Log all AI endpoint calls; track cost; scale limits based on user tier |
| Structured logging introduces performance overhead | 🟡 Medium | Use async logging; batch writes; test with 1000 req/sec load |
| Monthly review model schema not aligned with weekly | 🟠 High | Design schema first; ensure both models reference same calculation logic |
| Setup health score formula misses edge cases | 🟡 Medium | Calculate for 10+ test setups; compare manual vs. automated scores |

### Acceptance Criteria
1. ✅ Rate limiting middleware applied to all AI endpoints
2. ✅ Rate limit correctly rejects requests when bucket exhausted
3. ✅ Rate limit headers (`X-RateLimit-Remaining`) visible in responses
4. ✅ Structured logger captures all errors and warnings
5. ✅ Logs include timestamp, level, context (user ID, endpoint, etc.)
6. ✅ Rolling metrics (7d/30d/90d) calculated and displayed
7. ✅ Setup health score calculated and displayed in Playbook
8. ✅ Monthly review model schema created and migrations run
9. ✅ Playbook sparklines render with real equity curves
10. ✅ Accessibility audit passes; WCAG AA compliance verified

### User-Visible Outcomes
- **Traders see rolling performance metrics** (7/30/90-day windows)
- **Traders see setup health** at a glance (healthy/warning/critical)
- **Traders can create monthly reviews** (in addition to weekly)
- **App is accessible** (keyboard nav, screen reader support, reduced motion)
- **App logs errors reliably** (for support debugging)

### Estimated Duration
- **Total effort:** 32h (of 40h available)
- **Buffer:** 8h for rate limiting tuning, accessibility audit fixes
- **Recommended pacing:** TASK-055/058 first (day 1–4), then TASK-060/071 (day 5+), parallel TASK-073/064 + TASK-070/049

### Definition of Done
- Rate limiting enforced and tested
- Structured logging working end-to-end
- Monthly review model fully functional
- Setup health score formula validated
- Accessibility audit passed with 0 critical violations

---

## SPRINT 8: AI Service Refactoring & CI/CD (Weeks 23–25)
**Depends on:** None specific

### Sprint Objective
Extract AI coach logic to testable service layer. Implement CI/CD pipeline. Begin component and E2E test suite.

### Grouped Functionalities

#### Group A: Code Organization (1 task, ~4h)
- **TASK-065** — Extract `coach-service.ts` from route handler (M, 4h)
  - Separates AI logic from HTTP concerns; enables unit testing

#### Group B: Infrastructure & Deployment (2 tasks, ~5h)
- **TASK-076** — CI/CD GitHub Actions pipeline (lint → typecheck → test → deploy) (M, 4h)
- **TASK-021** — Activate and document `ANALYTICS_CACHE_ENABLED` (XS, 0.5h)
- **TASK-022** — Configure verified email domain in Resend (XS, 0.5h)

#### Group C: Testing (2 tasks, ~16h)
- **TASK-024** — Add React Testing Library component tests (L, 8h)
  - Target: >60% coverage on core components (KPI strip, trade table, review modal)
- **TASK-025** — Add Playwright e2e smoke tests (L, 8h)
  - Target: Happy path flows (login → create trade → review → export)

### Dependencies
- All tasks in this sprint are independent (no hard dependencies)
- **TASK-065** benefits from TASK-058 (embedding webhook already hardened)

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| CI/CD pipeline fails on unrelated tests | 🟡 Medium | Start with lint-only; gradually add typecheck, then tests; fix broken tests first |
| Test suite takes >10min to run (blocks PR merges) | 🟠 High | Split tests into unit (2min) + e2e (5min) + optional (10min) stages |
| coach-service.ts extraction breaks embedding flow | 🟡 Medium | Extract in small steps; test embedding before/after; compare results |
| Playwright tests flaky; random failures on CI | 🟡 Medium | Use explicit waits; avoid sleep; test on staging first; tag flaky tests |

### Acceptance Criteria
1. ✅ `coach-service.ts` extracted and testable in isolation
2. ✅ All AI endpoints use coach-service (no logic in route handlers)
3. ✅ GitHub Actions workflow passing (lint → typecheck → test)
4. ✅ Component tests cover 60%+ of core components
5. ✅ E2E tests cover happy path flows
6. ✅ CI/CD pipeline runs in <10 minutes
7. ✅ Analytics cache enabled and validated
8. ✅ Resend domain verified (no more bounce warnings)

### User-Visible Outcomes
- **Behind the scenes:** Code is more testable and maintainable
- **Deployments are automated** (fewer manual steps, fewer mistakes)
- **AI coach is more reliable** (extracted service enables better testing)

### Estimated Duration
- **Total effort:** 25h (of 40h available)
- **Buffer:** 15h for test flakiness fixes, CI/CD tuning
- **Recommended pacing:** TASK-065 first (day 1–2), then TASK-076 (day 3–4), then TASK-024/025 (day 5+)

### Definition of Done
- All tasks merged with test suite at >40% coverage
- CI/CD pipeline passing on all PRs
- No flaky tests on main
- coach-service.ts production-ready

---

## SPRINT 9: Multi-Account Portfolio Foundation (Weeks 26–28)
**Status:** Large scope; recommend milestone-based delivery
**Depends on:** TASK-019 (schema additions from Sprint 2)

### Sprint Objective
Begin multi-account portfolio dashboard. Break large effort into milestones.

### Grouped Functionalities

#### Group A: Portfolio Analytics Foundation (1 task, ~16h)
- **TASK-053** — Multi-account portfolio dashboard (XL, 16h)
  - **Milestone 1 (4h):** Schema and database queries for aggregated P&L, win rate, Sharpe
  - **Milestone 2 (4h):** Backend endpoints to fetch portfolio-level metrics
  - **Milestone 3 (4h):** Frontend dashboard layout and charts
  - **Milestone 4 (4h):** Drill-down to individual account details

#### Group B: Playbook Polish (1 task, ~4h)
- **TASK-012** — Implement sparklines of equity per setup in Playbook (M, 4h)

### Dependencies
- **TASK-053** depends on TASK-019 (schema changes for multi-account tracking)
- **TASK-012** is independent (per-setup sparklines)

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Portfolio dashboard scope creeps; ends in 24h | 🔴 Critical | Define MVP: aggregated P&L, win rate, Sharpe only; no drill-downs in Sprint 9 |
| Aggregation queries too slow for 100+ trades | 🟡 Medium | Index account_id; use materialized view or cache; test with real data |
| Multi-account rendering complexity | 🟠 High | Use recharts for all portfolio charts; match single-account component patterns |

### Acceptance Criteria
1. ✅ Portfolio dashboard MVP complete (P&L, Win Rate, Sharpe)
2. ✅ Queries optimize for 100+ trades (<1s response)
3. ✅ Playbook sparklines render for all setups
4. ✅ Dashboard foundation stable; ready for Sprint 10 continuation

### User-Visible Outcomes
- **Traders see a portfolio dashboard** (aggregate view of all accounts)
- **Traders can compare performance** across accounts

### Estimated Duration
- **Total effort:** 20h (of 40h available)
- **Buffer:** 20h for query optimization, UX refinement
- **Recommended pacing:** TASK-053 Milestone 1–2 (day 1–4), Milestone 3–4 (day 5+), TASK-012 parallel (day 3+)

### Definition of Done
- Portfolio dashboard MVP deployed and tested
- Aggregation queries performant (<1s)
- Playbook sparklines rendering
- Foundation stable for continued development in Sprint 10

---

## SPRINT 10: PWA, Data Export & Portfolio Completion (Weeks 29–32)
**Unblocks:** Mobile installability, offline support

### Sprint Objective
Implement PWA (manifest, service worker). Add PDF export. Continue multi-account portfolio dashboard.

### Grouped Functionalities

#### Group A: Mobile & Progressive Web App (1 task, ~4h)
- **TASK-077** — PWA: manifest.json + basic service worker (offline) (M, 4h)
  - Manifest: app name, icons, theme colors
  - Service worker: cache API responses, offline fallback

#### Group B: Data Export (1 task, ~8h)
- **TASK-078** — PDF performance report export (L, 8h)
  - Generates PDF with: summary stats, charts, trades list, psychology summary

#### Group C: Portfolio Dashboard Continuation (1 task, ~8h)
- **TASK-053** — (Continuation) Multi-account portfolio dashboard (completion) (XL, 8h)
  - Milestone 4 completion: drill-down, comparison view, scenario analysis (if scope allows)

### Dependencies
- **TASK-077** is independent
- **TASK-078** depends on TASK-062/072 (Sharpe Ratio, calendar heatmap for report)
- **TASK-053** continuation builds on Sprint 9 foundation

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Service worker cache stale during development | 🟡 Medium | Use version number in cache name; set short TTL on updates |
| PDF generation too slow (>5s for large datasets) | 🟡 Medium | Generate server-side; use headless browser or PDF library; async progress indicator |
| Portfolio drill-down UI too complex | 🟠 High | Limit drill-down to: account selector → metrics view; no 3-level nesting |

### Acceptance Criteria
1. ✅ PWA manifest and service worker deployed
2. ✅ App installable on iOS and Android
3. ✅ Offline mode works (cached pages load)
4. ✅ PDF export functional; includes 5+ key sections
5. ✅ PDF generation completes in <10s for 500+ trades
6. ✅ Portfolio dashboard 70%+ complete

### User-Visible Outcomes
- **Traders can install the app** as a PWA (like native app)
- **Traders can use the app offline** (cached data)
- **Traders can export performance reports** as PDF (share with mentors, prop firms)
- **Portfolio dashboard** continues to mature

### Estimated Duration
- **Total effort:** 20h (of 40h available)
- **Buffer:** 20h for PWA testing, PDF refinement, portfolio UX
- **Recommended pacing:** TASK-077 (day 1–2), TASK-078 (day 3–5), TASK-053 (day 6+)

### Definition of Done
- PWA manifest and service worker live
- App installable and offline-functional
- PDF export tested with 3+ accounts (various trade counts)
- Portfolio dashboard 70%+ complete and stable

---

## SPRINT 11–12: Long-Tail & Continuous Improvement (Weeks 33+)
**Status:** Future work; defined at high level

### Sprint 11 Objective
Complete multi-account portfolio dashboard. Backlog refinement and technical debt.

**Key Tasks (Estimated):**
- **TASK-053** continuation (portfolio completion)
- Remaining P3 tasks (testing, PDF refinement, etc.)
- Bug fixes from Sprints 1–10

### Sprint 12 Objective
Stable, feature-complete application. Focus on reliability, performance, and user delight.

**Key Tasks (Estimated):**
- Backlog refinement and user feedback
- Performance optimization
- Documentation and knowledge transfer
- Roadmap for v3

---

## Cross-Sprint Dependencies & Milestones

### Critical Path Summary
```
Sprint 1: TASK-027 (formula module) ✅ Ready
Sprint 3: TASK-006 (profile backend) ✅ Unblocks 7 tasks
Sprint 4: TASK-030 (preferences) ✅ Unblocks theme + personalization
Sprint 5: TASK-033 (AI config) + TASK-062 (Sharpe) ✅ Analytics tier complete
Sprint 6: TASK-071 (monthly review) ✅ Review model expanded
Sprint 7: TASK-055 (rate limiting) ✅ API hardened
Sprint 8: TASK-076 (CI/CD) ✅ Deployment automated
Sprint 9–10: TASK-053 (portfolio) ✅ Advanced analytics
```

### Key Unblocking Moments
1. **Week 2 (Sprint 1):** TASK-027 complete → formula-dependent tasks unblock
2. **Week 7 (Sprint 3):** TASK-006 complete → 7 personalization tasks unblock
3. **Week 14 (Sprint 5):** TASK-033 complete → AI config available to users
4. **Week 22 (Sprint 7):** TASK-071 complete → monthly review model ready
5. **Week 28 (Sprint 9):** TASK-053 foundation → portfolio dashboard ready for continuation

---

## Effort Distribution & Burndown

| Phase | Sprints | Tasks | Hours | Pace |
|-------|---------|-------|-------|------|
| **Foundation** | S1–2 | 30 | 37.5h | Rapid (5 days/sprint) |
| **Personalization Unblock** | S3–4 | 20 | 42h | Moderate (7 days/sprint) |
| **Feature Expansion** | S5–7 | 18 | 84.5h | Steady (10 days/sprint) |
| **Quality & Scale** | S8–10 | 8 | 53h | Deep focus (12+ days/sprint) |
| **Long-tail** | S11–12 | 2 | ~50h | As-needed |
| **TOTAL** | **12** | **78** | **346h** | **~28 weeks** |

---

## Success Metrics by Phase

### Post-Sprint 1 (Week 2)
- 🎯 All P0 security issues resolved
- 🎯 KPI strip accuracy verified (vs. manual calculation)
- 🎯 Win Rate unified across 9 sites

### Post-Sprint 3 (Week 7)
- 🎯 Profile backend fully functional
- 🎯 7 dependent tasks ready to start
- 🎯 Trader can read/update own profile

### Post-Sprint 5 (Week 14)
- 🎯 Multi-provider AI config UI live
- 🎯 Sharpe Ratio visible on dashboard
- 🎯 Accent color personalization working

### Post-Sprint 7 (Week 22)
- 🎯 Rolling metrics (7d/30d/90d) displayed
- 🎯 Rate limiting enforced on all AI endpoints
- 🎯 Structured logging in all services

### Post-Sprint 10 (Week 32)
- 🎯 PWA installable on iOS/Android
- 🎯 PDF export functional and tested
- 🎯 Portfolio dashboard 70%+ complete
- 🎯 WCAG AA compliance achieved

---

## Appendix: Sprint Template for Teams

Each sprint should follow this cadence:

1. **Sprint Planning (Day 1):** Confirm scope, assign owners, identify risks
2. **Daily Standups (M–F):** 15min sync; blockers, progress, adjustments
3. **Mid-Sprint Check (Day 5):** Burn-down review; adjust scope if needed
4. **Code Review (Ongoing):** PR approval required before merge
5. **Testing (Day 8–9):** QA sign-off; manual testing on staging
6. **Sprint Review (Day 10):** Demo to stakeholders; gather feedback
7. **Retrospective (Day 10):** Team reflects on process improvements

---

*End of SPRINT_MASTER_PLAN.md*
