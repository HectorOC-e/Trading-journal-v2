# Technical Debt Register — Trading Journal v2

> **Last Updated: 2026-06-03**  
> Debt register merging original entries (TD-001–TD-024) with new architectural debt items (TD-025–TD-028) from the full audit. Items are never removed — status is updated in place.
> **Sprint 1 closed:** TD-001, TD-004, TD-006, TD-007, TD-021, TD-026 (6 items).  
> **Sprint 2 closed:** TD-005, TD-008, TD-009, TD-010, TD-011, TD-015, TD-025, TD-027, TD-028 (9 items).  
> **Sprint 3 closed:** TD-003 (admin client fix) (1 item + profile backend + 24 test additions).  
> **Pre-Sprint 4 closed:** Type contract, Theme CSS, Decimal serialization, Label mismatch, useEffect deps, Trade limit, Test discovery (8 findings, 5 tests added).  
> **Sprint 4 closed:** Psychology UI, auto-save, week selector, dashboard persistence, `any` types eliminated, `as never` casts reduced 12→4. Tests: 364 passing (+2 regression guards). (6 tasks, 2 regression tests).  
> **Sprint 5 closed:** AI config encryption (TD-022 partial: per-user encryption now implemented), cursor pagination (UUID order mismatch fixed), goal widget (weekly metrics corrected). React Query v5 callback removed. Prisma types regenerated; unused `@ts-expect-error` removed. Tests: 389 passing (+11). **Open items: 8 of 28 (TD-002, TD-012, TD-013, TD-014, TD-017, TD-018, TD-019, TD-020).**
> **Sprint 6 closed:** TD-013 (`as never` casts eliminated via `accounts.list` serialization + `AccountLike` narrowing), TD-014 (`LearningResource` now derived `Omit<RouterOutputs...> & { type: ResourceType; status: ResourceStatus }`). Tests: 407 (+18). **Sprint 6 QA added:** TD-029 (prefs cast guard), TD-030 (rate limit boundary), TD-031 (mutation serialization), TD-032 (test mock Decimal), TD-033 (rate limit algorithm isolation). **Open items: 11 of 33 (TD-002, TD-012, TD-017, TD-018, TD-019, TD-020, TD-023, TD-029, TD-030, TD-031, TD-032, TD-033).**  
> **Sprint 7 closed:** TD-002/TD-017 (discipline score centralization — already implemented, verified canonical formula in `lib/formulas/discipline.ts`), TD-020 (embedding now webhook-triggered, not fire-and-forget), TD-029 (`CYCLE.includes` guard on DB prefs), TD-030 (`>=` boundary in `InMemoryRateLimiter`), TD-031 (`serializeAccount` on all 5 mutation endpoints), TD-032 (`Prisma.Decimal` in accounts test mock), TD-033 (rate-limit tests import real `InMemoryRateLimiter`). Tests: 407 → 430 (+23).  
> **Sprint 7 QA fixed (post-ship):** B-01 IDOR in `ai-embed` (direct path userId filter + scoped UPDATE), B-02 unbounded body DoS (Content-Length cap 16 KB), M-01 stale `from` in `archive` audit log (`findUniqueOrThrow` before update), M-02 unguarded `localStorage` calls (try/catch), M-03 indistinguishable webhook errors (503/401 split + `crypto.timingSafeEqual`), M-04 unbounded tag input (`z.string().min(1).max(30)` + array `.max(20)`). Tests: 430 → 438 (+8 new + 2 updated). **Open items: 4 of 33 (TD-012, TD-018, TD-019, TD-023).**

---

## Summary Table

| ID | Severity | Category | Title | Effort | Task | Status |
|---|---|---|---|---|---|---|
| TD-001 | CRITICAL | Formula | Win Rate: 8 inline implementations | M | TASK-027, TASK-005 | **Closed** Sprint 1 |
| TD-002 | CRITICAL | Formula | Discipline Score: 3 independent implementations | S | TASK-011 | **Closed** Sprint 7 |
| TD-003 | CRITICAL | Functionality | Profile page entirely disconnected from backend | L | TASK-006 | **Closed** Sprint 3 |
| TD-004 | CRITICAL | Data | KPIs calculated over paginated data (max 50 trades) | S | TASK-001, TASK-009 | **Closed** Sprint 1 |
| TD-005 | CRITICAL | Logic | Phase promotion `objectiveMet = false` hardcoded | XS | TASK-002 | **Closed** Sprint 2 |
| TD-006 | CRITICAL | Security | CRON_SECRET security bypass in edge function | XS | TASK-016 | **Closed** Sprint 1 |
| TD-007 | HIGH | Data | `rMultiple` not calculated on CSV import | XS | TASK-004 | **Closed** Sprint 1 |
| TD-008 | HIGH | Performance | N+1 query in `resourceImpactRanking` | M | TASK-039 | **Closed** Sprint 2 |
| TD-009 | HIGH | Architecture | `learningResources.stats` CQRS violation | S | TASK-038 | **Closed** Sprint 2 |
| TD-010 | HIGH | Schema | `notes_embedding` and `email_log` outside Prisma schema | S | TASK-019 | **Closed** Sprint 2 |
| TD-011 | HIGH | Formula | Sharpe Ratio duplicated with different formula | XS | TASK-027 | **Closed** Sprint 2 |
| TD-012 | MEDIUM | Type Safety | `phasePayload as never` in accounts router | XS | — | Open |
| TD-013 | MEDIUM | Type Safety | 15+ `as never` casts in `trades/page.tsx` | M | TASK-013 | **Closed** Sprint 6 |
| TD-014 | MEDIUM | Type Safety | Manual `LearningResource` type duplicates RouterOutputs | S | TASK-014 | **Closed** Sprint 6 |
| TD-015 | MEDIUM | Dead Code | `trades.stats` procedure superseded by `dashboardStats` | XS | TASK-018 | **Closed** Sprint 2 |
| TD-016 | MEDIUM | Type Safety | `market: any` and `amount: any` props | XS | TASK-023 | **Closed** Sprint 4 |
| TD-017 | MEDIUM | Formula | Discipline score uses simplified formula in review modal | S | TASK-011 | **Closed** Sprint 7 |
| TD-018 | MEDIUM | Architecture | Inline business logic in router files (924-line trades.ts) | L | Ongoing | Open |
| TD-019 | MEDIUM | Performance | tRPC context recreates Supabase client per request | M | — | Open |
| TD-020 | MEDIUM | Reliability | Fire-and-forget embedding in same Node.js worker | M | TASK-058 | **Closed** Sprint 7 |
| TD-021 | MEDIUM | Security | Setup images uploaded from client without server validation | S | TASK-017 | **Closed** Sprint 1 |
| TD-022 | MEDIUM | Security | AI API keys encryption + per-user isolation | L | TASK-033 | **Closed** Sprint 5 (partial: per-user encryption implemented; env vars still at risk) |
| TD-023 | HIGH | Testing | Zero component or integration tests; no CI/CD | L+S | TASK-024, TASK-025 | Open |
| TD-029 | LOW | Type Safety | `prefs.theme` DB cast lacks `CYCLE.includes` guard | XS | — | **Closed** Sprint 7 |
| TD-030 | LOW | Reliability | Rate limiter window boundary off-by-one (`>` vs `>=`) | XS | — | **Closed** Sprint 7 |
| TD-031 | MEDIUM | Type Safety | Accounts mutations return unserialized `Decimal` over the wire | XS | — | **Closed** Sprint 7 |
| TD-032 | LOW | Testing | `accounts.test.ts` mock uses plain number not `Prisma.Decimal` | XS | — | **Closed** Sprint 7 |
| TD-033 | LOW | Testing | Rate limit test duplicates algorithm instead of importing it | S | — | **Closed** Sprint 7 |
| TD-024 | LOW | Documentation | No `.env.example`, no variables documentation | XS | TASK-059 | **Closed** Sprint 2 |
| TD-025 | MEDIUM | Data | Drawdown label on trades page shows "peor día" not drawdown | XS | TASK-028 | **Closed** Sprint 2 |
| TD-026 | MEDIUM | Data | `use-account-stats.ts` shows current-DD from ATH, not max-DD | XS | TASK-029 | **Closed** Sprint 1 |
| TD-027 | LOW | Config | AI model IDs stale (`claude-sonnet-4-5`, haiku with date suffix) | XS | TASK-015 | **Closed** Sprint 2 |
| TD-028 | LOW | Error Handling | `generateSummary` returns `{ error }` with HTTP 200 on failure | XS | TASK-037 | **Closed** Sprint 2 |

**Open items: 4 of 33 | Closed total: 29 items**  
**Remaining estimated effort: ~4 engineer-days to close all open items**  
**Test baseline: 438 passing (post Sprint 7 + Sprint 7 QA fixes)**

---

## Debt Index

- [Critical Debt](#critical-technical-debt-must-fix)
  - [TD-001](#td-001--win-rate-8-inline-implementations) · [TD-002](#td-002--discipline-score-3-independent-implementations) · [TD-003](#td-003--profile-page-entirely-disconnected-from-backend) · [TD-004](#td-004--kpis-calculated-over-paginated-data-max-50-trades) · [TD-005](#td-005--phase-promotion-objectivemet--false-hardcoded) · [TD-006](#td-006--cron_secret-security-bypass-in-edge-function)
- [High Debt](#high-technical-debt)
  - [TD-007](#td-007--rmultiple-not-calculated-on-csv-import) · [TD-008](#td-008--n1-query-in-resourceimpactranking) · [TD-009](#td-009--learningresourcesstats-cqrs-violation) · [TD-010](#td-010--notes_embedding-and-email_log-outside-prisma-schema) · [TD-011](#td-011--sharpe-ratio-duplicated-with-different-formula) · [TD-023](#td-023--zero-component-or-integration-tests)
- [Code Quality Debt](#code-quality-debt)
  - [TD-012](#td-012--phasepayload-as-never-in-accounts-router) · [TD-013](#td-013--15-as-never-casts-in-tradespagetsx) · [TD-014](#td-014--manual-learningresource-type-duplicates-routeroutputs) · [TD-015](#td-015--tradesstats-dead-code) · [TD-016](#td-016--market-any-and-amount-any-props) · [TD-017](#td-017--discipline-score-in-review-modal-uses-simplified-frontend-formula)
- [Architecture Debt](#architecture-debt)
  - [TD-018](#td-018--inline-business-logic-in-router-files) · [TD-019](#td-019--trpc-context-recreates-supabase-client-per-request) · [TD-020](#td-020--fire-and-forget-embedding-in-same-nodejs-worker)
- [Security Debt](#security-debt)
  - [TD-021](#td-021--setup-images-uploaded-directly-from-client-without-server-validation) · [TD-022](#td-022--ai-api-keys-stored-as-plaintext-in-environment-no-per-user-encryption)
- [Data Debt](#data-debt-new)
  - [TD-025](#td-025--drawdown-label-mismatch) · [TD-026](#td-026--use-account-stats-current-dd-not-max-dd)
- [Config Debt](#config-debt-new)
  - [TD-027](#td-027--stale-ai-model-ids) · [TD-028](#td-028--generatesummary-http-200-on-failure)
- [Documentation Debt](#documentation-debt)
  - [TD-024](#td-024--no-envexample-no-variables-documentation)

---

## Critical Technical Debt (Must Fix)

These items produce incorrect data, broken features, or security vulnerabilities **today**.

---

### ~~TD-001 — Win Rate: 8 Inline Implementations~~ ✅ Closed Sprint 1

- **Resolution:** `src/lib/formulas/` barrel module created (Phase 1). `isWin({ pnl })` and `calcWinRate()` exported as canonical functions. All 8 call sites migrated to `isWin()` (Phase 2). `trading-sessions.ts` migrated in QA fix commit.
- **Commit:** `c423f63` (fix commit) and `0b8d76a` (Phase 2 migration)
- **Tasks:** TASK-027 ✅, TASK-005 ✅

---

### TD-002 — Discipline Score: 3 Independent Implementations

- **Locations:**
  - `src/server/trpc/routers/weekly-reviews.ts` (`computedDisciplineScore` — server, weighted multi-factor)
  - `src/server/trpc/routers/weekly-reviews.ts` (`prefill` — server, duplicated inline)
  - `src/components/modals/create-review-modal.tsx:103` (frontend — simplified tag-count formula `disciplinedCount / total * 100`)
- **Root cause:** No shared `computeDisciplineScore` function. Frontend uses simplified formula; server uses weighted formula (execution 50pts + learning 30pts + adherence 20pts).
- **Impact:** Score shown in review creation modal can differ from the server-computed score for the same week. Traders track this metric for behavioral improvement — inconsistency erodes trust.
- **Fix:** Extract `computeDisciplineScore(params)` into `lib/trading-formulas.ts`. Frontend calls server-provided value only.
- **Effort:** S | **Risk if not fixed:** UI shows score A, saved review has score B.
- **Task:** TASK-011

---

### ~~TD-003 — Profile Page: Entirely Disconnected from Backend~~ ✅ Closed Sprint 3

- **Resolution:** `src/server/trpc/routers/profile.ts` implemented with all 5 procedures. `src/app/perfil/page.tsx` fully connected with `useEffect` initialization from `profile.get` query. All mutations (update, changePassword, exportData, deleteAccount) wired with tRPC and error handling via `onError` callbacks. B-002 blocker fixed: `deleteAccount` now uses service-role `createAdminClient()` instead of anon client for `auth.admin.deleteUser()`. Cache invalidation gates on actual currency/timezone changes. All 14 fields persisted and restored on page load.
- **Blocking bug (B-002):** `deleteAccount` was calling `ctx.supabase.auth.admin.deleteUser()` which returns 403 with anon key. Fixed with `src/lib/supabase/admin.ts` factory and service-role key. Prisma delete happens before auth delete (order guarantee).
- **Tests:** `src/__tests__/routers/profile.test.ts` (18 tests) covering get, update (M-005 date serialization + M-004 cache gate), changePassword, deleteAccount (B-002 admin client verification).
- **Commits:** Profile backend implementation + QA audit fixes
- **Task:** TASK-006 ✅

---

### ~~TD-004 — KPIs Calculated Over Paginated Data (Max 50 Trades)~~ ✅ Closed Sprint 1

- **Resolution:** All three pages (`trades`, `reviews`, `cuentas`) migrated to `trpc.trades.dashboardStats.useQuery({ period: "ALL" })`. KPIs now computed server-side over the full trade history regardless of pagination. `useAccountStats` hook deleted (dead code after migration).
- **Commits:** `cb6cdc6` (Phase 3 analytics correctness)
- **Tasks:** TASK-001 ✅, TASK-009 ✅

---

### ~~TD-005 — Phase Promotion: `objectiveMet = false` Hardcoded~~ ✅ Closed Sprint 2

- **Resolution:** `promote-phase-modal.tsx` now receives `netPnl` as a prop and computes `objectiveMet = netPnl >= (targetPct / 100) * initialBalance`. All phase promotions now correctly reflect whether the account has met the profit objective. Users no longer see hardcoded "objective not met."
- **Commit:** Included in Sprint 2 (TASK-002)
- **Task:** TASK-002 ✅

---

### ~~TD-006 — CRON_SECRET Security Bypass in Edge Function~~ ✅ Closed Sprint 1

- **Resolution:** `isAuthorized()` now returns `false` immediately when `CRON_SECRET` is absent or empty string. Unauthenticated calls receive HTTP 401. The alternative `Bearer ${SUPABASE_SERVICE_ROLE}` path is intentional (Supabase scheduler) and documented in `docs/SPRINT_1_QA_REPORT.md`.
- **Commit:** `cb6cdc6` (Phase 4 security hardening)
- **Task:** TASK-016 ✅

---

## High Technical Debt

---

### ~~TD-007 — `rMultiple` Not Calculated on CSV Import~~ ✅ Closed Sprint 1

- **Resolution:** `calcRMultiple()` from `@/lib/formulas` now called during import. Guard includes `row.sl !== 0` to handle the parser sentinel for "no stop loss recorded" (both MT4 and cTrader parsers return `sl=0` when no stop exists). Trades without a stop receive `rMultiple = null`.
- **Critical fix (B-001):** The initial implementation missed the `sl=0` sentinel; the QA audit caught it before production.
- **Commit:** `9bdf47f` (Phase 5) + `c423f63` (B-001 fix)
- **Task:** TASK-004 ✅

---

### ~~TD-008 — N+1 Query in `resourceImpactRanking`~~ ✅ Closed Sprint 2

- **Resolution:** `resourceImpactRanking` now uses a single batched `trades.findMany()` call for all affected setups, then groups results in-memory by `setupId`. Query count reduced from O(N×S×2) to O(2) — single trade fetch, single resource fetch. Performance now linear with catalog size.
- **Commit:** Included in Sprint 2 (TASK-039)
- **Task:** TASK-039 ✅

---

### ~~TD-009 — `learningResources.stats` CQRS Violation~~ ✅ Closed Sprint 2

- **Resolution:** `learningResources.stats` is now read-only; returns `decayedCount: 0` with no side effects. New `processDecayTransitions` mutation handles all MASTERED→IN_REVIEW transitions. Aprendizaje page calls mutation on load before stats queries. Stats procedure is now cache-safe and CQRS-compliant.
- **Commit:** Included in Sprint 2 (TASK-038)
- **Task:** TASK-038 ✅

---

### ~~TD-010 — `notes_embedding` and `email_log` Outside Prisma Schema~~ ✅ Closed Sprint 2

- **Resolution:** Both `TradeEmbedding` and `EmailLog` models now fully defined in `schema.prisma` with all fields, relations, indexes, and unique constraints. `User` model updated with array relations. Schema now reflects actual database structure. (Note: migration not yet applied to DB — deferred as TD-S2-004 for Phase 3.)
- **Commit:** Included in Sprint 2 (TASK-019)
- **Task:** TASK-019 ✅

---

### ~~TD-011 — Sharpe Ratio Duplicated with Different Formula~~ ✅ Closed Sprint 2

- **Resolution:** `ai-context.ts` now imports and uses `calcSharpeRatio()` from centralized `lib/formulas/performance.ts`. Inline population std dev formula removed. AI coach and dashboard now use identical Bessel-corrected sample std dev formula across the application.
- **Commit:** Included in Sprint 2 (implements TASK-027)
- **Task:** TASK-027 ✅

---

### TD-023 — Zero Component or Integration Tests

- **Current state:** 11 unit test files in `src/__tests__/`, all mocking Prisma. No React Testing Library tests. No Playwright or Cypress e2e tests. No CI/CD pipeline.
- **Coverage gaps:** Trade creation/closing, weekly review form, phase promotion, formula calculations
- **Fix:**
  1. RTL tests: register-trade-modal, close-trade-modal, create-review-modal, phase promotion (TASK-024)
  2. Playwright smoke tests: login, create trade, navigate dashboard (TASK-025)
  3. GitHub Actions CI with lint + typecheck + unit tests on every PR
- **Effort:** L + S | **Tasks:** TASK-024, TASK-025

---

## Code Quality Debt

---

### TD-012 — `phasePayload as never` in Accounts Router

- **Location:** `src/server/trpc/routers/accounts.ts:163`
- **Root cause:** `payload: phasePayload as never` used to bypass Prisma's `Json` type.
- **Impact:** Type safety loss around phase promotion payload. Shape changes silently break.
- **Fix:** Define `PhasePayload` interface; remove `as never`. Prisma's `Json` accepts any object.
- **Effort:** XS

---

### TD-013 — 15+ `as never` Casts in `trades/page.tsx` — ✅ 67% Resolved (Sprint 4)

- **Location:** `src/app/trades/page.tsx:227–371`
- **Root cause:** `SerializedTrade` type not aligned with props expected by `TradeDetailPanel`, `EditTradeModal`.
- **Impact:** TypeScript provides no protection over trade-related prop changes.
- **Resolution:** Replaced 8 of 12 `as never` casts with proper `RouterOutputs` types. Remaining 4 casts (lines 256, 374, 376, 399) annotated as `// TD-013` — they bridge the `account.initialBalance` field which is serialized as `number` in trades.list but remains Prisma `Decimal` in accounts.list. This type inconsistency is architectural and requires standardized serialization across both routers (deferred to next refactor phase).
- **Effort:** M | **Task:** TASK-013 ✅ (67% complete)

---

### TD-014 — Manual `LearningResource` Type Duplicates RouterOutputs

- **Location:** `src/types/index.ts:~90`
- **Root cause:** `LearningResource` interface defined manually, now diverges from `RouterOutputs["learningResources"]["list"][0]`.
- **Impact:** Forces `as unknown as LearningResource[]` casts in `aprendizaje/page.tsx`.
- **Fix:** Delete manual interface. Export `type LearningResource = RouterOutputs["learningResources"]["list"][0]`.
- **Effort:** S | **Task:** TASK-014

---

### ~~TD-015 — `trades.stats` Dead Code~~ ✅ Closed Sprint 2

- **Resolution:** `trades.stats` procedure replaced with stub returning hardcoded zeros. Added `@deprecated` comment explaining it was superseded by `dashboardStats`. Unused imports (`calcProfitFactor`, `calcExpectancyR`) removed. Code is now explicitly marked as deprecated for future cleanup in Phase 3.
- **Commit:** Included in Sprint 2 (TASK-018)
- **Task:** TASK-018 ✅

---

### TD-016 — `market: any` and `amount: any` Props — ✅ Closed (Sprint 4 TASK-023)

- **Locations (resolved):**
  - ✅ `src/app/mercados/page.tsx` — `market: any` replaced with proper `RouterOutputs["markets"]["list"][0]` type; major finding M-01 (`editing: any`) also fixed
  - ✅ `src/app/retiros/page.tsx` — `amount: any` replaced with proper typed state; M-02 (loading state) also fixed in same file
- **Resolution:** Both locations now use correct RouterOutputs types. Related major findings (M-01 in mercados, M-02 in retiros) resolved as part of QA fixes.
- **Task:** ✅ TASK-023 Complete

---

### TD-017 — Discipline Score in Review Modal Uses Simplified Frontend Formula

- **Location:** `src/components/modals/create-review-modal.tsx:103`
- **Root cause:** Modal computes `disciplinedCount / total * 100` locally. Server computes weighted multi-factor score. Diverge when server formula changes.
- **Fix:** Remove local computation. Fetch from server via `prefill`. Show loading state.
- **Effort:** S | Covered by **TASK-011**

---

## Architecture Debt

---

### TD-018 — Inline Business Logic in Router Files

- **Location:** `src/server/trpc/routers/trades.ts` (924 lines), `src/server/trpc/routers/learning-resources.ts` (680 lines)
- **Root cause:** Business logic in router files instead of `src/domains/` services layer. `domains/trading/trade-service.ts` exists but not used consistently.
- **Impact:** Routers untestable in isolation. Business rules not reusable from edge functions or batch jobs.
- **Fix (incremental):** Extract dashboardStats computation into `dashboard-analytics.ts` (partially done). Extract trade creation/close logic into `trade-service.ts`. Routers become thin orchestration.
- **Effort:** L (ongoing refactor)

---

### TD-019 — tRPC Context Recreates Supabase Client Per Request

- **Location:** `src/server/trpc/init.ts` — `createTRPCContext()`
- **Root cause:** Every tRPC request creates a new Supabase client and calls `supabase.auth.getUser()`. One auth API round-trip per request.
- **Impact:** Latency overhead on every authenticated request. Bottleneck at scale.
- **Fix:** Extract `userId` from JWT in Next.js middleware and pass as request header. `createTRPCContext` reads the header.
- **Effort:** M

---

### TD-020 — Fire-and-Forget Embedding in Same Node.js Worker

- **Location:** `src/server/trpc/routers/trades.ts` — `scheduleEmbedding()`
- **Root cause:** `scheduleEmbedding()` calls `fetch("/api/ai-embed")` in background within the same process. No guarantee fetch completes before connection closes in serverless environments (Vercel).
- **Impact:** Embeddings may silently not be created for some trades in serverless deployments.
- **Fix:** Move embedding to a Supabase Edge Function triggered by DB webhook, or use Upstash QStash.
- **Effort:** M

---

## Security Debt

---

### ~~TD-021 — Setup Images Uploaded Directly from Client Without Server Validation~~ ✅ Closed Sprint 1

- **Resolution:** `src/app/api/upload/setup-image/route.ts` Route Handler added. Validates MIME type (jpeg/png/webp allowlist), file size (5 MB max). Returns structured error reasons (`INVALID_MIME`, `FILE_TOO_LARGE`). Playbook page migrated from direct Supabase Storage client upload to Route Handler. Upload errors now surface to the user. Path generation uses `crypto.randomUUID()`.
- **Commit:** `cb6cdc6` (Phase 4) + `c423f63` (M-002 error feedback fix)
- **Task:** TASK-017 ✅

---

### TD-022 — AI API Keys Stored as Plaintext in Environment (No Per-User Encryption)

- **Location:** `src/lib/ai/config.ts` — all keys read from `process.env`
- **Root cause:** Multi-tenant key storage was not part of initial design. No `UserAiConfig` table.
- **Impact:** All users share the same API key and cost center. Per-user BYOK impossible.
- **Fix:** Add `UserAiConfig` model with AES-256-GCM encrypted key storage. `key-encryption.ts`. Keys resolved per-user at request time.
- **Effort:** L | **Task:** TASK-033

---

## Data Debt (New)

---

### ~~TD-025 — Drawdown Label Mismatch~~ ✅ Closed Sprint 2

- **Resolution:** KPI correctly labeled "Peor día" (worst day) using `kpisAll.worstDay` from dashboardStats. Metric accurately reflects minimum single-day P&L, now with proper labeling. Traders no longer confused about drawdown vs. worst daily loss.
- **Commit:** Included in Sprint 2 (TASK-028)
- **Task:** TASK-028 ✅

---

### ~~TD-026 — `use-account-stats.ts` Current-DD Not Max-DD~~ ✅ Closed Sprint 1

- **Resolution:** `use-account-stats.ts` deleted (dead code — only caller removed in Phase 3). `cuentas/page.tsx` now reads `drawdownPct` from `dashboardStats`, which uses `computeMaxDrawdown()` from `account-service.ts` — the canonical max-DD computation over full trade history.
- **Commit:** `cb6cdc6` (Phase 3) + `c423f63` (N-003 deletion)
- **Task:** TASK-029 ✅

---

## Config Debt (New)

---

### ~~TD-027 — Stale AI Model IDs~~ ✅ Closed Sprint 2

- **Resolution:** `src/lib/ai/config.ts` updated: `getCoachModel()` now returns `claude-sonnet-4-6` (was `claude-sonnet-4-5`). AI coach uses current model version. TASK-015 completed this fix.
- **Commit:** Included in Sprint 2 (TASK-015)
- **Task:** TASK-015 ✅

---

### ~~TD-028 — `generateSummary` HTTP 200 on Failure~~ ✅ Closed Sprint 2

- **Resolution:** `generateSummary` now throws `TRPCError` on failure (PRECONDITION_FAILED for NO_API_KEY, INTERNAL_SERVER_ERROR for stream failures) instead of returning `{ error }`. Client `onError` handler receives error.message and shows toast. Error handling is now reliable and user-facing.
- **Commit:** Included in Sprint 2 (TASK-037)
- **Task:** TASK-037 ✅

---

## Documentation Debt

---

### ~~TD-024 — No `.env.example`, No Variables Documentation~~ ✅ Closed Sprint 2

- **Resolution:** `.env.example` created in project root documenting all 15+ required environment variables with security notes, including DATABASE_URL, Supabase keys, AI provider keys, model overrides, and CRON_SECRET.
- **Commit:** Included in Sprint 2 (TASK-059)
- **Task:** TASK-059 ✅

---

## Debt Payoff Schedule

### Q2 2026 (Weeks 1–8) — Critical + High Debt

| Item | Tasks | Outcome |
|---|---|---|
| TD-001 Win Rate | TASK-027, TASK-005 | Single source of truth for all financial formulas |
| TD-002 Discipline Score | TASK-011 | Consistent score across UI and server |
| TD-003 Profile Disconnected | TASK-006 | Profile fully functional; legal risk eliminated |
| TD-004 KPI Pagination | TASK-001, TASK-009 | All metrics correct regardless of trade history size |
| TD-005 Phase Promotion | TASK-002 | Prop-firm workflow unblocked |
| TD-006 CRON_SECRET | TASK-016 | Edge function secured |
| TD-007 rMultiple Import | TASK-004 | Imported trades have correct R-multiples |
| TD-008 N+1 Query | TASK-039 | Learning catalog scales linearly |
| TD-009 CQRS Violation | TASK-038 | Stats procedure is read-only and cache-safe |
| TD-011 Sharpe Duplicate | TASK-027 | Consistent Sharpe Ratio everywhere |
| TD-021 Storage Security | TASK-017 | Server-validated uploads only |
| TD-024 .env.example | Sprint 1 | Documented environment setup |
| TD-025 Drawdown Label | TASK-028 | Accurate metric labels |
| TD-026 Current-DD | TASK-029 | Accurate drawdown in account cards |
| TD-027 Model IDs | TASK-032 | Current model IDs in production |
| TD-028 HTTP 200 error | TASK-037 | Reliable error handling in reviews |

### Q3 2026 (Weeks 9–18) — Code Quality + Architecture Debt

| Item | Tasks | Outcome |
|---|---|---|
| TD-010 Schema Drift | TASK-019 | Prisma schema reflects actual DB state |
| TD-013 as never casts | TASK-013 | TypeScript strict across trades UI |
| TD-014 Type duplication | TASK-014 | Single LearningResource type |
| TD-015 Dead code | TASK-018 | trades.stats removed or documented |
| TD-016 any props | TASK-023 | Zero any-typed props in components |
| TD-018 Router logic | Ongoing | Business logic extracted to domains/ |
| TD-022 AI Keys | TASK-033 | Per-user encrypted key storage |
| TD-023 No tests | TASK-024, TASK-025 | RTL + Playwright coverage; CI pipeline |

### Q4 2026+ — Architecture and Performance Debt

| Item | Tasks | Outcome |
|---|---|---|
| TD-019 Auth per-request | Future | JWT header auth; no auth API calls in tRPC context |
| TD-020 Fire-and-forget embed | Future | Reliable embedding via DB webhook or queue |
| TD-018 Domain extraction | Ongoing | Routers < 200 lines each; logic in domains/ |

---

## Sprint 6 QA Debt (added 2026-06-03)

Items deferred from the Sprint 6 QA audit (Minor and Nitpick findings). None block production; all targeted for Sprint 7 cleanup.

---

### TD-029 — `prefs.theme` DB cast lacks `CYCLE.includes` guard

- **Location:** `src/components/theme-provider.tsx:44`
- **Severity:** LOW — inconsistency; could cause subtle bug with stale DB rows
- **Root cause:** The localStorage path guards with `CYCLE.includes(saved)` before calling `setThemeState`. The DB prefs path does `setThemeState(prefs.theme as ThemeMode)` without validating the value is in `CYCLE`. A stale DB row with an unknown theme value would be applied directly.
- **Fix:** `if (prefs?.theme && CYCLE.includes(prefs.theme as ThemeMode)) setThemeState(prefs.theme as ThemeMode)`
- **Effort:** XS | **Source:** Sprint 6 QA m-001

---

### TD-030 — Rate limiter window boundary off-by-one

- **Location:** `src/app/api/ai-test/route.ts:17`
- **Severity:** LOW — users blocked 1ms beyond the advertised 60s window
- **Root cause:** Condition `now - entry.windowStart > RATE_LIMIT_WINDOW` uses strict `>`. At exactly `now === windowStart + 60000`, the window has elapsed but the condition is false; the user sees "try again in 0s" but is still blocked.
- **Fix:** Change `>` to `>=`
- **Effort:** XS | **Source:** Sprint 6 QA m-002

---

### TD-031 — Accounts mutation endpoints return unserialized `Decimal` over the wire

- **Location:** `src/server/trpc/routers/accounts.ts:84,123,183,197`
- **Severity:** MEDIUM — type contract inconsistency between `list` and mutations
- **Root cause:** `serializeAccount` is correctly applied in `accounts.list`, but `create`, `update`, `changeStatus`, `changePhase`, and `archive` return raw Prisma objects. Since no `superjson` transformer is used, Prisma `Decimal` serializes via `.toJSON()` to a string `"10000.00"`. `RouterOutputs["accounts"]["create"]` will have `initialBalance: string` while `RouterOutputs["accounts"]["list"][number]` has `initialBalance: number`.
- **Impact:** Currently latent (callers use mutation return only for cache invalidation). Any future code reading `initialBalance` from a mutation result will silently get a string.
- **Fix:** Apply `return serializeAccount(account)` to all 5 mutation endpoints.
- **Effort:** XS | **Source:** Sprint 6 QA m-003

---

### TD-032 — `accounts.test.ts` mock uses plain JS number instead of `Prisma.Decimal`

- **Location:** `src/__tests__/routers/accounts.test.ts:52`
- **Severity:** LOW — test gives false confidence in Decimal serialization
- **Root cause:** `findMany` mock resolves with `initialBalance: 10000` (JS number). Real Prisma returns `initialBalance: Decimal("10000.00")`. The test passes even if `serializeAccount` were deleted, because `Number(10000) === 10000`.
- **Fix:** Use `new Prisma.Decimal("10000.50")` in the mock; assert `typeof result[0].initialBalance === "number"`.
- **Effort:** XS | **Source:** Sprint 6 QA m-006

---

### TD-033 — Rate limit test duplicates algorithm instead of importing it

- **Location:** `src/__tests__/routers/rate-limit.test.ts:9–25`
- **Severity:** LOW — changes to production algorithm don't break tests
- **Root cause:** The test re-implements `checkRateLimit` as a `makeRateLimiter` factory. If the production algorithm in `route.ts` is changed, these tests continue passing without detecting the regression.
- **Fix:** Extract `checkRateLimit` from `route.ts` into `src/lib/rate-limiter.ts`. Import and test the real function. This also enables the Redis-backed implementation (TD-031 full fix for M-004) to be swapped by replacing the module.
- **Effort:** S | **Source:** Sprint 6 QA n-004 (coupled with M-004 Redis fix)
