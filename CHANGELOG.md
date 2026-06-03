# Changelog — Trading Journal v2

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

### Sprint 7 (2026-06-03) — Reviews, Discipline, Infrastructure Hardening

**Added**
- **TASK-031:** Edit and delete in ReviewDetailPanel — "Editar" opens `NuevaReviewModal` in edit mode with prefilled fields; "Eliminar" shows confirmation dialog and navigates back on success; "Última edición: hace N horas" timestamp in detail footer
- **TASK-051:** Custom tags management page (`/etiquetas`) — table with usage counts, inline rename (Enter to commit, Escape to cancel), delete with confirmation, merge with survivor selection; accessible from Sidebar under Cuenta section
- **TASK-073:** 7d period added to dashboard rolling metrics — `"7d"` option in period selector (7d | 1M | 3M | 6M | 1Y | ALL); selected period persisted to `localStorage`; server extends `trades.dashboardStats` and `trades.equityCurve` with `7d` support
- **TASK-064:** Setup health score in Playbook — `calcSetupHealth()` in `lib/formulas/setup.ts`; 🟢/🟡/🔴/⚪ dot with tooltip on each setup card; "Insuficiente" state for <5 trades
- **TASK-058:** Reliable embedding via DB webhook — `ai-embed/route.ts` accepts both `{ tradeId }` direct calls and `{ type: "INSERT", record: { id } }` Supabase webhook payloads; `SUPABASE_WEBHOOK_SECRET` header validation; fallback to Supabase auth when header absent
- **TASK-060:** Structured logger `lib/logger.ts` — JSON in production (Vercel-parseable), pretty-print in dev; replaces `console.error` in profile router delete path
- **Rate limiter extraction:** `lib/rate-limiter.ts` — `RateLimiter` interface, `InMemoryRateLimiter`, `UpstashRateLimiter` (falls back to InMemory when packages absent or Redis unavailable), `createRateLimiter()` factory reads `UPSTASH_REDIS_REST_URL`
- **Review filter URL persistence** — `useReviewFilters()` hook in `reviews/page.tsx` syncs `q`, `outcome`, `status`, `minDisc` to URL params via `router.replace()`; filter state survives navigation; "Limpiar filtros" clears URL to clean pathname

**Fixed (Technical Debt)**
- **TD-002/TD-017:** Discipline score centralization verified — canonical formula in `lib/formulas/discipline.ts`; server and modal both delegate to shared `computeDisciplineScore()`; no more divergence
- **TD-020:** Embedding no longer fire-and-forget in same worker — webhook-triggered path decouples embedding from trade creation response
- **TD-029:** `theme-provider.tsx` now guards `CYCLE.includes(t)` before applying DB preference to prevent unknown themes from crashing toggle cycle
- **TD-030:** `InMemoryRateLimiter` window boundary corrected to `>=` (was `>`) — prevents one extra request slipping through at exact window expiry
- **TD-031:** All 5 accounts mutation endpoints (`create`, `update`, `changeStatus`, `changePhase`, `archive`) now return `serializeAccount()` — `Decimal` fields are numbers over the wire
- **TD-032:** `accounts.test.ts` mock uses `new Prisma.Decimal("10000.50")` matching real Prisma behavior; serialization assertions added
- **TD-033:** Rate-limit tests import `InMemoryRateLimiter` directly — no algorithm duplication; 1 new test (stale entry eviction)

**Tests**
- 11 tests for `calcSetupHealth()` — all four status values, null expectations, tradeCount boundary
- 11 tests for `tradeTagsRouter` — list (bigint→number, empty), rename (success, same-name rejection, length), delete (success, empty input), merge (success, same-tag rejection, empty inputs)
- 1 new test for stale-entry eviction in `InMemoryRateLimiter`
- Test suite: 407 → 430 passing (+23), 0 failing

**Documentation**
- Created `docs/SPRINT_7_COMPLETION_REPORT.md`
- Updated `docs/backlog.md` — TASK-031, TASK-011, TASK-051 marked DONE Sprint 7
- Updated `docs/technical-debt.md` — TD-002, TD-017, TD-020, TD-029–TD-033 closed Sprint 7; open items: 4 of 33

---

### Sprint 6 QA Fix (2026-06-03) — 6 Major Findings Resolved

**Fixed — Major (6)**
- **M-001:** `ThemeProvider` useEffect had no cleanup return — media query listener now removed on component unmount
- **M-002:** Sidebar theme-toggle icon used `theme === "dark"` instead of `resolvedTheme === "dark"` — fixed for all 7 occurrences; icon now correct when preference is "system"
- **M-003:** `updatePrefs.mutate` fired synchronously on every toggle — debounced to 500ms to prevent DB write storms
- **M-004:** In-memory rate-limit Map grew unboundedly — added per-check eviction of entries >2× window age; TODO comment for Upstash Redis (Sprint 7)
- **M-005:** `getEncryptionKey` validated only string length — added `/^[0-9a-fA-F]{64}$/` regex guard to reject misconfigured secrets with a clear error
- **M-006:** `rotateEncryptionKey` accepted `oldSecret === newSecret` silently — added hex validation + equality guard; throws with descriptive error

**Tests**
- Added 3 tests: non-hex secret rejection (M-005), non-hex rotation secrets (M-006), identical secrets guard (M-006)
- Test suite: 404 → 407 passing, 0 failing

**Documentation**
- Created `docs/SPRINT_6_QA_REPORT.md` — independent audit with 6 Major, 6 Minor, 4 Nitpick findings
- Created `docs/SPRINT_6_FIX_REPORT.md` — detailed fix documentation for all 6 Major findings
- Created `docs/SPRINT_6_RETROSPECTIVE.md` — sprint retrospective with risks and Sprint 7 recommendations

---

### Sprint 6 (2026-06-03) — System Theme, Review Filters, Sparklines, Type Safety, Security

**Added**
- **TASK-045:** Three-way theme toggle (light / dark / system) — system mode reads `prefers-color-scheme`, subscribes to live OS changes, persists to DB; toggle cycles light → dark → system → light
- **TASK-048:** Weekly review filtering and search — text search across executiveSummary/whatWorked/toImprove/weekLabel; outcome filter (All/WIN/LOSS/NEUTRAL); status filter (All/submitted/draft); minimum discipline score; "X de Y" count; "Limpiar filtros" button; empty state
- **TASK-049:** Playbook sparklines with real equity data — SVG path from `equityCurve[]`; gradient fill; color matched to setup status; dashed fallback when <2 data points; real P&L label in drawer
- **P1.3:** Goal widget exceeded feedback — gold glow ring, ✓ icon, "+N extra" text, green border, celebration banner when any goal exceeded
- **P0.1:** `QUALITY_GATES.md` — 4-gate definition-of-done (Zod/TS alignment, Browser QA, Integration test, Security review)
- **P3.1:** `rotateEncryptionKey()` — re-encrypts all `UserAiConfig.apiKeyEnc` from old to new key; injectable DB functions for testability; returns `{ rotated, failed }` counters
- **P3.3:** In-memory rate limiter on AI test endpoint — 5 req/60 s per user; 429 with `Retry-After: N` header

**Fixed (Type Safety — TD-013, TD-014)**
- **TD-013:** `accounts.list` now serializes `Decimal → number` and `Date → ISO string` via `serializeAccount()`; all 4 `as never` casts removed from `trades/page.tsx`; `PositionLogModal.onAddEvent` narrowed to `AddableType`
- **TD-014:** `LearningResource` type derived from `RouterOutputs` with `type: ResourceType` and `status: ResourceStatus` overrides — no more manual interface duplication

**Tests**
- 9 tests for `key-encryption.ts`: roundtrip, random IV, tamper detection, secretOverride, maskApiKey, rotateEncryptionKey (happy path, failed count, length validation)
- 6 tests for rate limiter algorithm: first 5 allowed, 6th blocked, window reset, per-user isolation, retryAfter decreases
- Test suite: 389 → 404 passing (+15)

**Documentation**
- Created `docs/SPRINT_6_COMPLETION_REPORT.md`
- Updated `docs/backlog.md` — Sprint 6 tasks marked DONE
- Updated `docs/technical-debt.md` — TD-013, TD-014 closed

---

### Sprint 5 QA Fix (2026-06-03) — 4 Blocking + 6 Major Findings Resolved

**Fixed — Blocking (4)**
- **B-01:** `_getDecryptedKey` exposed in tRPC router — removed from router; moved to server-only helper
- **B-02:** `accountLogs.list` cursor used UUID lexicographic ordering — switched to Prisma `cursor: { id }, skip: 1`
- **B-03:** Weekly metrics passed wrong date range to goal widget — fixed `buildKpis` to use Mon–today window for `tradesCountWeek` and `pnlWeek`
- **B-04:** AES-256-GCM auth tag not validated on decrypt — `setAuthTag()` now called before `decipher.final()` on all decrypt paths

**Fixed — Major (6)**
- Stale Prisma types causing `@ts-expect-error` on `planNotes` and `userAiConfig` — regenerated client, directives removed
- `UserAiConfig.provider` enum not validated in Zod schema — added `z.enum(["anthropic","openai","openrouter"])`
- Mask function showed last 8 chars not first 8 — corrected `maskApiKey` to show prefix
- React Query v5 `onSuccess` in `useMutation` removed (deprecated) — migrated to `useEffect` watching `data`
- Cursor pagination test used non-UUID string — replaced with `crypto.randomUUID()`
- AI test endpoint leaked decrypted key in error log — guard added

**Tests**
- Added 11 tests covering B-01 through B-04 and Major fixes
- Test suite: 364 → 389 passing (+25)

---

### Sprint 5 (2026-06-03) — AI Config, Personalization Polish, International Support

**Added**
- **TASK-033:** Full AI configuration system — `UserAiConfig` Prisma model, AES-256-GCM encryption in `key-encryption.ts`, tRPC router (`get/update/delete`), connectivity test endpoint, profile UI with masked key inputs and per-provider model selectors
- **TASK-046:** Accent color picker + colorblind mode — 8 preset colors, OKLCH hue slider, deuteranopia/protanopia/tritanopia CSS variable presets, real-time preview, persisted to `UserPreferences`
- **TASK-050:** Goal-setting dashboard widget — circular progress rings for 4 goals (weekly trades, P&L, discipline, learning minutes), goal CRUD in profile page
- **TASK-020:** Cursor pagination for `accountLogs.list` — Prisma native cursor with `skip: 1` pattern, correct UUID ordering
- **TASK-056:** `useCurrency()` hook — reads `profile.baseCurrency`, propagated to all P&L displays (KPI strip, trade list, analytics, goal widget)
- **TASK-062:** Sharpe Ratio KPI card on dashboard analytics strip
- **TASK-074:** `planNotes` field — collapsible textarea in register/edit modals, read-only display in detail panel (200 char limit with expand)

**Tests**
- Test suite: 354 → 364 → 389 passing

---

### Sprint 4 QA Fix (2026-06-02) — Major Finding Resolution

**Fixed — Major (5)**
- **M-01:** `editing` state typed `any` in mercados page — now `(MarketForm & { id: string }) | null`
- **M-02:** `WithdrawalRow` ignored `updating` prop; per-row `updatingId` state added to `RetirosPage`; removed `setTimeout(800)` fake loading hack
- **M-03:** `emotionBefore: ""` empty-string sentinel — changed to `null` across `FormState`, `INITIAL`, deselect handler, and `edit-trade-modal`; mutation coercion changed from `||` to `??`
- **M-04:** Drawdown progress bars hardcoded to 20%/10% — replaced with styled limit badges showing actual `ddTotalPct`/`ddDailyPct` values
- **M-05:** Removed unnecessary `as` cast for psychology fields in `trade-detail-panel` — Prisma-generated `Trade` type already includes all 5 fields

**Tests**
- Added 2 regression tests for M-03 null-sentinel contract
- Test suite: 364 passing, 0 failing (+2 from baseline)

**Documentation**
- Created `docs/SPRINT_4_FIX_REPORT.md` — detailed fix documentation for all 5 major findings

---

### Sprint 4 (2026-06-02) — Personalization, Psychology & Review Management

**Added**
- **TASK-034:** Per-trade psychology fields — collapsible "Psicología" section in register/edit modals; display in trade detail panel; 5 fields: `emotionBefore`, `confidenceRating`, `executionQuality`, `fomoFlag`, `revengeFlag` (all optional, backward compatible)
- **TASK-061:** Auto-save with 2s debounce in weekly review modal (edit mode only) — "Guardando…/Guardado ✓" indicator
- **TASK-069:** Extended week selector — 8 weeks shown by default, "Ver más" expands to 24 weeks
- **TASK-047:** Dashboard tab persisted to UserPreferences — active tab restored across page reloads

**Fixed**
- **TASK-023:** Replaced `market: any` in mercados page and `amount: any` in retiros page with proper `RouterOutputs` types
- **TASK-013:** Reduced `as never` casts in `trades/page.tsx` from 12 to 4 (67% reduction); remaining 4 annotated as TD-013

**Tests**
- Added 8 new tests for psychology fields: create/update acceptance, optional handling, Zod validation enforcement
- Test suite: 362 passing, 0 failing (+8 from baseline)

**Documentation**
- Created `docs/SPRINT_4_COMPLETION_REPORT.md` — full sprint delivery summary
- Updated `docs/master-backlog.md` — Sprint 4 marked complete

---

### Pre-Sprint 4 (2026-06-02) — QA Audit & Fixes

> **Note:** This is a pre-sprint QA audit of Sprints 1–3 before beginning Sprint 4. All 8 findings were critical blockers that would have caused production issues. Sprint 4 (Reviews, Psychology, Personalization) is scheduled as the next delivery phase.

**Fixed — Blocking (3)**
- **B-01:** Goal fields dropped by type cast in profile router — extended `UpdateProfileInput` interface to include `weeklyTradesGoal` and `weeklyPnlGoal`
- **B-02:** Theme toggle CSS mechanism broken — replaced inert `data-theme` attribute with `.dark` class toggle and localStorage sync
- **B-03:** Prisma Decimal not serialized to number in goals.set — added explicit `Number()` conversion before returning

**Fixed — Major (5)**
- **M-01:** Dashboard metric mislabeled "Discipline Score" instead of "Adherencia al plan" — renamed UI label and clarified metric definition
- **M-02:** Stale closures in create-review-modal useEffects — added missing deps (autoFields, generated, isEditMode)
- **M-03:** Trade list capped at 50 in review modal — raised limit to 200 via `{ limit: 200 }` query option
- **M-04:** Edit-mode fires prefill/score queries for wrong week — added `{ enabled: !isEditMode }` guards to both queries
- **M-05:** Vitest discovers stale tests in `.claude/worktrees/` — added exclude pattern to vitest.config.ts

**Tests**
- Added 5 new tests for critical fixes: B-01 (3 tests), B-03 (2 tests)
- Test suite: 354 passing, 0 failing (+5 from baseline)

**Documentation**
- Created `docs/PRE_SPRINT_4_QA_REPORT.md` — independent audit of all Sprints 1–3 implementations
- Created `docs/PRE_SPRINT_4_FIX_REPORT.md` — detailed fix documentation for all 8 findings
- Created `docs/PRE_SPRINT_4_RETROSPECTIVE.md` — lessons learned and recommendations for Sprint 4 onwards

---

### Sprint 3 (2026-06-01) — Profile Backend & Admin Fixes

**Fixed — Blocking (1)**
- **B-02:** Supabase admin client not used for user deletion — corrected profile.deleteAccount to call `createAdminClient()` instead of anon client

**Added**
- Profile page fully functional: get, update, changePassword, deleteAccount, exportData endpoints
- UserPreferences router: get, update with theme, accent color, dashboard layout settings
- Goals router: set discipline goals with min/max validation

**Tests**
- 24 new tests for profile, preferences, and goals routers
- Test suite: 232 passing, 0 failing

---

### Sprint 2 (2026-05-31) — Formula Fixes & Security Hardening

**Fixed (9 items)**
- TD-005: Phase promotion `objectiveMet = false` hardcoded
- TD-008, TD-009: N+1 query and CQRS violation in learning resources
- TD-010, TD-011: Schema and formula mismatches
- TD-015: Deprecated dead `trades.stats` procedure
- TD-025, TD-027, TD-028: Drawdown label, AI model IDs, error handling

---

### Sprint 1 (2026-05-30) — Data Integrity & Foundations

**Fixed (6 items)**
- TD-001: Win rate calculation centralized to `src/lib/formulas/`
- TD-004, TD-009: KPI strip and account stats pagination fixes
- TD-006, TD-007: CRON_SECRET and CSV rMultiple fixes
- TD-026: Drawdown calculation corrected

---

## Legend

- **Added** — New features or components
- **Fixed** — Bug fixes or correctness issues
- **Changed** — Modified behavior or refactored code
- **Deprecated** — Features marked for removal
- **Removed** — Deleted or archived code
- **Tests** — Test suite changes

## Branch Strategy

- **main** — production-ready code
- **develop** — integration branch for next release
- **claude/epic-*** — feature branches with fixes and implementations
