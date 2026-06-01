# Master Remediation Plan — Trading Journal v2

> **Generated:** 2026-05-31  
> **Sources:** repository-audit-report · product-gap-analysis · feature-opportunities · ai-architecture-recommendations · personalization-roadmap · ux-improvement-roadmap  
> **Total tasks:** 53 (TASK-001 – TASK-053)

---

## Executive Summary

| Priority | Count | Estimated Effort |
|---|---|---|
| P0 | 10 | ~12 days |
| P1 | 17 | ~28 days |
| P2 | 16 | ~34 days |
| P3 | 10 | ~50+ days |
| **Total** | **53** | **~124+ days** |

**Critical path:** Profile backend (TASK-006) is the single biggest blocker — 7 other tasks depend on it directly (AI config, personalization, goal setting, data export, delete account, notification prefs, CSV mapping). Fix P0 data-integrity bugs first (TASK-001–005), then unblock the profile.

**Key risks:**
1. TASK-001 (KPIs on paginated data) affects every user with >50 trades — metrics shown are silently wrong today.
2. TASK-002 (phase promotion hardcoded false) corrupts prop-firm traders' workflow.
3. TASK-006 (profile backend) is XL effort; delay cascades into personalization and AI config phases.
4. TASK-027 (formula centralization) must precede any analytics work or fixes diverge again.
5. No CI/CD means regressions ship without detection.

---

## Phase 1 — Critical Bugs & Data Integrity (P0) [~2 weeks]

### Module: Formulas & Calculations

#### TASK-001 — Fix KPI strip calculated over paginated trade data
- **Problem:** `src/app/trades/page.tsx:124–130` computes Win Rate, Net P&L, Avg R from `tradePages?.pages.flatMap(p => p.items)` — only the first page of 50 trades. Users with >50 trades see wrong metrics permanently.
- **Impact:** Every user with a history > 50 trades sees incorrect Win Rate and P&L on the /trades page.
- **Files:** `src/app/trades/page.tsx`, `src/server/trpc/routers/trades.ts`
- **Acceptance criteria:** KPI strip pulls aggregate values from a server-side procedure (reuse `dashboardStats` or `stats`) regardless of how many trades exist. Add unit test asserting correctness with >50 trades.
- **Effort:** S | **Dependencies:** none

#### TASK-005 — Unify win criterion (`pnl > 0`) across all calculation sites
- **Problem:** `/trades/page.tsx` uses `rMultiple > 0`; dashboard uses `pnl > 0`. Same user sees different win rates on two screens for the same period.
- **Impact:** Trust erosion; two contradictory win rates.
- **Files:** `src/app/trades/page.tsx:125`, `src/domains/analytics/services/dashboard-analytics.ts:97`
- **Acceptance criteria:** Single `isWin(trade)` helper in `src/lib/trading-formulas.ts`; all 8 call sites import it; win rate is identical on both pages.
- **Effort:** XS | **Dependencies:** TASK-027 (add helper to trading-formulas)

#### TASK-027 — Centralize financial formulas in `lib/trading-formulas.ts`
- **Problem:** Win Rate has 8 separate inline implementations. Discipline Score has 3. Sharpe Ratio is re-implemented in `ai-context.ts:185` with a different std-dev formula than `lib/formulas.ts:42`. Any rule change requires updating N files; one known inconsistency already exists.
- **Impact:** Silent metric divergence; discipline score shown during review creation differs from server-computed score.
- **Files:** `src/lib/formulas.ts`, `src/domains/analytics/services/dashboard-analytics.ts`, `src/server/trpc/routers/trades.ts`, `src/server/trpc/routers/weekly-reviews.ts`, `src/app/dashboard/tabs/tab-disciplina.tsx` (create-review-modal inline), `src/domains/analytics/ai-context.ts`, `src/domains/trading/services/account-service.ts`, `src/lib/trading-formulas.ts` (new)
- **Acceptance criteria:** `lib/trading-formulas.ts` exports `calcWinRate`, `calcDrawdownPct`, `calcDisciplineScore`, `isWin`; all 8 win-rate sites and 3 discipline-score sites replaced with imports; `ai-context.ts` calls `calcSharpeRatio` from formulas. Zero duplicate implementations.
- **Effort:** M | **Dependencies:** none

#### TASK-028 — Fix misleading "Drawdown" label on trades page
- **Problem:** The "Drawdown" KPI on `/trades` page is labeled "peor día" but actually shows `minDay` = minimum single-day P&L. This is not a drawdown metric.
- **Impact:** Prop-firm traders relying on drawdown tracking see wrong data.
- **Files:** `src/app/trades/page.tsx:131–170`
- **Acceptance criteria:** Label renamed to "Peor día"; real drawdown metric using `computeMaxDrawdown` added as separate KPI or existing KPI replaced with accurate calculation.
- **Effort:** XS | **Dependencies:** none

#### TASK-029 — Fix inconsistent drawdown in `use-account-stats.ts`
- **Problem:** `src/app/cuentas/hooks/use-account-stats.ts:50` computes current drawdown from ATH (resets to zero after a new equity high), not historical max drawdown. This is misleading for prop-firm drawdown limit tracking.
- **Impact:** Account cards show a misleadingly low drawdown after any new equity high.
- **Files:** `src/app/cuentas/hooks/use-account-stats.ts:50`, `src/domains/trading/services/account-service.ts`
- **Acceptance criteria:** `use-account-stats.ts` uses `computeMaxDrawdown` from domain service; if current-DD is also needed, it is labeled distinctly ("Drawdown actual desde ATH").
- **Effort:** XS | **Dependencies:** none

### Module: Accounts & Prop-Firm

#### TASK-002 — Fix `objectiveMet = false` hardcoded in phase promotion modal
- **Problem:** `src/app/cuentas/modals/promote-phase-modal.tsx:41` — `objectiveMet = false` hardcoded. Every prop-firm phase promotion shows "objective not met."
- **Impact:** Breaks the prop-firm promotion workflow; traders must ignore a false warning.
- **Files:** `src/app/cuentas/modals/promote-phase-modal.tsx:41`
- **Acceptance criteria:** `objectiveMet` compares `account.netPnl` against `account.targetPct * initialBalance`. Modal shows correct state. Tested with a mock account at 0%, 50%, and 100% of target.
- **Effort:** XS | **Dependencies:** none

#### TASK-003 — Replace `throw new Error()` with `TRPCError` in `accounts.changeStatus`
- **Problem:** `src/server/trpc/routers/accounts.ts:~82` throws a plain `Error` instead of `TRPCError`. Client receives a generic 500 with no structured code.
- **Impact:** Error handling on the frontend cannot distinguish account-status errors from server crashes.
- **Files:** `src/server/trpc/routers/accounts.ts:~82`
- **Acceptance criteria:** All `throw new Error()` in the router replaced with `throw new TRPCError({ code: "BAD_REQUEST", message: "..." })`. Client-side error boundaries receive structured codes.
- **Effort:** XS | **Dependencies:** none

### Module: Data Import

#### TASK-004 — Calculate `rMultiple` in MT4/cTrader CSV import
- **Problem:** `src/app/api/import/mt4/route.ts` sets `rMultiple: null` for all imported trades. Avg R, Expectancy R, and Sharpe Ratio are silently corrupted for any user who imports trades.
- **Impact:** All imported trades have null R-multiple; R-based analytics are wrong.
- **Files:** `src/app/api/import/mt4/route.ts`
- **Acceptance criteria:** `rMultiple` calculated as `(closePrice - entry) / |entry - stop|` for LONG (negated for SHORT) when entry and stop are present in the CSV. Falls back to null only when stop is absent. Add unit test.
- **Effort:** XS | **Dependencies:** none

### Module: Security

#### TASK-016 — Harden `CRON_SECRET` check in edge function
- **Problem:** `src/supabase/functions/weekly-learning-summary/index.ts:~30` — if `CRON_SECRET` is an empty string, all requests are allowed (bypass mode). If deployed without the variable configured, the endpoint is open.
- **Impact:** Unauthenticated access to the edge function trigger.
- **Files:** `src/supabase/functions/weekly-learning-summary/index.ts:~30`
- **Acceptance criteria:** Function rejects with 401 if `CRON_SECRET` env var is missing or empty; a test request without the header returns 401. Document the variable in `.env.example`.
- **Effort:** XS | **Dependencies:** none

#### TASK-017 — Server-side validation for Storage image uploads
- **Problem:** Setup images are uploaded directly from the client in `src/app/playbook/page.tsx` with no server-side MIME type or size validation.
- **Impact:** Arbitrary file types and unlimited file sizes can be written to Supabase Storage.
- **Files:** `src/app/playbook/page.tsx`, new Route Handler `src/app/api/upload/setup-image/route.ts`
- **Acceptance criteria:** Uploads go through a Route Handler that validates MIME type (image/jpeg, image/png, image/webp) and max size (5 MB). Invalid uploads return 400. Original client-side upload path removed.
- **Effort:** S | **Dependencies:** none

---

## Phase 2 — High Impact Completions (P1) [~4 weeks]

### Module: Profile & Settings

#### TASK-006 — Implement profile backend (router + page)
- **Problem:** `src/app/perfil/page.tsx` has zero tRPC calls. All 14 fields are `useState` with hardcoded defaults. "Guardar cambios", "Cerrar sesión", "Borrar cuenta", "Exportar datos" have no handlers. 0/14 fields propagate to the rest of the app. "Borrar cuenta" is a legal risk (GDPR-equivalent).
- **Impact:** Users cannot save any profile data. The entire settings surface is non-functional.
- **Files:** `src/server/trpc/routers/profile.ts` (new), `src/app/perfil/page.tsx`, `src/server/trpc/root.ts`
- **Acceptance criteria:** `profile.get` returns User fields. `profile.update` persists name, timezone, language, baseCurrency, emailNotifications, weeklyGoalMinutes. `profile.changePassword` calls Supabase Auth. `profile.exportData` returns JSON of all user data. `profile.deleteAccount` triggers confirmation dialog, deletes user data, logs out. All buttons functional. Timezone propagates to session classification.
- **Effort:** L | **Dependencies:** none

#### TASK-030 — Implement `UserPreferences` table and router
- **Problem:** No persistence for theme choice (beyond dark/light), dashboard tab, chart grain, KPI order, or any UI preferences. Settings reset on page reload.
- **Impact:** Every personalization feature is blocked without a preferences store.
- **Files:** `src/prisma/schema.prisma`, new migration, `src/server/trpc/routers/preferences.ts` (new)
- **Acceptance criteria:** `UserPreferences` model added to schema with fields from personalization-roadmap (theme, accentHue, colorScheme, defaultTab, kpiOrder, kpiHidden, defaultGrain, tableDensity, dateFormat, numberLocale). `preferences.get` and `preferences.update` procedures implemented and connected from `perfil` page.
- **Effort:** M | **Dependencies:** TASK-006

### Module: Weekly Reviews

#### TASK-009 — Fix weekTrades and account stats based on first 50 trades only
- **Problem:** `src/app/reviews/page.tsx` filters `weekTrades` from `trades.list` (max 50). `src/app/cuentas/page.tsx` uses `useAccountStats` from `trpc.trades.list.useQuery()` (not infinite). Both have incorrect stats in high-volume weeks/accounts.
- **Impact:** Weekly review statistics incomplete for active traders; account KPIs wrong for accounts with >50 trades.
- **Files:** `src/app/reviews/page.tsx`, `src/app/cuentas/page.tsx`, `src/server/trpc/routers/trades.ts`
- **Acceptance criteria:** Reviews page fetches trades for the specific week using a date-range query (not paginated list). Account stats use `dashboardStats` or a dedicated aggregate endpoint. Both verified correct with a mocked dataset of 100+ trades.
- **Effort:** S | **Dependencies:** none

#### TASK-031 — Add Edit and Delete buttons to ReviewDetailPanel
- **Problem:** `src/app/reviews/components/review-detail-panel.tsx` is read-only. `weeklyReviews.update` procedure exists but is never called. Users cannot fix errors in saved reviews or continue editing drafts.
- **Impact:** Draft workflow is broken; submitted reviews with errors cannot be corrected.
- **Files:** `src/app/reviews/components/review-detail-panel.tsx`, `src/app/reviews/page.tsx`, `src/components/modals/create-review-modal.tsx`
- **Acceptance criteria:** Edit button opens `NuevaReviewModal` in edit mode pre-filled with review data. Save calls `weeklyReviews.update`. Delete button with confirmation calls `weeklyReviews.delete`. "Last edited" timestamp shown in panel header.
- **Effort:** M | **Dependencies:** none

### Module: AI Configuration

#### TASK-032 — Update stale AI model IDs in config
- **Problem:** `src/lib/ai/config.ts:~40` returns `claude-sonnet-4-5` for coach model (current is `claude-sonnet-4-6`). `getWeeklySummaryModel()` returns `claude-haiku-4-5-20251001` — a non-standard model ID.
- **Impact:** AI coach runs on an older model; summary model ID may fail silently.
- **Files:** `src/lib/ai/config.ts`
- **Acceptance criteria:** `getCoachModel()` returns `claude-sonnet-4-6`. Summary model ID verified against Anthropic's current API; updated to valid ID. Change tested by triggering a coach message.
- **Effort:** XS | **Dependencies:** none

#### TASK-033 — Implement AI configuration UI and `UserAiConfig` table
- **Problem:** All API keys are server-wide env vars. No per-user key storage, model selection, connectivity test, or cost tracking exists.
- **Impact:** Blocks multi-tenant/BYOK model; no user control over AI cost.
- **Files:** `src/prisma/schema.prisma`, `src/server/trpc/routers/ai-config.ts` (new), `src/lib/ai/key-encryption.ts` (new), `src/lib/ai/config.ts`, `src/app/perfil/page.tsx`, `src/app/api/ai-test/route.ts` (new)
- **Acceptance criteria:** `UserAiConfig` model in schema. `aiConfig.get/update/testConnection/getUsage` procedures. Profile page "Inteligencia Artificial" section with masked key inputs, model selectors, connection test button, and usage display. Keys encrypted at rest with AES-256-GCM. `AI_KEY_ENCRYPTION_KEY` documented in `.env.example`.
- **Effort:** L | **Dependencies:** TASK-006, TASK-032

### Module: Psychology Tracking

#### TASK-034 — Add per-trade psychology fields to Trade model
- **Problem:** `Trade` model has no structured psychology fields. FOMO, revenge, and impulse flags are buried in free-form `tags: String[]`, preventing reliable counting.
- **Impact:** No structured analytics on emotional state vs. trade outcomes.
- **Files:** `src/prisma/schema.prisma`, migration, `src/server/trpc/routers/trades.ts`, `src/components/modals/register-trade-modal.tsx`, `src/components/modals/edit-trade-modal.tsx`
- **Acceptance criteria:** Schema adds `emotionBefore String?`, `confidenceRating Int?`, `executionQuality Int?`, `fomoFlag Boolean @default(false)`, `revengeFlag Boolean @default(false)`. Trade registration modal has collapsible "Psicología" section with these fields. Dashboard analytics exposes emotion vs. win-rate breakdown.
- **Effort:** M | **Dependencies:** none

### Module: UX & Feedback

#### TASK-035 — Implement toast notification system
- **Problem:** All mutations (create trade, save review, update account, toggle rule) succeed or fail silently. No visual feedback exists for any user action.
- **Impact:** Users cannot tell if an action succeeded or why it failed.
- **Files:** `src/app/layout.tsx`, `src/components/ui/toaster.tsx` (new), all mutation `onSuccess`/`onError` callbacks across trade, review, account, rule modals
- **Acceptance criteria:** Sonner or Radix Toast integrated in app shell. Success toast for: trade created, trade closed, trade deleted, review saved, account updated, rule toggled. Error toast on any mutation `onError`. Toasts auto-dismiss at 4s.
- **Effort:** M | **Dependencies:** none

#### TASK-036 — Fix dead "Ver registro →" button in Disciplina tab
- **Problem:** `src/app/dashboard/tabs/tab-disciplina.tsx:152` — button has no `onClick` handler.
- **Impact:** Dead UI element visible to all users.
- **Files:** `src/app/dashboard/tabs/tab-disciplina.tsx:152`
- **Acceptance criteria:** Button navigates to `/trades` filtered by current week date range, or is removed if no valid destination.
- **Effort:** XS | **Dependencies:** none

#### TASK-037 — Fix `generateSummary` error handling (HTTP 200 on failure)
- **Problem:** `src/server/trpc/routers/weekly-reviews.ts:232–317` — `generateSummary` mutation returns `{ error: "GENERATION_FAILED" }` with HTTP 200 on failure. Client must inspect payload; standard tRPC error handling doesn't catch it.
- **Impact:** Error states in the weekly review UI are unreliable.
- **Files:** `src/server/trpc/routers/weekly-reviews.ts:232–317`
- **Acceptance criteria:** On generation failure, procedure throws `TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" })`. Client `onError` handler shows toast with message.
- **Effort:** XS | **Dependencies:** TASK-035

#### TASK-038 — Fix `learningResources.stats` CQRS violation
- **Problem:** `src/server/trpc/routers/learning-resources.ts:~400` — `stats` query procedure auto-transitions resources from `MASTERED` → `IN_REVIEW` as a side effect. A query that mutates data violates CQRS and makes caching unsafe.
- **Impact:** Unpredictable state changes triggered by read operations; cache invalidation bugs.
- **Files:** `src/server/trpc/routers/learning-resources.ts:~400`
- **Acceptance criteria:** The state transition logic moved to a separate `learningResources.processDecayTransitions` mutation. `stats` procedure is read-only. No behavioral change for the user.
- **Effort:** S | **Dependencies:** none

#### TASK-039 — Fix N+1 query in `resourceImpactRanking`
- **Problem:** `src/server/trpc/routers/learning-resources.ts:~350` iterates resources × setups launching 2 Prisma queries per pair. For 20 resources × 10 setups = 400 DB queries per request.
- **Impact:** Severe performance degradation for users with populated learning catalogs.
- **Files:** `src/server/trpc/routers/learning-resources.ts:~350`
- **Acceptance criteria:** Replaced with a single aggregated query using `groupBy` or raw SQL. Query count measured before/after; must be O(1) queries regardless of catalog size.
- **Effort:** M | **Dependencies:** none

#### TASK-040 — Add mobile back navigation to detail panels
- **Problem:** On mobile, trade/review/account detail panels open full-screen with no back button or swipe gesture. Users are stranded.
- **Impact:** Mobile users cannot navigate back without finding the X button.
- **Files:** `src/app/reviews/components/review-detail-panel.tsx`, `src/app/trades/components/trade-detail-panel.tsx`, `src/app/cuentas/components/account-detail-panel.tsx`
- **Acceptance criteria:** All detail panels show a back arrow on screens < 768px. Pressing it closes the panel. Escape key also closes the panel on desktop.
- **Effort:** S | **Dependencies:** none

---

## Phase 3 — UX & Improvements (P2) [~6 weeks]

### Module: Mobile & Responsiveness

#### TASK-041 — Add `inputmode="decimal"` to price inputs in trade form
- **Problem:** Price/size inputs in `register-trade-modal.tsx` use `type="text"`, not `type="number"` with `inputmode="decimal"`. Mobile users get the wrong keyboard.
- **Files:** `src/components/modals/register-trade-modal.tsx`
- **Acceptance criteria:** All numeric price/size/stop/target inputs have `type="number"` and `inputmode="decimal"`. iOS shows decimal keyboard. Effort: XS.

#### TASK-042 — Add skeleton screens for loading states
- **Problem:** Dashboard and account cards show "Cargando…" text or a bare spinner. No content-shaped skeletons exist.
- **Files:** `src/app/dashboard/page.tsx`, `src/app/trades/page.tsx`, `src/app/cuentas/page.tsx`, `src/components/skeletons/` (new)
- **Acceptance criteria:** KPI strip, trade table, and account cards have `animate-pulse` skeleton screens. "Cargando…" text eliminated from main data views. Effort: M.

#### TASK-043 — Add empty states for Cuentas, Trades, Playbook, Mercados
- **Problem:** Four pages show blank space when no data exists. New users see no guidance or CTA.
- **Files:** `src/app/cuentas/page.tsx`, `src/app/trades/page.tsx`, `src/app/playbook/page.tsx`, `src/app/mercados/page.tsx`
- **Acceptance criteria:** Each page has an empty state with icon, headline, descriptive text, and primary CTA (create first item). Effort: M.

#### TASK-044 — Fix `window.location.reload()` in error boundaries
- **Problem:** `src/app/dashboard/error.tsx` calls `window.location.reload()` instead of `reset()` from the Next.js error boundary. This is a SPA antipattern that discards all query cache.
- **Files:** `src/app/dashboard/error.tsx`
- **Acceptance criteria:** Error boundary calls `reset()` prop. No `window.location.reload()` in any error handler. Effort: XS.

### Module: Personalization

#### TASK-045 — Three-way theme toggle (add "system" mode)
- **Problem:** Only binary dark/light toggle exists. OS preference is not respected.
- **Files:** `src/components/theme-provider.tsx`
- **Acceptance criteria:** Theme options: light / dark / system. System mode listens to `prefers-color-scheme` media query and updates automatically. Preference persisted to `UserPreferences.theme`. Effort: S.

#### TASK-046 — Accent color picker and colorblind mode
- **Problem:** Accent color is hardcoded to `oklch(58% 0.16 264)`. No colorblind mode exists.
- **Files:** `src/app/globals.css`, `src/components/theme-provider.tsx`, `src/app/perfil/page.tsx`
- **Acceptance criteria:** Accent hue slider (0–360) in profile. CSS custom property `--accent-hue` injected on `<html>` from user preference. Colorblind mode options (default / deuteranopia / monochrome) with preset hue overrides. Effort: M.

#### TASK-047 — Persistent dashboard tab and chart grain
- **Problem:** Dashboard tab and chart grain reset to defaults on every page reload.
- **Files:** `src/app/dashboard/page.tsx`
- **Acceptance criteria:** Last active tab persisted to `localStorage("tj-dashboard-tab")` or `UserPreferences.defaultTab`. Chart grain persisted similarly. Effort: XS.

#### TASK-048 — Weekly review filtering and search
- **Problem:** Reviews list has no search or filtering. Multi-account traders cannot filter by account. With 52+ reviews, finding a specific week requires scrolling.
- **Files:** `src/app/reviews/page.tsx`, `src/server/trpc/routers/weekly-reviews.ts`
- **Acceptance criteria:** Search bar filters by week label and date. Filter by account. Filter by status (draft/submitted). Filter by discipline score range. Effort: M.

#### TASK-049 — Playbook sparklines with real data
- **Problem:** `src/app/playbook/page.tsx:276–279` — `SparklinePlaceholder` is hardcoded "— sin trades." Real equity-by-setup data exists in `dashboard-analytics.ts`.
- **Files:** `src/app/playbook/page.tsx`, `src/domains/analytics/services/dashboard-analytics.ts`
- **Acceptance criteria:** Setup cards and drawers show real equity sparklines from `setupStats[].equityCurve`. Placeholder removed. Effort: M.

#### TASK-050 — Goal setting and dashboard widget
- **Problem:** `weeklyGoalMinutes` field exists in DB but is never surfaced. No weekly goal system exists.
- **Files:** `src/prisma/schema.prisma`, `src/app/perfil/page.tsx`, `src/app/dashboard/page.tsx`
- **Acceptance criteria:** Schema adds `weeklyTradesGoal Int?`, `weeklyPnlGoal Decimal?`, `disciplineGoal Int?`. Profile has goal configuration UI. Dashboard shows "Mis metas" widget with progress rings for current-week goals. Effort: M.

#### TASK-051 — Custom tags management UI
- **Problem:** Tags are free-form strings with no management. Users accumulate duplicates ("fomo", "FOMO", "Fear/FOMO"). No tag categories or colors.
- **Files:** `src/app/perfil/page.tsx`, `src/types/index.ts`, `src/server/trpc/routers/` (new tags router or extend rules)
- **Acceptance criteria:** Profile section lists all user tags grouped by category. Users can rename, delete, and color-code tags. Tag merge functionality for duplicates. Effort: M.

### Module: Code Quality

#### TASK-011 — Extract `computeDisciplineScore` as shared function
- **Problem:** Discipline score calculated in 3 places: `weekly-reviews.ts:computedDisciplineScore`, `weekly-reviews.ts:prefill`, and `create-review-modal.tsx:103` (frontend uses simplified formula). Score shown in modal can differ from server score.
- **Files:** `src/server/trpc/routers/weekly-reviews.ts`, `src/components/modals/create-review-modal.tsx`, `src/lib/trading-formulas.ts`
- **Acceptance criteria:** Single `computeDisciplineScore(params)` exported from `lib/trading-formulas.ts`. All 3 sites replaced with imports. Unit test verifies identical output for same input. Effort: S.

#### TASK-013 — Eliminate `as never` type casts in trades/page.tsx
- **Problem:** `src/app/trades/page.tsx:227–371` has 15+ `as never` casts due to mismatch between `SerializedTrade` and component prop types.
- **Files:** `src/app/trades/page.tsx`, `src/components/trade-detail-panel.tsx`, `src/components/modals/edit-trade-modal.tsx`
- **Acceptance criteria:** Zero `as never` in application code. Types unified using `RouterOutputs["trades"]["list"]["items"][0]`. TypeScript strict passes without suppressions. Effort: M.

#### TASK-014 — Unify `LearningResource` type with `RouterOutputs`
- **Problem:** `src/types/index.ts:~90` defines `LearningResource` manually, partially duplicating `RouterOutputs["learningResources"]["list"][0]`. Forces `as unknown as LearningResource[]` casts in `aprendizaje/page.tsx`.
- **Files:** `src/types/index.ts`, `src/app/aprendizaje/page.tsx`
- **Acceptance criteria:** Manual `LearningResource` interface removed from `types/index.ts`. All usages derive from `RouterOutputs`. Zero `as unknown as` casts in `aprendizaje/page.tsx`. Effort: S.

#### TASK-052 — Onboarding checklist for new users
- **Problem:** New users land on an empty dashboard with no guidance. No first-run experience exists.
- **Files:** `src/app/dashboard/page.tsx`, `src/prisma/schema.prisma` (add `onboardingCompletedAt DateTime?`), `src/components/onboarding/` (new)
- **Acceptance criteria:** First-login users see a dismissable checklist widget (5 steps: create account, add setup, first trade, complete profile, first review). Steps auto-complete when data exists. Widget disappears after all steps done or "Skip" clicked. Effort: M.

---

## Phase 4 — Future Vision (P3) [~ongoing]

#### TASK-019 — Add `notes_embedding` and `email_log` to Prisma schema
- Effort: S | Add `TradeEmbedding` model or documented SQL migration for `notes_embedding vector(1536)`. Add `EmailLog` model mirroring the edge function's table structure.

#### TASK-020 — Cursor pagination for `accountLogs.list`
- Effort: S | Replace `take: 50` hardcoded with cursor-based pagination matching pattern used by `trades.list`.

#### TASK-021 — Activate `ANALYTICS_CACHE_ENABLED` in production
- Effort: XS | Document the feature flag. Set default to `true` in production environment. Document TTL behavior.

#### TASK-022 — Configure verified email domain in Resend
- Effort: XS | Replace `noreply@resend.dev` with `noreply@<verified-domain>` in edge function. Add `FROM_EMAIL` to `.env.example`.

#### TASK-023 — Type `market: any` and `amount: any` props
- Effort: XS | `MarketCard` in `mercados/page.tsx:68` and withdrawal type in `retiros/page.tsx:116–117` replaced with `RouterOutputs`-derived types.

#### TASK-024 — React Testing Library component tests
- Effort: L | Add tests for: create trade flow, close trade, weekly review form, account phase promotion.

#### TASK-025 — Playwright e2e smoke tests
- Effort: L | Implement tests for: login, create trade, navigate dashboard, create weekly review.

#### TASK-026 — Fix error message mismatch in `ai-coach/route.ts:106`
- Effort: XS | `{ error: "BAD_REQUEST" }` with `status: 500` — align message to status code.

#### TASK-053 — Multi-account portfolio dashboard
- Effort: XL | Portfolio-level KPI aggregation, cross-account equity curve, portfolio drawdown. Depends on analytics service foundation.

---

## Execution Order (Optimal Sequence)

1. TASK-003 (TRPCError — 2 hours, zero-risk)
2. TASK-026 (ai-coach error — 1 hour)
3. TASK-016 (CRON_SECRET security — 2 hours)
4. TASK-002 (phase promotion — 4 hours)
5. TASK-004 (rMultiple import — 4 hours)
6. TASK-028 + TASK-029 (drawdown labels/calc — 2 hours)
7. TASK-027 (formula centralization — unblocks TASK-005, TASK-011)
8. TASK-005 (win criterion unification — 1 hour after TASK-027)
9. TASK-001 (KPI strip fix — 1 day)
10. TASK-017 (upload validation — 0.5 day)
11. TASK-009 (weekTrades + account stats — 1 day)
12. TASK-036 + TASK-037 + TASK-044 (dead UI fixes — 0.5 day total)
13. TASK-006 (profile backend — 3–5 days, unblocks 7 tasks)
14. TASK-030 (UserPreferences — 2 days, after TASK-006)
15. TASK-032 (AI model IDs — 1 hour)
16. TASK-035 (toast system — 2–3 days)
17. TASK-038 + TASK-039 (learning resources bugs — 2 days)
18. TASK-031 (review edit/delete — 2–3 days)
19. TASK-040 (mobile back nav — 1 day)
20. TASK-034 (psychology fields — 4–5 days)
21. TASK-033 (AI config UI — 8–10 days, after TASK-006)
22. TASK-013 + TASK-014 + TASK-023 (type safety — 2 days)
23. TASK-011 (discipline score shared — 0.5 day)
24. TASK-041–051 (UX improvements — per-task)

## Dependency Graph

```
TASK-027 ─────────────────┬────► TASK-005
                           └────► TASK-011

TASK-006 (profile backend)─┬────► TASK-030 (UserPreferences)
                            ├────► TASK-033 (AI config UI)
                            ├────► TASK-045 (system theme)
                            ├────► TASK-046 (accent color)
                            ├────► TASK-050 (goal setting)
                            └────► TASK-051 (custom tags)

TASK-035 (toast system) ──────────► TASK-037 (review error handling)

TASK-032 (model IDs) ─────────────► TASK-033 (AI config UI)

TASK-004 (rMultiple) ─────────────► TASK-001 (KPI strip, correct R data)

TASK-019 (schema sync) ───────────► TASK-053 (portfolio dashboard)
```

## Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| TASK-006 scope creep | High | High | Timebox: profile backend only; AI config and preferences are separate tasks |
| Formula centralization breaks existing tests | Medium | Medium | Wrap in `lib/trading-formulas.ts` as re-exports first; swap call sites incrementally |
| Schema migrations break staging | Medium | High | Test all migrations on a Supabase branch before applying to production |
| AI model IDs become invalid again | High | Low | Pin to canonical IDs; add integration test that pings AI provider in CI |
| No CI/CD means regressions ship | High | High | Set up GitHub Actions with lint + typecheck + unit tests as first infra task |
