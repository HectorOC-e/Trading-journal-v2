# Reviews Monthly Redesign — "Carta del Gestor" — Design Spec

- **Date:** 2026-06-24
- **Branch:** `feat/reviews-monthly-redesign`
- **Status:** Approved (brainstorming), pending implementation plan
- **Related:** builds on the weekly redesign ([[project_reviews_weekly_redesign]]); reuses
  `verdict.ts`, `card-stats` patterns, the monthly report loaders, the cron, and the email pipeline.

## Goal

Give the **monthly** reviews their own identity, distinct from the weekly *timeline*. The
weekly review answers *"¿qué pasó esta semana?"*; the monthly review answers *"¿qué
aprendimos de las últimas 5 semanas y qué CAUSÓ el resultado?"*. The metaphor is an
**editorial "Carta del Gestor"** (manager's letter / fund report): narrative-first,
strategic, premium — not a per-month clone of the weekly timeline.

## Non-goals

- Touching the weekly reviews (shipped) beyond shared helpers.
- A quarterly/yearly review (future).
- Gamified "Season Mode" elements (explicitly rejected — keep the serious identity).
- A general goals/OKR engine across the app — goals here are scoped to monthly reviews.

## Decisions (locked in brainstorming)

| Topic | Decision |
| --- | --- |
| Concept | **Carta del Gestor** (editorial) **+ mini-pilares** (3 sub-scores from Command Center) |
| Identity | Editorial: **serif** accent for month titles + letter headline; grade is the protagonist; narrative before KPIs |
| Page | **"Ediciones"** cover grid (replaces the flat monthly list) |
| Goals | **Rich**: status ✓/◐/✗ + note + progress; **recurring** (carry forward, editable); **hybrid eval** (AI proposes status from data, user confirms/overrides) |
| Key themes | **AI-structured**: `{ title, sentiment ▲▼⚠, impact }` |
| Weeks ("campaña") | Click a week → **compact drawer** with that week's summary |
| Auto-generation | **Day 1** (like the weekly Monday): letter + scores + themes + goal-eval generated, email sent; user only sets/adjusts goals |
| Verdict | Explains the **structural cause** ("creció por menos operaciones y mejor calidad, no por más agresividad") — distinct prompt from weekly |

## Architecture / Phases

Sequenced so the riskier data/AI work lands first behind the existing report, then the UI.

### Phase 1 — Data model (migration)

**Files:** `supabase/migrations/<ts>_monthly_goals_and_rich_review.sql`, Prisma schema.

- **`MonthlyGoal`** table — replaces `MonthlyReview.goalsSet/goalsMet: string[]`:
  `id, userId, year, month, text, status ('pending'|'partial'|'done'), note, source
  ('user'|'ai'), userConfirmed bool, sortOrder, createdAt`. Indexed `(userId, year, month)`.
  - **Recurrence:** goals carry forward — when a month is first opened/generated, the prior
    month's goals are copied as new rows (status reset to `pending`, `userConfirmed=false`).
    The user can add/edit/remove for that month.
  - **Migration:** backfill existing reviews — each `goalsSet[i]` → a `MonthlyGoal` with
    status `done` if present in `goalsMet`, else `pending`.
- **`MonthlyReview`** gains: `keyThemesRich Json?` (array of `{title, sentiment, impact}`),
  `letterTitle String?`, `pillarPerformance Int?`, `pillarDiscipline Int?`,
  `pillarPsychology Int?`. Keep `summary`, `overallScore`, `aiAnalysis`. Old `keyThemes
  string[]` retained read-only for back-compat, superseded by `keyThemesRich`.

### Phase 2 — Scoring + AI (server)

**Files:** new `src/server/services/reviews/pillars.ts`, extend `review-ai.ts`,
`ensure-analysis.ts`; new `src/server/services/reviews/goal-eval.ts`.

- **`pillars.ts`** — pure, from the monthly analytics bundle, each 0–100:
  - **Rendimiento:** composite of profit factor (≥2 → high), expectancy sign/size, win rate.
  - **Disciplina:** the existing `disciplineScore`.
  - **Psicología:** from `byEmotion` — weighted win rate / share of trades under
    controlled vs tilt emotions.
  - **Overall:** weighted blend (and/or reconcile with `overallScore`). Letter grade via the
    shared `deriveGrade`.
- **Monthly "letter" prompt** (new variant in `review-ai.ts`): produces `letterTitle` (one
  editorial line) + a 3–5 line executive `summary` in "manager" voice + a **causal verdict**
  (why the result happened, structurally) + **structured themes** (`[{title, sentiment, impact}]`).
  Output parsed to JSON; deterministic fallback when AI unavailable so nothing renders blank.
- **`goal-eval.ts`** — given the month's goals + analytics, the AI proposes a `status` +
  short `note` per goal it can infer (e.g. "máx 3 trades/día", "sin revenge", "estudiar 20
  min"). **Never overwrites a goal the user has `userConfirmed`.** User edits set
  `userConfirmed=true`.

### Phase 3 — "Ediciones" cover grid (page)

**Files:** `src/app/reviews/page.tsx` (monthly tab), new
`src/app/reviews/components/edition-cover.tsx`.

- Replace the flat `MonthlyReviewCard` list with a **grid of "Edition" covers**. Each cover:
  "Edición MM · YYYY", **serif month name**, grade badge, Net P&L / total R + delta vs prior
  month, mini week-sparkline (`weekTrend`), and a **progress ring** (% goals done). Hover:
  subtle premium lift (slow, ease). Click → the Letter page.
- Extend `monthlyReviews.list` with the per-cover extras (grade, R, goals %, spark) — one
  batched pass, mirroring the weekly `card-stats` approach.

### Phase 4 — The Letter (monthly report page)

**Files:** `src/app/reviews/mensual/[yearMonth]/page.tsx`, new
`src/app/reviews/components/report/monthly-letter.tsx` and sub-panels; reuse
`ReviewReportShell` sections as the **anexo** below.

Reading order (progressive disclosure — narrative first, no KPI wall):
1. **Hero-carta:** eyebrow "Carta del mes · {Mes Año}", **serif** `letterTitle`, 3–5 line
   `summary`, and a **giant grade + overall score** on the right.
2. **Mini-pilares:** Rendimiento / Disciplina / Psicología (0–100 each, slim bars).
3. **Campaña del mes:** the 4–5 weeks as horizontal bars (R or P&L); **click → drawer** with
   that week's compact summary (reuse the weekly card / a slim panel).
4. **Compromisos** (rich goals ✓/◐/✗ + note + progress ring) beside **Temas dominantes**
   (structured ▲▼⚠ + impact line).
5. **Veredicto del mes:** causal callout.
6. **Anexo:** full metrics (equity, setups, sessions, psychology, by-account) reusing the
   existing monthly report sections, but *below* the letter.
- Typography: introduce one **serif display** family for the editorial accents (month titles,
  letter headline) — the deliberate identity cue vs the weekly sans/timeline.

### Phase 5 — Goals UX

**Files:** monthly goals editor component; `monthlyGoals` tRPC router (list/upsert/setStatus/
reorder/remove); wire into the Letter page and/or the month entry.

- The user sets/edits the month's **recurring** commitments (carried forward, editable).
- Each goal shows the AI-proposed status + note; the user can confirm or override (sets
  `userConfirmed`). Progress ring = done(+½ partial)/total.

### Phase 6 — Auto-generation + monthly letter email

**Files:** `src/app/api/cron/reviews-digest/route.ts` (monthly branch), new
`finalizeMonthlyReview` (mirror of `finalizeWeeklyReview`), `review-summary.tsx` (letter mode)
or a new `monthly-letter-email.tsx`, `review-email-model.ts`.

- **Day 1** (existing monthly `duePeriods`): generate letter + pillars + structured themes +
  goal-eval for the previous month (idempotent; never clobber user-confirmed goals/notes),
  set status submitted, then send the email.
- **Email** = the letter as a mini-report: letterTitle + grade/overall + delta + pillars +
  goals progress + top themes + causal verdict + CTA. Theme-aware + email-safe; reuse the
  `verdict`/de-LaTeX sanitizing already in place.

## Data flow

```
trades ─► monthly analytics bundle ─┬─► pillars.ts ──► Rendimiento/Disciplina/Psicología + overall
                                    ├─► review-ai (letter) ──► letterTitle + summary + verdict + themes[]
                                    └─► goal-eval ──► proposed status+note per MonthlyGoal (unless userConfirmed)
MonthlyReview(+rich) + MonthlyGoal[] ─► EditionCover (grid) / MonthlyLetter (page) / letter email
cron (day 1 local) ─► finalizeMonthlyReview ─► sendReviewEmail (letter)
```

## Error handling
- AI letter/themes/goal-eval failures fall back to deterministic content (metric-derived
  title/summary, plain themes, no status change) — nothing renders blank.
- Goal auto-eval never overwrites `userConfirmed` goals or user notes; idempotent re-gen.
- Covers/letter show skeletons while loading; empty state keeps a "Crear primera review
  mensual" affordance.

## Testing
- Unit: `pillars.ts` (scores + clamping), goal-eval (proposes status, respects userConfirmed),
  structured-theme parsing + fallback, edition-cover view-model, monthly letter email snapshot.
- Migration: backfill goalsSet/goalsMet → MonthlyGoal verified in CI replay.
- Keep all existing review/email tests green.

## Rollout
Phases 1–2 (data + AI) land behind the current monthly report first; 3–5 swap in the new UI;
6 turns on auto-gen + email. Each phase tsc/eslint/tests/build clean; UI verified in the app.
Ships as one or more PRs; the migration phase is the gated/risky one.
```
