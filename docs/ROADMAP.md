# Roadmap — Trading Journal v2

> Last updated: 2026-05-30

## Phase 0 — Foundation & Security ✅ (Complete)

**Goal:** Ship with no critical security holes and correct core data.

| Task | Status |
|---|---|
| RLS on all application tables | ✅ Done |
| Remove anon EXECUTE on handle_new_user() | ✅ Done |
| Fix _ResourceSetups RLS + drop duplicate index | ✅ Done |
| Trade P&L computation correctness | ✅ Done |
| tRPC auth on all procedures | ✅ Done |

---

## Phase 1 — Learning System Completion ✅ (Complete)

**Goal:** Full learning loop with reviews, spaced repetition, decay, streaks, and email notifications.

| Task | Status |
|---|---|
| L001–L027: Core CRUD, spaced repetition, resource card | ✅ Done |
| L028: resourceImpactRanking (setup WR delta pre/post) | ✅ Done |
| L029: Decay detection (MASTERED → IN_REVIEW auto-transition) | ✅ Done |
| L030: Materialized streak on User (O(1) stats) | ✅ Done |
| L031: Email idempotence (email_log table + edge function dedup) | ✅ Done |
| L032: List view toggle (compact 36px rows, localStorage persist) | ✅ Done |
| Radix UI dialog accessibility warnings fix | ✅ Done |

---

## Phase 2 — Architecture Refactor (Q3 2026)

**Goal:** Extract domain logic out of monolithic page components and fat tRPC routers.  
**Benefit:** Each feature becomes independently testable; AI layer can be added without coupling.

### 2.1 — Page Component Split
Split monolithic page files (900–1500 LOC) into focused files.

```
src/app/aprendizaje/
  page.tsx                 ← layout + data wiring only (~150 LOC)
  components/
    add-resource-modal.tsx
    session-review-modal.tsx
    resource-drawer.tsx    (already extracted)
    impact-modal.tsx
    link-setup-modal.tsx
```

**Priority pages:** `/aprendizaje`, `/trades`, `/dashboard`

### 2.2 — Service Layer
Move business logic from tRPC routers to domain services.

```
src/domains/learning/services/
  review-scheduler.ts   ← nextReviewAt computation, interval scaling
  streak-service.ts     ← streak update logic (extracted from createReview)
  decay-detector.ts     ← MASTERED→IN_REVIEW logic (extracted from stats)

src/domains/trading/services/
  trade-service.ts      ← P&L computation, risk metrics
  account-service.ts    ← balance computation, drawdown checks
```

### 2.3 — Repository Layer
Isolate all Prisma calls behind a thin repository interface so the service layer stays testable.

### 2.4 — Test Coverage
Target: 80% unit coverage on domain services and entities.  
Tools: Vitest (already configured).

**Deliverables:**
- Service and entity unit tests for learning domain
- Service and entity unit tests for trading domain
- Integration tests for tRPC procedures (using test DB or mocks)

---

## Phase 3 — Dashboard Intelligence (Q3–Q4 2026)

**Goal:** Replace static charts with actionable, personalized insights.

### 3.1 — Performance Analytics Surface
- Best/worst day-of-week by win rate and expectancy
- Setup performance comparison (side-by-side WR, avg R)
- Session type breakdown (London/NY/Asian overlap)
- Rule violation trend — violations per week, correlated with P&L

### 3.2 — Behavioral Pattern Detection
- "Your last 3 losses all came after a winning streak of 3+" 
- "You oversize on Mondays vs. your weekly average"
- "Your win rate on XAUUSD is 12pp above your account average"

### 3.3 — Dashboard Widgets Refactor
- Widget grid layout (drag-to-reorder, hide/show)
- Per-widget data isolation (each widget is an independent query)
- Responsive mobile layout

---

## Phase 4 — Integrations (Q4 2026)

**Goal:** Reduce friction for trade logging; import rather than manual entry.

### 4.1 — CSV Import
- MT4/MT5 history export parser
- cTrader history export parser
- Generic OANDA/interactive brokers CSV

### 4.2 — Trade Event Auto-population
- Parse notes field for structured data (SL, TP, tags)
- Auto-detect session (London/NY) from trade open time + timezone

### 4.3 — Screenshot Attachment
- Supabase Storage for chart screenshots per trade
- Attach from mobile (camera), desktop (drag-drop)

---

## Phase 5 — AI Analytics Layer (2027)

**Goal:** Surface patterns the trader cannot see themselves.

### 5.1 — Embeddings for Journal Entries
- Embed trade notes and review notes
- Similarity search: "Find trades where I made this kind of note before"

### 5.2 — Pattern Recognition
- Cluster trades by outcome + behavioral markers
- Detect setups that are statistically above/below edge

### 5.3 — Coach Assistant (RAG)
- Chat interface over the trader's own data
- "Why did I lose last week?" → pulls trade data + rule violations + reviews
- Powered by Claude API (claude-sonnet-4-6 or newer)

### 5.4 — Personalized Alerts
- "You haven't logged a trade in 3 days but markets were active — what happened?"
- "Your avg loss on Fridays is 2× your weekly avg — consider avoiding Fridays"

---

## Non-Goals (Explicit Exclusions)

- Live broker connections / order routing
- Social features / sharing trades publicly
- Signal marketplace
- Algo strategy backtesting engine (use dedicated tools for this)
