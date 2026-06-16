# Aprendizaje SP1 — Implementation plan

Plan for `2026-06-16-aprendizaje-sp1-design.md`. Phases are ordered; each ends green
(`tsc` + build) and is independently reviewable. Paths are under `src/` unless noted.

> Conventions: schema only via versioned Supabase migration in `supabase/migrations/`
> (never manual DB); Node 24 via nvm for build/test; follow existing design-system +
> `lib/motion.ts`; don't touch the SRS algorithm/review modals/decay.

---

## Phase 0 — Data foundation

**0.1 Migration** — new `supabase/migrations/<ts>_study_sessions.sql`:
- enums `study_session_status` (`active|completed|planned`), `study_session_source`
  (`focus|manual|planned`).
- table `StudySession` (cols per spec), FKs to user + `LearningResource` (cascade on
  resource delete), indexes `(userId, startedAt)`, `(resourceId)`, partial index on
  `status='active'`.
- Filename version must match prod `schema_migrations` convention (see CI migration memory).

**0.2 Prisma** — mirror the model in `prisma/schema.prisma`; `prisma generate`. No `db push`.

**0.3 Domain service** — `domains/learning/services/study-session-service.ts`:
- `applyFinish(resource, durationMin)` → returns the `currentUnits`/`status` delta using
  existing `computeProgressPct` / `computeResourceStatus` (minutes→+min, sessions→+1,
  pages→no-op).
- `studyStreak(sessions)` (or extend `streak-service.ts`) → streak from real sessions.
- Unit tests for each `progressType` + streak edges.

**Verify:** migration applies on a scratch DB (replay), `tsc`, service unit tests pass.

---

## Phase 1 — tRPC API

**1.1** New router `server/trpc/routers/study-sessions.ts` (mount in root):
- `start({resourceId})`, `finish({id,durationMin,note?})` (calls `applyFinish` + streak +
  invalidations), `cancel({id})`, `plan({resourceId,date,plannedMin})`,
  `completePlanned({id})`, `list({from,to})`, `recent({limit})`.
- Reuse serialization style from `learning-resources.ts` (dates → ISO).

**1.2** `learningResources.agenda({from,to})` read-model — merge per day: SRS reviews due
(`nextReviewAt`) + study sessions (done + planned). Shape: `{ date, reviewsDue[], sessions[] }`.

**1.3** Stats — `learningResources.stats` now derives hours/streak from real sessions; keep
`estimatedHoursThisWeek` shape (add real value) to avoid breaking the right rail.

**Verify:** `tsc`; a quick integration check that `agenda` merges correctly (service test).

---

## Phase 2 — Focus session (timer) UX

**2.1** Single owner of the running session: `app/aprendizaje/hooks/use-study-session.ts`
(or a small zustand store) holding `{ activeSession, elapsedSec, start, pause, finish,
minimized }`. One source of truth so overlay + pill never diverge.

**2.2** `app/aprendizaje/components/focus-overlay.tsx` — dim/blur backdrop, resource title,
large monospace timer (count-up), quick-note textarea, pause + **Terminar**, **minimizar**.
Reduced-motion aware; accessible (focus trap, Esc minimizes).

**2.3** `app/aprendizaje/components/focus-pill.tsx` — floating `⏱ mm:ss · <resource> ■`,
persists across navigation (mount in `AppShell` or a coach-style portal), click → expand.

**2.4** Resource picker for **▶ Iniciar sesión** (reuse existing resource list/search) →
`start`.

**2.5** On **Terminar**: `finish` mutation → toast + offer "¿Marcar para repaso?" (links to
the existing `RevisarRecursoModal`/review flow). On mount, if an `active` session exists →
"Reanudar o cerrar" prompt.

**Verify:** component test (overlay↔pill share timer; finish persists); manual run.

---

## Phase 3 — "Hoy" home tab

**3.1** Add `hoy` tab (default) in `app/aprendizaje/page.tsx`; extend `?tab=` deep-link;
reuse the tab component + standardized motion.

**3.2** `app/aprendizaje/components/week-strip.tsx` — 7 days, today highlighted, per-day dots
(`•` review due, `▪` session), click → day detail (filters agenda).

**3.3** `app/aprendizaje/components/hoy-block.tsx` — "N repasos vencen → Repasar", "En curso:
<resource> · time this week", **▶ Iniciar sesión**, and an empty **suggestion slot**
(`<CoachSuggestionSlot />` placeholder; SP2 fills it).

**3.4** `app/aprendizaje/components/racha-card.tsx` — streak, hours-this-week vs goal,
progress bar, count-up (reuse `CountUp`).

**3.5** `app/aprendizaje/components/agenda-list.tsx` — "Esta semana" ordered list from
`learningResources.agenda`.

**3.6** Wire the tab to `agenda` + `studySessions.list` + `stats`.

**Verify:** `tsc`; Hoy renders with seeded data; tab switch + deep-link.

---

## Phase 4 — Visual / Emil pass + empty states

- Hero hierarchy; **empty states**: no sessions → "Inicia tu primera sesión" CTA; nothing due
  → calm "Nada que repasar"; no agenda → gentle prompt.
- Stagger entrance, focus rings, count-up, <300ms motion, `prefers-reduced-motion`.
- Mobile: week strip scroll/compact; pill placement avoids the bottom nav.

**Verify:** lint (0 errors), reduced-motion, mobile widths.

---

## Phase 5 — Verify & hand off

- `tsc` + `pnpm run build` green; ESLint 0 errors.
- Service tests (Phase 0/1) + component tests (Phase 2) pass.
- Manual: start→minimize→navigate→finish→progress/streak update; plan a session→see it in
  agenda/week strip; reviews-due count matches Repaso tab.
- Confirm SP1 hand-off ready: `StudySession` data, `studySessions.recent`, `agenda`
  read-model, real hours/streak, suggestion slot — for SP2; final Hoy layout — for SP3.

---

## Suggested commit/PR slicing

1. Phase 0 (migration + Prisma + service) — its own PR (schema review).
2. Phase 1 (tRPC) — own PR.
3. Phases 2–4 (UI) — one or two PRs (focus session; then Hoy page + polish).
4. Each PR: `tsc`/build green, screenshots of the new UI, no SRS changes.

## Open items to confirm during implementation

- Exact prod migration filename/version (CI replay must pass — see migration deploy memory).
- Whether to keep `estimatedHoursThisWeek` name or add `hoursThisWeek` (pick the
  non-breaking option when the right-rail consumer is read).
- Pill mount location (AppShell portal vs page-local) given it must survive navigation.
