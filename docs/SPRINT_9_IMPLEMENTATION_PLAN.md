# SPRINT 9 — Implementation Plan
> **Status:** In Progress  
> **Date:** 2026-06-04  
> **Branch:** claude/epic-darwin-1XZTX

## Objectives
1. Complete multi-account portfolio dashboard MVP (TASK-053)
2. Resolve all deferred debt items: TD-034 (version diff), TD-035 (account filter), TD-036 (ISO week timezone)
3. Establish foundation for Sprint 10 (PWA + PDF)

## Scope

### Group A — Data Integrity & Bug Fixes
- **TD-036**: Fix `getISOWeekKey` local-time vs UTC mismatch — affects weekly metrics when server timezone ≠ UTC
- **TD-035**: Add account filter dropdown to trades page — backend already supports `accountId` param, UI missing

### Group B — Portfolio Dashboard Completion (TASK-053)
- Add per-account equity curve comparison chart to `tab-portfolio.tsx`
- Current state: account comparison table exists, donut chart exists, P&L bar exists
- Missing: equity curve overlay per account (multi-series line chart)

### Group C — Setup Version Diff (TD-034)
- Current state: version history list shows reason + date
- Required: show snapshot diff between versions (what checklist items changed)

### Group D — PWA Foundation (TASK-077 prep)
- Create `public/manifest.json` with app metadata
- Add `<link rel="manifest">` and theme-color to root layout
- Create basic service worker for offline support

## Dependencies
- All tasks are independent; can be executed in parallel
- TD-035 requires backend `accountId` filter (already implemented in `trades.list`)

## Risks
| Risk | Severity | Mitigation |
|------|----------|-----------|
| Multi-series equity curve perf on many accounts | Low | Limit to 8 accounts max in chart |
| Service worker conflicts with Next.js dynamic routes | Medium | Use network-first strategy for API routes |
| Version snapshot schema varies by setup | Low | Null-safe diff logic |

## Acceptance Criteria
1. ✅ ISO week calculation uses UTC — no timezone drift for users in non-UTC zones
2. ✅ Trades page has account filter — selectable from account dropdown
3. ✅ Portfolio tab shows per-account equity curve comparison chart
4. ✅ Version diff shows changed checklist items between setup versions
5. ✅ PWA manifest registered — app installable on mobile

## Validation Strategy
- Run existing test suite (expects 479+ passing)
- Manual check: create trade, verify it appears in filtered view
- Manual check: verify ISO week key is correct for boundary dates
