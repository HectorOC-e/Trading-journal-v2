# Aprendizaje SP1 — Study sessions + calendar + page redesign

**Date:** 2026-06-16
**Status:** Approved design (ready for implementation plan)
**Scope:** Sub-project 1 of 3 for the "mejorar Aprendizaje + IA" initiative.

## Context

The `/aprendizaje` page (`src/app/aprendizaje/`) is a learning library with three tabs
(**Biblioteca · Repaso · Progreso**), spaced-repetition reviews (SRS), per-resource
progress/mastery, a right-rail `dailyInsight`, and stats (estimated hours/week). There is
**no calendar**, the concept of a "session" is unclear, and the AI coach has only a thin
learning context (3 lines: pending reviews, reviews this month, mastered resources).

The user asked to improve the page (visually + functionally) and the AI's accompaniment of
learning. That spans five areas — visual redesign, learning calendar, AI accompaniment,
study sessions, and an in-page guided tutorial — which is too much for one spec. We
decomposed it into three sub-projects:

- **SP1 (this spec):** study-session data model + learning calendar + page redesign. The
  foundation the others build on.
- **SP2:** AI learning accompaniment (coach tools, rich learning context, proactive
  suggestions). Consumes SP1's data.
- **SP3:** guided tutorial (spotlight/blur onboarding). Built on SP1's final layout.

## Goal

Make "what am I studying / what should I study or review today" the heart of the page,
backed by a real study-session log and a week-at-a-glance calendar, with an Emil-grade
visual pass. Leave the data and UI hooks ready for SP2/SP3.

## Decisions (validated in the visual companion)

1. **A "session" = a timed study block (focus mode).** Pick a resource, run a timer, end →
   log minutes + note. SRS review remains a separate concept.
2. **Calendar = week strip on top + agenda below** (Hoy / Esta semana).
3. **Page structure = a new "Hoy" home tab** + existing Biblioteca / Repaso / Progreso.
4. **Focus mode = dim/blur overlay** (resource + big timer + quick note + pause/stop), with a
   **"minimize to floating pill"** so the user can read the resource while the timer runs.

## Data model

New Prisma model **`StudySession`** (added via a versioned Supabase migration in
`supabase/migrations/` — never a manual DB edit; Prisma model mirrors it):

| field | type | notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `userId` | fk → user | |
| `resourceId` | fk → LearningResource | the resource being studied |
| `status` | enum `active \| completed \| planned` | `active` = timer running; `planned` = scheduled future block |
| `startedAt` | timestamptz | when started (or planned date for `planned`) |
| `endedAt` | timestamptz null | set on completion |
| `durationMin` | int null | minutes studied (computed on end; for `planned`, `plannedMin`) |
| `plannedMin` | int null | target minutes for a planned block |
| `note` | text null | quick note captured in focus mode |
| `source` | enum `focus \| manual \| planned` | how it was created |
| `createdAt` / `updatedAt` | timestamptz | |

Indexes: `(userId, startedAt)` for calendar/agenda queries; `(resourceId)`.

**Integration with existing learning model** (do not change SRS):
- On completing a focus session, if the resource's `progressType === "minutes"`, add
  `durationMin` to `currentUnits` (re-using `computeProgressPct` / `computeResourceStatus`
  from `src/domains/learning/services/review-scheduler.ts`). If `progressType === "sessions"`,
  increment by 1. If `pages`, log time only (no unit change).
- Streak: replace the estimated streak with one derived from real study sessions
  (extend / reuse `src/domains/learning/services/streak-service.ts`).
- `learningResources.stats.estimatedHoursThisWeek` → real hours from sessions this week
  (keep the field name/shape so existing consumers don't break; rename to `hoursThisWeek`
  only if cheap).

**SRS reviews are untouched.** `nextReviewAt`, `ResourceReview.masteryLevel`,
`reviewInterval`, the review modals and the decay transitions all stay as-is.

## tRPC surface (new `studySessions` router or additions to `learningResources`)

- `studySessions.start({ resourceId })` → creates an `active` session, returns it.
- `studySessions.finish({ id, durationMin, note? })` → sets `completed`, applies progress +
  streak side-effects, returns updated resource summary.
- `studySessions.cancel({ id })` → deletes/abandons an `active` session.
- `studySessions.plan({ resourceId, date, plannedMin })` → creates a `planned` session.
- `studySessions.completePlanned({ id })` → marks a planned block done (or converts to a real
  session if studied now).
- `studySessions.list({ from, to })` → sessions in a date range (calendar/agenda).
- `studySessions.recent({ limit })` → recent sessions (for SP2 AI context later).
- A combined **`learningResources.agenda({ from, to })`** read model that merges, per day:
  SRS reviews due (`nextReviewAt`), study sessions (done + planned). This is what the Hoy
  page and (later) the AI read.

## UI

### Tabs
`Hoy` (new, default) · `Biblioteca` · `Repaso` (badge = due count) · `Progreso`. Deep-link
`?tab=` extended to `hoy`. Reuse the existing tab component + the standardized motion.

### "Hoy" home (default landing)
- **Week strip:** 7 days, today highlighted, dots per day (`•` review due, `▪` study/planned
  session). Click a day → its agenda detail.
- **HOY block:** "⏰ N repasos vencen → Repasar ahora"; "📘 En curso: <resource> · <time this
  week>"; **▶ Iniciar sesión** (opens a resource picker → focus mode); and a single
  **coach suggestion slot** (empty placeholder in SP1; SP2 fills it).
- **Racha / meta:** streak (🔥 N días), hours this week vs weekly goal, progress bar,
  count-up animation.
- **Esta semana agenda:** ordered list of upcoming reviews + planned/suggested sessions.

### Focus mode (Iniciar sesión)
- Full-screen **overlay** that dims/blurs the app: resource title, large monospace timer,
  quick-note field, pause + **Terminar**.
- **Minimize → floating pill** (`⏱ 27:14 · <resource> ■`): persists while the user navigates
  (e.g. opens the resource link / reads). Click pill → expand overlay or finish.
- On **Terminar:** persist `durationMin` + note, apply progress/streak, then offer "¿Marcar
  para repaso?" (links into the existing SRS review flow). Single source of timer state so the
  overlay and the pill never diverge (one component owning the running session).

### Visual / Emil pass
- Clear hierarchy for the Hoy hero; meaningful **empty states** (no sessions yet → friendly
  CTA "Inicia tu primera sesión"; nothing due → calm "Nada que repasar").
- Stagger entrance, accessible focus rings, count-up on streak/hours, crisp <300ms motion,
  reduced-motion respected — consistent with the existing motion system
  (`src/lib/motion.ts`).

## Non-goals (explicitly out of SP1)

- Real AI tools / generated suggestions / rich coach learning context → **SP2** (SP1 only
  ships the empty suggestion slot + the agenda read-model the AI will consume).
- The spotlight/blur guided tutorial → **SP3** (built on this final layout).
- No change to the SRS algorithm, review modals, or decay logic.
- No multi-device timer sync or background/offline timing — the timer is client-side for the
  active tab; a session is only persisted on Terminar (an `active` row guards against losing a
  long session if the user reloads: on mount, an `active` session offers "reanudar o cerrar").

## What SP1 hands off

- **To SP2:** `StudySession` data, `studySessions.recent`, the `agenda` read-model, real
  hours/streak, and the suggestion slot to render coach output.
- **To SP3:** the finalized "Hoy" layout + stable element anchors for the spotlight tour.

## Risks / open considerations

- **Timer reliability on reload:** mitigated by the `active`-session row + "reanudar/cerrar"
  prompt; no background timing.
- **Progress double-counting:** only focus sessions touch `currentUnits`; planned blocks don't
  until completed-as-real.
- **Stats field rename:** keep `estimatedHoursThisWeek`'s shape to avoid breaking the right
  rail; only rename if trivially safe.
- Migration must follow the repo's Supabase-CLI-as-source-of-truth rule (versioned file in
  `supabase/migrations/`, matching Prisma model).

## Testing

- Service-level: progress/streak side-effects of `finish` for each `progressType`; planned →
  completed transition; agenda merge (reviews + sessions) for a date range.
- Component: focus overlay ↔ pill share one timer; finish persists and updates Hoy.
- Reduced-motion + empty-state rendering.
