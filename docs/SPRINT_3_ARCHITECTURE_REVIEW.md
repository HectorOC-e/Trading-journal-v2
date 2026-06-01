# Sprint 3 Architecture Review
## Cross-Document Analysis & Risk Assessment

> **Review Date:** 2026-06-01  
> **Scope:** target-architecture.md vs SPRINT_3_IMPLEMENTATION_PLAN.md  
> **Depth:** Architectural risks, hidden dependencies, regression vectors, constraint violations

---

## Executive Summary

**Overall Risk Level:** 🟠 **MEDIUM-HIGH** (3 critical gaps, 5 hidden dependencies, 2 violations)

Sprint 3 plan aligns well with target-architecture principles (single source of truth, domain services, graceful degradation) but has **3 critical architectural gaps** that must be addressed **before** implementation starts:

1. **Profile.exportData() lacks size/streaming strategy** — can fail silently on large datasets
2. **Timezone propagation unspecified** — creates N+1 query risk in trade-service
3. **Error message normalization missing** — toast coverage relies on raw `err.message` which violates "user-friendly" requirement
4. **Cache invalidation cascade undefined** — profile changes don't invalidate analytics cache
5. **Discipline score service missing** — TASK-011 extracts formula but doesn't define aggregation service

**Recommendation:** Complete the gaps below **before** code review, then implement with revised implementation plan.

---

## 1. Critical Architectural Gaps

### Gap 1: Profile Data Export Size Management ⚠️ CRITICAL

**Issue:** `profile.exportData()` in TASK-006 (SPRINT_3_IMPLEMENTATION_PLAN.md §439-482) promises to return "JSON of all user data" without specifying:
- Size limits (what if user has 100K trades?)
- Streaming strategy (response could exceed Node.js memory limit)
- Truncation behavior (what gets dropped if size limit hit?)

**Target-Architecture Requirement:** §1.3 "Graceful degradation — every missing configuration shows clear empty state, not silent failure"

**Violation:** If export fails due to size, returns HTTP 500 with unhelpful error. User sees "Export failed" with no context.

**Risk Level:** 🔴 **CRITICAL** — GDPR/privacy liability if export silently truncates data

**Recommended Fix:** 
```typescript
// src/server/trpc/routers/profile.ts
exportData: protectedProcedure
  .query(async ({ ctx }) => {
    const MAX_EXPORT_SIZE = 50 * 1024 * 1024  // 50MB limit
    
    // Build export in streaming fashion
    const stream = await buildExportStream(ctx.userId)
    const size = await getStreamSize(stream)
    
    if (size > MAX_EXPORT_SIZE) {
      throw new TRPCError({
        code: "PAYLOAD_TOO_LARGE",
        message: `Export size ${size}MB exceeds limit ${MAX_EXPORT_SIZE}MB. Contact support for large exports.`
      })
    }
    
    return stream  // tRPC can return streaming response
  })
```

**Action:** Add to PRE-IMPLEMENTATION checklist:
- [ ] Define MAX_EXPORT_SIZE constant
- [ ] Add integration test: export with 10K+ trades doesn't timeout
- [ ] Document export behavior in user-facing help text

---

### Gap 2: Timezone Propagation Mechanism Unspecified ⚠️ CRITICAL

**Issue:** SPRINT_3_IMPLEMENTATION_PLAN.md §56-96 (TASK-006) states:
> "Timezone change propagates to session classification (test: trade created in new timezone)"

But target-architecture.md §3.4 shows User.timezone is a field on User model, while session classification happens in `trade-service.ts` (§3.1 domains/trading/). The mechanism is **not specified**:

**Question 1:** How does `trade-service.ts` get the user's timezone?
- Option A: Pass `timezone` as parameter through tRPC context
- Option B: Query User model on every trade creation (N+1 risk!)
- Option C: Cache timezone in request context (but what if user changes it mid-flight?)

**Question 2:** If timezone changes mid-session:
- Do existing trades in that session use old or new timezone?
- Is timezone immutable after trade session starts?

**Hidden Dependency:** trades.create mutation depends on User.timezone being in context, but this is not explicitly wired in either architecture doc.

**Risk Level:** 🔴 **CRITICAL** — Creates N+1 query anti-pattern or silent bugs if timezone-context misses

**Recommended Fix:**

In target-architecture.md §2 (System Overview), add to **Middleware** layer:

```typescript
// src/middleware.ts (edge runtime)
export const middleware = (req: NextRequest) => {
  const userId = req.headers.get("x-user-id")  // from JWT
  const userContext = await getUserContextCache(userId)  // includes timezone
  
  req.headers.set("x-user-timezone", userContext.timezone)
}

// src/server/trpc/init.ts — extract from header
export async function createTRPCContext() {
  return {
    userId: req.headers.get("x-user-id"),
    timezone: req.headers.get("x-user-timezone"),  // ← NEW
    prisma: getPrismaClient(),
  }
}

// trade-service.ts — use from context, no additional query
export async function classifySession(opts: {
  openTime: Date
  timezone: string  // ← from context
}): Promise<SessionType> { ... }
```

**Action:** Add to PRE-IMPLEMENTATION checklist:
- [ ] Define timezone propagation path (middleware → context → trade-service)
- [ ] Add integration test: create 2 trades in different timezones, verify session classification differs
- [ ] Document: "Timezone is captured from User at request time; changes don't retroactively affect existing trades"

---

### Gap 3: Error Message Normalization Missing ⚠️ CRITICAL

**Issue:** SPRINT_3_IMPLEMENTATION_PLAN.md §154-195 (Priority 2: Toast Coverage) specifies:
```typescript
const mutation = trpc.trades.create.useMutation({
  onError: (err) => toast.error(err.message),  // ← RAW err.message
})
```

But target-architecture.md §2 ("Cross-Cutting Concerns") requires:
> "All domain errors as `TRPCError` with typed codes; error boundaries on every page"

**Problem:** TRPCError has multiple error types with technical messages:
- Zod validation: `"Expected number, received string at rMultiple"`
- Database: `"violates unique constraint \"trades_import_ticket_key\""`
- Auth: `"User not found in session"`

**None of these are user-friendly.** If toast shows raw Zod error, trader sees technical garbage.

**Violation of target-architecture.md §1 Design Principle #5:**
> "Graceful degradation — every missing configuration shows a clear empty state, not a silent failure"

Toast should also show clear, actionable messages, not raw error codes.

**Risk Level:** 🔴 **CRITICAL** — UX regression: users see unhelpful error messages across 40+ mutations

**Recommended Fix:**

Create centralized error message normalizer:

```typescript
// src/lib/error-formatter.ts (NEW)

export function formatErrorForUser(error: TRPCClientError<AppRouter>): string {
  // Map TRPC error codes to user-friendly messages
  if (error.data?.code === "BAD_REQUEST") {
    if (error.message.includes("rMultiple")) return "Invalid R-multiple value"
    if (error.message.includes("pnl")) return "Invalid P&L amount"
  }
  
  if (error.data?.code === "UNAUTHORIZED") 
    return "You don't have permission for this action"
  
  if (error.data?.code === "NOT_FOUND")
    return "This item no longer exists"
  
  if (error.data?.code === "CONFLICT")
    return "This trade already exists (duplicate detected)"
  
  // Fallback: safe generic message
  return "Operation failed. Please try again or contact support."
}

// Usage in mutations:
const mutation = trpc.trades.create.useMutation({
  onError: (err) => toast.error(formatErrorForUser(err)),
})
```

**Action:** Add to PRE-IMPLEMENTATION checklist:
- [ ] Create `src/lib/error-formatter.ts` before implementing Priority 2 (toast coverage)
- [ ] Map all possible TRPCError codes to user messages in router layer
- [ ] Test: every mutation error shows a user-friendly message (not raw Zod/DB errors)

---

## 2. Hidden Dependencies

### Dependency D-001: Profile Changes → Analytics Cache Invalidation

**Discovery:** TASK-006 saves `baseCurrency` and `timezone` to User. But target-architecture.md §3.2 shows analytics cache is keyed by `(userId, period)`.

**Implicit Dependency:**
- User changes `baseCurrency` from "USD" to "EUR"
- Analytics cache was computed with USD
- Cache TTL is 5 minutes (target-architecture.md §3.2)
- User sees analytics in USD for 5 more minutes = **stale currency conversion**

**Similar issue:** If timezone changes, all session classifications are stale.

**Hidden**: Neither SPRINT_3 nor target-architecture mentions cache invalidation on profile changes.

**Risk Level:** 🟠 **HIGH** — Silent data inconsistency for 5 minutes after profile change

**Recommended Fix:**

Add to `profile.update()`:

```typescript
// src/server/trpc/routers/profile.ts
updateProfile: protectedProcedure
  .input(...)
  .mutation(async ({ ctx, input }) => {
    const updated = await ctx.prisma.user.update(...)
    
    // Invalidate analytics cache if currency/timezone changed
    if (input.baseCurrency || input.timezone) {
      await ctx.prisma.tradeStatsCache.deleteMany({
        where: { userId: ctx.userId }
      })
    }
    
    return updated
  })
```

**Action:** Add to IMPLEMENTATION checklist:
- [ ] Profile.update invalidates analytics cache if baseCurrency or timezone change
- [ ] Integration test: change currency, verify cache clears

---

### Dependency D-002: TASK-006 → All Downstream Tasks (Tight Coupling)

**Discovery:** SPRINT_3_IMPLEMENTATION_PLAN.md §358-376 lists 7+ downstream tasks:
- TASK-030 (UserPreferences)
- TASK-033 (AI Config)
- TASK-045 (Theme toggle)
- TASK-046 (Accent color)
- TASK-050 (Goal setting)
- TASK-051 (Custom tags)
- TASK-052 (Onboarding)

**All depend on TASK-006.** If TASK-006 misses delivery (>8h estimate), entire Sprint 4 queue is blocked.

**Implicit Risk:** No fallback or partial-delivery path for TASK-006.

**Plan Mitigation:** SPRINT_3_IMPLEMENTATION_PLAN.md §384-386 mentions:
> "If Milestone 2 takes >4h, break into smaller PRs (schema → router → page) and ship incrementally."

**But this is NOT EXPLICIT:** No PR structure defined, no partial-acceptance criteria.

**Hidden**: Downstream tasks are blocked on monolithic TASK-006, not modular deliverables.

**Risk Level:** 🟠 **HIGH** — Sprint 4 could be entirely blocked if TASK-006 misses

**Recommended Fix:**

Refactor TASK-006 into 4 independent PRs (matching milestones):

**PR-1: Profile Schema + Router** (2h)
- User.weeklyTradesGoal, weeklyPnlGoal, disciplineGoal, onboardingCompleted added to schema
- `profile.ts` router with all 5 procedures (get, update, changePassword, exportData, deleteAccount)
- Unit tests for each procedure
- **Acceptance:** Router compiles, tests pass, no integration required
- **Unblocks:** TASK-030, TASK-033 can read User fields

**PR-2: Profile Page + Form** (1.5h)
- `perfil/page.tsx` with form skeleton
- Wire `profile.get()` to pre-populate
- Wire `profile.update()` to all inputs
- **Acceptance:** Form renders, persists changes
- **Unblocks:** TASK-045, TASK-046 can build on working page

**PR-3: Password + Export + Delete** (1.5h)
- Change password modal
- Export data flow
- Delete account confirmation
- **Acceptance:** All 3 flows complete end-to-end
- **Unblocks:** TASK-052 (onboarding) can reference profile page

**PR-4: QA + Propagation Tests** (1h)
- Integration tests for timezone → session classification
- Test cascade delete
- Type checking, coverage >80%
- **Acceptance:** All tests pass, zero regressions
- **Unblocks:** All downstream tasks ready to start

**Action:** Add to PRE-IMPLEMENTATION checklist:
- [ ] Redefine TASK-006 as 4 modular PRs with independent acceptance
- [ ] Each PR can be merged to main independently
- [ ] Downstream tasks can start immediately after PR-1 (if needed)

---

### Dependency D-003: Discipline Score Formula Aggregation Location

**Discovery:** TASK-011 (SPRINT_3_IMPLEMENTATION_PLAN.md §265-288) extracts `calcDisciplineScore()` to `lib/formulas/discipline.ts`.

**But:** The formula is pure calculation (given 6 parameters, return score). The **aggregation** of those 6 parameters (counting tagged trades, completed reviews, etc.) is a domain concern.

**Hidden Dependency:** Where does `calcDisciplineScore()` get called from?
- Option A: From `weekly-reviews.ts` router (thin router calling formula) ✓ Correct
- Option B: From a `discipline-service.ts` that aggregates then calculates (better domain layering)

**Current state:** Not specified in either doc. If it's Option B, need to create `discipline-service.ts` (violates "extract to formula" intent).

**Risk Level:** 🟡 **MEDIUM** — TASK-011 might extract formula without defining aggregation, creating partial refactor

**Recommended Fix:**

Define explicit service layer:

```typescript
// src/domains/analytics/services/discipline-service.ts (NEW)
export async function computeDisciplineScore(userId: string, period?: DateRange): Promise<DisciplineBreakdown> {
  const trades = await prisma.trade.findMany({ where: { userId, ... } })
  const resources = await prisma.learningResource.findMany({ where: { userId, ... } })
  const rules = await prisma.rule.findMany({ where: { userId, ... } })
  
  // Aggregate parameters
  const params = {
    totalTrades: trades.length,
    taggedViolations: trades.filter(t => hasBehavioralTag(t)).length,
    pendingReviews: resources.filter(r => r.status === "IN_REVIEW").length,
    completedReviews: resources.filter(r => r.status === "MASTERED").length,
    totalEnabledRules: rules.filter(r => !r.disabled).length,
    violatedRules: rules.filter(r => r.violated).length,
  }
  
  // Call formula
  return calcDisciplineScore(params)
}
```

**Action:** Add to IMPLEMENTATION checklist:
- [ ] Define discipline aggregation service (not just formula)
- [ ] TASK-011 calls service, not raw formula
- [ ] Service is independently testable

---

## 3. Possible Regressions

### Regression R-001: User Schema Changes Expose Sensitive Fields

**Trigger:** Profile.get() returns all User fields from schema.

**Current User fields (target-architecture.md §4.1):**
- Harmless: name, email, timezone, baseCurrency, language
- Goal-related: weeklyGoalMinutes, weeklyTradesGoal, weeklyPnlGoal, disciplineGoal
- System: currentStreak, bestStreak, lastReviewDate, onboardingCompleted

**But:** If someone adds sensitive fields (e.g., `adminRole`, `apiKey`, `emailVerified`), profile.get() exposes them.

**Regression Vector:** In future phases, if fields are added carelessly, they're automatically exposed via profile API.

**Risk Level:** 🟠 **HIGH** — Security regression if sensitive fields are added later

**Recommended Fix:**

Use explicit whitelist in profile.get():

```typescript
// src/server/trpc/routers/profile.ts
const PROFILE_PUBLIC_FIELDS = {
  id: true,
  email: true,
  name: true,
  timezone: true,
  baseCurrency: true,
  language: true,
  emailNotifications: true,
  weeklyGoalMinutes: true,
  weeklyTradesGoal: true,
  weeklyPnlGoal: true,
  disciplineGoal: true,
  currentStreak: true,
  bestStreak: true,
  lastReviewDate: true,
  onboardingCompleted: true,
} as const

getProfile: protectedProcedure
  .query(async ({ ctx }) => {
    return await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
      select: PROFILE_PUBLIC_FIELDS,  // ← Explicit whitelist
    })
  })
```

**Action:** Add to IMPLEMENTATION checklist:
- [ ] Define PROFILE_PUBLIC_FIELDS constant
- [ ] profile.get() uses select whitelist (not full User)
- [ ] Code review verifies no sensitive fields in whitelist

---

### Regression R-002: Password Change Doesn't Invalidate Client Session

**Trigger:** profile.changePassword() calls Supabase Auth, but what about:

**Client-side state that's not invalidated:**
- TanStack Query cache (user might be in `@me` state)
- Cookies (Supabase Auth manages, but Next.js might cache)
- JWT in localStorage (if using manual storage, not automatic)

**Regression Vector:** User changes password, but:
- API continues working (JWT not revoked server-side? Depends on Supabase Auth implementation)
- TanStack Query continues returning cached `profile.get()` result
- User *thinks* they're logged in with new password, but actually using old JWT

**Risk Level:** 🔴 **CRITICAL** — Security regression: password change doesn't actually log out

**Recommended Fix:**

Add explicit session invalidation:

```typescript
// src/server/trpc/routers/profile.ts
changePassword: protectedProcedure
  .input(z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8),
  }))
  .mutation(async ({ ctx, input }) => {
    // Call Supabase Auth password change
    const { error } = await supabase.auth.updateUser({
      password: input.newPassword
    })
    
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message })
    
    // CRITICAL: Invalidate all user sessions
    // Option 1: Supabase Auth automatically revokes old sessions (verify!)
    // Option 2: Manually revoke using Supabase Admin API
    // Option 3: Set a password-changed flag, force re-login
    
    // Client-side: middleware or hook needs to clear cache
    return { success: true, message: "Password changed. Please log in again." }
  })

// Client-side (in component or mutation hook):
const mutation = useChangePasswordMutation({
  onSuccess: () => {
    // Clear all caches
    queryClient.clear()
    // Force logout
    await supabase.auth.signOut()
    // Redirect to login
    router.push("/login")
  },
})
```

**Action:** Add to IMPLEMENTATION checklist:
- [ ] Verify Supabase Auth behavior: does password change revoke JWT?
- [ ] Test: old JWT returns 401 after password change
- [ ] Client-side: changePassword mutation clears cache and logs out
- [ ] Security review required before merge

---

### Regression R-003: Delete Account Cascade Delete Incomplete

**Trigger:** profile.deleteAccount() uses `onDelete: Cascade` on User relations.

**But not all entities have explicit cascade:**

Current Prisma schema shows:
```prisma
model Trade {
  userId String @map("user_id")
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**But what about:**
- TradeEvent (child of Trade — cascade on Trade, not on User)
- TradeEmbedding (references Trade, not User directly)
- AiUsageLog (references User, but no explicit cascade in schema)
- EmailLog (references User, but no explicit cascade)
- TradeChecklistResult (references Trade + TradeChecklistItem)

**Regression Vector:** Delete account succeeds, but leaves orphaned:
- EmailLog rows (minor, but violates referential integrity)
- AiUsageLog rows (minor, but skews cost tracking)
- TradeEmbedding rows (minor, but embedding search returns 404)

**Risk Level:** 🟠 **HIGH** — Silent data inconsistency after delete; violates database integrity

**Recommended Fix:**

Audit and add explicit cascades to schema:

```prisma
model AiUsageLog {
  // ...
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)  // ← ADD
}

model EmailLog {
  // ...
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)  // ← ADD
}

model TradeEmbedding {
  // ...
  user  User  @relation(fields: [userId],  references: [id], onDelete: Cascade)
  trade Trade @relation(fields: [tradeId], references: [id], onDelete: Cascade)
}
```

**Then test delete account:**

```typescript
// Integration test
it("deleteAccount removes all user data", async () => {
  const userId = "test-user-123"
  
  // Create full user graph
  const user = await prisma.user.create({ data: {...} })
  const trade = await prisma.trade.create({ data: { userId, ... } })
  const embedding = await prisma.tradeEmbedding.create({ data: { userId, tradeId: trade.id } })
  const log = await prisma.emailLog.create({ data: { userId, ... } })
  
  // Delete account
  await profile.deleteAccount(userId)
  
  // Verify ALL deleted
  expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull()
  expect(await prisma.trade.findMany({ where: { userId } })).toEqual([])
  expect(await prisma.tradeEmbedding.findMany({ where: { userId } })).toEqual([])
  expect(await prisma.emailLog.findMany({ where: { userId } })).toEqual([])
  expect(await prisma.aiUsageLog.findMany({ where: { userId } })).toEqual([])
})
```

**Action:** Add to IMPLEMENTATION checklist:
- [ ] Audit schema for all User relations; add onDelete: Cascade where missing
- [ ] Integration test: delete account removes ALL user data, no orphans
- [ ] Verify referential integrity after delete

---

### Regression R-004: Skeleton Screen / Empty State Logic Collision

**Trigger:** TASK-042 and TASK-043 add skeleton screens and empty states.

**Collision Vector:**
```typescript
// Risk: What if both render?
return isLoading ? <KpiSkeleton /> :
       data.length === 0 ? <EmptyState /> :
       <Content />
```

**But what if:**
- Query is loading AND user has no data (both states true)
- Query errors and data is stale (stale > empty)
- Query succeeds but returns null (not same as empty array)

**Regression Vector:** Shows skeleton when it should show empty state, or vice versa.

**Risk Level:** 🟡 **MEDIUM** — UX confusion, but not data loss

**Recommended Fix:**

Define explicit state machine:

```typescript
type LoadState = "loading" | "error" | "empty" | "content"

function getLoadState(query: UseQueryResult): LoadState {
  if (query.status === "pending") return "loading"
  if (query.status === "error") return "error"
  if (query.data?.length === 0) return "empty"
  return "content"
}

return {
  loading: <KpiSkeleton />,
  error: <ErrorBoundary error={query.error} />,
  empty: <EmptyState />,
  content: <Content data={query.data} />,
}[getLoadState(query)]
```

**Action:** Add to IMPLEMENTATION checklist:
- [ ] Define LoadState type
- [ ] Every component using skeletons/empty states uses getLoadState()
- [ ] Test all state transitions (loading → empty, loading → content, error, etc.)

---

## 4. Architecture Violations

### Violation V-001: "Single Source of Truth" — Discipline Score Still Fragmented

**Target-Architecture Requirement** (§1 Design Principle #1):
> "Single source of truth — every formula, every enum, every type has one canonical location. Duplication is a bug."

**Current State:**
- Formula in `lib/formulas/` (target)
- Aggregation in weekly-reviews.ts (current)
- Aggregation in create-review-modal.tsx (current)
- Aggregation in dashboard-analytics.ts (current)

**TASK-011 Plan:** Extract formula, but doesn't consolidate aggregation.

**After TASK-011 (if not fixed), you still have:**
- Formula centralized ✓
- Aggregation duplicated ✗ (3 places still calculate parameters differently?)

**Violation:** Moving formula doesn't fix the root cause (parameter calculation).

**Risk Level:** 🟡 **MEDIUM** — Same silent divergence risk remains

**Recommended Fix:**

Define authoritative aggregation service (in addition to formula):

```typescript
// src/domains/analytics/services/discipline-service.ts
export async function computeWeeklyDisciplineScore(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<DisciplineBreakdown> {
  // Single source of truth for aggregation
  return disciplineService.aggregateAndCalculate(userId, weekStart, weekEnd)
}

// Replace all 3 aggregations with calls to this service
// weekly-reviews.ts, create-review-modal.tsx, dashboard-analytics.ts all call the same service
```

**Action:** Add to IMPLEMENTATION checklist:
- [ ] TASK-011 creates discipline-service with aggregation, not just formula
- [ ] All 3 call sites import from service, not from formula directly
- [ ] Tests verify all call sites produce identical scores

---

### Violation V-002: "Routers Thin" — TASK-006 Profile.update May Violate Layer Boundary

**Target-Architecture Requirement** (§2 "Layer Descriptions"):
> "Application layer: Auth check, input parsing (Zod), orchestration. Calls domain services. Target: <200 LOC per router."

**Risk:** profile.update() might contain complex validation/business logic:

```typescript
// ANTI-PATTERN: Complex logic in router
updateProfile: protectedProcedure
  .input(z.object({ ... }))
  .mutation(async ({ ctx, input }) => {
    // Logic 1: Validate timezone
    if (input.timezone && !isValidTimezone(input.timezone)) throw ...
    
    // Logic 2: Validate email change (if added later)
    if (input.email && email already exists) throw ...
    
    // Logic 3: Normalize fields
    const normalized = {
      name: input.name?.trim(),
      timezone: input.timezone?.toUpperCase(),
    }
    
    // Logic 4: Check permissions
    if (email changes && user.email === "admin@...") throw ...
    
    // Logic 5: Cache invalidation
    if (input.currency) await clearAnalyticsCache(ctx.userId)
    
    // And then update
    return await ctx.prisma.user.update(...)
  })
```

**Violation:** Business logic (permission checks, field normalization, cache invalidation) belong in a service, not router.

**Risk Level:** 🟡 **MEDIUM** — Router balloons beyond 200 LOC; logic not independently testable

**Recommended Fix:**

Extract to service:

```typescript
// src/domains/profile/services/profile-service.ts (NEW)
export class ProfileService {
  async validateProfileUpdate(input: UpdateProfileInput): Promise<ValidationError[]>
  async normalizeProfileInput(input: UpdateProfileInput): Promise<NormalizedInput>
  async handleProfileUpdate(userId: string, input: NormalizedInput): Promise<User>
}

// Router becomes thin:
updateProfile: protectedProcedure
  .input(...)
  .mutation(async ({ ctx, input }) => {
    // Validate
    const errors = await profileService.validateProfileUpdate(input)
    if (errors.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: errors[0] })
    
    // Normalize
    const normalized = await profileService.normalizeProfileInput(input)
    
    // Update
    return await profileService.handleProfileUpdate(ctx.userId, normalized)
  })
```

**Action:** Add to IMPLEMENTATION checklist:
- [ ] Create profile-service.ts before implementing profile router
- [ ] Router delegates all business logic to service
- [ ] Router <100 LOC; service is independently testable

---

### Violation V-003: "Server-Aggregated Analytics" — Export Data May Violate Principle

**Target-Architecture Requirement** (§1 Design Principle #4):
> "Server-aggregated analytics — no client-side KPI computation over unbounded data arrays. All aggregation happens in `domains/analytics/` before the response crosses the network."

**Risk:** profile.exportData() returns raw trades array, and client parses it.

**Is this a violation?** Technically, export data is not "analytics" (KPIs), so maybe not. But:
- User downloads 100K trades
- Browser parses 100K trades as JSON
- Client-side processing (Excel export, local visualization) is now done by user's underpowered browser

**Violation of Spirit:** Analytics principle implies "aggregation on server, simple results to client."

**Risk Level:** 🟡 **MEDIUM** — Violates philosophy, but not critical (export is not analytics)

**Recommended Fix:**

Option 1 (Stricter): Offer server-side export aggregation
```typescript
exportData: protectedProcedure
  .input(z.enum(["full", "trades_summary", "reviews_summary"]))
  .query(...)
  // full: all data (streaming)
  // trades_summary: aggregated stats
  // reviews_summary: aggregated reviews
```

Option 2 (Pragmatic): Keep full export, but add note in docs:
> "Export data is provided for GDPR/portability. Large exports (>10K trades) may take time to download and process."

**Action:** Add to IMPLEMENTATION checklist:
- [ ] Decide: strict aggregation or pragmatic full-export
- [ ] If full-export: add user warning for large datasets
- [ ] If strict: implement separate export endpoints (full, summary, etc.)

---

## 5. Recommendations Before Implementation

### Pre-Implementation Checklist

**Before any code is written for Sprint 3:**

- [ ] **Gap 1: Export Size Management**
  - [ ] Define MAX_EXPORT_SIZE constant (suggest: 50MB)
  - [ ] Add error handling for oversized exports
  - [ ] Integration test: export with 10K+ trades succeeds without timeout

- [ ] **Gap 2: Timezone Propagation**
  - [ ] Define timezone propagation path: User → Middleware → Context → trade-service
  - [ ] Add timezone to tRPC context (in init.ts)
  - [ ] Integration test: change timezone, verify subsequent trades classified correctly

- [ ] **Gap 3: Error Normalization**
  - [ ] Create src/lib/error-formatter.ts
  - [ ] Map all TRPCError codes to user-friendly messages
  - [ ] All 40+ mutations use formatErrorForUser() not raw err.message
  - [ ] Test: trigger each mutation error, verify user-friendly toast

- [ ] **Dependency D-001: Cache Invalidation**
  - [ ] profile.update() invalidates analytics cache if baseCurrency/timezone change
  - [ ] Test: change currency, verify cache clears immediately

- [ ] **Dependency D-002: TASK-006 Modularity**
  - [ ] Restructure TASK-006 into 4 independent PRs (PR-1 through PR-4)
  - [ ] Each PR has independent acceptance criteria
  - [ ] Downstream tasks can start after PR-1 (if needed)

- [ ] **Dependency D-003: Discipline Service**
  - [ ] Create discipline-service.ts (not just formula)
  - [ ] TASK-011 calls service, not formula directly
  - [ ] All 3 aggregation sites use the same service

- [ ] **Regression R-001: Field Whitelisting**
  - [ ] profile.get() uses explicit PROFILE_PUBLIC_FIELDS whitelist
  - [ ] Not full User object

- [ ] **Regression R-002: Password Change Invalidation**
  - [ ] Verify Supabase Auth revokes JWT on password change
  - [ ] Client mutation clears cache and logs out
  - [ ] Security test: old JWT returns 401 after password change

- [ ] **Regression R-003: Cascade Delete Completeness**
  - [ ] Audit schema for all User relations; add onDelete: Cascade where missing
  - [ ] Integration test: delete account removes ALL user data, no orphans

- [ ] **Regression R-004: LoadState Machine**
  - [ ] Define LoadState type (loading | error | empty | content)
  - [ ] All skeletons/empty states use getLoadState()
  - [ ] Test all state transitions

- [ ] **Violation V-001: Discipline Aggregation**
  - [ ] TASK-011 consolidates aggregation (not just formula)
  - [ ] All 3 call sites use canonical service

- [ ] **Violation V-002: Profile Service**
  - [ ] Create profile-service.ts before router
  - [ ] Router <100 LOC; delegates all logic to service

- [ ] **Violation V-003: Export Data Scope**
  - [ ] Decide: full export or aggregated export options
  - [ ] Add warnings/documentation for user

---

## 6. Revised Implementation Order

**After addressing all gaps above, implement in this order:**

1. **Foundation (Day 1):**
   - [ ] Create error-formatter.ts
   - [ ] Create discipline-service.ts
   - [ ] Create profile-service.ts
   - [ ] Update schema with cascades

2. **Profile Backend (Days 2–5): TASK-006 (4 PRs)**
   - [ ] PR-1: Schema + Router (2h)
   - [ ] PR-2: Page + Form (1.5h)
   - [ ] PR-3: Password + Export + Delete (1.5h)
   - [ ] PR-4: Tests + QA (1h)

3. **Toast Coverage (Day 5): Priority 2**
   - [ ] Audit all mutations
   - [ ] Add onError with formatErrorForUser()
   - [ ] Test all 40+ mutations

4. **Prisma Migration (Day 6): Priority 3**
   - [ ] Run prisma db push
   - [ ] Verify tables created

5. **UX Foundations (Days 6–7): TASK-042 + 043**
   - [ ] Skeleton screens (4h)
   - [ ] Empty states (4h)

6. **Formula (Day 7): TASK-011**
   - [ ] Discipline service (already created)
   - [ ] Update 3 call sites

---

## 7. Risk Mitigation Summary

| Risk | Severity | Mitigation | Owner | Timeline |
|---|---|---|---|---|
| Export size limit missing | 🔴 CRITICAL | Define MAX_EXPORT_SIZE, add error handling | BE | Pre-implementation |
| Timezone propagation unclear | 🔴 CRITICAL | Define propagation path, add to context | BE | Pre-implementation |
| Error messages not user-friendly | 🔴 CRITICAL | Create error-formatter.ts | FE | Pre-implementation |
| Cache invalidation undefined | 🟠 HIGH | profile.update() invalidates on baseCurrency/timezone | BE | Implementation |
| TASK-006 monolithic | 🟠 HIGH | Restructure into 4 PRs | BE/FE | Pre-implementation |
| Password change doesn't invalidate JWT | 🔴 CRITICAL | Security test required | BE | Implementation |
| Cascade delete incomplete | 🟠 HIGH | Audit schema, add missing cascades | BE | Pre-implementation |
| LoadState collision | 🟡 MEDIUM | Define state machine | FE | Implementation |
| Discipline aggregation duplicated | 🟡 MEDIUM | Create discipline-service | BE | Pre-implementation |
| Profile router too complex | 🟡 MEDIUM | Extract to profile-service | BE | Pre-implementation |

---

## Conclusion

**SPRINT_3_IMPLEMENTATION_PLAN is aligned with target-architecture.md principles** (CQRS, domain services, single source of truth, graceful degradation). However, **3 critical gaps and 7 hidden dependencies must be addressed before implementation starts.**

**Recommend:**
1. **Do NOT start coding yet.** Complete the pre-implementation checklist (3–4 hours).
2. **Create foundational services first:** error-formatter, discipline-service, profile-service.
3. **Restructure TASK-006 into 4 modular PRs** to reduce blocking risk.
4. **Add explicit integration tests** for the 5 most critical paths (timezone propagation, password change, cascade delete, cache invalidation, LoadState collision).

**Expected overhead:** 4–6 hours pre-implementation work to address gaps. **Payoff:** Reduced regression risk, clearer architecture, unblocked downstream tasks.

Once these gaps are closed, proceed with confidence. The plan is sound; it just needs architectural clarity before execution.

---

*Architecture Review completed. Ready for pre-implementation work.*
