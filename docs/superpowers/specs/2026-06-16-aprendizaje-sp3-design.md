# Aprendizaje SP3 — Guided tutorial (spotlight tour)

**Date:** 2026-06-16
**Status:** Approved design (decisions confirmed)
**Scope:** Sub-project 3 of 3. Built on the final Hoy layout (SP1 + SP2).

## Goal

Help a first-time user understand the redesigned Aprendizaje page with a short, tasteful
spotlight tour: dim/blur the page, highlight one element at a time, explain it, advance.

## Decisions (confirmed)

1. **Custom spotlight component** — no new dependency. framer-motion + an SVG/overlay mask
   that cuts a rounded hole around the active element; consistent with the existing motion
   system and Emil craft (crisp <300ms, ease-out, reduced-motion respected).
2. **Trigger = first visit (auto) + manual relaunch.** Auto-open once on the first Hoy visit,
   gated by a persisted flag; a small **"?"** button in the page header relaunches it anytime.

## Component design

`src/components/onboarding/spotlight-tour.tsx` — a generic, reusable tour driven by a step
list. A step = `{ anchorId, title, body, placement? }`. The tour:

- Reads each anchor by `data-tour="<id>"` attribute (added to the Hoy elements so the tour
  doesn't depend on fragile CSS selectors).
- Renders a full-screen overlay that dims + lightly blurs everything **except** the anchor's
  bounding rect (rounded cutout via an SVG mask or four-rect overlay around the element).
- Shows a small card (title, body, "Atrás/Siguiente/Listo", step dots, "Saltar") positioned
  near the anchor (auto-flip placement to stay on-screen).
- Recomputes the anchor rect on resize/scroll; scrolls the anchor into view before showing.
- Escape / "Saltar" / backdrop-click closes; finishing or skipping persists the seen-flag.

State owned by a tiny store or local state in the Hoy page; the tour is mounted only on the
Hoy tab.

## Steps (Hoy)

1. **Tira semanal** (`data-tour="week-strip"`) — "Tu semana de un vistazo: repasos, sesiones y
   lo planificado."
2. **Iniciar sesión** (`data-tour="start-session"`) — "Estudia con un cronómetro enfocado;
   minimízalo a una píldora y sigue leyendo."
3. **Coach suggestion** (`data-tour="coach-suggestion"`) — "Tu coach sugiere qué estudiar
   según tus trades; pregúntale para profundizar." (SP2 slot)
4. **Racha / meta** (`data-tour="streak"`) — "Tu constancia y la meta semanal de horas."
5. **Agenda** (`data-tour="agenda"`) — "Lo que viene: repasos que vencen y sesiones
   planificadas."

(Keep copy short; 5 steps max.)

## Persistence

- Add a boolean user preference `aprendizajeTourSeen` (via the existing `preferences` router /
  store — same mechanism the onboarding checklist uses). Auto-open only when false **and** the
  Hoy queries have resolved (no flby over a loading skeleton — reuse the onboarding pattern of
  waiting for data). Mark seen on finish or skip.
- The "?" button calls the tour open action regardless of the flag.

## Accessibility / craft

- `prefers-reduced-motion`: no blur animation / instant transitions; still functional.
- Focus trap inside the tour card; `aria-live` announces step title; arrow-key / Enter / Esc
  navigation.
- The cutout has a subtle ring (`var(--accent)`) so the highlighted element reads clearly.

## Non-goals

- No multi-page tour (Hoy only). No backend besides the single preference flag.
- No analytics events (could be a later follow-up).
- Does not change any SP1/SP2 behavior — purely additive overlay + `data-tour` anchors.

## Testing

- Component: step advance/back, skip, finish persists flag; anchor rect recompute on resize;
  reduced-motion path renders without animation.
- E2E (ariaoc89): first visit auto-opens the tour over Hoy; stepping through highlights each
  anchor; finishing persists so a reload doesn't reopen; "?" relaunches.
- typecheck / lint / build green.
