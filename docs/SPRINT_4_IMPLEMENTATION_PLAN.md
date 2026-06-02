# Sprint 4 Implementation Plan: Personalization & Review Management

> **Sprint Duration:** Weeks 8–10 (2026-06-09 to 2026-06-30)  
> **Base Plan:** SPRINT_MASTER_PLAN.md (Section: Sprint 4)  
> **Adjustments from Sprint 3 Retrospective:** See Section 1.3  
> **Canonical Reference:** CANONICAL_EXECUTION_PLAN.md (Sprint 4 assignment)

---

## 1. Executive Summary

### Sprint Objective
Unlock personalization features that depend on profile backend (TASK-006, completed in Sprint 3). Implement user preferences table and review management. **Prioritize discipline score consolidation (TASK-011) to prevent silent data inconsistencies.** Begin type safety cleanup.

### Key Changes from SPRINT_MASTER_PLAN.md
1. **TASK-011 elevated to CRITICAL path** — deferred in master plan, but Sprint 3 retrospective identified TD-002 (discipline score triplication) as HIGH RISK if not addressed. Moved from "should do" to "must do" in Sprint 4.
2. **Pre-delivery architectural review checkpoint** — TASK-030 (UserPreferences) now requires 30-min architecture review before implementation begins (learned from TASK-006 QA audit).
3. **Goal-setting backend foundation** — m-004 deferred item (new User fields without write path) becomes a prerequisite. TASK-050 requires backend work before UI.
4. **TASK-057 (timezone fix) preparation** — grouped with profile work; unblocks TASK-040 session classification in Sprint 5.

### Sprint Capacity
- **Target hours:** 40h (2-week sprint, 20h/week)
- **Planned hours:** 31.5h (TASK-011 + TASK-030 + review management + psychology + type safety)
- **Buffer:** 8.5h for discovered issues, testing, rework

---

## 2. Grouped Functionalities & Task Assignments

### Group A: Discipline Score Consolidation — CRITICAL
**Objective:** Eliminate the 3-implementation problem for discipline score. Prevent silent formula divergence.  
**Learning:** Sprint 3 QA audit flagged this as deferred but HIGH RISK.

| Task | ID | Effort | Owner | Dependencies | Notes |
|---|---|---|---|---|---|
| Extract `computeDisciplineScore` to shared function | TASK-011 | S (2h) | BE | TASK-027 (completed) | Single source of truth for formula |
| Update `computedDisciplineScore` procedure to call shared function | TASK-011a | 0.5h | BE | TASK-011 | Server procedure (weekly-reviews.ts) |
| Update `prefill` procedure to call shared function | TASK-011b | 0.5h | BE | TASK-011 | Server procedure (weekly-reviews.ts) — currently duplicated |
| Update `create-review-modal.tsx` to fetch server-provided value | TASK-011c | 1h | FE | TASK-011 | Remove frontend computation; call `prefill` |
| Add tests: verify all 3 call sites produce identical results | TASK-011d | 1h | BE/QA | TASK-011a/b/c | 5+ test cases with sample weeks |

**Acceptance Criteria:**
- ✅ Single `computeDisciplineScore()` exported from `lib/trading-formulas.ts`
- ✅ Both server procedures call shared function
- ✅ Frontend modal calls server-provided value (via `prefill`)
- ✅ Tests verify identical results across all three sites for 5+ test weeks
- ✅ No discipline score divergence possible

**Risk Mitigation:**
- If formula changes in future, only one location changes (no triplication bug)
- Tests enforce consistency across implementations

---

### Group B: Personalization Foundation
**Objective:** Implement UserPreferences table and router. Unblocks theme, tag management, filter preferences.

| Task | ID | Effort | Owner | Dependencies | Notes |
|---|---|---|---|---|---|
| Architecture review: UserPreferences schema design | TASK-030-review | 0.5h | BE/Arch | TASK-006 | Before implementation: table structure, indexes, uniqueness |
| Create `UserPreferences` Prisma model | TASK-030a | 1h | BE | TASK-006 | Fields: theme, accentHue, colorScheme, defaultTab, kpiOrder, kpiHidden, defaultGrain, tableDensity, dateFormat, numberLocale |
| Create tRPC `preferences.get` and `preferences.update` procedures | TASK-030b | 2h | BE | TASK-030a | Zod validation for each field |
| Connect profile page to preferences system | TASK-030c | 1h | FE | TASK-030b | "Apariencia" section in profile; theme toggle + accent picker UI |
| Add tests: CRUD operations, validation errors, edge cases | TASK-030d | 1.5h | BE/QA | TASK-030a/b | >80% coverage for preferences router |

**Acceptance Criteria:**
- ✅ UserPreferences table created and migrated
- ✅ Users can create, read, update preferences
- ✅ All preferences validated (enum ranges, color hex, etc.)
- ✅ Profile page integrated with preferences system
- ✅ Tests cover all CRUD operations and error cases

---

### Group C: Review Management & Psychology
**Objective:** Add edit/delete for reviews. Integrate psychology data.

| Task | ID | Effort | Owner | Dependencies | Notes |
|---|---|---|---|---|---|
| Add Edit button to ReviewDetailPanel | TASK-031a | 1.5h | FE | TASK-006 | Modal re-uses `NuevaReviewModal` in edit mode |
| Add Delete button + confirmation dialog | TASK-031b | 0.5h | FE | TASK-006 | Soft delete recommended (archive review) |
| Implement `weeklyReviews.update` mutation | TASK-031c | 1.5h | BE | TASK-006 | Update text, tags, discipline score if provided |
| Integrate psychology fields into trade form | TASK-034a | 1h | FE | TASK-006 | Add emotion dropdown, confidence slider (1–5), pre-trade planning text |
| Store psychology fields on Trade model | TASK-034b | 1h | BE | TASK-006 | emotionBefore, confidenceRating, executionQuality, fomoFlag, revengeFlag |
| Add migration for psychology fields | TASK-034c | 0.5h | BE | TASK-034b | Run migration on dev branch before merging |
| Tests: review edit/delete with 5+ scenarios | TASK-031d | 1h | BE/QA | TASK-031a/b/c | Verify data integrity after edits |

**Acceptance Criteria:**
- ✅ Reviews can be edited (text, tags, discipline score)
- ✅ Reviews can be deleted with confirmation
- ✅ Psychology fields appear in trade form
- ✅ Psychology data stored in Trade model
- ✅ Review edit/delete tested with 5+ test cases

**Risk Mitigation:**
- Soft deletes prevent data loss (archive reviews instead of hard delete)
- Psychology fields optional (backward compatible with existing trades)

---

### Group D: Theme Personalization
**Objective:** Ship three-way theme toggle (light/dark/system).

| Task | ID | Effort | Owner | Dependencies | Notes |
|---|---|---|---|---|---|
| Implement theme toggle in profile Apariencia section | TASK-045a | 1h | FE | TASK-030b | Radio buttons: light/dark/system |
| Add system theme detection | TASK-045b | 0.5h | FE | TASK-045a | Use `window.matchMedia('(prefers-color-scheme)')` |
| Persist theme to UserPreferences | TASK-045c | 0.5h | FE | TASK-045a | Call `preferences.update({ theme: "system" })` |
| Apply theme on app initialization | TASK-045d | 0.5h | FE | TASK-045c | `RootLayout` reads preference; sets `data-theme` attribute |
| Tests: theme toggle persistence across page loads | TASK-045e | 0.5h | QA | TASK-045a/b/c | Verify theme persists after reload |

**Acceptance Criteria:**
- ✅ Theme toggle renders in profile page
- ✅ User can select light/dark/system
- ✅ Theme persists across page reloads
- ✅ System theme responds to OS preference changes

---

### Group E: Review UX & Type Safety
**Objective:** Auto-save, review filtering, type safety improvements.

| Task | ID | Effort | Owner | Dependencies | Notes |
|---|---|---|---|---|---|
| Add auto-save with debounce to review modal | TASK-061a | 1h | FE | TASK-006 | Debounce 2s; save on blur or timer |
| Implement review filtering (date range, setup, outcome) | TASK-048a | 2h | BE/FE | TASK-006 | Reuse filter patterns from Playbook |
| Add week selector date picker for old reviews | TASK-069a | 0.5h | FE | TASK-006 | Calendar UI to select review week |
| Eliminate `as never` type casts in trades/page.tsx | TASK-013a | 2h | FE | TASK-006 | Replace with `RouterOutputs["trades"]["list"]["items"][0]` |
| Unify `LearningResource` type with RouterOutputs | TASK-014a | 1h | FE | TASK-006 | Delete manual interface; export from RouterOutputs |
| Type `market: any` in MarketCard, `amount: any` in Retiros | TASK-023a | 0.5h | FE | TASK-006 | Use proper types from RouterOutputs |
| Fix `phasePayload as never` type cast in accounts router | TASK-066a | 0.5h | BE | — | Define PhasePayload interface; remove cast |

**Acceptance Criteria:**
- ✅ Review modal auto-saves with visual feedback
- ✅ Review list filterable by date range, setup, outcome
- ✅ `as never` casts reduced by 80%+ in trades/page.tsx
- ✅ Zero `any`-typed props in components
- ✅ TypeScript clean (tsc --noEmit)

---

### Group F: Goal-Setting Backend Foundation
**Objective:** Prepare backend for goal-setting UI (TASK-050, deferred from Sprint 3). Address m-004 deferred item.

| Task | ID | Effort | Owner | Dependencies | Notes |
|---|---|---|---|---|---|
| Add `weeklyTradesGoal` and `weeklyPnlGoal` to `profile.update` | TASK-050a | 1h | BE | TASK-006 | Validation: min 1, max 500 trades; min $100, max $1M |
| Create `goals.set` mutation for `disciplineGoal` and `onboardingCompleted` | TASK-050b | 1h | BE | TASK-006 | Separate from profile.update for clarity |
| Add tests: goal validation (min/max constraints) | TASK-050c | 0.5h | BE/QA | TASK-050a/b | Verify constraints enforced |

**Acceptance Criteria:**
- ✅ Goal fields accept write operations (previously excluded from UpdateProfileInput)
- ✅ Validation enforced on backend
- ✅ m-004 deferred item unblocked for Sprint 5 UI work

**Note:** TASK-050 UI work (dashboard goal widget) deferred to Sprint 5 after backend foundation.

---

### Group G: Pre-Sprint 5 Preparation
**Objective:** Unblock TASK-057 (timezone fix) and TASK-040 (session classification).

| Task | ID | Effort | Owner | Dependencies | Notes |
|---|---|---|---|---|---|
| Review timezone propagation requirements | TASK-057-prep | 0.25h | BE/Arch | TASK-006 | Document how profile.timezone flows to dashboardStats |
| Plan TASK-040 session classification refactor | TASK-040-prep | 0.25h | BE/Arch | TASK-057-prep | Design: accept timezone param, re-classify sessions |

**Acceptance Criteria:**
- ✅ Requirements documented for Sprint 5 TASK-057 implementation
- ✅ TASK-040 design sketch ready

---

## 3. Sprint Schedule & Milestones

### Week 1 (Days 1–5)
| Day | Focus | Owner | Tasks |
|---|---|---|---|
| Day 1 | Architecture review + planning | BE/Arch | TASK-030-review, team kickoff |
| Day 2–3 | UserPreferences schema + router | BE | TASK-030a, TASK-030b |
| Day 4–5 | Discipline score consolidation | BE | TASK-011a, TASK-011b, TASK-011c |

**Milestones:**
- End of Day 3: UserPreferences table migrated, tRPC procedures wired
- End of Day 5: Discipline score single source of truth confirmed (all 3 sites tested)

### Week 2 (Days 6–10)
| Day | Focus | Owner | Tasks |
|---|---|---|---|
| Day 6 | Review management + psychology data model | BE/FE | TASK-031a/b/c, TASK-034a/b/c |
| Day 7–8 | Type safety cleanup | FE | TASK-013a, TASK-014a, TASK-023a, TASK-066a |
| Day 9 | Theme toggle + goal-setting foundation | FE/BE | TASK-045, TASK-050a/b |
| Day 10 | Testing, buffer, PR reviews | QA/All | All test additions, final integrations |

**Milestones:**
- End of Day 6: Psychology fields stored; reviews editable
- End of Day 8: Type safety improved; 80%+ `as never` casts removed
- End of Day 9: Theme toggle functional; goal backend ready
- End of Day 10: All tests green, PR reviews complete

---

## 4. Dependency Graph & Critical Path

```
TASK-006 (Sprint 3 complete)
  ↓
TASK-030-review (architecture) ──→ TASK-030a/b/c/d (UserPreferences) ← TASK-045 (theme)
                                                              ↓
                                                         TASK-034 (psychology)
                                                              ↓
                                                         TASK-031 (review edit/delete)
                                                              ↓
                                                         TASK-048 (review filtering)

TASK-027 (Sprint 1 complete) ──→ TASK-011a/b/d (discipline score consolidation)
                              ↓
                        TASK-011c (frontend update)
```

**Critical Path Summary:**
1. TASK-030-review + TASK-030a (Day 1–3): Unblocks all personalization
2. TASK-011a/b/c (Day 4–5): Unblocks consistent discipline score
3. TASK-034 (Day 6): Unblocks psychology integration
4. TASK-045 (Day 9): Unblocks theme personalization in Sprint 5

**No hard blockers between groups.** Parallel execution possible except for TASK-030-review (must complete before TASK-030a).

---

## 5. Acceptance Criteria & Definition of Done

### Must-Have for Sprint 4 Completion
1. ✅ **TASK-011:** Discipline score single source of truth. All 3 call sites verified identical.
2. ✅ **TASK-030:** UserPreferences CRUD fully functional. Persists to DB.
3. ✅ **TASK-034:** Psychology fields stored on Trade model. UI in trade form.
4. ✅ **TASK-031:** Reviews editable and deletable with confirmation.
5. ✅ **TASK-045:** Theme toggle persists and applies on page load.
6. ✅ **TASK-013/014/023/066:** Type safety improved by 80%+. Zero `as never` in key files.
7. ✅ **TASK-050a/b:** Goal-setting backend ready for Sprint 5 UI.
8. ✅ **All tests pass.** 315 → 330+ new tests added.
9. ✅ **TypeScript clean.** `tsc --noEmit` succeeds.
10. ✅ **Pre-Sprint 5 prep:** TASK-057, TASK-040 requirements documented.

### Exit Criteria
- [ ] All P0 + P1 tasks merged to `main`
- [ ] Manual QA sign-off on: theme toggle, review edit, psychology fields
- [ ] Test coverage >80% for new procedures
- [ ] No regressions in existing features (TASK-006 profile still works)
- [ ] Type errors reduced from Sprint 3 baseline

---

## 6. Risk Register & Mitigations

| Risk | Severity | Mitigation | Owner |
|---|---|---|---|
| TASK-030 schema design flaws require rework | 🟡 Medium | 30-min architecture review BEFORE implementation. Check: indexes, uniqueness, relationships. | BE/Arch (Day 1) |
| TASK-011 consolidation breaks existing discipline scores | 🔴 Critical | Comprehensive unit tests. Verify all 3 sites produce same result for 5+ test weeks. | BE (Day 4) |
| Type safety cleanup breaks compilation | 🟠 High | Start with 2–3 casts; validate; expand. Type-check after each change. Use isolated branch. | FE (Day 7) |
| Review edit modal UX confusion (conflicts with new review flow) | 🟡 Medium | Re-use `NuevaReviewModal` component; clear button labels ("Guardar cambios" vs "Crear revisión"). | FE (Day 6) |
| Psychology fields cause database migration issues | 🟡 Medium | Test migration on dev branch with 100+ trades. Verify rollback-safe. | BE (Day 6) |
| Auto-save modal triggers excessive API calls | 🟡 Medium | Debounce 2s minimum; batch updates; add visual "saving..." indicator. | FE (Day 8) |
| Goal-setting backend API contract doesn't match Sprint 5 UI needs | 🟠 High | Design TASK-050a/b API first (schema review), THEN implement. Coordinate with Sprint 5 owner. | BE/Arch (Day 1) |
| Timer: sprint runs out of time, last 2 tasks (goal backend, prep) incomplete | 🟡 Medium | Prioritize in order: TASK-011 > TASK-030 > psychology > theme > type safety. Goal backend + prep last. | PM (ongoing) |

---

## 7. Testing Strategy

### Unit Tests
- **TASK-011d:** Verify `computeDisciplineScore()` produces identical output across all 3 input modes (5 test weeks)
- **TASK-030d:** UserPreferences CRUD, validation (enum, range, null checks)
- **TASK-031d:** Review edit/delete (5 scenarios: title edit, tag edit, delete, rollback)
- **TASK-034c:** Psychology field storage (all enum values, null handling)
- **TASK-050c:** Goal validation (min/max constraints, integer constraints)

### Integration Tests
- Theme toggle: Verify theme persists across page reloads
- Review edit: Verify `weeklyReviews.update` actually updates DB
- Psychology: Verify fields flow from trade form → DB → trade detail panel

### Manual QA
- Theme toggle on light/dark/system modes (3+ test accounts)
- Review edit on 5+ reviews (various states: draft, submitted)
- Psychology fields visible in trade form and review details
- Type errors: `tsc --noEmit` succeeds

### Regression Testing
- Profile backend (TASK-006 from Sprint 3) still works
- Learning resource pipeline still correct
- Toast notifications still display correctly

---

## 8. Sprint Metrics & Success Indicators

| Metric | Target | Notes |
|---|---|---|
| Velocity | 31.5h planned / 40h capacity | 79% utilization; 8.5h buffer |
| Test coverage | >80% on new procedures | Discipline score, UserPreferences, review mutations |
| Type errors | <5 remaining | 80%+ reduction from Sprint 3 baseline |
| Tests passing | 330+/330+ | All green |
| Bugs found in QA | <3 critical, <5 high | Quick-fix, no respin needed |
| PR reviews | <2 rounds average | Smooth code review, minimal rework |

---

## 9. Comparison to SPRINT_MASTER_PLAN.md

### What Changed
| Item | Master Plan | This Plan | Reason |
|---|---|---|---|
| TASK-011 priority | Listed (2h) | **ELEVATED TO CRITICAL** | Sprint 3 retrospective: TD-002 is HIGH RISK if not addressed |
| TASK-030 architecture | Implicit | **Explicit 30-min review checkpoint** | TASK-006 QA audit showed pre-implementation planning prevents rework |
| Goal-setting scope | Full UI (TASK-050) | **Backend only (TASK-050a/b)** | m-004 deferred item: UI deferred to Sprint 5 after backend foundation |
| Review filtering grouping | Group B (with edit/delete) | **Included in Group E (with type safety)** | Reduces group size; allows parallelization |
| TASK-057 timezone prep | Not explicitly mentioned | **Group G: prep work** | Unblocks TASK-040 in Sprint 5 |

### What's the Same
- Effort estimates (TASK-030 = 4h, TASK-034 = 4h, TASK-045 = 2h, type safety = 7h)
- Dependency sequencing (TASK-006 → TASK-030, TASK-045, etc.)
- Definition of done (all tests pass, TypeScript clean)
- User-visible outcomes

---

## 10. Sprint Success Criteria (End of Week 2)

✅ **Shipped:**
- Discipline score consolidated (TASK-011) ← NEW, critical
- UserPreferences table + router (TASK-030)
- Review edit/delete (TASK-031)
- Psychology fields (TASK-034)
- Theme toggle (TASK-045)
- Type safety improved 80%+ (TASK-013/014/023/066)
- Goal-setting backend foundation (TASK-050a/b) ← m-004 deferred item unblocked

✅ **Verified:**
- 330+ tests passing
- TypeScript clean
- Theme persists across reloads
- Discipline scores identical across all 3 sites
- Psychology fields visible in trade form and review details

✅ **Ready for Sprint 5:**
- TASK-050 (goal UI, deferred)
- TASK-033 (AI config, deferred from Sprint 5 start)
- TASK-057 (timezone fix, prep work complete)

---

## Appendix A: Subtask Breakdown by Owner

### Backend (BE)
- TASK-011a/b: Consolidate discipline score (2h)
- TASK-030a/b: UserPreferences schema + router (3h)
- TASK-031c: weeklyReviews.update mutation (1.5h)
- TASK-034b/c: Psychology fields + migration (1.5h)
- TASK-050a/b: Goal-setting backend (2h)
- TASK-066a: phasePayload type cast fix (0.5h)
- **Total BE:** ~11.5h

### Frontend (FE)
- TASK-011c: Review modal update (1h)
- TASK-030c: Profile page integration (1h)
- TASK-031a/b: Review edit/delete UI (2h)
- TASK-034a: Psychology form fields (1h)
- TASK-045a/b/c/d: Theme toggle (3h)
- TASK-048a: Review filtering (2h)
- TASK-069a: Week selector (0.5h)
- TASK-061a: Auto-save debounce (1h)
- TASK-013a/014a/023a: Type safety (3.5h)
- **Total FE:** ~15.5h

### QA/Testing
- TASK-011d: Discipline score test (1h)
- TASK-030d: UserPreferences test (1.5h)
- TASK-031d: Review edit/delete test (1h)
- TASK-050c: Goal validation test (0.5h)
- TASK-045e: Theme persistence test (0.5h)
- Regression testing, manual QA
- **Total QA:** ~4.5h

### Architecture/Planning
- TASK-030-review: Architecture review (0.5h)
- TASK-057-prep/TASK-040-prep: Pre-Sprint 5 (0.5h)
- **Total Arch:** ~1h

---

## Appendix B: Files to Create/Modify

### New Files
- None (all modifications to existing files)

### Modified Files
| File | Change | Owner |
|---|---|---|
| `src/lib/trading-formulas.ts` | Add discipline score export | BE |
| `src/server/trpc/routers/profile.ts` | Add `preferences.get/update` procedures | BE |
| `src/prisma/schema.prisma` | Add `UserPreferences` model, psychology fields on `Trade` | BE |
| `src/app/perfil/page.tsx` | Connect preferences UI, theme toggle | FE |
| `src/app/reviews/modals/create-review-modal.tsx` | Remove local discipline score computation | FE |
| `src/app/reviews/panels/review-detail-panel.tsx` | Add edit/delete buttons | FE |
| `src/app/trades/modals/register-trade-modal.tsx` | Add psychology fields | FE |
| `src/app/trades/page.tsx` | Type safety improvements (eliminate `as never`) | FE |
| `src/app/layout.tsx` | Apply theme from preferences on init | FE |

---

*End of SPRINT_4_IMPLEMENTATION_PLAN.md*
