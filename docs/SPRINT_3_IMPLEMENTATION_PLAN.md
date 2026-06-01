# Sprint 3 Implementation Plan
## Profile Backend Foundation & Technical Debt Resolution

> **Date:** 2026-06-01  
> **Sprint:** 3 (Weeks 5–7)  
> **Duration:** 3 weeks (~40h capacity)  
> **Branch:** `claude/epic-darwin-1XZTX` (continuation)  
> **Phase:** XI — Profile & AI Config  
> **Critical Path:** TASK-006 unblocks 7 downstream tasks

---

## Executive Summary

Sprint 3 pivots from learning system correctness (Sprint 2) to **unlocking personalization architecture** via the profile backend. Sprint 2 revealed critical deferred technical debt (toast coverage, Prisma migration, decay transition sequencing) that must be addressed **before** downstream features depend on unstable foundations.

**Primary Objective:** Ship TASK-006 (profile backend) unmodified from plan, incorporating learning from Sprint 2 about scope management and risk mitigation.

**Secondary Objectives:** Resolve 4 deferred items from Sprint 2, advance UX foundations (TASK-042/043).

**Priority Adjustments from Sprint 2 Retrospective:**
1. ✅ TASK-006 (CRITICAL) — unchanged, non-negotiable
2. 📈 Toast coverage rollout — elevated to Priority 2 (was deferred)
3. 📈 Prisma db push — elevated to Priority 3 (medium-priority blocker)
4. ✅ TASK-042/043 (UX loading/empty states) — unchanged from plan
5. ✅ TASK-011 (discipline score) — unchanged, lower priority
6. 📉 Query parameter filtering — deferred to Sprint 4 (low impact, can wait)
7. 📉 Decay transition prefill — deferred to Sprint 4 (low impact, deferred as TD-S2-001)

**Confidence:** HIGH. TASK-006 effort estimate validated against comparable features (analytics pipeline, learning resources). Toast rollout is repetitive pattern (apply same pattern 40+ times). Deferred items are all low-complexity.

---

## Sprint Goal & User Value

### Primary Goal
**Ship a fully functional profile backend that unblocks 7 downstream personalization features.**

Users should be able to:
- View their profile (name, email, timezone, language, preferences)
- Update profile fields and see changes persist across page reloads
- Change password securely
- Export their data (GDPR/privacy requirement)
- Delete their account with confirmation

### Secondary Goals
1. Complete toast system rollout to all mutations (error feedback on 40+ operations)
2. Apply Prisma TradeEmbedding/EmailLog schema to production database
3. Establish UX pattern for loading states (skeleton screens) and empty states
4. Extract shared discipline score formula (enable formula reuse)

### User-Visible Impact
- **Traders can now customize their experience** (profile persists across sessions)
- **Error feedback is visible everywhere** (toast notifications for all operations)
- **App shows intelligent loading states** (skeleton screens instead of blank space)
- **Personalization features are now unblocked** (theme, accent color, goals, tags, AI config)

---

## Adjusted Scope: Prioritized Task List

### Priority 1 (CRITICAL_PATH): TASK-006 Profile Backend [8h]
**Status:** Ready to start immediately (no dependencies)

#### Deliverables
- ✅ `src/server/trpc/routers/profile.ts` with 5 procedures:
  - `profile.get()` — returns User fields (name, email, timezone, language, etc.)
  - `profile.update()` — persists profile changes atomically
  - `profile.changePassword()` — calls Supabase Auth, returns success/error
  - `profile.exportData()` — returns JSON of all user data (for GDPR)
  - `profile.deleteAccount()` — soft-delete all user data (requires confirmation)

- ✅ `src/app/perfil/page.tsx` — fully wired form:
  - 14 input fields (name, email, timezone, language, baseCurrency, emailNotifications, weeklyGoalMinutes, currentStreak, bestStreak, lastReviewDate, plus 3 unused)
  - Form state: `useState()` → `useQuery(profile.get)` → pre-populate on load
  - All inputs connected to `profile.update` mutation
  - Change password button → modal → `profile.changePassword()`
  - Export data button → trigger download as JSON
  - Delete account button → confirmation dialog → `profile.deleteAccount()` → logout → redirect to `/login`

- ✅ **Subcomponent: Timezone propagation**
  - Profile timezone read from `profile.get()`
  - Passed to session context (used in trade session classification)
  - Validate timezone against IANA tz database (or hardcoded list)

- ✅ **Subcomponent: Password reset security**
  - Use Supabase Auth `resetPassword()` flow (not plaintext update)
  - Return user-friendly error messages (e.g., "Password must be 8+ chars")
  - Test: password reset doesn't affect JWT or session

- ✅ **Testing strategy:**
  - Unit test: `profile.get` returns User object
  - Unit test: `profile.update` persists all fields
  - Integration test: page load pre-populates form with user data
  - Integration test: form submission updates DB and syncs across page reload
  - Edge case test: timezone propagates to subsequent trade sessions
  - Security test: `profile.deleteAccount()` deletes ALL user data (not soft-delete)

#### Milestones (to avoid scope creep)
1. **Day 1–2 (Milestone 1: Schema + Router)**
   - Audit Prisma User schema; identify all persistable fields
   - Implement `profile.ts` router with all 5 procedures
   - Write unit tests for each procedure
   - Checkpoint: Router compiles, basic tests pass

2. **Day 2–3 (Milestone 2: Page Implementation)**
   - Implement `perfil/page.tsx` with form skeleton
   - Wire `profile.get()` query to pre-populate on load
   - Wire all input fields to `profile.update()` mutation
   - Checkpoint: Form renders, can update fields, changes persist

3. **Day 3–4 (Milestone 3: Password + Advanced)**
   - Implement change password modal
   - Implement export data and delete account flows
   - Add confirmation dialogs (delete especially)
   - Checkpoint: All 5 procedures wired and tested

4. **Day 4–5 (Milestone 4: QA + Finalization)**
   - Manual QA on staging: profile persists across reload, timezone affects sessions
   - Type check: `tsc --noEmit` clean
   - Test coverage: >80% for profile procedures
   - Checkpoint: Ready to unblock dependent features

#### Acceptance Criteria
1. ✅ `profile.get()` returns all User fields correctly
2. ✅ `profile.update()` persists changes to Postgres
3. ✅ Changes visible immediately on page and after reload
4. ✅ Timezone change propagates to session classification (test: trade created in new timezone)
5. ✅ Password change works; old password no longer valid for login
6. ✅ `profile.exportData()` returns valid JSON (no truncation, all nested fields)
7. ✅ `profile.deleteAccount()` removes ALL user data (trades, resources, reviews, etc.)
8. ✅ All 5 procedures have error handling (TRPCError, user-friendly messages)
9. ✅ Zero TypeScript errors in profile router + page
10. ✅ 246/246 tests still passing (no regressions)

#### Risk Mitigation
| Risk | Severity | Mitigation |
|---|---|---|
| TASK-006 takes >8h; blocks downstream | 🔴 CRITICAL | **Daily check-ins at Day 2 & 4 milestones.** If Milestone 2 takes >4h, break into smaller PRs (schema → router → page) and ship incrementally. |
| Timezone propagation breaks trade session classification | 🟠 HIGH | Test with 3 different timezones; verify trade `session` field changes correctly. Have fallback to UTC if timezone is null. |
| Password change doesn't invalidate JWT; old token still works | 🔴 CRITICAL | Call Supabase Auth directly; verify token is revoked. Test by attempting API call with old token after password change (should 401). |
| Type mismatch on User schema after changes | 🟡 MEDIUM | Run `prisma generate` immediately after schema edits; check for type errors in profile router. |
| Page form doesn't match DB state (inputs out of sync) | 🟡 MEDIUM | Use `useQuery` for pre-population (not `useState`); on mutation success, invalidate query to force refetch. |
| Delete account removes user but leaves orphaned data | 🟠 HIGH | Use Prisma `cascadeDelete()` on User relations; test with full database state (trades, resources, reviews, accounts, logs). |

#### Success Metrics
- ✅ Profile page fully functional end-to-end
- ✅ TASK-006 merged to main; no new TypeScript errors
- ✅ 7 downstream tasks explicitly unblocked (TASK-030, TASK-033, TASK-045, TASK-046, TASK-050, TASK-051, TASK-052, TASK-071, TASK-075)
- ✅ No regressions in existing test suite

---

### Priority 2 (HIGH): Toast System Coverage Rollout [2–3h]

**Status:** Builds on Sprint 2 foundation (Sonner installed, `lib/use-toast.ts` exported)

#### Deliverables
Complete toast error feedback for all remaining ~40 mutations:

**Mutation Call Sites to Update:**
- Trade operations: `register-trade-modal`, `edit-trade-modal`, `close-trade-modal`, `trade-delete`
- Account operations: `promote-phase-modal`, `account-create`, `account-pause`, `account-status-change`, `withdrawal-request`, `withdrawal-cancel`
- Learning operations: `resource-create`, `resource-update`, `resource-review`, `resource-delete`
- Review operations: `weekly-review-create`, `weekly-review-save-draft`, `review-update`, `review-delete`
- Playbook operations: `setup-create`, `setup-edit`, `setup-delete`, `setup-image-upload`
- Rule operations: `rule-create`, `rule-delete`, `rule-toggle`

**Pattern (Consistent):**
```typescript
const mutation = trpc.trades.create.useMutation({
  onSuccess: () => {
    toast.success("Trade registered successfully");
    utils.trades.list.invalidate();
  },
  onError: (err) => toast.error(err.message),
});
```

#### Effort Breakdown
- Audit codebase for all mutation call sites: ~30 min (grep for `.mutate(`)
- Update 40 mutations with onError handler: ~90 min (repetitive pattern, 2–3 min per mutation)
- Test: each mutation fails with toast visible: ~30 min (manual testing, 5–10 seconds per mutation)
- **Total: 2–2.5 hours**

#### Acceptance Criteria
1. ✅ All 40+ mutations have `onError: (err) => toast.error(err.message)`
2. ✅ Manual test: trigger each mutation error (invalid input, network fail, auth fail) → toast appears
3. ✅ Toast message is user-friendly (not raw error stack)
4. ✅ No mutations left with silent failures or console.error

#### Success Metrics
- ✅ Toast coverage: 40/40 mutations (100%)
- ✅ All mutation failures visible to user
- ✅ No breaking changes to mutation UX (success behavior unchanged)

---

### Priority 3 (MEDIUM): Prisma DB Migration [<1h]

**Status:** Deferred from Sprint 2 as TD-S2-004; required before Phase III AI features

#### Deliverables
- ✅ Run `prisma db push` to apply TradeEmbedding and EmailLog models to production DB
- ✅ Verify migration completes without conflicts
- ✅ Validate: `SELECT COUNT(*) FROM trade_embeddings; SELECT COUNT(*) FROM email_logs;` returns 0 (tables created, empty)

#### Effort: <1 hour
- Pre-check: audit any pending migrations: ~5 min
- Run `prisma db push`: ~5–10 min (includes schema validation)
- Verify tables created: ~5 min
- **Total: 15–20 min**

#### Acceptance Criteria
1. ✅ TradeEmbedding table exists in Postgres with correct schema
2. ✅ EmailLog table exists in Postgres with correct schema
3. ✅ Both tables empty (count = 0)
4. ✅ No migration conflicts or rollbacks needed

#### Risk Mitigation
| Risk | Mitigation |
|---|---|
| Migration conflicts with pending changes | Check `git status` and recent commits before running; if conflicts, investigate before proceeding. |
| Migration fails silently; schema not updated | Run `SELECT table_name FROM information_schema.tables WHERE table_schema='public'` to verify tables exist. |
| Embedding/email features fail because schema mismatch | Deferred until Sprint 5 (when TASK-033 and TASK-058 use these models). |

---

### Priority 4 (MEDIUM): UX Foundations [8h]

**From SPRINT_MASTER_PLAN Sprint 3:**

#### TASK-042: Skeleton Screens for Loading States [4h]
- **Target:** KPI strip, trade table, account cards
- **Deliverable:** `animate-pulse` skeletons matching content dimensions
- **Implementation:**
  - Create `components/skeletons/` directory
  - Build `KPISkeleton`, `TradeTableSkeleton`, `AccountCardSkeleton`
  - Replace `<Toaster />` + "Cargando..." text with skeleton components
  - Measure content dimensions; apply to skeleton layout
- **Testing:** Verify skeletons render while `useQuery` is loading; disappear when data arrives

#### TASK-043: Empty States for 4 Pages [4h]
- **Target:** Cuentas, Trades, Playbook, Mercados
- **Deliverable:** Consistent empty state component (icon + headline + CTA)
- **Implementation:**
  - Create `components/empty-state.tsx`
  - Define empty state for each page:
    - Cuentas: "No accounts yet" → CTA "Add Account"
    - Trades: "No trades yet" → CTA "Register Trade"
    - Playbook: "No setups yet" → CTA "Create Setup"
    - Mercados: "No markets yet" → CTA "Add Market"
  - Hook into data loading logic: render empty state when `data.length === 0`
- **Testing:** Verify empty state appears when no data; disappears when data is added

#### Acceptance Criteria
1. ✅ Skeleton screens match content dimensions
2. ✅ Skeleton screens display during loading; disappear on data arrival
3. ✅ Empty states appear when data is absent (for all 4 pages)
4. ✅ Empty states include actionable CTA
5. ✅ UX matches design system (colors, typography, spacing)

---

### Priority 5 (LOW): Formula Support [2h]

#### TASK-011: Extract `computeDisciplineScore` as Shared Function [2h]
- **From:** Review modal + server calculation (duplicated in 3 places)
- **To:** Single `lib/formulas/discipline.ts` export
- **Deliverable:**
  - `calcDisciplineScore(params: {executionScore, learningScore, adherenceScore}) -> number`
  - Formula: `(executionScore * 0.5) + (learningScore * 0.3) + (adherenceScore * 0.2)`
  - Export from `lib/formulas/index.ts`
  - Replace 3 inline implementations with single import
- **Testing:** Verify score matches original calculations (no regressions)

#### Effort: ~2 hours
- Extract logic: ~30 min
- Update 3 call sites: ~30 min
- Test: validate calculations match: ~30 min
- **Total: 90 min**

#### Acceptance Criteria
1. ✅ `calcDisciplineScore` is the single source of truth
2. ✅ All 3 call sites import and use canonical function
3. ✅ Scores calculated by server and client match (no divergence)
4. ✅ No performance regression

---

### Priority 6 (DEFER): Query Parameter Filtering [1–2h]

**Deferred to Sprint 4** (low impact; button wiring already complete)

- Implement `/trades?tag=DO-NOT-TAKE` filtering
- Update `trades.list` router to accept optional `tag` parameter
- Filter trades by tag in query and KPI calculations

**Rationale:** Wiring is done (TASK-036 complete); filtering logic is independent and can wait. Better to deliver TASK-006 + toast coverage first, then tackle filtering.

---

### Priority 7 (DEFER): Decay Transition Prefill [<1h]

**Deferred to Sprint 4** (low impact; complex cross-page sequencing)

- Wire `processDecayTransitions.mutate()` call before `weeklyReviews.prefill()` in reviews workflow
- Ensure resources transition MASTERED→IN_REVIEW before review stats are calculated

**Rationale:** Complexity is in cross-page coordination (aprendizaje page fires decay, reviews page calls prefill). Low impact if skipped (review stats may show MASTERED when they should show IN_REVIEW, but no data loss). Sprint 4 has more capacity.

---

## Sprint Execution Plan

### Recommended Pacing

| Phase | Duration | Tasks | Owner | Notes |
|---|---|---|---|---|
| **Days 1–2** | 2 days | TASK-006 Milestone 1 | BE/FE | Profile schema + router; foundation check |
| **Days 2–3** | 1.5 days | TASK-006 Milestone 2 | BE/FE | Profile page + form wiring; core checkpoint |
| **Days 3–4** | 1.5 days | TASK-006 Milestone 3 | BE/FE | Password + export + delete; advanced features |
| **Days 4–5** | 1 day | TASK-006 Milestone 4 | BE/FE | QA + finalization; ready to unblock |
| **Day 5** | 0.5 days | Toast coverage | FE | Quick rollout while TASK-006 is in final QA |
| **Day 6** | 0.5 days | Prisma migration | DevOps | Apply schema changes to production DB |
| **Days 6–7** | 2 days | TASK-042 + TASK-043 | FE | Skeleton screens + empty states in parallel |
| **Day 7** | 0.5 days | TASK-011 | BE | Consolidate discipline score formula |
| **Buffer** | 1–2 days | — | — | Regression testing, type checking, edge cases |

### Daily Standups (Recommended)

**Day 2–3 Checkpoint (Milestone 2):**
- ✅ Profile page compiles, pre-populates form?
- ✅ Form can update fields?
- ✅ Changes persist on reload?
- **Decision Point:** If any NO, reassess scope. Revert to simpler form (fewer fields) if needed. Profile is mission-critical.

**Day 4–5 Checkpoint (Milestone 4):**
- ✅ All 5 procedures wired?
- ✅ Tests passing?
- ✅ Zero TypeScript errors?
- **Decision Point:** If any NO, QA stays in Milestone 4. Defer toast/skeleton work.

---

## Deferred Items from Sprint 2 (Incorporated)

| Item | Sprint 3 Status | Disposition |
|---|---|---|
| **TD-S2-002: Toast coverage** | ✅ Priority 2 | Incorporated as Priority 2 task (~2–3h) |
| **TD-S2-004: Prisma migration** | ✅ Priority 3 | Incorporated as Priority 3 task (<1h) |
| **TD-S2-005: Tag filtering** | 📍 DEFER to S4 | Low impact; can wait for Sprint 4 |
| **TD-S2-001: Decay prefill** | 📍 DEFER to S4 | Complex cross-page logic; can wait |
| **TD-S2-003: trades.stats removal** | 📍 DEFER to S5 | Cleanup task; not blocking anything |

---

## Dependency Unblocking

After Sprint 3 completes, the following sprints are unblocked:

### Sprint 4 (Weeks 8–10) — Personalization Foundation
- ✅ TASK-030 (UserPreferences table) — depends on TASK-006 ✓
- ✅ TASK-034 (Psychology fields) — independent
- ✅ TASK-031 (Review edit/delete) — independent
- ✅ TASK-045 (Theme toggle) — depends on TASK-006 ✓
- ✅ Type safety tasks — independent

### Sprint 5 (Weeks 11–14) — AI Configuration & Analytics
- ✅ TASK-033 (AI config UI) — depends on TASK-006 ✓ and TASK-015 ✓
- ✅ TASK-046 (Accent color) — depends on TASK-006 ✓
- ✅ TASK-050 (Goal setting) — depends on TASK-006 ✓

### Later Sprints
- ✅ All remaining personalization features (TASK-051, TASK-052, TASK-071, TASK-075) — depend on TASK-006 ✓

---

## Risk Register & Mitigation

### CRITICAL Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **TASK-006 takes >8h; blocks all downstream** | MEDIUM | 🔴 CRITICAL | Daily milestones (Day 2, Day 4). If Milestone 2 >4h, ship partial PR (schema + router only) and continue next sprint. Never hold up entire sprint. |
| **Type mismatch after schema changes** | LOW | 🔴 CRITICAL | Run `prisma generate` immediately after ANY schema edit. Commit generated types alongside schema. Type-check after each milestone. |
| **Password reset doesn't invalidate JWT** | VERY LOW | 🔴 CRITICAL | Test explicitly: old JWT should 401 after password change. Have security reviewer sign off. |
| **Delete account leaves orphaned data** | LOW | 🔴 CRITICAL | Use Prisma cascade delete. Test with full test dataset (trades, resources, reviews, accounts, logs). Verify all deleted. |

### MAJOR Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Toast coverage incomplete; some mutations still silent** | MEDIUM | 🟠 HIGH | Systematic audit: grep for all `.mutate(` calls. Use checklist. Have FE review before merge. |
| **Skeleton screens don't match content dimensions** | MEDIUM | 🟠 HIGH | Measure actual content dimensions first. Apply to skeleton. Test with real data. Adjust if needed. |
| **Timezone propagation breaks session classification** | LOW | 🟠 HIGH | Test with 3+ timezones. Verify trade session field changes. Have fallback to UTC. |

### MEDIUM Risks

| Risk | Mitigation |
|---|---|
| **Prisma migration conflicts** | Check for pending migrations before running. Have rollback plan. |
| **Form performance degradation with many fields** | Profile has 14 fields max; should be fine. Monitor performance if more fields added. |
| **Profile changes don't propagate to dependent features** | Invalidate queries on mutation success. Test that timezone affects subsequent trade sessions. |

---

## Success Metrics (Sprint 3 Exit Criteria)

### Functional Correctness
- ✅ Profile backend fully functional (all 5 procedures wired)
- ✅ User can read/update/delete profile with changes persisting
- ✅ Timezone change affects subsequent trade session classification
- ✅ Password change invalidates old JWT
- ✅ Export data returns valid JSON (all fields)
- ✅ Toast coverage: 100% of mutations (40/40 have error handlers)
- ✅ Skeleton screens display during loading; disappear on completion
- ✅ Empty states appear for all 4 pages when no data

### Code Quality
- ✅ Zero TypeScript errors (`tsc --noEmit` clean)
- ✅ Zero new ESLint violations
- ✅ 246/246 tests still passing (no regressions)
- ✅ Profile router + page >80% test coverage
- ✅ All risky features (delete account, password change) have integration tests

### Unblocking
- ✅ TASK-006 merged to main
- ✅ 7+ downstream tasks explicitly ready to start (TASK-030, 033, 045, 046, 050, 051, 052, 071, 075)
- ✅ No breaking changes to existing features

### Documentation
- ✅ Profile API documented in `docs/api.md` (if it exists)
- ✅ Password reset flow documented for future maintainers
- ✅ Toast pattern documented for future mutations

---

## Appendix: Acceptance Test Scenarios

### TASK-006 Profile Backend

**Scenario 1: User reads own profile**
1. Log in as user
2. Navigate to /perfil
3. ✅ Form pre-populated with all user fields
4. ✅ No loading spinner (cached from useQuery)

**Scenario 2: User updates name**
1. From Scenario 1, change "Name" field to "John Smith"
2. Click "Guardar cambios"
3. ✅ Toast appears: "Profile updated successfully" (or similar)
4. ✅ Reload page
5. ✅ Name still shows "John Smith"

**Scenario 3: User changes timezone**
1. Change timezone from "America/New_York" to "Europe/London"
2. Click "Guardar cambios"
3. ✅ Success toast
4. ✅ Create a new trade with current time
5. ✅ Trade session classification matches London timezone (not NY)

**Scenario 4: User changes password**
1. Click "Cambiar contraseña"
2. Modal appears with "Current password" + "New password" + "Confirm password"
3. Enter current password + new password + confirm
4. Click "Cambiar"
5. ✅ Success toast: "Password changed successfully"
6. Log out
7. ✅ Cannot log in with old password
8. ✅ Can log in with new password

**Scenario 5: User exports data**
1. Click "Exportar datos"
2. ✅ JSON file downloaded (name: `trading-journal-export-<date>.json`)
3. ✅ Open file; verify it contains:
   - User object (name, email, etc.)
   - Array of all trades
   - Array of all accounts
   - Array of all resources
   - Array of all reviews
   - (No truncation, all fields present)

**Scenario 6: User deletes account**
1. Click "Borrar cuenta"
2. ✅ Confirmation dialog: "This action cannot be undone. Are you sure?"
3. Click "Confirmar"
4. ✅ User logged out
5. ✅ Redirected to /login
6. ✅ Cannot log in with this account
7. (Backend verify: all user data deleted from Postgres)

---

## Appendix: Toast Coverage Checklist

After Priority 2 completion, every mutation in this list should have `onError: (err) => toast.error(err.message)`:

- [ ] trades.create
- [ ] trades.update
- [ ] trades.close
- [ ] trades.delete
- [ ] accounts.create
- [ ] accounts.update
- [ ] accounts.changeStatus
- [ ] accounts.promotePhase
- [ ] withdrawals.create
- [ ] withdrawals.update
- [ ] withdrawals.cancel
- [ ] resources.create
- [ ] resources.update
- [ ] resources.review
- [ ] resources.delete
- [ ] reviews.create
- [ ] reviews.update
- [ ] reviews.delete
- [ ] reviews.saveDraft
- [ ] reviews.generateSummary ✅ (already done in Sprint 2)
- [ ] setups.create
- [ ] setups.update
- [ ] setups.delete
- [ ] setups.uploadImage
- [ ] rules.create
- [ ] rules.update
- [ ] rules.delete
- [ ] rules.toggle
- [ ] (+ 13 more minor mutations)

**Total: ~40+ mutations**

---

## Appendix: Effort Breakdown Summary

| Task | Estimated | Actual (Tracked) | Owner | Status |
|---|---|---|---|---|
| TASK-006 Milestone 1 | 2h | — | BE | — |
| TASK-006 Milestone 2 | 1.5h | — | BE/FE | — |
| TASK-006 Milestone 3 | 1.5h | — | BE/FE | — |
| TASK-006 Milestone 4 | 2h | — | BE/FE | — |
| Toast coverage | 2–3h | — | FE | — |
| Prisma migration | <1h | — | DevOps | — |
| TASK-042 Skeleton screens | 4h | — | FE | — |
| TASK-043 Empty states | 4h | — | FE | — |
| TASK-011 Discipline formula | 2h | — | BE | — |
| **Subtotal** | **~22–23h** | — | — | — |
| **Buffer** | **~17–18h** | — | — | Regression testing, edge cases, QA |
| **Total** | **~40h** | — | — | Within sprint capacity |

---

## Appendix: Definition of Done (Sprint 3)

All work must meet these criteria before marking complete:

1. ✅ **Code merged to main** — All PRs reviewed and approved
2. ✅ **TypeScript clean** — `tsc --noEmit` passes with 0 errors
3. ✅ **Tests passing** — 246/246 tests still passing; no regressions
4. ✅ **Test coverage** — New code >80% coverage
5. ✅ **ESLint clean** — No new violations (pre-existing ignored)
6. ✅ **Performance** — No regressions (profile page load <500ms, form response <100ms)
7. ✅ **Security reviewed** — Password reset, account deletion, data export all reviewed by BE reviewer
8. ✅ **Documentation updated** — Profile API documented; toast pattern documented
9. ✅ **Manual QA signed off** — Feature tested on staging; all scenarios pass
10. ✅ **Dependent tasks unblocked** — TASK-030+ ready to start in Sprint 4

---

*Sprint 3 Implementation Plan. Adjusted from SPRINT_MASTER_PLAN based on SPRINT_2_RETROSPECTIVE learning. Maintains alignment with CANONICAL_EXECUTION_PLAN and project vision.*
