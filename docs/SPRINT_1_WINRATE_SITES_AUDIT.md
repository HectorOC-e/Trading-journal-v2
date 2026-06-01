# SPRINT 1 WIN-RATE SITES AUDIT REPORT
> Identification & Analysis of All 9 Win-Rate Calculation Implementations
> Date: 2026-05-31

---

## OVERVIEW

This document identifies and analyzes all 9 win-rate calculation sites in the codebase. Target: Unify all 9 under the canonical `isWin(trade)` and `calcWinRate(wins, total)` functions.

**Canonical Criterion (Decision 1.4):** `pnl > 0`
- A trade IS a win if and only if P&L is strictly positive (> 0)
- Breakeven trades (pnl = 0) are NOT wins
- R-multiple is irrelevant to win status

---

## SITE 1: Dashboard Analytics Service

**File:** `src/domains/analytics/services/dashboard-analytics.ts`

**Current Implementation:** [NEEDS VERIFICATION]

**Purpose:** Compute KPI summary for dashboard display

**Win-Rate Criterion:** [TBD — will verify in code]

**Files To Migrate:**
- [ ] Read full file to identify calculation
- [ ] Update to use `calcWinRate(wins, total)` from lib/formulas

**Migration Risk:** Low (isolated service layer)

---

## SITE 2: Trades Router

**File:** `src/server/trpc/routers/trades.ts`

**Current Implementation:**
```typescript
const winRate = Math.round((wins / total) * 100)
```

**Location:** dashboardStats query

**Purpose:** Compute KPIs for trades query response

**Win-Rate Criterion:** Currently calculates `wins / total`, but need to verify HOW wins are counted.

**Code Pattern:**
```typescript
if (total === 0) return { total: 0, wins: 0, losses: 0, be: 0, winRate: 0, ... }
return { total, wins, losses, be, winRate, avgR, netPnl, ... }
```

**Questions:**
- [ ] How are "wins" counted? By `pnl > 0` or by `rMultiple > 0`?
- [ ] Why separate "losses" and "be" (breakeven)?

**Migration Risk:** Medium (used in public API)

---

## SITE 3: Weekly Reviews Router (Calculation 1)

**File:** `src/server/trpc/routers/weekly-reviews.ts` (occurrence 1)

**Current Implementation:**
```typescript
const winRate = tradeCount > 0 ? parseFloat((wins / tradeCount * 100).toFixed(2)) : 0
```

**Purpose:** Prefill review data when creating weekly review

**Win-Rate Criterion:** [TBD — need to check how wins are counted]

**Format:** Decimal with 2 places (e.g., 65.33)

**Migration Risk:** Medium

---

## SITE 4: Weekly Reviews Router (Calculation 2)

**File:** `src/server/trpc/routers/weekly-reviews.ts` (occurrence 2)

**Current Implementation:**
```typescript
const winRate = Math.round(wins / trades.length * 100)
```

**Purpose:** Generate weekly summary text with AI

**Win-Rate Criterion:** [TBD]

**Format:** Rounded integer (e.g., 65)

**Note:** TWO different win-rate calculations in same file — potential inconsistency!

**Migration Risk:** High (potential duplication)

---

## SITE 5: Create Review Modal

**File:** `src/app/reviews/modals/create-review-modal.tsx`

**Current Implementation:** [Display only, calculated server-side]

**Purpose:** Display prefilled win-rate on review creation UI

**Win-Rate Criterion:** Receives from server (see sites 3 & 4)

**Format:** Displayed with 0 decimal places (e.g., 65%)

**Migration Risk:** Low (UI layer — follows server calculation)

---

## SITE 6: Trading Sessions Router

**File:** `src/server/trpc/routers/trading-sessions.ts`

**Current Implementation:**
```typescript
const toRow = (label: string, b: { wins: number; total: number }) => ({
  winRate: b.total > 0 ? parseFloat((b.wins / b.total * 100).toFixed(1)) : null,
  ...
})
```

**Purpose:** Compute win-rate by session (London, New York, Asia)

**Win-Rate Criterion:** [TBD — check how wins aggregated by session]

**Format:** Decimal with 1 place (e.g., 65.1)

**Migration Risk:** Medium

---

## SITE 7: Learning Resources Router

**File:** `src/server/trpc/routers/learning-resources.ts`

**Current Implementation:**
```typescript
winRate: trades.length > 0 ? Math.round((wins / trades.length) * 100) : null,
```

**Purpose:** Compute pre/post win-rate for learning resource effectiveness tracking

**Win-Rate Criterion:** [TBD]

**Format:** Rounded integer or null

**Additional Complexity:**
- Calculates win-rate for trades BEFORE resource was learned (preWR)
- Calculates win-rate for trades AFTER resource was learned (postWR)
- Compares improvement

**Migration Risk:** High (complex logic, may affect learning tracking accuracy)

---

## SITE 8: Use Account Stats Hook

**File:** `src/app/cuentas/hooks/use-account-stats.ts`

**Current Implementation:** [NEEDS VERIFICATION]

**Purpose:** Client-side hook for account statistics

**Win-Rate Criterion:** [TBD]

**Migration Risk:** Medium (client-side, but may do server round-trip)

---

## SITE 9: Trades Page

**File:** `src/app/trades/page.tsx`

**Current Implementation:** [Display only]

**Purpose:** Display win-rate in trades list or header

**Win-Rate Criterion:** [Receives from server]

**Migration Risk:** Low (UI display layer)

---

## AUDIT CHECKLIST

Before implementation, must verify:

- [ ] **Site 1:** Dashboard Analytics — win criterion currently used
- [ ] **Site 2:** Trades Router dashboardStats — how are wins/losses/be counted?
- [ ] **Site 3:** Weekly Reviews prefill — win calculation method
- [ ] **Site 4:** Weekly Reviews summary — win calculation method (DUPLICATE CHECK)
- [ ] **Site 5:** Create Review Modal — display only, follows server
- [ ] **Site 6:** Trading Sessions — session-aggregated win calculation
- [ ] **Site 7:** Learning Resources — pre/post win-rate comparison logic
- [ ] **Site 8:** Use Account Stats — current implementation
- [ ] **Site 9:** Trades Page — display only, follows server

---

## MIGRATION PLAN

### Phase 1: Verification (Pre-Implementation)
1. Read all 9 files completely
2. Document EXACT win criterion in each (pnl > 0? rMultiple > 0? other?)
3. Document current format (0–100? 0–1? rounded? decimal places?)
4. Create master comparison table

### Phase 2: Create Shim (Sprint 1 Week 1)
1. Create `src/lib/formulas/win-rate.ts` with canonical functions
2. Create export shim from `src/lib/formulas/index.ts`
3. Tests pass ✓

### Phase 3: Migrate Sites (Sprint 1 Week 1)

**Dependency Order:**
1. Migrate base functions first (trades.ts, weekly-reviews.ts)
2. Then dependent sites (learning-resources, dashboard-analytics)
3. Finally UI layers (create-review-modal, trades page)

**Test Each Migration:**
- Verify no KPI regression (before vs after numbers match)
- Check on 3+ production accounts
- Verify format consistency (0–100 percentages everywhere)

### Phase 4: Delete Old Code (Sprint 1 Week 2)
1. Remove inline calculations from all 9 sites
2. Remove shim `src/lib/formulas.ts` (if exists)
3. Full regression test on all analytics pages

---

## FORMAT CONSISTENCY REQUIREMENTS

**Decision:** All win-rate output must be 0–100 percentage format.

| Site | Current Format | Target Format | Conversion Needed? |
|---|---|---|---|
| Dashboard Analytics | [TBD] | 0–100 | [TBD] |
| Trades dashboardStats | 0–100 (rounded) | 0–100 (decimal?) | Possibly |
| Weekly Reviews prefill | 0–100 (2 decimals) | 0–100 (decimal) | No |
| Weekly Reviews summary | 0–100 (rounded) | 0–100 (rounded) | Possibly |
| Trading Sessions | 0–100 (1 decimal) | 0–100 (decimal) | No |
| Learning Resources | 0–100 (rounded) or null | 0–100 (rounded) | No |
| Use Account Stats | [TBD] | 0–100 | [TBD] |

**Decision:** Keep decimal precision as-is for now. Focus on criterion unification (pnl > 0).

---

## TESTING STRATEGY

### Unit Tests
- Test `isWin()` with edge cases (pnl=0, pnl=null, rMultiple=large)
- Test `calcWinRate()` with 0 trades, all wins, all losses, mixed

### Integration Tests
- Run migration on staging database
- Compare win-rate output for 5 sample accounts
- Verify no NaN, Infinity, or other edge case values

### Regression Tests
- Dashboard KPI card: before/after comparison
- Weekly review: before/after comparison
- Trading sessions: before/after comparison
- Learning resources: pre/post WR calculation still works

### Manual QA
- Load dashboard with 500+ trades
- Verify KPI numbers reasonable
- Check weekly review creation flow
- Verify learning resource effectiveness tracking

---

## RISK ASSESSMENT

| Site | Risk Level | Reason | Mitigation |
|---|---|---|---|
| Site 1 (Dashboard) | Medium | Central to app, many dependencies | Thorough testing |
| Site 2 (Trades router) | Medium | Public API, backwards compat needed | Feature flag if needed |
| Site 3 (Weekly Reviews prefill) | Low | Isolated, clear logic | Standard testing |
| Site 4 (Weekly Reviews summary) | High | AI integration, text generation | Verify text output unchanged |
| Site 5 (Create Review Modal) | Low | UI display, receives from server | Follows server migration |
| Site 6 (Trading Sessions) | Medium | Session classification, time-based | Verify aggregation logic |
| Site 7 (Learning Resources) | High | Pre/post comparison, affects learning UX | Extensive testing required |
| Site 8 (Use Account Stats) | Medium | Client-side, could have multiple implementations | Verify all paths |
| Site 9 (Trades Page) | Low | Display layer | Follows server |

---

## DEPENDENCIES & BLOCKING

**This audit blocks:**
- Implementation of `isWin()` and `calcWinRate()` functions
- Testing strategy for formula module
- Definition of test cases

**This audit is blocked by:**
- None (audit work is independent)

---

## APPENDIX: WIN CRITERION COMPARISON

**Proposed Canonical (Decision 1.4):** `pnl > 0`

**Alternative Criteria Found in Code:**
- [ ] `rMultiple > 0` — would only count "profitable" R trades, ignore pnl
- [ ] `pnl > 0 AND rMultiple != null` — would exclude trades without R calculation
- [ ] Mixed criteria in different sites — **MUST UNIFY**

**Breakeven Handling:**
- Current: May be treated as win, loss, or breakeven
- Target: Breakeven (pnl = 0) is NOT a win

---

**END OF WINRATE SITES AUDIT**

**Status:** Ready for detailed verification
**Next Step:** Code review of each 9 sites to extract exact win criteria
