# Implementation plan — Reviews weekly redesign

**Spec:** `docs/superpowers/specs/2026-06-23-reviews-weekly-redesign-design.md`
**Branch:** `feat/reviews-weekly-redesign`

Theme: *your evolution, week by week.* Current week is live at the top; the past is a
progress timeline; the AI narrates what happened and what to fix. Delivered in phases;
each is independently shippable + verified. Phases 1–4/2.5 are UI/email (safe, incremental).
Phase 5 is backend infra and ships as its own PR.

## Phase 1 — `/reviews` page: Hero + Timeline

1. **`WeekHero`** — new `src/app/reviews/components/week-hero.tsx`. Presentational; props =
   current-week VM. Renders the in-progress week (current Monday→today): P&L / Win Rate /
   Avg R / Discipline + inline-SVG equity sparkline, "se finaliza el lunes" badge, live
   AI-preview line, link into `/reviews/semanal/<thisMonday>`. Gradient panel per mockup.
2. **`WeekTimeline`** — new `src/app/reviews/components/week-timeline.tsx`. Vertical rail with
   outcome-colored nodes (`--win`/`--loss`/`--be`), renders the history as `ReviewCard`s
   (Phase 2). Props = week summaries + selection handler. Entrance stagger (30–80ms).
3. **`page.tsx`** rewire — replace the flat `KpiStrip` + `flex-col` list with `WeekHero`
   (current week, from `weeklyReviews.report` for this Monday) + `WeekTimeline` (past weeks
   from `weeklyReviews.list`). Keep Semanales/Mensuales tabs and `Suspense`.
4. **Filters** — simplify to clean chips (resultado / estado / buscar); move the raw
   `Disc ≥` input into a collapsed "más filtros" (or drop). Preserve `useReviewFilters`
   URL-param persistence.
5. **Verify:** tsc + eslint; load `/reviews` authed — hero shows live current week, timeline
   renders history, filters still sync to URL, empty state keeps the create CTA.

## Phase 2 — Week card (rich + AI verdict)

6. Rewrite `src/app/reviews/components/review-card.tsx` to the approved layout: date + trade
   count + **letter grade**; equity sparkline; 5-metric row (P&L, WR, Profit Factor, Avg R,
   Discipline); **one-line AI verdict**; two chip columns **✓ qué funcionó / ✗ a mejorar**.
7. Data: source grade/verdict/chips/PF/AvgR from `verdict.ts` + report analytics (Phase 3).
   If `weeklyReviews.list` lacks the extra fields, extend the procedure with the few derived
   values (avoid per-card fetches).
8. **Emil polish:** `:active { transform: scale(0.97) }`; name exact transition properties
   (no `transition: all`); custom ease-out curve; hover gated behind
   `@media (hover:hover) and (pointer:fine)`.
9. **Verify:** card renders for a real week; press feedback + hover feel right; no blank
   verdict/chips on a week with trades.

## Phase 2.5 — Light learning summary

10. New `src/app/reviews/components/report/learning-summary.tsx`, mounted in
    `ReviewReportShell`. Read-only panel: study minutes that week, current streak, resources
    marked for review in the period; links to `/aprendizaje`. Reuse
    `domains/learning/services/digest-builder.ts` scoped to the review's week range.
11. **Verify:** panel shows correct weekly minutes/streak; does not touch the daily learning
    digest email; psychology/analytics sections unchanged.

## Phase 3 — Auto-finalization + AI verdict source

12. New `src/server/services/reviews/verdict.ts` — pure: given period analytics, returns
    `{ grade, verdict, worked[], toImprove[] }`. Source = AI (`review-ai`) with deterministic
    metric fallback (best/worst setup, violations) so output is never empty. Shared by card,
    report, and email.
13. Auto-finalize: in the Monday `duePeriods` branch of
    `src/app/api/cron/reviews-digest/route.ts`, after `ensureReviewAnalysis`, set the previous
    week `status:"submitted"` (idempotent; **never** clobber user-edited notes). Decouple
    finalization from email send (finalize even if the user is email-ineligible).
14. **Verify:** unit tests for `verdict.ts` (incl. fallback) + auto-finalize idempotency &
    notes-preservation; `force` cron run finalizes the prior week and generates AI.

## Phase 4 — Email mini-report

15. Rewrite `src/emails/templates/review-summary.tsx` to the mini-report: eyebrow + title +
    **delta vs prior period** (surface existing `model.deltas`), metrics row, **win/loss split
    bar** (table/div-based, email-safe), ✓funcionó/✗mejorar chips, **AI verdict callout**, CTA.
    Add small components (`WinLossBar`, metric cells) as needed.
16. Extend `domains/analytics/services/review-email-model.ts` with win/loss split + verdict +
    grade, fed from `verdict.ts`. Keep theme-aware via `resolveEmailThemeFor` (light/dark+accent).
17. **Verify:** react-email preview in light + dark; update snapshot tests; CTA → `${appUrl}<path>`.

## Phase 5 — Cron fix (backend, own PR)

18. New migration `supabase/migrations/<ts>_reviews_cron_settings_table.sql`: create
    `app_settings(key text primary key, value text)`; seed `app_url` + `cron_secret` rows
    (documented for the user to fill). Grant read to the cron role.
19. Rewrite the schedule migrations (`*_schedule_reviews_digest.sql`,
    `*_schedule_learning_digest.sql`) to read `SELECT value FROM app_settings WHERE key=...`
    instead of `current_setting('app.app_url'/'app.cron_secret')`. Null-safe.
20. **Verify on preview:** seed the two rows; trigger the endpoint; assert 200 + an actual
    email send (keep the `{force,type}` test hook). Update `cron-route` / schedule tests.

## Ops checklist (user)

- `NEXT_PUBLIC_APP_URL=https://tjournalx.com` in Vercel (https, no trailing slash). ✅ planned
- `EMAIL_FROM` = address on the verified Resend domain. ✅ done
- Phase 5: seed `app_settings` rows `app_url=https://tjournalx.com` and
  `cron_secret=<app CRON_SECRET>` in Supabase (one-time, documented in the migration).
