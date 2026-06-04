# Sprint 9 — QA Report
> **Date:** 2026-06-04  
> **Auditor:** Internal QA pass (automated + manual review)

## Test Baseline
- **479 tests passing** — no regressions introduced
- TypeScript: 0 errors (`tsc --noEmit` clean)

## Findings

### Blocking (B) — 0 items
No blocking issues.

### Major (M) — 0 items
No major issues.

### Minor (m-01) — Account filter resets detail panel
- **Location:** `trades/page.tsx`
- **Behavior:** When user switches account filter, the `selectedId` is not cleared. A trade from Account A may remain "selected" in the detail panel when Account B filter is applied (the trade won't appear in the filtered list).
- **Fix:** Clear `selectedId` on filter change.
- **Status:** Fixed below.

### Minor (m-02) — Equity curve skips accounts with no closed trades
- **Location:** `tab-portfolio.tsx`
- **Behavior:** Accounts with OPEN trades but no CLOSED trades will have no points in the equity curve. Expected — not a bug, but may confuse users.
- **Status:** Acceptable; documented. A comment could note this in the UI.

### Nitpick (N-01) — OnboardingChecklist shown on every render
- **Location:** `dashboard/page.tsx`
- **Behavior:** Onboarding checklist renders even after all steps done (it auto-dismisses but briefly flashes)
- **Resolution:** Auto-dismiss is handled client-side; brief flash is acceptable given `staleTime: 60_000`

## Fixes Applied

### m-01 Fix: Clear selected trade on account filter change
- Added `handleAccountFilter()` function in `trades/page.tsx`
- Calls `setFilterAccountId(id)` + `setSelectedId(null)` atomically
- Both "Todas" chip and account chips use `handleAccountFilter`

## Conclusion
Sprint 9 delivered cleanly. 0 Blocking, 0 Major findings. 2 Minor items — 1 fixed, 1 documented as acceptable.
All 479 tests pass. TypeScript 0 errors.
