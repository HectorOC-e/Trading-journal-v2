# CYCLE 1 — Implementation Plan
> **Date:** 2026-06-04
> **Trigger:** Project completion orchestrator — re-validate against real code, not docs.

## Methodology
Did not trust docs. Validated real state via:
- `next build` (production compile) → ✅ passes, 23 routes generated
- `vitest run` → 479/479 pass
- `eslint .` (full source) → 105 problems (63 errors, 42 warnings) — **docs never tracked lint state**
- Manual audit: nav targets vs routes, dead onClick handlers, TODO/FIXME/stub strings
- Code reads: psychology automation (ruleViolationStats, pattern-detector), AI guards, theme/settings effects

## Findings (real, code-verified)

| # | Severity | Finding | Location |
|---|----------|---------|----------|
| F-01 | Major | Render impurity — `Date.now()` called during render (non-deterministic, breaks React Compiler memoization) | `account-card.tsx:83`, `resource-card.tsx:181` |
| F-02 | Major | A11y violation — `aria-pressed` on `role="tab"` (invalid ARIA; multiSelect items mislabeled as tabs) | `components/ui/filter-bar.tsx` |
| F-03 | Minor | Unescaped quotes in JSX | `reglas/page.tsx:213` |
| F-04 | Minor | Literal type assertion instead of `as const` | `reviews/page.tsx:194` |
| F-05 | Minor | `let` never reassigned → `prefer-const` | `streak-service.test.ts:55-56` |
| F-06 | Minor | 34 `no-explicit-any` lint errors — all in test mocks (createCaller); 0 in production code | `__tests__/routers/*` |
| F-07 | Minor | Stale `eslint-disable` directive (no longer triggers) | `setups.ts:84` |
| F-08 | Minor (accepted) | 22 `react-hooks/set-state-in-effect` — idiomatic sync-on-open / localStorage-load patterns | 22 modal/form/provider sites |
| F-09 | Minor (accepted) | 9 `exhaustive-deps` — perf/precision hints, no stale-closure bug (verified theme-provider, trades scroll-lock) | various |

## Negative findings (audited, NOT broken — docs were accurate)
- Navigation: all 11 sidebar hrefs map to real routes ✓
- No dead/empty onClick handlers ✓
- No TODO/FIXME/stub placeholders in logic ✓
- Psychology automation wired: `ruleViolationStats`, `patternInsights`, `moodCorrelation` real procedures; `pattern-detector.ts` 253 LOC ✓
- AI gracefully degrades: `isEmbeddingAvailable()` guards, null-returns on missing keys ✓
- Theme/settings: DB prefs precedence over localStorage, field-precise deps ✓
- Production code: **0 `any`** ✓

## Objectives
1. Fix F-01 (purity) — make renders deterministic
2. Fix F-02 (a11y) — correct ARIA semantics for tabs vs toggle buttons
3. Clear cosmetic lint F-03/04/05/07
4. Resolve F-06 via eslint config override (tests legitimately mock with `any`)
5. Document F-08/F-09 as accepted Minor debt (TD-037)

## Risks
- F-02 fix changes FilterBar ARIA roles → may break filter-bar test (mitigated: test updated to assert correct semantics)
- F-08 mass-refactor risk → deliberately NOT churned (22 working, tested forms); documented instead

## Out of scope (environment-limited)
- Physical-device responsive testing (no device farm)
- PWA install on iOS (needs HTTPS + PNG icons — deploy-time)
