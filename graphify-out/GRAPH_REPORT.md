# Graph Report - Trading-journal-v2  (2026-11-05)

## Corpus Check
- 654 files · ~432,902 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 4, .css 2, .example 1)

## Summary
- 4728 nodes · 10833 edges · 662 communities (213 shown, 449 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 501 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2b85c3e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- theme/engine.ts
- POST-6 Prop-Firm Rulebase Spec
- emit.ts
- insights-engine.ts
- perfil/page.tsx
- react
- trades-table.tsx
- review-summary.tsx
- env
- isWin
- PracticeModal
- dependencies
- monthly-letter.tsx
- psychology-insights.ts
- register-trade-modal.tsx
- dispatchPending
- ai-coach-drawer.tsx
- index.ts
- notify.tsx
- page.tsx
- learning-resources.ts
- trade-write-service.ts
- analytics/page.tsx
- motion.ts
- trades.ts
- account-deletion.ts
- bayes.ts
- event-bus.ts
- memory-episode-service.ts
- dashboard/page.tsx
- mock-data/index.ts
- isWin
- root.ts
- send-learning-digest.ts
- send-review.ts
- lib/utils.ts
- risk-ratios.ts
- reglas/page.tsx
- types.ts
- next
- pipeline.ts
- feature-models.ts
- Check-in pre-sesión (go/caution/no_go)
- review-report-shell.tsx
- users
- src_lib_generated_prisma_client
- psychology-service.ts
- risk-of-ruin.ts
- dashboard-analytics.ts
- Trading Journal (producto)
- trades
- ai-config.ts
- overview.ts
- seed-psych-trades.mjs
- Analytics Subsystem
- route.ts
- page.tsx
- condition-group.tsx
- notification-bell.tsx
- compilerOptions
- framer-motion
- institutional-summary.ts
- ConditionNode
- trade-detail-panel.tsx
- edge-service.ts
- risk-engine.ts
- lib/utils.ts
- revisar-recurso-modal.tsx
- account-card.tsx
- commitment-service.ts
- rate-limiter.ts
- resolveAiCall
- next
- improvement-panel.tsx
- use-data-table.ts
- package.json
- ADR-003: Memory Privacy Boundary
- Trading Journal (project)
- types/index.ts
- today-service.ts
- Estructura de ficheros
- G2 Rules Cutover Design Spec
- ruleDataFromExecutableInput
- gen-theme-css.mjs
- apply.ts
- commitment-service.ts
- trade-detail-panel.tsx
- retiros/page.tsx
- Aprendizaje: historial, planes y recuperación
- setups
- Behavior Engine Subsystem
- Intervention Engine Subsystem
- Hardening: P&L, Enforcement, CI/Migrations and Performance (2026-06-10, PRs #6–#17)
- Documentation Consolidation (9 master docs + docs/archive/)
- rules.ts
- page.tsx
- page.tsx
- trajectory-panel.tsx
- risk-service.ts
- executeAiCall
- G2 — Rules Cutover: rules Is the Only Source (2026-07-13)
- mercados/page.tsx
- welch.ts
- psychology-insights.ts
- coach-memory-service.ts
- Coach Subsystem
- Memoria del coach (4 capas: episódica, semántica, identidad, mejora)
- Persona: Prop Firm Candidate
- 20260524063124_task_020_missing_fk_indexes.sql
- reviews/page.tsx
- today-feed.tsx
- ADR-001: Event Runtime and Delivery
- Supabase CLI Migrations System Reconciled (36 migrations, config.toml)
- review-insights.ts
- revisar-recurso-modal.tsx
- position-log-modal.tsx
- learning-insights-service.ts
- risk-enforcement.ts
- emotion-feedback.ts
- trade-detail-panel.tsx
- scripts
- Trade Service Layer (src/server/services/trades/)
- dashboardStats Server-Side Analytics (Sprint 2)
- resource-card.tsx
- DrawdownModel
- route.ts
- learning_resources
- learning-resources.ts
- Gate G2 — cutover de reglas (automations → rules)
- public.users
- pattern-detector.ts
- src_lib_generated_prisma_client_prisma
- 20260626120000_v3_s4_behavior_engine.sql
- Sprints 9-12 — Portfolio MVP, PWA, PDF, Onboarding (2026-06-04)
- Behavior Engine (insight → compromiso → regla → verificación → refuerzo)
- Event bus / outbox (publishEvent, dispatchPending, planEventTransition)
- Módulo Trades (/trades)
- FocusSession
- risk-budget.ts
- palette-studio.tsx
- preferences.ts
- Embedding Service (pgvector schedule/search/backfill)
- accounts.ts
- isPracticeType
- pdf-report-html.ts
- etiquetas/page.tsx
- review-card.tsx
- public.rule_suggestions
- backfill-embeddings.mjs
- data/prop-firm-presets.ts
- E2: Rule (unificado con Automation)
- Cognitive Engine (root bounded context)
- 20260625120000_v3_s0_outbox_and_insights.sql
- Mapa de ficheros
- monthly_reviews
- mae-mfe.ts
- insight-store.ts
- markdown.tsx
- Profile reliability and usability Implementation Plan
- handler()
- public.resource_reviews
- benchmark.ts
- pnl-heatmap.ts
- load-state.ts
- index.ts
- CI job: checks (type check, tests, build)
- BACKLOG.md (fuente del backlog; borrado, 2026-06-05)
- resource-grid.tsx
- vercel.json
- Practice repetition and self assessment Implementation Plan
- @supabase/ssr
- CLAUDE.md
- Invariante: bloqueo pre-trade real
- E4: LearningResource (+transferBaseline)
- emotion-feedback.ts
- 20260616140000_notifications.sql
- public.app_settings
- Ajustes (configuración, no es superficie cognitiva)
- ANALIZAR (superficie cognitiva)
- P3: Rigor honesto sobre muestras retail
- P4: Calma por defecto; la intervención es la única interrupción
- P5: El cerebro (Cognitive Engine) es independiente de la piel
- P7: Ningún insight muere como texto
- P9: Cada migración es reversible hasta verificación
- POST-7: A/B de variantes de setup (#50)
- Auditoría Técnica Exhaustiva (37 hallazgos)
- Stack: Next.js 16 + tRPC v11 + Prisma 7 + Supabase
- CoachMemory (commitments + fulfillment) proposal
- Notifications P0–P3 with Per-Category Preferences
- rules
- Tags Catalog (color/icon/category)
- Next.js Agent Rules (breaking-changes warning)
- 2026-11-01-learning-timezone-streak-clock.md
- src CLAUDE.md (includes AGENTS.md)
- src README (Next.js create-next-app)
- @anthropic-ai/sdk
- seed.ts
- Repetición y autoevaluación de prácticas
- 20260609192355_fix_advisor_security_and_performance.sql
- profile.ts
- commitment-machine.ts
- theme-provider.tsx
- Aprendizaje: racha, horas y reloj
- sonner
- user_ai_configs
- Status — Trading Journal v3.2
- Un fallo de IA se siente como un fallo, no como un cuelgue (2026-07-27, PR #174)
- puppeteer-core
- @radix-ui/react-checkbox
- public.memory_episodes
- @radix-ui/react-select
- @radix-ui/react-tabs
- @radix-ui/react-toggle-group
- ADR-000: Decisiones de raíz de Trading Journal v3.1
- ADR-004: Reserva de datos cross-user (BIZ-1)
- ARCHITECTURE_FREEZE.md (documento canónico v3.1)
- Analytics (subsistema, determinista)
- account_logs_user_id_idx
- email_log
- trade_stats_cache
- check-schema-drift.sh
- Behavior Engine (subsistema)
- Ampliación a seis corpus (2026-07-23, PRs #162-#166)
- Máquina de estados del Behavior Engine (ACTIVE→KEPT/PARTIAL/BROKEN/EXPIRED)
- @sentry/nextjs
- Lo que queda abierto
- BIZ-1: decisión de aislamiento de datos cross-user
- C1: coach reactivo (crítico auditoría)
- C2: sin memoria (crítico auditoría)
- C3: sin longitudinal (crítico auditoría)
- C4: métricas institucionales (crítico auditoría)
- C5: loop reviews abierto (crítico auditoría)
- C8: insights sin historiar (crítico auditoría)
- Coach (subsistema)
- lib/coach-bus.ts (helper cliente, no es el bus de dominio)
- Context Assembler (presupuesto de tokens)
- users.data_sharing_consent (flag de consentimiento opt-in)
- Qué se construyó
- Camino rápido (fast-path síncrono in-trade)
- Qué se construyó
- FREEZE-D1: Outbox transaccional + dispatcher
- FREEZE-D10: Context Assembler con presupuesto
- FREEZE-D11: write con confirmación explícita del coach
- Qué se construyó
- FREEZE-D12: router de modelos LLM
- FREEZE-D13: refuerzo de ratio variable + soporte de autonomía
- FREEZE-D14: override duro de capital
- FREEZE-D15: estadística Bayesiana/jerárquica con shrinkage
- FREEZE-D16: proyecciones prop no estacionarias (sin puntos sin banda)
- FREEZE-D17: causalidad etiquetada honestamente
- FREEZE-D18: régimen v3.0 = experimental
- FREEZE-D2: Cognitive Engine aislado
- FREEZE-D3: Analytics es puro y sin efectos
- FREEZE-D4: Behavior Engine es el dueño del loop
- FREEZE-D5: SLA de intervención redefinido (síncrono ≤2s)
- FREEZE-D6: el outbox es la única fuente de verdad
- FREEZE-D7: Commitment sólo se ofrece donde existe verificador
- FREEZE-D8: la fusión Rule/Automation es semántica
- Qué se construyó
- E1: Trade (enmienda: maeR/mfeR/regime/riskPct/checklistResultId)
- E10: RuleSuggestion
- E11: Intervention (severity/urgency/confidence/expectedImpact)
- E12: PreSessionCheckin
- E13: MemoryEpisode
- E14: MemoryPattern
- E15: MemoryIdentity
- E16: MemoryImprovement
- E17: CoachThread / CoachMessage
- E18: SetupEdgeSnapshot
- E19: ImprovementScore (snapshot)
- E2: Rule (unificado con Automation)
- E20: RiskBudget (derivado/persistido)
- E3: WeeklyReview / MonthlyReview
- E5: DomainEvent (outbox)
- E6: Insight (sampleSize, confidence/credibleInterval, effectSize)
- E7: Commitment
- E8: CommitmentCheck
- E9: Reinforcement (positive|corrective, ratio variable)
- EV1: trade.created
- EV10: intervention.responded
- EV2: trade.closed
- EV3: insight.created
- EV4: insight.resolved
- EV5: commitment.created
- EV6: commitment.kept / broken / partial
- EV7: rule.fired
- EV8: account.dd_breach / dd_approach
- EV9: checkin.submitted
- P1: La unidad de valor es el cambio de comportamiento verificado
- Verificado en producción
- P6: El LLM propone, los datos confirman
- P8: Privacidad y autonomía como diseño, no como add-on
- Verificado en producción
- HOY (superficie cognitiva)
- Intervention Engine (subsistema)
- Fórmula de scoring de intervención (priority = severity×urgency×confidence×expectedImpact×(1-fatiguePenalty))
- key-encryption.ts (cifrado credenciales de IA)
- Verificado en producción
- Memoria (subsistema, 4 capas)
- Riesgo: moat débil
- Verificado en producción
- OPERAR (superficie cognitiva)
- Outbox transaccional (patrón, DomainEvent)
- POST-1: Canal push realtime (websockets/SSE)
- POST-2: Coach multi-agente (orquestador + specialists)
- POST-3: Aprendizaje cross-user privacy-preserving (moat profundo)
- POST-4: Datos de mercado externos (régimen real, ATR)
- POST-5: Extracción del Cognitive Engine a servicio independiente
- POST-6: Base de reglas prop-firm como activo central (moat)
- Verificado en producción
- PROTEGER (superficie cognitiva)
- R6 / RI-3: pseudo-rigor (riesgo auditoría)
- RI-1: sin infraestructura de eventos (riesgo)
- RI-2: fusión de reglas (riesgo)
- RI-5: memoria poisoning (riesgo)
- RI-7: sobre-intervención (riesgo)
- Riesgo: reescritura a 24 meses
- Primitiva rollingWindow
- trading_sessions
- rules/engine.ts (bloqueo pre-trade real)
- Invariante: separación práctica/real
- Sprint 0 (S0)
- public.user_preferences
- v3/README.md
- Verifier (librería de verificadores insight→metricKey)
- Web App (Next.js fork, "la piel")
- AI Config, Migrations and Documentation Consolidation (2026-06-05)
- AI Provider Resolution Engine (lib/ai/resolve-provider.ts)
- tags
- automations
- First Direct dashboardStats Test (practice partition)
- Debt Closure Cycles 1/2 (render purity, a11y ARIA, TD-018/019/037 scoped)
- Multi-Type Accounts (prop-firm / real / demo / backtest) with Live Meters and Auto-Lock
- Formula Engine (Sprint 1)
- G2 — Rules Cutover: rules Is the Only Source (2026-07-13)
- GitHub Actions Updated Node 20 → 24 (checkout@v5, setup-node@v5, pnpm/action-setup@v5) (#13)
- Hardening: P&L, Enforcement, CI/Migrations and Performance (2026-06-10, PRs #6–#17)
- Learning System (spaced repetition, decay detection, materialized streak, email idempotency)
- GitHub Actions Secrets → migrate-deploy Job Green
- Negative Sign on Losses Fix (#17)
- Node Pinned to 20.12+ (.nvmrc + engines) (#7)
- Onboarding Checklist (4 steps, progress ring)
- custom_palette
- OpenRouter Key Save Fix (user_ai_configs missing in prod)
- 21 P0 QA Findings Resolved
- parsePointValue Helper
- PDF Export of Performance Report
- Phase 0-1 — Foundation and Learning
- P&L Point Value Fix on Manual Close (#14)
- Multi-Account Equity Curve + Comparison (Portfolio tab)
- preferences.get 401 on /login Fix (#9)
- public.monthly_goals
- public.interventions
- Psychology Fields + plan_notes Migration
- PWA (manifest + service worker, installable, offline read) + PNG icons
- QueryClient staleTime 30s + no refetch-on-focus + retry 1 (#10)
- public.pre_session_checkins
- public.improvement_scores
- rule-sync Dual-Write (retired)
- public.memory_patterns
- /api/cron/rules-migration-report (retired)
- RULES_SOURCE Flag (retired)
- Security/RLS, Auth, Data Correction (Phase 0-1)
- public.feed_ignores
- Sprint 4 — Psychology, Reviews and Personalization
- Sprint 5 — AI Config, Goals, planNotes, Pagination, UX, International Support
- Sprint 6 — System Theme, Review Filters, Sparklines, Type Safety, Security Hardening
- Sprint 7 — Reviews Hardening, Discipline Centralization, Infrastructure
- Sprint 8 — Testing, Accessibility, Monthly Reviews
- Sprints 1-3 — Foundation
- Sprints 9-12 — Portfolio MVP, PWA, PDF, Onboarding (2026-06-04)
- Stabilization Sprint — Manual QA Remediation (2026-06-03)
- TD-018 — Trade Services Extracted from trades Router (2026-07-14, PR #130)
- Prácticas en Aprendizaje — Implementation Plan
- Per-Provider 'Test Connection' Button (Anthropic/OpenAI/OpenRouter)
- Trade Read Service (list/violations/emotion/patterns)
- Trade Serializers Service
- Trade Service Layer (src/server/services/trades/)
- Trade Write Service (create/update/close/addEvent/delete/checklist)
- Index trades(user_id, status, date desc) (#11)
- trades.ts Router Slimdown (1146 → 180 LOC)
- 577/577 Unit Tests (12 new for pointValue/parsePointValue)
- user_ai_configs Table (encrypted AI keys)
- BehaviorLoopPanel (UI en /analytics)
- ai-context.ts
- CoachMemoryPanel / CoachMemoryLayers
- Write-tools del coach con permiso (propose_rule / propose_commitment)
- Bounded context cognitive/ (events, intervention, memory, coach)
- Rutas api/cron (recompute-insights, dispatch-events, evaluate-commitments, cognitive-digest, rules-migration-report)
- Módulo Cuentas (/cuentas)
- Módulo Dashboard (/dashboard)
- Estructura por dominios (src/domains/)
- Módulo Etiquetas (/etiquetas)
- FREEZE-P1 (principio congelado)
- Persona: Funded Trader
- Módulo IA Coach (drawer global)
- Intervention Engine (intervenciones en caliente)
- InterventionOverlay (overlay global)
- Módulo Mercados (/mercados)
- Next.js App Router + React (frontend)
- Módulo Perfil / Settings (/perfil)
- pg_cron (background jobs)
- pgvector (búsqueda semántica / embeddings)
- Módulo Playbook / Setups (/playbook)
- Prisma + PrismaPg (ORM)
- RECAP_V3_V32 (detalle sprint a sprint, en historial git)
- Recharts 3.x (charts)
- Módulo Reglas (/reglas)
- Resend (email)
- Persona: Retail Learner
- Módulo Retiros (/retiros)
- Módulo Reviews (/reviews)
- RiskBudgetMeter
- Rules engine (domains/rules — runRules, fuente única post-G2)
- Supabase (PostgreSQL 17 + Auth + Edge Functions)
- Persona: System Trader
- Feed HOY (TodayFeed)
- Trading Journal (producto)
- tRPC 11.x (API end-to-end types)
- Reglas unificadas enforce/warn (Rule)
- Flag tj.v3Shell (OFF por defecto)
- Superficies ANALIZAR / PROTEGER / MEJORAR
- Vercel (hosting app)
- Zod 4.x (validación)
- AUDIT_FINAL.md (auditoría final; §9 manda sobre §5)
- Gaps de AUDIT_FINAL (GAP-A/B/C/D/E)
- Backlog P1 — próximo v2.1 (B-01..B-05: iconos PWA, eslint CI, E2E Playwright, Sentry, carga 1000+ trades)
- Backlog P2 — deseable (B-06..B-10: charts en PDF, patrones en UI, onboarding fallback, SW cache bump, comparar reviews)
- Backlog P3 — oportunista (B-11..B-16: features IA, AiUsageLog, multi-divisa, API brokers, PWA móvil, social)
- BIZ-1 — aislamiento de datos cross-user (decisión de negocio)
- DataTable dev render loop (bug dev-only conocido)
- Check de drift SQL↔Prisma en CI (siguiente pieza; cierra S0/DT-4)
- Usuario demo/E2E ariaoc89@gmail.com (GH secret E2E_USER_PASSWORD)
- GAP-A1 — guard de presupuesto diario pre-trade (✅ PR #116)
- GAP-A2 — transferencia #31 + SRS #45 (✅ PR #118)
- GAP-A3 — migración real de rutas a 5 superficies (roadmap)
- GAP-A4 — origen de regla del loop en /reglas (✅ PR #119)
- GAP-B1 — historización de ImprovementScore (✅ PR #117, E19 + cron + curva)
- GAP-B2 — SetupEdgeSnapshot persistido (⏭️ omitido: la curva funciona al vuelo)
- GAP-C1 — detectores revenge/oversizing (✅ ya existían: detectLosingStreak/Oversizing/Emotion)
- GAP-C2 — disposition effect #40 (✅ ya existía: detectHoldingAsymmetry)
- Protección de contraseñas filtradas en Supabase Auth (toggle manual)
- OI-10.x (S10: edge de setup — drift, decay, A/B)
- OI-11.x (S11: edge por instrumento/tag, transferencia, SRS)
- OI-13.x (S13: feed HOY — telemetría, digest, realtime)
- OI-14.x (S14: ImprovementScore — snapshots, régimen, pesos)
- OI-3.x (S3: analítica institucional Bayesiana)
- OI-9.x (S9: motor de riesgo — ruina, proyección, budget)
- OPEN_ITEMS_SPRINT_N.md (17 ficheros, borrados; origen del checklist)
- OPENITEMS_CLOSEOUT_S0_S2.md (cierre S0–S2)
- Ops pendientes (acción del usuario, sin código)
- PENDING_AND_RESUME.md (fuente de ops y roadmap; borrado)
- POST-1 — realtime/SSE (disparador no activado)
- POST-2 — coach multiagente (disparador no activado)
- POST-3 — moat cross-user (disparador no activado)
- POST-4 — régimen exógeno ATR / datos de mercado (disparador no activado)
- POST-5 — extracción a servicio (disparador no activado)
- POST-7 — framework A/B (disparador no activado)
- PR #128 (merge de POST-6 prop-firm)
- PR #129 (cutover G2, mergeado 2026-07-13, a28df30)
- PR #130 (TD-018 trade-service, 2026-07-14)
- Checklist de QA pendiente de V3 (109 ítems)
- Prompt de retoma de sesión
- Roadmap reservado (apuestas con disparador propio, no iniciadas)
- Env var RULES_SOURCE (flip del cutover)
- run-rules.test.ts (invariante de no-regresión del bloqueo pre-trade)
- S0 open items (S0/OI-*, S0/DT-1..6, S0/R-1..6, S0/BIZ-1)
- S1 open items (migración de reglas: S1/OI-1..4, S1/DT-1..6, S1/R-1..3)
- S2 open items (captura de trade: S2/OI-1..5, S2/DT-1..5, S2/R-1..2)
- TD-037 — ~22 efectos sync-on-open (setState sincrónico en effect)
- TECHNICAL_DEBT.md (fuente de la deuda técnica; borrado, 2026-06-05)
- MyFundedFutures Preset (replacement firm)
- Ready-to-Paste Prompt — QA Playwright Run
- Ready-to-Paste Prompt — Complete UI (Tasks 9+10)
- Guard — cero referencias a prisma.automation/trpc.automations en src/
- Nota post-merge — borrar RULES_SOURCE de Vercel + smoke opcional
- Task 6 — Validación final, docs y push
- Self-review — 14 procedures del router cubiertos por T1-T7
- Stub deprecado 'stats' se queda en el router a propósito
- TD-018 Task 8 — Gates finales + docs + PR
- NoteTagSuggestions
- Approach B — Live FK Reference (rejected)
- Approach C — Snapshot + Update Notice (future enhancement)
- Catalog Seed v1 — 3 Anchor Firms
- learning-practices.md
- Confirmed Decisions Summary Table
- calcWinRate
- Sidebar.tsx
- Account.enforceMode WARN/ENFORCE
- analytics-cache.ts
- FREEZE-D13 (respect user autonomy in WARN mode)
- FTMO Preset Rules
- MyFundedFX Preset Rules
- tab-playbook.tsx
- Out of Scope / YAGNI Items
- Learning reminder time Implementation Plan
- Topstep Preset Rules
- Archivo P9 — tabla automations intacta
- Dual-write automations→rules
- Fase 1 — Flip (ops, sin código)
- Fase 2 — Retiro de automations
- 20261103050551_learning_practices.sql
- period-summary.tsx
- Gate OI-1 — informe de no-mapeo con datos reales
- intelligence-panel.tsx
- OI-5.1 — reglas del loop visibles en /reglas
- setup-intelligence-panel.tsx
- Prueba observable del flip (rules.last_fired_at bumps, automations quieto)
- analytics.ts
- Riesgo residual — divergencia semántica sutil de runRules
- Rollback fase 1 — quitar RULES_SOURCE (instantáneo)
- OI-4.8 — Cerrar los 3 loops de compromiso colgantes
- RULES_SOURCE env var
- S1/DT-5 — badge de modo lee rule.mode
- Fase 1 ejecutada y verificada en prod (Playwright + SQL, RULE_BLOCKED)
- learning-edge-recovery.md
- learning-session-lifecycle.md
- Verificación post-merge en prod (/reglas edita, BLOCK bloquea, last_fired_at bumps)
- add-edit-resource-modal.tsx
- Correcciones y organización de Perfil
- Review Focus
- email-theme.ts
- Bayesian Confidence Bands (shrinkage estimator)
- [trpc]/route.ts
- 20261105023500_durable_account_deletions.sql
- Cognitive Layer Thesis (v3)
- 5 Cognitive Surfaces (HOY · OPERAR · ANALIZAR · PROTEGER · MEJORAR)
- context.ts
- Mejoras de uso de Aprendizaje
- deriveCommitmentSpec
- Environment Variables (DATABASE_URL, Supabase keys, AI key, CRON_SECRET)
- Event Bus with Outbox (decoupled producers → consumers)
- resource-drawer.tsx
- @anthropic-ai/sdk
- Institutional Analytics (drawdown, R distribution, Sortino/Calmar/Kelly, MAE/MFE, benchmark, heatmap)
- Intervention Engine (deterministic)
- clsx
- Prácticas: consistencia del modal y protección de borrador
- Playbook Intelligence (edge decay with Welch significance, definition-vs-execution drift, rolling-window evolution, A/B variants)
- @radix-ui/react-checkbox
- docs/PROJECT_GUIDE.md (read-me-first: modules, stack, code map)
- 2026-11-03-learning-reminder-time-design.md
- Risk & Prop (ruin risk analytic + Monte Carlo, phase-pass projection, daily budget, multi-account correlation, withdrawal policy)
- docs/STATUS.md (state, pending QA checklist, debt, backlog, roadmap, resume prompt)
- Status: v3.1 Closed (14/14 sprints · 100% audit · 3 gates) + v3.2 In Progress (cognitive companion, 5 live axes)
- tj.v3Shell Feature Flag
- @radix-ui/react-dropdown-menu
- run-rules.test.ts (invariante de no-regresión)
- engines
- /api/cron/rules-migration-report (retirado en G2)
- rulesSourceIsUnified() (retirado en G2)
- AppShell.tsx
- rule-sync.ts (dual-write, retirado en G2)
- custom-palettes.ts
- automationsRouter (retirado en G2)
- Provider model catalog Implementation Plan
- mobile-bottom-bar.tsx
- rules.reorder (primer id = prioridad más alta, mapea 3..0)
- rules.seedDefaults (descriptivas de bienvenida)
- routers/notifications.ts
- Catálogo de modelos por proveedor
- 1. Checklist de QA pendiente de V3
- Recuperación semántica consolidada y citada por el Coach (2026-07-23, PR #161)
- Resiliencia de IA sobre el free tier (2026-07-24, PR #171)
- El outbox estrena consumidor: la S4 cierra (2026-07-24, PR #170)
- Auditoría S3–S14 contra código (2026-07-21) — clasificación en 3 pistas
- trade-derivation.ts
- coach-tool-audit.py
- drift.ts
- La palanca A estaba mal enunciada, y la BD lo desmintió (2026-07-27, spec + plan)

## God Nodes (most connected - your core abstractions)
1. `cn()` - 162 edges
2. `react` - 121 edges
3. `lucide-react` - 97 edges
4. `trpc` - 78 edges
5. `Button()` - 75 edges
6. `formatErrorForUser()` - 67 edges
7. `DialogContent()` - 47 edges
8. `DialogHeader()` - 46 edges
9. `DialogTitle()` - 46 edges
10. `Dialog` - 45 edges

## Surprising Connections (you probably didn't know these)
- `runRules()` --semantically_similar_to--> `runAutomations() (retirado en G2)`  [INFERRED] [semantically similar]
  src/domains/rules/engine.ts → docs/superpowers/specs/2026-07-13-g2-rules-cutover-design.md
- `Alcance` --references--> `main()`  [INFERRED]
  docs/learning-remaining-findings.md → scripts/coach-tool-audit.py
- `Verificación de cierre` --references--> `recomputeInsightsForUser()`  [INFERRED]
  docs/superpowers/specs/2026-07-17-oi4.8-commitment-loop-detectors-design.md → src/domains/analytics/insights/recompute-insights.ts
- `5. El contrato de exclusión` --references--> `AnalyticsTrade`  [INFERRED]
  docs/superpowers/specs/2026-07-27-captura-emocion-reconstruida-design.md → src/domains/analytics/services/insights-engine.ts
- `Al terminar` --references--> `bySymbolDate()`  [INFERRED]
  docs/superpowers/plans/2026-07-21-fixture-conductual-loop-e2e.md → src/domains/analytics/services/insights-engine.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI/CD antierrores pipeline** — _github_workflows_ci_checks, _github_workflows_ci_e2e, _github_workflows_ci_migrate_validate, _github_workflows_ci_migrate_deploy [EXTRACTED 1.00]

## Communities (662 total, 449 thin omitted)

### Community 0 - "theme/engine.ts"
Cohesion: 0.15
Nodes (21): Swatch(), accentContrastFor(), ATMOSPHERE_MEDIUM, ATMOSPHERE_STRONG, ATMOSPHERE_SUBTLE, bestContrastOn(), clamp01(), contrastRatio() (+13 more)

### Community 1 - "POST-6 Prop-Firm Rulebase Spec"
Cohesion: 0.08
Nodes (26): Deploy/Migration Flow (merge to main → CI applies migration), Local Validation Results (prisma generate, tsc, vitest 1176/1176, eslint), POST-6 Prop-Firm Rulebase Implementation Plan, Global Constraints, POST-6 — Prop-Firm Rulebase (moat) Implementation Plan, Self-Review, Task 1: Migration — prop_firm_presets + Account fields, Task 10: UI — dashboard prop-firm panel shows the new rules (+18 more)

### Community 2 - "emit.ts"
Cohesion: 0.10
Nodes (36): Task 2: code `INSIGHT_DETECTED` en el catálogo, ToastCard(), ToastCardProps, TypeStyle, isAppError(), toUserMessage(), TRPC_TO_CODE, LABELS (+28 more)

### Community 3 - "insights-engine.ts"
Cohesion: 0.17
Nodes (28): File Structure, Task 1: `detectRevengeTrading`, Task 2: `detectOversizing`, Task 3: `detectOffPlan`, Task 4: Round-trip + coverage guard (the loop actually closes), Task 5: Full verification + push, Task 2: Arreglar el ordenamiento de secuencia en insights-engine, 4.1 Por qué llevaba invisible (+20 more)

### Community 4 - "perfil/page.tsx"
Cohesion: 0.06
Nodes (42): AiModelsCard(), COST_OPTIONS, FEATURE_LABEL, inputStyle, persistedModelRef, persistedModels, Provider, PROVIDER_LABEL (+34 more)

### Community 5 - "react"
Cohesion: 0.06
Nodes (60): lucide-react, react, @trpc/client, EditablePlan, PlannedSessionActions(), formatPlanDate(), PlannedSessions(), ProfileClock() (+52 more)

### Community 6 - "trades-table.tsx"
Cohesion: 0.15
Nodes (24): RFC-4180, @tanstack/react-table, Checkbox(), CheckIcon(), EmptyTrades(), getResult(), QUALITY_TAGS, qualityOf() (+16 more)

### Community 7 - "review-summary.tsx"
Cohesion: 0.08
Nodes (50): ReviewEmailModel, buildLearningDigest(), daysBetween(), DigestInput, DigestModel, DigestReview, formatDateLabel(), isoDate() (+42 more)

### Community 8 - "env"
Cohesion: 0.05
Nodes (53): env, name, runs-on, steps, concurrency, cancel-in-progress, group, env (+45 more)

### Community 9 - "isWin"
Cohesion: 0.12
Nodes (28): buildTraderContext(), buildKpis(), kpisOf(), kpisOf(), CoachToolName, explainState(), PERIOD_DAYS, PROTECTION_TO_METRIC (+20 more)

### Community 10 - "PracticeModal"
Cohesion: 0.14
Nodes (14): 5. La tool del Coach y el viaje de una cita, PracticesTab(), PracticeWeekSummary(), useResourceActions(), handleEditOpen(), handleOpen(), PracticeModal(), ask() (+6 more)

### Community 11 - "dependencies"
Cohesion: 0.04
Nodes (49): @hookform/resolvers, katex, @prisma/adapter-pg, @prisma/client, puppeteer-core, @radix-ui/react-dialog, @radix-ui/react-select, @radix-ui/react-tabs (+41 more)

### Community 12 - "monthly-letter.tsx"
Cohesion: 0.15
Nodes (13): Corrección de los hallazgos de Fase 4 y re-verificación (2026-07-22), Defectos encontrados y corregidos, El hallazgo principal: la captura psicológica es lo que enciende la maquinaria, `embeddings`: roto en silencio, en tres capas, Fase 4 — features de IA, Fase 5 — superficies analíticas, recorridas, Lo que esto NO prueba, Lo que NO se pudo verificar (+5 more)

### Community 14 - "psychology-insights.ts"
Cohesion: 0.16
Nodes (24): Captura de emoción con procedencia — Plan de implementación, Estructura de ficheros, Global Constraints, Notas de método para quien ejecute, Task 1: Migración y columna, Task 2: El contrato de exclusión de correlación, Task 4: El componente `EmotionCapture`, Task 5: Superficie A — el trade cerrado deja de esconder el campo (+16 more)

### Community 15 - "register-trade-modal.tsx"
Cohesion: 0.06
Nodes (33): PromotePhaseModal(), RawAccount, EditTradeModalProps, AccountLike, computeAutoTag(), computeContracts(), ERROR_FIELD_ORDER, INITIAL (+25 more)

### Community 16 - "dispatchPending"
Cohesion: 0.21
Nodes (14): Global Constraints, 1. Punto de partida (verificado contra código y prod), 2. Objetivo, 3. Decisión de arquitectura: inyección de handlers (opción B), 4.2 Handler de notificación — `insight.created`, 4. Los dos consumidores, 6. Re-agendar el cron, 7. Lo que NO se maneja, a propósito (+6 more)

### Community 17 - "ai-coach-drawer.tsx"
Cohesion: 0.10
Nodes (22): AiCoachDrawer(), handleKeyDown(), regenerate(), sendMessage(), streamReply(), ApiError, CiteCard(), clampPos() (+14 more)

### Community 18 - "index.ts"
Cohesion: 0.09
Nodes (32): DisciplineParams, calcNetPnl(), calcAvgR(), calcExpectancyR(), AiUsageLog, AnalyticsCache, AnalyticsInput, AnalyticsOutput (+24 more)

### Community 19 - "notify.tsx"
Cohesion: 0.15
Nodes (19): Task 5: El día vivo dispara la decisión de intervención, ActionKind, clamp01(), DayState, decideIntervention(), DecisionOpts, detectInterventions(), FatigueState (+11 more)

### Community 20 - "page.tsx"
Cohesion: 0.11
Nodes (23): ChecklistEditor(), COLORS, DbSetup, Direction, DirectionChip(), FORM_INIT, HealthStatus, KpiBox() (+15 more)

### Community 21 - "learning-resources.ts"
Cohesion: 0.12
Nodes (19): detectDecayedResources(), ResourceForDecay, computeNextReview(), Grade, SrsInput, SrsResult, updateEase(), LearningResourceInput (+11 more)

### Community 22 - "trade-write-service.ts"
Cohesion: 0.11
Nodes (31): TD-018 Task 5 — Write service: create, TD-018 Task 6 — Write service: update + close, TD-018 Task 7 — Write service: addEvent + delete + saveChecklistResult, Quién escribe la procedencia, BudgetGuardInput, BudgetGuardResult, evaluateBudgetGuard(), invalidateCache() (+23 more)

### Community 23 - "analytics/page.tsx"
Cohesion: 0.13
Nodes (37): AccountsIntel(), amt(), AnalyticsPage(), Bar(), EdgeBadge(), Edges(), Empty(), fmt() (+29 more)

### Community 24 - "motion.ts"
Cohesion: 0.10
Nodes (30): framer-motion, CardEquityChart(), DAYS, EditionHeader(), money(), TONE, Pattern, TONE (+22 more)

### Community 25 - "trades.ts"
Cohesion: 0.20
Nodes (19): Refactor behavior-preserving (RouterOutputs y schemas zod intactos), Sustituciones mecánicas (ctx.prisma→prisma, ctx.userId→userId, ctx.supabase→supabase), Task 1: Serializers, TD-018 Task 4 — Read service (list/violaciones/emoción/patrones), Task 12: `trades.byId`, Task 3: Procedencia posicional y ventana, en servidor, RawAccount, RawTrade (+11 more)

### Community 26 - "account-deletion.ts"
Cohesion: 0.18
Nodes (13): dynamic, maxDuration, POST(), buckets, completed, defaults, Dependencies, pending (+5 more)

### Community 27 - "bayes.ts"
Cohesion: 0.11
Nodes (26): betaBinomialEstimate(), betacf(), BetaPrior, betaQuantile(), cohensH(), DEFAULT_BETA_PRIOR, DEFAULT_NORMAL_PRIOR, DirectionalEstimate (+18 more)

### Community 28 - "event-bus.ts"
Cohesion: 0.19
Nodes (13): Task 4: `dispatchPending` por inyección + claim restringido, DispatchResult, DomainEventRecord, EventStatus, EventTransition, HandlerOutcome, KNOWN, PublishInput (+5 more)

### Community 29 - "memory-episode-service.ts"
Cohesion: 0.17
Nodes (20): Task 3: `recordEpisodeOnce` idempotente, 4.1 Handler de memoria — `commitment.created`, `commitment.broken`, 5. Idempotencia (at-least-once → un evento puede reprocesarse), CommitmentShape, describeCommitment(), EPISODE_FOR, memoryHandler(), BASE (+12 more)

### Community 30 - "dashboard/page.tsx"
Cohesion: 0.05
Nodes (55): recharts, Card(), CardProps, ChartTooltip(), TooltipPayload, CircleProgress(), GoalProgressWidget(), GoalProgressWidgetProps (+47 more)

### Community 31 - "mock-data/index.ts"
Cohesion: 0.15
Nodes (12): Task 5: Part B — `Rule.sourceCommitmentId` FK (dual migration), mockAccounts, mockMarkets, mockResources, mockReviews, mockRules, mockSetups, mockTrades (+4 more)

### Community 32 - "isWin"
Cohesion: 0.12
Nodes (24): AccountIntel, AnalyticsBundle, buildAnalyticsBundle(), EmotionIntel, holdMinutes(), MarketIntel, round1(), round2() (+16 more)

### Community 33 - "root.ts"
Cohesion: 0.11
Nodes (30): @trpc/server, zod, recordIgnore(), Context, protectedProcedure, publicProcedure, router, t (+22 more)

### Community 34 - "send-learning-digest.ts"
Cohesion: 0.07
Nodes (39): dynamic, maxDuration, POST(), dynamic, maxDuration, POST(), ADR-0001, dynamic (+31 more)

### Community 35 - "send-review.ts"
Cohesion: 0.08
Nodes (43): @react-email/render, dynamic, maxDuration, POST(), USER_SELECT, localHour(), EMAIL_CHANNEL, EmailPrefRow (+35 more)

### Community 36 - "lib/utils.ts"
Cohesion: 0.07
Nodes (74): Task 9: UI — preset picker + enforceMode toggle, ResourcePicker(), PlanSessionModal(), HistoryItem, SessionHistory(), AddEditResourceModal(), ResourceFromDB, SetupImpactModal() (+66 more)

### Community 37 - "risk-ratios.ts"
Cohesion: 0.17
Nodes (21): computeRiskRatios(), Kelly, kellyCriterion(), KellyFromR, kellyFromR(), mean(), rollingRiskRatios(), sortinoRatio() (+13 more)

### Community 38 - "reglas/page.tsx"
Cohesion: 0.23
Nodes (10): ACTION_LABEL, ExecRuleRow, ReglasPage(), RemindersTab(), SystemRulesTab(), TABS, Template, TRIGGER_LABEL (+2 more)

### Community 39 - "types.ts"
Cohesion: 0.14
Nodes (16): Task 1 — Engine solo-runRules (borrar flag/dispatcher/runAutomations), Test de no-regresión 'G2 cutover invariant', ACTION_TYPES, ActionDeps, ActionResult, Handler, HANDLERS, runAction() (+8 more)

### Community 40 - "next"
Cohesion: 0.07
Nodes (37): next, maxDuration, POST(), runtime, POST(), Provider, rateLimiter, maxDuration (+29 more)

### Community 41 - "pipeline.ts"
Cohesion: 0.05
Nodes (74): Auto-revisión del plan, Estructura de ficheros, Global Constraints, PR 1 — El módulo `retrieval` (sin UI), PR 2 — Re-cableado, PR 3 — Citas abribles y deep-link, Recuperación semántica consolidada + citación en el Coach — Plan de implementación, Task 10: `aiConfig.indexStatus` + `aiConfig.reindex` (+66 more)

### Community 42 - "feature-models.ts"
Cohesion: 0.08
Nodes (38): AiProvider, detectProvider(), getCoachModel(), getProviderKey(), getWeeklySummaryModel(), resolveModel(), AI_FEATURES, AI_PROVIDERS_LIST (+30 more)

### Community 44 - "review-report-shell.tsx"
Cohesion: 0.06
Nodes (75): Task 6: Superficie B — la review semanal deja de dar una instrucción sin salida, 1. El problema, corregido contra la BD, 2. Qué entrega esta pieza, y qué no, 3. Decisiones tomadas y por qué, 4. Modelo de datos, 5. El contrato de exclusión, 6. Superficies, 7. Verificación (+67 more)

### Community 45 - "users"
Cohesion: 0.20
Nodes (14): account_logs, account_logs_account_idx, accounts, accounts_user_idx, handle_new_user(), markets, on_auth_user_created, users (+6 more)

### Community 46 - "src_lib_generated_prisma_client"
Cohesion: 0.07
Nodes (51): computeDisciplineScore(), DisciplineDetail, DisciplinePeriod, DisciplineResult, calcDisciplineScore(), DisciplineBreakdown, emailFailureMessage(), ensureReviewAnalysis() (+43 more)

### Community 47 - "psychology-service.ts"
Cohesion: 0.17
Nodes (20): calibration(), CheckinInput, CheckinResult, CheckinVerdict, checkinVerdict(), clamp(), LABEL, avg() (+12 more)

### Community 48 - "risk-of-ruin.ts"
Cohesion: 0.15
Nodes (21): Band, jeffreysBand(), Bottleneck, mean(), PassOutcome, percentile(), projectPhasePass(), PropProjectionResult (+13 more)

### Community 49 - "dashboard-analytics.ts"
Cohesion: 0.08
Nodes (44): Partición practice (financiero excluye DEMO_PERSONAL/DEMO_PROP/BACKTEST; discipline las cuenta), TD-018 Task 3 — Dashboard service + primer test de orquestación, dashboard-service.test.ts (partición practice), setCachedStats(), AccountBalance, AccountExposure, AccountLimits, AccountStat (+36 more)

### Community 51 - "trades"
Cohesion: 0.13
Nodes (13): trades, trades_account_idx, trades_user_date_idx, trade_events, trade_events_trade_id_idx, idx_trades_notes_embedding, idx_trades_plan_notes_embedding, idx_trade_events_notes_embedding (+5 more)

### Community 52 - "ai-config.ts"
Cohesion: 0.14
Nodes (20): 8. Observabilidad, decryptApiKey(), encryptApiKey(), EncryptionConfigError, getEncryptionKey(), maskApiKey(), rotateEncryptionKey(), fetchProviderModels() (+12 more)

### Community 53 - "overview.ts"
Cohesion: 0.13
Nodes (20): InsightCategory, InsightSeverity, buildPeriodSummary(), CATEGORY_TAG, downsample(), loadPatterns(), loadReviewsOverview(), money() (+12 more)

### Community 54 - "seed-psych-trades.mjs"
Cohesion: 0.11
Nodes (25): dotenv, pg, dotenv@^17.4.2, pg@^8.21.0, ACCOUNTS, between(), buildTrade(), c (+17 more)

### Community 56 - "route.ts"
Cohesion: 0.18
Nodes (18): dupKey(), POST(), storedKey(), toDirection(), DryRunResponse, CTRADER_COLS, detectFormat(), parseCtraderDate() (+10 more)

### Community 57 - "page.tsx"
Cohesion: 0.12
Nodes (21): Task 10: UI — dashboard panel shows new rules, Task 3: Engine — checkConsistency, Task 4: Engine — checkWeekendHolding, Task 5: Engine — phaseProgress, Task 8: Wire checks into dashboard status + ENFORCE lock, POST-6 Prop-Firm Rulebase Design Spec, PropFirmStatus, checkConsistency() (+13 more)

### Community 58 - "condition-group.tsx"
Cohesion: 0.15
Nodes (17): CMP_LABEL, ConditionGroup(), Group, isGroup(), isLeaf(), isNot(), LeafEditor(), newLeaf() (+9 more)

### Community 59 - "notification-bell.tsx"
Cohesion: 0.15
Nodes (16): react-dom, NotificationBell(), CenterPanel(), CenterSheet(), formatNotifTime(), NotificationItem(), NotificationItemProps, TYPE_STYLE (+8 more)

### Community 60 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 61 - "framer-motion"
Cohesion: 0.21
Nodes (14): AnimatedItem(), AnimatedList(), DataTable(), DefaultEmpty(), gridTemplate(), RovingItemProps, Row(), ROW_PAD (+6 more)

### Community 62 - "institutional-summary.ts"
Cohesion: 0.19
Nodes (14): analyzeDrawdown(), daysBetween(), DrawdownPoint, DrawdownResult, EMPTY, EquityPoint, InstitutionalSummary, InstitutionalTrade (+6 more)

### Community 63 - "ConditionNode"
Cohesion: 0.21
Nodes (16): Task 5 — Borrar automations router, dual-write e informe de migración, RuleDraft, ProposedRule, RuleSuggestionProposal, PROTECTION_TEMPLATE_MAP, PROTECTION_TEMPLATES, ProtectionTemplate, AutomationTemplate (+8 more)

### Community 64 - "trade-detail-panel.tsx"
Cohesion: 0.07
Nodes (29): ADR-000 — Decisiones de raíz de Trading Journal v3.1, ADR-001 — Runtime de eventos y entrega, ADR-002 — Estrategia estadística, ADR-003 — Privacidad de la memoria y frontera anti-corrupción, ADR-004 — Reserva de datos cross-user (BIZ-1), Alternativas consideradas, Alternativas consideradas, Alternativas consideradas (+21 more)

### Community 65 - "edge-service.ts"
Cohesion: 0.17
Nodes (16): computeInstrumentEdges(), EdgeVerdict, InstrumentEdge, InstrumentEdgeResult, InstrumentTrade, mean(), computeTagEdges(), mean() (+8 more)

### Community 66 - "risk-engine.ts"
Cohesion: 0.19
Nodes (14): calmarRatio(), AccountRisk, AccountRiskInput, computeAccountRisk(), gauge(), LimitGauge, lossPct(), maxDrawdownFromPnl() (+6 more)

### Community 67 - "lib/utils.ts"
Cohesion: 0.09
Nodes (29): DOW, HoyTab(), TOUR_STEPS, KpiBox(), AccountHistoryModal(), SyncBalanceModal(), CuentasPage(), STATUS_FILTER_OPTIONS (+21 more)

### Community 68 - "revisar-recurso-modal.tsx"
Cohesion: 0.12
Nodes (24): ALL_TYPES, Card(), ProgresoSections(), ResourceFromDB, TYPE_COLORS, ResourceFromDB, ReviewFromDB, calcPreviewNextReview() (+16 more)

### Community 69 - "account-card.tsx"
Cohesion: 0.19
Nodes (18): ACCOUNT_STATUS_META, AccountCard(), AccountExposure, AccountRisk, formatSyncAgo(), isPropFirmLike(), RawAccount, TradeStats (+10 more)

### Community 70 - "commitment-service.ts"
Cohesion: 0.12
Nodes (30): Task 7: Commitment persistido y regla enlazada (linkRule), Fase 3 — El loop conductual, CommitmentWindow, block(), canEnforce(), proposeRuleForCommitment(), suggestRuleForInsight(), getVerifier() (+22 more)

### Community 71 - "rate-limiter.ts"
Cohesion: 0.16
Nodes (14): @supabase/supabase-js, createRateLimiter(), InMemoryRateLimiter, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW, RateLimiter, buildPracticePrompt(), generatePracticeResponse() (+6 more)

### Community 72 - "resolveAiCall"
Cohesion: 0.11
Nodes (31): Task 5: cadena gratuita + composición en `usableCandidates`, 10. Criterios de éxito, 1. Punto de partida (verificado contra código y prod, 2026-07-24), 2. Objetivo y no-objetivos, 3. Arquitectura: un ejecutor, un comportamiento, 4. La cadena de modelos gratuitos, 5. Clasificación del error y política de reintento, 7. Lo que NO se maneja, a propósito (+23 more)

### Community 73 - "next"
Cohesion: 0.42
Nodes (6): LoginPage(), handleSubmit(), useLogout(), clearSessionStorageKeys(), SESSION_SCOPED_STORAGE_KEYS, createClient()

### Community 74 - "improvement-panel.tsx"
Cohesion: 0.47
Nodes (5): fmt(), Improvement, ImprovementPanel(), REGIME_LABEL, scoreColor()

### Community 75 - "use-data-table.ts"
Cohesion: 0.16
Nodes (17): RetirosTable(), StatusSelect(), AppToaster(), ROW_PAD, SimpleColumn, SimpleRow(), ColumnMeta, loadJSON() (+9 more)

### Community 76 - "package.json"
Cohesion: 0.06
Nodes (43): eslint, eslint-config-next, jsdom, @playwright/test, prisma, react-email, tailwindcss, @tailwindcss/postcss (+35 more)

### Community 78 - "Trading Journal (project)"
Cohesion: 0.12
Nodes (16): 1. Clonar e instalar, 2. Variables de entorno, 3. Base de datos, 4. Levantar el dev server, 🚀 Cómo iniciar el proyecto, 📚 Documentación, El núcleo cognitivo, 📁 Estructura (+8 more)

### Community 79 - "types/index.ts"
Cohesion: 0.14
Nodes (13): MarketForm, AccountStatus, DashboardStats, MarketCategory, QualityTag, SerializedAccount, SerializedLearningResource, SerializedSetup (+5 more)

### Community 80 - "today-service.ts"
Cohesion: 0.14
Nodes (21): KIND_ICON, severityColor(), TodayFeed(), RiskBudget, AnomalyInput, AnomalyResult, assembleTodayFeed(), BASE (+13 more)

### Community 81 - "Estructura de ficheros"
Cohesion: 0.18
Nodes (16): Auto-revisión del plan, Estructura de ficheros, Primer consumidor S4 del outbox — Plan de implementación, Task 1: `commitment_created` en `MemoryEventType`, Task 5: handler de memoria (`commitment.*`), Task 6: handler de notificación (`insight.created`), Task 7: composición (`HANDLERS`) + wiring del endpoint, Task 8: re-agendar el cron (+8 more)

### Community 83 - "G2 Rules Cutover Design Spec"
Cohesion: 0.22
Nodes (8): G2 Fase 2 — Retiro de `automations` · Implementation Plan, Global Constraints, Task 1: Engine solo-`runRules` (borrar flag/dispatcher/runAutomations), Task 2: Helpers puros de escritura de reglas (`rule-write.ts`, TDD), Task 3: Router `rules` a paridad ejecutable, Task 4: UI `/reglas` → `trpc.rules.*`, Task 5: Borrar automations router, dual-write e informe de migración, Task 6: Validación final, docs y push

### Community 84 - "ruleDataFromExecutableInput"
Cohesion: 0.23
Nodes (11): Task 2 — Helpers puros de escritura de reglas (rule-write, TDD), Task 3 — Router rules a paridad ejecutable, rule-write.test.ts, ExecutableRuleInput, ruleDataFromExecutableInput(), ruleDataFromTemplate(), classifyMode(), rules.createExecutable (+3 more)

### Community 85 - "gen-theme-css.mjs"
Cohesion: 0.09
Nodes (28): accentContrastFor(), clamp01(), contrastRatio(), derivePalette(), hexToRgb(), linearToSrgb(), okl(), oklchToHex() (+20 more)

### Community 86 - "apply.ts"
Cohesion: 0.18
Nodes (17): applyColorTheme(), clearInlineTokens(), injectInline(), LEGACY_KEYS, LEGACY_VARS, LS_CUSTOM_DARK, LS_CUSTOM_LIGHT, reapplyCustomForMode() (+9 more)

### Community 87 - "commitment-service.ts"
Cohesion: 0.10
Nodes (20): 0. Alcance de la congelación, 10. Analytics (FREEZE — subsistema), 12. Trazabilidad: cómo este freeze cierra los hallazgos, 13. Qué desbloquea la implementación (puerta de salida), 1. Principios (FREEZE-P), 2. Módulos (mapa físico), 3. Bounded contexts y fronteras (FREEZE-D, parte 1), 4.1 Mecanismo congelado (FREEZE-D1 — resuelve ADR-001) (+12 more)

### Community 88 - "trade-detail-panel.tsx"
Cohesion: 0.22
Nodes (14): TradeDetailPanelProps, getResult(), RESULT_CFG, SESSION_CFG, shortAccount(), TAG_CFG, TradeRow(), TradeRowProps (+6 more)

### Community 89 - "retiros/page.tsx"
Cohesion: 0.15
Nodes (13): @radix-ui/react-popover, DeleteCell(), fmtMoney(), FORM_INIT, KpiBox(), RetirosPage(), STATUS_META, STATUS_ORDER (+5 more)

### Community 90 - "Aprendizaje: historial, planes y recuperación"
Cohesion: 0.50
Nodes (3): Aprendizaje: historial, planes y recuperación, Compatibilidad de datos, Verificación

### Community 91 - "setups"
Cohesion: 0.16
Nodes (10): setups, "_ResourceSetups", _ResourceSetups_AB_unique, _ResourceSetups_B_index, idx_checklist_results_user, trade_checklist_results, setup_versions, setup_versions (+2 more)

### Community 96 - "rules.ts"
Cohesion: 0.12
Nodes (15): TEMPLATES, action, ACTION_TYPES, cmp, conditionNode, conditionValue, executableInput, leaf (+7 more)

### Community 97 - "page.tsx"
Cohesion: 0.12
Nodes (17): [2026-06-05] · AI config, migraciones y consolidación documental, [2026-07-13] · G2 — cutover de reglas: `rules` es la única fuente, [2026-07-14] · S0/DT-4 — drift check SQL↔Prisma en CI, [2026-07-14] · TD-018 — trade services extraídos del router `trades`, Added, Changed, Changelog — Trading Journal v2, Fixed (+9 more)

### Community 98 - "page.tsx"
Cohesion: 0.12
Nodes (16): 1. Problema, 2. Objetivo y no-objetivos, 3. Umbrales que el fixture debe cruzar, 5.1 Modelo de escenario, 5.2 Flujo que asserta el test de integración, 5. Arquitectura, 6.1 Self-check del generador, 6.2 Casos negativos (+8 more)

### Community 99 - "trajectory-panel.tsx"
Cohesion: 0.19
Nodes (13): Bead, BEAD, BEADS, buildChart(), fmtWeek(), HOVER, money(), Overview (+5 more)

### Community 100 - "risk-service.ts"
Cohesion: 0.15
Nodes (19): aggregateExposure(), AggregateFreezeInput, AggregateFreezeSignal, aggregateFreezeSignal(), CorrelationResult, Direction, OpenPosition, SymbolExposure (+11 more)

### Community 101 - "executeAiCall"
Cohesion: 0.06
Nodes (54): Auto-revisión del plan, Estructura de ficheros, Global Constraints, Resiliencia de IA sobre el free tier — Plan de implementación, Task 1: `AiCallError` y clasificación transitorio/permanente, Task 2: perfiles de reintento y backoff, Task 3: el ejecutor `executeAiCall`, Task 4: `chat.ts` y `coach-agent.ts` lanzan `AiCallError` (+46 more)

### Community 103 - "mercados/page.tsx"
Cohesion: 0.20
Nodes (10): CAT_COLOR, CAT_LABELS, CATS, FORM_INIT, MarketCard(), MarketItem, MercadosPage(), SESSION_COLORS (+2 more)

### Community 104 - "welch.ts"
Cohesion: 0.32
Nodes (11): mean(), oneSampleTTest(), sampleVariance(), studentTTwoSidedP(), TTestResult, welchTTest(), detectEdgeDecay(), EdgeDecayInput (+3 more)

### Community 105 - "psychology-insights.ts"
Cohesion: 0.25
Nodes (7): ACTION_LABEL, ALL, TAG_ACTIONS, LeafCondition, PRE_TRIGGERS, RuleActionType, TRIGGERS

### Community 106 - "coach-memory-service.ts"
Cohesion: 0.05
Nodes (64): clamp01(), computeImprovementScore(), costOfIndiscipline(), DEFAULT_WEIGHTS, Driver, ImprovementInputs, ImprovementResult, ImprovementWeights (+56 more)

### Community 110 - "20260524063124_task_020_missing_fk_indexes.sql"
Cohesion: 0.17
Nodes (6): rules_user_id_idx, setups_user_id_idx, trade_events_user_id_idx, trades_setup_id_idx, weekly_reviews_account_id_idx, trades_user_status_date_idx

### Community 111 - "reviews/page.tsx"
Cohesion: 0.12
Nodes (25): ResourceFromDB, EditionHeaderData, JumpItem, MonthJumpIndex(), PatternCards(), labelFor(), MonthFilter, MONTHS_LONG (+17 more)

### Community 112 - "today-feed.tsx"
Cohesion: 0.48
Nodes (5): AccountRiskPanel(), asPct(), BOTTLENECK, pct(), RiskBudgetMeter()

### Community 114 - "Supabase CLI Migrations System Reconciled (36 migrations, config.toml)"
Cohesion: 0.50
Nodes (4): Advisor Migration Made Replay-Safe (#11), add_color_theme_preferences Migration Name Aligned with Prod (#12), prisma.config.ts: Prisma Generates Client Only, Never Migrates, Supabase CLI Migrations System Reconciled (36 migrations, config.toml)

### Community 115 - "review-insights.ts"
Cohesion: 0.13
Nodes (15): 10. Fuera de alcance (YAGNI / POST), 11. Resumen de decisiones confirmadas, 1. Objetivo y valor, 2. Estado actual (de qué partimos), 3. Decisión arquitectónica — Snapshot (Approach A), 4.1 Nueva tabla `PropFirmPreset` (data de referencia GLOBAL, no per-usuario), 4.2 Campos nuevos en `Account` (los que faltan), 4.3 Migración (+7 more)

### Community 116 - "revisar-recurso-modal.tsx"
Cohesion: 0.14
Nodes (13): 1. Verificar que los intermedios siguen en disco, 2. Re-lanzar SOLO los chunks 01 y 04 (en paralelo, mismo mensaje), 3. Validar los 2 chunks nuevos, 4. Fusionar los 5 chunks (02+03+05 ya existentes + 01+04 nuevos) en `.graphify_semantic.json`, 5. Re-fusionar semantic + AST (`.graphify_extract.json`) y reconstruir el grafo completo, 6. Limpiar intermedios y commitear, Contexto de negocio (por si la máquina nueva no tiene memoria persistente), Cómo retomar (pasos exactos) (+5 more)

### Community 117 - "position-log-modal.tsx"
Cohesion: 0.17
Nodes (11): AccountRules, ADDABLE_TYPES, AddableType, CONTRACTS_TYPES, EVENT_COLORS, EVENT_DESCRIPTIONS, EVENT_LABELS, EventType (+3 more)

### Community 118 - "learning-insights-service.ts"
Cohesion: 0.18
Nodes (16): ErrorCard, ErrorCardInput, ErrorTrade, generateErrorCards(), PerfSignal, computeTransfer(), mean(), TransferInput (+8 more)

### Community 119 - "risk-enforcement.ts"
Cohesion: 0.22
Nodes (16): Task 2: Engine — checkTrailingDrawdown, TD-018 — extraer orquestación de trades.ts (1146 LOC) a service layer, Gate G2 (C6/FREEZE-D8), checkTrailingDrawdown(), assertTradeable(), autoUnlock(), evaluateAndLock(), hasAnyLimit() (+8 more)

### Community 120 - "emotion-feedback.ts"
Cohesion: 0.13
Nodes (15): (a) Números de firma marcados `-- VERIFY`, ✅ ACTUALIZACIÓN (2026-07-10, cont.): a/b resueltos, c bloqueado por entorno, ✅ ACTUALIZACIÓN (2026-07-10): la UI de Tasks 9 y 10 ya está implementada, (b) Rojo del e2e en CI antes de la corrida de QA, Deploy / migración, POST-6 QA Handoff, ⚠️ Dos confirmaciones pendientes del usuario (heredadas del plan), Handoff QA — POST-6 Prop-Firm Rulebase (+7 more)

### Community 121 - "trade-detail-panel.tsx"
Cohesion: 0.24
Nodes (10): MetricRow(), MetricRowProps, SESSION_COLOR, SESSION_SHORT, shouldOfferEmotionCapture(), TradeDetailPanel(), needsEmotionNudge(), EMOTION_BACKFILL_WINDOW_DAYS (+2 more)

### Community 122 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, dev, e2e, e2e:ui, email, gen:theme, lint (+4 more)

### Community 125 - "resource-card.tsx"
Cohesion: 0.12
Nodes (21): MASTERY_MAX, ARCHIVE_REASONS, formatMinutes(), MasteryRing(), MenuItem(), MenuItemProps, progressColor(), progressLabel() (+13 more)

### Community 126 - "DrawdownModel"
Cohesion: 0.20
Nodes (11): AccountRiskConfig, DerivedRiskInputs, deriveRiskInputs(), median(), pctToFraction(), PropProjectionInput, DrawdownModel, AccountPhase (+3 more)

### Community 127 - "route.ts"
Cohesion: 0.40
Nodes (5): Captura de emoción: IMPLEMENTADA y verificada en prod (2026-07-28, PRs #175 + #176), Los dos defectos que sólo aparecieron yendo a la BD (#176), Qué hay en producción, Verificado contra prod, no supuesto, Y uno que la suite no habría cazado nunca

### Community 128 - "learning_resources"
Cohesion: 0.27
Nodes (8): learning_resources, learning_resources_user_idx, idx_study_sessions_active, idx_study_sessions_resource, idx_study_sessions_user_started, study_sessions, idx_learning_resources_notes_embedding, idx_learning_resources_notes_embedding

### Community 129 - "learning-resources.ts"
Cohesion: 0.19
Nodes (19): Alcance y diagnóstico, effectiveStudyStartedAt(), minutesThisWeek(), pickStudySuggestion(), ResourceProgressLite, ResourceProgressUpdate, studyStreak(), StudySuggestion (+11 more)

### Community 131 - "public.users"
Cohesion: 0.36
Nodes (7): coach_memory_user_status_idx, coach_messages_thread_idx, coach_threads_user_idx, public.coach_memory, public.coach_messages, public.coach_threads, public.memory_identity

### Community 132 - "pattern-detector.ts"
Cohesion: 0.15
Nodes (13): 1. EXECUTIVE SUMMARY, 2. HALLAZGOS CRÍTICOS (los que mueven la aguja), 5. RIESGOS DE PRODUCTO, 6. OPORTUNIDADES DE DIFERENCIACIÓN, 7. ROADMAP PRIORIZADO, 8. TOP 50 MEJORAS ORDENADAS POR ROI, AUDITORÍA DE PRODUCTO — Trading Journal v2, Equipo simulado: PM SaaS-trading · Prop trader · Trading psychologist · UX researcher · Behavioral designer · AI product lead · Staff architect (+5 more)

### Community 133 - "src_lib_generated_prisma_client_prisma"
Cohesion: 0.29
Nodes (7): computeProgressPct(), computeResourceStatus(), applyStudyFinish(), Contribution, reviseSession(), revisionProgressDelta(), applyStudySessionProgress()

### Community 134 - "20260626120000_v3_s4_behavior_engine.sql"
Cohesion: 0.38
Nodes (9): commitment_checks_commitment_idx, commitment_checks_user_idx, commitments_source_insight_idx, commitments_user_status_idx, public.commitment_checks, public.commitments, public.reinforcements, reinforcements_commitment_idx (+1 more)

### Community 136 - "Behavior Engine (insight → compromiso → regla → verificación → refuerzo)"
Cohesion: 0.20
Nodes (10): Behavior Engine (insight → compromiso → regla → verificación → refuerzo), Memoria del coach (4 capas: episódica, semántica, identidad, mejora), Digest cognitivo semanal ('Tu semana cognitiva'), commitment-service (createCommitmentFromInsight / evaluateWindowCommitments / carryOverCommitments), ImprovementScore / Índice de mejora (0–100), Cron cognitive-digest sin agendar (/api/cron/cognitive-digest), GAP-E1 — memoria jerárquica de 4 capas E13–E16 (reclasificado a v3.2 roadmap), OI-4.x (S4: commitments / loop de comportamiento) (+2 more)

### Community 139 - "FocusSession"
Cohesion: 0.21
Nodes (13): fmt(), FocusSession(), finish(), persistTimer(), togglePause(), updateDraft(), ActiveStudySession, StudySessionState (+5 more)

### Community 140 - "risk-budget.ts"
Cohesion: 0.17
Nodes (11): Global Constraints, Self-Review, Task 0: Rama, Task 2: Embedding service, Task 3: Dashboard service + primer test de orquestación, Task 4: Read service (list / violaciones / emoción / patrones), Task 5: Write service — create, Task 6: Write service — update + close (+3 more)

### Community 141 - "palette-studio.tsx"
Cohesion: 0.16
Nodes (13): ADV_ROLES, CreatorModal(), iconBtn, labelStyle, PaletteStudio(), apply(), openCreate(), persist() (+5 more)

### Community 142 - "preferences.ts"
Cohesion: 0.25
Nodes (7): Al terminar, Fase 0 — Limpiar el ruido y fijar la línea base, Fase 2 — Volumen con patrón, por script, Fase 4 — Las 5 features de IA activas, Fase 5 — Superficies analíticas, Plan de simulación de trader profesional en aria, Principio rector: dos actividades distintas, no una

### Community 144 - "accounts.ts"
Cohesion: 0.17
Nodes (11): Task 7: Account input/serialization for new fields, ACCOUNT_STATUSES, ACCOUNT_TYPES, AccountInput, accountsRouter, ENFORCE_MODES, isPropFirmType(), PHASES (+3 more)

### Community 145 - "isPracticeType"
Cohesion: 0.50
Nodes (4): AccountReality, accountReality(), isPracticeType(), PRACTICE_TYPES

### Community 146 - "pdf-report-html.ts"
Cohesion: 0.36
Nodes (12): analysisHtml(), C, CALLOUT, calloutHtml(), card(), equitySvg(), esc(), kpiCell() (+4 more)

### Community 147 - "etiquetas/page.tsx"
Cohesion: 0.38
Nodes (8): SelectableTagChip(), SIZE, TagChip(), TagChipView(), DEFAULT, resolveTagMeta(), TagMeta, useTagCatalog()

### Community 148 - "review-card.tsx"
Cohesion: 0.15
Nodes (24): CardActions(), Chip(), Chips(), disciplineColor(), fmtMoney(), GRADE_TONE, Metric(), pnlColor() (+16 more)

### Community 149 - "public.rule_suggestions"
Cohesion: 0.36
Nodes (5): rules_source_automation_idx, rules_user_idx, public.rule_suggestions, rule_suggestions_insight_idx, rule_suggestions_user_status_idx

### Community 150 - "backfill-embeddings.mjs"
Cohesion: 0.15
Nodes (12): 1. Contexto y estado real verificado (2026-07-13), 2. Gate OI-1 — informe de no-mapeo con datos reales (CERRADO 2026-07-13), 3. Fase 1 — Flip (ops, sin código), 4. Fase 2 — Retiro de `automations` (rama `feat/g2-rules-cutover`), 5. Testing y verificación, 6. Rollback y riesgos, Engine, G2 — Cutover de enforcement a `rules` y retiro de `automations` (+4 more)

### Community 151 - "data/prop-firm-presets.ts"
Cohesion: 0.29
Nodes (6): Task 6: tRPC propFirmPresets.list + typed catalog, DrawdownModel, FIRMS, Phase, PROP_FIRM_PRESETS, PropFirmPresetSeed

### Community 153 - "Cognitive Engine (root bounded context)"
Cohesion: 0.17
Nodes (12): 3.10 Etiquetas, 3.11 Mercados, 3.1 Dashboard, 3.2 Trades (journaling), 3.3 Psicología, 3.4 Playbook, 3.5 Reviews, 3.6 Aprendizaje (+4 more)

### Community 154 - "20260625120000_v3_s0_outbox_and_insights.sql"
Cohesion: 0.43
Nodes (7): domain_events_dedupe_idx, domain_events_pending_idx, domain_events_user_idx, insights_active_fingerprint_idx, insights_user_status_idx, public.domain_events, public.insights

### Community 155 - "Mapa de ficheros"
Cohesion: 0.29
Nodes (6): Al terminar, Fixture conductual + validación del loop — Plan de implementación, Global Constraints, Mapa de ficheros, Task 1: El generador de escenarios y su self-check, Task 3: Los detectores disparan sobre el patrón y callan sin él

### Community 156 - "monthly_reviews"
Cohesion: 0.43
Nodes (5): monthly_reviews, monthly_reviews_updated_at, monthly_reviews_user_year_idx, update_monthly_reviews_updated_at(), idx_monthly_reviews_summary_embedding

### Community 158 - "mae-mfe.ts"
Cohesion: 0.40
Nodes (5): analyzeMaeMfe(), EMPTY, MaeMfeResult, MaeMfeTrade, mean()

### Community 159 - "insight-store.ts"
Cohesion: 0.11
Nodes (23): File Structure, Global Constraints, S0–S2 Audit Closure Implementation Plan, Self-Review, Task 1: Integration harness (config, isolation, guard, smoke), Task 2: persistInsights integration tests, Task 3: dispatchPending integration test, Task 4: Wire the integration suite into CI (+15 more)

### Community 160 - "markdown.tsx"
Cohesion: 0.17
Nodes (19): Block, CALLOUT, CALLOUT_ALIASES, Callout(), CalloutType, CODE_KEYWORDS, CodeBlock(), detectCallout() (+11 more)

### Community 161 - "Profile reliability and usability Implementation Plan"
Cohesion: 0.29
Nodes (6): Global Constraints, Profile reliability and usability Implementation Plan, Review Focus, Task 1: Backend independiente (TDD por agente), Task 2: Integración y Perfil (principal), Task 3: Verificación y entrega

### Community 162 - "handler()"
Cohesion: 0.18
Nodes (10): 10. Criterios de éxito, 1. Punto de partida: qué era falso y qué era cierto, 2. Objetivo, 3. Decisión de arquitectura: A′ — registro con consultas literales, 4. Consolidación: qué absorbe y qué se queda fuera, 6. Taxonomía de estados — el corazón del sprint, 7. Auto-reparación y estado visible, 8. Testing y verificación (+2 more)

### Community 163 - "public.resource_reviews"
Cohesion: 0.47
Nodes (3): public.resource_reviews, resource_reviews_resource_idx, resource_reviews_user_date_idx

### Community 164 - "benchmark.ts"
Cohesion: 0.50
Nodes (4): analyzeBenchmark(), BenchmarkResult, BenchmarkSetupRow, weightedComparison()

### Community 165 - "pnl-heatmap.ts"
Cohesion: 0.40
Nodes (3): DailyPnl, HeatmapDay, HeatmapResult

### Community 167 - "index.ts"
Cohesion: 0.40
Nodes (3): sendEmail(), sendPropFirmHealthAlert(), supabase

### Community 168 - "CI job: checks (type check, tests, build)"
Cohesion: 0.50
Nodes (4): CI job: checks (type check, tests, build), CI job: authenticated E2E (Playwright), CI job: migrate-deploy (apply migrations to production), CI job: migrate-validate (replay from scratch)

### Community 170 - "resource-grid.tsx"
Cohesion: 0.18
Nodes (14): CATEGORY_OPTIONS, ResourceGrid(), clearAdvanced(), clearFilters(), SORT_OPTIONS, SortKey, sortResources(), STATUS_OPTIONS (+6 more)

### Community 171 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

### Community 172 - "Practice repetition and self assessment Implementation Plan"
Cohesion: 0.29
Nodes (6): Global Constraints, Practice repetition and self assessment Implementation Plan, Review Focus, Task 1: Persistencia, Task 2: Interfaz, Task 3: Entrega

### Community 173 - "@supabase/ssr"
Cohesion: 0.40
Nodes (3): @supabase/ssr, @supabase/ssr@^0.10.3, config

### Community 177 - "emotion-feedback.ts"
Cohesion: 0.25
Nodes (9): EmotionInsight(), LABELS, EmotionFeedback, EmotionStat, EmotionTrade, feedbackForEmotion(), round1(), ADR-0002 (+1 more)

### Community 185 - "20260616140000_notifications.sql"
Cohesion: 0.53
Nodes (5): idx_notifications_user_created, idx_notifications_user_read, notification_preferences, notifications, uq_notifications_user_dedupe

### Community 188 - "public.app_settings"
Cohesion: 0.50
Nodes (3): public.app_setting(), public.app_settings, public.app_setting()

### Community 216 - "@anthropic-ai/sdk"
Cohesion: 0.20
Nodes (10): 1. ¿Qué es?, 2. ¿Qué NO es?, 3. Usuarios objetivo, 4. Módulos y rutas, 5. Stack, 6. Mapa de código, 7. Dónde está todo, Lo que v3 y v3.2 añadieron (+2 more)

### Community 217 - "seed.ts"
Cohesion: 0.33
Nodes (6): ensureTagsSeeded(), SYSTEM_APPEARANCE, SystemTagDef, systemTagDefs(), QUALITY_TAGS, VIOLATION_TAGS

### Community 218 - "Repetición y autoevaluación de prácticas"
Cohesion: 0.40
Nodes (4): Alternativas, Enfoque, Repetición y autoevaluación de prácticas, Validación

### Community 220 - "profile.ts"
Cohesion: 0.12
Nodes (24): handleExport(), collectProfileExport(), downloadProfileExport(), ExportPageInput, FetchPage, ProfileExportProgress, PROFILE_EXPORT_COVERAGE, PROFILE_EXPORT_EXCLUSIONS (+16 more)

### Community 221 - "commitment-machine.ts"
Cohesion: 0.09
Nodes (23): Task 4: La cadena pura hasta reinforcement, CommitmentResult, CommitmentSpec, CommitmentStatus, Comparator, evaluateResult(), INSIGHT_SPECS, partialBand() (+15 more)

### Community 222 - "theme-provider.tsx"
Cohesion: 0.15
Nodes (15): metadata, RootLayout(), viewport, ServiceWorkerRegister(), CYCLE, getSystemTheme(), ResolvedTheme, resolveTheme() (+7 more)

### Community 223 - "Aprendizaje: racha, horas y reloj"
Cohesion: 0.20
Nodes (8): Alcance, Cierre de hallazgos de Aprendizaje, Historial real, Verificación, Aceptación en Vercel (2026-11-01), Aprendizaje: racha, horas y reloj, Hallazgos de la primera entrega, Validación

### Community 224 - "sonner"
Cohesion: 0.20
Nodes (6): class-variance-authority, sonner, @types/pg, class-variance-authority@^0.7.1, sonner@^2.0.7, @types/pg@^8.20.0

### Community 225 - "user_ai_configs"
Cohesion: 0.83
Nodes (3): user_ai_configs, user_ai_configs_user_id_idx, user_ai_configs_user_id_provider_key

### Community 226 - "Status — Trading Journal v3.2"
Cohesion: 0.18
Nodes (11): 2. Ops pendientes (acción del usuario, sin código), 3. Deuda técnica, 4. Backlog, 5. Roadmap reservado, 6. Prompt de retoma de sesión, 7. Prompt: simulación de trader profesional en aria (Playwright) — ✅ EJECUTADA, Auditoría de la matemática de riesgo (2026-07-22), Auditoría de tool-use EN VIVO, con la señal ya limpia (2026-07-27) (+3 more)

### Community 227 - "Un fallo de IA se siente como un fallo, no como un cuelgue (2026-07-27, PR #174)"
Cohesion: 0.67
Nodes (3): El aviso que no existía, `totalBudgetMs` prometía un techo que no existía, Un fallo de IA se siente como un fallo, no como un cuelgue (2026-07-27, PR #174)

### Community 228 - "puppeteer-core"
Cohesion: 0.33
Nodes (6): 4.1 Qué hace actualmente (exacto, leído del código), 4.2 Qué debería hacer (faltante), 4.3 Nivel actual: **ÚTIL** (no Profesional, no Elite), 4.4 Capacidades críticas faltantes, 4.5 Cómo sería una versión 10x (coach + psicólogo + quant + mentor prop), 4. HALLAZGOS DEL AI COACH (sección central)

### Community 229 - "@radix-ui/react-checkbox"
Cohesion: 0.33
Nodes (6): [2026-06-10] · Hardening: P&L, enforcement, CI/migraciones y rendimiento, Fixed — financiero (core), Fixed — UX / reglas, Infra / CI / migraciones, Performance, Tests

### Community 230 - "public.memory_episodes"
Cohesion: 0.83
Nodes (3): idx_memory_episodes_embedding, memory_episodes_user_occurred_idx, public.memory_episodes

### Community 231 - "@radix-ui/react-select"
Cohesion: 0.50
Nodes (4): 11.1 Decisiones IRREVERSIBLES (revocar = nuevo freeze v3.2), 11.2 Decisiones REVERSIBLES (cambiables dentro del freeze, sin nuevo freeze), 11.3 Decisiones POSTERGADAS (no se deciden en v3.1; reservadas), 11. Clasificación de decisiones

### Community 232 - "@radix-ui/react-tabs"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 236 - "ARCHITECTURE_FREEZE.md (documento canónico v3.1)"
Cohesion: 0.25
Nodes (8): AI_COACH_V3.md, ANALYTICS_V3.md, ARCHITECTURE_CHALLENGE.md, BEHAVIOR_ENGINE_V3.md, DESIGN_SYSTEM_V3.md, ARCHITECTURE_FREEZE.md (documento canónico v3.1), OPEN_ITEMS_SPRINT_0, PRODUCT_MASTER_PLAN.md

### Community 245 - "@sentry/nextjs"
Cohesion: 0.22
Nodes (5): @sentry/nextjs, onRouterTransitionStart, onRequestError, register(), @sentry/nextjs@^10.66.0

### Community 350 - "AI Provider Resolution Engine (lib/ai/resolve-provider.ts)"
Cohesion: 0.40
Nodes (5): AI Diagnostics and Health Check (aiConfig.diagnostics, aiConfig.healthCheck, lib/ai/health-check.ts), Root Cause Fix: 'Configura ANTHROPIC_API_KEY' with OpenRouter Configured, AI Provider Resolution Engine (lib/ai/resolve-provider.ts), AI Coach, Weekly Cognitive Digest

### Community 355 - "Multi-Type Accounts (prop-firm / real / demo / backtest) with Live Meters and Auto-Lock"
Cohesion: 0.25
Nodes (6): Prop-Firm Drawdown + Limit Enforcement Unified (#6), Prop-Firm Rules Enforcement (Sprint 3), /reglas Edits rules — Executable Parity Router (builder, merged templates, reorder, badges), Rules Engine Enforcement (runRules-only), Temporal Locks No Longer Offer Manual Unlock (#17), Multi-Type Accounts (prop-firm / real / demo / backtest) with Live Meters and Auto-Lock

### Community 357 - "G2 — Rules Cutover: rules Is the Only Source (2026-07-13)"
Cohesion: 0.50
Nodes (4): G2 — Rules Cutover: rules Is the Only Source (2026-07-13), docs/ARCHITECTURE.md (canonical architecture, freeze v3.1 + ADRs, FREEZE-* IDs), docs/auditoria-producto-trading-journal-v2.md (binding audit, findings C1–C8), Behavior Engine

### Community 397 - "Prácticas en Aprendizaje — Implementation Plan"
Cohesion: 0.20
Nodes (9): Estado, Fase 1 — Registro útil de principio a fin, Fase 2 — Evidencias visuales, Fase 3 — Constancia e integración con Hoy, Fase 4 — Ayuda opcional del asistente, Global Constraints, Orden y criterio de salida, Prácticas en Aprendizaje — Implementation Plan (+1 more)

### Community 408 - "ai-context.ts"
Cohesion: 0.13
Nodes (23): Señal (híbrido), RawAccountRow, RawLearningRow, RawMarketRow, RawReviewRow, RawRuleRow, RawSessionRow, RawSetupRow (+15 more)

### Community 446 - "Reglas unificadas enforce/warn (Rule)"
Cohesion: 0.67
Nodes (3): Reglas unificadas enforce/warn (Rule), Gate G2 — cutover de reglas (automations → rules), OI-5.x (S5: insight→protección, reglas del loop)

### Community 551 - "NoteTagSuggestions"
Cohesion: 0.47
Nodes (4): NoteTagSuggestions(), RULES, suggestTagsFromNote(), TagRule

### Community 557 - "calcWinRate"
Cohesion: 0.21
Nodes (10): buildMonthlyReport(), MonthlyReport, ReportTrade, sessionsOf(), buildWeeklyReport(), DAY_LABELS, WeeklyReport, MonthlyReportBundle (+2 more)

### Community 558 - "Sidebar.tsx"
Cohesion: 0.21
Nodes (12): DeskItem(), MobileClock(), NAV, NavItem, Sidebar(), SURFACE_NAV, ThemeIcon(), useMinuteClock() (+4 more)

### Community 560 - "analytics-cache.ts"
Cohesion: 0.22
Nodes (5): CACHE_TTL_MS, CacheDb, CacheDelegate, CacheRow, getCachedStats()

### Community 570 - "tab-playbook.tsx"
Cohesion: 0.36
Nodes (8): checklistColor(), getWeekKey(), HEALTH_CONFIG, LifecycleSuggestions(), sessionCellColor(), SetupHealthDot(), TabPlaybook(), SetupHealthStatus

### Community 572 - "Learning reminder time Implementation Plan"
Cohesion: 0.29
Nodes (6): Global Constraints, Learning reminder time Implementation Plan, Review Focus, Task 1: Modelo y programación, Task 2: Perfil, Task 3: Entrega

### Community 583 - "20261103050551_learning_practices.sql"
Cohesion: 0.46
Nodes (7): learning_practices_resource_id_idx, learning_practices_user_id_date_id_idx, practice_attachments_practice_id_idx, practice_feedback_practice_id_created_at_idx, public.learning_practices, public.practice_attachments, public.practice_feedback

### Community 584 - "period-summary.tsx"
Cohesion: 0.60
Nodes (4): money(), PeriodSummary(), Row(), Summary

### Community 586 - "intelligence-panel.tsx"
Cohesion: 0.36
Nodes (5): AiInsightsPanel(), CAT_ICON, InsightCards(), sevStyle(), IntelligencePanel()

### Community 588 - "setup-intelligence-panel.tsx"
Cohesion: 0.33
Nodes (8): EdgeEvolutionChart(), fmt(), Windows, DECAY_META, Drift, driftValue(), fmt(), SetupIntelligencePanel()

### Community 590 - "analytics.ts"
Cohesion: 0.38
Nodes (6): summarizeInstitutional(), analyticsRouter, Period, PeriodInput, PERIODS, resolveWindow()

### Community 593 - "OI-4.8 — Cerrar los 3 loops de compromiso colgantes"
Cohesion: 0.25
Nodes (7): Alcance, Decisiones de diseño, OI-4.8 — Cerrar los 3 loops de compromiso colgantes, Problema, Riesgos / a chequear durante la implementación, Testing (TDD), Verificación de cierre

### Community 600 - "add-edit-resource-modal.tsx"
Cohesion: 0.29
Nodes (9): handleSave(), ResourceFromDB, resourcePayload(), ALL_TYPES, emptyForm(), FormState, PROGRESS_LABELS, PROGRESS_TYPES (+1 more)

### Community 601 - "Correcciones y organización de Perfil"
Cohesion: 0.50
Nodes (3): Comportamiento, Correcciones y organización de Perfil, Implementación

### Community 603 - "Review Focus"
Cohesion: 0.22
Nodes (8): Global Constraints, Learning Usability Implementation Plan, Review Focus, Task 1: Backend and migration, Task 2: History UI, Task 3: Hoy and plan UX, Task 4: Review reasons and library onboarding, Task 5: Integration and release

### Community 604 - "email-theme.ts"
Cohesion: 0.25
Nodes (4): resolveTheme(), accentHex(), hx(), ThemePrefs

### Community 606 - "[trpc]/route.ts"
Cohesion: 0.67
Nodes (3): handler(), createTRPCContext(), appRouter

### Community 607 - "20261105023500_durable_account_deletions.sql"
Cohesion: 0.83
Nodes (3): account_deletion_jobs_status_next_attempt_at_idx, private.account_deletion_blocked(), public.account_deletion_jobs

### Community 610 - "context.ts"
Cohesion: 0.40
Nodes (5): Regla del loop 'Enfriamiento tras una pérdida' (enforce, TRADE_PRE_CREATE, BLOCK), buildContext(), ContextAccount, ContextTrade, mondayOf()

### Community 611 - "Mejoras de uso de Aprendizaje"
Cohesion: 0.50
Nodes (3): Enfoque y decisiones de implementación, Mejoras de uso de Aprendizaje, Verificación y límites

### Community 612 - "deriveCommitmentSpec"
Cohesion: 0.17
Nodes (16): Global Constraints, OI-4.8 Commitment-Loop Detectors Implementation Plan, Self-Review, Task 6: La cadena persistida contra Postgres real, Eslabón de cableado (verificado), Alcance, Cerrar la deuda auditada de S0–S2, Decisiones / notas (+8 more)

### Community 615 - "resource-drawer.tsx"
Cohesion: 0.11
Nodes (26): ResourcePracticeHistory(), effectiveMasteryLevel(), isReviewDue(), MASTERY_STAGES, masteryLevel(), MasteryStage, masteryStageIndex(), masteryStageIndexFromLevel() (+18 more)

### Community 621 - "Prácticas: consistencia del modal y protección de borrador"
Cohesion: 0.50
Nodes (3): Decisiones, Implementación, Prácticas: consistencia del modal y protección de borrador

### Community 642 - "AppShell.tsx"
Cohesion: 0.36
Nodes (4): InterventionOverlay(), AppShell(), QuickActions(), CommandPalette()

### Community 647 - "custom-palettes.ts"
Cohesion: 0.15
Nodes (15): isValidSelection(), num(), parsePaletteConfig(), parsePaletteConfigJson(), configInput, customPalettesRouter, MAX_CUSTOM_PALETTES, normalize() (+7 more)

### Community 649 - "Provider model catalog Implementation Plan"
Cohesion: 0.29
Nodes (6): Global Constraints, Provider model catalog Implementation Plan, Review Focus, Task 1: Catálogo, Task 2: Selector e integración, Task 3: Entrega

### Community 650 - "mobile-bottom-bar.tsx"
Cohesion: 0.21
Nodes (10): zustand, CreateAction, IconTab(), MobileBottomBar(), NavItem, useReducedMotion(), OnboardingWelcome(), QuickActionsState (+2 more)

### Community 655 - "routers/notifications.ts"
Cohesion: 0.50
Nodes (4): CATEGORIES, notificationsRouter, PRIORITIES, testEmailHtml()

### Community 656 - "Catálogo de modelos por proveedor"
Cohesion: 0.50
Nodes (3): Catálogo de modelos por proveedor, Diseño, Validación y entrega

### Community 658 - "1. Checklist de QA pendiente de V3"
Cohesion: 0.25
Nodes (8): 1. Checklist de QA pendiente de V3, Acción pendiente de la auditoría del 2026-07-21: `S0/R-3` (outbox drenada sin consumidores), Auditoría de las 68 filas `⬜` (2026-08-10) — la deuda declarada era en su mayoría fantasma, Descripciones originales (§5, estado SUPERADO por §9), Fixture conductual + validación del loop (2026-07-21, PR #151) — corrige el diagnóstico de arriba, Gaps de `AUDIT_FINAL.md`, Nota metodológica sobre el conteo, Notas de correspondencia con `OPENITEMS_CLOSEOUT_S0_S2.md`

### Community 659 - "Recuperación semántica consolidada y citada por el Coach (2026-07-23, PR #161)"
Cohesion: 0.29
Nodes (7): Ampliación a siete corpus (2026-07-23, PRs #162-#167), Defecto encontrado de paso, Deuda residual — CERRADA el mismo día, Lo que estaba roto y nadie veía, Qué se construyó, Recuperación semántica consolidada y citada por el Coach (2026-07-23, PR #161), Verificado en producción

### Community 661 - "Resiliencia de IA sobre el free tier (2026-07-24, PR #171)"
Cohesion: 0.33
Nodes (6): Dos defectos encontrados por el camino, El punto de partida, verificado contra prod, Frontera declarada, Qué se construyó, Resiliencia de IA sobre el free tier (2026-07-24, PR #171), Verificado

### Community 662 - "El outbox estrena consumidor: la S4 cierra (2026-07-24, PR #170)"
Cohesion: 0.33
Nodes (6): El defecto que el spec dio por descartado, El gap era una trampa serverless, no una pieza que faltara, El outbox estrena consumidor: la S4 cierra (2026-07-24, PR #170), `insight.resolved` — CERRADO el mismo día (PR #172), Los dos consumidores, Verificado en producción

### Community 663 - "Auditoría S3–S14 contra código (2026-07-21) — clasificación en 3 pistas"
Cohesion: 0.40
Nodes (5): Auditoría S3–S14 contra código (2026-07-21) — clasificación en 3 pistas, Pista A — Deuda técnica (código que existe y está mal), Pista B — Funcionalidad a medias (construida pero nadie la llama), Pista C — Roadmap / backlog (no construido, por diseño), Pista D — Stale: filas que el código desmiente (cerrar en el doc)

### Community 666 - "trade-derivation.ts"
Cohesion: 0.13
Nodes (15): 1.1 Registro, 1.2 Cierre, 1.3 Fricción (lo más cercano a la pregunta de producto), Fase 1 — Validar la captura, a mano (aquí está el valor), ChecklistEvaluation, ChecklistState, evaluateChecklist(), Regime (+7 more)

### Community 670 - "coach-tool-audit.py"
Cohesion: 0.15
Nodes (7): Procedimiento de entrega y pruebas, Cierre: PR, CI y verificación en producción, Task 5: Suite completa, documentación y PR, dismiss_overlay(), login(), main(), parse_frames()

### Community 674 - "drift.ts"
Cohesion: 0.14
Nodes (21): detectSetupDrift(), DriftDimension, DriftDimensionKey, DriftInput, DriftResult, DriftTrade, mean(), SetupDefinition (+13 more)

### Community 681 - "La palanca A estaba mal enunciada, y la BD lo desmintió (2026-07-27, spec + plan)"
Cohesion: 0.67
Nodes (3): La palanca A estaba mal enunciada, y la BD lo desmintió (2026-07-27, spec + plan), Los dos defectos que sí existen, Qué se decidió (del usuario, no reabrir)

## Knowledge Gaps
- **423 isolated node(s):** `ADR-0001`, `ADR-0003`, `ADR-0003`, `RFC-4180`, `ADR-0002` (+418 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1999 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **449 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `perfil/page.tsx`, `trades-table.tsx`, `review-summary.tsx`, `PracticeModal`, `FocusSession`, `mobile-bottom-bar.tsx`, `palette-studio.tsx`, `dependencies`, `register-trade-modal.tsx`, `ai-coach-drawer.tsx`, `etiquetas/page.tsx`, `page.tsx`, `analytics/page.tsx`, `motion.ts`, `dashboard/page.tsx`, `markdown.tsx`, `send-review.ts`, `lib/utils.ts`, `reglas/page.tsx`, `resource-grid.tsx`, `review-report-shell.tsx`, `Sidebar.tsx`, `tab-playbook.tsx`, `notification-bell.tsx`, `framer-motion`, `lib/utils.ts`, `revisar-recurso-modal.tsx`, `account-card.tsx`, `next`, `intelligence-panel.tsx`, `use-data-table.ts`, `package.json`, `add-edit-resource-modal.tsx`, `retiros/page.tsx`, `theme-provider.tsx`, `trajectory-panel.tsx`, `mercados/page.tsx`, `resource-drawer.tsx`, `reviews/page.tsx`, `position-log-modal.tsx`, `trade-detail-panel.tsx`, `resource-card.tsx`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `ADR-0001`, `ADR-0003`, `ADR-0003` to the rest of the system?**
  _423 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `POST-6 Prop-Firm Rulebase Spec` be split into smaller, more focused modules?**
  _Cohesion score 0.07671957671957672 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `react` to `emit.ts`, `perfil/page.tsx`, `trades-table.tsx`, `mobile-bottom-bar.tsx`, `FocusSession`, `dependencies`, `palette-studio.tsx`, `register-trade-modal.tsx`, `ai-coach-drawer.tsx`, `etiquetas/page.tsx`, `page.tsx`, `review-card.tsx`, `analytics/page.tsx`, `motion.ts`, `dashboard/page.tsx`, `markdown.tsx`, `lib/utils.ts`, `reglas/page.tsx`, `resource-grid.tsx`, `review-report-shell.tsx`, `Sidebar.tsx`, `condition-group.tsx`, `notification-bell.tsx`, `framer-motion`, `lib/utils.ts`, `revisar-recurso-modal.tsx`, `account-card.tsx`, `next`, `improvement-panel.tsx`, `intelligence-panel.tsx`, `setup-intelligence-panel.tsx`, `package.json`, `today-service.ts`, `retiros/page.tsx`, `mercados/page.tsx`, `resource-drawer.tsx`, `psychology-insights.ts`, `reviews/page.tsx`, `today-feed.tsx`, `position-log-modal.tsx`, `trade-detail-panel.tsx`, `resource-card.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `emit.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10465116279069768 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `root.ts` to `learning-resources.ts`, `perfil/page.tsx`, `react`, `custom-palettes.ts`, `dependencies`, `register-trade-modal.tsx`, `accounts.ts`, `routers/notifications.ts`, `page.tsx`, `learning-resources.ts`, `trades.ts`, `isWin`, `lib/utils.ts`, `next`, `feature-models.ts`, `src_lib_generated_prisma_client`, `psychology-service.ts`, `ai-config.ts`, `commitment-service.ts`, `rate-limiter.ts`, `package.json`, `analytics.ts`, `retiros/page.tsx`, `profile.ts`, `rules.ts`, `coach-memory-service.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `perfil/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06219426974143955 - nodes in this community are weakly interconnected._