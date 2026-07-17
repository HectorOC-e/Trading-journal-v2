# Graph Report - Trading-journal-v2  (2026-07-16)

## Corpus Check
- 556 files · ~312,694 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3410 nodes · 7602 edges · 267 communities (187 shown, 80 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 119 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb07f94a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- palette-studio.tsx
- POST-6 Prop-Firm Rulebase Spec
- cn()
- insights-engine.ts
- page.tsx
- client.ts
- resource-card.tsx
- review-summary.tsx
- register-trade-modal.tsx
- dashboard-analytics.ts
- page.tsx
- dependencies
- monthly-letter.tsx
- 3. HALLAZGOS POR MÓDULO
- review-card.tsx
- send-review.ts
- coach-memory-service.ts
- ai-coach-drawer.tsx
- index.ts
- notify.tsx
- page.tsx
- prisma.ts
- trade-write-service.ts
- page.tsx
- motion.ts
- ai-context.ts
- improvement-service.ts
- bayes.ts
- risk-enforcement.ts
- index.ts
- tab-portfolio.tsx
- isWin()
- trades-table.tsx
- root.ts
- page.tsx
- monthly-reviews.ts
- account-card.tsx
- playbook-service.ts
- coach-tools.ts
- types.ts
- page.tsx
- risk-ratios.ts
- feature-models.ts
- Checklist de QA pendiente de V3 (109 ítems)
- review-report-shell.tsx
- institutional-summary.ts
- simple-table.tsx
- psychology-service.ts
- risk-of-ruin.ts
- learning-resources.ts
- Trading Journal (producto)
- trades.ts
- page.tsx
- overview.ts
- seed-psych-trades.mjs
- Analytics Subsystem
- route.ts
- page.tsx
- condition-group.tsx
- behavior.ts
- compilerOptions
- resolveAiCall()
- page.tsx
- ConditionNode
- trade-detail-panel.tsx
- edge-service.ts
- intervention-service.ts
- learning-insights-service.ts
- notifications.ts
- event-bus.ts
- weekly-reviews.ts
- createClient()
- page.tsx
- report-data.ts
- config.ts
- ai-config.ts
- devDependencies
- ADR-003: Memory Privacy Boundary
- Trading Journal (project)
- risk-service.ts
- today-service.ts
- emit.ts
- ARCHITECTURE_FREEZE Canonical Doc
- G2 Rules Cutover Design Spec
- ruleDataFromExecutableInput()
- gen-theme-css.mjs
- use-data-table.ts
- commitment-service.ts
- resolveEmbeddingCall()
- analytics-bundle.ts
- gen-icons.mjs
- accounts.ts
- Behavior Engine Subsystem
- Intervention Engine Subsystem
- Hardening: P&L, Enforcement, CI/Migrations and Performance (2026-06-10, PRs #6–#17)
- Changelog — Trading Journal v2
- rules.ts
- page.tsx
- page.tsx
- trajectory-panel.tsx
- DrawdownModel
- loadWeeklyReport()
- G2 — Rules Cutover: rules Is the Only Source (2026-07-13)
- ai-models-card.tsx
- welch.ts
- verifiers.ts
- pdf-report-html.ts
- Coach Subsystem
- Memoria del coach (4 capas: episódica, semántica, identidad, mejora)
- Roadmap reservado (apuestas con disparador propio, no iniciadas)
- commitment-machine.ts
- memory-episode-service.ts
- resolve-provider.ts
- ADR-001: Event Runtime and Delivery
- AI Config, Migrations and Documentation Consolidation (2026-06-05)
- review-insights.ts
- revisar-recurso-modal.tsx
- useQuickActions
- Sidebar.tsx
- feed.ts
- emotion-feedback.ts
- profile.ts
- scripts
- Trade Service Layer (src/server/services/trades/)
- dashboardStats Server-Side Analytics (Sprint 2)
- Task 5 — Borrar automations router, dual-write e informe de migración
- coach-service.ts
- route.ts
- useLogout.ts
- setup-intelligence-panel.tsx
- Gate G2 — cutover de reglas (automations → rules)
- analytics-cache.ts
- pattern-detector.ts
- memory-pattern-service.ts
- package.json
- Sprints 9-12 — Portfolio MVP, PWA, PDF, Onboarding (2026-06-04)
- Behavior Engine (insight → compromiso → regla → verificación → refuerzo)
- Prompt de retoma de sesión
- TECHNICAL_DEBT.md (fuente de la deuda técnica; borrado, 2026-06-05)
- tab-playbook.tsx
- risk-budget.ts
- study-sessions.ts
- preferences.ts
- AI Coach
- Digest cognitivo semanal ('Tu semana cognitiva')
- RULES_SOURCE env var
- context.ts
- goal-progress-widget.tsx
- account-risk-panel.tsx
- trade-derivation.ts
- backfill-embeddings.mjs
- backfill-resource-embeddings.mjs
- E2: Rule (unificado con Automation)
- Cognitive Engine (root bounded context)
- improvement-panel.tsx
- action-list.tsx
- note-tag-suggestions.tsx
- command-palette.tsx
- mae-mfe.ts
- reinforcement.ts
- prop-firm-presets.ts
- capture-rules.ts
- handler()
- period-summary.tsx
- benchmark.ts
- pnl-heatmap.ts
- load-state.ts
- index.ts
- CI job: checks (type check, tests, build)
- BACKLOG.md (fuente del backlog; borrado, 2026-06-05)
- README.md
- vercel.json
- layout.tsx
- proxy.ts
- CLAUDE.md
- Invariante: bloqueo pre-trade real
- E4: LearningResource (+transferBaseline)
- AGENTS.md
- Convención de proyecto: usar graphify (query/path/explain/update) antes de grep/browsing crudo
- Ajustes (configuración, no es superficie cognitiva)
- ANALIZAR (superficie cognitiva)
- P3: Rigor honesto sobre muestras retail
- P4: Calma por defecto; la intervención es la única interrupción
- P5: El cerebro (Cognitive Engine) es independiente de la piel
- P7: Ningún insight muere como texto
- P9: Cada migración es reversible hasta verificación
- POST-7: A/B de variantes de setup (#50)
- Auditoría Técnica Exhaustiva (37 hallazgos)
- KPIs computed over first 50 paginated trades bug
- Off-schema tables (notes_embedding, email_log) not in Prisma
- Profile page fully disconnected from backend (CRÍTICO)
- Stack: Next.js 16 + tRPC v11 + Prisma 7 + Supabase
- CoachMemory (commitments + fulfillment) proposal
- AI Coach is reactive, no memory, no initiative
- Missing longitudinal analysis / rolling windows
- Broken improvement loop (commitments not verified)
- Rule vs Automation duality confusion (C6)
- Notifications P0–P3 with Per-Category Preferences
- App Scripts (dev/build/start/lint/test/e2e from src/)
- Tags Catalog (color/icon/category)
- Next.js Agent Rules (breaking-changes warning)
- CLAUDE.md
- src CLAUDE.md (includes AGENTS.md)
- src README (Next.js create-next-app)
- @anthropic-ai/sdk
- clsx
- dotenv
- framer-motion
- @hookform/resolvers
- jsdom
- katex
- lucide-react
- next
- pg
- prisma
- @prisma/adapter-pg
- puppeteer-core
- @radix-ui/react-checkbox
- @radix-ui/react-dialog
- @radix-ui/react-select
- @radix-ui/react-tabs
- @radix-ui/react-toggle-group
- @radix-ui/react-tooltip
- react-dom
- react-email
- @react-email/components
- @react-email/render
- react-hook-form
- recharts
- check-schema-drift.sh
- @sentry/nextjs
- sonner
- @sparticuz/chromium
- @supabase/ssr
- @supabase/supabase-js
- tailwind-merge
- @tanstack/react-query
- @tanstack/react-table
- @trpc/client
- @trpc/next
- @trpc/react-query
- @trpc/server
- @types/pg
- zod
- zustand
- tailwindcss
- @tailwindcss/postcss
- @testing-library/jest-dom
- @types/node
- @types/react
- @types/react-dom
- vitest

## God Nodes (most connected - your core abstractions)
1. `cn()` - 155 edges
2. `trpc` - 69 edges
3. `formatErrorForUser()` - 62 edges
4. `isWin()` - 39 edges
5. `Trading Journal (producto)` - 37 edges
6. `protectedProcedure` - 34 edges
7. `RouterOutputs` - 34 edges
8. `calcWinRate()` - 33 edges
9. `toast` - 33 edges
10. `getDashboardStats()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `runRules()` --semantically_similar_to--> `runAutomations() (retirado en G2)`  [INFERRED] [semantically similar]
  src/domains/rules/engine.ts → docs/superpowers/specs/2026-07-13-g2-rules-cutover-design.md
- `Derivación mode/severity (BLOCK ⇒ enforce+CRÍTICA, sin BLOCK ⇒ warn+MEDIA)` --rationale_for--> `ruleDataFromExecutableInput()`  [EXTRACTED]
  docs/superpowers/plans/2026-07-13-g2-rules-cutover.md → src/domains/rules/rule-write.ts
- `Task 3: Engine — checkConsistency` --implements--> `checkConsistency()`  [EXTRACTED]
  docs/superpowers/plans/2026-07-10-post6-prop-firm-rulebase.md → src/domains/trading/services/prop-firm-guard.ts
- `Task 5: Engine — phaseProgress` --implements--> `phaseProgress`  [EXTRACTED]
  docs/superpowers/plans/2026-07-10-post6-prop-firm-rulebase.md → src/domains/trading/services/prop-firm-guard.ts
- `Task 2: Engine — checkTrailingDrawdown` --implements--> `checkTrailingDrawdown()`  [EXTRACTED]
  docs/superpowers/plans/2026-07-10-post6-prop-firm-rulebase.md → src/domains/trading/services/prop-firm-guard.ts

## Import Cycles
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/withdrawals.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/accounts.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 4-file cycle: `src/domains/analytics/services/discipline-service.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/domains/analytics/services/discipline-service.ts`
- 4-file cycle: `src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/report-data.ts`
- 4-file cycle: `src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/report-data.ts`
- 4-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/insights-engine.ts`
- 4-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 4-file cycle: `src/domains/analytics/services/psychology-insights.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/psychology-insights.ts`
- 4-file cycle: `src/domains/trading/services/risk-enforcement.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/accounts.ts -> src/domains/trading/services/risk-enforcement.ts`
- 4-file cycle: `src/server/services/trades/trade-read-service.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/server/services/trades/trade-read-service.ts`
- 4-file cycle: `src/server/services/tags/seed.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/tags.ts -> src/server/services/tags/seed.ts`
- 5-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 5-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/server/services/email/send-review.ts -> src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/email/send-review.ts`
- 5-file cycle: `src/server/services/email/send-review.ts -> src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/email/send-review.ts`
- 5-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/psychology-insights.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/review-ai.ts -> src/domains/analytics/services/insights-engine.ts`

## Hyperedges (group relationships)
- **Cadena Insight→Compromiso→Regla→Seguimiento→Verificación→Refuerzo** — docs_architecture_freeze_e6, docs_architecture_freeze_e7, docs_architecture_freeze_e8, docs_architecture_freeze_e9, docs_architecture_behavior_state_machine, docs_architecture_behavior_engine [EXTRACTED 1.00]
- **Mecanismo de entrega de eventos (outbox durable + fast-path síncrono)** — docs_architecture_outbox_pattern, docs_architecture_fast_path, docs_architecture_freeze_d1, docs_architecture_freeze_d5, docs_architecture_freeze_d6 [EXTRACTED 1.00]
- **Frontera anti-poisoning de memoria (LLM propone, datos confirman)** — docs_architecture_freeze_p6, docs_architecture_freeze_d9, docs_architecture_context_assembler, docs_architecture_memoria, docs_architecture_freeze_e14, docs_architecture_freeze_e15 [EXTRACTED 1.00]
- **Behavior Loop Rules Enforcement (loop → rules → blocking)** — readme_behavior_loop, readme_behavior_engine, docs_changelog_g2_rules_cutover, docs_changelog_rules_engine_enforcement, readme_pre_trade_blocking [INFERRED 0.85]
- **TD-018 Trade Service Extraction** — docs_changelog_trade_service_layer, docs_changelog_trade_serializers, docs_changelog_embedding_service, docs_changelog_dashboard_service, docs_changelog_trade_read_service, docs_changelog_trade_write_service, docs_changelog_trades_router_slimdown [EXTRACTED 1.00]
- **AI Provider Resolution Flow (persisted key → env → none)** — docs_changelog_resolve_provider_engine, docs_changelog_user_ai_configs_table, docs_changelog_anthropic_key_root_cause, docs_changelog_ai_diagnostics_healthcheck [EXTRACTED 1.00]
- **Cutover G2 de reglas (automations → rules)** — docs_status_g2_cutover, docs_status_rules_source_env, docs_status_pr_129, docs_status_run_rules_test, docs_project_guide_rules_engine, docs_project_guide_unified_rules [EXTRACTED 1.00]
- **Loop de mejora de comportamiento (insight → compromiso → regla → verificación → refuerzo → índice)** — docs_project_guide_behavior_engine, docs_project_guide_unified_rules, docs_project_guide_improvement_score, docs_project_guide_today_feed, docs_project_guide_commitment_service [EXTRACTED 1.00]
- **Compañero cognitivo v3.2 (quinto eje: memoria visible + cierre del bucle con el trader)** — docs_project_guide_coach_memory, docs_project_guide_coach_write_tools, docs_project_guide_cognitive_digest, docs_project_guide_pre_session_checkin, docs_project_guide_ia_coach [INFERRED 0.85]
- **Prop-Firm Rule Engine Pipeline** — src_domains_trading_services_prop_firm_guard_checktrailingdrawdown, src_domains_trading_services_prop_firm_guard_checkconsistency, src_domains_trading_services_prop_firm_guard_checkweekendholding, src_domains_trading_services_prop_firm_guard_phaseprogress, src_domains_trading_services_prop_firm_status_buildpropfirmextras [INFERRED 0.85]
- **Snapshot Preset Application Flow** — src_prisma_schema_propfirmpreset, src_server_trpc_routers_prop_firm_presets, src_app_cuentas_components_prop_firm_preset_picker, src_prisma_schema_account, docs_superpowers_specs_2026_07_10_post6_prop_firm_rulebase_design_presetid_field [INFERRED 0.80]
- **POST-6 QA Closure Blockers (a/b/c)** — docs_superpowers_handoffs_2026_07_10_post6_prop_firm_rulebase_qa_firm_numbers_verified, docs_superpowers_handoffs_2026_07_10_post6_prop_firm_rulebase_qa_e2e_anon_key_resolved, docs_superpowers_handoffs_2026_07_10_post6_prop_firm_rulebase_qa_qa_playwright_blocked [EXTRACTED 1.00]
- **Secuencia de tasks del retiro de automations (G2 fase 2)** — docs_superpowers_plans_2026_07_13_g2_rules_cutover_task_1_engine_solo_runrules, docs_superpowers_plans_2026_07_13_g2_rules_cutover_task_2_rule_write_helpers, docs_superpowers_plans_2026_07_13_g2_rules_cutover_task_3_router_rules_paridad, docs_superpowers_plans_2026_07_13_g2_rules_cutover_task_4_ui_reglas_trpc_rules, docs_superpowers_plans_2026_07_13_g2_rules_cutover_task_5_borrado_automations, docs_superpowers_plans_2026_07_13_g2_rules_cutover_task_6_validacion_docs_push [EXTRACTED 1.00]
- **Flujo de enforcement de reglas post-G2 (trades → runRules → evaluate/runAction)** — src_server_trpc_routers_trades, src_domains_rules_engine_runrules, src_domains_rules_conditions_evaluate, src_domains_rules_actions_runaction [EXTRACTED 1.00]
- **Service layer de trades TD-018 (serializers, embedding, dashboard, read, write)** — src_server_services_trades_serializers_serializetrade, src_server_services_trades_embedding_service_scheduleembedding, src_server_services_trades_dashboard_service_getdashboardstats, src_server_services_trades_trade_read_service_listtrades, src_server_services_trades_trade_write_service_createtrade [EXTRACTED 1.00]
- **CI/CD antierrores pipeline** — _github_workflows_ci_checks, _github_workflows_ci_e2e, _github_workflows_ci_migrate_validate, _github_workflows_ci_migrate_deploy [EXTRACTED 1.00]

## Communities (267 total, 80 thin omitted)

### Community 0 - "palette-studio.tsx"
Cohesion: 0.07
Nodes (58): ADV_ROLES, CreatorModal(), iconBtn, labelStyle, PaletteStudio(), NOTE: applying the theme on mount / mode-change is intentionally NOT done here., Swatch(), tileBtn() (+50 more)

### Community 1 - "POST-6 Prop-Firm Rulebase Spec"
Cohesion: 0.11
Nodes (36): Deploy/Migration Flow (merge to main → CI applies migration), POST-6 QA Handoff, CI e2e Anon Key Resolved (b), Local Validation Results (prisma generate, tsc, vitest 1176/1176, eslint), QA Playwright Blocked by Corporate MITM SSL (c), Ready-to-Paste Prompt — QA Playwright Run, Ready-to-Paste Prompt — Complete UI (Tasks 9+10), POST-6 Prop-Firm Rulebase Implementation Plan (+28 more)

### Community 2 - "cn()"
Cohesion: 0.11
Nodes (22): Stat(), DOW, TOUR_STEPS, readRect(), Rect, SpotlightTour(), TourStep, ErrorCardsPanel() (+14 more)

### Community 3 - "insights-engine.ts"
Cohesion: 0.16
Nodes (21): CAT_ICON, InsightCards(), sevStyle(), bySymbolDate(), detectAccountRisk(), detectEmotionPerformance(), detectIntradayDecay(), detectLosingStreak() (+13 more)

### Community 4 - "page.tsx"
Cohesion: 0.05
Nodes (69): UI Blocker for Tasks 9/10 — Resolved by commit 71154ac, Task 9: UI — preset picker + enforceMode toggle, handler(), Chip(), PHASE_LABEL, PropFirmPreset, PropFirmPresetPicker(), ACCOUNT_TYPES (+61 more)

### Community 5 - "client.ts"
Cohesion: 0.07
Nodes (38): LinkSetupModal(), AccountHistoryModal(), EVENT_META, Log, PlaybookPage(), EMOTION_LABELS, PERIODS, Period (+30 more)

### Community 6 - "resource-card.tsx"
Cohesion: 0.06
Nodes (45): effectiveMasteryLevel(), MASTERY_STAGES, masteryLevel(), MasteryStage, masteryStageIndex(), masteryStageIndexFromLevel(), STATUS_TO_LEVEL, ARCHIVE_REASONS (+37 more)

### Community 7 - "review-summary.tsx"
Cohesion: 0.10
Nodes (31): ReviewEmailModel, DigestModel, CtaButton(), Divider(), EmailFooter(), EmailLayout(), ProgressBlock(), reviewChipLabel() (+23 more)

### Community 8 - "register-trade-modal.tsx"
Cohesion: 0.08
Nodes (32): SelectableTagChip(), SIZE, TagChip(), TagChipView(), AccountLike, computeAutoTag(), computeContracts(), ERROR_FIELD_ORDER (+24 more)

### Community 9 - "dashboard-analytics.ts"
Cohesion: 0.06
Nodes (63): Partición practice (financiero excluye DEMO_PERSONAL/DEMO_PROP/BACKTEST; discipline las cuenta), Riesgo principal — dashboardStats sin tests previos (mitigado con test T3 antes de mover), TD-018 Task 3 — Dashboard service + primer test de orquestación, dashboard-service.test.ts (partición practice), CacheDb, CacheRow, getCachedStats(), isCacheEnabled() (+55 more)

### Community 10 - "page.tsx"
Cohesion: 0.07
Nodes (48): fmt(), FocusSession(), PlanSessionModal(), todayISO(), ResourceFromDB, ResourceFromDB, blankDraft(), CATEGORY_SUGGESTIONS (+40 more)

### Community 11 - "dependencies"
Cohesion: 0.18
Nodes (11): class-variance-authority, @prisma/client, @radix-ui/react-dropdown-menu, @radix-ui/react-popover, resend, dependencies, class-variance-authority, @prisma/client (+3 more)

### Community 12 - "monthly-letter.tsx"
Cohesion: 0.17
Nodes (16): AiAnalysisCard(), Period, LearningSummary(), Card(), Delta(), Eyebrow(), Period, ReviewActions() (+8 more)

### Community 13 - "3. HALLAZGOS POR MÓDULO"
Cohesion: 0.40
Nodes (6): ARCHITECTURE.md (freeze v3.1: principios, decisiones, entidades, eventos, 5 ADRs), CHANGELOG.md (historial consolidado), PROJECT_GUIDE.md — Project Guide Trading Journal v3.2, FREEZE-P1 (principio congelado), RECAP_V3_V32 (detalle sprint a sprint, en historial git), STATUS.md — Estado vivo Trading Journal v3.2

### Community 14 - "review-card.tsx"
Cohesion: 0.12
Nodes (21): Campaign(), disciplineColor(), fmtMoney(), GRADE_TONE, pnlColor(), ReviewCard(), ReviewFromDB, tintFor() (+13 more)

### Community 15 - "send-review.ts"
Cohesion: 0.11
Nodes (31): react, detectDecayedResources(), ResourceForDecay, LearningDigest(), resolveTheme(), localDateISO(), react, EmailPrefRow (+23 more)

### Community 16 - "coach-memory-service.ts"
Cohesion: 0.15
Nodes (20): assembleContextBlock(), assembleCoachContext(), confirmMemory(), createMemory(), deleteMemory(), editMemory(), listMemory(), ADR-0003 (+12 more)

### Community 17 - "ai-coach-drawer.tsx"
Cohesion: 0.16
Nodes (17): Block, CALLOUT, CALLOUT_ALIASES, CalloutType, CODE_KEYWORDS, CodeBlock(), detectCallout(), HEADING_CLASS (+9 more)

### Community 18 - "index.ts"
Cohesion: 0.08
Nodes (33): calcNetPnl(), calcAvgR(), calcExpectancyR(), SetupHealthParams, SetupHealthStatus, AiUsageLog, AnalyticsCache, AnalyticsInput (+25 more)

### Community 19 - "notify.tsx"
Cohesion: 0.16
Nodes (20): AppError, isAppError(), toUserMessage(), TRPC_TO_CODE, LABELS, MessageCode, interpolate(), isMessageCode() (+12 more)

### Community 20 - "page.tsx"
Cohesion: 0.08
Nodes (20): COLORS, DbSetup, Direction, DirectionChip(), FORM_INIT, HealthStatus, MARKET_FILTERS, MARKETS (+12 more)

### Community 21 - "prisma.ts"
Cohesion: 0.11
Nodes (24): POST(), POST(), ADR-0001, POST(), AuthResult, checkCronAuth(), POST(), timingSafeMatch() (+16 more)

### Community 22 - "trade-write-service.ts"
Cohesion: 0.07
Nodes (37): Stub deprecado 'stats' se queda en el router a propósito, TD-018 Task 5 — Write service: create, TD-018 Task 6 — Write service: update + close, TD-018 Task 7 — Write service: addEvent + delete + saveChecklistResult, BudgetGuardInput, BudgetGuardResult, evaluateBudgetGuard(), CacheDelegate (+29 more)

### Community 23 - "page.tsx"
Cohesion: 0.13
Nodes (25): AiInsightsPanel(), AccountsIntel(), amt(), AnalyticsPage(), Edges(), fmt(), GoalRow(), Goals() (+17 more)

### Community 24 - "motion.ts"
Cohesion: 0.24
Nodes (10): EditionHeader(), EditionHeaderData, money(), TONE, nodeColor(), ReviewFromDB, ReviewsTimeline(), TimelineChapter (+2 more)

### Community 25 - "ai-context.ts"
Cohesion: 0.13
Nodes (25): buildTraderContext(), RawAccountRow, RawLearningRow, RawMarketRow, RawReviewRow, RawRuleRow, RawSessionRow, RawSetupRow (+17 more)

### Community 26 - "improvement-service.ts"
Cohesion: 0.12
Nodes (24): clamp01(), computeImprovementScore(), costOfIndiscipline(), DEFAULT_WEIGHTS, Driver, ImprovementInputs, ImprovementResult, ImprovementWeights (+16 more)

### Community 27 - "bayes.ts"
Cohesion: 0.15
Nodes (19): betaBinomialEstimate(), betacf(), BetaPrior, betaQuantile(), cohensH(), DEFAULT_BETA_PRIOR, DEFAULT_NORMAL_PRIOR, erf() (+11 more)

### Community 28 - "risk-enforcement.ts"
Cohesion: 0.14
Nodes (25): assertTradeable(), autoUnlock(), EnforceableAccount, evaluateAndLock(), hasAnyLimit(), loadAccountRisk(), loadEquityCurve(), LOCK_REASON_TEXT (+17 more)

### Community 29 - "index.ts"
Cohesion: 0.06
Nodes (49): ImportCsvModal(), MarketItem, TradesPage(), EditTradeModalProps, LogSessionPopover(), MetricRow(), MetricRowProps, SESSION_COLOR (+41 more)

### Community 30 - "tab-portfolio.tsx"
Cohesion: 0.10
Nodes (24): Card(), CardProps, ChartTooltip(), TooltipPayload, fmtDate(), MONTHS_ES, TYPE_META, DashboardStats (+16 more)

### Community 31 - "isWin()"
Cohesion: 0.19
Nodes (12): buildPnlByDate(), buildMonthlyReport(), kpisOf(), MonthlyReport, ReportTrade, sessionsOf(), buildWeeklyReport(), DAY_LABELS (+4 more)

### Community 32 - "trades-table.tsx"
Cohesion: 0.14
Nodes (19): RFC-4180, Checkbox(), getResult(), QUALITY_TAGS, qualityOf(), RESULT_LABELS, SESSION_CFG, shortAccount() (+11 more)

### Community 33 - "root.ts"
Cohesion: 0.13
Nodes (19): Task 6: tRPC propFirmPresets.list + typed catalog, Context, createTRPCContext(), protectedProcedure, t, AppRouter, RouterInputs, accountLogsRouter (+11 more)

### Community 34 - "page.tsx"
Cohesion: 0.18
Nodes (12): Period, useDashboardStats(), DashboardPage(), Tab, TABS, VALID_PERIODS, PsicologiaPage(), ChecklistItem (+4 more)

### Community 35 - "monthly-reviews.ts"
Cohesion: 0.10
Nodes (29): ReviewPeriod, finalizeMonthlyReview(), FinalizeResult, MONTHS_ES, evaluateGoal(), GoalContext, GoalProposal, GoalStatus (+21 more)

### Community 36 - "account-card.tsx"
Cohesion: 0.14
Nodes (21): ACCOUNT_STATUS_META, AccountCard(), AccountExposure, AccountRisk, formatSyncAgo(), isPropFirmLike(), KpiBox(), RawAccount (+13 more)

### Community 37 - "playbook-service.ts"
Cohesion: 0.14
Nodes (21): Window, detectSetupDrift(), DriftDimension, DriftDimensionKey, DriftInput, DriftResult, DriftTrade, mean() (+13 more)

### Community 38 - "coach-tools.ts"
Cohesion: 0.19
Nodes (16): CoachToolName, PERIOD_DAYS, PROTECTION_TO_METRIC, ToolCtx, calcProfitFactor(), convertToBase(), fxFactor(), parseFxRates() (+8 more)

### Community 39 - "types.ts"
Cohesion: 0.12
Nodes (19): ACTION_LABEL, ActionList(), ALL, TAG_ACTIONS, ACTION_TYPES, ActionDeps, ActionResult, Handler (+11 more)

### Community 40 - "page.tsx"
Cohesion: 0.11
Nodes (16): ACTION_LABEL, ExecRuleRow, SystemRulesTab(), TABS, Template, TRIGGER_LABEL, COPY, RuleModeBadge() (+8 more)

### Community 41 - "risk-ratios.ts"
Cohesion: 0.23
Nodes (13): addDays(), compareCurrentVsPrevious(), Comparison, Dated, isCount(), rollingWindow(), RollingWindowOpts, sortByDate() (+5 more)

### Community 42 - "feature-models.ts"
Cohesion: 0.13
Nodes (22): AI_FEATURES, AI_PROVIDERS_LIST, AiFeature, AiSettings, CHAT_LADDER, CostPriority, DEFAULT_AI_SETTINGS, EMBEDDING_LADDER (+14 more)

### Community 43 - "Checklist de QA pendiente de V3 (109 ítems)"
Cohesion: 0.10
Nodes (26): Check-in pre-sesión (go/caution/no_go), RiskBudgetMeter, Feed HOY (TodayFeed), AUDIT_FINAL.md (auditoría final; §9 manda sobre §5), Gaps de AUDIT_FINAL (GAP-A/B/C/D/E), GAP-A1 — guard de presupuesto diario pre-trade (✅ PR #116), GAP-A2 — transferencia #31 + SRS #45 (✅ PR #118), GAP-A3 — migración real de rutas a 5 superficies (roadmap) (+18 more)

### Community 44 - "review-report-shell.tsx"
Cohesion: 0.16
Nodes (20): EquityCurveChart(), PnlTrendChart(), TrendTooltip(), DownloadPdfButton(), pnlColor(), AccountBreakdown(), Analytics, BreakdownBars() (+12 more)

### Community 45 - "institutional-summary.ts"
Cohesion: 0.16
Nodes (17): EquityDrawdownChart(), fmt(), analyzeDrawdown(), daysBetween(), DrawdownPoint, DrawdownResult, EMPTY, EquityPoint (+9 more)

### Community 46 - "simple-table.tsx"
Cohesion: 0.12
Nodes (22): CardEquityChart(), DAYS, Pattern, PatternCards(), TONE, AnimatedItem(), AnimatedList(), ROW_PAD (+14 more)

### Community 47 - "psychology-service.ts"
Cohesion: 0.17
Nodes (16): calibration(), CalibrationResult, CalibrationTrade, CalibrationVerdict, ADR-0002, avg(), MoodSample, moodTrend (+8 more)

### Community 48 - "risk-of-ruin.ts"
Cohesion: 0.15
Nodes (20): Band, jeffreysBand(), Bottleneck, mean(), PassOutcome, percentile(), projectPhasePass(), PropProjectionResult (+12 more)

### Community 49 - "learning-resources.ts"
Cohesion: 0.12
Nodes (16): computeNewStreak(), utcMidnight(), computeNextReview(), Grade, SrsInput, SrsResult, updateEase(), LearningResourceInput (+8 more)

### Community 50 - "Trading Journal (producto)"
Cohesion: 0.09
Nodes (22): Módulo Aprendizaje / SRS (/aprendizaje), Módulo Cuentas (/cuentas), Módulo Dashboard (/dashboard), Módulo Etiquetas (/etiquetas), Formula Engine (lib/formulas — performance, win-rate, risk, drawdown, discipline, setup), Persona: Funded Trader, Módulo Mercados (/mercados), Next.js App Router + React (frontend) (+14 more)

### Community 51 - "trades.ts"
Cohesion: 0.12
Nodes (23): Refactor behavior-preserving (RouterOutputs y schemas zod intactos), Sustituciones mecánicas (ctx.prisma→prisma, ctx.userId→userId, ctx.supabase→supabase), TD-018 Task 1 — Serializers, TD-018 Task 4 — Read service (list/violaciones/emoción/patrones), EmotionInsight(), LABELS, EmotionFeedback, EmotionStat (+15 more)

### Community 52 - "page.tsx"
Cohesion: 0.14
Nodes (17): JumpItem, MonthJumpIndex(), labelFor(), MonthFilter, MONTHS_LONG, MONTHS_SHORT, ReviewsCalendarFilter(), Overview (+9 more)

### Community 53 - "overview.ts"
Cohesion: 0.13
Nodes (21): InsightCategory, InsightSeverity, buildPeriodSummary(), CATEGORY_TAG, downsample(), loadPatterns(), loadReviewsOverview(), money() (+13 more)

### Community 54 - "seed-psych-trades.mjs"
Cohesion: 0.13
Nodes (21): ACCOUNTS, between(), buildTrade(), c, cols, DRY, EMO_LOSS, EMO_WIN (+13 more)

### Community 55 - "Analytics Subsystem"
Cohesion: 0.15
Nodes (19): ADR-002: Estrategia estadística, Analytics (subsistema, determinista), ANALYTICS_V3.md, C3: sin longitudinal (crítico auditoría), C4: métricas institucionales (crítico auditoría), C8: insights sin historiar (crítico auditoría), FREEZE-D15: estadística Bayesiana/jerárquica con shrinkage, FREEZE-D16: proyecciones prop no estacionarias (sin puntos sin banda) (+11 more)

### Community 56 - "route.ts"
Cohesion: 0.19
Nodes (18): dupKey(), POST(), storedKey(), toDirection(), DryRunResponse, CTRADER_COLS, detectFormat(), parseCtraderDate() (+10 more)

### Community 57 - "page.tsx"
Cohesion: 0.15
Nodes (19): Task 2: Engine — checkTrailingDrawdown, Task 4: Engine — checkWeekendHolding, Task 8: Wire checks into dashboard status + ENFORCE lock, Gap: Consistency Rule Not Yet Implemented, Gap: Trailing Drawdown Logic Not Yet Implemented, Gap: Weekend Holding Restriction Not Yet Implemented, Realized-Equity-Only Enforcement Limitation, checkConsistency() (+11 more)

### Community 58 - "condition-group.tsx"
Cohesion: 0.15
Nodes (15): CMP_LABEL, ConditionGroup(), Group, isLeaf(), isNot(), newLeaf(), NotNode, ENUM (+7 more)

### Community 59 - "behavior.ts"
Cohesion: 0.24
Nodes (10): block(), canEnforce(), proposeRuleForCommitment(), suggestRuleForInsight(), acceptRuleSuggestion(), createRuleFromProposal(), dismissRuleSuggestion(), linkRule() (+2 more)

### Community 60 - "compilerOptions"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+22 more)

### Community 61 - "resolveAiCall()"
Cohesion: 0.19
Nodes (16): PERIODS, POST(), PERIODS, POST(), ALLOWED_MIME, POST(), AnalyticsAiOptions, buildContext() (+8 more)

### Community 62 - "page.tsx"
Cohesion: 0.08
Nodes (36): HoyTab(), ALL_TYPES, ProgresoSections(), ResourceFromDB, TYPE_COLORS, ResourceFromDB, useResourceActions(), AddEditResourceModal() (+28 more)

### Community 63 - "ConditionNode"
Cohesion: 0.25
Nodes (14): RuleDraft, ProposedRule, RuleSuggestionProposal, PROTECTION_TEMPLATE_MAP, PROTECTION_TEMPLATES, ProtectionTemplate, AutomationTemplate, BASE_TEMPLATES (+6 more)

### Community 64 - "trade-detail-panel.tsx"
Cohesion: 0.19
Nodes (17): detectCleanStreak(), detectEmotionBeforeLoss(), detectHoldingAsymmetry(), detectImpulsiveExpectancy(), detectOverconfidence(), detectViolationEmotion(), generatePsychologyInsights(), holdMin() (+9 more)

### Community 65 - "edge-service.ts"
Cohesion: 0.16
Nodes (16): computeInstrumentEdges(), EdgeVerdict, InstrumentEdge, InstrumentEdgeResult, InstrumentTrade, mean(), computeTagEdges(), mean() (+8 more)

### Community 66 - "intervention-service.ts"
Cohesion: 0.15
Nodes (19): ActionKind, clamp01(), DayState, decideIntervention(), DecisionOpts, detectInterventions(), FatigueState, InterventionCandidate (+11 more)

### Community 67 - "learning-insights-service.ts"
Cohesion: 0.18
Nodes (15): ErrorCard, ErrorCardInput, ErrorTrade, generateErrorCards(), PerfSignal, computeTransfer(), mean(), TransferInput (+7 more)

### Community 68 - "notifications.ts"
Cohesion: 0.20
Nodes (14): NotificacionesPage(), NotificationBell(), CenterPanel(), CenterSheet(), formatNotifTime(), NotificationItem(), NotificationItemProps, TYPE_STYLE (+6 more)

### Community 69 - "event-bus.ts"
Cohesion: 0.13
Nodes (15): DispatchResult, DomainEventRecord, EventHandler, EventStatus, EventTransition, HandlerOutcome, handlers, isKnownEventType() (+7 more)

### Community 70 - "weekly-reviews.ts"
Cohesion: 0.33
Nodes (4): emailFailureMessage(), CATEGORIES, notificationsRouter, PRIORITIES

### Community 71 - "createClient()"
Cohesion: 0.22
Nodes (9): POST(), Provider, rateLimiter, testAnthropicKey(), testOpenAIKey(), testOpenRouterKey(), createRateLimiter(), InMemoryRateLimiter (+1 more)

### Community 72 - "page.tsx"
Cohesion: 0.12
Nodes (6): AI_PROVIDERS, COLORBLIND_OPTIONS, SESSIONS, TIMEZONES, SUPPORTED_CURRENCIES, USD_VALUE

### Community 73 - "report-data.ts"
Cohesion: 0.35
Nodes (9): usableCandidates(), ensureReviewAnalysis(), persistMonthlyAnalysis(), persistWeeklyAnalysis(), AnyReport, buildAnalysisPrompt(), Candidate, fmt() (+1 more)

### Community 74 - "config.ts"
Cohesion: 0.16
Nodes (16): POST(), ChatMessage, streamChat(), StreamChatOptions, SystemBlock, systemToString(), CoachAgentOptions, streamCoachAgent() (+8 more)

### Community 75 - "ai-config.ts"
Cohesion: 0.18
Nodes (13): ConnectivityResult, testProviderConnectivity(), decryptApiKey(), encryptApiKey(), EncryptionConfigError, getEncryptionKey(), maskApiKey(), rotateEncryptionKey() (+5 more)

### Community 76 - "devDependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, @playwright/test, devDependencies, eslint, eslint-config-next, @playwright/test, @testing-library/react (+9 more)

### Community 77 - "ADR-003: Memory Privacy Boundary"
Cohesion: 0.12
Nodes (21): ADR-003: Privacidad de la memoria y frontera anti-corrupción, AI_COACH_V3.md, Máquina de estados del Behavior Engine (ACTIVE→KEPT/PARTIAL/BROKEN/EXPIRED), C2: sin memoria (crítico auditoría), FREEZE-D11: write con confirmación explícita del coach, FREEZE-D9: frontera anti-poisoning de memoria (irreversible), E11: Intervention (severity/urgency/confidence/expectedImpact), E13: MemoryEpisode (+13 more)

### Community 78 - "Trading Journal (project)"
Cohesion: 0.13
Nodes (17): Learning System (spaced repetition, decay detection, materialized streak, email idempotency), Phase 0-1 — Foundation and Learning, Security/RLS, Auth, Data Correction (Phase 0-1), docs/auditoria-producto-trading-journal-v2.md (binding audit, findings C1–C8), Bayesian Confidence Bands (shrinkage estimator), Cognitive Layer Thesis (v3), 5 Cognitive Surfaces (HOY · OPERAR · ANALIZAR · PROTEGER · MEJORAR), domains/ Pure Business Logic by Bounded Context (cognitive · behavior · analytics · rules · trading) (+9 more)

### Community 79 - "risk-service.ts"
Cohesion: 0.20
Nodes (16): aggregateExposure(), AggregateFreezeInput, aggregateFreezeSignal, CorrelationResult, Direction, OpenPosition, SymbolExposure, computeRiskBudget() (+8 more)

### Community 80 - "today-service.ts"
Cohesion: 0.13
Nodes (23): KIND_ICON, severityColor(), TodayFeed(), RiskBudget, AnomalyInput, AnomalyResult, assembleTodayFeed(), BASE (+15 more)

### Community 81 - "emit.ts"
Cohesion: 0.29
Nodes (9): buildCognitiveDigest(), DigestInput, DigestResult, isoWeekKey(), sendCognitiveDigest(), getImprovementSeries(), getConfirmedPatterns(), emitNotification() (+1 more)

### Community 82 - "ARCHITECTURE_FREEZE Canonical Doc"
Cohesion: 0.16
Nodes (16): Principio "Absorber, no borrar", ADR-000: Decisiones de raíz de Trading Journal v3.1, ADR-004: Reserva de datos cross-user (BIZ-1), ARCHITECTURE_CHALLENGE.md, auditoria-producto-trading-journal-v2.md, BEHAVIOR_ENGINE_V3.md, BIZ-1: decisión de aislamiento de datos cross-user, Regla de control de cambios (todo cambio arquitectónico cita un ID de freeze) (+8 more)

### Community 83 - "G2 Rules Cutover Design Spec"
Cohesion: 0.08
Nodes (29): G2 Fase 2 — Retiro de automations · Implementation Plan, Global constraints G2 (sin migraciones, no merge a main, guard prisma.automation), Nota post-merge — borrar RULES_SOURCE de Vercel + smoke opcional, Task 4 — UI /reglas → trpc.rules.*, Task 6 — Validación final, docs y push, TD-018 — Trade Service Extraction Implementation Plan, Patrón I/O shell — load data, run pure logic, persist, Self-review — 14 procedures del router cubiertos por T1-T7 (+21 more)

### Community 84 - "ruleDataFromExecutableInput()"
Cohesion: 0.17
Nodes (19): Task 2 — Helpers puros de escritura de reglas (rule-write, TDD), Task 3 — Router rules a paridad ejecutable, rule-write.test.ts, AutomationsTab(), RemindersTab(), ExecutableRuleInput, ruleDataFromExecutableInput(), ruleDataFromTemplate() (+11 more)

### Community 85 - "gen-theme-css.mjs"
Cohesion: 0.23
Nodes (14): accentContrastFor(), clamp01(), contrastRatio(), derivePalette(), hexToRgb(), linearToSrgb(), okl(), oklchToHex() (+6 more)

### Community 86 - "use-data-table.ts"
Cohesion: 0.21
Nodes (13): RetirosTable(), AppToaster(), SimpleColumn, ColumnMeta, loadJSON(), multiSelectFilter(), @tanstack/react-table, useDataTable() (+5 more)

### Community 87 - "commitment-service.ts"
Cohesion: 0.15
Nodes (20): CommitmentWindow, getVerifier(), publishEvent(), acceptProposedCommitment(), carryOverCommitments(), createCommitmentFromInsight(), CreateCommitmentOverrides, dismissProposedCommitment() (+12 more)

### Community 88 - "resolveEmbeddingCall()"
Cohesion: 0.32
Nodes (11): TD-018 Task 2 — Embedding service, extractTradeId(), POST(), secretsMatch(), EmbedOptions, embedText(), resolveEmbeddingCall(), backfillEmbeddings() (+3 more)

### Community 89 - "analytics-bundle.ts"
Cohesion: 0.22
Nodes (13): AccountIntel, AnalyticsBundle, buildAnalyticsBundle(), EmotionIntel, holdMinutes(), MarketIntel, round1(), round2() (+5 more)

### Community 90 - "gen-icons.mjs"
Cohesion: 0.19
Nodes (14): BG, chunk(), clamp(), crc32(), __dirname, distSeg(), DOT, encodePNG() (+6 more)

### Community 91 - "accounts.ts"
Cohesion: 0.13
Nodes (10): ACCOUNT_STATUSES, ACCOUNT_TYPES, AccountInput, accountsRouter, ENFORCE_MODES, PHASES, RawAccount, withdrawalsRouter (+2 more)

### Community 92 - "Behavior Engine Subsystem"
Cohesion: 0.21
Nodes (14): Anti-fatiga (token-bucket, decay, cooldown, silencio ganado), Behavior Engine (subsistema), C5: loop reviews abierto (crítico auditoría), FREEZE-D13: refuerzo de ratio variable + soporte de autonomía, FREEZE-D4: Behavior Engine es el dueño del loop, FREEZE-D7: Commitment sólo se ofrece donde existe verificador, E10: RuleSuggestion, E3: WeeklyReview / MonthlyReview (+6 more)

### Community 93 - "Intervention Engine Subsystem"
Cohesion: 0.14
Nodes (18): Cognitive Engine (bounded context raíz), DESIGN_SYSTEM_V3.md, FREEZE-D14: override duro de capital, FREEZE-D2: Cognitive Engine aislado, E12: PreSessionCheckin, E20: RiskBudget (derivado/persistido), E5: DomainEvent (outbox), EV1: trade.created (+10 more)

### Community 94 - "Hardening: P&L, Enforcement, CI/Migrations and Performance (2026-06-10, PRs #6–#17)"
Cohesion: 0.16
Nodes (14): Commission Optional on Close (#14), GitHub Actions Updated Node 20 → 24 (checkout@v5, setup-node@v5, pnpm/action-setup@v5) (#13), Hardening: P&L, Enforcement, CI/Migrations and Performance (2026-06-10, PRs #6–#17), GitHub Actions Secrets → migrate-deploy Job Green, Negative Sign on Losses Fix (#17), Node Pinned to 20.12+ (.nvmrc + engines) (#7), parsePointValue Helper, P&L Point Value Fix on Manual Close (#14) (+6 more)

### Community 95 - "Changelog — Trading Journal v2"
Cohesion: 0.14
Nodes (14): Documentation Consolidation (9 master docs + docs/archive/), 21 P0 QA Findings Resolved, Psychology Fields + plan_notes Migration, Sprint 4 — Psychology, Reviews and Personalization, Sprint 5 — AI Config, Goals, planNotes, Pagination, UX, International Support, Sprint 6 — System Theme, Review Filters, Sparklines, Type Safety, Security Hardening, Sprint 7 — Reviews Hardening, Discipline Centralization, Infrastructure, Sprint 8 — Testing, Accessibility, Monthly Reviews (+6 more)

### Community 96 - "rules.ts"
Cohesion: 0.14
Nodes (13): Workaround TS2589 (select escalar + tipo de salida explícito), action, ACTION_TYPES, cmp, conditionNode, conditionValue, executableInput, leaf (+5 more)

### Community 97 - "page.tsx"
Cohesion: 0.11
Nodes (16): CAT_COLOR, CAT_LABELS, CATS, FORM_INIT, MarketForm, MarketItem, MarketModal(), MercadosPage() (+8 more)

### Community 98 - "page.tsx"
Cohesion: 0.16
Nodes (14): AiCoachDrawer(), ApiError, clampPos(), formatTime(), Message, SUGGESTED, TOOL_LABELS, useIsMobile() (+6 more)

### Community 99 - "trajectory-panel.tsx"
Cohesion: 0.18
Nodes (12): Bead, BEADS, buildChart(), fmtWeek(), HOVER, money(), Overview, STAT (+4 more)

### Community 100 - "DrawdownModel"
Cohesion: 0.20
Nodes (11): AccountRiskConfig, DerivedRiskInputs, deriveRiskInputs(), median(), pctToFraction(), PropProjectionInput, DrawdownModel, AccountPhase (+3 more)

### Community 101 - "loadWeeklyReport()"
Cohesion: 0.12
Nodes (18): computeDisciplineScore(), DisciplineDetail, DisciplinePeriod, DisciplineResult, calcDisciplineScore(), DisciplineBreakdown, DisciplineParams, FinalizeResult (+10 more)

### Community 102 - "G2 — Rules Cutover: rules Is the Only Source (2026-07-13)"
Cohesion: 0.21
Nodes (13): automations Table Archived, G2 — Rules Cutover: rules Is the Only Source (2026-07-13), /reglas Edits rules — Executable Parity Router (builder, merged templates, reorder, badges), rule-sync Dual-Write (retired), Rules Engine Enforcement (runRules-only), /api/cron/rules-migration-report (retired), RULES_SOURCE Flag (retired), Behavior Engine (+5 more)

### Community 103 - "ai-models-card.tsx"
Cohesion: 0.17
Nodes (11): AiModelsCard(), ALL_TOOL_MODELS, COST_OPTIONS, FEATURE_LABEL, inputStyle, looksToolIncapable(), Provider, PROVIDER_LABEL (+3 more)

### Community 104 - "welch.ts"
Cohesion: 0.32
Nodes (11): mean(), oneSampleTTest(), sampleVariance(), studentTTwoSidedP(), TTestResult, welchTTest(), detectEdgeDecay(), EdgeDecayInput (+3 more)

### Community 105 - "verifiers.ts"
Cohesion: 0.17
Nodes (9): METRIC_KEYS, OFF_PLAN_TAGS, REGISTRY, sortByDateTime(), Verifier, VerifierOpts, VerifierResult, verifyTradesPerDayBeyond2() (+1 more)

### Community 106 - "pdf-report-html.ts"
Cohesion: 0.36
Nodes (12): analysisHtml(), C, CALLOUT, calloutHtml(), card(), equitySvg(), esc(), kpiCell() (+4 more)

### Community 107 - "Coach Subsystem"
Cohesion: 0.20
Nodes (12): C7: captura psico opcional (crítico auditoría), Coach (subsistema), Context Assembler (presupuesto de tokens), FREEZE-D10: Context Assembler con presupuesto, FREEZE-D12: router de modelos LLM, EV3: insight.created, EV5: commitment.created, EV9: checkin.submitted (+4 more)

### Community 108 - "Memoria del coach (4 capas: episódica, semántica, identidad, mejora)"
Cohesion: 0.18
Nodes (12): Frontera anti-envenenamiento (memoria), Memoria del coach (4 capas: episódica, semántica, identidad, mejora), CoachMemoryPanel / CoachMemoryLayers, Write-tools del coach con permiso (propose_rule / propose_commitment), Bounded context cognitive/ (events, intervention, memory, coach), Estructura por dominios (src/domains/), Módulo IA Coach (drawer global), Intervention Engine (intervenciones en caliente) (+4 more)

### Community 109 - "Roadmap reservado (apuestas con disparador propio, no iniciadas)"
Cohesion: 0.18
Nodes (12): Persona: Prop Firm Candidate, Flag tj.v3Shell (OFF por defecto), Superficies ANALIZAR / PROTEGER / MEJORAR, A3 — rutas reales de 5 superficies (/hoy, /operar, /analizar, /proteger, /mejorar), POST-1 — realtime/SSE (disparador no activado), POST-2 — coach multiagente (disparador no activado), POST-4 — régimen exógeno ATR / datos de mercado (disparador no activado), POST-5 — extracción a servicio (disparador no activado) (+4 more)

### Community 110 - "commitment-machine.ts"
Cohesion: 0.15
Nodes (15): canCommit(), CommitmentResult, CommitmentSpec, CommitmentStatus, Comparator, deriveCommitmentSpec(), evaluateResult(), INSIGHT_SPECS (+7 more)

### Community 111 - "memory-episode-service.ts"
Cohesion: 0.30
Nodes (10): BASE, decayedSalience(), initialSalience(), MemoryEventType, recallScore(), EpisodeRow, rankBySalience(), RecalledEpisode (+2 more)

### Community 112 - "resolve-provider.ts"
Cohesion: 0.23
Nodes (11): getProviderKey(), ACTIVE_AI_FEATURES, AiDiagnostics, ALL_PROVIDERS, buildAiDiagnostics(), KeySource, ProviderKeyStatus, ResolvedCall (+3 more)

### Community 113 - "ADR-001: Event Runtime and Delivery"
Cohesion: 0.35
Nodes (11): ADR-001: Runtime de eventos y entrega, C1: coach reactivo (crítico auditoría), lib/coach-bus.ts (helper cliente, no es el bus de dominio), Camino rápido (fast-path síncrono in-trade), FREEZE-D1: Outbox transaccional + dispatcher, FREEZE-D5: SLA de intervención redefinido (síncrono ≤2s), FREEZE-D6: el outbox es la única fuente de verdad, Gate G1 (validación spike outbox) (+3 more)

### Community 114 - "AI Config, Migrations and Documentation Consolidation (2026-06-05)"
Cohesion: 0.27
Nodes (11): Advisor Migration Made Replay-Safe (#11), AI Config, Migrations and Documentation Consolidation (2026-06-05), AI Diagnostics and Health Check (aiConfig.diagnostics, aiConfig.healthCheck, lib/ai/health-check.ts), Root Cause Fix: 'Configura ANTHROPIC_API_KEY' with OpenRouter Configured, add_color_theme_preferences Migration Name Aligned with Prod (#12), OpenRouter Key Save Fix (user_ai_configs missing in prod), prisma.config.ts: Prisma Generates Client Only, Never Migrates, AI Provider Resolution Engine (lib/ai/resolve-provider.ts) (+3 more)

### Community 115 - "review-insights.ts"
Cohesion: 0.22
Nodes (13): ComputedInsight, InsightStatus, PersistedInsightRef, reconcileInsights(), ReconcilePlan, ADR-0002, loadActiveRefs(), persistInsights() (+5 more)

### Community 116 - "revisar-recurso-modal.tsx"
Cohesion: 0.14
Nodes (13): 1. Verificar que los intermedios siguen en disco, 2. Re-lanzar SOLO los chunks 01 y 04 (en paralelo, mismo mensaje), 3. Validar los 2 chunks nuevos, 4. Fusionar los 5 chunks (02+03+05 ya existentes + 01+04 nuevos) en `.graphify_semantic.json`, 5. Re-fusionar semantic + AST (`.graphify_extract.json`) y reconstruir el grafo completo, 6. Limpiar intermedios y commitear, Contexto de negocio (por si la máquina nueva no tiene memoria persistente), Cómo retomar (pasos exactos) (+5 more)

### Community 117 - "useQuickActions"
Cohesion: 0.12
Nodes (20): CreateAction, IconTab(), MobileBottomBar(), NavItem, useReducedMotion(), DeskItem(), MobileClock(), NAV (+12 more)

### Community 118 - "Sidebar.tsx"
Cohesion: 0.25
Nodes (12): ToastCard(), ToastCardProps, TypeStyle, NotifType, Priority, ResolvedAction, DURATION, haptic() (+4 more)

### Community 119 - "feed.ts"
Cohesion: 0.18
Nodes (10): AssembleInput, MemoryExtraction, MemoryKind, MemoryStatus, parseMemoryExtraction(), ProposedMemory, proposeMemory(), ADR-0003 (+2 more)

### Community 120 - "emotion-feedback.ts"
Cohesion: 0.20
Nodes (8): Goal, GOAL_STATUS, MonthlyLetter(), NEXT_STATUS, ReportData, SENTIMENT, TONE, makeMoney()

### Community 121 - "profile.ts"
Cohesion: 0.31
Nodes (8): invalidateAnalyticsCacheIfNeeded(), isValidIanaTimezone(), normalizeProfileInput(), PROFILE_PUBLIC_FIELDS, UpdateProfileInput, validateProfileUpdate(), createAdminClient(), profileRouter

### Community 122 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, e2e, e2e:ui, email, gen:theme, lint (+3 more)

### Community 123 - "Trade Service Layer (src/server/services/trades/)"
Cohesion: 0.24
Nodes (10): Dashboard Service (dashboardStats pipeline), First Direct dashboardStats Test (practice partition), Debt Closure Cycles 1/2 (render purity, a11y ARIA, TD-018/019/037 scoped), TD-018 — Trade Services Extracted from trades Router (2026-07-14, PR #130), Trade Read Service (list/violations/emotion/patterns), Trade Serializers Service, Trade Service Layer (src/server/services/trades/), Trade Write Service (create/update/close/addEvent/delete/checklist) (+2 more)

### Community 124 - "dashboardStats Server-Side Analytics (Sprint 2)"
Cohesion: 0.20
Nodes (10): dashboardStats Server-Side Analytics (Sprint 2), Prop-Firm Drawdown + Limit Enforcement Unified (#6), Formula Engine (Sprint 1), Prop-Firm Rules Enforcement (Sprint 3), Sprints 1-3 — Foundation, Temporal Locks No Longer Offer Manual Unlock (#17), Index trades(user_id, status, date desc) (#11), ImprovementScore (North Star, composite 0–100) (+2 more)

### Community 125 - "Task 5 — Borrar automations router, dual-write e informe de migración"
Cohesion: 0.27
Nodes (10): Derivación mode/severity (BLOCK ⇒ enforce+CRÍTICA, sin BLOCK ⇒ warn+MEDIA), Guard — cero referencias a prisma.automation/trpc.automations en src/, Task 5 — Borrar automations router, dual-write e informe de migración, Dual-write automations→rules, Gate OI-1 — informe de no-mapeo con datos reales, Paridad espejo perfecta (0 faltantes, 0 drift), /api/cron/rules-migration-report (retirado en G2), buildNoMappingReport() (retirado en G2) (+2 more)

### Community 126 - "coach-service.ts"
Cohesion: 0.33
Nodes (10): calmarRatio(), computeRiskRatios(), Kelly, kellyCriterion(), kellyFromR, mean(), rollingRiskRatios(), sortinoRatio() (+2 more)

### Community 127 - "route.ts"
Cohesion: 0.36
Nodes (9): POST(), USER_SELECT, ReviewEmailStatus, ReviewEmailUser, dayOfMonthOf(), duePeriods(), previousMonth(), previousWeekStart() (+1 more)

### Community 128 - "useLogout.ts"
Cohesion: 0.33
Nodes (7): LoginPage(), PerfilPage(), useLogout(), clearSessionStorageKeys(), SESSION_SCOPED_STORAGE_KEYS, STORAGE_KEYS, createClient()

### Community 129 - "setup-intelligence-panel.tsx"
Cohesion: 0.31
Nodes (8): EdgeEvolutionChart(), fmt(), Windows, DECAY_META, Drift, driftValue(), fmt(), SetupIntelligencePanel()

### Community 130 - "Gate G2 — cutover de reglas (automations → rules)"
Cohesion: 0.25
Nodes (9): Automation (modelo legado, absorbido por Rule), Módulo Reglas (/reglas), Rules engine (domains/rules — runRules, fuente única post-G2), Reglas unificadas enforce/warn (Rule), Gate G2 — cutover de reglas (automations → rules), PR #129 (cutover G2, mergeado 2026-07-13, a28df30), Env var RULES_SOURCE (flip del cutover), run-rules.test.ts (invariante de no-regresión del bloqueo pre-trade) (+1 more)

### Community 131 - "analytics-cache.ts"
Cohesion: 0.28
Nodes (5): metadata, viewport, AppShell(), ServiceWorkerRegister(), TRPCProvider()

### Community 132 - "pattern-detector.ts"
Cohesion: 0.28
Nodes (8): AiMeta, MONTHS, NarrativeVM, ReviewKind, ReviewReportVM, WeeklyReport, WeeklyReportBundle, ReviewAnalytics

### Community 133 - "memory-pattern-service.ts"
Cohesion: 0.24
Nodes (10): POST(), recomputeInsightsForAll(), DetectedPattern, detectPatterns(), EpisodeForPattern, PATTERN_TEXT, PatternStatus, recordImprovementSnapshotForAll() (+2 more)

### Community 134 - "package.json"
Cohesion: 0.25
Nodes (7): engines, node, name, packageManager, pnpm, private, version

### Community 135 - "Sprints 9-12 — Portfolio MVP, PWA, PDF, Onboarding (2026-06-04)"
Cohesion: 0.25
Nodes (8): ISO Week in UTC Fix (weekly metrics and streaks), Onboarding Checklist (4 steps, progress ring), Onboarding Fix Batch (#10), PDF Export of Performance Report, Multi-Account Equity Curve + Comparison (Portfolio tab), PWA (manifest + service worker, installable, offline read) + PNG icons, Service Worker Excluded from Auth Middleware Matcher (#8), Sprints 9-12 — Portfolio MVP, PWA, PDF, Onboarding (2026-06-04)

### Community 136 - "Behavior Engine (insight → compromiso → regla → verificación → refuerzo)"
Cohesion: 0.33
Nodes (6): Behavior Engine (insight → compromiso → regla → verificación → refuerzo), BehaviorLoopPanel (UI en /analytics), commitment-service (createCommitmentFromInsight / evaluateWindowCommitments / carryOverCommitments), ImprovementScore / Índice de mejora (0–100), pgvector (búsqueda semántica / embeddings), Migraciones v3.2 aplicadas (improvement_scores E19, memory_episodes E13, memory_patterns E14, memory_identity E15, feed_ignores C3)

### Community 137 - "Prompt de retoma de sesión"
Cohesion: 0.33
Nodes (6): Event bus / outbox (publishEvent, dispatchPending, planEventTransition), BIZ-1 — aislamiento de datos cross-user (decisión de negocio), Check de drift SQL↔Prisma en CI (siguiente pieza; cierra S0/DT-4), Gate G1 (replay migración S0 + spike end-to-end del outbox), POST-3 — moat cross-user (disparador no activado), S0 open items (S0/OI-*, S0/DT-1..6, S0/R-1..6, S0/BIZ-1)

### Community 138 - "TECHNICAL_DEBT.md (fuente de la deuda técnica; borrado, 2026-06-05)"
Cohesion: 0.20
Nodes (10): Módulo Trades (/trades), tRPC 11.x (API end-to-end types), DataTable dev render loop (bug dev-only conocido), Usuario demo/E2E ariaoc89@gmail.com (GH secret E2E_USER_PASSWORD), PR #130 (TD-018 trade-service, 2026-07-14), Prompt de retoma de sesión, TD-018 — extraer lógica del router trades.ts a trade-service (✅ 2026-07-14), TD-019 — cliente Supabase por-request en contexto tRPC (⚠️ probablemente abierto) (+2 more)

### Community 139 - "tab-playbook.tsx"
Cohesion: 0.36
Nodes (6): checklistColor(), getWeekKey(), HEALTH_CONFIG, LifecycleSuggestions(), sessionCellColor(), TabPlaybook()

### Community 140 - "risk-budget.ts"
Cohesion: 0.33
Nodes (8): buildLearningDigest(), daysBetween(), DigestInput, DigestReview, formatDateLabel(), isoDate(), ReviewKind, isStreakAtRisk()

### Community 141 - "study-sessions.ts"
Cohesion: 0.13
Nodes (18): computeProgressPct(), computeResourceStatus(), applyStudyFinish(), minutesThisWeek(), pickStudySuggestion(), ResourceProgressLite, ResourceProgressUpdate, startOfWeekUTC() (+10 more)

### Community 142 - "preferences.ts"
Cohesion: 0.25
Nodes (7): isValidSelection(), COLOR_SCHEMES, DEFAULT_GRAINS, preferencesRouter, TABLE_DENSITIES, THEMES, UpdatePreferencesInput

### Community 143 - "AI Coach"
Cohesion: 0.33
Nodes (7): Embedding Service (pgvector schedule/search/backfill), AI Coach, Invariant: Anti-Poisoning Boundary (LLM never writes memory/identity directly; proposes, data/user confirm), 4-Layer Hierarchical Memory (episodic pgvector · semantic · identity · improvement), Invariants (no sprint broke them), Invariant: Permission (the system proposes, the user disposes), Weekly Cognitive Digest

### Community 144 - "Digest cognitivo semanal ('Tu semana cognitiva')"
Cohesion: 0.33
Nodes (7): Digest cognitivo semanal ('Tu semana cognitiva'), Rutas api/cron (recompute-insights, dispatch-events, evaluate-commitments, cognitive-digest, rules-migration-report), Cron cognitive-digest sin agendar (/api/cron/cognitive-digest), Protección de contraseñas filtradas en Supabase Auth (toggle manual), Ops pendientes (acción del usuario, sin código), PENDING_AND_RESUME.md (fuente de ops y roadmap; borrado), Crons existentes en prod (dispatch-events, recompute-insights, evaluate-commitments, learning-digest, reviews-digest)

### Community 145 - "RULES_SOURCE env var"
Cohesion: 0.28
Nodes (7): ensureTagsSeeded(), SYSTEM_APPEARANCE, SystemTagDef, systemTagDefs(), DISPLAY_MODES, tagsRouter, QUALITY_TAGS

### Community 146 - "context.ts"
Cohesion: 0.32
Nodes (8): Task 1 — Engine solo-runRules (borrar flag/dispatcher/runAutomations), Test de no-regresión 'G2 cutover invariant', Riesgo residual — divergencia semántica sutil de runRules, run-rules.test.ts (invariante de no-regresión), runAction(), rulesSourceIsUnified() (retirado en G2), runAutomations() (retirado en G2), runRules()

### Community 147 - "goal-progress-widget.tsx"
Cohesion: 0.29
Nodes (4): GoalProgressWidget(), GoalProgressWidgetProps, GoalRingProps, KpiSummary

### Community 148 - "account-risk-panel.tsx"
Cohesion: 0.19
Nodes (9): AccountRiskPanel(), asPct(), BOTTLENECK, pct(), RiskBudgetMeter(), clamp01(), DailyWindow, DailyWindowInput (+1 more)

### Community 149 - "trade-derivation.ts"
Cohesion: 0.38
Nodes (6): deriveRiskAmount(), deriveRiskPct(), deriveSession(), parseHour(), RiskInput, SessionLabel

### Community 150 - "backfill-embeddings.mjs"
Cohesion: 0.33
Nodes (5): apiKey, c, decryptApiKey(), EMBED_MODEL, encKey()

### Community 151 - "backfill-resource-embeddings.mjs"
Cohesion: 0.33
Nodes (5): apiKey, c, decryptApiKey(), EMBED_MODEL, encKey()

### Community 152 - "E2: Rule (unificado con Automation)"
Cohesion: 0.40
Nodes (6): C6: dualidad reglas (crítico auditoría), FREEZE-D8: la fusión Rule/Automation es semántica, E2: Rule (unificado con Automation), Riesgo: moat débil, POST-6: Base de reglas prop-firm como activo central (moat), RI-2: fusión de reglas (riesgo)

### Community 153 - "Cognitive Engine (root bounded context)"
Cohesion: 0.29
Nodes (6): DataTable(), gridTemplate(), RovingItemProps, Row(), ROW_PAD, TableSkeleton()

### Community 154 - "improvement-panel.tsx"
Cohesion: 0.47
Nodes (5): fmt(), Improvement, ImprovementPanel(), REGIME_LABEL, scoreColor()

### Community 155 - "action-list.tsx"
Cohesion: 0.36
Nodes (4): detectProvider(), getCoachModel(), getWeeklySummaryModel(), resolveModel()

### Community 156 - "note-tag-suggestions.tsx"
Cohesion: 0.47
Nodes (4): NoteTagSuggestions(), RULES, suggestTagsFromNote(), TagRule

### Community 157 - "command-palette.tsx"
Cohesion: 0.38
Nodes (7): Firm Numbers Verified (a) — MyFundedFX replaced by MyFundedFutures, MyFundedFutures Preset (replacement firm), Catalog Seed v1 — 3 Anchor Firms, FTMO Preset Rules, Gap: Firm Catalog Does Not Exist Yet, MyFundedFX Preset Rules, Topstep Preset Rules

### Community 158 - "mae-mfe.ts"
Cohesion: 0.40
Nodes (5): analyzeMaeMfe(), EMPTY, MaeMfeResult, MaeMfeTrade, mean()

### Community 159 - "reinforcement.ts"
Cohesion: 0.29
Nodes (7): @next/swc-linux-x64-gnu, @next/swc-linux-x64-musl, prisma, @prisma/engines, sharp, unrs-resolver, onlyBuiltDependencies

### Community 160 - "prop-firm-presets.ts"
Cohesion: 0.33
Nodes (5): DrawdownModel, FIRMS, Phase, PROP_FIRM_PRESETS, PropFirmPresetSeed

### Community 161 - "capture-rules.ts"
Cohesion: 0.33
Nodes (6): CheckinInput, CheckinResult, checkinVerdict, clamp(), LABEL, submitCheckin()

### Community 162 - "handler()"
Cohesion: 0.60
Nodes (4): CountUp(), format(), parse(), Parsed

### Community 163 - "period-summary.tsx"
Cohesion: 0.50
Nodes (3): money(), PeriodSummary(), Summary

### Community 164 - "benchmark.ts"
Cohesion: 0.50
Nodes (4): analyzeBenchmark(), BenchmarkResult, BenchmarkSetupRow, weightedComparison()

### Community 165 - "pnl-heatmap.ts"
Cohesion: 0.40
Nodes (3): DailyPnl, HeatmapDay, HeatmapResult

### Community 167 - "index.ts"
Cohesion: 0.50
Nodes (3): sendEmail(), sendPropFirmHealthAlert(), supabase

### Community 168 - "CI job: checks (type check, tests, build)"
Cohesion: 0.50
Nodes (4): CI job: checks (type check, tests, build), CI job: authenticated E2E (Playwright), CI job: migrate-deploy (apply migrations to production), CI job: migrate-validate (replay from scratch)

### Community 169 - "BACKLOG.md (fuente del backlog; borrado, 2026-06-05)"
Cohesion: 0.50
Nodes (4): BACKLOG.md (fuente del backlog; borrado, 2026-06-05), Backlog P1 — próximo v2.1 (B-01..B-05: iconos PWA, eslint CI, E2E Playwright, Sentry, carga 1000+ trades), Backlog P2 — deseable (B-06..B-10: charts en PDF, patrones en UI, onboarding fallback, SW cache bump, comparar reviews), Backlog P3 — oportunista (B-11..B-16: features IA, AiUsageLog, multi-divisa, API brokers, PWA móvil, social)

### Community 170 - "README.md"
Cohesion: 0.40
Nodes (3): dashboardMutation, MarketInput, marketsRouter

### Community 171 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

### Community 211 - "CLAUDE.md"
Cohesion: 0.67
Nodes (3): DirectionalEstimate, Estimate, ConfidenceBucket

## Knowledge Gaps
- **1013 isolated node(s):** `check-schema-drift.sh script`, `PALETTES`, `target`, `Instruments`, `TagEdges` (+1008 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **80 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `@types/pg`, `zod`, `zustand`, `package.json`, `send-review.ts`, `@anthropic-ai/sdk`, `clsx`, `dotenv`, `framer-motion`, `@hookform/resolvers`, `katex`, `lucide-react`, `next`, `pg`, `@prisma/adapter-pg`, `puppeteer-core`, `@radix-ui/react-checkbox`, `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-tabs`, `@radix-ui/react-toggle-group`, `@radix-ui/react-tooltip`, `react-dom`, `@react-email/components`, `@react-email/render`, `react-hook-form`, `recharts`, `@sentry/nextjs`, `sonner`, `@sparticuz/chromium`, `@supabase/ssr`, `@supabase/supabase-js`, `tailwind-merge`, `@tanstack/react-query`, `@tanstack/react-table`, `@trpc/client`, `@trpc/next`, `@trpc/react-query`, `@trpc/server`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `@trpc/client` connect `@trpc/client` to `dependencies`, `client.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `cn()` connect `page.tsx` to `cn()`, `client.ts`, `resource-card.tsx`, `register-trade-modal.tsx`, `page.tsx`, `tab-playbook.tsx`, `monthly-letter.tsx`, `ai-coach-drawer.tsx`, `page.tsx`, `Cognitive Engine (root bounded context)`, `index.ts`, `tab-portfolio.tsx`, `trades-table.tsx`, `page.tsx`, `simple-table.tsx`, `page.tsx`, `page.tsx`, `notifications.ts`, `page.tsx`, `page.tsx`, `useQuickActions`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `check-schema-drift.sh script`, `PALETTES`, `target` to the rest of the system?**
  _1013 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `palette-studio.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06540825285338016 - nodes in this community are weakly interconnected._
- **Should `POST-6 Prop-Firm Rulebase Spec` be split into smaller, more focused modules?**
  _Cohesion score 0.10634920634920635 - nodes in this community are weakly interconnected._
- **Should `cn()` be split into smaller, more focused modules?**
  _Cohesion score 0.11330049261083744 - nodes in this community are weakly interconnected._