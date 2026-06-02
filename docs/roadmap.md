# Roadmap — Trading Journal v2

> **Last Updated: 2026-06-02**  
> Merges the existing ROADMAP.md (Phases 0–5) with the master-remediation-plan phased execution plan and new feature initiatives through Phase XIV.

---

## Vision Statement

A privacy-first, single-tenant trading journal that functions as a personal trading coach: capturing every trade with context, surfacing behavioral patterns through analytics, reinforcing learning via spaced repetition, and providing AI-powered insights — all from a trader's own data without any third-party data exposure.

---

## Current State Summary

### What Is Implemented (Phases I–IX)

| Phase | Status | Key Deliverables |
|---|---|---|
| Phase 0 — Foundation & Security | ✅ Complete | RLS, auth, data-correctness baseline |
| Phase I — Learning System | ✅ Complete | Spaced repetition, decay detection, materialized streak, email idempotence, list view |
| Phase II — Trade Core | ✅ Complete | Trade CRUD, TradeEvent immutable trail, tRPC routers |
| Phase III — Account Management | ✅ Complete | Prop firm accounts, phase management, AccountLog trail |
| Phase IV — Analytics (Server-side) | ✅ Complete | `trades.dashboardStats`, dashboard-analytics service, TradeStatsCache (feature-flagged) |
| Phase V — Psychology Foundation | ✅ Complete | TradeChecklistResult, TradingSessionLog (pre-session mood), tag system |
| Phase VI — Playbook | ✅ Complete | Setup catalog, SetupVersion snapshots, A+/standard checklists |
| Phase VII — Weekly Reviews | ✅ Complete | Weekly review creation, AI summary generation, draft/submitted states |
| Phase VIII — Edge Definitions | ✅ Complete | expectedWr, expectedAvgR, minR, maxR on Setup model |
| Phase IX — Import & AI Coach | ✅ Complete | MT4/cTrader CSV import, AI coach streaming, pgvector embeddings |

### Known Production Issues as of 2026-06-02

- ~~Profile page entirely non-functional (0/14 fields saved)~~ ✅ Fixed Sprint 3 (TASK-006)
- ~~Phase promotion modal always shows "objective not met" (hardcoded false)~~ ✅ Fixed Sprint 2 (TASK-002)
- ~~Drawdown KPI label on `/trades` mislabeled "Drawdown"~~ ✅ Fixed Sprint 2 (TASK-028; now shows "Peor día")
- ~~AI coach model ID stale~~ ✅ Fixed Sprint 2 (TASK-015: updated to `claude-sonnet-4-6`)
- ~~Sharpe Ratio in `ai-context.ts` uses population std dev~~ ✅ Fixed Sprint 2 (TD-011: now uses Bessel-corrected formula)
- ~~KPIs on `/trades`, `/reviews`, and `/cuentas` calculated over max 50 trades~~ ✅ Fixed Sprint 1
- ~~8 separate win-rate implementations~~ ✅ Fixed Sprint 1 (win rate); discipline score deferred to Sprint 5
- ~~CRON_SECRET security bypass in edge function~~ ✅ Fixed Sprint 1
- ~~rMultiple null on all CSV-imported trades~~ ✅ Fixed Sprint 1
- **Remaining:** 6 Minor findings + 4 Nitpick findings + 13 open technical debt items (deferred to future sprints)

---

## Phase X — Stability & Foundations (P0) ✅ CLOSED 2026-06-01 [Sprint 1]

**Objective:** Eliminate all data-integrity bugs, security risks, and formula inconsistencies. No incorrect metrics anywhere in the application.

**Result:** 9/12 planned tasks completed. 3 deferred to Sprint 2 (TASK-002, TASK-026, TASK-028, completed in Sprint 2). TASK-001 and TASK-009 pulled forward from Sprint 2 and completed in Sprint 1. QA audit identified and fixed 1 Blocking bug (B-001), 3 Major issues (M-001–003), 3 Minor issues (N-001–003), 3 Nitpicks (NP-001–003). Test suite: 229/232 → 232/232.  
**Docs:** `docs/SPRINT_1_QA_REPORT.md` · `docs/SPRINT_1_FIX_REPORT.md` · `docs/SPRINT_1_RETROSPECTIVE.md`

### X-A — Formula Unification

**TASK-027:** Create `src/lib/trading-formulas.ts` as the single source of truth.
- Export: `calcWinRate`, `isWin`, `calcDrawdownPct`, `calcDisciplineScore`, `calcSharpeRatio` (canonical)
- Replace 8 win-rate sites, 3 discipline-score sites, 2 Sharpe sites
- Fix: `ai-context.ts:185` re-implements Sharpe with different std-dev formula than `lib/formulas.ts:42`

**TASK-005:** Unify win criterion to `pnl > 0` everywhere. Currently `/trades` uses `rMultiple > 0` and dashboard uses `pnl > 0` — same user sees different win rates on two screens.

**TASK-028:** Rename "Drawdown" KPI on trades page to "Peor día" (it shows min daily P&L, not a drawdown metric).

**TASK-029:** Fix `use-account-stats.ts:50` to use `computeMaxDrawdown` from domain service instead of rolling current-DD calculation that resets after new equity highs.

### X-B — Data Bugs

**TASK-001:** Fix KPI strip on `/trades` page — currently calculated over first 50 paginated trades. Route to `trades.dashboardStats` or `trades.stats` server aggregate.

**TASK-009:** Fix `weekTrades` in `/reviews` and account stats in `/cuentas` — both filtered from paginated `trades.list` (max 50). Use date-range queries instead.

**TASK-002:** Fix `objectiveMet = false` hardcoded at `cuentas/modals/promote-phase-modal.tsx:41`. Compare `account.netPnl` against `account.targetPct * initialBalance`.

**TASK-004:** Calculate `rMultiple` in CSV import (`api/import/mt4/route.ts`). Formula: `(closePrice - entry) / |entry - stop|` for LONG, negated for SHORT.

### X-C — Security

**TASK-016:** Harden CRON_SECRET check in edge function. Reject with 401 if env var is absent or empty string.

**TASK-017:** Route setup image uploads through a server-side Route Handler (`/api/upload/setup-image`) that validates MIME type (jpeg/png/webp) and max size (5 MB).

### X-D — Error Handling

**TASK-003:** Replace `throw new Error()` with `throw new TRPCError({ code: "BAD_REQUEST" })` in `accounts.changeStatus`.

**TASK-026:** Fix `api/ai-coach/route.ts:106` — `{ error: "BAD_REQUEST" }` returned with `status: 500`. Align message with status code.

### Phase X Success Metrics
- Zero pages showing incorrect metrics
- CRON_SECRET bypass eliminated
- All CSV-imported trades have non-null rMultiple
- Formula implementations: Win Rate = 1, Discipline Score = 1, Sharpe = 1

---

## Phase XI — Profile & AI Config (P1) ✅ CLOSED 2026-06-02 [Sprint 3]

**Objective:** Make the profile page fully functional and unblock all personalization and AI configuration features.

**Result:** XI-A (Profile Backend) completed. All 14 user fields persisted. 5 tRPC procedures implemented. 2 Blocking bugs fixed, 7 Major fixes, 3 Minor fixes, 1 Nitpick fix. 24 new tests added (291 → 315). QA audit comprehensive. XI-B (AI Configuration) and XI-C (Learning) deferred to Sprint 4+.

### XI-A — Profile Backend ✅ CLOSED

**TASK-006:** Implemented `src/server/trpc/routers/profile.ts`:
- ✅ `profile.get` — returns all User fields (ISO serialized dates)
- ✅ `profile.update` — persists name, timezone, language, baseCurrency, emailNotifications, weeklyGoalMinutes (B-002: fixed admin client for cache invalidation)
- ✅ `profile.changePassword` — calls Supabase Auth
- ✅ `profile.exportData` — returns JSON of all user data
- ✅ `profile.deleteAccount` — Prisma delete before auth delete via service-role key (B-002 fix: was using anon client)

All 14 fields in `src/app/perfil/page.tsx` connected. Page fully functional. Tests: `profile.test.ts` (18 tests).

**TASK-030:** Implement `UserPreferences` table and `preferences` tRPC router:
```prisma
model UserPreferences {
  userId        String   @id @map("user_id")
  theme         String   @default("system")     // "light" | "dark" | "system"
  accentHue     Int?     @map("accent_hue")     // 0–360 OKLCH
  colorScheme   String   @default("default")    // "default" | "deuteranopia" | "mono"
  defaultTab    String   @default("portfolio")
  kpiOrder      String[] @default([])
  kpiHidden     String[] @default([])
  defaultGrain  String   @default("daily")
  tableDensity  String   @default("comfortable")
  dateFormat    String   @default("DD/MM/YYYY")
  numberLocale  String   @default("es-HN")
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### XI-B — AI Configuration

**TASK-032:** Update `src/lib/ai/config.ts`:
- `getCoachModel()` → `claude-sonnet-4-6`
- `getWeeklySummaryModel()` → verify against Anthropic API; update to valid ID

**TASK-033:** Implement per-user AI configuration:
- `UserAiConfig` model in schema (see `ai-architecture.md` for full spec)
- `src/lib/ai/key-encryption.ts` — AES-256-GCM key encryption
- `src/server/trpc/routers/ai-config.ts` — get/update/testConnection/getUsage
- `src/app/api/ai-test/route.ts` — connectivity test endpoint
- Profile page "Inteligencia Artificial" section with masked key inputs, model selectors, connection test, usage display

### XI-C — Weekly Reviews and Learning

**TASK-031:** Add Edit and Delete buttons to `ReviewDetailPanel`. Re-use `NuevaReviewModal` in edit mode. Call `weeklyReviews.update` mutation. Show "Last edited" timestamp.

**TASK-038:** Fix CQRS violation — move `MASTERED→IN_REVIEW` transition from `learningResources.stats` query to a `processDecayTransitions` mutation.

**TASK-039:** Fix N+1 in `resourceImpactRanking` — replace loop with single aggregated SQL query. O(1) queries regardless of catalog size.

**TASK-034:** Add per-trade psychology fields to Trade model:
```prisma
emotionBefore    String?  // "calm" | "anxious" | "excited" | "fearful" | "overconfident"
confidenceRating Int?     // 1–5
executionQuality Int?     // 1–5
fomoFlag         Boolean  @default(false)
revengeFlag      Boolean  @default(false)
```

### XI-D — UX Foundations

**TASK-035:** Integrate Sonner toast library. Success + error toasts for: trade created/closed/deleted, review saved, account updated, rule toggled.

**TASK-040:** Add back arrow to all detail panels on screens < 768px. Escape key closes panels on desktop.

### Phase XI Success Metrics
- Profile-to-App propagation score: 14/14 (currently 0/14)
- AI coach uses current model ID
- ReviewDetailPanel has edit and delete
- All mutations have visual feedback
- Learning stats procedure is read-only

---

## Phase XI Sprint 4 Closeout — Psychology UI & Personalization (P1/P2) ✅ CLOSED 2026-06-02 [Sprint 4]

**Objective:** Deliver psychology fields, auto-save, week selector expansion, and dashboard persistence. All Major findings from pre-sprint QA audit resolved.

**Result:** 6 tasks completed (TASK-034, 047, 061, 069, 023 partial, 013 partial). 5 Major QA findings fixed. 2 regression tests added. 364 passing tests (+2 from baseline). 6 Minor findings + 4 Nitpick findings deferred to future sprints. Architecture review complete: `Trade` type safety corrected, type consistency maintained, security review passed.

### Sprint 4 Deliverables

**TASK-034:** Per-trade psychology fields — 5 fields (emotionBefore, confidenceRating, executionQuality, fomoFlag, revengeFlag) implemented in Trade model, register/edit modals (collapsible sections), and trade detail panel. All optional, backward compatible. ✅ Complete.

**TASK-061:** Auto-save in weekly review modal (edit mode only) — 2s debounce, "Guardando…/Guardado ✓" indicator. Minor finding: indicator doesn't reset to idle. ✅ Complete.

**TASK-069:** Extended week selector — 8 weeks default, "Ver más" expands to 24 weeks. Minor finding: visual selection lost if collapsed after selecting later week. ✅ Complete.

**TASK-047:** Dashboard tab persistence to UserPreferences — active tab restored across reloads. Minor finding: no error handling on mutation failure. ✅ Complete.

**TASK-023 (partial):** Type safety for `market` and `amount` props — replaced `any` types with proper RouterOutputs. Related major finding (M-01) in mercados page fully resolved. ✅ Complete.

**TASK-013 (partial):** Reduce `as never` casts — 12→4 casts (67% reduction). Remaining 4 annotated as TD-013 (per-field Decimal serialization issue). ✅ 67% Complete.

### QA Audit Findings

| Severity | Count | Status |
|---|---|---|
| Blocking | 0 | — |
| Major | 5 | ✅ All fixed |
| Minor | 6 | 📋 Deferred |
| Nitpick | 4 | 📋 Deferred |

**Major Findings Fixed (5):**
- M-01: `editing` state typed `any` → now `(MarketForm & { id: string }) \| null`
- M-02: `WithdrawalRow` ignored `updating` prop → now wired with per-row state
- M-03: `emotionBefore: ""` empty string sentinel → now `null` across all files
- M-04: Hardcoded drawdown bars (20%/10%) → now styled limit badges
- M-05: Psychology fields required unsafe cast → now direct access via Trade type

**Minor/Nitpick Findings (10 total):** Remain open in docs/SPRINT_4_QA_REPORT.md. Quality of life improvements (UX polish, refactoring) — not blocking correctness or data integrity.

### Sprint 4 Success Metrics

- ✅ All 5 Major findings resolved
- ✅ 364 passing tests (baseline 362 + 2 regression guards)
- ✅ No data integrity bugs
- ✅ No security vulnerabilities introduced
- ✅ Type safety improved: 3 `any` types eliminated, 1 unsafe cast removed
- ✅ Psychology field contract stable and extensible

---

## Phase XII — Psychology & Reviews (P1/P2) [~3 weeks]

**Objective:** Complete psychology tracking and improve review workflow.

### XII-A — Per-Trade Psychology

Surface psychology fields from Phase XI in analytics:
- "emotion vs. win rate" breakdown chart in dashboard
- FOMO flag count per week in discipline tab
- Revenge flag correlation with P&L
- Pre-session mood correlation with trade outcomes (TradingSessionLog already exists)

### XII-B — Review Workflow

**TASK-048:** Add filtering and search to reviews list:
- Search by week label and date range
- Filter by account
- Filter by status (draft/submitted)
- Filter by discipline score range

**TASK-011:** Extract `computeDisciplineScore(params)` into `lib/trading-formulas.ts`. Replace all 3 implementations. Frontend modal shows server-provided value only.

### XII-C — Discipline Score Formula Completion

Replace manual discipline score entry with computed score:
```
disciplineScore =
  (trades without behavioral tags / total trades) × 50   ← execution quality
  + (resources reviewed that week / pending reviews) × 30 ← learning adherence
  + (rules with 0 violations / total enabled rules) × 20  ← rule adherence
```

### Phase XII Success Metrics
- Psychology data available in at least 2 analytics charts
- Discipline score consistent across UI and server
- Reviews filterable by account and date range

---

## Phase XIII — Mobile & UX Polish (P2) [~4 weeks]

**Objective:** Complete mobile experience and UX quality baseline.

### XIII-A — Mobile Polish

**TASK-041:** `inputmode="decimal"` on all price/size inputs in trade form.

**TASK-042:** Skeleton screens for KPI strip, trade table, and account cards (`animate-pulse`).

**TASK-043:** Empty states for Cuentas, Trades, Playbook, Mercados — icon + headline + CTA.

**TASK-044:** Replace `window.location.reload()` in `dashboard/error.tsx` with `reset()` from Next.js error boundary.

**TASK-047:** Persist dashboard tab and chart grain to `localStorage("tj-dashboard-tab")`.

**TASK-049:** Connect real equity sparklines to Playbook setup cards (data already in `setupStats[].equityCurve`).

**TASK-052:** Onboarding checklist for new users — 5 steps: create account, add setup, first trade, complete profile, first review.

### XIII-B — Dashboard Tab Overflow

Fix dashboard tabs overflowing on screens < 375px. Add horizontal scroll with fade indicator.

### XIII-C — Chart Touch Interactions

Enable Recharts touch tooltips (`<Tooltip trigger="click">`) for mobile users.

### XIII-D — Type Safety Completion

**TASK-013:** Eliminate 15+ `as never` casts in `trades/page.tsx` — unify with `RouterOutputs["trades"]["list"]["items"][0]`.

**TASK-014:** Delete manual `LearningResource` interface from `types/index.ts` — derive from RouterOutputs.

### Phase XIII Success Metrics
- Zero `as never` in application code
- Empty states exist on all 4 pages
- Dashboard usable on screens < 375px
- Skeleton screens replace all "Cargando…" text

---

## Phase XIV — AI Coach & Personalization (P2/P3) [~6 weeks]

**Objective:** Complete personalization layer and enhance AI coaching capabilities.

### XIV-A — Personalization

**TASK-045:** Three-way theme toggle (light/dark/system). System mode listens to `prefers-color-scheme`.

**TASK-046:** Accent color picker (OKLCH hue 0–360) + colorblind mode (deuteranopia preset). CSS variable injection on `<html>`.

**TASK-050:** Goal setting + dashboard widget — weekly trades goal, P&L goal, discipline goal, learning minutes goal. Progress rings on dashboard.

**TASK-051:** Custom tags management — rename, delete, color-code, categorize tags. Merge duplicate tags.

### XIV-B — AI Coach Enhancements

- Trader context caching — cache `buildTraderContext()` result for 5 minutes per user
- Rate limiting — 20 coach messages/hour, 100 embeddings/day per user
- Batch re-embedding — background job to recalculate embeddings when model changes
- Privacy consent checkbox in AI Config UI

### XIV-C — Pattern Detection

Productionize `pattern-detector.ts` behavioral patterns:
- "Your last 3 losses came after a win streak of 3+" (revenge trading)
- "Your win rate is 15pp lower before 8AM" (fatigue correlation)
- "You oversize on Mondays" (day-of-week sizing pattern)

Surface patterns in weekly review as AI insights.

### XIV-D — Infrastructure and Testing

**TASK-019:** Add `TradeEmbedding` model and `EmailLog` model to `schema.prisma`.

**TASK-024/025:** RTL component tests + Playwright e2e smoke tests + GitHub Actions CI.

**TASK-021:** Enable `ANALYTICS_CACHE_ENABLED=true` in production.

### Phase XIV Success Metrics
- Accent color picker functional
- System theme mode working
- At least 3 behavioral patterns surfaced in weekly reviews
- CI pipeline green on every PR
- Test coverage > 60%

---

## Future Phases (P3 Vision, 6–12 months)

### Multi-Account Portfolio Dashboard (TASK-053)
Portfolio-level KPI aggregation, cross-account equity curve, portfolio-level drawdown, account comparison view.

### Trading Psychology Assessment
Initial onboarding psychological assessment → profile categorization → personalized learning recommendations.

### AI-Powered Pattern Detection Improvements
Semantic clustering of trade notes via embeddings. Cross-setup correlation. AI coach proactive nudges.

### Automated Trade Import (Broker API)
OAuth flow for broker connections. Webhook receivers. Conflict resolution for duplicate imports. Interactive Brokers, Tradovate, TopStep integrations.

### Social Features (Optional)
Opt-in public profiles, accountability partner pairing, community leaderboard (discipline score + consistency).

---

## Explicit Non-Goals (Stable)

- Live broker connections or order routing
- Signal marketplace
- Algorithmic backtesting engine
- Multi-user organization management

---

## Dependencies Between Phases

```
Phase X (Stability) ─────────────────────────────────────► Phase XI
                                                             │
Phase XI (Profile + AI Config) ─────────────────────────────┼──► Phase XII (Psychology)
                                 TASK-006 unblocks:          │
                                 ├── TASK-030 (UserPrefs)   │
                                 ├── TASK-033 (AI config)   │
                                 ├── TASK-045 (system theme) │
                                 ├── TASK-046 (accent color) │
                                 └── TASK-050 (goals)        │
                                                             ▼
Phase XII (Psychology + Reviews) ───────────────────────────► Phase XIII
                                                             │
Phase XIII (Mobile + UX) ────────────────────────────────────► Phase XIV
                                                             │
Phase XIV (AI + Personalization) ────────────────────────────► Future
```
