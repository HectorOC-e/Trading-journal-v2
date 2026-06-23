# Reviews redesign + email / PDF / cron fixes — design

**Date:** 2026-06-23
**Status:** Approved (design) — pending implementation plan
**Branch:** `feat/reviews-redesign` (proposed)
**Supersedes/extends:** `2026-06-22-reviews-reports-email-cron-pdf-design.md`

## Problem

The Reviews feature shipped (rich reports + AI + email + cron + PDF) but is incoherent
and partly broken in production. Concrete issues, gathered from the user's screenshots +
production diagnosis:

1. **PDF download 500s in production.** Verified on `www.tjournalx.com` with a real
   session: the route throws `Cannot find module …playwright…` at load — `playwright-core`
   does runtime path `require`s that Vercel/Next file-tracing cannot follow, so the package
   never reaches the serverless function. `serverExternalPackages` did not fix it.
2. **Email links point to the wrong domain** (`app.tradingjournal.app`); the real domain is
   `tjournalx.com`. Cause: a hardcoded fallback in `send-review.ts`, `send-learning-digest.ts`
   and the email templates, plus `NEXT_PUBLIC_APP_URL` unset in prod.
3. **Monthly review creation "doesn't work."** To be reproduced precisely; dissolved by the
   redesign (see below) but must be verified in the new flow.
4. **Three confusing AI affordances** at/around review creation: `✨ Auto-generar`
   (`runAutoGenerate`), `Resumen con IA` (`generateSummary`), and the report's
   `generateAnalysis`.
5. **Draft lifecycle dead-ends.** Weekly reviews save as `draft` but there is no later
   submit/finalize or send action.
6. **Report pages feel "precarios"** vs `/analytics` — missing the equity curve, expanded
   KPIs, markets, and psychology breakdowns.
7. **Emails feel information-poor** and do not reflect the user's theme/palette (always
   `lightTheme`).

Plus the user's question — **"will these emails be automatic?"** Answer: not today. The
pg_cron jobs `reviews-digest-hourly` + `learning-digest-hourly` are scheduled and active,
but the DB settings `app.app_url` and `app.cron_secret` are **empty**, so the cron fires but
can't call the app. The email the user received was a **manual** send. Automation also needs
a verified Resend domain (`EMAIL_FROM`) to reach non-owner addresses.

## Goals

- One coherent **auto-first** review model: the review *is* the rich auto-generated report
  plus the user's notes. One AI button. A clear `draft → finalized` lifecycle with
  send/download always available.
- Make the report page **as rich as `/analytics`**, scoped to the period, by reusing the
  analytics engine.
- **Richer, theme-aware emails** (light/dark per the user's profile + their accent color),
  for both Reviews and Aprendizaje, linking to the correct domain.
- **Fix the PDF** on Vercel by switching to the canonical serverless combo.
- Leave **automation** wired and documented (code + migration); the user does the Resend
  domain + Vercel env steps.

## Non-goals

- Rewriting the analytics engine or `/analytics` page (we reuse them).
- Push/SMS channels.
- Bulletproof email dark-mode across every client (best-effort + light fallback; QA noted).

## Decisions (from the brainstorm)

| Topic | Decision |
|---|---|
| Scope | Single integral spec covering page + lifecycle + report + emails + PDF + cron. |
| Review model | **Auto-first**: app generates, user annotates; one AI button; `generate → finalize → send`. |
| PDF engine | **`puppeteer-core` + `@sparticuz/chromium`** (reuse the existing self-contained HTML/SVG). |
| Email theming | **Full light/dark** per the user's theme **+ their accent color**; richer content. |
| Cron/ops | I ship code + a migration for `app.app_url`; user verifies the Resend domain, sets `EMAIL_FROM` + `NEXT_PUBLIC_APP_URL`. `app.cron_secret` set out-of-band (never committed). |

## Architecture — components

### 1 · Review lifecycle & model (auto-first)

A review is **the rich report (auto-computed) + the user's notes**. States:

- **draft** — exists implicitly once the period has trades; the report renders from data.
  Opening `/reviews/semanal/[weekStart]` or `/reviews/mensual/[yearMonth]` *is* the draft.
- **finalized** — the user clicks **Finalizar review** (sets `status: "submitted"`),
  optionally after adding notes and generating AI analysis.

Actions on the report page (available in both states): **✨ Generar análisis** (single AI
button → persisted cards + narrative, already shipped), **✓ Finalizar**, **✉ Enviar por
correo**, **⬇ Descargar PDF**.

- **Consolidate AI affordances to one.** Remove `runAutoGenerate` and `generateSummary` from
  the create flow; the only AI action is `generateAnalysis` on the report. `generateSummary`
  and its UI are removed (or kept server-side only if referenced elsewhere — verify).
- **Notes.** Reuse existing narrative columns rather than adding schema: weekly →
  `executiveSummary` (reflection) + `whatWorked`/`toImprove`; monthly → `summary` +
  `goalsSet`/`goalsMet`/`keyThemes`. The report page gets an inline **"Tus notas"** editor
  that writes these via the existing `update`/`upsert` mutations (autosave or explicit save).
- **Creation simplifies.** The heavy create modals (`create-review-modal`,
  `create-monthly-review-modal`) are removed or reduced to "go to this period." "Nueva
  review (mensual)" navigates to the period's report page, which auto-builds. This dissolves
  the monthly-create bug; the new flow must be verified end-to-end (weekly + monthly).

No schema migration required for the lifecycle (statuses + columns already exist).

### 2 · `/reviews` list page

- Keep the weekly/monthly tabs and status filter (`Borrador` / `Finalizada`).
- Each card shows the period, KPIs (net P&L / WR), status badge, and a quick action
  (open / send / pdf). Cards link to the report page.
- Primary CTA navigates to the **current** period's report (auto-draft), replacing the
  modal-open. Empty states point there too.

### 3 · Report page (rich — "`/analytics` scoped to the period")

Reuse the analytics engine. The `report` procedures already return KPIs, day/week trend,
setups, sessions, accounts, discipline, deltas, and the saved narrative. **Extend them with
an analytics slice** computed from `buildAnalyticsBundle(userId, prisma, {from,to}, true)`
(the same windowed bundle already used by `loadReviewInsights`):

- **Expanded KPIs:** add **expectancy** and **avg R** to the KPI band.
- **✦ Equity curve** — cumulative P&L over the period (the signature analytics chart).
- **✦ Markets breakdown** — P&L by symbol.
- **✦ Psychology panel** — P&L by emotion + FOMO/revenge counts.
- Existing: P&L by day/week, setups, sessions, accounts, discipline, AI cards + narrative.
- **✦ "Tus notas"** editable section (component 1).

Render with the existing report components + reused analytics chart components where they
fit (equity curve, markets, psychology). To avoid the empty-weekly problem, these
bundle-derived widgets render for any sample size (unlike the deterministic insight cards,
which need ≥20 trades). The view-model (`ReviewReportVM`) gains the new fields; both pages
stay thin wrappers.

**Server:** one extra `buildAnalyticsBundle` call per report load (acceptable; already done
for insights — consider computing once and sharing).

### 4 · Emails (rich + theme-aware) — Reviews and Aprendizaje

- **Theme resolution:** read the user's profile theme (light/dark) + active palette accent;
  pass a resolved `EmailTheme` (the templates already define `lightTheme`/`darkTheme`) with
  the accent injected into titles, KPI chips, callout/CTA. Best-effort dark via email
  `prefers-color-scheme` + a robust light fallback (QA in Gmail/Outlook).
- **Richer content** (review email): header (accent) → KPI row (Net P&L / WR / PF) → mini
  equity sparkline → best setup + discipline → 1–2 AI callouts (`[!WARNING]`/
  `[!RECOMMENDATION]`) → the user's note → CTA "Ver reporte completo". Aprendizaje email gets
  a parallel richness pass.
- **Domain fix:** replace the hardcoded `https://app.tradingjournal.app` fallback with
  `https://tjournalx.com` in `send-review.ts`, `send-learning-digest.ts`, and the three
  templates' default `appUrl`; rely on `NEXT_PUBLIC_APP_URL` first (set in Vercel).

### 5 · PDF (puppeteer-core + @sparticuz/chromium)

- In `render-pdf.ts`, replace `playwright-core` with **`puppeteer-core`** launched via
  `@sparticuz/chromium` (`executablePath()` / `args` / `headless`), keeping `page.setContent`
  + `page.pdf`. **Reuse `pdf-report-html.ts`** unchanged (self-contained HTML + inline SVG).
- Remove `playwright-core` from `package.json`; keep `@sparticuz/chromium` in
  `serverExternalPackages`. Keep `runtime = "nodejs"`, raise/keep `maxDuration`.
- The PDF should also include the new sections (equity, markets, psychology, notes) — extend
  `pdf-report-html.ts` accordingly (inline SVG for the equity curve).
- **Verify on a Vercel preview** using the authed-repro method (mint a session, GET the PDF
  route, assert `application/pdf`).

### 6 · Automation (cron) + ops

- **Migration** sets `app.app_url = 'https://tjournalx.com'` (public; safe to commit) so the
  existing `reviews-digest-hourly` / `learning-digest-hourly` jobs can reach the app.
- **`app.cron_secret`** is a secret — **not** committed. Set out-of-band (Supabase SQL /
  dashboard) to equal the app's `CRON_SECRET`. Documented in the ops checklist.
- Gating stays: weekly on local Monday 08:00 (previous ISO week), monthly on local day-1
  (previous month).
- **Ops checklist for the user:** (a) verify a domain at resend.com/domains; (b) set
  `EMAIL_FROM` to that domain in Vercel; (c) set `NEXT_PUBLIC_APP_URL=https://tjournalx.com`;
  (d) set `app.cron_secret` in Supabase. Until (a)/(b), emails only reach the Resend account
  owner; until `app.*` settings, the cron can't send.

## Data flow

```
trades ─► report procedure ─┬─► ReviewReportVM (KPIs, equity, markets, psychology,
                            │     setups, sessions, accounts, discipline)
                            ├─► generateAnalysis ─► aiAnalysis (persisted) ─► cards+narrative
                            ├─► notes (user) ─► existing narrative columns
                            └─► buildReviewEmailModel ─┐
pdf-report-html (HTML+SVG) ─► renderReviewPdf (puppeteer-core+@sparticuz) ─► PDF Buffer ─┤
                                                                                         ▼
                       sendReviewEmail (themed html + PDF attach) ─► Resend ─► emailLog
                            ▲                                            ▲
                  manual tRPC sendEmail                cron /api/cron/reviews-digest
                                                       (needs app.app_url + app.cron_secret)
```

## Error handling

- PDF render failure must not abort the email (send without attachment, log); the download
  route returns a friendly 500. The route's heavy imports must not crash at module load
  (the current bug) — puppeteer-core + @sparticuz traces correctly.
- AI: no provider → `PRECONDITION_FAILED` (manual) / silent skip (cron).
- Email: `ineligible` / `already_sent` / `empty` / `send_failed`; the Resend domain error is
  surfaced via `emailFailureMessage` (already shipped).
- Finalize/notes: standard zod validation via the existing form system.

## Testing

- Pure builders: extended report model (expectancy/avgR/equity/markets/psychology) —
  unit-tested.
- `renderReviewPdf`: smoke test behind a flag; **manual Vercel-preview verification** is the
  acceptance gate for the PDF.
- Email render: themed (light+dark) snapshot of the review + learning templates; accent
  injection; correct domain in the CTA.
- Lifecycle: draft → finalize → send happy paths for weekly + monthly; monthly creation
  works in the new flow.
- Reuse existing eligibility/dedupe/cron-gating tests.

## Phased delivery

1. **Infra fixes (unblock):** PDF engine swap (+ Vercel-preview verification), email domain
   fix, set `app.app_url` migration. Small, shippable first.
2. **Auto-first lifecycle:** consolidate to one AI button, add Finalizar + inline notes,
   simplify/redirect creation (remove heavy modals), verify monthly.
3. **Rich report:** equity curve + expanded KPIs + markets + psychology (reuse analytics
   bundle) on the page and in the PDF.
4. **Rich + themed emails:** theme resolution (light/dark + accent), richer content for
   Reviews and Aprendizaje.

## Open considerations

- Decide notes UX: autosave vs explicit "Guardar notas" (lean autosave with a saved
  indicator).
- Whether to compute `buildAnalyticsBundle` once per report load and share between the report
  slice and the insight cards (perf).
- Confirm `generateSummary` has no other consumers before removing its UI.
- Email dark-mode QA matrix (Gmail iOS/Android/web, Apple Mail, Outlook).
