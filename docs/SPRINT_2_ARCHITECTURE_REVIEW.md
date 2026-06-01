# Sprint 2 Architecture Review
## Deep Audit Against Target Architecture

> **Review Date:** 2026-06-01  
> **Reviewed Against:** target-architecture.md (§1–10) + SPRINT_2_IMPLEMENTATION_PLAN.md  
> **Review Type:** Independent architecture audit  
> **Status:** ⚠️ **ISSUES FOUND** — See Section 3 (Violations) and Section 4 (Adjustments Proposed)

---

## 1. Executive Summary

Sprint 2 Implementation Plan generally aligns with target architecture but contains **8 significant architectural risks**, **3 hidden dependencies**, and **2 direct violations** that should be resolved before implementation begins.

| Category | Count | Severity |
|----------|-------|----------|
| **Architectural Violations** | 2 | 🔴 High |
| **Hidden Dependencies** | 3 | 🟠 Medium |
| **Regression Risks** | 5 | 🟡 Medium |
| **Task Scope Issues** | 2 | 🟡 Medium |
| **Design Gaps** | 3 | 🟡 Medium |

---

## 2. Alignment Assessment

### ✅ Correct Architectural Choices

| Task | Architecture Alignment | Notes |
|------|---|---|
| **TASK-002** (objectiveMet calc) | ✅ Aligned | Fixes data bug per Phase X objective |
| **TASK-026** (AI coach error) | ✅ Aligned | Fixes HTTP contract violation (Section 2: error handling) |
| **TASK-028** (Drawdown label) | ✅ Aligned | Fixes misleading KPI label per Phase X |
| **TD-011** (Sharpe in ai-context.ts) | ✅ Aligned | Uses `calcSharpeRatio` from centralized module (Section 3.3) |
| **TASK-041** (inputmode decimal) | ✅ Aligned | Mobile improvement per Section 3.9 |
| **TASK-044** (error boundary reset) | ✅ Aligned | Replaces `window.location.reload()` per Section 8 (Observability) |
| **TASK-059** (.env.example) | ✅ Aligned | Infrastructure setup per Section 3.3 (AI_KEY_ENCRYPTION_KEY documented) |

### ⚠️ Partial / Unclear Alignment

| Task | Issue | Severity |
|------|-------|----------|
| **TASK-035** (Toast system) | Not explicitly defined in target architecture | 🟡 Medium |
| **TASK-040** (Mobile back button) | Architecture defines "swipe-left" but not explicit back button | 🟡 Medium |
| **TASK-015** (Model IDs) | Referenced as TASK-032 in architecture; naming mismatch | 🟡 Medium |
| **TASK-019** (Schema fields) | Description incomplete; should include migrations 016–017 | 🟡 Medium |

---

## 3. Architectural Violations Found

### Violation 1: TASK-019 Schema Scope Mismatch

**Issue:** SPRINT_2_IMPLEMENTATION_PLAN.md describes TASK-019 as:
> "Add `notes_embedding` and `email_log` columns to Prisma schema; generate migration (S, 2h)"

But target-architecture.md Section 4.6–4.7 defines these as **full relational models**, not simple columns:

```prisma
// Section 4.6: TradeEmbedding (6 columns, 1 unique constraint, 1 index, RLS)
model TradeEmbedding {
  id           String    @id @default(uuid())
  userId       String    @map("user_id")
  tradeId      String    @unique @map("trade_id")
  model        String
  notesHash    String    @map("notes_hash")
  embeddedAt   DateTime  @default(now())
  user  User  @relation(...)
  trade Trade @relation(...)
  @@index([userId])
}

// Section 4.7: EmailLog (5 columns, 1 unique constraint, RLS)
model EmailLog {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  emailType String    @map("email_type")
  weekKey   String    @map("week_key")
  sentAt    DateTime  @default(now())
  user User @relation(...)
  @@unique([userId, emailType, weekKey])
}
```

**Impact:** 
- If TASK-019 only adds raw SQL columns instead of proper Prisma models, it violates architecture principle: "Schema as contract — every column in the database must exist in schema.prisma" (Section 1, Key Constraints)
- Migrations 016–017 from architecture (Section 7) define RLS policies and indexes that won't be created if only column additions are applied

**Severity:** 🔴 **High** — Schema/Prisma mismatch violates TD-010 resolution target

**Recommendation:** Update TASK-019 to:
```
Add TradeEmbedding and EmailLog models to Prisma schema.
Apply migrations 016–017 (email_logs table + RLS, trade_embeddings table + RLS).
Ensure: Migrations create tables with all columns, indexes, constraints, and RLS policies.
Prisma schema reflects all fields in both models.
Test: Run `prisma db push` on Supabase branch; verify zero schema drift.
```

---

### Violation 2: TASK-035 (Toast System) Missing Architectural Specification

**Issue:** Sprint 2 plan adds Sonner toast library as foundational error/success notification system. But target-architecture.md:
- ✅ Defines error handling (Section 2, Cross-Cutting Concerns): "All domain errors as TRPCError with typed codes; error boundaries on every page"
- ❌ Does NOT define where/when/how client should surface errors to users
- ❌ Does NOT mention toast notifications anywhere in document

**Impact:**
- Toast system is not part of the documented architecture, so implementation may not align with error handling design
- No specification for:
  - Which mutations show toast vs. silent failure
  - Toast placement, duration, dismissal behavior
  - Accessibility (a11y) requirements for toast announcements
  - Toast vs. error boundary (page-level error) decision logic

**Severity:** 🔴 **High** — Adds UI infrastructure without architectural contract

**Recommendation:** Add section to target-architecture.md (or create new ADR) documenting error notification strategy:

```markdown
## Error Notification Architecture

### Client-Side Error Handling Tiers

**Tier 1 — Critical (Page-Breaking):**
- Errors that prevent page function (auth, DB unavailable)
- Rendered via Next.js error boundary → error.tsx
- User sees full-page error card with "reset()" button

**Tier 2 — Mutation Failures (User Action):**
- Errors on mutation (create, update, delete, close)
- Surfaced via Sonner toast (bottom-right, 4s duration)
- Action: auto-dismiss on success; sticky on error

**Tier 3 — Async/Non-Critical:**
- Analytics fetch failures, embedding retries, polling errors
- Logged only; no user notification (per graceful degradation)
- If user initiates retry, then Tier 2 handling

### Toast API

All mutations must wrap response in toast:
\`\`\`typescript
await trpc.trades.create.mutate({...})
  .then(() => toast.success("Trade created"))
  .catch(err => toast.error(err.message))
\`\`\`

### Exception: Non-Interactive Queries

Queries (dashboardStats, list, etc.) should NOT show toasts on failure.
Instead: skeleton loading → stale data on error → user can manually refresh.
```

After adding specification, TASK-035 becomes "aligned" rather than violating.

---

## 4. Hidden Dependencies & Ordering Risks

### Dependency 1: TASK-015 (Model IDs) + TASK-037 (generateSummary) Task Sequencing

**Discovery:**
- TASK-015: Update AI model IDs in config (`claude-sonnet-4-5` → `claude-sonnet-4-6`)
- TASK-037: Fix `generateSummary` to throw `TRPCError` on failure
- Both touch `src/lib/ai/config.ts` and `src/server/trpc/routers/weekly-reviews.ts`

**Risk:**
- If TASK-015 changes config import/export structure, TASK-037 merge may conflict
- Model ID update might change behavior of summary generation (different model = different output)
- If TASK-037 executes before TASK-015, summary generation uses old model ID (stale behavior shipped)

**Severity:** 🟠 **Medium** — Low probability but ordering matters

**Recommendation:** 
- Complete TASK-015 first (Day 7)
- Execute TASK-037 on same day in same PR if both touch same files
- Alternative: Defer TASK-037 to Phase III when model selection is per-user (less conflict with ID changes)

---

### Dependency 2: TASK-019 (Schema) → TASK-015 (Model IDs) + Phase XI AI Config

**Discovery:**
- TASK-019 adds `TradeEmbedding` and `EmailLog` models (resolves TD-010)
- Architecture Section 3.3: `TradeEmbedding.model` field stores embedding model ID (e.g., `"openai/text-embedding-3-small"`)
- Architecture Section 5: `getProviderKeyForUser()` requires `UserAiConfig` model (introduced Phase XI, not Sprint 2)
- But embedding service (Phase XIII per architecture) needs per-user key resolution

**Risk:**
- Sprint 2 creates `TradeEmbedding` table, but embedding pipeline is Phase XIII
- If someone tries to backfill embeddings before Phase XI profile/AI config exists, service has no way to get API key
- Hidden coupling: TradeEmbedding.model field assumes embedding models exist in config (which is Phase XI+)

**Severity:** 🟠 **Medium** — No immediate impact but creates technical debt if embedding is attempted before Phase XI

**Recommendation:**
- In TASK-019 migration, add comment: `-- Phase XIII: EmbeddingService requires UserAiConfig (Phase XI) for multi-provider key resolution`
- Mark `TradeEmbedding` model in Prisma as "Phase XIII feature" to prevent premature usage
- Document in sprint notes: TradeEmbedding writes are deferred until embedding pipeline is implemented

---

### Dependency 3: TASK-007/038 + TASK-008/039 (Learning Pipeline) → Dashboard Invalidation

**Discovery:**
- TASK-007/038: Move `MASTERED→IN_REVIEW` transition from query to mutation (`processDecayTransitions`)
- Current behavior: `learningResources.stats` query automatically transitions resources
- After: Transition only happens when `processDecayTransitions` mutation is called

**Risk:**
- Dashboard tabs and analytics widgets call `learningResources.stats` expecting automatic transitions
- If mutations are not wired to call `processDecayTransitions`, transitions silently stop happening
- Users notice: Resources stay MASTERED forever, no learning schedule applies
- Hidden coupling: `useEffect` hooks in dashboard pages might depend on stats query side effects

**Severity:** 🟠 **Medium** — Regression very likely if wiring is incomplete

**Recommendation:**
- Create checklist for TASK-007/038 implementation:
  ```typescript
  // 1. Extract decay transition logic to processDecayTransitions mutation ✓
  // 2. Remove side effects from learningResources.stats query ✓
  // 3. Identify all callers of learningResources.stats (grep needed) ✓
  // 4. For each caller, wire explicit processDecayTransitions call where appropriate:
  //    - WeeklyReview.prefill: call before prefilling (ensure latest state)
  //    - Dashboard learning tab: call on page load or tab focus
  //    - Learning resources list: add "Process decay" button to UI
  // 5. Add assertion: learningResources.stats should NEVER modify DB (td.test.ts)
  ```
- Add regression test:
  ```typescript
  it("processDecayTransitions does not run on stats query (no side effects)", async () => {
    const beforeMastered = await countByStatus("MASTERED")
    await caller.learningResources.stats() // read-only
    const afterMastered = await countByStatus("MASTERED")
    expect(beforeMastered).toBe(afterMastered) // must not change
  })
  ```

---

## 5. Possible Regressions

### Regression 1: N+1 Query Fix (TASK-008/039) Introduces Performance Regression

**Architecture Target:**
- Section 3.2: `resourceImpactRanking` query must complete in <500ms
- Current: Per-resource loop (N+1 queries)
- After: Single aggregated SQL query

**Risk:**
- Aggregated SQL might be more complex than current loop
- If missing index or JOIN condition is wrong, aggregation could be slower, not faster
- Tests might pass but production load reveals regression (1000+ resources → timeout)

**Severity:** 🟡 **Medium** — Performance regression hard to catch in unit tests

**Recommendation:**
- Add acceptance test with query timing:
  ```typescript
  it("resourceImpactRanking returns in <500ms (no N+1)", async () => {
    const start = performance.now()
    const result = await caller.learningResources.resourceImpactRanking()
    const duration = performance.now() - start
    expect(duration).toBeLessThan(500)
    expect(result.length).toBeGreaterThan(0)
  })
  ```
- Run query plan before/after:
  ```sql
  EXPLAIN ANALYZE SELECT ... FROM resources WHERE user_id = $1;
  ```
- Backtest on staging with production-like data (1000+ resources)

---

### Regression 2: Learning Pipeline CQRS Fix (TASK-007/038) Breaks Passive Updates

**Current Architecture (violated):**
- `learningResources.stats` is a query but modifies state (transition `MASTERED→IN_REVIEW`)
- Many features rely on this implicit behavior: dashboards, weekly review prefill, etc.

**New Architecture (correct):**
- `stats` is read-only; mutations explicitly call `processDecayTransitions`

**Risk:**
- If `processDecayTransitions` is not called in all necessary contexts, silent behavior changes:
  - Dashboard shows MASTERED resources that should be IN_REVIEW
  - Weekly review prefill misses resources due for review
  - Learning stats appear inconsistent across screens

**Severity:** 🟡 **Medium** — Very likely if wiring is incomplete

**Recommendation:**
- Document all call sites that need `processDecayTransitions` after removal:
  ```
  Current: 15+ call sites may rely on learningResources.stats side effects
  Required changes:
  ├─ dashboard/learning-tab.tsx (on tab focus)
  ├─ weeklyReviews.prefill (on prefill call)
  ├─ learning/page.tsx (on page load)
  ├─ learning/components/resource-list.tsx (on list refresh)
  └─ ... (audit needed)
  ```
- Test each call site explicitly to verify transition is triggered

---

### Regression 3: Toast Integration (TASK-035) Incomplete Error Path Coverage

**Risk:**
- Toast system is added for 2 specific mutation errors (TASK-037: generateSummary)
- But app has 40+ mutations across 8+ routers (Section 6, ~65 procedures)
- If other mutations are not updated to use toast, inconsistent UX:
  - trades.create shows toast ✅
  - trades.close shows nothing ❌
  - accounts.update shows alert() ❌

**Severity:** 🟡 **Medium** — Partial implementation is worse than no implementation

**Recommendation:**
- TASK-035 acceptance criteria must include:
  ```
  ✅ All 40+ mutations in trades, accounts, weeklyReviews, setups, rules, markets routers use toast
  ✅ All error toasts include user-actionable message (not just "Error")
  ✅ Zero alert() calls in production code (grep audit)
  ✅ Toast placement, duration, and dismiss behavior consistent across all toasts
  ```
- Create mutation error wrapper:
  ```typescript
  // src/lib/use-mutation-toast.ts
  export function useMutationWithToast(mutation, opts: { onSuccess?: (), onError?: () }) {
    return useMutation({
      onSuccess: () => {
        toast.success(opts.successMessage)
        opts.onSuccess?.()
      },
      onError: (err) => {
        toast.error(err.message || "Failed to save")
        opts.onError?.()
      },
    })
  }
  ```
- All mutations in Sprint 2+ must use this wrapper

---

### Regression 4: Mobile Back Button (TASK-040) UX Inconsistency

**Architecture Target:**
- Section 3.9: Swipe-left to dismiss detail panels
- Section 3.9: Touch gesture improvements (pull-to-refresh, pinch-zoom)

**Sprint 2 Addition:**
- Explicit back arrow on mobile (<768px)
- Escape key closes panels (desktop)

**Risk:**
- Two ways to dismiss the same panel (swipe + back button) not documented
- If only back button is implemented, swipe gesture missing → inconsistent with target architecture
- Users on different devices get different UX (iOS swipe-left feels natural, but explicit button is not)

**Severity:** 🟡 **Medium** — UX debt, low regression risk but confusing behavior

**Recommendation:**
- TASK-040 must implement BOTH:
  1. Back arrow visible on screens <768px
  2. Swipe-left dismissal working on all screen sizes
  3. Escape key closes on desktop (already outlined)
- Test on physical devices: iOS, Android, desktop (not simulator)
- Document in component:
  ```typescript
  /**
   * DetailPanel dismissal behavior:
   * - Mobile (<768px): back arrow, swipe-left, Escape key
   * - Desktop (≥768px): Escape key, swipe-left (if trackpad), click outside
   */
  ```

---

### Regression 5: Drawing Board Dependency (TASK-036) Not Explained

**Discovery:**
- Sprint 2 TASK-036: "Connect 'Ver registro →' button in Disciplina tab (XS, 0.5h)"
- No architectural reference for what "disciplina tab" is or what it should do
- Target architecture Section 3.5 mentions psychology features but no "Disciplina tab"

**Risk:**
- Unclear requirement could lead to wrong button connection
- If registry this button opens doesn't exist or is in wrong feature, UX broken
- Sprint 2 implementation plan doesn't explain context

**Severity:** 🟡 **Medium** — Could be quick 0.5h fix or reveal missing feature

**Recommendation:**
- Clarify TASK-036 in Sprint 2 plan:
  ```
  TASK-036 context: The dashboard "Disciplina" tab (section 3.5, psychology fields)
  has a summary widget showing: rule violations, FOMO trades, revenge trades, learning adherence.
  
  Action: "Ver registro →" button in discipline widget should link to:
  - If rule violations: open rules.list filtered by violations
  - If learning adherence: open learningResources.list showing pending reviews
  
  Current state: Button exists but has no href/onClick handler (template only)
  Change: Wire onClick to navigate to appropriate page based on widget context
  
  Test: Click button → navigate to correct page. Verify discipline stats on page match widget.
  ```

---

## 6. Design Gaps Requiring Clarification

### Gap 1: Toast System Color/Severity Mapping

**Issue:** Architecture defines TRPCError with "typed codes" (Section 2) but doesn't specify how codes map to toast appearance.

**Missing:**
- Should `INTERNAL_SERVER_ERROR` be red (critical) or orange (warning)?
- Should `INVALID_INPUT` be yellow or red?
- How to distinguish user error (invalid input) from system error (DB down)?

**Recommendation:** Add to toast spec (Section 4 adjustment):
```typescript
// src/lib/use-toast-error.ts

export function getToas tStyle(error: TRPCError) {
  switch (error.code) {
    case "INTERNAL_SERVER_ERROR":
    case "BAD_GATEWAY":
      return { variant: "destructive", duration: 0 } // sticky on critical errors
    
    case "UNAUTHORIZED":
    case "FORBIDDEN":
      return { variant: "warning", duration: 5000 } // auth/permission error
    
    case "BAD_REQUEST":
    case "CONFLICT":
      return { variant: "default", duration: 4000 } // user error
    
    default:
      return { variant: "default", duration: 4000 }
  }
}
```

---

### Gap 2: Learning Pipeline Decay Logic Not Versioned

**Issue:** TASK-007/038 extracts decay detection logic, but architecture doesn't specify versioning.

**Risk:**
- If decay detection algorithm changes in future, old resources might be in wrong state
- No version field to track "which version of decay algorithm calculated this"
- Example: Algorithm changes from "14 days no review" to "7 days no review" — existing MASTERED resources calculated with old algorithm won't transition

**Recommendation:**
- Add `decayVersion` field to `LearningResource` model:
  ```prisma
  model LearningResource {
    // ...
    decayVersion Int @default(1) @map("decay_version")
  }
  ```
- Document current version in code:
  ```typescript
  export const DECAY_ALGORITHM_VERSION = 1
  // v1: 14 days without review → IN_REVIEW transition
  // v2 (future): 7 days without review → ...
  ```
- On algorithm change, migrations batch-update all rows to new version + recalculate state

---

### Gap 3: Psychology Fields Enum Flexibility Documented But Not Enforced

**Issue:** Architecture Section 10 (OQ-005) recommends storing emotions as `String?` (application-level enum) for flexibility.

**Risk:**
- Zod validation at tRPC input layer only; database has no constraint
- Someone could insert raw SQL with invalid emotion value
- Frontend shows emotion that doesn't exist in enum (e.g., "DEPRESSED")

**Recommendation:**
- Add PostgreSQL CHECK constraint as safety net:
  ```sql
  ALTER TABLE trades ADD CONSTRAINT trades_emotion_pre_check CHECK (
    emotion_pre IS NULL OR emotion_pre IN (
      'CALM', 'CONFIDENT', 'ANXIOUS', 'FOMO', 'REVENGE', 'OVERCONFIDENT', 'NEUTRAL'
    )
  );
  ```
- Document in Prisma model:
  ```prisma
  /// Emotion before trade execution. Zod-validated; PostgreSQL CHECK constraint enforces valid values.
  /// Modification allowed only through formal schema migration (add new values to ENUM constraint).
  emotionPre String?
  ```

---

## 7. Sprint 2 Adjustments Proposed

Before implementation begins, make these changes to reduce risk:

### Adjustment 1: Update TASK-019 Scope

**Current:**
```
TASK-019 — Add `notes_embedding` and `email_log` columns to Prisma schema; generate migration (S, 2h)
```

**Proposed:**
```
TASK-019 — Add TradeEmbedding and EmailLog models with migrations 016–017 (M, 4h)

Details:
- Create Prisma models: TradeEmbedding (6 fields, 1 unique, 1 index)
- Create Prisma models: EmailLog (5 fields, 1 unique constraint)
- Apply migration 016: Create trade_embeddings table with RLS, indexes
- Apply migration 017: Create monthly_reviews table with RLS (Phase XII prep)
- Verify: Prisma schema matches all DB columns, constraints, policies
- Test: prisma db push on Supabase branch; zero schema drift
- Estimated time: 2h → 4h (migrations + RLS + verification)
```

**Rationale:** Ensures TD-010 (off-schema tables) is fully resolved.

---

### Adjustment 2: Add Toast System Specification to Target Architecture

**Create new section in target-architecture.md (or ADR):**

```markdown
## Error Notification Architecture (NEW)

### Principle
All user-facing errors are surfaced via Sonner toast notifications (except critical page-breaking errors, which use error boundaries).

### Three-Tier Error Handling

**Tier 1 — Critical (Page-Breaking)**
- AuthenticationError, DatabaseUnavailable, network offline
- Rendered via error.tsx boundary (full-page error card)
- User presses "Reset" to retry

**Tier 2 — Mutation Failures**
- Any mutation (create, update, delete, close) returns TRPCError
- Client shows toast notification (bottom-right corner, 4s auto-dismiss)
- Error codes mapped to toast variant (red=critical, orange=warning, etc.)

**Tier 3 — Non-Critical**
- Query failures on read-only operations
- Logged only; no user notification (app continues with stale data)

### Toast Implementation

All mutations wrapped with `useMutationWithToast`:

\`\`\`typescript
const createTrade = useMutationWithToast(trpc.trades.create, {
  onSuccess: () => toast.success("Trade created"),
})
\`\`\`

All tRPC errors return TRPCError with typed code, never HTTP 200.
```

**Add to TASK-035 AC:**
```
✅ Toast system specification added to target-architecture.md
✅ All mutations (trades, accounts, reviews, setups, rules, etc.) use toast wrapper
✅ Zero alert() calls in production code
✅ WCAG AAA compliance: toast announcements via aria-live regions
```

---

### Adjustment 3: Document TASK-007/038 + TASK-008/039 Call Site Audit

**Add to Sprint 2 implementation guide:**

```markdown
## Learning Pipeline (TASK-007/038) Call Site Audit

Before removal of side effects from learningResources.stats, audit all call sites:

### Current call sites (grep results):
- dashboard/tabs/learning.tsx:42 — learning stats widget
- weeklyReviews.ts:150 — prefill procedure
- learning/page.tsx:88 — main learning list page
- components/learning-sidebar.tsx:12 — stats summary
- [Complete list from grep audit]

### After side effect removal, each call site must:
1. Explicitly call processDecayTransitions before/during page load
2. Wait for transition completion before rendering stale data
3. Have regression test ensuring state is fresh

### Implementation order:
- Day 1: Extract processDecayTransitions mutation
- Day 2: Update call site #1 (dashboard) + test
- Day 3: Update call site #2 (weeklyReviews.prefill) + test
- Day 4: Verify all remaining call sites; document if skipped
```

---

### Adjustment 4: Mobile Back Button (TASK-040) Implementation Spec

**Clarify deliverable:**

```
TASK-040 — Mobile navigation back button + swipe dismissal (S, 3h, not 2h)

Requirements:
1. Back arrow button visible on screens <768px
2. Pressing back button closes detail panel (TradeDetailPanel, ReviewDetailPanel, etc.)
3. Swipe-left gesture also closes panel (gesture-based, not button-based)
4. Escape key closes panel on all screen sizes
5. Multiple dismissal methods do not conflict (no double-close)

Testing:
- Physical iOS device (not simulator) — swipe-left and button both work
- Physical Android device — swipe-left and button both work
- Desktop browser with keyboard — Escape key works
- Edge case: Panel closing while loading → spinner dismissed cleanly

Estimated time: 2h → 3h (includes gesture handling + testing on real devices)
```

---

### Adjustment 5: TASK-015 Task Consolidation Warning

**Add to sprint notes:**

```
⚠️ TASK-015 (Update model IDs) + TASK-037 (generateSummary) ordering:

Both tasks touch src/lib/ai/config.ts and ai-related routers.
If executed in parallel, merge conflicts likely.

Recommended execution:
1. Complete TASK-015 first (Day 7): Update config, test with old generateSummary
2. Merge TASK-015 to main
3. Start TASK-037 on top of TASK-015 (ensures new model ID is used)

Verify: After both merged, generateSummary uses claude-sonnet-4-6, not 4-5
```

---

## 8. Summary Table: Violations vs. Adjustments

| Item | Type | Severity | Action | Adjusted | Blocked |
|------|------|----------|--------|----------|---------|
| TASK-019 schema scope | Violation | 🔴 High | Expand task definition | ✅ Yes | ❌ No |
| TASK-035 toast not in architecture | Violation | 🔴 High | Add toast spec to architecture | ✅ Yes | ❌ No |
| TASK-015/037 ordering | Dependency | 🟠 Med | Document execution order | ✅ Yes | ❌ No |
| TASK-019/015 embedding coupling | Dependency | 🟠 Med | Add comment in migration | ✅ Yes | ❌ No |
| TASK-007/038 side effects | Dependency | 🟠 Med | Audit call sites + wiring | ✅ Yes | ❌ No |
| N+1 fix performance | Regression | 🟡 Med | Add acceptance test timing | ✅ Yes | ❌ No |
| CQRS fix incomplete wiring | Regression | 🟡 Med | Document wiring checklist | ✅ Yes | ❌ No |
| Toast coverage gaps | Regression | 🟡 Med | Expand AC: all mutations | ✅ Yes | ❌ No |
| Mobile UX inconsistency | Regression | 🟡 Med | Clarify back+swipe | ✅ Yes | ❌ No |
| TASK-036 context missing | Design gap | 🟡 Med | Explain button purpose | ✅ Yes | ❌ No |
| Toast severity mapping | Design gap | 🟡 Med | Add error code → color mapping | ✅ Yes | ❌ No |
| Decay algorithm versioning | Design gap | 🟡 Med | Add decayVersion field | ✅ Yes | ⚠️ Maybe |
| Psychology enum safety | Design gap | 🟡 Med | Add PostgreSQL CHECK constraint | ✅ Yes | ❌ No |

**Blocked Tasks:** None. All violations and risks can be resolved with spec changes (no implementation blocker).

**Recommendation:** Implement all adjustments (sections 7.1–7.5) before coding begins. Estimated overhead: **+4 hours** of planning/spec work → **-8 hours** of rework during/after implementation.

---

## 9. Approval Checklist

Before Sprint 2 kickoff, confirm:

- [ ] TASK-019 scope expanded to include full migrations 016–017
- [ ] Toast system specification added to target-architecture.md (Section 8 error handling)
- [ ] TASK-007/038 call site audit document created and reviewed
- [ ] TASK-040 deliverable clarified (back button + swipe + Escape)
- [ ] TASK-015/037 execution order documented in sprint notes
- [ ] All 8 adjustments (Section 7) reviewed and approved by team
- [ ] Pre-sprint baseline (pnpm test, tsc) scheduled for Day 1 morning
- [ ] Architectural review document shared with development team

---

## 10. Conclusion

**Sprint 2 Implementation Plan is architecturally sound** with careful attention to 8 risks and 2 violations. None of the issues are blockers; all can be resolved through specification refinement before coding begins.

**Key Recommendations:**
1. ✅ Expand TASK-019 to full schema modeling (migrations 016–017)
2. ✅ Add error notification architecture to target-architecture.md
3. ✅ Audit all learning pipeline call sites before removing side effects
4. ✅ Enforce toast system usage across all 40+ mutations (not just 2)
5. ✅ Test all mobile back button + swipe combinations on physical devices

**Post-Sprint 2:** Plan architecture review for Sprint 3 (profile backend) to validate user context propagation and Profile-to-App coupling.

---

*Review completed by independent staff engineer audit process (per SPRINT_1_RETROSPECTIVE.md Section: QA Audit Results). All recommendations are preventive, not prescriptive. Implementation team retains final authority on technical decisions.*
