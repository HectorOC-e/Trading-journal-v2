# SPRINT 1 ARCHITECTURE REVIEW
> **Critical Analysis: Sprint 1 Implementation Plan vs. Target Architecture**
> Last Updated: 2026-05-31

---

## Executive Summary

**Status: ⚠️ CRITICAL ALIGNMENT ISSUES DETECTED**

Comparing Sprint 1 Implementation Plan against Target Architecture reveals **8 architectural risks**, **5 hidden dependencies**, **3 potential regressions**, and **2 architecture violations**. 

**Recommendation:** Address these issues before implementation begins.

---

## 1. ARCHITECTURAL RISKS

### Risk 1.1: Function Signature Mismatch 🔴 Critical

**Issue:** Inconsistency between planned formula signatures and target-architecture specifications.

**Details:**

| Formula | Sprint 1 Plan | Target Architecture | Status |
|---------|--------------|-------------------|--------|
| Win Rate | `isWin(trade)`, `winRate(trades)` | `isWin(trade)`, `calcWinRate(wins, total)` | ❌ Different signature |
| Drawdown | `drawdown(trades)` returns `{current, max}` | `computeMaxDrawdown(pnlSequence)`, `calcDrawdownPct(maxDd, initBal)` | ❌ Different approach |
| rMultiple | `rMultiple(trade)` | `calcRMultiple(direction, entry, stop, closePrice)` | ❌ Missing parameters |
| Discipline | `computeDisciplineScore(trades, stats)` | `calcDisciplineScore(params: DisciplineParams)` | ⚠️ Interface mismatch |
| Sharpe | `sharpeRatio(trades, rfRate=0)` | `calcSharpeRatio(rMultiples: number[])` | ❌ Input type mismatch |
| Profit Factor | `profitFactor(trades)` | `calcProfitFactor(grossWin, grossLoss)` | ❌ Needs calculation layer |

**Impact:**
- Implementations won't match target-architecture specs
- Refactoring required in Sprint 3+ when profile backend integrates with these formulas
- Type mismatches at call sites

**Mitigation Options:**
1. **Option A:** Follow target-architecture signatures exactly (RECOMMENDED)
2. **Option B:** Create adapter layer; maintain two APIs until migration
3. **Option C:** Ignore target-architecture; plan for Sprint 3+ refactoring

---

### Risk 1.2: Missing Interface Definitions 🔴 Critical

**Issue:** Sprint 1 plan doesn't define TypeScript interfaces required by target-architecture.

**Target-Architecture Requires:**

```typescript
// DisciplineParams interface
export interface DisciplineParams {
  totalTrades:       number
  taggedViolations:  number
  pendingReviews:    number
  completedReviews:  number
  totalEnabledRules: number
  violatedRules:     number
}

export interface DisciplineBreakdown {
  score:          number
  executionScore: number
  learningScore:  number
  adherenceScore: number
}

// Analytics output interface
export interface AnalyticsOutput {
  kpis:            KpiSummary
  equityCurve:     EquityPoint[]
  // ... 10+ more fields
}
```

**Sprint 1 Plan:** No mention of these interfaces.

**Impact:**
- Code created in Sprint 1 won't be compatible with Sprint 3 analytics integration
- Rework needed when Sprint 5 (AI config) depends on analytics structure

**Mitigation:**
- Define all interfaces in Sprint 1 BEFORE implementation
- Create shared `types.ts` in `lib/formulas/`

---

### Risk 1.3: Drawdown Calculation Variant Ambiguity 🟠 High

**Issue:** Plan says "fix drawdown label" and "fix drawdown calculation" but doesn't specify which variant is canonical.

**Current State:** Likely exists as:
- Peak-to-trough drawdown (max decline from any peak)
- Current drawdown (decline from last peak to current)

**Target-Architecture:** Specifies `computeMaxDrawdown(pnlSequence)` but doesn't clarify if it's peak-to-trough or current.

**Plan Mention:** TASK-029 says "Fix inconsistent drawdown calculation in `use-account-stats.ts`" but doesn't specify:
- Which calculation is correct?
- What metric should be displayed to traders?
- Historical data migration strategy?

**Impact:**
- Traders might see metric shifts post-deployment
- Confusion if rollback needed
- Sprint 3 might use wrong formula if not specified

**Mitigation:**
- Document canonical drawdown definition BEFORE implementation
- Create side-by-side comparison test with real account data
- Specify if "max drawdown" or "current drawdown" is displayed

---

### Risk 1.4: Win-Rate Unification Scope Ambiguity 🟠 High

**Issue:** Target-architecture defines 9 win-rate sites, but plan context suggests different number.

**Target-Architecture Duplication Removal Map:**
```
dashboard-analytics.ts:101
trades.ts:736
weekly-reviews.ts:205
weekly-reviews.ts:271
create-review-modal.tsx:99
trading-sessions.ts:94
learning-resources.ts:447
use-account-stats.ts:39
trades/page.tsx:125
```
**Total: 9 sites explicitly listed**

**Sprint 1 Plan:** Mentions "all 9 calculation sites identified and documented" in validation checklist, but provides no explicit list.

**Risk:** Plan doesn't verify if list matches target-architecture.

**Impact:**
- Some sites might be missed during implementation
- Inconsistency persists
- Future sprint dependent on accurate list (Sprint 5 analytics)

**Mitigation:**
- Use target-architecture duplication map as single source of truth
- Cross-reference against actual codebase before starting

---

### Risk 1.5: Analytics Cache Integration Gap 🟠 High

**Issue:** Sprint 1 doesn't touch analytics cache, but target-architecture requires it for KPI aggregation performance.

**From target-architecture:**
```typescript
// src/domains/analytics/services/analytics-cache.ts
// Cache key includes accountId to support per-account filtering
// TTL: 5 minutes enforced at application layer
// Cache invalidation: upsert on every trades.create / trades.close mutation
```

**From Sprint 1 plan:**
- Fixes KPI strip pagination (TASK-001)
- Doesn't mention cache strategy
- No invalidation hooks added

**Problem:** KPI query in TASK-001 could be slow without cache. If cache isn't in place, performance might degrade in production.

**Impact:**
- KPI aggregation query (all trades) could take >1s for accounts with 500+ trades
- Sprint 7 rate limiting (TASK-055) depends on knowing query performance baseline
- Sprint 3 profile backend won't have cached user preferences

**Mitigation:**
- Benchmark KPI query WITHOUT cache first
- If >500ms for 500+ trades, add simple cache layer in Sprint 1
- Plan cache invalidation strategy (on trades.create/close)

---

### Risk 1.6: SQL Injection Fix Method Incompleteness 🟡 Medium

**Issue:** TASK-054 says "fix SQL injection in ai-embed using Prisma.sql" but doesn't address parameterization completeness.

**From Sprint 1 plan:**
```typescript
// Before
SET notes_embedding = ${`[${vector.join(",")}]`}::vector

// After
const vectorJson = JSON.stringify(vector)
SET notes_embedding = ${vectorJson}::vector
```

**Problem:** Converting vector array to JSON string loses type safety. The `::vector` cast might fail if JSON format doesn't match PostgreSQL vector format.

**Target-Architecture:** Mentions "Prisma.sql" but plan code uses template literal substitution, which might still be vulnerable.

**Better approach:** Use Prisma's native upsert or update-with-types rather than raw SQL.

**Impact:**
- Embedding might fail silently
- Regression in embedding functionality
- Rollback required if vector format mismatch

**Mitigation:**
- Test embedding with real notes before deployment
- Compare old (vulnerable) vs. new approach side-by-side
- Use Prisma native methods if available (no raw SQL needed)

---

### Risk 1.7: Feature Flag System Not in Target-Architecture 🟡 Medium

**Issue:** Sprint 1 plan proposes feature flags for gradual formula rollout, but target-architecture doesn't mention them.

**From Sprint 1 plan:**
```typescript
export const USE_CENTRALIZED_FORMULAS = process.env.USE_CENTRALIZED_FORMULAS === 'true'

if (USE_CENTRALIZED_FORMULAS) {
  return calculateWithNewFormulas(trades)
} else {
  return calculateWithLegacy(trades)
}
```

**From target-architecture:** No mention of feature flags; assumes clean cutover.

**Incompatibility:**
- Feature flags add complexity (two code paths to maintain)
- Target-architecture values "single source of truth"
- Flag increases test matrix

**Impact:**
- More code to test
- Potential for bugs in legacy path
- Technical debt post-deployment

**Mitigation:**
- Either commit to feature flags throughout architecture OR
- Plan clean cutover without flags (higher risk but simpler)

---

## 2. HIDDEN DEPENDENCIES

### Dependency 2.1: KPI Aggregation Query Performance 🔴 Critical

**Chain:**
```
TASK-001 (Fix KPI pagination) 
  ↓ Requires fast aggregation
TASK-009 (Fix weekTrades)
  ↓ Depends on query performance
SPRINT 3: Analytics service (analytics-service.ts)
  ↓ Depends on aggregation performance
SPRINT 5: Sharpe Ratio display (TASK-062)
  ↓ Needs fast metrics query
SPRINT 6: Rolling metrics (TASK-073)
SPRINT 7: Rate limiting (TASK-055)
  ↓ Depends on knowing cost per query
SPRINT 9: Portfolio dashboard (TASK-053)
  ↓ Depends on multi-account aggregation
```

**Hidden Requirement:** Unless query performance is <1s for all accounts, entire analytics pipeline (Sprints 3–9) becomes bottleneck.

**Sprint 1 Missing:** No performance baseline measurement or optimization strategy beyond "expect <1s".

**Mitigation:**
- Add performance benchmark in Sprint 1 validation
- If query >1s, add database index on (userId, closedAt) before moving forward
- Document query explain plan

---

### Dependency 2.2: Domain Services Layer Prerequisite 🟡 Medium

**Chain:**
```
TASK-027 (Formulas module)
  ↓ Used by formulas/index.ts (pure functions)
TASK-006 Sprint 3 (Profile backend — tRPC router)
  ↓ Calls domain services
Domain services (Coach, Analytics, Embedding — target-architecture)
  ↓ Need to call lib/formulas/
TASK-033 Sprint 5 (AI config)
  ↓ Needs coach-service which needs lib/formulas/
```

**Issue:** Target-architecture shows domain services calling formulas, but Sprint 1 doesn't create domain services. Sprint 3 profile backend will call services that don't exist.

**Impact:** Sprint 3 profile backend can't be completed without domain services, OR domain services have to be created outside of Sprint roadmap.

**Current Plan:** Domain services mentioned in TASK-065 Sprint 8 (extract coach-service.ts), but profile backend (TASK-006) in Sprint 3 depends on them.

**Mitigation:**
- Move domain service extraction earlier (Sprint 2 or 3)
- OR create stub services in Sprint 1 for profile to depend on
- Document service interfaces now, implement later

---

### Dependency 2.3: Per-User AI Configuration Schema 🟠 High

**Chain:**
```
TASK-027 (Formulas module)
  ↓ References AI_MODELS in target-architecture
TASK-015 (Update AI model IDs — part of Sprint 2, not Sprint 1)
  ↓ Populates model registry
TASK-033 Sprint 5 (AI config UI)
  ↓ Needs UserAiConfig table
AI resolution function (target-architecture: resolveModel())
  ↓ Depends on UserAiConfig existing
TASK-065 Sprint 8 (coach-service extraction)
  ↓ Calls resolveModel()
```

**Issue:** Formulas module created in Sprint 1 might need to reference AI models for feature routing (target-architecture shows `resolveModel()` function in `lib/ai/models.ts`). But UserAiConfig isn't created until Sprint 5.

**Impact:** If formulas need AI model info, Sprint 1 creates a circular dependency.

**Mitigation:**
- Formulas module must NOT depend on UserAiConfig or AI config
- AI model routing deferred to domain services (created later)
- Keep formulas purely mathematical

---

### Dependency 2.4: Discipline Score Data Requirements 🟡 Medium

**Chain:**
```
TASK-027 (Formula: calcDisciplineScore)
  ↓ Needs DisciplineParams (totalTrades, taggedViolations, pendingReviews, completedReviews, etc.)
Data source: Learning resources stats, rule violations
  ↓ Are these fields available in DB now?
TASK-011 Sprint 3 (Extract computeDisciplineScore as shared function)
  ↓ Depends on formula existing AND data being available
TASK-063 Sprint 6 (Psychology widget in review)
  ↓ Displays discipline score
```

**Issue:** Does the database have all fields needed for DisciplineParams now? If not, schema migrations needed.

**Target-Architecture:** References fields but doesn't confirm they exist:
```typescript
taggedViolations:  number   // trades with behavioral tags
pendingReviews:    number   // learning resources due for SRS review
```

**Current State Unknown:** Plan doesn't audit if these fields exist in DB.

**Mitigation:**
- Audit Trade and LearningResource schema for required fields
- Create migration if missing (e.g., `behavioralTags` field)
- Don't implement formula without data availability

---

### Dependency 2.5: TypeScript Generation After Schema Changes 🟡 Medium

**Chain:**
```
TASK-029 (Fix drawdown calculation)
  ↓ Might need Trade model update
Any schema migration
  ↓ Requires
prisma generate
  ↓ Updates src/generated/prisma-client.d.ts
  ↓ Might break type checking if executed from wrong directory
TASK-054 (SQL injection fix)
  ↓ Changes Prisma.$executeRaw syntax
TASK-017 (Upload validation)
  ↓ Might add schema fields
```

**Issue:** From prior EXECUTION_TASKS.md: "Prisma generate path issue: Must run from `/home/user/Trading-journal-v2/src` (not root)". Sprint 1 has multiple schema touch points but doesn't document generation workflow.

**Impact:** Type mismatches if prisma generate runs at wrong path.

**Mitigation:**
- Document prisma generation step in CI/CD
- Run from repo root with `--schema=src/prisma/schema.prisma` flag
- Validate types before each PR merge

---

## 3. POSSIBLE REGRESSIONS

### Regression 3.1: Win-Rate Metric Shifts Under Load 🔴 Critical

**Scenario:** If even one of 9 win-rate sites uses different criterion (e.g., `rMultiple > 0` instead of `pnl > 0`), unification causes visible metric change.

**Example:**
- Site 1–8: Use `pnl > 0`
- Site 9 (trades/page.tsx:125): Uses `rMultiple > 0` (from target-architecture note)
- Unification to single criterion causes trades to move between "win" and "loss" category
- Traders see metric shift even if formula is correct

**Test Coverage Gap:** Plan says "compare old vs. new; expect <1% variance" but doesn't account for sites with different criteria.

**Mitigation:**
- Audit each of 9 sites BEFORE implementation
- Document current criterion at each site
- If variance >1%, decide which criterion is truly canonical
- Communicate metric changes to traders

---

### Regression 3.2: Drawdown Display Format Change 🟠 High

**Scenario:** Current drawdown might be displayed as:
- Percentage (75%)
- Decimal (0.75)
- Dollar amount ($1500)

Unification to single formula might change format, confusing traders.

**Example:**
- Before: "Drawdown: $5,000 (25%)"
- After: "Drawdown: 25%"
- Trader doesn't see dollar amount anymore

**Plan:** Says "fix label" (TASK-028) but doesn't specify new format.

**Mitigation:**
- Decide new format NOW (before implementation)
- Mock-up new KPI strip with traders to verify
- Include format in acceptance criteria

---

### Regression 3.3: CSV Import rMultiple Calculation Logic 🟡 Medium

**Scenario:** TASK-004 adds rMultiple calculation to CSV import, but current formula vs. target formula might differ.

**Current:** Unknown (plan doesn't specify)
**Target:** `calcRMultiple(direction, entry, stop, closePrice)`

**Risk:** If formula changes, historical import data becomes inconsistent:
- Old imports: rMultiple calculated with old method
- New imports: rMultiple calculated with new method
- Same trade setup produces different rMultiple

**Mitigation:**
- Document current rMultiple logic
- Plan batch recalculation of historical trades
- Add migration to recompute rMultiple for all trades

---

## 4. ARCHITECTURE VIOLATIONS

### Violation 4.1: Formulas Module Type Safety 🔴 Critical

**Target-Architecture Principle:** "Every formula, every enum, every type has one canonical location. Duplication is a bug."

**Sprint 1 Plan Issue:** Creates formulas in `lib/formulas/` with functions like:

```typescript
export function calcWinRate(wins: number, total: number): number {
  return total > 0 ? (wins / total) * 100 : 0
}
```

But doesn't define types for inputs/outputs:
```typescript
// MISSING in plan
export interface WinRateOutput {
  percentage: number
  rawValue: number // 0–1
  interpretation: string
}
```

**Target-Architecture Requirement:** All types must be explicit and documented.

**Violation:** Implicit types (number, string, null) violate "single source of truth" principle.

**Mitigation:**
- Define TypeScript interfaces for ALL formula inputs/outputs
- Create `lib/formulas/types.ts`
- Document whether percentages are 0–100 or 0–1

---

### Violation 4.2: Analytics Service Integration Point Missing 🔴 Critical

**Target-Architecture Requirement:** Domain services own business logic. Routers call services.

```typescript
// Expected architecture (target-architecture.md section 3.2)
src/server/trpc/routers/analytics.ts
  ↓ calls
src/domains/analytics/services/analytics-service.ts
  ↓ calls
src/lib/formulas/
```

**Sprint 1 Implementation:** Plan assumes direct calls from routers to formulas:

```typescript
// Incorrect integration (not following target-architecture)
src/server/trpc/routers/analytics.ts
  ↓ directly calls (WRONG)
src/lib/formulas/calcWinRate()
```

**Missing:** `src/domains/analytics/services/analytics-service.ts` class that wraps formulas.

**Violation:** Skips the domain service layer, creating tight coupling between routers and formulas.

**Impact:**
- When analytics service added in Sprint 5, code needs refactoring
- Violates target-architecture design principle
- Makes analytics logic harder to test independently

**Mitigation:**
- Create stub `analytics-service.ts` in Sprint 1
- Route all aggregation calls through service (even if it just calls formulas for now)
- Ensures Sprint 5 enhancement fits naturally

---

## 5. HIDDEN ARCHITECTURAL ASSUMPTIONS

### Assumption 5.1: KPI Strip Aggregation Method

**Target-Architecture:** States "no client-side KPI computation over unbounded data arrays. All aggregation happens in `domains/analytics/`"

**Sprint 1 Plan:** Doesn't specify whether aggregation happens in:
1. tRPC router (accounts.ts, analytics.ts)?
2. Domain service (analytics-service.ts)?
3. Prisma query (group-by aggregation)?
4. Application layer (in-memory calculation)?

**Risk:** If aggregation method chosen in Sprint 1 doesn't align with target-architecture, Sprint 3+ refactoring needed.

**Mitigation:**
- Specify aggregation location in Sprint 1 design
- Align with target-architecture's `domains/analytics/services/` pattern

---

### Assumption 5.2: Error Handling for Edge Cases

**Sprint 1 Plan Mentions:**
- Empty array → 0 (for win rate)
- Missing data → 0 (for Sharpe)
- Division by zero → handled

**Target-Architecture:** States "graceful degradation" but doesn't specify error behavior for:
- Trades with NULL pnl → should isWin(trade) return false?
- Trades with missing stop price → should calcRMultiple return null or 0?
- Accounts with no trades → should KPI return 0 or be hidden?

**Risk:** Different implementations at different sites cause inconsistency.

**Mitigation:**
- Document error handling spec for all 8 formulas
- Create test cases for edge cases
- Ensure all 9 call sites behave consistently

---

## 6. RECOMMENDATIONS BEFORE IMPLEMENTATION

### 6.1 Critical Path

1. **Define Formula Function Signatures** (Complete before any code)
   - Cross-reference Sprint 1 plan against target-architecture section 3.1
   - Align on exact function names, parameters, return types
   - Document in `SPRINT_1_FORMULA_SPEC.md`

2. **Audit Data Availability**
   - Verify all fields needed by discipline score formula exist in DB
   - Check if schema migrations needed
   - Document findings

3. **Measure KPI Query Performance Baseline**
   - Query current KPI calculation on test accounts (10, 100, 500+ trades)
   - Document: <100ms? >1s? >5s?
   - If >500ms, plan index addition

4. **Audit All 9 Win-Rate Sites**
   - Document current criterion at each site
   - Create side-by-side comparison test
   - Identify any outliers (e.g., rMultiple > 0)

5. **Document Drawdown Variant**
   - Decide: peak-to-trough or current?
   - Specify formula exactly
   - Define display format

6. **Design Analytics Service Stub**
   - Create `domains/analytics/services/analytics-service.ts` stub
   - Define interface that Sprint 5 will implement
   - Ensure Sprint 1 formulas fit into this service

---

### 6.2 Lower Priority But Important

7. **Create Shared Types File**
   - `lib/formulas/types.ts` with all interfaces
   - Export DisciplineParams, WinRateOutput, etc.

8. **Plan Feature Flag Strategy**
   - Decide: gradual rollout OR clean cutover?
   - Document in architecture decision log

9. **Design Cache Strategy**
   - If KPI query >500ms, plan simple cache (2-5 min TTL)
   - Plan invalidation on trades.create/close

10. **Document Prisma Generation Workflow**
    - Clarify working directory (root vs src)
    - Add to CI/CD

---

## 7. INTERACTIVE SURVEY: RESOLUTION STRATEGY

Based on identified risks, answer these questions to guide implementation adjustments:

**[Survey will follow below]**

---

## APPENDIX A: Risk Summary Matrix

| Risk ID | Title | Severity | Category | Status |
|---------|-------|----------|----------|--------|
| 1.1 | Function Signature Mismatch | 🔴 Critical | Architecture | Needs resolution |
| 1.2 | Missing Interface Definitions | 🔴 Critical | Architecture | Needs resolution |
| 1.3 | Drawdown Variant Ambiguity | 🟠 High | Design | Needs decision |
| 1.4 | Win-Rate Scope Ambiguity | 🟠 High | Design | Needs audit |
| 1.5 | Analytics Cache Gap | 🟠 High | Performance | Needs evaluation |
| 1.6 | SQL Injection Fix Incompleteness | 🟡 Medium | Security | Needs review |
| 1.7 | Feature Flag Incompatibility | 🟡 Medium | Architecture | Needs decision |
| 2.1 | KPI Query Performance Dependency | 🔴 Critical | Performance | Needs baseline |
| 2.2 | Domain Services Prerequisite | 🟡 Medium | Architecture | Needs roadmap adjustment |
| 2.3 | AI Config Schema Dependency | 🟠 High | Architecture | Needs isolation |
| 2.4 | Discipline Score Data Requirements | 🟡 Medium | Data | Needs audit |
| 2.5 | TypeScript Generation Workflow | 🟡 Medium | Process | Needs documentation |
| 3.1 | Win-Rate Metric Shift Under Load | 🔴 Critical | Regression | Needs audit |
| 3.2 | Drawdown Format Change | 🟠 High | Regression | Needs decision |
| 3.3 | CSV Import rMultiple Inconsistency | 🟡 Medium | Regression | Needs migration plan |
| 4.1 | Formulas Type Safety Violation | 🔴 Critical | Architecture | Needs interface definitions |
| 4.2 | Analytics Service Integration Gap | 🔴 Critical | Architecture | Needs stub service |

**Total Risks: 16**
- 🔴 Critical: 7
- 🟠 High: 4
- 🟡 Medium: 5

---

*End of SPRINT_1_ARCHITECTURE_REVIEW.md*

**Status:** PENDING INTERACTIVE RESOLUTION (See Section 7 below)

