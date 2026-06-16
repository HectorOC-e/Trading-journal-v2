# Aprendizaje SP2 — AI learning accompaniment

**Date:** 2026-06-16
**Status:** Approved design (decisions confirmed)
**Scope:** Sub-project 2 of 3 of the "mejorar Aprendizaje + IA" initiative. Builds on SP1.

## Context

SP1 shipped the `StudySession` model, the `studySessions` router (incl. `home`/`recent`),
real hours/streak, and an empty **coach suggestion slot** in the Hoy tab. The AI coach
(`src/lib/ai/coach-service.ts` + `coach-tools.ts` + `coach-agent.ts`) currently has only a
3-line learning context (pending reviews, reviews this month, mastered resources) and **no**
learning-aware tools — all 6 existing tools are trade-only.

## Goal

Make the coach genuinely aware of the trader's learning: what they're studying, what's due,
how consistent they are, and which weakness maps to which resource — and surface one concrete
study suggestion on the Hoy tab without per-visit LLM cost.

## Decisions (confirmed)

1. **Suggestion slot = server-side heuristic + deep-link.** No LLM call on page load. A cheap
   deterministic query picks the single best suggestion; a "Preguntar al coach" button opens
   the coach chat pre-filled with a learning question.
2. **Four new read-only coach tools** (all user-scoped, never write):
   `get_learning_resources`, `get_study_agenda`, `suggest_study`, `search_learning_resources`.
3. **Resource semantic search** requires a `notes_embedding` column on `learning_resources`
   (mirrors trades) + embed-on-write + a backfill script; degrades gracefully when no key.

## Data / schema

- **Migration** `…_learning_resource_embeddings.sql` (versioned, Supabase-CLI source of truth):
  `ALTER TABLE learning_resources ADD COLUMN notes_embedding vector(1536)` (nullable). Mirror
  in Prisma as `Unsupported("vector")?` like `trades.notes_embedding`. No RLS change (table
  already RLS'd).
- **Embed-on-write:** where a resource's `notes` is created/updated (the `learningResources`
  create/update mutations), compute the embedding if a key is configured (reuse
  `resolveEmbeddingCall` + `embedText`), best-effort (never block the write on embedding
  failure). Clear the embedding if notes become empty.
- **Backfill:** `scripts/backfill-resource-embeddings.mjs` mirroring
  `scripts/backfill-embeddings.mjs` (trades) — embeds resources with non-empty notes and a
  null embedding.

## Coach context enrichment

Replace the 3-line `### Aprendizaje` block in `buildSystemPrompt` (coach-service.ts:93-96)
with a richer block sourced from `buildTraderContext` (extend
`src/domains/analytics/ai-context.ts` `learning` slice) + study-session aggregates:

- Active resources (IN_PROGRESS) with type + progress% (cap the list, e.g. top 6).
- Reviews due now / overdue count + the next 3 titles.
- Study consistency: minutes this week vs weekly goal, current streak, sessions last 7 days.
- Weakest setup (already in `performance.worstSetup`) → any **linked resources** (via
  `LearningResource.linkedSetups`) the trader could study; flag "linked but untouched".

Keep the block compact (it's in the per-request dynamic prompt). Reuse SP1's
`study-session-service` helpers for streak/minutes; do not recompute SRS.

## New coach tools (coach-tools.ts)

| tool | input | returns |
| --- | --- | --- |
| `get_learning_resources` | `{ status?, type?, limit? }` | resources w/ title, type, status, progressPct, markedForReview, nextReviewAt, linkedSetups names |
| `get_study_agenda` | `{ days? }` (default 14) | due reviews + recent + planned sessions merged by day (reuse the agenda read-model) |
| `suggest_study` | `{}` | crosses `worstSetup`/top violation tag with linked resources → 1-3 ranked suggestions w/ reason |
| `search_learning_resources` | `{ query, limit? }` | semantic search over resource `notes_embedding`; graceful error when no key/embeddings (mirror `semantic_search`) |

Wire each into `executeCoachTool`'s if-chain. Add to `COACH_TOOLS` array (Anthropic + OpenAI
specs are both derived from it). Update the coach system prompt's tool-usage guidance so it
knows it can answer "¿qué estudio hoy?" with these.

## Hoy suggestion slot

- New `studySessions.suggestion` procedure (or fold into `home`): returns
  `{ kind: "weakness" | "overdue_review" | "goal_gap" | "streak" | null, title, reason,
  resourceId?, coachPrompt }`. Priority order: overdue reviews → weakness→resource →
  weekly-goal gap → streak nudge → null (then the slot shows the calm default).
- `HoyTab` renders the suggestion in the existing slot (replace the dashed placeholder):
  Sparkles icon, one-line reason, and a **"Preguntar al coach"** button that navigates to the
  coach with the `coachPrompt` pre-filled (deep-link param the coach chat reads on mount; if
  the coach has no such hook yet, add a minimal `?ask=` query the chat consumes once).

## Non-goals

- No proactive/automatic LLM generation on page load (cost). The slot is heuristic; the LLM
  only runs if the user clicks through to the coach.
- No change to SRS, the review modals, or SP1's session flow.
- No new embeddings provider config — reuse the existing one; semantic resource search simply
  degrades when unconfigured.

## Testing

- Service: `suggestion` priority ordering for each input shape; weakness→resource mapping;
  goal-gap math. Pure helpers unit-tested.
- Tool: `executeCoachTool` returns well-formed JSON / graceful errors for each new tool
  (semantic search with no key returns the documented error, no throw).
- E2E (ariaoc89): Hoy shows a suggestion; "Preguntar al coach" opens chat pre-filled; ask the
  coach "¿qué debería estudiar/repasar hoy?" and confirm it calls a learning tool.
- typecheck / lint / build green.

## Handoff to SP3

The final Hoy layout (with the live suggestion slot) is the surface SP3's spotlight tour
anchors onto.
