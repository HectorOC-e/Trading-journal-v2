# Architecture — Trading Journal v2

> **Last Updated: 2026-05-31**  
> Complete architecture reference merging the existing ARCHITECTURE.md with audit findings and AI subsystem design. See `repository-audit-report.md` for the full 37-finding breakdown.

---

## System Overview

Trading Journal v2 is a single-tenant Next.js application for active traders. It covers trade registration, prop-firm account management, setup/playbook management, weekly reviews, spaced-repetition learning, and an AI coach. The stack is fully TypeScript end-to-end.

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js App Router, React | 16.2.6, 19.2.4 |
| API | tRPC | 11.17.0 |
| ORM | Prisma with PrismaPg adapter | 7.8.0 |
| Database | Supabase PostgreSQL + pgvector | — |
| Auth | Supabase Auth + JWT middleware | — |
| Background Jobs | Supabase Edge Functions (Deno) | — |
| Email | Resend API | — |
| Charts | Recharts | 3.8.1 |
| Validation | Zod | 4.4.3 |
| State | Zustand | 5 |
| Styles | Tailwind CSS | 4 |
| AI Providers | Anthropic SDK / OpenAI / OpenRouter | Anthropic SDK 0.100.1 |
| Hosting | Vercel (app) + Supabase (DB/Auth/Storage) | — |
| Testing | Vitest (unit only) | — |

---

## Directory Structure

```
src/
├── app/                          # Next.js App Router (10 pages + 4 API routes)
│   ├── api/
│   │   ├── ai-coach/route.ts     # Streaming AI coach (SSE)
│   │   ├── ai-embed/route.ts     # pgvector embedding endpoint
│   │   ├── import/mt4/route.ts   # CSV import (MT4 / cTrader)
│   │   └── health/route.ts       # SELECT 1 health check
│   ├── dashboard/                # Dashboard — 4 tabs, analytics hub
│   ├── trades/                   # Trade list, KPI strip
│   ├── cuentas/                  # Account management (prop firm)
│   ├── playbook/                 # Setup catalog
│   ├── reviews/                  # Weekly reviews
│   ├── aprendizaje/              # Learning resources + SRS
│   ├── reglas/                   # Trading rules
│   ├── mercados/                 # Market watchlist
│   ├── retiros/                  # Withdrawals
│   ├── perfil/                   # User profile (CRITICAL: non-functional — TD-003)
│   └── login/                    # Supabase Auth
├── server/
│   └── trpc/
│       ├── root.ts               # 10 routers composed
│       ├── init.ts               # Context + protectedProcedure
│       └── routers/              # One file per domain
│           ├── trades.ts         # 924 lines — dominant router
│           ├── learning-resources.ts  # 680 lines
│           ├── accounts.ts
│           ├── weekly-reviews.ts
│           ├── setups.ts
│           ├── rules.ts
│           ├── markets.ts
│           ├── withdrawals.ts
│           ├── account-logs.ts
│           └── trading-sessions.ts
├── domains/
│   ├── analytics/
│   │   ├── services/
│   │   │   ├── dashboard-analytics.ts   # Server-side KPI aggregation
│   │   │   ├── analytics-cache.ts       # TradeStatsCache (feature-flagged)
│   │   │   ├── pattern-detector.ts      # 5 behavioral patterns (rule-based)
│   │   │   └── trading-sessions.ts      # Session time windows
│   │   └── ai-context.ts               # Builds trader context for AI coach
│   ├── learning/
│   │   ├── decay-detector.ts
│   │   ├── review-scheduler.ts
│   │   └── streak-service.ts
│   └── trading/
│       ├── services/
│       │   ├── account-service.ts       # computeMaxDrawdown canonical impl
│       │   ├── trade-service.ts
│       │   └── prop-firm-guard.ts
│       └── csv-import.ts
├── lib/
│   ├── ai/
│   │   ├── config.ts             # Provider detection, model defaults
│   │   ├── chat.ts               # Unified streaming chat abstraction
│   │   └── embeddings.ts         # Unified embedding API
│   ├── formulas.ts               # calcSharpeRatio, calcProfitFactor, calcExpectancyR
│   ├── prisma.ts                 # PrismaClient singleton
│   └── supabase/                 # Supabase SSR clients
├── components/                   # Shared React components
├── types/                        # types/index.ts — RouterOutputs re-exports
├── __tests__/                    # 11 unit test files (Vitest)
├── prisma/
│   └── schema.prisma             # 13 Prisma models
└── supabase/
    └── functions/
        └── weekly-learning-summary/   # Deno edge function (613 lines)
```

---

## Data Flow Diagram

```
Browser
  ├── Page Component (thin — layout + tab wiring)
  │     ├── Custom hooks (useMemo → tRPC result, not raw trades)
  │     └── tRPC Client (TanStack Query)
  │           └── tRPC Router (auth + input validation)
  │                 ├── Domain Service (business logic in src/domains/)
  │                 │     └── Pure formulas (src/lib/formulas.ts)
  │                 └── Prisma Client
  │                       └── Supabase PostgreSQL
  │
  ├── Route Handlers (/api/*)
  │     ├── ai-coach → lib/ai/chat.ts → AI Provider (streaming SSE)
  │     ├── ai-embed → lib/ai/embeddings.ts → pgvector ($executeRaw)
  │     └── import/mt4 → domains/trading/csv-import.ts → Prisma
  │
  └── Supabase Edge Function (Deno, weekly-learning-summary)
        ├── Runs on pg_cron schedule
        ├── Calls Resend API for emails
        └── Uses email_log table for idempotency
```

**Note on current state:** Dashboard page still has residual client-side useMemo analytics. Target is all aggregations via `trades.dashboardStats` (partially done). See ADR-007.

---

## Database Schema Overview

All tables have RLS enabled. All user-owned tables enforce `user_id = auth.uid()`.

### User
Core user record with preferences and materialized streak.
- Key fields: `id`, `email`, `name`, `timezone`, `baseCurrency`, `language`, `weeklyGoalMinutes`, `emailNotifications`, `currentStreak`, `bestStreak`, `lastReviewDate`
- Missing from UI: all fields exist in DB but none are read/written by the profile page (TD-003)

### Account
Prop firm and personal trading accounts.
- Key fields: `type` (PERSONAL|PROP_FIRM|DEMO_PERSONAL|DEMO_PROP|BACKTEST|QA), `status` (ACTIVE|PAUSED|INACTIVE|LOST), `initialBalance`, `currency`, `timezone`
- Drawdown limits: `ddDailyPct`, `ddWeeklyPct`, `ddMonthlyPct`, `ddTotalPct`
- Prop firm extras: `phase` (PHASE_1|PHASE_2|FUNDED|NONE), `ddModel` (FIXED|TRAILING), `maxTradesPerDay`, `allowedSymbols`, `minTradingDays`
- Note: constraints stored but not enforced at mutation boundary (ADR-008 proposed)

### Trade
Core trade record with event sourcing via TradeEvent.
- Key fields: `direction`, `symbol`, `entry`, `stop`, `target`, `size`, `date`, `session`, `tags`, `notes`, `screenshotUrls`
- Computed: `rMultiple`, `pnl`, `closePrice`, `commission`
- Status: OPEN | CLOSED | CANCELLED
- Missing: psychology fields (emotionBefore, fomoFlag, revengeFlag) — TASK-034
- Off-schema: `notes_embedding vector(1536)` managed via raw SQL (TD-010)

### TradeEvent (immutable)
Append-only event trail for trade lifecycle.
- Types: OPEN | STOP_MOVE | TRAIL_STOP | TAKE_PROFIT_MOVE | PARTIAL_CLOSE | SCALE_IN | NOTE
- Enables replay and time-travel analytics (ADR-003)

### Setup
Trading strategy/pattern definition.
- Key fields: `name`, `abbreviation`, `direction` (LONG|SHORT|AMBAS), `status` (ACTIVO|EN_PRUEBA|PAUSADO|DESCARTADO), `aplusChecklist[]`, `standardChecklist[]`
- Edge definition: `expectedWr`, `expectedAvgR`, `minR`, `maxR`
- Immutable history via `SetupVersion` snapshots

### WeeklyReview
Weekly performance reflections.
- Key fields: `weekLabel`, `weekStart`, `weekEnd`, `tradeCount`, `netPnl`, `winRate`, `disciplineScore`, `executiveSummary`, `whatWorked`, `toImprove`, `status` (draft|submitted)
- No edit UI despite `weeklyReviews.update` procedure existing (TASK-031)

### LearningResource
Study materials with spaced repetition.
- Key fields: `type` (LIBRO|VIDEO|NOTA|BACKTEST|PODCAST|DRILL|HERRAMIENTA), `status` (PENDING|IN_PROGRESS|COMPLETED|IN_REVIEW|MASTERED|ABANDONED)
- SRS fields: `reviewInterval`, `nextReviewAt`, `weekDeltaMinutes`
- Progress: `progressType` (manual|pages|minutes|sessions), `totalUnits`, `currentUnits`

### Rule
Trading discipline rules.
- Key fields: `severity` (CRÍTICA|MENOR|INFORMACIÓN), `isSystem`, `enabled`
- `violationsThisMonth` tracked but never auto-incremented (schema has no such field — violations are inferred from trade tags)

### TradeStatsCache
Materialized analytics cache (feature-flagged via `ANALYTICS_CACHE_ENABLED`).
- Keyed by `(userId, period)`. TTL 5 minutes enforced at application layer.

### TradeChecklistResult
Pre-trade checklist adherence tracking (1:1 with Trade).
- Fields: `itemsChecked[]`, `itemsTotal`, `setupId`

### TradingSessionLog
Pre-session mood and energy tracking.
- Fields: `preMood` (1–5), `energyLevel` (1–5), `notes`
- Unique per (userId, date, session)

### AccountLog (immutable)
Append-only account event trail.
- Events: CREATED | PHASE_CHANGE | WITHDRAWAL | STATUS_CHANGE | NOTE
- `list` procedure has `take: 50` hardcoded — no pagination (TD-018/TASK-020)

### Off-Schema Tables (Risk)
- `email_log (user_id, email_type, week_key)` — idempotency table used by edge function; not in schema.prisma (TD-010)
- `notes_embedding vector(1536)` column on trades — managed via `prisma.$executeRaw` only (TD-010)

---

## Authentication Flow

```
1. Browser → /login page → Supabase Auth (email/password or OAuth)
2. Supabase issues JWT → stored in cookie via @supabase/ssr
3. src/middleware.ts → validates JWT for all protected routes
   - Redirects unauthenticated users to /login
   - Uses route matcher (login excluded)
4. tRPC init.ts → createTRPCContext()
   - Creates Supabase SSR client per request
   - Calls supabase.auth.getUser() — note: one auth API call per tRPC request (TD-019)
   - Attaches userId to context
5. protectedProcedure → checks ctx.userId exists; throws UNAUTHORIZED if not
6. All queries use where: { userId: ctx.userId } — defense in depth against RLS misconfiguration
```

**Service role key:** Used server-side only (Route Handlers, edge functions). Never exposed to client.  
**Publishable key:** Exposed to browser for Auth interactions only.

---

## AI Subsystem Architecture

### Provider Abstraction Layer (`src/lib/ai/`)

| File | Responsibility |
|---|---|
| `config.ts` | Provider detection, key resolution, model defaults |
| `chat.ts` | Unified streaming chat (Anthropic SDK + OpenAI-compatible) |
| `embeddings.ts` | Unified embedding API (OpenAI-compatible only) |

**Provider priority chain:** OpenRouter → Anthropic → OpenAI  
**Graceful degradation:** `isAnyKeyConfigured()` returns false → AI features disabled cleanly

### Feature → Model Mapping

| Feature | File | Model Function | Current Default |
|---|---|---|---|
| AI Coach chat | `api/ai-coach/route.ts` | `getCoachModel()` | `claude-sonnet-4-5` (**stale — should be 4-6**, T-015) |
| Weekly review summary | `routers/weekly-reviews.ts` | `getWeeklySummaryModel()` | `claude-haiku-4-5-20251001` (**suspicious ID**, T-016) |
| Trade note embeddings | `api/ai-embed/route.ts` | `getEmbeddingModel()` | `openai/text-embedding-3-small` |
| Trader context builder | `domains/analytics/ai-context.ts` | N/A | N/A (data aggregation only) |
| Pattern detector | `domains/analytics/services/pattern-detector.ts` | N/A | Rule-based, no LLM |
| Weekly email summary | `supabase/functions/weekly-learning-summary/` | Coach model | Deno runtime |

### Known AI Issues

1. `getCoachModel()` returns `claude-sonnet-4-5` — stale; current model is `claude-sonnet-4-6` (TASK-032)
2. `getWeeklySummaryModel()` returns `claude-haiku-4-5-20251001` — date suffix is non-standard (TASK-032)
3. `ai-context.ts:185` re-implements Sharpe Ratio with population std dev instead of calling `calcSharpeRatio` from `lib/formulas.ts` which uses Bessel-corrected sample std dev (TD-011)
4. Trader context rebuilt on every request — no caching layer
5. No rate limiting or circuit breaker
6. No per-user API key storage (all keys are server-wide env vars) — see proposed `UserAiConfig` schema in `ai-architecture.md`

---

## Storage Architecture

Two Supabase Storage buckets:
- `trade-screenshots` — chart screenshots attached to trades. Deleted via `storage.from("trade-screenshots").remove(urls)` in `trades.delete` (result not checked).
- `setup-images` — setup chart images. **Security issue:** uploaded directly from browser without server-side MIME/size validation (TD-021, TASK-017).

`Trade.screenshotUrls` is a `String[]` field in the schema; URLs stored as public Supabase Storage paths.

---

## Analytics Pipeline

```
1. Raw trades stored in PostgreSQL (trades table)
2. trades.dashboardStats tRPC procedure:
   - Queries trades for period (default: all-time, filterable by accountId + date range)
   - Calls domains/analytics/services/dashboard-analytics.ts
   - Computes: kpis, equityCurve, pnlByDate, pnlBySymbol, sessionStats, hourStats, setupStats, propFirmStatus
   - Returns pre-aggregated object (no raw trade data to client)
3. TradeStatsCache (feature-flagged, ANALYTICS_CACHE_ENABLED=true):
   - Caches dashboardStats result keyed by (userId, period)
   - TTL: 5 minutes, enforced at application layer
   - Not enabled by default (TASK-021)
4. Pattern detector (domains/analytics/services/pattern-detector.ts):
   - 5 static rule-based patterns
   - Runs on weekly review creation
   - Outputs behavioral insights for review summary
5. pgvector semantic search (off-schema):
   - notes_embedding vector(1536) on trades
   - Managed via prisma.$executeRaw
   - Embedding created via fire-and-forget fetch to /api/ai-embed (reliability risk — TD-020)
```

---

## Current Layering (Actual)

```
Browser
  └── Page Component (900–1746 LOC)
        ├── useMemo analytics (18+ derivations from raw arrays)
        ├── Inline modal components (3–5 per page)
        └── tRPC Client
              └── tRPC Router (auth + input + business logic mixed)
                    └── Prisma Client
                          └── Supabase PostgreSQL
```

### Critical Problems with Current Layering

1. **Client-side analytics on unbounded raw data** — dashboard fetches ALL trades and computes metrics in useMemo; degrades quadratically with trade volume
2. **Fat pages are test-resistant** — four pages exceed 1000 LOC; business logic, UI state, form validation co-located
3. **Business rules not enforced at mutation boundary** — prop firm constraints stored in schema but not checked in `trades.create` (ADR-008 proposed)

---

## Target Layering

```
Browser
  └── Page Component (~150 LOC — layout + tab wiring)
        ├── Custom domain hooks (useTradeAnalytics, useAccountMetrics)
        ├── Modal components (separate files, lazy-loaded)
        └── tRPC Client
              └── tRPC Router (auth + input parsing only)
                    └── Domain Service (business logic)
                          ├── Domain Rules (pure functions — lib/trading-formulas.ts)
                          └── Prisma Repository (DB access)
```

---

## Performance Characteristics

| Operation | Current | Target |
|---|---|---|
| Dashboard load (100 trades) | ~200ms | ~100ms |
| Dashboard load (500 trades) | ~1500ms | ~120ms |
| Dashboard load (1000+ trades) | ~4000ms+ | ~150ms |
| Trade list | All trades transferred | 50/page, cursor-based |
| Stats computation | Client useMemo (all tabs) | Server pre-aggregated |
| Streak read | O(1) from User fields | O(1) (done) |
| resourceImpactRanking | O(resources × setups) DB queries | O(1) queries (TASK-039) |

---

## Security Model

### Row Level Security
All application tables have RLS enabled with `(select auth.uid()) = user_id` policies.  
`_ResourceSetups` M2M: RLS on column A (LearningResource owned by user).

### Input Validation
- Zod schemas on all tRPC procedure inputs
- `where: { id, userId: ctx.userId }` on all update/delete mutations

### Known Security Issues
- `CRON_SECRET` empty-string bypass in edge function — allows unauthenticated triggering (TD-006, TASK-016)
- Setup images uploaded from browser without server-side validation (TD-021, TASK-017)
- No rate limiting on AI endpoints

---

## Infrastructure

```
Vercel
  └── Next.js (edge runtime for middleware, Node for API routes and pages)

Supabase (jpojusluihjjsjvcubdp)
  ├── PostgreSQL
  │    ├── public schema (13 Prisma models + email_log off-schema)
  │    ├── pgvector extension (notes_embedding off-schema)
  │    └── auth schema (managed by Supabase)
  ├── Edge Functions
  │    └── weekly-learning-summary
  │         ├── type=weekly        → Mondays 09:00 local per user
  │         ├── type=inactivity    → Mondays 10:00 local per user
  │         ├── type=decay         → resource review reminders
  │         └── type=prop_firm_health → drawdown alerts
  ├── Storage
  │    ├── trade-screenshots
  │    └── setup-images
  ├── pg_cron (schedules edge function calls)
  └── Auth (JWT + OAuth)

Resend (transactional email)
  └── FROM_EMAIL currently noreply@resend.dev — must be verified domain in production (TD-024)
```

---

## Architectural Decision Records

### ADR-001: tRPC over REST
**Status:** Active. End-to-end type safety; type changes propagate automatically.

### ADR-002: Prisma with PrismaPg adapter (no Supabase client for data queries)
**Status:** Active. Better type safety and composable query building.

### ADR-003: Immutable event trails for trades and accounts
**Status:** Active. TradeEvent and AccountLog are append-only; enables replay and time-travel analytics.

### ADR-004: Materialized streak on User
**Status:** Active. `currentStreak`, `bestStreak`, `lastReviewDate` updated atomically in `createReview` transaction — O(1) lookup.

### ADR-005: Email idempotence via DB unique constraint
**Status:** Active. `email_log(user_id, email_type, week_key)` UNIQUE; insert-then-catch-23505.

### ADR-006: Decay detection in stats query (not cron)
**Status:** Active (but violates CQRS — TD-009). MASTERED→IN_REVIEW triggered on `stats` call. Trade-off: simpler than cron but side-effect in query.

### ADR-007 (PROPOSED): Dashboard analytics on server
**Status:** Proposed P0. All aggregations via `trades.dashboardStats`; raw trade fetch eliminated from dashboard.

### ADR-008 (PROPOSED): Prop firm constraint enforcement in trades.create
**Status:** Proposed P1. Validate ddDailyPct, maxTradesPerDay, allowedSymbols before persisting a trade.

---

## Type System Health

### Current Issues

```typescript
// trades/page.tsx — 15+ double casts hide type mismatches (TD-013)
const trade = item as never as TradeDetailPanelProps

// types/index.ts — LearningResource defined manually, diverges from RouterOutputs (TD-014)
interface LearningResource { ... }  // should be: type LearningResource = RouterOutputs[...]

// types/index.ts — SetupStatus is incomplete
type SetupStatus = "ACTIVO" | "PAUSADO"
// schema has: ACTIVO | EN_PRUEBA | PAUSADO | DESCARTADO
```

### Target Pattern

```typescript
import type { RouterOutputs } from "@/server/trpc/root"
type Trade   = RouterOutputs["trades"]["list"]["items"][number]
type Account = RouterOutputs["accounts"]["list"][number]
type Setup   = RouterOutputs["setups"]["list"][number]
```

Keep `types/index.ts` only for UI-only enums and pure component prop types not derivable from tRPC.

---

## Known Architectural Issues (from Audit)

| ID | File | Severity | Description |
|----|------|----------|-------------|
| TD-003 | `app/perfil/page.tsx` | CRITICAL | Profile entirely disconnected from backend |
| TD-004 | `app/trades/page.tsx` | CRITICAL | KPIs over paginated data (max 50 trades) |
| TD-005 | `cuentas/modals/promote-phase-modal.tsx:41` | CRITICAL | `objectiveMet = false` hardcoded |
| TD-006 | `supabase/functions/weekly-learning-summary/index.ts` | CRITICAL | CRON_SECRET bypass |
| TD-007 | `api/import/mt4/route.ts` | HIGH | rMultiple null on all imports |
| TD-008 | `routers/learning-resources.ts:~350` | HIGH | N+1 query (O(resources×setups) DB calls) |
| TD-009 | `routers/learning-resources.ts:~400` | HIGH | CQRS violation: mutation in query procedure |
| TD-010 | `prisma/schema.prisma` | HIGH | notes_embedding and email_log off-schema |
| TD-018 | `routers/trades.ts` | MEDIUM | 924-line router with inline business logic |
| TD-019 | `server/trpc/init.ts` | MEDIUM | Supabase auth.getUser() called per request |
| TD-020 | `routers/trades.ts` | MEDIUM | Fire-and-forget embedding in same worker |
| TD-021 | `app/playbook/page.tsx` | MEDIUM | Client-side Storage upload without server validation |

---

## Proposed Architecture Improvements

1. **Formula centralization** (`lib/trading-formulas.ts`) — unify 8 win-rate implementations, 3 discipline-score implementations, 2 Sharpe implementations (TASK-027)
2. **Profile router** — new `src/server/trpc/routers/profile.ts` with get/update/changePassword/exportData/deleteAccount (TASK-006)
3. **UserPreferences table** — persist theme, dashboard tab, KPI order, date format (TASK-030)
4. **UserAiConfig table** — per-user encrypted API keys with AES-256-GCM (TASK-033; see `ai-architecture.md`)
5. **AiUsageLog table** — per-user token cost tracking (see `ai-architecture.md`)
6. **Service layer completion** — extract remaining business logic from routers into `domains/`; routers become thin orchestration
7. **JWT header auth** — pass userId from middleware header instead of calling auth API per request (TD-019)
8. **Reliable embedding** — DB webhook or Upstash QStash instead of fire-and-forget (TD-020)
