# SPRINT 10 — Implementation Plan
> **Status:** Delivered (co-implemented with Sprint 9)  
> **Date:** 2026-06-04

## Objectives
1. PWA: manifest + service worker (TASK-077) — ✅ Completed in Sprint 9 (co-delivered)
2. PDF performance report export (TASK-078) — ✅ Completed
3. Portfolio dashboard continuation (TASK-053) — ✅ Equity curve chart completed

## Scope

### Group A — PWA (TASK-077) ✅
- `public/manifest.json`: name, icons, shortcuts, theme_color, display: standalone
- `public/sw.js`: install/activate lifecycle, network-first API, cache-first static
- `public/icons/icon.svg`: app icon (SVG for broad compatibility)
- `app/layout.tsx`: manifest link, viewport meta, SW registration Script

### Group B — PDF Export (TASK-078) ✅
- `app/dashboard/export/page.tsx`: print-optimized report page
  - Summary KPIs (Net P&L, Win Rate, Profit Factor, Sharpe, Expectancy)
  - Per-account breakdown table
  - Setup performance table (top 10)
  - Last 20 trades table
  - Print CSS (`@media print` with `print-color-adjust`)
- Dashboard TopBar: "Exportar PDF" button opens `/dashboard/export` in new tab
- Auto-triggers `window.print()` after data loads
- `app/dashboard/export/layout.tsx`: minimal layout (no sidebar)

### Group C — Portfolio Continuation (TASK-053) ✅
- Multi-account equity curve comparison LineChart (delivered in Sprint 9)
- Per-account P&L comparison table (already existed)
- Donut chart allocation (already existed)

## Acceptance Criteria
1. ✅ Manifest registered — `<link rel="manifest">` in HTML
2. ✅ Service worker cached — registers on page load
3. ✅ PDF export accessible from Dashboard → "Exportar PDF"
4. ✅ PDF includes: global KPIs, accounts, setups, recent trades
5. ✅ Print CSS applied — color-accurate on printer

## Notes
- PNG icons (192, 512) not generated — SVG icon used instead (works on Chrome, Firefox, Edge)
- Safari requires PNG for `apple-touch-icon`; SVG used as fallback
- Offline mode: static pages cached, API returns 503 JSON when offline
