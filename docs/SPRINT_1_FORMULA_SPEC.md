# SPRINT 1 FORMULA SPECIFICATION
> Canonical Function Signatures & Implementation Guide
> Last Updated: 2026-05-31

---

## OVERVIEW

This document specifies exact function signatures, input/output formats, and edge case handling for all financial formulas implemented in Sprint 1. Derived from `target-architecture.md` Section 3.1.

**Key Principle:** Single source of truth. Every formula has exactly one implementation in `src/lib/formulas/`. All 9 win-rate sites, 3 discipline sites, and 2 Sharpe sites must call these functions.

---

## MODULE STRUCTURE

```
src/lib/formulas/
├── index.ts              ← barrel export (ALL functions exported from here)
├── types.ts              ← TypeScript interfaces (created pre-Sprint 1)
├── win-rate.ts           ← isWin(), calcWinRate()
├── drawdown.ts           ← computeMaxDrawdown(), calcDrawdownPct()
├── discipline.ts         ← calcDisciplineScore()
├── risk.ts               ← calcRMultiple(), calcAvgR(), calcExpectancyR()
└── performance.ts        ← calcSharpeRatio(), calcProfitFactor(), calcNetPnl()
```

All existing implementations (formulas.ts, account-service.ts, etc.) become callers of these functions.

---

## 1. WIN RATE FUNCTIONS

### Function: `isWin()`

**Signature:**
```typescript
export function isWin(trade: { pnl: number | null }): boolean
```

**Purpose:** Determine if a single trade is a "win" (made money).

**Canonical Criterion:** `pnl > 0`
- A trade IS a win if and only if P&L is strictly positive (> 0)
- Breakeven trades (pnl = 0) are NOT wins (treated as losses)
- Trades with pnl = null are treated as pnl = 0 (loss)
- R-multiple is irrelevant to win status

**Implementation:**
```typescript
export function isWin(trade: { pnl: number | null }): boolean {
  return (trade.pnl ?? 0) > 0
}
```

**Edge Cases:**
| Input | Output | Reason |
|-------|--------|--------|
| `{ pnl: 0.01 }` | `true` | Any positive P&L is a win |
| `{ pnl: 0 }` | `false` | Breakeven is not a win |
| `{ pnl: -0.01 }` | `false` | Negative P&L is a loss |
| `{ pnl: null }` | `false` | Null treated as 0 |
| `{ pnl: Infinity }` | `true` | Edge case: positive infinity |

**Unit Tests Required:**
- ✓ pnl > 0 returns true
- ✓ pnl = 0 returns false
- ✓ pnl < 0 returns false
- ✓ pnl = null returns false
- ✓ pnl = undefined treated as null

---

### Function: `calcWinRate()`

**Signature:**
```typescript
export function calcWinRate(wins: number, total: number): number
```

**Purpose:** Calculate win rate as a percentage (0–100).

**Output Format:** Percentage 0–100 (e.g., 60 means 60%, not 0.60)

**Implementation:**
```typescript
export function calcWinRate(wins: number, total: number): number {
  return total > 0 ? (wins / total) * 100 : 0
}
```

**Edge Cases:**
| wins | total | Output | Reason |
|------|-------|--------|--------|
| 0 | 0 | 0 | No trades → 0% (not NaN) |
| 0 | 10 | 0 | All losses |
| 10 | 10 | 100 | All wins |
| 5 | 10 | 50 | Half wins |
| 3 | 7 | 42.857... | Decimal percentage (NOT rounded) |

**Storage:** All KPI fields use `number` type. Rounding deferred to UI layer (e.g., `Math.round(wr)` when displaying).

**Unit Tests Required:**
- ✓ zero trades returns 0
- ✓ all wins returns 100
- ✓ all losses returns 0
- ✓ decimal result preserves precision
- ✓ negative values handled gracefully

---

## 2. DRAWDOWN FUNCTIONS

### Function: `computeMaxDrawdown()`

**Signature:**
```typescript
export function computeMaxDrawdown(pnlSequence: number[]): number
```

**Purpose:** Calculate maximum peak-to-trough drawdown from a sequence of P&L values.

**Variant:** Peak-to-Trough (RECOMMENDED for trading — measures worst unrealized loss from any peak)

**Input:** Array of cumulative or incremental P&L values in chronological order.

**Output:** Maximum drawdown in dollar/point amount (absolute value, always ≥ 0).

**Implementation:**
```typescript
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

**Example:**
```
Equity curve: [1000, 1200, 900, 1100]
Peak tracking: 1000 → 1200 (new peak) → 900 (DD=300) → 1100
Result: 300 (peak at 1200, trough at 900)
```

**Edge Cases:**
| Input | Output | Reason |
|-------|--------|--------|
| `[]` | 0 | No trades |
| `[100]` | 0 | Single trade, no drawdown |
| `[100, 200, 300]` | 0 | Only gains |
| `[100, -200, 50]` | 200 | Peak at 100, trough at -100 (100-(-100)=200) |
| `[-100, -50, -200]` | 150 | Peak at start (0), trough at -200 (0-(-200)=200)... wait let me recalc |

Wait, let me recalculate the last one:
- cum=0, peak=0
- pnl=-100: cum=-100, peak stays 0, dd=0-(-100)=100, maxDd=100
- pnl=-50: cum=-150, peak stays 0, dd=0-(-150)=150, maxDd=150
- pnl=-200: cum=-350, peak stays 0, dd=0-(-350)=350, maxDd=350
Result: 350

Fixed edge case table:

| Input | Output | Reason |
|-------|--------|--------|
| `[]` | 0 | No trades |
| `[100]` | 0 | Single trade, no drawdown |
| `[100, 200, 300]` | 0 | Only gains |
| `[100, -200, 50]` | 200 | Peak at 100, trough at -100 |
| `[-100, -50, -200]` | 350 | Peak at start (0), deepest trough at -350 |

**Unit Tests Required:**
- ✓ empty array returns 0
- ✓ monotonic gains returns 0
- ✓ single drawdown calculated correctly
- ✓ multiple drawdowns returns max
- ✓ negative values handled

---

### Function: `calcDrawdownPct()`

**Signature:**
```typescript
export function calcDrawdownPct(maxDdDollar: number, initBal: number): number
```

**Purpose:** Convert maximum drawdown amount to percentage of initial balance.

**Output Format:** Percentage 0–100 (e.g., 10 means 10% drawdown, not 0.10)

**Implementation:**
```typescript
export function calcDrawdownPct(maxDdDollar: number, initBal: number): number {
  return initBal > 0 ? (maxDdDollar / initBal) * 100 : 0
}
```

**Example:**
```
Initial balance: $10,000
Max drawdown: $2,000
Result: (2000 / 10000) * 100 = 20%
```

**Edge Cases:**
| maxDdDollar | initBal | Output | Reason |
|---|---|---|---|
| 0 | 10000 | 0 | No drawdown |
| 2000 | 10000 | 20 | 20% drawdown |
| 10000 | 10000 | 100 | 100% wipeout |
| 15000 | 10000 | 150 | Over 100% (blown account + debt) |
| 1000 | 0 | 0 | Zero initial balance → safe default |
| 1000 | -5000 | 0 | Negative balance → safe default |

**Unit Tests Required:**
- ✓ normal case calculates percentage
- ✓ zero initial balance returns 0
- ✓ negative initial balance returns 0
- ✓ drawdown > balance returns >100%
- ✓ zero drawdown returns 0

---

## 3. DISCIPLINE SCORE FUNCTION

### Function: `calcDisciplineScore()`

**Signature:**
```typescript
export function calcDisciplineScore(params: DisciplineParams): DisciplineBreakdown
```

**Purpose:** Calculate composite discipline score (0–100) from four sub-components.

**Composition:**
- **Execution Score (0–50):** Percentage of trades without behavioral violations (FOMO, Off-plan, Revenge, Impulsivo tags)
- **Learning Score (0–30):** Percentage of pending learning resources completed for SRS review
- **Adherence Score (0–20):** Percentage of enabled trading rules that trader followed
- **Total Score (0–100):** Sum of three components, rounded to nearest integer

**Parameters:**
```typescript
interface DisciplineParams {
  totalTrades:       number   // Total trades in period
  taggedViolations:  number   // Trades with behavioral tags
  pendingReviews:    number   // Learning resources due for SRS review
  completedReviews:  number   // Learning resources completed
  totalEnabledRules: number   // Total rules trader enabled
  violatedRules:     number   // Rules trader violated in period
}
```

**Output:**
```typescript
interface DisciplineBreakdown {
  score:          number   // 0–100 (rounded integer, NOT decimal)
  executionScore: number   // 0–50 (decimal, unrounded)
  learningScore:  number   // 0–30 (decimal, unrounded)
  adherenceScore: number   // 0–20 (decimal, unrounded)
}
```

**Implementation:**
```typescript
export function calcDisciplineScore(params: DisciplineParams): DisciplineBreakdown {
  const { totalTrades, taggedViolations, pendingReviews,
          completedReviews, totalEnabledRules, violatedRules } = params
  
  const executionScore = totalTrades > 0
    ? ((totalTrades - taggedViolations) / totalTrades) * 50 : 50
  
  const learningScore = pendingReviews > 0
    ? (completedReviews / pendingReviews) * 30 : 30
  
  const adherenceScore = totalEnabledRules > 0
    ? ((totalEnabledRules - violatedRules) / totalEnabledRules) * 20 : 20
  
  return {
    score:          Math.round(executionScore + learningScore + adherenceScore),
    executionScore, learningScore, adherenceScore,
  }
}
```

**Examples:**

Example 1: Perfect score
```
totalTrades: 10, taggedViolations: 0
pendingReviews: 5, completedReviews: 5
totalEnabledRules: 8, violatedRules: 0

executionScore = (10/10) * 50 = 50
learningScore = (5/5) * 30 = 30
adherenceScore = (8/8) * 20 = 20
score = round(100) = 100
```

Example 2: Mixed performance
```
totalTrades: 20, taggedViolations: 5
pendingReviews: 10, completedReviews: 3
totalEnabledRules: 5, violatedRules: 1

executionScore = (15/20) * 50 = 37.5
learningScore = (3/10) * 30 = 9
adherenceScore = (4/5) * 20 = 16
score = round(62.5) = 62 (or 63? — use Math.round())
```

Example 3: Zero trades (should default to max for available component)
```
totalTrades: 0, taggedViolations: 0
pendingReviews: 0, completedReviews: 0
totalEnabledRules: 0, violatedRules: 0

executionScore = 50 (default when no trades)
learningScore = 30 (default when no reviews)
adherenceScore = 20 (default when no rules)
score = round(100) = 100
```

**Edge Cases:**
| Scenario | executionScore | learningScore | adherenceScore | Total |
|---|---|---|---|---|
| Perfect | 50 | 30 | 20 | 100 |
| All violations | 0 | 30 | 20 | 50 |
| No learning | 50 | 0 | 20 | 70 |
| No rules set | 50 | 30 | 20 | 100 |
| Partial (50/50/50) | 25 | 15 | 10 | 50 |
| Mixed partial | 37.5 | 9 | 16 | 62.5 → 62 or 63 |

**Unit Tests Required:**
- ✓ perfect score returns 100
- ✓ zero trades defaults execution to 50
- ✓ zero reviews defaults learning to 30
- ✓ zero rules defaults adherence to 20
- ✓ rounding works (Math.round)
- ✓ partial scores sum correctly
- ✓ negative inputs handled (treat as 0)

---

## 4. RISK FUNCTIONS

### Function: `calcRMultiple()`

**Signature:**
```typescript
export function calcRMultiple(
  direction:  "LONG" | "SHORT",
  entry:      number,
  stop:       number,
  closePrice: number,
): number | null
```

**Purpose:** Calculate risk/reward multiple (R) for a single trade.

**Definition:**
- **R = (Profit / Risk)**
- Risk = absolute distance from entry to stop loss
- Profit = distance from entry to close price (adjusted for direction)

**Implementation:**
```typescript
export function calcRMultiple(
  direction:  "LONG" | "SHORT",
  entry:      number,
  stop:       number,
  closePrice: number,
): number | null {
  const riskDistance = Math.abs(entry - stop)
  if (riskDistance === 0) return null  // Can't calculate R with zero risk
  
  return direction === "LONG"
    ? (closePrice - entry) / riskDistance
    : (entry - closePrice) / riskDistance
}
```

**Examples:**

LONG trade:
```
direction: "LONG"
entry: 100, stop: 95, closePrice: 110
riskDistance = |100 - 95| = 5
profit = 110 - 100 = 10
rMultiple = 10 / 5 = 2.0 (2R winner)
```

SHORT trade:
```
direction: "SHORT"
entry: 100, stop: 105, closePrice: 90
riskDistance = |100 - 105| = 5
profit = 100 - 90 = 10
rMultiple = 10 / 5 = 2.0 (2R winner)
```

Loss:
```
direction: "LONG"
entry: 100, stop: 95, closePrice: 92
riskDistance = |100 - 95| = 5
profit = 92 - 100 = -8
rMultiple = -8 / 5 = -1.6 (1.6R loser)
```

**Edge Cases:**
| direction | entry | stop | closePrice | Output | Reason |
|---|---|---|---|---|---|
| LONG | 100 | 100 | 110 | null | Zero risk distance |
| LONG | 100 | 95 | 110 | 2.0 | Normal win |
| LONG | 100 | 95 | 92 | -1.6 | Loss |
| LONG | 100 | 105 | 108 | 0.8 | Long with trailing stop |
| SHORT | 100 | 105 | 92 | 1.6 | Short win |
| SHORT | 100 | 95 | 102 | -0.4 | Short loss |

**Unit Tests Required:**
- ✓ LONG win calculates positive R
- ✓ LONG loss calculates negative R
- ✓ SHORT win calculates positive R
- ✓ SHORT loss calculates negative R
- ✓ zero risk returns null
- ✓ breakeven (close = entry) returns 0

---

### Function: `calcAvgR()`

**Signature:**
```typescript
export function calcAvgR(trades: { rMultiple: number | null }[]): number
```

**Purpose:** Calculate average R-multiple across trades (only trades with defined R).

**Implementation:**
```typescript
export function calcAvgR(trades: { rMultiple: number | null }[]): number {
  const withR = trades.filter(t => t.rMultiple != null)
  if (withR.length === 0) return 0
  return withR.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / withR.length
}
```

**Examples:**
```
trades: [
  { rMultiple: 2.0 },   // 2R win
  { rMultiple: 1.5 },   // 1.5R win
  { rMultiple: -1.0 },  // 1R loss
  { rMultiple: null },  // ignored
]
withR = [2.0, 1.5, -1.0]
avgR = (2.0 + 1.5 - 1.0) / 3 = 2.5 / 3 = 0.833...
```

**Edge Cases:**
| Trades | Output | Reason |
|---|---|---|
| `[]` | 0 | No trades |
| `[{ rMultiple: null }]` | 0 | Only null R |
| `[{ rMultiple: 0 }]` | 0 | Single breakeven |
| `[2, 2, 2]` | 2 | All same |
| `[2, -2]` | 0 | Perfectly offsetting |

**Unit Tests Required:**
- ✓ average of positive values
- ✓ average includes negative values
- ✓ empty or all-null returns 0
- ✓ correctly filters null rMultiples

---

### Function: `calcExpectancyR()`

**Signature:**
```typescript
export function calcExpectancyR(trades: { rMultiple: number | null }[]): number
```

**Purpose:** Calculate expected value in R terms (Expectancy).

**Formula:**
```
E[R] = (Win% × AvgWinR) - (Loss% × AvgLossR)
```

**Implementation:**
```typescript
export function calcExpectancyR(trades: { rMultiple: number | null }[]): number {
  const withR = trades.filter(t => t.rMultiple != null)
  if (withR.length === 0) return 0
  
  const wins   = withR.filter(t => (t.rMultiple ?? 0) > 0)
  const losses = withR.filter(t => (t.rMultiple ?? 0) <= 0)
  
  const wr         = wins.length / withR.length
  const avgWinR    = wins.length   > 0 ? wins.reduce((s, t)   => s + (t.rMultiple ?? 0), 0) / wins.length   : 0
  const avgLossR   = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.rMultiple ?? 0), 0) / losses.length) : 1
  
  return wr * avgWinR - (1 - wr) * avgLossR
}
```

**Examples:**

Example 1: Positive expectancy
```
trades: [2.0, 2.0, 2.0, -1.0, -1.0]
withR = [2.0, 2.0, 2.0, -1.0, -1.0]
wins = [2.0, 2.0, 2.0] (3 wins)
losses = [-1.0, -1.0] (2 losses)

wr = 3/5 = 0.6
avgWinR = 6/3 = 2.0
avgLossR = abs(-2/2) = 1.0
expectancy = (0.6 × 2.0) - (0.4 × 1.0) = 1.2 - 0.4 = 0.8 (positive)
```

Example 2: Negative expectancy
```
trades: [1.0, -2.0, -2.0, -2.0]
wins = [1.0] (1 win)
losses = [-2.0, -2.0, -2.0] (3 losses)

wr = 1/4 = 0.25
avgWinR = 1.0
avgLossR = abs(-6/3) = 2.0
expectancy = (0.25 × 1.0) - (0.75 × 2.0) = 0.25 - 1.5 = -1.25 (negative)
```

**Edge Cases:**
| Scenario | Output | Reason |
|---|---|---|
| All wins (3R, 3R, 3R) | 3.0 | avgLossR defaults to 1.0 |
| All losses (-1R, -1R, -1R) | -1.0 | avgWinR is 0 |
| Empty or all null | 0 | No trades |
| Breakeven only (0R) | 0 | 50/50, 0 avg both sides |

**Unit Tests Required:**
- ✓ positive expectancy calculates correctly
- ✓ negative expectancy calculates correctly
- ✓ all wins defaults avgLossR to 1.0
- ✓ all losses results in negative
- ✓ empty returns 0

---

## 5. PERFORMANCE FUNCTIONS

### Function: `calcSharpeRatio()`

**Signature:**
```typescript
export function calcSharpeRatio(rMultiples: number[]): number | null
```

**Purpose:** Calculate Sharpe ratio from R-multiple sequence (measures return per unit risk).

**Formula:**
```
Sharpe = Mean(R) / StdDev(R)
```

**Note:** Uses Bessel-corrected sample standard deviation (n-1 denominator).

**Implementation:**
```typescript
export function calcSharpeRatio(rMultiples: number[]): number | null {
  if (rMultiples.length < 2) return null  // Need at least 2 points
  
  const mean = rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length
  
  // Bessel-corrected sample std dev (n-1 denominator)
  const variance = rMultiples.reduce((a, b) => a + (b - mean) ** 2, 0) / (rMultiples.length - 1)
  const std = Math.sqrt(variance)
  
  return std > 0 ? mean / std : null
}
```

**Examples:**

Example 1: Consistent returns (high Sharpe)
```
rMultiples: [1.0, 1.2, 0.9, 1.1, 1.0]
mean = 5.2 / 5 = 1.04
variance = ((0.04)² + (0.16)² + ...) / 4 ≈ 0.0104
std ≈ 0.102
sharpe ≈ 1.04 / 0.102 ≈ 10.2 (very smooth)
```

Example 2: Volatile returns (low Sharpe)
```
rMultiples: [3.0, -2.0, 4.0, -1.5, 2.0]
mean = 5.5 / 5 = 1.1
variance = high (large swings)
sharpe ≈ 0.5 (inconsistent)
```

**Edge Cases:**
| Input | Output | Reason |
|---|---|---|
| `[]` | null | No data |
| `[1.0]` | null | < 2 points |
| `[1.0, 1.0]` | null | Zero std dev (no variance) |
| `[1.0, 1.0, 1.0]` | null | Zero std dev |
| `[2.0, -2.0, 2.0, -2.0]` | value or null | Check actual calculation |

**Unit Tests Required:**
- ✓ < 2 points returns null
- ✓ zero std dev returns null
- ✓ positive mean, positive std returns positive Sharpe
- ✓ negative mean, positive std returns negative Sharpe
- ✓ Bessel correction used (n-1 denominator)

---

### Function: `calcProfitFactor()`

**Signature:**
```typescript
export function calcProfitFactor(grossWin: number, grossLoss: number): number
```

**Purpose:** Calculate profit factor (ratio of total wins to absolute losses).

**Formula:**
```
Profit Factor = Total Wins / Absolute(Total Losses)
```

**Edge Cases:**
- No losses (grossLoss = 0, grossWin > 0): return 999 (effectively infinite)
- No wins (grossWin = 0): return 0 (no profit)
- Both zero: return 0

**Implementation:**
```typescript
export function calcProfitFactor(grossWin: number, grossLoss: number): number {
  if (grossLoss === 0 && grossWin > 0) return 999  // Infinite profit factor
  if (grossWin === 0) return 0                      // No profit
  return grossWin / Math.abs(grossLoss)
}
```

**Examples:**
```
grossWin: 10000, grossLoss: 5000
profitFactor = 10000 / 5000 = 2.0 (earn $2 for every $1 lost)

grossWin: 10000, grossLoss: 0
profitFactor = 999 (no losses → effectively infinite)

grossWin: 0, grossLoss: 5000
profitFactor = 0 (no wins)

grossWin: 10000, grossLoss: -3000 (already absolute)
profitFactor = 10000 / abs(-3000) = 10000 / 3000 = 3.33
```

**Edge Cases:**
| grossWin | grossLoss | Output | Reason |
|---|---|---|---|
| 0 | 0 | 0 | No activity |
| 10000 | 0 | 999 | Perfect (no losses) |
| 0 | 5000 | 0 | All losses |
| 10000 | 5000 | 2.0 | Normal case |
| 1000 | 10000 | 0.1 | Losing (more losses than wins) |
| 5000 | -3000 | 1.67 | Handles negative loss input |

**Unit Tests Required:**
- ✓ normal case calculates ratio
- ✓ zero loss returns 999
- ✓ zero win returns 0
- ✓ negative loss treated as absolute value
- ✓ zero/zero returns 0

---

### Function: `calcNetPnl()`

**Signature:**
```typescript
export function calcNetPnl(trades: { pnl: number | null }[]): number
```

**Purpose:** Sum total P&L across all trades.

**Implementation:**
```typescript
export function calcNetPnl(trades: { pnl: number | null }[]): number {
  return trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0)
}
```

**Examples:**
```
trades: [
  { pnl: 100 },
  { pnl: -50 },
  { pnl: null },
  { pnl: 200 },
]
netPnl = 100 - 50 + 0 + 200 = 250
```

**Unit Tests Required:**
- ✓ sum of positive and negative
- ✓ null treated as 0
- ✓ empty array returns 0
- ✓ all null returns 0

---

## MIGRATION CHECKLIST

### Pre-Implementation Audits

Before implementing any formula:

1. **Identify current implementations** (already done in target-architecture.md line 278-284)
   - Win rate: 9 sites (dashboard-analytics, trades.ts, weekly-reviews 2×, create-review-modal, trading-sessions, learning-resources, use-account-stats, trades/page.tsx)
   - Discipline: 3 sites (weekly-reviews 2×, create-review-modal)
   - Sharpe: 2 sites (formulas.ts, ai-context.ts)
   - Drawdown: 3 sites (account-service.ts, use-account-stats, account-form)
   - rMultiple: 2 sites (trade-service.ts, import/mt4/route.ts)

2. **Document current behavior** in each site
   - Is win criterion pnl > 0, or rMultiple > 0, or something else?
   - Are percentages 0–100 or 0–1?
   - Are formulas inline or in helper functions?

3. **Create redirect shims** during transition
   - Existing formulas.ts → calls new lib/formulas functions
   - Single-file import simplifies migration: `import { calcWinRate } from "@/lib/formulas"`

4. **Test migration** with 3+ production accounts
   - Before/after numbers must match exactly (or document deltas)
   - Compare KPI screens, weekly reviews, AI context

### After Implementation

1. **Update all 9 win-rate sites** to call `isWin()` and `calcWinRate()`
2. **Update all 3 discipline sites** to call `calcDisciplineScore()`
3. **Update all 2 Sharpe sites** to call `calcSharpeRatio()`
4. **Delete old formulas.ts** once all callers migrated
5. **Run full test suite** and regression test on staging

---

## EXPORT STRUCTURE

**src/lib/formulas/index.ts** (barrel export):
```typescript
export { isWin, calcWinRate } from './win-rate'
export { computeMaxDrawdown, calcDrawdownPct } from './drawdown'
export { calcDisciplineScore } from './discipline'
export { calcRMultiple, calcAvgR, calcExpectancyR } from './risk'
export { calcSharpeRatio, calcProfitFactor, calcNetPnl } from './performance'

// Re-export types
export type { DisciplineParams, DisciplineBreakdown } from './discipline'
export type { WinRateOutput, RiskRewardMetrics, AnalyticsOutput, KpiSummary } from './types'
```

---

## APPENDIX: OUTPUT FORMAT SUMMARY

| Formula | Return Type | Format | Example |
|---|---|---|---|
| `isWin()` | boolean | true/false | true |
| `calcWinRate()` | number | 0–100 | 65.5 (means 65.5%) |
| `calcDrawdownPct()` | number | 0–100 | 12.5 (means 12.5%) |
| `calcDisciplineScore()` | DisciplineBreakdown | see type | {score: 75, ...} |
| `calcRMultiple()` | number \| null | decimal or null | 2.5 or null |
| `calcAvgR()` | number | decimal | 1.2 |
| `calcExpectancyR()` | number | decimal (can be negative) | 0.85 or -0.2 |
| `calcSharpeRatio()` | number \| null | decimal or null | 1.8 or null |
| `calcProfitFactor()` | number | decimal (0–999) | 2.0 or 999 |
| `calcNetPnl()` | number | decimal (can be negative) | 5000 or -2500 |

---

**END OF SPRINT_1_FORMULA_SPEC.md**

**Status:** Ready for team review
**Next Step:** Create `src/lib/formulas/types.ts` with all TypeScript interfaces
