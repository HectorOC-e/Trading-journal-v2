# Graph Report - Trading-journal-v2  (2026-07-13)

## Corpus Check
- 542 files · ~304,304 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3175 nodes · 6836 edges · 322 communities (158 shown, 164 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3c099a82`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- risk-budget.ts
- leverage.ts
- discipline-service.ts
- prop-firm-guard.ts
- seed.ts
- goal-progress-widget.tsx
- account-risk-panel.tsx
- capture-rules.ts
- trade-derivation.ts
- backfill-embeddings.mjs
- backfill-resource-embeddings.mjs
- ai-insights-panel.tsx
- note-tag-suggestions.tsx
- mae-mfe.ts
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
- segmented-tabs.tsx
- vercel.json
- Stack v3.2 (Next.js/tRPC/Prisma/Supabase/Vercel/pgvector)
- Next.js Agent Rules (breaking-changes warning)
- layout.tsx
- proxy.ts
- Módulo Trades (/trades)
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
- Project Guide — Trading Journal v3.2
- add-edit-resource-modal.tsx
- 4. HALLAZGOS DEL AI COACH (sección central)
- prop-firm-presets.ts
- 🚀 Cómo iniciar el proyecto
- handler
- rules.ts
- 11. Clasificación de decisiones
- README.md
- 4. Eventos (FREEZE-EV) — el sistema nervioso
- 5. Entidades (FREEZE-E) — catálogo congelado
- CLAUDE.md
- AGENTS.md
- Convención de proyecto: usar graphify (query/path/explain/update) antes de grep/browsing crudo
- Analytics (bounded context, determinista)
- Behavior Engine (bounded context: loop de mejora)
- Coach (subsistema: orquestador + agente(s) + tools)
- Cognitive Engine (bounded context: events, intervention, memory, coach)
- D1 — Outbox transaccional + dispatcher, dos caminos de entrega
- D2 — Cognitive Engine aislado (frontera irreversible)
- D3 — Analytics es puro y sin efectos
- D4 — Behavior Engine es el dueño del loop
- D5 — SLA de intervención redefinido (respuesta síncrona de mutación)
- D6 — El outbox es la única fuente de verdad de "qué pasó"
- E1 — Trade (enmienda: maeR/mfeR/regime/riskPct/checklistResultId)
- E10 — RuleSuggestion (propuesta de regla desde insight)
- E11 — Intervention (trigger, scores, response, outcome)
- E12 — PreSessionCheckin (mood/energía/sueño + veredicto go/no-go)
- E2 — Rule (unificado con Automation: enforce/warn)
- E3 — WeeklyReview/MonthlyReview (relación con Commitment)
- E5 — DomainEvent (outbox)
- E6 — Insight (sampleSize, credibleInterval, effectSize, status)
- E7 — Commitment (núcleo del loop)
- E8 — CommitmentCheck (observedValue, result, evidence)
- E9 — Reinforcement (positive/corrective)
- EV1 — trade.created
- EV10 — intervention.responded
- EV2 — trade.closed
- EV3 — insight.created
- EV4 — insight.resolved
- EV5 — commitment.created
- EV6 — commitment.kept / broken / partial
- EV7 — rule.fired
- EV8 — account.dd_breach / dd_approach
- EV9 — checkin.submitted
- D1 — Mecanismo de eventos congelado (outbox, resuelve ADR-001)
- D11 — write con confirmación explícita
- D16 — proyecciones prop son no estacionarias
- D17 — causalidad etiquetada honestamente
- D18 — régimen v3
- D5 — SLA de intervención ≤2s redefinido
- D6 — el outbox es la única fuente de verdad de "qué pasó"
- D9 — frontera anti-poisoning (irreversible)
- Intervention Engine (subsistema núcleo)
- Memory (subsistema: 4 capas + context assembler)
- P1 — La unidad de valor es el cambio de comportamiento verificado
- P2 — Determinismo primero; el LLM narra, no calcula
- P3 — Rigor honesto sobre muestras retail (Bayesiano/shrinkage)
- P4 — Calma por defecto; la intervención es la única interrupción
- P5 — El Cognitive Engine es independiente de la piel (app web)
- P6 — El LLM propone, los datos confirman
- P7 — Ningún insight muere como texto
- P8 — Privacidad y autonomía como diseño, no como add-on
- Trading/Rules (OLTP, bounded context)
- KPIs computed over first 50 paginated trades bug
- Off-schema tables (notes_embedding, email_log) not in Prisma
- Profile page fully disconnected from backend (CRÍTICO)
- Stack: Next.js 16 + tRPC v11 + Prisma 7 + Supabase
- CoachMemory (commitments + fulfillment) proposal
- AI Coach is reactive, no memory, no initiative
- Missing longitudinal analysis / rolling windows
- Broken improvement loop (commitments not verified)
- Rule vs Automation duality confusion (C6)
- AI config, migraciones y consolidación documental 2026-06-05
- Motor de resolución de IA (resolve-provider)
- CI / migraciones (Supabase CLI, GitHub Actions)
- dashboardStats (analítica server-side)
- Discipline scoring / centralización de disciplina
- Consolidación documental
- Formula Engine
- Hardening 2026-06-10 (P&L, enforcement, CI/migraciones, rendimiento)
- Sistema de aprendizaje (repetición espaciada, streak)
- Onboarding flow
- Export PDF de reporte de rendimiento
- Phase 0-1: Fundación y aprendizaje
- P&L / point-value engine
- Portfolio (curva de equity multi-cuenta)
- Prop-firm enforcement (drawdown, locks)
- PWA (manifest, service worker, offline)
- Sprint 4: Psicología, reviews y personalización
- Sprint 5: Config de IA, metas, planNotes, paginación, UX, soporte internacional
- Sprint 6: Tema de sistema, filtros de review, sparklines, type safety, hardening de seguridad
- Sprint 7: Hardening de reviews, centralización de disciplina
- Sprint 8: Testing, accesibilidad, reviews mensuales
- Sprints 1-3: Fundación
- Sprints 9-12: Portfolio MVP, PWA, PDF, Onboarding
- Stabilization Sprint 2026-06-03: Remediación QA manual
- Digest cognitivo semanal (notificación opt-outable)
- Feed HOY (TodayFeed + RiskBudgetMeter)
- Índice de mejora (ImprovementScore)
- Intervenciones (InterventionOverlay, motor determinista)
- Memoria del coach (4 capas: episódica/semántica/identidad/mejora)
- Persona: Funded Trader
- Persona: Prop Firm Candidate
- Persona: Retail Learner
- Persona: System Trader
- Módulo Playbook / Setups (/playbook)
- Tesis del producto: capa cognitiva que cambia el comportamiento del trader
- Módulo Reglas (/reglas)
- Reglas unificadas enforce/warn (Rule fusiona Automation)
- Superficies ANALIZAR/PROTEGER/MEJORAR (flag tj.v3Shell)
- Write-tools del coach con permiso (propose_rule/propose_commitment)
- Checklist de QA pendiente de V3 (109 ítems)
- Ops pendiente: agendar cron del digest cognitivo (C4)
- Ops pendiente: protección de contraseñas filtradas (Supabase Auth)
- Apuesta A3: rutas reales de 5 superficies
- Apuesta POST-1: realtime/SSE
- Apuesta POST-3: moat cross-user
- Apuesta POST-4: régimen exógeno ATR
- Apuesta POST-6: base de reglas prop-firm (moat)
- Apuesta POST-7: framework A/B completo
- TD-018: extraer lógica de trades.ts a trade-service
- TD-019: cliente Supabase por-request en contexto tRPC
- docs/ARCHITECTURE.md — arquitectura canónica (freeze v3.1 + ADRs)
- docs/auditoria-producto-trading-journal-v2.md — auditoría vinculante que originó v3 (anexo)
- docs/CHANGELOG.md — historial por hito (anexo)
- Invariantes: bloqueo pre-trade, separación práctica/real, frontera anti-envenenamiento, honestidad estadística, permiso
- Trading Journal — capa cognitiva sobre el bróker
- docs/PROJECT_GUIDE.md — léeme primero: qué es, módulos, stack, mapa de código
- Cómo iniciar el proyecto: clonar, .nvmrc, pnpm install, .env, prisma generate, supabase db push, pnpm dev
- docs/STATUS.md — estado, QA pendiente, deuda, backlog, roadmap, prompt de retoma
- src CLAUDE.md (includes AGENTS.md)
- src README (Next.js create-next-app)

## God Nodes (most connected - your core abstractions)
1. `cn()` - 155 edges
2. `trpc` - 69 edges
3. `formatErrorForUser()` - 62 edges
4. `isWin()` - 39 edges
5. `protectedProcedure` - 34 edges
6. `RouterOutputs` - 34 edges
7. `calcWinRate()` - 33 edges
8. `toast` - 33 edges
9. `Apéndice — ADRs` - 29 edges
10. `Button()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Dropdown()` --indirect_call--> `handler()`  [INFERRED]
  src/components/ui/market-select.tsx → src/app/api/trpc/[trpc]/route.ts
- `StatusSelect()` --indirect_call--> `handler()`  [INFERRED]
  src/app/retiros/page.tsx → src/app/api/trpc/[trpc]/route.ts
- `AiCoachDrawer()` --indirect_call--> `handler()`  [INFERRED]
  src/components/ai-coach/ai-coach-drawer.tsx → src/app/api/trpc/[trpc]/route.ts
- `useWindowWidth()` --indirect_call--> `handler()`  [INFERRED]
  src/components/layout/Sidebar.tsx → src/app/api/trpc/[trpc]/route.ts
- `ThemeProvider()` --indirect_call--> `handler()`  [INFERRED]
  src/components/theme-provider.tsx → src/app/api/trpc/[trpc]/route.ts

## Import Cycles
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/accounts.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/withdrawals.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 4-file cycle: `src/domains/analytics/services/discipline-service.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/domains/analytics/services/discipline-service.ts`
- 4-file cycle: `src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/report-data.ts`
- 4-file cycle: `src/domains/trading/services/risk-enforcement.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/accounts.ts -> src/domains/trading/services/risk-enforcement.ts`
- 4-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 4-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/insights-engine.ts`
- 4-file cycle: `src/domains/analytics/services/psychology-insights.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/psychology-insights.ts`
- 4-file cycle: `src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/report-data.ts`
- 4-file cycle: `src/server/services/tags/seed.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/tags.ts -> src/server/services/tags/seed.ts`
- 4-file cycle: `src/domains/trading/services/risk-enforcement.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/domains/trading/services/risk-enforcement.ts`
- 4-file cycle: `src/server/services/tags/seed.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/server/services/tags/seed.ts`
- 5-file cycle: `src/server/services/email/send-review.ts -> src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/email/send-review.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/overview.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/review-ai.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/psychology-insights.ts -> src/domains/analytics/services/insights-engine.ts`

## Hyperedges (group relationships)
- **CI/CD antierrores pipeline** — _github_workflows_ci_checks, _github_workflows_ci_e2e, _github_workflows_ci_migrate_validate, _github_workflows_ci_migrate_deploy [EXTRACTED 1.00]

## Communities (322 total, 164 thin omitted)

### Community 0 - "page.tsx"
Cohesion: 0.08
Nodes (43): PlanSessionModal(), todayISO(), ResourceFromDB, ResourceFromDB, PHASE_LABEL, PropFirmPreset, PropFirmPresetPicker(), ACCOUNT_TYPES (+35 more)

### Community 1 - "revisar-recurso-modal.tsx"
Cohesion: 0.13
Nodes (19): effectiveMasteryLevel(), MASTERY_STAGES, masteryLevel(), MasteryStage, masteryStageIndex(), masteryStageIndexFromLevel(), STATUS_TO_LEVEL, fmtDate() (+11 more)

### Community 2 - "trades.ts"
Cohesion: 0.06
Nodes (44): BudgetGuardInput, BudgetGuardResult, evaluateBudgetGuard(), AccountBalance, AccountExposure, AccountLimits, AccountStat, AccountWithLimits (+36 more)

### Community 3 - "root.ts"
Cohesion: 0.06
Nodes (34): Context, protectedProcedure, t, RouterInputs, accountLogsRouter, ACCOUNT_STATUSES, ACCOUNT_TYPES, AccountInput (+26 more)

### Community 4 - "review-report-shell.tsx"
Cohesion: 0.07
Nodes (49): AiAnalysisCard(), Period, EquityCurveChart(), PnlTrendChart(), TrendTooltip(), DownloadPdfButton(), LearningSummary(), Goal (+41 more)

### Community 5 - "client.ts"
Cohesion: 0.08
Nodes (34): SyncBalanceModal(), SyncBalanceModalProps, syncSchema, SyncValues, Period, Period, SendReviewEmailButton(), CoachIdentityEditor() (+26 more)

### Community 6 - "insights-engine.ts"
Cohesion: 0.07
Nodes (52): CAT_ICON, InsightCards(), sevStyle(), ComputedInsight, InsightStatus, PersistedInsightRef, reconcileInsights(), ReconcilePlan (+44 more)

### Community 7 - "Sidebar.tsx"
Cohesion: 0.21
Nodes (14): CATEGORIES, NotificacionesPage(), NotificationBell(), CenterPanel(), CenterSheet(), formatNotifTime(), NotificationItem(), NotificationItemProps (+6 more)

### Community 8 - "review-summary.tsx"
Cohesion: 0.07
Nodes (41): ReviewEmailModel, buildLearningDigest(), daysBetween(), DigestInput, DigestModel, DigestReview, formatDateLabel(), isoDate() (+33 more)

### Community 9 - "page.tsx"
Cohesion: 0.17
Nodes (18): ACCOUNT_STATUS_META, AccountCard(), AccountExposure, AccountRisk, formatSyncAgo(), isPropFirmLike(), KpiBox(), RawAccount (+10 more)

### Community 11 - "index.ts"
Cohesion: 0.10
Nodes (21): mockAccounts, mockMarkets, mockReviews, mockRules, mockSetups, mockTrades, AccountStatus, DashboardStats (+13 more)

### Community 12 - "dependencies"
Cohesion: 0.05
Nodes (43): dependencies, @anthropic-ai/sdk, class-variance-authority, clsx, dotenv, framer-motion, @hookform/resolvers, katex (+35 more)

### Community 13 - "prisma.ts"
Cohesion: 0.09
Nodes (33): POST(), POST(), ADR-0001, POST(), AuthResult, checkCronAuth(), POST(), timingSafeMatch() (+25 more)

### Community 14 - "notify.tsx"
Cohesion: 0.12
Nodes (29): ToastCard(), ToastCardProps, TYPE_STYLE, TypeStyle, AppError, isAppError(), toUserMessage(), TRPC_TO_CODE (+21 more)

### Community 15 - "coach-memory-service.ts"
Cohesion: 0.10
Nodes (30): assembleContextBlock(), AssembleInput, MemoryExtraction, MemoryKind, MemoryStatus, parseMemoryExtraction(), ProposedMemory, proposeMemory() (+22 more)

### Community 16 - "learning-resources.ts"
Cohesion: 0.13
Nodes (14): computeNextReview(), Grade, SrsInput, SrsResult, updateEase(), LearningResourceInput, learningResourcesRouter, LinkedSetup (+6 more)

### Community 17 - "index.ts"
Cohesion: 0.07
Nodes (38): DisciplineDetail, DisciplinePeriod, DisciplineResult, calcDisciplineScore(), DisciplineBreakdown, DisciplineParams, calcAvgR(), calcExpectancyR() (+30 more)

### Community 18 - "cn"
Cohesion: 0.07
Nodes (29): ADR-000 — Decisiones de raíz de Trading Journal v3.1, ADR-001 — Runtime de eventos y entrega, ADR-002 — Estrategia estadística, ADR-003 — Privacidad de la memoria y frontera anti-corrupción, ADR-004 — Reserva de datos cross-user (BIZ-1), Alternativas consideradas, Alternativas consideradas, Alternativas consideradas (+21 more)

### Community 19 - "trades-table.tsx"
Cohesion: 0.12
Nodes (24): RFC-4180, Checkbox(), getResult(), QUALITY_TAGS, qualityOf(), RESULT_LABELS, SESSION_CFG, shortAccount() (+16 more)

### Community 20 - "page.tsx"
Cohesion: 0.10
Nodes (27): fmt(), FocusSession(), ALL_TYPES, ProgresoSections(), ResourceFromDB, TYPE_COLORS, ResourceFromDB, ReviewFromDB (+19 more)

### Community 21 - "ai-context.ts"
Cohesion: 0.13
Nodes (18): computeProgressPct(), computeResourceStatus(), applyStudyFinish(), minutesThisWeek(), pickStudySuggestion(), ResourceProgressLite, ResourceProgressUpdate, startOfWeekUTC() (+10 more)

### Community 22 - "send-review.ts"
Cohesion: 0.13
Nodes (28): POST(), USER_SELECT, GET(), computeDisciplineScore(), EmailSender, DigestDeps, MONTHS, periodKey() (+20 more)

### Community 23 - "tab-portfolio.tsx"
Cohesion: 0.07
Nodes (30): Card(), CardProps, ChartTooltip(), TooltipPayload, GoalProgressWidget(), GoalProgressWidgetProps, GoalRingProps, KpiSummary (+22 more)

### Community 24 - "page.tsx"
Cohesion: 0.15
Nodes (16): JumpItem, MonthJumpIndex(), labelFor(), MonthFilter, MONTHS_LONG, MONTHS_SHORT, ReviewsCalendarFilter(), Overview (+8 more)

### Community 25 - "monthly-reviews.ts"
Cohesion: 0.06
Nodes (48): MonthlyReport, WeeklyReport, EmailAttachment, emailFailureMessage(), sendEmail(), SendEmailArgs, SendEmailResult, ensureReviewAnalysis() (+40 more)

### Community 26 - "review-card.tsx"
Cohesion: 0.11
Nodes (24): CardEquityChart(), Campaign(), disciplineColor(), fmtMoney(), GRADE_TONE, pnlColor(), ReviewCard(), ReviewFromDB (+16 more)

### Community 27 - "improvement-service.ts"
Cohesion: 0.11
Nodes (26): clamp01(), computeImprovementScore(), costOfIndiscipline(), DEFAULT_WEIGHTS, Driver, ImprovementInputs, ImprovementResult, ImprovementWeights (+18 more)

### Community 28 - "report-data.ts"
Cohesion: 0.21
Nodes (11): buildKpis(), buildMonthlyReport(), kpisOf(), ReportTrade, sessionsOf(), buildWeeklyReport(), DAY_LABELS, kpisOf() (+3 more)

### Community 29 - "page.tsx"
Cohesion: 0.15
Nodes (11): CAT_COLOR, CAT_LABELS, CATS, FORM_INIT, MarketForm, MarketItem, MarketModal(), MercadosPage() (+3 more)

### Community 30 - "utils.ts"
Cohesion: 0.06
Nodes (40): Stat(), DOW, HoyTab(), TOUR_STEPS, AccountHistoryModal(), EVENT_META, Log, BROKERS (+32 more)

### Community 31 - "page.tsx"
Cohesion: 0.15
Nodes (23): AccountsIntel(), amt(), AnalyticsPage(), Edges(), fmt(), GoalRow(), Goals(), Institutional (+15 more)

### Community 32 - "analytics-bundle.ts"
Cohesion: 0.11
Nodes (30): AccountIntel, AnalyticsBundle, buildAnalyticsBundle(), EmotionIntel, holdMinutes(), MarketIntel, round1(), round2() (+22 more)

### Community 33 - "weekly-reviews.ts"
Cohesion: 0.17
Nodes (18): MetricRow(), MetricRowProps, SESSION_COLOR, SESSION_SHORT, TradeDetailPanelProps, getResult(), RESULT_CFG, SESSION_CFG (+10 more)

### Community 34 - "learning-insights-service.ts"
Cohesion: 0.17
Nodes (16): ErrorCard, ErrorCardInput, ErrorTrade, generateErrorCards(), PerfSignal, computeTransfer(), mean(), TransferInput (+8 more)

### Community 35 - "feature-models.ts"
Cohesion: 0.08
Nodes (38): CoachAgentOptions, AiProvider, detectProvider(), getCoachModel(), getProviderKey(), getWeeklySummaryModel(), resolveModel(), AI_FEATURES (+30 more)

### Community 36 - "page.tsx"
Cohesion: 0.07
Nodes (29): Period, useDashboardStats(), DashboardPage(), Tab, TABS, VALID_PERIODS, EMOTION_LABELS, PERIODS (+21 more)

### Community 37 - "condition-group.tsx"
Cohesion: 0.14
Nodes (16): CMP_LABEL, ConditionGroup(), Group, isLeaf(), isNot(), newLeaf(), NotNode, ENUM (+8 more)

### Community 38 - "playbook-service.ts"
Cohesion: 0.13
Nodes (24): Window, detectSetupDrift(), DriftDimension, DriftDimensionKey, DriftInput, DriftResult, DriftTrade, mean() (+16 more)

### Community 39 - "send-learning-digest.ts"
Cohesion: 0.18
Nodes (15): ARCHIVE_REASONS, formatMinutes(), MenuItem(), MenuItemProps, progressColor(), progressLabel(), relativeTime(), ResourceCard() (+7 more)

### Community 40 - "risk-of-ruin.ts"
Cohesion: 0.15
Nodes (20): Band, jeffreysBand(), Bottleneck, mean(), PassOutcome, percentile(), projectPhasePass(), PropProjectionResult (+12 more)

### Community 41 - "Hardening 2026-06-10 (P&L, enforcement, CI/migraciones, rendimiento)"
Cohesion: 0.33
Nodes (6): [2026-06-10] · Hardening: P&L, enforcement, CI/migraciones y rendimiento, Fixed — financiero (core), Fixed — UX / reglas, Infra / CI / migraciones, Performance, Tests

### Community 42 - "engine.ts"
Cohesion: 0.06
Nodes (63): metadata, viewport, ADV_ROLES, CreatorModal(), iconBtn, labelStyle, PaletteStudio(), NOTE: applying the theme on mount / mode-change is intentionally NOT done here. (+55 more)

### Community 43 - "page.tsx"
Cohesion: 0.05
Nodes (34): PromotePhaseModal(), RawAccount, COLORS, DbSetup, Direction, DirectionChip(), FORM_INIT, HealthStatus (+26 more)

### Community 44 - "bayes.ts"
Cohesion: 0.11
Nodes (26): betaBinomialEstimate(), betacf(), BetaPrior, betaQuantile(), cohensH(), DEFAULT_BETA_PRIOR, DEFAULT_NORMAL_PRIOR, DirectionalEstimate (+18 more)

### Community 45 - "seed-psych-trades.mjs"
Cohesion: 0.13
Nodes (21): ACCOUNTS, between(), buildTrade(), c, cols, DRY, EMO_LOSS, EMO_WIN (+13 more)

### Community 47 - "route.ts"
Cohesion: 0.19
Nodes (18): dupKey(), POST(), storedKey(), toDirection(), DryRunResponse, CTRADER_COLS, detectFormat(), parseCtraderDate() (+10 more)

### Community 48 - "resolveAiCall"
Cohesion: 0.13
Nodes (25): POST(), PERIODS, POST(), AnalyticsAiOptions, buildContext(), streamAnalyticsInsights(), windowFor(), ChatMessage (+17 more)

### Community 49 - "simple-table.tsx"
Cohesion: 0.21
Nodes (14): RetirosTable(), AppToaster(), SimpleColumn, ColumnMeta, loadJSON(), multiSelectFilter(), @tanstack/react-table, useDataTable() (+6 more)

### Community 50 - "institutional-summary.ts"
Cohesion: 0.14
Nodes (19): EquityDrawdownChart(), fmt(), fmt(), RDistributionChart(), analyzeDrawdown(), daysBetween(), DrawdownPoint, DrawdownResult (+11 more)

### Community 51 - "overview.ts"
Cohesion: 0.13
Nodes (20): InsightCategory, InsightSeverity, buildPeriodSummary(), CATEGORY_TAG, downsample(), loadPatterns(), loadReviewsOverview(), money() (+12 more)

### Community 52 - "event-bus.ts"
Cohesion: 0.15
Nodes (13): DispatchResult, DomainEventRecord, EventHandler, EventStatus, EventTransition, HandlerOutcome, handlers, PublishInput (+5 more)

### Community 53 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+12 more)

### Community 54 - "types.ts"
Cohesion: 0.18
Nodes (14): ACTION_TYPES, ActionDeps, ActionResult, Handler, HANDLERS, runAction(), compare(), evaluate() (+6 more)

### Community 55 - "register-trade-modal.tsx"
Cohesion: 0.09
Nodes (26): AccountLike, computeAutoTag(), computeContracts(), EMOTION_OPTIONS, EmotionBefore, ERROR_FIELD_ORDER, INITIAL, isSelectableSetup() (+18 more)

### Community 56 - "edge-service.ts"
Cohesion: 0.16
Nodes (16): computeInstrumentEdges(), EdgeVerdict, InstrumentEdge, InstrumentEdgeResult, InstrumentTrade, mean(), computeTagEdges(), mean() (+8 more)

### Community 57 - "intervention-service.ts"
Cohesion: 0.15
Nodes (18): ActionKind, clamp01(), DayState, decideIntervention(), DecisionOpts, detectInterventions(), FatigueState, InterventionCandidate (+10 more)

### Community 58 - "motion.ts"
Cohesion: 0.11
Nodes (22): DAYS, EditionHeader(), EditionHeaderData, money(), TONE, Pattern, PatternCards(), TONE (+14 more)

### Community 59 - "ConditionNode"
Cohesion: 0.35
Nodes (11): RuleDraft, ProposedRule, PROTECTION_TEMPLATE_MAP, ProtectionTemplate, ExecutableRuleInput, AutomationTemplate, ConditionNode, RuleAction (+3 more)

### Community 60 - "markdown.tsx"
Cohesion: 0.08
Nodes (31): AiCoachDrawer(), ApiError, clampPos(), formatTime(), Message, SUGGESTED, TOOL_LABELS, useIsMobile() (+23 more)

### Community 61 - "behavior.ts"
Cohesion: 0.18
Nodes (15): block(), canEnforce(), proposeRuleForCommitment(), RuleSuggestionProposal, suggestRuleForInsight(), carryOverCommitments(), dismissProposedCommitment(), listProposedCommitments() (+7 more)

### Community 62 - "emit.ts"
Cohesion: 0.18
Nodes (12): CreateAction, IconTab(), MobileBottomBar(), NavItem, useReducedMotion(), OnboardingWelcome(), Cmd, CommandPalette() (+4 more)

### Community 63 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, eslint-config-next, jsdom, @playwright/test, react-email, tailwindcss, @tailwindcss/postcss (+10 more)

### Community 64 - "data-table.tsx"
Cohesion: 0.16
Nodes (17): AnimatedItem(), AnimatedList(), DataTable(), gridTemplate(), RovingItemProps, Row(), ROW_PAD, TableSkeleton() (+9 more)

### Community 65 - "automations.ts"
Cohesion: 0.15
Nodes (12): 1. Contexto y estado real verificado (2026-07-13), 2. Gate OI-1 — informe de no-mapeo con datos reales (CERRADO 2026-07-13), 3. Fase 1 — Flip (ops, sin código), 4. Fase 2 — Retiro de `automations` (rama `feat/g2-rules-cutover`), 5. Testing y verificación, 6. Rollback y riesgos, Engine, G2 — Cutover de enforcement a `rules` y retiro de `automations` (+4 more)

### Community 66 - "ai-config.ts"
Cohesion: 0.18
Nodes (13): ConnectivityResult, testProviderConnectivity(), decryptApiKey(), encryptApiKey(), EncryptionConfigError, getEncryptionKey(), maskApiKey(), rotateEncryptionKey() (+5 more)

### Community 67 - "ai-coach-drawer.tsx"
Cohesion: 0.22
Nodes (8): DeskItem(), MobileClock(), NAV, NavItem, Sidebar(), SURFACE_NAV, useMinuteClock(), useWindowWidth()

### Community 68 - "psychology-service.ts"
Cohesion: 0.19
Nodes (15): calibration(), CheckinInput, CheckinResult, checkinVerdict, clamp(), LABEL, MoodSample, MoodTrendResult (+7 more)

### Community 69 - "risk-service.ts"
Cohesion: 0.22
Nodes (14): aggregateExposure(), AggregateFreezeInput, aggregateFreezeSignal, CorrelationResult, Direction, OpenPosition, SymbolExposure, asDrawdownModel() (+6 more)

### Community 70 - "today-service.ts"
Cohesion: 0.22
Nodes (14): RiskBudget, assembleTodayFeed(), detectDailyAnomaly(), SignalInput, TodayItem, getIgnoreCounts(), recordIgnore(), getTodayFeed() (+6 more)

### Community 71 - "commitment-service.ts"
Cohesion: 0.16
Nodes (17): CommitmentWindow, getVerifier(), isKnownEventType(), KNOWN, publishEvent(), acceptProposedCommitment(), createCommitmentFromInsight(), CreateCommitmentOverrides (+9 more)

### Community 72 - "gen-theme-css.mjs"
Cohesion: 0.23
Nodes (14): accentContrastFor(), clamp01(), contrastRatio(), derivePalette(), hexToRgb(), linearToSrgb(), okl(), oklchToHex() (+6 more)

### Community 73 - "coach-service.ts"
Cohesion: 0.27
Nodes (9): Lang, EmailPrefRow, isEmailChannelEnabled(), EmitOptions, inQuietHours(), localHHMM(), passesPreferences(), PrefRow (+1 more)

### Community 74 - "page.tsx"
Cohesion: 0.08
Nodes (32): Chip(), ImportCsvModal(), MarketItem, TradesPage(), ENERGY_LABELS, LogSessionPopover(), MOOD_LABELS, RatingBar() (+24 more)

### Community 75 - "risk-engine.ts"
Cohesion: 0.13
Nodes (30): buildAccountStats(), checkTrailingDrawdown(), assertTradeable(), autoUnlock(), EnforceableAccount, evaluateAndLock(), hasAnyLimit(), loadAccountRisk() (+22 more)

### Community 76 - "page.tsx"
Cohesion: 0.11
Nodes (7): AI_PROVIDERS, COLORBLIND_OPTIONS, PerfilPage(), SESSIONS, TIMEZONES, SUPPORTED_CURRENCIES, USD_VALUE

### Community 77 - "rolling-window.ts"
Cohesion: 0.16
Nodes (21): calmarRatio(), computeRiskRatios(), Kelly, kellyCriterion(), kellyFromR, mean(), rollingRiskRatios(), sortinoRatio() (+13 more)

### Community 78 - "apply.ts"
Cohesion: 0.22
Nodes (8): G2 Fase 2 — Retiro de `automations` · Implementation Plan, Global Constraints, Task 1: Engine solo-`runRules` (borrar flag/dispatcher/runAutomations), Task 2: Helpers puros de escritura de reglas (`rule-write.ts`, TDD), Task 3: Router `rules` a paridad ejecutable, Task 4: UI `/reglas` → `trpc.rules.*`, Task 5: Borrar automations router, dual-write e informe de migración, Task 6: Validación final, docs y push

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
Cohesion: 0.12
Nodes (15): 10. Fuera de alcance (YAGNI / POST), 11. Resumen de decisiones confirmadas, 1. Objetivo y valor, 2. Estado actual (de qué partimos), 3. Decisión arquitectónica — Snapshot (Approach A), 4.1 Nueva tabla `PropFirmPreset` (data de referencia GLOBAL, no per-usuario), 4.2 Campos nuevos en `Account` (los que faltan), 4.3 Migración (+7 more)

### Community 83 - "route.ts"
Cohesion: 0.14
Nodes (15): POST(), Provider, rateLimiter, testAnthropicKey(), testOpenAIKey(), testOpenRouterKey(), PERIODS, POST() (+7 more)

### Community 84 - "ai-models-card.tsx"
Cohesion: 0.15
Nodes (12): AiModelsCard(), ALL_TOOL_MODELS, COST_OPTIONS, FEATURE_LABEL, inputStyle, looksToolIncapable(), Provider, PROVIDER_LABEL (+4 more)

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
Cohesion: 0.38
Nodes (5): COPY, RuleModeBadge(), Badge(), BadgeProps, badgeVariants

### Community 90 - "emotion-feedback.ts"
Cohesion: 0.23
Nodes (9): EmotionInsight(), LABELS, EmotionFeedback, EmotionStat, EmotionTrade, feedbackForEmotion(), round1(), ADR-0002 (+1 more)

### Community 91 - "commitment-machine.ts"
Cohesion: 0.23
Nodes (10): canCommit(), CommitmentSpec, CommitmentStatus, Comparator, deriveCommitmentSpec(), evaluateResult(), INSIGHT_SPECS, partialBand() (+2 more)

### Community 92 - "memory-episode-service.ts"
Cohesion: 0.18
Nodes (19): extractTradeId(), POST(), secretsMatch(), BASE, decayedSalience(), initialSalience(), MemoryEventType, recallScore() (+11 more)

### Community 93 - "engine.ts"
Cohesion: 0.47
Nodes (5): fmt(), Improvement, ImprovementPanel(), REGIME_LABEL, scoreColor()

### Community 94 - "unification.ts"
Cohesion: 0.13
Nodes (14): Global Constraints, POST-6 — Prop-Firm Rulebase (moat) Implementation Plan, Self-Review, Task 10: UI — dashboard prop-firm panel shows the new rules, Task 11: Full verification + push, Task 1: Migration — `prop_firm_presets` table + new `Account` fields (dual), Task 2: Engine — `checkTrailingDrawdown`, Task 3: Engine — `checkConsistency` (+6 more)

### Community 95 - "resolve-provider.ts"
Cohesion: 0.40
Nodes (5): ACTION_LABEL, ActionList(), ALL, TAG_ACTIONS, RuleActionType

### Community 96 - "tab-playbook.tsx"
Cohesion: 0.36
Nodes (6): checklistColor(), getWeekKey(), HEALTH_CONFIG, LifecycleSuggestions(), sessionCellColor(), TabPlaybook()

### Community 97 - "useLogout.ts"
Cohesion: 0.38
Nodes (6): LoginPage(), useLogout(), clearSessionStorageKeys(), SESSION_SCOPED_STORAGE_KEYS, STORAGE_KEYS, createClient()

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
Cohesion: 0.25
Nodes (7): isValidSelection(), COLOR_SCHEMES, DEFAULT_GRAINS, preferencesRouter, TABLE_DENSITIES, THEMES, UpdatePreferencesInput

### Community 102 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, e2e, e2e:ui, email, gen:theme, lint (+3 more)

### Community 103 - "Trading Journal — capa cognitiva sobre el bróker"
Cohesion: 0.18
Nodes (11): 📚 Documentación, El núcleo cognitivo, 📁 Estructura, Fundamentos transversales, 🧭 Invariantes (ningún sprint los rompió), 🧠 La tesis, Las 5 superficies cognitivas, ✨ Qué hace (+3 more)

### Community 104 - "setup-intelligence-panel.tsx"
Cohesion: 0.31
Nodes (8): EdgeEvolutionChart(), fmt(), Windows, DECAY_META, Drift, driftValue(), fmt(), SetupIntelligencePanel()

### Community 105 - "tag-chip.tsx"
Cohesion: 0.18
Nodes (15): blankDraft(), CATEGORY_SUGGESTIONS, COLOR_PRESETS, DISPLAY_MODES, EtiquetasPage(), ICON_PRESETS, TagRow, SelectableTagChip() (+7 more)

### Community 106 - "risk-ratios.ts"
Cohesion: 0.50
Nodes (3): money(), PeriodSummary(), Summary

### Community 107 - "accounts.ts"
Cohesion: 0.60
Nodes (3): PracticeToggle(), PracticeScopeState, usePracticeScope

### Community 108 - "createClient"
Cohesion: 0.50
Nodes (4): buildContext(), ContextAccount, ContextTrade, mondayOf()

### Community 109 - "layout.tsx"
Cohesion: 0.14
Nodes (14): 0. Alcance de la congelación, 10. Analytics (FREEZE — subsistema), 12. Trazabilidad: cómo este freeze cierra los hallazgos, 13. Qué desbloquea la implementación (puerta de salida), 1. Principios (FREEZE-P), 2. Módulos (mapa físico), 3. Bounded contexts y fronteras (FREEZE-D, parte 1), 6. Memoria (FREEZE — subsistema) (+6 more)

### Community 110 - "palette-studio.tsx"
Cohesion: 0.13
Nodes (15): [2026-06-05] · AI config, migraciones y consolidación documental, [2026-07-13] · G2 — cutover de reglas: `rules` es la única fuente, Added, Changed, Changelog — Trading Journal v2, Fixed, [Phase 0-1] — Fundación y aprendizaje, [Sprint 4] — Psicología, reviews y personalización. (+7 more)

### Community 111 - "pattern-detector.ts"
Cohesion: 0.09
Nodes (39): buildTraderContext(), RawAccountRow, RawLearningRow, RawMarketRow, RawReviewRow, RawRuleRow, RawSessionRow, RawSetupRow (+31 more)

### Community 113 - "package.json"
Cohesion: 0.22
Nodes (8): engines, node, name, packageManager, pnpm, onlyBuiltDependencies, private, version

### Community 115 - "risk-budget.ts"
Cohesion: 0.29
Nodes (6): clamp01(), computeRiskBudget(), DailyWindow, DailyWindowInput, RiskBudgetInput, RiskOverview

### Community 116 - "leverage.ts"
Cohesion: 0.15
Nodes (13): 1. EXECUTIVE SUMMARY, 2. HALLAZGOS CRÍTICOS (los que mueven la aguja), 5. RIESGOS DE PRODUCTO, 6. OPORTUNIDADES DE DIFERENCIACIÓN, 7. ROADMAP PRIORIZADO, 8. TOP 50 MEJORAS ORDENADAS POR ROI, AUDITORÍA DE PRODUCTO — Trading Journal v2, Equipo simulado: PM SaaS-trading · Prop trader · Trading psychologist · UX researcher · Behavioral designer · AI product lead · Staff architect (+5 more)

### Community 117 - "discipline-service.ts"
Cohesion: 0.13
Nodes (14): (a) Números de firma marcados `-- VERIFY`, ✅ ACTUALIZACIÓN (2026-07-10, cont.): a/b resueltos, c bloqueado por entorno, ✅ ACTUALIZACIÓN (2026-07-10): la UI de Tasks 9 y 10 ya está implementada, (b) Rojo del e2e en CI antes de la corrida de QA, Deploy / migración, ⚠️ Dos confirmaciones pendientes del usuario (heredadas del plan), Handoff QA — POST-6 Prop-Firm Rulebase, ⛔ (Histórico) BLOQUEANTE de UI — RESUELTO por `71154ac` (+6 more)

### Community 118 - "prop-firm-guard.ts"
Cohesion: 0.17
Nodes (13): buildPropFirmStatus(), checkConsistency(), checkDailyLossLimit(), checkLossLimit(), checkSymbolAllowlist(), checkTradeCountLimit(), LOSS_LIMIT_TYPE, LossLimitPeriod (+5 more)

### Community 120 - "seed.ts"
Cohesion: 0.29
Nodes (7): ensureTagRows(), ensureTagsSeeded(), SYSTEM_APPEARANCE, SystemTagDef, systemTagDefs(), QUALITY_TAGS, VIOLATION_TAGS

### Community 121 - "goal-progress-widget.tsx"
Cohesion: 0.17
Nodes (14): buildCognitiveDigest(), DigestInput, DigestResult, DetectedPattern, detectPatterns(), EpisodeForPattern, PATTERN_TEXT, PatternStatus (+6 more)

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

### Community 128 - "ai-insights-panel.tsx"
Cohesion: 0.17
Nodes (12): 3.10 Etiquetas, 3.11 Mercados, 3.1 Dashboard, 3.2 Trades (journaling), 3.3 Psicología, 3.4 Playbook, 3.5 Reviews, 3.6 Aprendizaje (+4 more)

### Community 130 - "note-tag-suggestions.tsx"
Cohesion: 0.47
Nodes (4): NoteTagSuggestions(), RULES, suggestTagsFromNote(), TagRule

### Community 131 - "mae-mfe.ts"
Cohesion: 0.40
Nodes (5): analyzeMaeMfe(), EMPTY, MaeMfeResult, MaeMfeTrade, mean()

### Community 133 - "reinforcement.ts"
Cohesion: 0.40
Nodes (5): CommitmentResult, planReinforcement(), positiveIsVisible(), ReinforcementKind, ReinforcementPlan

### Community 134 - "email-theme.ts"
Cohesion: 0.53
Nodes (5): resolveTheme(), accentHex(), hx(), resolveEmailThemeFor(), ThemePrefs

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

### Community 147 - "segmented-tabs.tsx"
Cohesion: 0.18
Nodes (11): 1. Checklist de QA pendiente de V3, 2. Ops pendientes (acción del usuario, sin código), 3. Deuda técnica, 4. Backlog, 5. Roadmap reservado, 6. Prompt de retoma de sesión, Descripciones originales (§5, estado SUPERADO por §9), Gaps de `AUDIT_FINAL.md` (+3 more)

### Community 149 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

### Community 196 - "Project Guide — Trading Journal v3.2"
Cohesion: 0.20
Nodes (10): 1. ¿Qué es?, 2. ¿Qué NO es?, 3. Usuarios objetivo, 4. Módulos y rutas, 5. Stack, 6. Mapa de código, 7. Dónde está todo, Lo que v3 y v3.2 añadieron (+2 more)

### Community 197 - "add-edit-resource-modal.tsx"
Cohesion: 0.17
Nodes (16): ResourceFromDB, useResourceActions(), AddEditResourceModal(), ResourceFromDB, SetupImpactModal(), LinkSetupModal(), AprendizajePage(), ResourceFromDB (+8 more)

### Community 199 - "4. HALLAZGOS DEL AI COACH (sección central)"
Cohesion: 0.33
Nodes (6): 4.1 Qué hace actualmente (exacto, leído del código), 4.2 Qué debería hacer (faltante), 4.3 Nivel actual: **ÚTIL** (no Profesional, no Elite), 4.4 Capacidades críticas faltantes, 4.5 Cómo sería una versión 10x (coach + psicólogo + quant + mentor prop), 4. HALLAZGOS DEL AI COACH (sección central)

### Community 200 - "prop-firm-presets.ts"
Cohesion: 0.33
Nodes (5): DrawdownModel, FIRMS, Phase, PROP_FIRM_PRESETS, PropFirmPresetSeed

### Community 201 - "🚀 Cómo iniciar el proyecto"
Cohesion: 0.40
Nodes (5): 1. Clonar e instalar, 2. Variables de entorno, 3. Base de datos, 4. Levantar el dev server, 🚀 Cómo iniciar el proyecto

### Community 202 - "handler"
Cohesion: 0.60
Nodes (4): handler(), StatusSelect(), createTRPCContext(), AppRouter

### Community 204 - "rules.ts"
Cohesion: 0.11
Nodes (20): PROTECTION_TEMPLATES, ruleDataFromExecutableInput(), ruleDataFromTemplate(), BASE_TEMPLATES, PROTECTION_AS_AUTOMATION, TEMPLATE_MAP, TEMPLATES, classifyMode() (+12 more)

### Community 205 - "11. Clasificación de decisiones"
Cohesion: 0.50
Nodes (4): 11.1 Decisiones IRREVERSIBLES (revocar = nuevo freeze v3.2), 11.2 Decisiones REVERSIBLES (cambiables dentro del freeze, sin nuevo freeze), 11.3 Decisiones POSTERGADAS (no se deciden en v3.1; reservadas), 11. Clasificación de decisiones

### Community 209 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 210 - "4. Eventos (FREEZE-EV) — el sistema nervioso"
Cohesion: 0.67
Nodes (3): 4.1 Mecanismo congelado (FREEZE-D1 — resuelve ADR-001), 4.2 Catálogo de eventos congelado, 4. Eventos (FREEZE-EV) — el sistema nervioso

### Community 211 - "5. Entidades (FREEZE-E) — catálogo congelado"
Cohesion: 0.67
Nodes (3): 5.1 Enmiendas a entidades existentes, 5.2 Entidades nuevas, 5. Entidades (FREEZE-E) — catálogo congelado

## Knowledge Gaps
- **1143 isolated node(s):** `PALETTES`, `target`, `Instruments`, `TagEdges`, `Overview` (+1138 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **164 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `page.tsx` to `page.tsx`, `revisar-recurso-modal.tsx`, `review-report-shell.tsx`, `client.ts`, `Sidebar.tsx`, `trades-table.tsx`, `page.tsx`, `tab-portfolio.tsx`, `page.tsx`, `page.tsx`, `utils.ts`, `weekly-reviews.ts`, `page.tsx`, `send-learning-digest.ts`, `page.tsx`, `register-trade-modal.tsx`, `markdown.tsx`, `emit.ts`, `data-table.tsx`, `ai-coach-drawer.tsx`, `add-edit-resource-modal.tsx`, `position-log-modal.tsx`, `theme-provider.tsx`, `tab-playbook.tsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `trpc` connect `client.ts` to `page.tsx`, `revisar-recurso-modal.tsx`, `review-report-shell.tsx`, `Sidebar.tsx`, `page.tsx`, `page.tsx`, `tab-portfolio.tsx`, `page.tsx`, `page.tsx`, `utils.ts`, `page.tsx`, `page.tsx`, `engine.ts`, `page.tsx`, `register-trade-modal.tsx`, `markdown.tsx`, `ai-coach-drawer.tsx`, `add-edit-resource-modal.tsx`, `page.tsx`, `page.tsx`, `ai-models-card.tsx`, `tab-playbook.tsx`, `feed.ts`, `setup-intelligence-panel.tsx`, `tag-chip.tsx`, `trade-form-schema.ts`, `account-risk-panel.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `PALETTES`, `target`, `Instruments` to the rest of the system?**
  _1185 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08007013442431327 - nodes in this community are weakly interconnected._
- **Should `revisar-recurso-modal.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13043478260869565 - nodes in this community are weakly interconnected._
- **Should `trades.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.061495457721872815 - nodes in this community are weakly interconnected._