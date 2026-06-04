# Sprint 10 — QA Report
> **Date:** 2026-06-04

## Test Baseline
- 479 tests passing — no regressions
- TypeScript: 0 errors

## Findings

### Blocking — 0 items

### Major — 0 items

### Minor (m-01) — PDF export needs `export/layout.tsx` to bypass AppShell
- **Status:** ✅ Fixed — `export/layout.tsx` created to bypass the root layout's AppShell sidebar wrapping
- **Note:** The export page uses client-side `window.print()` which requires JavaScript. SSR/no-JS fallback not needed for a trading journal.

### Minor (m-02) — Service worker caches `/dashboard` but Next.js may serve stale page
- **Behavior:** Next.js pages are SSR. Service worker caches the HTML response on first load. After a deploy, cached HTML may be stale until SW update cycle.
- **Mitigation:** SW cache name is `tj-v1`. On next deploy, update cache version to `tj-v2` to force cache bust.
- **Status:** Acceptable for v1. Document in deployment runbook.

### Nitpick (N-01) — PDF print dialog shows browser UI
- **Behavior:** `window.print()` opens the native browser print dialog. Users must select "Save as PDF" manually.
- **Status:** Acceptable — no server-side PDF library needed. Simplest viable implementation.

## Conclusion
Sprint 10 delivered cleanly. No Blocking or Major issues. 2 Minor items documented as acceptable.
