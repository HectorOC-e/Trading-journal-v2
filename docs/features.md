# Feature Inventory — Trading Journal v2

> **Last Updated: 2026-05-31**  
> Complete feature inventory organized by module. Each feature includes status, description, acceptance criteria, and notes. Sources: full codebase audit, product-gap-analysis, feature-opportunities.

**Status legend:** ✅ Done · ⚠️ Partial · ❌ Missing · 🔴 Broken

---

## Module: Trades

| Feature | Status | Description | Notes |
|---|---|---|---|
| Register trade (manual) | ✅ Done | Full trade form with entry, stop, target, size, direction, setup, tags, notes, screenshots | `register-trade-modal.tsx` |
| Close trade | ✅ Done | Close with price, commission, P&L calculation | `close-trade-modal.tsx` |
| Edit trade | ✅ Done | Edit all trade fields | `edit-trade-modal.tsx` |
| Delete trade | ✅ Done | Soft delete with confirmation | `routers/trades.ts` |
| Trade events (scale in / partial close) | ✅ Done | TradeEvent immutable trail; SCALE_IN recalculates avg entry | `routers/trades.ts` |
| Trade list with pagination | ✅ Done | Cursor-based pagination (50 trades/page) | `trades/page.tsx` |
| Trade list filtering | ✅ Done | Filter by account, setup, session, direction, date range | `trades/page.tsx` |
| Trade detail panel | ✅ Done | Right-rail detail view with events timeline | `trade-detail-panel.tsx` |
| Screenshot attachments | ✅ Done | Supabase Storage upload; lightbox display | `trade-screenshots` bucket |
| Session auto-detection | ✅ Done | Auto-classifies trade session based on open time | Silent, no user feedback |
| R-multiple calculation | ✅ Done | Computed on close: `(closePrice - entry) / |entry - stop|` | `trade-service.ts` |
| KPI strip (Win Rate, P&L, Avg R) | 🔴 Broken | Calculated over first 50 paginated trades only | TD-004, TASK-001 |
| Win rate criterion | 🔴 Broken | Uses `rMultiple > 0` (dashboard uses `pnl > 0`) — inconsistent | TD-001, TASK-005 |
| Drawdown KPI label | 🔴 Broken | "Drawdown / peor día" shows min daily P&L, not drawdown | TD-025, TASK-028 |
| Per-trade psychology fields | ❌ Missing | emotionBefore, fomoFlag, revengeFlag, confidenceRating, executionQuality | TASK-034 |
| Loading skeleton | ❌ Missing | "Cargando…" text only; no skeleton screen | TASK-042 |
| Empty state | ❌ Missing | No guidance when no trades exist | TASK-043 |

**Acceptance criteria (KPI strip fix):** KPI values match `trades.dashboardStats` server aggregates regardless of how many trades exist. No client-side KPI computation.

---

## Module: Analytics / Dashboard

| Feature | Status | Description | Notes |
|---|---|---|---|
| Portfolio tab (equity curve, P&L by date) | ✅ Done | Pre-aggregated via `trades.dashboardStats` | `tab-portfolio.tsx` |
| Operador tab (session, hour stats, symbols) | ✅ Done | Session matrix, hourly breakdown | `tab-operador.tsx` |
| Disciplina tab (discipline score, violations, mood correlation) | ⚠️ Partial | Mood correlation chart works; "Ver registro →" button is dead UI | `tab-disciplina.tsx:152` — TASK-036 |
| Playbook tab (setup performance) | ✅ Done | Setup win rate, avg R, equity curves | `tab-playbook.tsx` |
| Prop firm status widget | ✅ Done | Drawdown % used, daily loss, trades used | `propFirmStatus` in dashboardStats |
| Analytics cache (TradeStatsCache) | ⚠️ Partial | Feature built; `ANALYTICS_CACHE_ENABLED=false` by default | TASK-021 |
| Dashboard tab persistence | ❌ Missing | Tab resets to "Portfolio" on every page reload | TASK-047 |
| Chart grain persistence | ❌ Missing | Daily/weekly/monthly resets on reload | TASK-047 |
| Goal progress widget | ❌ Missing | "Mis metas" widget with weekly progress rings | TASK-050 |
| Pattern detection | ⚠️ Partial | 5 static rule-based patterns in `pattern-detector.ts`; not surfaced in UI | Not wired to UI |
| "Ver registro →" button | 🔴 Broken | No `onClick` handler on `tab-disciplina.tsx:152` | TASK-036 |

---

## Module: Setups / Playbook

| Feature | Status | Description | Notes |
|---|---|---|---|
| Setup CRUD | ✅ Done | Create, edit, delete setups with all fields | `playbook/page.tsx` |
| Setup images | ✅ Done | Direct upload to `setup-images` bucket | Security gap: no server validation (TD-021) |
| A+/standard checklists | ✅ Done | Configurable checklist items per setup | `aplusChecklist[]`, `standardChecklist[]` |
| Setup versioning | ✅ Done | SetupVersion snapshots on checklist changes | Immutable history |
| Edge definition fields | ✅ Done | expectedWr, expectedAvgR, minR, maxR | Phase VIII |
| Setup status lifecycle | ✅ Done | ACTIVO → EN_PRUEBA → PAUSADO → DESCARTADO | `setups/page.tsx` |
| Setup performance metrics | ✅ Done | Win rate, avg R, trade count per setup | `setupStats` in dashboardStats |
| Setup equity sparklines | 🔴 Broken | `SparklinePlaceholder` shows "— sin trades"; data exists in `setupStats[].equityCurve` | TASK-049 |
| Link resources to setups | ✅ Done | M2M via `_ResourceSetups` | `aprendizaje/page.tsx` |
| Lifecycle check | ⚠️ Partial | Only evaluates setups where `expectedWr !== null` — others silently excluded | `setups.ts:lifecycleCheck` |

---

## Module: Accounts

| Feature | Status | Description | Notes |
|---|---|---|---|
| Account CRUD | ✅ Done | Create, edit, delete accounts | `cuentas/page.tsx` |
| Account types | ✅ Done | PERSONAL, PROP_FIRM, DEMO_PERSONAL, DEMO_PROP, BACKTEST, QA | Schema |
| Account status | ✅ Done | ACTIVE → PAUSED / INACTIVE / LOST | `accounts.ts:changeStatus` |
| Drawdown limits | ✅ Done | ddDailyPct, ddWeeklyPct, ddMonthlyPct, ddTotalPct | Schema |
| Prop firm phase management | ✅ Done | PHASE_1 → PHASE_2 → FUNDED | `promote-phase-modal.tsx` |
| Phase promotion check | 🔴 Broken | `objectiveMet = false` hardcoded — always shows "objective not met" | TD-005, TASK-002 |
| Account log trail | ✅ Done | Immutable AccountLog for CREATED, PHASE_CHANGE, WITHDRAWAL, STATUS_CHANGE | Append-only |
| Account log pagination | 🔴 Broken | `take: 50` hardcoded; no cursor pagination | TASK-020 |
| Drawdown enforcement | ❌ Missing | Schema has ddDailyPct etc. but `trades.create` doesn't validate against them | ADR-008 |
| Account KPIs | 🔴 Broken | `useAccountStats` computed from max 50 trades | TD-004, TASK-009 |
| `TRPCError` in changeStatus | 🔴 Broken | Throws plain `Error` instead of `TRPCError` | TD-003 mapped to accounts, TASK-003 |
| Withdrawals | ✅ Done | Full withdrawal CRUD with status tracking | `retiros/page.tsx` |
| Empty state | ❌ Missing | No empty state when no accounts | TASK-043 |

---

## Module: Weekly Reviews

| Feature | Status | Description | Notes |
|---|---|---|---|
| Create weekly review | ✅ Done | 2-step flow (Config → Análisis) | `create-review-modal.tsx` |
| Draft save | ✅ Done | "Guardar borrador" — saved with status="draft" | Works |
| Draft indicator | ✅ Done | "Borrador" badge on review card | `review-card.tsx` |
| AI summary generation | ✅ Done | Calls `getWeeklySummaryModel()` | Returns HTTP 200 on failure (TD-028) |
| Review detail panel | ✅ Done | Read-only display with all review fields | No edit/delete buttons |
| Edit existing review | 🔴 Broken | `weeklyReviews.update` procedure exists but no UI accesses it | TASK-031 |
| Continue editing draft | 🔴 Broken | No "Continue editing" button | TASK-031 |
| Delete review | ⚠️ Partial | `weeklyReviews.delete` procedure exists; no UI button | TASK-031 |
| Week trade stats | 🔴 Broken | `weekTrades` filtered from paginated `trades.list` (max 50) | TD-004, TASK-009 |
| Auto-prefill from trades | ✅ Done | "Generar desde mis trades" button | `weeklyReviews.prefill` |
| Discipline score auto-compute | ⚠️ Partial | Computed on server; 3 separate implementations | TD-002, TASK-011 |
| Review list | ✅ Done | Timeline view with cards | `reviews/page.tsx` |
| Review filtering | ❌ Missing | No search, no account filter, no status filter | TASK-048 |
| Week comparison | ❌ Missing | Cannot view two reviews side-by-side | — |
| Error handling on AI summary | 🔴 Broken | Returns `{ error }` with HTTP 200 — client onError never fires | TD-028, TASK-037 |

---

## Module: AI Coach

| Feature | Status | Description | Notes |
|---|---|---|---|
| Chat interface | ✅ Done | Streaming SSE via `ai-coach-drawer.tsx` | `api/ai-coach/route.ts` |
| Trader context injection | ✅ Done | `buildTraderContext()` in `ai-context.ts` | Last 5 trades, patterns, learning stats |
| Multi-provider support | ✅ Done | OpenRouter → Anthropic → OpenAI priority chain | `lib/ai/config.ts` |
| Graceful no-key handling | ✅ Done | Returns NO_API_KEY if no provider configured | |
| AI model ID | 🔴 Broken | `claude-sonnet-4-5` returned (stale; should be `claude-sonnet-4-6`) | TD-027, TASK-032 |
| Weekly review AI summary | ⚠️ Partial | Works but error handling broken (HTTP 200 on failure) | TD-028 |
| Per-user API keys | ❌ Missing | All keys are server-wide env vars | TASK-033 |
| Per-user model selection | ❌ Missing | No UI or DB model for user model preference | TASK-033 |
| Connectivity test UI | ❌ Missing | No "Test connection" button | TASK-033 |
| Usage / cost tracking | ❌ Missing | No `AiUsageLog` table | TASK-033 |
| Rate limiting | ❌ Missing | No per-user request limits | TASK-033 |
| Trader context caching | ❌ Missing | Context rebuilt on every request | — |
| Embedded note search | ⚠️ Partial | pgvector setup exists; fire-and-forget embedding may fail | TD-020 |

---

## Module: Resources / Learning

| Feature | Status | Description | Notes |
|---|---|---|---|
| Resource CRUD | ✅ Done | Create, edit, delete resources | `aprendizaje/page.tsx` |
| Resource types | ✅ Done | LIBRO, VIDEO, NOTA, BACKTEST, PODCAST, DRILL, HERRAMIENTA | |
| Spaced repetition scheduling | ✅ Done | `calcNextReviewAt` in `review-scheduler.ts` | 5 mastery levels |
| Resource review flow | ✅ Done | Review modal with learned/insights/mastery rating | |
| Streak tracking | ✅ Done | Materialized on User: `currentStreak`, `bestStreak` | ADR-004 |
| Decay detection | ✅ Done | MASTERED → IN_REVIEW trigger | In `stats` query (TD-009) |
| Resource-to-setup linking | ✅ Done | M2M `_ResourceSetups` | |
| Impact ranking | ⚠️ Partial | `resourceImpactRanking` works but has N+1 query | TD-008, TASK-039 |
| Decay detection location | 🔴 Broken | CQRS violation: state change in query procedure | TD-009, TASK-038 |
| Type safety | 🔴 Broken | `as unknown as LearningResource[]` casts in `aprendizaje/page.tsx` | TD-014, TASK-014 |
| Weekly learning email | ✅ Done | Edge function sends 4 notification types | `weekly-learning-summary` |

---

## Module: Import

| Feature | Status | Description | Notes |
|---|---|---|---|
| MT4 CSV import | ✅ Done | Parses MT4 history export | `api/import/mt4/route.ts` |
| cTrader CSV import | ✅ Done | Same endpoint, different column names | |
| R-multiple on import | 🔴 Broken | `rMultiple: null` for all imported trades | TD-007, TASK-004 |
| Session on import | 🔴 Broken | Hardcoded to "New York" — incorrect for non-US traders | — |
| Dry-run mode | ❌ Missing | No preview before committing | — |
| Generic CSV template | ❌ Missing | No downloadable template | — |
| Import status feedback | ⚠️ Partial | Returns count but no row-level error reporting | |

---

## Module: Profile / Settings

| Feature | Status | Description | Notes |
|---|---|---|---|
| View profile | 🔴 Broken | Fields shown but loaded from hardcoded `useState` defaults | TD-003 |
| Save profile | 🔴 Broken | Zero tRPC calls; data lost on reload | TD-003, TASK-006 |
| Change password | 🔴 Broken | Button exists; no `onClick` | TD-003 |
| Export data | 🔴 Broken | Button exists; no `onClick` | Legal risk — TASK-006 |
| Delete account | 🔴 Broken | Button exists; no `onClick` | Legal risk — TASK-006 |
| Timezone setting | 🔴 Broken | Shown but not saved; session classification ignores it | |
| Language setting | 🔴 Broken | Toggle shown but not saved | |
| Email notifications | 🔴 Broken | Toggle shown but not saved | |
| Base currency | ❌ Missing | Not shown in UI; exists in DB | |
| Weekly goal minutes | ❌ Missing | Not shown in UI; exists in DB | |
| AI API key configuration | ❌ Missing | No per-user key storage | TASK-033 |
| Session time customization | ❌ Missing | Hardcoded in sidebar | |
| Theme (dark/light) | ✅ Done | Binary toggle with localStorage persistence | `ThemeProvider` |
| System theme mode | ❌ Missing | OS preference not respected | TASK-045 |
| Accent color customization | ❌ Missing | Hardcoded to `oklch(58% 0.16 264)` | TASK-046 |
| Colorblind mode | ❌ Missing | Only green/red available | TASK-046 |

---

## Module: Psychology (Planned)

| Feature | Status | Description | Notes |
|---|---|---|---|
| Pre-session mood (session level) | ✅ Done | `TradingSessionLog.preMood` 1–5 | Used in mood correlation chart |
| Pre-session energy (session level) | ✅ Done | `TradingSessionLog.energyLevel` 1–5 | |
| Pre-trade emotion (trade level) | ❌ Missing | No `emotionBefore` field on Trade | TASK-034 |
| Post-trade reflection | ❌ Missing | No structured post-trade fields | TASK-034 |
| FOMO flag (structured) | ❌ Missing | Only available as free-form tag string | TASK-034 |
| Revenge flag (structured) | ❌ Missing | Only available as free-form tag string | TASK-034 |
| Confidence rating (per trade) | ❌ Missing | No `confidenceRating` field | TASK-034 |
| Execution quality rating | ❌ Missing | No `executionQuality` field | TASK-034 |
| Pre-session ritual templates | ❌ Missing | Template A (quick), B (full), C (prop firm) | Personalization roadmap |
| Post-trade reflection prompts | ❌ Missing | AI-triggered reflection after loss > 1R | Personalization roadmap |
| Mood vs. P&L analytics | ⚠️ Partial | Basic mood correlation chart in disciplina tab | No per-trade correlation |

---

## Feature Matrix

| Module | Done | Partial | Missing | Broken |
|---|---|---|---|---|
| Trades | 12 | 0 | 3 | 3 |
| Analytics / Dashboard | 5 | 2 | 3 | 1 |
| Setups / Playbook | 7 | 2 | 0 | 1 |
| Accounts | 7 | 0 | 2 | 4 |
| Weekly Reviews | 5 | 2 | 3 | 4 |
| AI Coach | 3 | 2 | 6 | 1 |
| Resources / Learning | 6 | 1 | 0 | 3 |
| Import | 2 | 1 | 3 | 2 |
| Profile / Settings | 2 | 0 | 6 | 9 |
| Psychology | 2 | 1 | 8 | 0 |
| **Total** | **51** | **11** | **34** | **28** |

**Overall feature completeness: 51/124 fully done (41%)**

Key finding: Profile/Settings is the most incomplete module (9 broken, 6 missing out of 17 features). Psychology module has the most missing features.

---

## Top 10 Highest-Impact Missing/Broken Features

1. **F-P0-001** — Profile backend (0/14 fields saved; legal risk from non-functional delete/export)
2. **F-P0-002** — KPI strip over paginated data (every user with >50 trades sees wrong metrics)
3. **F-P0-006** — Phase promotion hardcoded false (blocks every prop-firm workflow)
4. **F-P0-003** — Discipline score 3 implementations (inconsistent weekly metric)
5. **F-P0-004** — Win rate inconsistency (2 different values on 2 screens)
6. **F-P1-001** — Edit existing weekly reviews (no way to fix errors in saved reviews)
7. **F-P1-002** — Per-trade psychology fields (highest-leverage missing psychology feature)
8. **F-P1-004** — AI configuration UI (no per-user keys, no model selection)
9. **F-P1-006** — Toast notification system (all mutations succeed/fail silently)
10. **F-P2-004** — Playbook sparklines with real data (placeholder on every setup card)
