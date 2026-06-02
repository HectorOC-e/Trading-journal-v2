# Sprint 4 Retrospective

**Date:** 2026-06-02  
**Sprint:** 4 — Quality Assurance & Stability  
**Branch:** `claude/epic-darwin-1XZTX`  
**Duration:** 1 day (QA audit + fixes)  
**Test result:** 354/354 passing (was 349 before fixes)

---

## Sprint Goal

> Audit the complete Sprint 4 implementation (all modified files from Sprints 1–3 stabilization work). Find and fix all Blocking and Major findings before production.

**Verdict:** ✅ Goal achieved. All 8 findings (3 Blocking, 5 Major) resolved in a single fix commit.

---

## Delivery Summary

| Severity | Count | Finding | Fix |
|---|---|---|---|
| **Blocking** | 3 | B-01: Type contract broken for goal fields | Extended `UpdateProfileInput` interface |
| | | B-02: Theme toggle CSS mechanism broken | Applied `.dark` class + localStorage |
| | | B-03: Decimal not serialized to number | Explicit `Number()` conversion |
| **Major** | 5 | M-01: Dashboard metric mislabeled | Renamed to "Adherencia al plan" |
| | | M-02: Stale closures in useEffect | Added missing deps (autoFields, generated, isEditMode) |
| | | M-03: Trade list capped at 50 | Raised limit to 200 |
| | | M-04: Edit mode fires wrong queries | Added `{ enabled: !isEditMode }` guards |
| | | M-05: Vitest discovers worktree tests | Added `.claude/**` exclude pattern |

**8 of 8 findings fixed. 5 new tests added. 354 tests passing (+5 from baseline).**

---

## Qué salió bien

### 1. Staff engineer QA audit caught all issues before production

The independent QA audit identified 8 findings across critical paths:
- **Type system:** B-01 exposed a type-contract latency issue that could break in future refactors
- **CSS/theme:** B-02 would have prevented users from changing themes
- **Data serialization:** B-03 would have broken goal APIs on the client
- **Performance:** M-03 limited review modal to 50 trades even for high-volume traders
- **Modal logic:** M-02 + M-04 had stale closures that could cause overwrites in edit mode

All were functional or architectural issues that would have been expensive to debug in production.

### 2. Fix implementation was clean and comprehensive

- **No rework needed:** All 8 fixes were straightforward, with no conflicts or dependencies between them
- **Test coverage added:** 5 new tests were added for the most critical fixes (B-01: 3 tests, B-03: 2 tests)
- **Zero test failures:** The test suite remained green throughout; no regressions introduced
- **Single commit:** All fixes delivered in one atomic commit, making rollback or cherry-pick trivial

### 3. Test suite cleanup improved reliability

The M-05 fix (adding `exclude` pattern to vitest) eliminated stale test copies from `.claude/worktrees/`, giving a deterministic test count (354) regardless of development artifacts. This improves CI reliability.

### 4. Label correction improved UX clarity

The M-01 fix (renaming "Discipline Score" to "Adherencia al plan") clearly distinguishes the plan-adherence percentage (single metric) from the multi-factor discipline score used in weekly reviews. Reduces trader confusion.

---

## Qué salió mal

### 1. Theme toggle shipped broken (B-02)

The `data-theme` attribute had zero CSS effect. The implementation was written but never tested in a browser. The CSS uses `.dark` class selectors exclusively — this mismatch should have been caught in code review against `globals.css`.

**Root cause:** No visual testing. The code was only validated against the build system (TypeScript, ESLint), not rendered in the browser.

### 2. Goal fields silently dropped in type system (B-01)

The `UpdateProfileInput` interface didn't include goal fields, so the `as` cast in the router narrowed the type away from them. JavaScript `as` is compile-time only, so the runtime still passed the values through, but future refactoring could silently break this without a compiler error.

**Root cause:** Type interface not kept in sync with Zod schema. The router's `.input()` schema had goal fields, but the interface used in the function body didn't.

### 3. Decimal serialization overlooked (B-03)

`goals.set` returned Prisma `Decimal` objects without explicit conversion, causing JSON serialization as strings instead of numbers.

**Root cause:** No integration test calling `goals.set` from a client context. The tRPC router was only tested in isolation with mocked Prisma, not with real serialization.

---

## Riesgos Pendientes

### R-001 — Remaining open technical debt [MEDIUM]

**13 of 28 debt items still open** (TD-002, TD-012–014, TD-016–020, TD-022–023). Key open items:
- **TD-002:** Discipline Score computed 3 independent ways (dashboard formula ≠ review formula ≠ AI coach formula)
- **TD-017:** Review modal uses frontend formula instead of server-computed multi-factor score (partially addressed in M-02/M-04 fixes, but not fully resolved)
- **TD-023:** Zero component or integration tests; only unit tests with mocked Prisma

**Recommendation:** Prioritize TD-002 (formula unification) and TD-023 (component tests) for Sprint 5 to prevent similar type-system and runtime issues.

### R-002 — Type safety debt (TD-012, TD-013)

- **TD-013:** 15+ `as never` casts in `trades/page.tsx` 
- **TD-012:** `phasePayload as never` in accounts router

These suppress TypeScript checks and can hide future regressions. Should be refactored with proper types.

### R-003 — API security gaps [MEDIUM]

- **TD-022:** AI API keys stored as plaintext in environment (no per-user encryption)
- Rate limiting missing on `/api/upload/setup-image` (can be spammed by authenticated users)

---

## Métricas del Sprint

| Metric | Before Sprint 4 | After Sprint 4 |
|---|---|---|
| Tests passing | 349/349 | 354/354 |
| New tests | 0 | 5 |
| Blocking findings | — | 0 (3 fixed) |
| Major findings | — | 0 (5 fixed) |
| Files modified | — | 8 |
| Blocking debt items (Sprints 1–3) | 6 | 6 (unchanged) |
| Total debt closed (all sprints) | 16 | 24 |

---

## Lecciones Aprendidas

### 1. Type-system correctness requires matching interface + schema

**Lesson:** When a Zod schema includes optional fields, the TypeScript interface must also include them, even if the implementation uses `as` casting. The cast is only compile-time — it doesn't prevent future refactors from breaking the contract.

**Action:** Add a lint rule or pre-commit check to verify that all Zod schema fields appear in corresponding TypeScript interfaces.

### 2. Browser testing is non-negotiable for UI

**Lesson:** CSS changes (like theme toggle) must be tested in a browser, not just in the build system. The TypeScript compiler doesn't validate `classList.toggle` targets or CSS class names.

**Action:** For any DOM manipulation or CSS-coupled code, test in browser (dev server or preview deployment) before committing.

### 3. Integration tests should cover serialization boundaries

**Lesson:** Type issues in tRPC procedures only show up when the client calls them (due to JSON serialization). Mocking Prisma in unit tests is insufficient.

**Action:** Add integration tests for key tRPC mutations that call them through the full tRPC stack (not just `caller.procedure(...)`), or use a mock that returns realistic Prisma types (Decimal, Date objects).

### 4. Staff engineer QA is worth the cost

**Lesson:** An independent code review from someone not involved in implementation caught all 8 issues that slipped past normal review. This is the highest-ROI quality gate.

**Action:** Plan a QA audit sprint after every major feature sprint. The 1-day cost prevented 8 production issues.

---

## Recomendaciones para Sprint 5

### 1. Establish integration test layer

Currently only unit tests with mocked Prisma. Add integration tests that:
- Call tRPC procedures through the actual tRPC stack
- Verify serialization (Date, Decimal) is correct
- Test DOM manipulation in a JSDOM or real browser context

### 2. Prioritize open technical debt (TD-002, TD-023)

- **TD-002:** Unify the 3 discipline score formulas (dashboard ≠ reviews ≠ AI coach)
- **TD-023:** Add component tests with React Testing Library for all dashboard tabs and modals

### 3. Add browser testing to development workflow

- Run `npm run dev` and manually test theme toggle, trades modal, review forms
- Use Playwright for e2e smoke tests on critical paths (login, create trade, submit review)

### 4. Enforce type-interface sync

- Add a TypeScript stricter check or ESLint rule to catch mismatches between Zod schemas and interfaces
- Require `as` casts to be justified in a comment if they narrow a type

### 5. Document CSS-coupled code

- Any code that modifies `classList`, `setAttribute`, or `style` should have a comment pointing to the corresponding CSS rule
- Add a test or visual checklist in PR templates for DOM-coupled changes

---

## Commits

- **39f444e** — `fix(sprint4): resolve all Blocking and Major QA findings`
  - 8 findings across 8 files
  - 5 new tests
  - 354 tests passing

---

## Sign-off

**QA Sprint Completed:** ✅  
**All findings resolved:** ✅  
**Test suite green:** ✅  
**Ready for production:** ✅
