# CYCLE 1 — Retrospective
> **Date:** 2026-06-04

## What was fixed
- **2 render-purity bugs** (Major): `Date.now()` in render → lazy `useState` initializer. Real bug — broke React Compiler memoization and made renders non-deterministic.
- **1 a11y bug** (Major): `aria-pressed` on `role="tab"` is invalid ARIA. Sprint 8 "fixed" `aria-selected`→`aria-pressed` but applied the wrong attribute to tab role. Now split: tabs use `aria-selected`, toggle buttons use `aria-pressed` + `role="group"`.
- **Cosmetic lint**: unescaped entities, `as const`, `prefer-const`, stale eslint-disable.
- **Config hygiene**: eslint override so test mocks may use `any`; generated Prisma client excluded from lint.

## What stayed open (and why)
- **22 `set-state-in-effect`** (TD-037, accepted Minor): sync-on-open form patterns. Working, tested, shipped. The "correct" non-effect fix needs parent-driven `key` remounts across 22 sites — regression risk exceeds the value of silencing a perf hint. Deferred deliberately, not overlooked.
- **9 `exhaustive-deps`** (accepted): each audited; no correctness bug.

## Learnings
1. **Docs never tracked lint.** Completion reports claimed "0 TS errors" (true) but silently carried 63 ESLint errors including 2 real bugs. Lesson: gate definition must include `eslint`, not just `tsc`.
2. **A QA "fix" can introduce a new bug.** Sprint 8's ARIA change traded one violation for another. Lesson: a11y changes need the actual ARIA spec checked, not just "swap the attribute."
3. **`Date.now()` in render is a silent landmine** under React Compiler. Two components had it; both passed all functional tests because the impurity is invisible until compiler-level memoization. Lesson: purity lint catches what tests can't.
4. **Not every lint error is worth fixing immediately.** Distinguishing real bugs (purity, a11y) from idiomatic-but-flagged patterns (sync-on-open) kept the cycle safe.

## Risks carried forward
- TD-037 (22 effects) — low; functional, tested.
- PWA PNG icons / PDF chart capture — deploy-time / future enhancement.
- Responsive on physical devices — unvalidated in this environment.

## Reevaluation outcome
After fixes: 0 Blocking, 0 Major, 0 incomplete relevant features, metrics consistent (formula tests green), nav coherent, AI guarded, settings correct. **Finalization criteria met → no Cycle 2 required.**
