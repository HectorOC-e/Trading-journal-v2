# Formula Engine — Trading Journal v2

> **Last Updated: 2026-05-31**  
> Definitive reference for every financial formula used in the application. Covers definition, mathematical expression, all current implementations, inconsistencies found, and the centralization plan.

---

## Summary of Inconsistencies Found

| Formula | Implementations | Known Inconsistency | Fix |
|---|---|---|---|
| Win Rate | 8 sites | `/trades` uses `rMultiple > 0`; dashboard uses `pnl > 0` | TASK-027 |
| Discipline Score | 3 sites | Frontend simplified vs server weighted | TASK-011 |
| Sharpe Ratio | 2 sites | Population std dev in `ai-context.ts` vs sample std dev in `formulas.ts` | TASK-027 |
| Drawdown % | 3 sites | No central function | TASK-027 |
| Max Drawdown (dollar) | 1 canonical + 1 variant | `use-account-stats.ts` tracks current-DD from ATH, not historical max | TASK-029 |
| Drawdown label | 1 | "Drawdown" label shows min daily P&L, not a drawdown metric | TASK-028 |

---

## Formula 1: Win Rate

### Definition
Percentage of closed trades that are profitable.

### Mathematical Expression
```
Win Rate = (wins / total) × 100
where: wins = count of trades where pnl > 0 (canonical)
```

### Current Implementations

| Location | Line | Criterion | Status |
|---|---|---|---|
| `src/domains/analytics/services/dashboard-analytics.ts` | 97 | `t.pnl > 0` | Canonical |
| `src/server/trpc/routers/trades.ts` | ~736 | `pnl > 0` | Consistent |
| `src/server/trpc/routers/weekly-reviews.ts` | ~205 | `pnl > 0` | Consistent |
| `src/server/trpc/routers/weekly-reviews.ts` | ~271 | `pnl > 0` | Consistent |
| `src/components/modals/create-review-modal.tsx` | ~99 | Unknown | Needs audit |
| `src/domains/analytics/services/trading-sessions.ts` | 94 | `pnl > 0` | Consistent |
| `src/server/trpc/routers/learning-resources.ts` | ~447 | Unknown | Needs audit |
| `src/app/cuentas/hooks/use-account-stats.ts` | 39 | `pnl > 0` | Consistent |
| `src/app/trades/page.tsx` | ~125 | `rMultiple > 0` | **INCONSISTENT** |

### Inconsistency Detail
`trades/page.tsx:125` uses `rMultiple > 0` as the win criterion. A trade where `pnl > 0` but `rMultiple ≤ 0` (e.g., very small winner that didn't reach 1R target) would be counted differently. In practice, the same user sees a different win rate on two screens for the same period.

### Proposed Fix
```typescript
// src/lib/trading-formulas.ts
export function isWin(trade: { pnl: number | null }): boolean {
  return (trade.pnl ?? 0) > 0
}

export function calcWinRate(wins: number, total: number): number {
  return total > 0 ? (wins / total) * 100 : 0
}
```

All 8 sites replace inline criterion with `isWin(trade)` and `calcWinRate(wins, total)`.

---

## Formula 2: Net P&L

### Definition
Sum of all closed trade P&L values after commissions.

### Mathematical Expression
```
Net P&L = Σ(pnl_i) for all closed trades
```

### Current Implementations

- Computed everywhere as `trades.reduce((s, t) => s + (t.pnl ?? 0), 0)`
- Generally inline; acceptable since it is trivial
- `WeeklyReview.netPnl` stored as a materialized field (set at review creation)

### Status: ACCEPTABLE
No inconsistencies. Trivial sum; inline is fine. No centralization required.

---

## Formula 3: Average R

### Definition
Mean R-multiple across all closed trades with a non-null rMultiple.

### Mathematical Expression
```
Avg R = Σ(rMultiple_i) / count(trades where rMultiple ≠ null)
```

### Current Implementations

| Location | Notes |
|---|---|
| `src/domains/analytics/services/dashboard-analytics.ts:104` | Inline `reduce` |
| `src/server/trpc/routers/trades.ts:~740` | Inline `reduce` |
| `src/app/cuentas/hooks/use-account-stats.ts:40` | Inline `reduce` |

### Status: FRAGMENTED
Three sites, all consistent. Could be centralized as `calcAvgR(trades)` but no known bugs.

### Proposed Addition
```typescript
// src/lib/trading-formulas.ts
export function calcAvgR(trades: { rMultiple: number | null }[]): number {
  const withR = trades.filter(t => t.rMultiple != null)
  if (withR.length === 0) return 0
  return withR.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / withR.length
}
```

---

## Formula 4: Profit Factor

### Definition
Ratio of gross winning P&L to gross losing P&L (absolute value).

### Mathematical Expression
```
Profit Factor = |Σ(pnl_i for winning trades)| / |Σ(pnl_i for losing trades)|
Special cases: 999 when no losses exist and wins > 0; 0 when no wins
```

### Current Implementations

- **Canonical:** `src/lib/formulas.ts:55` — `calcProfitFactor(grossWin, grossLoss)`
- Called from `src/domains/analytics/services/dashboard-analytics.ts`

### Status: CENTRALIZED
Single implementation. Well-tested. Edge cases handled (zero losses → 999, zero wins → 0).

---

## Formula 5: Expectancy (R-multiple)

### Definition
Expected R-multiple per trade, accounting for win rate and average win/loss sizes.

### Mathematical Expression
```
Expectancy R = WinRate × AvgWinR − LossRate × AvgLossR
where: LossRate = 1 − WinRate
AvgLossR falls back to 1.0 when no losing trades exist
```

### Current Implementations

- **Canonical:** `src/lib/formulas.ts:17` — `calcExpectancyR(trades)`
- Called from `src/domains/analytics/services/dashboard-analytics.ts`
- Only trades with non-null `rMultiple` contribute

### Status: CENTRALIZED
Single implementation. Only counts trades with recorded R-multiple (correct — avoids bias from CSV-imported trades with null rMultiple).

---

## Formula 6: Sharpe Ratio

### Definition
Mean return divided by standard deviation of returns (using R-multiples as proxy for returns).

### Mathematical Expression
```
Sharpe = μ(R) / σ(R)
where σ uses Bessel's correction (n-1 denominator) — sample std dev
Returns null when n < 2 or σ = 0
```

### Current Implementations

| Location | Std Dev Formula | Status |
|---|---|---|
| `src/lib/formulas.ts:42` — `calcSharpeRatio(rMultiples)` | **Sample** (n-1 — Bessel's correction) | **CANONICAL** |
| `src/domains/analytics/ai-context.ts:185–191` | **Population** (n — no correction) | **INCONSISTENT** |

### Inconsistency Detail
The AI coach receives a different Sharpe Ratio than the one displayed in the dashboard for the same trades. The two formulas diverge increasingly as sample size decreases. For a trader with 20 trades, the difference is ~5%. For 5 trades, it can be >20%.

### Proposed Fix
Replace the inline implementation in `ai-context.ts:185`:
```typescript
// Before (ai-context.ts:185):
const mean = rMults.reduce((a,b) => a+b, 0) / rMults.length
const std  = Math.sqrt(rMults.reduce((a,b) => a+(b-mean)**2, 0) / rMults.length)  // population
const sharpe = std > 0 ? mean / std : null

// After:
import { calcSharpeRatio } from "@/lib/formulas"
const sharpe = calcSharpeRatio(rMults)
```

---

## Formula 7: Max Drawdown (Dollar)

### Definition
Maximum peak-to-trough decline in cumulative P&L over the trade history.

### Mathematical Expression
```
MaxDD = max(peak_i - cum_i) for all i in trade sequence
where cum_i = Σ(pnl_j) for j ≤ i
      peak_i = max(cum_j) for j ≤ i
```

### Current Implementations

| Location | Formula | Status |
|---|---|---|
| `src/domains/trading/services/account-service.ts:1–10` | Peak-to-trough on cumulative P&L | **CANONICAL** |
| `src/domains/analytics/services/dashboard-analytics.ts:192` | Calls `computeMaxDrawdown`, divides by `initBal` | Correct |
| `src/app/cuentas/hooks/use-account-stats.ts:50` | Tracks current DD from ATH (resets) | **VARIANT — misleading** |
| `src/server/trpc/routers/trades.ts:636–648` | Calls `computeMaxDrawdown` for auto-deactivation | Correct |

### Canonical Implementation
```typescript
// src/domains/trading/services/account-service.ts:1–10
export function computeMaxDrawdown(pnlSequence: number[]): number {
  let cum = 0, peak = 0, maxDd = 0
  for (const pnl of pnlSequence) {
    cum += pnl
    if (cum > peak) peak = cum
    const dd = peak - cum
    if (dd > maxDd) maxDd = dd
  }
  return maxDd
}
```

**Verdict: CORRECT.** This is the industry-standard Maximum Drawdown algorithm.

### Inconsistency in `use-account-stats.ts:50`
Computes **current drawdown from all-time high** (resets to zero after a new equity high). This means:
- A trader who had a -$5,000 drawdown then made back all losses sees "0% drawdown"
- Historical worst drawdown is invisible in the account card
- Prop-firm traders relying on this for risk management see misleading data

**Fix (TASK-029):** Replace with `computeMaxDrawdown`. If current-DD is also desired, label it explicitly as "Drawdown actual desde ATH" separate from max drawdown.

### Drawdown % Formula
```
Drawdown % = computeMaxDrawdown(pnlSequence) / initialBalance × 100
```
Applied correctly in `dashboard-analytics.ts:192` and `trades.ts:648`.

### KPI Label Bug
`src/app/trades/page.tsx:131–170` — the "Drawdown" KPI is labeled "peor día" and actually shows `minDay` = minimum single-day P&L sum. This is **not a drawdown metric**. Fix: rename to "Peor día" (TASK-028).

---

## Formula 8: Discipline Score

### Definition
Composite behavioral score (0–100) measuring execution quality, learning adherence, and rule compliance.

### Mathematical Expression
```
Discipline Score =
  (trades without behavioral violation tags / total trades)    × 50   ← execution quality
  + (resources reviewed that week / pending reviews due)       × 30   ← learning adherence
  + (rules with 0 violations / total enabled rules)            × 20   ← rule adherence

Score range: 0–100
```

### Current Implementations

| Location | Formula | Status |
|---|---|---|
| `src/server/trpc/routers/weekly-reviews.ts:computedDisciplineScore` | Full weighted 50+30+20 | **SERVER CANONICAL** |
| `src/server/trpc/routers/weekly-reviews.ts:prefill` | Same formula (duplicated inline) | **DUPLICATE** |
| `src/components/modals/create-review-modal.tsx:103` | Simplified: `disciplinedCount / total * 100` | **INCONSISTENT** |

### Inconsistency Detail
The frontend modal uses `disciplinedCount / total * 100` — this only considers trade-level execution, ignoring the learning (30%) and rule adherence (20%) components. A trader who completed all reviews and broke no rules would see 100% in the modal preview but a server-computed score of, e.g., 70% if execution was weak.

### Proposed Fix
```typescript
// src/lib/trading-formulas.ts
export type DisciplineParams = {
  totalTrades:        number
  taggedViolations:   number  // trades with behavioral tags
  pendingReviews:     number
  completedReviews:   number
  totalEnabledRules:  number
  violatedRules:      number
}

export type DisciplineBreakdown = {
  score:          number   // 0–100
  executionScore: number   // 0–50
  learningScore:  number   // 0–30
  adherenceScore: number   // 0–20
}

export function calcDisciplineScore(params: DisciplineParams): DisciplineBreakdown {
  const { totalTrades, taggedViolations, pendingReviews, completedReviews, totalEnabledRules, violatedRules } = params
  const executionScore = totalTrades > 0
    ? ((totalTrades - taggedViolations) / totalTrades) * 50 : 50
  const learningScore = pendingReviews > 0
    ? (completedReviews / pendingReviews) * 30 : 30
  const adherenceScore = totalEnabledRules > 0
    ? ((totalEnabledRules - violatedRules) / totalEnabledRules) * 20 : 20
  const score = Math.round(executionScore + learningScore + adherenceScore)
  return { score, executionScore, learningScore, adherenceScore }
}
```

Frontend modal calls server `prefill` procedure before showing; displays server-provided score. No local computation.

---

## Formula 9: Execution Score

### Definition
Fraction of discipline score attributed to trade execution quality (no behavioral tags).

### Mathematical Expression
```
Execution Score = (trades without violation tags / total trades) × 50
Violation tags: Off-plan, Impulsivo, FOMO, Revenge, Overtrading
```

### Status
Part of discipline score calculation. Same fragmentation issue as discipline score.

---

## Formula 10: Adherence Score (Rule Compliance)

### Definition
Fraction of discipline score attributed to rule compliance.

### Mathematical Expression
```
Adherence Score = (enabled rules with 0 violations / total enabled rules) × 20
```

### Status
Part of discipline score. `Rule.violationsThisMonth` tracked in schema but **never auto-incremented** — rule violations are inferred from trade tags as a proxy. The adherence component is approximate.

---

## Formula 11: Streak Metrics

### Definition
Consecutive days with at least one learning resource review. Not a trading streak.

### Mathematical Expression
```
streak_today = streak_yesterday + 1  if reviewed today
               1                     if yesterday had no review (gap > 1 day)
               streak_yesterday      if already reviewed today (same-day idempotent)

bestStreak = max(currentStreak across all time)
```

### Current Implementation

Materialized on `User` model: `currentStreak`, `bestStreak`, `lastReviewDate`.

Updated atomically in `createReview` mutation transaction — `src/domains/learning/streak-service.ts`.

### Status: CENTRALIZED AND CORRECT
Single implementation. ADR-004. O(1) lookup. Same-day idempotent. Gap > 1 day resets to 1.

---

## Formula 12: R-Multiple Calculation

### Definition
Trade result expressed as multiples of initial risk.

### Mathematical Expression
```
R-multiple (LONG) = (closePrice - entry) / (entry - stop)
R-multiple (SHORT) = (entry - closePrice) / (stop - entry)
= (closePrice - entry) / (entry - stop)   ← same formula: negated if direction flips sign

More precisely:
rMultiple = (closePrice - entry) / |entry - stop|
            × (+1 if LONG, -1 if SHORT) if using signed stop distance
```

### Current Implementations

| Location | Status |
|---|---|
| `src/domains/trading/services/trade-service.ts` | Computed on trade close |
| `src/app/api/import/mt4/route.ts` | **MISSING — `rMultiple: null` for all imports** (TD-007, TASK-004) |

### Import Fix Required
```typescript
// src/app/api/import/mt4/route.ts
const entryPrice  = parseFloat(row.entry)
const stopPrice   = parseFloat(row.stop)
const closePrice  = parseFloat(row.close)
const direction   = row.type.toLowerCase() === "buy" ? "LONG" : "SHORT"

const riskDistance = Math.abs(entryPrice - stopPrice)
const rMultiple = riskDistance > 0
  ? (direction === "LONG"
      ? (closePrice - entryPrice) / riskDistance
      : (entryPrice - closePrice) / riskDistance)
  : null
```

---

## Centralization Plan

### Target: `src/lib/trading-formulas.ts`

```typescript
// Export list for proposed lib/trading-formulas.ts

// Re-exports from existing lib/formulas.ts (no change needed):
export { calcSharpeRatio, calcProfitFactor, calcExpectancyR, getISOWeekKey } from "./formulas"

// New exports:
export function isWin(trade: { pnl: number | null }): boolean
export function calcWinRate(wins: number, total: number): number
export function calcAvgR(trades: { rMultiple: number | null }[]): number
export function calcDrawdownPct(maxDdDollar: number, initBal: number): number
export function calcDisciplineScore(params: DisciplineParams): DisciplineBreakdown

// Types:
export type DisciplineParams
export type DisciplineBreakdown
```

### Migration Steps (TASK-027)

1. Create `src/lib/trading-formulas.ts` with re-exports + new functions
2. Fix `ai-context.ts:185` — replace inline Sharpe with `calcSharpeRatio` import
3. Fix win rate sites:
   - `dashboard-analytics.ts:97` — use `isWin` helper
   - `trades.ts:736` — use `calcWinRate`
   - `weekly-reviews.ts:205` — use `calcWinRate`
   - `weekly-reviews.ts:271` — use `calcWinRate`
   - `create-review-modal.tsx:99` — use `calcWinRate`
   - `trading-sessions.ts:94` — use `isWin`
   - `learning-resources.ts:447` — use `calcWinRate`
   - `use-account-stats.ts:39` — use `calcWinRate`
   - `trades/page.tsx:125` — fix `rMultiple > 0` to `isWin(trade)`
4. Fix discipline score sites (TASK-011):
   - Remove from `create-review-modal.tsx:103`
   - Deduplicate `prefill` in `weekly-reviews.ts`
   - Use `calcDisciplineScore` everywhere
5. Add `calcDrawdownPct` and use it in `dashboard-analytics.ts:192`, `use-account-stats.ts`, `trades.ts:648`
6. Update unit tests to cover all new exports

---

## Formula Test Coverage Plan

### Priority 1 — Fix correctness bugs

| Test File | Formula | Key Scenarios |
|---|---|---|
| `__tests__/formulas/win-rate.test.ts` | `isWin`, `calcWinRate` | pnl > 0 = win; pnl = 0 = loss; rMultiple > 0 but pnl < 0; empty set |
| `__tests__/formulas/discipline-score.test.ts` | `calcDisciplineScore` | Perfect score; zero trades; all violations; mixed; rounding |
| `__tests__/formulas/drawdown.test.ts` | `computeMaxDrawdown`, `calcDrawdownPct` | No trades; monotonic gain; monotonic loss; recovery to new ATH; multiple drawdowns |

### Priority 2 — Regression tests for existing functions

| Test File | Formula | Key Scenarios |
|---|---|---|
| `__tests__/formulas/sharpe.test.ts` | `calcSharpeRatio` | n < 2 = null; all same = null; positive returns; negative mean |
| `__tests__/formulas/expectancy.test.ts` | `calcExpectancyR` | No R data; only wins; only losses; mixed |
| `__tests__/formulas/profit-factor.test.ts` | `calcProfitFactor` | No losses; no wins; balanced |

### Priority 3 — Import correctness

| Test File | Formula | Key Scenarios |
|---|---|---|
| `__tests__/import/r-multiple.test.ts` | R-multiple on CSV import | LONG profitable; SHORT profitable; LONG loss; zero risk distance |

---

## Financial Correctness Analysis

### Drawdown Formula — VERDICT: CORRECT
`computeMaxDrawdown` in `account-service.ts` is the industry-standard peak-to-trough MDD on the cumulative P&L curve. Correct algorithm.

**Issue:** `use-account-stats.ts:50` computes a different metric (current DD from ATH, not max DD). This is misleading when labeled as "drawdown."

### Win Rate Definition — VERDICT: MOSTLY CORRECT, ONE BUG
Canonical criterion `pnl > 0` is correct. The `trades/page.tsx` deviation to `rMultiple > 0` is a bug. A trade can be cash-positive but have a negative R-multiple if the actual risk taken was larger than the planned SL.

### Sharpe Ratio — VERDICT: FORMULA CORRECT, DUPLICATION BUG
`lib/formulas.ts:42` uses sample std dev (Bessel's correction) — correct for small trade samples. The duplicate in `ai-context.ts` uses population std dev — results diverge by a factor of `sqrt(n/(n-1))`. For n=10 trades this is ~5%; for n=5 it is ~12%.

### Expectancy R — VERDICT: CORRECT
`calcExpectancyR` only counts trades with non-null rMultiple, correctly avoiding bias from CSV-imported trades. AvgLossR defaults to 1.0 when no losses exist — conservative and documented.

### Profit Factor — VERDICT: CORRECT
Edge case handling (999 when no losses, 0 when no wins) is the industry standard and clearly documented.

### Discipline Score — VERDICT: FORMULA SOUND, IMPLEMENTATION FRAGMENTED
The three-component weighted formula (50+30+20) is a reasonable proxy for discipline. The main issue is inconsistent implementations, not the formula design itself.
