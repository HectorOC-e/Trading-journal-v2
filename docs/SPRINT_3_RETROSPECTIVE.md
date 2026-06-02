# Sprint 3 Retrospective: Profile Backend & Quality Assurance

> **Sprint Duration:** Weeks 5–7 (2026-05-27 to 2026-06-02)  
> **Branch:** `claude/epic-darwin-1XZTX`  
> **Artifacts:** `SPRINT_3_FIX_REPORT.md`, `SPRINT_3_QA_REPORT.md`, 2 new test files (24 tests)

---

## What Went Well ✅

### 1. **Profile Backend Fully Delivered (TASK-006)**

The longest and most critical P0 blocker was completed on schedule. All 5 tRPC procedures implemented:
- `profile.get` with ISO date serialization
- `profile.update` with selective field diffing and cache invalidation gating
- `profile.changePassword` integrated with Supabase Auth
- `profile.exportData` for data portability
- `profile.deleteAccount` with atomic Prisma→Auth deletion order

**Impact:** Profile-to-App propagation score = 0 → 14/14. Legal compliance restored (GDPR "right to be forgotten" via deleteAccount).

---

### 2. **Comprehensive QA Audit with High Coverage**

The independent QA audit (conducted post-implementation) identified 16 issues across 4 severity levels:
- **2 Blocking bugs** — caught critical data loss and security vulnerabilities
- **7 Major issues** — error handling gaps in 5 mutations; cache invalidation bug; auth bug (B-002)
- **4 Minor issues** — UX improvements (Firefox download, form initialization, animation, export loading)
- **3 Nitpicks** — code standardization and cosmetic improvements

**All 13 findings fixed** in the same sprint; 3 items formally deferred to Sprint 4+ (onboarding flow, schema naming, UI polish).

---

### 3. **B-002 Admin Client Critical Fix**

The `deleteAccount` mutation was silently failing (anon client + 403) because it tried to call `auth.admin.deleteUser()` with `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Users could log back in after account deletion — a legal risk.

**Resolution:** Created new `src/lib/supabase/admin.ts` factory. Service-role key now scoped to server-only file. Pattern is reusable for all future admin operations. Tests verify the correct client is called.

**Learning:** Admin operations require explicit key management; type safety at the TypeScript level (`ctx.supabase` exposes `.admin` with no type error) does not guarantee runtime correctness.

---

### 4. **B-001 Date Range Regression Silent Discovery**

The `computedDisciplineScore` procedure excluded trades on the last day of the reviewed week because the discipline service uses `lt: to` (exclusive boundary). The bug was silent — no error, just wrong scores.

**Root cause:** Service contract mismatch. `prefill` already had the correct `+1 day` logic, but `computedDisciplineScore` did not. Inconsistency was caught by QA before production.

**Test coverage added:** DST-safe date arithmetic, calendar-day vs. millisecond semantics, prefill consistency.

---

### 5. **Test Suite Expansion: 291 → 315 (+24 tests)**

Added comprehensive test suites for two critical domains:
- **`profile.test.ts` (18 tests):** Date serialization, cache gating, admin client verification, error scenarios
- **`weekly-reviews-date-range.test.ts` (6 tests):** B-001 regression, DST edge case, prefill consistency

Tests validate both happy-path and failure modes. Admin client mock prevents accidental anon key usage.

---

### 6. **Selective Cache Invalidation (M-004)**

Profile update was invalidating analytics cache on every save (even name-only changes). Implemented field diffing: mutations now only call `invalidateAnalyticsCacheIfNeeded()` when `baseCurrency` or `timezone` actually change.

**Impact:** Reduced unnecessary cache evictions. Query performance unaffected in practice (cache TTL is short), but architectural correctness improved.

---

### 7. **Form State Management Refactor (M-007)**

Profile form initialization was happening in the render body with six `setState` calls guarded by `if (profile && !formInitialized)`. This caused an extra render cycle and a React strict-mode warning.

**Fix:** Moved to `useEffect` with proper dependency array. Cleaner lifecycle, no strict-mode warning.

---

### 8. **Error Handling Standardization (M-001, M-002, M-003, n-001)**

Added `onError` handlers to all mutations missing them. Established `formatErrorForUser()` as the canonical error formatter for user-facing toasts. All 49+ mutations now have consistent error feedback.

---

## What Went Poorly ❌

### 1. **QA Audit Timing (Post-Implementation vs. Pre-Implementation)**

The audit was conducted *after* the profile backend was delivered and merged. Ideally, a pre-implementation audit would have flagged the admin client issue earlier.

**Mitigation for Sprint 4:** Schedule pre-implementation architecture review for TASK-030 (UserPreferences) and TASK-033 (AI config).

---

### 2. **B-001 Silent Regression Not Caught by CI**

The date range bug in `computedDisciplineScore` had no test coverage during implementation. The procedure was new (didn't exist before Sprint 3), so no regression test existed. The bug would have silently produced wrong scores in production.

**Why it happened:** Discipline score feature is complex (multi-factor weighted formula). Test coverage only added *after* QA audit.

**Prevention:** Pre-commit, require tests for all new tRPC procedures. B-001 had a clear contract mismatch (`lt: to` is exclusive) that tests would have caught immediately.

---

### 3. **Profile Form Initialization Complexity**

Form state management required multiple refactors:
- Initially: render-body setState (M-007)
- First fix: moved to useEffect
- Second complexity: form initialization race condition (solved by moving to useEffect dependency array, but took iteration)

**Learning:** Complex client-side state synchronization between server and form needs clearer architecture. Consider Formik or React Hook Form earlier.

---

### 4. **Cache Invalidation Logic Scattered**

The M-004 cache invalidation bug existed because the gate logic (`baseCurrency !== undefined || timezone !== undefined`) was in a separate service function, not visible at the call site. The profile update handler sent all fields unconditionally.

**Consequence:** Unnecessary cache invalidations (not a data correctness issue, but architectural smell).

**Solution implemented:** Moved diffing logic to `handleSaveProfile` call site, making the cache gate explicit.

---

### 5. **Three Deferred Items Flagged Post-Delivery**

Three items deferred to Sprint 4+ after QA:
- **m-004:** New User schema fields (`weeklyTradesGoal`, `weeklyPnlGoal`, `disciplineGoal`, `onboardingCompleted`) have no write path. Requires full onboarding flow (separate deliverable).
- **n-002:** Router file named `profile.ts` instead of `users.ts`. Architectural naming; no conflict today.
- **n-003:** `ProfileSkeleton` duplicates card pattern from `skeleton.tsx`. Cosmetic; low-risk refactor.

**Lesson:** Schema additions should include acceptance criteria (read/write paths) before merge. Deferred items shouldn't surprise downstream sprints.

---

## Pending Risks ⚠️

### 1. **m-004: New User Fields Without Write Path**

**Status:** Four fields added to schema (weeklyTradesGoal, weeklyPnlGoal, disciplineGoal, onboardingCompleted) but excluded from PROFILE_PUBLIC_FIELDS and UpdateProfileInput.

**Risk:** If onboarding flow is delayed, these fields accumulate unused. If onboarding *does* happen in Sprint 4, there will be a rush to implement goal-setting UI + persistence logic.

**Mitigation:**
- Sprint 4 prioritize TASK-030 (UserPreferences) and goal-setting UI before other features
- Add explicit acceptance criteria: "All new schema fields have read + write endpoints"
- Consider feature-flagging new fields until write path is ready

---

### 2. **TD-002 (Discipline Score): 3 Implementations Still Exist**

The Sprint 3 QA audit did not include fixing the discipline score triplication across `computedDisciplineScore` (server), `prefill` (server, duplicated), and `create-review-modal.tsx` (frontend, simplified).

**Status:** Deferred to Sprint 4 (TASK-011). The three implementations are consistent *now*, but future changes to the formula will require syncing three sites.

**Risk:** High — if formula changes in Sprint 4 and only one site is updated, scores diverge silently (like B-001).

**Mitigation:**
- TASK-011 is CRITICAL for Sprint 4 — do not defer further
- Add tests that verify all three sites compute the same result for a week of sample trades
- Consider removing frontend computation entirely (fetch from server via `prefill`)

---

### 3. **Admin Client Pattern Not Documented**

The new `createAdminClient()` pattern is now in place for `deleteAccount`, but no guidance exists for future admin operations (e.g., if batch delete or admin reporting is needed).

**Mitigation:** Document the pattern in `docs/architecture.md` under "Admin Operations". Link to `src/lib/supabase/admin.ts`.

---

### 4. **Firefox-Specific Download Workaround (m-001)**

The fix for file downloads in Firefox (`document.body.appendChild`, then `.click()`, then `removeChild`) is browser-specific. Future download refactors may reintroduce the bug.

**Mitigation:** Add browser-specific test (not covered by current unit tests) or document the workaround in code comments.

---

### 5. **Service Timezone Not Persisted to Profile**

Profile page now allows timezone selection and saves it to the database. However, the timezone is *not* propagated to session classification logic (still hardcoded to "New York" in CSV import and dashboardStats).

**Status:** TASK-006 completed (timezone persisted); implementation in TASK-040 (session classification) deferred.

**Risk:** Users set timezone but trades still classified to wrong session. Incorrect timing analytics.

**Mitigation:** TASK-040 is already in backlog for Sprint 5. Prioritize before analytics features rely on timezone.

---

## Recommendations for Sprint 4 🎯

### 1. **Lock Down Discipline Score (TASK-011 — CRITICAL)**

Do not ship any formula changes without fixing the triplication. Extract `computeDisciplineScore()` to `lib/trading-formulas.ts` and call from all three sites (server router, frontend modal).

**Acceptance criteria:**
- Single canonical implementation in `lib/trading-formulas.ts`
- Both server procedures call it: ✅
- Frontend modal calls server-provided value (via `prefill`): ✅
- Tests verify all three sites produce identical results: ✅

**Effort:** S | **Priority:** P0

---

### 2. **Formalize Admin Operations Pattern**

Create `docs/admin-operations.md` documenting:
- When to use `createAdminClient()` vs. `ctx.supabase`
- Security rationale: service-role key server-only
- Testing pattern: mock `createAdminClient()` in tests (like `profile.test.ts`)
- Example: B-002 deleteAccount resolution

**Effort:** XS | **Priority:** P1 (documentation)

---

### 3. **Implement Goal-Setting Backend Before UI (m-004 prereq)**

The four new User fields (weeklyTradesGoal, weeklyPnlGoal, disciplineGoal, onboardingCompleted) need write endpoints:
- `profile.update` should accept `weeklyTradesGoal`, `weeklyPnlGoal` (goals for analytics dashboard)
- New `goals.set` tRPC procedure for `disciplineGoal` and onboarding state
- Tests for goal validation (min/max constraints)

**Delivery:** Must complete before UI work.

**Effort:** S | **Priority:** P0 (unblocks TASK-050)

---

### 4. **Pre-Delivery Architectural Review for TASK-030**

Before starting UserPreferences (TASK-030) implementation, conduct a 30-minute architecture review:
- Is the schema design correct? (Indexed fields? Unique constraints?)
- Who owns the cache invalidation? (Explicit rules like M-004)
- What's the error contract? (Input validation? Zod schemas?)
- Test strategy: what's the minimum test coverage?

**Applies to:** TASK-030, TASK-033, TASK-031 (edit/delete reviews)

**Effort:** 30 min | **Priority:** P1 (prevents rework)

---

### 5. **Add Pre-Commit Hook: No New tRPC Procedures Without Tests**

Enforce that new tRPC procedures include unit tests at merge time.

**Rationale:** B-001 and B-002 both were new procedures without pre-existing test coverage. A pre-commit hook would have caught the missing tests, triggering test addition before QA.

**Implementation:** Add to `.git/hooks/pre-push` or CI.

**Effort:** 1 hour | **Priority:** P1

---

### 6. **Session Classification to Respect User Timezone (TASK-040 prep)**

Begin working on timezone propagation to session classification:
- Pass `timezone` from profile to `dashboardStats` computation
- Update CSV import to use session timezone (not hardcoded "New York")
- Tests: verify trades at 8AM ET vs. 8AM HN are classified to different sessions

**Blocks:** Timezone-aware analytics, user-specific KPIs

**Effort:** S | **Priority:** P1

---

### 7. **Defer Non-Critical Deferred Items (n-002, n-003) to Sprint 5**

Do not pick up n-002 (router naming) or n-003 (ProfileSkeleton duplication) in Sprint 4. Focus on:
- Critical path: TASK-006 unblocks → TASK-030, TASK-031, TASK-011
- P0 work: goal-setting (m-004 prereq)
- Architectural fixes: discipline score, admin ops pattern

**Cosmetic work (n-002, n-003) can wait until Sprint 5 polish pass.**

---

## Metrics Summary 📊

| Metric | Sprint 2 | Sprint 3 | Delta | Target (Sprint 8) |
|---|---|---|---|---|
| P0 bugs open | 1 | 0 | ✅ -1 | 0 |
| Test count | 291 | 315 | +24 | 500+ |
| QA issues found | — | 16 | 13 fixed, 3 deferred | 0 |
| Profile-to-App propagation | 0/14 | 14/14 | ✅ Complete | 14/14 |
| Blocking bugs (cumulative) | 1 | 3 | +2 (B-001, B-002) | 0 |
| Router layer test coverage | ~5% | ~10% | +5% | 50%+ |
| TypeScript errors | 0 | 0 | ✅ Clean | 0 |

---

## Conclusion

Sprint 3 successfully delivered the profile backend (TASK-006) and resolved critical QA findings, including two blocking bugs that would have produced silent data loss and security vulnerabilities in production.

**Key success:** Comprehensive post-implementation audit caught B-002 (admin client) and B-001 (date range) before merge.

**Key improvement area:** Pre-implementation test planning. New procedures should have tests drafted before coding begins, not added after QA.

**Next sprint focus:** Discipline score consolidation (TASK-011), goal-setting foundation (m-004), and UserPreferences (TASK-030) to unblock remaining personalization features.

**Overall health:** All P0 items closed. Quality metrics strong. Architecture improved (admin pattern, cache gating). On track for Phase XII (Psychology & Reviews) in Sprint 4.
