# Phased Implementation Roadmap — Trading Journal v2

> Generated: 2026-05-30  
> Grounded in: ASSESSMENT_2026.md, full codebase review  
> Branch: `claude/epic-darwin-1XZTX`

---

## How to Read This Document

Each phase is self-contained. Phases within the same tier (Immediate / Medium-term / Long-term) can partially overlap in calendar time, but the dependency graph must be respected. A phase marked as depending on another cannot begin until that dependency's **core deliverable** is complete — not the full phase.

**Complexity scale:**

| Label | Files changed | LOC delta | Elapsed |
|---|---|---|---|
| S — Small | 1–4 | < 200 | 1–2 days |
| M — Medium | 4–10 | 200–700 | 3–7 days |
| L — Large | 10–20 | 700–2000 | 1–3 weeks |
| XL — Extra Large | 20+ | 2000+ | 3–6 weeks |

**Architectural impact scale:**

| Label | Meaning |
|---|---|
| Containment | Prevents an existing risk from getting worse |
| Incremental | Adds structure without requiring rewrites elsewhere |
| Structural | Changes how a layer works; adjacent layers must adapt |
| Transformative | Rewires a domain boundary; downstream code changes everywhere |

---

# TIER 1 — IMMEDIATE REFACTORS
**Horizon:** Weeks 1–5  
**Theme:** Stop the bleeding. Fix the problems that compound with every new trade logged.

---

## Phase I — Architecture Stabilization
**Priority rank: 1 of 9**

### Goal

Fix the three production risks that worsen with data volume: client-side analytics that scale quadratically, type contracts that silently diverge from the schema, and business rule constraints that exist in the DB but are never enforced server-side.

This phase has no new features. It is entirely risk reduction.

### Sub-phases (must be done in order within this phase)

#### I-A: Server-side Dashboard Analytics

**The problem in numbers:**  
At 500 closed trades, the Dashboard page transfers ~600KB of raw JSON (trade objects with full account, setup, and event includes), then runs 18+ `useMemo` computations on every tab switch. The `trades.stats` tRPC procedure — which already computes win rate, expectancy, and profit factor on the server — is imported by zero pages.

**What to build:**  
A single `trades.dashboardStats` tRPC procedure. One query, one response, all metrics pre-computed. The dashboard page becomes a renderer, not a calculator.

Return shape:
```typescript
{
  kpis: {
    total: number; wins: number; losses: number; be: number
    winRate: number; avgR: number; netPnl: number
    pnlMonth: number; pnlToday: number
    expectancyR: number; expectancyDollar: number
    profitFactor: number; sharpeRatio: number | null
    bestDay: { date: string; pnl: number } | null
    worstDay: { date: string; pnl: number } | null
    tradeStreak: { count: number; isWin: boolean } | null
  }
  equityCurve: { date: string; balance: number; accountId: string }[]
  pnlByDate: { date: string; pnl: number; accountId: string }[]     // last 90d only
  pnlBySymbol: { symbol: string; pnl: number; trades: number; winRate: number }[]
  sessionStats: { session: string; trades: number; winRate: number; avgR: number }[]
  hourStats: { hour: number; trades: number; winRate: number; avgR: number }[]
  setupStats: {
    setupId: string; name: string; abbr: string; color: string
    trades: number; winRate: number; avgR: number; cumR: number
    netPnl: number; equityCurve: number[]
  }[]
  sessionMatrix: { setupId: string; session: string; trades: number; winRate: number | null }[]
  directionStats: {
    setupId: string
    longCount: number; longWr: number; longAvgR: number
    shortCount: number; shortWr: number; shortAvgR: number
  }[]
  propFirmStatus: {
    accountId: string; name: string; ddPctUsed: number
    dailyLossPct: number; tradesUsed: number; tradesMax: number
    status: "OK" | "ALERTA"
  }[]
}
```

Server uses `calcExpectancyR`, `calcSharpeRatio`, `calcProfitFactor` from `formulas.ts`. Equity curves computed by chronological sort + running accumulation. `pnlByDate` capped at last 90 days to prevent unbounded response growth.

**Implementation sequence:**
1. Add `trades.dashboardStats` to `routers/trades.ts`
2. Add cursor pagination to `trades.list` (`{ limit: 50, cursor?: string }`)
3. Refactor `dashboard/page.tsx` to use `dashboardStats` — remove all `useMemo` analytics
4. Delete local `Trade`, `AccountRow` type definitions from `dashboard/page.tsx`

#### I-B: Type Contract Repair

**The problem:**  
`dashboard/page.tsx` contains `const trades = allTrades as unknown as Trade[]` — a double cast that suppresses TypeScript errors caused by schema drift. `types/index.ts` defines `SetupStatus` as `"ACTIVO" | "PAUSADO"` but the schema has four values. `Account.propFirmRules` is a nested object in types but flat fields in the schema.

**What to build:**  
Replace manually maintained types with `RouterOutputs`-derived types where the data originates from tRPC. Audit all `as unknown as` casts and resolve each one properly.

```typescript
// Before — in types/index.ts (manual, drifts)
export interface Trade { id: string; direction: TradeDirection; ... }

// After — derived from the router's serializer (always in sync)
import type { RouterOutputs } from "@/server/trpc/root"
export type Trade   = RouterOutputs["trades"]["list"][number]
export type Account = RouterOutputs["accounts"]["list"][number]
export type Setup   = RouterOutputs["setups"]["list"][number]
```

Keep in `types/index.ts`: UI-only enums (`TradeTag`, `TradeSession`), prop types for pure presentational components that don't receive tRPC data directly.

#### I-C: Prop Firm Enforcement at Mutation Boundary

**The problem:**  
A PROP_FIRM account can exceed its daily loss limit, trade prohibited symbols, or breach the maximum trades-per-day cap with no server rejection. The constraint fields exist in the DB and are displayed visually, but `trades.create` ignores them.

**What to build:**  
In `trades.create`, after loading the account, if `account.type === "PROP_FIRM"`:

```
1. Compute todayLoss = sum(pnl for closed trades on this account where date = today and pnl < 0)
2. If |todayLoss| / initialBalance × 100 ≥ ddDailyPct → reject
3. Compute todayCount = count(trades on this account where date = today)
4. If todayCount ≥ maxTradesPerDay (and maxTradesPerDay > 0) → reject
5. If allowedSymbols.length > 0 and symbol not in allowedSymbols → reject
```

Return structured error codes: `"PROP_FIRM_DAILY_LOSS_LIMIT"`, `"PROP_FIRM_MAX_TRADES"`, `"PROP_FIRM_SYMBOL_NOT_ALLOWED"`. Client maps codes to user-readable messages with the specific limit value included.

Also add to `trades.close`: if total drawdown exceeds `ddTotalPct`, auto-transition account to `INACTIVE` and create `AccountLog` event `STATUS_CHANGE`.

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `dashboardStats` misses an edge case covered by client useMemo | Medium | Write output comparison tests before removing client logic |
| Type repair surfaces hidden errors in pages that currently cast | High | Fix errors properly; don't introduce new casts to suppress |
| Prop firm enforcement breaks existing dev/QA test accounts | Medium | Apply validation only when `account.type === "PROP_FIRM"` strictly |
| `equityCurve` 90-day cap removes data a chart previously showed | Low | Make window configurable via input param |

### Dependencies

- None external. This phase is entirely self-contained.
- Internal: I-A must complete before I-B's type repair fully works (dashboard types now derive from `dashboardStats` return shape).

### Estimated Complexity

| Sub-phase | Complexity | Key files |
|---|---|---|
| I-A: dashboardStats procedure | L | `routers/trades.ts` (+~200 LOC), `dashboard/page.tsx` (−900 LOC) |
| I-A: trades.list pagination | S | `routers/trades.ts` (+20 LOC), `trades/page.tsx` (+30 LOC) |
| I-B: type contract repair | M | `types/index.ts`, `dashboard/page.tsx`, 3–4 other pages |
| I-C: prop firm enforcement | M | `routers/trades.ts` (+80 LOC), `register-trade-modal.tsx` (+30 LOC) |
| **Phase I total** | **L** | **~10 files, net −600 LOC** |

### Expected Architectural Impact: Structural

The dashboard changes from a compute engine to a renderer. `dashboard/page.tsx` drops from 1746 to ~400 LOC. All analytics logic moves to the server where it can be tested, reused, and scaled independently of the client bundle. Type safety is restored across the tRPC boundary. Prop firm enforcement moves from display logic to mutation logic — the correct layer.

---

## Phase II — Dashboard Modularization
**Priority rank: 2 of 9**

### Goal

After Phase I moves analytics to the server, the dashboard page is still a single 400-LOC file with four large inline tab components. This phase extracts those tabs and their shared components into separate files, establishing the structural pattern that all other pages will follow.

### What to build

```
src/app/dashboard/
  page.tsx                    ← ~80 LOC: query + tab switcher
  tabs/
    tab-portfolio.tsx          ← KPI grid, donut, bar chart, account table
    tab-operador.tsx           ← equity hero, symbol table, session table, hour table
    tab-disciplina.tsx         ← behavioral streak, tag breakdown, rule violations
    tab-playbook.tsx           ← setup cards, session matrix, direction table
  components/
    prop-firm-rules.tsx        ← extracted from tab-portfolio
    chart-tooltip.tsx          ← shared Recharts tooltip
  hooks/
    use-dashboard-stats.ts     ← wraps trpc.trades.dashboardStats.useQuery()
                                  with memoized derived values (e.g. sorted setupStats)
```

Each tab component receives pre-computed `DashboardStats` as props. It contains only rendering logic — no `useMemo` analytics. This makes each tab independently testable with snapshot tests.

### Loading and Error States

Add `loading.tsx` to `/dashboard`:
```tsx
// Skeleton grid matching the portfolio tab layout
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
  {Array(8).fill(null).map((_, i) => <KpiCardSkeleton key={i} />)}
</div>
```

Add `error.tsx` to `/dashboard`:
```tsx
export default function DashboardError({ error, reset }) {
  return <ErrorDisplay error={error} retry={reset} />
}
```

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Tab prop interface becomes unstable as tabs grow | Low | Define `DashboardStats` type once, import everywhere |
| Component extraction introduces prop drilling depth | Low | Use `use-dashboard-stats` hook pattern, not deep prop chains |

### Dependencies

- Depends on Phase I-A (dashboardStats procedure must exist before tabs receive pre-computed data)

### Estimated Complexity

| Work item | Complexity |
|---|---|
| Extract 4 tab components | M |
| Extract shared chart components | S |
| Add loading.tsx + error.tsx | S |
| Add use-dashboard-stats hook | S |
| **Phase II total** | **M** |

~8 files created. `dashboard/page.tsx` drops to ~80 LOC.

### Expected Architectural Impact: Incremental

No logic changes — pure structural reorganization. Establishes the pattern (`page.tsx` → `tabs/` → `components/` → `hooks/`) that Phases III and beyond apply to other pages. First page in the codebase with a proper loading skeleton and error boundary.

---

# TIER 2 — MEDIUM-TERM ARCHITECTURE
**Horizon:** Months 2–5  
**Theme:** Build the skeleton the platform needs to grow into. Domain services, centralized analytics, and the psychology data model.

---

## Phase III — Domain Extraction
**Priority rank: 3 of 9**

### Goal

Move business logic out of tRPC routers into standalone, testable domain service functions. Routers become thin: they validate input (Zod), check auth (`protectedProcedure`), call a service, and serialize the response. Nothing more.

This is the prerequisite for the analytics service (Phase IV), the psychology engine (Phase V), and the AI layer (Phase VI).

### What to build

```
src/domains/
  trading/
    services/
      trade-service.ts          ← computeClosedTradePnl(), computeRMultiple()
      prop-firm-guard.ts        ← checkDailyLossLimit(), checkTradeCount(), checkSymbolAllowlist()
      account-service.ts        ← computeRunningBalance(), computeMaxDrawdown()
    types.ts                    ← TradeDomain types (not tRPC output shapes)
  learning/
    services/
      review-scheduler.ts       ← calcNextReviewAt(), computeProgressPct(), computeStatus()
      streak-service.ts         ← computeNewStreak()
      decay-detector.ts         ← detectDecayedResources()
    types.ts
  analytics/
    services/
      dashboard-analytics.ts    ← all aggregations from dashboardStats procedure
      setup-analytics.ts        ← setup win-rate, equity curve, session matrix
    types.ts
```

#### Service contract examples

```typescript
// domains/trading/services/trade-service.ts
export function computeClosedTradePnl(
  direction: "LONG" | "SHORT",
  entry: number,
  closePrice: number,
  size: number,
  commission: number,
): { rawPnl: number; netPnl: number } { ... }

export function computeRMultiple(
  netPnl: number,
  entry: number,
  stop: number,
  size: number,
): number | null { ... }

// domains/learning/services/review-scheduler.ts
export function calcNextReviewAt(
  reviewInterval: number,
  masteryLevel: 1 | 2 | 3 | 4 | 5,
): Date { ... }

export function computeProgressPct(
  currentUnits: number,
  totalUnits: number | null,
): number | null { ... }

// domains/learning/services/streak-service.ts
export function computeNewStreak(
  lastReviewDate: Date | null,
  currentStreak: number,
): { newStreak: number; lastReviewDate: Date } { ... }
```

All service functions are pure (no Prisma imports, no tRPC imports). They receive plain data, return plain data. This makes them trivially testable with Vitest.

#### Router refactor pattern

```typescript
// Before (trades.ts close procedure):
close: protectedProcedure.input(...).mutation(async ({ ctx, input }) => {
  const trade = await ctx.prisma.trade.findUniqueOrThrow(...)
  const entry   = Number(trade.entry)
  const size    = Number(trade.size)
  const rawPnl  = trade.direction === "LONG"
    ? (input.closePrice - entry) * size
    : (entry - input.closePrice) * size
  const risk      = Math.abs(entry - Number(trade.stop)) * size
  const rMultiple = risk > 0 ? rawPnl / risk : null
  const netPnl    = rawPnl - input.commission
  // ... update trade
})

// After (delegates to service):
close: protectedProcedure.input(...).mutation(async ({ ctx, input }) => {
  const trade = await ctx.prisma.trade.findUniqueOrThrow(...)
  const { netPnl } = computeClosedTradePnl(
    trade.direction as "LONG" | "SHORT",
    Number(trade.entry), input.closePrice, Number(trade.size), input.commission
  )
  const rMultiple = computeRMultiple(netPnl, Number(trade.entry), Number(trade.stop), Number(trade.size))
  // ... update trade
})
```

### Test coverage as part of this phase

Every extracted service must ship with tests. No service is "done" without them.

Priority test files (in order):
1. `trade-service.test.ts` — LONG/SHORT P&L, R-multiple with zero stop, commission edge cases
2. `review-scheduler.test.ts` — all 5 mastery levels × several base intervals, boundary (interval = 1)
3. `streak-service.test.ts` — consecutive, same-day, gap > 1 day, first review ever, exactly 1 day apart
4. `decay-detector.test.ts` — not decayed, exactly at 2× threshold, 1 day past threshold, null nextReviewAt
5. `prop-firm-guard.test.ts` — daily loss at limit, daily loss over limit, trade count at limit, symbol not in list, empty allowedSymbols (no filter)
6. `dashboard-analytics.test.ts` — equity curve monotonicity, session grouping, setup win rate edge cases

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Service extraction reveals hidden coupling (service needs Prisma) | Medium | If a service needs DB access, make it a repository function, not a pure service |
| Thinning routers reveals procedures that are actually repositories (no logic) | Low | Those procedures are fine as-is; don't extract what doesn't need extracting |
| Parallel work on routers while services are being built causes merge conflicts | Medium | Extract services first, then update routers in a single pass |

### Dependencies

- Phase I-C must be complete (prop-firm-guard.ts is the service behind I-C enforcement)
- No external dependencies

### Estimated Complexity

| Work item | Complexity |
|---|---|
| Trading domain services + tests | M |
| Learning domain services + tests | M |
| Analytics domain service scaffolding | M |
| Router refactors to delegate to services | M |
| **Phase III total** | **L** |

~20 new files, ~30 modified files. Net LOC is roughly neutral (services gain, routers lose).

### Expected Architectural Impact: Transformative

This is the highest-impact phase in the medium term. Once services exist:
- Every formula is testable without a running DB or Next.js server
- The AI layer (Phase VI) can call services directly without going through tRPC
- The analytics service (Phase IV) is a natural extension of the existing service pattern
- Onboarding a new contributor is faster — services are self-documenting through their types

---

## Phase IV — Centralized Analytics
**Priority rank: 4 of 9**

### Goal

Consolidate all analytics computation into a single, queryable `AnalyticsService`. Analytics currently exist in three places simultaneously: the `trades.dashboardStats` procedure (added in Phase I), inline computations in router `stats` procedures, and client-side `useMemo` blocks that remain in non-dashboard pages. This phase unifies them.

### What to build

#### Analytics Service

```
src/domains/analytics/
  services/
    dashboard-analytics.ts    ← pure aggregation functions over Trade[]
    setup-analytics.ts        ← per-setup computations
    learning-analytics.ts     ← study time, streak, decay, resource impact
    behavior-analytics.ts     ← tag patterns, violation rates, discipline score
  types.ts                    ← all analytics return types (not tRPC shapes)
  index.ts                    ← re-exports
```

The analytics service receives domain entities (plain objects, not Prisma models) and returns analytics objects. It has no Prisma or tRPC imports. It is the single source of truth for how every metric is computed.

#### Materialized Stats Table (Optional — for scale)

For users with 1000+ trades, even a single server-side query over all trades becomes slow. The optional second step is a `trade_stats_cache` table:

```sql
CREATE TABLE trade_stats_cache (
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id     UUID REFERENCES accounts(id) ON DELETE CASCADE,
  period         TEXT NOT NULL,    -- 'all' | '2026-W20' | '2026-05'
  stats_json     JSONB NOT NULL,
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, account_id, period)
);
```

Cache is invalidated on `trades.close`, `trades.create`, `trades.delete`. Computed lazily on next `dashboardStats` call if stale. This brings analytics latency to O(1) for cached periods regardless of trade count.

**Decision: implement the service first, add the cache only when P99 latency exceeds 500ms.**

#### Historical Aggregates for Charts

Replace "last 90 days only" workaround with period-selectable aggregates:

```typescript
type Period = "1M" | "3M" | "6M" | "1Y" | "ALL"

// trpc.trades.equityCurve({ accountId, period }) → { date, balance }[]
// trpc.trades.pnlByDate({ accountId, period })   → { date, pnl }[]
```

Callers request the period they need. Server aggregates at the requested grain (daily for 1M/3M, weekly for 6M/1Y, monthly for ALL).

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Different pages computing "the same metric" slightly differently (expectancy in R vs. $) | High | Document each metric's definition in `analytics/types.ts`; break ties explicitly |
| Materialized cache becomes stale after edge function mutations (email logs, decay) | Low | Edge functions write directly to DB; invalidate cache on any write to `trades` or `learning_resources` |
| Analytics service grows into a god class | Medium | Keep per-domain analytics services separate; compose in `index.ts` only |

### Dependencies

- Phase III (services must exist before the analytics layer can compose them)

### Estimated Complexity

| Work item | Complexity |
|---|---|
| Analytics service (pure functions) | M |
| Router integration (replace inline stats) | M |
| Period-selectable chart data | M |
| Materialized cache (optional) | L |
| **Phase IV total (without cache)** | **M** |
| **Phase IV total (with cache)** | **L** |

### Expected Architectural Impact: Structural

A single question — "what is the win rate for setup X in Q1?" — now has a single code path. The AI layer in Phase VI queries the analytics service directly with a time range. The dashboard, the weekly review page, and future mobile clients all consume the same numbers.

---

## Phase V — Psychology Systems
**Priority rank: 5 of 9**

### Goal

Complete the behavioral feedback loop. The platform's core claim is that it is an "active coach" — it must produce quantified behavioral data automatically, not rely on the trader to manually enter discipline scores.

### What to build

This phase has four components, each independently deployable.

#### V-A: Rule Violation Auto-counting

**Schema change (migration):**
```sql
-- Replace violationsThisMonth (static counter) with computed view
CREATE VIEW rule_violation_summary AS
SELECT 
  r.id as rule_id,
  r.user_id,
  COUNT(*) FILTER (
    WHERE t.date >= date_trunc('month', NOW())
    AND (t.tags && ARRAY['Impulsivo', 'Off-plan', 'Revanche'])
  ) as violations_this_month
FROM rules r
LEFT JOIN trades t ON t.user_id = r.user_id
GROUP BY r.id, r.user_id;
```

Alternative without a view: add `ruleViolationSummary` to `trades.stats` procedure. Computed on-demand from trade tags. No schema change required.

**Client change:** `TabDisciplina` shows per-rule violation counts from the summary, not from the static field.

#### V-B: Computed Discipline Score

Replace manual `WeeklyReview.disciplineScore` entry with a pre-computed suggestion:

```typescript
function computeDisciplineScore(
  trades:           Trade[],           // trades in the week
  resourceReviews:  ResourceReview[], // reviews done in the week
  pendingReviews:   number,           // pending at week start
  ruleViolations:   number,           // count of behavioral tags this week
  enabledRules:     number,           // total enabled rules
): { score: number; breakdown: { execution: number; learning: number; adherence: number } }

// Formula:
// execution  = (trades without behavioral tags / total trades).clamp(0,1) × 50
// learning   = (reviews done / pending).clamp(0,1) × 30
// adherence  = (enabled rules with 0 violations / enabled rules).clamp(0,1) × 20
// score      = execution + learning + adherence (0–100)
```

Weekly review form shows the computed score + breakdown as a pre-fill. Trader can still override. The override is stored; the computed score is always recalculated and shown as context.

#### V-C: Pre-trade A+ Checklist Tracking

**Schema change:**
```sql
CREATE TABLE trade_checklist_results (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  trade_id   UUID REFERENCES trades(id) ON DELETE CASCADE,
  setup_id   UUID REFERENCES setups(id) ON DELETE SET NULL,
  items_checked TEXT[] NOT NULL DEFAULT '{}',
  items_total   INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

**UI change:** In `RegisterTradeModal`, when a setup is selected, display the setup's `aplusChecklist` items as checkboxes. On trade submission, save the checked items. `Trade` is tagged `A+` automatically if all items checked.

**Analytics:** `setupStats.aplusComplianceRate` = trades with all checklist items checked / trades with a checklist. This replaces the current A+ tag compliance proxy.

#### V-D: Session Mood Tracking

**Schema change:**
```sql
CREATE TABLE trading_sessions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  session         TEXT NOT NULL,  -- London | New York | Asia | London Close
  pre_mood        SMALLINT CHECK (pre_mood BETWEEN 1 AND 5),
  energy_level    SMALLINT CHECK (energy_level BETWEEN 1 AND 5),
  notes           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date, session)
);
```

**UI:** Optional "log session" prompt before the first trade in a session. Two sliders (mood 1–5, energy 1–5) + optional text note.

**Analytics:** Correlate `pre_mood` × `session.winRate` across the user's history. Surface in TabDisciplina: "You perform best when your mood is ≥4 (63% WR vs. 44% when mood < 3)."

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Computed discipline score feels "unfair" to traders if formula is opaque | Medium | Show the breakdown (execution/learning/adherence) next to the score |
| Pre-trade checklist adds friction and reduces trade logging speed | High | Make checklist completely optional per setup; default to unchecked = skip |
| Mood tracking dies from low adoption if prompt is intrusive | High | Surface as a low-friction button in the trade table header, not a modal |

### Dependencies

- V-A depends on Phase III (behavior-analytics.ts from domain extraction)
- V-B depends on V-A (needs violation count to compute adherence component)
- V-C depends on nothing (independent schema migration + UI change)
- V-D depends on nothing (independent schema migration + UI addition)

### Estimated Complexity

| Sub-phase | Complexity |
|---|---|
| V-A: Rule violation auto-counting | S |
| V-B: Computed discipline score | M |
| V-C: Pre-trade checklist tracking | M |
| V-D: Session mood tracking | M |
| **Phase V total** | **L** |

2 schema migrations, ~8 files changed/created.

### Expected Architectural Impact: Incremental

The domain model gains two new entities (`TradeChecklistResult`, `TradingSession`) and the `WeeklyReview.disciplineScore` moves from a manually entered number to a computed suggestion. The psychology data model is now complete enough to power the AI coach in Phase VI.

---

# TIER 3 — LONG-TERM PLATFORM EVOLUTION
**Horizon:** Months 5–15  
**Theme:** Intelligence, integration, and systematic edge development. The platform becomes proactive rather than reactive.

---

## Phase VI — AI Infrastructure
**Priority rank: 6 of 9**

### Goal

Build the data and service scaffolding that makes AI-powered features possible. The AI layer does not generate trades or make decisions — it surfaces patterns from the trader's own data that the trader cannot see themselves.

### What to build

#### VI-A: Analytics Service AI Adapter

The analytics service from Phase IV becomes the AI context provider:

```typescript
// domains/analytics/ai-context.ts
export async function buildTraderContext(
  userId: string,
  prisma: PrismaClient,
  window: { from: Date; to: Date },
): Promise<TraderContext> {
  return {
    performance:  await getPerformanceSummary(userId, prisma, window),
    behavior:     await getBehaviorSummary(userId, prisma, window),
    learning:     await getLearningSummary(userId, prisma, window),
    recentTrades: await getRecentTrades(userId, prisma, 30),
    patterns:     await detectPatterns(userId, prisma, window),
  }
}
```

This function is the RAG context for every AI query. It is deterministic, testable, and privacy-preserving — data never leaves the server.

#### VI-B: Pattern Detection Engine

Server-side engine that detects behavioral patterns from the trader's own data:

```typescript
// domains/analytics/services/pattern-detector.ts
type Pattern = {
  id:          string
  title:       string
  description: string
  confidence:  "high" | "medium" | "low"
  evidence:    string   // e.g. "23 trades over 3 months"
  actionable:  string   // e.g. "Consider stopping after 2 losses in a session"
}

function detectPatterns(userId: string, trades: Trade[]): Pattern[] {
  return [
    detectRevengeTradingPattern(trades),
    detectOversizingPattern(trades),
    detectDayOfWeakBias(trades),
    detectOvertradesAfterWinStreak(trades),
    detectSessionFatiguePattern(trades),
  ].filter(Boolean)
}
```

Patterns surface in TabDisciplina as an "Insights" section. No LLM required for this part.

#### VI-C: Claude AI Coach (RAG-powered)

A chat interface grounded in the trader's own data:

**Backend:**
```typescript
// app/api/ai-coach/route.ts
POST /api/ai-coach
{ message: string }

→ build TraderContext (VI-A)
→ construct system prompt with trader's performance data
→ call Claude API (claude-sonnet-4-6)
→ stream response back
```

**System prompt structure:**
```
You are a trading coach reviewing the performance of a specific trader.
Their data for the past 30 days:

PERFORMANCE:
- Win rate: 58%, Avg R: +0.42, Profit factor: 1.8
- 47 closed trades, net P&L: +$2,340

RECENT PATTERNS:
- You tend to oversize after losing streaks (avg size 2.1× normal after 2+ losses)
- Your Friday win rate is 34% vs. 61% on Tuesday (12-trade sample)

RECENT TRADES (last 10): [...]

PENDING REVIEWS: [...]
RULES VIOLATED THIS WEEK: [...]

The trader's question: "{message}"

Answer based only on the data provided. Do not invent numbers.
Surface patterns the data shows, not generic trading advice.
```

**Privacy model:** All context is computed server-side from the user's own DB. No data is persisted by the AI provider.

#### VI-D: Note Embeddings (semantic search)

For power users with extensive trade notes:

```
On trade close / note update:
→ embed trade notes + weekly review text
→ store in vector column (pgvector extension)

On search query:
→ embed query
→ cosine similarity search across user's own embeddings
→ return matching trades with context
```

Enables: "Find all trades where I noted I was uncertain about the entry" — without exact keyword matching.

**Prerequisites:** Supabase pgvector extension enabled. Embedding model: `text-embedding-3-small` (OpenAI) or Claude embeddings when available.

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| AI responses are generic ("make a trading plan") rather than data-driven | High | Constrain system prompt explicitly: "answer only from the data provided" |
| Trader over-relies on AI coach for trade decisions | Medium | Clear disclaimer in UI: "This is pattern analysis, not trade advice" |
| Token cost grows unbounded as trade history grows | Medium | Cap context at last 60 trades; compress older history to summaries |
| pgvector adds deployment complexity | Low | Optional feature; deploy behind a feature flag |

### Dependencies

- Phase III (services must exist for context builder to compose them)
- Phase IV (analytics service provides the quantified context)
- Phase V-B (discipline score + behavioral data enriches the context)
- External: Claude API key

### Estimated Complexity

| Sub-phase | Complexity |
|---|---|
| VI-A: Analytics AI adapter | S |
| VI-B: Pattern detection engine | M |
| VI-C: Claude AI Coach UI + API route | M |
| VI-D: Note embeddings | L |
| **Phase VI total** | **XL** |

### Expected Architectural Impact: Transformative

The analytics service is now consumed by three clients simultaneously: the tRPC dashboard, the AI coach, and the pattern engine. This validates the service layer architecture. The platform crosses from "passive journal" to "active intelligence system."

---

## Phase VII — Integrations
**Priority rank: 7 of 9**

### Goal

Reduce trade-logging friction. Manual entry is correct for reflection and intentionality, but structured data import for historical records saves hours and enables richer backtesting.

### What to build

#### VII-A: MT4/MT5 CSV Import

```
POST /api/import/mt4  (multipart/form-data, file)

1. Parse MT4 statement: Ticket, Open Time, Type (buy/sell), Size, Item, Price, S/L, T/P, Close Time, Close Price, Commission, Profit
2. Validate: check for duplicate tickets, symbol against user's markets
3. Return dry-run diff: { toCreate: Trade[], warnings: string[], skipped: number }
4. On confirm: create Trade + TradeEvent (OPEN event + CLOSE event) for each row
```

Implementation: file parsing in a pure parser function (testable). No DB access in the parser. Router calls parser, then applies the import in a transaction.

#### VII-B: Balance Reconciliation

Addresses the gap between computed balance (from trade P&L) and actual broker balance (swaps, fees, slippage not logged as trades):

```
Manual "sync balance" in cuentas page:
→ User enters actual broker balance
→ System computes variance: actualBalance − computedBalance
→ Creates AccountLog event: BALANCE_CORRECTION { variance, note }
→ Future balance computations use: computedFromTrades + corrections
```

Surfaces "unaccounted P&L" as a metric. Useful for prop firms where swap costs materially impact net P&L.

#### VII-C: Screenshot Storage

Supabase Storage integration for chart screenshots:

```
Bucket: trade-screenshots
Folder structure: {userId}/{tradeId}/{timestamp}.{ext}
Policy: authenticated reads/writes scoped to own userId prefix
```

`RegisterTradeModal` and `EditTradeModal` gain a drag-drop zone + file picker. Screenshots stored to bucket; URL appended to `Trade.screenshotUrls[]`. Trade detail panel shows thumbnails with lightbox.

#### VII-D: cTrader CSV Import

Same architecture as VII-A, different column mapping. cTrader exports include Commission and Gross Profit separately, making net P&L calculation straightforward.

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Duplicate trade detection on re-import | High | Hash (symbol + openTime + size) as idempotency key; skip on collision |
| MT4 file format varies by broker (some add custom columns) | Medium | Strict column detection; reject with clear error message instead of silent corruption |
| Supabase Storage costs for screenshot storage | Low | Enforce 5MB max per file; compress on upload |

### Dependencies

- Phase I-B (type repair needed so import parser produces correctly typed Trade objects)
- External: Supabase Storage bucket setup

### Estimated Complexity

| Sub-phase | Complexity |
|---|---|
| VII-A: MT4/MT5 CSV import | M |
| VII-B: Balance reconciliation | S |
| VII-C: Screenshot storage | M |
| VII-D: cTrader CSV import | S |
| **Phase VII total** | **L** |

### Expected Architectural Impact: Incremental

Two new API routes (`/api/import/mt4`, `/api/import/ctrader`). One new Supabase Storage bucket. No changes to core domain logic. Integrations sit at the edge of the system — they write to the DB using the existing Trade service, not directly.

---

## Phase VIII — Setup Engine
**Priority rank: 8 of 9**

### Goal

Elevate the Setup from a label attached to trades into a first-class strategic engine. A setup should have a defined edge (expected win rate, R/R range), a tracked performance history, and a lifecycle managed by data — not manual status changes.

### What to build

#### VIII-A: Setup Performance Engine (server-side)

Replace client-side setup stats computation (currently in TabPlaybook useMemo) with a dedicated server procedure:

```typescript
trpc.setups.performanceStats({ setupId?, period? }) → {
  setupId: string
  trades: number
  winRate: number
  avgR: number
  expectancyR: number
  profitFactor: number
  maxConsecutiveLosses: number
  avgHoldTime: number    // minutes
  bestSession: string    // e.g. "New York"
  bestDayOfWeek: number  // 0=Sun … 6=Sat
  equityCurve: number[]
  weeklyBreakdown: { week: string; trades: number; pnl: number; winRate: number }[]
}
```

This replaces the duplicated computation in `TabPlaybook` and the existing `learningResources.resourceImpactRanking`.

#### VIII-B: Setup Edge Definition

Allow traders to define their expected edge per setup:

```sql
ALTER TABLE setups ADD COLUMN expected_wr DECIMAL(5,2);        -- e.g. 55.00
ALTER TABLE setups ADD COLUMN expected_avg_r DECIMAL(5,3);     -- e.g. 0.800
ALTER TABLE setups ADD COLUMN min_r DECIMAL(5,3);              -- minimum acceptable R
ALTER TABLE setups ADD COLUMN max_r DECIMAL(5,3);              -- target max R
ALTER TABLE setups ADD COLUMN edge_last_updated TIMESTAMPTZ;
```

Dashboard shows: actual WR vs. expected WR. Setup card color: green if within tolerance (±5pp), amber if diverging (±5–10pp), red if far off (>10pp divergence).

#### VIII-C: Setup Lifecycle Automation

Setup status transitions based on performance data rather than manual changes:

```
Rules (configurable per user):
  If actualWR < expectedWR - 10pp for last 20+ trades → suggest PAUSADO
  If actualWR > expectedWR + 10pp for last 20+ trades → suggest reviewing edge definition
  If no trades in 30 days → suggest PAUSADO
  If 3 consecutive losses → flag "losing streak" in dashboard
```

Transitions are suggestions, not automatic. The system flags with a banner; the trader decides.

#### VIII-D: Setup Versioning

When a trader significantly changes a setup's conditions (via edit), create a version snapshot:

```sql
CREATE TABLE setup_versions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setup_id    UUID REFERENCES setups(id) ON DELETE CASCADE,
  version     INT NOT NULL,
  snapshot    JSONB NOT NULL,   -- full setup state at this point
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

Trades before version N are analyzed separately from trades after version N. Performance stats can be scoped to "current version only" vs. "all versions." This prevents old trades from a different strategy variant from polluting the current edge statistics.

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Expected WR definition is sensitive — wrong numbers mislead the trader | High | Make edge definition optional; surface as "target" not "benchmark" |
| Versioning complexity increases for simple use cases | Medium | Versioning is opt-in; only prompted when setup conditions change significantly |
| Setup lifecycle automation creates notification fatigue | Medium | Max 1 suggestion per setup per week; dismiss permanently option |

### Dependencies

- Phase III (setup-analytics.ts service)
- Phase IV (analytics service for comparison against expected edge)
- Phase V-C (checklist results feed into setup compliance metrics)

### Estimated Complexity

| Sub-phase | Complexity |
|---|---|
| VIII-A: Setup performance engine | M |
| VIII-B: Setup edge definition | S |
| VIII-C: Setup lifecycle automation | M |
| VIII-D: Setup versioning | L |
| **Phase VIII total** | **L** |

### Expected Architectural Impact: Structural

Setup transitions from a label to a quantified, versioned trading instrument. The feedback loop between learning (Phase I–V), trading (existing), and edge development (Phase VIII) is complete. This is the feature that turns the platform from a journal into a systematic trading development tool.

---

## Phase IX — Automation
**Priority rank: 9 of 9**

### Goal

Reduce the manual cognitive overhead of platform maintenance. Automate recurring tasks that currently require the trader to remember: monthly rule resets, decay notifications, weekly insight generation, and account health alerts.

### What to build

#### IX-A: Monthly Rule Reset (pg_cron)

```sql
-- Runs at 00:00 on the 1st of each month
SELECT cron.schedule(
  'reset-rule-violations',
  '0 0 1 * *',
  $$UPDATE rules SET violations_this_month = 0 WHERE true$$
);
```

Or (preferable): compute violation count on-demand from trade tags rather than maintaining a counter. Monthly reset becomes a non-issue.

#### IX-B: Decay Notifications (Edge Function)

Current decay detection: triggers when the user loads the `/aprendizaje` page. Silent until then.

New behavior: a dedicated edge function runs daily, scans all users' MASTERED resources for decay, sends a targeted email/in-app notification:

```
Subject: 3 recursos "Dominado" necesitan revisión

Tu conocimiento sobre:
- Price Action Master Class — vence hace 14 días
- Trading Psychology — vence hace 7 días  
- Risk Management for Prop Firms — vence hace 3 días

Es normal olvidar — por eso existe el repaso.
```

Idempotence: use the existing `email_log` table with type `"decay"`.

#### IX-C: Weekly Insights Generation

Extend the existing `weekly-learning-summary` edge function with a performance digest:

```
Weekly email (Mondays, existing):
+ Add section: "Tu semana de trading"
  → Trades this week: 12 | Win rate: 58% | P&L: +$340
  → Best setup: [S1] 3/3 wins
  → Pending reviews: 5 resources

+ Add section: "Patrón detectado"
  → Computed by pattern detector (Phase VI-B)
  → "Notamos que tus 3 pérdidas esta semana ocurrieron antes de las 9AM"
```

#### IX-D: Account Health Monitor

Daily check (edge function or pg_cron) for prop firm accounts:

```
For each PROP_FIRM account with status = ACTIVE:
  Compute today's drawdown
  If ddDailyPct × 0.8 < todayLoss/balance → send "ALERTA: cerca del límite diario" email
  If ddTotalPct × 0.9 < totalDrawdown/balance → send "ALERTA: cerca del límite total" email
```

This is proactive — warns the trader before they breach, not after.

#### IX-E: Automated Weekly Review Pre-fill

When a trader opens a new weekly review, pre-populate:
- `tradeCount`, `netPnl`, `winRate` from actual trades in the week
- `disciplineScore` from Phase V-B formula
- Three best-performing setups as a suggested `whatWorked` starting point
- Three setups with most violations as a suggested `toImprove` starting point

Trader still writes the narrative. Automation removes the "blank page" friction.

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Daily edge function runs for all users increases Supabase function invocations cost | Low | Fan-out only for users with email_notifications = true and active prop firm accounts |
| Weekly insight email becomes overwhelming if too much content | Medium | Gate sections behind notification preferences; user can opt out per section |
| Pre-filled weekly review creates anchoring bias | Low | Label clearly as "suggested based on data"; easy to clear and start fresh |

### Dependencies

- Phase V-B (discipline score pre-fill)
- Phase VI-B (pattern detector for insight emails)
- Phase VIII-C (setup lifecycle for health alerts)
- External: pg_cron enabled on Supabase project

### Estimated Complexity

| Sub-phase | Complexity |
|---|---|
| IX-A: Monthly rule reset | S |
| IX-B: Decay notifications | M |
| IX-C: Weekly insight email | M |
| IX-D: Account health monitor | M |
| IX-E: Weekly review pre-fill | M |
| **Phase IX total** | **L** |

### Expected Architectural Impact: Containment

No new domain boundaries. Automation extends the existing edge function pattern (idempotence via `email_log`, cron via pg_cron) to cover more trigger points. The platform becomes proactive without structural changes to the core domain.

---

# Implementation Sequence Summary

```
WEEKS 1–2
  └── Phase I-A: Dashboard analytics to server (P0)
  └── Phase I-C: Prop firm enforcement (P0, parallel)

WEEKS 2–3
  └── Phase I-B: Type contract repair (P1, depends on I-A shape)

WEEKS 3–5
  └── Phase II: Dashboard modularization (depends on I-A)

MONTHS 2–3
  └── Phase III: Domain extraction + tests (independent of II, but II makes III easier)

MONTHS 3–4
  └── Phase IV: Centralized analytics (depends on III)

MONTHS 3–4 (parallel with IV)
  └── Phase V-A/V-C: Rule violations + checklist tracking (independent schema migrations)

MONTHS 4–5
  └── Phase V-B/V-D: Discipline score + session mood (depends on V-A)

MONTHS 5–7
  └── Phase VI: AI infrastructure (depends on III, IV, V)

MONTHS 6–8
  └── Phase VII: Integrations (mostly independent, run parallel with VI)

MONTHS 7–10
  └── Phase VIII: Setup engine (depends on III, IV)

MONTHS 9–12
  └── Phase IX: Automation (depends on V, VI, VIII)
```

---

# Risk Register Across All Phases

| Risk | Phase | Severity | Mitigation |
|---|---|---|---|
| Dashboard unusable at 500+ trades | I | 🔴 Critical | Phase I-A is P0; do first |
| Type drift causes silent data bugs | I | 🟠 High | Resolve in I-B; no new casts |
| Prop firm limits silently exceeded | I | 🟠 High | Phase I-C adds server enforcement |
| Service extraction reveals hidden Prisma coupling | III | 🟡 Medium | Make repositories explicit, not hidden |
| Analytics computation diverges between server and client | IV | 🟡 Medium | Delete client useMemo after IV lands |
| AI responses not grounded in actual data | VI | 🟠 High | Strict system prompt + deterministic context |
| CSV import creates duplicate trades | VII | 🟡 Medium | Idempotency key on import |
| Automation creates notification fatigue | IX | 🟡 Medium | Per-section opt-out in preferences |
| Setup versioning complexity alienates simple users | VIII | 🟡 Medium | Optional; triggered only on explicit edit |

---

# Metrics for Measuring Architectural Progress

| Metric | Baseline (now) | After Phase II | After Phase IV | After Phase VI |
|---|---|---|---|---|
| Dashboard load time (500 trades) | ~1500ms | ~150ms | ~100ms | ~100ms |
| Largest page file (LOC) | 1746 | ~400 | ~200 | ~200 |
| Service test coverage | 0% | 0% | 80%+ | 80%+ |
| `as unknown as` cast count | 3 | 0 | 0 | 0 |
| Analytics implemented in 2+ places | 18 metrics | 4 metrics | 0 metrics | 0 metrics |
| Violations auto-counted | 0 | 0 | 0 | 100% |
| AI features | 0 | 0 | 0 | 3 |
