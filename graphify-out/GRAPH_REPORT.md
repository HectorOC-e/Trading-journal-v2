# Graph Report - Trading-journal-v2  (2026-11-02)

## Corpus Check
- 612 files · ~411,527 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 4, .css 2, .example 1)

## Summary
- 4519 nodes · 10315 edges · 635 communities (198 shown, 437 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 498 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7f5d6fc5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- theme/engine.ts
- POST-6 Prop-Firm Rulebase Spec
- emit.ts
- insights-engine.ts
- perfil/page.tsx
- lucide-react
- trades-table.tsx
- review-summary.tsx
- env
- dashboard-analytics.ts
- create-account-modal.tsx
- dependencies
- monthly-letter.tsx
- psychology-insights.ts
- Sidebar.tsx
- coach-memory-service.ts
- ai-coach-drawer.tsx
- index.ts
- notify.tsx
- page.tsx
- markdown.tsx
- trade-write-service.ts
- analytics/page.tsx
- motion.ts
- coach-tools.ts
- improvement-service.ts
- bayes.ts
- risk-enforcement.ts
- deriveCommitmentSpec
- dashboard/page.tsx
- pipeline.ts
- memory-episode-service.ts
- root.ts
- mercados/page.tsx
- src_lib_generated_prisma_client
- lib/utils.ts
- risk-ratios.ts
- report-data.ts
- types.ts
- next
- risk-ratios.ts
- feature-models.ts
- Check-in pre-sesión (go/caution/no_go)
- review-report-shell.tsx
- users
- lucide-react
- psychology-service.ts
- risk-of-ruin.ts
- send-review.ts
- Trading Journal (producto)
- trades
- reviews-digest/route.ts
- overview.ts
- seed-psych-trades.mjs
- Analytics Subsystem
- route.ts
- page.tsx
- condition-group.tsx
- Aprendizaje: racha, horas y reloj
- compilerOptions
- OI-4.8 — Cerrar los 3 loops de compromiso colgantes
- center-sheet.tsx
- ConditionNode
- trade-detail-panel.tsx
- edge-service.ts
- intervention-service.ts
- commitment-service.ts
- account-risk-panel.tsx
- types/index.ts
- send-learning-digest.ts
- rate-limiter.ts
- page.tsx
- next
- psychology-insights.ts
- reglas/page.tsx
- package.json
- ADR-003: Memory Privacy Boundary
- Trading Journal (project)
- risk-service.ts
- today-service.ts
- account-card.tsx
- G2 Rules Cutover Design Spec
- ruleDataFromExecutableInput
- gen-theme-css.mjs
- coach-service.ts
- commitment-service.ts
- reviews/page.tsx
- Estructura de ficheros
- apply.ts
- setups
- Behavior Engine Subsystem
- Intervention Engine Subsystem
- Hardening: P&L, Enforcement, CI/Migrations and Performance (2026-06-10, PRs #6–#17)
- Documentation Consolidation (9 master docs + docs/archive/)
- rules.ts
- page.tsx
- page.tsx
- trajectory-panel.tsx
- DrawdownModel
- executeAiCall
- G2 — Rules Cutover: rules Is the Only Source (2026-07-13)
- ai-config.ts
- welch.ts
- psychology-insights.ts
- coach.ts
- Coach Subsystem
- Memoria del coach (4 capas: episódica, semántica, identidad, mejora)
- Persona: Prop Firm Candidate
- 20260524063124_task_020_missing_fk_indexes.sql
- coach-agent.ts
- resource-card.tsx
- ADR-001: Event Runtime and Delivery
- Supabase CLI Migrations System Reconciled (36 migrations, config.toml)
- review-insights.ts
- revisar-recurso-modal.tsx
- resolve-provider.ts
- learning-insights-service.ts
- trade-detail-panel.tsx
- emotion-feedback.ts
- digest-builder.ts
- scripts
- Trade Service Layer (src/server/services/trades/)
- dashboardStats Server-Side Analytics (Sprint 2)
- embedText
- resource-grid.tsx
- route.ts
- learning_resources
- study-sessions.ts
- Gate G2 — cutover de reglas (automations → rules)
- public.users
- pattern-detector.ts
- PR 2 — Re-cableado
- 20260626120000_v3_s4_behavior_engine.sql
- Sprints 9-12 — Portfolio MVP, PWA, PDF, Onboarding (2026-06-04)
- Behavior Engine (insight → compromiso → regla → verificación → refuerzo)
- Event bus / outbox (publishEvent, dispatchPending, planEventTransition)
- Módulo Trades (/trades)
- trade-row.tsx
- risk-budget.ts
- learning-resources.ts
- preferences.ts
- Embedding Service (pgvector schedule/search/backfill)
- study-session-service.ts
- theme-provider.tsx
- aprendizaje/page.tsx
- intelligence-panel.tsx
- account-risk-panel.tsx
- public.rule_suggestions
- backfill-embeddings.mjs
- cognitive-digest-service.ts
- E2: Rule (unificado con Automation)
- Cognitive Engine (root bounded context)
- 20260625120000_v3_s0_outbox_and_insights.sql
- dispatchPending
- monthly_reviews
- mae-mfe.ts
- File Structure
- prop-firm-presets.ts
- rule-suggestion-service.ts
- handler()
- public.resource_reviews
- benchmark.ts
- pnl-heatmap.ts
- load-state.ts
- index.ts
- CI job: checks (type check, tests, build)
- BACKLOG.md (fuente del backlog; borrado, 2026-06-05)
- focus-session.tsx
- vercel.json
- PaletteStudio
- proxy.ts
- CLAUDE.md
- Invariante: bloqueo pre-trade real
- E4: LearningResource (+transferBaseline)
- prisma.ts
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
- commitment-service.ts
- retiros/page.tsx
- 20260609192355_fix_advisor_security_and_performance.sql
- @trpc/server
- CacheDelegate
- katex
- execute.ts
- next
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
- resend-client.ts
- TD-018 — Trade Services Extracted from trades Router (2026-07-14, PR #130)
- resource-drawer.tsx
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
- Captura de emoción con procedencia — Plan de implementación
- Approach B — Live FK Reference (rejected)
- Approach C — Snapshot + Update Notice (future enhancement)
- Catalog Seed v1 — 3 Anchor Firms
- tag-chip.tsx
- Confirmed Decisions Summary Table
- seed.ts
- leverage.ts
- Account.enforceMode WARN/ENFORCE
- discipline-service.ts
- FREEZE-D13 (respect user autonomy in WARN mode)
- FTMO Preset Rules
- MyFundedFX Preset Rules
- Mapa de ficheros
- Out of Scope / YAGNI Items
- local.ts
- Topstep Preset Rules
- Archivo P9 — tabla automations intacta
- Dual-write automations→rules
- Fase 1 — Flip (ops, sin código)
- Fase 2 — Retiro de automations
- palette-studio.tsx
- view-model.ts
- Gate OI-1 — informe de no-mapeo con datos reales
- trade-form-schema.ts
- OI-5.1 — reglas del loop visibles en /reglas
- CreatorModal
- Prueba observable del flip (rules.last_fired_at bumps, automations quieto)
- badge.tsx
- Riesgo residual — divergencia semántica sutil de runRules
- Rollback fase 1 — quitar RULES_SOURCE (instantáneo)
- 7. Verificación
- RULES_SOURCE env var
- S1/DT-5 — badge de modo lee rule.mode
- Fase 1 ejecutada y verificada en prod (Playwright + SQL, RULE_BLOCKED)
- NoteTagSuggestions
- learning-session-lifecycle.md
- Verificación post-merge en prod (/reglas edita, BLOCK bloquea, last_fired_at bumps)
- Bayesian Confidence Bands (shrinkage estimator)
- Cognitive Layer Thesis (v3)
- 5 Cognitive Surfaces (HOY · OPERAR · ANALIZAR · PROTEGER · MEJORAR)
- Environment Variables (DATABASE_URL, Supabase keys, AI key, CRON_SECRET)
- Event Bus with Outbox (decoupled producers → consumers)
- Institutional Analytics (drawdown, R distribution, Sortino/Calmar/Kelly, MAE/MFE, benchmark, heatmap)
- Intervention Engine (deterministic)
- Playbook Intelligence (edge decay with Welch significance, definition-vs-execution drift, rolling-window evolution, A/B variants)
- docs/PROJECT_GUIDE.md (read-me-first: modules, stack, code map)
- Risk & Prop (ruin risk analytic + Monte Carlo, phase-pass projection, daily budget, multi-account correlation, withdrawal policy)
- docs/STATUS.md (state, pending QA checklist, debt, backlog, roadmap, resume prompt)
- Status: v3.1 Closed (14/14 sprints · 100% audit · 3 gates) + v3.2 In Progress (cognitive companion, 5 live axes)
- tj.v3Shell Feature Flag
- run-rules.test.ts (invariante de no-regresión)
- /api/cron/rules-migration-report (retirado en G2)
- rulesSourceIsUnified() (retirado en G2)
- rule-sync.ts (dual-write, retirado en G2)
- automationsRouter (retirado en G2)
- rules.reorder (primer id = prioridad más alta, mapea 3..0)
- rules.seedDefaults (descriptivas de bienvenida)
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
2. `react` - 115 edges
3. `lucide-react` - 96 edges
4. `trpc` - 71 edges
5. `formatErrorForUser()` - 64 edges
6. `Button()` - 54 edges
7. `DialogContent()` - 43 edges
8. `DialogHeader()` - 42 edges
9. `DialogTitle()` - 42 edges
10. `Dialog` - 41 edges

## Surprising Connections (you probably didn't know these)
- `runRules()` --semantically_similar_to--> `runAutomations() (retirado en G2)`  [INFERRED] [semantically similar]
  src/domains/rules/engine.ts → docs/superpowers/specs/2026-07-13-g2-rules-cutover-design.md
- `Alcance` --references--> `main()`  [INFERRED]
  docs/learning-remaining-findings.md → scripts/coach-tool-audit.py
- `Cierre: PR, CI y verificación en producción` --references--> `main()`  [INFERRED]
  docs/superpowers/plans/2026-07-27-captura-emocion-reconstruida.md → scripts/coach-tool-audit.py
- `Task 5: Suite completa, documentación y PR` --references--> `main()`  [INFERRED]
  docs/superpowers/plans/2026-07-27-coach-agentic-loop.md → scripts/coach-tool-audit.py
- `1. El problema, corregido contra la BD` --references--> `PsychologyPanel()`  [INFERRED]
  docs/superpowers/specs/2026-07-27-captura-emocion-reconstruida-design.md → src/app/reviews/components/report/sections.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI/CD antierrores pipeline** — _github_workflows_ci_checks, _github_workflows_ci_e2e, _github_workflows_ci_migrate_validate, _github_workflows_ci_migrate_deploy [EXTRACTED 1.00]

## Communities (635 total, 437 thin omitted)

### Community 0 - "theme/engine.ts"
Cohesion: 0.15
Nodes (21): Swatch(), accentContrastFor(), ATMOSPHERE_MEDIUM, ATMOSPHERE_STRONG, ATMOSPHERE_SUBTLE, bestContrastOn(), clamp01(), contrastRatio() (+13 more)

### Community 1 - "POST-6 Prop-Firm Rulebase Spec"
Cohesion: 0.08
Nodes (26): Deploy/Migration Flow (merge to main → CI applies migration), Local Validation Results (prisma generate, tsc, vitest 1176/1176, eslint), POST-6 Prop-Firm Rulebase Implementation Plan, Global Constraints, POST-6 — Prop-Firm Rulebase (moat) Implementation Plan, Self-Review, Task 1: Migration — prop_firm_presets + Account fields, Task 10: UI — dashboard prop-firm panel shows the new rules (+18 more)

### Community 2 - "emit.ts"
Cohesion: 0.10
Nodes (37): Task 2: code `INSIGHT_DETECTED` en el catálogo, ToastCard(), ToastCardProps, TYPE_STYLE, TypeStyle, isAppError(), toUserMessage(), TRPC_TO_CODE (+29 more)

### Community 3 - "insights-engine.ts"
Cohesion: 0.17
Nodes (29): File Structure, Task 1: `detectRevengeTrading`, Task 2: `detectOversizing`, Task 3: `detectOffPlan`, Task 4: Round-trip + coverage guard (the loop actually closes), Task 5: Full verification + push, Task 2: Arreglar el ordenamiento de secuencia en insights-engine, 4.1 Por qué llevaba invisible (+21 more)

### Community 4 - "perfil/page.tsx"
Cohesion: 0.15
Nodes (15): AI_PROVIDERS, Card(), COLORBLIND_OPTIONS, DangerBtn(), Field(), GhostBtn(), PerfilPage(), PrimaryBtn() (+7 more)

### Community 5 - "lucide-react"
Cohesion: 0.07
Nodes (46): @trpc/client, SyncBalanceModalProps, syncSchema, SyncValues, AiAnalysisCard(), Period, LearningSummary(), Stat() (+38 more)

### Community 6 - "trades-table.tsx"
Cohesion: 0.07
Nodes (56): RFC-4180, @tanstack/react-table, RetirosTable(), StatusSelect(), AppToaster(), Checkbox(), CheckIcon(), EmptyTrades() (+48 more)

### Community 7 - "review-summary.tsx"
Cohesion: 0.11
Nodes (39): ReviewEmailModel, DigestModel, CtaButton(), Divider(), EmailFooter(), EmailLayout(), ProgressBlock(), reviewChipLabel() (+31 more)

### Community 8 - "env"
Cohesion: 0.05
Nodes (53): env, name, runs-on, steps, concurrency, cancel-in-progress, group, env (+45 more)

### Community 9 - "dashboard-analytics.ts"
Cohesion: 0.08
Nodes (48): Partición practice (financiero excluye DEMO_PERSONAL/DEMO_PROP/BACKTEST; discipline las cuenta), TD-018 Task 3 — Dashboard service + primer test de orquestación, dashboard-service.test.ts (partición practice), getCachedStats(), setCachedStats(), AccountBalance, AccountExposure, AccountLimits (+40 more)

### Community 10 - "create-account-modal.tsx"
Cohesion: 0.10
Nodes (27): Task 9: UI — preset picker + enforceMode toggle, Chip(), PHASE_LABEL, PropFirmPreset, PropFirmPresetPicker(), ACCOUNT_TYPES, BROKERS, FORM_INIT (+19 more)

### Community 11 - "dependencies"
Cohesion: 0.04
Nodes (55): class-variance-authority, clsx, @hookform/resolvers, @prisma/adapter-pg, @prisma/client, puppeteer-core, @radix-ui/react-checkbox, @radix-ui/react-dialog (+47 more)

### Community 12 - "monthly-letter.tsx"
Cohesion: 0.15
Nodes (13): Corrección de los hallazgos de Fase 4 y re-verificación (2026-07-22), Defectos encontrados y corregidos, El hallazgo principal: la captura psicológica es lo que enciende la maquinaria, `embeddings`: roto en silencio, en tres capas, Fase 4 — features de IA, Fase 5 — superficies analíticas, recorridas, Lo que esto NO prueba, Lo que NO se pudo verificar (+5 more)

### Community 14 - "psychology-insights.ts"
Cohesion: 0.27
Nodes (17): Estructura de ficheros, Task 2: El contrato de exclusión de correlación, capturedEmotion(), detectEmotionPerformance(), detectCleanStreak(), detectEmotionBeforeLoss(), detectHoldingAsymmetry(), detectImpulsiveExpectancy() (+9 more)

### Community 15 - "Sidebar.tsx"
Cohesion: 0.06
Nodes (45): react, zustand, ExportPage(), Kpi(), SectionTitle(), CATEGORIES, NotificacionesPage(), InterventionOverlay() (+37 more)

### Community 16 - "coach-memory-service.ts"
Cohesion: 0.19
Nodes (13): Task 4: `dispatchPending` por inyección + claim restringido, DispatchResult, DomainEventRecord, EventStatus, EventTransition, HandlerOutcome, KNOWN, PublishInput (+5 more)

### Community 17 - "ai-coach-drawer.tsx"
Cohesion: 0.10
Nodes (22): AiCoachDrawer(), handleKeyDown(), regenerate(), sendMessage(), streamReply(), ApiError, CiteCard(), clampPos() (+14 more)

### Community 18 - "index.ts"
Cohesion: 0.08
Nodes (34): calcNetPnl(), calcSharpeRatio(), calcAvgR(), calcExpectancyR(), SetupHealthParams, SetupHealthStatus, AiUsageLog, AnalyticsCache (+26 more)

### Community 19 - "notify.tsx"
Cohesion: 0.14
Nodes (21): Task 5: El día vivo dispara la decisión de intervención, 5. Idempotencia (at-least-once → un evento puede reprocesarse), ActionKind, clamp01(), DayState, decideIntervention(), DecisionOpts, detectInterventions() (+13 more)

### Community 20 - "page.tsx"
Cohesion: 0.08
Nodes (32): ChecklistEditor(), COLORS, DbSetup, Direction, DirectionChip(), FORM_INIT, HealthStatus, KpiBox() (+24 more)

### Community 21 - "markdown.tsx"
Cohesion: 0.17
Nodes (19): Block, CALLOUT, CALLOUT_ALIASES, Callout(), CalloutType, CODE_KEYWORDS, CodeBlock(), detectCallout() (+11 more)

### Community 22 - "trade-write-service.ts"
Cohesion: 0.07
Nodes (58): Refactor behavior-preserving (RouterOutputs y schemas zod intactos), Sustituciones mecánicas (ctx.prisma→prisma, ctx.userId→userId, ctx.supabase→supabase), Task 1: Serializers, TD-018 Task 4 — Read service (list/violaciones/emoción/patrones), TD-018 Task 5 — Write service: create, TD-018 Task 6 — Write service: update + close, TD-018 Task 7 — Write service: addEvent + delete + saveChecklistResult, Task 12: `trades.byId` (+50 more)

### Community 23 - "analytics/page.tsx"
Cohesion: 0.06
Nodes (67): AccountsIntel(), amt(), AnalyticsPage(), Bar(), EdgeBadge(), Edges(), Empty(), fmt() (+59 more)

### Community 24 - "motion.ts"
Cohesion: 0.09
Nodes (32): framer-motion, CardEquityChart(), DAYS, EditionHeader(), EditionHeaderData, money(), TONE, Pattern (+24 more)

### Community 25 - "coach-tools.ts"
Cohesion: 0.12
Nodes (26): buildTraderContext(), AccountIntel, AnalyticsBundle, buildAnalyticsBundle(), EmotionIntel, holdMinutes(), MarketIntel, round1() (+18 more)

### Community 26 - "improvement-service.ts"
Cohesion: 0.12
Nodes (25): clamp01(), computeImprovementScore(), costOfIndiscipline(), DEFAULT_WEIGHTS, Driver, ImprovementInputs, ImprovementResult, ImprovementWeights (+17 more)

### Community 27 - "bayes.ts"
Cohesion: 0.11
Nodes (26): betaBinomialEstimate(), betacf(), BetaPrior, betaQuantile(), cohensH(), DEFAULT_BETA_PRIOR, DEFAULT_NORMAL_PRIOR, DirectionalEstimate (+18 more)

### Community 28 - "risk-enforcement.ts"
Cohesion: 0.12
Nodes (27): Task 2: Engine — checkTrailingDrawdown, Task 7: Account input/serialization for new fields, TD-018 — extraer orquestación de trades.ts (1146 LOC) a service layer, Gate G2 (C6/FREEZE-D8), checkTrailingDrawdown(), assertTradeable(), autoUnlock(), evaluateAndLock() (+19 more)

### Community 29 - "deriveCommitmentSpec"
Cohesion: 0.20
Nodes (10): Global Constraints, OI-4.8 Commitment-Loop Detectors Implementation Plan, Alcance, Cerrar la deuda auditada de S0–S2, Decisiones / notas, Origen, Parte B — S1/DT-4: FK de `Rule.sourceCommitmentId`, Parte C — STATUS.md: cerrar la auditoría (+2 more)

### Community 30 - "dashboard/page.tsx"
Cohesion: 0.05
Nodes (62): recharts, Card(), CardProps, ChartTooltip(), TooltipPayload, CircleProgress(), GoalProgressWidget(), GoalProgressWidgetProps (+54 more)

### Community 31 - "pipeline.ts"
Cohesion: 0.17
Nodes (26): Auto-revisión del plan, Task 1: Tipos y constantes, Task 2: La taxonomía de 5 estados (el corazón, TDD), Task 6: El pipeline — búsqueda, auto-reparación y estado, classify(), ClassifyInput, clamp(), embedWithRetry() (+18 more)

### Community 32 - "memory-episode-service.ts"
Cohesion: 0.14
Nodes (22): Task 1: `commitment_created` en `MemoryEventType`, Task 3: `recordEpisodeOnce` idempotente, 4.1 Handler de memoria — `commitment.created`, `commitment.broken`, 4.2 Handler de notificación — `insight.created`, 4. Los dos consumidores, 4. Consolidación: qué absorbe y qué se queda fuera, CommitmentShape, describeCommitment() (+14 more)

### Community 33 - "root.ts"
Cohesion: 0.07
Nodes (51): Task 6: tRPC propFirmPresets.list + typed catalog, zod, handler(), summarizeInstitutional(), isValidSelection(), recordIgnore(), Context, createTRPCContext() (+43 more)

### Community 34 - "mercados/page.tsx"
Cohesion: 0.18
Nodes (12): CAT_COLOR, CAT_LABELS, CATS, FORM_INIT, MarketCard(), MarketForm, MarketItem, MercadosPage() (+4 more)

### Community 35 - "src_lib_generated_prisma_client"
Cohesion: 0.10
Nodes (35): scheduleEmbedding(), finalizeMonthlyReview(), FinalizeResult, MONTHS_ES, evaluateGoal(), GoalContext, GoalProposal, GoalStatus (+27 more)

### Community 36 - "lib/utils.ts"
Cohesion: 0.06
Nodes (89): ResourcePicker(), PlanSessionModal(), AddEditResourceModal(), ResourceFromDB, SetupImpactModal(), LinkSetupModal(), ResourceFromDB, NuevaCuentaModal() (+81 more)

### Community 37 - "risk-ratios.ts"
Cohesion: 0.19
Nodes (17): computeRiskRatios(), Kelly, kellyCriterion(), KellyFromR, kellyFromR(), mean(), rollingRiskRatios(), sortinoRatio() (+9 more)

### Community 38 - "report-data.ts"
Cohesion: 0.11
Nodes (23): buildMonthlyReport(), kpisOf(), MonthlyReport, ReportTrade, sessionsOf(), buildWeeklyReport(), DAY_LABELS, kpisOf() (+15 more)

### Community 39 - "types.ts"
Cohesion: 0.14
Nodes (16): Task 1 — Engine solo-runRules (borrar flag/dispatcher/runAutomations), Test de no-regresión 'G2 cutover invariant', ACTION_TYPES, ActionDeps, ActionResult, Handler, HANDLERS, runAction() (+8 more)

### Community 40 - "next"
Cohesion: 0.10
Nodes (19): next, maxDuration, POST(), runtime, maxDuration, PERIODS, POST(), runtime (+11 more)

### Community 41 - "risk-ratios.ts"
Cohesion: 0.09
Nodes (28): PR 1 — El módulo `retrieval` (sin UI), Task 3: Conformado del resultado (puro, TDD), Task 4: Adaptador `trade_notes`, Task 5: Adaptador `learning_notes` + registro + guarda de contrato, monthlyReviewNotesAdapter, MonthlyReviewRow, MONTHS, resourceNotesAdapter (+20 more)

### Community 42 - "feature-models.ts"
Cohesion: 0.10
Nodes (24): AiProvider, detectProvider(), getCoachModel(), getWeeklySummaryModel(), resolveModel(), AI_FEATURES, AI_PROVIDERS_LIST, AiSettings (+16 more)

### Community 44 - "review-report-shell.tsx"
Cohesion: 0.15
Nodes (35): EquityCurveChart(), PnlTrendChart(), TrendTooltip(), DownloadPdfButton(), Campaign(), Goal, GOAL_STATUS, GoalsPanel() (+27 more)

### Community 45 - "users"
Cohesion: 0.20
Nodes (14): account_logs, account_logs_account_idx, accounts, accounts_user_idx, handle_new_user(), markets, on_auth_user_created, users (+6 more)

### Community 46 - "lucide-react"
Cohesion: 0.08
Nodes (34): lucide-react, DOW, HoyTab(), TOUR_STEPS, KpiBox(), AccountHistoryModal(), EVENT_META, Log (+26 more)

### Community 47 - "psychology-service.ts"
Cohesion: 0.17
Nodes (20): calibration(), CheckinInput, CheckinResult, CheckinVerdict, checkinVerdict(), clamp(), LABEL, avg() (+12 more)

### Community 48 - "risk-of-ruin.ts"
Cohesion: 0.15
Nodes (20): Band, jeffreysBand(), Bottleneck, mean(), PassOutcome, percentile(), projectPhasePass(), PropProjectionResult (+12 more)

### Community 49 - "send-review.ts"
Cohesion: 0.14
Nodes (23): GET(), maxDuration, runtime, EMAIL_CHANNEL, EmailPrefRow, isEmailChannelEnabled(), EmailAttachment, MONTHS (+15 more)

### Community 51 - "trades"
Cohesion: 0.13
Nodes (13): trades, trades_account_idx, trades_user_date_idx, trade_events, trade_events_trade_id_idx, idx_trades_notes_embedding, idx_trades_plan_notes_embedding, idx_trade_events_notes_embedding (+5 more)

### Community 52 - "reviews-digest/route.ts"
Cohesion: 0.26
Nodes (12): dynamic, maxDuration, POST(), USER_SELECT, ReviewEmailStatus, ReviewEmailUser, dayOfMonthOf(), duePeriods() (+4 more)

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

### Community 59 - "Aprendizaje: racha, horas y reloj"
Cohesion: 0.20
Nodes (8): Alcance, Cierre de hallazgos de Aprendizaje, Historial real, Verificación, Aceptación en Vercel (2026-11-01), Aprendizaje: racha, horas y reloj, Hallazgos de la primera entrega, Validación

### Community 60 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 61 - "OI-4.8 — Cerrar los 3 loops de compromiso colgantes"
Cohesion: 0.25
Nodes (7): Alcance, Decisiones de diseño, OI-4.8 — Cerrar los 3 loops de compromiso colgantes, Problema, Riesgos / a chequear durante la implementación, Testing (TDD), Verificación de cierre

### Community 62 - "center-sheet.tsx"
Cohesion: 0.50
Nodes (3): react-dom, CenterSheet(), react-dom@19.2.7

### Community 63 - "ConditionNode"
Cohesion: 0.24
Nodes (16): Task 5 — Borrar automations router, dual-write e informe de migración, RuleDraft, PROTECTION_TEMPLATE_MAP, PROTECTION_TEMPLATES, ProtectionTemplate, ExecutableRuleInput, AutomationTemplate, BASE_TEMPLATES (+8 more)

### Community 64 - "trade-detail-panel.tsx"
Cohesion: 0.07
Nodes (29): ADR-000 — Decisiones de raíz de Trading Journal v3.1, ADR-001 — Runtime de eventos y entrega, ADR-002 — Estrategia estadística, ADR-003 — Privacidad de la memoria y frontera anti-corrupción, ADR-004 — Reserva de datos cross-user (BIZ-1), Alternativas consideradas, Alternativas consideradas, Alternativas consideradas (+21 more)

### Community 65 - "edge-service.ts"
Cohesion: 0.17
Nodes (16): computeInstrumentEdges(), EdgeVerdict, InstrumentEdge, InstrumentEdgeResult, InstrumentTrade, mean(), computeTagEdges(), mean() (+8 more)

### Community 66 - "intervention-service.ts"
Cohesion: 0.19
Nodes (15): calmarRatio(), accountDrawdown(), AccountRisk, AccountRiskInput, computeAccountRisk(), gauge(), LimitGauge, lossPct() (+7 more)

### Community 67 - "commitment-service.ts"
Cohesion: 0.16
Nodes (21): CommitmentWindow, getVerifier(), publishEvent(), acceptProposedCommitment(), carryOverCommitments(), createCommitmentFromInsight(), CreateCommitmentOverrides, dismissProposedCommitment() (+13 more)

### Community 68 - "account-risk-panel.tsx"
Cohesion: 0.24
Nodes (10): AccountRiskPanel(), asPct(), BOTTLENECK, pct(), RiskBudgetMeter(), KIND_ICON, severityColor(), TodayFeed() (+2 more)

### Community 69 - "types/index.ts"
Cohesion: 0.09
Nodes (23): Task 5: Part B — `Rule.sourceCommitmentId` FK (dual migration), mockAccounts, mockMarkets, mockResources, mockReviews, mockRules, mockSetups, mockTrades (+15 more)

### Community 70 - "send-learning-digest.ts"
Cohesion: 0.12
Nodes (22): AuthResult, dynamic, maxDuration, POST(), USER_SELECT, resolveTheme(), localHour(), accentHex() (+14 more)

### Community 71 - "rate-limiter.ts"
Cohesion: 0.19
Nodes (11): POST(), Provider, rateLimiter, testAnthropicKey(), testOpenAIKey(), testOpenRouterKey(), createRateLimiter(), InMemoryRateLimiter (+3 more)

### Community 72 - "page.tsx"
Cohesion: 0.14
Nodes (13): AiModelsCard(), ALL_TOOL_MODELS, COST_OPTIONS, FEATURE_LABEL, inputStyle, looksToolIncapable(), Provider, PROVIDER_LABEL (+5 more)

### Community 73 - "next"
Cohesion: 0.36
Nodes (7): LoginPage(), handleSubmit(), useLogout(), clearSessionStorageKeys(), SESSION_SCOPED_STORAGE_KEYS, STORAGE_KEYS, createClient()

### Community 74 - "psychology-insights.ts"
Cohesion: 0.13
Nodes (14): 1. El problema, corregido contra la BD, 2. Qué entrega esta pieza, y qué no, 3. Decisiones tomadas y por qué, 4. Modelo de datos, 5. El contrato de exclusión, 6. Superficies, 8. Resumen en tres ejes, A — el trade cerrado (`trade-detail-panel.tsx:640`) (+6 more)

### Community 75 - "reglas/page.tsx"
Cohesion: 0.17
Nodes (13): ACTION_LABEL, ExecRuleRow, ReglasPage(), RemindersTab(), SystemRulesTab(), TABS, Template, TRIGGER_LABEL (+5 more)

### Community 76 - "package.json"
Cohesion: 0.06
Nodes (45): eslint, eslint-config-next, jsdom, @playwright/test, prisma, react-email, tailwindcss, @tailwindcss/postcss (+37 more)

### Community 78 - "Trading Journal (project)"
Cohesion: 0.12
Nodes (16): 1. Clonar e instalar, 2. Variables de entorno, 3. Base de datos, 4. Levantar el dev server, 🚀 Cómo iniciar el proyecto, 📚 Documentación, El núcleo cognitivo, 📁 Estructura (+8 more)

### Community 79 - "risk-service.ts"
Cohesion: 0.23
Nodes (14): aggregateExposure(), AggregateFreezeInput, AggregateFreezeSignal, aggregateFreezeSignal(), CorrelationResult, Direction, OpenPosition, SymbolExposure (+6 more)

### Community 80 - "today-service.ts"
Cohesion: 0.19
Nodes (16): RiskBudget, AnomalyInput, AnomalyResult, assembleTodayFeed(), BASE, detectDailyAnomaly(), SEVERITY_MULT, SignalInput (+8 more)

### Community 81 - "account-card.tsx"
Cohesion: 0.19
Nodes (18): ACCOUNT_STATUS_META, AccountCard(), AccountExposure, AccountRisk, formatSyncAgo(), isPropFirmLike(), RawAccount, TradeStats (+10 more)

### Community 83 - "G2 Rules Cutover Design Spec"
Cohesion: 0.22
Nodes (8): G2 Fase 2 — Retiro de `automations` · Implementation Plan, Global Constraints, Task 1: Engine solo-`runRules` (borrar flag/dispatcher/runAutomations), Task 2: Helpers puros de escritura de reglas (`rule-write.ts`, TDD), Task 3: Router `rules` a paridad ejecutable, Task 4: UI `/reglas` → `trpc.rules.*`, Task 5: Borrar automations router, dual-write e informe de migración, Task 6: Validación final, docs y push

### Community 84 - "ruleDataFromExecutableInput"
Cohesion: 0.19
Nodes (11): Task 2 — Helpers puros de escritura de reglas (rule-write, TDD), Task 3 — Router rules a paridad ejecutable, rule-write.test.ts, ruleDataFromExecutableInput(), ruleDataFromTemplate(), rules.createExecutable, rules.createFromTemplate, rules.list (+3 more)

### Community 85 - "gen-theme-css.mjs"
Cohesion: 0.09
Nodes (28): accentContrastFor(), clamp01(), contrastRatio(), derivePalette(), hexToRgb(), linearToSrgb(), okl(), oklchToHex() (+20 more)

### Community 86 - "coach-service.ts"
Cohesion: 0.23
Nodes (18): 1. Punto de partida (verificado contra código y prod, 2026-07-24), 9. Testing, Dónde está duplicado, exactamente, El defecto que apareció de paso, y que explica un síntoma, buildContext(), streamAnalyticsInsights(), windowFor(), APP_KNOWLEDGE (+10 more)

### Community 87 - "commitment-service.ts"
Cohesion: 0.10
Nodes (20): 0. Alcance de la congelación, 10. Analytics (FREEZE — subsistema), 12. Trazabilidad: cómo este freeze cierra los hallazgos, 13. Qué desbloquea la implementación (puerta de salida), 1. Principios (FREEZE-P), 2. Módulos (mapa físico), 3. Bounded contexts y fronteras (FREEZE-D, parte 1), 4.1 Mecanismo congelado (FREEZE-D1 — resuelve ADR-001) (+12 more)

### Community 88 - "reviews/page.tsx"
Cohesion: 0.13
Nodes (22): JumpItem, MonthJumpIndex(), PatternCards(), money(), PeriodSummary(), Row(), Summary, labelFor() (+14 more)

### Community 89 - "Estructura de ficheros"
Cohesion: 0.19
Nodes (15): Auto-revisión del plan, Estructura de ficheros, Primer consumidor S4 del outbox — Plan de implementación, Task 5: handler de memoria (`commitment.*`), Task 6: handler de notificación (`insight.created`), Task 7: composición (`HANDLERS`) + wiring del endpoint, Task 8: re-agendar el cron, Task 9: PR, merge y verificación en producción (+7 more)

### Community 90 - "apply.ts"
Cohesion: 0.13
Nodes (14): clearInlineTokens(), LEGACY_KEYS, LEGACY_VARS, LS_CUSTOM_DARK, LS_CUSTOM_LIGHT, num(), parsePaletteConfig(), parsePaletteConfigJson() (+6 more)

### Community 91 - "setups"
Cohesion: 0.16
Nodes (10): setups, "_ResourceSetups", _ResourceSetups_AB_unique, _ResourceSetups_B_index, idx_checklist_results_user, trade_checklist_results, setup_versions, setup_versions (+2 more)

### Community 96 - "rules.ts"
Cohesion: 0.14
Nodes (13): TEMPLATES, action, ACTION_TYPES, cmp, conditionNode, conditionValue, executableInput, leaf (+5 more)

### Community 97 - "page.tsx"
Cohesion: 0.12
Nodes (17): [2026-06-05] · AI config, migraciones y consolidación documental, [2026-07-13] · G2 — cutover de reglas: `rules` es la única fuente, [2026-07-14] · S0/DT-4 — drift check SQL↔Prisma en CI, [2026-07-14] · TD-018 — trade services extraídos del router `trades`, Added, Changed, Changelog — Trading Journal v2, Fixed (+9 more)

### Community 98 - "page.tsx"
Cohesion: 0.14
Nodes (13): 1. Problema, 2. Objetivo y no-objetivos, 3. Umbrales que el fixture debe cruzar, 5.2 Flujo que asserta el test de integración, 5. Arquitectura, 6.1 Self-check del generador, 6.2 Casos negativos, 6.3 El arreglo de ordenamiento, con test en rojo primero (+5 more)

### Community 99 - "trajectory-panel.tsx"
Cohesion: 0.19
Nodes (13): Bead, BEAD, BEADS, buildChart(), fmtWeek(), HOVER, money(), Overview (+5 more)

### Community 100 - "DrawdownModel"
Cohesion: 0.20
Nodes (11): AccountRiskConfig, DerivedRiskInputs, deriveRiskInputs(), median(), pctToFraction(), PropProjectionInput, DrawdownModel, AccountPhase (+3 more)

### Community 101 - "executeAiCall"
Cohesion: 0.11
Nodes (32): Auto-revisión del plan, Estructura de ficheros, Global Constraints, Resiliencia de IA sobre el free tier — Plan de implementación, Task 1: `AiCallError` y clasificación transitorio/permanente, Task 2: perfiles de reintento y backoff, Task 3: el ejecutor `executeAiCall`, Task 4: `chat.ts` y `coach-agent.ts` lanzan `AiCallError` (+24 more)

### Community 103 - "ai-config.ts"
Cohesion: 0.18
Nodes (15): ConnectivityResult, testProviderConnectivity(), decryptApiKey(), encryptApiKey(), EncryptionConfigError, getEncryptionKey(), maskApiKey(), rotateEncryptionKey() (+7 more)

### Community 104 - "welch.ts"
Cohesion: 0.32
Nodes (11): mean(), oneSampleTTest(), sampleVariance(), studentTTwoSidedP(), TTestResult, welchTTest(), detectEdgeDecay(), EdgeDecayInput (+3 more)

### Community 105 - "psychology-insights.ts"
Cohesion: 0.25
Nodes (7): ACTION_LABEL, ALL, TAG_ACTIONS, LeafCondition, PRE_TRIGGERS, RuleActionType, TRIGGERS

### Community 106 - "coach.ts"
Cohesion: 0.08
Nodes (39): assembleContextBlock(), AssembleInput, INJECTABLE_STATUS, MemoryExtraction, MemoryKind, MemoryStatus, parseMemoryExtraction(), ProposedMemory (+31 more)

### Community 110 - "20260524063124_task_020_missing_fk_indexes.sql"
Cohesion: 0.17
Nodes (6): rules_user_id_idx, setups_user_id_idx, trade_events_user_id_idx, trades_setup_id_idx, weekly_reviews_account_id_idx, trades_user_status_date_idx

### Community 111 - "coach-agent.ts"
Cohesion: 0.15
Nodes (15): Bucle agéntico del Coach — Implementation Plan, File Structure, Global Constraints, Notas de ejecución, Task 1: Un solo candidato en la interfaz, y asas de reloj, Task 2: Arnés de test y guardas de lo que ya funciona, Task 3: Agotar rondas fuerza una respuesta final (D2, ambas rutas), Task 5: Suite completa, documentación y PR (+7 more)

### Community 112 - "resource-card.tsx"
Cohesion: 0.17
Nodes (16): ARCHIVE_REASONS, formatMinutes(), MasteryRing(), MenuItem(), MenuItemProps, progressColor(), progressLabel(), relativeTime() (+8 more)

### Community 114 - "Supabase CLI Migrations System Reconciled (36 migrations, config.toml)"
Cohesion: 0.50
Nodes (4): Advisor Migration Made Replay-Safe (#11), add_color_theme_preferences Migration Name Aligned with Prod (#12), prisma.config.ts: Prisma Generates Client Only, Never Migrates, Supabase CLI Migrations System Reconciled (36 migrations, config.toml)

### Community 115 - "review-insights.ts"
Cohesion: 0.13
Nodes (15): 10. Fuera de alcance (YAGNI / POST), 11. Resumen de decisiones confirmadas, 1. Objetivo y valor, 2. Estado actual (de qué partimos), 3. Decisión arquitectónica — Snapshot (Approach A), 4.1 Nueva tabla `PropFirmPreset` (data de referencia GLOBAL, no per-usuario), 4.2 Campos nuevos en `Account` (los que faltan), 4.3 Migración (+7 more)

### Community 116 - "revisar-recurso-modal.tsx"
Cohesion: 0.14
Nodes (13): 1. Verificar que los intermedios siguen en disco, 2. Re-lanzar SOLO los chunks 01 y 04 (en paralelo, mismo mensaje), 3. Validar los 2 chunks nuevos, 4. Fusionar los 5 chunks (02+03+05 ya existentes + 01+04 nuevos) en `.graphify_semantic.json`, 5. Re-fusionar semantic + AST (`.graphify_extract.json`) y reconstruir el grafo completo, 6. Limpiar intermedios y commitear, Contexto de negocio (por si la máquina nueva no tiene memoria persistente), Cómo retomar (pasos exactos) (+5 more)

### Community 117 - "resolve-provider.ts"
Cohesion: 0.18
Nodes (16): Task 6: embeddings — lista de candidatos y fallo que se distingue, getProviderKey(), FREE_MODEL_CHAIN, loadAiSettings(), resolveModelForFeature(), AiDiagnostics, ALL_PROVIDERS, buildAiDiagnostics() (+8 more)

### Community 118 - "learning-insights-service.ts"
Cohesion: 0.18
Nodes (16): ErrorCard, ErrorCardInput, ErrorTrade, generateErrorCards(), PerfSignal, computeTransfer(), mean(), TransferInput (+8 more)

### Community 119 - "trade-detail-panel.tsx"
Cohesion: 0.16
Nodes (15): EditTradeModalProps, MetricRow(), MetricRowProps, SESSION_COLOR, SESSION_SHORT, shouldOfferEmotionCapture(), TradeDetailPanel(), TradeDetailPanelProps (+7 more)

### Community 120 - "emotion-feedback.ts"
Cohesion: 0.13
Nodes (15): (a) Números de firma marcados `-- VERIFY`, ✅ ACTUALIZACIÓN (2026-07-10, cont.): a/b resueltos, c bloqueado por entorno, ✅ ACTUALIZACIÓN (2026-07-10): la UI de Tasks 9 y 10 ya está implementada, (b) Rojo del e2e en CI antes de la corrida de QA, Deploy / migración, POST-6 QA Handoff, ⚠️ Dos confirmaciones pendientes del usuario (heredadas del plan), Handoff QA — POST-6 Prop-Firm Rulebase (+7 more)

### Community 121 - "digest-builder.ts"
Cohesion: 0.23
Nodes (11): buildLearningDigest(), daysBetween(), DigestInput, DigestReview, formatDateLabel(), isoDate(), MAX_REVIEWS, ReviewKind (+3 more)

### Community 122 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, dev, e2e, e2e:ui, email, gen:theme, lint (+4 more)

### Community 125 - "embedText"
Cohesion: 0.10
Nodes (19): 10. Criterios de éxito, 2. Objetivo y no-objetivos, 3. Arquitectura: un ejecutor, un comportamiento, 4. La cadena de modelos gratuitos, 5. Clasificación del error y política de reintento, 6. Embeddings, 7. Lo que NO se maneja, a propósito, 8. Observabilidad (+11 more)

### Community 126 - "resource-grid.tsx"
Cohesion: 0.15
Nodes (12): ResourceCardProps, ResourceDrawerProps, CATEGORY_OPTIONS, ResourceGrid(), ResourceGridProps, SORT_OPTIONS, SortKey, sortResources() (+4 more)

### Community 127 - "route.ts"
Cohesion: 0.40
Nodes (5): Captura de emoción: IMPLEMENTADA y verificada en prod (2026-07-28, PRs #175 + #176), Los dos defectos que sólo aparecieron yendo a la BD (#176), Qué hay en producción, Verificado contra prod, no supuesto, Y uno que la suite no habría cazado nunca

### Community 128 - "learning_resources"
Cohesion: 0.27
Nodes (8): learning_resources, learning_resources_user_idx, idx_study_sessions_active, idx_study_sessions_resource, idx_study_sessions_user_started, study_sessions, idx_learning_resources_notes_embedding, idx_learning_resources_notes_embedding

### Community 129 - "study-sessions.ts"
Cohesion: 0.26
Nodes (13): Alcance y diagnóstico, isResourceReviewDue(), effectiveStudyStartedAt(), minutesThisWeek(), pickStudySuggestion(), studyStreak(), weekStartISO(), dayKey() (+5 more)

### Community 131 - "public.users"
Cohesion: 0.36
Nodes (7): coach_memory_user_status_idx, coach_messages_thread_idx, coach_threads_user_idx, public.coach_memory, public.coach_messages, public.coach_threads, public.memory_identity

### Community 132 - "pattern-detector.ts"
Cohesion: 0.15
Nodes (13): 1. EXECUTIVE SUMMARY, 2. HALLAZGOS CRÍTICOS (los que mueven la aguja), 5. RIESGOS DE PRODUCTO, 6. OPORTUNIDADES DE DIFERENCIACIÓN, 7. ROADMAP PRIORIZADO, 8. TOP 50 MEJORAS ORDENADAS POR ROI, AUDITORÍA DE PRODUCTO — Trading Journal v2, Equipo simulado: PM SaaS-trading · Prop trader · Trading psychologist · UX researcher · Behavioral designer · AI product lead · Staff architect (+5 more)

### Community 133 - "PR 2 — Re-cableado"
Cohesion: 0.13
Nodes (14): Estructura de ficheros, Global Constraints, PR 2 — Re-cableado, PR 3 — Citas abribles y deep-link, Recuperación semántica consolidada + citación en el Coach — Plan de implementación, Task 10: `aiConfig.indexStatus` + `aiConfig.reindex`, Task 11: Bloque "Indexación semántica" en `/perfil`, Task 13: Tarjetas de cita en el drawer (+6 more)

### Community 134 - "20260626120000_v3_s4_behavior_engine.sql"
Cohesion: 0.38
Nodes (9): commitment_checks_commitment_idx, commitment_checks_user_idx, commitments_source_insight_idx, commitments_user_status_idx, public.commitment_checks, public.commitments, public.reinforcements, reinforcements_commitment_idx (+1 more)

### Community 136 - "Behavior Engine (insight → compromiso → regla → verificación → refuerzo)"
Cohesion: 0.20
Nodes (10): Behavior Engine (insight → compromiso → regla → verificación → refuerzo), Memoria del coach (4 capas: episódica, semántica, identidad, mejora), Digest cognitivo semanal ('Tu semana cognitiva'), commitment-service (createCommitmentFromInsight / evaluateWindowCommitments / carryOverCommitments), ImprovementScore / Índice de mejora (0–100), Cron cognitive-digest sin agendar (/api/cron/cognitive-digest), GAP-E1 — memoria jerárquica de 4 capas E13–E16 (reclasificado a v3.2 roadmap), OI-4.x (S4: commitments / loop de comportamiento) (+2 more)

### Community 139 - "trade-row.tsx"
Cohesion: 0.20
Nodes (14): Task 1: Migración y columna, getResult(), RESULT_CFG, SESSION_CFG, shortAccount(), TAG_CFG, TradeRow(), TradeRowProps (+6 more)

### Community 140 - "risk-budget.ts"
Cohesion: 0.17
Nodes (11): Global Constraints, Self-Review, Task 0: Rama, Task 2: Embedding service, Task 3: Dashboard service + primer test de orquestación, Task 4: Read service (list / violaciones / emoción / patrones), Task 5: Write service — create, Task 6: Write service — update + close (+3 more)

### Community 141 - "learning-resources.ts"
Cohesion: 0.12
Nodes (19): detectDecayedResources(), ResourceForDecay, computeNextReview(), Grade, SrsInput, SrsResult, updateEase(), LearningResourceInput (+11 more)

### Community 142 - "preferences.ts"
Cohesion: 0.18
Nodes (10): 1.2 Cierre, 1.3 Fricción (lo más cercano a la pregunta de producto), Al terminar, Fase 0 — Limpiar el ruido y fijar la línea base, Fase 1 — Validar la captura, a mano (aquí está el valor), Fase 2 — Volumen con patrón, por script, Fase 4 — Las 5 features de IA activas, Fase 5 — Superficies analíticas (+2 more)

### Community 144 - "study-session-service.ts"
Cohesion: 0.21
Nodes (9): computeProgressPct(), computeResourceStatus(), applyStudyFinish(), ResourceProgressLite, ResourceProgressUpdate, StudySuggestion, StudySuggestionKind, SuggestionInput (+1 more)

### Community 145 - "theme-provider.tsx"
Cohesion: 0.15
Nodes (15): metadata, RootLayout(), viewport, ServiceWorkerRegister(), CYCLE, getSystemTheme(), ResolvedTheme, resolveTheme() (+7 more)

### Community 146 - "aprendizaje/page.tsx"
Cohesion: 0.14
Nodes (15): 5. La tool del Coach y el viaje de una cita, ProfileClock(), useLearningCalendar(), ResourceFromDB, useResourceActions(), handleEditOpen(), handleOpen(), ResourceFromDB (+7 more)

### Community 147 - "intelligence-panel.tsx"
Cohesion: 0.36
Nodes (5): AiInsightsPanel(), CAT_ICON, InsightCards(), sevStyle(), IntelligencePanel()

### Community 148 - "account-risk-panel.tsx"
Cohesion: 0.13
Nodes (27): CardActions(), Chip(), Chips(), disciplineColor(), fmtMoney(), GRADE_TONE, Metric(), pnlColor() (+19 more)

### Community 149 - "public.rule_suggestions"
Cohesion: 0.36
Nodes (5): rules_source_automation_idx, rules_user_idx, public.rule_suggestions, rule_suggestions_insight_idx, rule_suggestions_user_status_idx

### Community 150 - "backfill-embeddings.mjs"
Cohesion: 0.15
Nodes (12): 1. Contexto y estado real verificado (2026-07-13), 2. Gate OI-1 — informe de no-mapeo con datos reales (CERRADO 2026-07-13), 3. Fase 1 — Flip (ops, sin código), 4. Fase 2 — Retiro de `automations` (rama `feat/g2-rules-cutover`), 5. Testing y verificación, 6. Rollback y riesgos, Engine, G2 — Cutover de enforcement a `rules` y retiro de `automations` (+4 more)

### Community 151 - "cognitive-digest-service.ts"
Cohesion: 0.36
Nodes (7): buildCognitiveDigest(), DigestInput, DigestResult, isoWeekKey(), sendCognitiveDigest(), sendCognitiveDigestForAll(), getImprovementSeries()

### Community 153 - "Cognitive Engine (root bounded context)"
Cohesion: 0.17
Nodes (12): 3.10 Etiquetas, 3.11 Mercados, 3.1 Dashboard, 3.2 Trades (journaling), 3.3 Psicología, 3.4 Playbook, 3.5 Reviews, 3.6 Aprendizaje (+4 more)

### Community 154 - "20260625120000_v3_s0_outbox_and_insights.sql"
Cohesion: 0.43
Nodes (7): domain_events_dedupe_idx, domain_events_pending_idx, domain_events_user_idx, insights_active_fingerprint_idx, insights_user_status_idx, public.domain_events, public.insights

### Community 155 - "dispatchPending"
Cohesion: 0.26
Nodes (12): Global Constraints, 1. Punto de partida (verificado contra código y prod), 2. Objetivo, 3. Decisión de arquitectura: inyección de handlers (opción B), 6. Re-agendar el cron, 7. Lo que NO se maneja, a propósito, 8. Testing, 9. Criterios de éxito (+4 more)

### Community 156 - "monthly_reviews"
Cohesion: 0.43
Nodes (5): monthly_reviews, monthly_reviews_updated_at, monthly_reviews_user_year_idx, update_monthly_reviews_updated_at(), idx_monthly_reviews_summary_embedding

### Community 158 - "mae-mfe.ts"
Cohesion: 0.40
Nodes (5): analyzeMaeMfe(), EMPTY, MaeMfeResult, MaeMfeTrade, mean()

### Community 159 - "File Structure"
Cohesion: 0.10
Nodes (25): File Structure, Global Constraints, S0–S2 Audit Closure Implementation Plan, Self-Review, Task 1: Integration harness (config, isolation, guard, smoke), Task 2: persistInsights integration tests, Task 3: dispatchPending integration test, Task 4: Wire the integration suite into CI (+17 more)

### Community 160 - "prop-firm-presets.ts"
Cohesion: 0.33
Nodes (5): DrawdownModel, FIRMS, Phase, PROP_FIRM_PRESETS, PropFirmPresetSeed

### Community 161 - "rule-suggestion-service.ts"
Cohesion: 0.20
Nodes (16): Self-Review, Task 7: Commitment persistido y regla enlazada (linkRule), Fase 3 — El loop conductual, Eslabón de cableado (verificado), Insight, canCommit(), deriveCommitmentSpec(), block() (+8 more)

### Community 162 - "handler()"
Cohesion: 0.20
Nodes (9): 10. Criterios de éxito, 1. Punto de partida: qué era falso y qué era cierto, 2. Objetivo, 3. Decisión de arquitectura: A′ — registro con consultas literales, 6. Taxonomía de estados — el corazón del sprint, 7. Auto-reparación y estado visible, 8. Testing y verificación, 9. Alcance y partición sugerida (+1 more)

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

### Community 170 - "focus-session.tsx"
Cohesion: 0.09
Nodes (34): fmt(), FocusSession(), finish(), persistTimer(), togglePause(), updateDraft(), ALL_TYPES, Card() (+26 more)

### Community 171 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

### Community 172 - "PaletteStudio"
Cohesion: 0.33
Nodes (12): PaletteStudio(), apply(), persist(), remove(), save(), applyColorTheme(), injectInline(), reapplyCustomForMode() (+4 more)

### Community 173 - "proxy.ts"
Cohesion: 0.40
Nodes (3): @supabase/ssr, @supabase/ssr@^0.10.3, config

### Community 177 - "prisma.ts"
Cohesion: 0.10
Nodes (24): dynamic, maxDuration, POST(), dynamic, maxDuration, POST(), ADR-0001, dynamic (+16 more)

### Community 185 - "20260616140000_notifications.sql"
Cohesion: 0.53
Nodes (5): idx_notifications_user_created, idx_notifications_user_read, notification_preferences, notifications, uq_notifications_user_dedupe

### Community 188 - "public.app_settings"
Cohesion: 0.50
Nodes (3): public.app_setting(), public.app_settings, public.app_setting()

### Community 216 - "@anthropic-ai/sdk"
Cohesion: 0.20
Nodes (10): 1. ¿Qué es?, 2. ¿Qué NO es?, 3. Usuarios objetivo, 4. Módulos y rutas, 5. Stack, 6. Mapa de código, 7. Dónde está todo, Lo que v3 y v3.2 añadieron (+2 more)

### Community 217 - "commitment-service.ts"
Cohesion: 0.09
Nodes (23): Task 4: La cadena pura hasta reinforcement, CommitmentResult, CommitmentSpec, CommitmentStatus, Comparator, evaluateResult(), INSIGHT_SPECS, partialBand() (+15 more)

### Community 218 - "retiros/page.tsx"
Cohesion: 0.19
Nodes (11): DeleteCell(), fmtMoney(), FORM_INIT, KpiBox(), RetirosPage(), STATUS_META, STATUS_ORDER, WForm (+3 more)

### Community 220 - "@trpc/server"
Cohesion: 0.35
Nodes (9): @trpc/server, invalidateAnalyticsCacheIfNeeded(), isValidIanaTimezone(), normalizeProfileInput(), PROFILE_PUBLIC_FIELDS, UpdateProfileInput, validateProfileUpdate(), createAdminClient() (+1 more)

### Community 222 - "katex"
Cohesion: 0.11
Nodes (10): katex, @radix-ui/react-popover, @radix-ui/react-tooltip, react-hook-form, tailwind-merge, katex@^0.17.0, @radix-ui/react-popover@^1.1.16, @radix-ui/react-tooltip@^1.2.8 (+2 more)

### Community 223 - "execute.ts"
Cohesion: 0.24
Nodes (8): ExecuteAiCallOptions, TIMED_OUT, RETRY_PROFILES, RetryProfile, RetryProfileName, AnyReport, Candidate, fmt()

### Community 224 - "next"
Cohesion: 0.29
Nodes (6): clamp01(), computeRiskBudget(), DailyWindow, DailyWindowInput, RiskBudgetInput, RiskOverview

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

### Community 395 - "resend-client.ts"
Cohesion: 0.27
Nodes (9): DEFAULT_FROM, emailFailureMessage(), sendEmail(), SendEmailArgs, SendEmailResult, CATEGORIES, notificationsRouter, PRIORITIES (+1 more)

### Community 397 - "resource-drawer.tsx"
Cohesion: 0.13
Nodes (20): effectiveMasteryLevel(), isReviewDue(), MASTERY_MAX, MASTERY_STAGES, masteryLevel(), MasteryStage, masteryStageIndex(), masteryStageIndexFromLevel() (+12 more)

### Community 408 - "ai-context.ts"
Cohesion: 0.13
Nodes (23): Señal (híbrido), RawAccountRow, RawLearningRow, RawMarketRow, RawReviewRow, RawRuleRow, RawSessionRow, RawSetupRow (+15 more)

### Community 446 - "Reglas unificadas enforce/warn (Rule)"
Cohesion: 0.67
Nodes (3): Reglas unificadas enforce/warn (Rule), Gate G2 — cutover de reglas (automations → rules), OI-5.x (S5: insight→protección, reglas del loop)

### Community 551 - "Captura de emoción con procedencia — Plan de implementación"
Cohesion: 0.27
Nodes (9): Captura de emoción con procedencia — Plan de implementación, Cierre: PR, CI y verificación en producción, Global Constraints, Notas de método para quien ejecute, Task 4: El componente `EmotionCapture`, Task 5: Superficie A — el trade cerrado deja de esconder el campo, Task 6: Superficie B — la review semanal deja de dar una instrucción sin salida, EmotionCapture() (+1 more)

### Community 555 - "tag-chip.tsx"
Cohesion: 0.38
Nodes (8): SelectableTagChip(), SIZE, TagChip(), TagChipView(), DEFAULT, resolveTagMeta(), TagMeta, useTagCatalog()

### Community 557 - "seed.ts"
Cohesion: 0.27
Nodes (8): ensureTagRows(), ensureTagsSeeded(), SYSTEM_APPEARANCE, SystemTagDef, systemTagDefs(), DISPLAY_MODES, tagsRouter, QUALITY_TAGS

### Community 558 - "leverage.ts"
Cohesion: 0.28
Nodes (8): buildAccountExposure(), computeLeverageMetrics(), computeNotional(), LEVERAGE_BAND_META, LeverageBand, leverageBand(), LeverageMetrics, MarketCategory

### Community 560 - "discipline-service.ts"
Cohesion: 0.31
Nodes (7): DisciplineDetail, DisciplinePeriod, DisciplineResult, calcDisciplineScore(), DisciplineBreakdown, DisciplineParams, VIOLATION_TAGS

### Community 570 - "Mapa de ficheros"
Cohesion: 0.25
Nodes (7): Al terminar, Fixture conductual + validación del loop — Plan de implementación, Global Constraints, Mapa de ficheros, Task 1: El generador de escenarios y su self-check, Task 3: Los detectores disparan sobre el patrón y callan sin él, Task 6: La cadena persistida contra Postgres real

### Community 572 - "local.ts"
Cohesion: 0.39
Nodes (6): calcPreviewNextReview(), MASTERY_LABELS, RevisarState, TYPE_COLORS, addDaysISO(), formatCalendarDate()

### Community 583 - "palette-studio.tsx"
Cohesion: 0.25
Nodes (4): ADV_ROLES, iconBtn, labelStyle, tileBtn()

### Community 584 - "view-model.ts"
Cohesion: 0.32
Nodes (7): AiMeta, MONTHS, NarrativeVM, ReviewKind, ReviewReportVM, WeeklyReport, ReviewAnalytics

### Community 586 - "trade-form-schema.ts"
Cohesion: 0.25
Nodes (6): REGIME_VALUES, SESSION_VALUES, tradeEditSchema, TradeEditValues, tradeFormSchema, TradeFormValues

### Community 588 - "CreatorModal"
Cohesion: 0.33
Nodes (6): 5.1 Modelo de escenario, CreatorModal(), seed(), openCreate(), WindowTrade, configFromHex()

### Community 590 - "badge.tsx"
Cohesion: 0.43
Nodes (5): COPY, RuleModeBadge(), Badge(), BadgeProps, badgeVariants

### Community 593 - "7. Verificación"
Cohesion: 0.33
Nodes (6): 7. Verificación, El rojo que hay que ver, El test que sostiene el contrato, Migración y prod, Observable en la UI, Resto de cobertura

### Community 597 - "NoteTagSuggestions"
Cohesion: 0.47
Nodes (4): NoteTagSuggestions(), RULES, suggestTagsFromNote(), TagRule

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
Cohesion: 0.10
Nodes (20): 1.1 Registro, EmotionInsight(), LABELS, ChecklistEvaluation, ChecklistState, evaluateChecklist(), Regime, REGIME_VALUES (+12 more)

### Community 670 - "coach-tool-audit.py"
Cohesion: 0.17
Nodes (5): Procedimiento de entrega y pruebas, dismiss_overlay(), login(), main(), parse_frames()

### Community 674 - "drift.ts"
Cohesion: 0.13
Nodes (25): Dated, Window, detectSetupDrift(), DriftDimension, DriftDimensionKey, DriftInput, DriftResult, DriftTrade (+17 more)

### Community 681 - "La palanca A estaba mal enunciada, y la BD lo desmintió (2026-07-27, spec + plan)"
Cohesion: 0.67
Nodes (3): La palanca A estaba mal enunciada, y la BD lo desmintió (2026-07-27, spec + plan), Los dos defectos que sí existen, Qué se decidió (del usuario, no reabrir)

## Knowledge Gaps
- **423 isolated node(s):** `ADR-0001`, `ADR-0003`, `ADR-0003`, `RFC-4180`, `ADR-0002` (+418 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1900 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **437 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Sidebar.tsx` to `perfil/page.tsx`, `lucide-react`, `trades-table.tsx`, `review-summary.tsx`, `create-account-modal.tsx`, `dependencies`, `resource-drawer.tsx`, `ai-coach-drawer.tsx`, `aprendizaje/page.tsx`, `theme-provider.tsx`, `page.tsx`, `intelligence-panel.tsx`, `markdown.tsx`, `analytics/page.tsx`, `motion.ts`, `dashboard/page.tsx`, `mercados/page.tsx`, `lib/utils.ts`, `focus-session.tsx`, `tag-chip.tsx`, `review-report-shell.tsx`, `lucide-react`, `send-review.ts`, `center-sheet.tsx`, `send-learning-digest.ts`, `palette-studio.tsx`, `page.tsx`, `next`, `reglas/page.tsx`, `package.json`, `account-card.tsx`, `reviews/page.tsx`, `retiros/page.tsx`, `trajectory-panel.tsx`, `resource-card.tsx`, `trade-detail-panel.tsx`, `resource-grid.tsx`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **What connects `ADR-0001`, `ADR-0003`, `ADR-0003` to the rest of the system?**
  _423 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `POST-6 Prop-Firm Rulebase Spec` be split into smaller, more focused modules?**
  _Cohesion score 0.07671957671957672 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `lib/utils.ts` to `lucide-react`, `trades-table.tsx`, `create-account-modal.tsx`, `trade-row.tsx`, `resource-drawer.tsx`, `Sidebar.tsx`, `ai-coach-drawer.tsx`, `aprendizaje/page.tsx`, `page.tsx`, `markdown.tsx`, `analytics/page.tsx`, `motion.ts`, `dashboard/page.tsx`, `mercados/page.tsx`, `Captura de emoción con procedencia — Plan de implementación`, `focus-session.tsx`, `review-report-shell.tsx`, `lucide-react`, `reglas/page.tsx`, `badge.tsx`, `reviews/page.tsx`, `retiros/page.tsx`, `resource-card.tsx`, `trade-detail-panel.tsx`, `resource-grid.tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `emit.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10101010101010101 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `emit.ts`, `perfil/page.tsx`, `lucide-react`, `trades-table.tsx`, `create-account-modal.tsx`, `dependencies`, `resource-drawer.tsx`, `Sidebar.tsx`, `ai-coach-drawer.tsx`, `aprendizaje/page.tsx`, `intelligence-panel.tsx`, `page.tsx`, `account-risk-panel.tsx`, `markdown.tsx`, `analytics/page.tsx`, `motion.ts`, `dashboard/page.tsx`, `mercados/page.tsx`, `lib/utils.ts`, `focus-session.tsx`, `tag-chip.tsx`, `review-report-shell.tsx`, `condition-group.tsx`, `account-risk-panel.tsx`, `palette-studio.tsx`, `next`, `reglas/page.tsx`, `package.json`, `account-card.tsx`, `reviews/page.tsx`, `retiros/page.tsx`, `psychology-insights.ts`, `resource-card.tsx`, `trade-detail-panel.tsx`, `resource-grid.tsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `lucide-react` be split into smaller, more focused modules?**
  _Cohesion score 0.06804214223002635 - nodes in this community are weakly interconnected._