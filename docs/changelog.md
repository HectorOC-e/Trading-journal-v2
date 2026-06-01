# Changelog — Trading Journal v2

> **Last Updated: 2026-06-01**  
> Git-style changelog organized by development phase. Based on TASKS.md, audit findings, and codebase analysis. Dates are approximate development windows.

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
