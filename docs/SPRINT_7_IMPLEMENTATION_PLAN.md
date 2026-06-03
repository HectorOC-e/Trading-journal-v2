# Sprint 7 Implementation Plan

> **Based on:** `SPRINT_MASTER_PLAN.md` (Sprint 7 template), `CANONICAL_EXECUTION_PLAN.md` (task assignments), `SPRINT_6_RETROSPECTIVE.md` (priority adjustments)  
> **Adjusted:** Removes TASK-049 (done in Sprint 6), promotes TASK-031 + TASK-011 to top priority, adds Sprint 6 QA deferred items, defers TASK-071 to Sprint 8.  
> **Vision constraint:** No changes to non-goal items. All tasks align with the privacy-first single-tenant coach vision.

---

## Sprint Objective

Close the highest-value P1 items that have been deferred three sprints. Fix the CRITICAL discipline score inconsistency (TD-002). Harden infrastructure (Redis rate limiter, reliable embedding). Surface rolling analytics and setup health. Ship custom tags.

**Theme:** Reviews, Discipline, and Infrastructure Hardening

---

## What Changed from the Original Sprint 7 Plan

| Original Task | Status | Action |
|---|---|---|
| TASK-049 — Playbook sparklines | ✅ Done Sprint 6 | Remove from Sprint 7 |
| TASK-055 — AI endpoint rate limiting | ⚠️ Partial (in-memory, single-instance only) | Replace with Redis-backed implementation |
| TASK-073 — Rolling metrics | Still planned | Keep |
| TASK-064 — Setup health score | Still planned | Keep |
| TASK-058 — Reliable embedding via webhook | Still planned | Keep |
| TASK-060 — Structured logger | Still planned | Keep |
| TASK-070 — Accessibility pass | Still planned | Stretch goal (if capacity) |
| TASK-071 — Monthly review model | Still planned | **Defer to Sprint 8** (8h; TASK-031 takes priority) |

**New additions from Sprint 6 retrospective:**
- TASK-031 (review edit/delete) — P1, deferred 3 sprints, promoted to **top priority**
- TASK-011 (discipline score centralization) — TD-002 CRITICAL, promoted alongside TASK-031
- Redis rate limiter / `lib/rate-limiter.ts` — M-004 full architectural fix
- TD-029, TD-030, TD-031, TD-032 — Sprint 6 QA deferred small fixes (XS each)
- TASK-051 (custom tags) — P2, displaced from Sprint 6
- Review URL persistence — deferred from Sprint 6

---

## Grouped Functionalities

### Group A — P1 Priority: Reviews & Discipline (6h)

**These are the highest-value items. Ship first.**

#### TASK-031 — Edit and Delete in ReviewDetailPanel (M, 4h)

**Why now:** Deferred from Sprint 4, 5, and 6. Traders cannot fix errors in submitted reviews. `NuevaReviewModal` already exists in edit-mode-capable form.

**Deliverables:**
- "Editar" button in `ReviewDetailPanel` opens `NuevaReviewModal` in edit mode; fields pre-populated from `weeklyReviews.get`
- "Eliminar" button triggers confirmation dialog; calls `weeklyReviews.delete` mutation; navigates back to list on success
- "Última edición: hace 3 horas" timestamp shown in footer of submitted review
- `weeklyReviews.update` mutation already exists; wire form submission to it
- Toast feedback on success/error
- Both actions require the review to belong to the authenticated user (enforced server-side via RLS)

**Acceptance criteria:**
1. Trader can open any submitted review, edit any field (summary, whatWorked, toImprove, tags), and save — saved values persist on reload
2. Trader can delete a review with a confirmation dialog; deleted review is removed from list
3. Edit mode shows "Editando semana del X al Y" in modal header
4. "Última edición" timestamp visible in detail panel footer
5. Unauthenticated or cross-user delete/edit returns 403

**Risk:** `NuevaReviewModal` form was built for create mode; some fields may have create-only side effects (e.g. auto-fill from trades). Test that edit mode suppresses the `prefill` query (already guarded with `{ enabled: !isEditMode }`).

---

#### TASK-011 — Extract `computeDisciplineScore` as Shared Function (S, 2h)

**Why now:** TD-002 CRITICAL. Three separate implementations produce different scores for the same week:
- `weekly-reviews.ts` (server, weighted multi-factor: execution 50 + learning 30 + adherence 20)
- `weekly-reviews.ts:prefill` (server, duplicate inline)
- `create-review-modal.tsx:103` (frontend, simplified: `disciplinedCount / total * 100`)

A trader can see score 74 in the creation modal and score 68 saved in the DB for the same week. This directly undermines trust in the discipline metric.

**Deliverables:**
- Extract `computeDisciplineScore({ executionPct, learningPct, adherencePct })` into `src/lib/formulas/discipline.ts` (function exists in tests; centralize the implementation)
- Replace both server-side duplicates in `weekly-reviews.ts` with the shared function
- Frontend modal: remove local computation; receive server-computed score via `prefill` query; show loading skeleton while query runs
- Add `computeDisciplineScore` to formulas barrel (`src/lib/formulas/index.ts`)
- Update existing `calcDisciplineScore` test to use the canonical signature

**Acceptance criteria:**
1. `tsc --noEmit` passes with 0 errors
2. `weekly-reviews.ts` has 1 call to `computeDisciplineScore` (shared function), 0 inline implementations
3. `create-review-modal.tsx` shows server-provided score only; never computes locally
4. Existing discipline score tests continue to pass; no test removed

---

### Group B — Rate Limiter Hardening (6h)

#### Extract `lib/rate-limiter.ts` + Redis Implementation (M, 4h)

**Context:** Sprint 6 shipped an in-memory rate limiter (M-004 from QA). It's functionally correct but:
1. Resets on every Vercel cold start → ineffective in multi-instance deployments
2. Algorithm is duplicated in the test file instead of imported

**Deliverables:**
- Create `src/lib/rate-limiter.ts` with:
  ```ts
  export interface RateLimiter {
    check(userId: string): Promise<{ allowed: boolean; retryAfter: number }>
  }
  ```
- `InMemoryRateLimiter` implementation (current algorithm, preserves behavior)
- `UpstashRateLimiter` implementation using `@upstash/ratelimit` sliding-window
- Factory: reads `UPSTASH_REDIS_REST_URL` env var → returns `UpstashRateLimiter` if set, else `InMemoryRateLimiter` (graceful degradation for local dev)
- Update `src/app/api/ai-test/route.ts` to use `createRateLimiter()` from `lib/rate-limiter.ts`
- Update `src/__tests__/routers/rate-limit.test.ts` to import and test the actual `InMemoryRateLimiter` class (resolves TD-033)

**Environment variables required:**
```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```
Document in `.env.example`.

**Acceptance criteria:**
1. `UPSTASH_REDIS_REST_URL` unset → `InMemoryRateLimiter` used (no breakage in dev)
2. `UPSTASH_REDIS_REST_URL` set → `UpstashRateLimiter` used
3. Rate limit tests import `InMemoryRateLimiter` directly; no algorithm duplication
4. All 6 existing rate-limit tests still pass

---

#### Sprint 6 QA Mini-Fixes (XS, 2h total)

Four small deferred fixes from the Sprint 6 QA report. Each is a 1–3 line change:

**TD-029 — Guard `CYCLE.includes` on DB prefs cast** (`theme-provider.tsx:44`)
```ts
// Before:
setThemeState(prefs.theme as ThemeMode)

// After:
const t = prefs.theme as ThemeMode
if (CYCLE.includes(t)) setThemeState(t)
```

**TD-030 — Rate limit window boundary** (`ai-test/route.ts:17`)
```ts
// Before: now - entry.windowStart > RATE_LIMIT_WINDOW
// After:  now - entry.windowStart >= RATE_LIMIT_WINDOW
```
Also update the rate-limit test boundary case to use `now + RATE_LIMIT_WINDOW` (not `+1`).

**TD-031 — `serializeAccount` on mutation endpoints** (`accounts.ts`)
Apply `return serializeAccount(account)` to the 5 mutation endpoints: `create`, `update`, `changeStatus`, `changePhase`, `archive`. Ensures `RouterOutputs["accounts"]["create"]` matches `RouterOutputs["accounts"]["list"][number]` shape (`initialBalance: number`).

**TD-032 — `Prisma.Decimal` in accounts test mock** (`accounts.test.ts`)
```ts
import { Prisma } from "@/lib/generated/prisma/client"
// Mock:
initialBalance: new Prisma.Decimal("10000.50"),
// Assert:
expect(typeof result[0].initialBalance).toBe("number")
expect(result[0].initialBalance).toBe(10000.5)
```

---

### Group C — Analytics Visualization (6h)

#### TASK-073 — Rolling Metrics Dashboard (7d / 30d / 90d) (M, 4h)

**Deliverables:**
- Three-button window selector on dashboard analytics tab: `7d | 30d | 90d`
- Server: extend `trades.dashboardStats` with optional `window` parameter (`"7d" | "30d" | "90d" | "ALL"`); compute metrics for the requested window using existing `calcWinRate`, `calcSharpeRatio`, `calcExpectancyR` from `lib/formulas/`
- Client: window selection persisted to `UserPreferences.defaultGrain` (already in schema)
- Recharts equity curve on analytics tab respects the selected window
- Rolling metrics included: Win Rate, P&L, Trade Count, Sharpe, Expectancy R

**Acceptance criteria:**
1. Switching window updates all KPI cards and equity curve within the same page render
2. Selected window persists across page reloads
3. `window = "7d"` with <7 days of trades shows correct partial results
4. Existing `ALL` behavior unchanged (default and fallback)

---

#### TASK-064 — Setup Health Score in Playbook (S, 2h)

**Deliverables:**
- `calcSetupHealth(stats: SetupStats): "healthy" | "warning" | "critical"` in `lib/formulas/setup.ts`:
  ```
  healthy  → winRate >= expectedWr AND avgR >= minR
  critical → winRate < expectedWr * 0.7 OR avgR < 0
  warning  → everything else
  ```
- Color indicator (🟢/🟡/🔴 or SVG dot) on each setup card in Playbook list view
- Tooltip: "Winrate: 68% (esperado: 60%) · R promedio: 1.8 (mínimo: 1.0)"
- Edge cases: setups with <5 trades show "⚪ Insuficiente" state

**Acceptance criteria:**
1. Three visual states render correctly in light and dark mode
2. Calculation uses `expectedWr`, `minR` from `Setup` model (already stored)
3. Setups with <5 trades show neutral "Insuficiente" badge (not health score)

---

### Group D — AI Reliability (6h)

#### TASK-058 — Reliable Embedding via DB Webhook (M, 4h)

**Context:** `scheduleEmbedding()` calls `fetch("/api/ai-embed")` as fire-and-forget within the same tRPC request. In Vercel serverless, the HTTP connection closes before the background fetch completes — embeddings silently fail (TD-020).

**Deliverables:**
- Supabase Database Webhook on `trades` table `INSERT` event → triggers `POST /api/ai-embed` via Supabase HTTP webhook (not same-process fetch)
- Update `src/app/api/ai-embed/route.ts` to accept webhook payload shape from Supabase
- Add webhook secret validation (`SUPABASE_WEBHOOK_SECRET` header)
- Remove `scheduleEmbedding()` call from trades router (replaced by webhook)
- Document in `.env.example`: `SUPABASE_WEBHOOK_SECRET`

**Alternative if Supabase webhook setup is out of scope:** Use Upstash QStash to enqueue the embedding job. Same interface, different infrastructure.

**Acceptance criteria:**
1. Creating a trade triggers embedding within 10 seconds (webhook delay)
2. `trades.ts` router has no direct `fetch("/api/ai-embed")` call
3. `ai-embed/route.ts` validates the webhook secret; returns 401 without it
4. Embedding failures are logged but don't break trade creation response

---

#### TASK-060 — Structured Logger `lib/logger.ts` (S, 2h)

**Deliverables:**
- `src/lib/logger.ts`: `logger.info`, `logger.warn`, `logger.error` replacing `console.error` calls
- Output: `{ timestamp, level, message, context?: Record<string, unknown> }` JSON to stdout
- In production (`NODE_ENV === "production"`): JSON format (Vercel-parseable)
- In development: pretty-print with colors
- Replace all `console.error` / `console.warn` calls in:
  - `src/app/api/ai-coach/route.ts`
  - `src/app/api/ai-embed/route.ts`
  - `src/lib/ai/key-encryption.ts` error logging
  - `src/server/trpc/routers/` error catch blocks

**Acceptance criteria:**
1. No `console.error` in production paths (audited via `grep`)
2. Logs include `userId` context where available
3. Dev mode logs are readable (not raw JSON)

---

### Group E — Personalization Completion (6h)

#### TASK-051 — Custom Tags Management UI (M, 4h)

**Deliverables:**
- Tags management page accessible from Settings / Profile
- Create tag: name (required, max 30 chars) + color (from preset palette or hex)
- Rename tag: inline edit; all trades using that tag updated via `tradeTags.rename`
- Delete tag: confirmation dialog; removes from all trades
- Merge tags: select two tags → merge into one (all trades use the surviving tag)
- Tag list sortable by usage count (most-used first)
- `tradeTags.create`, `tradeTags.update`, `tradeTags.delete`, `tradeTags.merge` tRPC mutations (add to existing tags router)

**Acceptance criteria:**
1. New tag appears in trade form dropdowns immediately (optimistic update or invalidation)
2. Renamed tag updates in all existing trades (no orphan references)
3. Deleted tag removed from all existing trades and trade filters
4. Merge reduces tag count by 1; merged tag's trades adopt surviving tag

---

#### Review Filter URL Persistence (S, 2h)

**Context:** Filters in `reviews/page.tsx` (TASK-048, Sprint 6) reset on navigation because state is local. Users lose filter context when opening a review detail.

**Deliverables:**
- Sync `searchQuery`, `outcomeFilter`, `statusFilter`, `minDisc` to URL search params using Next.js `useSearchParams()` and `useRouter().replace()`
- Page reads initial filter state from URL params on mount
- Filter changes update URL without full navigation (`router.replace` — no history entry)
- "Limpiar filtros" button clears URL params and state
- Shareable URL: pasting the URL in a new tab restores the same filter state

**Acceptance criteria:**
1. Navigating away and back preserves filter state (URL params survive navigation)
2. Browser back/forward does not create filter history entries
3. Empty filter state produces clean URL (`/reviews` not `/reviews?outcome=ALL`)
4. URL params respected even when they differ from defaults

---

### Group F — Stretch Goals (if capacity allows)

#### TASK-070 — Accessibility Pass (M, 4h)

Focus on the most-used flows: dashboard, trades list, weekly review modal.

- Add `role="table"` and `aria-label` to trades table
- Add `aria-live="polite"` to toast notifications
- All interactive elements have visible focus rings (check `outline: none` removals)
- `prefers-reduced-motion`: disable trade chart animations and sparkline transitions
- Test with VoiceOver (macOS) on dashboard and review list

**Defers to Sprint 8 if not completed.**

---

## Deferred to Sprint 8

| Item | Reason |
|---|---|
| TASK-071 — Monthly review model (8h) | Large schema + UI change; Sprint 7 is already 30h. Insufficient buffer for a clean ship. |
| TASK-070 — Accessibility (4h) | Stretch goal; moves to Sprint 8 if Sprint 7 runs long. |
| TASK-072 — Calendar heatmap (4h) | Not in top-priority list; defer until rolling metrics (TASK-073) are validated. |
| TD-012 — `phasePayload as never` in accounts router | Low risk, XS effort; bundle with Sprint 8 cleanup. |

---

## Dependencies

```
TASK-011 (discipline formula) ──────────────────────────────────────────► No further blockers
                                                                           (closes TD-002)

TASK-031 (edit/delete reviews) ─────────────────────────────────────────► No further blockers
                                                                           (NuevaReviewModal exists)

lib/rate-limiter.ts (extract) ──────────────────────────────────────────► Rate limit tests importable
                               ├──► UpstashRateLimiter (needs UPSTASH env vars)
                               └──► TD-033 resolved (tests import real function)

TD-031 (serialize accounts mutations) ──────────────────────────────────► No further blockers
                                                                           (5 endpoints, XS each)

TASK-073 (rolling metrics) ─────────────────────────────────────────────► No further blockers
                             Depends on: lib/formulas/calcWinRate, calcSharpeRatio (✅ exist)
                             Depends on: UserPreferences.defaultGrain (✅ exists)

TASK-064 (setup health score) ──────────────────────────────────────────► No further blockers
                               Depends on: Setup.expectedWr, Setup.minR (✅ in schema)

TASK-058 (reliable embedding) ──────────────────────────────────────────► Supabase webhook provisioning
                               Depends on: Supabase project access (verify env vars available)

TASK-051 (custom tags) ─────────────────────────────────────────────────► No further blockers
                         Depends on: TASK-006 (profile backend ✅), tags table (✅ exists)
```

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Upstash Redis requires provisioning — sprint blocked | 🔴 High | Fallback: `InMemoryRateLimiter` remains active. Rate limiter works correctly in single-instance dev. Redis provisioning is decoupled from code change. Sprint can ship without Redis if provisioning fails. |
| Supabase webhook setup requires DB-level access (not just schema) | 🟠 Medium | Test webhook in local Supabase dev first. If webhook provisioning is blocked, use QStash (alternative P1). |
| `NuevaReviewModal` edit mode surfaces create-only side effects | 🟡 Medium | Add `isEditMode` prop to suppress `prefill` and `score` queries. These are already guarded in Sprint 4. |
| TASK-011 frontend change (remove local discipline score) may cause flicker | 🟡 Medium | Show loading skeleton in the score field while `prefill` query runs. Server query is fast (<100ms). |
| TASK-073 rolling metrics adds query parameter to dashboardStats; breaks existing callers | 🟡 Medium | Make `window` parameter optional with default `"ALL"`. All existing callers continue to work unchanged. |
| Custom tags merge operation updates many trades in a loop | 🟡 Medium | Use Prisma batch `updateMany({ where: { tagId: oldId }, data: { tagId: newId } })` — single query, not a loop. |

---

## Acceptance Criteria (Sprint-Level)

1. **TASK-031:** Traders can edit and delete any review they own; "Última edición" timestamp shows for edited reviews
2. **TASK-011:** `weekly-reviews.ts` has exactly 1 call to `computeDisciplineScore` (shared lib); modal shows server-computed score
3. **Rate limiter:** `lib/rate-limiter.ts` exported with `InMemoryRateLimiter` + `UpstashRateLimiter`; rate-limit tests import real class
4. **TD mini-fixes:** `CYCLE.includes` guard on DB prefs, `>=` boundary, `Prisma.Decimal` in mock, `serializeAccount` on 5 mutations — all patched
5. **TASK-073:** 7d/30d/90d window selector on dashboard analytics; preference persists
6. **TASK-064:** Setup health score (🟢/🟡/🔴) visible on each Playbook card
7. **TASK-058:** Trade creation triggers embedding via webhook (not in-process fetch); console.error replaced by logger
8. **TASK-060:** `lib/logger.ts` with JSON output in prod; all `console.error` in production paths replaced
9. **TASK-051:** Tags can be created, renamed, deleted, and merged; all trade references updated
10. **Review URL:** Filter state survives navigation; URL is shareable
11. **Tests:** All existing 407 tests pass; new tests added for TASK-031 edit/delete, TASK-011 shared formula, rate-limiter import
12. **TypeScript:** `tsc --noEmit` — 0 errors

---

## User-Visible Outcomes

- **Traders can fix mistakes** in submitted reviews (edit) and remove incorrect reviews (delete)
- **Discipline score is consistent** — the score shown while creating a review matches the score saved
- **Dashboard shows rolling performance** — traders can see "how was the last 7 days" vs. "all time"
- **Playbook shows setup health** — red/yellow/green at a glance without opening each setup
- **Tags are manageable** — rename, merge duplicates, remove stale tags
- **Review filters persist** across navigation — no more "where was that filtered view I had?"

---

## Estimated Duration & Effort

| Group | Tasks | Effort | Priority |
|---|---|---|---|
| A — Reviews & Discipline | TASK-031, TASK-011 | 6h | P1 — ship first |
| B — Rate Limiter Hardening | lib/rate-limiter.ts, TD-029–032 | 6h | P1 — security/quality |
| C — Analytics Visualization | TASK-073, TASK-064 | 6h | P2 — high user value |
| D — AI Reliability | TASK-058, TASK-060 | 6h | P1 — correctness |
| E — Personalization | TASK-051, URL persistence | 6h | P2 |
| F — Accessibility (stretch) | TASK-070 | 4h | P2 — defer if over budget |
| **Total (primary)** | | **30h** | |
| **Total (with stretch)** | | **34h** | |
| **Buffer** | | 6–10h | QA, regression, docs |

**Recommended pacing:**
- Day 1–2: Group A (TASK-031 + TASK-011) — highest user value, clear requirements
- Day 3: Group B (rate-limiter extraction + TD mini-fixes) — fast wins
- Day 4–5: Group C (rolling metrics + setup health) — analytical features
- Day 6–7: Group D (embedding webhook + logger) — infra hardening
- Day 8–9: Group E (tags + URL persistence) — personalization
- Day 10: Group F stretch + QA + documentation

---

## Definition of Done

- All primary Group A–E tasks merged to `claude/epic-darwin-1XZTX`
- TypeScript clean (`tsc --noEmit` passes)
- `npx vitest run` passes with 0 failures (from `src/` directory)
- QA checklist from `QUALITY_GATES.md` completed for each visual feature:
  - Gate 1: Zod/TypeScript schema alignment verified
  - Gate 2: Light and dark mode tested for TASK-031, TASK-073, TASK-064, TASK-051
  - Gate 3: Integration test roundtrip for TASK-011 (score from server matches DB)
  - Gate 4: Security review for TASK-058 (webhook secret) and rate-limiter
- `docs/SPRINT_7_COMPLETION_REPORT.md` created on sprint close
- `docs/backlog.md` updated: TASK-031, TASK-011, TASK-051, TASK-073, TASK-064 marked DONE
- `docs/technical-debt.md` updated: TD-002, TD-029–TD-033 marked Closed Sprint 7

---

## Pre-Sprint Checklist

- [ ] Upstash Redis account provisioned (or decision to defer Redis to post-Sprint 7)
- [ ] Supabase webhook accessible in the project (verify database webhooks tab)
- [ ] `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` added to env
- [ ] `SUPABASE_WEBHOOK_SECRET` generated and added to env
- [ ] Confirm `NuevaReviewModal` accepts `isEditMode: boolean` and `reviewId?: string` props (Sprint 4 added these; verify they exist)
- [ ] Confirm `weeklyReviews.update` tRPC mutation exists and accepts full review payload

---

**Document Prepared:** 2026-06-03  
**Sprint:** 7 (Weeks 19–22)  
**Planned Tests:** 407 baseline → target 420+ (new tests for edit/delete, discipline formula, rate-limiter, rolling metrics)
