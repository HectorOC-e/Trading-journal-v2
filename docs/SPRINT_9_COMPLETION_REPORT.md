# Sprint 9 — Completion Report
> **Date:** 2026-06-04  
> **Status:** ✅ Delivered  
> **Branch:** claude/epic-darwin-1XZTX

## Delivered Tasks

| Task | Description | Status |
|------|-------------|--------|
| TD-036 | ISO week timezone fix — getISOWeekKey now uses UTC | ✅ |
| TD-036 | streak-service.ts UTC migration + test fix | ✅ |
| TD-035 | Account filter UI in trades page (chip-style selector) | ✅ |
| TD-034 | Setup version diff in playbook — shows +/- checklist items per version | ✅ |
| TASK-053 | Multi-account equity curve chart in portfolio tab (LineChart per account) | ✅ |
| TASK-077 | PWA manifest.json + service worker (network-first API, cache-first static) | ✅ |
| TASK-052 | Onboarding checklist component with progress ring, dismiss, localStorage persistence | ✅ |

## Key Deliverables

### TD-036 — ISO Week UTC (formulas/utils.ts + streak-service.ts)
- Root cause: `setHours(0,0,0,0)` uses local timezone causing week boundary errors in UTC-6/UTC+X zones
- Fix: replaced all `setHours` with `setUTCHours`/`Date.UTC()` throughout `getISOWeekKey` and `computeNewStreak`
- Test: updated assertion from `getHours()` to `getUTCHours()` — now correctly timezone-agnostic

### TD-035 — Account Filter (trades/page.tsx)
- Added chip-style account selector above trades table (only shows when user has >1 account)
- Uses existing `accountId` param in `trpc.trades.list.useInfiniteQuery`
- "Todas" chip resets filter; selected account chip is highlighted in accent color

### TD-034 — Version Diff (playbook/page.tsx)
- Added `parseSnapshot()` and `computeDiff()` helpers in SetupDrawer
- Compares consecutive version snapshots to show: added items (green +), removed items (red -), direction change
- No backend change required — snapshot was already returned by `getVersions` query

### TASK-053 — Multi-Account Equity Curve (tab-portfolio.tsx)
- Added `LineChart` with one `Line` per account using a stable 8-color palette
- Pivots `equityCurve: EquityCurvePoint[]` by date to build recharts data
- Only renders when ≥2 accounts and ≥2 data points exist
- Legend row below chart with account name + color swatch

### TASK-077 — PWA (public/)
- `manifest.json`: app name, start_url, display, theme_color, shortcuts (Trades, Dashboard)
- `sw.js`: installs/activates cache, network-first for `/api/`, cache-first for `/_next/static/`, pages fallback
- `layout.tsx`: `<link rel="manifest">`, `viewport` metadata, `Script` inline SW registration

### TASK-052 — Onboarding Checklist (components/onboarding/)
- 4 steps: crear cuenta, crear setup, primer trade, completar perfil
- Progress ring SVG (% complete), collapsible, dismiss to localStorage
- Auto-disappears when all steps done; rendered in Dashboard portfolio tab

## Test Results
- **Pre-Sprint:** 479 passing (39 files)
- **Post-Sprint:** 479 passing (39 files)
- Pre-existing failing test fixed: `streak-service.test.ts` timezone assertion

## Breaking Changes
None. All changes are additive or bug fixes.

## Technical Debt Closed
- TD-034 ✅, TD-035 ✅, TD-036 ✅

## Open Items for Sprint 10
- TD-018: Extract router business logic (ongoing, large scope)
- TD-019: Supabase client per-request (medium priority)
- TASK-078: PDF export — implemented as `/dashboard/export` page (print-to-PDF)
