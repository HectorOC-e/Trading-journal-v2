# Graph Report - .  (2026-07-16)

## Corpus Check
- Large corpus: 550 files · ~309,499 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 3350 nodes · 7518 edges · 216 communities (184 shown, 32 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 119 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

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
- src CLAUDE.md (includes AGENTS.md)
- src README (Next.js create-next-app)

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
- `G2 — Rules Cutover: rules Is the Only Source (2026-07-13)` --cites--> `docs/ARCHITECTURE.md (canonical architecture, freeze v3.1 + ADRs, FREEZE-* IDs)`  [INFERRED]
  docs/CHANGELOG.md → README.md
- `Embedding Service (pgvector schedule/search/backfill)` --semantically_similar_to--> `4-Layer Hierarchical Memory (episodic pgvector · semantic · identity · improvement)`  [INFERRED] [semantically similar]
  docs/CHANGELOG.md → README.md
- `ImprovementScore (North Star, composite 0–100)` --semantically_similar_to--> `dashboardStats Server-Side Analytics (Sprint 2)`  [INFERRED] [semantically similar]
  README.md → docs/CHANGELOG.md

## Import Cycles
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/accounts.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/withdrawals.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 4-file cycle: `src/server/services/tags/seed.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/tags.ts -> src/server/services/tags/seed.ts`
- 4-file cycle: `src/domains/trading/services/risk-enforcement.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/accounts.ts -> src/domains/trading/services/risk-enforcement.ts`
- 4-file cycle: `src/domains/analytics/services/discipline-service.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/domains/analytics/services/discipline-service.ts`
- 4-file cycle: `src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/report-data.ts`
- 4-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 4-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/insights-engine.ts`
- 4-file cycle: `src/domains/analytics/services/psychology-insights.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/psychology-insights.ts`
- 4-file cycle: `src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/report-data.ts`
- 4-file cycle: `src/server/services/trades/trade-read-service.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/server/services/trades/trade-read-service.ts`
- 5-file cycle: `src/server/services/tags/seed.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/server/services/trades/trade-write-service.ts -> src/server/services/tags/seed.ts`
- 5-file cycle: `src/server/services/email/send-review.ts -> src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/email/send-review.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/overview.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/review-ai.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/psychology-insights.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/server/services/email/send-review.ts -> src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/email/send-review.ts`

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

## Communities (216 total, 32 thin omitted)

### Community 0 - "palette-studio.tsx"
Cohesion: 0.06
Nodes (63): metadata, viewport, ADV_ROLES, CreatorModal(), iconBtn, labelStyle, PaletteStudio(), NOTE: applying the theme on mount / mode-change is intentionally NOT done here. (+55 more)

### Community 1 - "POST-6 Prop-Firm Rulebase Spec"
Cohesion: 0.06
Nodes (64): Deploy/Migration Flow (merge to main → CI applies migration), POST-6 QA Handoff, CI e2e Anon Key Resolved (b), Firm Numbers Verified (a) — MyFundedFX replaced by MyFundedFutures, Local Validation Results (prisma generate, tsc, vitest 1176/1176, eslint), MyFundedFutures Preset (replacement firm), QA Playwright Blocked by Corporate MITM SSL (c), Ready-to-Paste Prompt — QA Playwright Run (+56 more)

### Community 2 - "cn()"
Cohesion: 0.06
Nodes (49): fmt(), FocusSession(), DOW, HoyTab(), TOUR_STEPS, ALL_TYPES, ProgresoSections(), ResourceFromDB (+41 more)

### Community 3 - "insights-engine.ts"
Cohesion: 0.07
Nodes (51): CAT_ICON, InsightCards(), sevStyle(), ComputedInsight, InsightStatus, PersistedInsightRef, reconcileInsights(), ReconcilePlan (+43 more)

### Community 4 - "page.tsx"
Cohesion: 0.07
Nodes (42): UI Blocker for Tasks 9/10 — Resolved by commit 71154ac, Task 9: UI — preset picker + enforceMode toggle, Chip(), PHASE_LABEL, PropFirmPreset, PropFirmPresetPicker(), AccountHistoryModal(), EVENT_META (+34 more)

### Community 5 - "client.ts"
Cohesion: 0.08
Nodes (33): CATEGORIES, SystemRulesTab(), Period, Period, SendReviewEmailButton(), CoachIdentityEditor(), CoachMemoryLayers(), EVENT_LABEL (+25 more)

### Community 6 - "resource-card.tsx"
Cohesion: 0.07
Nodes (40): effectiveMasteryLevel(), MASTERY_STAGES, masteryLevel(), MasteryStage, masteryStageIndex(), masteryStageIndexFromLevel(), STATUS_TO_LEVEL, ARCHIVE_REASONS (+32 more)

### Community 7 - "review-summary.tsx"
Cohesion: 0.10
Nodes (31): ReviewEmailModel, DigestModel, CtaButton(), Divider(), EmailFooter(), EmailLayout(), ProgressBlock(), reviewChipLabel() (+23 more)

### Community 8 - "register-trade-modal.tsx"
Cohesion: 0.06
Nodes (40): EditTradeModal(), EditTradeModalProps, EMOTION_OPTIONS, EmotionBefore, SESSIONS, Setup, Tab, TAGS_TOGGLEABLE (+32 more)

### Community 9 - "dashboard-analytics.ts"
Cohesion: 0.09
Nodes (37): Partición practice (financiero excluye DEMO_PERSONAL/DEMO_PROP/BACKTEST; discipline las cuenta), Riesgo principal — dashboardStats sin tests previos (mitigado con test T3 antes de mover), TD-018 Task 3 — Dashboard service + primer test de orquestación, dashboard-service.test.ts (partición practice), AccountBalance, AccountExposure, AccountLimits, AccountStat (+29 more)

### Community 10 - "page.tsx"
Cohesion: 0.11
Nodes (30): PlanSessionModal(), todayISO(), ResourceFromDB, ResourceFromDB, ACTION_LABEL, ExecRuleRow, TABS, Template (+22 more)

### Community 11 - "dependencies"
Cohesion: 0.05
Nodes (42): dependencies, @anthropic-ai/sdk, class-variance-authority, clsx, dotenv, framer-motion, @hookform/resolvers, katex (+34 more)

### Community 12 - "monthly-letter.tsx"
Cohesion: 0.09
Nodes (30): AiAnalysisCard(), Period, LearningSummary(), Goal, GOAL_STATUS, MonthlyLetter(), NEXT_STATUS, ReportData (+22 more)

### Community 13 - "3. HALLAZGOS POR MÓDULO"
Cohesion: 0.05
Nodes (37): ARCHITECTURE.md (freeze v3.1: principios, decisiones, entidades, eventos, 5 ADRs), 1. EXECUTIVE SUMMARY, 2. HALLAZGOS CRÍTICOS (los que mueven la aguja), 3.10 Etiquetas, 3.11 Mercados, 3.1 Dashboard, 3.2 Trades (journaling), 3.3 Psicología (+29 more)

### Community 14 - "review-card.tsx"
Cohesion: 0.09
Nodes (28): CardEquityChart(), DAYS, Pattern, PatternCards(), TONE, Campaign(), disciplineColor(), fmtMoney() (+20 more)

### Community 15 - "send-review.ts"
Cohesion: 0.10
Nodes (33): detectDecayedResources(), buildLearningDigest(), daysBetween(), DigestInput, DigestReview, formatDateLabel(), isoDate(), ReviewKind (+25 more)

### Community 16 - "coach-memory-service.ts"
Cohesion: 0.10
Nodes (31): assembleContextBlock(), AssembleInput, MemoryExtraction, MemoryKind, MemoryStatus, parseMemoryExtraction(), ProposedMemory, proposeMemory() (+23 more)

### Community 17 - "ai-coach-drawer.tsx"
Cohesion: 0.08
Nodes (31): AiCoachDrawer(), ApiError, clampPos(), formatTime(), Message, SUGGESTED, TOOL_LABELS, useIsMobile() (+23 more)

### Community 18 - "index.ts"
Cohesion: 0.09
Nodes (32): buildKpis(), calcNetPnl(), calcAvgR(), calcExpectancyR(), AiUsageLog, AnalyticsCache, AnalyticsInput, AnalyticsOutput (+24 more)

### Community 19 - "notify.tsx"
Cohesion: 0.13
Nodes (28): ToastCard(), ToastCardProps, TypeStyle, AppError, isAppError(), toUserMessage(), TRPC_TO_CODE, LABELS (+20 more)

### Community 20 - "page.tsx"
Cohesion: 0.07
Nodes (24): Stat(), COLORS, DbSetup, Direction, DirectionChip(), FORM_INIT, HealthStatus, MARKET_FILTERS (+16 more)

### Community 21 - "prisma.ts"
Cohesion: 0.11
Nodes (24): POST(), POST(), ADR-0001, POST(), AuthResult, checkCronAuth(), POST(), timingSafeMatch() (+16 more)

### Community 22 - "trade-write-service.ts"
Cohesion: 0.12
Nodes (28): Stub deprecado 'stats' se queda en el router a propósito, TD-018 Task 5 — Write service: create, TD-018 Task 6 — Write service: update + close, TD-018 Task 7 — Write service: addEvent + delete + saveChecklistResult, BudgetGuardInput, BudgetGuardResult, evaluateBudgetGuard(), invalidateCache() (+20 more)

### Community 23 - "page.tsx"
Cohesion: 0.13
Nodes (25): AiInsightsPanel(), AccountsIntel(), amt(), AnalyticsPage(), Edges(), fmt(), GoalRow(), Goals() (+17 more)

### Community 24 - "motion.ts"
Cohesion: 0.11
Nodes (25): EditionHeader(), EditionHeaderData, money(), TONE, nodeColor(), ReviewFromDB, ReviewsTimeline(), TimelineChapter (+17 more)

### Community 25 - "ai-context.ts"
Cohesion: 0.09
Nodes (27): buildTraderContext(), RawAccountRow, RawLearningRow, RawMarketRow, RawReviewRow, RawRuleRow, RawSessionRow, RawSetupRow (+19 more)

### Community 26 - "improvement-service.ts"
Cohesion: 0.12
Nodes (25): clamp01(), computeImprovementScore(), costOfIndiscipline(), DEFAULT_WEIGHTS, Driver, ImprovementInputs, ImprovementResult, ImprovementWeights (+17 more)

### Community 27 - "bayes.ts"
Cohesion: 0.11
Nodes (26): betaBinomialEstimate(), betacf(), BetaPrior, betaQuantile(), cohensH(), DEFAULT_BETA_PRIOR, DEFAULT_NORMAL_PRIOR, DirectionalEstimate (+18 more)

### Community 28 - "risk-enforcement.ts"
Cohesion: 0.14
Nodes (27): assertTradeable(), autoUnlock(), EnforceableAccount, hasAnyLimit(), loadAccountRisk(), loadEquityCurve(), LOCK_REASON_TEXT, lockAccount() (+19 more)

### Community 29 - "index.ts"
Cohesion: 0.08
Nodes (27): mockAccounts, mockMarkets, mockReviews, mockRules, mockSetups, mockTrades, ensureTagsSeeded(), SYSTEM_APPEARANCE (+19 more)

### Community 30 - "tab-portfolio.tsx"
Cohesion: 0.11
Nodes (23): Card(), CardProps, ChartTooltip(), TooltipPayload, fmtDate(), MONTHS_ES, TYPE_META, DashboardStats (+15 more)

### Community 31 - "isWin()"
Cohesion: 0.14
Nodes (22): buildHourStats(), buildSessionStats(), buildMonthlyReport(), kpisOf(), ReportTrade, sessionsOf(), computeDirectionBreakdown(), computeSessionMatrix() (+14 more)

### Community 32 - "trades-table.tsx"
Cohesion: 0.14
Nodes (20): RFC-4180, Checkbox(), getResult(), QUALITY_TAGS, qualityOf(), RESULT_LABELS, SESSION_CFG, shortAccount() (+12 more)

### Community 33 - "root.ts"
Cohesion: 0.14
Nodes (17): Task 6: tRPC propFirmPresets.list + typed catalog, Context, protectedProcedure, t, RouterInputs, accountLogsRouter, goalsRouter, interventionRouter (+9 more)

### Community 34 - "page.tsx"
Cohesion: 0.12
Nodes (20): Period, useDashboardStats(), DashboardPage(), Tab, TABS, VALID_PERIODS, TabDisciplina(), EMOTION_LABELS (+12 more)

### Community 35 - "monthly-reviews.ts"
Cohesion: 0.12
Nodes (21): finalizeMonthlyReview(), FinalizeResult, MONTHS_ES, evaluateGoal(), GoalContext, GoalProposal, GoalStatus, deriveLetterTitle() (+13 more)

### Community 36 - "account-card.tsx"
Cohesion: 0.15
Nodes (20): ACCOUNT_STATUS_META, AccountCard(), AccountExposure, AccountRisk, formatSyncAgo(), isPropFirmLike(), KpiBox(), RawAccount (+12 more)

### Community 37 - "playbook-service.ts"
Cohesion: 0.13
Nodes (22): Window, detectSetupDrift(), DriftDimension, DriftDimensionKey, DriftInput, DriftResult, DriftTrade, mean() (+14 more)

### Community 38 - "coach-tools.ts"
Cohesion: 0.15
Nodes (21): CoachToolName, executeCoachTool(), PERIOD_DAYS, PROTECTION_TO_METRIC, ToolCtx, calcProfitFactor(), calcSetupHealth(), SetupHealthParams (+13 more)

### Community 39 - "types.ts"
Cohesion: 0.13
Nodes (20): Task 1 — Engine solo-runRules (borrar flag/dispatcher/runAutomations), Test de no-regresión 'G2 cutover invariant', Riesgo residual — divergencia semántica sutil de runRules, run-rules.test.ts (invariante de no-regresión), ACTION_TYPES, ActionDeps, ActionResult, Handler (+12 more)

### Community 40 - "page.tsx"
Cohesion: 0.10
Nodes (21): ImportCsvModal(), MarketItem, TradesPage(), AccountRules, ADDABLE_TYPES, AddableType, CONTRACTS_TYPES, EVENT_COLORS (+13 more)

### Community 41 - "risk-ratios.ts"
Cohesion: 0.15
Nodes (22): calmarRatio(), computeRiskRatios(), Kelly, kellyCriterion(), KellyFromR, mean(), rollingRiskRatios(), sortinoRatio() (+14 more)

### Community 42 - "feature-models.ts"
Cohesion: 0.13
Nodes (22): AI_FEATURES, AI_PROVIDERS_LIST, AiFeature, AiSettings, CHAT_LADDER, CostPriority, DEFAULT_AI_SETTINGS, EMBEDDING_LADDER (+14 more)

### Community 43 - "Checklist de QA pendiente de V3 (109 ítems)"
Cohesion: 0.11
Nodes (24): Check-in pre-sesión (go/caution/no_go), RiskBudgetMeter, Feed HOY (TodayFeed), AUDIT_FINAL.md (auditoría final; §9 manda sobre §5), Gaps de AUDIT_FINAL (GAP-A/B/C/D/E), GAP-A1 — guard de presupuesto diario pre-trade (✅ PR #116), GAP-A2 — transferencia #31 + SRS #45 (✅ PR #118), GAP-A3 — migración real de rutas a 5 superficies (roadmap) (+16 more)

### Community 44 - "review-report-shell.tsx"
Cohesion: 0.16
Nodes (20): EquityCurveChart(), PnlTrendChart(), TrendTooltip(), DownloadPdfButton(), pnlColor(), AccountBreakdown(), Analytics, BreakdownBars() (+12 more)

### Community 45 - "institutional-summary.ts"
Cohesion: 0.14
Nodes (19): EquityDrawdownChart(), fmt(), fmt(), RDistributionChart(), analyzeDrawdown(), daysBetween(), DrawdownPoint, DrawdownResult (+11 more)

### Community 46 - "simple-table.tsx"
Cohesion: 0.15
Nodes (18): AnimatedItem(), AnimatedList(), DataTable(), gridTemplate(), RovingItemProps, Row(), ROW_PAD, TableSkeleton() (+10 more)

### Community 47 - "psychology-service.ts"
Cohesion: 0.16
Nodes (19): calibration(), CheckinInput, CheckinResult, CheckinVerdict, clamp(), LABEL, avg(), MoodSample (+11 more)

### Community 48 - "risk-of-ruin.ts"
Cohesion: 0.15
Nodes (20): Band, jeffreysBand(), Bottleneck, mean(), PassOutcome, percentile(), projectPhasePass(), PropProjectionResult (+12 more)

### Community 49 - "learning-resources.ts"
Cohesion: 0.11
Nodes (17): ResourceForDecay, computeNewStreak(), utcMidnight(), computeNextReview(), Grade, SrsInput, SrsResult, updateEase() (+9 more)

### Community 50 - "Trading Journal (producto)"
Cohesion: 0.09
Nodes (22): Módulo Aprendizaje / SRS (/aprendizaje), Módulo Cuentas (/cuentas), Módulo Dashboard (/dashboard), Módulo Etiquetas (/etiquetas), Formula Engine (lib/formulas — performance, win-rate, risk, drawdown, discipline, setup), Persona: Funded Trader, Módulo Mercados (/mercados), Next.js App Router + React (frontend) (+14 more)

### Community 51 - "trades.ts"
Cohesion: 0.16
Nodes (19): TD-018 — Trade Service Extraction Implementation Plan, Patrón I/O shell — load data, run pure logic, persist, Refactor behavior-preserving (RouterOutputs y schemas zod intactos), Self-review — 14 procedures del router cubiertos por T1-T7, Sustituciones mecánicas (ctx.prisma→prisma, ctx.userId→userId, ctx.supabase→supabase), TD-018 Task 1 — Serializers, TD-018 Task 4 — Read service (list/violaciones/emoción/patrones), TD-018 — extraer orquestación de trades.ts (1146 LOC) a service layer (+11 more)

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
Cohesion: 0.13
Nodes (21): ADR-002: Estrategia estadística, Analytics (subsistema, determinista), ANALYTICS_V3.md, C3: sin longitudinal (crítico auditoría), C4: métricas institucionales (crítico auditoría), C8: insights sin historiar (crítico auditoría), FREEZE-D15: estadística Bayesiana/jerárquica con shrinkage, FREEZE-D16: proyecciones prop no estacionarias (sin puntos sin banda) (+13 more)

### Community 56 - "route.ts"
Cohesion: 0.19
Nodes (18): dupKey(), POST(), storedKey(), toDirection(), DryRunResponse, CTRADER_COLS, detectFormat(), parseCtraderDate() (+10 more)

### Community 57 - "page.tsx"
Cohesion: 0.13
Nodes (18): blankDraft(), CATEGORY_SUGGESTIONS, COLOR_PRESETS, DISPLAY_MODES, EtiquetasPage(), ICON_PRESETS, TagRow, BreadcrumbItem (+10 more)

### Community 58 - "condition-group.tsx"
Cohesion: 0.13
Nodes (17): CMP_LABEL, ConditionGroup(), Group, isGroup(), isLeaf(), isNot(), newLeaf(), NotNode (+9 more)

### Community 59 - "behavior.ts"
Cohesion: 0.18
Nodes (17): block(), canEnforce(), ProposedRule, proposeRuleForCommitment(), RuleSuggestionProposal, suggestRuleForInsight(), carryOverCommitments(), dismissProposedCommitment() (+9 more)

### Community 60 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+12 more)

### Community 61 - "resolveAiCall()"
Cohesion: 0.19
Nodes (16): PERIODS, POST(), PERIODS, POST(), AnalyticsAiOptions, buildContext(), streamAnalyticsInsights(), windowFor() (+8 more)

### Community 62 - "page.tsx"
Cohesion: 0.17
Nodes (16): ResourceFromDB, useResourceActions(), AddEditResourceModal(), ResourceFromDB, SetupImpactModal(), LinkSetupModal(), AprendizajePage(), ResourceFromDB (+8 more)

### Community 63 - "ConditionNode"
Cohesion: 0.26
Nodes (15): RuleDraft, PROTECTION_TEMPLATE_MAP, PROTECTION_TEMPLATES, ProtectionTemplate, ExecutableRuleInput, AutomationTemplate, BASE_TEMPLATES, PROTECTION_AS_AUTOMATION (+7 more)

### Community 64 - "trade-detail-panel.tsx"
Cohesion: 0.17
Nodes (18): MetricRow(), MetricRowProps, SESSION_COLOR, SESSION_SHORT, TradeDetailPanelProps, getResult(), RESULT_CFG, SESSION_CFG (+10 more)

### Community 65 - "edge-service.ts"
Cohesion: 0.16
Nodes (16): computeInstrumentEdges(), EdgeVerdict, InstrumentEdge, InstrumentEdgeResult, InstrumentTrade, mean(), computeTagEdges(), mean() (+8 more)

### Community 66 - "intervention-service.ts"
Cohesion: 0.15
Nodes (18): ActionKind, clamp01(), DayState, decideIntervention(), DecisionOpts, detectInterventions(), FatigueState, InterventionCandidate (+10 more)

### Community 67 - "learning-insights-service.ts"
Cohesion: 0.17
Nodes (16): ErrorCard, ErrorCardInput, ErrorTrade, generateErrorCards(), PerfSignal, computeTransfer(), mean(), TransferInput (+8 more)

### Community 68 - "notifications.ts"
Cohesion: 0.20
Nodes (14): NotificacionesPage(), NotificationBell(), CenterPanel(), CenterSheet(), formatNotifTime(), NotificationItem(), NotificationItemProps, TYPE_STYLE (+6 more)

### Community 69 - "event-bus.ts"
Cohesion: 0.13
Nodes (15): DispatchResult, DomainEventRecord, EventHandler, EventStatus, EventTransition, HandlerOutcome, handlers, isKnownEventType() (+7 more)

### Community 70 - "weekly-reviews.ts"
Cohesion: 0.13
Nodes (13): EmailAttachment, emailFailureMessage(), sendEmail(), SendEmailArgs, SendEmailResult, LearningSummary, loadLearningSummary(), CATEGORIES (+5 more)

### Community 71 - "createClient()"
Cohesion: 0.18
Nodes (12): POST(), Provider, rateLimiter, testAnthropicKey(), testOpenAIKey(), testOpenRouterKey(), ALLOWED_MIME, POST() (+4 more)

### Community 72 - "page.tsx"
Cohesion: 0.11
Nodes (7): AI_PROVIDERS, COLORBLIND_OPTIONS, PerfilPage(), SESSIONS, TIMEZONES, SUPPORTED_CURRENCIES, USD_VALUE

### Community 73 - "report-data.ts"
Cohesion: 0.20
Nodes (15): MonthlyReport, usableCandidates(), ensureReviewAnalysis(), persistMonthlyAnalysis(), persistWeeklyAnalysis(), aiMetaOf(), loadMonthlyReport(), MonthlyReportBundle (+7 more)

### Community 74 - "config.ts"
Cohesion: 0.18
Nodes (10): ChatMessage, StreamChatOptions, SystemBlock, CoachAgentOptions, COACH_TOOLS, AiProvider, detectProvider(), getCoachModel() (+2 more)

### Community 75 - "ai-config.ts"
Cohesion: 0.18
Nodes (13): ConnectivityResult, testProviderConnectivity(), decryptApiKey(), encryptApiKey(), EncryptionConfigError, getEncryptionKey(), maskApiKey(), rotateEncryptionKey() (+5 more)

### Community 76 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, eslint-config-next, jsdom, @playwright/test, react-email, tailwindcss, @tailwindcss/postcss (+10 more)

### Community 77 - "ADR-003: Memory Privacy Boundary"
Cohesion: 0.15
Nodes (17): ADR-003: Privacidad de la memoria y frontera anti-corrupción, AI_COACH_V3.md, Máquina de estados del Behavior Engine (ACTIVE→KEPT/PARTIAL/BROKEN/EXPIRED), C2: sin memoria (crítico auditoría), FREEZE-D11: write con confirmación explícita del coach, FREEZE-D9: frontera anti-poisoning de memoria (irreversible), E13: MemoryEpisode, E14: MemoryPattern (+9 more)

### Community 78 - "Trading Journal (project)"
Cohesion: 0.13
Nodes (17): Learning System (spaced repetition, decay detection, materialized streak, email idempotency), Phase 0-1 — Foundation and Learning, Security/RLS, Auth, Data Correction (Phase 0-1), docs/auditoria-producto-trading-journal-v2.md (binding audit, findings C1–C8), Bayesian Confidence Bands (shrinkage estimator), Cognitive Layer Thesis (v3), 5 Cognitive Surfaces (HOY · OPERAR · ANALIZAR · PROTEGER · MEJORAR), domains/ Pure Business Logic by Bounded Context (cognitive · behavior · analytics · rules · trading) (+9 more)

### Community 79 - "risk-service.ts"
Cohesion: 0.22
Nodes (14): aggregateExposure(), AggregateFreezeInput, AggregateFreezeSignal, CorrelationResult, Direction, OpenPosition, SymbolExposure, asDrawdownModel() (+6 more)

### Community 80 - "today-service.ts"
Cohesion: 0.22
Nodes (14): RiskBudget, assembleTodayFeed(), detectDailyAnomaly(), SignalInput, TodayItem, getIgnoreCounts(), recordIgnore(), getTodayFeed() (+6 more)

### Community 81 - "emit.ts"
Cohesion: 0.19
Nodes (14): buildCognitiveDigest(), DigestInput, DigestResult, Lang, isoWeekKey(), sendCognitiveDigest(), getImprovementSeries(), emitNotification() (+6 more)

### Community 82 - "ARCHITECTURE_FREEZE Canonical Doc"
Cohesion: 0.16
Nodes (16): Principio "Absorber, no borrar", ADR-000: Decisiones de raíz de Trading Journal v3.1, ADR-004: Reserva de datos cross-user (BIZ-1), ARCHITECTURE_CHALLENGE.md, auditoria-producto-trading-journal-v2.md, BEHAVIOR_ENGINE_V3.md, BIZ-1: decisión de aislamiento de datos cross-user, Regla de control de cambios (todo cambio arquitectónico cita un ID de freeze) (+8 more)

### Community 83 - "G2 Rules Cutover Design Spec"
Cohesion: 0.15
Nodes (16): G2 Fase 2 — Retiro de automations · Implementation Plan, Global constraints G2 (sin migraciones, no merge a main, guard prisma.automation), Task 4 — UI /reglas → trpc.rules.*, G2 Rules Cutover Design Spec, Archivo P9 — tabla automations intacta, Enfoque A — flip por env var primero, Fase 1 — Flip (ops, sin código), Fase 2 — Retiro de automations (+8 more)

### Community 84 - "ruleDataFromExecutableInput()"
Cohesion: 0.20
Nodes (16): Task 2 — Helpers puros de escritura de reglas (rule-write, TDD), Task 3 — Router rules a paridad ejecutable, rule-write.test.ts, AutomationsTab(), RemindersTab(), ruleDataFromExecutableInput(), ruleDataFromTemplate(), TEMPLATES (+8 more)

### Community 85 - "gen-theme-css.mjs"
Cohesion: 0.23
Nodes (14): accentContrastFor(), clamp01(), contrastRatio(), derivePalette(), hexToRgb(), linearToSrgb(), okl(), oklchToHex() (+6 more)

### Community 86 - "use-data-table.ts"
Cohesion: 0.21
Nodes (13): RetirosTable(), AppToaster(), SimpleColumn, ColumnMeta, loadJSON(), multiSelectFilter(), @tanstack/react-table, useDataTable() (+5 more)

### Community 87 - "commitment-service.ts"
Cohesion: 0.20
Nodes (14): CommitmentWindow, getVerifier(), publishEvent(), acceptProposedCommitment(), createCommitmentFromInsight(), CreateCommitmentOverrides, evaluateCommitment(), EvaluateResultOut (+6 more)

### Community 88 - "resolveEmbeddingCall()"
Cohesion: 0.29
Nodes (12): TD-018 Task 2 — Embedding service, extractTradeId(), POST(), secretsMatch(), EmbedOptions, embedText(), resolveEmbeddingCall(), prisma (+4 more)

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
Cohesion: 0.21
Nodes (14): DESIGN_SYSTEM_V3.md, FREEZE-D14: override duro de capital, E11: Intervention (severity/urgency/confidence/expectedImpact), E15: MemoryIdentity, EV1: trade.created, EV10: intervention.responded, EV2: trade.closed, EV7: rule.fired (+6 more)

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
Cohesion: 0.15
Nodes (11): CAT_COLOR, CAT_LABELS, CATS, FORM_INIT, MarketForm, MarketItem, MarketModal(), MercadosPage() (+3 more)

### Community 98 - "page.tsx"
Cohesion: 0.16
Nodes (11): DeleteCell(), fmtMoney(), FORM_INIT, NuevoRetiroModal(), RetirosPage(), STATUS_META, STATUS_ORDER, WForm (+3 more)

### Community 99 - "trajectory-panel.tsx"
Cohesion: 0.18
Nodes (12): Bead, BEADS, buildChart(), fmtWeek(), HOVER, money(), Overview, STAT (+4 more)

### Community 100 - "DrawdownModel"
Cohesion: 0.20
Nodes (11): AccountRiskConfig, DerivedRiskInputs, deriveRiskInputs(), median(), pctToFraction(), PropProjectionInput, DrawdownModel, AccountPhase (+3 more)

### Community 101 - "loadWeeklyReport()"
Cohesion: 0.23
Nodes (11): computeDisciplineScore(), DisciplineDetail, DisciplinePeriod, DisciplineResult, calcDisciplineScore(), DisciplineBreakdown, DisciplineParams, FinalizeResult (+3 more)

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
Cohesion: 0.23
Nodes (10): canCommit(), CommitmentSpec, CommitmentStatus, Comparator, deriveCommitmentSpec(), evaluateResult(), INSIGHT_SPECS, partialBand() (+2 more)

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
Cohesion: 0.35
Nodes (8): GET(), ReviewPeriod, buildHtml(), MONTHS, renderReviewPdf(), loadReviewAnalytics(), loadReviewInsights(), windowFor()

### Community 116 - "revisar-recurso-modal.tsx"
Cohesion: 0.35
Nodes (9): ResourceFromDB, ReviewFromDB, RevisarRecursoModal(), calcPreviewNextReview(), emptyRevisarState(), fmtRelativeTime(), MASTERY_LABELS, RevisarState (+1 more)

### Community 117 - "useQuickActions"
Cohesion: 0.27
Nodes (8): CreateAction, IconTab(), MobileBottomBar(), NavItem, useReducedMotion(), OnboardingWelcome(), QuickActionsState, useQuickActions

### Community 118 - "Sidebar.tsx"
Cohesion: 0.22
Nodes (8): DeskItem(), MobileClock(), NAV, NavItem, Sidebar(), SURFACE_NAV, useMinuteClock(), useWindowWidth()

### Community 119 - "feed.ts"
Cohesion: 0.24
Nodes (9): KIND_ICON, severityColor(), TodayFeed(), AnomalyInput, AnomalyResult, BASE, SEVERITY_MULT, SignalKind (+1 more)

### Community 120 - "emotion-feedback.ts"
Cohesion: 0.24
Nodes (8): EmotionInsight(), LABELS, EmotionFeedback, EmotionStat, EmotionTrade, round1(), ADR-0002, wrByEmotion()

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
Cohesion: 0.31
Nodes (7): POST(), streamCoachAgent(), systemToString(), buildSystemPrompt(), CoachStreamOptions, MessageParam, streamCoachReply()

### Community 127 - "route.ts"
Cohesion: 0.44
Nodes (8): POST(), USER_SELECT, localHour(), dayOfMonthOf(), duePeriods(), previousMonth(), previousWeekStart(), weekdayOf()

### Community 128 - "useLogout.ts"
Cohesion: 0.38
Nodes (6): LoginPage(), useLogout(), clearSessionStorageKeys(), SESSION_SCOPED_STORAGE_KEYS, STORAGE_KEYS, createClient()

### Community 129 - "setup-intelligence-panel.tsx"
Cohesion: 0.31
Nodes (8): EdgeEvolutionChart(), fmt(), Windows, DECAY_META, Drift, driftValue(), fmt(), SetupIntelligencePanel()

### Community 130 - "Gate G2 — cutover de reglas (automations → rules)"
Cohesion: 0.25
Nodes (9): Automation (modelo legado, absorbido por Rule), Módulo Reglas (/reglas), Rules engine (domains/rules — runRules, fuente única post-G2), Reglas unificadas enforce/warn (Rule), Gate G2 — cutover de reglas (automations → rules), PR #129 (cutover G2, mergeado 2026-07-13, a28df30), Env var RULES_SOURCE (flip del cutover), run-rules.test.ts (invariante de no-regresión del bloqueo pre-trade) (+1 more)

### Community 131 - "analytics-cache.ts"
Cohesion: 0.28
Nodes (5): CacheDb, CacheDelegate, CacheRow, getCachedStats(), setCachedStats()

### Community 132 - "pattern-detector.ts"
Cohesion: 0.53
Nodes (8): detectFridayBias(), detectOversizingAfterLoss(), detectOvertradingAfterWinStreak(), detectPatterns(), detectRevengeTradingPattern(), detectSessionFatigue(), monthSpan(), weekSpan()

### Community 133 - "memory-pattern-service.ts"
Cohesion: 0.31
Nodes (7): DetectedPattern, detectPatterns(), EpisodeForPattern, PATTERN_TEXT, PatternStatus, recomputeMemoryPatterns(), recomputeMemoryPatternsForAll()

### Community 134 - "package.json"
Cohesion: 0.22
Nodes (8): engines, node, name, packageManager, pnpm, onlyBuiltDependencies, private, version

### Community 135 - "Sprints 9-12 — Portfolio MVP, PWA, PDF, Onboarding (2026-06-04)"
Cohesion: 0.25
Nodes (8): ISO Week in UTC Fix (weekly metrics and streaks), Onboarding Checklist (4 steps, progress ring), Onboarding Fix Batch (#10), PDF Export of Performance Report, Multi-Account Equity Curve + Comparison (Portfolio tab), PWA (manifest + service worker, installable, offline read) + PNG icons, Service Worker Excluded from Auth Middleware Matcher (#8), Sprints 9-12 — Portfolio MVP, PWA, PDF, Onboarding (2026-06-04)

### Community 136 - "Behavior Engine (insight → compromiso → regla → verificación → refuerzo)"
Cohesion: 0.25
Nodes (8): Behavior Engine (insight → compromiso → regla → verificación → refuerzo), BehaviorLoopPanel (UI en /analytics), commitment-service (createCommitmentFromInsight / evaluateWindowCommitments / carryOverCommitments), ImprovementScore / Índice de mejora (0–100), pgvector (búsqueda semántica / embeddings), GAP-B1 — historización de ImprovementScore (✅ PR #117, E19 + cron + curva), OI-14.x (S14: ImprovementScore — snapshots, régimen, pesos), Migraciones v3.2 aplicadas (improvement_scores E19, memory_episodes E13, memory_patterns E14, memory_identity E15, feed_ignores C3)

### Community 137 - "Prompt de retoma de sesión"
Cohesion: 0.25
Nodes (8): Event bus / outbox (publishEvent, dispatchPending, planEventTransition), BIZ-1 — aislamiento de datos cross-user (decisión de negocio), Check de drift SQL↔Prisma en CI (siguiente pieza; cierra S0/DT-4), Usuario demo/E2E ariaoc89@gmail.com (GH secret E2E_USER_PASSWORD), Gate G1 (replay migración S0 + spike end-to-end del outbox), POST-3 — moat cross-user (disparador no activado), Prompt de retoma de sesión, S0 open items (S0/OI-*, S0/DT-1..6, S0/R-1..6, S0/BIZ-1)

### Community 138 - "TECHNICAL_DEBT.md (fuente de la deuda técnica; borrado, 2026-06-05)"
Cohesion: 0.25
Nodes (8): Módulo Trades (/trades), tRPC 11.x (API end-to-end types), DataTable dev render loop (bug dev-only conocido), PR #130 (TD-018 trade-service, 2026-07-14), TD-018 — extraer lógica del router trades.ts a trade-service (✅ 2026-07-14), TD-019 — cliente Supabase por-request en contexto tRPC (⚠️ probablemente abierto), TD-037 — ~22 efectos sync-on-open (setState sincrónico en effect), TECHNICAL_DEBT.md (fuente de la deuda técnica; borrado, 2026-06-05)

### Community 139 - "tab-playbook.tsx"
Cohesion: 0.36
Nodes (6): checklistColor(), getWeekKey(), HEALTH_CONFIG, LifecycleSuggestions(), sessionCellColor(), TabPlaybook()

### Community 140 - "risk-budget.ts"
Cohesion: 0.29
Nodes (6): clamp01(), computeRiskBudget(), DailyWindow, DailyWindowInput, RiskBudgetInput, RiskOverview

### Community 141 - "study-sessions.ts"
Cohesion: 0.29
Nodes (6): pickStudySuggestion(), iso(), serializeSession(), sessionInclude, SessionWithResource, studySessionsRouter

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
Cohesion: 0.29
Nodes (7): Nota post-merge — borrar RULES_SOURCE de Vercel + smoke opcional, Task 6 — Validación final, docs y push, TD-018 Task 8 — Gates finales + docs + PR, Gates pre-push (tsc --noEmit + vitest run + eslint, 0 errores), Rollback fase 1 — quitar RULES_SOURCE (instantáneo), RULES_SOURCE env var, runRuleEngine()

### Community 146 - "context.ts"
Cohesion: 0.33
Nodes (6): Regla del loop 'Enfriamiento tras una pérdida' (enforce, TRADE_PRE_CREATE, BLOCK), Triaje de las 13 'falsa protección', buildContext(), ContextAccount, ContextTrade, mondayOf()

### Community 147 - "goal-progress-widget.tsx"
Cohesion: 0.29
Nodes (4): GoalProgressWidget(), GoalProgressWidgetProps, GoalRingProps, KpiSummary

### Community 148 - "account-risk-panel.tsx"
Cohesion: 0.43
Nodes (5): AccountRiskPanel(), asPct(), BOTTLENECK, pct(), RiskBudgetMeter()

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
Cohesion: 0.33
Nodes (6): Cognitive Engine (bounded context raíz), FREEZE-D2: Cognitive Engine aislado, E12: PreSessionCheckin, E5: DomainEvent (outbox), POST-5: Extracción del Cognitive Engine a servicio independiente, Riesgo: reescritura a 24 meses

### Community 154 - "improvement-panel.tsx"
Cohesion: 0.47
Nodes (5): fmt(), Improvement, ImprovementPanel(), REGIME_LABEL, scoreColor()

### Community 155 - "action-list.tsx"
Cohesion: 0.40
Nodes (5): ACTION_LABEL, ActionList(), ALL, TAG_ACTIONS, RuleActionType

### Community 156 - "note-tag-suggestions.tsx"
Cohesion: 0.47
Nodes (4): NoteTagSuggestions(), RULES, suggestTagsFromNote(), TagRule

### Community 157 - "command-palette.tsx"
Cohesion: 0.47
Nodes (4): Cmd, CommandPalette(), useV3Shell, V3ShellState

### Community 158 - "mae-mfe.ts"
Cohesion: 0.40
Nodes (5): analyzeMaeMfe(), EMPTY, MaeMfeResult, MaeMfeTrade, mean()

### Community 159 - "reinforcement.ts"
Cohesion: 0.40
Nodes (5): CommitmentResult, planReinforcement(), positiveIsVisible(), ReinforcementKind, ReinforcementPlan

### Community 160 - "prop-firm-presets.ts"
Cohesion: 0.33
Nodes (5): DrawdownModel, FIRMS, Phase, PROP_FIRM_PRESETS, PropFirmPresetSeed

### Community 161 - "capture-rules.ts"
Cohesion: 0.33
Nodes (4): ChecklistEvaluation, ChecklistState, Regime, REGIME_VALUES

### Community 162 - "handler()"
Cohesion: 0.60
Nodes (4): handler(), StatusSelect(), createTRPCContext(), appRouter

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
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 171 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

## Knowledge Gaps
- **1022 isolated node(s):** `graphify`, `Equipo simulado: PM SaaS-trading · Prop trader · Trading psychologist · UX researcher · Behavioral designer · AI product lead · Staff architect`, `1. EXECUTIVE SUMMARY`, `2. HALLAZGOS CRÍTICOS (los que mueven la aguja)`, `3.1 Dashboard` (+1017 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn()` to `page.tsx`, `client.ts`, `resource-card.tsx`, `register-trade-modal.tsx`, `page.tsx`, `tab-playbook.tsx`, `monthly-letter.tsx`, `ai-coach-drawer.tsx`, `page.tsx`, `motion.ts`, `command-palette.tsx`, `tab-portfolio.tsx`, `trades-table.tsx`, `page.tsx`, `page.tsx`, `simple-table.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `trade-detail-panel.tsx`, `notifications.ts`, `page.tsx`, `page.tsx`, `revisar-recurso-modal.tsx`, `useQuickActions`, `Sidebar.tsx`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`, `send-review.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `trpc` connect `client.ts` to `palette-studio.tsx`, `setup-intelligence-panel.tsx`, `cn()`, `page.tsx`, `resource-card.tsx`, `register-trade-modal.tsx`, `page.tsx`, `tab-playbook.tsx`, `monthly-letter.tsx`, `ai-coach-drawer.tsx`, `goal-progress-widget.tsx`, `page.tsx`, `account-risk-panel.tsx`, `page.tsx`, `tab-portfolio.tsx`, `page.tsx`, `account-card.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `notifications.ts`, `page.tsx`, `page.tsx`, `page.tsx`, `ai-models-card.tsx`, `revisar-recurso-modal.tsx`, `Sidebar.tsx`, `feed.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `graphify`, `Equipo simulado: PM SaaS-trading · Prop trader · Trading psychologist · UX researcher · Behavioral designer · AI product lead · Staff architect`, `1. EXECUTIVE SUMMARY` to the rest of the system?**
  _1043 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `palette-studio.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05502392344497608 - nodes in this community are weakly interconnected._
- **Should `POST-6 Prop-Firm Rulebase Spec` be split into smaller, more focused modules?**
  _Cohesion score 0.05827505827505827 - nodes in this community are weakly interconnected._
- **Should `cn()` be split into smaller, more focused modules?**
  _Cohesion score 0.05687645687645688 - nodes in this community are weakly interconnected._