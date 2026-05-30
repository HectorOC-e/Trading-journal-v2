# Domain Map — Trading Journal v2

> Last updated: 2026-05-30

---

## Domain Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User (root aggregate)                       │
│  currentStreak · bestStreak · lastReviewDate · weeklyGoalMinutes    │
└───────┬──────────────┬──────────────┬──────────────┬───────────────┘
        │              │              │              │
   ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐  ┌────▼──────┐
   │ TRADING │   │ LEARNING  │  │ FINANCE │  │ REFLECTION│
   └────┬────┘   └─────┬─────┘  └────┬────┘  └────┬──────┘
        │              │              │              │
   ┌────▼─────────────────────────────────────────────────┐
   │                   ANALYTICS (cross-cutting)           │
   │  dashboardStats · resourceImpactRanking · propFirm    │
   └──────────────────────────────────────────────────────┘
```

---

## Domain: Trading

**Purpose:** Capture, validate, and aggregate trade execution reality.

### Entities & Aggregates

| Entity | Table | Role |
|---|---|---|
| **Account** | `accounts` | Aggregate root. Owns all trades, reviews, and withdrawals. Carries prop firm constraints. |
| **Trade** | `trades` | Owned by Account. The primary unit of financial record. |
| **TradeEvent** | `trade_events` | Owned by Trade. Immutable event log of trade lifecycle changes. |
| **Setup** | `setups` | User-level aggregate. Defines a repeatable trading edge. Linked to LearningResource (cross-domain). |
| **Market** | `markets` | Reference data. Symbol metadata, session info. |
| **Rule** | `rules` | User-level behavioral constraints. `isSystem` marks system defaults vs. custom rules. |

### Trade Lifecycle

```
OPEN → (optional TradeEvents) → CLOSED | CANCELLED

TradeEvent types:
  OPEN             → created automatically with every Trade.create
  STOP_MOVE        → mutates Trade.stop
  TRAIL_STOP       → mutates Trade.stop (trailing variant)
  TAKE_PROFIT_MOVE → mutates Trade.target
  SCALE_IN         → mutates Trade.entry (weighted avg) + Trade.size
  PARTIAL_CLOSE    → mutates Trade.size
  NOTE             → no Trade mutation, pure record
```

### Account Types and Constraints

| Type | Prop Firm Fields Active |
|---|---|
| PERSONAL | none |
| PROP_FIRM | ddDailyPct, ddWeeklyPct, ddMonthlyPct, ddTotalPct, targetPct, ddModel, phase, maxTradesPerDay, allowedSymbols, minTradingDays |
| DEMO_PERSONAL | none |
| DEMO_PROP | ddDailyPct, ddTotalPct, maxTradesPerDay |
| BACKTEST | none |
| QA | none |

### Prop Firm Phase Lifecycle

```
PHASE_1 → PHASE_2 → FUNDED
```

Each phase transition creates an `AccountLog` event of type `PHASE_CHANGE`.

### Business Rules (Existing)

- P&L = `(closePrice - entry) × size` (LONG) or `(entry - closePrice) × size` (SHORT), minus commission
- R-Multiple = `rawPnl / (|entry - stop| × size)`, null if stop distance is 0
- SCALE_IN: new avg entry = `(oldEntry × oldSize + newPrice × addedSize) / newSize`
- Account status `LOST` requires a `statusNote` explaining the loss

### Business Rules (Proposed — Phase 2)

- Before `trades.create` on PROP_FIRM: check daily loss %, trade count, allowed symbols
- On `trades.close`: check if total drawdown breached → auto-set account `INACTIVE`
- Rule violations: behavioral tags on trades (`Impulsivo`, `Off-plan`) increment `Rule.violationsThisMonth`

---

## Domain: Learning

**Purpose:** Convert study time into durable knowledge through spaced repetition, tracking, and cross-domain correlation.

### Entities & Aggregates

| Entity | Table | Role |
|---|---|---|
| **LearningResource** | `learning_resources` | Aggregate root. A book, video, drill, etc. Owns all reviews. |
| **ResourceReview** | `resource_reviews` | A spaced-repetition review event. Immutable once created. |

### Spaced Repetition Logic

```
On ResourceReview creation:
  interval = resource.reviewInterval ?? 7 days
  
  masteryLevel scaling:
    ≤2  → Math.max(1, ceil(interval / 2))    — struggled, review sooner
    3   → interval                            — neutral, same interval
    ≥4  → round(interval * 1.5)              — confident, space out
  
  resource.nextReviewAt = today + scaled_interval
  resource.status = "IN_REVIEW" (if was COMPLETED)
  resource.rating = masteryLevel rating from this review
```

### Decay Detection

```
On stats query:
  If resource.status === "MASTERED"
  AND (today - resource.nextReviewAt) > resource.reviewInterval × 2
  → update status to "IN_REVIEW"
  → decayedCount++ (returned in stats response)
```

### Progress Tracking by Type

| Resource Type | progressType | Unit |
|---|---|---|
| VIDEO, PODCAST | minutes | minutes watched |
| LIBRO | pages | pages read |
| DRILL, BACKTEST | sessions | session count |
| NOTA, HERRAMIENTA | null | manual % only |

### Materialized Streak (on User)

```
On each ResourceReview create (in transaction):
  if lastReviewDate === today     → streak unchanged
  if lastReviewDate === yesterday → streak + 1
  else                            → streak = 1
  bestStreak = max(bestStreak, newStreak)
  lastReviewDate = today
```

### Cross-Domain Link

`LearningResource ↔ Setup` (M2M via `_ResourceSetups`)

This link powers `resourceImpactRanking`: for each linked setup, compute win rate on trades before and after `resource.completedAt`. The delta is the resource's measurable impact on trading performance.

---

## Domain: Finance

**Purpose:** Track capital movements and maintain an immutable audit trail of account state changes.

### Entities

| Entity | Table | Role |
|---|---|---|
| **Withdrawal** | `withdrawals` | A capital withdrawal request. Status-tracked. |
| **AccountLog** | `account_logs` | Append-only audit trail. One record per account state change. |

### Withdrawal Status Lifecycle

```
SOLICITADO → EN_PROCESO → PAGADO
                        → RECHAZADO
```

Each status change creates an `AccountLog` event.

### AccountLog Event Types

| Event | Triggered By | Payload |
|---|---|---|
| CREATED | Account creation | `{ initialBalance, currency }` |
| PHASE_CHANGE | `accounts.updatePhase` | `{ from, to }` |
| WITHDRAWAL | `withdrawals.create` | `{ amount, currency }` |
| STATUS_CHANGE | `accounts.changeStatus` | `{ from, to, note }` |
| NOTE | Manual entry | `{ text }` |

*(Payload is `Json {}` — see TASK-TYPE-002 for typed payload proposal)*

---

## Domain: Reflection

**Purpose:** Structured weekly review ritual to close the feedback loop between performance and psychology.

### Entities

| Entity | Table | Role |
|---|---|---|
| **WeeklyReview** | `weekly_reviews` | One review per account per week. Contains performance context and written reflection. |

### WeeklyReview Fields

| Field | Type | Source |
|---|---|---|
| `tradeCount` | int | Computed from trades in week range |
| `netPnl` | Decimal | Computed from trades in week range |
| `winRate` | Decimal | Computed from trades in week range |
| `disciplineScore` | int (0–100) | **Currently: manual entry** (see TASK-RULES-002 for automation) |
| `executiveSummary` | text | Freeform written by trader |
| `whatWorked` | text | Freeform |
| `toImprove` | text | Freeform |

---

## Domain: Analytics (Cross-Cutting)

**Purpose:** Derived intelligence across Trading + Learning data. Read-only — owns no entities.

### Current Implementation

Analytics are computed in two places, creating duplication:

| Computation | Server (tRPC) | Client (useMemo in dashboard) |
|---|---|---|
| Win rate, net P&L, profit factor | `trades.stats` | `TabPortfolio` useMemo |
| Expectancy | `trades.stats` (in R) | `TabPortfolio` useMemo (in $) |
| Equity curve | ❌ not on server | `TabOperador` useMemo |
| Setup win rate | `learningResources.resourceImpactRanking` | `TabPlaybook` useMemo |
| Session breakdown | ❌ not on server | `TabOperador` useMemo |
| Prop firm status | ❌ not on server | `TabPortfolio` useMemo |

### Target: Single Server Procedure

`trades.dashboardStats` (proposed in TASK-DASH-001) consolidates all of the above into one server-computed response. The client receives pre-aggregated objects and renders them — no computation in `useMemo`.

---

## Cross-Domain Relationship Map

```
User
 │
 ├── Account ──────────────────── WeeklyReview (per account)
 │    │
 │    └── Trade ─────────────────── Setup (n:1)
 │         │                              │
 │         └── TradeEvent (immutable)     └── LearningResource (M2M)
 │                                                │
 │                                                └── ResourceReview (spaced repetition)
 │
 ├── Rule (behavioral constraints, per user)
 │
 ├── Market (reference data, per user)
 │
 └── AccountLog (audit trail, per account)

Analytics reads across:
  Trade + Account          → dashboardStats (equity, P&L, drawdown, session)
  Trade + Setup            → setupStats (win rate, avg R per setup)
  Trade + LearningResource → resourceImpactRanking (study → edge correlation)
  WeeklyReview + Trade     → disciplineScore (planned automation)
  ResourceReview + User    → currentStreak (materialized)
```

---

## Source Code Ownership Map

| Domain | Router(s) | Page(s) | Component Dir |
|---|---|---|---|
| Trading | `trades.ts`, `setups.ts`, `markets.ts`, `rules.ts` | `/trades`, `/playbook`, `/mercados`, `/reglas` | `components/trades/` |
| Learning | `learning-resources.ts` | `/aprendizaje` | `components/aprendizaje/` |
| Finance | `withdrawals.ts`, `account-logs.ts` | `/retiros`, `/cuentas` | (no separate dir) |
| Reflection | `weekly-reviews.ts` | `/reviews` | (no separate dir) |
| Analytics | (inline in procedures + dashboard page) | `/dashboard` | (no separate dir — target: `domains/analytics/`) |
| Auth/Profile | — | `/perfil`, `/login` | — |
