# Technical Debt Register — Trading Journal v2

> **Generated:** 2026-05-31  
> **Sources:** repository-audit-report · product-gap-analysis · feature-opportunities · ai-architecture-recommendations  
> **Debt items:** TD-001 – TD-024

---

## Critical Technical Debt (Must Fix)

These items produce incorrect data, broken features, or security vulnerabilities **today**.

---

### TD-001 — Win Rate: 8 Inline Implementations

- **Locations:**
  - `src/domains/analytics/services/dashboard-analytics.ts:101`
  - `src/server/trpc/routers/trades.ts:736`
  - `src/server/trpc/routers/weekly-reviews.ts:205`
  - `src/server/trpc/routers/weekly-reviews.ts:271`
  - `src/components/modals/create-review-modal.tsx:99`
  - `src/domains/analytics/services/trading-sessions.ts:94`
  - `src/server/trpc/routers/learning-resources.ts:447`
  - `src/app/cuentas/hooks/use-account-stats.ts:39`
- **Root cause:** No shared `calcWinRate` function in `lib/formulas.ts` (only `calcSharpeRatio`, `calcProfitFactor`, `calcExpectancyR` exist). Each site re-implements the formula inline.
- **Known inconsistency:** `/trades/page.tsx` uses `rMultiple > 0`; `dashboard-analytics.ts` uses `pnl > 0`. Same user sees different win rates on two screens.
- **Fix:** Create `src/lib/trading-formulas.ts` exporting `calcWinRate(wins: number, total: number): number` and `isWin(trade): boolean` using `pnl > 0` as canonical criterion. Replace all 8 sites. Unit-test the helper.
- **Effort:** M | **Risk if not fixed:** Any business rule change (e.g., treat break-even as loss) requires updating 8 files; at least one inconsistency already ships to users.
- **TASK-027, TASK-005**

---

### TD-002 — Discipline Score: 3 Independent Implementations

- **Locations:**
  - `src/server/trpc/routers/weekly-reviews.ts` (`computedDisciplineScore` — server, weighted multi-factor)
  - `src/server/trpc/routers/weekly-reviews.ts` (`prefill` — server, duplicated inline)
  - `src/components/modals/create-review-modal.tsx:103` (frontend — simplified tag-count formula)
- **Root cause:** No shared `computeDisciplineScore` function. The frontend modal uses a simplified `disciplinedCount / total * 100`; the server uses a weighted formula (execution 50pts + learning 30pts + adherence 20pts).
- **Impact:** Score shown in the review creation modal can differ from the server-computed score for the same week. Traders track this metric for behavioral improvement — inconsistency erodes trust.
- **Fix:** Extract `computeDisciplineScore(params: DisciplineParams): DisciplineBreakdown` into `lib/trading-formulas.ts`. Frontend calls server-provided value only (no local recalculation). Remove `prefill` duplication.
- **Effort:** S | **Risk if not fixed:** UI shows score A, saved review has score B. Weekly progress tracking is unreliable.
- **TASK-011**

---

### TD-003 — Profile Page: Entirely Disconnected from Backend

- **Location:** `src/app/perfil/page.tsx` — entire file
- **Root cause:** All 14 form fields use `useState` with hardcoded defaults. Zero tRPC calls or `fetch` calls in the file. "Guardar cambios", "Cambiar contraseña", "Exportar datos", "Cerrar sesión", "Borrar cuenta" have no `onClick` handlers.
- **DB fields that exist but are never read/written from the UI:**
  - `User.timezone` (shown but not saved — session classification ignores it)
  - `User.baseCurrency` (not shown)
  - `User.language` (shown but not saved)
  - `User.weeklyGoalMinutes` (not shown)
  - `User.emailNotifications` (toggle shown but not saved)
  - `User.currentStreak`, `User.bestStreak` (not shown on profile)
- **Missing procedures:** `profile.get`, `profile.update`, `profile.changePassword`, `profile.exportData`, `profile.deleteAccount`
- **Impact:** Profile-to-App propagation score = 0/14. Legal risk: "Borrar cuenta" is a GDPR-equivalent requirement in regulated markets.
- **Fix:** New `src/server/trpc/routers/profile.ts` with 5 procedures; connect all UI fields.
- **Effort:** L | **Risk if not fixed:** Users lose all settings on reload. Legal exposure for deployments in regulated jurisdictions.
- **TASK-006**

---

### TD-004 — KPIs Calculated Over Paginated Data (Max 50 Trades)

- **Locations:**
  - `src/app/trades/page.tsx:124–130` — KPI strip over paginated `tradePages`
  - `src/app/reviews/page.tsx` — `weekTrades` filtered from `trades.list` (max 50)
  - `src/app/cuentas/page.tsx` — `useAccountStats` using non-infinite `trades.list`
- **Root cause:** Client-side KPI computation from the first page of the infinite query instead of a server aggregate.
- **Impact:** Any user with >50 trades sees incorrect Win Rate, Net P&L, Avg R, weekly review statistics, and account KPIs. The bug worsens silently as users log more trades.
- **Fix:** Route KPI computation through `trades.dashboardStats` (already exists) or a dedicated `trades.aggregates` endpoint. Pass date-range parameters for week-specific queries.
- **Effort:** S | **Risk if not fixed:** Metrics become more wrong over time; active users are the most affected.
- **TASK-001, TASK-009**

---

### TD-005 — Phase Promotion: `objectiveMet = false` Hardcoded

- **Location:** `src/app/cuentas/modals/promote-phase-modal.tsx:41`
- **Root cause:** TODO left in production code — `objectiveMet = false` was never replaced with real logic.
- **Impact:** Every prop-firm trader advancing phases always sees "objective not met." They must ignore a false warning to proceed.
- **Fix:** Compare `account.netPnl` against `account.targetPct * initialBalance`. One conditional.
- **Effort:** XS | **Risk if not fixed:** Constant user friction; erodes trust in the tool for prop-firm use cases.
- **TASK-002**

---

### TD-006 — `CRON_SECRET` Security Bypass in Edge Function

- **Location:** `src/supabase/functions/weekly-learning-summary/index.ts:~30`
- **Root cause:** If `CRON_SECRET` env var is absent or empty string, all requests are accepted. This "bypass mode" intended for dev but can reach production if the env var is not configured.
- **Impact:** Any external party can trigger the edge function (which sends emails to all users) by sending a request without authentication.
- **Fix:** Reject with 401 if the env var is missing OR empty. No default bypass behavior.
- **Effort:** XS | **Risk if not fixed:** Unauthorized email spam to all users; potential for abuse.
- **TASK-016**

---

## High Technical Debt

These items cause significant ongoing friction or block future work.

---

### TD-007 — `rMultiple` Not Calculated on CSV Import

- **Location:** `src/app/api/import/mt4/route.ts`
- **Root cause:** Import handler sets `rMultiple: null` for all trades. Calculating it requires entry, stop, and closePrice from the CSV row — all present but not used.
- **Impact:** All imported trades have null R-multiple. Avg R, Expectancy R, and Sharpe Ratio are corrupted for any user relying on CSV import. Silent corruption — no warning shown.
- **Fix:** `rMultiple = (closePrice - entry) / Math.abs(entry - stop)` for LONG; negate for SHORT. Fallback to null only if stop is absent.
- **Effort:** XS | **TASK-004**

---

### TD-008 — N+1 Query in `resourceImpactRanking`

- **Location:** `src/server/trpc/routers/learning-resources.ts:~350`
- **Root cause:** Iterates resources × setups, issuing 2 Prisma queries per pair. For 20 resources × 10 setups = 400 DB round-trips per request.
- **Impact:** Severe performance degradation for users with populated catalogs. Latency grows quadratically.
- **Fix:** Single aggregated query using `prisma.resourceReview.groupBy()` or raw SQL with `JOIN`. Must be O(1) queries regardless of catalog size.
- **Effort:** M | **TASK-039**

---

### TD-009 — `learningResources.stats` CQRS Violation

- **Location:** `src/server/trpc/routers/learning-resources.ts:~400`
- **Root cause:** The `stats` query procedure auto-transitions resources from `MASTERED` → `IN_REVIEW` as a side effect. A read operation that mutates state.
- **Impact:** Calling `stats` (which happens on page load) triggers state changes. Makes caching the response unsafe. Violates the principle of least surprise.
- **Fix:** Move the transition logic to a `processDecayTransitions` mutation. Call it explicitly from the client on a schedule or on user action.
- **Effort:** S | **TASK-038**

---

### TD-010 — `notes_embedding` and `email_log` Outside Prisma Schema

- **Locations:**
  - `notes_embedding vector(1536)` — managed via `prisma.$executeRaw` in `src/server/trpc/routers/trades.ts`
  - `email_log` — used for idempotency by `src/supabase/functions/weekly-learning-summary/index.ts`; not in `schema.prisma`
- **Root cause:** Both were added as raw SQL migrations without updating `schema.prisma`. Prisma does not track or manage these columns.
- **Impact:** New environment provisioning (staging, CI, developer onboarding) will not create these tables/columns. Silent failures in embedding and email deduplication on fresh deployments.
- **Fix:** Add `model EmailLog` to `schema.prisma`. Add `TradeEmbedding` model or at minimum document the raw SQL migration in a README section with an `.sql` file in `supabase/migrations/`.
- **Effort:** S | **TASK-019**

---

### TD-011 — Sharpe Ratio Duplicated with Different Formula

- **Location:** `src/domains/analytics/ai-context.ts:185–191`
- **Root cause:** `ai-context.ts` implements Sharpe Ratio inline using **population** std dev. `src/lib/formulas.ts:42` (`calcSharpeRatio`) uses **Bessel-corrected sample** std dev. Both exist in the same codebase producing different values.
- **Impact:** AI coach receives a different Sharpe Ratio than the one displayed in the dashboard. Data the AI uses for coaching is inconsistent with data the user sees.
- **Fix:** Replace the inline implementation in `ai-context.ts` with a call to `calcSharpeRatio` from `lib/formulas.ts`.
- **Effort:** XS | **TASK-027**

---

### TD-012 — `phasePayload as never` in Accounts Router

- **Location:** `src/server/trpc/routers/accounts.ts:163`
- **Root cause:** `payload: phasePayload as never` used to bypass Prisma's `Json` type. The actual shape of `phasePayload` is known but not typed as a proper interface.
- **Impact:** Type safety loss around phase promotion payload. Any shape change to the payload silently breaks without compile-time error.
- **Fix:** Define `PhasePayload` interface; use it explicitly rather than `as never`. `Json` accepts any object; cast is unnecessary.
- **Effort:** XS

---

## Code Quality Debt

---

### TD-013 — 15+ `as never` Casts in `trades/page.tsx`

- **Location:** `src/app/trades/page.tsx:227–371`
- **Root cause:** `SerializedTrade` type is not aligned with the props expected by `TradeDetailPanel`, `EditTradeModal`, and other components. The `as never` workaround masks the mismatch.
- **Impact:** TypeScript provides no protection over trade-related prop changes. Refactors silently break.
- **Fix:** Replace `SerializedTrade` usages with `RouterOutputs["trades"]["list"]["items"][0]`. Align component props accordingly.
- **Effort:** M | **TASK-013**

---

### TD-014 — Manual `LearningResource` Type Duplicates RouterOutputs

- **Location:** `src/types/index.ts:~90`
- **Root cause:** `LearningResource` interface was defined manually and now partially diverges from `RouterOutputs["learningResources"]["list"][0]`. Forces `as unknown as LearningResource[]` casts in `aprendizaje/page.tsx`.
- **Fix:** Delete the manual interface. Export `type LearningResource = RouterOutputs["learningResources"]["list"][0]` instead.
- **Effort:** S | **TASK-014**

---

### TD-015 — `trades.stats` Dead Code

- **Location:** `src/server/trpc/routers/trades.ts` — `stats` procedure
- **Root cause:** `stats` was the original KPI procedure. `dashboardStats` superseded it. `stats` remains with no visible consumers but is still maintained (any bug in `dashboardStats` would tempt someone to switch back to `stats`).
- **Impact:** Maintenance burden; diverging implementations risk being re-used for the wrong purpose.
- **Fix:** Audit consumers with `grep -r "trades.stats"`. If none, deprecate with a JSDoc comment and add a TODO to remove in next major version.
- **Effort:** XS | **TASK-018**

---

### TD-016 — `market: any` and `amount: any` Props

- **Locations:**
  - `src/app/mercados/page.tsx:68` — `market: any` with `eslint-disable` comment
  - `src/app/retiros/page.tsx:116–117` — inline type `{ amount: any; date: any }`
- **Fix:** Use `RouterOutputs["markets"]["list"][0]` and `RouterOutputs["withdrawals"]["list"][0]` respectively.
- **Effort:** XS | **TASK-023**

---

### TD-017 — Discipline Score in Review Modal Uses Simplified Frontend Formula

- **Location:** `src/components/modals/create-review-modal.tsx:103`
- **Root cause:** Modal computes `disciplinedCount / total * 100` locally for live preview. Server computes weighted multi-factor score. They diverge whenever the server formula changes.
- **Fix:** Remove local computation. Fetch the score from the server via `prefill` before showing the modal. Display a loading state while fetching.
- **Effort:** S | Covered by **TASK-011**

---

## Architecture Debt

---

### TD-018 — Inline Business Logic in Router Files

- **Location:** `src/server/trpc/routers/trades.ts` (924 lines), `src/server/trpc/routers/learning-resources.ts` (680 lines)
- **Root cause:** Core business logic lives in router files instead of the `src/domains/` services layer. `src/domains/trading/trade-service.ts` exists but is not used consistently.
- **Impact:** Routers are difficult to test in isolation. Business rules cannot be reused from edge functions or batch jobs.
- **Fix (incremental):** Extract the `dashboardStats` computation into `src/domains/analytics/services/dashboard-analytics.ts` (partially done). Extract trade creation/close logic into `trade-service.ts`. Routers become thin orchestration layers.
- **Effort:** L (ongoing refactor)

---

### TD-019 — tRPC Context Recreates Supabase Client Per Request

- **Location:** `src/server/trpc/init.ts` — `createTRPCContext()`
- **Root cause:** Every tRPC request creates a new Supabase client and calls `supabase.auth.getUser()`. On high-traffic routes this is a network round-trip per request.
- **Impact:** Latency overhead on every authenticated request. At scale this becomes a bottleneck.
- **Fix:** Extract `userId` from the JWT in the Next.js middleware and pass as a request header. `createTRPCContext` reads the header instead of calling auth API.
- **Effort:** M

---

### TD-020 — Fire-and-Forget Embedding in Same Node.js Worker

- **Location:** `src/server/trpc/routers/trades.ts` — `scheduleEmbedding()` function
- **Root cause:** `scheduleEmbedding()` calls `fetch("/api/ai-embed")` in background within the same Node.js process. No guarantee the fetch completes before the connection closes in serverless environments.
- **Impact:** Embeddings may silently not be created for some trades in serverless deployments (Vercel, Supabase Edge).
- **Fix:** Move embedding to a Supabase Edge Function triggered by a database webhook on `trades.update`, or use a queue (Upstash QStash).
- **Effort:** M

---

## Security Debt

---

### TD-021 — Setup Images Uploaded Directly from Client Without Server Validation

- **Location:** `src/app/playbook/page.tsx` — Supabase Storage client-side upload
- **Root cause:** Image uploads bypass any server-side handler. No MIME type or file size validation. Supabase anon key is used directly from the browser.
- **Impact:** Arbitrary file types and unlimited file sizes accepted. Potential storage abuse.
- **Fix:** Route uploads through a Next.js Route Handler (`/api/upload/setup-image`) that validates MIME type (jpeg/png/webp) and max size (5 MB) before proxying to Supabase Storage.
- **Effort:** S | **TASK-017**

---

### TD-022 — AI API Keys Stored as Plaintext in Environment (No Per-User Encryption)

- **Location:** `src/lib/ai/config.ts` — all keys read from `process.env`
- **Root cause:** Multi-tenant key storage was not part of the initial design. No `UserAiConfig` table exists.
- **Impact:** All users share the same API key and cost center. Per-user BYOK is impossible without this architecture.
- **Fix:** Add `UserAiConfig` model with AES-256-GCM encrypted key storage. Implement `src/lib/ai/key-encryption.ts`. Keys resolved per-user at request time with env-var fallback.
- **Effort:** L | **TASK-033**

---

## Testing Debt

---

### TD-023 — Zero Component or Integration Tests

- **Current state:** 11 unit test files in `src/__tests__/`, all unit tests mocking Prisma. No React Testing Library tests. No Playwright or Cypress e2e tests. No CI/CD pipeline.
- **Coverage gaps:**
  - Trade creation and closing flows (most critical user path)
  - Weekly review form and submission
  - Phase promotion modal logic
  - Formula calculations (partial coverage via unit tests)
- **Fix:**
  1. Add RTL tests for: register-trade-modal, close-trade-modal, create-review-modal, phase promotion (TASK-024)
  2. Add Playwright smoke tests for: login, create trade, navigate dashboard (TASK-025)
  3. Set up GitHub Actions CI with lint + typecheck + unit tests on every PR
- **Effort:** L (tests) + S (CI setup) | **TASK-024, TASK-025**

---

## Documentation Debt

---

### TD-024 — No `.env.example`, No Variables Documentation

- **Current state:** No `.env.example` exists. Variables required to run the application are undocumented. A new developer cannot determine which keys are required vs. optional.
- **Required variables (currently undocumented):**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENROUTER_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` (at least one)
  - `ANALYTICS_CACHE_ENABLED` (optional, defaults false)
  - `CRON_SECRET` (required in production, never leave empty)
  - `RESEND_API_KEY`
  - `FROM_EMAIL` (must be verified domain, not `noreply@resend.dev`)
  - `AI_KEY_ENCRYPTION_KEY` (32-byte hex — required when per-user AI keys are enabled)
- **Fix:** Create `.env.example` in project root with all variables, comments indicating required vs. optional, and security notes. Update `README.md` or `ARCHITECTURE.md` with setup instructions.
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
