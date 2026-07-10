# Graph Report - .  (2026-07-10)

## Corpus Check
- Large corpus: 535 files · ~288,406 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 2957 nodes · 6770 edges · 196 communities (163 shown, 33 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 82 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- page.tsx
- revisar-recurso-modal.tsx
- trades.ts
- root.ts
- review-report-shell.tsx
- client.ts
- insights-engine.ts
- Sidebar.tsx
- review-summary.tsx
- page.tsx
- Behavior Engine (bounded context: loop de mejora)
- index.ts
- dependencies
- prisma.ts
- notify.tsx
- coach-memory-service.ts
- learning-resources.ts
- index.ts
- cn
- trades-table.tsx
- page.tsx
- ai-context.ts
- send-review.ts
- tab-portfolio.tsx
- page.tsx
- monthly-reviews.ts
- review-card.tsx
- improvement-service.ts
- report-data.ts
- page.tsx
- utils.ts
- page.tsx
- analytics-bundle.ts
- weekly-reviews.ts
- learning-insights-service.ts
- feature-models.ts
- page.tsx
- condition-group.tsx
- playbook-service.ts
- send-learning-digest.ts
- risk-of-ruin.ts
- Hardening 2026-06-10 (P&L, enforcement, CI/migraciones, rendimiento)
- engine.ts
- page.tsx
- bayes.ts
- seed-psych-trades.mjs
- Tesis del producto: capa cognitiva que cambia el comportamiento del trader
- route.ts
- resolveAiCall
- simple-table.tsx
- institutional-summary.ts
- overview.ts
- event-bus.ts
- compilerOptions
- types.ts
- register-trade-modal.tsx
- edge-service.ts
- intervention-service.ts
- motion.ts
- ConditionNode
- markdown.tsx
- behavior.ts
- emit.ts
- devDependencies
- data-table.tsx
- automations.ts
- ai-config.ts
- ai-coach-drawer.tsx
- psychology-service.ts
- risk-service.ts
- today-service.ts
- commitment-service.ts
- gen-theme-css.mjs
- coach-service.ts
- page.tsx
- risk-engine.ts
- page.tsx
- rolling-window.ts
- apply.ts
- gen-icons.mjs
- trajectory-panel.tsx
- DrawdownModel
- risk-enforcement.ts
- route.ts
- ai-models-card.tsx
- position-log-modal.tsx
- welch.ts
- verifiers.ts
- pdf-report-html.ts
- theme-provider.tsx
- emotion-feedback.ts
- commitment-machine.ts
- memory-episode-service.ts
- engine.ts
- unification.ts
- resolve-provider.ts
- tab-playbook.tsx
- useLogout.ts
- feed.ts
- analytics-cache.ts
- profile.ts
- custom-palettes.ts
- scripts
- Trading Journal — capa cognitiva sobre el bróker
- setup-intelligence-panel.tsx
- tag-chip.tsx
- risk-ratios.ts
- accounts.ts
- createClient
- layout.tsx
- palette-studio.tsx
- pattern-detector.ts
- trade-form-schema.ts
- package.json
- calibration.ts
- risk-budget.ts
- leverage.ts
- discipline-service.ts
- prop-firm-guard.ts
- config.ts
- seed.ts
- goal-progress-widget.tsx
- account-risk-panel.tsx
- capture-rules.ts
- trade-derivation.ts
- backfill-embeddings.mjs
- backfill-resource-embeddings.mjs
- Auditoría de Producto — Trading Journal v2
- ai-insights-panel.tsx
- improvement-panel.tsx
- note-tag-suggestions.tsx
- mae-mfe.ts
- checkin.ts
- reinforcement.ts
- email-theme.ts
- ADR-002 — Estrategia estadística
- Auditoría Técnica Exhaustiva (37 hallazgos)
- benchmark.ts
- pnl-heatmap.ts
- load-state.ts
- index.ts
- CI job: checks (type check, tests, build)
- ADR-003 — Privacidad de la memoria y frontera anti-corrupción
- E13 — MemoryEpisode (episódica, append-only, embedding, saliencia)
- Seguridad / RLS / auth
- Superficies ANALIZAR/PROTEGER/MEJORAR (flag tj.v3Shell)
- onboarding-checklist.tsx
- segmented-tabs.tsx
- budget-guard.ts
- vercel.json
- Stack v3.2 (Next.js/tRPC/Prisma/Supabase/Vercel/pgvector)
- Next.js Agent Rules (breaking-changes warning)
- layout.tsx
- proxy.ts
- Módulo Trades (/trades)
- ADR-004 — Reserva de datos cross-user (BIZ-1)
- E14 — MemoryPattern
- E15 — MemoryIdentity
- E16 — MemoryImprovement
- E17 — CoachThread / CoachMessage
- E18 — SetupEdgeSnapshot
- E19 — ImprovementScore (snapshot)
- E20 — RiskBudget (derivado/persistido)
- E4 — LearningResource (+transferBaseline)
- D12 — router de modelos
- D13 — refuerzo de ratio variable + soporte de autonomía
- D14 — override duro de capital
- D2 — Cognitive Engine aislado (frontera irreversible; topología reversible)
- D7 — `Commitment` sólo se ofrece donde existe verificador
- D8 — la fusión Rule/Automation es semántica
- P9 — Cada migración es reversible hasta verificación
- Módulo Aprendizaje (/aprendizaje)
- Check-in pre-sesión (mood/energía/sueño → go/caution/no_go)
- Módulo Cuentas (/cuentas)
- Módulo Etiquetas (/etiquetas)
- IA Coach (drawer global)
- Módulo Mercados (/mercados)
- Módulo Perfil / Settings (/perfil)
- Módulo Retiros (/retiros)
- Módulo Reviews (/reviews)
- Apuesta POST-2: coach multiagente
- Apuesta POST-5: extracción a servicio
- TD-037: ~22 efectos sync-on-open

## God Nodes (most connected - your core abstractions)
1. `cn()` - 153 edges
2. `trpc` - 68 edges
3. `formatErrorForUser()` - 62 edges
4. `isWin()` - 39 edges
5. `protectedProcedure` - 34 edges
6. `calcWinRate()` - 33 edges
7. `toast` - 33 edges
8. `RouterOutputs` - 33 edges
9. `Button()` - 28 edges
10. `DialogContent()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Convención de proyecto: usar graphify (query/path/explain/update) antes de grep/browsing crudo` --rationale_for--> `docs/PROJECT_GUIDE.md — léeme primero: qué es, módulos, stack, mapa de código`  [INFERRED]
  CLAUDE.md → README.md
- `handler()` --indirect_call--> `createTRPCContext()`  [INFERRED]
  src/app/api/trpc/[trpc]/route.ts → src/server/trpc/init.ts
- `handler()` --indirect_call--> `AppRouter`  [INFERRED]
  src/app/api/trpc/[trpc]/route.ts → src/server/trpc/root.ts
- `StatusSelect()` --indirect_call--> `handler()`  [INFERRED]
  src/app/retiros/page.tsx → src/app/api/trpc/[trpc]/route.ts
- `AiCoachDrawer()` --indirect_call--> `handler()`  [INFERRED]
  src/components/ai-coach/ai-coach-drawer.tsx → src/app/api/trpc/[trpc]/route.ts

## Import Cycles
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/accounts.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/withdrawals.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 4-file cycle: `src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/report-data.ts`
- 4-file cycle: `src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/report-data.ts`
- 4-file cycle: `src/domains/trading/services/risk-enforcement.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/accounts.ts -> src/domains/trading/services/risk-enforcement.ts`
- 4-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 4-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/insights-engine.ts`
- 4-file cycle: `src/domains/analytics/services/psychology-insights.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/psychology-insights.ts`
- 4-file cycle: `src/server/services/tags/seed.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/tags.ts -> src/server/services/tags/seed.ts`
- 4-file cycle: `src/domains/trading/services/risk-enforcement.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/domains/trading/services/risk-enforcement.ts`
- 4-file cycle: `src/server/services/tags/seed.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/server/services/tags/seed.ts`
- 4-file cycle: `src/domains/analytics/services/discipline-service.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/domains/analytics/services/discipline-service.ts`
- 5-file cycle: `src/server/services/email/send-review.ts -> src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/email/send-review.ts`
- 5-file cycle: `src/server/services/email/send-review.ts -> src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/email/send-review.ts`
- 5-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/psychology-insights.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/review-ai.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/insights-engine.ts`

## Hyperedges (group relationships)
- **CI/CD antierrores pipeline** — _github_workflows_ci_checks, _github_workflows_ci_e2e, _github_workflows_ci_migrate_validate, _github_workflows_ci_migrate_deploy [EXTRACTED 1.00]
- **Tres documentos vivos referenciados desde README** — readme_project_guide, readme_architecture, readme_status [EXTRACTED 1.00]
- **Dos anexos de documentación referenciados desde README** — readme_changelog, readme_auditoria [EXTRACTED 1.00]
- **Mecanismo de outbox: D1 entrega EV1/EV2 vía DomainEvent (E5)** — docs_architecture_d1, docs_architecture_e5, docs_architecture_ev1, docs_architecture_ev2 [EXTRACTED 1.00]
- **Loop de comportamiento: D4 orquesta Commitment/CommitmentCheck/Reinforcement** — docs_architecture_d4, docs_architecture_e7, docs_architecture_e8, docs_architecture_e9 [EXTRACTED 1.00]
- **E2E-driven hardening flow (onboarding + trade lifecycle + enforcement)** — docs_changelog_hardening_2026_06_10, docs_changelog_onboarding, docs_changelog_pnl_engine, docs_changelog_propfirm_enforcement [INFERRED 0.75]
- **AI-config delivery stack (resolver + migration + docs)** — docs_changelog_ai_config_2026_06_05, docs_changelog_ai_resolve_provider, docs_changelog_ci_migrations, docs_changelog_docs_consolidation [INFERRED 0.65]
- **Loop de comportamiento: behavior engine + reglas unificadas + intervenciones** — docs_project_guide_behavior_engine, docs_project_guide_reglas_unificadas, docs_project_guide_intervenciones [EXTRACTED 1.00]
- **Deuda técnica de infraestructura tRPC/Supabase (TD-018, TD-019, stack)** — docs_status_td_018, docs_status_td_019, docs_project_guide_stack [INFERRED 0.75]

## Communities (196 total, 33 thin omitted)

### Community 0 - "page.tsx"
Cohesion: 0.06
Nodes (56): PlanSessionModal(), todayISO(), AddEditResourceModal(), ResourceFromDB, ResourceFromDB, ResourceFromDB, ALL_TYPES, emptyForm() (+48 more)

### Community 1 - "revisar-recurso-modal.tsx"
Cohesion: 0.05
Nodes (54): fmt(), FocusSession(), ALL_TYPES, ProgresoSections(), ResourceFromDB, TYPE_COLORS, ResourceFromDB, ReviewFromDB (+46 more)

### Community 2 - "trades.ts"
Cohesion: 0.06
Nodes (55): AccountBalance, AccountExposure, AccountLimits, AccountStat, AccountWithLimits, buildAccountStats(), buildDiscipline(), buildEquityCurve() (+47 more)

### Community 3 - "root.ts"
Cohesion: 0.06
Nodes (42): Context, createTRPCContext(), protectedProcedure, t, AppRouter, RouterInputs, accountLogsRouter, analyticsRouter (+34 more)

### Community 4 - "review-report-shell.tsx"
Cohesion: 0.07
Nodes (45): AiAnalysisCard(), Period, EquityCurveChart(), PnlTrendChart(), TrendTooltip(), DownloadPdfButton(), LearningSummary(), Goal (+37 more)

### Community 5 - "client.ts"
Cohesion: 0.08
Nodes (35): LinkSetupModal(), SyncBalanceModalProps, syncSchema, SyncValues, PlaybookPage(), Period, Period, SendReviewEmailButton() (+27 more)

### Community 6 - "insights-engine.ts"
Cohesion: 0.07
Nodes (48): CAT_ICON, InsightCards(), sevStyle(), ComputedInsight, InsightStatus, PersistedInsightRef, reconcileInsights(), ReconcilePlan (+40 more)

### Community 7 - "Sidebar.tsx"
Cohesion: 0.08
Nodes (35): CATEGORIES, NotificacionesPage(), CreateAction, IconTab(), MobileBottomBar(), NavItem, useReducedMotion(), NotificationBell() (+27 more)

### Community 8 - "review-summary.tsx"
Cohesion: 0.10
Nodes (31): ReviewEmailModel, DigestModel, CtaButton(), Divider(), EmailFooter(), EmailLayout(), ProgressBlock(), reviewChipLabel() (+23 more)

### Community 9 - "page.tsx"
Cohesion: 0.08
Nodes (36): ACCOUNT_STATUS_META, AccountCard(), AccountExposure, AccountRisk, formatSyncAgo(), isPropFirmLike(), KpiBox(), RawAccount (+28 more)

### Community 10 - "Behavior Engine (bounded context: loop de mejora)"
Cohesion: 0.07
Nodes (44): ADR-000 — Decisiones de raíz de Trading Journal v3.1, ADR-001 (referenciado: resuelto por D1, outbox+dispatcher), Analytics (bounded context, determinista), Behavior Engine (bounded context: loop de mejora), Coach (subsistema: orquestador + agente(s) + tools), Cognitive Engine (bounded context: events, intervention, memory, coach), D1 — Outbox transaccional + dispatcher, dos caminos de entrega, D2 — Cognitive Engine aislado (frontera irreversible) (+36 more)

### Community 11 - "index.ts"
Cohesion: 0.08
Nodes (39): MetricRow(), MetricRowProps, SESSION_COLOR, SESSION_SHORT, TradeDetailPanel(), TradeDetailPanelProps, getResult(), RESULT_CFG (+31 more)

### Community 12 - "dependencies"
Cohesion: 0.05
Nodes (42): dependencies, @anthropic-ai/sdk, class-variance-authority, clsx, dotenv, framer-motion, @hookform/resolvers, katex (+34 more)

### Community 13 - "prisma.ts"
Cohesion: 0.10
Nodes (26): POST(), POST(), ADR-0001, POST(), AuthResult, checkCronAuth(), timingSafeMatch(), USER_SELECT (+18 more)

### Community 14 - "notify.tsx"
Cohesion: 0.12
Nodes (30): ToastCard(), ToastCardProps, TypeStyle, AppError, isAppError(), toUserMessage(), TRPC_TO_CODE, LABELS (+22 more)

### Community 15 - "coach-memory-service.ts"
Cohesion: 0.10
Nodes (31): assembleContextBlock(), AssembleInput, MemoryExtraction, MemoryKind, MemoryStatus, parseMemoryExtraction(), ProposedMemory, proposeMemory() (+23 more)

### Community 16 - "learning-resources.ts"
Cohesion: 0.09
Nodes (27): extractTradeId(), POST(), secretsMatch(), computeProgressPct(), computeResourceStatus(), applyStudyFinish(), CoachToolName, executeCoachTool() (+19 more)

### Community 17 - "index.ts"
Cohesion: 0.09
Nodes (30): calcNetPnl(), calcAvgR(), AiUsageLog, AnalyticsCache, AnalyticsInput, AnalyticsOutput, CalibrationPoint, ConfidenceOutcome (+22 more)

### Community 18 - "cn"
Cohesion: 0.10
Nodes (27): accountToForm(), EditarCuentaModal(), SyncBalanceModal(), SetupModal(), NuevoRetiroModal(), ImportCsvModal(), MarketItem, TradesPage() (+19 more)

### Community 19 - "trades-table.tsx"
Cohesion: 0.12
Nodes (24): RFC-4180, Checkbox(), getResult(), QUALITY_TAGS, qualityOf(), RESULT_LABELS, SESSION_CFG, shortAccount() (+16 more)

### Community 20 - "page.tsx"
Cohesion: 0.10
Nodes (26): ResourceFromDB, useResourceActions(), SetupImpactModal(), AprendizajePage(), ResourceFromDB, effectiveMasteryLevel(), isReviewDue(), MASTERY_STAGES (+18 more)

### Community 21 - "ai-context.ts"
Cohesion: 0.08
Nodes (29): buildTraderContext(), RawAccountRow, RawLearningRow, RawMarketRow, RawReviewRow, RawRuleRow, RawSessionRow, RawSetupRow (+21 more)

### Community 22 - "send-review.ts"
Cohesion: 0.12
Nodes (27): POST(), USER_SELECT, GET(), localHour(), EmailAttachment, emailFailureMessage(), EmailSender, sendEmail() (+19 more)

### Community 23 - "tab-portfolio.tsx"
Cohesion: 0.09
Nodes (25): Card(), CardProps, ChartTooltip(), TooltipPayload, PropFirmRules(), PropFirmStatus, fmtDate(), MONTHS_ES (+17 more)

### Community 24 - "page.tsx"
Cohesion: 0.09
Nodes (24): JumpItem, MonthJumpIndex(), Pattern, PatternCards(), TONE, money(), PeriodSummary(), Summary (+16 more)

### Community 25 - "monthly-reviews.ts"
Cohesion: 0.11
Nodes (24): finalizeMonthlyReview(), FinalizeResult, MONTHS_ES, evaluateGoal(), GoalContext, GoalProposal, GoalStatus, deriveLetterTitle() (+16 more)

### Community 26 - "review-card.tsx"
Cohesion: 0.11
Nodes (23): CardEquityChart(), DAYS, Campaign(), disciplineColor(), fmtMoney(), GRADE_TONE, pnlColor(), ReviewCard() (+15 more)

### Community 27 - "improvement-service.ts"
Cohesion: 0.11
Nodes (26): clamp01(), computeImprovementScore(), costOfIndiscipline(), DEFAULT_WEIGHTS, Driver, ImprovementInputs, ImprovementResult, ImprovementWeights (+18 more)

### Community 28 - "report-data.ts"
Cohesion: 0.13
Nodes (23): computeDisciplineScore(), buildMonthlyReport(), kpisOf(), MonthlyReport, ReportTrade, sessionsOf(), buildReviewEmailModel(), buildWeeklyReport() (+15 more)

### Community 29 - "page.tsx"
Cohesion: 0.08
Nodes (24): handler(), PromotePhaseModal(), RawAccount, CAT_COLOR, CAT_LABELS, CATS, FORM_INIT, MarketForm (+16 more)

### Community 30 - "utils.ts"
Cohesion: 0.13
Nodes (21): Stat(), DOW, HoyTab(), TOUR_STEPS, readRect(), Rect, SpotlightTour(), TourStep (+13 more)

### Community 31 - "page.tsx"
Cohesion: 0.15
Nodes (23): AccountsIntel(), amt(), AnalyticsPage(), Edges(), fmt(), GoalRow(), Goals(), Institutional (+15 more)

### Community 32 - "analytics-bundle.ts"
Cohesion: 0.13
Nodes (24): AccountIntel, AnalyticsBundle, buildAnalyticsBundle(), EmotionIntel, holdMinutes(), MarketIntel, round1(), round2() (+16 more)

### Community 33 - "weekly-reviews.ts"
Cohesion: 0.13
Nodes (20): MONTHS, ReviewKind, ReviewReportVM, ensureReviewAnalysis(), persistMonthlyAnalysis(), persistWeeklyAnalysis(), LearningSummary, loadLearningSummary() (+12 more)

### Community 34 - "learning-insights-service.ts"
Cohesion: 0.12
Nodes (21): ErrorCard, ErrorCardInput, ErrorTrade, generateErrorCards(), computeNextReview(), Grade, PerfSignal, SrsInput (+13 more)

### Community 35 - "feature-models.ts"
Cohesion: 0.13
Nodes (22): AI_FEATURES, AI_PROVIDERS_LIST, AiFeature, AiSettings, CHAT_LADDER, CostPriority, DEFAULT_AI_SETTINGS, EMBEDDING_LADDER (+14 more)

### Community 36 - "page.tsx"
Cohesion: 0.14
Nodes (18): Period, useDashboardStats(), DashboardPage(), Tab, TABS, VALID_PERIODS, TabDisciplina(), EMOTION_LABELS (+10 more)

### Community 37 - "condition-group.tsx"
Cohesion: 0.11
Nodes (20): CMP_LABEL, ConditionGroup(), Group, isGroup(), isLeaf(), isNot(), newLeaf(), NotNode (+12 more)

### Community 38 - "playbook-service.ts"
Cohesion: 0.14
Nodes (21): Window, detectSetupDrift(), DriftDimension, DriftDimensionKey, DriftInput, DriftResult, DriftTrade, mean() (+13 more)

### Community 39 - "send-learning-digest.ts"
Cohesion: 0.15
Nodes (19): POST(), detectDecayedResources(), ResourceForDecay, buildLearningDigest(), daysBetween(), DigestInput, DigestReview, formatDateLabel() (+11 more)

### Community 40 - "risk-of-ruin.ts"
Cohesion: 0.15
Nodes (20): Band, jeffreysBand(), Bottleneck, mean(), PassOutcome, percentile(), projectPhasePass(), PropProjectionResult (+12 more)

### Community 41 - "Hardening 2026-06-10 (P&L, enforcement, CI/migraciones, rendimiento)"
Cohesion: 0.10
Nodes (22): AI config, migraciones y consolidación documental 2026-06-05, Motor de resolución de IA (resolve-provider), CI / migraciones (Supabase CLI, GitHub Actions), dashboardStats (analítica server-side), Discipline scoring / centralización de disciplina, Consolidación documental, Formula Engine, Hardening 2026-06-10 (P&L, enforcement, CI/migraciones, rendimiento) (+14 more)

### Community 42 - "engine.ts"
Cohesion: 0.18
Nodes (20): CreatorModal(), Swatch(), accentContrastFor(), bestContrastOn(), clamp01(), configFromHex(), contrastRatio(), derivePalette() (+12 more)

### Community 43 - "page.tsx"
Cohesion: 0.10
Nodes (15): COLORS, DbSetup, Direction, DirectionChip(), FORM_INIT, HealthStatus, MARKET_FILTERS, MARKETS (+7 more)

### Community 44 - "bayes.ts"
Cohesion: 0.15
Nodes (19): betaBinomialEstimate(), betacf(), BetaPrior, betaQuantile(), cohensH(), DEFAULT_BETA_PRIOR, DEFAULT_NORMAL_PRIOR, erf() (+11 more)

### Community 45 - "seed-psych-trades.mjs"
Cohesion: 0.13
Nodes (21): ACCOUNTS, between(), buildTrade(), c, cols, DRY, EMO_LOSS, EMO_WIN (+13 more)

### Community 46 - "Tesis del producto: capa cognitiva que cambia el comportamiento del trader"
Cohesion: 0.12
Nodes (21): Behavior engine (insight→compromiso→regla→verificación→refuerzo), Digest cognitivo semanal (notificación opt-outable), Feed HOY (TodayFeed + RiskBudgetMeter), Índice de mejora (ImprovementScore), Intervenciones (InterventionOverlay, motor determinista), Memoria del coach (4 capas: episódica/semántica/identidad/mejora), Persona: Funded Trader, Persona: Prop Firm Candidate (+13 more)

### Community 47 - "route.ts"
Cohesion: 0.19
Nodes (18): dupKey(), POST(), storedKey(), toDirection(), DryRunResponse, CTRADER_COLS, detectFormat(), parseCtraderDate() (+10 more)

### Community 48 - "resolveAiCall"
Cohesion: 0.22
Nodes (16): PERIODS, POST(), buildContext(), streamAnalyticsInsights(), windowFor(), ChatMessage, streamChat(), StreamChatOptions (+8 more)

### Community 49 - "simple-table.tsx"
Cohesion: 0.19
Nodes (17): RetirosTable(), AppToaster(), ROW_PAD, SimpleColumn, SimpleRow(), SimpleTable(), ColumnMeta, loadJSON() (+9 more)

### Community 50 - "institutional-summary.ts"
Cohesion: 0.16
Nodes (17): EquityDrawdownChart(), fmt(), analyzeDrawdown(), daysBetween(), DrawdownPoint, DrawdownResult, EMPTY, EquityPoint (+9 more)

### Community 51 - "overview.ts"
Cohesion: 0.13
Nodes (20): InsightCategory, InsightSeverity, buildPeriodSummary(), CATEGORY_TAG, downsample(), loadPatterns(), loadReviewsOverview(), money() (+12 more)

### Community 52 - "event-bus.ts"
Cohesion: 0.12
Nodes (17): dispatchPending(), DispatchResult, DomainEventRecord, EventHandler, EventStatus, EventTransition, HandlerOutcome, handlers (+9 more)

### Community 53 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+12 more)

### Community 54 - "types.ts"
Cohesion: 0.13
Nodes (15): ACTION_LABEL, ActionList(), ALL, TAG_ACTIONS, ACTION_TYPES, ActionDeps, ActionResult, Handler (+7 more)

### Community 55 - "register-trade-modal.tsx"
Cohesion: 0.13
Nodes (19): AccountLike, computeAutoTag(), computeContracts(), EMOTION_OPTIONS, EmotionBefore, ERROR_FIELD_ORDER, INITIAL, isSelectableSetup() (+11 more)

### Community 56 - "edge-service.ts"
Cohesion: 0.16
Nodes (16): computeInstrumentEdges(), EdgeVerdict, InstrumentEdge, InstrumentEdgeResult, InstrumentTrade, mean(), computeTagEdges(), mean() (+8 more)

### Community 57 - "intervention-service.ts"
Cohesion: 0.15
Nodes (18): ActionKind, clamp01(), DayState, decideIntervention(), DecisionOpts, detectInterventions(), FatigueState, InterventionCandidate (+10 more)

### Community 58 - "motion.ts"
Cohesion: 0.15
Nodes (16): EditionHeader(), EditionHeaderData, money(), TONE, nodeColor(), ReviewFromDB, ReviewsTimeline(), TimelineChapter (+8 more)

### Community 59 - "ConditionNode"
Cohesion: 0.22
Nodes (16): RuleDraft, ProposedRule, PROTECTION_TEMPLATE_MAP, PROTECTION_TEMPLATES, ProtectionTemplate, AutomationTemplate, BASE_TEMPLATES, PROTECTION_AS_AUTOMATION (+8 more)

### Community 60 - "markdown.tsx"
Cohesion: 0.16
Nodes (17): Block, CALLOUT, CALLOUT_ALIASES, CalloutType, CODE_KEYWORDS, CodeBlock(), detectCallout(), HEADING_CLASS (+9 more)

### Community 61 - "behavior.ts"
Cohesion: 0.18
Nodes (15): block(), canEnforce(), proposeRuleForCommitment(), RuleSuggestionProposal, suggestRuleForInsight(), carryOverCommitments(), dismissProposedCommitment(), listProposedCommitments() (+7 more)

### Community 62 - "emit.ts"
Cohesion: 0.18
Nodes (15): buildCognitiveDigest(), DigestInput, DigestResult, isoWeekKey(), sendCognitiveDigest(), sendCognitiveDigestForAll(), EmailPrefRow, isEmailChannelEnabled() (+7 more)

### Community 63 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, eslint, eslint-config-next, jsdom, @playwright/test, prisma, react-email, tailwindcss (+11 more)

### Community 64 - "data-table.tsx"
Cohesion: 0.17
Nodes (14): AnimatedItem(), AnimatedList(), DataTable(), gridTemplate(), RovingItemProps, Row(), ROW_PAD, TableSkeleton() (+6 more)

### Community 65 - "automations.ts"
Cohesion: 0.14
Nodes (15): AutomationLike, deleteRuleForAutomation(), patchRuleForAutomation(), ruleFieldsFromAutomation(), syncRuleFromAutomation(), TRIGGERS, action, ACTION_TYPES (+7 more)

### Community 66 - "ai-config.ts"
Cohesion: 0.18
Nodes (13): ConnectivityResult, testProviderConnectivity(), decryptApiKey(), encryptApiKey(), EncryptionConfigError, getEncryptionKey(), maskApiKey(), rotateEncryptionKey() (+5 more)

### Community 67 - "ai-coach-drawer.tsx"
Cohesion: 0.16
Nodes (14): AiCoachDrawer(), ApiError, clampPos(), formatTime(), Message, SUGGESTED, TOOL_LABELS, useIsMobile() (+6 more)

### Community 68 - "psychology-service.ts"
Cohesion: 0.22
Nodes (14): calibration(), avg(), MoodSample, moodTrend, MoodTrendResult, MoodWindow, recordEpisode(), getCalibration() (+6 more)

### Community 69 - "risk-service.ts"
Cohesion: 0.22
Nodes (14): aggregateExposure(), AggregateFreezeInput, aggregateFreezeSignal, CorrelationResult, Direction, OpenPosition, SymbolExposure, asDrawdownModel() (+6 more)

### Community 70 - "today-service.ts"
Cohesion: 0.22
Nodes (14): RiskBudget, assembleTodayFeed(), detectDailyAnomaly(), SignalInput, TodayItem, getIgnoreCounts(), recordIgnore(), getTodayFeed() (+6 more)

### Community 71 - "commitment-service.ts"
Cohesion: 0.19
Nodes (15): CommitmentWindow, getVerifier(), publishEvent(), acceptProposedCommitment(), createCommitmentFromInsight(), CreateCommitmentOverrides, evaluateCommitment(), EvaluateResultOut (+7 more)

### Community 72 - "gen-theme-css.mjs"
Cohesion: 0.23
Nodes (14): accentContrastFor(), clamp01(), contrastRatio(), derivePalette(), hexToRgb(), linearToSrgb(), okl(), oklchToHex() (+6 more)

### Community 73 - "coach-service.ts"
Cohesion: 0.20
Nodes (11): POST(), SystemBlock, CoachAgentOptions, streamCoachAgent(), systemToString(), buildSystemPrompt(), CoachStreamOptions, MessageParam (+3 more)

### Community 74 - "page.tsx"
Cohesion: 0.14
Nodes (11): ACTION_LABEL, AutomationRow, AutomationsTab(), SystemRulesTab(), TABS, Template, TRIGGER_LABEL, COPY (+3 more)

### Community 75 - "risk-engine.ts"
Cohesion: 0.21
Nodes (14): accountDrawdown(), AccountRisk, AccountRiskInput, computeAccountRisk(), gauge(), LimitGauge, lossPct(), maxDrawdownFromPnl() (+6 more)

### Community 76 - "page.tsx"
Cohesion: 0.13
Nodes (4): AI_PROVIDERS, COLORBLIND_OPTIONS, SESSIONS, TIMEZONES

### Community 77 - "rolling-window.ts"
Cohesion: 0.23
Nodes (13): addDays(), compareCurrentVsPrevious(), Comparison, Dated, isCount(), rollingWindow(), RollingWindowOpts, sortByDate() (+5 more)

### Community 78 - "apply.ts"
Cohesion: 0.28
Nodes (13): applyColorTheme(), clearInlineTokens(), injectInline(), LEGACY_KEYS, LEGACY_VARS, reapplyCustomForMode(), tokensToCssText(), ColorMode (+5 more)

### Community 79 - "gen-icons.mjs"
Cohesion: 0.19
Nodes (14): BG, chunk(), clamp(), crc32(), __dirname, distSeg(), DOT, encodePNG() (+6 more)

### Community 80 - "trajectory-panel.tsx"
Cohesion: 0.18
Nodes (12): Bead, BEADS, buildChart(), fmtWeek(), HOVER, money(), Overview, STAT (+4 more)

### Community 81 - "DrawdownModel"
Cohesion: 0.20
Nodes (11): AccountRiskConfig, DerivedRiskInputs, deriveRiskInputs(), median(), pctToFraction(), PropProjectionInput, DrawdownModel, AccountPhase (+3 more)

### Community 82 - "risk-enforcement.ts"
Cohesion: 0.31
Nodes (13): assertTradeable(), autoUnlock(), EnforceableAccount, evaluateAndLock(), hasAnyLimit(), loadAccountRisk(), LOCK_REASON_TEXT, lockAccount() (+5 more)

### Community 83 - "route.ts"
Cohesion: 0.22
Nodes (9): POST(), Provider, rateLimiter, testAnthropicKey(), testOpenAIKey(), testOpenRouterKey(), createRateLimiter(), InMemoryRateLimiter (+1 more)

### Community 84 - "ai-models-card.tsx"
Cohesion: 0.17
Nodes (11): AiModelsCard(), ALL_TOOL_MODELS, COST_OPTIONS, FEATURE_LABEL, inputStyle, looksToolIncapable(), Provider, PROVIDER_LABEL (+3 more)

### Community 85 - "position-log-modal.tsx"
Cohesion: 0.19
Nodes (12): AccountRules, ADDABLE_TYPES, AddableType, CONTRACTS_TYPES, EVENT_COLORS, EVENT_DESCRIPTIONS, EVENT_LABELS, EventType (+4 more)

### Community 86 - "welch.ts"
Cohesion: 0.32
Nodes (11): mean(), oneSampleTTest(), sampleVariance(), studentTTwoSidedP(), TTestResult, welchTTest(), detectEdgeDecay(), EdgeDecayInput (+3 more)

### Community 87 - "verifiers.ts"
Cohesion: 0.17
Nodes (9): METRIC_KEYS, OFF_PLAN_TAGS, REGISTRY, sortByDateTime(), Verifier, VerifierOpts, VerifierResult, verifyTradesPerDayBeyond2() (+1 more)

### Community 88 - "pdf-report-html.ts"
Cohesion: 0.36
Nodes (12): analysisHtml(), C, CALLOUT, calloutHtml(), card(), equitySvg(), esc(), kpiCell() (+4 more)

### Community 89 - "theme-provider.tsx"
Cohesion: 0.23
Nodes (9): CYCLE, getSystemTheme(), ResolvedTheme, resolveTheme(), ThemeContext, ThemeContextValue, ThemeMode, ThemeProvider() (+1 more)

### Community 90 - "emotion-feedback.ts"
Cohesion: 0.23
Nodes (9): EmotionInsight(), LABELS, EmotionFeedback, EmotionStat, EmotionTrade, feedbackForEmotion(), round1(), ADR-0002 (+1 more)

### Community 91 - "commitment-machine.ts"
Cohesion: 0.23
Nodes (10): canCommit(), CommitmentSpec, CommitmentStatus, Comparator, deriveCommitmentSpec(), evaluateResult(), INSIGHT_SPECS, partialBand() (+2 more)

### Community 92 - "memory-episode-service.ts"
Cohesion: 0.30
Nodes (10): BASE, decayedSalience(), initialSalience(), MemoryEventType, recallScore(), EpisodeRow, rankBySalience(), RecalledEpisode (+2 more)

### Community 93 - "engine.ts"
Cohesion: 0.32
Nodes (10): runAction(), compare(), evaluate(), toNum(), rulesSourceIsUnified(), runAutomations(), RunResult, runRuleEngine() (+2 more)

### Community 94 - "unification.ts"
Cohesion: 0.29
Nodes (9): buildMigrationReportForUser(), MigrationReportTotals, automationToUnifiedRule(), buildNoMappingReport(), classifyMode(), looksCritical(), NoMappingReport, severityForMode() (+1 more)

### Community 95 - "resolve-provider.ts"
Cohesion: 0.23
Nodes (11): getProviderKey(), ACTIVE_AI_FEATURES, AiDiagnostics, ALL_PROVIDERS, buildAiDiagnostics(), KeySource, ProviderKeyStatus, ResolvedCall (+3 more)

### Community 96 - "tab-playbook.tsx"
Cohesion: 0.25
Nodes (8): checklistColor(), getWeekKey(), HEALTH_CONFIG, LifecycleSuggestions(), sessionCellColor(), TabPlaybook(), SetupHealthParams, SetupHealthStatus

### Community 97 - "useLogout.ts"
Cohesion: 0.33
Nodes (7): LoginPage(), PerfilPage(), useLogout(), clearSessionStorageKeys(), SESSION_SCOPED_STORAGE_KEYS, STORAGE_KEYS, createClient()

### Community 98 - "feed.ts"
Cohesion: 0.24
Nodes (9): KIND_ICON, severityColor(), TodayFeed(), AnomalyInput, AnomalyResult, BASE, SEVERITY_MULT, SignalKind (+1 more)

### Community 99 - "analytics-cache.ts"
Cohesion: 0.24
Nodes (7): CacheDb, CacheDelegate, CacheRow, getCachedStats(), invalidateCache(), isCacheEnabled(), setCachedStats()

### Community 100 - "profile.ts"
Cohesion: 0.31
Nodes (8): invalidateAnalyticsCacheIfNeeded(), isValidIanaTimezone(), normalizeProfileInput(), PROFILE_PUBLIC_FIELDS, UpdateProfileInput, validateProfileUpdate(), createAdminClient(), profileRouter

### Community 101 - "custom-palettes.ts"
Cohesion: 0.29
Nodes (9): isValidSelection(), num(), parsePaletteConfig(), parsePaletteConfigJson(), PaletteConfig, configInput, customPalettesRouter, normalize() (+1 more)

### Community 102 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, e2e, e2e:ui, email, gen:theme, lint (+3 more)

### Community 103 - "Trading Journal — capa cognitiva sobre el bróker"
Cohesion: 0.20
Nodes (10): Convención de proyecto: usar graphify (query/path/explain/update) antes de grep/browsing crudo, docs/ARCHITECTURE.md — arquitectura canónica (freeze v3.1 + ADRs), docs/auditoria-producto-trading-journal-v2.md — auditoría vinculante que originó v3 (anexo), docs/CHANGELOG.md — historial por hito (anexo), Invariantes: bloqueo pre-trade, separación práctica/real, frontera anti-envenenamiento, honestidad estadística, permiso, Trading Journal — capa cognitiva sobre el bróker, docs/PROJECT_GUIDE.md — léeme primero: qué es, módulos, stack, mapa de código, Cómo iniciar el proyecto: clonar, .nvmrc, pnpm install, .env, prisma generate, supabase db push, pnpm dev (+2 more)

### Community 104 - "setup-intelligence-panel.tsx"
Cohesion: 0.31
Nodes (8): EdgeEvolutionChart(), fmt(), Windows, DECAY_META, Drift, driftValue(), fmt(), SetupIntelligencePanel()

### Community 105 - "tag-chip.tsx"
Cohesion: 0.36
Nodes (8): SelectableTagChip(), SIZE, TagChip(), TagChipView(), DEFAULT, resolveTagMeta(), TagMeta, useTagCatalog()

### Community 106 - "risk-ratios.ts"
Cohesion: 0.38
Nodes (9): calmarRatio(), computeRiskRatios(), Kelly, kellyCriterion(), kellyFromR, mean(), rollingRiskRatios(), sortinoRatio() (+1 more)

### Community 107 - "accounts.ts"
Cohesion: 0.20
Nodes (6): ACCOUNT_STATUSES, ACCOUNT_TYPES, AccountInput, accountsRouter, PHASES, RawAccount

### Community 108 - "createClient"
Cohesion: 0.36
Nodes (6): PERIODS, POST(), ALLOWED_MIME, POST(), AnalyticsAiOptions, createClient()

### Community 109 - "layout.tsx"
Cohesion: 0.28
Nodes (5): metadata, viewport, AppShell(), ServiceWorkerRegister(), TRPCProvider()

### Community 110 - "palette-studio.tsx"
Cohesion: 0.31
Nodes (8): ADV_ROLES, iconBtn, labelStyle, PaletteStudio(), NOTE: applying the theme on mount / mode-change is intentionally NOT done here., tileBtn(), useTheme(), makeCustomSelection()

### Community 111 - "pattern-detector.ts"
Cohesion: 0.53
Nodes (8): detectFridayBias(), detectOversizingAfterLoss(), detectOvertradingAfterWinStreak(), detectPatterns(), detectRevengeTradingPattern(), detectSessionFatigue(), monthSpan(), weekSpan()

### Community 112 - "trade-form-schema.ts"
Cohesion: 0.22
Nodes (7): EMOTION_VALUES, REGIME_VALUES, SESSION_VALUES, tradeEditSchema, TradeEditValues, tradeFormSchema, TradeFormValues

### Community 113 - "package.json"
Cohesion: 0.22
Nodes (8): engines, node, name, packageManager, pnpm, onlyBuiltDependencies, private, version

### Community 114 - "calibration.ts"
Cohesion: 0.29
Nodes (7): DirectionalEstimate, Estimate, CalibrationResult, CalibrationTrade, CalibrationVerdict, ConfidenceBucket, ADR-0002

### Community 115 - "risk-budget.ts"
Cohesion: 0.29
Nodes (6): clamp01(), computeRiskBudget(), DailyWindow, DailyWindowInput, RiskBudgetInput, RiskOverview

### Community 116 - "leverage.ts"
Cohesion: 0.32
Nodes (7): buildAccountExposure(), computeLeverageMetrics(), computeNotional(), LEVERAGE_BAND_META, leverageBand, LeverageMetrics, MarketCategory

### Community 117 - "discipline-service.ts"
Cohesion: 0.36
Nodes (6): DisciplineDetail, DisciplinePeriod, DisciplineResult, calcDisciplineScore(), DisciplineBreakdown, DisciplineParams

### Community 118 - "prop-firm-guard.ts"
Cohesion: 0.29
Nodes (7): checkDailyLossLimit(), checkLossLimit(), checkSymbolAllowlist(), checkTradeCountLimit(), LOSS_LIMIT_TYPE, LossLimitPeriod, PropFirmViolation

### Community 119 - "config.ts"
Cohesion: 0.36
Nodes (4): detectProvider(), getCoachModel(), getWeeklySummaryModel(), resolveModel()

### Community 120 - "seed.ts"
Cohesion: 0.29
Nodes (7): ensureTagRows(), ensureTagsSeeded(), SYSTEM_APPEARANCE, SystemTagDef, systemTagDefs(), QUALITY_TAGS, VIOLATION_TAGS

### Community 121 - "goal-progress-widget.tsx"
Cohesion: 0.29
Nodes (4): GoalProgressWidget(), GoalProgressWidgetProps, GoalRingProps, KpiSummary

### Community 122 - "account-risk-panel.tsx"
Cohesion: 0.43
Nodes (5): AccountRiskPanel(), asPct(), BOTTLENECK, pct(), RiskBudgetMeter()

### Community 123 - "capture-rules.ts"
Cohesion: 0.29
Nodes (5): ChecklistEvaluation, ChecklistState, evaluateChecklist(), Regime, REGIME_VALUES

### Community 124 - "trade-derivation.ts"
Cohesion: 0.38
Nodes (6): deriveRiskAmount(), deriveRiskPct(), deriveSession(), parseHour(), RiskInput, SessionLabel

### Community 125 - "backfill-embeddings.mjs"
Cohesion: 0.33
Nodes (5): apiKey, c, decryptApiKey(), EMBED_MODEL, encKey()

### Community 126 - "backfill-resource-embeddings.mjs"
Cohesion: 0.33
Nodes (5): apiKey, c, decryptApiKey(), EMBED_MODEL, encKey()

### Community 127 - "Auditoría de Producto — Trading Journal v2"
Cohesion: 0.40
Nodes (6): Auditoría de Producto — Trading Journal v2, CoachMemory (commitments + fulfillment) proposal, AI Coach is reactive, no memory, no initiative, Missing longitudinal analysis / rolling windows, Broken improvement loop (commitments not verified), Rule vs Automation duality confusion (C6)

### Community 128 - "ai-insights-panel.tsx"
Cohesion: 0.33
Nodes (4): AiInsightsPanel(), fmt(), RDistributionChart(), IntelligencePanel()

### Community 129 - "improvement-panel.tsx"
Cohesion: 0.47
Nodes (5): fmt(), Improvement, ImprovementPanel(), REGIME_LABEL, scoreColor()

### Community 130 - "note-tag-suggestions.tsx"
Cohesion: 0.47
Nodes (4): NoteTagSuggestions(), RULES, suggestTagsFromNote(), TagRule

### Community 131 - "mae-mfe.ts"
Cohesion: 0.40
Nodes (5): analyzeMaeMfe(), EMPTY, MaeMfeResult, MaeMfeTrade, mean()

### Community 132 - "checkin.ts"
Cohesion: 0.40
Nodes (5): CheckinInput, CheckinResult, checkinVerdict, clamp(), LABEL

### Community 133 - "reinforcement.ts"
Cohesion: 0.40
Nodes (5): CommitmentResult, planReinforcement(), positiveIsVisible(), ReinforcementKind, ReinforcementPlan

### Community 134 - "email-theme.ts"
Cohesion: 0.53
Nodes (5): resolveTheme(), accentHex(), hx(), resolveEmailThemeFor(), ThemePrefs

### Community 135 - "ADR-002 — Estrategia estadística"
Cohesion: 0.40
Nodes (5): ADR-002 — Estrategia estadística, D15 — estadística Bayesiana/jerárquica con shrinkage (irreversible como método; priors reversibles), D16 — proyecciones prop son no estacionarias, D17 — causalidad etiquetada honestamente, D18 — régimen v3

### Community 136 - "Auditoría Técnica Exhaustiva (37 hallazgos)"
Cohesion: 0.40
Nodes (5): Auditoría Técnica Exhaustiva (37 hallazgos), KPIs computed over first 50 paginated trades bug, Off-schema tables (notes_embedding, email_log) not in Prisma, Profile page fully disconnected from backend (CRÍTICO), Stack: Next.js 16 + tRPC v11 + Prisma 7 + Supabase

### Community 137 - "benchmark.ts"
Cohesion: 0.50
Nodes (4): analyzeBenchmark(), BenchmarkResult, BenchmarkSetupRow, weightedComparison()

### Community 138 - "pnl-heatmap.ts"
Cohesion: 0.40
Nodes (3): DailyPnl, HeatmapDay, HeatmapResult

### Community 140 - "index.ts"
Cohesion: 0.50
Nodes (3): sendEmail(), sendPropFirmHealthAlert(), supabase

### Community 141 - "CI job: checks (type check, tests, build)"
Cohesion: 0.50
Nodes (4): CI job: checks (type check, tests, build), CI job: authenticated E2E (Playwright), CI job: migrate-deploy (apply migrations to production), CI job: migrate-validate (replay from scratch)

### Community 142 - "ADR-003 — Privacidad de la memoria y frontera anti-corrupción"
Cohesion: 0.50
Nodes (4): ADR-003 — Privacidad de la memoria y frontera anti-corrupción, D10 — Context Assembler con presupuesto, D11 — write con confirmación explícita, D9 — frontera anti-poisoning (irreversible)

### Community 143 - "E13 — MemoryEpisode (episódica, append-only, embedding, saliencia)"
Cohesion: 0.50
Nodes (4): E13 — MemoryEpisode (episódica, append-only, embedding, saliencia), Memory (subsistema: 4 capas + context assembler), P6 — El LLM propone, los datos confirman, P8 — Privacidad y autonomía como diseño, no como add-on

### Community 144 - "Seguridad / RLS / auth"
Cohesion: 0.50
Nodes (4): Seguridad / RLS / auth, Sistema de aprendizaje (repetición espaciada, streak), Phase 0-1: Fundación y aprendizaje, Sprint 6: Tema de sistema, filtros de review, sparklines, type safety, hardening de seguridad

### Community 145 - "Superficies ANALIZAR/PROTEGER/MEJORAR (flag tj.v3Shell)"
Cohesion: 0.50
Nodes (4): Módulo Dashboard (/dashboard), Módulo Playbook / Setups (/playbook), Superficies ANALIZAR/PROTEGER/MEJORAR (flag tj.v3Shell), Apuesta A3: rutas reales de 5 superficies

### Community 147 - "segmented-tabs.tsx"
Cohesion: 0.50
Nodes (3): SegmentedOption, SegmentedTabs(), SegmentedTabsProps

### Community 148 - "budget-guard.ts"
Cohesion: 0.50
Nodes (3): BudgetGuardInput, BudgetGuardResult, evaluateBudgetGuard()

### Community 149 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

### Community 150 - "Stack v3.2 (Next.js/tRPC/Prisma/Supabase/Vercel/pgvector)"
Cohesion: 0.67
Nodes (3): Stack v3.2 (Next.js/tRPC/Prisma/Supabase/Vercel/pgvector), Ops pendiente: protección de contraseñas filtradas (Supabase Auth), TD-019: cliente Supabase por-request en contexto tRPC

### Community 151 - "Next.js Agent Rules (breaking-changes warning)"
Cohesion: 0.67
Nodes (3): Next.js Agent Rules (breaking-changes warning), src CLAUDE.md (includes AGENTS.md), src README (Next.js create-next-app)

## Knowledge Gaps
- **908 isolated node(s):** `PALETTES`, `target`, `Instruments`, `TagEdges`, `Overview` (+903 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `page.tsx`, `revisar-recurso-modal.tsx`, `review-report-shell.tsx`, `client.ts`, `Sidebar.tsx`, `page.tsx`, `index.ts`, `trades-table.tsx`, `page.tsx`, `segmented-tabs.tsx`, `tab-portfolio.tsx`, `page.tsx`, `page.tsx`, `utils.ts`, `page.tsx`, `condition-group.tsx`, `page.tsx`, `simple-table.tsx`, `register-trade-modal.tsx`, `markdown.tsx`, `data-table.tsx`, `ai-coach-drawer.tsx`, `page.tsx`, `position-log-modal.tsx`, `tab-playbook.tsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`, `send-learning-digest.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `trpc` connect `client.ts` to `ai-insights-panel.tsx`, `revisar-recurso-modal.tsx`, `page.tsx`, `review-report-shell.tsx`, `Sidebar.tsx`, `page.tsx`, `cn`, `onboarding-checklist.tsx`, `page.tsx`, `tab-portfolio.tsx`, `page.tsx`, `page.tsx`, `utils.ts`, `page.tsx`, `page.tsx`, `page.tsx`, `register-trade-modal.tsx`, `ai-coach-drawer.tsx`, `page.tsx`, `page.tsx`, `ai-models-card.tsx`, `theme-provider.tsx`, `tab-playbook.tsx`, `feed.ts`, `setup-intelligence-panel.tsx`, `tag-chip.tsx`, `layout.tsx`, `palette-studio.tsx`, `goal-progress-widget.tsx`, `account-risk-panel.tsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `PALETTES`, `target`, `Instruments` to the rest of the system?**
  _944 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0609009009009009 - nodes in this community are weakly interconnected._
- **Should `revisar-recurso-modal.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.051360842844600525 - nodes in this community are weakly interconnected._
- **Should `trades.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06394230769230769 - nodes in this community are weakly interconnected._