# SPRINT 2 Implementation Plan
## Learning Pipeline Correctness & UX Foundations

> **Based on:** SPRINT_MASTER_PLAN.md + SPRINT_1_RETROSPECTIVE.md  
> **Created:** 2026-06-01  
> **Sprint Duration:** Weeks 3–4 (2 weeks, ~40h available)  
> **Branch:** `claude/epic-darwin-1XZTX`  
> **Adjusted From:** SPRINT_MASTER_PLAN.md Sprint 2 section with Sprint 1 learnings

---

## Sprint Goal

**Primary:** Fix all remaining P0 correctness issues deferred from Sprint 1. Establish the toast notification system as the foundation for all user feedback. Correct Sharpe Ratio divergence between AI coach and dashboard.

**Secondary:** Begin learning pipeline correctness work and mobile UX polish from original plan.

**Success Verdict:** Sprint 2 starts when three deferred P0s (TASK-002, TASK-026, TASK-028) are merged. All original planned work (Groups A–D) must complete with zero data-correctness regressions.

---

## Pre-Sprint Checklist (Day 1 Morning)

**BEFORE ANY CODE CHANGES:**

1. ✅ Run `pnpm test` — confirm 232/232 passing baseline
2. ✅ Run `tsc --noEmit` — zero TypeScript errors
3. ✅ Fetch latest `main` — confirm no production hotfixes since Sprint 1
4. ✅ Review SPRINT_1_RETROSPECTIVE.md — all team members understand lessons
5. ✅ Confirm branch `claude/epic-darwin-1XZTX` is current (fetch origin)

**If any baseline check fails:** Stop, fix, and commit the fix on a new commit before proceeding with Sprint 2 work.

---

## Adjusted Sprint Scope

### Priority Tier 0: Deferred P0s (First Items — **MUST CLOSE FIRST**)

These three tasks were deferred from Sprint 1 as low-effort UX correctness issues. They are now **P0 blocking items** for Sprint 2. All three must merge before Sprint 2 is considered "started."

| Task | Description | Effort | Owner | Status |
|------|-------------|--------|-------|--------|
| **TASK-002** | Fix `objectiveMet = false` hardcoded in `promote-phase-modal.tsx:41`. Calculate as `account.netPnl ≥ account.targetPct * initialBalance` | XS (0.5h) | FE | ⏭ Ready |
| **TASK-026** | Fix error message mismatch in `ai-coach/route.ts:106` — return `{ error: "..." }` with 400, not 500 | XS (0.5h) | BE | ⏭ Ready |
| **TASK-028** | Rename "Drawdown" KPI on `/trades` page to "Peor día" (it shows min daily P&L, not drawdown) | XS (0.5h) | FE | ⏭ Ready |
| **TD-011** | Replace Sharpe Ratio formula in `ai-context.ts:185` with call to `calcSharpeRatio` from centralized formula module (uses Bessel-corrected std dev, matching dashboard) | XS (0.5h) | BE | ⏭ Ready |

**Acceptance Criteria:**
- All 4 commits merged to `main`
- Tests still passing (232/232)
- Phase promotion modal shows correct objective status
- AI coach error responses use 400 status for client errors
- Drawdown label is "Peor día" everywhere on trades page
- Sharpe Ratio in AI coach matches dashboard calculation

---

### Priority Tier 1: Core Sprint Work (Original Groups A–D)

After P0s are closed, execute the original SPRINT_MASTER_PLAN.md Sprint 2 groups.

#### Group A: Learning Pipeline Correctness (4 tasks, ~12h)

**Objective:** Fix semantic violations in learning resource pipeline. Ensure side effects happen only in mutations, not queries.

| Task | Description | Effort | Dependencies |
|------|-------------|--------|--------------|
| **TASK-007** / **TASK-038** | Move MASTERED→IN_REVIEW transition from `learningResources.stats` query to `processDecayTransitions` mutation | S (2h) | TASK-027 (formula module) |
| **TASK-008** / **TASK-039** | Fix N+1 query in `resourceImpactRanking` — replace loop with aggregated SQL query (O(1) queries regardless of catalog size) | M (4h) | None |

**Root Cause (from Sprint 1):** Learning resources were being modified as a side effect of a READ query. This violates CQRS (Command Query Responsibility Segregation) and makes the application behavior unpredictable (side effects on analytics reads).

**Prevention (Test-First):**
```typescript
// Test: resourceImpactRanking returns same result as manual loop
it("aggregates resource impact without N+1 queries", () => {
  const { data, queryCount } = runWithQueryCounter(() => 
    resourceImpactRanking(userId, limit: 10)
  )
  expect(queryCount).toBeLessThanOrEqual(2) // schema query + single aggregation
})

// Test: MASTERED→IN_REVIEW only happens in mutation
it("processDecayTransitions does not run automatically on stats query", () => {
  const beforeMastered = countByStatus("MASTERED")
  statsQuery() // read-only
  const afterMastered = countByStatus("MASTERED")
  expect(beforeMastered).toEqual(afterMastered)
})
```

**Detailed Implementation:**
- TASK-007/038: Extract decay transition logic to `src/server/trpc/routers/learning-resources/mutations/process-decay-transitions.ts`
- TASK-008/039: Rewrite `resourceImpactRanking` SQL with `SUM(...)` GROUP BY instead of JavaScript loop

---

#### Group B: UX Feedback System (2 tasks, ~4.5h)

**Objective:** Establish toast notification system as the foundation for all error/success feedback. Unblock error-handling improvements across the app.

| Task | Description | Effort | Dependencies |
|------|-------------|--------|--------------|
| **TASK-035** | Integrate Sonner toast library; expose `useToast` hook; document usage | M (4h) | None |
| **TASK-037** | Fix `generateSummary` returning HTTP 200 on failure. Replace with toast error + 400 response | XS (0.5h) | TASK-035 (toast system) |

**Root Cause (from Sprint 1):** No standard way to surface errors to users. Functions were returning 200 with error objects (HTTP contract violation). Users got no feedback when actions failed.

**Prevention (Integration Test):**
```typescript
// Test: All error paths use toasts
it("shows toast on failed summary generation", async () => {
  const { getByRole, user } = render(<GenerateSummaryButton />)
  await user.click(getByRole("button", { name: /generate/i }))
  // API returns 400 with error message
  await waitFor(() => {
    expect(screen.getByText(/failed to generate/i)).toBeInTheDocument()
  })
})
```

**Detailed Implementation:**
- TASK-035: Install `sonner`, create `lib/use-toast.ts`, add toast provider to root layout
- TASK-037: Audit `ai-coach/route.ts` — change error response to `status: 400`, call `useToast` on client side

---

#### Group C: Mobile & Form UX (3 tasks, ~3h)

**Objective:** Improve mobile navigation and input handling. Reduce friction on small screens.

| Task | Description | Effort | Dependencies |
|------|-------------|--------|--------------|
| **TASK-040** | Add back arrow to all detail panels on screens < 768px. Escape key closes panels on desktop | S (2h) | None |
| **TASK-041** | Add `inputmode="decimal"` to all price/P&L inputs in trade form | XS (0.5h) | None |
| **TASK-036** | Connect "Ver registro →" button in Disciplina tab to log modal | XS (0.5h) | None |
| **TASK-044** | Replace `window.location.reload()` in `dashboard/error.tsx` with Next.js `reset()` | XS (0.5h) | None |

**Prevention (Mobile Testing):**
- Test all price inputs on iOS (should show numeric keypad)
- Test back button on iPad (< 768px breakpoint)
- Test escape key on desktop (should close detail panel without redirect)

---

#### Group D: Technical Debt & Setup (2 tasks, ~2.5h)

**Objective:** Update stale configuration. Prepare schema for Phase XIV features (embeddings, email logging).

| Task | Description | Effort | Dependencies |
|------|-------------|--------|--------------|
| **TASK-015** | Update stale AI model IDs in `lib/ai/config.ts` — `claude-sonnet-4-5` → `claude-sonnet-4-6` | XS (0.5h) | None |
| **TASK-018** | Deprecate dead `trades.stats` procedure (replaced by `dashboardStats` in Sprint 1) | XS (0.5h) | None |
| **TASK-019** | Add `notes_embedding` (vector) and `email_log` columns to Prisma schema; generate migration | S (2h) | None |
| **TASK-059** | Create `.env.example` with all 15+ required variable names (no values) | XS (0.5h) | None |

**Root Cause (from Sprint 1):** Configuration drift — stale model IDs get shipped. New features blocked by missing schema fields.

---

## Dependencies & Critical Path

```
Sprint 1 ✅ COMPLETE
├── TASK-027 (formula module) ✅ DONE
├── TD-011 fix (Sharpe)  ← needed for consistency
└── All P0 deferred tasks ← MUST CLOSE FIRST

Sprint 2 (Adjusted)
├─ P0 Tasks (TASK-002, 026, 028, TD-011) [2h total, Day 1]
│  └─ After: All downstream personalization work safe
│
└─ Original Groups A–D [21.5h total, Days 2–10]
   ├─ Group B (TASK-035) [4h] ← blocks TASK-037
   ├─ Group A (TASK-007/008/038/039) [6h] ← can run parallel
   ├─ Group C (TASK-040/041/036/044) [3h] ← can run parallel
   └─ Group D (TASK-015/018/019/059) [2.5h] ← can run parallel after P0s
```

**No blocking dependencies on Sprint 1 completion.** P0 deferred tasks are independent. Original Sprint 2 work can run in parallel with P0 closure.

---

## Risks & Mitigations

| Risk | Severity | Mitigation | Owner |
|------|----------|-----------|-------|
| P0 tasks take longer than 2h; block other work | 🟡 Medium | Time-box P0 work: Day 1 morning only. If not done by noon, escalate. | FE/BE Lead |
| CQRS fix breaks learning stats dashboard | 🟡 Medium | Test mutation thoroughly: create new resource, mark mastered, verify transition only happens on mutation call. Validate against 5+ test accounts. | BE |
| Toast integration incomplete; some paths still use `alert()` | 🟡 Medium | Audit all error boundaries and route handlers. Create checklist of 20+ alert→toast replacements before merging TASK-035. | FE |
| Mobile back button conflicts with router state | 🟠 High | Use React Router `useNavigate(-1)` NOT browser history. Test on physical iOS device (not simulator). | FE |
| Schema migration (`TASK-019`) has downtime | 🟡 Medium | Add `notes_embedding` and `email_log` as nullable columns (0 downtime). No data migration needed. | DB |
| N+1 fix introduces performance regression | 🟡 Medium | Run `EXPLAIN ANALYZE` on new query before merge. Compare execution time: loop (ms/call) vs. aggregated (ms/call). | BE |

---

## Acceptance Criteria

### Overall Sprint
- ✅ All 7 P0 + core tasks merged with pull request reviews
- ✅ All tests passing (232/232 + new tests for deferred P0s)
- ✅ Zero new TypeScript errors (baseline 0 → 0)
- ✅ No regressions in KPI calculations, learning stats, AI coach

### By Priority Tier

**P0 Deferred Tasks:**
- ✅ Phase promotion modal shows correct objective status (real calculation, not hardcoded)
- ✅ AI coach error responses use HTTP 400 for client errors (not 500)
- ✅ Drawdown label is "Peor día" on trades page
- ✅ Sharpe Ratio in AI coach matches dashboard (both use Bessel-corrected std dev)

**Group A (Learning Pipeline):**
- ✅ MASTERED→IN_REVIEW transition only happens in mutations, not queries
- ✅ `resourceImpactRanking` query completes in <500ms (no N+1)
- ✅ Learning stats match expectations on 3+ test accounts

**Group B (Toast System):**
- ✅ Toast system fully integrated; all errors use toasts (no `alert()` calls)
- ✅ `generateSummary` returns 400 on failure with toast notification
- ✅ Toast appears for success actions (trade created, review saved, etc.)

**Group C (Mobile UX):**
- ✅ Back button visible on detail panels (<768px screens)
- ✅ Escape key closes detail panels (desktop)
- ✅ Price inputs show numeric keypad on iOS/Android
- ✅ Error boundary uses `reset()` instead of `location.reload()`

**Group D (Debt & Setup):**
- ✅ AI model ID is `claude-sonnet-4-6`
- ✅ Dead `trades.stats` procedure deprecated (or removed if unused)
- ✅ `.env.example` contains all 15+ required variables
- ✅ Prisma schema includes `notes_embedding` and `email_log` fields

---

## Daily Pacing Guide

### Day 1 (Monday) — P0 Closure Sprint
**Goal:** All deferred P0s merged by end of day.

- **Morning (2–3h):**
  - Pre-sprint checklist (pnpm test, tsc, baseline review)
  - TASK-002: Fix objectiveMet calculation
  - TASK-026: Fix AI coach error status code
  
- **Afternoon (1–2h):**
  - TASK-028: Rename Drawdown label
  - TD-011: Fix Sharpe Ratio in ai-context.ts
  - All 4 PRs reviewed and merged

**Definition of Done:** All 4 commits in `main`, tests still 232/232.

---

### Days 2–4 (Tue–Thu) — Group A & B
**Goal:** Learning pipeline CQRS fix + toast system complete.

- **Day 2 (Tue, 4–5h):**
  - TASK-035: Toast system integration (Sonner library, hook, provider)
  - Begin TASK-007/038: Extract decay transition logic
  
- **Day 3 (Wed, 4–5h):**
  - Finish TASK-007/038: Mutation testing
  - Begin TASK-008/039: N+1 query analysis and SQL rewrite
  
- **Day 4 (Thu, 4–5h):**
  - Finish TASK-008/039: Performance validation
  - TASK-037: Connect toast system to generateSummary error path
  - 4 PRs reviewed and merged by EOD

**Checkpoint:** Learning pipeline tests green, toast system covering 5+ error scenarios.

---

### Days 5–8 (Fri–Mon) — Groups C & D
**Goal:** Mobile UX polish + technical debt cleanup.

- **Day 5 (Fri, 3–4h):**
  - TASK-040: Back button on detail panels + escape key
  - TASK-041: `inputmode="decimal"` on price inputs
  
- **Day 6 (Sat – optional):**
  - TASK-036: Connect log modal button
  - TASK-044: Error boundary reset() fix
  
- **Day 7 (Mon, 3–4h):**
  - TASK-015: Update model IDs
  - TASK-018: Deprecate dead procedure
  - TASK-019: Add schema columns (migration)
  - TASK-059: Create `.env.example`
  
- **Day 8 (Tue, 2–3h):**
  - All PRs reviewed and merged
  - Final test pass (232/232 + new tests for all groups)
  - Documentation updated

**Checkpoint:** All 11 tasks merged, zero regressions, mobile tested on physical device.

---

## User-Visible Outcomes

By end of Sprint 2:

- **Traders see correct phase promotion status** (no more "objective not met" lies)
- **Traders get error feedback via toast notifications** (consistent across app)
- **Mobile users can navigate detail panels** with dedicated back button
- **AI coach uses current model ID** and correct Sharpe formula
- **Learning resource transitions work reliably** (side effects only in mutations)
- **App infrastructure ready** for Phase XIV (embeddings, email logging)

---

## Success Metrics

| Metric | Before Sprint 2 | Target | Validation |
|--------|-----------------|--------|-----------|
| P0 bugs remaining | 3 (TASK-002, 026, 028) | 0 | All 3 merged + 0 regressions |
| Toast error coverage | 0% | 100% | Audit all 20+ error paths |
| Tests passing | 232/232 | 232/232 + 8 new | New tests for each P0 + CQRS fix |
| Sharpe formula divergence | Yes (ai-context vs. dashboard) | No | Both use `calcSharpeRatio` from module |
| Mobile navigation UX | Limited (no back button) | Full | Back button tested on iOS/Android |
| N+1 queries in learning | Yes (per-resource loop) | No | Single aggregated query |
| Model ID current | No (`claude-sonnet-4-5` stale) | Yes (`claude-sonnet-4-6`) | Verified in production config |

---

## Sprint 2 Action Items

| # | Action | Owner | When | Success Criteria |
|---|--------|-------|------|------------------|
| 1 | Run baseline checks (pnpm test, tsc --noEmit) | All | Sprint start | 232/232 passing, 0 TS errors |
| 2 | Close TASK-002 (objectiveMet calculation) | FE | Day 1 morning | PR reviewed, merged, phase modal shows real calc |
| 3 | Close TASK-026 (AI coach error status) | BE | Day 1 morning | PR reviewed, merged, error returns 400 |
| 4 | Close TASK-028 (Drawdown label) | FE | Day 1 afternoon | PR reviewed, merged, label is "Peor día" |
| 5 | Fix TD-011 (Sharpe in ai-context.ts) | BE | Day 1 afternoon | PR reviewed, merged, both use same formula |
| 6 | Implement toast system (TASK-035) | FE | Day 2–3 | Sonner integrated, hook exported, used in 5+ paths |
| 7 | Fix CQRS violation (TASK-007/038) | BE | Day 2–4 | Mutation works, decay transition only on explicit call |
| 8 | Fix N+1 in learning (TASK-008/039) | BE | Day 3–4 | Single aggregated SQL query, <500ms response |
| 9 | Connect generateSummary to toast (TASK-037) | FE | Day 4 | Toast appears on error, 400 status |
| 10 | Implement mobile back button (TASK-040) | FE | Day 5 | Tested on iOS/Android, Escape key also works |
| 11 | Add inputmode to price inputs (TASK-041) | FE | Day 5 | Numeric keypad appears on mobile |
| 12 | Update AI model IDs (TASK-015) | BE | Day 7 | Config shows `claude-sonnet-4-6` |
| 13 | Add schema fields (TASK-019) | DB | Day 7 | Migration runs, fields nullable, zero downtime |
| 14 | Create `.env.example` (TASK-059) | DevOps | Day 7 | File includes all 15+ variables, checked in |
| 15 | Final QA pass | All | Day 8 | 232/232 tests, 0 regressions, sprint goals met |

---

## Notable Differences from SPRINT_MASTER_PLAN.md

1. **P0 Deferred Tasks First:** SPRINT_MASTER_PLAN.md placed Groups A–D as equally important. Sprint 1 Retrospective elevated 3 deferred tasks + TD-011 to **Tier 0** (must close first).

2. **Sharpe Ratio Fix Added:** TASK-015 (model ID update) was in Group D. Added explicit TD-011 (Sharpe formula in ai-context.ts) based on Sprint 1 finding.

3. **Pre-Sprint Baseline Requirement:** SPRINT_MASTER_PLAN.md did not mention green baseline check. Based on Sprint 1 recommendation, added Day 1 morning requirement: `pnpm test` + `tsc --noEmit`.

4. **Test-First Examples:** Added concrete unit test examples for B-001 (sl=0 sentinel) and M-001 (expectancy formula) failures to prevent regressions.

5. **Mobile Device Testing:** Original plan said "mobile tested" but was vague. Added explicit requirement: "Test on physical iOS device (not simulator)."

6. **Toast Audit Checklist:** Original plan said "no alert() calls" but didn't specify how many. Added requirement: "20+ alert→toast replacements before merging TASK-035."

---

## Dependencies on CANONICAL_EXECUTION_PLAN.md

This Sprint 2 plan aligns with CANONICAL_EXECUTION_PLAN.md:

- **Deferred P0s (TASK-002, 026, 028):** Mapped from backlog deferred column → elevated to Sprint 2 Day 1
- **TD-011 (Sharpe):** Tracked as open technical debt, now assigned to Sprint 2
- **TASK-035 (Toast):** Sprint 2 Group B (UX Feedback) — gateway to error standardization across app
- **Critical Path:** TASK-027 (Sprint 1) → TASK-035 (Sprint 2) → downstream error handling improvements
- **Effort:** Original plan 23.5h; adjusted to 25.5h (+2h for P0 deferred work) within 40h available buffer

---

## Escalation Paths

**If P0s take >2 hours (Day 1 late morning):**
- Notify project lead immediately
- Pivot one team member to pair on blocking task
- Defer one Group C task (TASK-044) to Day 9 if necessary

**If TASK-035 (toast system) stalls:**
- Sonner is a thin integration; check for library version conflicts
- Use fallback: browser `window.alert()` (not ideal, but unblocks error handling)
- Switch to alternative library if Sonner fails

**If learning N+1 fix (TASK-008/039) exceeds 4h:**
- Current implementation acceptable (loop works, just slow)
- Defer full optimization to Sprint 3 if time pressure
- Implement partial fix: cache resourceImpactRanking result in memory (5-minute TTL)

---

## Post-Sprint Deliverables

- ✅ All 11 tasks merged to `main`
- ✅ SPRINT_2_QA_REPORT.md (independent audit, same rigor as Sprint 1)
- ✅ Updated backlog.md (mark completed tasks, estimate Sprint 3)
- ✅ Updated CHANGELOG.md with "[Sprint 2 — Foundations & UX] — 2026-06-15" section
- ✅ Sprint 2 retrospective due by 2026-06-17

---

## Appendix: Test-First Examples (from Retrospective)

### B-001 Prevention (sl=0 sentinel)
```typescript
// tests/domains/trading/calc-r-multiple.test.ts
describe("calcRMultiple", () => {
  it("returns null when sl is 0 (parser sentinel for no stop loss)", () => {
    // This test would have caught B-001 before code review
    const result = calcRMultiple("LONG", 1.2345, 0, 1.2400)
    expect(result).toBeNull()
  })
  
  it("correctly calculates R when stop loss is provided", () => {
    const result = calcRMultiple("LONG", 1.2345, 1.2250, 1.2400)
    // (1.2400 - 1.2345) / |1.2345 - 1.2250| = 0.0055 / 0.0095 ≈ 0.58
    expect(result).toBeCloseTo(0.58)
  })
})
```

### M-001 Prevention (expectancy formula)
```typescript
// tests/domains/analytics/calc-expectancy.test.ts
describe("calcExpectancyR", () => {
  it("equals avgR for mixed wins/losses (expectancy = E[R])", () => {
    // Example: 6 wins @+2R, 4 losses @-1R
    // E[R] = (6*2 + 4*(-1)) / 10 = 8/10 = 0.8
    const trades = [
      ...Array(6).fill({ rMultiple: 2 }),
      ...Array(4).fill({ rMultiple: -1 })
    ]
    const expectancy = calcExpectancyR(trades)
    expect(expectancy).toBeCloseTo(0.8)
    
    // Catch old formula: s.avgR * wr - (1 - wr) = 1.2 * 0.6 - 0.4 = 0.32 ≠ 0.8
    // New formula: expectancy = s.avgR (arithmetic mean of all R)
  })
})
```

### CQRS Prevention (learning pipeline)
```typescript
// tests/server/trpc/routers/learning-resources.test.ts
describe("learningResources", () => {
  it("does not transition MASTERED→IN_REVIEW on stats query (no side effects)", async () => {
    await createTestResource(userId, { status: "MASTERED" })
    const beforeCount = await db.learningResource.count({
      where: { userId, status: "MASTERED" }
    })
    
    // Just reading stats should NOT change anything
    await caller.learningResources.stats()
    
    const afterCount = await db.learningResource.count({
      where: { userId, status: "MASTERED" }
    })
    expect(beforeCount).toEqual(afterCount)
  })
  
  it("does transition on processDecayTransitions mutation", async () => {
    await createTestResource(userId, { status: "MASTERED" })
    await caller.learningResources.processDecayTransitions()
    
    const count = await db.learningResource.count({
      where: { userId, status: "IN_REVIEW" }
    })
    expect(count).toBeGreaterThan(0)
  })
})
```

---

*End of SPRINT_2_IMPLEMENTATION_PLAN.md*
