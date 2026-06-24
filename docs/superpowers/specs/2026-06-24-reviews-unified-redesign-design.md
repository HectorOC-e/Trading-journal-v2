# Reviews — Unified Index Redesign (2026-06-24)

Faithful implementation of the Claude Design `Reviews.dc.html`
(project "Mejora de página de reviews", `claude.ai/design/p/e7523659…`).

## Goal
Replace the split **Semanales / Mensuales** tabs with a single, continuous index that
unifies weekly + monthly reviews the way the design shows them: a **Trayectoria** panel
on top, the live **current-week hero**, then one **chapter per calendar month** — a rich
"Edición" header followed by that month's weekly cards on a short vertical rail.

## Decisions (from user survey, 2026-06-24)
1. **Recurring patterns** → reuse the existing Analytics insights engine
   (`buildAnalyticsBundle` + `generateInsights`), not new heuristics/AI.
2. **Filters** → drop search/outcome/status; keep a discreet **year/month** calendar filter.
3. **Scope** → index only. Weekly/monthly **detail pages stay as-is** (recent rich redesign).
4. **Actions** → single "Nueva review" → current week. **No in-page theme toggle**; use the
   app's global theme/palette. The design's `.dc.html` palette mirrors the app tokens.
5. **Trajectory window** → NOT a fixed 13 weeks (that was placeholder data). Default =
   **whole history to date**; narrows to the active **year / year+month** filter.

## Backend
- `verdict.ts` — `deriveGrade()` now also returns a numeric `score` (0–100).
- `review-insights.ts` — new `loadInsightsForWindow(prisma, userId, {from,to})` (arbitrary
  date window) shared by `loadReviewInsights`.
- `overview.ts` (new) — `loadReviewsOverview(prisma, userId, {year?,month?})`:
  - window: whole history (earliest weekly review / first closed trade → tomorrow), or year,
    or single month.
  - per traded week: metrics from `loadWeeklyCardStats` + stored discipline (fallback: grade
    score) → grade "beads" + score sparkline series.
  - 3 from→to trend stats (Disciplina, Win rate, P&L mensual) = first vs last month of window.
  - headline + subtitle from the discipline delta and green-week streak.
  - up to 2 pattern cards from `loadInsightsForWindow` (sorted by severity, mapped to tag/body/tone).
- `weeklyReviews.overview` tRPC query (optional `{year?,month?}`).
- `monthlyReviews.list` now also returns `winRate` (for the edition-header verdict).

## Frontend (`src/app/reviews`)
- `page.tsx` — rewritten unified view: TopBar + discreet `ReviewsCalendarFilter`,
  `TrajectoryPanel`, then `ReviewsTimeline` (hero + chapters). Chapters built client-side by
  grouping `weeklyReviews.list` (minus the current week) by month and joining
  `monthlyReviews.list`; months without a saved monthly review still render (computed
  net/grade, goals 0).
- `components/trajectory-panel.tsx` (new) — left: headline + Δ, discipline sparkline (draw-on),
  month axis, grade beads, 3 from→to stats; right: up to 2 "Patrón recurrente" cards.
- `components/edition-header.tsx` (new) — horizontal month header: Newsreader month, grade,
  "● EN CURSO", net + Δ vs prior month, per-week P&L bars, goals ring, verdict, "Ver edición →".
- `components/reviews-timeline.tsx` (new) — hero + per-month chapter (edition header + nested
  `ReviewCard`s on a short result-colored rail).
- Reused as-is: `WeekHero`, `ReviewCard`, `ReviewsCalendarFilter`, `CardEquityChart`.
- Removed (orphaned by the unification): `week-timeline.tsx`, `edition-cover.tsx`.
- `globals.css` — added **Newsreader** to the font import; added `.traj-line` draw-on
  keyframe (honours `prefers-reduced-motion`).

## Fidelity notes
- Tokens map 1:1 to the design's oklch palette via existing CSS vars
  (`--bg/--panel/--ink*/--accent/--win/--loss/--be` + `*-soft`).
- Light/dark + accent palettes keep working through the app's global theme (no local toggle).
- Long histories: beads use `flex:1` (scale to fit); month axis labels downsample to ≤6.

## Verification
- Typecheck + unit tests + build locally. Playwright/E2E + visual review + merge: user
  (local env can't run Playwright here). Branch `feat/reviews-unified-redesign` → PR.
