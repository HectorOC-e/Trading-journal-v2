# Final Gap Analysis — Trading Journal v2

> **Generated:** 2026-05-31  
> **Analyst role:** Staff Engineer + Senior Quant Analyst + Trading Platform PM  
> **Sources analysed:** repository-audit-report · product-gap-analysis · target-architecture · master-remediation-plan · master-backlog · EXECUTION_TASKS · formula-engine · ai-architecture · technical-debt · features · personalization · ux-improvement-roadmap · schema.prisma · routers/ directory · domains/ directory · TODO/FIXME grep  

---

## 1. Executive Summary

The documentation corpus is internally inconsistent in two critical ways that undermine sprint planning confidence. The EXECUTION_TASKS.md file runs a completely independent TASK-001–032 numbering scheme that does not map to master-backlog TASK-001–053, leaving at least 10 implemented or planned tasks untracked in the canonical backlog. A secondary contradiction exists in Win Rate site counts (8 sites in formula-engine.md and product-gap-analysis.md; 9 sites in target-architecture.md), and one explicit duplicate entry exists in master-backlog (TASK-015 ≡ TASK-032, both "Update stale AI model IDs").

Coverage is deep for the core calculation and AI layers; shallow for observability, data export, and multi-account scenarios; and entirely missing for billing/monetization, tax reporting, and trade replay.

The five highest-impact gaps not yet in any backlog task are: (1) the SQL injection pattern in the ai-embed route, (2) a structured logger absent from the entire codebase, (3) the absence of rate limiting on all AI endpoints, (4) hardcoded "New York" timezone in CSV import affecting every non-US trader, and (5) the fire-and-forget embedding reliability risk for semantic search correctness.

---

## 2. Documentation Coverage Assessment

| System Area | Coverage Depth | Evidence |
|---|---|---|
| Formula engine (Win Rate, Drawdown, Discipline Score, Sharpe) | DEEP | formula-engine.md 8-site inventory; product-gap-analysis exact code refs; target-architecture duplication map |
| Analytics and KPI pipeline | DEEP | repository-audit-report TASK-001/TASK-009; master-remediation-plan P0 estimates; features.md |
| AI architecture (multi-provider, embeddings, coach) | DEEP | ai-architecture.md full chain; technical-debt TD-020; EXECUTION_TASKS security item |
| Profile and settings | DEEP | product-gap-analysis 0/14 score; master-backlog TASK-006 unblocking graph; personalization.md |
| Psychology and behavioral tracking | DEEP | target-architecture psychology fields list; schema.prisma confirms absent; features.md Broken count |
| Weekly reviews | DEEP | features.md; ux-improvement-roadmap week-selector gap; master-backlog TASK-031/037/048 |
| Playbook and setup management | DEEP | features.md Partial items; master-backlog TASK-049; target-architecture SetupChecklist model |
| Import / Export | DEEP | product-gap-analysis MT4/cTrader rMultiple bug; personalization.md export formats; target-architecture new parsers |
| Prop-firm account management | DEEP | repository-audit-report phase promotion hardcoded; accounts router analysis |
| Mobile responsiveness | DEEP | ux-improvement-roadmap 7 specific gaps; product-gap-analysis hidden sm:block finding |
| UX and accessibility | DEEP | ux-improvement-roadmap WCAG text-eyebrow; aria-live gaps; prefers-reduced-motion |
| Security (endpoints and storage) | MEDIUM | technical-debt TD items; CRON_SECRET in audit; Storage validation — no threat model doc |
| Performance and caching | MEDIUM | TradeStatsCache flag documented; N+1 queries identified; no load testing data |
| Personalization | MEDIUM | personalization.md roadmap complete; implementation tasks in backlog; UserPreferences schema proposed |
| Testing strategy | MEDIUM | master-backlog TASK-024/025 planned; no existing test files confirmed; no coverage targets |
| Observability and logging | SHALLOW | technical-debt TD-025 (no structured logger); no log aggregation plan; no error tracking configuration |
| Data export | SHALLOW | personalization.md lists 4 export formats all unimplemented; no schema for PDF/JSON export |
| Multi-account portfolio | SHALLOW | TASK-053 placeholder; no design for cross-account aggregation logic |
| Billing and monetization | MISSING | No documentation exists anywhere in the corpus |
| Tax reporting (P&L by tax year, wash sales) | MISSING | No documentation; not mentioned in any roadmap |

---

## 3. Factual Contradictions Between Documents

### Contradiction C-001 — EXECUTION_TASKS vs master-backlog task numbering (CRITICAL)

- **File A:** `docs/master-backlog.md` — defines canonical TASK-001 through TASK-053
- **File B:** `docs/EXECUTION_TASKS.md` — defines its own TASK-001 through TASK-032

These are completely disjoint numbering systems for the same project. EXECUTION_TASKS TASK-001 is "Crear módulo canónico lib/formulas/" (equivalent to master-backlog TASK-027). Neither document cross-references the other. Sprint planning using both documents will assign conflicting task IDs to developers and produce duplicate or dropped work.

**Resolution:** EXECUTION_TASKS.md must be reconciled with master-backlog.md. Items unique to EXECUTION_TASKS should be promoted to new TASK-054+ entries (see Section 4).

---

### Contradiction C-002 — Win Rate duplicate site count (HIGH)

- **File A:** `docs/formula-engine.md` — states 8 Win Rate calculation sites, lists them explicitly
- **File B:** `docs/product-gap-analysis.md` — states 8 sites, lists the same 8
- **File C:** `docs/target-architecture.md` — "Duplication Removal Map" lists **9 sites** including `trades/page.tsx:125`

`trades/page.tsx:125` uses `rMultiple > 0` as the win criterion (distinct from `pnl > 0`). Whether this constitutes a 9th site or is correctly excluded depends on the canonical definition of "Win Rate site." The discrepancy is unresolved in documentation and affects the scope of TASK-005 and TASK-027.

**Resolution:** TASK-027 (formula centralization) must explicitly decide whether `rMultiple > 0` is a valid win criterion for any context and document the decision. formula-engine.md must be updated to match the final count.

---

### Contradiction C-003 — TASK-015 ≡ TASK-032 explicit duplicate (MEDIUM)

- `docs/master-backlog.md` line 27: `TASK-015 | Update stale AI model IDs in config | ai | P1`
- `docs/master-backlog.md` line 44: `TASK-032 | Update stale AI model IDs in config (coach + summary) | ai | P1`

The backlog "Tasks by Module" section (line 103) acknowledges this: "TASK-015 / TASK-032 — same task, consolidated as TASK-032." However TASK-015 is still listed as an open TODO in the main table, creating duplicate work tracking. Any sprint board importing the table will show both.

**Resolution:** TASK-015 status should be updated to DUPLICATE or CLOSED with a reference to TASK-032.

---

### Contradiction C-004 — Drawdown calculation variant undocumented in KPI strip (MEDIUM)

- **File A:** `docs/product-gap-analysis.md` — `computeMaxDrawdown` in account-service.ts is confirmed CORRECT (peak-to-trough equity); `use-account-stats.ts:50` computes current DD from all-time-high (labelled as VARIANT — misleading)
- **File B:** `docs/master-backlog.md` — TASK-028 "Fix misleading Drawdown label on trades KPI strip" and TASK-029 "Fix inconsistent drawdown calculation in use-account-stats.ts" both listed as P0

The tasks acknowledge the bug, but master-remediation-plan.md does not list TASK-028 or TASK-029 under its P0 section (those tasks were added later in the backlog's TASK-027–053 range). An engineer reading only master-remediation-plan.md would not know to fix the drawdown label.

**Resolution:** master-remediation-plan.md P0 section should be noted as incomplete relative to current master-backlog.md.

---

### Contradiction C-005 — `violationsThisMonth` never auto-incremented (MEDIUM)

- **File A:** `docs/formula-engine.md` — states `Rule.violationsThisMonth` is tracked in schema but never auto-incremented; violations inferred from trade tags
- **File B:** `docs/features.md` — "Discipline Score" listed under Done features

The Discipline Score feature is not fully "Done" — its rule violation count input is approximate (inferred from tags, not from a tracked counter). The feature status should be "Partial" not "Done."

**Resolution:** features.md should move Discipline Score from Done to Partial. A new task should be added to implement `violationsThisMonth` auto-increment on trade tag matching.

---

## 4. Missing Tasks: Items in Other Docs Not in master-backlog TASK-001–053

The following items appear in EXECUTION_TASKS.md, technical-debt.md, ai-architecture.md, personalization.md, or the codebase grep, but have no corresponding entry in master-backlog.md TASK-001–053.

| Ref | Source | Description | Proposed Priority |
|---|---|---|---|
| EXEC-005 | EXECUTION_TASKS.md TASK-005 | Fix SQL injection pattern in `ai-embed/route.ts:44-49` (use `Prisma.sql` parameterization) | P0 |
| EXEC-008 | EXECUTION_TASKS.md TASK-008 | `useCurrency()` hook to propagate `baseCurrency` across all monetary displays | P1 |
| EXEC-021 | EXECUTION_TASKS.md TASK-021 | Auto-save with debounce in weekly review modal | P2 |
| EXEC-026 | EXECUTION_TASKS.md TASK-026 | Surface Sharpe Ratio as KPI on analytics dashboard | P2 |
| EXEC-027 | EXECUTION_TASKS.md TASK-027 | Rate limiting on all AI endpoints (in-memory or AiUsageLog token bucket) | P1 |
| EXEC-028 | EXECUTION_TASKS.md TASK-028 | Psychology widget inside weekly review modal | P2 |
| EXEC-030 | EXECUTION_TASKS.md TASK-030 | PWA: manifest.json + service worker (offline shell) | P3 |
| EXEC-031 | EXECUTION_TASKS.md TASK-031 | Setup health score indicator in Playbook (🟢/🟡/🔴 signal) | P2 |
| EXEC-032 | EXECUTION_TASKS.md TASK-032 | Extract coach-service.ts from route handler to domains/ai/services/ | P2 |
| TD-012 | technical-debt.md | Fix `phasePayload as never` type cast in accounts router | P2 |
| TD-019 | technical-debt.md | Optimize tRPC auth: move JWT header parsing out of per-request context | P2 |
| TD-020 | technical-debt.md | Reliable embedding: replace fire-and-forget with DB webhook or queue | P1 |
| TD-024 | technical-debt.md | Create `.env.example` with all required variable names | P1 |
| FEAT | features.md / imports | Fix hardcoded "New York" timezone in CSV import session | P1 |
| FEAT | personalization.md | PDF performance report export | P3 |
| FEAT | personalization.md | Full JSON data export (all trades, reviews, settings) | P3 |
| FEAT | personalization.md | CSV import column mapping preferences | P2 |
| FEAT | ux-improvement-roadmap | Week selector date picker for review periods older than 6 weeks | P2 |
| FEAT | ux-improvement-roadmap | Accessibility pass: `prefers-reduced-motion`, `aria-live`, `role="radiogroup"`, WCAG contrast | P2 |
| FEAT | ux-improvement-roadmap | Structured logger (`lib/logger.ts`) replacing all `console.error` calls | P1 |
| FEAT | target-architecture | Monthly review model + `createMonthly` procedure | P2 |
| FEAT | target-architecture | CI/CD GitHub Actions pipeline (lint → typecheck → test → deploy) | P2 |

---

## 5. Missing Premium Trading Journal Features

Features present in competing platforms (Tradervue, Edgewonk, TraderSync, TradeZella) that are absent from all documentation in this corpus.

| Feature | Priority | Complexity | Notes |
|---|---|---|---|
| Daily loss limit push/email alert | HIGH | S | Prop firm compliance critical; drawdown enforcement ADR-008 partial |
| Calendar heatmap (daily P&L colored grid) | HIGH | M | Highest-requested feature in trading journal UX research; target-arch mentions TimeOfDayMatrix but not calendar |
| Rolling metrics dashboard (7d / 30d / 90d windows) | HIGH | M | target-architecture mentions 20-trade rolling WR but not rolling time-window KPIs |
| Tax year P&L report with wash-sale flagging | HIGH | L | Missing from all documentation; required for US traders |
| Pre-trade planning / hypothesis capture field | HIGH | S | Common in premium journals; links to psychology module; no mention anywhere |
| Setup backtesting against historical trades | HIGH | L | Playbook module exists but no backtest comparison; high differentiation value |
| AI trade grader (automated quality score per trade) | HIGH | L | Multi-provider AI is in place; grading rubric not designed |
| Trade replay (timestamp-ordered entry/exit/screenshot sequence) | HIGH | XL | Differentiated feature; requires dedicated storage model |
| Broker API live sync (OANDA, IBKR, Alpaca) | HIGH | XL | Manually uploaded CSVs only; major friction for daily users |
| Shareable performance report cards (public URL) | MEDIUM | M | Social/community engagement; viral growth mechanism |
| Voice-to-text trade notes via Web Speech API | MEDIUM | M | Mobile UX improvement; no keyboard required on mobile |
| Pattern recognition from trade screenshots via Vision API | LOW | XL | Speculative but aligns with existing multi-provider AI stack |

---

## 6. Top 10 Recommended Features by User Value × Feasibility

Ranked by the product of (user value: 1–5) × (feasibility given current stack: 1–5). Stack = Next.js 16, tRPC v11, Prisma 7, Supabase, OpenRouter/Anthropic/OpenAI.

| Rank | Feature | Value | Feasibility | Score | Rationale |
|---|---|---|---|---|---|
| 1 | Daily loss limit push/email alert | 5 | 5 | 25 | Resend already configured; limit field on Account model exists; single trigger on trades.create |
| 2 | Calendar heatmap (daily P&L) | 5 | 5 | 25 | Pure frontend calculation over existing trade data; recharts already in use |
| 3 | Rolling metrics (7d/30d/90d) | 5 | 5 | 25 | Server-side date-window filter on existing queries; no schema change |
| 4 | Pre-trade planning field | 5 | 5 | 25 | Add `planNotes` text field to Trade model; one-line schema migration |
| 5 | Rate limiting on AI endpoints | 5 | 4 | 20 | AiUsageLog model proposed in target-arch; prevents runaway API costs |
| 6 | Setup backtesting | 4 | 5 | 20 | Playbook router already aggregates per-setup stats; adding historical comparison is incremental |
| 7 | Week selector date picker (reviews) | 4 | 5 | 20 | UX-only change to existing review modal; removes 6-week cliff |
| 8 | AI trade grader | 5 | 4 | 20 | Multi-provider AI ready; requires rubric design (not code complexity) |
| 9 | Tax year P&L report | 5 | 4 | 20 | Date-filtered aggregation over existing Trade.pnl; PDF export needed |
| 10 | CSV import column mapping | 4 | 4 | 16 | Removes manual CSV reformatting; UserPreferences storage available via TASK-030 |

---

## 7. Areas Needing Deeper Analysis Before Work Begins

### 7.1 EXECUTION_TASKS.md Reconciliation
No single task exists to reconcile EXECUTION_TASKS.md with master-backlog.md. Until this is done, sprint planning from master-backlog.md will silently drop the 10 unique EXECUTION_TASKS items. A dedicated reconciliation pass should produce a definitive mapping table before Sprint 8 planning.

### 7.2 SQL Injection Surface in ai-embed Route
The `ai-embed/route.ts:44-49` raw SQL pattern is documented as "partially safe" in ai-architecture.md, but the exact Prisma version behavior with unparameterized vector literals is not confirmed. Before closing TASK-054 (SQL injection fix), the specific Prisma 7 `$queryRaw` vs `$queryRawUnsafe` behavior with vector array interpolation must be verified against the Prisma 7 docs.

### 7.3 TradeStatsCache Invalidation Strategy
The `ANALYTICS_CACHE_ENABLED` feature flag and `TradeStatsCache` model are documented, but no document specifies cache invalidation triggers (e.g., on trade create/update/delete, on account status change). An invalidation design gap here will cause stale KPIs in production when the flag is enabled (TASK-021).

### 7.4 Supabase RLS Policy Completeness
technical-debt.md notes RLS is enabled, but no document audits which tables have policies and whether they are complete. The `notes_embedding` raw SQL path bypasses ORM-level RLS enforcement entirely. A full RLS audit is needed before any public-facing deployment.

### 7.5 Psychology Module Data Model Conflicts
target-architecture.md proposes `emotionPre`, `emotionPost`, `setupConfidence`, `executionQuality`, `fomoFlag`, `revengeFlag`, `psychNotes` on Trade. However the weekly review modal (EXEC-028) also wants a psychology widget. The data ownership boundary — per-trade fields vs per-week summary — is not designed. Building TASK-034 without this design will cause a refactor when the psychology review widget is built.

### 7.6 Embedding Reliability and Semantic Search Correctness
Fire-and-forget embedding (TD-020) means any trade whose embedding write failed has a NULL `notes_embedding` and will not appear in semantic search results. The current failure rate is unknown because there is no monitoring. Before investing further in the AI coach (which uses semantic search for context), the embedding coverage rate must be measured and a backfill job designed.

### 7.7 Mobile Performance Baseline
The ux-improvement-roadmap identifies 7 mobile gaps but does not include Lighthouse or Core Web Vitals measurements. Given that trade journaling is a mobile-first activity for many traders, a performance baseline measurement should precede any mobile sprint to establish whether the gaps are visual/UX (fixable with CSS) or performance (requiring server component or bundle changes).

---

*End of final-gap-analysis.md — 7 sections, covering 20 system areas, 5 contradictions, 22 missing backlog items, 12 premium features, 10 ranked recommendations, and 7 deep-analysis areas.*
