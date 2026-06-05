# AI Configuration — Interactive Survey
> **Purpose:** Capture the user's desired AI setup before building the expanded configuration experience.
> **Date:** 2026-06-04
> **STATUS: ANSWERED → IMPLEMENTED (2026-06-04).** See `HIGH_PRIORITY_FIXES_REPORT.md` / `AI_MODELS_CONFIG_REPORT.md`.

## User's answers
- **Providers:** OpenRouter + OpenAI + Anthropic (all three).
- **Models:** global default **or** per-feature (both supported).
- **Priority:** Quality.
- **Fallback:** a single global fallback model.

These answers were implemented: `UserAiSettings` (global default + global fallback + per-feature overrides + cost priority), a pure `resolveFeatureModel` resolver with fallback, an `aiSettings` tRPC router, a Profile UI (Modelos de IA), and coach-service wired to the resolver with fallback-on-init.

---

## Context

The current AI config supports one key per provider (OpenAI / Anthropic / OpenRouter) and a single optional model. The platform uses AI for: trade analysis, coach chat, review generation, psychology insights, learning insights, and embeddings. This survey scopes a richer, per-feature configuration.

> **Note (already fixed this cycle):** the misleading "api key must be a 64 character hex string" error has been corrected — it was a *server* encryption-secret problem, not a key-format issue. OpenRouter keys (`sk-or-...`) are validated correctly.

---

## 1. Providers — which do you want to use?

- [ ] **OpenAI** (`sk-...` / `sk-proj-...`)
- [ ] **Anthropic** (`sk-ant-...`)
- [ ] **OpenRouter** (`sk-or-...`) — gateway to many models
- [ ] **Other** → which? `________________`

For each selected provider, do you already have an API key? `Yes / No`

---

## 2. Models — which models do you want available?

List the model IDs you intend to use (leave blank to accept platform defaults):

| Provider | Models you want | Default model |
|----------|-----------------|---------------|
| OpenAI | `→` | `→` |
| Anthropic | `→` | `→` |
| OpenRouter | `→` | `→` |

> Examples — OpenAI: `gpt-4o`, `gpt-4o-mini`; Anthropic: `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5`; OpenRouter: any `vendor/model` slug.

---

## 3. Per-feature model assignment

Choose a model (or "platform default") for each capability. Different features can use different models/providers.

| Feature | Preferred model | Rationale |
|---------|-----------------|-----------|
| **Trade Analysis** (per-trade insights) | `→` | quality vs cost? |
| **Review Generation** (weekly/monthly summaries) | `→` | |
| **Psychology Analysis** (behavior, tilt, discipline) | `→` | |
| **Learning Insights** (resource impact, recall) | `→` | |
| **Weekly Reviews** (auto-summary) | `→` | |
| **AI Chat** (coach drawer) | `→` | latency-sensitive |
| **Embeddings** (semantic search) | `→` | must be an embedding model |

---

## 4. Cost control — what should the platform optimize for?

Pick the default posture (per-feature override allowed later):

- [ ] **Prioritize quality** — use the strongest model even if slower/pricier
- [ ] **Prioritize speed** — favor low-latency models (e.g. mini/haiku/flash)
- [ ] **Prioritize cost** — cheapest acceptable model; cap monthly spend

Optional monthly budget cap (USD): `________`
Warn at what % of budget? `____%`

---

## 5. Fallback behavior — what if a model fails?

When a model errors, is rate-limited, or times out:

- [ ] **Fail closed** — show an error, do nothing
- [ ] **Fallback to a secondary model** → which? `________________`
- [ ] **Fallback to a secondary provider** → which? `________________`
- [ ] **Retry N times then fallback** → N = `__`

Order of fallback chain (best → last resort):
`1) ________  2) ________  3) ________`

---

## 6. Privacy / data

- [ ] OK to send trade notes + metrics to the selected provider(s)
- [ ] Redact symbols / account names before sending
- [ ] Only send aggregated metrics, never raw notes

---

## Output of this survey → implementation plan

Once answered, the follow-up cycle will:
1. Extend `UserAiConfig` (or add `UserAiFeatureConfig`) for per-feature model mapping + cost posture + fallback chain.
2. Build a richer settings UI (provider cards → model pickers → per-feature matrix → cost/fallback).
3. Add a resolver: `getModelForFeature(feature) → { provider, model }` with fallback handling.
4. Wire coach-service / review-generation / embeddings to the resolver.

> This document is the **input**. No schema/UI changes are made until the survey is answered.
