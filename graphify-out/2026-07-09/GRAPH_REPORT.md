# Graph Report - .  (2026-07-09)

## Corpus Check
- 200 files · ~707,400 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3570 nodes · 7856 edges · 249 communities (215 shown, 34 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 182 edges (avg confidence: 0.76)
- Token cost: 935,169 input · 0 output

## Community Hubs (Navigation)
- Notifications Center (UI)
- Accounts & Export Pages
- Account Card & Risk Meters
- Bayesian Statistics Core
- Docs: Architecture & CI
- Mastery / SRS Logic
- Email Templates & Components
- UI Primitives & Data Table
- Learning: Today & Focus Session
- Dashboard Analytics Service
- Financial Formulas Core
- Account Modals (Create/History)
- Package Dependencies
- Dashboard Widgets
- Playbook & Notifications Pages
- Report Charts & PDF Export
- Coach Memory (4 Layers)
- Learning Modals & Tags Page
- Cron Jobs & Auth
- Withdrawals & Balance Sync
- Review Cards & Monthly Letter
- Trades Page & Session Log
- Improvement Score Engine
- tRPC Server Core & Routers
- Review Edition & Patterns UI
- AI Trader Context Builder
- Rolling Window (Longitudinal)
- Monthly Review Finalization
- Learning Digest & Datetime
- Register Trade Modal
- Docs: Sprint Decisions (v3)
- Analytics Page (UI)
- Domains Analytics
- Components Layout
- Lib Fx
- Domains Trading
- App Reviews
- Domains Analytics
- Domains Learning
- Server Services
- Tests Routers
- Lib Ai
- Docs V3 Decisions
- Server Services
- Components Trades
- Domains Analytics
- Domains Learning
- Lib Ai
- Domains Analytics
- Domains Cognitive
- Types Index
- Docs V3 Architecture
- Domains Analytics
- Domains Analytics
- Server Services
- Server Services
- Domains Cognitive
- Domains Rules
- Lib Ai
- Scripts Seed
- Server Services
- Server Trpc
- Tsconfig Compileroptions
- Lib Theme
- Domains Rules
- Components Trades
- Components Ui
- App Aprendizaje
- Server Trpc
- Docs V3 Closure
- App Dashboard
- Domains Rules
- Domains Analytics
- Domains Analytics
- Package Devdependencies
- Docs Archive Changelog
- Components Ai
- Domains Analytics
- Domains Analytics
- Scripts Gen Theme
- App Api
- Domains Trading
- Domains Analytics
- Domains Learning
- Lib Ai
- Lib Theme
- Docs Superpowers Specs
- Docs V3 Product
- App Api
- App Perfil
- Domains Analytics
- Domains Behavior
- Domains Rules
- Scripts Gen
- Server Services
- App Mercados
- App Reglas
- Domains Analytics
- Domains Analytics
- Server Services
- Domains Behavior
- Server Trpc
- Docs Superpowers Specs
- Docs V3 V32
- App Perfil
- App Reviews
- Components Risk
- Domains Rules
- Components Trades
- Domains Analytics
- Domains Cognitive
- Domains Profile
- Lib Theme
- Server Services
- Components Ui
- App Api
- Server Services
- Components Tags
- Components Theme
- Lib Ai
- Public Manifest
- Docs Superpowers Plans
- Docs V3 Decisions
- App Aprendizaje
- Lib Storage
- App Reviews
- Domains Cognitive
- Package Scripts
- Docs Archive Ai
- Docs Superpowers Specs
- Docs Superpowers Plans
- Docs V3 Behavior
- App Perfil
- Components Playbook
- Domains Analytics
- Domains Analytics
- Server Services
- Server Services
- Docs V3 Test
- Docs V3 Changelog
- App Layout
- Domains Analytics
- Domains Cognitive
- Domains Trading
- Domains Trading
- Package Engines
- Docs Superpowers Specs
- Docs V3 Behavior
- Components Ui
- App Dashboard
- Domains Trading
- Domains Analytics
- Domains Trading
- Domains Trading
- Lib Ai
- Docs Auditoria Producto
- Docs V3 Adr
- Docs V3 Recap
- Docs V3 Open
- Docs V3 Recap
- Domains Analytics
- Domains Analytics
- Tests Services
- Scripts Backfill
- Scripts Backfill
- Server Trpc
- Docs Archive Database
- Docs Archive Formula
- Docs Superpowers Specs
- Docs V3 Adr
- Docs V3 Architecture
- Docs V3 Sprint
- Docs V3 Product
- Components Improvement
- Domains Analytics
- Lib Load
- Server Trpc
- Docs V3 Changelog
- Docs V3 Product
- Docs V3 Rehydration
- Docs V3 Sprint
- Domains Analytics
- Domains Rules
- Tests Components
- Tests Routers
- Tests Routers
- Supabase Functions Weekly
- Docs Superpowers Specs
- Docs Superpowers Specs
- Docs V3 Architecture
- Docs V3 Sprint
- Tests Routers
- Vercel
- Docs Superpowers Specs
- Docs Superpowers Specs
- Docs V3 Adr
- Docs V3 Decisions
- Docs V3 Decisions
- Docs V3 Decisions
- Agents Nextjs
- App Dashboard
- Proxy
- Docs V3 Architecture
- Docs V3 Architecture
- Docs V3 Architecture
- Docs V3 Decisions
- Docs V3 Decisions
- Docs V3 Design
- Docs V3 Implementation
- Docs V3 Test
- Docs V3 Test
- Eslint Config
- Next Config
- Next Env
- Postcss Config
- Prisma Config
- Public Sw
- Docs V3 Architecture
- Docs V3 Architecture
- Docs V3 Decisions
- Docs V3 Decisions
- Docs V3 Decisions
- Docs V3 Decisions
- Docs V3 Decisions
- Docs V3 Decisions
- Docs V3 Decisions
- Docs V3 Decisions
- Docs V3 Design
- Docs V3 Session
- Docs V3 Sprint
- Readme Event Bus
- Readme Playbook Intelligence

## God Nodes (most connected - your core abstractions)
1. `cn()` - 153 edges
2. `trpc` - 68 edges
3. `formatErrorForUser()` - 63 edges
4. `isWin()` - 40 edges
5. `calcWinRate()` - 34 edges
6. `protectedProcedure` - 34 edges
7. `toast` - 33 edges
8. `RouterOutputs` - 33 edges
9. `Button()` - 28 edges
10. `currencySymbol()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Risk & Prop management (ruin risk, Monte Carlo, budget)` --semantically_similar_to--> `Risk Engine + prop-firm-guard (mutation-boundary enforcement)`  [INFERRED] [semantically similar]
  README.md → docs/ARCHITECTURE.md
- `Institutional Analytics (Bayesian confidence bands)` --semantically_similar_to--> `Analytics domain (server-side aggregation)`  [INFERRED] [semantically similar]
  README.md → docs/ARCHITECTURE.md
- `makeDb()` --indirect_call--> `key()`  [INFERRED]
  src/__tests__/services/analytics/analytics-cache.test.ts → src/server/services/reviews/monthly-card-stats.ts
- `buildAccountStats()` --indirect_call--> `at()`  [INFERRED]
  src/domains/analytics/services/dashboard-analytics.ts → src/__tests__/services/notifications/emit.test.ts
- `Dropdown()` --indirect_call--> `handler()`  [INFERRED]
  src/components/ui/market-select.tsx → src/app/api/trpc/[trpc]/route.ts

## Import Cycles
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/accounts.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/withdrawals.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 4-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 4-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/insights-engine.ts`
- 4-file cycle: `src/domains/analytics/services/psychology-insights.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/psychology-insights.ts`
- 4-file cycle: `src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/report-data.ts`
- 4-file cycle: `src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/report-data.ts`
- 4-file cycle: `src/server/services/tags/seed.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/tags.ts -> src/server/services/tags/seed.ts`
- 4-file cycle: `src/domains/trading/services/risk-enforcement.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/accounts.ts -> src/domains/trading/services/risk-enforcement.ts`
- 4-file cycle: `src/domains/trading/services/risk-enforcement.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/domains/trading/services/risk-enforcement.ts`
- 4-file cycle: `src/server/services/tags/seed.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/server/services/tags/seed.ts`
- 4-file cycle: `src/domains/analytics/services/discipline-service.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/domains/analytics/services/discipline-service.ts`
- 5-file cycle: `src/server/services/email/send-review.ts -> src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/email/send-review.ts`
- 5-file cycle: `src/server/services/email/send-review.ts -> src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/email/send-review.ts`
- 5-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/psychology-insights.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/review-ai.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/review-ai.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/analytics-bundle.ts`

## Hyperedges (group relationships)
- **CI/CD antierrores pipeline** — _github_workflows_ci_checks, _github_workflows_ci_e2e, _github_workflows_ci_migrate_validate, _github_workflows_ci_migrate_deploy [EXTRACTED 1.00]
- **Centralized AI configuration resolution** — docs_architecture_resolve_provider, docs_archive_ai_configuration_consistency_report_resolve_engine, docs_archive_ai_configuration_consistency_report_health_check, docs_archive_ai_configuration_consistency_report_phantom_features, docs_architecture_key_encryption [INFERRED 0.85]
- **Analytics intelligence data→insight→narrative flow** — docs_analytics_intelligence_architecture_bundle, docs_analytics_intelligence_architecture_insights_engine, docs_analytics_intelligence_architecture_ai_context_engine, docs_analytics_intelligence_architecture_insights_service, docs_ai_content_rendering_guidelines_markdown_renderer [INFERRED 0.85]
- **Reviews rich report pipeline (AI analysis + email + cron + PDF)** — docs_reviews_feature_handoff_ai_analysis, docs_reviews_feature_handoff_pdf_report, docs_reviews_feature_handoff_reviews_cron, docs_superpowers_plans_2026_06_23_reviews_weekly_redesign_plan_verdict [EXTRACTED 0.85]
- **Per-user AI config: encrypted keys, provider chain, usage tracking, connectivity test** — docs_archive_ai_architecture_useraiconfig, docs_archive_ai_architecture_key_encryption, docs_archive_ai_architecture_multiprovider, docs_archive_ai_architecture_ai_usage_log, docs_archive_ai_architecture_ai_test_endpoint [EXTRACTED 0.85]
- **Formula centralization consolidates win-rate, discipline, Sharpe, drawdown** — docs_archive_formula_engine_centralization, docs_archive_formula_engine_win_rate, docs_archive_formula_engine_discipline_score, docs_archive_formula_engine_sharpe_ratio, docs_archive_formula_engine_max_drawdown [EXTRACTED 0.85]
- **Reglas/Etiquetas/Notificaciones 3-epic restructure** — docs_superpowers_specs_2026_06_16_notifications_system_design_epic1, docs_superpowers_specs_2026_06_17_tags_system_design_epic2, docs_superpowers_specs_2026_06_17_rules_engine_design_epic3 [EXTRACTED 1.00]
- **Reviews redesign evolution chain** — docs_superpowers_specs_2026_06_22_reviews_reports_email_cron_pdf_design_reviews_rich, docs_superpowers_specs_2026_06_23_reviews_redesign_design_redesign, docs_superpowers_specs_2026_06_23_reviews_weekly_redesign_design_weekly, docs_superpowers_specs_2026_06_24_reviews_monthly_redesign_design_monthly, docs_superpowers_specs_2026_06_24_reviews_unified_redesign_design_unified [EXTRACTED 1.00]
- **V3 Cognitive Engine core subsystems (freeze)** — docs_v3_architecture_freeze_outbox_events, docs_v3_architecture_freeze_cognitive_engine_boundary, docs_v3_architecture_freeze_behavior_engine, docs_v3_architecture_challenge_hierarchical_memory, docs_v3_architecture_challenge_intervention_scoring [EXTRACTED 1.00]
- **Phase A0 — root ADR decisions (Gate G0)** — docs_v3_architecture_v3_1_delta_phase_a0, docs_v3_architecture_v3_1_delta_d1_adr001_events, docs_v3_architecture_v3_1_delta_d3_adr002_bayesian, docs_v3_architecture_v3_1_delta_d4_adr003_privacy, docs_v3_architecture_v3_1_delta_gate_g0 [EXTRACTED 1.00]
- **Behavior value chain flow** — docs_v3_behavior_engine_v3_insight, docs_v3_behavior_engine_v3_commitment, docs_v3_behavior_engine_v3_rule, docs_v3_behavior_engine_v3_evaluatecommitment, docs_v3_behavior_engine_v3_reinforcement [EXTRACTED 1.00]
- **v3.1 closure debt track** — docs_v3_audit_final, docs_v3_closure_reverify, docs_v3_closure_design, docs_v3_closure_sprint_plan [EXTRACTED 1.00]
- **Rule/Automation unification and enforcement cutover** — docs_v3_decisions_sprint_1_additive_migration_backfill, docs_v3_gates_g1_g2_biz1_dualwrite, docs_v3_gates_g1_g2_biz1_runrules, docs_v3_decisions_sprint_5_linkrule, docs_v3_open_items_sprint_1_cutover [EXTRACTED 0.90]
- **Statistical significance backbone across sprints** — docs_v3_decisions_sprint_3_bayesian_estimator, docs_v3_decisions_sprint_3_credible_interval_beta, docs_v3_decisions_sprint_10_welch, docs_v3_decisions_sprint_11_prune_poison_gold, docs_v3_decisions_sprint_8_calibration_bayes [INFERRED 0.85]
- **Insight to commitment to rule to reinforcement loop** — docs_v3_master_prd_e1_behavior_engine, docs_v3_decisions_sprint_4_evaluatecommitment_outbox, docs_v3_decisions_sprint_5_linkrule, docs_v3_decisions_sprint_4_triangular_reinforcement [INFERRED 0.85]
- **Behavior Engine loop: Insight->Commitment->Rule->Reinforcement** — docs_v3_sprint_plan_insight_persisted, docs_v3_sprint_plan_commitment, docs_v3_sprint_plan_link_rule, docs_v3_product_master_plan_behavior_engine [EXTRACTED 1.00]
- **4-layer coach memory (episodic/semantic/identity/improvement)** — docs_v3_recap_v3_v32_four_layer_memory, docs_v3_recap_v3_v32_memory_episodic, docs_v3_recap_v3_v32_memory_semantic, docs_v3_recap_v3_v32_memory_identity [EXTRACTED 1.00]
- **5 cognitive surfaces (HOY/OPERAR/MEJORAR/PROTEGER/ANALIZAR)** — docs_v3_product_master_plan_surface_hoy, docs_v3_product_master_plan_surface_operar, docs_v3_product_master_plan_surface_mejorar, docs_v3_product_master_plan_surface_proteger, docs_v3_product_master_plan_surface_analizar [EXTRACTED 1.00]
- **Four-layer coach memory assembly** — docs_v3_v32_memory_plan_episodic_memory, docs_v3_v32_memory_plan_semantic_memory, docs_v3_v32_memory_plan_identity_memory, docs_v3_v32_memory_plan_improvement_memory, docs_v3_v32_memory_plan_assemble_coach_context [EXTRACTED 1.00]
- **v3.1 ADR root governance set** — docs_v3_adr_adr_000_root_decisions_root_decisions, docs_v3_adr_adr_001_events_and_delivery_events_runtime, docs_v3_adr_adr_002_statistics_statistics_strategy, docs_v3_adr_adr_003_memory_privacy_memory_privacy, docs_v3_adr_adr_004_cross_user_data_reservation_cross_user_reservation [INFERRED 0.85]

## Communities (249 total, 34 thin omitted)

### Community 0 - "Notifications Center (UI)"
Cohesion: 0.07
Nodes (51): NotificacionesPage(), NotificationBell(), CenterPanel(), CenterSheet(), formatNotifTime(), NotificationItem(), NotificationItemProps, ToastCard() (+43 more)

### Community 1 - "Accounts & Export Pages"
Cohesion: 0.07
Nodes (43): CuentasPage(), PlaybookPage(), AiAnalysisCard(), Period, Period, ReviewActions(), ReviewNotes(), useSaveReview() (+35 more)

### Community 2 - "Account Card & Risk Meters"
Cohesion: 0.07
Nodes (46): ACCOUNT_STATUS_META, AccountCard(), AccountExposure, AccountRisk, formatSyncAgo(), isPropFirmLike(), KpiBox(), RawAccount (+38 more)

### Community 3 - "Bayesian Statistics Core"
Cohesion: 0.07
Nodes (46): betaBinomialEstimate(), betacf(), BetaPrior, betaQuantile(), cohensH(), DEFAULT_BETA_PRIOR, DEFAULT_NORMAL_PRIOR, DirectionalEstimate (+38 more)

### Community 4 - "Docs: Architecture & CI"
Cohesion: 0.05
Nodes (54): CI job: checks (type check, tests, build), CI job: authenticated E2E (Playwright), CI job: migrate-deploy (apply migrations to production), CI job: migrate-validate (replay from scratch), Callouts syntax ([!INSIGHT]/[!WARNING]/:::type), IntelligencePanel (reusable AI insight container), Markdown renderer (components/ui/markdown.tsx), AI Markdown rendering audit & implementation (+46 more)

### Community 5 - "Mastery / SRS Logic"
Cohesion: 0.07
Nodes (42): effectiveMasteryLevel(), isMastered(), isReviewDue(), MASTERY_STAGES, masteryLevel(), MasteryStage, masteryStageIndex(), masteryStageIndexFromLevel() (+34 more)

### Community 6 - "Email Templates & Components"
Cohesion: 0.09
Nodes (34): ReviewEmailModel, DigestModel, CtaButton(), Divider(), EmailFooter(), EmailLayout(), ProgressBlock(), reviewChipLabel() (+26 more)

### Community 7 - "UI Primitives & Data Table"
Cohesion: 0.09
Nodes (37): RFC-4180, RetirosTable(), AppToaster(), AnimatedItem(), AnimatedList(), DataTable(), gridTemplate(), RovingItemProps (+29 more)

### Community 8 - "Learning: Today & Focus Session"
Cohesion: 0.07
Nodes (36): fmt(), FocusSession(), DOW, HoyTab(), TOUR_STEPS, ALL_TYPES, ProgresoSections(), ResourceFromDB (+28 more)

### Community 9 - "Dashboard Analytics Service"
Cohesion: 0.08
Nodes (40): AccountBalance, AccountExposure, AccountLimits, AccountStat, AccountWithLimits, buildAccountStats(), buildDiscipline(), buildEquityCurve() (+32 more)

### Community 10 - "Financial Formulas Core"
Cohesion: 0.07
Nodes (36): calcNetPnl(), calcSharpeRatio(), calcAvgR(), calcExpectancyR(), calcSetupHealth(), SetupHealthParams, SetupHealthStatus, AiUsageLog (+28 more)

### Community 11 - "Account Modals (Create/History)"
Cohesion: 0.07
Nodes (35): AccountHistoryModal(), EVENT_META, Log, ACCOUNT_TYPES, BROKERS, FORM_INIT, NuevaCuentaModal(), TIMEZONES (+27 more)

### Community 12 - "Package Dependencies"
Cohesion: 0.05
Nodes (42): dependencies, @anthropic-ai/sdk, class-variance-authority, clsx, dotenv, framer-motion, @hookform/resolvers, katex (+34 more)

### Community 13 - "Dashboard Widgets"
Cohesion: 0.07
Nodes (30): Card(), CardProps, ChartTooltip(), TooltipPayload, GoalProgressWidget(), GoalProgressWidgetProps, GoalRingProps, KpiSummary (+22 more)

### Community 14 - "Playbook & Notifications Pages"
Cohesion: 0.06
Nodes (27): CATEGORIES, COLORS, DbSetup, Direction, DirectionChip(), FORM_INIT, HealthStatus, MARKET_FILTERS (+19 more)

### Community 15 - "Report Charts & PDF Export"
Cohesion: 0.11
Nodes (30): EquityCurveChart(), PnlTrendChart(), TrendTooltip(), DownloadPdfButton(), LearningSummary(), Card(), Delta(), Eyebrow() (+22 more)

### Community 16 - "Coach Memory (4 Layers)"
Cohesion: 0.10
Nodes (32): assembleContextBlock(), AssembleInput, isInjectable(), MemoryExtraction, MemoryKind, MemoryStatus, parseMemoryExtraction(), ProposedMemory (+24 more)

### Community 17 - "Learning Modals & Tags Page"
Cohesion: 0.11
Nodes (26): PlanSessionModal(), todayISO(), ResourceFromDB, ResourceFromDB, blankDraft(), CATEGORY_SUGGESTIONS, COLOR_PRESETS, DISPLAY_MODES (+18 more)

### Community 18 - "Cron Jobs & Auth"
Cohesion: 0.12
Nodes (23): POST(), POST(), ADR-0001, POST(), AuthResult, checkCronAuth(), timingSafeMatch(), USER_SELECT (+15 more)

### Community 19 - "Withdrawals & Balance Sync"
Cohesion: 0.08
Nodes (27): SyncBalanceModal(), SyncBalanceModalProps, syncSchema, SyncValues, SetupModal(), DeleteCell(), fmtMoney(), FORM_INIT (+19 more)

### Community 20 - "Review Cards & Monthly Letter"
Cohesion: 0.12
Nodes (24): Campaign(), disciplineColor(), fmtMoney(), GRADE_TONE, pnlColor(), ReviewCard(), ReviewFromDB, tintFor() (+16 more)

### Community 21 - "Trades Page & Session Log"
Cohesion: 0.11
Nodes (23): MarketItem, TradesPage(), ENERGY_LABELS, LogSessionPopover(), MOOD_LABELS, RatingBar(), SESSION_OPTIONS, TradeDetailPanel() (+15 more)

### Community 22 - "Improvement Score Engine"
Cohesion: 0.11
Nodes (25): clamp01(), computeImprovementScore(), costOfIndiscipline(), DEFAULT_WEIGHTS, Driver, ImprovementInputs, ImprovementResult, ImprovementWeights (+17 more)

### Community 23 - "tRPC Server Core & Routers"
Cohesion: 0.11
Nodes (21): Context, protectedProcedure, t, RouterInputs, accountLogsRouter, goalsRouter, interventionRouter, SuggestedAction (+13 more)

### Community 24 - "Review Edition & Patterns UI"
Cohesion: 0.10
Nodes (25): CardEquityChart(), DAYS, EditionHeader(), EditionHeaderData, money(), TONE, Pattern, PatternCards() (+17 more)

### Community 25 - "AI Trader Context Builder"
Cohesion: 0.11
Nodes (26): buildTraderContext(), RawAccountRow, RawLearningRow, RawMarketRow, RawReviewRow, RawRuleRow, RawSessionRow, RawSetupRow (+18 more)

### Community 26 - "Rolling Window (Longitudinal)"
Cohesion: 0.14
Nodes (22): addDays(), compareCurrentVsPrevious(), Comparison, Dated, isCount(), rollingWindow(), RollingWindowOpts, sortByDate() (+14 more)

### Community 27 - "Monthly Review Finalization"
Cohesion: 0.12
Nodes (22): finalizeMonthlyReview(), FinalizeResult, MONTHS_ES, evaluateGoal(), GoalContext, GoalProposal, GoalStatus, deriveLetterTitle() (+14 more)

### Community 28 - "Learning Digest & Datetime"
Cohesion: 0.13
Nodes (18): POST(), LearningDigest(), addDaysISO(), localDateISO(), localHour(), monthStartISO(), weekStartISO(), EmailPrefRow (+10 more)

### Community 29 - "Register Trade Modal"
Cohesion: 0.11
Nodes (26): AccountLike, computeAutoTag(), computeContracts(), EMOTION_OPTIONS, EmotionBefore, ERROR_FIELD_ORDER, INITIAL, isSelectableSetup() (+18 more)

### Community 30 - "Docs: Sprint Decisions (v3)"
Cohesion: 0.08
Nodes (28): Additive migration + backfill, Automation intact (D-S1-2), sourceCommitmentId/sourceInsightId uuid without FK (D-S1-6), Anonymization via structured columns, no PII (ADR-004) (D4.4), evaluateCommitment transactional with outbox (D4.5), Initial subset of 4 behavior verifiers (D4.1), Deterministic triangular reinforcement schedule (D4.3), linkRule creates rule in rules table post-cutover (D5.1), Idempotent suggestRulesFromInsights (D5.4) (+20 more)

### Community 31 - "Analytics Page (UI)"
Cohesion: 0.15
Nodes (23): AccountsIntel(), amt(), AnalyticsPage(), Edges(), fmt(), GoalRow(), Goals(), Institutional (+15 more)

### Community 32 - "Domains Analytics"
Cohesion: 0.12
Nodes (19): EquityDrawdownChart(), fmt(), fmt(), RDistributionChart(), analyzeDrawdown(), daysBetween(), DrawdownPoint, DrawdownResult (+11 more)

### Community 33 - "Components Layout"
Cohesion: 0.12
Nodes (20): CreateAction, IconTab(), MobileBottomBar(), NavItem, useReducedMotion(), DeskItem(), MobileClock(), NAV (+12 more)

### Community 34 - "Lib Fx"
Cohesion: 0.13
Nodes (20): COACH_TOOLS, CoachToolName, PERIOD_DAYS, PROTECTION_TO_METRIC, ToolCtx, calcProfitFactor(), getISOWeekKey(), convertToBase() (+12 more)

### Community 35 - "Domains Trading"
Cohesion: 0.14
Nodes (21): dupKey(), POST(), storedKey(), toDirection(), DryRunResponse, CTRADER_COLS, detectFormat(), parseCtraderDate() (+13 more)

### Community 36 - "App Reviews"
Cohesion: 0.11
Nodes (20): JumpItem, MonthJumpIndex(), money(), PeriodSummary(), Summary, labelFor(), MonthFilter, MONTHS_LONG (+12 more)

### Community 37 - "Domains Analytics"
Cohesion: 0.15
Nodes (21): toComputedInsight(), RecomputeAllResult, recomputeInsightsForUser(), bySymbolDate(), detectAccountRisk(), detectEmotionPerformance(), detectIntradayDecay(), detectLosingStreak() (+13 more)

### Community 38 - "Domains Learning"
Cohesion: 0.13
Nodes (20): calcNextReviewAt(), computeProgressPct(), computeResourceStatus(), applyStudyFinish(), minutesThisWeek(), pickStudySuggestion(), ResourceProgressLite, ResourceProgressUpdate (+12 more)

### Community 39 - "Server Services"
Cohesion: 0.15
Nodes (21): POST(), USER_SELECT, react, EmailSender, DigestDeps, MONTHS, periodKey(), reportPath() (+13 more)

### Community 40 - "Tests Routers"
Cohesion: 0.08
Nodes (8): handler(), StatusSelect(), createTRPCContext(), AppRouter, MockError, base, GOAL_RESULT, mockSupabase

### Community 41 - "Lib Ai"
Cohesion: 0.14
Nodes (21): AI_FEATURES, AI_PROVIDERS_LIST, AiFeature, AiSettings, CHAT_LADDER, CostPriority, DEFAULT_AI_SETTINGS, EMBEDDING_LADDER (+13 more)

### Community 42 - "Docs V3 Decisions"
Cohesion: 0.08
Nodes (25): compareVariants comparison primitive, not A/B framework (D10.5), detectEdgeDecay (historical or expectedAvgR baseline) (D10.2), Edge decay by significance (Welch t-test), not fixed window (D10.1), Welch t-test in institutional/stats/welch.ts (D10.4), computeNextReview SRS adapted to linked setup edge (D11.3), Prune/poison/gold by significance (Welch one-sample vs 0) (D11.1), emotion-feedback.ts incentive loop (D-S2-1), Feedback minimum sample threshold n>=5 (D-S2-2) (+17 more)

### Community 43 - "Server Services"
Cohesion: 0.15
Nodes (19): RiskBudget, AnomalyInput, AnomalyResult, assembleTodayFeed(), BASE, detectDailyAnomaly(), SEVERITY_MULT, SignalInput (+11 more)

### Community 44 - "Components Trades"
Cohesion: 0.12
Nodes (18): Checkbox(), getResult(), QUALITY_TAGS, qualityOf(), RESULT_LABELS, SESSION_CFG, shortAccount(), TAG_CFG (+10 more)

### Community 45 - "Domains Analytics"
Cohesion: 0.14
Nodes (16): computeInstrumentEdges(), EdgeVerdict, InstrumentEdge, InstrumentEdgeResult, InstrumentTrade, mean(), computeTagEdges(), mean() (+8 more)

### Community 46 - "Domains Learning"
Cohesion: 0.14
Nodes (17): ErrorCard, ErrorCardInput, ErrorTrade, generateErrorCards(), PerfSignal, computeTransfer(), mean(), TransferInput (+9 more)

### Community 47 - "Lib Ai"
Cohesion: 0.13
Nodes (17): ChatMessage, StreamChatOptions, SystemBlock, systemToString(), CoachAgentOptions, streamCoachAgent(), systemToString(), buildSystemPrompt() (+9 more)

### Community 48 - "Domains Analytics"
Cohesion: 0.17
Nodes (14): buildMonthlyReport(), MonthlyReport, ReportTrade, sessionsOf(), buildWeeklyReport(), DAY_LABELS, WeeklyReport, MonthlyReportBundle (+6 more)

### Community 49 - "Domains Cognitive"
Cohesion: 0.15
Nodes (20): ActionKind, clamp01(), DayState, decideIntervention(), DecisionOpts, detectInterventions(), FatigueState, InterventionCandidate (+12 more)

### Community 50 - "Types Index"
Cohesion: 0.10
Nodes (21): mockAccounts, mockMarkets, mockReviews, mockRules, mockSetups, mockTrades, AccountStatus, DashboardStats (+13 more)

### Community 51 - "Docs V3 Architecture"
Cohesion: 0.15
Nodes (22): CoachMemory / CoachThread / CoachMessage, AI Coach V3 redesign, LLM narrates, does not calculate, Coach proactive worker + interventions, Action-with-permission write tools, Analytics V3 — longitudinal quant engine, Edge decay + setup drift detection, ImprovementScore composite index (+14 more)

### Community 52 - "Domains Analytics"
Cohesion: 0.14
Nodes (17): AccountIntel, AnalyticsBundle, buildAnalyticsBundle(), EmotionIntel, holdMinutes(), MarketIntel, round1(), round2() (+9 more)

### Community 53 - "Domains Analytics"
Cohesion: 0.16
Nodes (18): buildHourStats(), kpisOf(), computeDirectionBreakdown(), computeSessionMatrix(), computeSetupStats(), DirectionStats, parseTimeMinutes(), SessionMatrixRow (+10 more)

### Community 54 - "Server Services"
Cohesion: 0.13
Nodes (20): InsightCategory, InsightSeverity, buildPeriodSummary(), CATEGORY_TAG, downsample(), loadPatterns(), loadReviewsOverview(), money() (+12 more)

### Community 55 - "Server Services"
Cohesion: 0.16
Nodes (16): block(), canEnforce(), proposeRuleForCommitment(), RuleSuggestionProposal, suggestRuleForInsight(), carryOverCommitments(), dismissProposedCommitment(), listProposedCommitments() (+8 more)

### Community 56 - "Domains Cognitive"
Cohesion: 0.13
Nodes (16): DispatchResult, DomainEventRecord, EventHandler, EventStatus, EventTransition, HandlerOutcome, handlers, isKnownEventType() (+8 more)

### Community 57 - "Domains Rules"
Cohesion: 0.20
Nodes (14): runAction(), compare(), evaluate(), toNum(), rulesSourceIsUnified(), runAutomations(), RunResult, runRuleEngine() (+6 more)

### Community 58 - "Lib Ai"
Cohesion: 0.16
Nodes (15): ConnectivityResult, testProviderConnectivity(), decryptApiKey(), encryptApiKey(), EncryptionConfigError, getEncryptionKey(), maskApiKey(), rotateEncryptionKey() (+7 more)

### Community 59 - "Scripts Seed"
Cohesion: 0.13
Nodes (21): ACCOUNTS, between(), buildTrade(), c, cols, DRY, EMO_LOSS, EMO_WIN (+13 more)

### Community 60 - "Server Services"
Cohesion: 0.16
Nodes (18): CommitmentResult, CommitmentWindow, planReinforcement(), positiveIsVisible(), ReinforcementKind, ReinforcementPlan, getVerifier(), publishEvent() (+10 more)

### Community 61 - "Server Trpc"
Cohesion: 0.12
Nodes (17): AutomationLike, deleteRuleForAutomation(), patchRuleForAutomation(), ruleFieldsFromAutomation(), syncRuleFromAutomation(), TEMPLATE_MAP, TEMPLATES, TRIGGERS (+9 more)

### Community 62 - "Tsconfig Compileroptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+12 more)

### Community 63 - "Lib Theme"
Cohesion: 0.19
Nodes (18): CreatorModal(), accentContrastFor(), bestContrastOn(), clamp01(), configFromHex(), contrastRatio(), hexToOklch(), hexToRgb() (+10 more)

### Community 64 - "Domains Rules"
Cohesion: 0.14
Nodes (16): CMP_LABEL, ConditionGroup(), Group, isLeaf(), isNot(), newLeaf(), NotNode, ENUM (+8 more)

### Community 65 - "Components Trades"
Cohesion: 0.17
Nodes (18): MetricRow(), MetricRowProps, SESSION_COLOR, SESSION_SHORT, TradeDetailPanelProps, getResult(), RESULT_CFG, SESSION_CFG (+10 more)

### Community 66 - "Components Ui"
Cohesion: 0.16
Nodes (17): Block, CALLOUT, CALLOUT_ALIASES, CalloutType, CODE_KEYWORDS, CodeBlock(), detectCallout(), HEADING_CLASS (+9 more)

### Community 67 - "App Aprendizaje"
Cohesion: 0.18
Nodes (15): ResourceFromDB, useResourceActions(), AddEditResourceModal(), ResourceFromDB, SetupImpactModal(), LinkSetupModal(), AprendizajePage(), ResourceFromDB (+7 more)

### Community 68 - "Server Trpc"
Cohesion: 0.13
Nodes (14): computeNextReview(), Grade, SrsInput, SrsResult, updateEase(), LearningResourceInput, learningResourcesRouter, LinkedSetup (+6 more)

### Community 69 - "Docs V3 Closure"
Cohesion: 0.16
Nodes (18): Audit Final v3.1 (closure audit), Gap A1 — hard pre-trade budget block, Gap A2 — transfer #31 + SRS #45 surface, Gap B1 — ImprovementScore temporal curve, POST-1..7 reserved roadmap frontier, Verdict — v3.1 CLOSED, Changelog Sprint 14 (ImprovementScore North Star), Closure Design (debt track spec) (+10 more)

### Community 70 - "App Dashboard"
Cohesion: 0.18
Nodes (12): Period, useDashboardStats(), DashboardPage(), Tab, TABS, VALID_PERIODS, PsicologiaPage(), ChecklistItem (+4 more)

### Community 71 - "Domains Rules"
Cohesion: 0.25
Nodes (15): RuleDraft, ProposedRule, PROTECTION_TEMPLATE_MAP, PROTECTION_TEMPLATES, ProtectionTemplate, templateToUnifiedRule(), AutomationTemplate, BASE_TEMPLATES (+7 more)

### Community 72 - "Domains Analytics"
Cohesion: 0.22
Nodes (14): aggregateExposure(), AggregateFreezeInput, aggregateFreezeSignal, CorrelationResult, Direction, OpenPosition, SymbolExposure, asDrawdownModel() (+6 more)

### Community 73 - "Domains Analytics"
Cohesion: 0.16
Nodes (14): AccountRiskConfig, DerivedRiskInputs, deriveRiskInputs(), median(), pctToFraction(), PropProjectionInput, DrawdownModel, AccountPhase (+6 more)

### Community 74 - "Package Devdependencies"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, eslint-config-next, jsdom, @playwright/test, react-email, tailwindcss, @tailwindcss/postcss (+10 more)

### Community 75 - "Docs Archive Changelog"
Cohesion: 0.15
Nodes (17): Changelog — Trading Journal v2 (Phases 0–XII, Sprints 1–12), CRON_SECRET bypass fix in edge function, email_log idempotence (ADR-005), pgvector trade-note embeddings (notes_embedding, off-schema), PWA (manifest + service worker + offline), Email Setup (Resend) — TASK-022, Resend transactional email integration, Final Manual QA Test Plan (T-01…T-57) (+9 more)

### Community 76 - "Components Ai"
Cohesion: 0.16
Nodes (14): AiCoachDrawer(), ApiError, clampPos(), formatTime(), Message, SUGGESTED, TOOL_LABELS, useIsMobile() (+6 more)

### Community 77 - "Domains Analytics"
Cohesion: 0.18
Nodes (9): computeDisciplineScore(), DisciplineDetail, DisciplinePeriod, DisciplineResult, calcDisciplineScore(), DisciplineBreakdown, DisciplineParams, MOCK_SCORE (+1 more)

### Community 78 - "Domains Analytics"
Cohesion: 0.27
Nodes (14): AnalyticsTrade, detectCleanStreak(), detectEmotionBeforeLoss(), detectHoldingAsymmetry(), detectImpulsiveExpectancy(), detectOverconfidence(), detectViolationEmotion(), generatePsychologyInsights() (+6 more)

### Community 79 - "Scripts Gen Theme"
Cohesion: 0.23
Nodes (14): accentContrastFor(), clamp01(), contrastRatio(), derivePalette(), hexToRgb(), linearToSrgb(), okl(), oklchToHex() (+6 more)

### Community 80 - "App Api"
Cohesion: 0.22
Nodes (11): POST(), PERIODS, POST(), PERIODS, POST(), ALLOWED_MIME, POST(), AnalyticsAiOptions (+3 more)

### Community 81 - "Domains Trading"
Cohesion: 0.20
Nodes (11): EmotionInsight(), LABELS, EmotionFeedback, EmotionStat, EmotionTrade, feedbackForEmotion(), needsEmotionNudge(), round1() (+3 more)

### Community 82 - "Domains Analytics"
Cohesion: 0.26
Nodes (11): mean(), oneSampleTTest(), sampleVariance(), studentTTwoSidedP(), TTestResult, welchTTest(), detectEdgeDecay(), EdgeDecayInput (+3 more)

### Community 83 - "Domains Learning"
Cohesion: 0.22
Nodes (11): buildLearningDigest(), daysBetween(), DigestInput, DigestReview, formatDateLabel(), isoDate(), ReviewKind, computeNewStreak() (+3 more)

### Community 84 - "Lib Ai"
Cohesion: 0.17
Nodes (14): getProviderKey(), ModelRef, ACTIVE_AI_FEATURES, AiDiagnostics, ALL_PROVIDERS, buildAiDiagnostics(), KeySource, ProviderKeyStatus (+6 more)

### Community 85 - "Lib Theme"
Cohesion: 0.27
Nodes (14): applyColorTheme(), clearInlineTokens(), injectInline(), LEGACY_KEYS, LEGACY_VARS, reapplyCustomForMode(), tokensToCssText(), derivePalette() (+6 more)

### Community 86 - "Docs Superpowers Specs"
Cohesion: 0.17
Nodes (15): buildLearningDigest (pure DigestModel), pg_cron + pg_net cron endpoint pattern, Learning email daily digest, React Email template system (src/emails), localDateISO/localHour shared datetime util, Timezone trade dates fix plan, generateAnalysis AI review layer, ReviewReportVM shared view-model (+7 more)

### Community 87 - "Docs V3 Product"
Cohesion: 0.13
Nodes (15): S3 open items: institutional surfaces deferred to S12, Reserved roadmap POST-1..7 + A3 real routes, 5 Cognitive Surfaces, ANALIZAR surface (quantitative depth), HOY surface (daily cockpit), MEJORAR surface (improvement engine), OPERAR surface (capture/execution), PROTEGER surface (capital/risk) (+7 more)

### Community 88 - "App Api"
Cohesion: 0.19
Nodes (9): POST(), Provider, rateLimiter, testAnthropicKey(), testOpenAIKey(), testOpenRouterKey(), createRateLimiter(), InMemoryRateLimiter (+1 more)

### Community 89 - "App Perfil"
Cohesion: 0.13
Nodes (4): AI_PROVIDERS, COLORBLIND_OPTIONS, SESSIONS, TIMEZONES

### Community 90 - "Domains Analytics"
Cohesion: 0.22
Nodes (10): ComputedInsight, InsightStatus, PersistedInsightRef, reconcileInsights(), ReconcilePlan, ADR-0002, loadActiveRefs(), persistInsights() (+2 more)

### Community 91 - "Domains Behavior"
Cohesion: 0.19
Nodes (12): METRIC_KEYS, OFF_PLAN_TAGS, REGISTRY, sortByDateTime(), Verifier, VerifierOpts, VerifierResult, verifyOffPlanTrades() (+4 more)

### Community 92 - "Domains Rules"
Cohesion: 0.26
Nodes (10): buildMigrationReportForUser(), MigrationReportTotals, automationToUnifiedRule(), buildNoMappingReport(), classifyMode(), descriptiveRuleToUnifiedRule(), looksCritical(), NoMappingReport (+2 more)

### Community 93 - "Scripts Gen"
Cohesion: 0.19
Nodes (14): BG, chunk(), clamp(), crc32(), __dirname, distSeg(), DOT, encodePNG() (+6 more)

### Community 94 - "Server Services"
Cohesion: 0.16
Nodes (10): EmailAttachment, emailFailureMessage(), SendEmailArgs, SendEmailResult, LearningSummary, loadLearningSummary(), aiMetaOf(), SerializedReview (+2 more)

### Community 95 - "App Mercados"
Cohesion: 0.15
Nodes (11): CAT_COLOR, CAT_LABELS, CATS, FORM_INIT, MarketForm, MarketItem, MarketModal(), MercadosPage() (+3 more)

### Community 96 - "App Reglas"
Cohesion: 0.15
Nodes (10): ACTION_LABEL, AutomationRow, AutomationsTab(), SystemRulesTab(), TABS, Template, TRIGGER_LABEL, SegmentedOption (+2 more)

### Community 97 - "Domains Analytics"
Cohesion: 0.23
Nodes (10): Band, jeffreysBand(), Bottleneck, mean(), PassOutcome, percentile(), projectPhasePass(), PropProjectionResult (+2 more)

### Community 98 - "Domains Analytics"
Cohesion: 0.21
Nodes (9): CacheDb, CacheDelegate, CacheRow, getCachedStats(), invalidateCache(), isCacheEnabled(), setCachedStats(), CacheRow (+1 more)

### Community 99 - "Server Services"
Cohesion: 0.25
Nodes (11): Insight, ensureReviewAnalysis(), persistMonthlyAnalysis(), persistWeeklyAnalysis(), loadWeeklyReport(), AnyReport, buildAnalysisPrompt(), Candidate (+3 more)

### Community 100 - "Domains Behavior"
Cohesion: 0.23
Nodes (12): canCommit(), CommitmentSpec, CommitmentStatus, Comparator, deriveCommitmentSpec(), evaluateResult(), INSIGHT_SPECS, partialBand() (+4 more)

### Community 101 - "Server Trpc"
Cohesion: 0.14
Nodes (9): ACCOUNT_STATUSES, ACCOUNT_TYPES, AccountInput, accountsRouter, PHASES, RawAccount, withdrawalsRouter, WithdrawalStatus (+1 more)

### Community 102 - "Docs Superpowers Specs"
Cohesion: 0.22
Nodes (13): AppError centralized error codes, emitNotification (event-driven emission), Epic 1 — Notifications system + message catalog, Central message catalog (lib/messages), Notification + NotificationPreference model, Action handlers (NOTIFY/ADD_TAG/BLOCK…), Automation model (WHEN/IF/THEN), Epic 3 — Rules/Automations engine (+5 more)

### Community 103 - "Docs V3 V32"
Cohesion: 0.18
Nodes (13): Anti-Poisoning Boundary (LLM proposes, data confirms), CoachMemory, Context Assembler with token budget (minimization), ADR-003 Memory Privacy and Anti-Corruption Boundary, coach-memory (isInjectable/proposeMemory/assembleContextBlock), Sprint 6 Test Report (coach memory), assembleCoachContext (assembles 4 layers with budget), Episodic Memory (E13 MemoryEpisode, pgvector + salience) (+5 more)

### Community 104 - "App Perfil"
Cohesion: 0.17
Nodes (11): AiModelsCard(), ALL_TOOL_MODELS, COST_OPTIONS, FEATURE_LABEL, inputStyle, looksToolIncapable(), Provider, PROVIDER_LABEL (+3 more)

### Community 105 - "App Reviews"
Cohesion: 0.19
Nodes (11): Bead, BEADS, buildChart(), fmtWeek(), HOVER, money(), Overview, STAT (+3 more)

### Community 106 - "Components Risk"
Cohesion: 0.22
Nodes (10): AccountRiskPanel(), asPct(), BOTTLENECK, pct(), RiskBudgetMeter(), KIND_ICON, severityColor(), TodayFeed() (+2 more)

### Community 107 - "Domains Rules"
Cohesion: 0.17
Nodes (10): ACTION_LABEL, ActionList(), ALL, TAG_ACTIONS, ACTION_TYPES, ActionDeps, ActionResult, Handler (+2 more)

### Community 108 - "Components Trades"
Cohesion: 0.19
Nodes (12): AccountRules, ADDABLE_TYPES, AddableType, CONTRACTS_TYPES, EVENT_COLORS, EVENT_DESCRIPTIONS, EVENT_LABELS, EventType (+4 more)

### Community 109 - "Domains Analytics"
Cohesion: 0.28
Nodes (11): analyticRiskOfRuin(), AnalyticRuinInput, mean(), monteCarloRiskOfRuin(), MonteCarloRuinInput, mulberry32(), riskOfRuin(), RiskOfRuinInput (+3 more)

### Community 110 - "Domains Cognitive"
Cohesion: 0.32
Nodes (10): BASE, decayedSalience(), initialSalience(), MemoryEventType, recallScore(), EpisodeRow, rankBySalience(), RecalledEpisode (+2 more)

### Community 111 - "Domains Profile"
Cohesion: 0.29
Nodes (8): invalidateAnalyticsCacheIfNeeded(), isValidIanaTimezone(), normalizeProfileInput(), PROFILE_PUBLIC_FIELDS, UpdateProfileInput, validateProfileUpdate(), createAdminClient(), profileRouter

### Community 112 - "Lib Theme"
Cohesion: 0.24
Nodes (11): PREDEFINED_IDS, PredefinedPalette, isValidSelection(), num(), parsePaletteConfig(), parsePaletteConfigJson(), PaletteConfig, configInput (+3 more)

### Community 113 - "Server Services"
Cohesion: 0.36
Nodes (12): analysisHtml(), C, CALLOUT, calloutHtml(), card(), equitySvg(), esc(), kpiCell() (+4 more)

### Community 114 - "Components Ui"
Cohesion: 0.27
Nodes (8): Stat(), ErrorCardsPanel(), fmt(), KpiCard(), KpiCardProps, KpiStripItem, askCoach(), KpiCard

### Community 115 - "App Api"
Cohesion: 0.29
Nodes (10): extractTradeId(), POST(), secretsMatch(), EmbedOptions, embedText(), resolveEmbeddingCall(), prisma, recordEpisode() (+2 more)

### Community 116 - "Server Services"
Cohesion: 0.32
Nodes (9): GET(), ReviewPeriod, buildHtml(), MONTHS, renderReviewPdf(), loadInsightsForWindow(), loadReviewAnalytics(), loadReviewInsights() (+1 more)

### Community 117 - "Components Tags"
Cohesion: 0.32
Nodes (8): SelectableTagChip(), SIZE, TagChip(), TagChipView(), DEFAULT, resolveTagMeta(), TagMeta, useTagCatalog()

### Community 118 - "Components Theme"
Cohesion: 0.23
Nodes (9): CYCLE, getSystemTheme(), ResolvedTheme, resolveTheme(), ThemeContext, ThemeContextValue, ThemeMode, ThemeProvider() (+1 more)

### Community 119 - "Lib Ai"
Cohesion: 0.41
Nodes (9): buildContext(), streamAnalyticsInsights(), windowFor(), streamChat(), completeText(), streamPsychologyInsights(), windowFor(), resolveAiCall() (+1 more)

### Community 120 - "Public Manifest"
Cohesion: 0.17
Nodes (11): background_color, categories, description, display, icons, name, orientation, short_name (+3 more)

### Community 121 - "Docs Superpowers Plans"
Cohesion: 0.22
Nodes (11): Broken improvement loop (commitments not verified), Handoff — Reviews rich reports + IA + email + cron + PDF, Review AI analysis (generateAnalysis, persisted), Server-side PDF report via headless Chromium, Reviews digest cron (hourly, local-time gated), Plan: Reviews redesign (4 phases), PDF engine swap playwright-core → puppeteer-core, Plan: Reviews weekly redesign (Hero + Timeline) (+3 more)

### Community 122 - "Docs V3 Decisions"
Cohesion: 0.18
Nodes (11): classifyMode: enforce iff BLOCK action (D-S1-3), Gated templates over false enforcement (D-S1-5), buildNoMappingReport (false-protection report), Rule model extended, not new model (D-S1-1), RuleModeBadge (enforce/warn badge), evaluateChecklist Off-plan tag (not hard block) (D-S2-6), Only propose rules for pre-trade enforceable metrics (D5.2), Accepting intervention creates protective enforce rule (D7.4) (+3 more)

### Community 123 - "App Aprendizaje"
Cohesion: 0.35
Nodes (9): ResourceFromDB, ReviewFromDB, RevisarRecursoModal(), calcPreviewNextReview(), emptyRevisarState(), fmtRelativeTime(), MASTERY_LABELS, RevisarState (+1 more)

### Community 124 - "Lib Storage"
Cohesion: 0.33
Nodes (7): LoginPage(), PerfilPage(), useLogout(), clearSessionStorageKeys(), SESSION_SCOPED_STORAGE_KEYS, STORAGE_KEYS, createClient()

### Community 125 - "App Reviews"
Cohesion: 0.20
Nodes (8): Goal, GOAL_STATUS, MonthlyLetter(), NEXT_STATUS, ReportData, SENTIMENT, TONE, makeMoney()

### Community 126 - "Domains Cognitive"
Cohesion: 0.27
Nodes (7): DetectedPattern, detectPatterns(), EpisodeForPattern, PATTERN_TEXT, PatternStatus, recomputeMemoryPatterns(), recomputeMemoryPatternsForAll()

### Community 127 - "Package Scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, e2e, e2e:ui, email, gen:theme, lint (+3 more)

### Community 128 - "Docs Archive Ai"
Cohesion: 0.29
Nodes (10): AI Architecture — Trading Journal v2, AiUsageLog per-user token/cost tracking, AES-256-GCM API key encryption, Multi-provider AI abstraction (OpenRouter → Anthropic → OpenAI), Rule-based behavioral pattern detector, UserAiConfig per-user encrypted key model, Target Architecture — 6-month vision, Domain service layer extraction (thin routers) (+2 more)

### Community 129 - "Docs Superpowers Specs"
Cohesion: 0.29
Nodes (10): Materialized learning streak (ADR-004), Plan: IA global + Aprendizaje/Reviews redesign, Design: IA global context + Aprendizaje & Reviews redesign, AI Coach global read-only context (buildTraderContext), app-knowledge.ts curated app knowledge block, SRS mastery model (level 0–5, Dominado = 5), Design: Aprendizaje SP1 — Study sessions + calendar + redesign, learningResources.agenda read-model (reviews + sessions) (+2 more)

### Community 130 - "Docs Superpowers Plans"
Cohesion: 0.20
Nodes (10): Prop-firm account model (phases, drawdown limits), error-formatter masks technical error as generic message, Rule vs Automation duality confusion (C6), Plan: Epic 1 · Notifications system, Message catalog + AppError (resolveMessage, toUserMessage), Notification + NotificationPreference system (dedupe, quiet-hours, P0 bypass), Plan: Epic 3 · Rules Engine (Automation), Automation rules engine (conditions, actions, pre/post trade block) (+2 more)

### Community 131 - "Docs V3 Behavior"
Cohesion: 0.24
Nodes (10): D17 — Variable-ratio reinforcement + autonomy, D8 — evaluateCommitment verifier library, Commitment (state machine), evaluateCommitment service, Insight (persisted, C8), Reinforcement (positive/corrective), Rule (unified enforce/warn, C6), Value chain: Insight→Commitment→Rule→Verification→Reinforcement (+2 more)

### Community 132 - "App Perfil"
Cohesion: 0.27
Nodes (9): ADV_ROLES, iconBtn, labelStyle, PaletteStudio(), NOTE: applying the theme on mount / mode-change is intentionally NOT done here., Swatch(), tileBtn(), useTheme() (+1 more)

### Community 133 - "Components Playbook"
Cohesion: 0.31
Nodes (8): EdgeEvolutionChart(), fmt(), Windows, DECAY_META, Drift, driftValue(), fmt(), SetupIntelligencePanel()

### Community 134 - "Domains Analytics"
Cohesion: 0.49
Nodes (8): calmarRatio(), computeRiskRatios(), Kelly, kellyCriterion(), kellyFromR, mean(), rollingRiskRatios(), sortinoRatio()

### Community 135 - "Domains Analytics"
Cohesion: 0.27
Nodes (7): detectSetupDrift(), DriftDimension, DriftDimensionKey, DriftInput, DriftTrade, mean(), SetupDefinition

### Community 136 - "Server Services"
Cohesion: 0.36
Nodes (7): resolveTheme(), getPredefined(), PREDEFINED_PALETTES, accentHex(), hx(), resolveEmailThemeFor(), ThemePrefs

### Community 137 - "Server Services"
Cohesion: 0.33
Nodes (7): ensureTagRows(), ensureTagsSeeded(), SYSTEM_APPEARANCE, SystemTagDef, systemTagDefs(), QUALITY_TAGS, VIOLATION_TAGS

### Community 138 - "Docs V3 Test"
Cohesion: 0.25
Nodes (9): Bayesian shrinkage / hierarchical priors, Honest causality (association with confounds), No point without band (credible intervals), ADR-002 Statistical Strategy, bayes module (betaBinomialEstimate, shrinkage), Sprint 3 Test Report (institutional metrics), prop-projection, risk-of-ruin (Monte Carlo + analytic) (+1 more)

### Community 139 - "Docs V3 Changelog"
Cohesion: 0.22
Nodes (9): D3 — ADR-002 Bayesian/Hierarchical Statistics, D5 — Insight with confidence/n from day 1, Changelog Sprint 10 (Playbook intelligence), Changelog Sprint 13 (HOY feed & notifications), Changelog Sprint 3 (Institutional metrics, C4), Bayesian estimator with shrinkage (bayes.ts), Changelog Sprint 8 (Psychology v3), Changelog Sprint 9 (Risk & Prop) (+1 more)

### Community 140 - "App Layout"
Cohesion: 0.28
Nodes (5): metadata, viewport, AppShell(), ServiceWorkerRegister(), TRPCProvider()

### Community 141 - "Domains Analytics"
Cohesion: 0.31
Nodes (7): clamp01(), computeRiskBudget(), DailyWindow, DailyWindowInput, resolveDailyWindow(), RiskBudgetInput, RiskOverview

### Community 142 - "Domains Cognitive"
Cohesion: 0.36
Nodes (6): buildCognitiveDigest(), DigestInput, DigestResult, isoWeekKey(), sendCognitiveDigest(), getImprovementSeries()

### Community 143 - "Domains Trading"
Cohesion: 0.22
Nodes (7): EMOTION_VALUES, REGIME_VALUES, SESSION_VALUES, tradeEditSchema, TradeEditValues, tradeFormSchema, TradeFormValues

### Community 144 - "Domains Trading"
Cohesion: 0.36
Nodes (7): checkDailyLossLimit(), checkLossLimit(), checkSymbolAllowlist(), checkTradeCountLimit(), LOSS_LIMIT_TYPE, LossLimitPeriod, PropFirmViolation

### Community 145 - "Package Engines"
Cohesion: 0.22
Nodes (8): engines, node, name, packageManager, pnpm, onlyBuiltDependencies, private, version

### Community 146 - "Docs Superpowers Specs"
Cohesion: 0.25
Nodes (8): Four new read-only coach learning tools, Hoy heuristic suggestion slot (no LLM on load), learning_resources.notes_embedding semantic search, Aprendizaje SP2 — AI learning accompaniment, Aprendizaje SP3 — Guided spotlight tour, SpotlightTour component, dashboardStats live-refresh invalidation fix, Cuentas tutorial + Aprendizaje Progreso merge

### Community 147 - "Docs V3 Behavior"
Cohesion: 0.29
Nodes (8): D6 — Domain Event Bus as S0 deliverable, Behavior Engine v3 (design doc 6/8), Domain event bus (behavior engine), Behavior engine design invariants, Changelog Sprint 0 (Foundations), DomainEvent outbox (E5), Decisions Sprint 0 (implementation choices), D-S0-2 Outbox dispatcher FOR UPDATE SKIP LOCKED

### Community 148 - "Components Ui"
Cohesion: 0.36
Nodes (5): AiInsightsPanel(), CAT_ICON, InsightCards(), sevStyle(), IntelligencePanel()

### Community 149 - "App Dashboard"
Cohesion: 0.36
Nodes (6): checklistColor(), getWeekKey(), HEALTH_CONFIG, LifecycleSuggestions(), sessionCellColor(), TabPlaybook()

### Community 150 - "Domains Trading"
Cohesion: 0.39
Nodes (4): NoteTagSuggestions(), RULES, suggestTagsFromNote(), TagRule

### Community 151 - "Domains Analytics"
Cohesion: 0.36
Nodes (5): analyzeMaeMfe(), EMPTY, MaeMfeResult, MaeMfeTrade, mean()

### Community 152 - "Domains Trading"
Cohesion: 0.36
Nodes (6): ChecklistEvaluation, ChecklistState, evaluateChecklist(), isRegime(), Regime, REGIME_VALUES

### Community 153 - "Domains Trading"
Cohesion: 0.43
Nodes (6): deriveRiskAmount(), deriveRiskPct(), deriveSession(), parseHour(), RiskInput, SessionLabel

### Community 154 - "Lib Ai"
Cohesion: 0.36
Nodes (4): detectProvider(), getCoachModel(), getWeeklySummaryModel(), resolveModel()

### Community 155 - "Docs Auditoria Producto"
Cohesion: 0.33
Nodes (7): AI Coach streaming chat, computeMaxDrawdown (peak-to-trough), Server-aggregated analytics engine (rolling metrics, cache), Auditoría de Producto — Trading Journal v2, CoachMemory (commitments + fulfillment) proposal, AI Coach is reactive, no memory, no initiative, Missing longitudinal analysis / rolling windows

### Community 156 - "Docs V3 Adr"
Cohesion: 0.29
Nodes (7): Anonymizable design of Intervention/Commitment (S4), ADR-004 Cross-User Data Reservation (BIZ-1), users.data_sharing_consent opt-in flag, Privacy-preserving population model (moat), commitment-machine (deriveCommitmentSpec/evaluateResult), Sprint 4 Test Report (behavior engine), Sprint 5 Test Report (behavior rules / insight-to-rule)

### Community 157 - "Docs V3 Recap"
Cohesion: 0.29
Nodes (7): S14 open items: E19 daily snapshot job for improvement curve, Pending: schedule cognitive-digest cron (C4 ops), Weekly cognitive digest (cognitive-digest.ts, C4), ImprovementScore historization E19 (improvement_scores), Commitment / CommitmentCheck / Reinforcement (S4), S14 ImprovementScore (North Star index), S14 test report (improvement-score, index 65/100 visual)

### Community 158 - "Docs V3 Open"
Cohesion: 0.29
Nodes (7): S4 open items: linkRule/suggestions deferred to S5, S7 open items: chat write-tools deferred (S7b), Coach write-tools (propose_rule / propose_commitment, D1), Gates G1 / G2 / BIZ-1, linkRule + RuleSuggestion (S5), S1 Rule unification (enforce/warn, C6), S1 test report (32/32 rule-engine no-regression)

### Community 159 - "Docs V3 Recap"
Cohesion: 0.33
Nodes (7): Follow-up: episodic recall by query (recallEpisodes), Anti-poisoning boundary (D9/P6: LLM proposes, user confirms), 4-layer hierarchical memory (E13-E16), Episodic memory E13 (memory_episodes, pgvector), Identity memory E15 (memory_identity), Semantic memory E14 (memory_patterns, N>=3), Visible 4-layer memory (CoachMemoryLayers, ADR-003 §3)

### Community 160 - "Domains Analytics"
Cohesion: 0.43
Nodes (5): analyzeBenchmark(), BenchmarkResult, BenchmarkSetupRow, weightedComparison(), rows

### Community 161 - "Domains Analytics"
Cohesion: 0.43
Nodes (5): compareVariants(), mean(), side(), VariantCohort, VariantSide

### Community 162 - "Tests Services"
Cohesion: 0.38
Nodes (3): detectDecayedResources(), ResourceForDecay, today

### Community 163 - "Scripts Backfill"
Cohesion: 0.33
Nodes (5): apiKey, c, decryptApiKey(), EMBED_MODEL, encKey()

### Community 164 - "Scripts Backfill"
Cohesion: 0.33
Nodes (5): apiKey, c, decryptApiKey(), EMBED_MODEL, encKey()

### Community 165 - "Server Trpc"
Cohesion: 0.29
Nodes (6): COLOR_SCHEMES, DEFAULT_GRAINS, preferencesRouter, TABLE_DENSITIES, THEMES, UpdatePreferencesInput

### Community 166 - "Docs Archive Database"
Cohesion: 0.40
Nodes (6): Connectivity test endpoint (/api/ai-test), Database Migrations — Policy & Workflow, Supabase CLI as single source of migration truth, OpenRouter Root Cause Report, user_ai_configs table never migrated to production (42P01), Unapplied migration breaks /reviews with 500 (probable cause)

### Community 167 - "Docs Archive Formula"
Cohesion: 0.53
Nodes (6): Formula Engine — Trading Journal v2, Formula centralization (src/lib/formulas barrel), Discipline Score (execution 50 + learning 30 + adherence 20), R-Multiple calculation, Sharpe Ratio (Bessel-corrected sample std dev), Win Rate formula (pnl>0 vs rMultiple>0 inconsistency)

### Community 168 - "Docs Superpowers Specs"
Cohesion: 0.40
Nodes (6): verdict.ts (grade + verdict + chips), Reviews Monthly Redesign — Carta del Gestor, MonthlyGoal recurring goals model, pillars.ts (Rendimiento/Disciplina/Psicología), loadReviewsOverview + trajectory panel, Reviews Unified Index Redesign

### Community 169 - "Docs V3 Adr"
Cohesion: 0.33
Nodes (6): domain_events outbox table, ADR-001 Event Runtime and Delivery, Synchronous fast-path for in-trade intervention, Transactional Outbox + Dispatcher, intervention (detectInterventions/decideIntervention), Sprint 7 Test Report (intervention engine)

### Community 170 - "Docs V3 Architecture"
Cohesion: 0.47
Nodes (6): Architecture v3.1 Delta, Anti-poisoning boundary (LLM proposes, data confirms), D11 — 4-layer hierarchical memory (anti-poisoning), D2 — Separate Cognitive Engine from Next.js, D4 — ADR-003 LLM Privacy Contract, Memory simplification (single CoachMemory vs 4 layers)

### Community 171 - "Docs V3 Sprint"
Cohesion: 0.33
Nodes (6): S2 open items: UI wiring D10 incentive/nudge, Statistical rigor fragile at retail n (RI-3, R6), Bayesian shrinkage estimator (bayes.ts, ADR-002), Insight persisted entity (C8), S3 Institutional metrics (C4), S2 Trade capture v3 (MAE/MFE/regime, C7)

### Community 172 - "Docs V3 Product"
Cohesion: 0.33
Nodes (6): Behavior Engine (the loop), Critical findings C1-C8 (audit), v3 Thesis: verified behavior change, Binding product audit (source of truth), 8 Master Design Documents, Hidden event/push infra gap (RI-1, C1 risk)

### Community 173 - "Components Improvement"
Cohesion: 0.47
Nodes (5): fmt(), Improvement, ImprovementPanel(), REGIME_LABEL, scoreColor()

### Community 174 - "Domains Analytics"
Cohesion: 0.40
Nodes (4): buildPnlHeatmap(), DailyPnl, HeatmapDay, HeatmapResult

### Community 175 - "Lib Load"
Cohesion: 0.47
Nodes (4): getLoadState(), getObjectLoadState(), LoadState, QueryLike

### Community 176 - "Server Trpc"
Cohesion: 0.33
Nodes (4): sendEmail(), CATEGORIES, notificationsRouter, PRIORITIES

### Community 177 - "Docs V3 Changelog"
Cohesion: 0.40
Nodes (5): D12 — Intervention scoring + fatigue engine, Changelog Sprint 12 (Design System v3 + 5 surfaces), Changelog Sprint 6 (Coach memory + threads, C2), Changelog Sprint 7 (Proactivity + intervention, C1), Deterministic intervention engine (engine.ts)

### Community 178 - "Docs V3 Product"
Cohesion: 0.50
Nodes (5): S6 open items: LLM candidate auto-extraction deferred to S7, AI Coach v3 subsystem, Determinism-first (LLM narrates, not calculates), Coach memory + threads (S6, C2), Deterministic intervention engine (S7, C1)

### Community 179 - "Docs V3 Rehydration"
Cohesion: 0.40
Nodes (5): ADR-001 event runtime/delivery (blocking decision), ADR/governance debt (root decisions in prose), Cron 401 fix (app_url apex->www, pg_net drops Authorization), v3 crons (pg_cron -> pg_net -> /api/cron/*), Domain event bus + outbox (domain_events)

### Community 180 - "Docs V3 Sprint"
Cohesion: 0.50
Nodes (5): ARCHITECTURE_FREEZE (canonical source of truth), rollingWindow primitive (C3), S0 Technical Foundations, Sprint Plan S0-S14, S0 test report (TDD 817 vitest, unit+types only)

### Community 181 - "Domains Analytics"
Cohesion: 0.50
Nodes (3): BudgetGuardInput, BudgetGuardResult, evaluateBudgetGuard()

### Community 182 - "Domains Rules"
Cohesion: 0.50
Nodes (4): buildContext(), ContextAccount, ContextTrade, mondayOf()

### Community 184 - "Tests Routers"
Cohesion: 0.50
Nodes (4): BASE_ACCOUNT, BASE_CREATE_INPUT, buildCreateCaller(), makeTrade()

### Community 185 - "Tests Routers"
Cohesion: 0.40
Nodes (3): BASE_USER, mockDeleteUser, mockSupabase

### Community 186 - "Supabase Functions Weekly"
Cohesion: 0.50
Nodes (3): sendEmail(), sendPropFirmHealthAlert(), supabase

### Community 187 - "Docs Superpowers Specs"
Cohesion: 0.67
Nodes (4): account-reality.ts classifier, Isolate practice accounts (demo/backtest), Reality axis (financial=real, behavioral=all), Practice/real separation invariant

### Community 188 - "Docs Superpowers Specs"
Cohesion: 0.67
Nodes (4): coach:open window event wiring, Nav redesign — floating sidebar + bottom bar, Desktop sidebar consolidation (no floating FABs), Mobile center FAB → create speed-dial

### Community 189 - "Docs V3 Architecture"
Cohesion: 0.50
Nodes (4): D1 — ADR-001 Event Runtime & Delivery, Gate G0 — mandatory before Sprint 0, Phase A0 — Pre-S0 Decisions, ADR-000..003 (A0 decisions)

### Community 190 - "Docs V3 Sprint"
Cohesion: 0.67
Nodes (4): S11 Learning transfer + instrument/tag edge, S10 Playbook intelligence (edge decay/drift, Welch), S10 test report (Welch t-test, drift/decay smoke), S11 test report (gold/poison tags, error cards smoke)

### Community 192 - "Vercel"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

### Community 193 - "Docs Superpowers Specs"
Cohesion: 0.67
Nodes (3): ConditionNode evaluate (pure recursive), Insight persistence (C8), Behavior Engine (Insight→Commitment→Rule loop)

### Community 194 - "Docs Superpowers Specs"
Cohesion: 1.00
Nodes (3): CustomPalette model + library, derivePalette engine (OKLCH TokenSet), Theme palettes system

### Community 195 - "Docs V3 Adr"
Cohesion: 0.67
Nodes (3): Absorb, don't delete, 5 Cognitive Surfaces (radical architecture), ADR-000 Root Decisions of Trading Journal v3.1

### Community 196 - "Docs V3 Decisions"
Cohesion: 0.67
Nodes (3): computeTransfer = association, never causation (D17) (D11.2), generateErrorCards prioritized by real R cost (D11.4), E9 Learning transfer (MEJORAR)

### Community 197 - "Docs V3 Decisions"
Cohesion: 0.67
Nodes (3): Adaptive priority with floor for criticals (D13.1), Age as proxy for ignored (v1, half-life 7d) (D13.2), S13 open items (per-item ignored telemetry, absorb Notifs)

### Community 198 - "Docs V3 Decisions"
Cohesion: 0.67
Nodes (3): HOY feed computed on the fly, no new model (D13.3), S9 is signal/warn; hard block deferred to S13 (D9.3), E11 HOY surface & smart notifications

### Community 199 - "Agents Nextjs"
Cohesion: 0.67
Nodes (3): Next.js Agent Rules (breaking-changes warning), src CLAUDE.md (includes AGENTS.md), src README (Next.js create-next-app)

## Knowledge Gaps
- **1028 isolated node(s):** `h`, `OPTS`, `VALID_PERIODS`, `Period`, `TRADES` (+1023 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Trades Page & Session Log` to `Notifications Center (UI)`, `Accounts & Export Pages`, `Mastery / SRS Logic`, `UI Primitives & Data Table`, `Learning: Today & Focus Session`, `Account Modals (Create/History)`, `Dashboard Widgets`, `Playbook & Notifications Pages`, `Report Charts & PDF Export`, `Learning Modals & Tags Page`, `Withdrawals & Balance Sync`, `App Dashboard`, `Register Trade Modal`, `Components Layout`, `App Reviews`, `Components Trades`, `Components Trades`, `Components Ui`, `App Aprendizaje`, `Components Ai`, `App Mercados`, `App Reglas`, `Components Trades`, `Components Ui`, `App Aprendizaje`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Package Dependencies` to `Package Engines`, `Server Services`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `@trpc/client` connect `Package Dependencies` to `Accounts & Export Pages`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `h`, `OPTS`, `VALID_PERIODS` to the rest of the system?**
  _1068 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Notifications Center (UI)` be split into smaller, more focused modules?**
  _Cohesion score 0.0673903211216644 - nodes in this community are weakly interconnected._
- **Should `Accounts & Export Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.0703962703962704 - nodes in this community are weakly interconnected._
- **Should `Account Card & Risk Meters` be split into smaller, more focused modules?**
  _Cohesion score 0.07272727272727272 - nodes in this community are weakly interconnected._