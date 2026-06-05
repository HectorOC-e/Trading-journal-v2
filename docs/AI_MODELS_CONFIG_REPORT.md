# AI Models Configuration — Implementation Report
> **Date:** 2026-06-04
> Implements the answered `AI_CONFIGURATION_SURVEY.md`.

## User decisions → implementation
| Answer | Built |
|--------|-------|
| Providers: OpenRouter + OpenAI + Anthropic | All three selectable everywhere (provider selects) |
| Model global **or** per-feature | Global default + optional per-feature overrides |
| Priority: Quality | `costPriority` stored, default `quality` |
| Fallback: single global model | Global `fallbackProvider`/`fallbackModel` + runtime fallback-on-init |

## What was built

### Data model — `UserAiSettings` (migration 012)
One row per user: `defaultProvider`, `defaultModel`, `fallbackProvider?`, `fallbackModel?`, `costPriority` (quality|speed|cost), `featureModels` (JSON map `feature → {provider, model}`). Additive table — existing users get defaults lazily on first save.

### Resolver — `lib/ai/feature-models.ts` (pure, tested)
- `AI_FEATURES`: `trade_analysis, review_generation, psychology_analysis, learning_insights, weekly_reviews, ai_chat, embeddings`.
- `resolveFeatureModel(settings, feature)` → `{ primary, fallback }`:
  1. per-feature override → 2. global default → 3. global fallback (dropped if identical to primary).
- `parseFeatureModels(raw)` validates the DB JSON blob into a typed map (rejects bad providers / empty models).
- 8 unit tests in `__tests__/lib/feature-models.test.ts`.

### API — `aiSettings` tRPC router
- `get` → returns the user's settings or platform defaults.
- `update` → upsert; strips empty per-feature entries so they fall back to the global default.

### Runtime wiring — coach (`ai_chat`)
- `coach-service.streamCoachReply` now loads `UserAiSettings`, resolves the `ai_chat` model, and calls `streamChat` with it. On an init failure it retries with the global **fallback** model. Falls back to platform defaults when the user has no settings row.
- Existing coach tests updated (prisma mock returns no settings → platform default model preserved). 5/5 pass.

### UI — Profile → "Modelos de IA"
- Global default provider + model.
- Global fallback provider + model (optional).
- Cost priority (Calidad / Velocidad / Costo).
- Collapsible per-feature overrides (provider + model each; blank = use default).
- New component `app/perfil/components/ai-models-card.tsx`, mounted under the existing AI-keys card.

## Update — full wiring + functional cost priority (2026-06-04, second pass)

### All AI call-sites now use the resolver
A shared server bridge `lib/ai/resolve-model.ts` (`loadAiSettings`, `resolveModelForFeature`) keeps the pure resolver Prisma-free. Wired:
| Feature | Call-site | Fallback |
|---------|-----------|----------|
| `ai_chat` | `coach-service.streamCoachReply` | yes (init) |
| `weekly_reviews` | `weekly-reviews.generateSummary` | yes (init) |
| `embeddings` | `trades.scheduleEmbedding`, `trades.semanticSearch`, `app/api/ai-embed` | n/a (returns null on fail) |

`embedText(text, modelOverride?)` now accepts a per-user model. Embedding call-sites resolve the `embeddings` feature and pass it (webhook path routes through the trade owner's model).

> `trade_analysis`, `psychology_analysis`, `learning_insights` have **no dedicated AI generation call-site today** (they are computed analytically). They remain in the feature list so they're configurable the moment such a call-site is added.

### costPriority is now functional (cost ladders)
- Added `CHAT_LADDER` (per provider × quality/speed/cost) and `EMBEDDING_LADDER`.
- Any model left as **`auto`** (or blank) resolves through the ladder by the user's `costPriority`. Explicit models are never overridden.
- `pickAutoModel(provider, costPriority, feature)` exported + tested.
- UI hint: type `auto` in any model field to let priority decide.

### Tests
`feature-models.test.ts` now covers ladders/auto/embeddings/explicit-wins (13 total). Suite: **511** pass.

---

## Original scope notes (first pass)
- Key storage is unchanged (env keys at runtime + encrypted `UserAiConfig`); this cycle adds **model routing**, not key plumbing.
- Fallback is applied at stream **init** (not mid-stream).

## Files
- `prisma/schema.prisma`, `prisma/migrations/012_user_ai_settings.sql`
- `lib/ai/feature-models.ts` (new), `lib/ai/coach-service.ts`
- `server/trpc/routers/ai-settings.ts` (new), `server/trpc/root.ts`
- `app/perfil/components/ai-models-card.tsx` (new), `app/perfil/page.tsx`
- `__tests__/lib/feature-models.test.ts` (new), `__tests__/lib/coach-service.test.ts`

## Gates
`next build` ✅ · `tsc` ✅ 0 · `vitest` ✅ 506 (+8) · `eslint` ✅ 0 errors.

## Pending (future)
- Migrate review / psychology / learning / weekly / embeddings call sites to the resolver.
- Use `costPriority` to auto-select models (quality/speed/cost ladders).
- Mid-stream fallback (current fallback is at init only).
- "Test model" button per feature (validate a model id against the provider).
