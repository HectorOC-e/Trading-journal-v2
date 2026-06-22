# Reviews: rich reports + AI analysis + email + cron + PDF

**Date:** 2026-06-22
**Status:** Approved (design) — pending implementation plan
**Branch:** `feat/reviews-rich-reports`

## Problem

The weekly/monthly trading **review report pages** (`/reviews/semanal/[weekStart]`,
`/reviews/mensual/[yearMonth]`) under-display the data they already compute and use
hand-rolled flex "bar charts" with no animation — inconsistent with the rest of the
app (which uses **recharts** + **framer-motion**). There is **no email** for trading
reviews at all (the only wired email is the daily Aprendizaje digest; a `weekly-recap`
learning template exists but is orphaned). The user wants:

1. The report pages to be **visually richer and more analytical** (charts, animations,
   like the dashboard) plus **AI-generated analysis**, for both weekly and monthly.
2. Trading reviews **delivered by email**.
3. A **profile toggle** to activate those emails, mirroring the Aprendizaje email
   opt-in.
4. (Chosen scope — "Option C") **automatic cron delivery** and **server-side PDF**.

## Goals

- Redesign both report pages with shared, animated, recharts-based components.
- Add a persisted **AI analysis** layer to weekly and monthly reviews.
- Send a **review email** (manual button + automatic cron), gated by an opt-in
  `Reviews` notification category.
- Generate a **server-side PDF** of the report, both attached to the email and
  downloadable from the report page.

## Non-goals

- Reworking how reviews are authored (create/edit modals stay as-is).
- Touching the Aprendizaje digest or the orphaned `weekly-recap` template.
- Push/SMS channels (email + in_app only, per existing system).

## Current state (verified)

- `weeklyReviews.report` / `monthlyReviews.report` already return: `kpis`
  (netPnl, winRate, disciplineScore, profitFactor, trades), `deltas` vs prior period,
  `dayTrend`/`weekTrend`, `bestDay`/`worstDay`, `discipline` (violations, costo,
  rachaDiasLimpios), `setups`, `byAccount`, and `saved` narrative. Built by
  `buildWeeklyReport` / `buildMonthlyReport` in `src/domains/analytics/services/`.
- Email infra: `src/server/services/email/{resend-client,eligibility,send-learning-digest}.ts`;
  `emailLog` dedupe (`emailType` + `weekKey`); `isEmailChannelEnabled(masterOn, pref, now)`
  is **opt-in** (per-category `NotificationPreference` must include the `email` channel).
- Cron pattern: `supabase/migrations/20260619120000_schedule_learning_digest.sql` —
  pg_cron ticks hourly, POSTs to a Next route with `Bearer CRON_SECRET`; the route gates
  each user by **local hour**. Reads `app.app_url` / `app.cron_secret` DB settings.
- AI infra: `resolveAiCall(prisma, userId, feature)` + `usableCandidates` + `streamChat`;
  `weeklyReviews.generateSummary` already feeds trades to the provider.
- Charts/anim deps already present: `recharts@^3`, `framer-motion@^12`. No PDF lib.
- Profile notification pattern: `src/app/perfil/page.tsx` — `ToggleRow` "Email · Aprendizaje"
  flips the `email` channel on the `Aprendizaje` category via
  `notifications.preferences.update`.

## Architecture — five bounded components

Delivered in phases 1→5; each phase is independently shippable.

### 1 · Report visual redesign (weekly + monthly)

**New** presentational components under `src/app/reviews/components/report/`, driven by a
common view-model so weekly and monthly render the same tree (they are ~90% identical today):

- `ReportShell` — header (title, period, trades, print/back), staggered framer-motion entrance.
- `KpiGrid` — 4 KPI cards with animated `CountUp` values + `Delta` vs prior period.
- `PnlTrendChart` — recharts `BarChart` (P&L per day / per week), win/loss colored,
  animated; replaces the hand-rolled bars. Fixed-height, responsive.
- `SetupBreakdown` — horizontal bars by P&L + win rate per setup.
- `DisciplinePanel` — discipline sub-scores (execution / learning / adherence) +
  violations + costo + clean-day streak.
- `SessionBreakdown` — **new data**: P&L and count by trading session/time-of-day.
- `AccountBreakdown` — P&L per account.
- `NarrativeCard` — saved executiveSummary / whatWorked / toImprove (weekly) or
  summary / keyThemes / goals (monthly).
- `AiAnalysisCard` — see component 2.

**View-model:** define `ReviewReportVM` (a discriminated/parameterized shape covering both
periods; the trend axis label and narrative shape differ). The two page files become thin
wrappers that fetch the `report` query and render `<ReviewReportShell vm={...} />`.

**Server change:** extend `buildWeeklyReport` / `buildMonthlyReport` to compute a
`sessions: { session: string; pnl: number; trades: number }[]` array (trades already
carry `session`). Pure functions → unit-tested.

### 2 · AI analysis layer

- **Schema:** add nullable `aiAnalysis String?` (text) and `aiAnalysisAt DateTime?` to
  `WeeklyReview` and `MonthlyReview` (Prisma + Supabase migration).
- **Mutation:** `weeklyReviews.generateAnalysis({ weekStart })` /
  `monthlyReviews.generateAnalysis({ year, month })`. Feeds the **computed report model**
  (KPIs, deltas, setups, discipline, sessions) — richer than raw trades — to the user's
  configured provider via `resolveAiCall`/`streamChat`. Returns structured markdown-ish
  text: **hallazgos clave**, **banderas de riesgo**, **foco para el próximo periodo**.
  Persists `aiAnalysis` + `aiAnalysisAt` on the review row (upserting a draft row if none
  exists). Throws `PRECONDITION_FAILED` if no provider configured (same UX as
  `generateSummary`).
- **UI:** `AiAnalysisCard` with Generar/Regenerar button, animated loading state; shows
  persisted analysis + relative timestamp. Degrades gracefully (CTA to configure AI) when
  no provider.

### 3 · Review email + profile toggle (manual)

- **Template:** `src/emails/templates/review-summary.tsx`, parameterized weekly/monthly,
  reusing `StatRow`/`Divider`/`CtaButton`/`EmailLayout`/`EmailFooter`. Light variant
  (email dark mode is unreliable). Renders KPIs + deltas, top/worst setup, discipline
  summary, AI analysis (if present), and a CTA to the live report.
- **Model builder:** pure `buildReviewEmailModel(report, ai)` → `ReviewEmailModel`
  (skip-if-empty when the period has 0 trades). Unit-tested render.
- **Service:** `sendReviewEmail(deps, { user, type, period })` mirroring
  `sendLearningDigestForUser`: eligibility (`isEmailChannelEnabled` against the `Reviews`
  category) → dedupe (`emailLog` `emailType: "weekly_review" | "monthly_review"`,
  `weekKey` = period key) → gather report → build model → render → send (+ PDF attachment
  from component 5) → log. Returns a `ReviewEmailStatus`.
- **tRPC manual triggers:** `weeklyReviews.sendEmail` / `monthlyReviews.sendEmail`
  (button on `ReviewDetailPanel` and report page). Manual send bypasses quiet-hours but
  still respects the master/category opt-in; returns a typed status for toasts.
- **Notification category:** introduce `Reviews` as a category. Categories are free-form
  strings in `NotificationPreference`; a pref row is created on first toggle. Register
  `Reviews` wherever the category catalog/labels live so it appears in settings.
- **Profile:** add `ToggleRow` "Email · Reviews" under the notifications card, identical
  pattern to "Email · Aprendizaje" (`category: "Reviews"`, opt-in `email` channel, gated
  by master `emailNotifications`).

### 4 · Automatic cron (auto-generate)

- **Endpoint:** `POST /api/cron/reviews-digest` — auth `Bearer CRON_SECRET`
  (reuse `checkCronAuth`), `dynamic = "force-dynamic"`, raised `maxDuration`.
- **Gating:** hourly tick; per user, send when **local hour == 8** AND:
  - weekly: local weekday == Monday → period = the **previous** ISO week.
  - monthly: local day-of-month == 1 → period = the **previous** month.
  `{ force, type }` body for manual/testing runs.
- **Behavior (auto-generate):** for each eligible user, compute the report; if no trades →
  skip (`empty`); **auto-generate AI analysis** from the report (persist on the review row
  if one exists, else use ephemerally for the email; skip AI silently if no provider);
  render email + PDF; send; log to `emailLog`. Respects quiet hours and per-category opt-in
  via `sendReviewEmail`.
- **Schedule migration:** `supabase/migrations/<ts>_schedule_reviews_digest.sql`, mirroring
  the learning-digest job (`reviews-digest-hourly`, `0 * * * *`).
- **Token cost note:** auto AI generation spends provider tokens by design (user-chosen).

### 5 · Server-side PDF (headless Chromium)

- **Deps:** `playwright-core` + `@sparticuz/chromium` (serverless-friendly Chromium binary).
- **Implementation note (changed from the original token+print-route plan):** rather than
  navigating a live `/print` route (which fights the auth middleware, the app layout/sidebar,
  and the no-flash theme script, and needs an HMAC token), the PDF is produced from a
  **self-contained, server-rendered HTML string** fed to Chromium via `page.setContent`. This
  removed the token, the print route, the middleware exemption, and the theme-forcing — at the
  cost of not reusing recharts in the PDF (a purpose-built inline-**SVG** trend chart is used
  instead). Still headless Chromium (the chosen engine), just `setContent` instead of `goto`.
- **HTML builder:** `renderReviewReportHtml({ kind, title, subtitle, report, aiAnalysis })`
  (pure, unit-tested) → a full `<!doctype html>` document with inline light-theme CSS, an
  inline SVG P&L trend chart, KPI/setup/session/discipline/account blocks and the AI analysis.
  HTML-escapes all user content.
- **Service:** `renderReviewPdf(prisma, { userId, period })` → loads the report, builds the
  HTML, launches Chromium (`@sparticuz/chromium` executablePath, or
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for local dev), `setContent` → `page.pdf({ format: "A4",
  printBackground: true })` → `Buffer`. No token/session needed (userId is passed by the
  trusted caller).
- **Delivery:**
  - **Email attachment:** `resend-client` `sendEmail` accepts `attachments` (Resend API);
    the cron passes `renderPdf` into `sendReviewEmail`, which attaches the PDF (PDF failure
    never blocks the email).
  - **Download button:** `GET /api/reviews/pdf?type=&period=` (session-auth via Supabase)
    streams the PDF; the report "Descargar PDF" button replaces `window.print()`.
- **Deployment note:** headless Chromium is the heaviest piece on Vercel serverless (cold
  starts, binary size, `maxDuration`). The cron route sets `maxDuration = 300` and the pdf
  route `120`; confirm the deployment plan allows these. `@sparticuz/chromium` may need
  graphics-mode/font tuning at deploy.

## Data flow

```
trades ──► report procedure ──► ReviewReportVM ──► report page (recharts + framer-motion)
                                      │
                                      ├─► generateAnalysis ──► aiAnalysis (persisted)
                                      │
                                      └─► buildReviewEmailModel ─┐
print route (signed) ──► renderReviewPdf ──► PDF Buffer ─────────┤
                                                                 ▼
                              sendReviewEmail ──► Resend (html + PDF attachment) ──► emailLog
                                   ▲                                   ▲
                        manual tRPC sendEmail              cron /api/cron/reviews-digest
```

## Error handling

- AI: no provider → `PRECONDITION_FAILED` (manual) / silent skip (cron); provider/stream
  failure → typed error, surfaced via toast (manual) or tally (cron). Never blocks the
  email — email sends without the AI section on failure.
- Email: `ineligible` (opt-out/quiet) / `already_sent` (dedupe) / `empty` (0 trades) /
  `send_failed`. Cron tallies each status like the learning digest.
- PDF: render failure must **not** abort the email — send without attachment and log;
  download route returns 500 with a friendly message. `emailLog` insert race handled like
  the existing warn-on-conflict.
- Cron auth: 412 unconfigured, 401 unauthorized.

## Testing

- Pure builders: `buildWeeklyReport`/`buildMonthlyReport` session aggregation;
  `buildReviewEmailModel` (skip-if-empty, AI present/absent).
- Email render: `review-summary` template renders KPIs/deltas/AI + CTA, light + dark.
- Eligibility/dedupe: reuse `eligibility`/`cron-route` test patterns for the `Reviews`
  category and the reviews cron gating (local hour/weekday/day-of-month).
- `generateAnalysis`: provider-missing precondition; happy path persists fields.
- PDF: unit-test the signed-token sign/verify; smoke-test `renderReviewPdf` behind a flag
  (headless browser excluded from default unit run / gated in CI).

## Phased delivery

1. **Report redesign** (FE components + view-model + `sessions` in builders + tests).
2. **AI analysis** (schema + migration + `generateAnalysis` + `AiAnalysisCard`).
3. **Email + profile toggle** (template + model + `sendReviewEmail` + manual tRPC +
   `Reviews` category + ToggleRow).
4. **Cron** (endpoint + schedule migration + auto-generate path).
5. **PDF** (deps + print route + signed token + `renderReviewPdf` + attachment + download).

## Open considerations

- AI persistence when no review row exists: cron generates ephemerally; manual upserts a
  draft. Confirm draft-upsert is acceptable noise vs. ephemeral-only.
- Exact `Reviews` category label/catalog location to register the new category.
- Vercel runtime/limits for headless Chromium (may need a dedicated function config).
