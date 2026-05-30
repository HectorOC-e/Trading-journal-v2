# Tasks — Trading Journal v2

> Strategic backlog grounded in ASSESSMENT_2026.md  
> Last updated: 2026-05-30

## Leyenda

| Symbol | Meaning |
|---|---|
| `[ ]` | Pending |
| `[/]` | In progress |
| `[x]` | Done |
| `[!]` | Blocked — dependency listed |

| Priority | Level |
|---|---|
| 🔴 | P0 — scalability or data-integrity risk in production |
| 🟠 | P1 — product correctness, significant quality impact |
| 🟡 | P2 — architecture improvement, enables future work |
| 🟢 | P3 — nice-to-have, low urgency |

---

## PHASE 2A — Dashboard: Server-Side Analytics

---

### TASK-DASH-001
**Priority:** 🔴 P0  
**Status:** `[ ]`

**Title:** Create `trades.dashboardStats` tRPC procedure

**Problem:** Dashboard page fetches all raw trades (no pagination) and computes 18+ metrics entirely in `useMemo` on the client. At 500 trades this is visibly slow; at 1000+ trades it becomes unusable. The page also re-implements analytics already in `trades.stats`, creating drift.

**Scope:**  
Create a single `trades.dashboardStats` procedure that returns one pre-aggregated object per account (or portfolio-wide). The procedure handles all grouping, sorting, and metric computation server-side in one DB round-trip (or two — one for trades, one for setup metadata).

**Return shape (target):**
```typescript
{
  kpis:          { total, wins, losses, winRate, avgR, netPnl, pnlMonth, pnlToday,
                   expectancyR, expectancyDollar, profitFactor, sharpeRatio,
                   bestDay, worstDay, tradeStreak }
  equityCurve:   { date: string; balance: number }[]
  pnlByDate:     { date: string; pnl: number; accountId: string }[]   // last 90d
  pnlBySymbol:   { symbol: string; pnl: number; trades: number; winRate: number }[]
  sessionStats:  { session: string; trades: number; winRate: number; avgR: number }[]
  hourStats:     { hour: number; trades: number; winRate: number; avgR: number }[]
  setupStats:    { setupId: string; name: string; abbr: string; color: string;
                   trades: number; winRate: number; avgR: number; cumR: number;
                   netPnl: number; equityCurve: number[] }[]
  sessionMatrix: { setupId: string; session: string; trades: number; winRate: number }[]
  directionStats:{ setupId: string; longCount: number; longWr: number; longAvgR: number;
                   shortCount: number; shortWr: number; shortAvgR: number }[]
  propFirmStatus:{ accountId: string; name: string; ddPctUsed: number;
                   dailyLossPct: number; tradesUsed: number; tradesMax: number;
                   status: "OK" | "ALERTA" }[]
}
```

**Notes:**
- Use `calcExpectancyR`, `calcSharpeRatio`, `calcProfitFactor` from `formulas.ts`
- `equityCurve` computed by sorting trades by date, accumulating P&L
- `pnlByDate` only last 90 days — don't ship all-time daily data to client
- `propFirmStatus` uses today's date for daily loss and trade count

**Files to create:**
- `src/server/trpc/routers/trades.ts` — add `dashboardStats` procedure

**Files to modify:**
- `src/app/dashboard/page.tsx` — consume `dashboardStats`, remove all `useMemo` analytics

---

### TASK-DASH-002
**Priority:** 🔴 P0  
**Status:** `[ ]`

**Title:** Add cursor-based pagination to `trades.list`

**Problem:** `trades.list` fetches ALL trades with full includes (account + setup + events). Each trade object is ~2KB serialized. At 500 trades this is a 1MB payload that arrives before a single row renders.

**Scope:**  
Add `{ limit?: number; cursor?: string }` input to `trades.list`. Default limit: 50. Cursor is the `id` of the last trade on the previous page (keyset pagination on `(date DESC, id DESC)`).

**Notes:**
- `/trades` page uses paginated list for the table; add "Load more" button or virtual scroll
- Dashboard NO LONGER uses `trades.list` — it uses `dashboardStats` (TASK-DASH-001)
- `/reviews` page fetches trades to compute weekly context — scope to `from`/`to` date range (already supported), not pagination needed there

---

### TASK-DASH-003
**Priority:** 🟠 P1  
**Status:** `[ ]`

**Title:** Refactor `dashboard/page.tsx` to consume `dashboardStats`

**Depends on:** TASK-DASH-001

**Scope:**  
- Remove all `useMemo` analytics computations from the 4 tab components
- Remove `trpc.trades.list.useQuery()` call from `DashboardPage`
- Replace with single `trpc.trades.dashboardStats.useQuery()` call
- Pass pre-computed data into tab components as props
- Result: `dashboard/page.tsx` drops from 1746 LOC to ~300 LOC (tab components become pure presentational)

---

### TASK-DASH-004
**Priority:** 🟡 P2  
**Status:** `[ ]`

**Title:** Extract dashboard tab components into separate files

**Depends on:** TASK-DASH-003

**Scope:**  
Split `dashboard/page.tsx` tab functions into:
```
src/app/dashboard/
  page.tsx              ← query + tab routing (~100 LOC)
  tabs/
    tab-portfolio.tsx   ← receives DashboardStats props
    tab-operador.tsx
    tab-disciplina.tsx
    tab-playbook.tsx
  components/
    prop-firm-rules.tsx ← already a named function, extract to file
    chart-tooltip.tsx
```

---

## PHASE 2B — Prop Firm Enforcement

---

### TASK-PF-001
**Priority:** 🔴 P0  
**Status:** `[ ]`

**Title:** Enforce prop firm constraints in `trades.create`

**Problem:** A PROP_FIRM account's constraints (daily loss %, max trades/day, allowed symbols) are stored in the schema but not checked when creating a trade. A user can exceed limits with no server-side rejection.

**Scope:**  
In `trades.create` mutation, after loading the account:
1. If `account.type !== "PROP_FIRM"` → skip all checks
2. Fetch today's closed trades on this account
3. Compute `todayLoss = sum(pnl) where pnl < 0 and date = today`
4. If `account.ddDailyPct` set and `|todayLoss| / account.initialBalance * 100 >= ddDailyPct` → throw `TRPCError({ code: "BAD_REQUEST", message: "PROP_FIRM_DAILY_LOSS_LIMIT" })`
5. Compute `todayTradeCount = count(trades) where date = today`
6. If `account.maxTradesPerDay` set and `todayTradeCount >= maxTradesPerDay` → throw with `"PROP_FIRM_MAX_TRADES"`
7. If `account.allowedSymbols.length > 0` and `input.symbol not in allowedSymbols` → throw with `"PROP_FIRM_SYMBOL_NOT_ALLOWED"`

**Client handling:** Show user-friendly error message from the error code, not a generic toast.

---

### TASK-PF-002
**Priority:** 🟠 P1  
**Status:** `[ ]`

**Title:** Auto-detect prop firm drawdown breach and mark account INACTIVE

**Scope:**  
At trade close time (`trades.close`), if account is PROP_FIRM:
1. Compute running P&L for all closed trades
2. If trailing drawdown exceeds `ddTotalPct` → update account `status = "INACTIVE"`, create `AccountLog` event `STATUS_CHANGE`
3. Return a structured warning in the response so the client can surface it prominently

---

## PHASE 2C — Type System Repair

---

### TASK-TYPE-001
**Priority:** 🟠 P1  
**Status:** `[ ]`

**Title:** Eliminate `as unknown as Trade[]` in dashboard

**Problem:** `dashboard/page.tsx` defines a local `Trade` type that diverges from `SerializedTrade`. The cast hides type mismatches silently.

**Scope:**  
1. Replace `types/index.ts` `Trade`, `Account`, `Setup` interfaces with `RouterOutputs`-derived types
2. Update `dashboard/page.tsx` to use `RouterOutputs["trades"]["list"][number]` directly (or after TASK-DASH-001, the `dashboardStats` return type)
3. Fix `SetupStatus` in `types/index.ts` to include `EN_PRUEBA | DESCARTADO`
4. Remove local type definitions duplicated across page files

**Note:** This will surface previously hidden type errors. Fix them properly — don't re-introduce casts.

---

### TASK-TYPE-002
**Priority:** 🟡 P2  
**Status:** `[ ]`

**Title:** Type `AccountLog.payload` field

**Problem:** `AccountLog.payload` is `Json {}` — untyped. Payloads differ by event type (WITHDRAWAL has `{ amount, currency }`; PHASE_CHANGE has `{ from, to }`) but there's no TypeScript enforcement.

**Scope:**  
Define a discriminated union type:
```typescript
type AccountLogPayload =
  | { event: "CREATED";       initialBalance: number; currency: string }
  | { event: "PHASE_CHANGE";  from: string; to: string }
  | { event: "WITHDRAWAL";    amount: number; currency: string; reference?: string }
  | { event: "STATUS_CHANGE"; from: string; to: string; note: string }
  | { event: "NOTE";          text: string }
```
Use when creating AccountLog entries; use in rendering to get safe field access.

---

## PHASE 2D — Rule Violation Tracking

---

### TASK-RULES-001
**Priority:** 🟠 P1  
**Status:** `[ ]`

**Title:** Auto-increment rule violations on behavioral trades

**Problem:** `Rule.violationsThisMonth` is a counter field that is never automatically incremented. Behavioral analysis in the dashboard (TabDisciplina) counts trades by tag, but the Rule records themselves have no live data.

**Approach A (simpler, computed):** Remove `violationsThisMonth` as a stored field. Instead, add a `trades.ruleViolationStats` query that counts trades tagged with behavioral tags (`Impulsivo`, `Off-plan`, `Revanche`) grouped by month. Dashboard reads this. Rule records show system rules but violations are computed.

**Approach B (materialized, richer):** Keep the field. In `trades.create`/`trades.update`, when tags include behavioral markers, find the corresponding Rule records and increment. Add monthly reset via edge function or on-demand when month changes.

**Recommendation:** Approach A first (simpler, less wrong state), Approach B in Phase 3.

---

### TASK-RULES-002
**Priority:** 🟡 P2  
**Status:** `[ ]`

**Title:** Compute `disciplineScore` from data instead of manual entry

**Problem:** `WeeklyReview.disciplineScore` is manually entered (0–100). This makes it subjective and unreliable as a metric.

**Scope:**  
When creating or updating a weekly review, compute a suggested `disciplineScore`:
```
score = 
  (trades_without_behavioral_tags / total_trades) × 50
  + (resources_reviewed_in_week / resources_pending_review_in_week).clamp(0,1) × 30
  + (enabled_rules_with_0_violations / total_enabled_rules) × 20
```
Present as a pre-filled suggestion that the user can override. Surface the breakdown ("Execution: 40/50, Learning: 22/30, Rules: 15/20").

---

## PHASE 2E — Test Coverage

---

### TASK-TEST-001
**Priority:** 🟠 P1  
**Status:** `[ ]`

**Title:** Test `trades.close` P&L and R-multiple computation

**Critical paths to test:**
- LONG trade: `(closePrice - entry) × size - commission`
- SHORT trade: `(entry - closePrice) × size - commission`
- R-multiple LONG: `rawPnl / (|entry - stop| × size)`
- R-multiple SHORT: same formula, sign implications
- Zero stop distance: R-multiple should be null
- Commission equal to gross profit: netPnl should be 0 or negative

---

### TASK-TEST-002
**Priority:** 🟠 P1  
**Status:** `[ ]`

**Title:** Test `calcNextReviewAt` and streak computation

**Paths to test:**
- `calcNextReviewAt`: masteryLevel 1 (floor to 1 day), 2, 3, 4, 5 for various base intervals
- `computeNewStreak`: first review ever, consecutive day, same day, gap > 1 day
- Decay detection: resource with nextReviewAt < today - (interval×2), resource not yet decayed, resource with null nextReviewAt

---

### TASK-TEST-003
**Priority:** 🟠 P1  
**Status:** `[ ]`

**Title:** Test `addEvent` SCALE_IN avg entry recalculation

**Critical path:**
- SCALE_IN with price and contracts: new avg entry = weighted mean
- PARTIAL_CLOSE: size reduces correctly, never below 0
- STOP_MOVE: trade.stop updates
- TAKE_PROFIT_MOVE: trade.target updates

---

### TASK-TEST-004
**Priority:** 🟡 P2  
**Status:** `[ ]`

**Title:** Test dashboard analytics helpers (once extracted to service)

**Depends on:** Service layer extraction in Phase 3

**Paths to test:**
- Equity curve computation: correct sort order, correct P&L accumulation
- Drawdown computation: max drawdown with various P&L sequences
- Session matrix: correct grouping by session × setup

---

## PHASE 3A — Page Architecture

---

### TASK-PAGE-001
**Priority:** 🟡 P2  
**Status:** `[ ]`

**Title:** Extract modals from `/aprendizaje/page.tsx`

**Current state:** 1647 LOC with 5 modals inline.

**Target state:**
```
src/app/aprendizaje/
  page.tsx                   ← ~150 LOC
  modals/
    add-resource-modal.tsx
    session-review-modal.tsx
    impact-modal.tsx
    link-setup-modal.tsx
  hooks/
    use-resource-actions.ts  ← modal open/close state + selected resource
```

---

### TASK-PAGE-002
**Priority:** 🟡 P2  
**Status:** `[ ]`

**Title:** Extract modals from `/cuentas/page.tsx`

**Current state:** 1634 LOC.  
**Target:** Similar extraction pattern to aprendizaje.

---

### TASK-PAGE-003
**Priority:** 🟡 P2  
**Status:** `[ ]`

**Title:** Extract modals from `/reviews/page.tsx`

**Current state:** 1159 LOC.

---

## PHASE 3B — Psychology System

---

### TASK-PSY-001
**Priority:** 🟡 P2  
**Status:** `[ ]`

**Title:** A+ checklist completion tracking per trade

**Scope:**  
- Add `TradeChecklistResult` table: `{ id, tradeId, setupId, itemsChecked: string[], completedAt }`
- Show A+ checklist in `register-trade-modal` when setup is selected
- Track completion rate per setup in `setupStats` analytics

---

### TASK-PSY-002
**Priority:** 🟢 P3  
**Status:** `[ ]`

**Title:** Pre-session mood tracking

**Scope:**  
Optional: `{ date, session, mood: 1–5, energyLevel: 1–5, notes }` record per trading session.  
Correlate mood score with session win rate in TabDisciplina.

---

## PHASE 3C — Service Layer

---

### TASK-SVC-001
**Priority:** 🟡 P2  
**Status:** `[ ]`

**Title:** Extract `ReviewScheduler` from learning-resources router

**Scope:** Move `calcNextReviewAt()`, `computeProgressPct()`, `computeStatus()` to `src/domains/learning/services/review-scheduler.ts`. Write tests (TASK-TEST-002 depends on this).

---

### TASK-SVC-002
**Priority:** 🟡 P2  
**Status:** `[ ]`

**Title:** Extract `TradeService` from trades router

**Scope:** Move `computeClosedTradePnl()`, `computeRMultiple()` to `src/domains/trading/services/trade-service.ts`. Write tests (TASK-TEST-001 depends on this).

---

### TASK-SVC-003
**Priority:** 🟡 P2  
**Status:** `[ ]`

**Title:** Extract `PropFirmGuard` service

**Scope:** Move constraint validation logic from TASK-PF-001 into `src/domains/trading/services/prop-firm-guard.ts`. Pure functions over account data.

---

## PHASE 4 — Integrations

---

### TASK-INT-001
**Priority:** 🟢 P3  
**Status:** `[ ]`

**Title:** MT4/MT5 CSV trade import

**Scope:**  
`POST /api/import/mt4` endpoint that accepts file upload, parses MT4 statement format, returns dry-run diff, and on confirm creates Trade + TradeEvent records.

---

### TASK-INT-002
**Priority:** 🟢 P3  
**Status:** `[ ]`

**Title:** Trade screenshot storage (Supabase Storage)

**Scope:**  
Upload via `register-trade-modal`. `Trade.screenshotUrls[]` already in schema. Add storage bucket `trade-screenshots` with per-user folder policies.

---

## Maintenance & Housekeeping

---

### TASK-HK-001
**Priority:** 🟠 P1  
**Status:** `[ ]`

**Title:** Remove `zustand` from dependencies

**Problem:** `zustand@5.0.13` is in `package.json` but has zero usage in the codebase. Dead weight in the bundle.

**Scope:** `pnpm remove zustand` + verify build.

---

### TASK-HK-002
**Priority:** 🟡 P2  
**Status:** `[ ]`

**Title:** Add error boundaries and loading skeletons

**Scope:**  
- Add `error.tsx` to `/dashboard`, `/aprendizaje`, `/trades`, `/cuentas`
- Add `loading.tsx` skeleton UI to same routes
- No blank white screen on tRPC error

---

### TASK-HK-003
**Priority:** 🟡 P2  
**Status:** `[ ]`

**Title:** Unify week key calculation

**Problem:** `getISOWeekKey()` in formulas.ts and `isoWeekKey()` in edge function use different algorithms. A mismatch on year-boundary weeks would cause the email to reference a different week than the app shows.

**Scope:**  
- Verify both algorithms produce identical output for Dec 28–Jan 4 boundary dates
- If they differ: fix edge function to match formulas.ts (or document the intentional difference)
- Add a week-boundary test case in `formulas.test.ts`

---

### TASK-HK-004
**Priority:** 🟠 P1  
**Status:** `[ ]`

**Title:** Test `formulas.ts` edge cases

**Scope:**
- `calcExpectancyR`: all losses (no wins), all wins (no losses), zero trades, single trade
- `calcSharpeRatio`: 0 std dev (identical returns), exactly 2 trades, null for 1 trade
- `calcProfitFactor`: no losses, no wins, equal gross
- `getISOWeekKey`: Dec 30 → should be W01 of next year; Jan 1 → W52 or W01 depending on year
