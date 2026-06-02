# SPRINT 1 IMPLEMENTATION PLAN
> **P0 Security & Data Integrity**
> Detailed execution blueprint for Sprint 1 (Weeks 1–2)
> Source: CANONICAL_EXECUTION_PLAN.md + SPRINT_MASTER_PLAN.md
> Last Updated: 2026-05-31

---

## 1. OBJECTIVES

### 1.1 Technical Objectives
1. **Centralize financial formulas** → Create `lib/formulas/` module with 100% test coverage
2. **Unify win-rate criterion** → Ensure all 9 calculation sites use canonical `pnl > 0` criterion
3. **Fix data correctness bugs** → KPI strip, weekTrades, account stats must aggregate over ALL trades, not paginated subset
4. **Eliminate SQL injection** → Parameterize all raw SQL queries using `Prisma.sql`
5. **Harden security baseline** → CRON_SECRET validation, server-side upload validation, proper error types
6. **Establish formula extraction pattern** → Enable TASK-011 (computeDisciplineScore) in Sprint 3

### 1.2 Business Objectives
- **Restore trader confidence** → Metrics displayed on dashboard are now accurate and consistent
- **Stop data bleeding** → No more metric inconsistencies across pages (KPI strip ≠ Win Rate counter)
- **Establish security foundation** → API endpoints protected against injection attacks
- **Enable feature velocity** → Formula module unblocks Sprint 3 profile backend and all downstream personalization
- **Reduce technical debt** → Centralized formulas make future enhancements 50% faster

---

## 2. ARCHITECTURE AFFECTED

### 2.1 Core Modules Modified

#### A. Financial Formula Layer (NEW)
**Location:** `src/lib/formulas/`

**Purpose:** Single source of truth for all financial calculations.

**Components to create:**
```
lib/formulas/
├── index.ts                    # Main export; re-exports all functions
├── win-rate.ts                 # winRate(trades), isWin(trade)
├── drawdown.ts                 # drawdown(trades), maxDrawdown, currentDD
├── profitFactor.ts             # profitFactor(trades)
├── riskRewardRatio.ts          # riskRewardRatio(trade)
├── rMultiple.ts                # rMultiple(trade)
├── sharpeRatio.ts              # sharpeRatio(trades, rfRate=0)
├── disciplineScore.ts          # computeDisciplineScore(trades, stats)
└── __tests__/
    ├── win-rate.test.ts
    ├── drawdown.test.ts
    ├── profitFactor.test.ts
    ├── riskRewardRatio.test.ts
    ├── rMultiple.test.ts
    ├── sharpeRatio.test.ts
    └── disciplineScore.test.ts
```

**Interfaces:**
```typescript
// lib/formulas/index.ts
export interface Trade {
  id: string
  entryPrice: number
  exitPrice: number
  quantity: number
  pnl: number
  rMultiple?: number
  setup?: string
  createdAt: Date
}

export interface CalculationContext {
  baseCurrency: string
  riskFreeRate: number
  tradingDays: number
}

export function isWin(trade: Trade): boolean
export function winRate(trades: Trade[]): number
export function drawdown(trades: Trade[]): { current: number; max: number }
// ... etc
```

#### B. API Route Handlers (Modified)
- `src/app/api/ai-embed/route.ts` — SQL injection fix (TASK-054)
- `src/app/api/accounts/[id]/route.ts` — Error type fix (TASK-003)
- `src/app/api/trades/import/route.ts` — rMultiple calculation (TASK-004)

#### C. tRPC Routers (Modified)
- `src/server/routers/accounts.ts` — Hardcode objectiveMet fix (TASK-002)
- `src/server/routers/analytics.ts` — KPI strip pagination fix (TASK-001, TASK-009)
- `src/server/routers/ai-coach.ts` — Error message alignment (TASK-026)

#### D. Frontend Components (Modified)
- `src/app/dashboard/page.tsx` — KPI strip uses unified formulas (TASK-001)
- `src/components/KpiStrip.tsx` — Drawdown label accuracy (TASK-028)
- `src/hooks/use-account-stats.ts` — Drawdown calculation fix (TASK-029)

#### E. Database (No Schema Changes)
No Prisma schema migrations needed for Sprint 1. All calculations are business logic, not storage changes.

### 2.2 Dependency Graph

```
TASK-027 (formulas module creation)
├── TASK-005 (win-rate unification)
├── TASK-028 (drawdown label)
├── TASK-029 (drawdown calculation)
└── TASK-004 (rMultiple in import)

TASK-001 (KPI strip fix)
└── Depends on TASK-027 indirectly (uses new formulas)

TASK-009 (weekTrades fix)
└── Independent (pagination issue)

TASK-002 (objectiveMet)
└── Independent

TASK-016 (CRON_SECRET)
└── Independent

TASK-017 (upload validation)
└── Independent

TASK-054 (SQL injection)
└── Independent

TASK-003 (TRPCError)
└── Independent

TASK-026 (error message)
└── Independent
```

---

## 3. FILES POTENTIALLY AFFECTED

### 3.1 Files Created (New)
```
src/lib/formulas/
├── index.ts
├── win-rate.ts
├── drawdown.ts
├── profitFactor.ts
├── riskRewardRatio.ts
├── rMultiple.ts
├── sharpeRatio.ts
├── disciplineScore.ts
└── __tests__/
    ├── win-rate.test.ts
    ├── drawdown.test.ts
    ├── profitFactor.test.ts
    ├── riskRewardRatio.test.ts
    ├── rMultiple.test.ts
    ├── sharpeRatio.test.ts
    └── disciplineScore.test.ts
```

### 3.2 Files Modified

#### Backend (14 files)
```
src/server/routers/
├── accounts.ts                 # TASK-002: Fix objectiveMet hardcode
├── analytics.ts                # TASK-001, TASK-009: Fix KPI strip & weekTrades pagination
├── trades.ts                   # TASK-004: Add rMultiple to import
└── ai-coach.ts                 # TASK-026: Fix error message mismatch

src/app/api/
├── ai-embed/route.ts          # TASK-054: Fix SQL injection (Prisma.sql)
├── accounts/[id]/route.ts      # TASK-003: Use TRPCError instead of Error()
└── trades/import/route.ts      # rMultiple calculation (if different from router)

src/hooks/
└── use-account-stats.ts        # TASK-029: Fix drawdown calculation

src/lib/
└── formulas/index.ts           # TASK-027: New module (created above)

src/components/
├── KpiStrip.tsx                # TASK-028: Drawdown label accuracy
└── AccountDetailPanel.tsx       # If KPI strip is a sub-component

src/utils/ or src/lib/
└── (any shared calculation utils that move to lib/formulas/)
```

#### Frontend (3 files)
```
src/app/dashboard/page.tsx      # TASK-001: Use centralized formulas for KPI strip
src/components/KpiStrip.tsx     # TASK-028: Label "Drawdown" accuracy
src/hooks/use-account-stats.ts  # TASK-029: Use centralized drawdown formula
```

#### Edge Functions (2 files)
```
src/edge-functions/cron.ts      # TASK-016: Harden CRON_SECRET validation
(or wherever cron edge function is defined)
```

#### Validation & Security (2 files)
```
src/lib/storage-validation.ts   # TASK-017: Server-side image upload validation (NEW)
src/server/routers/storage.ts   # If storage router exists; TASK-017 integration
```

### 3.3 Test Files to Create/Modify

#### New Test Files
```
src/lib/formulas/__tests__/
├── win-rate.test.ts            # 10+ test cases
├── drawdown.test.ts            # 8+ test cases
├── profitFactor.test.ts        # 6+ test cases
├── riskRewardRatio.test.ts      # 6+ test cases
├── rMultiple.test.ts           # 6+ test cases
├── sharpeRatio.test.ts         # 8+ test cases
└── disciplineScore.test.ts      # 6+ test cases (moved from accounts.test.ts)

src/server/routers/__tests__/
├── accounts.test.ts            # Add test for objectiveMet fix (if not exists)
├── analytics.test.ts           # Add test for KPI strip pagination fix
└── ai-coach.test.ts            # Add test for error message alignment
```

#### Modified Test Files
```
src/app/api/__tests__/
├── ai-embed.test.ts            # TASK-054: Test SQL injection fix
└── accounts.test.ts            # TASK-003: Test TRPCError usage
```

### 3.4 Configuration Files (Possibly Modified)

```
.eslintrc.json                  # If adding formula-validation rules
jest.config.js                  # If adding formula test suite
tsconfig.json                   # If adding new path aliases for lib/formulas
```

---

## 4. MIGRATION STRATEGY

### 4.1 Phase 1: Formula Module Foundation (Days 1–2, ~4h)

**Task:** TASK-027 — Centralize financial formulas

**Steps:**

1. **Create directory structure**
   ```bash
   mkdir -p src/lib/formulas/__tests__
   ```

2. **Extract existing formulas from codebase**
   - Audit 9 calculation sites identified in TASK-005
   - Document current implementation for each site
   - Create compatibility matrix (current behavior vs. canonical behavior)

3. **Implement formula functions in `lib/formulas/`**
   ```typescript
   // src/lib/formulas/win-rate.ts
   export function isWin(trade: Trade): boolean {
     return trade.pnl > 0  // Canonical criterion
   }
   
   export function winRate(trades: Trade[]): number {
     const wins = trades.filter(isWin).length
     return wins / trades.length
   }
   ```

4. **Create comprehensive unit tests**
   - Test edge cases (0 trades, all wins, all losses, breakeven trades)
   - Test with different trade sizes, currencies
   - Compare against legacy calculations (side-by-side validation)

5. **Add type definitions**
   ```typescript
   // src/lib/formulas/types.ts
   export interface Trade {
     id: string
     entryPrice: number
     exitPrice: number
     quantity: number
     pnl: number
     rMultiple?: number
   }
   ```

**Acceptance:** 
- ✅ `lib/formulas/` directory exists with 8 formula files
- ✅ All formula functions have JSDoc comments
- ✅ Unit tests pass (90%+ coverage)
- ✅ No console errors during build

---

### 4.2 Phase 2: Unify Win Criterion & Fix Drawdown (Days 2–3, ~2h)

**Tasks:** TASK-005, TASK-028, TASK-029

**Steps:**

1. **Identify 9 win-rate calculation sites**
   - Dashboard KPI strip
   - Win Rate counter in account detail
   - Playbook setup statistics
   - CSV import win-rate summary
   - Weekly review win-rate summary
   - Account stats endpoint
   - Analytics dashboard
   - Trade list filter/aggregation
   - (9th site: TBD during implementation)

2. **Audit each site for current criterion**
   - Document: `pnl > 0`, `pnl >= 0`, `rMultiple > 0`, or other
   - Create decision matrix

3. **Apply unified criterion**
   - Update imports to use `isWin()` from `lib/formulas/win-rate.ts`
   - Remove inline calculations
   - Example:
     ```typescript
     // Before
     const wins = trades.filter(t => t.pnl > 0).length
     
     // After
     import { isWin } from '@/lib/formulas'
     const wins = trades.filter(isWin).length
     ```

4. **Fix drawdown calculations**
   - Replace dual implementations in `use-account-stats.ts` with `lib/formulas/drawdown.ts`
   - Fix KpiStrip label from "Drawdown %" to correct label (peak-to-trough vs. current)
   - Document which drawdown variant is canonical

5. **Test changes**
   - Compare before/after metrics for 3+ test accounts
   - Verify win rate changes are minimal (expect <1% variance)

**Acceptance:**
- ✅ All 9 sites unified to canonical criterion
- ✅ Win-rate calculations consistent across pages
- ✅ Drawdown label accurate
- ✅ Drawdown formula applied consistently
- ✅ No regressions in existing tests

---

### 4.3 Phase 3: Fix Analytics Data Correctness (Days 3–4, ~4h)

**Tasks:** TASK-001, TASK-009

**Steps:**

1. **Identify pagination issue in KPI strip**
   - Locate query in `src/server/routers/analytics.ts` or similar
   - Determine current behavior (pagination limit, skip offset)
   - Understand why paginated subset is used

2. **Fix KPI strip calculation**
   - Ensure query aggregates over ALL trades, not current page only
   - Remove pagination limit from KPI aggregation query
   - Keep pagination for UI trade table (different query)
   ```typescript
   // Before: Calculates KPI from paginated trades (page 1, 10 trades)
   const kpi = calculateKpi(trades.slice(0, 10))
   
   // After: Calculates KPI from ALL trades
   const allTrades = await fetchAllTrades(userId)
   const kpi = calculateKpi(allTrades)
   ```

3. **Fix weekTrades and account stats**
   - Separate "trades to display" from "trades to aggregate"
   - Ensure stats always use full dataset
   - Keep UI pagination for performance

4. **Test changes**
   - Verify KPI strip matches manual calculation
   - Test with accounts having >100 trades
   - Ensure no performance regression (use DB indexing if needed)

5. **Fix objectiveMet hardcoded value**
   - Locate hardcoded `false` in phase promotion logic
   - Replace with actual calculation
   - Verify account progression logic

**Acceptance:**
- ✅ KPI strip aggregates over ALL trades
- ✅ Win Rate matches across dashboard pages
- ✅ Account stats based on all data
- ✅ Performance acceptable (<1s query time)

---

### 4.4 Phase 4: Security Hardening (Days 4–5, ~3.5h)

**Tasks:** TASK-054, TASK-016, TASK-017, TASK-003

**Steps:**

1. **Fix SQL Injection in ai-embed (TASK-054)**
   - Locate raw SQL in `src/app/api/ai-embed/route.ts`
   - Replace string interpolation with `Prisma.sql`
   ```typescript
   // Before (VULNERABLE)
   await prisma.$executeRaw`
     UPDATE trades
     SET notes_embedding = ${`[${vector.join(",")}]`}::vector
   `
   
   // After (SAFE)
   const vectorJson = JSON.stringify(vector)
   await prisma.$executeRaw`
     UPDATE trades
     SET notes_embedding = ${vectorJson}::vector
   `
   ```

2. **Harden CRON_SECRET validation (TASK-016)**
   - Locate edge function that validates CRON_SECRET
   - Strengthen validation: constant-time comparison
   ```typescript
   // Before
   if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
     return new Response('Unauthorized')
   }
   
   // After
   const crypto = await import('crypto')
   const expected = process.env.CRON_SECRET || ''
   const received = req.headers['x-cron-secret'] || ''
   const isValid = crypto.timingSafeEqual(
     Buffer.from(expected),
     Buffer.from(received)
   )
   if (!isValid) return new Response('Unauthorized', { status: 401 })
   ```

3. **Server-side upload validation (TASK-017)**
   - Create `src/lib/storage-validation.ts` with file validation functions
   - Check: file size, MIME type, extension
   - Block: executable files, oversized uploads
   ```typescript
   // src/lib/storage-validation.ts
   export function validateUpload(file: File): { valid: boolean; error?: string } {
     const MAX_SIZE = 5 * 1024 * 1024 // 5MB
     const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
     
     if (file.size > MAX_SIZE) return { valid: false, error: 'File too large' }
     if (!ALLOWED_TYPES.includes(file.type)) return { valid: false, error: 'Invalid type' }
     return { valid: true }
   }
   ```

4. **Use TRPCError in accounts router (TASK-003)**
   - Replace `throw new Error()` with `new TRPCError({ code: '...', message: '...' })`
   ```typescript
   // Before
   if (!user) throw new Error('Unauthorized')
   
   // After
   import { TRPCError } from '@trpc/server'
   if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })
   ```

**Acceptance:**
- ✅ No SQL injection patterns in raw queries
- ✅ CRON_SECRET uses constant-time comparison
- ✅ Upload validation checks file type, size
- ✅ All errors use TRPCError type
- ✅ Security tests pass

---

### 4.5 Phase 5: Data Import & Code Cleanup (Days 5–6, ~1h)

**Tasks:** TASK-004, TASK-026

**Steps:**

1. **Calculate rMultiple in CSV import (TASK-004)**
   - Locate import handler (likely `src/app/api/trades/import/route.ts`)
   - Add rMultiple calculation if missing
   ```typescript
   // For each imported trade
   const rMultiple = calculateRMultiple(trade)
   trade.rMultiple = rMultiple
   ```

2. **Fix error message mismatch (TASK-026)**
   - Locate `src/server/routers/ai-coach/route.ts:106`
   - Find mismatched error message
   - Align with expected error context
   ```typescript
   // Ensure error message accurately describes failure
   ```

**Acceptance:**
- ✅ CSV import includes rMultiple in all records
- ✅ Error message at line 106 matches behavior

---

### 4.6 Phase 6: Integration & Regression Testing (Days 6–10, ~6h)

**Steps:**

1. **Side-by-side calculation validation**
   - For 3+ test accounts, compare old calculations vs. new
   - Document any variance (expect <1% for most metrics)
   - Flag anomalies

2. **Run full test suite**
   ```bash
   npm run test                    # All tests
   npm run typecheck               # TypeScript check
   npm run lint                    # Linting
   ```

3. **Manual QA on staging**
   - Load dashboard with various accounts
   - Verify KPI strip, Win Rate, Drawdown
   - Test CSV import
   - Verify security fixes (test upload limits, CRON validation)

4. **Performance testing**
   - Measure KPI aggregation query time
   - Measure formula calculation time
   - Ensure <1s latency for all queries

5. **Database consistency check**
   - No schema changes needed
   - Verify no orphaned data

**Acceptance:**
- ✅ All tests passing
- ✅ TypeScript check clean
- ✅ No regressions in existing features
- ✅ Manual QA sign-off
- ✅ Performance acceptable

---

## 5. ROLLBACK STRATEGY

### 5.1 Pre-Deployment Safeguards

1. **Feature flags for gradual rollout**
   - Wrap formula module usage in feature flag (default: OFF in production initially)
   - Allow canary rollout to 10% → 50% → 100% of users
   ```typescript
   // src/lib/feature-flags.ts
   export const USE_CENTRALIZED_FORMULAS = process.env.USE_CENTRALIZED_FORMULAS === 'true'
   
   // Usage
   if (USE_CENTRALIZED_FORMULAS) {
     return calculateWithNewFormulas(trades)
   } else {
     return calculateWithLegacy(trades)
   }
   ```

2. **Database snapshots**
   - Create pre-deployment snapshot of production database
   - Ensure backup exists before applying any changes
   ```bash
   # Supabase: Create manual backup
   supabase db backup create --project-id <project-id>
   ```

3. **Git tagging**
   - Tag Sprint 1 completion commit: `sprint-1-complete-2026-05-31`
   - Tag pre-deployment: `pre-sprint1-deployment`
   - Allows quick rollback via git revert

### 5.2 Rollback Procedure (If Issues Occur)

#### Scenario A: Formula Module Causes Regressions
**Time to Rollback:** <5 minutes

1. **Disable feature flag**
   ```bash
   # .env.production
   USE_CENTRALIZED_FORMULAS=false
   ```

2. **Redeploy**
   ```bash
   npm run build && npm run deploy
   ```

3. **Monitor dashboards**
   - Verify metrics return to previous values
   - Check error rates

#### Scenario B: Security Fix Breaks API
**Time to Rollback:** <10 minutes

1. **Revert specific commits**
   ```bash
   git revert <commit-hash>  # Revert TASK-054, TASK-016, TASK-017
   git push origin main
   ```

2. **Redeploy**
   ```bash
   npm run deploy
   ```

#### Scenario C: SQL Injection Fix Breaks Embedding
**Time to Rollback:** <5 minutes

1. **Revert ai-embed route**
   ```bash
   git checkout main -- src/app/api/ai-embed/route.ts
   ```

2. **Commit revert**
   ```bash
   git commit -m "Revert TASK-054: SQL injection fix causing embedding failures"
   ```

3. **Investigate separately**
   - Run embedding tests locally
   - Fix vector serialization issue

### 5.3 Rollback Checklist

- [ ] Feature flag disabled (if applicable)
- [ ] Pre-deployment commit tagged
- [ ] Database restored to snapshot (if needed)
- [ ] Services redeployed
- [ ] Error rates monitored (0 increase)
- [ ] Metrics verified against baseline
- [ ] Team notified of rollback reason
- [ ] Post-mortem scheduled

---

## 6. TEST STRATEGY

### 6.1 Unit Tests (Formula Module)

**Test Framework:** Jest + TypeScript

**Coverage Target:** 90%+

#### Test Cases for `lib/formulas/win-rate.ts`

```typescript
describe('lib/formulas/win-rate', () => {
  const trade = (pnl: number): Trade => ({
    id: `trade-${Math.random()}`,
    entryPrice: 100,
    exitPrice: pnl > 0 ? 110 : 90,
    quantity: 1,
    pnl,
  })

  it('isWin returns true for pnl > 0', () => {
    expect(isWin(trade(100))).toBe(true)
  })

  it('isWin returns false for pnl <= 0', () => {
    expect(isWin(trade(0))).toBe(false)
    expect(isWin(trade(-50))).toBe(false)
  })

  it('winRate returns correct percentage', () => {
    const trades = [trade(100), trade(-50), trade(200)]
    expect(winRate(trades)).toBeCloseTo(0.667, 2)
  })

  it('winRate handles empty array', () => {
    expect(winRate([])).toBe(0)
  })

  it('winRate handles all wins', () => {
    const trades = [trade(100), trade(200), trade(300)]
    expect(winRate(trades)).toBe(1)
  })

  it('winRate handles all losses', () => {
    const trades = [trade(-100), trade(-50)]
    expect(winRate(trades)).toBe(0)
  })
})
```

#### Test Cases for `lib/formulas/drawdown.ts`

```typescript
describe('lib/formulas/drawdown', () => {
  it('calculates max drawdown correctly', () => {
    const trades = [
      { ...trade(1000), cumulativePnl: 1000 },
      { ...trade(-500), cumulativePnl: 500 },
      { ...trade(-200), cumulativePnl: 300 },
      { ...trade(300), cumulativePnl: 600 },
    ]
    const { max } = drawdown(trades)
    expect(max).toBeCloseTo(0.7, 1)  // 70% drawdown from 1000 to 300
  })

  it('handles trades with no drawdown', () => {
    const trades = [
      { ...trade(100), cumulativePnl: 100 },
      { ...trade(200), cumulativePnl: 300 },
    ]
    const { max, current } = drawdown(trades)
    expect(max).toBe(0)
    expect(current).toBe(0)
  })
})
```

### 6.2 Integration Tests (API Routes)

**Test Framework:** Supertest or similar

#### Test Cases for KPI Strip Fix (TASK-001)

```typescript
describe('GET /api/analytics/kpi', () => {
  it('aggregates metrics over ALL trades, not paginated subset', async () => {
    // Create account with 50+ trades
    const account = await createTestAccount()
    await createTestTrades(account.id, 50)

    // Request KPI with pagination params
    const res = await request(app)
      .get('/api/analytics/kpi')
      .query({ skip: 0, take: 10 })
      .set('Authorization', `Bearer ${token}`)

    // Should return metrics for all 50 trades, not just 10
    expect(res.body.tradeCount).toBe(50)
    expect(res.body.winRate).toBeCloseTo(expectedWinRate, 2)
  })
})
```

#### Test Cases for SQL Injection Fix (TASK-054)

```typescript
describe('POST /api/ai-embed', () => {
  it('escapes vector array properly', async () => {
    const notes = 'Test notes with \' quotes'
    const res = await request(app)
      .post('/api/ai-embed')
      .send({ tradeId, notes })
      .set('Authorization', `Bearer ${token}`)

    // Should succeed without SQL errors
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('handles very long notes', async () => {
    const notes = 'x'.repeat(10000)
    const res = await request(app)
      .post('/api/ai-embed')
      .send({ tradeId, notes })
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
  })
})
```

### 6.3 End-to-End Tests (UI)

**Framework:** Playwright or Cypress

#### Test Cases

```typescript
// e2e/sprint-1/kpi-strip.spec.ts
test('KPI strip shows correct metrics for all trades', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')

  const kpiStrip = page.locator('[data-testid="kpi-strip"]')
  
  // Verify win rate matches expected value
  const winRateEl = kpiStrip.locator('[data-metric="win-rate"]')
  const winRateText = await winRateEl.textContent()
  
  // Should match exact calculation
  expect(parseFloat(winRateText)).toBeCloseTo(expectedValue, 1)
})
```

### 6.4 Performance Tests

**Framework:** Lighthouse or custom benchmarks

```typescript
// tests/performance/sprint-1.bench.ts
describe('Performance - Sprint 1', () => {
  it('KPI aggregation query completes in <1000ms', async () => {
    const start = Date.now()
    const result = await calculateKpi(allTrades)
    const duration = Date.now() - start
    
    expect(duration).toBeLessThan(1000)
  })

  it('Formula calculations complete in <10ms per trade', async () => {
    const trades = await fetchTrades()
    const start = Date.now()
    
    const results = trades.map(t => ({
      isWin: isWin(t),
      rMultiple: rMultiple(t),
    }))
    
    const duration = Date.now() - start
    expect(duration / trades.length).toBeLessThan(10)
  })
})
```

---

## 7. RISK ANALYSIS

### 7.1 Risk Register

| ID | Risk | Severity | Probability | Impact | Mitigation |
|----|------|----------|-------------|--------|-----------|
| R1 | Formula centralization introduces regressions | 🔴 Critical | HIGH | 50% trader metrics wrong | Unit tests (90%+ coverage); side-by-side validation; gradual rollout (10%→50%→100%) |
| R2 | SQL injection fix breaks embedding | 🟠 High | MEDIUM | Embeddings unavailable | Test with various input lengths; test vector serialization |
| R3 | Win-rate unification changes trader perception | 🟡 Medium | MEDIUM | Traders confused by metric shifts | Document changes; compare old vs. new; <1% variance expected |
| R4 | KPI query performance degrades | 🟡 Medium | LOW | Dashboard load time >5s | Benchmark before/after; add DB indexing if needed |
| R5 | CRON_SECRET hardening breaks scheduled tasks | 🟡 Medium | LOW | No cron jobs run | Test edge function locally; deploy to staging first |
| R6 | Upload validation too strict | 🟡 Medium | MEDIUM | Users can't upload images | Test with real image files; allow common formats (JPG, PNG, WebP) |
| R7 | Type casting elimination breaks compilation | 🔴 Critical | LOW | Build fails | Start with 2–3 casts; validate after each; TypeScript check passes |
| R8 | Pagination fix causes data inconsistency | 🟠 High | LOW | KPI strip ≠ trade list | Separate "display pagination" from "aggregation query" |

### 7.2 Risk Mitigation Detail

#### R1: Formula Regression Testing Strategy

**Problem:** Centralizing formulas could introduce calculation bugs, causing incorrect metrics to be displayed.

**Mitigation:**
1. **Side-by-side validation**
   - Run old and new calculations on same test data
   - Compare results (expect <1% variance)
   - Document any differences
   ```typescript
   // test-utils/validate-formulas.ts
   function compareCalculations(trades: Trade[]) {
     const oldWinRate = calculateWinRateLegacy(trades)
     const newWinRate = calculateWinRateNew(trades)
     const variance = Math.abs(oldWinRate - newWinRate)
     
     if (variance > 0.01) {
       console.warn(`Win rate variance: ${variance}`)
     }
     return { oldWinRate, newWinRate, variance }
   }
   ```

2. **Comprehensive test suite**
   - 60+ unit tests covering edge cases
   - Tests for: 0 trades, all wins, all losses, breakeven, mixed
   - Tests with different account types, currencies

3. **Gradual rollout with feature flag**
   - Deploy with `USE_CENTRALIZED_FORMULAS=false` initially
   - Monitor metrics for 1 week
   - Roll out to 10% of users, monitor
   - Gradually increase to 100%

4. **Metrics monitoring**
   - Dashboard showing old vs. new calculations
   - Alert if variance >5% for any account
   - Rollback procedure if issues detected

#### R2: SQL Injection Fix Testing

**Problem:** Parameterizing SQL might introduce serialization issues with vector data.

**Mitigation:**
1. **Test vector serialization**
   ```typescript
   it('serializes vector array correctly', async () => {
     const vector = [0.1, 0.2, 0.3, ...]
     const notes = 'Test notes'
     const result = await embedText(notes)
     
     expect(result).toEqual(vector)
     expect(typeof result[0]).toBe('number')
   })
   ```

2. **Test with various input lengths**
   - Short notes: 10 chars
   - Medium notes: 500 chars
   - Long notes: 5000 chars
   - Maximum notes: 50000 chars

3. **Verify vector storage**
   - Query database after embedding
   - Verify vector is stored as proper array type
   - Verify vector dimensions match expected

#### R3: Win-Rate Metric Shift

**Problem:** Traders might see metric changes even if calculations are correct, causing confusion.

**Mitigation:**
1. **Compare before/after for test accounts**
   - Use 3+ production accounts with varying metrics
   - Document expected shifts
   - Communicate to traders what changed and why

2. **Documentation & communication**
   - Release notes explaining calculation unification
   - Blog post on metric consistency improvements
   - In-app notification when deployed

3. **Rollback ready**
   - Feature flag allows quick revert
   - <5 minute rollback time if needed

---

## 8. VALIDATION CHECKLIST

### Pre-Sprint Validation (Day 1)

- [ ] **Code inventory**
  - [ ] Identified all 9 win-rate calculation sites
  - [ ] Documented current formula in each site
  - [ ] Created audit spreadsheet
  - [ ] Identified test accounts for validation

- [ ] **Environment setup**
  - [ ] Feature flag system in place
  - [ ] Staging database backup created
  - [ ] Local dev environment matches staging
  - [ ] All necessary dependencies installed

- [ ] **Requirements review**
  - [ ] Team reviewed Sprint 1 objectives
  - [ ] Owner assigned to each task
  - [ ] Shared ownership clear (no ambiguity)
  - [ ] Acceptance criteria understood

### During Sprint Validation (Daily)

- [ ] **Code quality**
  - [ ] All new code has JSDoc comments
  - [ ] No TODO comments without tasks
  - [ ] No console.log in production code
  - [ ] No temporary variables or hacks

- [ ] **Testing**
  - [ ] Unit test coverage >90% for formulas
  - [ ] All tests pass locally
  - [ ] No console warnings/errors in tests
  - [ ] TypeScript strict mode enabled

- [ ] **Integration**
  - [ ] Formula module imports work in all consumers
  - [ ] No circular dependencies
  - [ ] Types match across imports
  - [ ] Build succeeds with no warnings

### Post-Sprint Validation (End of Week 2)

- [ ] **Formula Module Validation**
  - [ ] `lib/formulas/` directory exists
  - [ ] 8 formula files present (win-rate, drawdown, profitFactor, riskRewardRatio, rMultiple, sharpeRatio, disciplineScore, + tests)
  - [ ] All functions exported from index.ts
  - [ ] Unit tests pass (90%+ coverage)
  - [ ] No console errors during build

- [ ] **Win-Rate Unification (TASK-005)**
  - [ ] [ ] All 9 calculation sites identified and documented
  - [ ] [ ] All 9 sites use `isWin()` from lib/formulas
  - [ ] [ ] Win rate matches across: dashboard KPI, account detail, analytics, playbook, reviews
  - [ ] [ ] Variance between old/new <1% for test accounts
  - [ ] [ ] Tests pass for all 9 sites

- [ ] **Drawdown Fixes (TASK-028, TASK-029)**
  - [ ] [ ] Drawdown label accurate (matches formula)
  - [ ] [ ] Drawdown calculation in use-account-stats matches lib/formulas/drawdown
  - [ ] [ ] KPI strip displays correct drawdown value
  - [ ] [ ] Drawdown tests pass

- [ ] **Data Correctness (TASK-001, TASK-009, TASK-002)**
  - [ ] [ ] KPI strip aggregates over ALL trades (not paginated)
  - [ ] [ ] weekTrades aggregation based on all data
  - [ ] [ ] Account stats calculated from complete dataset
  - [ ] [ ] objectiveMet no longer hardcoded to false
  - [ ] [ ] KPI aggregation query completes in <1s
  - [ ] [ ] Metrics match manual calculation for 3+ test accounts

- [ ] **Security Hardening**
  - [ ] **TASK-054:** SQL injection fix
    - [ ] No string interpolation in raw SQL
    - [ ] All vectors parameterized with Prisma.sql
    - [ ] Embedding test with special characters passes
    - [ ] Embedding test with long notes passes
  - [ ] **TASK-016:** CRON_SECRET hardening
    - [ ] CRON_SECRET validation uses constant-time comparison
    - [ ] Edge function tests pass
    - [ ] Timing side-channel protected
  - [ ] **TASK-017:** Upload validation
    - [ ] File size validation works (reject >5MB)
    - [ ] MIME type validation works (allow: image/jpeg, image/png, image/webp)
    - [ ] Extension validation works
    - [ ] Tests pass with valid & invalid files
  - [ ] **TASK-003:** TRPCError usage
    - [ ] No `throw new Error()` in accounts router
    - [ ] All errors use TRPCError type
    - [ ] Error codes match tRPC spec
    - [ ] Tests pass

- [ ] **Code Cleanup**
  - [ ] **TASK-004:** rMultiple in CSV import
    - [ ] rMultiple calculated for all imported trades
    - [ ] rMultiple stored correctly in database
    - [ ] CSV import test passes
  - [ ] **TASK-026:** Error message mismatch
    - [ ] Line 106 of ai-coach/route.ts reviewed
    - [ ] Error message matches behavior
    - [ ] Tests pass

- [ ] **Performance Validation**
  - [ ] KPI aggregation query: <1s
  - [ ] Formula calculation: <10ms per trade
  - [ ] Upload validation: <100ms
  - [ ] No performance regressions vs. baseline

- [ ] **Integration Testing**
  - [ ] Dashboard loads without errors
  - [ ] KPI strip displays correctly
  - [ ] Win rate counter matches KPI
  - [ ] Account detail loads
  - [ ] CSV import works
  - [ ] No console errors

- [ ] **QA Sign-Off**
  - [ ] Manual testing on 3+ accounts
  - [ ] Metrics validated against manual calculation
  - [ ] Security fixes verified (upload test, CRON test)
  - [ ] No regressions in existing features
  - [ ] QA approval received

- [ ] **Documentation**
  - [ ] Formula module documented (README in lib/formulas/)
  - [ ] Migration guide created (old site → new site)
  - [ ] Rollback procedure documented
  - [ ] Test cases documented
  - [ ] Known issues documented (if any)

- [ ] **Deployment Readiness**
  - [ ] All tasks merged to main with PR review
  - [ ] No merge conflicts
  - [ ] Build passes on CI/CD
  - [ ] All tests pass on CI/CD
  - [ ] No TypeScript errors
  - [ ] Feature flags configured correctly
  - [ ] Environment variables updated
  - [ ] Database backups confirmed
  - [ ] Rollback procedure tested
  - [ ] Stakeholders notified

---

## 9. EXECUTION TIMELINE

### Week 1 (Days 1–5)

| Day | Task | Owner | Hours | Notes |
|-----|------|-------|-------|-------|
| 1 | TASK-027 (formula module) — Audit & design | BE | 2h | Identify 9 win-rate sites; document current implementations |
| 2 | TASK-027 (continued) — Implementation & tests | BE | 2h | Create lib/formulas/ with 8 formula files; 60+ unit tests |
| 3 | TASK-005, TASK-028, TASK-029 — Unify criterion & fix drawdown | BE/FE | 2h | Update all 9 sites; fix labels & calculations |
| 4 | TASK-001, TASK-009 — Fix KPI pagination | BE/FE | 2h | Separate display pagination from aggregation; verify performance |
| 5 | TASK-002 — Fix objectiveMet hardcode | BE | 0.5h | Quick fix; minimal risk |

**Week 1 Buffer:** 0.5h

### Week 2 (Days 6–10)

| Day | Task | Owner | Hours | Notes |
|-----|------|-------|-------|-------|
| 6 | TASK-054, TASK-016, TASK-017, TASK-003 — Security hardening | BE | 2h | SQL injection, CRON, upload validation, TRPCError |
| 7 | TASK-004, TASK-026 — Data import & error messages | BE | 1h | rMultiple & error message alignment |
| 8–9 | Integration & regression testing | QA | 3h | Full test suite; manual QA on 3+ accounts; side-by-side validation |
| 10 | Performance testing & optimization | DevOps | 1h | Benchmark queries; optimize if needed; feature flag config |

**Week 2 Buffer:** 20h available (advanced testing, bug fixes, edge cases)

---

## 10. SUCCESS METRICS

### Technical Metrics

| Metric | Target | Acceptance |
|--------|--------|----------|
| Unit test coverage (formulas) | 90%+ | ≥85% |
| Formula variance (old vs new) | <1% | <2% |
| KPI aggregation query time | <1s | <2s |
| All tests passing | 100% | 100% |
| TypeScript errors | 0 | 0 |
| SQL injection patterns | 0 | 0 |
| Regressions detected | 0 | 0 |

### Business Metrics

| Metric | Target | Acceptance |
|--------|--------|----------|
| Traders with consistent metrics | 100% | ≥95% |
| Metric calculation accuracy | 100% | ≥99% |
| Security baseline established | ✅ | ✅ |
| Feature velocity enabled for S3 | ✅ | ✅ |

---

## 11. TEAM ASSIGNMENTS

### Owners by Task

| Task | Owner | Role | Estimate |
|------|-------|------|----------|
| TASK-027 | [Senior BE Dev] | Architect formula module | 4h |
| TASK-005 | [Mid BE Dev] | Unify criterion across 9 sites | 0.5h |
| TASK-028 | [FE Dev] | Fix drawdown label | 0.5h |
| TASK-029 | [FE Dev] | Fix drawdown calculation | 0.5h |
| TASK-001 | [Senior BE Dev] | Fix KPI pagination | 2h |
| TASK-009 | [Mid BE Dev] | Fix weekTrades aggregation | 2h |
| TASK-002 | [Junior BE Dev] | Fix objectiveMet | 0.5h |
| TASK-054 | [Security engineer] | SQL injection fix | 0.5h |
| TASK-016 | [Backend infra] | Harden CRON_SECRET | 0.5h |
| TASK-017 | [Backend infra] | Upload validation | 2h |
| TASK-003 | [Mid BE Dev] | TRPCError migration | 0.5h |
| TASK-004 | [Mid BE Dev] | CSV import rMultiple | 0.5h |
| TASK-026 | [Mid BE Dev] | Error message alignment | 0.5h |

---

## 12. COMMUNICATION & DEPENDENCIES

### Blockers & Dependencies

**None** — All tasks are independent or sequenced within Sprint 1. TASK-027 must complete before TASK-005/028/029, but all tasks are within same sprint.

**Next Sprint:** TASK-011 (computeDisciplineScore) depends on TASK-027 being complete.

### Communication Plan

- **Kickoff (Day 1):** Team meeting; review objectives, risks, timeline
- **Daily standup (10min):** 9am each day; blockers, progress, adjustments
- **Mid-sprint review (Day 5):** Burn-down check; scope adjustments if needed
- **Pre-deployment (Day 9):** Final QA sign-off; security review
- **Sprint review (Day 10):** Demo to stakeholders; acceptance

---

## APPENDIX A: Formula Implementation Reference

### A.1 Template for New Formula Function

```typescript
/**
 * Canonical formula for X metric.
 * 
 * Definition: [mathematical formula]
 * Edge cases: [list edge cases handled]
 * References: [spec docs, previous implementations]
 * 
 * @param trades Array of trades with required fields
 * @returns Calculated value or tuple of values
 * @throws Error if input invalid (e.g., empty array)
 * 
 * @example
 * ```typescript
 * const trades = [...]
 * const value = calculateMetric(trades)
 * // => number
 * ```
 */
export function calculateMetric(trades: Trade[]): number {
  if (!trades.length) return 0
  // Implementation
  return result
}

// Test template
describe('calculateMetric', () => {
  it('handles empty array', () => {
    expect(calculateMetric([])).toBe(0)
  })

  it('calculates correctly for normal case', () => {
    const trades = [...]
    expect(calculateMetric(trades)).toBeCloseTo(expected, 2)
  })

  // ... edge case tests
})
```

---

## APPENDIX B: Pre-Flight Checklist

### 48 Hours Before Deployment

- [ ] Code review completed for all PRs
- [ ] All tests passing on CI/CD
- [ ] Performance baseline measured
- [ ] Stakeholders notified
- [ ] Database backup created
- [ ] Rollback procedure tested
- [ ] Feature flags configured
- [ ] Environment variables updated

### 24 Hours Before Deployment

- [ ] Final security audit completed
- [ ] QA sign-off obtained
- [ ] Incident response plan reviewed
- [ ] On-call engineer notified
- [ ] Monitoring alerts configured
- [ ] Slack channels prepared

### Deployment Day

- [ ] No critical PRs pending merge
- [ ] All team members available
- [ ] Deployment window open
- [ ] Monitoring dashboard open
- [ ] Slack channel active
- [ ] Rollback ready

---

*End of SPRINT_1_IMPLEMENTATION_PLAN.md*

**Status:** READY FOR IMPLEMENTATION (Design Phase Complete)

**Next Step:** Proceed to Implementation Phase (Week 1) with daily standup cadence.
