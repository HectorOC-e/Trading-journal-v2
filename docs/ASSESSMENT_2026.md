# Architecture Assessment — Trading Journal v2
> Deep review conducted: 2026-05-30  
> Scope: full codebase, 9 tRPC routers, 12 routes, 12 DB models, 1 edge function

---

## Executive Summary

The platform has a solid, well-reasoned domain model and delivers genuine product value — spaced repetition, prop firm tracking, multi-account analytics, and a learning-to-trading feedback loop that few competitors match. The engineering foundations (tRPC end-to-end types, immutable event trails, Supabase RLS) are correct choices.

However, four structural problems accumulate silently and will compound as data volume grows:

1. **The dashboard computes all analytics on the client using the full raw trade list.** A user with 300+ trades will experience freezes today. At 1000+ trades this becomes unusable.
2. **Four pages exceed 1000 LOC** by mixing UI state, data fetching, form logic, and domain logic in one file. Testing and iteration on any single concern requires navigating the full monolith.
3. **Business rules exist in the schema but are not enforced at the mutation boundary.** Prop firm drawdown limits, daily trade caps, and rule violation counts are tracked visually but never checked server-side.
4. **The psychology and behavior tracking system is incomplete.** Rules, discipline score, and behavioral tags exist as data structures but lack the automation that makes them valuable.

---

## Finding 1 — Dashboard: Client-Side Analytics on Unbounded Raw Data (CRITICAL)

### What is happening

`dashboard/page.tsx` (1746 LOC) calls three queries at page load:
```
trpc.trades.list.useQuery()      → ALL trades, full includes (account, setup, events)
trpc.accounts.list.useQuery()    → ALL accounts
trpc.setups.list.useQuery()      → ALL setups
```

It then computes 18+ analytics derivations entirely on the client via `useMemo`:

| Computation | Cost | Location |
|---|---|---|
| Net P&L, Win Rate, Avg R | O(n) per metric | `TabPortfolio` useMemo ×4 |
| Profit Factor | O(n) | `TabPortfolio` useMemo |
| Sharpe Ratio (full stddev) | O(n²) | `TabPortfolio` useMemo |
| Expectancy $ | O(n) | `TabPortfolio` useMemo |
| Best/worst day | O(n log n) | `TabPortfolio` useMemo |
| Trade streak | O(n) sort + scan | `TabPortfolio` useMemo |
| Donut chart allocation | O(k) accounts | `TabPortfolio` useMemo |
| Bar chart (last 15 sessions) | O(n log n) | `TabPortfolio` useMemo |
| Prop firm drawdown + daily loss | O(n) per account | `TabPortfolio` useMemo |
| Accounts with stats | O(n×k) | `TabPortfolio` useMemo |
| Equity curve per account | O(n log n) | `TabOperador` useMemo |
| P&L by symbol | O(n) | `TabOperador` useMemo |
| Optimal hour analysis | O(n) | `TabOperador` useMemo |
| Average trade duration | O(n) | `TabOperador` useMemo |
| MAE/MFE estimation | O(n) | `TabOperador` useMemo |
| Session win rate matrix | O(n×k) | `TabPlaybook` useMemo |
| Setup performance + equity curves | O(n×s) | `TabPlaybook` useMemo |
| Direction performance | O(n×s) | `TabPlaybook` useMemo |

The `trades.stats` server procedure exists but is **not used anywhere in the dashboard**. The dashboard re-implements its own parallel analytics from scratch on raw data.

### Why this is a crisis, not just debt

- A fresh user with 50 trades: fast, no problem
- A 6-month user with 300 trades: noticeable lag on tab switch
- A 1-year user with 1000+ trades: 5–10s freeze on every render cycle; mobile unusable
- Network payload: each trade has full account, setup, and events included. At 500 trades × 3 relationships, the JSON payload approaches 500KB–1MB

### The fix

Move all aggregations to the server. The dashboard should receive pre-aggregated objects, not raw arrays.

---

## Finding 2 — The `as unknown as Trade[]` Cast is a Type Lie (HIGH)

In `dashboard/page.tsx` line 1732:
```typescript
const trades = allTrades as unknown as Trade[]
```

This double-cast pattern appears because the type returned by `trpc.trades.list.useQuery()` is `SerializedTrade[]` (the router's return type), while the dashboard file defines its own local `Trade` type (lines 156–186) that doesn't match.

**Root cause:** `src/types/index.ts` and `dashboard/page.tsx` each maintain their own type definition for what a "trade" looks like. The authoritative type is `SerializedTrade` from `routers/trades.ts`, but neither the shared types nor the page use it directly.

Concrete mismatches discovered:

| Field | `types/index.ts` | `dashboard/page.tsx` local | `SerializedTrade` (actual) |
|---|---|---|---|
| `setupId` | `string` | `string \| null` | `string \| null` |
| `entry` | `number` | `number \| null` | `number` |
| `propFirmRules` | nested object | not present | not present |

**SetupStatus** in `types/index.ts` is `"ACTIVO" | "PAUSADO"` but the Prisma schema has `ACTIVO | EN_PRUEBA | PAUSADO | DESCARTADO`. This mismatch is silently widened.

**Impact:** TypeScript gives no error on the double cast, so schema changes won't produce type errors where they should.

---

## Finding 3 — Business Rules Not Enforced at Mutation Boundary (HIGH)

The schema carries rich constraints for prop firm accounts:

```
ddDailyPct      — maximum daily loss %
ddTotalPct      — maximum total drawdown %
ddWeeklyPct     — maximum weekly loss %  
maxTradesPerDay — cap on trade count per session
allowedSymbols  — whitelist of valid instruments
phase           — PHASE_1 | PHASE_2 | FUNDED
```

The `trades.create` mutation checks none of these. A user on a PROP_FIRM account can:
- Open trades on disallowed symbols → phase breach
- Continue trading after hitting daily limit → violation
- Exceed max drawdown → account LOST without system warning

The dashboard *shows* these constraints visually and turns red when breached, but that's read-only reporting after the fact, not prevention.

**Rule violation tracking is similarly inert.** `Rule.violationsThisMonth` is a counter field but nothing in the codebase increments it. Trades tagged `Impulsivo` or `Off-plan` are filtered in dashboard but don't trigger `violationsThisMonth` updates.

---

## Finding 4 — Page Monoliths: Four Files Over 1000 LOC (MEDIUM-HIGH)

| File | LOC | Embedded Modals | Embedded Business Logic |
|---|---|---|---|
| `dashboard/page.tsx` | 1746 | 0 (no modals) | 18+ analytics derivations |
| `aprendizaje/page.tsx` | 1647 | 5 modals inline | Review scheduling, decay detection |
| `cuentas/page.tsx` | 1634 | 4+ modals inline | Equity, drawdown, phase transitions |
| `reviews/page.tsx` | 1159 | 3 modals inline | Date range, discipline scoring |

Each of these files violates the single-responsibility principle at the module level. A change to any modal requires navigating the full file. Adding a test for a single form requires instantiating the entire page.

The `trades/` component directory shows the correct pattern: modals (register-trade-modal.tsx, edit-trade-modal.tsx, position-log-modal.tsx) are extracted into separate files. This pattern is not applied consistently.

---

## Finding 5 — Psychology System is a Skeleton (MEDIUM-HIGH)

The vision document describes the platform as an "active coach." The schema has the right data structures. But the behavioral feedback loop is not closed:

**What exists in schema but has no automation:**

| Field/Feature | Schema Status | Runtime Status |
|---|---|---|
| `Rule.violationsThisMonth` | ✅ exists | ❌ never incremented automatically |
| `WeeklyReview.disciplineScore` | ✅ exists | ❌ manually entered (0–100), not derived from data |
| Rule violation tag correlation | Tag `Impulsivo`/`Off-plan` exists | No link to Rule records |
| Session mood/mental state | ❌ not in schema | ❌ not in any form |
| Pre-session checklist execution | `Setup.aplusChecklist[]` exists | ❌ not tracked per trade |

**What the psychology loop needs:**

```
Trade tagged "Impulsivo" 
  → find Rules where description matches impulsive trading
  → increment Rule.violationsThisMonth for matched rules
  → surface in TabDisciplina / weekly review
  → feed disciplineScore computation

WeeklyReview.disciplineScore 
  → should be: (trades without violations / total trades) × 100
  → currently: manually typed number
```

---

## Finding 6 — Duplicate Computation Between Server Procedures (MEDIUM)

The `trades.stats` procedure and the dashboard page both compute:
- Win rate
- Net P&L
- Profit Factor
- Expectancy
- Average R

They use slightly different implementations. The server uses `calcExpectancyR()` from formulas.ts (R-multiple based). The dashboard computes expectancy in dollars with its own formula (`avgWin × winRate - avgLoss × lossRate`). Neither is wrong — they measure different things — but this is not explicit anywhere. A developer reading the code cannot tell which expectancy is the "authoritative" one.

The dashboard also computes drawdown via its own O(n log n) peak-tracking loop that is duplicated twice (once in `TabPortfolio.propAccounts` and once in `TabPortfolio.accountsWithStats`).

---

## Finding 7 — Week Key Calculation Is Not Shared (MEDIUM)

Three separate implementations of "what week is this date in":

1. `src/lib/formulas.ts: getISOWeekKey()` — ISO 8601 correct (shifts to nearest Thursday)
2. `supabase/functions/weekly-learning-summary/index.ts: isoWeekKey()` — different ISO week algorithm
3. `dashboard/page.tsx: getISOWeekKey()` — imports from formulas.ts ✓

The edge function cannot import from `src/lib/formulas.ts` (Deno runtime), so it maintains its own copy. Whether both algorithms produce the same result for week-boundary dates (Dec 30, Jan 1, etc.) has not been verified. A mismatch would cause the edge function to send an email with "last week's" data that doesn't match what the app shows the user.

---

## Finding 8 — Test Coverage is Critically Low (MEDIUM)

| Domain | Test Files | Coverage |
|---|---|---|
| Accounts router | `accounts.test.ts` | list, create, update basics |
| Withdrawals router | `withdrawals.test.ts` | list, create, status change |
| Formulas | `formulas.test.ts` | (assumed, file exists) |
| Trades router | ❌ none | P&L calc, R-multiple, close logic untested |
| Learning resources | ❌ none | Review interval, decay, streak untested |
| Dashboard analytics | ❌ none | All 18 computations untested |
| Prop firm validation | ❌ none | Drawdown logic untested |

The most financially consequential calculations — P&L, R-multiple, drawdown — have no tests. If `close` has a sign error for SHORT trades (e.g., `entry - closePrice` vs `closePrice - entry`), it produces wrong P&L silently. This is a correctness risk, not just a quality risk.

---

## Finding 9 — Zustand Is Installed but Unused (LOW)

`zustand@5.0.13` appears in package.json dependencies. Zero usage in any component. This is either planned and abandoned, or a dependency that was brought in and never used. It should be removed to reduce bundle size and dependency surface area.

---

## Finding 10 — No Error Boundaries or Loading States (LOW-MEDIUM)

No `error.tsx` files exist in any route segment. Next.js App Router uses these for graceful error display. Currently, an unhandled error in a page component renders a blank white screen.

No `loading.tsx` files exist either. tRPC queries return `undefined` during load, and components protect against this with `?? []` fallbacks, but there's no skeleton UI or loading state communicated to the user.

---

## Positive Findings

These are worth preserving and extending:

| Pattern | Quality | Notes |
|---|---|---|
| `src/lib/formulas.ts` | ✅ Excellent | Pure functions, framework-agnostic, easy to test |
| tRPC `protectedProcedure` | ✅ Excellent | Auth enforced at the boundary |
| `TradeEvent` immutable trail | ✅ Excellent | Correct event-sourcing pattern for trade lifecycle |
| `AccountLog` audit trail | ✅ Excellent | Append-only, typed events |
| Supabase RLS on all tables | ✅ Excellent | Defense in depth |
| Spaced repetition scheduling | ✅ Good | `calcNextReviewAt()` with mastery scaling is correct |
| Materialized streak | ✅ Good | O(1) read, atomic update in transaction |
| Email idempotence | ✅ Good | Insert-first deduplication via unique constraint |
| `resource-drawer.tsx` extraction | ✅ Good | Shows the component extraction pattern |
| `components/trades/` folder | ✅ Good | Modals extracted per responsibility |
| `serializeTrade()` / `serializeAccount()` | ✅ Good | Decimal → number at router boundary |

---

## Risk Register

| Risk | Likelihood | Impact | Current Mitigation |
|---|---|---|---|
| Dashboard unusable at 500+ trades | High | High | None |
| Wrong P&L on SHORT trade close | Low | High | None (no test) |
| Prop firm account violates limits silently | Medium | High | Visual warning only |
| Week key mismatch between app and email | Low | Medium | None |
| Schema/type drift causes runtime cast failures | Medium | Medium | `as unknown as` suppresses errors |
| Rule violations never counted | High | Medium | Not implemented |
| Single render error blanks page | Medium | Medium | No error boundaries |

---

## Priority Action Summary

### P0 — Must fix before data volume grows

1. Move dashboard analytics to server-side aggregated procedures
2. Add pagination to `trades.list` (cursor-based, 50/page)
3. Enforce prop firm constraints in `trades.create`

### P1 — Needed for product integrity

4. Fix `types/index.ts` drift — use `RouterOutputs` directly, remove local type duplicates
5. Add tests for `trades.close` (P&L, R-multiple), `calcNextReviewAt`, streak logic
6. Auto-increment `Rule.violationsThisMonth` from trade tags

### P2 — Enables future scale

7. Extract modal components from page monoliths
8. Create service layer (extracted from routers)
9. Share week key calculation via a deno-compatible utility
10. Remove zustand, add error boundaries and loading skeletons

### P3 — AI and integration readiness

11. Analytics service isolated from transport
12. Psychology schema: add session mood, pre-trade checklist tracking
13. CSV import pipeline
14. AI coach prototype
