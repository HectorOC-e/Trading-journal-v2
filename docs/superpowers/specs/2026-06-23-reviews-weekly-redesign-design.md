# Reviews Weekly Redesign — Design Spec

- **Date:** 2026-06-23
- **Branch:** `feat/reviews-weekly-redesign`
- **Status:** Approved (brainstorming), pending implementation plan
- **Related:** builds on the shipped Reviews Redesign (PRs #70/#71/#72; rich report Phase 3, theme-aware emails Phase 4, auto-first creation Phase 2b). See `2026-06-23-reviews-redesign-design.md`.

## Goal

Make the weekly Reviews experience feel **modern, visual, automatic, and narrative**. Today the `/reviews` page is a flat list of dense cards behind a spreadsheet-style filter bar, the review email is thin text rows, and the automation that would email reviews is dead in production. We reframe Reviews around a single idea: **your evolution, week by week** — the current week is alive at the top, the past is a progress timeline, and the AI narrates what happened and what to fix.

## Non-goals

- Monthly reviews redesign beyond reusing the new email treatment (the monthly tab keeps its current page/report for now).
- Rebuilding the rich report page (`/reviews/semanal/[weekStart]`) — it stays as the destination; we only change how the list surfaces it.
- The full create-modal teardown (tracked separately as a follow-up).

## Decisions (locked in brainstorming)

| Topic | Decision |
| --- | --- |
| Page layout | **Hero (current week, live) + vertical timeline** of history |
| Week card | **Rich two-column** (5 metrics + equity sparkline + ✓funcionó/✗mejorar chips) **+ one-line AI verdict** |
| Email | **Mini-report visual** (delta vs prior period, metrics row, win/loss bar, chips, AI verdict callout, CTA), email-safe + theme-aware |
| Week close | **Auto-finalize** the previous week on Monday 08:00 local; AI generated automatically; user may reopen/edit notes |
| AI content | **100% AI from trades** (reuse `review-ai`); no manual writing required |
| Cron fix | Move `app_url` + `cron_secret` to a **DB settings table** that `pg_cron` can read |

## Architecture / Phases

The work decomposes into 5 phases. Phases 1–4 are safe, incremental UI/email changes. Phase 5 is backend infra (migrations + cron) and is sequenced last so it never blocks the visual work; it could become its own plan/PR.

### Phase 1 — `/reviews` page: Hero + Timeline

**Files:** `src/app/reviews/page.tsx`, new `src/app/reviews/components/week-hero.tsx`, new `src/app/reviews/components/week-timeline.tsx`.

- **Hero "semana en curso":** a prominent card at the top of the Semanales tab showing the in-progress week (current Monday→today). Renders live P&L / Win Rate / Avg R / Discipline + an equity sparkline, a "se finaliza el lunes" badge, and a link into the rich report. Data comes from the existing `weeklyReviews.report` query for the current week (auto-draft already created on first visit per Phase 2b).
- **Timeline:** the historical weeks render as a vertical timeline. Each node is colored by outcome (win = `--win`, loss = `--loss`, draft = `--be`). Replaces the flat `flex-col gap-3` list.
- **Filters:** simplify to clean chips (resultado / estado / buscar). The raw `Disc ≥` number input moves into a collapsed "más filtros" affordance or is removed. URL-param persistence (`useReviewFilters`) is preserved.
- The 4-KPI `KpiStrip` is replaced by the Hero (which carries the most important live numbers); aggregate stats (P&L acumulado, racha) may move into the Hero or a slim summary strip.
- Tabs Semanales/Mensuales unchanged.

**Unit boundaries:** `WeekHero` (props: current-week VM) and `WeekTimeline` (props: list of week summaries + selection handler) are independently testable presentational components. `page.tsx` stays the data/orchestration layer.

### Phase 2 — Week card (rich + AI verdict)

**Files:** `src/app/reviews/components/review-card.tsx` (rewrite).

- Layout per the approved mockup: date + trade count + **letter grade**; equity sparkline; a row of 5 metrics (P&L, Win Rate, Profit Factor, Avg R, Discipline); a **one-line AI verdict**; two columns of chips **✓ qué funcionó / ✗ a mejorar**.
- Metrics beyond the current card (Profit Factor, Avg R, grade) come from the report analytics already available via `loadReviewAnalytics` / the report VM. If the list query doesn't carry them, extend `weeklyReviews.list` to include the few extra fields (cheap, derived) rather than fetching per-card.
- **Emil polish:** `:active { transform: scale(0.97) }` press feedback; entrance stagger (30–80ms) on timeline mount; hover gated behind `@media (hover:hover)`; transitions name exact properties (no `transition: all`); custom ease-out curve.
- Letter grade is a pure function of discipline + expectancy (defined in Phase 3's helper so web/email/card share it).

### Phase 3 — Auto-finalization + AI verdict source

**Files:** `src/server/services/reviews/ensure-analysis.ts`, `src/server/services/reviews/review-ai.ts`, `src/server/services/reviews/review-insights.ts`, cron runner `src/app/api/cron/reviews-digest/route.ts`, new shared helper `src/server/services/reviews/verdict.ts`.

- On Monday 08:00 local (the existing `duePeriods` gate), the previous week is **auto-finalized**: status set to `submitted` and AI analysis ensured from trades. This already partially happens in the cron (`ensureReviewAnalysis`) — Phase 3 makes the **status transition** explicit and idempotent, and decouples it so finalization happens even if the email send is later skipped (e.g. ineligible).
- A shared `verdict.ts` derives, from the period analytics: the **one-line verdict**, the **letter grade**, and the **✓funcionó / ✗mejorar chip lists**. Source of truth is AI (`review-ai`) with a deterministic fallback from metrics (best/worst setup, violations) when AI is unavailable — so cards/email never render empty.
- User can reopen a finalized week and edit notes (existing `ReviewNotes` lifecycle); auto-finalization must not clobber user-edited notes.

### Phase 4 — Email mini-report

**Files:** `src/emails/templates/review-summary.tsx` (rewrite), possibly `src/domains/analytics/services/review-email-model.ts` (extend model with win/loss split + verdict + grade), new email components as needed (`WinLossBar`, `MetricCells`).

- Render: eyebrow + title + **delta vs prior period** (model already carries `deltas`; surface it); a metrics row; a **win/loss split bar** (table/div-based, email-safe); ✓funcionó/✗mejorar chips; **AI verdict in a callout**; CTA "Ver reporte completo". Footer + prefs unchanged.
- Stays email-safe (no JS, inline styles, table-based layout where needed) and theme-aware via `resolveEmailThemeFor` (light/dark + accent).
- The same `verdict.ts` output feeds the email so card and email stay consistent.
- Snapshot tests updated.

### Phase 5 — Cron fix (backend, independent)

**Files:** new migration `supabase/migrations/<ts>_reviews_cron_settings_table.sql`, the schedule migrations, cron route auth/url resolution.

- Root cause: `current_setting('app.app_url')` / `current_setting('app.cron_secret')` resolve to NULL because those GUCs **cannot be set via `ALTER DATABASE SET` on Supabase** (permission denied even as `postgres`). So `pg_net` is called with a NULL url and never fires. The review/learning digests have never sent automatically.
- Fix: create a small **settings table** (e.g. `app_settings(key text primary key, value text)`) that `pg_cron`'s SQL can read directly, and rewrite the schedule migrations to `SELECT value FROM app_settings WHERE key = 'app_url'` (and `cron_secret`) instead of `current_setting(...)`. The user populates the two rows once (documented), no superuser GUC needed.
- Verify on preview: trigger the endpoint and confirm a 200 + email send. Keep the `{ force, type }` test hook.
- This phase is gated behind ops setup the user still owes (verify Resend domain + `EMAIL_FROM` + `NEXT_PUBLIC_APP_URL` in Vercel), so it can ship as its own PR.

## Data flow

```
trades ──► loadReviewAnalytics ──► report VM ──┬─► rich report page (existing)
                                               ├─► verdict.ts ──► grade + verdict + chips
                                               │                     │
list query (+extra fields) ──► WeekHero / WeekTimeline / ReviewCard ◄┘
                                               │
review-email-model ──► review-summary.tsx (email) ◄── verdict.ts
                                               ▲
cron (Mon 08:00 local) ──► auto-finalize + ensureAnalysis ──► sendReviewEmail
                                               ▲
app_settings table ──► pg_cron reads url+secret ──► pg_net ──► /api/cron/reviews-digest
```

## Error handling

- Hero/timeline render skeletons while `weeklyReviews.list` / current-week report load; empty state keeps "Crear primera review" CTA.
- `verdict.ts` always returns a non-empty result (AI → metric fallback → generic), so cards/email never show blank verdicts.
- Auto-finalization is idempotent and never overwrites user-edited notes; AI-gen failure is logged and does not block finalization or email (matches current cron behavior).
- Cron route keeps `412 unconfigured` / `401 unauthorized` semantics; settings-table reads are null-safe.

## Testing

- Unit: `verdict.ts` (grade/verdict/chips from analytics + fallback), `WeekHero`/`WeekTimeline`/`ReviewCard` render VMs, email snapshot, win/loss bar math, auto-finalize idempotency + notes-preservation.
- Existing: keep `review-schedule`, `pdf-report-html`, `email-theme`, `send-review` tests green.
- Phase 5: a migration/cron test asserting url+secret resolve from the settings table; manual preview verification (200 + send).

## Rollout

Phases 1→4 land incrementally (each verifiable in the app). Phase 5 ships separately once ops prerequisites are confirmed. tsc + eslint clean; verify authed UI in the real app (local login creds needed from user).
