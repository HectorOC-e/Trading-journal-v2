# Graph Report - Trading-journal-v2  (2026-11-08)

## Corpus Check
- 678 files · ~445,544 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 4, .css 2, .example 1)

## Summary
- 4871 nodes · 11285 edges · 665 communities (220 shown, 445 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 503 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a915133e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- theme/engine.ts
- Global Constraints
- emit.ts
- insights-engine.ts
- perfil/page.tsx
- react
- trades-table.tsx
- review-summary.tsx
- env
- cn
- resource-grid.tsx
- dependencies
- monthly-letter.tsx
- psychology-insights.ts
- weekly-reviews.ts
- resource-drawer.tsx
- ai-coach-drawer.tsx
- index.ts
- notify.tsx
- page.tsx
- learning-resources.ts
- trade-write-service.ts
- analytics/page.tsx
- motion.ts
- trades.ts
- profile.ts
- bayes.ts
- event-bus.ts
- memory-episode-service.ts
- dashboard/page.tsx
- register-trade-modal.tsx
- OI-4.8 — Cerrar los 3 loops de compromiso colgantes
- root.ts
- send-learning-digest.ts
- send-review.ts
- lib/utils.ts
- risk-ratios.ts
- reglas/page.tsx
- types.ts
- createClient
- pipeline.ts
- resolve-provider.ts
- Check-in pre-sesión (go/caution/no_go)
- next
- users
- monthly-reviews.ts
- psychology-service.ts
- risk-of-ruin.ts
- dashboard-analytics.ts
- Trading Journal (producto)
- trades
- config.ts
- overview.ts
- seed-psych-trades.mjs
- Analytics Subsystem
- route.ts
- page.tsx
- condition-group.tsx
- resource-card.tsx
- compilerOptions
- notification-bell.tsx
- account-card.tsx
- ConditionNode
- trade-detail-panel.tsx
- edge-service.ts
- markdown.tsx
- review-insights.ts
- Captura de emoción: procedencia, ventana y contrato de correlación
- today-feed.tsx
- commitment-service.ts
- practice-feedback-service.ts
- usableCandidates
- ai-config.ts
- next
- theme-provider.tsx
- package.json
- ADR-003: Memory Privacy Boundary
- Trading Journal (project)
- account-deletion.ts
- today-service.ts
- simple-table.tsx
- G2 Rules Cutover Design Spec
- ruleDataFromExecutableInput
- gen-theme-css.mjs
- POST-6 — Base de reglas prop-firm como activo central (moat)
- commitment-service.ts
- improvement-service.ts
- create-account-modal.tsx
- Aprendizaje: historial, planes y recuperación
- setups
- Behavior Engine Subsystem
- Intervention Engine Subsystem
- Hardening: P&L, Enforcement, CI/Migrations and Performance (2026-06-10, PRs #6–#17)
- Documentation Consolidation (9 master docs + docs/archive/)
- rules.ts
- page.tsx
- Fixture conductual + validación del loop de punta a punta — Diseño
- trajectory-panel.tsx
- risk-service.ts
- executeAiCall
- G2 — Rules Cutover: rules Is the Only Source (2026-07-13)
- mercados/page.tsx
- welch.ts
- psychology-insights.ts
- palette-studio.tsx
- Coach Subsystem
- Memoria del coach (4 capas: episódica, semántica, identidad, mejora)
- Persona: Prop Firm Candidate
- 20260524063124_task_020_missing_fk_indexes.sql
- trade-row.tsx
- session-revisions.ts
- ADR-001: Event Runtime and Delivery
- Supabase CLI Migrations System Reconciled (36 migrations, config.toml)
- data-table.tsx
- revisar-recurso-modal.tsx
- Review Focus
- learning-insights-service.ts
- risk-enforcement.ts
- emotion-feedback.ts
- coach.ts
- scripts
- Trade Service Layer (src/server/services/trades/)
- dashboardStats Server-Side Analytics (Sprint 2)
- retrieval/types.ts
- DrawdownModel
- route.ts
- learning_resources
- localDateISO
- Gate G2 — cutover de reglas (automations → rules)
- public.users
- pattern-detector.ts
- tab-portfolio.tsx
- 20260626120000_v3_s4_behavior_engine.sql
- Sprints 9-12 — Portfolio MVP, PWA, PDF, Onboarding (2026-06-04)
- Behavior Engine (insight → compromiso → regla → verificación → refuerzo)
- Event bus / outbox (publishEvent, dispatchPending, planEventTransition)
- Módulo Trades (/trades)
- FocusSession
- risk-budget.ts
- PR 3 — Citas abribles y deep-link
- retiros/page.tsx
- Embedding Service (pgvector schedule/search/backfill)
- accounts.ts
- aprendizaje/page.tsx
- isWin
- coach-tools.ts
- ai-models-card.tsx
- public.rule_suggestions
- backfill-embeddings.mjs
- data/prop-firm-presets.ts
- E2: Rule (unificado con Automation)
- Cognitive Engine (root bounded context)
- 20260625120000_v3_s0_outbox_and_insights.sql
- apply.ts
- monthly_reviews
- mae-mfe.ts
- insight-store.ts
- General Reliability Implementation Plan
- Profile reliability and usability Implementation Plan
- mobile-bottom-bar.tsx
- public.resource_reviews
- benchmark.ts
- pnl-heatmap.ts
- load-state.ts
- index.ts
- CI job: checks (type check, tests, build)
- BACKLOG.md (fuente del backlog; borrado, 2026-06-05)
- cognitive-digest-service.ts
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
- types/index.ts
- Repetición y autoevaluación de prácticas
- 20260609192355_fix_advisor_security_and_performance.sql
- class-variance-authority
- commitment-service.ts
- continuity.ts
- Captura de emoción con procedencia — Plan de implementación
- El bucle agéntico del Coach: reintento por ronda y cierre garantizado
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
- recompute-insights/route.ts
- Approach B — Live FK Reference (rejected)
- Approach C — Snapshot + Update Notice (future enhancement)
- Catalog Seed v1 — 3 Anchor Firms
- learning-practices.md
- Confirmed Decisions Summary Table
- pdf-report-html.ts
- Sidebar.tsx
- Account.enforceMode WARN/ENFORCE
- analytics-cache.ts
- FREEZE-D13 (respect user autonomy in WARN mode)
- FTMO Preset Rules
- MyFundedFX Preset Rules
- position-log-modal.tsx
- Out of Scope / YAGNI Items
- Learning reminder time Implementation Plan
- Topstep Preset Rules
- Archivo P9 — tabla automations intacta
- Dual-write automations→rules
- Fase 1 — Flip (ops, sin código)
- Fase 2 — Retiro de automations
- 20261103050551_learning_practices.sql
- reviews-rail.tsx
- Gate OI-1 — informe de no-mapeo con datos reales
- deriveCommitmentSpec
- OI-5.1 — reglas del loop visibles en /reglas
- review-card.tsx
- Prueba observable del flip (rules.last_fired_at bumps, automations quieto)
- trade-detail-panel.tsx
- Riesgo residual — divergencia semántica sutil de runRules
- Rollback fase 1 — quitar RULES_SOURCE (instantáneo)
- coach-service.ts
- RULES_SOURCE env var
- S1/DT-5 — badge de modo lee rule.mode
- Fase 1 ejecutada y verificada en prod (Playwright + SQL, RULE_BLOCKED)
- learning-edge-recovery.md
- learning-session-lifecycle.md
- Verificación post-merge en prod (/reglas edita, BLOCK bloquea, last_fired_at bumps)
- Review Focus
- Correcciones y organización de Perfil
- Review Focus
- tag-chip.tsx
- Bayesian Confidence Bands (shrinkage estimator)
- risk-budget.ts
- 20261105023500_durable_account_deletions.sql
- Cognitive Layer Thesis (v3)
- 5 Cognitive Surfaces (HOY · OPERAR · ANALIZAR · PROTEGER · MEJORAR)
- context.ts
- Mejoras de uso de Aprendizaje
- profile.ts
- Environment Variables (DATABASE_URL, Supabase keys, AI key, CRON_SECRET)
- Event Bus with Outbox (decoupled producers → consumers)
- send-learning-digest.ts
- Correcciones generales y fiabilidad
- Institutional Analytics (drawdown, R distribution, Sortino/Calmar/Kelly, MAE/MFE, benchmark, heatmap)
- Intervention Engine (deterministic)
- Diseño — recuperación semántica consolidada y citación en el Coach
- Prácticas: consistencia del modal y protección de borrador
- tab-playbook.tsx
- Playbook Intelligence (edge decay with Welch significance, definition-vs-execution drift, rolling-window evolution, A/B variants)
- CreatorModal
- docs/PROJECT_GUIDE.md (read-me-first: modules, stack, code map)
- 2026-11-03-learning-reminder-time-design.md
- Risk & Prop (ruin risk analytic + Monte Carlo, phase-pass projection, daily budget, multi-account correlation, withdrawal policy)
- docs/STATUS.md (state, pending QA checklist, debt, backlog, roadmap, resume prompt)
- Status: v3.1 Closed (14/14 sprints · 100% audit · 3 gates) + v3.2 In Progress (cognitive companion, 5 live axes)
- tj.v3Shell Feature Flag
- AppShell.tsx
- run-rules.test.ts (invariante de no-regresión)
- email-theme.ts
- /api/cron/rules-migration-report (retirado en G2)
- rulesSourceIsUnified() (retirado en G2)
- Mejoras del flujo diario, evaluación y recuperación
- rule-sync.ts (dual-write, retirado en G2)
- parse.ts
- automationsRouter (retirado en G2)
- Provider model catalog Implementation Plan
- Plan de simulación de trader profesional en aria
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
- 2026-11-05-full-audit.md
- 2026-11-05-full-audit-design.md
- playbook-service.ts
- La palanca A estaba mal enunciada, y la BD lo desmintió (2026-07-27, spec + plan)

## God Nodes (most connected - your core abstractions)
1. `cn()` - 160 edges
2. `react` - 125 edges
3. `lucide-react` - 97 edges
4. `Button()` - 92 edges
5. `trpc` - 78 edges
6. `formatErrorForUser()` - 72 edges
7. `DialogContent()` - 51 edges
8. `localDateISO()` - 51 edges
9. `DialogTitle()` - 50 edges
10. `Dialog` - 49 edges

## Surprising Connections (you probably didn't know these)
- `runRules()` --semantically_similar_to--> `runAutomations() (retirado en G2)`  [INFERRED] [semantically similar]
  src/domains/rules/engine.ts → docs/superpowers/specs/2026-07-13-g2-rules-cutover-design.md
- `1. El problema, corregido contra la BD` --references--> `PsychologyPanel()`  [INFERRED]
  docs/superpowers/specs/2026-07-27-captura-emocion-reconstruida-design.md → src/app/reviews/components/report/sections.tsx
- `B — la review semanal (`sections.tsx:226`)` --references--> `PsychologyPanel()`  [INFERRED]
  docs/superpowers/specs/2026-07-27-captura-emocion-reconstruida-design.md → src/app/reviews/components/report/sections.tsx
- `5. El contrato de exclusión` --references--> `AnalyticsTrade`  [INFERRED]
  docs/superpowers/specs/2026-07-27-captura-emocion-reconstruida-design.md → src/domains/analytics/services/insights-engine.ts
- `6.3 El arreglo de ordenamiento, con test en rojo primero` --references--> `bySymbolDate()`  [INFERRED]
  docs/superpowers/specs/2026-07-21-fixture-conductual-loop-e2e-design.md → src/domains/analytics/services/insights-engine.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI/CD antierrores pipeline** — _github_workflows_ci_checks, _github_workflows_ci_e2e, _github_workflows_ci_migrate_validate, _github_workflows_ci_migrate_deploy [EXTRACTED 1.00]

## Communities (665 total, 445 thin omitted)

### Community 0 - "theme/engine.ts"
Cohesion: 0.15
Nodes (21): Swatch(), accentContrastFor(), ATMOSPHERE_MEDIUM, ATMOSPHERE_STRONG, ATMOSPHERE_SUBTLE, bestContrastOn(), clamp01(), contrastRatio() (+13 more)

### Community 1 - "Global Constraints"
Cohesion: 0.08
Nodes (26): Deploy/Migration Flow (merge to main → CI applies migration), Local Validation Results (prisma generate, tsc, vitest 1176/1176, eslint), POST-6 Prop-Firm Rulebase Implementation Plan, Global Constraints, POST-6 — Prop-Firm Rulebase (moat) Implementation Plan, Self-Review, Task 1: Migration — prop_firm_presets + Account fields, Task 10: UI — dashboard prop-firm panel shows the new rules (+18 more)

### Community 2 - "emit.ts"
Cohesion: 0.10
Nodes (37): ToastCard(), ToastCardProps, TypeStyle, isAppError(), toUserMessage(), TRPC_TO_CODE, LABELS, MessageCode (+29 more)

### Community 3 - "insights-engine.ts"
Cohesion: 0.12
Nodes (36): File Structure, Task 1: `detectRevengeTrading`, Task 2: `detectOversizing`, Task 3: `detectOffPlan`, Task 4: Round-trip + coverage guard (the loop actually closes), Task 5: Full verification + push, Al terminar, Fixture conductual + validación del loop — Plan de implementación (+28 more)

### Community 4 - "perfil/page.tsx"
Cohesion: 0.09
Nodes (32): @radix-ui/react-popover, react, @trpc/client, LearningReminderSettings(), ProviderModelSelect(), AI_PROVIDERS, Card(), COLORBLIND_OPTIONS (+24 more)

### Community 5 - "react"
Cohesion: 0.07
Nodes (49): lucide-react, EditablePlan, ExportPage(), Kpi(), SectionTitle(), blankDraft(), CATEGORY_SUGGESTIONS, COLOR_PRESETS (+41 more)

### Community 6 - "trades-table.tsx"
Cohesion: 0.16
Nodes (23): RFC-4180, @tanstack/react-table, Checkbox(), CheckIcon(), EmptyTrades(), getResult(), QUALITY_TAGS, qualityOf() (+15 more)

### Community 7 - "review-summary.tsx"
Cohesion: 0.11
Nodes (39): ReviewEmailModel, DigestModel, CtaButton(), Divider(), EmailFooter(), EmailLayout(), ProgressBlock(), reviewChipLabel() (+31 more)

### Community 8 - "env"
Cohesion: 0.05
Nodes (53): env, name, runs-on, steps, concurrency, cancel-in-progress, group, env (+45 more)

### Community 9 - "cn"
Cohesion: 0.05
Nodes (50): DOW, HoyTab(), TOUR_STEPS, KpiBox(), AccountHistoryModal(), EVENT_META, Log, SyncBalanceModal() (+42 more)

### Community 10 - "resource-grid.tsx"
Cohesion: 0.12
Nodes (26): ResourceCardProps, ResourceDrawerProps, CATEGORY_OPTIONS, ResourceGrid(), clearAdvanced(), clearFilters(), ResourceGridProps, SORT_OPTIONS (+18 more)

### Community 11 - "dependencies"
Cohesion: 0.04
Nodes (54): clsx, @hookform/resolvers, katex, @prisma/adapter-pg, puppeteer-core, @radix-ui/react-checkbox, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu (+46 more)

### Community 12 - "monthly-letter.tsx"
Cohesion: 0.15
Nodes (13): Corrección de los hallazgos de Fase 4 y re-verificación (2026-07-22), Defectos encontrados y corregidos, El hallazgo principal: la captura psicológica es lo que enciende la maquinaria, `embeddings`: roto en silencio, en tres capas, Fase 4 — features de IA, Fase 5 — superficies analíticas, recorridas, Lo que esto NO prueba, Lo que NO se pudo verificar (+5 more)

### Community 14 - "psychology-insights.ts"
Cohesion: 0.27
Nodes (17): Estructura de ficheros, Task 2: El contrato de exclusión de correlación, capturedEmotion(), detectEmotionPerformance(), detectCleanStreak(), detectEmotionBeforeLoss(), detectHoldingAsymmetry(), detectImpulsiveExpectancy() (+9 more)

### Community 15 - "weekly-reviews.ts"
Cohesion: 0.09
Nodes (26): computeDisciplineScore(), DisciplineDetail, DisciplinePeriod, DisciplineResult, buildReviewEmailModel(), calcDisciplineScore(), DisciplineBreakdown, DisciplineParams (+18 more)

### Community 16 - "resource-drawer.tsx"
Cohesion: 0.13
Nodes (21): effectiveMasteryLevel(), isReviewDue(), MASTERY_MAX, MASTERY_STAGES, masteryLevel(), MasteryStage, masteryStageIndex(), masteryStageIndexFromLevel() (+13 more)

### Community 17 - "ai-coach-drawer.tsx"
Cohesion: 0.10
Nodes (21): AiCoachDrawer(), handleKeyDown(), regenerate(), sendMessage(), streamReply(), ApiError, CiteCard(), clampPos() (+13 more)

### Community 18 - "index.ts"
Cohesion: 0.08
Nodes (35): buildTraderContext(), calcNetPnl(), calcSharpeRatio(), calcAvgR(), calcExpectancyR(), calcSetupHealth(), SetupHealthParams, AiUsageLog (+27 more)

### Community 19 - "notify.tsx"
Cohesion: 0.15
Nodes (19): Task 5: El día vivo dispara la decisión de intervención, ActionKind, clamp01(), DayState, decideIntervention(), DecisionOpts, detectInterventions(), FatigueState (+11 more)

### Community 20 - "page.tsx"
Cohesion: 0.08
Nodes (37): ChecklistEditor(), COLORS, DbSetup, Direction, DirectionChip(), FORM_INIT, HealthStatus, KpiBox() (+29 more)

### Community 21 - "learning-resources.ts"
Cohesion: 0.11
Nodes (21): detectDecayedResources(), ResourceForDecay, computeNewStreak(), utcMidnight(), computeNextReview(), Grade, SrsInput, SrsResult (+13 more)

### Community 22 - "trade-write-service.ts"
Cohesion: 0.12
Nodes (36): TD-018 Task 5 — Write service: create, TD-018 Task 6 — Write service: update + close, TD-018 Task 7 — Write service: addEvent + delete + saveChecklistResult, Task 3: Procedencia posicional y ventana, en servidor, Quién escribe la procedencia, BudgetGuardInput, BudgetGuardResult, evaluateBudgetGuard() (+28 more)

### Community 23 - "analytics/page.tsx"
Cohesion: 0.07
Nodes (58): recharts, AccountsIntel(), amt(), AnalyticsPage(), Bar(), EdgeBadge(), Edges(), Empty() (+50 more)

### Community 24 - "motion.ts"
Cohesion: 0.09
Nodes (33): framer-motion, CardEquityChart(), DAYS, EditionHeader(), EditionHeaderData, money(), TONE, Pattern (+25 more)

### Community 25 - "trades.ts"
Cohesion: 0.23
Nodes (16): Refactor behavior-preserving (RouterOutputs y schemas zod intactos), Sustituciones mecánicas (ctx.prisma→prisma, ctx.userId→userId, ctx.supabase→supabase), Task 1: Serializers, TD-018 Task 4 — Read service (list/violaciones/emoción/patrones), Task 12: `trades.byId`, RawAccount, RawTrade, serializeAccount() (+8 more)

### Community 26 - "profile.ts"
Cohesion: 0.15
Nodes (16): handleExport(), collectProfileExport(), downloadProfileExport(), ExportPageInput, FetchPage, ProfileExportProgress, PROFILE_EXPORT_COVERAGE, PROFILE_EXPORT_EXCLUSIONS (+8 more)

### Community 27 - "bayes.ts"
Cohesion: 0.11
Nodes (26): betaBinomialEstimate(), betacf(), BetaPrior, betaQuantile(), cohensH(), DEFAULT_BETA_PRIOR, DEFAULT_NORMAL_PRIOR, DirectionalEstimate (+18 more)

### Community 28 - "event-bus.ts"
Cohesion: 0.10
Nodes (29): Auto-revisión del plan, Global Constraints, Primer consumidor S4 del outbox — Plan de implementación, Task 4: `dispatchPending` por inyección + claim restringido, Task 7: composición (`HANDLERS`) + wiring del endpoint, 1. Punto de partida (verificado contra código y prod), 2. Objetivo, 3. Decisión de arquitectura: inyección de handlers (opción B) (+21 more)

### Community 29 - "memory-episode-service.ts"
Cohesion: 0.09
Nodes (39): Estructura de ficheros, Task 1: `commitment_created` en `MemoryEventType`, Task 2: code `INSIGHT_DETECTED` en el catálogo, Task 3: `recordEpisodeOnce` idempotente, Task 5: handler de memoria (`commitment.*`), Task 6: handler de notificación (`insight.created`), Task 8: re-agendar el cron, Task 9: PR, merge y verificación en producción (+31 more)

### Community 30 - "dashboard/page.tsx"
Cohesion: 0.07
Nodes (34): Card(), CardProps, Period, useDashboardStats(), DashboardPage(), Tab, TABS, VALID_PERIODS (+26 more)

### Community 31 - "register-trade-modal.tsx"
Cohesion: 0.08
Nodes (29): SESSIONS, Setup, Tab, TAGS_TOGGLEABLE, EmotionInsight(), LABELS, AccountLike, computeAutoTag() (+21 more)

### Community 32 - "OI-4.8 — Cerrar los 3 loops de compromiso colgantes"
Cohesion: 0.33
Nodes (5): Alcance, OI-4.8 — Cerrar los 3 loops de compromiso colgantes, Problema, Riesgos / a chequear durante la implementación, Testing (TDD)

### Community 33 - "root.ts"
Cohesion: 0.06
Nodes (62): Task 6: tRPC propFirmPresets.list + typed catalog, @trpc/server, zod, handler(), computeDirectionBreakdown(), computeSessionMatrix(), computeSetupStats(), DirectionStats (+54 more)

### Community 34 - "send-learning-digest.ts"
Cohesion: 0.07
Nodes (35): dynamic, maxDuration, POST(), dynamic, maxDuration, POST(), ADR-0001, dynamic (+27 more)

### Community 35 - "send-review.ts"
Cohesion: 0.17
Nodes (20): dynamic, maxDuration, POST(), USER_SELECT, localHour(), MONTHS, periodKey(), reportPath() (+12 more)

### Community 36 - "lib/utils.ts"
Cohesion: 0.06
Nodes (69): ResourcePicker(), PlanSessionModal(), HistoryItem, SessionHistory(), AddEditResourceModal(), ResourceEditor(), handleSave(), ResourceEditorProps (+61 more)

### Community 37 - "risk-ratios.ts"
Cohesion: 0.16
Nodes (20): calmarRatio(), computeRiskRatios(), Kelly, kellyCriterion(), KellyFromR, kellyFromR(), mean(), rollingRiskRatios() (+12 more)

### Community 38 - "reglas/page.tsx"
Cohesion: 0.23
Nodes (10): ACTION_LABEL, ExecRuleRow, ReglasPage(), RemindersTab(), SystemRulesTab(), TABS, Template, TRIGGER_LABEL (+2 more)

### Community 39 - "types.ts"
Cohesion: 0.14
Nodes (16): Task 1 — Engine solo-runRules (borrar flag/dispatcher/runAutomations), Test de no-regresión 'G2 cutover invariant', ACTION_TYPES, ActionDeps, ActionResult, Handler, HANDLERS, runAction() (+8 more)

### Community 40 - "createClient"
Cohesion: 0.24
Nodes (10): DELETE(), GET(), identity, POST(), ALLOWED_MIME, POST(), MAX_PRACTICE_IMAGE_BYTES, createAdminClient() (+2 more)

### Community 41 - "pipeline.ts"
Cohesion: 0.10
Nodes (31): PR 1 — El módulo `retrieval` (sin UI), Task 3: Conformado del resultado (puro, TDD), Task 4: Adaptador `trade_notes`, Task 5: Adaptador `learning_notes` + registro + guarda de contrato, Task 6: El pipeline — búsqueda, auto-reparación y estado, monthlyReviewNotesAdapter, MonthlyReviewRow, MONTHS (+23 more)

### Community 42 - "resolve-provider.ts"
Cohesion: 0.09
Nodes (35): ChatMessage, getProviderKey(), AI_FEATURES, AI_PROVIDERS_LIST, AiFeature, AiSettings, CHAT_LADDER, CostPriority (+27 more)

### Community 44 - "next"
Cohesion: 0.07
Nodes (69): Task 6: Superficie B — la review semanal deja de dar una instrucción sin salida, next, metadata, AiAnalysisCard(), EquityCurveChart(), PnlTrendChart(), TrendTooltip(), DownloadPdfButton() (+61 more)

### Community 45 - "users"
Cohesion: 0.20
Nodes (14): account_logs, account_logs_account_idx, accounts, accounts_user_idx, handle_new_user(), markets, on_auth_user_created, users (+6 more)

### Community 46 - "monthly-reviews.ts"
Cohesion: 0.12
Nodes (24): writeReviewText(), finalizeMonthlyReview(), FinalizeResult, MONTHS_ES, evaluateGoal(), GoalContext, GoalProposal, GoalStatus (+16 more)

### Community 47 - "psychology-service.ts"
Cohesion: 0.17
Nodes (20): calibration(), CheckinInput, CheckinResult, CheckinVerdict, checkinVerdict(), clamp(), LABEL, avg() (+12 more)

### Community 48 - "risk-of-ruin.ts"
Cohesion: 0.15
Nodes (20): Band, jeffreysBand(), Bottleneck, mean(), PassOutcome, percentile(), projectPhasePass(), PropProjectionResult (+12 more)

### Community 49 - "dashboard-analytics.ts"
Cohesion: 0.06
Nodes (54): Partición practice (financiero excluye DEMO_PERSONAL/DEMO_PROP/BACKTEST; discipline las cuenta), TD-018 Task 3 — Dashboard service + primer test de orquestación, dashboard-service.test.ts (partición practice), setCachedStats(), AccountBalance, AccountExposure, AccountLimits, AccountStat (+46 more)

### Community 51 - "trades"
Cohesion: 0.13
Nodes (13): trades, trades_account_idx, trades_user_date_idx, trade_events, trade_events_trade_id_idx, idx_trades_notes_embedding, idx_trades_plan_notes_embedding, idx_trade_events_notes_embedding (+5 more)

### Community 52 - "config.ts"
Cohesion: 0.36
Nodes (4): detectProvider(), getCoachModel(), getWeeklySummaryModel(), resolveModel()

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
Cohesion: 0.18
Nodes (17): Task 3: Engine — checkConsistency, Task 4: Engine — checkWeekendHolding, Task 5: Engine — phaseProgress, Task 8: Wire checks into dashboard status + ENFORCE lock, POST-6 Prop-Firm Rulebase Design Spec, checkConsistency(), checkDailyLossLimit(), checkLossLimit() (+9 more)

### Community 58 - "condition-group.tsx"
Cohesion: 0.15
Nodes (17): CMP_LABEL, ConditionGroup(), Group, isGroup(), isLeaf(), isNot(), LeafEditor(), newLeaf() (+9 more)

### Community 59 - "resource-card.tsx"
Cohesion: 0.13
Nodes (20): ARCHIVE_REASONS, formatMinutes(), MasteryRing(), MenuItem(), MenuItemProps, progressColor(), progressLabel(), relativeTime() (+12 more)

### Community 60 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 61 - "notification-bell.tsx"
Cohesion: 0.15
Nodes (16): react-dom, NotificationBell(), CenterPanel(), CenterSheet(), formatNotifTime(), NotificationItem(), NotificationItemProps, TYPE_STYLE (+8 more)

### Community 62 - "account-card.tsx"
Cohesion: 0.19
Nodes (19): ACCOUNT_STATUS_META, AccountCard(), AccountExposure, AccountRisk, formatSyncAgo(), isPropFirmLike(), RawAccount, TradeStats (+11 more)

### Community 63 - "ConditionNode"
Cohesion: 0.24
Nodes (16): Task 5 — Borrar automations router, dual-write e informe de migración, RuleDraft, PROTECTION_TEMPLATE_MAP, PROTECTION_TEMPLATES, ProtectionTemplate, ExecutableRuleInput, AutomationTemplate, BASE_TEMPLATES (+8 more)

### Community 64 - "trade-detail-panel.tsx"
Cohesion: 0.07
Nodes (29): ADR-000 — Decisiones de raíz de Trading Journal v3.1, ADR-001 — Runtime de eventos y entrega, ADR-002 — Estrategia estadística, ADR-003 — Privacidad de la memoria y frontera anti-corrupción, ADR-004 — Reserva de datos cross-user (BIZ-1), Alternativas consideradas, Alternativas consideradas, Alternativas consideradas (+21 more)

### Community 65 - "edge-service.ts"
Cohesion: 0.17
Nodes (16): computeInstrumentEdges(), EdgeVerdict, InstrumentEdge, InstrumentEdgeResult, InstrumentTrade, mean(), computeTagEdges(), mean() (+8 more)

### Community 66 - "markdown.tsx"
Cohesion: 0.12
Nodes (24): AiInsightsPanel(), CAT_ICON, InsightCards(), sevStyle(), IntelligencePanel(), Block, CALLOUT, CALLOUT_ALIASES (+16 more)

### Community 67 - "review-insights.ts"
Cohesion: 0.19
Nodes (17): GET(), maxDuration, runtime, ReviewPeriod, ensureReviewAnalysis(), persistMonthlyAnalysis(), persistWeeklyAnalysis(), buildHtml() (+9 more)

### Community 68 - "Captura de emoción: procedencia, ventana y contrato de correlación"
Cohesion: 0.13
Nodes (14): 1. El problema, corregido contra la BD, 2. Qué entrega esta pieza, y qué no, 3. Decisiones tomadas y por qué, 4. Modelo de datos, 5. El contrato de exclusión, 6. Superficies, 8. Resumen en tres ejes, A — el trade cerrado (`trade-detail-panel.tsx:640`) (+6 more)

### Community 69 - "today-feed.tsx"
Cohesion: 0.24
Nodes (10): AccountRiskPanel(), asPct(), BOTTLENECK, pct(), RiskBudgetMeter(), KIND_ICON, severityColor(), TodayFeed() (+2 more)

### Community 70 - "commitment-service.ts"
Cohesion: 0.17
Nodes (21): Task 7: Commitment persistido y regla enlazada (linkRule), Fase 3 — El loop conductual, block(), canEnforce(), ProposedRule, proposeRuleForCommitment(), RuleSuggestionProposal, suggestRuleForInsight() (+13 more)

### Community 71 - "practice-feedback-service.ts"
Cohesion: 0.21
Nodes (10): @supabase/supabase-js, createRateLimiter(), InMemoryRateLimiter, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW, RateLimiter, @supabase/supabase-js@^2.107.0, buildPracticePrompt() (+2 more)

### Community 72 - "usableCandidates"
Cohesion: 0.09
Nodes (34): Task 8: migrar `complete.ts` y `review-ai.ts`, 10. Criterios de éxito, 1. Punto de partida (verificado contra código y prod, 2026-07-24), 2. Objetivo y no-objetivos, 3. Arquitectura: un ejecutor, un comportamiento, 4. La cadena de modelos gratuitos, 5. Clasificación del error y política de reintento, 7. Lo que NO se maneja, a propósito (+26 more)

### Community 73 - "ai-config.ts"
Cohesion: 0.13
Nodes (24): POST(), Provider, rateLimiter, AiProvider, ConnectivityResult, testProviderConnectivity(), decryptApiKey(), encryptApiKey() (+16 more)

### Community 74 - "next"
Cohesion: 0.36
Nodes (7): LoginPage(), handleSubmit(), useLogout(), clearSessionStorageKeys(), SESSION_SCOPED_STORAGE_KEYS, STORAGE_KEYS, createClient()

### Community 75 - "theme-provider.tsx"
Cohesion: 0.15
Nodes (15): metadata, RootLayout(), viewport, ServiceWorkerRegister(), CYCLE, getSystemTheme(), ResolvedTheme, resolveTheme() (+7 more)

### Community 76 - "package.json"
Cohesion: 0.06
Nodes (45): eslint, eslint-config-next, jsdom, @playwright/test, prisma, react-email, tailwindcss, @tailwindcss/postcss (+37 more)

### Community 78 - "Trading Journal (project)"
Cohesion: 0.12
Nodes (16): 1. Clonar e instalar, 2. Variables de entorno, 3. Base de datos, 4. Levantar el dev server, 🚀 Cómo iniciar el proyecto, 📚 Documentación, El núcleo cognitivo, 📁 Estructura (+8 more)

### Community 79 - "account-deletion.ts"
Cohesion: 0.18
Nodes (13): dynamic, maxDuration, POST(), buckets, completed, defaults, Dependencies, pending (+5 more)

### Community 80 - "today-service.ts"
Cohesion: 0.19
Nodes (16): RiskBudget, AnomalyInput, AnomalyResult, assembleTodayFeed(), BASE, detectDailyAnomaly(), SEVERITY_MULT, SignalInput (+8 more)

### Community 81 - "simple-table.tsx"
Cohesion: 0.19
Nodes (15): AppToaster(), ROW_PAD, SimpleColumn, ColumnMeta, Density, loadJSON(), multiSelectFilter(), @tanstack/react-table (+7 more)

### Community 83 - "G2 Rules Cutover Design Spec"
Cohesion: 0.22
Nodes (8): G2 Fase 2 — Retiro de `automations` · Implementation Plan, Global Constraints, Task 1: Engine solo-`runRules` (borrar flag/dispatcher/runAutomations), Task 2: Helpers puros de escritura de reglas (`rule-write.ts`, TDD), Task 3: Router `rules` a paridad ejecutable, Task 4: UI `/reglas` → `trpc.rules.*`, Task 5: Borrar automations router, dual-write e informe de migración, Task 6: Validación final, docs y push

### Community 84 - "ruleDataFromExecutableInput"
Cohesion: 0.19
Nodes (11): Task 2 — Helpers puros de escritura de reglas (rule-write, TDD), Task 3 — Router rules a paridad ejecutable, rule-write.test.ts, ruleDataFromExecutableInput(), ruleDataFromTemplate(), rules.createExecutable, rules.createFromTemplate, rules.list (+3 more)

### Community 85 - "gen-theme-css.mjs"
Cohesion: 0.09
Nodes (28): accentContrastFor(), clamp01(), contrastRatio(), derivePalette(), hexToRgb(), linearToSrgb(), okl(), oklchToHex() (+20 more)

### Community 86 - "POST-6 — Base de reglas prop-firm como activo central (moat)"
Cohesion: 0.13
Nodes (15): 10. Fuera de alcance (YAGNI / POST), 11. Resumen de decisiones confirmadas, 1. Objetivo y valor, 2. Estado actual (de qué partimos), 3. Decisión arquitectónica — Snapshot (Approach A), 4.1 Nueva tabla `PropFirmPreset` (data de referencia GLOBAL, no per-usuario), 4.2 Campos nuevos en `Account` (los que faltan), 4.3 Migración (+7 more)

### Community 87 - "commitment-service.ts"
Cohesion: 0.10
Nodes (20): 0. Alcance de la congelación, 10. Analytics (FREEZE — subsistema), 12. Trazabilidad: cómo este freeze cierra los hallazgos, 13. Qué desbloquea la implementación (puerta de salida), 1. Principios (FREEZE-P), 2. Módulos (mapa físico), 3. Bounded contexts y fronteras (FREEZE-D, parte 1), 4.1 Mecanismo congelado (FREEZE-D1 — resuelve ADR-001) (+12 more)

### Community 88 - "improvement-service.ts"
Cohesion: 0.14
Nodes (20): clamp01(), computeImprovementScore(), costOfIndiscipline(), DEFAULT_WEIGHTS, Driver, ImprovementInputs, ImprovementResult, ImprovementWeights (+12 more)

### Community 89 - "create-account-modal.tsx"
Cohesion: 0.10
Nodes (25): Task 9: UI — preset picker + enforceMode toggle, Chip(), PHASE_LABEL, PropFirmPreset, PropFirmPresetPicker(), ACCOUNT_TYPES, BROKERS, FORM_INIT (+17 more)

### Community 90 - "Aprendizaje: historial, planes y recuperación"
Cohesion: 0.50
Nodes (3): Aprendizaje: historial, planes y recuperación, Compatibilidad de datos, Verificación

### Community 91 - "setups"
Cohesion: 0.16
Nodes (10): setups, "_ResourceSetups", _ResourceSetups_AB_unique, _ResourceSetups_B_index, idx_checklist_results_user, trade_checklist_results, setup_versions, setup_versions (+2 more)

### Community 96 - "rules.ts"
Cohesion: 0.14
Nodes (13): TEMPLATES, action, ACTION_TYPES, cmp, conditionNode, conditionValue, executableInput, leaf (+5 more)

### Community 97 - "page.tsx"
Cohesion: 0.12
Nodes (17): [2026-06-05] · AI config, migraciones y consolidación documental, [2026-07-13] · G2 — cutover de reglas: `rules` es la única fuente, [2026-07-14] · S0/DT-4 — drift check SQL↔Prisma en CI, [2026-07-14] · TD-018 — trade services extraídos del router `trades`, Added, Changed, Changelog — Trading Journal v2, Fixed (+9 more)

### Community 98 - "Fixture conductual + validación del loop de punta a punta — Diseño"
Cohesion: 0.14
Nodes (13): 1. Problema, 2. Objetivo y no-objetivos, 3. Umbrales que el fixture debe cruzar, 5.2 Flujo que asserta el test de integración, 5. Arquitectura, 6.1 Self-check del generador, 6.2 Casos negativos, 6.3 El arreglo de ordenamiento, con test en rojo primero (+5 more)

### Community 99 - "trajectory-panel.tsx"
Cohesion: 0.19
Nodes (13): Bead, BEAD, BEADS, buildChart(), fmtWeek(), HOVER, money(), Overview (+5 more)

### Community 100 - "risk-service.ts"
Cohesion: 0.23
Nodes (14): aggregateExposure(), AggregateFreezeInput, AggregateFreezeSignal, aggregateFreezeSignal(), CorrelationResult, Direction, OpenPosition, SymbolExposure (+6 more)

### Community 101 - "executeAiCall"
Cohesion: 0.07
Nodes (49): Auto-revisión del plan, Estructura de ficheros, Global Constraints, Resiliencia de IA sobre el free tier — Plan de implementación, Task 1: `AiCallError` y clasificación transitorio/permanente, Task 2: perfiles de reintento y backoff, Task 3: el ejecutor `executeAiCall`, Task 4: `chat.ts` y `coach-agent.ts` lanzan `AiCallError` (+41 more)

### Community 103 - "mercados/page.tsx"
Cohesion: 0.18
Nodes (12): CAT_COLOR, CAT_LABELS, CATS, FORM_INIT, MarketCard(), MarketForm, MarketItem, MercadosPage() (+4 more)

### Community 104 - "welch.ts"
Cohesion: 0.20
Nodes (16): mean(), oneSampleTTest(), sampleVariance(), studentTTwoSidedP(), TTestResult, welchTTest(), detectEdgeDecay(), EdgeDecayInput (+8 more)

### Community 105 - "psychology-insights.ts"
Cohesion: 0.25
Nodes (7): ACTION_LABEL, ALL, TAG_ACTIONS, LeafCondition, PRE_TRIGGERS, RuleActionType, TRIGGERS

### Community 106 - "palette-studio.tsx"
Cohesion: 0.22
Nodes (13): ADV_ROLES, iconBtn, labelStyle, PaletteStudio(), apply(), persist(), remove(), save() (+5 more)

### Community 110 - "20260524063124_task_020_missing_fk_indexes.sql"
Cohesion: 0.17
Nodes (6): rules_user_id_idx, setups_user_id_idx, trade_events_user_id_idx, trades_setup_id_idx, weekly_reviews_account_id_idx, trades_user_status_date_idx

### Community 111 - "trade-row.tsx"
Cohesion: 0.18
Nodes (16): Task 1: Migración y columna, EditTradeModalProps, TradeDetailPanelProps, getResult(), RESULT_CFG, SESSION_CFG, shortAccount(), TAG_CFG (+8 more)

### Community 112 - "session-revisions.ts"
Cohesion: 0.31
Nodes (8): computeProgressPct(), computeResourceStatus(), resourceProgressLifecycle(), applyStudyFinish(), Contribution, reviseSession(), revisionProgressDelta(), applyStudySessionProgress()

### Community 114 - "Supabase CLI Migrations System Reconciled (36 migrations, config.toml)"
Cohesion: 0.50
Nodes (4): Advisor Migration Made Replay-Safe (#11), add_color_theme_preferences Migration Name Aligned with Prod (#12), prisma.config.ts: Prisma Generates Client Only, Never Migrates, Supabase CLI Migrations System Reconciled (36 migrations, config.toml)

### Community 115 - "data-table.tsx"
Cohesion: 0.21
Nodes (14): AnimatedItem(), AnimatedList(), DataTable(), DefaultEmpty(), gridTemplate(), RovingItemProps, Row(), ROW_PAD (+6 more)

### Community 116 - "revisar-recurso-modal.tsx"
Cohesion: 0.14
Nodes (13): 1. Verificar que los intermedios siguen en disco, 2. Re-lanzar SOLO los chunks 01 y 04 (en paralelo, mismo mensaje), 3. Validar los 2 chunks nuevos, 4. Fusionar los 5 chunks (02+03+05 ya existentes + 01+04 nuevos) en `.graphify_semantic.json`, 5. Re-fusionar semantic + AST (`.graphify_extract.json`) y reconstruir el grafo completo, 6. Limpiar intermedios y commitear, Contexto de negocio (por si la máquina nueva no tiene memoria persistente), Cómo retomar (pasos exactos) (+5 more)

### Community 117 - "Review Focus"
Cohesion: 0.22
Nodes (8): Correcciones auditoría general Implementation Plan, Global Constraints, Review Focus, Task 1: PATCH contracts and reconciled accounts (root), Task 2: Trading/risk/dashboard (independent agent), Task 3: Learning/reviews/Coach (independent agent), Task 4: Import deletion barrier and offline fallback (independent agent), Task 5: Integration and release

### Community 118 - "learning-insights-service.ts"
Cohesion: 0.18
Nodes (14): ErrorCard, ErrorCardInput, ErrorTrade, generateErrorCards(), PerfSignal, computeTransfer(), mean(), TransferInput (+6 more)

### Community 119 - "risk-enforcement.ts"
Cohesion: 0.16
Nodes (21): Task 2: Engine — checkTrailingDrawdown, TD-018 — extraer orquestación de trades.ts (1146 LOC) a service layer, Gate G2 (C6/FREEZE-D8), checkTrailingDrawdown(), Amount, loadRealizedPnlHistory(), realizedRows(), Row (+13 more)

### Community 120 - "emotion-feedback.ts"
Cohesion: 0.13
Nodes (15): (a) Números de firma marcados `-- VERIFY`, ✅ ACTUALIZACIÓN (2026-07-10, cont.): a/b resueltos, c bloqueado por entorno, ✅ ACTUALIZACIÓN (2026-07-10): la UI de Tasks 9 y 10 ya está implementada, (b) Rojo del e2e en CI antes de la corrida de QA, Deploy / migración, POST-6 QA Handoff, ⚠️ Dos confirmaciones pendientes del usuario (heredadas del plan), Handoff QA — POST-6 Prop-Firm Rulebase (+7 more)

### Community 121 - "coach.ts"
Cohesion: 0.11
Nodes (32): assembleContextBlock(), AssembleInput, INJECTABLE_STATUS, MemoryExtraction, MemoryKind, MemoryStatus, parseMemoryExtraction(), ProposedMemory (+24 more)

### Community 122 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, dev, e2e, e2e:ui, email, gen:theme, lint (+4 more)

### Community 125 - "retrieval/types.ts"
Cohesion: 0.12
Nodes (32): Auto-revisión del plan, PR 2 — Re-cableado, Task 10: `aiConfig.indexStatus` + `aiConfig.reindex`, Task 11: Bloque "Indexación semántica" en `/perfil`, Task 1: Tipos y constantes, Task 2: La taxonomía de 5 estados (el corazón, TDD), Task 7: Tool única del Coach con `corpus` enumerado, Task 8: `coach-agent` emite la segunda trama con las citas (+24 more)

### Community 126 - "DrawdownModel"
Cohesion: 0.20
Nodes (11): AccountRiskConfig, DerivedRiskInputs, deriveRiskInputs(), median(), pctToFraction(), PropProjectionInput, DrawdownModel, AccountPhase (+3 more)

### Community 127 - "route.ts"
Cohesion: 0.40
Nodes (5): Captura de emoción: IMPLEMENTADA y verificada en prod (2026-07-28, PRs #175 + #176), Los dos defectos que sólo aparecieron yendo a la BD (#176), Qué hay en producción, Verificado contra prod, no supuesto, Y uno que la suite no habría cazado nunca

### Community 128 - "learning_resources"
Cohesion: 0.27
Nodes (8): learning_resources, learning_resources_user_idx, idx_study_sessions_active, idx_study_sessions_resource, idx_study_sessions_user_started, study_sessions, idx_learning_resources_notes_embedding, idx_learning_resources_notes_embedding

### Community 129 - "localDateISO"
Cohesion: 0.17
Nodes (23): Alcance y diagnóstico, completedStudyStats(), effectiveStudyStartedAt(), minutesThisWeek(), pickStudySuggestion(), ResourceProgressLite, ResourceProgressUpdate, studyStreak() (+15 more)

### Community 131 - "public.users"
Cohesion: 0.36
Nodes (7): coach_memory_user_status_idx, coach_messages_thread_idx, coach_threads_user_idx, public.coach_memory, public.coach_messages, public.coach_threads, public.memory_identity

### Community 132 - "pattern-detector.ts"
Cohesion: 0.15
Nodes (13): 1. EXECUTIVE SUMMARY, 2. HALLAZGOS CRÍTICOS (los que mueven la aguja), 5. RIESGOS DE PRODUCTO, 6. OPORTUNIDADES DE DIFERENCIACIÓN, 7. ROADMAP PRIORIZADO, 8. TOP 50 MEJORAS ORDENADAS POR ROI, AUDITORÍA DE PRODUCTO — Trading Journal v2, Equipo simulado: PM SaaS-trading · Prop trader · Trading psychologist · UX researcher · Behavioral designer · AI product lead · Staff architect (+5 more)

### Community 133 - "tab-portfolio.tsx"
Cohesion: 0.09
Nodes (28): Task 10: UI — dashboard panel shows new rules, ChartTooltip(), TooltipPayload, CircleProgress(), GoalProgressWidget(), GoalProgressWidgetProps, GoalRing(), GoalRingProps (+20 more)

### Community 134 - "20260626120000_v3_s4_behavior_engine.sql"
Cohesion: 0.38
Nodes (9): commitment_checks_commitment_idx, commitment_checks_user_idx, commitments_source_insight_idx, commitments_user_status_idx, public.commitment_checks, public.commitments, public.reinforcements, reinforcements_commitment_idx (+1 more)

### Community 136 - "Behavior Engine (insight → compromiso → regla → verificación → refuerzo)"
Cohesion: 0.20
Nodes (10): Behavior Engine (insight → compromiso → regla → verificación → refuerzo), Memoria del coach (4 capas: episódica, semántica, identidad, mejora), Digest cognitivo semanal ('Tu semana cognitiva'), commitment-service (createCommitmentFromInsight / evaluateWindowCommitments / carryOverCommitments), ImprovementScore / Índice de mejora (0–100), Cron cognitive-digest sin agendar (/api/cron/cognitive-digest), GAP-E1 — memoria jerárquica de 4 capas E13–E16 (reclasificado a v3.2 roadmap), OI-4.x (S4: commitments / loop de comportamiento) (+2 more)

### Community 139 - "FocusSession"
Cohesion: 0.24
Nodes (10): fmt(), FocusSession(), finish(), persistTimer(), togglePause(), updateDraft(), elapsedStudySeconds(), restoreStudyTimer() (+2 more)

### Community 140 - "risk-budget.ts"
Cohesion: 0.17
Nodes (11): Global Constraints, Self-Review, Task 0: Rama, Task 2: Embedding service, Task 3: Dashboard service + primer test de orquestación, Task 4: Read service (list / violaciones / emoción / patrones), Task 5: Write service — create, Task 6: Write service — update + close (+3 more)

### Community 141 - "PR 3 — Citas abribles y deep-link"
Cohesion: 0.25
Nodes (7): Estructura de ficheros, Global Constraints, PR 3 — Citas abribles y deep-link, Recuperación semántica consolidada + citación en el Coach — Plan de implementación, Task 13: Tarjetas de cita en el drawer, Task 14: Deep-link en `/trades` y `/aprendizaje`, Task 15: Verificación contra producción y en vivo

### Community 142 - "retiros/page.tsx"
Cohesion: 0.17
Nodes (19): DeleteCell(), fmtMoney(), FORM_INIT, KpiBox(), NuevoRetiroModal(), RetirosPage(), RetirosTable(), STATUS_META (+11 more)

### Community 144 - "accounts.ts"
Cohesion: 0.10
Nodes (32): Task 7: Account input/serialization for new fields, convertToBase(), fxFactor(), parseFxRates(), USD_VALUE, usdValue(), CashAdjustment, loadAccountCashAdjustments() (+24 more)

### Community 145 - "aprendizaje/page.tsx"
Cohesion: 0.08
Nodes (40): 5. La tool del Coach y el viaje de una cita, PlannedSessionActions(), formatPlanDate(), PlannedSessions(), PracticesTab(), PracticeWeekSummary(), ResourcePracticeHistory(), ProfileClock() (+32 more)

### Community 146 - "isWin"
Cohesion: 0.13
Nodes (24): buildDiscipline(), buildKpis(), buildPnlByDate(), detectIntradayDecay(), buildMonthlyReport(), kpisOf(), MonthlyReport, ReportTrade (+16 more)

### Community 147 - "coach-tools.ts"
Cohesion: 0.10
Nodes (26): summarizeInstitutional(), AccountIntel, buildAnalyticsBundle(), EmotionIntel, holdMinutes(), MarketIntel, round1(), round2() (+18 more)

### Community 148 - "ai-models-card.tsx"
Cohesion: 0.14
Nodes (13): AiModelsCard(), COST_OPTIONS, FEATURE_LABEL, inputStyle, persistedModelRef, persistedModels, Provider, PROVIDER_LABEL (+5 more)

### Community 149 - "public.rule_suggestions"
Cohesion: 0.36
Nodes (5): rules_source_automation_idx, rules_user_idx, public.rule_suggestions, rule_suggestions_insight_idx, rule_suggestions_user_status_idx

### Community 150 - "backfill-embeddings.mjs"
Cohesion: 0.15
Nodes (12): 1. Contexto y estado real verificado (2026-07-13), 2. Gate OI-1 — informe de no-mapeo con datos reales (CERRADO 2026-07-13), 3. Fase 1 — Flip (ops, sin código), 4. Fase 2 — Retiro de `automations` (rama `feat/g2-rules-cutover`), 5. Testing y verificación, 6. Rollback y riesgos, Engine, G2 — Cutover de enforcement a `rules` y retiro de `automations` (+4 more)

### Community 151 - "data/prop-firm-presets.ts"
Cohesion: 0.33
Nodes (5): DrawdownModel, FIRMS, Phase, PROP_FIRM_PRESETS, PropFirmPresetSeed

### Community 153 - "Cognitive Engine (root bounded context)"
Cohesion: 0.17
Nodes (12): 3.10 Etiquetas, 3.11 Mercados, 3.1 Dashboard, 3.2 Trades (journaling), 3.3 Psicología, 3.4 Playbook, 3.5 Reviews, 3.6 Aprendizaje (+4 more)

### Community 154 - "20260625120000_v3_s0_outbox_and_insights.sql"
Cohesion: 0.43
Nodes (7): domain_events_dedupe_idx, domain_events_pending_idx, domain_events_user_idx, insights_active_fingerprint_idx, insights_user_status_idx, public.domain_events, public.insights

### Community 155 - "apply.ts"
Cohesion: 0.17
Nodes (13): clearInlineTokens(), injectInline(), LEGACY_KEYS, LEGACY_VARS, LS_CUSTOM_DARK, LS_CUSTOM_LIGHT, reapplyCustomForMode(), tokensToCssText() (+5 more)

### Community 156 - "monthly_reviews"
Cohesion: 0.43
Nodes (5): monthly_reviews, monthly_reviews_updated_at, monthly_reviews_user_year_idx, update_monthly_reviews_updated_at(), idx_monthly_reviews_summary_embedding

### Community 158 - "mae-mfe.ts"
Cohesion: 0.40
Nodes (5): analyzeMaeMfe(), EMPTY, MaeMfeResult, MaeMfeTrade, mean()

### Community 159 - "insight-store.ts"
Cohesion: 0.10
Nodes (26): File Structure, Global Constraints, S0–S2 Audit Closure Implementation Plan, Self-Review, Task 1: Integration harness (config, isolation, guard, smoke), Task 2: persistInsights integration tests, Task 3: dispatchPending integration test, Task 4: Wire the integration suite into CI (+18 more)

### Community 160 - "General Reliability Implementation Plan"
Cohesion: 0.20
Nodes (9): General Reliability Implementation Plan, Global Constraints, Review Focus, Task1: Finanzas y reloj de cuentas, Task2: Reviews puntuación/notas, Task3: IA indexación y chat, Task4: Playbook/etiquetas y UX, Task5: Aprendizaje (+1 more)

### Community 161 - "Profile reliability and usability Implementation Plan"
Cohesion: 0.29
Nodes (6): Global Constraints, Profile reliability and usability Implementation Plan, Review Focus, Task 1: Backend independiente (TDD por agente), Task 2: Integración y Perfil (principal), Task 3: Verificación y entrega

### Community 162 - "mobile-bottom-bar.tsx"
Cohesion: 0.21
Nodes (10): zustand, CreateAction, IconTab(), MobileBottomBar(), NavItem, useReducedMotion(), OnboardingWelcome(), QuickActionsState (+2 more)

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

### Community 170 - "cognitive-digest-service.ts"
Cohesion: 0.17
Nodes (13): buildCognitiveDigest(), DigestInput, DigestResult, DetectedPattern, detectPatterns(), EpisodeForPattern, PATTERN_TEXT, PatternStatus (+5 more)

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
Cohesion: 0.36
Nodes (7): EmotionFeedback, EmotionStat, EmotionTrade, feedbackForEmotion(), round1(), ADR-0002, wrByEmotion()

### Community 185 - "20260616140000_notifications.sql"
Cohesion: 0.53
Nodes (5): idx_notifications_user_created, idx_notifications_user_read, notification_preferences, notifications, uq_notifications_user_dedupe

### Community 188 - "public.app_settings"
Cohesion: 0.50
Nodes (3): public.app_setting(), public.app_settings, public.app_setting()

### Community 216 - "@anthropic-ai/sdk"
Cohesion: 0.20
Nodes (10): 1. ¿Qué es?, 2. ¿Qué NO es?, 3. Usuarios objetivo, 4. Módulos y rutas, 5. Stack, 6. Mapa de código, 7. Dónde está todo, Lo que v3 y v3.2 añadieron (+2 more)

### Community 217 - "types/index.ts"
Cohesion: 0.09
Nodes (24): Task 5: Part B — `Rule.sourceCommitmentId` FK (dual migration), mockAccounts, mockMarkets, mockResources, mockReviews, mockRules, mockSetups, mockTrades (+16 more)

### Community 218 - "Repetición y autoevaluación de prácticas"
Cohesion: 0.40
Nodes (4): Alternativas, Enfoque, Repetición y autoevaluación de prácticas, Validación

### Community 220 - "class-variance-authority"
Cohesion: 0.20
Nodes (6): class-variance-authority, @prisma/client, @react-email/components, class-variance-authority@^0.7.1, @prisma/client@^7.8.0, @react-email/components@^1.0.12

### Community 221 - "commitment-service.ts"
Cohesion: 0.07
Nodes (34): Task 4: La cadena pura hasta reinforcement, CommitmentResult, CommitmentSpec, CommitmentStatus, CommitmentWindow, Comparator, evaluateResult(), INSIGHT_SPECS (+26 more)

### Community 222 - "continuity.ts"
Cohesion: 0.25
Nodes (9): readReviewSource(), ReviewSource, createReviewCommitment(), loadReviewFollowUp(), planReviewPractice(), requireReview(), serializeCommitment(), serializePlan() (+1 more)

### Community 223 - "Captura de emoción con procedencia — Plan de implementación"
Cohesion: 0.18
Nodes (12): Captura de emoción con procedencia — Plan de implementación, Global Constraints, Notas de método para quien ejecute, Task 4: El componente `EmotionCapture`, Task 5: Superficie A — el trade cerrado deja de esconder el campo, 7. Verificación, El rojo que hay que ver, El test que sostiene el contrato (+4 more)

### Community 224 - "El bucle agéntico del Coach: reintento por ronda y cierre garantizado"
Cohesion: 0.22
Nodes (8): 1. El problema, 4. Verificado antes de decidir, 5. Fuera de alcance (declarado, no omitido), 6. Verificación de la pieza, D1 — Las rondas 2+ fallan en silencio y sin reintento, D2 — Agotar `MAX_ROUNDS` corta sin respuesta, D3 — Cero cobertura directa, El bucle agéntico del Coach: reintento por ronda y cierre garantizado

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

### Community 551 - "recompute-insights/route.ts"
Cohesion: 0.29
Nodes (9): dynamic, maxDuration, POST(), recomputeInsightsForAll(), ImprovementPoint, recordImprovementSnapshot(), recordImprovementSnapshotForAll(), todayUtc() (+1 more)

### Community 557 - "pdf-report-html.ts"
Cohesion: 0.36
Nodes (12): analysisHtml(), C, CALLOUT, calloutHtml(), card(), equitySvg(), esc(), kpiCell() (+4 more)

### Community 558 - "Sidebar.tsx"
Cohesion: 0.21
Nodes (12): DeskItem(), MobileClock(), NAV, NavItem, Sidebar(), SURFACE_NAV, ThemeIcon(), useMinuteClock() (+4 more)

### Community 560 - "analytics-cache.ts"
Cohesion: 0.22
Nodes (5): CACHE_TTL_MS, CacheDb, CacheDelegate, CacheRow, getCachedStats()

### Community 570 - "position-log-modal.tsx"
Cohesion: 0.17
Nodes (11): AccountRules, ADDABLE_TYPES, AddableType, CONTRACTS_TYPES, EVENT_COLORS, EVENT_DESCRIPTIONS, EVENT_LABELS, EventType (+3 more)

### Community 572 - "Learning reminder time Implementation Plan"
Cohesion: 0.29
Nodes (6): Global Constraints, Learning reminder time Implementation Plan, Review Focus, Task 1: Modelo y programación, Task 2: Perfil, Task 3: Entrega

### Community 583 - "20261103050551_learning_practices.sql"
Cohesion: 0.29
Nodes (8): learning_practices_resource_id_idx, learning_practices_user_id_date_id_idx, practice_attachments_practice_id_idx, practice_feedback_practice_id_created_at_idx, public.learning_practices, public.practice_attachments, public.practice_feedback, learning_practices_planned_session_id_key

### Community 584 - "reviews-rail.tsx"
Cohesion: 0.19
Nodes (14): JumpItem, MonthJumpIndex(), PatternCards(), money(), PeriodSummary(), Row(), Summary, labelFor() (+6 more)

### Community 586 - "deriveCommitmentSpec"
Cohesion: 0.17
Nodes (16): Global Constraints, OI-4.8 Commitment-Loop Detectors Implementation Plan, Self-Review, Task 6: La cadena persistida contra Postgres real, Eslabón de cableado (verificado), Alcance, Cerrar la deuda auditada de S0–S2, Decisiones / notas (+8 more)

### Community 588 - "review-card.tsx"
Cohesion: 0.16
Nodes (20): CardActions(), Chip(), Chips(), disciplineColor(), fmtMoney(), GRADE_TONE, Metric(), pnlColor() (+12 more)

### Community 590 - "trade-detail-panel.tsx"
Cohesion: 0.24
Nodes (10): MetricRow(), MetricRowProps, SESSION_COLOR, SESSION_SHORT, shouldOfferEmotionCapture(), TradeDetailPanel(), needsEmotionNudge(), EMOTION_BACKFILL_WINDOW_DAYS (+2 more)

### Community 593 - "coach-service.ts"
Cohesion: 0.27
Nodes (8): maxDuration, POST(), runtime, APP_KNOWLEDGE, buildSystemPrompt(), CoachStreamOptions, MessageParam, streamCoachReply()

### Community 598 - "learning-session-lifecycle.md"
Cohesion: 0.50
Nodes (3): Datos anteriores, Edición de unidades, Sesiones y actualización de Aprendizaje

### Community 600 - "Review Focus"
Cohesion: 0.20
Nodes (9): Global Constraints, Review Focus, Task 1: Cash transparency (root), Task 2: Review continuity (agent), Task 3: Recoverable drafts (agent), Task 4: Strategy context (agent), Task 5: Daily plan (agent), Task 6: Integration/release (root) (+1 more)

### Community 601 - "Correcciones y organización de Perfil"
Cohesion: 0.50
Nodes (3): Comportamiento, Correcciones y organización de Perfil, Implementación

### Community 603 - "Review Focus"
Cohesion: 0.22
Nodes (8): Global Constraints, Learning Usability Implementation Plan, Review Focus, Task 1: Backend and migration, Task 2: History UI, Task 3: Hoy and plan UX, Task 4: Review reasons and library onboarding, Task 5: Integration and release

### Community 604 - "tag-chip.tsx"
Cohesion: 0.38
Nodes (8): SelectableTagChip(), SIZE, TagChip(), TagChipView(), DEFAULT, resolveTagMeta(), TagMeta, useTagCatalog()

### Community 606 - "risk-budget.ts"
Cohesion: 0.29
Nodes (6): clamp01(), computeRiskBudget(), DailyWindow, DailyWindowInput, RiskBudgetInput, RiskOverview

### Community 607 - "20261105023500_durable_account_deletions.sql"
Cohesion: 0.83
Nodes (3): account_deletion_jobs_status_next_attempt_at_idx, private.account_deletion_blocked(), public.account_deletion_jobs

### Community 610 - "context.ts"
Cohesion: 0.40
Nodes (5): Regla del loop 'Enfriamiento tras una pérdida' (enforce, TRADE_PRE_CREATE, BLOCK), buildContext(), ContextAccount, ContextTrade, mondayOf()

### Community 611 - "Mejoras de uso de Aprendizaje"
Cohesion: 0.50
Nodes (3): Enfoque y decisiones de implementación, Mejoras de uso de Aprendizaje, Verificación y límites

### Community 612 - "profile.ts"
Cohesion: 0.42
Nodes (8): invalidateAnalyticsCacheIfNeeded(), isValidIanaTimezone(), normalizeProfileInput(), PROFILE_PUBLIC_FIELDS, UpdateProfileInput, validateProfileUpdate(), requestAccountDeletion(), profileRouter

### Community 615 - "send-learning-digest.ts"
Cohesion: 0.16
Nodes (16): buildLearningDigest(), daysBetween(), DigestInput, DigestReview, formatDateLabel(), isoDate(), MAX_REVIEWS, ReviewKind (+8 more)

### Community 616 - "Correcciones generales y fiabilidad"
Cohesion: 0.33
Nodes (5): Alternativas, Correcciones generales y fiabilidad, Decisiones de implementación, Objetivo, Restricciones

### Community 620 - "Diseño — recuperación semántica consolidada y citación en el Coach"
Cohesion: 0.18
Nodes (10): 10. Criterios de éxito, 1. Punto de partida: qué era falso y qué era cierto, 2. Objetivo, 3. Decisión de arquitectura: A′ — registro con consultas literales, 4. Consolidación: qué absorbe y qué se queda fuera, 6. Taxonomía de estados — el corazón del sprint, 7. Auto-reparación y estado visible, 8. Testing y verificación (+2 more)

### Community 621 - "Prácticas: consistencia del modal y protección de borrador"
Cohesion: 0.50
Nodes (3): Decisiones, Implementación, Prácticas: consistencia del modal y protección de borrador

### Community 622 - "tab-playbook.tsx"
Cohesion: 0.36
Nodes (8): checklistColor(), getWeekKey(), HEALTH_CONFIG, LifecycleSuggestions(), sessionCellColor(), SetupHealthDot(), TabPlaybook(), SetupHealthStatus

### Community 626 - "CreatorModal"
Cohesion: 0.33
Nodes (6): 5.1 Modelo de escenario, CreatorModal(), seed(), openCreate(), WindowTrade, configFromHex()

### Community 636 - "AppShell.tsx"
Cohesion: 0.43
Nodes (4): InterventionOverlay(), AppShell(), CommandPalette(), FadeIn()

### Community 638 - "email-theme.ts"
Cohesion: 0.43
Nodes (5): resolveTheme(), accentHex(), hx(), resolveEmailThemeFor(), ThemePrefs

### Community 642 - "Mejoras del flujo diario, evaluación y recuperación"
Cohesion: 0.33
Nodes (5): Comportamiento esperado, Decisiones de implementación, Enfoque, Mejoras del flujo diario, evaluación y recuperación, Validación

### Community 647 - "parse.ts"
Cohesion: 0.31
Nodes (4): num(), parsePaletteConfig(), parsePaletteConfigJson(), PaletteConfig

### Community 649 - "Provider model catalog Implementation Plan"
Cohesion: 0.29
Nodes (6): Global Constraints, Provider model catalog Implementation Plan, Review Focus, Task 1: Catálogo, Task 2: Selector e integración, Task 3: Entrega

### Community 651 - "Plan de simulación de trader profesional en aria"
Cohesion: 0.18
Nodes (10): 1.2 Cierre, 1.3 Fricción (lo más cercano a la pregunta de producto), Al terminar, Fase 0 — Limpiar el ruido y fijar la línea base, Fase 1 — Validar la captura, a mano (aquí está el valor), Fase 2 — Volumen con patrón, por script, Fase 4 — Las 5 features de IA activas, Fase 5 — Superficies analíticas (+2 more)

### Community 655 - "routers/notifications.ts"
Cohesion: 0.29
Nodes (9): sendEmail(), CATEGORIES, cursorInstant, cursorUuid, decodeNotificationCursor(), notificationCursor, notificationsRouter, PRIORITIES (+1 more)

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
Cohesion: 0.12
Nodes (16): 1.1 Registro, NoteTagSuggestions(), ChecklistEvaluation, ChecklistState, evaluateChecklist(), Regime, REGIME_VALUES, RULES (+8 more)

### Community 670 - "coach-tool-audit.py"
Cohesion: 0.09
Nodes (15): Alcance, Cierre de hallazgos de Aprendizaje, Historial real, Verificación, Aceptación en Vercel (2026-11-01), Aprendizaje: racha, horas y reloj, Hallazgos de la primera entrega, Validación (+7 more)

### Community 674 - "playbook-service.ts"
Cohesion: 0.14
Nodes (22): Dated, Window, detectSetupDrift(), DriftDimension, DriftDimensionKey, DriftInput, DriftResult, DriftTrade (+14 more)

### Community 681 - "La palanca A estaba mal enunciada, y la BD lo desmintió (2026-07-27, spec + plan)"
Cohesion: 0.67
Nodes (3): La palanca A estaba mal enunciada, y la BD lo desmintió (2026-07-27, spec + plan), Los dos defectos que sí existen, Qué se decidió (del usuario, no reabrir)

## Knowledge Gaps
- **423 isolated node(s):** `ADR-0001`, `ADR-0003`, `ADR-0003`, `RFC-4180`, `ADR-0002` (+418 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 2065 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **445 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `perfil/page.tsx` to `react`, `tab-portfolio.tsx`, `trades-table.tsx`, `review-summary.tsx`, `cn`, `resource-grid.tsx`, `dependencies`, `retiros/page.tsx`, `resource-drawer.tsx`, `aprendizaje/page.tsx`, `ai-coach-drawer.tsx`, `ai-models-card.tsx`, `page.tsx`, `analytics/page.tsx`, `motion.ts`, `dashboard/page.tsx`, `register-trade-modal.tsx`, `mobile-bottom-bar.tsx`, `send-review.ts`, `lib/utils.ts`, `reglas/page.tsx`, `next`, `Sidebar.tsx`, `position-log-modal.tsx`, `resource-card.tsx`, `notification-bell.tsx`, `account-card.tsx`, `markdown.tsx`, `reviews-rail.tsx`, `next`, `theme-provider.tsx`, `package.json`, `trade-detail-panel.tsx`, `simple-table.tsx`, `create-account-modal.tsx`, `tag-chip.tsx`, `trajectory-panel.tsx`, `mercados/page.tsx`, `send-learning-digest.ts`, `palette-studio.tsx`, `tab-playbook.tsx`, `data-table.tsx`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `ADR-0001`, `ADR-0003`, `ADR-0003` to the rest of the system?**
  _423 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Global Constraints` be split into smaller, more focused modules?**
  _Cohesion score 0.07671957671957672 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `react` to `emit.ts`, `perfil/page.tsx`, `tab-portfolio.tsx`, `trades-table.tsx`, `cn`, `resource-grid.tsx`, `dependencies`, `retiros/page.tsx`, `resource-drawer.tsx`, `aprendizaje/page.tsx`, `ai-coach-drawer.tsx`, `page.tsx`, `analytics/page.tsx`, `motion.ts`, `dashboard/page.tsx`, `register-trade-modal.tsx`, `mobile-bottom-bar.tsx`, `lib/utils.ts`, `reglas/page.tsx`, `next`, `Sidebar.tsx`, `condition-group.tsx`, `resource-card.tsx`, `position-log-modal.tsx`, `notification-bell.tsx`, `account-card.tsx`, `markdown.tsx`, `today-feed.tsx`, `reviews-rail.tsx`, `next`, `review-card.tsx`, `package.json`, `trade-detail-panel.tsx`, `create-account-modal.tsx`, `tag-chip.tsx`, `mercados/page.tsx`, `psychology-insights.ts`, `palette-studio.tsx`, `data-table.tsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `emit.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09951690821256039 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `cn` to `perfil/page.tsx`, `react`, `tab-portfolio.tsx`, `trades-table.tsx`, `resource-grid.tsx`, `FocusSession`, `retiros/page.tsx`, `resource-drawer.tsx`, `aprendizaje/page.tsx`, `ai-coach-drawer.tsx`, `page.tsx`, `analytics/page.tsx`, `motion.ts`, `dashboard/page.tsx`, `register-trade-modal.tsx`, `mobile-bottom-bar.tsx`, `lib/utils.ts`, `reglas/page.tsx`, `next`, `Sidebar.tsx`, `position-log-modal.tsx`, `resource-card.tsx`, `notification-bell.tsx`, `markdown.tsx`, `reviews-rail.tsx`, `trade-detail-panel.tsx`, `simple-table.tsx`, `create-account-modal.tsx`, `Captura de emoción con procedencia — Plan de implementación`, `mercados/page.tsx`, `tab-playbook.tsx`, `trade-row.tsx`, `data-table.tsx`, `AppShell.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `insights-engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11522048364153627 - nodes in this community are weakly interconnected._