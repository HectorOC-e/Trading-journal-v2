# Design — Cuentas tutorial · live-refresh fix · Aprendizaje "Progreso" merge

Date: 2026-06-19
Branch: `feat/cuentas-tutorial-and-aprendizaje-merge`

## Context

Four user-reported items, validated against the running app with the QA user
(`qa.journal.2026`):

1. Registering/closing a trade does not refresh the `/cuentas` view "en caliente".
2. `/cuentas` has no guided tutorial (Aprendizaje "Hoy" has one via `SpotlightTour`).
3. Aprendizaje "Progreso" tab is the `ResourceRightRail` sidebar stretched to full
   width, duplicating Hoy's Racha/Meta/Resumen.
4. Two buttons labelled "Iniciar sesión" mean different things (focus timer vs SRS
   review modal).

Note: the original daily/weekly-loss "bug" was **not** a bug — those gauges are
period-scoped and were 0 because the seeded losses were historical. See
`memory/project_qa_pass_jun2026.md`.

## 1 · Live-refresh fix (`app/trades/page.tsx`)

`/cuentas` reads `trpc.trades.dashboardStats` (`staleTime: 60_000`). The trade
mutations invalidate `trades.list` and (sometimes) `accounts.list`, but never
`trades.dashboardStats`. Add `utils.trades.dashboardStats.invalidate()` (and
`accounts.list` where missing) to `create`, `update`, `delete`, `close`.

## 2 · `/cuentas` tutorial

Reuse `components/onboarding/spotlight-tour.tsx` verbatim. Same pattern as
`hoy-tab.tsx`:
- `localStorage` flag `tj-cuentas-tour-seen`; auto-open on first visit after data
  resolves; persistent "Cómo funciona" button.
- `data-tour` anchors added to `cuentas/page.tsx` + `account-card.tsx` (only the
  first card carries the inner anchors; `querySelector` picks the first match).
- ~8 steps (not capped at 5): portfolio KPIs, status tabs, account card balance,
  P&L/win%, **limits & gauges** (with the "row hidden = limit not configured"
  hint the user liked), objective progress, leverage exposure, sync balance,
  new-account button. Steps whose anchor is absent are skipped naturally.

## 3 · Merge "Progreso" into "Hoy" (remove the tab)

- Remove `"progreso"` from the tabs array and from `?tab=` deep-link handling in
  `aprendizaje/page.tsx`.
- Move the genuinely unique sections into Hoy (new `ProgresoSections` block,
  rendered after the agenda with the existing `Stagger`): **Impacto en trading**,
  **Por tipo**, **Insight del día**, **Foco del día**, **Reviews vencidas** +
  **Marcados para review**.
- Drop the duplicates: **Meta semanal** (Hoy RACHA already shows weekly hours/goal),
  **Resumen** 4-stat grid, **Racha de reviews** (Hoy already has a study streak).
- `ResourceRightRail` is retired as a tab; its reusable sections are extracted so
  Hoy can render them.

## 4 · Unify "Iniciar sesión"

- Single launcher: `openPicker()` (focus timer in `FocusSession`).
- `ResourcePicker` surfaces **due reviews first** (preloaded) and offers the batch
  SRS review (the existing `SessionReviewModal` flow) from inside the picker.
- The bloque "Reviews vencidas" no longer has its own "Iniciar sesión"; per-item
  "Revisar" still opens the individual review modal. One "session" concept.

## Design principles (Emil-style, already in the codebase)

Reuse existing motion: `SpotlightTour` (0.22s eased, `prefers-reduced-motion`),
`Stagger`/`StaggerItem`. No new gratuitous animation; keep it native-feeling and
fast. Remove redundancy (the Progreso merge is itself a clarity win).

## Testing

Drive the **real UI** with Playwright (login → register trade → observe /cuentas;
open tutorial; verify Aprendizaje tabs). **No direct DB inserts** — see
`memory/feedback_qa_no_db_injection.md`.
