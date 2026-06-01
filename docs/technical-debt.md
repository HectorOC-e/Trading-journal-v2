# Technical Debt Register — Trading Journal v2

> **Last Updated: 2026-06-01**  
> Debt register merging original entries (TD-001–TD-024) with new architectural debt items (TD-025–TD-028) from the full audit. Items are never removed — status is updated in place.
> **Sprint 1 closed:** TD-001, TD-004, TD-006, TD-007, TD-021, TD-026 (6 items).

---

## Summary Table

| ID | Severity | Category | Title | Effort | Task | Status |
|---|---|---|---|---|---|---|
| TD-001 | CRITICAL | Formula | Win Rate: 8 inline implementations | M | TASK-027, TASK-005 | **Closed** Sprint 1 |
| TD-002 | CRITICAL | Formula | Discipline Score: 3 independent implementations | S | TASK-011 | Open |
| TD-003 | CRITICAL | Functionality | Profile page entirely disconnected from backend | L | TASK-006 | Open |
| TD-004 | CRITICAL | Data | KPIs calculated over paginated data (max 50 trades) | S | TASK-001, TASK-009 | **Closed** Sprint 1 |
| TD-005 | CRITICAL | Logic | Phase promotion `objectiveMet = false` hardcoded | XS | TASK-002 | Open |
| TD-006 | CRITICAL | Security | CRON_SECRET security bypass in edge function | XS | TASK-016 | **Closed** Sprint 1 |
| TD-007 | HIGH | Data | `rMultiple` not calculated on CSV import | XS | TASK-004 | **Closed** Sprint 1 |
| TD-008 | HIGH | Performance | N+1 query in `resourceImpactRanking` | M | TASK-039 | Open |
| TD-009 | HIGH | Architecture | `learningResources.stats` CQRS violation | S | TASK-038 | Open |
| TD-010 | HIGH | Schema | `notes_embedding` and `email_log` outside Prisma schema | S | TASK-019 | Open |
| TD-011 | HIGH | Formula | Sharpe Ratio duplicated with different formula | XS | TASK-027 | Open |
| TD-012 | MEDIUM | Type Safety | `phasePayload as never` in accounts router | XS | — | Open |
| TD-013 | MEDIUM | Type Safety | 15+ `as never` casts in `trades/page.tsx` | M | TASK-013 | Open |
| TD-014 | MEDIUM | Type Safety | Manual `LearningResource` type duplicates RouterOutputs | S | TASK-014 | Open |
| TD-015 | MEDIUM | Dead Code | `trades.stats` procedure superseded by `dashboardStats` | XS | TASK-018 | Open |
| TD-016 | MEDIUM | Type Safety | `market: any` and `amount: any` props | XS | TASK-023 | Open |
| TD-017 | MEDIUM | Formula | Review modal discipline score uses simplified frontend formula | S | TASK-011 | Open |
| TD-018 | MEDIUM | Architecture | Inline business logic in router files (924-line trades.ts) | L | Ongoing | Open |
| TD-019 | MEDIUM | Performance | tRPC context recreates Supabase client per request | M | — | Open |
| TD-020 | MEDIUM | Reliability | Fire-and-forget embedding in same Node.js worker | M | — | Open |
| TD-021 | MEDIUM | Security | Setup images uploaded from client without server validation | S | TASK-017 | **Closed** Sprint 1 |
| TD-022 | MEDIUM | Security | AI API keys as plaintext env vars (no per-user encryption) | L | TASK-033 | Open |
| TD-023 | HIGH | Testing | Zero component or integration tests; no CI/CD | L+S | TASK-024, TASK-025 | Open |
| TD-024 | LOW | Documentation | No `.env.example`, no variables documentation | XS | Sprint 1 | Open |
| TD-025 | MEDIUM | Data | Drawdown label on trades page shows "peor día" not drawdown | XS | TASK-028 | Open |
| TD-026 | MEDIUM | Data | `use-account-stats.ts` shows current-DD from ATH, not max-DD | XS | TASK-029 | **Closed** Sprint 1 |
| TD-027 | LOW | Config | AI model IDs stale (`claude-sonnet-4-5`, haiku with date suffix) | XS | TASK-032 | Open |
| TD-028 | LOW | Error Handling | `generateSummary` returns `{ error }` with HTTP 200 on failure | XS | TASK-037 | Open |

**Open items: 22 of 28 | Sprint 1 closed: 6 (TD-001, TD-004, TD-006, TD-007, TD-021, TD-026)**  
**Remaining estimated effort: ~16 engineer-days to close all open items**

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

### TD-003 — Profile Page: Entirely Disconnected from Backend

- **Location:** `src/app/perfil/page.tsx` — entire file
- **Root cause:** All 14 form fields use `useState` with hardcoded defaults. Zero tRPC calls. "Guardar cambios", "Cambiar contraseña", "Exportar datos", "Cerrar sesión", "Borrar cuenta" have no `onClick` handlers.
- **DB fields that exist but are never read/written:**
  - `User.timezone` (shown but not saved — session classification ignores it)
  - `User.baseCurrency` (not shown)
  - `User.language` (shown but not saved)
  - `User.weeklyGoalMinutes` (not shown)
  - `User.emailNotifications` (toggle shown but not saved)
  - `User.currentStreak`, `User.bestStreak` (not shown on profile)
- **Missing procedures:** `profile.get`, `profile.update`, `profile.changePassword`, `profile.exportData`, `profile.deleteAccount`
- **Impact:** Profile-to-App propagation score = 0/14. Legal risk: "Borrar cuenta" is a GDPR-equivalent requirement.
- **Fix:** New `src/server/trpc/routers/profile.ts` with 5 procedures; connect all UI fields.
- **Effort:** L | **Risk if not fixed:** Users lose all settings on reload. Legal exposure in regulated jurisdictions.
- **Task:** TASK-006

---

### ~~TD-004 — KPIs Calculated Over Paginated Data (Max 50 Trades)~~ ✅ Closed Sprint 1

- **Resolution:** All three pages (`trades`, `reviews`, `cuentas`) migrated to `trpc.trades.dashboardStats.useQuery({ period: "ALL" })`. KPIs now computed server-side over the full trade history regardless of pagination. `useAccountStats` hook deleted (dead code after migration).
- **Commits:** `cb6cdc6` (Phase 3 analytics correctness)
- **Tasks:** TASK-001 ✅, TASK-009 ✅

---

### TD-005 — Phase Promotion: `objectiveMet = false` Hardcoded

- **Location:** `src/app/cuentas/modals/promote-phase-modal.tsx:41`
- **Root cause:** TODO left in production code. `objectiveMet = false` never replaced with real comparison logic.
- **Impact:** Every prop-firm trader advancing phases always sees "objective not met."
- **Fix:** Compare `account.netPnl` against `account.targetPct * initialBalance`.
- **Effort:** XS | **Task:** TASK-002

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

### TD-008 — N+1 Query in `resourceImpactRanking`

- **Location:** `src/server/trpc/routers/learning-resources.ts:~350`
- **Root cause:** Iterates resources × setups, issuing 2 Prisma queries per pair. 20 resources × 10 setups = 400 DB round-trips.
- **Impact:** Severe performance degradation for users with populated catalogs. Latency grows quadratically.
- **Fix:** Single aggregated query using `prisma.resourceReview.groupBy()` or raw SQL with JOIN.
- **Effort:** M | **Task:** TASK-039

---

### TD-009 — `learningResources.stats` CQRS Violation

- **Location:** `src/server/trpc/routers/learning-resources.ts:~400`
- **Root cause:** `stats` query procedure auto-transitions resources from `MASTERED` → `IN_REVIEW` as a side effect.
- **Impact:** Read operation triggers state changes. Makes caching unsafe. Unpredictable behavior.
- **Fix:** Move transition logic to a `processDecayTransitions` mutation.
- **Effort:** S | **Task:** TASK-038

---

### TD-010 — `notes_embedding` and `email_log` Outside Prisma Schema

- **Locations:**
  - `notes_embedding vector(1536)` — raw SQL via `prisma.$executeRaw` in `routers/trades.ts`
  - `email_log` — used by edge function for idempotency; not in `schema.prisma`
- **Root cause:** Both added as raw SQL migrations without updating `schema.prisma`.
- **Impact:** New environment provisioning will not create these. Silent failures in embedding and email deduplication.
- **Fix:** Add `model EmailLog` to `schema.prisma`. Add `TradeEmbedding` model or document raw SQL migration in `supabase/migrations/`.
- **Effort:** S | **Task:** TASK-019

---

### TD-011 — Sharpe Ratio Duplicated with Different Formula

- **Location:** `src/domains/analytics/ai-context.ts:185–191`
- **Root cause:** `ai-context.ts` implements Sharpe Ratio inline using **population** std dev. `src/lib/formulas.ts:42` (`calcSharpeRatio`) uses **Bessel-corrected sample** std dev.
- **Impact:** AI coach receives a different Sharpe Ratio than dashboard displays. Coaching insights based on inconsistent data.
- **Fix:** Replace inline implementation in `ai-context.ts` with call to `calcSharpeRatio` from `lib/formulas.ts`.
- **Effort:** XS | **Task:** TASK-027

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

### TD-013 — 15+ `as never` Casts in `trades/page.tsx`

- **Location:** `src/app/trades/page.tsx:227–371`
- **Root cause:** `SerializedTrade` type not aligned with props expected by `TradeDetailPanel`, `EditTradeModal`.
- **Impact:** TypeScript provides no protection over trade-related prop changes.
- **Fix:** Replace `SerializedTrade` usages with `RouterOutputs["trades"]["list"]["items"][0]`.
- **Effort:** M | **Task:** TASK-013

---

### TD-014 — Manual `LearningResource` Type Duplicates RouterOutputs

- **Location:** `src/types/index.ts:~90`
- **Root cause:** `LearningResource` interface defined manually, now diverges from `RouterOutputs["learningResources"]["list"][0]`.
- **Impact:** Forces `as unknown as LearningResource[]` casts in `aprendizaje/page.tsx`.
- **Fix:** Delete manual interface. Export `type LearningResource = RouterOutputs["learningResources"]["list"][0]`.
- **Effort:** S | **Task:** TASK-014

---

### TD-015 — `trades.stats` Dead Code

- **Location:** `src/server/trpc/routers/trades.ts` — `stats` procedure
- **Root cause:** `stats` was the original KPI procedure. `dashboardStats` superseded it but `stats` remains.
- **Fix:** Audit consumers with `grep -r "trades\.stats"`. If none, deprecate with JSDoc comment and TODO.
- **Effort:** XS | **Task:** TASK-018

---

### TD-016 — `market: any` and `amount: any` Props

- **Locations:**
  - `src/app/mercados/page.tsx:68` — `market: any` with eslint-disable
  - `src/app/retiros/page.tsx:116–117` — inline type `{ amount: any; date: any }`
- **Fix:** Use `RouterOutputs["markets"]["list"][0]` and `RouterOutputs["withdrawals"]["list"][0]`.
- **Effort:** XS | **Task:** TASK-023

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

### TD-025 — Drawdown Label Mismatch

- **Location:** `src/app/trades/page.tsx:131–170`
- **Root cause:** "Drawdown" KPI is labeled "peor día" but actually shows `minDay` = minimum single-day P&L sum. Not a drawdown metric.
- **Impact:** Prop-firm traders relying on drawdown tracking see wrong data.
- **Fix:** Rename to "Peor día". Add real drawdown metric using `computeMaxDrawdown`.
- **Effort:** XS | **Task:** TASK-028

---

### ~~TD-026 — `use-account-stats.ts` Current-DD Not Max-DD~~ ✅ Closed Sprint 1

- **Resolution:** `use-account-stats.ts` deleted (dead code — only caller removed in Phase 3). `cuentas/page.tsx` now reads `drawdownPct` from `dashboardStats`, which uses `computeMaxDrawdown()` from `account-service.ts` — the canonical max-DD computation over full trade history.
- **Commit:** `cb6cdc6` (Phase 3) + `c423f63` (N-003 deletion)
- **Task:** TASK-029 ✅

---

## Config Debt (New)

---

### TD-027 — Stale AI Model IDs

- **Location:** `src/lib/ai/config.ts:~40`
- **Root cause:** `getCoachModel()` returns `claude-sonnet-4-5` (current: `claude-sonnet-4-6`). `getWeeklySummaryModel()` returns `claude-haiku-4-5-20251001` — date suffix is non-standard.
- **Impact:** AI coach runs on older model. Summary model ID may fail silently.
- **Fix:** Update to `claude-sonnet-4-6`. Verify haiku ID against Anthropic API.
- **Effort:** XS | **Task:** TASK-032

---

### TD-028 — `generateSummary` HTTP 200 on Failure

- **Location:** `src/server/trpc/routers/weekly-reviews.ts:232–317`
- **Root cause:** On generation failure, procedure returns `{ error: "GENERATION_FAILED" }` with HTTP 200. Standard tRPC error handling doesn't catch it.
- **Impact:** Error states in weekly review UI are unreliable. `onError` callback never fires.
- **Fix:** Throw `TRPCError({ code: "INTERNAL_SERVER_ERROR" })` on failure. Client `onError` handler shows toast.
- **Effort:** XS | **Task:** TASK-037

---

## Documentation Debt

---

### TD-024 — No `.env.example`, No Variables Documentation

- **Current state:** No `.env.example` exists. Variables required to run the application are undocumented.
- **Required variables:**
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  OPENROUTER_API_KEY=        # at least one AI key required
  ANTHROPIC_API_KEY=
  OPENAI_API_KEY=
  ANALYTICS_CACHE_ENABLED=false  # set true in production
  CRON_SECRET=               # REQUIRED in production, never leave empty
  RESEND_API_KEY=
  FROM_EMAIL=                # must be verified domain, not noreply@resend.dev
  AI_KEY_ENCRYPTION_KEY=     # 32-byte hex, required when per-user AI keys enabled
  ```
- **Fix:** Create `.env.example` in project root with all variables and security notes.
- **Effort:** XS

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
