# Sprint 4 Implementation Plan: Personalization & Review Management

> **Sprint Duration:** Weeks 8–10 (2026-06-09 to 2026-06-30)  
> **Base Plan:** SPRINT_MASTER_PLAN.md § Sprint 4  
> **Canonical Reference:** CANONICAL_EXECUTION_PLAN.md § Sprint 4  
> **Adjustments from:** PRE_SPRINT_4_RETROSPECTIVE.md (QA audit of Sprints 1–3)  
> **Status:** ⏳ Planned — Pre-Sprint 4 QA gate passed (354/354 tests, 0 findings open)

---

## 1. Executive Summary

### Sprint Objective

Unlock the personalization tier (TASK-030 → TASK-045) that was blocked on the profile backend (TASK-006, completed Sprint 3). Add review management (edit/delete/auto-save). Integrate per-trade psychology fields. Eliminate critical type safety debt. Consolidate discipline score to a single formula.

### Delivered Before This Sprint Starts (Pre-Sprint 4 QA Gate)

The Pre-Sprint 4 audit fixed 8 production-blocking issues. The following items originally scoped to Sprint 4 are already **complete**:

| Item | Status | Detail |
|---|---|---|
| Goal-setting backend foundation (TASK-050a/b) | ✅ Done | `goals.set` implemented in Sprint 3; type contract (B-01) and Decimal serialization (B-03) fixed in Pre-Sprint 4 |
| Theme CSS mechanism (TASK-045 prerequisite) | ✅ Done | B-02 fix: `.dark` class toggle + localStorage now works |
| `weeklyTradesGoal` / `weeklyPnlGoal` on `profile.update` | ✅ Done | B-01 fix: `UpdateProfileInput` interface extended |
| Review modal trade limit raised | ✅ Done | M-03 fix: limit raised to 200 (was 50) |
| Edit-mode query guards | ✅ Done | M-04 fix: `{ enabled: !isEditMode }` on prefill + score queries |

**Sprint 4 starts with a clean slate:** 354 tests passing, 0 Blocking/Major findings open.

---

### Key Adjustments vs. SPRINT_MASTER_PLAN.md

| Item | Master Plan | This Plan | Reason |
|---|---|---|---|
| TASK-011 priority | Listed (S, 2h) | **CRITICAL PATH — Day 1** | Pre-Sprint 4 R-001: TD-002 (3 discipline score implementations) is HIGH RISK |
| Goal-setting backend (TASK-050a/b) | 2h planned | **Removed — already done** | Pre-Sprint 4 completed this as part of B-01 + B-03 fixes |
| Theme toggle (TASK-045) | Full S (2h) | **Reduced scope — CSS fixed** | Pre-Sprint 4 B-02 eliminated broken CSS mechanism; only three-way radio UI remains |
| Browser testing gate | Not mentioned | **Mandatory for all UI tasks** | Pre-Sprint 4 lesson: B-02 shipped broken with zero visual testing |
| Type-interface sync check | Not mentioned | **Mandatory for new tRPC procedures** | Pre-Sprint 4 lesson: B-01 from Zod/interface mismatch |
| Integration tests for serialization | Not mentioned | **Required for DB-touching procedures** | Pre-Sprint 4 lesson: B-03 from untested Decimal serialization |
| TASK-030 architecture review | 0.5h | **Kept: mandatory before implementation** | Confirmed by Pre-Sprint 4 QA audit pattern |

---

### Sprint Capacity

| Metric | Value |
|---|---|
| Available hours | 40h (2-week sprint) |
| Planned hours | 29h |
| Buffer | 11h (discovered issues, rework, QA) |
| Tests at sprint start | 354 |
| Tests target at end | 390+ |

---

## 2. Task Groups

---

### Group A — Discipline Score Consolidation `CRITICAL PATH`

**Objective:** Eliminate TD-002: discipline score computed 3 independent ways (dashboard ≠ reviews ≠ AI coach). This is the highest-risk open debt item per Pre-Sprint 4 R-001.

**Why now:** Any future change to the formula will produce silent divergence across dashboards. Pre-Sprint 4 identified this as the most dangerous unfixed debt item after the 8 QA findings.

| Subtask | Effort | Owner | Notes |
|---|---|---|---|
| TASK-011a — Export `computeDisciplineScore()` from `lib/trading-formulas.ts` | 1h | BE | Single canonical formula; validates inputs |
| TASK-011b — Update `computedDisciplineScore` tRPC procedure to call shared function | 0.5h | BE | `weekly-reviews.ts` server procedure |
| TASK-011c — Update `prefill` tRPC procedure to call shared function | 0.5h | BE | Remove inline formula duplication |
| TASK-011d — Update `create-review-modal.tsx` to use server-provided value | 1h | FE | Remove frontend formula; call prefill result |
| TASK-011e — Tests: all 3 call sites produce identical results for 5+ test weeks | 1h | QA | Must fail if any site diverges |

**Acceptance Criteria:**
- [ ] Single `computeDisciplineScore()` in `lib/trading-formulas.ts`
- [ ] Both server procedures call shared function (no inline formula)
- [ ] Frontend modal uses server-provided value only
- [ ] 5+ test weeks produce identical scores across all 3 original call sites
- [ ] TypeScript: exported function has explicit parameter and return types

**Risk:** If consolidation changes the formula slightly, stored scores will diverge from displayed scores.  
**Mitigation:** Capture the current output from each of the 3 sites for 3+ real weeks before consolidating. Confirm outputs match before deploying.

---

### Group B — Personalization Foundation

**Objective:** Implement `UserPreferences` table + tRPC router. Unblocks theme persistence, accent color, and dashboard layout customization.

**Note from Pre-Sprint 4 lesson:** Every new tRPC procedure must have its TypeScript interface match its Zod schema exactly. Add a comment linking the interface to the Zod schema for future maintainers.

| Subtask | Effort | Owner | Notes |
|---|---|---|---|
| TASK-030-arch — Architecture review: schema, indexes, uniqueness constraints | 0.5h | BE/Arch | Required before implementation. Check: one row per user, no nullable PK issues |
| TASK-030a — Create `UserPreferences` Prisma model | 1h | BE | Fields: theme, accentHue, colorScheme, defaultTab, kpiOrder, kpiHidden, defaultGrain, tableDensity, dateFormat, numberLocale |
| TASK-030b — Create `preferences.get` and `preferences.update` tRPC procedures | 2h | BE | Zod validation for all fields; TypeScript interface must match schema exactly (lesson B-01) |
| TASK-030c — Connect profile page Apariencia section to preferences system | 1h | FE | Theme toggle + accent picker UI |
| TASK-030d — Tests: CRUD, validation errors, edge cases | 1.5h | QA | Verify Prisma types serialize correctly to JSON (lesson B-03); >80% coverage |
| TASK-030e — Browser test: preferences persist across page reload | 0.25h | QA | Manual in dev browser — required gate (lesson B-02) |

**Acceptance Criteria:**
- [ ] `UserPreferences` table created and migrated
- [ ] `preferences.get` / `preferences.update` functional
- [ ] All preference fields validated (enum ranges, hex color, numeric limits)
- [ ] Profile page Apariencia section connected
- [ ] Preferences persist across page reload (confirmed in browser)
- [ ] No `any` typed fields in interface or Zod schema

---

### Group C — Three-Way Theme Toggle

**Objective:** Ship `light / dark / system` theme selection (TASK-045). The CSS mechanism was fixed in Pre-Sprint 4 (B-02), so only the three-way toggle UI and system-mode detection remain.

**Note:** The original TASK-045 estimated 2h because it included fixing the broken CSS mechanism. That is now done. Remaining work is ~1h.

| Subtask | Effort | Owner | Notes |
|---|---|---|---|
| TASK-045a — Three-way radio toggle in profile Apariencia section | 0.5h | FE | Light / Dark / System options; depends on TASK-030c |
| TASK-045b — System mode detection via `window.matchMedia` + listener | 0.5h | FE | React to OS preference changes in real time |
| TASK-045c — Persist theme selection to `UserPreferences` | 0 | FE | Covered by TASK-030c integration |
| TASK-045d — Browser test: all 3 modes apply correct `.dark` class | 0.25h | QA | Manual in browser — mandatory gate (lesson B-02) |

**Acceptance Criteria:**
- [ ] Three-way toggle renders in profile page
- [ ] `system` mode detects OS preference and reacts to changes
- [ ] Selection persists across page reloads
- [ ] CSS `.dark` class applied correctly for all 3 modes (confirmed in browser)

---

### Group D — Review Management

**Objective:** Implement edit/delete for weekly reviews, auto-save, and week selector for older review periods.

| Subtask | Effort | Owner | Notes |
|---|---|---|---|
| TASK-031a — Add Edit button to ReviewDetailPanel | 1h | FE | Reuses `NuevaReviewModal` in edit mode; button label "Editar revisión" |
| TASK-031b — Add Delete button + confirmation dialog | 0.5h | FE | Soft-delete recommended (archive flag) to prevent data loss |
| TASK-031c — Implement `weeklyReviews.update` tRPC mutation | 1.5h | BE | Update text, tags, discipline score; input interface must match Zod schema (lesson B-01) |
| TASK-061a — Auto-save with debounce (2s) in review modal | 1h | FE | Visual "guardando..." indicator; avoid excessive API calls |
| TASK-069a — Week selector date picker for review periods older than 6 weeks | 0.5h | FE | Calendar UI; current week selector only shows last 6 weeks |
| TASK-031d — Tests: review edit/delete — 5+ scenarios | 1h | QA | Edit title, edit tags, delete, verify soft-delete flag, verify data integrity |

**Acceptance Criteria:**
- [ ] Reviews editable (text, tags, discipline score)
- [ ] Reviews deletable with confirmation; data archived (not hard-deleted)
- [ ] Auto-save fires 2s after last change; visual indicator shown
- [ ] Week selector allows selecting periods older than 6 weeks
- [ ] Edit/delete tested with 5+ test cases

---

### Group E — Psychology Data Model

**Objective:** Add structured psychology fields to the Trade model (TASK-034). Enables psychology trend analysis and the Sprint 6 psychology widget.

| Subtask | Effort | Owner | Notes |
|---|---|---|---|
| TASK-034a — Prisma migration: add psychology fields to `Trade` model | 0.5h | BE | Fields: `emotionBefore` (enum), `confidenceRating` (1–5 int), `executionQuality` (1–5 int), `fomoFlag` (bool), `revengeFlag` (bool). All optional (backward compatible) |
| TASK-034b — Add psychology section to register trade form | 1h | FE | Emotion dropdown, confidence slider, execution quality slider, FOMO/revenge flags |
| TASK-034c — Show psychology fields in trade detail panel | 0.5h | FE | Read-only display in trade detail panel |
| TASK-034d — Tests: psychology field storage, enum validation, null handling | 0.5h | QA | All enum values, optional fields null, min/max on ratings |

**Acceptance Criteria:**
- [ ] Migration runs cleanly on dev branch with 100+ trades
- [ ] All existing trades have `null` psychology fields (backward compatible)
- [ ] Psychology section appears in trade form (collapsible to avoid form bloat)
- [ ] Psychology values visible in trade detail panel
- [ ] Enum values and rating bounds enforced on backend

---

### Group F — Type Safety

**Objective:** Eliminate critical type debt that suppresses TypeScript checks and can hide future regressions. Pre-Sprint 4 R-002 flagged this as medium risk.

| Subtask | Effort | Owner | Notes |
|---|---|---|---|
| TASK-013a — Eliminate 15+ `as never` casts in `trades/page.tsx` | 2h | FE | Replace with `RouterOutputs["trades"]["list"]["items"][0]` |
| TASK-014a — Unify `LearningResource` type with RouterOutputs | 1h | FE | Delete manual interface; export from `RouterOutputs["learning"]["list"]["items"][0]` |
| TASK-023a — Type `market: any` in MarketCard, `amount: any` in Retiros | 0.5h | FE | Proper types from RouterOutputs |
| TASK-066a — Fix `phasePayload as never` in accounts router | 0.5h | BE | Define `PhasePayload` union type; remove cast |

**Acceptance Criteria:**
- [ ] `as never` casts in `trades/page.tsx` reduced by 80%+
- [ ] Zero manual type definitions that duplicate RouterOutputs shapes
- [ ] `tsc --noEmit` succeeds with no new errors
- [ ] `phasePayload as never` replaced with typed union

---

### Group G — Persist Dashboard State

**Objective:** Persist dashboard tab and chart grain selection (TASK-047) via UserPreferences.

| Subtask | Effort | Owner | Notes |
|---|---|---|---|
| TASK-047a — Persist active dashboard tab to `UserPreferences.defaultTab` | 0.5h | FE | Depends on TASK-030; read on mount, write on change |
| TASK-047b — Persist chart grain selection (1D/1W/1M) to `UserPreferences.defaultGrain` | 0 | FE | Covered by TASK-047a plumbing |

**Acceptance Criteria:**
- [ ] Dashboard re-opens on the last-used tab after page reload
- [ ] Chart grain selection persists across page reloads

---

## 3. Quality Gates (New — From Pre-Sprint 4 Lessons)

These gates are **mandatory for every task in this sprint.** They were added based on the 3 Blocking findings from Pre-Sprint 4.

### Gate 1: Zod–Interface Sync (lesson B-01)

Every new tRPC procedure must have its TypeScript input interface match the Zod schema exactly:
- Each optional Zod field → optional TypeScript field
- No `as` cast to narrow the input type inside the procedure body
- PR checklist item: "Zod schema and TypeScript interface match field-for-field"

### Gate 2: Browser Testing for All UI Changes (lesson B-02)

Any task that modifies DOM behavior, CSS class application, localStorage, or classList must be:
1. Tested in the dev server (`npm run dev`) before marking as done
2. Confirmed visually in browser for all variants (light mode, dark mode, mobile width)
3. PR description must include: "Tested in browser: [what was confirmed]"

### Gate 3: Serialization Validation for DB-Touching Procedures (lesson B-03)

Any tRPC mutation that returns a value from Prisma must check:
- `Decimal` fields → explicitly converted with `Number()` or `.toNumber()` before return
- `Date` fields → serialized to ISO string if needed by client
- Test must call the procedure through the tRPC stack (not just `caller.procedure()`), or mock must return realistic Prisma types

---

## 4. Sprint Schedule

### Week 1 (Days 1–5) — Backend + Critical Path

| Day | Focus | Tasks |
|---|---|---|
| Day 1 | Architecture review + TASK-011 start | TASK-030-arch, TASK-011a |
| Day 2–3 | Discipline score consolidation + tests | TASK-011b/c/d/e |
| Day 4–5 | UserPreferences schema + router | TASK-030a/b |

**Milestones:**
- End Day 3: Single `computeDisciplineScore()` deployed; all 3 call sites verified identical
- End Day 5: `UserPreferences` table migrated; `preferences.get/update` wired

### Week 2 (Days 6–10) — Frontend + Reviews + QA

| Day | Focus | Tasks |
|---|---|---|
| Day 6 | Psychology fields + review edit/delete | TASK-034a/b/c, TASK-031a/b/c |
| Day 7 | Theme toggle + preferences UI | TASK-030c, TASK-045a/b |
| Day 8 | Type safety cleanup | TASK-013a, TASK-014a, TASK-023a, TASK-066a |
| Day 9 | Auto-save + week selector + dashboard persist | TASK-061a, TASK-069a, TASK-047a |
| Day 10 | Testing, browser QA gates, PR reviews | All test additions + quality gates |

**Milestones:**
- End Day 6: Psychology fields stored; reviews editable and deletable
- End Day 7: Theme toggle functional, confirmed in browser (Gate 2)
- End Day 8: `tsc --noEmit` clean; 80%+ `as never` casts removed
- End Day 10: All tests green (390+); all quality gates passed

---

## 5. Dependency Graph

```
Pre-Sprint 4 complete (354 tests, 0 open findings)
  ↓
TASK-030-arch (Day 1)
  ↓
TASK-030a/b ──→ TASK-030c ──→ TASK-045a/b (theme toggle)
                          └──→ TASK-047a (persist tab/grain)

TASK-027 (Sprint 1 complete) ──→ TASK-011a/b/c
                                       ↓
                                  TASK-011d/e (frontend + tests)

TASK-034a ──→ TASK-034b/c (form + panel)

TASK-031a/b/c (review edit/delete) ──→ TASK-061a (auto-save)

TASK-013/014/023/066 (type safety) — independent
```

**Critical path:** TASK-030-arch → TASK-030a → TASK-030b (3 days)  
**No hard blockers between groups** after TASK-030 foundation is laid.

---

## 6. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| TASK-011 changes formula output; stored scores diverge | 🔴 Critical | Capture current output from all 3 sites for 3+ real weeks before refactoring. Confirm identical output before deploying. |
| TASK-030 schema design flaw requires migration rework | 🟠 High | Architecture review (TASK-030-arch) mandatory before any code. One-row-per-user uniqueness constraint must be in first migration. |
| TASK-045 CSS mechanism regresses (B-02 repeats) | 🟡 Medium | Gate 2 (browser testing) mandatory. Test all 3 theme modes in dev browser before merge. |
| TASK-034 migration has issues on existing trades | 🟡 Medium | All new fields optional with `DEFAULT NULL`. Test rollback on dev branch with 100+ trades. |
| TASK-013 type cleanup breaks compilation | 🟡 Medium | Start with 2–3 casts; run `tsc --noEmit`; expand. Isolate from other changes. |
| New tRPC procedures repeat B-01 (interface mismatch) | 🟡 Medium | Gate 1: PR checklist item for every new procedure. Reviewer must confirm match. |
| New procedures repeat B-03 (Decimal serialization) | 🟡 Medium | Gate 3: Any procedure returning Prisma data must explicitly convert Decimal fields. |
| Sprint over-capacity if TASK-011 hits complications | 🟡 Medium | Priority order: TASK-011 > TASK-030 > TASK-031 > TASK-034 > TASK-045 > type safety. Drop later groups if needed. |

---

## 7. Testing Strategy

### New Unit Tests (target: +36 tests → 390+ total)

| Test Area | Task | Tests | Coverage Focus |
|---|---|---|---|
| Discipline score consolidation | TASK-011e | 5+ | All 3 call sites produce identical output; 5 test weeks |
| UserPreferences CRUD | TASK-030d | 8+ | Get, update, enum validation, range validation, serialization |
| Review edit/delete | TASK-031d | 5+ | Edit title, edit tags, delete (soft), conflict, data integrity |
| Psychology fields | TASK-034d | 4+ | Enum values, rating bounds, null handling, backward compat |
| Theme persistence | TASK-045d | 2 | Theme stored to UserPreferences; applied on next load |

### Browser QA (Gate 2 — mandatory)

| Feature | Test | Pass Criteria |
|---|---|---|
| Theme toggle | Switch light→dark→system in profile page | `.dark` class applied / removed correctly in browser |
| Preferences persist | Set preferences, reload page | Same preferences load on next visit |
| Review edit | Open existing review, edit text, save | Text updated in ReviewDetailPanel |
| Psychology form | Create trade with psychology fields | Fields visible in trade detail panel |
| Auto-save | Type in review modal, wait 2s | "guardando..." indicator appears; no error |

### Integration Tests (Gate 3 — mandatory for new procedures)

- `preferences.get` returns all fields as correct primitive types (no Decimal objects, no Date objects unless expected)
- `preferences.update` validates enum fields and rejects out-of-range values
- `weeklyReviews.update` mutation persists and returns updated fields correctly

### Regression Tests

- Profile backend (TASK-006, Sprint 3) still functions after UserPreferences migration
- Discipline score in dashboard matches score in review modal for same week
- Goals (`weeklyTradesGoal`, `weeklyPnlGoal`) still save via `profile.update` (B-01 fix intact)

---

## 8. Acceptance Criteria (Sprint 4 Definition of Done)

### Must-Have

- [ ] **TASK-011:** Discipline score consolidated. Single function. 3 call sites verified identical.
- [ ] **TASK-030:** `UserPreferences` CRUD functional. Preferences persist across reloads.
- [ ] **TASK-031:** Reviews editable and deletable with confirmation. Soft-delete implemented.
- [ ] **TASK-034:** Psychology fields on Trade model. Visible in trade form and detail panel.
- [ ] **TASK-045:** Three-way theme toggle works. All modes confirmed in browser.
- [ ] **TASK-013/014/023/066:** `as never` casts reduced 80%+. `tsc --noEmit` clean.
- [ ] **All quality gates passed:** Gate 1 (Zod sync), Gate 2 (browser tested), Gate 3 (serialization)
- [ ] **390+ tests passing, 0 failing**

### Should-Have

- [ ] **TASK-061:** Auto-save with debounce in review modal
- [ ] **TASK-047:** Dashboard tab and chart grain persisted
- [ ] **TASK-069:** Week selector for older review periods

### Exit Criteria

- [ ] All must-have items merged to branch
- [ ] Manual QA sign-off: theme toggle, review edit, psychology fields confirmed in browser
- [ ] `tsc --noEmit` passes
- [ ] Test coverage >80% on all new tRPC procedures
- [ ] No regressions in Sprints 1–3 features (profile, goals, formulas, learning)

---

## 9. Sprint Success Metrics

| Metric | Target |
|---|---|
| Tests passing | 390+ / 390+ |
| Type errors | 0 new (tsc --noEmit clean) |
| `as never` casts remaining in trades/page.tsx | <3 |
| New procedures with Zod/interface mismatch | 0 |
| Browser QA gates passed | 100% (all UI tasks) |
| Open Blocking/Major findings at sprint end | 0 |
| Discipline score divergence (3 sites) | 0 (consolidated) |

---

## 10. Files to Create / Modify

| File | Change | Task | Owner |
|---|---|---|---|
| `src/lib/trading-formulas.ts` | Add `computeDisciplineScore()` export | TASK-011a | BE |
| `src/server/trpc/routers/weekly-reviews.ts` | Call shared formula in 2 procedures | TASK-011b/c | BE |
| `src/app/reviews/modals/create-review-modal.tsx` | Remove local formula; use prefill value | TASK-011d | FE |
| `prisma/schema.prisma` | Add `UserPreferences` model + psychology fields on `Trade` | TASK-030a, TASK-034a | BE |
| `src/server/trpc/routers/preferences.ts` | New: `preferences.get` + `preferences.update` | TASK-030b | BE |
| `src/app/perfil/page.tsx` | Connect Apariencia section; three-way toggle | TASK-030c, TASK-045a/b | FE |
| `src/app/layout.tsx` | Apply theme from UserPreferences on init | TASK-045c | FE |
| `src/app/reviews/panels/review-detail-panel.tsx` | Add Edit + Delete buttons | TASK-031a/b | FE |
| `src/server/trpc/routers/weekly-reviews.ts` | Add `weeklyReviews.update` mutation | TASK-031c | BE |
| `src/app/trades/modals/register-trade-modal.tsx` | Add psychology section | TASK-034b | FE |
| `src/app/trades/[id]/page.tsx` | Show psychology fields in detail panel | TASK-034c | FE |
| `src/app/trades/page.tsx` | Replace `as never` casts | TASK-013a | FE |
| `src/server/trpc/routers/accounts.ts` | Fix `phasePayload as never` | TASK-066a | BE |
| `src/__tests__/routers/preferences.test.ts` | New test file | TASK-030d | QA |
| `src/__tests__/routers/weekly-reviews.test.ts` | Add edit/delete tests | TASK-031d | QA |
| `src/__tests__/formulas/discipline-score.test.ts` | New: formula consistency tests | TASK-011e | QA |

---

## 11. Comparison to SPRINT_MASTER_PLAN.md

| Item | SPRINT_MASTER_PLAN.md | This Plan | Reason |
|---|---|---|---|
| TASK-011 timing | Sprint 3, "should do" | **Sprint 4, Day 1, CRITICAL** | Pre-Sprint 4 R-001: discipline score triplication is highest open risk |
| TASK-050a/b goal backend | 2h planned | **Removed (already done)** | Completed in Sprint 3 + Pre-Sprint 4 B-01/B-03 fixes |
| TASK-045 effort | S (2h) | **S (1h)** | CSS mechanism fixed in Pre-Sprint 4 B-02; only UI shell remains |
| Quality gates | Not present | **3 mandatory gates added** | Direct lessons from B-01, B-02, B-03 findings |
| Risk register | 3 generic risks | **8 risks; 3 from Pre-Sprint 4 learnings** | B-01, B-02, B-03 root causes formalized as sprint risks |
| TASK-048 (review filtering) | Listed in Sprint 4 | **Deferred to Sprint 6** | Sprint capacity; preserve buffer; not blocking any Sprint 5 work |
| Test target | 315–330 | **390+** | Higher baseline (354) + more test tasks |

---

## Appendix A: Pre-Sprint 4 Findings Impact on Sprint 4

| Pre-Sprint 4 Finding | Sprint 4 Impact |
|---|---|
| B-01: UpdateProfileInput interface missing fields | → Gate 1: Zod/interface sync mandatory for all new procedures |
| B-02: Theme toggle had no CSS effect | → Gate 2: Browser testing mandatory for all UI tasks; TASK-045 scope reduced |
| B-03: Prisma Decimal serialized as string | → Gate 3: Serialization test required for all DB-touching procedures |
| M-01: Dashboard mislabeled | → Confirms need for TASK-011 (discipline score consolidation) |
| M-02: Stale closures in useEffect | → TASK-031/061 reviews modal: explicit useEffect deps review in PR checklist |
| M-04: Edit-mode queries wrong week | → Guards confirmed working; ensure TASK-031 edit flow doesn't regress |
| R-001: TD-002 discipline score 3 implementations | → TASK-011 elevated to Day 1, Critical Path |
| R-002: Type safety debt (TD-012, TD-013) | → TASK-013a, TASK-066a included in must-have scope |

---

## Appendix B: Deferred to Sprint 5

| Task | Reason | Sprint |
|---|---|---|
| TASK-048 — Review filtering and search | Capacity; not blocking Sprint 5 | Sprint 6 |
| TASK-046 — Accent color picker + colorblind mode | Depends on TASK-030 stable; non-critical | Sprint 5 |
| TASK-050 — Goal setting dashboard widget | Backend already done; UI is Sprint 5 work | Sprint 5 |
| TASK-063 — Psychology widget in review modal | Depends on TASK-034; widget is Sprint 6 work | Sprint 6 |

---

*End of SPRINT_4_IMPLEMENTATION_PLAN.md*  
*Generated: 2026-06-02 | Based on: SPRINT_MASTER_PLAN.md + CANONICAL_EXECUTION_PLAN.md + PRE_SPRINT_4_RETROSPECTIVE.md*
