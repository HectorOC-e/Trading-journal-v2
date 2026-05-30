# Roadmap — Trading Journal v2

> Last updated: 2026-05-30  
> Grounded in: ASSESSMENT_2026.md deep analysis

---

## Phase 0 — Foundation & Security ✅ Complete

All critical RLS, auth, and data-correctness issues resolved.

---

## Phase 1 — Learning System ✅ Complete

Spaced repetition, decay detection, materialized streak, email idempotence, list view. See LEARNING_TASKS_V2.md.

---

## Phase 2 — Scalability & Data Integrity (NOW)

**Goal:** Prevent the three failure modes that become critical within 6 months of real usage.

### 2A — Dashboard Analytics to Server (P0 — Scalability Crisis)

**Problem:** Dashboard fetches all trades and computes 18+ metrics client-side. Degrades quadratically with trade count.

**Solution:** Create server-side aggregated procedures. Dashboard receives computed objects, not raw arrays.

**New tRPC procedure: `trades.dashboardStats`**
Input: `{ accountId?, from?, to? }`  
Returns a single object:
```typescript
{
  kpis: {
    total, wins, losses, be,
    winRate, avgR, netPnl, pnlMonth, pnlToday,
    expectancyR, expectancyDollar,
    profitFactor, sharpeRatio,
    bestDay: { date, pnl }, worstDay: { date, pnl },
    tradeStreak: { count, isWin }
  },
  equityCurve: { date, balance }[],            // pre-sorted, no raw trade data
  pnlByDate: { date, pnl, accountId }[],        // last 90 days (not all time)
  pnlBySymbol: { symbol, pnl, trades, winRate }[], // top 10
  sessionStats: { session, trades, wins, winRate, avgR }[],
  hourStats: { hour, trades, wins, winRate, avgR }[],
  setupStats: { setupId, name, abbr, color, trades, wins, winRate, avgR, cumR, netPnl, equityCurve }[],
  sessionMatrix: { setupId, session, trades, winRate }[],
  directionStats: { setupId, longCount, longWr, longAvgR, shortCount, shortWr, shortAvgR }[],
  propFirmStatus: { accountId, name, ddPctUsed, dailyLossPct, tradesUsed, tradesMax, status }[]
}
```

Dashboard page becomes a thin consumer of this single pre-aggregated query.

**Trade list pagination:**
Add cursor-based pagination to `trades.list`: `{ limit: 50, cursor?: string }`.  
Dashboard does not use `trades.list` at all — it uses `dashboardStats`.  
The `/trades` page uses paginated `trades.list` for the trade table.

### 2B — Prop Firm Enforcement at Mutation Boundary (P0 — Data Integrity)

**Problem:** `trades.create` has no server-side validation of prop firm constraints.

**Solution:** In `trades.create`, before persisting:
1. Fetch account's `ddDailyPct`, `ddTotalPct`, `maxTradesPerDay`, `allowedSymbols`
2. Compute today's P&L from existing closed trades on this account
3. Check: today's P&L / initialBalance × 100 < ddDailyPct (reject if over limit)
4. Check: today's trade count < maxTradesPerDay (reject if at or over limit)
5. Check: symbol is in allowedSymbols (reject if not in whitelist)
6. Optionally: check total drawdown against ddTotalPct, trigger account STATUS→INACTIVE if breached

Return structured error on violation: `{ code: "PROP_FIRM_VIOLATION", rule: "daily_loss", limit: 2.0, current: 2.1 }`.

### 2C — Type System Repair (P1 — Correctness)

**Problem:** `types/index.ts` drifts from the schema. Local type duplicates in dashboard cause `as unknown as` casts.

**Solution:**
1. Delete type definitions from `types/index.ts` that duplicate tRPC output types
2. Replace local `Trade`, `Account`, `Setup` types in page files with `RouterOutputs["trades"]["list"][number]`
3. Keep in `types/index.ts`: only UI-only enums and prop types for pure presentational components
4. Fix `SetupStatus` to include `EN_PRUEBA | DESCARTADO`

### 2D — Rule Violation Auto-counting (P1 — Product Integrity)

**Problem:** `Rule.violationsThisMonth` is never incremented. The discipline system has no data.

**Solution:**
In `trades.create` and `trades.update`, when a trade has tags `["Impulsivo", "Off-plan", "Revanche"]`:
1. Find rules with `severity = "CRÍTICA"` that have `isSystem = true` and correspond to behavioral violations
2. Increment `violationsThisMonth` on matched rules
3. Reset `violationsThisMonth` on the first call of each calendar month (or via a monthly cron)

Alternative: simpler approach — store `violationsThisMonth` as a computed query rather than a materialized field. Less complexity, same UX outcome.

### 2E — Test Coverage for Critical Paths (P1 — Quality)

Priority test files to add:
1. `trades-close.test.ts` — P&L and R-multiple for LONG and SHORT, with and without commission
2. `trades-add-event.test.ts` — SCALE_IN avg entry recalculation, PARTIAL_CLOSE size reduction
3. `calc-next-review.test.ts` — all 5 mastery levels, boundary intervals
4. `streak-computation.test.ts` — consecutive day, same day, gap > 1 day, first review
5. `prop-firm-rules.test.ts` — daily loss limit, trade count limit, symbol whitelist

---

## Phase 3 — Page Architecture & Psychology System (Q3 2026)

### 3A — Page Component Extraction

Extract embedded modals from monolithic page files. Target: every page under 200 LOC.

**Priority order:**
1. `/aprendizaje/page.tsx` (5 embedded modals)
2. `/cuentas/page.tsx` (4 embedded modals, account creation complexity)
3. `/reviews/page.tsx` (3 embedded modals + date logic)
4. `/dashboard/page.tsx` (no modals, but 4 tab components need extraction)

**Pattern (already demonstrated in `/trades`):**
```
src/app/aprendizaje/
  page.tsx                        ← ~150 LOC: data queries + tab routing
  modals/
    add-resource-modal.tsx
    session-review-modal.tsx
    impact-modal.tsx
    link-setup-modal.tsx
  hooks/
    use-resource-state.ts         ← modal open/close state management
```

### 3B — Psychology System Completion

**What needs to be built:**

**Session pre-trade checklist tracking:**
- Add `TradeChecklist` record: `{ tradeId, setupId, checklistType (aplus|standard), itemsChecked: string[], completedAt }`
- Surface A+ checklist in `register-trade-modal.tsx` when a setup is selected
- Track checklist completion rate per setup in dashboard

**Discipline score computation:**
Replace manual entry in weekly review with computed score:
```
disciplineScore = 
  (trades without behavioral tags / total trades) × 50   ← execution quality
  + (resources reviewed that week / pending reviews) × 30  ← learning adherence  
  + (rules with 0 violations / total enabled rules) × 20  ← rule adherence
```

**Mood/mental state per session:**
Add `TradeSession` entity (optional, not blocking):
```
{ userId, date, session, preSessionMood, preSessionNotes, energyLevel }
```
Link trades to sessions. Surface mood vs performance correlation.

### 3C — Service Layer Extraction

Move business logic out of tRPC procedures into domain service functions:

| Service | Extracted From | Functions |
|---|---|---|
| `ReviewScheduler` | `learning-resources.ts` | `calcNextReviewAt()`, `computeStatus()`, `computeProgressPct()` |
| `StreakService` | `createReview` mutation | `computeNewStreak()` |
| `DecayDetector` | `stats` procedure | `detectDecayedResources()` |
| `TradeService` | `trades.ts` | `computeClosedTradePnl()`, `computeRMultiple()` |
| `PropFirmGuard` | (new) | `checkDailyLossLimit()`, `checkTradeCountLimit()`, `checkSymbolAllowlist()` |
| `DashboardAnalytics` | `dashboard/page.tsx` | All 18 metric computations |

Services are pure functions or thin wrappers over Prisma — no tRPC coupling.

---

## Phase 4 — Integrations (Q4 2026)

### 4A — Trade Import (CSV)

**MT4/MT5 History Export:**
- Parse statement CSV: symbol, type (buy/sell), entry, close, SL, TP, lots, open time, close time, profit
- Map to Trade + TradeEvent records
- Dry-run mode showing a diff before committing
- `POST /api/import/mt4` — server-side file processing, not in tRPC

**cTrader History:**
- Similar pattern, different column names

**Generic CSV template:**
- Downloadable template; user fills it in from any broker

### 4B — Screenshot Attachments

- Supabase Storage bucket for chart screenshots
- Upload from RegisterTradeModal (drag-drop + file picker)
- Screenshot associated with Trade.screenshotUrls (already in schema)
- Lightbox display in trade detail panel

### 4C — Account Balance Auto-sync

- Manual "sync balance" button that prompts user to enter current balance
- System computes variance: actual balance − computed balance from trades
- Creates `AccountLog` event: `BALANCE_CORRECTION` with variance amount
- Surfaces unexplained P&L (slippage, swap, fees) as a separate metric

---

## Phase 5 — Analytics Intelligence (2027)

### 5A — Behavioral Pattern Detection

Server-side pattern engine that runs on each weekly review creation:
- "Your last 3 losses came after a win streak of 3+" (revenge trading detection)
- "You oversize on Mondays vs. your weekly average" (day-of-week sizing pattern)
- "Your win rate is 15pp lower on days you trade before 8AM" (fatigue correlation)

Patterns are surfaced in the weekly review as AI-generated insights.

### 5B — Setup–Learning Correlation (resourceImpactRanking)

Already prototyped in LEARNING_TASKS_V2. Productionize:
- Dedicated dashboard widget showing top 5 resources by setup win-rate delta
- Historical tracking: resource impact score over time
- "This resource improved your [Setup X] win rate by +8pp" in learning resource detail

### 5C — AI Coach (Claude API)

Chat interface over the trader's own data:
- RAG context: last 30 trades, weekly review, pending reviews, rule violations
- Query examples: "Why did I lose last week?", "What's my best time to trade?", "Am I improving?"
- Powered by Claude API (claude-sonnet-4-6 or newer, configurable)
- Privacy-first: data never leaves the user's Supabase instance

### 5D — Embeddings for Journal Notes

- Embed trade notes and weekly review text
- Semantic search: "Find all trades where I noted X" (without knowing exact words)
- Cluster by sentiment: confident, uncertain, anxious, focused
- Feed sentiment score into disciplineScore computation

---

## Explicit Non-Goals (Stable)

- Live broker connections or order routing
- Social features / public trade sharing
- Signal marketplace
- Algorithmic backtesting engine
- Multi-user organization management
