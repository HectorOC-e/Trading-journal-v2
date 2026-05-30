# Architecture — Trading Journal v2

## Current State (as of 2026-05-30)

### Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router, React 19, Tailwind CSS |
| API | tRPC v11 (type-safe RPC over HTTP) |
| ORM | Prisma 7 with PrismaPg adapter |
| Database | Supabase PostgreSQL (project: `jpojusluihjjsjvcubdp`) |
| Auth | Supabase Auth (JWT, middleware-enforced) |
| Background | Supabase Edge Functions (Deno) + pg_cron |
| Email | Resend API via Edge Function |
| Hosting | Vercel (Next.js) + Supabase (DB + Functions) |

### Current Layering (Actual)

```
Browser
  └── Next.js Page Component  ← all UI state, data fetching, modal logic
        └── tRPC Client
              └── tRPC Router  ← auth check, business logic, DB query — all mixed
                    └── Prisma Client
                          └── Supabase PostgreSQL
```

**Problems with current layering:**
- Page components are monoliths (900–1500 LOC files with embedded modals, forms, and business logic)
- tRPC routers mix transport concerns (input validation, auth) with business logic (streak calculation, decay detection, impact ranking)
- No domain layer — concepts like "what makes a review overdue" are duplicated across routers and edge functions
- Stats are computed on-demand with O(n) queries; no materialization strategy beyond `weekDeltaMinutes` and the streak fields added in L030

### Domain Model

```
User
 ├── Account (1:n)  ← PERSONAL, PROP_FIRM, DEMO, BACKTEST, QA
 │    ├── Trade (1:n)
 │    │    └── TradeEvent (1:n)
 │    ├── WeeklyReview (1:n)
 │    └── Withdrawal (1:n)
 ├── Setup (1:n)  ← linked to LearningResource via _ResourceSetups M2M
 │    └── Rule (1:n, via rules table)
 ├── LearningResource (1:n)
 │    ├── ResourceReview (1:n)
 │    └── Setup[] (M2M via _ResourceSetups)
 ├── Market (1:n)
 └── AccountLog (1:n)  ← audit trail for account balance changes
```

---

## Target Architecture

### Principles

1. **Domain-first** — business rules live in a pure domain layer, independent of tRPC or Prisma
2. **Service layer** — each domain has a service that orchestrates domain logic and DB access
3. **Thin routers** — tRPC procedures only handle auth, input parsing, and delegation to services
4. **Thin pages** — page components only handle UI state; data fetching via hooks, modals as separate files
5. **AI-ready** — analytics surface is isolated so an AI layer can query it without coupling to UI

### Target Layering

```
Browser
  └── Page Component  ← UI state only, no business logic
        ├── Custom Hooks (domain-specific query/mutation hooks)
        └── Modal Components (separate files)
              └── tRPC Client
                    └── tRPC Router  ← auth + input parsing only
                          └── Domain Service  ← business logic
                                ├── Domain Entities  ← pure logic, no DB
                                └── Repository / Prisma  ← DB access
```

### Module Boundaries

```
src/
  domains/
    trading/          ← Trade, Account, Setup, Market, Rule
      entities/       ← pure TypeScript classes/functions
      services/       ← TradeService, AccountService, SetupService
      repositories/   ← thin wrappers over Prisma calls
    learning/         ← LearningResource, ResourceReview
      entities/
      services/       ← ReviewScheduler, StreakService, DecayDetector
      repositories/
    finance/          ← Withdrawal, AccountLog
      services/       ← WithdrawalService
    reflection/       ← WeeklyReview
      services/       ← WeeklyReviewService
    analytics/        ← cross-domain computed insights
      services/       ← ImpactRankingService, PerformanceAnalyticsService
  server/
    trpc/
      routers/        ← thin: auth + delegate to domain services
  app/                ← page components + hooks + modals (split by domain)
  components/
    ui/               ← primitives (Button, Dialog, etc.)
    [domain]/         ← domain-specific composite components
```

### Key Architectural Decisions

#### ADR-001: Materialized stats over on-demand computation
- **Decision:** Streak (`currentStreak`, `bestStreak`, `lastReviewDate`) is materialized on `User` and updated atomically in `createReview` transactions.
- **Rationale:** Scanning all `ResourceReview` rows per stats request was O(n) and unscalable.
- **Similar pattern to apply:** setup win-rate summary, weekly P&L aggregates.

#### ADR-002: PostgreSQL unique constraint for email idempotence
- **Decision:** `email_log` table with `UNIQUE(user_id, email_type, week_key)` used as a "check-and-insert" idempotence lock.
- **Rationale:** Atomic — no race conditions compared to select-then-insert. 23505 error code signals duplicate, not error.

#### ADR-003: Decay detection in stats, not cron
- **Decision:** `MASTERED → IN_REVIEW` transition runs inside the `stats` tRPC procedure when the page loads.
- **Rationale:** Simpler than a cron job; triggers naturally when the user is active. Acceptable latency.
- **Trade-off:** If a user is inactive for weeks, decay is not detected until they return. Acceptable given the app model.

#### ADR-004: Row Level Security on all tables
- **Decision:** Every Supabase table must have RLS enabled with per-user policies.
- **Rationale:** Defense in depth — even if tRPC auth is bypassed, PostgREST and direct Supabase client calls are blocked.

---

## Security Model

### Authentication
- Supabase JWT, validated in `src/middleware.ts` before any page renders
- tRPC `protectedProcedure` extracts `userId` from session — never trusted from client input

### Row Level Security
- All application tables have RLS enabled
- Policies use `(select auth.uid()) = user_id` pattern (not `auth.uid()` directly — avoids per-row function call overhead)
- `_ResourceSetups` (Prisma M2M join table): RLS policies check A references a resource owned by the user

### Edge Functions
- `CRON_SECRET` header required for cron-triggered calls
- Service role key used server-side only, never exposed to browser

---

## Performance Considerations

| Concern | Current Approach | Target |
|---|---|---|
| Trade list | Full scan + client filter | Paginated with cursor, server-side filter |
| Stats computation | On-demand in tRPC | Partial materialization (streak ✓, WR TBD) |
| Weekly email | Fan-out per user in single function | Queue-based fan-out for >1k users |
| Resource list | Full user resource fetch | Paginated with status filter pushed to DB |

---

## Infrastructure

```
Vercel
  └── Next.js (edge runtime for middleware, Node for API routes)

Supabase (jpojusluihjjsjvcubdp)
  ├── PostgreSQL
  │    ├── public schema (app tables)
  │    └── auth schema (managed by Supabase)
  ├── Edge Functions
  │    └── weekly-learning-summary (cron: Mondays hourly, Thursdays hourly)
  ├── Auth
  └── Storage (not yet used)
```
