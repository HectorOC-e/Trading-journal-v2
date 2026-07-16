# Graph Report - .  (2026-07-16)

## Corpus Check
- 38 files · ~307,307 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3350 nodes · 7160 edges · 232 communities (199 shown, 33 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 119 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- cn()
- index.ts
- trades-table.tsx
- rule-builder.tsx
- client.ts
- review-summary.tsx
- page.tsx
- dependencies
- send-review.ts
- account-card.tsx
- 3. HALLAZGOS POR MÓDULO
- review-card.tsx
- dashboard-analytics.ts
- tab-portfolio.tsx
- register-trade-modal.tsx
- index.ts
- prisma.ts
- monthly-reviews.ts
- page.tsx
- ai-context.ts
- page.tsx
- page.tsx
- view-model.ts
- Sidebar.tsx
- weekly-reviews.ts
- isWin()
- trades.ts
- review-report-shell.tsx
- analytics-insights-service.ts
- feature-models.ts
- Checklist de QA pendiente de V3 (109 ítems)
- create-account-modal.tsx
- resource-drawer.tsx
- page.tsx
- institutional-summary.ts
- route.ts
- playbook-service.ts
- risk-of-ruin.ts
- intervention-service.ts
- study-session-service.ts
- init.ts
- Trading Journal (producto)
- Prop-Firm Guard Rules Engine
- memory-episode-service.ts
- engine.ts
- bayes.ts
- coach-memory-service.ts
- seed-psych-trades.mjs
- Analytics Subsystem
- route.ts
- condition-group.tsx
- learning-resources.ts
- compilerOptions
- page.tsx
- notifications.ts
- edge-service.ts
- behavior.ts
- learning-insights-service.ts
- Hardening: P&L, Enforcement, CI/Migrations and Performance (2026-06-10, PRs #6–#17)
- page.tsx
- markdown.tsx
- welch.ts
- event-bus.ts
- createClient()
- page.tsx
- notify.tsx
- improvement-service.ts
- analytics-bundle.ts
- ai-config.ts
- resolve.ts
- parse.ts
- devDependencies
- ADR-003: Memory Privacy Boundary
- TD-018 — extraer orquestación de trades.ts (1146 LOC) a service layer
- page.tsx
- ai-coach-drawer.tsx
- motion.ts
- insight-store.ts
- risk-service.ts
- today-service.ts
- insights-engine.ts
- report-data.ts
- ARCHITECTURE_FREEZE Canonical Doc
- trade-write-service.ts
- gen-theme-css.mjs
- types.ts
- psychology-service.ts
- commitment-service.ts
- fx.ts
- Trading Journal (project)
- rolling-window.ts
- apply.ts
- gen-icons.mjs
- Behavior Engine Subsystem
- Intervention Engine Subsystem
- Changelog — Trading Journal v2
- rules.ts
- coach-service.ts
- reviews-timeline.tsx
- trajectory-panel.tsx
- DrawdownModel
- loadWeeklyReport()
- psychology-insights.ts
- coach.ts
- G2 — Rules Cutover: rules Is the Only Source (2026-07-13)
- ai-models-card.tsx
- monthly-letter.tsx
- verifiers.ts
- actions.ts
- risk-enforcement.ts
- resolve-provider.ts
- pdf-report-html.ts
- Coach Subsystem
- Prompt de retoma de sesión
- Roadmap reservado (apuestas con disparador propio, no iniciadas)
- POST-6 QA Handoff
- theme-provider.tsx
- emotion-feedback.ts
- improvement-score.ts
- commitment-machine.ts
- digest-builder.ts
- ADR-001: Event Runtime and Delivery
- AI Config, Migrations and Documentation Consolidation (2026-06-05)
- useLogout.ts
- feed.ts
- risk-ratios.ts
- analytics-cache.ts
- profile.ts
- review-ai.ts
- scripts
- seed.ts
- accounts.ts
- Trade Service Layer (src/server/services/trades/)
- Memoria del coach (4 capas: episódica, semántica, identidad, mejora)
- POST-6 Prop-Firm Rulebase Spec
- Task 5 — Borrar automations router, dual-write e informe de migración
- runRules()
- ruleDataFromExecutableInput()
- add-edit-resource-modal.tsx
- setup-intelligence-panel.tsx
- Gate G2 — cutover de reglas (automations → rules)
- POST-6 Implementation Plan
- POST-6 Confirmed Decisions Summary
- intelligence-panel.tsx
- layout.tsx
- palette-studio.tsx
- cognitive-digest-service.ts
- memory-pattern-service.ts
- emit.ts
- package.json
- Sprints 9-12 — Portfolio MVP, PWA, PDF, Onboarding (2026-06-04)
- TECHNICAL_DEBT.md (fuente de la deuda técnica; borrado, 2026-06-05)
- calibration.ts
- risk-budget.ts
- config.ts
- AI Coach
- Phase 0-1 — Foundation and Learning
- Digest cognitivo semanal ('Tu semana cognitiva')
- Prop-Firm Catalog Seed (Anchor Firms)
- RULES_SOURCE env var
- account-risk-panel.tsx
- badge.tsx
- capture-rules.ts
- trade-derivation.ts
- backfill-embeddings.mjs
- backfill-resource-embeddings.mjs
- E2: Rule Entity (unified w/ Automation)
- Cognitive Engine (root bounded context)
- Behavior Engine (insight → compromiso → regla → verificación → refuerzo)
- askCoach()
- improvement-panel.tsx
- action-list.tsx
- note-tag-suggestions.tsx
- mae-mfe.ts
- reinforcement.ts
- prop-firm-presets.ts
- Regla del loop 'Enfriamiento tras una pérdida' (enforce, TRADE_PRE_CREATE, BLOCK)
- benchmark.ts
- pnl-heatmap.ts
- conditions.ts
- load-state.ts
- index.ts
- CI job: checks (type check, tests, build)
- BACKLOG.md (fuente del backlog; borrado, 2026-06-05)
- budget-guard.ts
- README.md
- vercel.json
- layout.tsx
- proxy.ts
- CLAUDE.md
- Pre-Trade Block Invariant
- E4: LearningResource Entity
- AGENTS.md
- Convención de proyecto: usar graphify (query/path/explain/update) antes de grep/browsing crudo
- Ajustes Surface (non-cognitive)
- ANALIZAR Cognitive Surface
- FREEZE-P3: Retail Sample Rigor
- FREEZE-P4: Calm by Default
- FREEZE-P5: Cognitive Engine Independence
- FREEZE-P7: Insights Never Die as Text
- FREEZE-P9: Reversible Migrations
- POST-7: Setup A/B Variants
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
1. `cn()` - 149 edges
2. `trpc` - 65 edges
3. `formatErrorForUser()` - 55 edges
4. `Trading Journal (producto)` - 37 edges
5. `RouterOutputs` - 34 edges
6. `isWin()` - 32 edges
7. `toast` - 30 edges
8. `protectedProcedure` - 30 edges
9. `calcWinRate()` - 26 edges
10. `Button()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `runRules()` --semantically_similar_to--> `runAutomations() (retirado en G2)`  [INFERRED] [semantically similar]
  src/domains/rules/engine.ts → docs/superpowers/specs/2026-07-13-g2-rules-cutover-design.md
- `Derivación mode/severity (BLOCK ⇒ enforce+CRÍTICA, sin BLOCK ⇒ warn+MEDIA)` --rationale_for--> `ruleDataFromExecutableInput()`  [EXTRACTED]
  docs/superpowers/plans/2026-07-13-g2-rules-cutover.md → src/domains/rules/rule-write.ts
- `Task 3: Engine — checkConsistency` --implements--> `checkConsistency()`  [EXTRACTED]
  docs/superpowers/plans/2026-07-10-post6-prop-firm-rulebase.md → src/domains/trading/services/prop-firm-guard.ts
- `Task 1: Migration — prop_firm_presets + Account fields` --references--> `20260710140000_post6_prop_firm_rulebase.sql migration`  [EXTRACTED]
  docs/superpowers/plans/2026-07-10-post6-prop-firm-rulebase.md → supabase/migrations/20260710140000_post6_prop_firm_rulebase.sql
- `rules.createExecutable` --calls--> `ruleDataFromExecutableInput()`  [EXTRACTED]
  docs/superpowers/plans/2026-07-13-g2-rules-cutover.md → src/domains/rules/rule-write.ts

## Import Cycles
- None detected.

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

## Communities (232 total, 33 thin omitted)

### Community 0 - "cn()"
Cohesion: 0.04
Nodes (60): handler(), PromotePhaseModal(), RawAccount, SyncBalanceModal(), SyncBalanceModalProps, syncSchema, SyncValues, COLORS (+52 more)

### Community 1 - "index.ts"
Cohesion: 0.05
Nodes (67): fmt(), FocusSession(), ALL_TYPES, ProgresoSections(), ResourceFromDB, TYPE_COLORS, ResourceFromDB, useResourceActions() (+59 more)

### Community 2 - "trades-table.tsx"
Cohesion: 0.06
Nodes (58): RFC-4180, checklistColor(), getWeekKey(), HEALTH_CONFIG, LifecycleSuggestions(), sessionCellColor(), TabPlaybook(), RetirosTable() (+50 more)

### Community 3 - "rule-builder.tsx"
Cohesion: 0.07
Nodes (45): PlanSessionModal(), todayISO(), ResourceFromDB, ResourceFromDB, ImportCsvModalProps, ImportResponse, ImportState, RuleBuilder() (+37 more)

### Community 4 - "client.ts"
Cohesion: 0.09
Nodes (30): Period, Period, SendReviewEmailButton(), CoachIdentityEditor(), CoachMemoryLayers(), EVENT_LABEL, fmtDate(), ADR-0003 (+22 more)

### Community 5 - "review-summary.tsx"
Cohesion: 0.10
Nodes (31): ReviewEmailModel, DigestModel, CtaButton(), Divider(), EmailFooter(), EmailLayout(), ProgressBlock(), reviewChipLabel() (+23 more)

### Community 6 - "page.tsx"
Cohesion: 0.06
Nodes (37): ImportCsvModal(), MarketItem, TradesPage(), MetricRow(), MetricRowProps, SESSION_COLOR, SESSION_SHORT, TradeDetailPanel() (+29 more)

### Community 7 - "dependencies"
Cohesion: 0.05
Nodes (42): dependencies, @anthropic-ai/sdk, class-variance-authority, clsx, dotenv, framer-motion, @hookform/resolvers, katex (+34 more)

### Community 8 - "send-review.ts"
Cohesion: 0.09
Nodes (33): POST(), buildReviewEmailModel(), LearningDigest(), resolveTheme(), react, EmailPrefRow, isEmailChannelEnabled(), accentHex() (+25 more)

### Community 9 - "account-card.tsx"
Cohesion: 0.09
Nodes (33): ACCOUNT_STATUS_META, AccountCard(), AccountExposure, AccountRisk, formatSyncAgo(), isPropFirmLike(), KpiBox(), RawAccount (+25 more)

### Community 10 - "3. HALLAZGOS POR MÓDULO"
Cohesion: 0.05
Nodes (37): ARCHITECTURE.md (freeze v3.1: principios, decisiones, entidades, eventos, 5 ADRs), 1. EXECUTIVE SUMMARY, 2. HALLAZGOS CRÍTICOS (los que mueven la aguja), 3.10 Etiquetas, 3.11 Mercados, 3.1 Dashboard, 3.2 Trades (journaling), 3.3 Psicología (+29 more)

### Community 11 - "review-card.tsx"
Cohesion: 0.09
Nodes (29): CardEquityChart(), DAYS, Pattern, PatternCards(), TONE, Campaign(), disciplineColor(), fmtMoney() (+21 more)

### Community 12 - "dashboard-analytics.ts"
Cohesion: 0.11
Nodes (35): Partición practice (financiero excluye DEMO_PERSONAL/DEMO_PROP/BACKTEST; discipline las cuenta), Riesgo principal — dashboardStats sin tests previos (mitigado con test T3 antes de mover), TD-018 Task 3 — Dashboard service + primer test de orquestación, dashboard-service.test.ts (partición practice), AccountBalance, AccountExposure, AccountLimits, AccountStat (+27 more)

### Community 13 - "tab-portfolio.tsx"
Cohesion: 0.08
Nodes (28): Card(), CardProps, ChartTooltip(), TooltipPayload, GoalProgressWidget(), GoalProgressWidgetProps, GoalRingProps, KpiSummary (+20 more)

### Community 14 - "register-trade-modal.tsx"
Cohesion: 0.08
Nodes (32): AccountLike, computeAutoTag(), computeContracts(), EMOTION_OPTIONS, EmotionBefore, ERROR_FIELD_ORDER, INITIAL, isSelectableSetup() (+24 more)

### Community 15 - "index.ts"
Cohesion: 0.09
Nodes (31): calcNetPnl(), calcAvgR(), calcExpectancyR(), AiUsageLog, AnalyticsCache, AnalyticsInput, AnalyticsOutput, CalibrationPoint (+23 more)

### Community 16 - "prisma.ts"
Cohesion: 0.11
Nodes (24): POST(), POST(), ADR-0001, POST(), AuthResult, checkCronAuth(), timingSafeMatch(), USER_SELECT (+16 more)

### Community 17 - "monthly-reviews.ts"
Cohesion: 0.11
Nodes (24): finalizeMonthlyReview(), FinalizeResult, MONTHS_ES, evaluateGoal(), GoalContext, GoalProposal, GoalStatus, deriveLetterTitle() (+16 more)

### Community 18 - "page.tsx"
Cohesion: 0.10
Nodes (22): Period, useDashboardStats(), DashboardPage(), Tab, TABS, VALID_PERIODS, EMOTION_LABELS, PERIODS (+14 more)

### Community 19 - "ai-context.ts"
Cohesion: 0.09
Nodes (26): buildTraderContext(), RawAccountRow, RawLearningRow, RawMarketRow, RawReviewRow, RawRuleRow, RawSessionRow, RawSetupRow (+18 more)

### Community 20 - "page.tsx"
Cohesion: 0.10
Nodes (22): DOW, HoyTab(), TOUR_STEPS, AccountHistoryModal(), EVENT_META, Log, CuentasPage(), STATUS_FILTER_OPTIONS (+14 more)

### Community 21 - "page.tsx"
Cohesion: 0.15
Nodes (23): AccountsIntel(), amt(), AnalyticsPage(), Edges(), fmt(), GoalRow(), Goals(), Institutional (+15 more)

### Community 22 - "view-model.ts"
Cohesion: 0.12
Nodes (22): AiAnalysisCard(), Period, LearningSummary(), Card(), Eyebrow(), ReviewActions(), ReviewNotes(), useSaveReview() (+14 more)

### Community 23 - "Sidebar.tsx"
Cohesion: 0.12
Nodes (20): CreateAction, IconTab(), MobileBottomBar(), NavItem, useReducedMotion(), DeskItem(), MobileClock(), NAV (+12 more)

### Community 24 - "weekly-reviews.ts"
Cohesion: 0.10
Nodes (24): InsightCategory, InsightSeverity, LearningSummary, loadLearningSummary(), buildPeriodSummary(), CATEGORY_TAG, downsample(), loadPatterns() (+16 more)

### Community 25 - "isWin()"
Cohesion: 0.16
Nodes (23): MinimalTrade, detectFridayBias(), detectOversizingAfterLoss(), detectOvertradingAfterWinStreak(), detectPatterns(), detectRevengeTradingPattern(), detectSessionFatigue(), monthSpan() (+15 more)

### Community 26 - "trades.ts"
Cohesion: 0.16
Nodes (22): Refactor behavior-preserving (RouterOutputs y schemas zod intactos), Sustituciones mecánicas (ctx.prisma→prisma, ctx.userId→userId, ctx.supabase→supabase), TD-018 Task 1 — Serializers, TD-018 Task 2 — Embedding service, TD-018 Task 4 — Read service (list/violaciones/emoción/patrones), TD-018 Task 6 — Write service: update + close, PrismaClient, backfillEmbeddings() (+14 more)

### Community 27 - "review-report-shell.tsx"
Cohesion: 0.16
Nodes (21): EquityCurveChart(), PnlTrendChart(), TrendTooltip(), DownloadPdfButton(), Delta(), pnlColor(), AccountBreakdown(), Analytics (+13 more)

### Community 28 - "analytics-insights-service.ts"
Cohesion: 0.16
Nodes (18): PERIODS, POST(), PERIODS, POST(), AnalyticsAiOptions, buildContext(), streamAnalyticsInsights(), windowFor() (+10 more)

### Community 29 - "feature-models.ts"
Cohesion: 0.14
Nodes (22): AiProvider, AI_FEATURES, AI_PROVIDERS_LIST, AiFeature, AiSettings, CHAT_LADDER, CostPriority, DEFAULT_AI_SETTINGS (+14 more)

### Community 30 - "Checklist de QA pendiente de V3 (109 ítems)"
Cohesion: 0.11
Nodes (24): Check-in pre-sesión (go/caution/no_go), RiskBudgetMeter, Feed HOY (TodayFeed), AUDIT_FINAL.md (auditoría final; §9 manda sobre §5), Gaps de AUDIT_FINAL (GAP-A/B/C/D/E), GAP-A1 — guard de presupuesto diario pre-trade (✅ PR #116), GAP-A2 — transferencia #31 + SRS #45 (✅ PR #118), GAP-A3 — migración real de rutas a 5 superficies (roadmap) (+16 more)

### Community 31 - "create-account-modal.tsx"
Cohesion: 0.13
Nodes (18): Task 9: UI — preset picker + enforceMode toggle, PHASE_LABEL, PropFirmPreset, PropFirmPresetPicker(), ACCOUNT_TYPES, BROKERS, FORM_INIT, NuevaCuentaModal() (+10 more)

### Community 32 - "resource-drawer.tsx"
Cohesion: 0.13
Nodes (19): effectiveMasteryLevel(), MASTERY_STAGES, masteryLevel(), MasteryStage, masteryStageIndex(), masteryStageIndexFromLevel(), STATUS_TO_LEVEL, fmtDate() (+11 more)

### Community 33 - "page.tsx"
Cohesion: 0.13
Nodes (17): JumpItem, MonthJumpIndex(), money(), PeriodSummary(), Summary, labelFor(), MonthFilter, MONTHS_LONG (+9 more)

### Community 34 - "institutional-summary.ts"
Cohesion: 0.14
Nodes (19): EquityDrawdownChart(), fmt(), fmt(), RDistributionChart(), analyzeDrawdown(), daysBetween(), DrawdownPoint, DrawdownResult (+11 more)

### Community 35 - "route.ts"
Cohesion: 0.18
Nodes (15): POST(), USER_SELECT, GET(), localDateISO(), localHour(), ReviewPeriod, buildHtml(), MONTHS (+7 more)

### Community 36 - "playbook-service.ts"
Cohesion: 0.16
Nodes (20): Dated, Window, detectSetupDrift(), DriftDimension, DriftDimensionKey, DriftInput, DriftResult, DriftTrade (+12 more)

### Community 37 - "risk-of-ruin.ts"
Cohesion: 0.15
Nodes (20): Band, jeffreysBand(), Bottleneck, mean(), PassOutcome, percentile(), projectPhasePass(), PropProjectionResult (+12 more)

### Community 38 - "intervention-service.ts"
Cohesion: 0.13
Nodes (20): ActionKind, clamp01(), DayState, decideIntervention(), DecisionOpts, detectInterventions(), FatigueState, InterventionCandidate (+12 more)

### Community 39 - "study-session-service.ts"
Cohesion: 0.13
Nodes (18): computeProgressPct(), computeResourceStatus(), applyStudyFinish(), minutesThisWeek(), pickStudySuggestion(), ResourceProgressLite, ResourceProgressUpdate, startOfWeekUTC() (+10 more)

### Community 40 - "init.ts"
Cohesion: 0.11
Nodes (14): Context, protectedProcedure, t, accountLogsRouter, goalsRouter, MarketInput, marketsRouter, monthlyGoalsRouter (+6 more)

### Community 41 - "Trading Journal (producto)"
Cohesion: 0.09
Nodes (22): Módulo Aprendizaje / SRS (/aprendizaje), Módulo Cuentas (/cuentas), Módulo Dashboard (/dashboard), Módulo Etiquetas (/etiquetas), Formula Engine (lib/formulas — performance, win-rate, risk, drawdown, discipline, setup), Persona: Funded Trader, Módulo Mercados (/mercados), Next.js App Router + React (frontend) (+14 more)

### Community 42 - "Prop-Firm Guard Rules Engine"
Cohesion: 0.14
Nodes (20): Task 2: Engine — checkTrailingDrawdown, Task 4: Engine — checkWeekendHolding, Task 5: Engine — phaseProgress, Task 8: Wire checks into dashboard status + ENFORCE lock, Gap: Consistency Rule Not Yet Implemented, Gap: Trailing Drawdown Logic Not Yet Implemented, Gap: Weekend Holding Restriction Not Yet Implemented, Realized-Equity-Only Enforcement Limitation (+12 more)

### Community 43 - "memory-episode-service.ts"
Cohesion: 0.19
Nodes (18): extractTradeId(), POST(), secretsMatch(), BASE, decayedSalience(), initialSalience(), MemoryEventType, recallScore() (+10 more)

### Community 44 - "engine.ts"
Cohesion: 0.18
Nodes (20): CreatorModal(), Swatch(), accentContrastFor(), bestContrastOn(), clamp01(), configFromHex(), contrastRatio(), derivePalette() (+12 more)

### Community 45 - "bayes.ts"
Cohesion: 0.15
Nodes (19): betaBinomialEstimate(), betacf(), BetaPrior, betaQuantile(), cohensH(), DEFAULT_BETA_PRIOR, DEFAULT_NORMAL_PRIOR, erf() (+11 more)

### Community 46 - "coach-memory-service.ts"
Cohesion: 0.15
Nodes (18): assembleContextBlock(), AssembleInput, MemoryExtraction, MemoryKind, MemoryStatus, parseMemoryExtraction(), ProposedMemory, proposeMemory() (+10 more)

### Community 47 - "seed-psych-trades.mjs"
Cohesion: 0.13
Nodes (21): ACCOUNTS, between(), buildTrade(), c, cols, DRY, EMO_LOSS, EMO_WIN (+13 more)

### Community 48 - "Analytics Subsystem"
Cohesion: 0.13
Nodes (21): ADR-002: Estrategia estadística, Analytics (subsistema, determinista), ANALYTICS_V3.md, C3: sin longitudinal (crítico auditoría), C4: métricas institucionales (crítico auditoría), C8: insights sin historiar (crítico auditoría), FREEZE-D15: estadística Bayesiana/jerárquica con shrinkage, FREEZE-D16: proyecciones prop no estacionarias (sin puntos sin banda) (+13 more)

### Community 49 - "route.ts"
Cohesion: 0.19
Nodes (18): dupKey(), POST(), storedKey(), toDirection(), DryRunResponse, CTRADER_COLS, detectFormat(), parseCtraderDate() (+10 more)

### Community 50 - "condition-group.tsx"
Cohesion: 0.13
Nodes (17): CMP_LABEL, ConditionGroup(), Group, isGroup(), isLeaf(), isNot(), newLeaf(), NotNode (+9 more)

### Community 51 - "learning-resources.ts"
Cohesion: 0.11
Nodes (16): detectDecayedResources(), ResourceForDecay, computeNextReview(), Grade, SrsInput, SrsResult, updateEase(), LearningResourceInput (+8 more)

### Community 52 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+12 more)

### Community 53 - "page.tsx"
Cohesion: 0.13
Nodes (17): Task 3 — Router rules a paridad ejecutable, ACTION_LABEL, AutomationsTab(), ExecRuleRow, RemindersTab(), TABS, Template, TRIGGER_LABEL (+9 more)

### Community 54 - "notifications.ts"
Cohesion: 0.21
Nodes (14): CATEGORIES, NotificacionesPage(), NotificationBell(), CenterPanel(), CenterSheet(), formatNotifTime(), NotificationItem(), NotificationItemProps (+6 more)

### Community 55 - "edge-service.ts"
Cohesion: 0.16
Nodes (16): computeInstrumentEdges(), EdgeVerdict, InstrumentEdge, InstrumentEdgeResult, InstrumentTrade, mean(), computeTagEdges(), mean() (+8 more)

### Community 56 - "behavior.ts"
Cohesion: 0.18
Nodes (16): block(), canEnforce(), ProposedRule, proposeRuleForCommitment(), RuleSuggestionProposal, suggestRuleForInsight(), carryOverCommitments(), dismissProposedCommitment() (+8 more)

### Community 57 - "learning-insights-service.ts"
Cohesion: 0.17
Nodes (16): ErrorCard, ErrorCardInput, ErrorTrade, generateErrorCards(), PerfSignal, computeTransfer(), mean(), TransferInput (+8 more)

### Community 58 - "Hardening: P&L, Enforcement, CI/Migrations and Performance (2026-06-10, PRs #6–#17)"
Cohesion: 0.12
Nodes (19): Commission Optional on Close (#14), Prop-Firm Drawdown + Limit Enforcement Unified (#6), GitHub Actions Updated Node 20 → 24 (checkout@v5, setup-node@v5, pnpm/action-setup@v5) (#13), Hardening: P&L, Enforcement, CI/Migrations and Performance (2026-06-10, PRs #6–#17), GitHub Actions Secrets → migrate-deploy Job Green, Negative Sign on Losses Fix (#17), Node Pinned to 20.12+ (.nvmrc + engines) (#7), parsePointValue Helper (+11 more)

### Community 59 - "page.tsx"
Cohesion: 0.12
Nodes (15): CAT_COLOR, CAT_LABELS, CATS, FORM_INIT, MarketForm, MarketItem, MarketModal(), MercadosPage() (+7 more)

### Community 60 - "markdown.tsx"
Cohesion: 0.16
Nodes (17): Block, CALLOUT, CALLOUT_ALIASES, CalloutType, CODE_KEYWORDS, CodeBlock(), detectCallout(), HEADING_CLASS (+9 more)

### Community 61 - "welch.ts"
Cohesion: 0.20
Nodes (16): mean(), oneSampleTTest(), sampleVariance(), studentTTwoSidedP(), TTestResult, welchTTest(), detectEdgeDecay(), EdgeDecayInput (+8 more)

### Community 62 - "event-bus.ts"
Cohesion: 0.13
Nodes (15): DispatchResult, DomainEventRecord, EventHandler, EventStatus, EventTransition, HandlerOutcome, handlers, isKnownEventType() (+7 more)

### Community 63 - "createClient()"
Cohesion: 0.18
Nodes (12): POST(), Provider, rateLimiter, testAnthropicKey(), testOpenAIKey(), testOpenRouterKey(), ALLOWED_MIME, POST() (+4 more)

### Community 64 - "page.tsx"
Cohesion: 0.18
Nodes (15): blankDraft(), CATEGORY_SUGGESTIONS, COLOR_PRESETS, DISPLAY_MODES, EtiquetasPage(), ICON_PRESETS, TagRow, SelectableTagChip() (+7 more)

### Community 65 - "notify.tsx"
Cohesion: 0.20
Nodes (15): ToastCard(), ToastCardProps, TYPE_STYLE, TypeStyle, MessageAction, NotifCategory, NotifType, Priority (+7 more)

### Community 66 - "improvement-service.ts"
Cohesion: 0.20
Nodes (14): ImprovementResult, computeRegimePerformance(), mean(), RegimePerformanceResult, RegimeStat, RegimeTrade, getImprovement(), ImprovementOverview (+6 more)

### Community 67 - "analytics-bundle.ts"
Cohesion: 0.16
Nodes (15): AccountIntel, AnalyticsBundle, buildAnalyticsBundle(), EmotionIntel, holdMinutes(), MarketIntel, round1(), round2() (+7 more)

### Community 68 - "ai-config.ts"
Cohesion: 0.18
Nodes (13): ConnectivityResult, testProviderConnectivity(), decryptApiKey(), encryptApiKey(), EncryptionConfigError, getEncryptionKey(), maskApiKey(), rotateEncryptionKey() (+5 more)

### Community 69 - "resolve.ts"
Cohesion: 0.21
Nodes (14): AppError, isAppError(), toUserMessage(), TRPC_TO_CODE, LABELS, MessageCode, interpolate(), isMessageCode() (+6 more)

### Community 70 - "parse.ts"
Cohesion: 0.16
Nodes (15): isValidSelection(), num(), parsePaletteConfig(), parsePaletteConfigJson(), PaletteConfig, configInput, customPalettesRouter, normalize() (+7 more)

### Community 71 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, eslint-config-next, jsdom, @playwright/test, react-email, tailwindcss, @tailwindcss/postcss (+10 more)

### Community 72 - "ADR-003: Memory Privacy Boundary"
Cohesion: 0.15
Nodes (17): ADR-003: Privacidad de la memoria y frontera anti-corrupción, AI_COACH_V3.md, Máquina de estados del Behavior Engine (ACTIVE→KEPT/PARTIAL/BROKEN/EXPIRED), C2: sin memoria (crítico auditoría), FREEZE-D11: write con confirmación explícita del coach, FREEZE-D9: frontera anti-poisoning de memoria (irreversible), E13: MemoryEpisode, E14: MemoryPattern (+9 more)

### Community 73 - "TD-018 — extraer orquestación de trades.ts (1146 LOC) a service layer"
Cohesion: 0.14
Nodes (17): G2 Fase 2 — Retiro de automations · Implementation Plan, Global constraints G2 (sin migraciones, no merge a main, guard prisma.automation), Task 4 — UI /reglas → trpc.rules.*, TD-018 — Trade Service Extraction Implementation Plan, Patrón I/O shell — load data, run pure logic, persist, Self-review — 14 procedures del router cubiertos por T1-T7, TD-018 — extraer orquestación de trades.ts (1146 LOC) a service layer, G2 Rules Cutover Design Spec (+9 more)

### Community 74 - "page.tsx"
Cohesion: 0.12
Nodes (6): AI_PROVIDERS, COLORBLIND_OPTIONS, SESSIONS, TIMEZONES, SUPPORTED_CURRENCIES, USD_VALUE

### Community 75 - "ai-coach-drawer.tsx"
Cohesion: 0.16
Nodes (14): AiCoachDrawer(), ApiError, clampPos(), formatTime(), Message, SUGGESTED, TOOL_LABELS, useIsMobile() (+6 more)

### Community 76 - "motion.ts"
Cohesion: 0.17
Nodes (14): CountUp(), format(), parse(), Parsed, KpiCardProps, KpiStripItem, CollectionMotion, DUR (+6 more)

### Community 77 - "insight-store.ts"
Cohesion: 0.21
Nodes (14): ComputedInsight, InsightStatus, PersistedInsightRef, reconcileInsights(), ReconcilePlan, ADR-0002, loadActiveRefs(), persistInsights() (+6 more)

### Community 78 - "risk-service.ts"
Cohesion: 0.22
Nodes (14): aggregateExposure(), AggregateFreezeInput, aggregateFreezeSignal, CorrelationResult, Direction, OpenPosition, SymbolExposure, asDrawdownModel() (+6 more)

### Community 79 - "today-service.ts"
Cohesion: 0.22
Nodes (14): RiskBudget, assembleTodayFeed(), detectDailyAnomaly(), SignalInput, TodayItem, getIgnoreCounts(), recordIgnore(), getTodayFeed() (+6 more)

### Community 80 - "insights-engine.ts"
Cohesion: 0.22
Nodes (16): bySymbolDate(), detectAccountRisk(), detectEmotionPerformance(), detectIntradayDecay(), detectLosingStreak(), detectSetupConcentration(), detectWeekdayDiscipline(), detectWithdrawalImpact() (+8 more)

### Community 81 - "report-data.ts"
Cohesion: 0.24
Nodes (11): buildMonthlyReport(), kpisOf(), MonthlyReport, ReportTrade, sessionsOf(), buildWeeklyReport(), DAY_LABELS, kpisOf() (+3 more)

### Community 82 - "ARCHITECTURE_FREEZE Canonical Doc"
Cohesion: 0.16
Nodes (16): Principio "Absorber, no borrar", ADR-000: Decisiones de raíz de Trading Journal v3.1, ADR-004: Reserva de datos cross-user (BIZ-1), ARCHITECTURE_CHALLENGE.md, auditoria-producto-trading-journal-v2.md, BEHAVIOR_ENGINE_V3.md, BIZ-1: decisión de aislamiento de datos cross-user, Regla de control de cambios (todo cambio arquitectónico cita un ID de freeze) (+8 more)

### Community 83 - "trade-write-service.ts"
Cohesion: 0.16
Nodes (15): Stub deprecado 'stats' se queda en el router a propósito, TD-018 Task 5 — Write service: create, TD-018 Task 7 — Write service: addEvent + delete + saveChecklistResult, checkSymbolAllowlist(), checkTradeCountLimit(), addTradeEvent(), AddTradeEventInput, CloseTradeInput (+7 more)

### Community 84 - "gen-theme-css.mjs"
Cohesion: 0.23
Nodes (14): accentContrastFor(), clamp01(), contrastRatio(), derivePalette(), hexToRgb(), linearToSrgb(), okl(), oklchToHex() (+6 more)

### Community 85 - "types.ts"
Cohesion: 0.27
Nodes (12): RuleDraft, PROTECTION_TEMPLATE_MAP, PROTECTION_TEMPLATES, ProtectionTemplate, AutomationTemplate, BASE_TEMPLATES, PROTECTION_AS_AUTOMATION, ConditionNode (+4 more)

### Community 86 - "psychology-service.ts"
Cohesion: 0.23
Nodes (13): calibration(), CheckinInput, CheckinResult, checkinVerdict, clamp(), LABEL, getCalibration(), getMoodTrend() (+5 more)

### Community 87 - "commitment-service.ts"
Cohesion: 0.20
Nodes (14): CommitmentWindow, getVerifier(), publishEvent(), acceptProposedCommitment(), createCommitmentFromInsight(), CreateCommitmentOverrides, evaluateCommitment(), EvaluateResultOut (+6 more)

### Community 88 - "fx.ts"
Cohesion: 0.23
Nodes (12): getISOWeekKey(), convertToBase(), fxFactor(), parseFxRates(), NOTE: rates are static/approximate. Future: make user-configurable or source a, usdValue(), loadWeeklyCardStats(), mondayOf() (+4 more)

### Community 89 - "Trading Journal (project)"
Cohesion: 0.15
Nodes (15): dashboardStats Server-Side Analytics (Sprint 2), Formula Engine (Sprint 1), Sprints 1-3 — Foundation, Index trades(user_id, status, date desc) (#11), docs/auditoria-producto-trading-journal-v2.md (binding audit, findings C1–C8), Cognitive Layer Thesis (v3), 5 Cognitive Surfaces (HOY · OPERAR · ANALIZAR · PROTEGER · MEJORAR), domains/ Pure Business Logic by Bounded Context (cognitive · behavior · analytics · rules · trading) (+7 more)

### Community 90 - "rolling-window.ts"
Cohesion: 0.21
Nodes (13): addDays(), compareCurrentVsPrevious(), Comparison, isCount(), rollingWindow(), RollingWindowOpts, sortByDate(), windowOf() (+5 more)

### Community 91 - "apply.ts"
Cohesion: 0.28
Nodes (13): applyColorTheme(), clearInlineTokens(), injectInline(), LEGACY_KEYS, LEGACY_VARS, reapplyCustomForMode(), tokensToCssText(), CustomPalette (+5 more)

### Community 92 - "gen-icons.mjs"
Cohesion: 0.19
Nodes (14): BG, chunk(), clamp(), crc32(), __dirname, distSeg(), DOT, encodePNG() (+6 more)

### Community 93 - "Behavior Engine Subsystem"
Cohesion: 0.21
Nodes (14): Anti-fatiga (token-bucket, decay, cooldown, silencio ganado), Behavior Engine (subsistema), C5: loop reviews abierto (crítico auditoría), FREEZE-D13: refuerzo de ratio variable + soporte de autonomía, FREEZE-D4: Behavior Engine es el dueño del loop, FREEZE-D7: Commitment sólo se ofrece donde existe verificador, E10: RuleSuggestion, E3: WeeklyReview / MonthlyReview (+6 more)

### Community 94 - "Intervention Engine Subsystem"
Cohesion: 0.21
Nodes (14): DESIGN_SYSTEM_V3.md, FREEZE-D14: override duro de capital, E11: Intervention (severity/urgency/confidence/expectedImpact), E15: MemoryIdentity, EV1: trade.created, EV10: intervention.responded, EV2: trade.closed, EV7: rule.fired (+6 more)

### Community 95 - "Changelog — Trading Journal v2"
Cohesion: 0.14
Nodes (14): Documentation Consolidation (9 master docs + docs/archive/), 21 P0 QA Findings Resolved, Psychology Fields + plan_notes Migration, Sprint 4 — Psychology, Reviews and Personalization, Sprint 5 — AI Config, Goals, planNotes, Pagination, UX, International Support, Sprint 6 — System Theme, Review Filters, Sparklines, Type Safety, Security Hardening, Sprint 7 — Reviews Hardening, Discipline Centralization, Infrastructure, Sprint 8 — Testing, Accessibility, Monthly Reviews (+6 more)

### Community 96 - "rules.ts"
Cohesion: 0.14
Nodes (13): Workaround TS2589 (select escalar + tipo de salida explícito), action, ACTION_TYPES, cmp, conditionNode, conditionValue, executableInput, leaf (+5 more)

### Community 97 - "coach-service.ts"
Cohesion: 0.23
Nodes (10): POST(), SystemBlock, CoachAgentOptions, streamCoachAgent(), systemToString(), buildSystemPrompt(), CoachStreamOptions, MessageParam (+2 more)

### Community 98 - "reviews-timeline.tsx"
Cohesion: 0.21
Nodes (12): EditionHeader(), EditionHeaderData, money(), TONE, nodeColor(), ReviewFromDB, ReviewsTimeline(), TimelineChapter (+4 more)

### Community 99 - "trajectory-panel.tsx"
Cohesion: 0.18
Nodes (12): Bead, BEADS, buildChart(), fmtWeek(), HOVER, money(), Overview, STAT (+4 more)

### Community 100 - "DrawdownModel"
Cohesion: 0.20
Nodes (11): AccountRiskConfig, DerivedRiskInputs, deriveRiskInputs(), median(), pctToFraction(), PropProjectionInput, DrawdownModel, AccountPhase (+3 more)

### Community 101 - "loadWeeklyReport()"
Cohesion: 0.23
Nodes (11): computeDisciplineScore(), DisciplineDetail, DisciplinePeriod, DisciplineResult, calcDisciplineScore(), DisciplineBreakdown, DisciplineParams, FinalizeResult (+3 more)

### Community 102 - "psychology-insights.ts"
Cohesion: 0.32
Nodes (13): detectCleanStreak(), detectEmotionBeforeLoss(), detectHoldingAsymmetry(), detectImpulsiveExpectancy(), detectOverconfidence(), detectViolationEmotion(), generatePsychologyInsights(), holdMin() (+5 more)

### Community 103 - "coach.ts"
Cohesion: 0.19
Nodes (12): confirmMemory(), createMemory(), deleteMemory(), editMemory(), listMemory(), appendMessage(), ensureThread(), getThreadMessages() (+4 more)

### Community 104 - "G2 — Rules Cutover: rules Is the Only Source (2026-07-13)"
Cohesion: 0.21
Nodes (13): automations Table Archived, G2 — Rules Cutover: rules Is the Only Source (2026-07-13), /reglas Edits rules — Executable Parity Router (builder, merged templates, reorder, badges), rule-sync Dual-Write (retired), Rules Engine Enforcement (runRules-only), /api/cron/rules-migration-report (retired), RULES_SOURCE Flag (retired), Behavior Engine (+5 more)

### Community 105 - "ai-models-card.tsx"
Cohesion: 0.17
Nodes (11): AiModelsCard(), ALL_TOOL_MODELS, COST_OPTIONS, FEATURE_LABEL, inputStyle, looksToolIncapable(), Provider, PROVIDER_LABEL (+3 more)

### Community 106 - "monthly-letter.tsx"
Cohesion: 0.18
Nodes (10): Goal, GOAL_STATUS, MonthlyLetter(), NEXT_STATUS, ReportData, SENTIMENT, TONE, makeMoney() (+2 more)

### Community 107 - "verifiers.ts"
Cohesion: 0.17
Nodes (9): METRIC_KEYS, OFF_PLAN_TAGS, REGISTRY, sortByDateTime(), Verifier, VerifierOpts, VerifierResult, verifyTradesPerDayBeyond2() (+1 more)

### Community 108 - "actions.ts"
Cohesion: 0.17
Nodes (10): ACTION_TYPES, ActionDeps, ActionResult, Handler, HANDLERS, buildContext(), ContextAccount, ContextTrade (+2 more)

### Community 109 - "risk-enforcement.ts"
Cohesion: 0.33
Nodes (12): assertTradeable(), autoUnlock(), EnforceableAccount, evaluateAndLock(), hasAnyLimit(), loadAccountRisk(), loadEquityCurve(), LOCK_REASON_TEXT (+4 more)

### Community 110 - "resolve-provider.ts"
Cohesion: 0.21
Nodes (12): getProviderKey(), ModelRef, ACTIVE_AI_FEATURES, AiDiagnostics, ALL_PROVIDERS, buildAiDiagnostics(), KeySource, ProviderKeyStatus (+4 more)

### Community 111 - "pdf-report-html.ts"
Cohesion: 0.36
Nodes (12): analysisHtml(), C, CALLOUT, calloutHtml(), card(), equitySvg(), esc(), kpiCell() (+4 more)

### Community 112 - "Coach Subsystem"
Cohesion: 0.20
Nodes (12): C7: captura psico opcional (crítico auditoría), Coach (subsistema), Context Assembler (presupuesto de tokens), FREEZE-D10: Context Assembler con presupuesto, FREEZE-D12: router de modelos LLM, EV3: insight.created, EV5: commitment.created, EV9: checkin.submitted (+4 more)

### Community 113 - "Prompt de retoma de sesión"
Cohesion: 0.17
Nodes (12): Bounded context cognitive/ (events, intervention, memory, coach), Estructura por dominios (src/domains/), Event bus / outbox (publishEvent, dispatchPending, planEventTransition), Intervention Engine (intervenciones en caliente), InterventionOverlay (overlay global), BIZ-1 — aislamiento de datos cross-user (decisión de negocio), Check de drift SQL↔Prisma en CI (siguiente pieza; cierra S0/DT-4), Usuario demo/E2E ariaoc89@gmail.com (GH secret E2E_USER_PASSWORD) (+4 more)

### Community 114 - "Roadmap reservado (apuestas con disparador propio, no iniciadas)"
Cohesion: 0.18
Nodes (12): Persona: Prop Firm Candidate, Flag tj.v3Shell (OFF por defecto), Superficies ANALIZAR / PROTEGER / MEJORAR, A3 — rutas reales de 5 superficies (/hoy, /operar, /analizar, /proteger, /mejorar), POST-1 — realtime/SSE (disparador no activado), POST-2 — coach multiagente (disparador no activado), POST-4 — régimen exógeno ATR / datos de mercado (disparador no activado), POST-5 — extracción a servicio (disparador no activado) (+4 more)

### Community 115 - "POST-6 QA Handoff"
Cohesion: 0.23
Nodes (11): Deploy/Migration Flow (merge to main → CI applies migration), POST-6 QA Handoff, CI e2e Anon Key Resolved (b), QA Playwright Blocked by Corporate MITM SSL (c), Ready-to-Paste Prompt — QA Playwright Run, UI Blocker for Tasks 9/10 — Resolved by commit 71154ac, Ready-to-Paste Prompt — Complete UI (Tasks 9+10), Task 10: UI — dashboard panel shows new rules (+3 more)

### Community 116 - "theme-provider.tsx"
Cohesion: 0.23
Nodes (9): CYCLE, getSystemTheme(), ResolvedTheme, resolveTheme(), ThemeContext, ThemeContextValue, ThemeMode, ThemeProvider() (+1 more)

### Community 117 - "emotion-feedback.ts"
Cohesion: 0.23
Nodes (9): EmotionInsight(), LABELS, EmotionFeedback, EmotionStat, EmotionTrade, feedbackForEmotion(), round1(), ADR-0002 (+1 more)

### Community 118 - "improvement-score.ts"
Cohesion: 0.23
Nodes (11): clamp01(), computeImprovementScore(), costOfIndiscipline(), DEFAULT_WEIGHTS, Driver, ImprovementInputs, ImprovementWeights, IndisciplineCost (+3 more)

### Community 119 - "commitment-machine.ts"
Cohesion: 0.23
Nodes (10): canCommit(), CommitmentSpec, CommitmentStatus, Comparator, deriveCommitmentSpec(), evaluateResult(), INSIGHT_SPECS, partialBand() (+2 more)

### Community 120 - "digest-builder.ts"
Cohesion: 0.26
Nodes (10): buildLearningDigest(), daysBetween(), DigestInput, DigestReview, formatDateLabel(), isoDate(), ReviewKind, computeNewStreak() (+2 more)

### Community 121 - "ADR-001: Event Runtime and Delivery"
Cohesion: 0.35
Nodes (11): ADR-001: Runtime de eventos y entrega, C1: coach reactivo (crítico auditoría), lib/coach-bus.ts (helper cliente, no es el bus de dominio), Camino rápido (fast-path síncrono in-trade), FREEZE-D1: Outbox transaccional + dispatcher, FREEZE-D5: SLA de intervención redefinido (síncrono ≤2s), FREEZE-D6: el outbox es la única fuente de verdad, Gate G1 (validación spike outbox) (+3 more)

### Community 122 - "AI Config, Migrations and Documentation Consolidation (2026-06-05)"
Cohesion: 0.27
Nodes (11): Advisor Migration Made Replay-Safe (#11), AI Config, Migrations and Documentation Consolidation (2026-06-05), AI Diagnostics and Health Check (aiConfig.diagnostics, aiConfig.healthCheck, lib/ai/health-check.ts), Root Cause Fix: 'Configura ANTHROPIC_API_KEY' with OpenRouter Configured, add_color_theme_preferences Migration Name Aligned with Prod (#12), OpenRouter Key Save Fix (user_ai_configs missing in prod), prisma.config.ts: Prisma Generates Client Only, Never Migrates, AI Provider Resolution Engine (lib/ai/resolve-provider.ts) (+3 more)

### Community 123 - "useLogout.ts"
Cohesion: 0.33
Nodes (7): LoginPage(), PerfilPage(), useLogout(), clearSessionStorageKeys(), SESSION_SCOPED_STORAGE_KEYS, STORAGE_KEYS, createClient()

### Community 124 - "feed.ts"
Cohesion: 0.24
Nodes (9): KIND_ICON, severityColor(), TodayFeed(), AnomalyInput, AnomalyResult, BASE, SEVERITY_MULT, SignalKind (+1 more)

### Community 125 - "risk-ratios.ts"
Cohesion: 0.33
Nodes (10): calmarRatio(), computeRiskRatios(), Kelly, kellyCriterion(), kellyFromR, mean(), rollingRiskRatios(), sortinoRatio() (+2 more)

### Community 126 - "analytics-cache.ts"
Cohesion: 0.24
Nodes (6): CacheDb, CacheDelegate, CacheRow, getCachedStats(), invalidateCache(), setCachedStats()

### Community 127 - "profile.ts"
Cohesion: 0.31
Nodes (8): invalidateAnalyticsCacheIfNeeded(), isValidIanaTimezone(), normalizeProfileInput(), PROFILE_PUBLIC_FIELDS, UpdateProfileInput, validateProfileUpdate(), createAdminClient(), profileRouter

### Community 128 - "review-ai.ts"
Cohesion: 0.33
Nodes (9): resolveAiCall(), ensureReviewAnalysis(), persistMonthlyAnalysis(), persistWeeklyAnalysis(), AnyReport, buildAnalysisPrompt(), Candidate, fmt() (+1 more)

### Community 129 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, e2e, e2e:ui, email, gen:theme, lint (+3 more)

### Community 130 - "seed.ts"
Cohesion: 0.22
Nodes (8): ensureTagsSeeded(), SYSTEM_APPEARANCE, SystemTagDef, systemTagDefs(), DISPLAY_MODES, tagsRouter, QUALITY_TAGS, VIOLATION_TAGS

### Community 131 - "accounts.ts"
Cohesion: 0.18
Nodes (7): ACCOUNT_STATUSES, ACCOUNT_TYPES, AccountInput, accountsRouter, ENFORCE_MODES, PHASES, RawAccount

### Community 132 - "Trade Service Layer (src/server/services/trades/)"
Cohesion: 0.24
Nodes (10): Dashboard Service (dashboardStats pipeline), First Direct dashboardStats Test (practice partition), Debt Closure Cycles 1/2 (render purity, a11y ARIA, TD-018/019/037 scoped), TD-018 — Trade Services Extracted from trades Router (2026-07-14, PR #130), Trade Read Service (list/violations/emotion/patterns), Trade Serializers Service, Trade Service Layer (src/server/services/trades/), Trade Write Service (create/update/close/addEvent/delete/checklist) (+2 more)

### Community 133 - "Memoria del coach (4 capas: episódica, semántica, identidad, mejora)"
Cohesion: 0.22
Nodes (10): Frontera anti-envenenamiento (memoria), Memoria del coach (4 capas: episódica, semántica, identidad, mejora), CoachMemoryPanel / CoachMemoryLayers, Write-tools del coach con permiso (propose_rule / propose_commitment), Módulo IA Coach (drawer global), pgvector (búsqueda semántica / embeddings), GAP-E1 — memoria jerárquica de 4 capas E13–E16 (reclasificado a v3.2 roadmap), OI-6.x (S6: memoria del coach) (+2 more)

### Community 134 - "POST-6 Prop-Firm Rulebase Spec"
Cohesion: 0.47
Nodes (10): Task 1: Migration — prop_firm_presets + Account fields, Task 7: Account input/serialization for new fields, Account.consistencyPct field, POST-6 Prop-Firm Rulebase Design Spec, Dual Migration Requirement (SQL + Prisma), Account.enforceMode field, Prop-Firm Rules as Central Moat, Account.noWeekendHolding field (+2 more)

### Community 135 - "Task 5 — Borrar automations router, dual-write e informe de migración"
Cohesion: 0.27
Nodes (10): Derivación mode/severity (BLOCK ⇒ enforce+CRÍTICA, sin BLOCK ⇒ warn+MEDIA), Guard — cero referencias a prisma.automation/trpc.automations en src/, Task 5 — Borrar automations router, dual-write e informe de migración, Dual-write automations→rules, Gate OI-1 — informe de no-mapeo con datos reales, Paridad espejo perfecta (0 faltantes, 0 drift), /api/cron/rules-migration-report (retirado en G2), buildNoMappingReport() (retirado en G2) (+2 more)

### Community 136 - "runRules()"
Cohesion: 0.24
Nodes (9): Task 1 — Engine solo-runRules (borrar flag/dispatcher/runAutomations), Test de no-regresión 'G2 cutover invariant', Riesgo residual — divergencia semántica sutil de runRules, run-rules.test.ts (invariante de no-regresión), runAction(), rulesSourceIsUnified() (retirado en G2), runAutomations() (retirado en G2), RunResult (+1 more)

### Community 137 - "ruleDataFromExecutableInput()"
Cohesion: 0.38
Nodes (8): Task 2 — Helpers puros de escritura de reglas (rule-write, TDD), rule-write.test.ts, ExecutableRuleInput, ruleDataFromExecutableInput(), ruleDataFromTemplate(), TEMPLATE_MAP, classifyMode(), UnifiedRule

### Community 138 - "add-edit-resource-modal.tsx"
Cohesion: 0.38
Nodes (8): AddEditResourceModal(), ResourceFromDB, ALL_TYPES, emptyForm(), FormState, PROGRESS_LABELS, PROGRESS_TYPES, TYPE_EMOJIS

### Community 139 - "setup-intelligence-panel.tsx"
Cohesion: 0.31
Nodes (8): EdgeEvolutionChart(), fmt(), Windows, DECAY_META, Drift, driftValue(), fmt(), SetupIntelligencePanel()

### Community 140 - "Gate G2 — cutover de reglas (automations → rules)"
Cohesion: 0.25
Nodes (9): Automation (modelo legado, absorbido por Rule), Módulo Reglas (/reglas), Rules engine (domains/rules — runRules, fuente única post-G2), Reglas unificadas enforce/warn (Rule), Gate G2 — cutover de reglas (automations → rules), PR #129 (cutover G2, mergeado 2026-07-13, a28df30), Env var RULES_SOURCE (flip del cutover), run-rules.test.ts (invariante de no-regresión del bloqueo pre-trade) (+1 more)

### Community 141 - "POST-6 Implementation Plan"
Cohesion: 0.28
Nodes (9): Local Validation Results (prisma generate, tsc, vitest 1176/1176, eslint), POST-6 Prop-Firm Rulebase Implementation Plan, Global Constraints (dual migration, RLS, full vitest suite, TDD, Node 24, verify firm numbers), Plan Self-Review (spec coverage checklist), Task 11: Full verification + push, Task 3: Engine — checkConsistency, Task 6: tRPC propFirmPresets.list + typed catalog, PropFirmPreset RLS Policy (authenticated read-all, service-role write) (+1 more)

### Community 142 - "POST-6 Confirmed Decisions Summary"
Cohesion: 0.25
Nodes (9): Approach B — Live FK Reference (rejected), Approach C — Snapshot + Update Notice (future enhancement), Confirmed Decisions Summary Table, Account.enforceMode WARN/ENFORCE, FREEZE-D13 (respect user autonomy in WARN mode), Reuse of locked/lockReason/lockedAt Mechanism, Out of Scope / YAGNI Items, enforceMode Mirrors Rule.mode warn|enforce Semantics (+1 more)

### Community 143 - "intelligence-panel.tsx"
Cohesion: 0.33
Nodes (6): AiInsightsPanel(), CAT_ICON, InsightCards(), sevStyle(), IntelligencePanel(), Insight

### Community 144 - "layout.tsx"
Cohesion: 0.28
Nodes (5): metadata, viewport, AppShell(), ServiceWorkerRegister(), TRPCProvider()

### Community 145 - "palette-studio.tsx"
Cohesion: 0.31
Nodes (8): ADV_ROLES, iconBtn, labelStyle, PaletteStudio(), NOTE: applying the theme on mount / mode-change is intentionally NOT done here., tileBtn(), useTheme(), makeCustomSelection()

### Community 146 - "cognitive-digest-service.ts"
Cohesion: 0.36
Nodes (7): buildCognitiveDigest(), DigestInput, DigestResult, isoWeekKey(), sendCognitiveDigest(), getImprovementSeries(), getConfirmedPatterns()

### Community 147 - "memory-pattern-service.ts"
Cohesion: 0.31
Nodes (7): DetectedPattern, detectPatterns(), EpisodeForPattern, PATTERN_TEXT, PatternStatus, recomputeMemoryPatterns(), recomputeMemoryPatternsForAll()

### Community 148 - "emit.ts"
Cohesion: 0.33
Nodes (8): Lang, emitNotification(), EmitOptions, inQuietHours(), localHHMM(), passesPreferences(), PrefRow, RANK

### Community 149 - "package.json"
Cohesion: 0.22
Nodes (8): engines, node, name, packageManager, pnpm, onlyBuiltDependencies, private, version

### Community 150 - "Sprints 9-12 — Portfolio MVP, PWA, PDF, Onboarding (2026-06-04)"
Cohesion: 0.25
Nodes (8): ISO Week in UTC Fix (weekly metrics and streaks), Onboarding Checklist (4 steps, progress ring), Onboarding Fix Batch (#10), PDF Export of Performance Report, Multi-Account Equity Curve + Comparison (Portfolio tab), PWA (manifest + service worker, installable, offline read) + PNG icons, Service Worker Excluded from Auth Middleware Matcher (#8), Sprints 9-12 — Portfolio MVP, PWA, PDF, Onboarding (2026-06-04)

### Community 151 - "TECHNICAL_DEBT.md (fuente de la deuda técnica; borrado, 2026-06-05)"
Cohesion: 0.25
Nodes (8): Módulo Trades (/trades), tRPC 11.x (API end-to-end types), DataTable dev render loop (bug dev-only conocido), PR #130 (TD-018 trade-service, 2026-07-14), TD-018 — extraer lógica del router trades.ts a trade-service (✅ 2026-07-14), TD-019 — cliente Supabase por-request en contexto tRPC (⚠️ probablemente abierto), TD-037 — ~22 efectos sync-on-open (setState sincrónico en effect), TECHNICAL_DEBT.md (fuente de la deuda técnica; borrado, 2026-06-05)

### Community 152 - "calibration.ts"
Cohesion: 0.29
Nodes (7): DirectionalEstimate, Estimate, CalibrationResult, CalibrationTrade, CalibrationVerdict, ConfidenceBucket, ADR-0002

### Community 153 - "risk-budget.ts"
Cohesion: 0.29
Nodes (6): clamp01(), computeRiskBudget(), DailyWindow, DailyWindowInput, RiskBudgetInput, RiskOverview

### Community 154 - "config.ts"
Cohesion: 0.36
Nodes (4): detectProvider(), getCoachModel(), getWeeklySummaryModel(), resolveModel()

### Community 155 - "AI Coach"
Cohesion: 0.33
Nodes (7): Embedding Service (pgvector schedule/search/backfill), AI Coach, Invariant: Anti-Poisoning Boundary (LLM never writes memory/identity directly; proposes, data/user confirm), 4-Layer Hierarchical Memory (episodic pgvector · semantic · identity · improvement), Invariants (no sprint broke them), Invariant: Permission (the system proposes, the user disposes), Weekly Cognitive Digest

### Community 156 - "Phase 0-1 — Foundation and Learning"
Cohesion: 0.29
Nodes (7): Learning System (spaced repetition, decay detection, materialized streak, email idempotency), Phase 0-1 — Foundation and Learning, Security/RLS, Auth, Data Correction (Phase 0-1), Bayesian Confidence Bands (shrinkage estimator), Institutional Analytics (drawdown, R distribution, Sortino/Calmar/Kelly, MAE/MFE, benchmark, heatmap), Learning & Transfer (edge by instrument/tag, study↔trading transfer, performance-adapted SRS, error cards), Invariant: Statistical Honesty (confidence bands, association not cause, no fake certainty)

### Community 157 - "Digest cognitivo semanal ('Tu semana cognitiva')"
Cohesion: 0.33
Nodes (7): Digest cognitivo semanal ('Tu semana cognitiva'), Rutas api/cron (recompute-insights, dispatch-events, evaluate-commitments, cognitive-digest, rules-migration-report), Cron cognitive-digest sin agendar (/api/cron/cognitive-digest), Protección de contraseñas filtradas en Supabase Auth (toggle manual), Ops pendientes (acción del usuario, sin código), PENDING_AND_RESUME.md (fuente de ops y roadmap; borrado), Crons existentes en prod (dispatch-events, recompute-insights, evaluate-commitments, learning-digest, reviews-digest)

### Community 158 - "Prop-Firm Catalog Seed (Anchor Firms)"
Cohesion: 0.38
Nodes (7): Firm Numbers Verified (a) — MyFundedFX replaced by MyFundedFutures, MyFundedFutures Preset (replacement firm), Catalog Seed v1 — 3 Anchor Firms, FTMO Preset Rules, Gap: Firm Catalog Does Not Exist Yet, MyFundedFX Preset Rules, Topstep Preset Rules

### Community 159 - "RULES_SOURCE env var"
Cohesion: 0.29
Nodes (7): Nota post-merge — borrar RULES_SOURCE de Vercel + smoke opcional, Task 6 — Validación final, docs y push, TD-018 Task 8 — Gates finales + docs + PR, Gates pre-push (tsc --noEmit + vitest run + eslint, 0 errores), Rollback fase 1 — quitar RULES_SOURCE (instantáneo), RULES_SOURCE env var, runRuleEngine()

### Community 160 - "account-risk-panel.tsx"
Cohesion: 0.43
Nodes (5): AccountRiskPanel(), asPct(), BOTTLENECK, pct(), RiskBudgetMeter()

### Community 161 - "badge.tsx"
Cohesion: 0.38
Nodes (4): COPY, Badge(), BadgeProps, badgeVariants

### Community 162 - "capture-rules.ts"
Cohesion: 0.29
Nodes (4): ChecklistEvaluation, ChecklistState, Regime, REGIME_VALUES

### Community 163 - "trade-derivation.ts"
Cohesion: 0.38
Nodes (6): deriveRiskAmount(), deriveRiskPct(), deriveSession(), parseHour(), RiskInput, SessionLabel

### Community 164 - "backfill-embeddings.mjs"
Cohesion: 0.33
Nodes (5): apiKey, c, decryptApiKey(), EMBED_MODEL, encKey()

### Community 165 - "backfill-resource-embeddings.mjs"
Cohesion: 0.33
Nodes (5): apiKey, c, decryptApiKey(), EMBED_MODEL, encKey()

### Community 166 - "E2: Rule Entity (unified w/ Automation)"
Cohesion: 0.40
Nodes (6): C6: dualidad reglas (crítico auditoría), FREEZE-D8: la fusión Rule/Automation es semántica, E2: Rule (unificado con Automation), Riesgo: moat débil, POST-6: Base de reglas prop-firm como activo central (moat), RI-2: fusión de reglas (riesgo)

### Community 167 - "Cognitive Engine (root bounded context)"
Cohesion: 0.33
Nodes (6): Cognitive Engine (bounded context raíz), FREEZE-D2: Cognitive Engine aislado, E12: PreSessionCheckin, E5: DomainEvent (outbox), POST-5: Extracción del Cognitive Engine a servicio independiente, Riesgo: reescritura a 24 meses

### Community 168 - "Behavior Engine (insight → compromiso → regla → verificación → refuerzo)"
Cohesion: 0.33
Nodes (6): Behavior Engine (insight → compromiso → regla → verificación → refuerzo), BehaviorLoopPanel (UI en /analytics), commitment-service (createCommitmentFromInsight / evaluateWindowCommitments / carryOverCommitments), ImprovementScore / Índice de mejora (0–100), GAP-B1 — historización de ImprovementScore (✅ PR #117, E19 + cron + curva), OI-14.x (S14: ImprovementScore — snapshots, régimen, pesos)

### Community 169 - "askCoach()"
Cohesion: 0.53
Nodes (4): Stat(), ErrorCardsPanel(), fmt(), askCoach()

### Community 170 - "improvement-panel.tsx"
Cohesion: 0.47
Nodes (5): fmt(), Improvement, ImprovementPanel(), REGIME_LABEL, scoreColor()

### Community 171 - "action-list.tsx"
Cohesion: 0.40
Nodes (5): ACTION_LABEL, ActionList(), ALL, TAG_ACTIONS, RuleActionType

### Community 172 - "note-tag-suggestions.tsx"
Cohesion: 0.47
Nodes (4): NoteTagSuggestions(), RULES, suggestTagsFromNote(), TagRule

### Community 173 - "mae-mfe.ts"
Cohesion: 0.40
Nodes (5): analyzeMaeMfe(), EMPTY, MaeMfeResult, MaeMfeTrade, mean()

### Community 174 - "reinforcement.ts"
Cohesion: 0.40
Nodes (5): CommitmentResult, planReinforcement(), positiveIsVisible(), ReinforcementKind, ReinforcementPlan

### Community 175 - "prop-firm-presets.ts"
Cohesion: 0.33
Nodes (5): DrawdownModel, FIRMS, Phase, PROP_FIRM_PRESETS, PropFirmPresetSeed

### Community 176 - "Regla del loop 'Enfriamiento tras una pérdida' (enforce, TRADE_PRE_CREATE, BLOCK)"
Cohesion: 0.40
Nodes (5): Prueba observable del flip (rules.last_fired_at bumps, automations quieto), Regla del loop 'Enfriamiento tras una pérdida' (enforce, TRADE_PRE_CREATE, BLOCK), Fase 1 ejecutada y verificada en prod (Playwright + SQL, RULE_BLOCKED), Triaje de las 13 'falsa protección', Verificación post-merge en prod (/reglas edita, BLOCK bloquea, last_fired_at bumps)

### Community 177 - "benchmark.ts"
Cohesion: 0.50
Nodes (4): analyzeBenchmark(), BenchmarkResult, BenchmarkSetupRow, weightedComparison()

### Community 178 - "pnl-heatmap.ts"
Cohesion: 0.40
Nodes (3): DailyPnl, HeatmapDay, HeatmapResult

### Community 179 - "conditions.ts"
Cohesion: 0.60
Nodes (4): compare(), evaluate(), toNum(), ConditionValue

### Community 181 - "index.ts"
Cohesion: 0.50
Nodes (3): sendEmail(), sendPropFirmHealthAlert(), supabase

### Community 182 - "CI job: checks (type check, tests, build)"
Cohesion: 0.50
Nodes (4): CI job: checks (type check, tests, build), CI job: authenticated E2E (Playwright), CI job: migrate-deploy (apply migrations to production), CI job: migrate-validate (replay from scratch)

### Community 183 - "BACKLOG.md (fuente del backlog; borrado, 2026-06-05)"
Cohesion: 0.50
Nodes (4): BACKLOG.md (fuente del backlog; borrado, 2026-06-05), Backlog P1 — próximo v2.1 (B-01..B-05: iconos PWA, eslint CI, E2E Playwright, Sentry, carga 1000+ trades), Backlog P2 — deseable (B-06..B-10: charts en PDF, patrones en UI, onboarding fallback, SW cache bump, comparar reviews), Backlog P3 — oportunista (B-11..B-16: features IA, AiUsageLog, multi-divisa, API brokers, PWA móvil, social)

### Community 186 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 187 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

## Knowledge Gaps
- **1053 isolated node(s):** `PALETTES`, `target`, `Instruments`, `TagEdges`, `Overview` (+1048 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn()` to `index.ts`, `trades-table.tsx`, `rule-builder.tsx`, `client.ts`, `page.tsx`, `add-edit-resource-modal.tsx`, `tab-portfolio.tsx`, `register-trade-modal.tsx`, `page.tsx`, `page.tsx`, `view-model.ts`, `Sidebar.tsx`, `review-report-shell.tsx`, `resource-drawer.tsx`, `page.tsx`, `badge.tsx`, `notifications.ts`, `page.tsx`, `markdown.tsx`, `ai-coach-drawer.tsx`, `motion.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `protectedProcedure` connect `init.ts` to `seed.ts`, `send-review.ts`, `monthly-reviews.ts`, `weekly-reviews.ts`, `isWin()`, `feature-models.ts`, `intervention-service.ts`, `study-session-service.ts`, `learning-resources.ts`, `edge-service.ts`, `behavior.ts`, `learning-insights-service.ts`, `improvement-service.ts`, `analytics-bundle.ts`, `ai-config.ts`, `parse.ts`, `risk-service.ts`, `today-service.ts`, `psychology-service.ts`, `coach.ts`, `profile.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `trpc` connect `client.ts` to `cn()`, `index.ts`, `trades-table.tsx`, `rule-builder.tsx`, `page.tsx`, `account-card.tsx`, `add-edit-resource-modal.tsx`, `setup-intelligence-panel.tsx`, `tab-portfolio.tsx`, `register-trade-modal.tsx`, `intelligence-panel.tsx`, `layout.tsx`, `palette-studio.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `view-model.ts`, `Sidebar.tsx`, `resource-drawer.tsx`, `page.tsx`, `account-risk-panel.tsx`, `askCoach()`, `notifications.ts`, `page.tsx`, `page.tsx`, `page.tsx`, `ai-coach-drawer.tsx`, `ai-models-card.tsx`, `monthly-letter.tsx`, `theme-provider.tsx`, `feed.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `PALETTES`, `target`, `Instruments` to the rest of the system?**
  _1074 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cn()` be split into smaller, more focused modules?**
  _Cohesion score 0.04231560387893035 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04701733764325595 - nodes in this community are weakly interconnected._
- **Should `trades-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055087719298245616 - nodes in this community are weakly interconnected._