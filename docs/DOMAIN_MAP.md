# Domain Map — Trading Journal v2

> This document defines domain boundaries, entity ownership, and cross-domain relationships.

---

## Domain Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         User (root aggregate)                    │
└────────┬──────────────┬──────────────┬──────────────┬───────────┘
         │              │              │              │
    ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐  ┌────▼────┐
    │ TRADING │   │ LEARNING  │  │ FINANCE │  │REFLECTION│
    └────┬────┘   └─────┬─────┘  └────┬────┘  └────┬────┘
         │              │              │              │
    ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐  ┌────▼────┐
    │ANALYTICS│   │ANALYTICS  │  │ (local) │  │ (local) │
    │(shared) │   │  (local)  │  └─────────┘  └─────────┘
    └─────────┘   └───────────┘
```

---

## Domain: Trading

**Purpose:** Capture, validate, and aggregate trade execution data.

### Entities

| Entity | Table | Key Fields |
|---|---|---|
| Account | `accounts` | type, status, initialBalance, currency, ddDailyPct, ddTotalPct, phase |
| Trade | `trades` | accountId, setupId, direction, entryPrice, exitPrice, pnl, riskR |
| TradeEvent | `trade_events` | tradeId, type, price, notes, timestamp |
| Setup | `setups` | name, description, conditions, linked rules |
| Market | `markets` | symbol, category, timezone |
| Rule | `rules` | title, description, type, linked setups |

### Aggregates

- **Account** is the primary aggregate; `Trade` is owned by Account
- **Setup** is a User-level aggregate shared across accounts
- **Rule** belongs to Setup (or globally to User — current implementation is User-level)

### Business Rules

- P&L is computed from `TradeEvent` entries (entry/exit prices × lots)
- Drawdown is checked against `ddDailyPct`, `ddWeeklyPct`, `ddMonthlyPct`, `ddTotalPct`
- Prop firm accounts track `phase` (PHASE_1 → PHASE_2 → FUNDED)
- Account type `LOST` is a terminal state triggered when total drawdown is breached

### Cross-Domain Dependencies

- **→ Learning:** `Setup` is linked to `LearningResource` via M2M (`_ResourceSetups`)
- **→ Analytics:** Trades are the primary data source for performance metrics

---

## Domain: Learning

**Purpose:** Track knowledge acquisition and enforce spaced repetition to convert study into durable edge.

### Entities

| Entity | Table | Key Fields |
|---|---|---|
| LearningResource | `learning_resources` | type, status, progressType, currentUnits, totalUnits, weekDeltaMinutes, nextReviewAt, reviewInterval |
| ResourceReview | `resource_reviews` | resourceId, masteryLevel, learned, nextReviewAt, reviewInterval |

### Aggregates

- **LearningResource** owns all reviews; review scheduling state lives on the resource, not on reviews

### Business Rules

- `nextReviewAt` = `createdAt` + `reviewInterval` days (recalculated on each review based on mastery)
- `reviewInterval` scales with `masteryLevel` (1→1d, 2→3d, 3→7d, 4→14d, 5→30d)
- Decay: if `now - nextReviewAt > reviewInterval × 2`, status transitions `MASTERED → IN_REVIEW` automatically
- Streak: `currentStreak` is materialized on `User`, updated atomically in `createReview`
- `weekDeltaMinutes` tracks weekly study time increment; reset each Monday

### Cross-Domain Dependencies

- **→ Trading:** `LearningResource` linked to `Setup` via `_ResourceSetups` M2M
- **→ Analytics:** `resourceImpactRanking` correlates completed resources with setup win-rate delta

---

## Domain: Finance

**Purpose:** Track capital movements and account balance changes with an audit trail.

### Entities

| Entity | Table | Key Fields |
|---|---|---|
| Withdrawal | `withdrawals` | accountId, amount, currency, status, date |
| AccountLog | `account_logs` | accountId, type, amount, balance, note |

### Business Rules

- Withdrawal statuses: `SOLICITADO → EN_PROCESO → PAGADO | RECHAZADO`
- `AccountLog` is append-only; records every balance change with reason
- Balance is computed from `AccountLog` entries, not stored directly on Account

### Cross-Domain Dependencies

- **→ Trading:** Withdrawals reduce Account balance and are logged in AccountLog

---

## Domain: Reflection

**Purpose:** Weekly structured review ritual; qualitative assessment of trading behavior.

### Entities

| Entity | Table | Key Fields |
|---|---|---|
| WeeklyReview | `weekly_reviews` | accountId, weekStart, weekEnd, discipline, mentalState, notes, topSetup |

### Business Rules

- One review per account per week (enforced by `UNIQUE(account_id, week_start)`)
- `discipline` is a 1–5 score; surfaces in dashboard behavioral trends

### Cross-Domain Dependencies

- **→ Trading:** Reviews reference an Account and its weekly performance context

---

## Domain: Analytics (Cross-Cutting)

**Purpose:** Derived insights across Trading + Learning data. No owned entities — reads only.

### Computed Outputs

| Metric | Source Domain | Description |
|---|---|---|
| Setup win rate | Trading | Wins / total trades per setup |
| Resource impact delta | Trading + Learning | WR difference pre/post resource completion date |
| Account drawdown status | Finance + Trading | Current DD% vs. limits |
| Learning streak | Learning | `currentStreak` / `bestStreak` from User |
| Weekly study progress | Learning | `weekDeltaMinutes` vs. `weeklyGoalMinutes` |
| Pending reviews | Learning | Resources where `nextReviewAt` ≤ today |

### Current Implementation

Analytics are computed inside tRPC procedures (`stats`, `resourceImpactRanking`).  
Target: isolated `AnalyticsService` that can be queried independently by both tRPC and a future AI layer.

---

## Cross-Domain Relationship Map

```
User
 ├── owns → Account → Trade → TradeEvent
 ├── owns → Setup ←──────────────────────── LearningResource (M2M: _ResourceSetups)
 ├── owns → LearningResource → ResourceReview
 ├── owns → Market
 ├── owns → Rule
 ├── owns → WeeklyReview (per Account)
 ├── owns → Withdrawal (per Account)
 └── owns → AccountLog (per Account)

Analytics reads:
 Trade + LearningResource → resourceImpactRanking
 Trade + Account         → drawdown status, equity curve
 ResourceReview          → streak, pending reviews
 WeeklyReview            → behavioral trend
```

---

## Module Ownership (Source Code)

| Domain | Router | Page | Components |
|---|---|---|---|
| Trading | `routers/trades.ts`, `setups.ts`, `markets.ts` | `/trades`, `/playbook` | `components/trades/` |
| Learning | `routers/learning-resources.ts` | `/aprendizaje` | `components/aprendizaje/` |
| Finance | `routers/withdrawals.ts`, `account-logs.ts` | `/retiros`, `/cuentas` | `components/finance/` (TBD) |
| Reflection | `routers/weekly-reviews.ts` | `/reviews` | — |
| Analytics | (inline in stats procedures) | `/dashboard` | `components/dashboard/` (TBD) |
| Auth/Profile | — | `/perfil` | — |
