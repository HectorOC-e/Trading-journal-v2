# Changelog — Trading Journal v2

> **Last Updated: 2026-06-03**  
> Git-style changelog organized by development phase. Based on TASKS.md, audit findings, and codebase analysis. Dates are approximate development windows.

---

## [Sprint 5 — AI Config, Personalization, International Support & QA Cascade] — 2026-06-03

**Branch:** `claude/epic-darwin-1XZTX`  
**Test result:** 378 → 389 passing (+11 new tests) | **TypeScript:** clean (`tsc --noEmit`) | **QA findings:** 4 Blocking, 6 Major, 7 Minor, 4 Nitpick (all fixed before merge)

### Completed (Core Features — 7 Tasks)

- **TASK-033 — AI Configuration** — `src/server/trpc/routers/ai-config.ts`, `src/lib/ai/key-encryption.ts`, `src/app/api/ai-test/route.ts`
  - ✅ `UserAiConfig` Prisma model with AES-256-GCM encrypted API keys
  - ✅ tRPC procedures: `aiConfig.get`, `aiConfig.update`, `aiConfig.delete` with provider validation (Anthropic/OpenRouter/OpenAI)
  - ✅ Test endpoint validates connectivity per provider
  - ✅ Profile UI with masked key inputs, model selectors, last-tested timestamp
  - ✅ Security fix: removed `_getDecryptedKey` from router (moved to server-only function)

- **TASK-046 — Accent Color Picker & Colorblind Mode** — `src/app/perfil/page.tsx`, `src/components/theme-provider.tsx`
  - ✅ UI: 8 preset colors + custom OKLCH hue slider (0–360)
  - ✅ Colorblind presets: deuteranopia, protanopia, tritanopia with CSS variable overrides
  - ✅ Persisted to `UserPreferences` (accentHue, colorScheme)
  - ✅ B-01 fix: `ThemeProvider` reads prefs and applies CSS variables via `document.documentElement.style.setProperty()`

- **TASK-050 — Goal-Setting Dashboard Widget** — `src/app/dashboard/components/goal-progress-widget.tsx`, `src/app/dashboard/tabs/tab-portfolio.tsx`
  - ✅ Circular progress rings for 4 goals (weekly trades, P&L, discipline, learning minutes)
  - ✅ Goal form in profile page; CRUD operations
  - ✅ B-03/B-04 fix: `buildKpis` extended with `tradesCountWeek` (Mon–today) and `pnlWeek` (not monthly)
  - ✅ Widget now receives correct weekly metrics

- **TASK-020 — Cursor Pagination for Account Logs** — `src/server/trpc/routers/account-logs.ts`
  - ✅ B-02 fix: Switched from broken `id < cursor` (UUID ordering mismatch) to Prisma native cursor API
  - ✅ M-03 fix: Test updated with valid UUID (`d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4`)
  - ✅ Pagination now returns correct pages without duplication

- **TASK-056 — useCurrency Hook** — `src/hooks/use-currency.ts`
  - ✅ Hook reads `profile.baseCurrency` and returns symbol
  - ✅ All P&L displays updated (KPI strip, trade list, analytics, goals widget)
  - ✅ Supports 3+ currencies (USD, EUR, GBP)

- **TASK-062 — Sharpe Ratio KPI** — `src/app/dashboard/tabs/tab-operador.tsx`
  - ✅ Retrieves from `dashboardStats` (formula centralized Sprint 1)
  - ✅ KPI card component matches existing style
  - ✅ Added to analytics dashboard KPI strip

- **TASK-074 — Pre-Trade Planning Field** — `src/lib/generated/prisma/schema.prisma`, `src/app/trades/modals/register-trade-modal.tsx`
  - ✅ `planNotes` field in Trade model (optional String, max 500 chars)
  - ✅ Textarea in trade form (collapsible "Plan pre-operación" section)
  - ✅ Trade detail panel displays planNotes (read-only, 200 char limit)

### Fixed (Blocking Bugs from QA Audit)

- **B-01 · Accent Color Saved but Never Applied** — `src/components/theme-provider.tsx`
  - Root cause: UI saved prefs to DB; ThemeProvider never read them back or applied CSS
  - Fix: `ThemeProvider` queries `prefs.accentHue`, applies OKLCH color via `document.documentElement.style.setProperty()`

- **B-02 · Cursor Pagination Used Wrong Sort Order** — `src/server/trpc/routers/account-logs.ts`
  - Root cause: Query sorted by `createdAt DESC` but filtered cursor as `id < cursor` (unrelated ordering)
  - Fix: Switched to Prisma native `cursor: { id }, skip: 1` (correct pattern)

- **B-03 · Goal Widget Used Today's Trades as Weekly Trades** — `src/app/dashboard/components/goal-progress-widget.tsx`, `src/domains/analytics/services/dashboard-analytics.ts`
  - Root cause: `buildKpis` exported `tradesCountToday`; widget received it labeled as weekly count
  - Fix: Added `tradesCountWeek` (Mon–today) to `buildKpis` output

- **B-04 · Goal Widget Mixed Monthly P&L with Weekly Goal** — `src/app/dashboard/components/goal-progress-widget.tsx`, `src/domains/analytics/services/dashboard-analytics.ts`
  - Root cause: Widget received `pnlMonth` but expected `pnlWeek`
  - Fix: Added `pnlWeek` to `buildKpis` output (shares B-03 fix)

### Fixed (Major Issues from QA Audit)

- **M-01 · `_getDecryptedKey` Exposed via tRPC Router** — `src/server/trpc/routers/ai-config.ts`
  - Moved function to server-only export (not in tRPC); removed mutation exposure

- **M-02 · Unused `@ts-expect-error` Directives Broke Build** — `src/app/api/ai-test/route.ts`, `src/server/trpc/routers/ai-config.ts`, `src/__tests__/routers/plan-notes.test.ts`
  - Root cause: Directives added before `prisma generate`; once generated, directives became unused (Next.js 16 strict mode error)
  - Fix: Ran `prisma generate` to produce `UserAiConfig` types; removed 5 unused directives

- **M-03 · Cursor Pagination Test Invalid UUID** — `src/__tests__/routers/account-logs-pagination.test.ts`
  - Fixed UUID to `d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4` (was `"cursor-id-uuid-1234-5678"`)

- **M-04 · React Query v5 Removed `onSuccess` Callback** — `src/app/cuentas/modals/account-history-modal.tsx`
  - Root cause: tRPC v11 + React Query v5 removed `onSuccess` from `useQuery` options
  - Fix: Switched to `useEffect` with `useRef` to track seen cursors and prevent double-appending

- **M-05 · Test `maskApiKey` Expected Value Wrong** — `src/__tests__/ai-config.test.ts`
  - Fixed expected value from `"sk-ant-a...z9"` to `${key.slice(0, 8)}...${key.slice(-4)}`

- **M-06 · `profile.update` Returned Unserialized Date Objects** — Fixed in Sprint 3 carry-over

### Test Coverage

- **New test files:**
  - `src/__tests__/routers/ai-config.test.ts` — AI config CRUD, encryption roundtrip, key format validation
  - `src/__tests__/routers/account-logs-pagination.test.ts` — Cursor pagination correctness
  - `src/__tests__/routers/plan-notes.test.ts` — planNotes roundtrip, max length validation
  - Psychology field tests (TASK-034 from Sprint 4 final fixes)

- **Test delta:** 378 → 389 (+11 new tests, all passing)

### Docs

- **Created:** `docs/SPRINT_5_QA_REPORT.md` — comprehensive QA audit of 8 tasks (4 Blocking, 6 Major, 7 Minor, 4 Nitpick)
- **Created:** `docs/SPRINT_5_RETROSPECTIVE.md` — what went well, what went wrong, pending risks, recommendations for Sprint 6

---

## [Sprint 4 — Psychology UI, Auto-Save, Week Selector, Dashboard Persistence] — 2026-06-02

**Branch:** `claude/epic-darwin-1XZTX`  
**Test result:** 364/364 passing | **TypeScript:** clean (`tsc --noEmit`)

(Details in SPRINT_4_RETROSPECTIVE.md)

---

## [Sprint 3 — Profile Backend & QA Audit Fixes] — 2026-06-02

**Branch:** `claude/epic-darwin-1XZTX`  
**Test result:** 315/315 passing (+24 new tests) | **TypeScript:** clean (`tsc --noEmit`)

### Completed (Profile Backend — TASK-006)

- **Profile backend implementation** — `src/server/trpc/routers/profile.ts`
  - ✅ `profile.get` — fetches all User fields, serializes dates to ISO strings
  - ✅ `profile.update` — mutation for name, timezone, language, baseCurrency, emailNotifications, weeklyGoalMinutes; diffs against server profile to avoid unnecessary cache invalidation
  - ✅ `profile.changePassword` — calls `supabase.auth.updateUser({ password })`
  - ✅ `profile.exportData` — JSON export of all user trades, accounts, reviews, resources
  - ✅ `profile.deleteAccount` — deletes all user data; Prisma delete before auth delete (order guarantee)
- **Profile UI fully connected** — `src/app/perfil/page.tsx`
  - Form initialized from `profile.get` via `useEffect` (fixed M-007: moved from render body)
  - All fields bound to mutations with proper error feedback
  - "Cerrar sesión" now calls `supabase.auth.signOut()` + redirect (fixed M-006: was routing to non-existent `/api/auth/signout`)

### Fixed (Blocking Bugs from QA Audit)

- **B-001 · Date Range Regression in `computedDisciplineScore`** — `src/server/trpc/routers/weekly-reviews.ts`
  - Root cause: `computedDisciplineScore` passed `weekEnd` directly to service's `lt: to` (exclusive). Last-day trades excluded.
  - Fix: `to.setDate(to.getDate() + 1)` before calling service (calendar-day arithmetic, DST-safe)
  - Tests: `weekly-reviews-date-range.test.ts` (6 tests)

- **B-002 · `deleteAccount` Used Anon Client for Admin API** — `src/server/trpc/routers/profile.ts`, **NEW:** `src/lib/supabase/admin.ts`
  - Root cause: `ctx.supabase` uses ANON_KEY; `auth.admin.deleteUser()` requires SERVICE_ROLE_KEY. 403 was silently caught, user could log back in.
  - Fix: New `createAdminClient()` factory uses `SUPABASE_SERVICE_ROLE_KEY`. Prisma delete runs first (atomic).
  - Tests: `profile.test.ts` includes B-002 verification (admin client called, not anon client)

### Fixed (Major Issues from QA Audit)

- **M-001 · `saveChecklist` Had No `onError` Handler** — `src/app/trades/page.tsx`
  - Added `onError: (err) => toast.error(formatErrorForUser(err))`

- **M-002 · `processDecay` Had No `onError` Handler** — `src/app/aprendizaje/page.tsx`
  - Added `onError: (err) => console.error("Decay transition failed:", err.message)` (silent; auto background job)

- **M-003 · `createReview` Had No `onError` Handler** — `src/app/reviews/modals/create-review-modal.tsx`
  - Added `onError: (err) => toast.error(formatErrorForUser(err))` and import

- **M-004 · `handleSaveProfile` Always Invalidated Analytics Cache** — `src/app/perfil/page.tsx`
  - Root cause: Mutation sent all 6 fields; invalidation fired on every save
  - Fix: Diff against server profile; only send changed fields. If no changes, show "Sin cambios" toast.

- **M-005 · `profile.update` Returned Unserialized `Date` Objects** — `src/server/trpc/routers/profile.ts`
  - Root cause: `profile.get` serialized dates; `profile.update` returned raw Prisma result
  - Fix: Mirror serialization in `update` return value

- **M-006 · `Cerrar sesión` Redirected to Non-Existent Route** — `src/app/perfil/page.tsx`
  - Root cause: Button routed to `/api/auth/signout` (doesn't exist)
  - Fix: Call `supabase.auth.signOut()` then `router.push("/login")` (matches `Sidebar.tsx` pattern)

- **M-007 · Form State Initialized via Render-Body `setState` Calls** — `src/app/perfil/page.tsx`
  - Root cause: Six `setState` calls in render body, guarded by condition
  - Fix: Moved to `useEffect` with `[profile, formInitialized]` deps

### Fixed (Minor Issues from QA Audit)

- **m-001 · File Download Failed in Firefox** — `src/app/perfil/page.tsx`
  - Fix: Append anchor to DOM before `.click()`, remove after

- **m-002 · `exportData` Registered as `useQuery` on Mount** — `src/app/perfil/page.tsx`
  - Root cause: `useQuery(undefined, { enabled: false })` still registers persistent cache subscription
  - Fix: Removed hook; export button calls `utils.profile.exportData.fetch()` directly; local `exportLoading` state

- **m-003 · `ProfileSkeleton` Used Inline CSS Animation** — `src/app/perfil/page.tsx`
  - Fix: Replaced inline `animation: "pulse ..."` with Tailwind `animate-pulse` class

### Fixed (Nitpick from QA Audit)

- **n-001 · `generateAiSummary` onError Used Raw `err.message`** — `src/app/reviews/modals/create-review-modal.tsx`
  - Standardized to `formatErrorForUser(err)` (consistent with all other 48 mutations)

### Test Coverage

- **New test files:**
  - `src/__tests__/routers/profile.test.ts` — 18 tests (get, update date serialization M-005, cache gate M-004, changePassword, deleteAccount B-002)
  - `src/__tests__/routers/weekly-reviews-date-range.test.ts` — 6 tests (B-001 date range, DST safety, prefill consistency)

- **Test delta:** 291 → 315 (+24 new tests, all passing)

### Docs

- **Created:** `docs/SPRINT_3_FIX_REPORT.md` — comprehensive QA audit resolution report (13 fixes, 3 deferred items)
- **Updated:** `docs/SPRINT_3_QA_REPORT.md` — added Status column to resolution table

---

## [Sprint 2 — Learning Pipeline Correctness & UX Foundations] — 2026-06-01

**Branch:** `claude/epic-darwin-1XZTX`  
**Test result:** 246/246 passing (+14 new tests) | **TypeScript:** clean (`tsc --noEmit`)

### Fixed (P0 deferred from Sprint 1)

- **Phase promotion objectiveMet** (TASK-002) — `src/app/cuentas/modals/promote-phase-modal.tsx`
  - `objectiveMet = false` (hardcoded) → computed from `netPnl >= (targetPct / 100) * initialBalance`
  - `netPnl` sourced from `dashboardStats.accountStats` and passed as prop to modal
  - Prop-firm traders promoting phases now see accurate objective status
- **AI coach error status** (TASK-026) — `src/app/api/ai-coach/route.ts`
  - `NO_API_KEY` response changed from status 200 → 503 (Service Unavailable)
  - Streaming error response message changed from "BAD_REQUEST" → "STREAM_ERROR" (matches 500 status)
- **"Peor día" KPI on trades page** (TASK-028) — `src/app/trades/page.tsx`
  - Added "Peor día" KPI card (worst daily P&L) using `kpisAll.worstDay` from dashboardStats
  - Correctly labeled (was previously mislabeled "Drawdown" in Sprint 1 planning; now added with correct name)
- **Sharpe formula consistency** (TD-011) — `src/domains/analytics/ai-context.ts`
  - Replaced inline population std dev formula with `calcSharpeRatio()` from centralized formulas module
  - AI coach now uses Bessel-corrected sample std dev — matches dashboard calculation

### Fixed (Learning Pipeline — CQRS violation)

- **MASTERED→IN_REVIEW out of stats query** (TASK-007/038) — `src/server/trpc/routers/learning-resources.ts`
  - Removed `detectDecayedResources` + `updateMany` side effect from `learningResources.stats` query
  - Added `processDecayTransitions` mutation (explicit CQRS-compliant call)
  - `decayedCount` returned by `stats` is now always 0 (decay only tracked via mutation)
  - `aprendizaje/page.tsx` wired to call `processDecayTransitions.mutate()` on page load

- **N+1 query in resourceImpactRanking** (TASK-008/039) — `src/server/trpc/routers/learning-resources.ts`
  - Replaced per-resource-per-setup query loop with single batched `trade.findMany` for all affected setups
  - O(N×S×2) queries → O(2) queries (1 resources fetch + 1 trades batch)
  - In-memory grouping by `setupId` for O(1) lookup per pair

### Added (UX Feedback System)

- **Sonner toast system** (TASK-035) — `src/app/layout.tsx`, `src/lib/use-toast.ts`
  - Installed `sonner@^2.0.7`
  - `<Toaster position="bottom-right" richColors closeButton />` added to root layout
  - `src/lib/use-toast.ts` re-exports `{ toast }` from sonner as the canonical toast API
- **generateSummary error toast** (TASK-037) — `src/server/trpc/routers/weekly-reviews.ts`, `create-review-modal.tsx`
  - `generateSummary` now throws `TRPCError` instead of returning `{ error: "..." }` (fixes HTTP 200 on failure)
  - `NO_API_KEY` → `PRECONDITION_FAILED` (412) with user-friendly message
  - Stream failure → `INTERNAL_SERVER_ERROR` (500) with retry prompt
  - Client-side `onError` handler uses `toast.error(err.message)`

### Added (Mobile & Form UX)

- **Mobile back button on detail panels** (TASK-040) — trade-detail-panel.tsx, account-detail-panel.tsx, review-detail-panel.tsx
  - "← Volver" button visible on screens <768px (`flex md:hidden`)
  - Escape key closes panels on desktop (via `useEffect` keydown listener)
- **inputmode="decimal" on price inputs** (TASK-041) — register-trade-modal.tsx, edit-trade-modal.tsx
  - All entry/stop/target/size/riskPct inputs now show numeric decimal keypad on iOS/Android
- **"Ver registro →" button wired** (TASK-036) — `src/app/dashboard/tabs/tab-disciplina.tsx`
  - Button now navigates to `/trades?tag=DO-NOT-TAKE` on click (was inert before)
  - Uses `useRouter().push()` from Next.js navigation

### Technical Debt

- **AI model IDs updated** (TASK-015) — `src/lib/ai/config.ts`
  - `claude-sonnet-4-5` → `claude-sonnet-4-6` for Anthropic direct (coach model)
- **Dead `trades.stats` procedure deprecated** (TASK-018) — `src/server/trpc/routers/trades.ts`
  - Replaced 40+ line implementation with stub returning empty result
  - Added `@deprecated` comment (replaced by `dashboardStats` in Sprint 1)
  - Removed unused `calcProfitFactor` and `calcExpectancyR` imports
- **TradeEmbedding and EmailLog models** (TASK-019) — `src/prisma/schema.prisma`
  - `TradeEmbedding` model: tracks embedding state per trade (Phase XIII prep)
  - `EmailLog` model: prevents duplicate weekly email sends (Phase XII prep)
  - Both models include proper relations, unique constraints, and indexes
  - Comment in schema: TradeEmbedding requires Phase XI (UserAiConfig) for key resolution
- **`.env.example` created** (TASK-059) — `/.env.example`
  - All 15 required environment variables documented with comments
  - Includes: DATABASE_URL, Supabase keys, AI provider keys, model overrides, edge function secrets

### Tests

- **Flaky timing test fixed** — `analytics-cache.test.ts`
  - 1ms TTL boundary margin → 5,000ms (5s) safe margin — eliminates intermittent CI failure
- **14 new Sprint 2 tests** — `__tests__/sprint2/sprint2-deliverables.test.ts`
  - `calcSharpeRatio` Bessel-corrected formula (4 tests, TD-011)
  - `objectiveMet` calculation logic (6 tests, TASK-002)
  - CQRS fix: `detectDecayedResources` called from mutation (1 test, TASK-007)
  - N+1 fix: batching logic verified (2 tests, TASK-008)

---

## [Sprint 1 — Stability & Foundations] — 2026-06-01

**Branch:** `claude/epic-darwin-1XZTX` | **Commits:** `a83aa41` → `09d480e` (8 commits)  
**Test result:** 232/232 passing | **TypeScript:** clean (`tsc --noEmit`)

### Fixed (data integrity)

- **rMultiple in CSV import** — `src/app/api/import/mt4/route.ts`
  - `calcRMultiple()` now called during MT4/cTrader import
  - Guard `row.sl !== 0` prevents garbage R from `sl=0` sentinel (B-001 — would have corrupted avgR, expectancyR, Sharpe for all stop-less imports)
  - Trades without a recorded stop now receive `rMultiple = null` (correct)
- **KPI strip over paginated data** — `src/app/trades/page.tsx`, `src/app/reviews/page.tsx`, `src/app/cuentas/page.tsx`
  - All three pages now use `trpc.trades.dashboardStats.useQuery({ period: "ALL" })` for aggregate KPIs
  - Users with >50 trades previously saw incorrect Win Rate, Net P&L, Avg R, and account stats
- **Expectancy formula in Playbook** — `src/app/playbook/page.tsx`
  - Corrected `s.avgR * wr - (1 - wr)` → `s.avgR` (M-001 — formula was 5–20× wrong; `avgR` IS the per-trade E[R])
- **`isWin` import shadow in `buildKpis`** — `src/domains/analytics/services/dashboard-analytics.ts`
  - `const isWin = sorted[0].pnl > 0` (boolean) renamed to `streakIsWin`; streak loop uses canonical `isWin({ pnl })` (M-003)
- **`acctWins` canonical win function** — `dashboard-analytics.ts:177`
  - `t.pnl > 0` → `isWin({ pnl: t.pnl })` (N-001)
- **`trading-sessions.ts` win criterion** — `src/server/trpc/routers/trading-sessions.ts`
  - Last file using inline win check migrated to `isWin()` (N-002)

### Added

- **Formula centralization** — `src/lib/formulas/` barrel module
  - Modules: `win-rate.ts`, `risk.ts`, `performance.ts`, `drawdown.ts`, `discipline.ts`, `utils.ts`, `types.ts`
  - Single source of truth for `isWin`, `calcWinRate`, `calcRMultiple`, `calcAvgR`, `calcExpectancyR`, `calcSharpeRatio`, `calcProfitFactor`, `calcNetPnl`, `computeMaxDrawdown`, `calcDrawdownPct`, `calcDisciplineScore`, `getISOWeekKey`
  - Resolved module resolution conflict: deleted `src/lib/formulas.ts` (was shadowing `formulas/` directory)
- **Server-side upload validation** — `src/app/api/upload/setup-image/route.ts`
  - MIME allowlist: `image/jpeg`, `image/png`, `image/webp`
  - Max size: 5 MB
  - Returns structured error reasons: `INVALID_MIME`, `FILE_TOO_LARGE`
  - Path uses `crypto.randomUUID()` (collision-resistant)
- **Upload error feedback** — `src/app/playbook/page.tsx`
  - Upload failures now surface localized error messages below the upload button (M-002)
  - Playbook migrated from direct Supabase Storage client upload to Route Handler
- **`tradesMonth` and `tradesTotal` in `AccountStat`** — `dashboard-analytics.ts`
- **`TRPCError` in accounts router** — `src/server/trpc/routers/accounts.ts`
  - `throw new Error()` → `throw new TRPCError({ code: "BAD_REQUEST" })` in `changeStatus`

### Fixed (security)

- **CRON_SECRET bypass** — `supabase/functions/weekly-learning-summary/index.ts`
  - `isAuthorized()` now returns `false` immediately when `CRON_SECRET` is absent or empty string
  - Eliminates unauthenticated edge function invocation by any external party

### Fixed (tests)

- `src/__tests__/routers/accounts.test.ts` — updated `where` clause to include `status: { in: ["ACTIVE", "PAUSED"] }` default filter
- `src/__tests__/routers/withdrawals.test.ts` — corrected `event` to `"WITHDRAWAL_STATUS"` (was `"STATUS_CHANGE"`)
- `src/__tests__/lib/formulas/discipline.test.ts` — corrected `score: 62` → `63` (`Math.round(62.5) = 63` per ES spec)
- Test suite: 229/232 → **232/232**

### Removed

- `src/lib/formulas.ts` — deleted; replaced by `src/lib/formulas/index.ts` barrel
- `src/app/cuentas/hooks/use-account-stats.ts` — deleted (dead code; only caller migrated to `dashboardStats`)

### Improved

- `src/app/api/upload/setup-image/route.ts` — `Math.random()` → `crypto.randomUUID()` for upload paths
- `dashboard-analytics.ts:110` — removed unused `pnl` field from `calcExpectancyR` mapping
- `src/lib/formulas.test.ts` — import changed from relative `"./formulas"` to alias `"@/lib/formulas"`

### Deferred to Sprint 2

- TASK-002 — `objectiveMet = false` hardcoded in phase promotion modal
- TASK-026 — `ai-coach/route.ts:106` error message mismatch
- TASK-028 — Misleading "Drawdown" label on trades KPI strip

### Docs

- `docs/SPRINT_1_QA_REPORT.md` — Independent staff engineer audit; 1 Blocking, 3 Major, 3 Minor, 3 Nitpick findings
- `docs/SPRINT_1_FIX_REPORT.md` — Resolution of all audit findings
- `docs/SPRINT_1_RETROSPECTIVE.md` — Sprint retrospective

---

## [Analysis & Documentation] — 2026-05-31

### Added
- `docs/repository-audit-report.md` — exhaustive technical audit (37 findings: 5 critical, 11 high, 13 medium, 8 low)
- `docs/product-gap-analysis.md` — formula, profile, AI config, psychology, UX, and responsive design gaps
- `docs/feature-opportunities.md` — 25 features prioritized P0–P3 with effort estimates
- `docs/ai-architecture-recommendations.md` — per-user key storage, model config, connectivity test, cost tracking spec
- `docs/personalization-roadmap.md` — theme system, color tokens, dashboard layout, psychology templates, goals, tags, notifications
- `docs/ux-improvement-roadmap.md` — navigation, forms, feedback, mobile, accessibility, performance UX
- `docs/master-remediation-plan.md` — 53-task remediation plan with execution order and dependency graph
- `docs/master-backlog.md` — complete task table (TASK-001–053) with sprint planning
- `docs/technical-debt.md` — debt register TD-001–TD-028 with payoff schedule

### Documentation Updates
- `docs/architecture.md` — merged with audit findings (AI subsystem, off-schema tables, storage, analytics pipeline)
- `docs/roadmap.md` — merged with master-remediation-plan phases X–XIV
- `docs/backlog.md` — full 53-task table with module grouping and definition of done
- `docs/features.md` — new: complete feature inventory with status matrix
- `docs/formula-engine.md` — new: formula inventory, inconsistencies, centralization plan
- `docs/ai-architecture.md` — new: merged AI architecture recommendations
- `docs/personalization.md` — new: merged personalization roadmap
- `docs/changelog.md` — new: this file

---

## [Phase IX — Import & AI Coach] — 2026 Q1

### Added
- **MT4/cTrader CSV Import** (`src/app/api/import/mt4/route.ts`)
  - Parses MT4 history export format (symbol, type, entry, close, SL, TP, lots, open/close time, profit)
  - Creates Trade + TradeEvent records from CSV rows
  - Session classification (hardcoded to "New York" — known issue TASK: needs per-user timezone)
- **AI Coach** (`src/app/api/ai-coach/route.ts`)
  - Streaming SSE chat interface
  - Multi-provider support: OpenRouter → Anthropic → OpenAI priority chain
  - Trader context injection via `buildTraderContext()` in `ai-context.ts`
  - Graceful NO_API_KEY error when no provider configured
- **pgvector Embeddings** (`src/app/api/ai-embed/route.ts`)
  - Trade note embedding via `text-embedding-3-small`
  - `notes_embedding vector(1536)` stored via `prisma.$executeRaw` (off-schema)
  - Fire-and-forget scheduling from `trades.ts` (reliability risk noted)
- **AI-powered weekly review summary** (`routers/weekly-reviews.ts:generateSummary`)
  - Uses `getWeeklySummaryModel()` to generate executive summary from trade data
- **Behavioral pattern detector** (`domains/analytics/services/pattern-detector.ts`)
  - 5 static rule-based patterns (revenge trading, overtrading, fatigue, etc.)

### Known Issues Introduced
- `rMultiple` null on all CSV-imported trades — TD-007 (TASK-004)
- `generateSummary` returns HTTP 200 on failure — TD-028 (TASK-037)
- Session hardcoded to "New York" in CSV import

---

## [Phase VIII — Edge Definitions] — 2025 Q4

### Added
- **Edge definition fields on Setup model**
  - `expectedWr`, `expectedAvgR`, `minR`, `maxR`, `edgeUpdatedAt`
  - `lifecycleCheck` procedure evaluates setup performance vs expected edge
- **SetupVersion snapshots**
  - Immutable versioning of `aplusChecklist`, `standardChecklist`, `direction` changes
  - Snapshot captured before edit; `reason` field for version annotation
- **Setup lifecycle states**
  - ACTIVO → EN_PRUEBA → PAUSADO → DESCARTADO
  - Lifecycle check evaluates whether a setup's live performance matches its edge definition

### Known Issues
- `lifecycleCheck` silently excludes setups where `expectedWr` is null

---

## [Phase VII — Weekly Reviews] — 2025 Q3

### Added
- **Weekly review creation** (`routers/weekly-reviews.ts`)
  - 2-step modal: Config (select week, account) → Análisis (fill out all fields)
  - `prefill` procedure: auto-fills trade statistics for the selected week
  - Draft / submitted status with "Guardar borrador" flow
  - Draft badge on review cards
- **Discipline score computation** (server-side)
  - `computedDisciplineScore` procedure: execution (50%) + learning (30%) + adherence (20%)
  - Note: duplicated in `prefill` and frontend modal (TD-002)
- **Review detail panel** — read-only display of review content
- **Weekly review email trigger** — edge function sends weekly review reminders

### Known Issues Introduced
- No edit or delete UI for existing reviews (TASK-031)
- `weekTrades` filtered from paginated `trades.list` max 50 (TD-004, TASK-009)
- Discipline score in 3 separate implementations (TD-002)

---

## [Phase VI — Playbook] — 2025 Q3

### Added
- **Setup catalog** (`src/app/playbook/page.tsx`)
  - Create/edit/delete setups with full field set
  - A+ and standard checklist management
  - Setup direction (LONG/SHORT/AMBAS)
  - Color coding and abbreviation
- **Setup images** — direct Supabase Storage upload to `setup-images` bucket
- **Checklist pre-trade flow** — `TradeChecklistResult` model; checklist shown in trade registration when setup selected
- **Setup performance metrics** — win rate, avg R, trade count (in dashboardStats)
- **Resource-to-setup linking** — M2M via `_ResourceSetups`

### Known Issues Introduced
- Sparklines placeholder "— sin trades" hardcoded (TASK-049)
- Image upload without server validation (TD-021, TASK-017)

---

## [Phase V — Psychology Foundation] — 2025 Q2

### Added
- **TradeChecklistResult** model — tracks which checklist items were checked before each trade
- **TradingSessionLog** model — pre-session mood (1–5) and energy level (1–5), unique per (user, date, session)
- **Mood correlation chart** in Disciplina tab
- **Tag system** — structured violation tags array on Trade: `["Off-plan", "Impulsivo", "FOMO", "Revenge"]`
- **Rules module** (`src/app/reglas/`) — 8 auto-seeded system rules, user-defined rules, severity levels
- **Markets module** (`src/app/mercados/`) — market watchlist with sessions

### Known Issues
- No per-trade emotion/psychology fields (only session-level mood) — TASK-034
- FOMO, revenge tags as free-form strings — not queryable as boolean flags

---

## [Phase IV — Server-Side Analytics] — 2025 Q1

### Added
- **`trades.dashboardStats` tRPC procedure** — single pre-aggregated query replacing all client-side useMemo
  - Returns: kpis, equityCurve, pnlByDate, pnlBySymbol, sessionStats, hourStats, setupStats, sessionMatrix, directionStats, propFirmStatus
- **Domain analytics service** (`domains/analytics/services/dashboard-analytics.ts`)
  - Server-side computation of all dashboard KPIs
  - `computeMaxDrawdown` (canonical) in `account-service.ts`
- **TradeStatsCache model** — materialized analytics cache, feature-flagged via `ANALYTICS_CACHE_ENABLED`
- **4-tab dashboard layout** — Portfolio, Operador, Disciplina, Playbook
- **AI context builder** (`domains/analytics/ai-context.ts`) — aggregates trader data for AI coach

### Known Issues Introduced
- `trades.stats` dead code remains (superseded by `dashboardStats`) — TD-015 (TASK-018)
- `ai-context.ts:185` re-implements Sharpe Ratio with different formula — TD-011

---

## [Phase III — Account Management] — 2024 Q4

### Added
- **Account model with full prop firm support**
  - Types: PERSONAL, PROP_FIRM, DEMO_PERSONAL, DEMO_PROP, BACKTEST, QA
  - Status: ACTIVE → PAUSED / INACTIVE / LOST
  - Drawdown limits: ddDailyPct, ddWeeklyPct, ddMonthlyPct, ddTotalPct
  - Phase tracking: PHASE_1 → PHASE_2 → FUNDED
  - Props: ddModel (FIXED|TRAILING), maxTradesPerDay, allowedSymbols, minTradingDays
- **AccountLog** — immutable event trail (CREATED, PHASE_CHANGE, WITHDRAWAL, STATUS_CHANGE, NOTE)
- **Phase promotion modal** — step through prop firm phases
- **Withdrawals module** — withdrawal CRUD with status (SOLICITADO → EN_PROCESO → PAGADO → RECHAZADO)
- **`accounts.changeStatus`** — status transitions with required notes for LOST status

### Known Issues Introduced
- Phase promotion `objectiveMet = false` hardcoded — TD-005 (TASK-002)
- `throw new Error()` instead of `TRPCError` in changeStatus — TASK-003
- `accountLogs.list` has `take: 50` hardcoded — TASK-020
- Drawdown constraints stored but not enforced in `trades.create`

---

## [Phase II — Trade Core] — 2024 Q3

### Added
- **Trade model** with full field set: entry, stop, target, size, direction, symbol, session, tags, notes, screenshotUrls
- **TradeEvent model** (immutable) — STOP_MOVE, PARTIAL_CLOSE, SCALE_IN, NOTE
- **Trade CRUD** — create, close, edit, delete procedures in `routers/trades.ts`
- **Cursor-based pagination** in `trades.list` (50 trades/page)
- **R-multiple calculation** on trade close
- **Commission support** on close
- **Screenshot attachments** — Supabase Storage bucket `trade-screenshots`
- **Trade detail panel** with events timeline
- **Session detection** (auto-classify based on open time)

### Migrations Applied
- `trades` table with all fields
- `trade_events` table (append-only)

---

## [Phase I — Learning System] — 2024 Q2

### Added
- **LearningResource model** with full SRS fields: status, reviewInterval, nextReviewAt, progressType, totalUnits, currentUnits, avgScore, isFavorite, rating, completedAt, weekDeltaMinutes
- **ResourceReview model** — review sessions with mastery level (1–5)
- **Spaced repetition scheduling** (`domains/learning/review-scheduler.ts`)
  - `calcNextReviewAt()` — interval scaling based on mastery level
  - Levels: 1→7 days, 2→14 days, 3→30 days, 4→60 days, 5→90 days
- **Decay detection** (`domains/learning/decay-detector.ts`)
  - MASTERED → IN_REVIEW when `nextReviewAt` has passed
  - Currently triggered in `stats` query (CQRS violation — TD-009)
- **Materialized streak** (ADR-004)
  - `User.currentStreak`, `User.bestStreak`, `User.lastReviewDate`
  - Updated atomically in `createReview` transaction
- **Email idempotence** (ADR-005)
  - `email_log(user_id, email_type, week_key)` UNIQUE constraint
  - Insert-then-catch-23505 pattern
- **Supabase Edge Function** (`weekly-learning-summary`)
  - 4 notification types: weekly, inactivity, decay, prop_firm_health
  - Timezone-aware scheduling
  - `CRON_SECRET` validation (bypass vulnerability — TD-006)

### Migrations Applied
- `learning_resources` table
- `resource_reviews` table
- `email_log` table (off-schema — TD-010)

---

## [Phase 0 — Foundation & Security] — 2024 Q1

### Added
- **Next.js App Router** project scaffold with TypeScript
- **Supabase Auth** integration via `@supabase/ssr`
- **JWT middleware** (`src/middleware.ts`) protecting all routes except `/login`
- **tRPC v11** setup with `protectedProcedure` and `createTRPCContext`
- **Prisma 7** with PrismaPg adapter (ADR-002)
- **Row Level Security** on all tables with `(select auth.uid()) = user_id` policies
- **`User` model** — id, email, name, role, timezone, baseCurrency, language, weeklyGoalMinutes, emailNotifications
- **Health check endpoint** (`/api/health`) — SELECT 1
- **Base domain models**: Account, Trade, Setup, Rule, Market, WeeklyReview

### Security Baseline
- Service role key server-only; publishable key for Auth only
- `where: { userId: ctx.userId }` on all mutations (defense in depth beyond RLS)
- Zod validation on all tRPC inputs
