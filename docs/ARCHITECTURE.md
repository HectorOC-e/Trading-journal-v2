# Architecture — Trading Journal v2

> Last reviewed: 2026-05-30. See ASSESSMENT_2026.md for the detailed finding-by-finding breakdown.

---

## Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js App Router, React | 16.2.6, 19.2.4 |
| API | tRPC | 11.17.0 |
| ORM | Prisma with PrismaPg adapter | 7.8.0 |
| Database | Supabase PostgreSQL | — |
| Auth | Supabase Auth + JWT middleware | — |
| Background | Supabase Edge Functions (Deno) | — |
| Email | Resend API | — |
| Charts | Recharts | 3.8.1 |
| Validation | Zod | 4.4.3 |
| Hosting | Vercel (app) + Supabase (DB) | — |

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

**1. Client-side analytics on unbounded raw data**
The dashboard fetches ALL trades (no pagination) and computes all metrics — equity curves, drawdown, session analysis, setup performance — in `useMemo` hooks inside a 1746-LOC page component. This degrades quadratically with trade volume.

**2. Fat pages are test-resistant**
Four pages exceed 1000 LOC. Business logic, UI state, form validation, and modal rendering are co-located. No unit of the page is independently testable.

**3. Business rules not enforced at mutation boundary**
Prop firm constraints (daily loss %, drawdown %, max trades/day, allowed symbols) are stored in the schema but not checked in `trades.create`. Rule violation counts (`Rule.violationsThisMonth`) are tracked in the schema but never incremented automatically.

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
                          ├── Domain Rules (pure functions — formulas.ts extended)
                          └── Prisma Repository (DB access)
```

### Target Module Boundaries

```
src/
  domains/
    trading/
      services/
        trade-service.ts          ← P&L calc, close logic, prop firm enforcement
        account-service.ts        ← balance, drawdown computation
        setup-service.ts          ← performance aggregation
      rules/
        prop-firm-rules.ts        ← constraint checkers (pure functions)
    learning/
      services/
        review-scheduler.ts       ← calcNextReviewAt, interval scaling
        streak-service.ts         ← computeNewStreak (extracted from createReview)
        decay-detector.ts         ← MASTERED→IN_REVIEW logic
    analytics/
      services/
        dashboard-analytics.ts    ← all dashboard aggregations (server-side)
        setup-analytics.ts        ← setup win-rate, equity curve per setup
  server/
    trpc/
      routers/                    ← thin: auth + input validation + delegate
  app/
    dashboard/
      page.tsx                    ← tab wiring only
      hooks/
        use-dashboard-stats.ts    ← wraps pre-aggregated tRPC queries
      tabs/
        tab-portfolio.tsx
        tab-operador.tsx
        tab-disciplina.tsx
        tab-playbook.tsx
    aprendizaje/
      page.tsx                    ← wiring only
      modals/
        add-resource-modal.tsx
        session-review-modal.tsx
        impact-modal.tsx
        link-setup-modal.tsx
```

---

## Domain Model

```
User (root aggregate)
 ├── Account (1:n)
 │    ├── type: PERSONAL | PROP_FIRM | DEMO_PERSONAL | DEMO_PROP | BACKTEST | QA
 │    ├── status: ACTIVE | PAUSED | INACTIVE | LOST
 │    ├── dd limits: ddDailyPct, ddWeeklyPct, ddMonthlyPct, ddTotalPct
 │    ├── prop firm extras: phase, ddModel, maxTradesPerDay, allowedSymbols
 │    ├── Trade (1:n)
 │    │    ├── status: OPEN | CLOSED | CANCELLED
 │    │    ├── TradeEvent (1:n, immutable)
 │    │    │    types: OPEN | STOP_MOVE | TRAIL_STOP | TAKE_PROFIT_MOVE |
 │    │    │           PARTIAL_CLOSE | SCALE_IN | NOTE
 │    │    └── Setup (n:1, nullable)
 │    ├── WeeklyReview (1:n)
 │    └── Withdrawal (1:n)
 │         └── → AccountLog (append-only audit trail)
 ├── Setup (1:n)
 │    ├── direction: LONG | SHORT | AMBAS
 │    ├── status: ACTIVO | EN_PRUEBA | PAUSADO | DESCARTADO
 │    ├── aplusChecklist[], standardChecklist[]
 │    └── LearningResource[] (M2M via _ResourceSetups)
 ├── LearningResource (1:n)
 │    ├── type: LIBRO | VIDEO | NOTA | BACKTEST | PODCAST | DRILL | HERRAMIENTA
 │    ├── status: PENDING | IN_PROGRESS | COMPLETED | IN_REVIEW | MASTERED | ABANDONED
 │    ├── progressType: manual | pages | minutes | sessions
 │    ├── spaced repetition: reviewInterval, nextReviewAt, weekDeltaMinutes
 │    └── ResourceReview (1:n)
 ├── Rule (1:n)
 │    ├── severity: CRÍTICA | MENOR | INFORMACIÓN
 │    ├── isSystem (bool), enabled (bool)
 │    └── violationsThisMonth (int — currently not auto-incremented)
 ├── Market (1:n)
 └── AccountLog (1:n, append-only)
      events: CREATED | PHASE_CHANGE | WITHDRAWAL | STATUS_CHANGE | NOTE
```

---

## Architectural Decision Records

### ADR-001: tRPC over REST
**Decision:** All client–server communication via tRPC with Zod input validation.  
**Rationale:** End-to-end type safety. Type changes in routers propagate to components without manual interface sync.  
**Status:** Active, working well.

### ADR-002: Prisma with PrismaPg adapter (no Supabase client for data queries)
**Decision:** Prisma for all DB access; Supabase client only for Auth.  
**Rationale:** Prisma provides better type safety and composable query building.  
**Status:** Active.

### ADR-003: Immutable event trails for trades and accounts
**Decision:** TradeEvent and AccountLog are append-only. Mutations on Trade state create events, never modify events.  
**Rationale:** Full audit trail; enables replay and time-travel analytics.  
**Status:** Active, well-implemented.

### ADR-004: Materialized streak on User
**Decision:** `currentStreak`, `bestStreak`, `lastReviewDate` maintained atomically on User in `createReview` transaction.  
**Rationale:** Avoids O(n) scan of all ResourceReview rows on each stats call.  
**Status:** Active (implemented in L030).

### ADR-005: Email idempotence via DB unique constraint
**Decision:** `email_log(user_id, email_type, week_key)` UNIQUE. Insert-then-catch-23505 pattern.  
**Rationale:** Atomic. No race conditions vs select-then-insert.  
**Status:** Active (implemented in L031).

### ADR-006: Decay detection in stats query (not cron)
**Decision:** MASTERED→IN_REVIEW transition occurs inside the `stats` tRPC procedure.  
**Rationale:** Simpler than a cron job. Triggers naturally when user is active.  
**Trade-off:** Decay not detected during long inactivity. Acceptable given app model.  
**Status:** Active (implemented in L029).

### ADR-007 (PROPOSED): Dashboard analytics on server
**Decision:** All dashboard aggregations (equity curves, win rates, drawdowns, session matrices) should be computed in a `trades.dashboardStats` tRPC procedure, not in client useMemo.  
**Rationale:** Raw trade fetch is unbounded; client computation degrades with volume.  
**Status:** Proposed. Priority P0.

### ADR-008 (PROPOSED): Prop firm constraint enforcement in trades.create
**Decision:** `trades.create` should validate against account's ddDailyPct, maxTradesPerDay, and allowedSymbols before persisting.  
**Rationale:** Schema captures intent; enforcement is missing.  
**Status:** Proposed. Priority P1.

---

## Security Model

### Authentication
- Supabase JWT validated in `src/middleware.ts` for all protected routes
- tRPC `protectedProcedure` extracts `userId` from session; never from client input
- Login page excluded from middleware via matcher pattern

### Row Level Security
- All application tables have RLS enabled with policies using `(select auth.uid()) = user_id`
- `_ResourceSetups` (Prisma M2M): RLS policies on column A (LearningResource owned by user)
- Service role key used server-side only; publishable key exposed to browser for Auth only

### Input Validation
- Zod schemas on all tRPC procedure inputs
- `where: { id, userId: ctx.userId }` pattern on all update/delete mutations ensures cross-user access is blocked at the Prisma level even if RLS is misconfigured

### Edge Functions
- CRON_SECRET header required for cron-triggered invocations
- Resend API key is a server-only secret

---

## Performance Characteristics

| Operation | Current | Target |
|---|---|---|
| Dashboard load (100 trades) | ~200ms | ~100ms |
| Dashboard load (500 trades) | ~1500ms | ~120ms |
| Dashboard load (1000+ trades) | ~4000ms+ | ~150ms |
| Trade list (pagination) | All trades transferred | 50/page, cursor-based |
| Stats computation | Client useMemo (all tabs) | Server pre-aggregated |
| Streak read | O(1) from User fields | O(1) (done) |
| Learning stats | O(n) resource scan | Partially materialized |

---

## Infrastructure

```
Vercel
  └── Next.js (edge runtime for middleware, Node for API routes and pages)

Supabase (jpojusluihjjsjvcubdp)
  ├── PostgreSQL
  │    ├── public schema (12 app tables + email_log)
  │    └── auth schema (managed by Supabase)
  ├── Edge Functions
  │    └── weekly-learning-summary
  │         ├── type=weekly  → Mondays 09:00 local time per user
  │         └── type=inactivity → Mondays 10:00 local time per user
  ├── pg_cron (schedules edge function calls)
  └── Auth (JWT + OAuth)

Resend (transactional email)
```

---

## Type System Health

### Current Issues

```typescript
// dashboard/page.tsx — double cast hides type mismatches
const trades = allTrades as unknown as Trade[]

// types/index.ts — Account.propFirmRules is nested object
// but schema has these as flat fields on Account
propFirmRules?: { maxDrawdownPct: number; dailyLossPct: number; ... }

// types/index.ts — SetupStatus is incomplete
type SetupStatus = "ACTIVO" | "PAUSADO"
// schema has: ACTIVO | EN_PRUEBA | PAUSADO | DESCARTADO
```

### Target Pattern

Use `RouterOutputs` directly instead of maintaining `types/index.ts` by hand:

```typescript
import type { RouterOutputs } from "@/server/trpc/root"
type Trade   = RouterOutputs["trades"]["list"][number]
type Account = RouterOutputs["accounts"]["list"][number]
type Setup   = RouterOutputs["setups"]["list"][number]
```

The shared `types/index.ts` should only contain types that are NOT derived from tRPC (e.g., UI-only enums, prop types for pure components).
