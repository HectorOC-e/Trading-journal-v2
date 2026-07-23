# Graph Report - Trading-journal-v2  (2026-07-23)

## Corpus Check
- 571 files · ~354,383 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3733 nodes · 7271 edges · 657 communities (178 shown, 479 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b2cd5f99`
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
- FREEZE-D9: frontera anti-poisoning de memoria (irreversible)
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
- P2: Determinismo primero; el LLM narra, no calcula
- P6: El LLM propone, los datos confirman
- P8: Privacidad y autonomía como diseño, no como add-on
- Gate G1 (validación spike outbox)
- HOY (superficie cognitiva)
- Intervention Engine (subsistema)
- Fórmula de scoring de intervención (priority = severity×urgency×confidence×expectedImpact×(1-fatiguePenalty))
- key-encryption.ts (cifrado credenciales de IA)
- MEJORAR (superficie cognitiva)
- Memoria (subsistema, 4 capas)
- Riesgo: moat débil
- OPEN_ITEMS_SPRINT_0
- OPERAR (superficie cognitiva)
- Outbox transaccional (patrón, DomainEvent)
- POST-1: Canal push realtime (websockets/SSE)
- POST-2: Coach multi-agente (orquestador + specialists)
- POST-3: Aprendizaje cross-user privacy-preserving (moat profundo)
- POST-4: Datos de mercado externos (régimen real, ATR)
- POST-5: Extracción del Cognitive Engine a servicio independiente
- POST-6: Base de reglas prop-firm como activo central (moat)
- PRODUCT_MASTER_PLAN.md
- PROTEGER (superficie cognitiva)
- R6 / RI-3: pseudo-rigor (riesgo auditoría)
- RI-1: sin infraestructura de eventos (riesgo)
- RI-2: fusión de reglas (riesgo)
- RI-5: memoria poisoning (riesgo)
- RI-7: sobre-intervención (riesgo)
- Riesgo: reescritura a 24 meses
- Primitiva rollingWindow
- Router de modelos LLM (barato decide, caro narra)
- rules/engine.ts (bloqueo pre-trade real)
- Invariante: separación práctica/real
- Sprint 0 (S0)
- Trading / Rules (OLTP, bounded context)
- v3/README.md
- Verifier (librería de verificadores insight→metricKey)
- Web App (Next.js fork, "la piel")
- AI Config, Migrations and Documentation Consolidation (2026-06-05)
- AI Diagnostics and Health Check (aiConfig.diagnostics, aiConfig.healthCheck, lib/ai/health-check.ts)
- Root Cause Fix: 'Configura ANTHROPIC_API_KEY' with OpenRouter Configured
- add_color_theme_preferences Migration Name Aligned with Prod (#12)
- First Direct dashboardStats Test (practice partition)
- Debt Closure Cycles 1/2 (render purity, a11y ARIA, TD-018/019/037 scoped)
- Prop-Firm Drawdown + Limit Enforcement Unified (#6)
- Formula Engine (Sprint 1)
- G2 — Rules Cutover: rules Is the Only Source (2026-07-13)
- GitHub Actions Updated Node 20 → 24 (checkout@v5, setup-node@v5, pnpm/action-setup@v5) (#13)
- Hardening: P&L, Enforcement, CI/Migrations and Performance (2026-06-10, PRs #6–#17)
- Learning System (spaced repetition, decay detection, materialized streak, email idempotency)
- GitHub Actions Secrets → migrate-deploy Job Green
- Negative Sign on Losses Fix (#17)
- Node Pinned to 20.12+ (.nvmrc + engines) (#7)
- Onboarding Checklist (4 steps, progress ring)
- Onboarding Fix Batch (#10)
- OpenRouter Key Save Fix (user_ai_configs missing in prod)
- 21 P0 QA Findings Resolved
- parsePointValue Helper
- PDF Export of Performance Report
- Phase 0-1 — Foundation and Learning
- P&L Point Value Fix on Manual Close (#14)
- Multi-Account Equity Curve + Comparison (Portfolio tab)
- preferences.get 401 on /login Fix (#9)
- prisma.config.ts: Prisma Generates Client Only, Never Migrates
- Prop-Firm Rules Enforcement (Sprint 3)
- Psychology Fields + plan_notes Migration
- PWA (manifest + service worker, installable, offline read) + PNG icons
- QueryClient staleTime 30s + no refetch-on-focus + retry 1 (#10)
- /reglas Edits rules — Executable Parity Router (builder, merged templates, reorder, badges)
- AI Provider Resolution Engine (lib/ai/resolve-provider.ts)
- rule-sync Dual-Write (retired)
- Rules Engine Enforcement (runRules-only)
- /api/cron/rules-migration-report (retired)
- RULES_SOURCE Flag (retired)
- Security/RLS, Auth, Data Correction (Phase 0-1)
- Service Worker Excluded from Auth Middleware Matcher (#8)
- Sprint 4 — Psychology, Reviews and Personalization
- Sprint 5 — AI Config, Goals, planNotes, Pagination, UX, International Support
- Sprint 6 — System Theme, Review Filters, Sparklines, Type Safety, Security Hardening
- Sprint 7 — Reviews Hardening, Discipline Centralization, Infrastructure
- Sprint 8 — Testing, Accessibility, Monthly Reviews
- Sprints 1-3 — Foundation
- Sprints 9-12 — Portfolio MVP, PWA, PDF, Onboarding (2026-06-04)
- Stabilization Sprint — Manual QA Remediation (2026-06-03)
- Supabase CLI Migrations System Reconciled (36 migrations, config.toml)
- TD-018 — Trade Services Extracted from trades Router (2026-07-14, PR #130)
- Temporal Locks No Longer Offer Manual Unlock (#17)
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
- Memoria del coach (4 capas: episódica, semántica, identidad, mejora)
- CoachMemoryPanel / CoachMemoryLayers
- Write-tools del coach con permiso (propose_rule / propose_commitment)
- Bounded context cognitive/ (events, intervention, memory, coach)
- commitment-service (createCommitmentFromInsight / evaluateWindowCommitments / carryOverCommitments)
- Rutas api/cron (recompute-insights, dispatch-events, evaluate-commitments, cognitive-digest, rules-migration-report)
- Módulo Cuentas (/cuentas)
- Módulo Dashboard (/dashboard)
- Estructura por dominios (src/domains/)
- Módulo Etiquetas (/etiquetas)
- Formula Engine (lib/formulas — performance, win-rate, risk, drawdown, discipline, setup)
- FREEZE-P1 (principio congelado)
- Persona: Funded Trader
- Módulo IA Coach (drawer global)
- ImprovementScore / Índice de mejora (0–100)
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
- A3 — rutas reales de 5 superficies (/hoy, /operar, /analizar, /proteger, /mejorar)
- AUDIT_FINAL.md (auditoría final; §9 manda sobre §5)
- Gaps de AUDIT_FINAL (GAP-A/B/C/D/E)
- Backlog P1 — próximo v2.1 (B-01..B-05: iconos PWA, eslint CI, E2E Playwright, Sentry, carga 1000+ trades)
- Backlog P2 — deseable (B-06..B-10: charts en PDF, patrones en UI, onboarding fallback, SW cache bump, comparar reviews)
- Backlog P3 — oportunista (B-11..B-16: features IA, AiUsageLog, multi-divisa, API brokers, PWA móvil, social)
- BIZ-1 — aislamiento de datos cross-user (decisión de negocio)
- Cron cognitive-digest sin agendar (/api/cron/cognitive-digest)
- DataTable dev render loop (bug dev-only conocido)
- Check de drift SQL↔Prisma en CI (siguiente pieza; cierra S0/DT-4)
- Usuario demo/E2E ariaoc89@gmail.com (GH secret E2E_USER_PASSWORD)
- Gate G1 (replay migración S0 + spike end-to-end del outbox)
- Gate G2 — cutover de reglas (automations → rules)
- GAP-A1 — guard de presupuesto diario pre-trade (✅ PR #116)
- GAP-A2 — transferencia #31 + SRS #45 (✅ PR #118)
- GAP-A3 — migración real de rutas a 5 superficies (roadmap)
- GAP-A4 — origen de regla del loop en /reglas (✅ PR #119)
- GAP-B1 — historización de ImprovementScore (✅ PR #117, E19 + cron + curva)
- GAP-B2 — SetupEdgeSnapshot persistido (⏭️ omitido: la curva funciona al vuelo)
- GAP-C1 — detectores revenge/oversizing (✅ ya existían: detectLosingStreak/Oversizing/Emotion)
- GAP-C2 — disposition effect #40 (✅ ya existía: detectHoldingAsymmetry)
- GAP-E1 — memoria jerárquica de 4 capas E13–E16 (reclasificado a v3.2 roadmap)
- Protección de contraseñas filtradas en Supabase Auth (toggle manual)
- OI-10.x (S10: edge de setup — drift, decay, A/B)
- OI-11.x (S11: edge por instrumento/tag, transferencia, SRS)
- OI-13.x (S13: feed HOY — telemetría, digest, realtime)
- OI-14.x (S14: ImprovementScore — snapshots, régimen, pesos)
- OI-3.x (S3: analítica institucional Bayesiana)
- OI-4.x (S4: commitments / loop de comportamiento)
- OI-5.x (S5: insight→protección, reglas del loop)
- OI-6.x (S6: memoria del coach)
- OI-7.x (S7: coach proactivo, write-tools, intervención)
- OI-8.x (S8: psicología, check-in, sesgos cognitivos)
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
- POST-6 — base de reglas prop-firm como moat (única con disparador cumplido; mergeado PR #128)
- POST-7 — framework A/B (disparador no activado)
- PR #128 (merge de POST-6 prop-firm)
- PR #129 (cutover G2, mergeado 2026-07-13, a28df30)
- PR #130 (TD-018 trade-service, 2026-07-14)
- Crons existentes en prod (dispatch-events, recompute-insights, evaluate-commitments, learning-digest, reviews-digest)
- Checklist de QA pendiente de V3 (109 ítems)
- Prompt de retoma de sesión
- Roadmap reservado (apuestas con disparador propio, no iniciadas)
- Env var RULES_SOURCE (flip del cutover)
- run-rules.test.ts (invariante de no-regresión del bloqueo pre-trade)
- S0 open items (S0/OI-*, S0/DT-1..6, S0/R-1..6, S0/BIZ-1)
- S1 open items (migración de reglas: S1/OI-1..4, S1/DT-1..6, S1/R-1..3)
- S2 open items (captura de trade: S2/OI-1..5, S2/DT-1..5, S2/R-1..2)
- TD-018 — extraer lógica del router trades.ts a trade-service (✅ 2026-07-14)
- TD-019 — cliente Supabase por-request en contexto tRPC (⚠️ probablemente abierto)
- TD-037 — ~22 efectos sync-on-open (setState sincrónico en effect)
- TECHNICAL_DEBT.md (fuente de la deuda técnica; borrado, 2026-06-05)
- Migraciones v3.2 aplicadas (improvement_scores E19, memory_episodes E13, memory_patterns E14, memory_identity E15, feed_ignores C3)
- Deploy/Migration Flow (merge to main → CI applies migration)
- POST-6 QA Handoff
- CI e2e Anon Key Resolved (b)
- Local Validation Results (prisma generate, tsc, vitest 1176/1176, eslint)
- MyFundedFutures Preset (replacement firm)
- QA Playwright Blocked by Corporate MITM SSL (c)
- Ready-to-Paste Prompt — QA Playwright Run
- UI Blocker for Tasks 9/10 — Resolved by commit 71154ac
- Ready-to-Paste Prompt — Complete UI (Tasks 9+10)
- POST-6 Prop-Firm Rulebase Implementation Plan
- Task 10: UI — dashboard panel shows new rules
- Task 1: Migration — prop_firm_presets + Account fields
- Task 2: Engine — checkTrailingDrawdown
- Task 3: Engine — checkConsistency
- Task 4: Engine — checkWeekendHolding
- Task 5: Engine — phaseProgress
- Task 6: tRPC propFirmPresets.list + typed catalog
- Task 7: Account input/serialization for new fields
- Task 8: Wire checks into dashboard status + ENFORCE lock
- Task 9: UI — preset picker + enforceMode toggle
- Guard — cero referencias a prisma.automation/trpc.automations en src/
- Nota post-merge — borrar RULES_SOURCE de Vercel + smoke opcional
- Task 3 — Router rules a paridad ejecutable
- Task 5 — Borrar automations router, dual-write e informe de migración
- Task 6 — Validación final, docs y push
- Partición practice (financiero excluye DEMO_PERSONAL/DEMO_PROP/BACKTEST; discipline las cuenta)
- Patrón I/O shell — load data, run pure logic, persist
- Refactor behavior-preserving (RouterOutputs y schemas zod intactos)
- Riesgo principal — dashboardStats sin tests previos (mitigado con test T3 antes de mover)
- Self-review — 14 procedures del router cubiertos por T1-T7
- Stub deprecado 'stats' se queda en el router a propósito
- Sustituciones mecánicas (ctx.prisma→prisma, ctx.userId→userId, ctx.supabase→supabase)
- TD-018 Task 3 — Dashboard service + primer test de orquestación
- TD-018 Task 4 — Read service (list/violaciones/emoción/patrones)
- TD-018 Task 5 — Write service: create
- TD-018 Task 6 — Write service: update + close
- TD-018 Task 7 — Write service: addEvent + delete + saveChecklistResult
- TD-018 Task 8 — Gates finales + docs + PR
- TD-018 — extraer orquestación de trades.ts (1146 LOC) a service layer
- Approach B — Live FK Reference (rejected)
- Approach C — Snapshot + Update Notice (future enhancement)
- Catalog Seed v1 — 3 Anchor Firms
- Account.consistencyPct field
- Confirmed Decisions Summary Table
- POST-6 Prop-Firm Rulebase Design Spec
- Dual Migration Requirement (SQL + Prisma)
- Account.enforceMode WARN/ENFORCE
- Account.enforceMode field
- FREEZE-D13 (respect user autonomy in WARN mode)
- FTMO Preset Rules
- Reuse of locked/lockReason/lockedAt Mechanism
- Gap: Firm Catalog Does Not Exist Yet
- Gap: Consistency Rule Not Yet Implemented
- Gap: Trailing Drawdown Logic Not Yet Implemented
- Gap: Weekend Holding Restriction Not Yet Implemented
- Prop-Firm Rules as Central Moat
- MyFundedFX Preset Rules
- Account.noWeekendHolding field
- Out of Scope / YAGNI Items
- Account.presetId field
- PropFirmPreset RLS Policy (authenticated read-all, service-role write)
- Realized-Equity-Only Enforcement Limitation
- enforceMode Mirrors Rule.mode warn|enforce Semantics
- Snapshot Approach A (preset copies values into account)
- Topstep Preset Rules
- Archivo P9 — tabla automations intacta
- Dual-write automations→rules
- Enfoque A — flip por env var primero
- Fase 1 — Flip (ops, sin código)
- Fase 2 — Retiro de automations
- Test de no-regresión 'G2 cutover invariant'
- Gate G2 (C6/FREEZE-D8)
- Gate OI-1 — informe de no-mapeo con datos reales
- Gates pre-push (tsc --noEmit + vitest run + eslint, 0 errores)
- OI-5.1 — reglas del loop visibles en /reglas
- Paridad espejo perfecta (0 faltantes, 0 drift)
- Prueba observable del flip (rules.last_fired_at bumps, automations quieto)
- Regla del loop 'Enfriamiento tras una pérdida' (enforce, TRADE_PRE_CREATE, BLOCK)
- Riesgo residual — divergencia semántica sutil de runRules
- Rollback fase 1 — quitar RULES_SOURCE (instantáneo)
- Rollback fase 2 — revert del merge + ventana unidireccional
- RULES_SOURCE env var
- S1/DT-5 — badge de modo lee rule.mode
- Fase 1 ejecutada y verificada en prod (Playwright + SQL, RULE_BLOCKED)
- source_automation_id (trazabilidad en rules espejo)
- Triaje de las 13 'falsa protección'
- Verificación post-merge en prod (/reglas edita, BLOCK bloquea, last_fired_at bumps)
- Workaround TS2589 (select escalar + tipo de salida explícito)
- AI Coach
- Invariant: Anti-Poisoning Boundary (LLM never writes memory/identity directly; proposes, data/user confirm)
- docs/ARCHITECTURE.md (canonical architecture, freeze v3.1 + ADRs, FREEZE-* IDs)
- docs/auditoria-producto-trading-journal-v2.md (binding audit, findings C1–C8)
- Bayesian Confidence Bands (shrinkage estimator)
- Behavior Engine
- Behavior Loop (Insight → Compromiso → Regla → Verificación → Refuerzo → Trade)
- Cognitive Layer Thesis (v3)
- 5 Cognitive Surfaces (HOY · OPERAR · ANALIZAR · PROTEGER · MEJORAR)
- Crons (pg_cron → pg_net → /api/cron/* with Bearer secret)
- Documentation Set (3 living docs + 2 annexes)
- domains/ Pure Business Logic by Bounded Context (cognitive · behavior · analytics · rules · trading)
- Environment Variables (DATABASE_URL, Supabase keys, AI key, CRON_SECRET)
- Event Bus with Outbox (decoupled producers → consumers)
- 4-Layer Hierarchical Memory (episodic pgvector · semantic · identity · improvement)
- ImprovementScore (North Star, composite 0–100)
- Institutional Analytics (drawdown, R distribution, Sortino/Calmar/Kelly, MAE/MFE, benchmark, heatmap)
- Intervention Engine (deterministic)
- Invariants (no sprint broke them)
- Learning & Transfer (edge by instrument/tag, study↔trading transfer, performance-adapted SRS, error cards)
- migrate-deploy CI Job (migrations deploy on merge to main)
- Multi-Type Accounts (prop-firm / real / demo / backtest) with Live Meters and Auto-Lock
- Invariant: Permission (the system proposes, the user disposes)
- Playbook Intelligence (edge decay with Welch significance, definition-vs-execution drift, rolling-window evolution, A/B variants)
- Invariant: Practice/Real Separation (demo/backtest never contaminates real stats)
- Invariant: Pre-Trade Blocking (protections block before opening)
- docs/PROJECT_GUIDE.md (read-me-first: modules, stack, code map)
- Project Structure (src/app · components · domains · server · lib · prisma · supabase · docs)
- Risk & Prop (ruin risk analytic + Monte Carlo, phase-pass projection, daily budget, multi-account correlation, withdrawal policy)
- Setup Requirements (Node 20.12+ via .nvmrc, pnpm 10+, Supabase)
- Invariant: Statistical Honesty (confidence bands, association not cause, no fake certainty)
- docs/STATUS.md (state, pending QA checklist, debt, backlog, roadmap, resume prompt)
- Status: v3.1 Closed (14/14 sprints · 100% audit · 3 gates) + v3.2 In Progress (cognitive companion, 5 live axes)
- tj.v3Shell Feature Flag
- Weekly Cognitive Digest
- rule-write.test.ts
- run-rules.test.ts (invariante de no-regresión)
- dashboard-service.test.ts (partición practice)
- /api/cron/rules-migration-report (retirado en G2)
- rulesSourceIsUnified() (retirado en G2)
- runAutomations() (retirado en G2)
- buildNoMappingReport() (retirado en G2)
- rule-sync.ts (dual-write, retirado en G2)
- Account Model (Prisma)
- PropFirmPreset Model (Prisma)
- automationsRouter (retirado en G2)
- rules.createExecutable
- rules.createFromTemplate
- rules.list
- rules.reorder (primer id = prioridad más alta, mapea 3..0)
- rules.seedDefaults (descriptivas de bienvenida)
- rules.templates
- rules.updateExecutable
- 20260710140000_post6_prop_firm_rulebase.sql migration

## God Nodes (most connected - your core abstractions)
1. `cn()` - 156 edges
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
- `StatusSelect()` --indirect_call--> `handler()`  [INFERRED]
  src/app/retiros/page.tsx → src/app/api/trpc/[trpc]/route.ts
- `AiCoachDrawer()` --indirect_call--> `handler()`  [INFERRED]
  src/components/ai-coach/ai-coach-drawer.tsx → src/app/api/trpc/[trpc]/route.ts
- `useWindowWidth()` --indirect_call--> `handler()`  [INFERRED]
  src/components/layout/Sidebar.tsx → src/app/api/trpc/[trpc]/route.ts
- `ThemeProvider()` --indirect_call--> `handler()`  [INFERRED]
  src/components/theme-provider.tsx → src/app/api/trpc/[trpc]/route.ts
- `Dropdown()` --indirect_call--> `handler()`  [INFERRED]
  src/components/ui/market-select.tsx → src/app/api/trpc/[trpc]/route.ts

## Import Cycles
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/accounts.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/withdrawals.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 4-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 4-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/insights-engine.ts`
- 4-file cycle: `src/domains/analytics/services/psychology-insights.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/psychology-insights.ts`
- 4-file cycle: `src/server/services/tags/seed.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/tags.ts -> src/server/services/tags/seed.ts`
- 4-file cycle: `src/domains/analytics/services/discipline-service.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/domains/analytics/services/discipline-service.ts`
- 4-file cycle: `src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/report-data.ts`
- 4-file cycle: `src/domains/trading/services/risk-enforcement.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/accounts.ts -> src/domains/trading/services/risk-enforcement.ts`
- 4-file cycle: `src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/report-data.ts`
- 4-file cycle: `src/server/services/trades/trade-read-service.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/server/services/trades/trade-read-service.ts`
- 5-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 5-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/monthly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/review-insights.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/domains/analytics/services/analytics-bundle.ts -> src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/analytics-bundle.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/analytics.ts -> src/domains/analytics/services/psychology-insights.ts -> src/domains/analytics/services/insights-engine.ts`
- 5-file cycle: `src/server/services/tags/seed.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/server/services/trades/trade-write-service.ts -> src/server/services/tags/seed.ts`
- 5-file cycle: `src/server/services/email/send-review.ts -> src/server/services/reviews/report-data.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/email/send-review.ts`
- 5-file cycle: `src/domains/analytics/services/insights-engine.ts -> src/types/index.ts -> src/server/trpc/root.ts -> src/server/trpc/routers/weekly-reviews.ts -> src/server/services/reviews/overview.ts -> src/domains/analytics/services/insights-engine.ts`

## Hyperedges (group relationships)
- **CI/CD antierrores pipeline** — _github_workflows_ci_checks, _github_workflows_ci_e2e, _github_workflows_ci_migrate_validate, _github_workflows_ci_migrate_deploy [EXTRACTED 1.00]

## Communities (657 total, 479 thin omitted)

### Community 0 - "palette-studio.tsx"
Cohesion: 0.05
Nodes (64): metadata, viewport, ADV_ROLES, CreatorModal(), iconBtn, labelStyle, PaletteStudio(), NOTE: applying the theme on mount / mode-change is intentionally NOT done here. (+56 more)

### Community 1 - "POST-6 Prop-Firm Rulebase Spec"
Cohesion: 0.13
Nodes (14): Global Constraints, POST-6 — Prop-Firm Rulebase (moat) Implementation Plan, Self-Review, Task 10: UI — dashboard prop-firm panel shows the new rules, Task 11: Full verification + push, Task 1: Migration — `prop_firm_presets` table + new `Account` fields (dual), Task 2: Engine — `checkTrailingDrawdown`, Task 3: Engine — `checkConsistency` (+6 more)

### Community 2 - "cn()"
Cohesion: 0.07
Nodes (40): Stat(), fmt(), FocusSession(), DOW, HoyTab(), TOUR_STEPS, ALL_TYPES, ProgresoSections() (+32 more)

### Community 3 - "insights-engine.ts"
Cohesion: 0.06
Nodes (56): CAT_ICON, InsightCards(), sevStyle(), ComputedInsight, InsightStatus, PersistedInsightRef, reconcileInsights(), ReconcilePlan (+48 more)

### Community 4 - "page.tsx"
Cohesion: 0.05
Nodes (55): Chip(), PHASE_LABEL, PropFirmPreset, PropFirmPresetPicker(), ACCOUNT_TYPES, BROKERS, FORM_INIT, NuevaCuentaModal() (+47 more)

### Community 5 - "client.ts"
Cohesion: 0.09
Nodes (32): AiAnalysisCard(), Period, Period, Period, SendReviewEmailButton(), CoachIdentityEditor(), CoachMemoryLayers(), EVENT_LABEL (+24 more)

### Community 6 - "resource-card.tsx"
Cohesion: 0.07
Nodes (41): effectiveMasteryLevel(), isReviewDue(), MASTERY_STAGES, masteryLevel(), MasteryStage, masteryStageIndex(), masteryStageIndexFromLevel(), STATUS_TO_LEVEL (+33 more)

### Community 7 - "review-summary.tsx"
Cohesion: 0.10
Nodes (31): ReviewEmailModel, DigestModel, CtaButton(), Divider(), EmailFooter(), EmailLayout(), ProgressBlock(), reviewChipLabel() (+23 more)

### Community 8 - "register-trade-modal.tsx"
Cohesion: 0.08
Nodes (32): SelectableTagChip(), SIZE, TagChip(), TagChipView(), AccountLike, computeAutoTag(), computeContracts(), ERROR_FIELD_ORDER (+24 more)

### Community 9 - "dashboard-analytics.ts"
Cohesion: 0.09
Nodes (37): AccountBalance, AccountExposure, AccountLimits, AccountStat, AccountWithLimits, buildAccountExposure(), buildAccountStats(), buildDiscipline() (+29 more)

### Community 10 - "page.tsx"
Cohesion: 0.10
Nodes (35): PlanSessionModal(), todayISO(), ResourceFromDB, ResourceFromDB, blankDraft(), CATEGORY_SUGGESTIONS, COLOR_PRESETS, DISPLAY_MODES (+27 more)

### Community 11 - "dependencies"
Cohesion: 0.05
Nodes (43): dependencies, @anthropic-ai/sdk, class-variance-authority, clsx, dotenv, framer-motion, @hookform/resolvers, katex (+35 more)

### Community 12 - "monthly-letter.tsx"
Cohesion: 0.06
Nodes (34): 1. Checklist de QA pendiente de V3, 2. Ops pendientes (acción del usuario, sin código), 3. Deuda técnica, 4. Backlog, 5. Roadmap reservado, 6. Prompt de retoma de sesión, 7. Prompt: simulación de trader profesional en aria (Playwright) — ✅ EJECUTADA, Acción pendiente de la auditoría del 2026-07-21: `S0/R-3` (outbox drenada sin consumidores) (+26 more)

### Community 14 - "review-card.tsx"
Cohesion: 0.10
Nodes (29): CardEquityChart(), DAYS, Campaign(), disciplineColor(), fmtMoney(), GRADE_TONE, pnlColor(), ReviewCard() (+21 more)

### Community 15 - "send-review.ts"
Cohesion: 0.15
Nodes (20): detectDecayedResources(), ResourceForDecay, buildLearningDigest(), daysBetween(), DigestInput, DigestReview, formatDateLabel(), isoDate() (+12 more)

### Community 16 - "coach-memory-service.ts"
Cohesion: 0.15
Nodes (20): assembleContextBlock(), assembleCoachContext(), confirmMemory(), createMemory(), deleteMemory(), editMemory(), listMemory(), ADR-0003 (+12 more)

### Community 17 - "ai-coach-drawer.tsx"
Cohesion: 0.08
Nodes (32): AiCoachDrawer(), ApiError, CiteCard(), clampPos(), formatTime(), Message, SUGGESTED, TOOL_LABELS (+24 more)

### Community 18 - "index.ts"
Cohesion: 0.08
Nodes (33): calcNetPnl(), calcAvgR(), calcExpectancyR(), SetupHealthParams, SetupHealthStatus, AiUsageLog, AnalyticsCache, AnalyticsInput (+25 more)

### Community 19 - "notify.tsx"
Cohesion: 0.10
Nodes (37): ToastCard(), ToastCardProps, TypeStyle, AppError, isAppError(), toUserMessage(), TRPC_TO_CODE, LABELS (+29 more)

### Community 20 - "page.tsx"
Cohesion: 0.09
Nodes (18): COLORS, DbSetup, Direction, DirectionChip(), FORM_INIT, HealthStatus, MARKET_FILTERS, MARKETS (+10 more)

### Community 21 - "prisma.ts"
Cohesion: 0.16
Nodes (18): POST(), ADR-0001, POST(), AuthResult, checkCronAuth(), POST(), timingSafeMatch(), USER_SELECT (+10 more)

### Community 22 - "trade-write-service.ts"
Cohesion: 0.14
Nodes (21): isCacheEnabled(), buildContext(), ContextAccount, ContextTrade, mondayOf(), computeClosedTradePnl(), computeRMultiple(), computeScaleInAvgEntry() (+13 more)

### Community 23 - "page.tsx"
Cohesion: 0.13
Nodes (25): AiInsightsPanel(), AccountsIntel(), amt(), AnalyticsPage(), Edges(), fmt(), GoalRow(), Goals() (+17 more)

### Community 24 - "motion.ts"
Cohesion: 0.12
Nodes (21): EditionHeader(), EditionHeaderData, money(), TONE, nodeColor(), ReviewFromDB, ReviewsTimeline(), TimelineChapter (+13 more)

### Community 25 - "ai-context.ts"
Cohesion: 0.14
Nodes (21): RawAccountRow, RawLearningRow, RawMarketRow, RawReviewRow, RawRuleRow, RawSessionRow, RawSetupRow, RawStudySessionRow (+13 more)

### Community 26 - "improvement-service.ts"
Cohesion: 0.20
Nodes (14): ImprovementResult, computeRegimePerformance(), mean(), RegimePerformanceResult, RegimeStat, RegimeTrade, getImprovement(), ImprovementOverview (+6 more)

### Community 27 - "bayes.ts"
Cohesion: 0.11
Nodes (26): betaBinomialEstimate(), betacf(), BetaPrior, betaQuantile(), cohensH(), DEFAULT_BETA_PRIOR, DEFAULT_NORMAL_PRIOR, DirectionalEstimate (+18 more)

### Community 28 - "risk-enforcement.ts"
Cohesion: 0.27
Nodes (15): checkTrailingDrawdown(), assertTradeable(), autoUnlock(), EnforceableAccount, evaluateAndLock(), hasAnyLimit(), loadAccountRisk(), loadEquityCurve() (+7 more)

### Community 29 - "index.ts"
Cohesion: 0.06
Nodes (51): ImportCsvModal(), MarketItem, TradesPage(), EditTradeModalProps, LogSessionPopover(), MetricRow(), MetricRowProps, SESSION_COLOR (+43 more)

### Community 30 - "tab-portfolio.tsx"
Cohesion: 0.10
Nodes (24): Card(), CardProps, ChartTooltip(), TooltipPayload, fmtDate(), MONTHS_ES, TYPE_META, DashboardStats (+16 more)

### Community 31 - "isWin()"
Cohesion: 0.16
Nodes (22): buildTraderContext(), buildHourStats(), buildKpis(), buildPnlBySymbol(), buildSessionStats(), buildMonthlyReport(), kpisOf(), ReportTrade (+14 more)

### Community 32 - "trades-table.tsx"
Cohesion: 0.12
Nodes (26): RFC-4180, RetirosTable(), Checkbox(), getResult(), QUALITY_TAGS, qualityOf(), RESULT_LABELS, SESSION_CFG (+18 more)

### Community 33 - "root.ts"
Cohesion: 0.08
Nodes (29): sendEmail(), Context, protectedProcedure, t, RouterInputs, accountLogsRouter, behaviorRouter, goalsRouter (+21 more)

### Community 34 - "page.tsx"
Cohesion: 0.13
Nodes (18): Period, useDashboardStats(), DashboardPage(), Tab, TABS, VALID_PERIODS, EMOTION_LABELS, PERIODS (+10 more)

### Community 35 - "monthly-reviews.ts"
Cohesion: 0.12
Nodes (21): finalizeMonthlyReview(), FinalizeResult, MONTHS_ES, evaluateGoal(), GoalContext, GoalProposal, GoalStatus, deriveLetterTitle() (+13 more)

### Community 36 - "account-card.tsx"
Cohesion: 0.15
Nodes (20): ACCOUNT_STATUS_META, AccountCard(), AccountExposure, AccountRisk, formatSyncAgo(), isPropFirmLike(), KpiBox(), RawAccount (+12 more)

### Community 37 - "playbook-service.ts"
Cohesion: 0.12
Nodes (29): addDays(), compareCurrentVsPrevious(), Comparison, Dated, isCount(), rollingWindow(), RollingWindowOpts, sortByDate() (+21 more)

### Community 38 - "coach-tools.ts"
Cohesion: 0.25
Nodes (10): CoachToolName, executeCoachTool(), explainState(), PERIOD_DAYS, PROTECTION_TO_METRIC, runCoachTool(), ToolCtx, ToolResult (+2 more)

### Community 39 - "types.ts"
Cohesion: 0.19
Nodes (12): ACTION_TYPES, ActionDeps, ActionResult, Handler, HANDLERS, runAction(), compare(), evaluate() (+4 more)

### Community 40 - "page.tsx"
Cohesion: 0.13
Nodes (12): ACTION_LABEL, AutomationsTab(), ExecRuleRow, SystemRulesTab(), TABS, Template, TRIGGER_LABEL, SegmentedOption (+4 more)

### Community 41 - "risk-ratios.ts"
Cohesion: 0.11
Nodes (18): resourceNotesAdapter, ResourceRow, tradeNotesAdapter, TradeRow, SearchInput, CORPORA, orderByHits(), roundSimilarity() (+10 more)

### Community 42 - "feature-models.ts"
Cohesion: 0.14
Nodes (20): AI_FEATURES, AI_PROVIDERS_LIST, AiFeature, AiSettings, CHAT_LADDER, CostPriority, DEFAULT_AI_SETTINGS, EMBEDDING_LADDER (+12 more)

### Community 44 - "review-report-shell.tsx"
Cohesion: 0.07
Nodes (47): EquityCurveChart(), PnlTrendChart(), TrendTooltip(), DownloadPdfButton(), LearningSummary(), Goal, GOAL_STATUS, MonthlyLetter() (+39 more)

### Community 45 - "institutional-summary.ts"
Cohesion: 0.14
Nodes (19): EquityDrawdownChart(), fmt(), fmt(), RDistributionChart(), analyzeDrawdown(), daysBetween(), DrawdownPoint, DrawdownResult (+11 more)

### Community 46 - "simple-table.tsx"
Cohesion: 0.11
Nodes (25): AppToaster(), AnimatedItem(), AnimatedList(), DataTable(), gridTemplate(), RovingItemProps, Row(), ROW_PAD (+17 more)

### Community 47 - "psychology-service.ts"
Cohesion: 0.16
Nodes (18): calibration(), CheckinInput, CheckinResult, checkinVerdict, clamp(), LABEL, avg(), MoodSample (+10 more)

### Community 48 - "risk-of-ruin.ts"
Cohesion: 0.15
Nodes (20): Band, jeffreysBand(), Bottleneck, mean(), PassOutcome, percentile(), projectPhasePass(), PropProjectionResult (+12 more)

### Community 49 - "learning-resources.ts"
Cohesion: 0.11
Nodes (17): computeNewStreak(), utcMidnight(), computeNextReview(), Grade, SrsInput, SrsResult, updateEase(), LearningResourceInput (+9 more)

### Community 51 - "trades.ts"
Cohesion: 0.25
Nodes (12): feedbackForEmotion(), RawAccount, RawTrade, serializeAccount(), SerializedTrade, serializeTrade(), getEmotionFeedback(), getPatternInsights() (+4 more)

### Community 52 - "page.tsx"
Cohesion: 0.07
Nodes (30): CAT_COLOR, CAT_LABELS, CATS, FORM_INIT, MarketForm, MarketItem, MarketModal(), MercadosPage() (+22 more)

### Community 53 - "overview.ts"
Cohesion: 0.10
Nodes (24): Pattern, PatternCards(), TONE, InsightCategory, InsightSeverity, buildPeriodSummary(), CATEGORY_TAG, downsample() (+16 more)

### Community 54 - "seed-psych-trades.mjs"
Cohesion: 0.13
Nodes (21): ACCOUNTS, between(), buildTrade(), c, cols, DRY, EMO_LOSS, EMO_WIN (+13 more)

### Community 56 - "route.ts"
Cohesion: 0.19
Nodes (18): dupKey(), POST(), storedKey(), toDirection(), DryRunResponse, CTRADER_COLS, detectFormat(), parseCtraderDate() (+10 more)

### Community 57 - "page.tsx"
Cohesion: 0.16
Nodes (11): BudgetGuardInput, BudgetGuardResult, evaluateBudgetGuard(), checkDailyLossLimit(), checkLossLimit(), checkSymbolAllowlist(), checkTradeCountLimit(), LOSS_LIMIT_TYPE (+3 more)

### Community 58 - "condition-group.tsx"
Cohesion: 0.14
Nodes (16): CMP_LABEL, ConditionGroup(), Group, isLeaf(), isNot(), newLeaf(), NotNode, ENUM (+8 more)

### Community 59 - "behavior.ts"
Cohesion: 0.17
Nodes (16): block(), canEnforce(), ProposedRule, proposeRuleForCommitment(), RuleSuggestionProposal, suggestRuleForInsight(), carryOverCommitments(), dismissProposedCommitment() (+8 more)

### Community 60 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+12 more)

### Community 61 - "resolveAiCall()"
Cohesion: 0.17
Nodes (19): PERIODS, POST(), PERIODS, POST(), AnalyticsAiOptions, buildContext(), streamAnalyticsInsights(), windowFor() (+11 more)

### Community 62 - "page.tsx"
Cohesion: 0.18
Nodes (15): ResourceFromDB, useResourceActions(), SetupImpactModal(), LinkSetupModal(), ResourceFromDB, ReviewFromDB, RevisarRecursoModal(), AprendizajePage() (+7 more)

### Community 63 - "ConditionNode"
Cohesion: 0.26
Nodes (14): RuleDraft, PROTECTION_TEMPLATE_MAP, PROTECTION_TEMPLATES, ProtectionTemplate, ExecutableRuleInput, AutomationTemplate, BASE_TEMPLATES, PROTECTION_AS_AUTOMATION (+6 more)

### Community 64 - "trade-detail-panel.tsx"
Cohesion: 0.07
Nodes (29): ADR-000 — Decisiones de raíz de Trading Journal v3.1, ADR-001 — Runtime de eventos y entrega, ADR-002 — Estrategia estadística, ADR-003 — Privacidad de la memoria y frontera anti-corrupción, ADR-004 — Reserva de datos cross-user (BIZ-1), Alternativas consideradas, Alternativas consideradas, Alternativas consideradas (+21 more)

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
Nodes (15): CATEGORIES, NotificacionesPage(), NotificationBell(), CenterPanel(), CenterSheet(), formatNotifTime(), NotificationItem(), NotificationItemProps (+7 more)

### Community 69 - "event-bus.ts"
Cohesion: 0.13
Nodes (15): DispatchResult, DomainEventRecord, EventHandler, EventStatus, EventTransition, HandlerOutcome, handlers, isKnownEventType() (+7 more)

### Community 70 - "weekly-reviews.ts"
Cohesion: 0.16
Nodes (16): react, EmailAttachment, emailFailureMessage(), EmailSender, SendEmailArgs, SendEmailResult, DigestDeps, MONTHS (+8 more)

### Community 71 - "createClient()"
Cohesion: 0.22
Nodes (9): POST(), Provider, rateLimiter, testAnthropicKey(), testOpenAIKey(), testOpenRouterKey(), createRateLimiter(), InMemoryRateLimiter (+1 more)

### Community 72 - "page.tsx"
Cohesion: 0.13
Nodes (4): AI_PROVIDERS, COLORBLIND_OPTIONS, SESSIONS, TIMEZONES

### Community 73 - "report-data.ts"
Cohesion: 0.13
Nodes (20): MonthlyReport, WeeklyReport, ensureReviewAnalysis(), persistMonthlyAnalysis(), persistWeeklyAnalysis(), LearningSummary, loadLearningSummary(), aiMetaOf() (+12 more)

### Community 74 - "config.ts"
Cohesion: 0.27
Nodes (8): POST(), streamCoachAgent(), systemToString(), buildSystemPrompt(), CoachStreamOptions, MessageParam, streamCoachReply(), COACH_TOOLS

### Community 75 - "ai-config.ts"
Cohesion: 0.12
Nodes (25): getProviderKey(), ACTIVE_AI_FEATURES, decryptApiKey(), encryptApiKey(), EncryptionConfigError, getEncryptionKey(), maskApiKey(), rotateEncryptionKey() (+17 more)

### Community 76 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, eslint-config-next, jsdom, @playwright/test, react-email, tailwindcss, @tailwindcss/postcss (+10 more)

### Community 78 - "Trading Journal (project)"
Cohesion: 0.12
Nodes (16): 1. Clonar e instalar, 2. Variables de entorno, 3. Base de datos, 4. Levantar el dev server, 🚀 Cómo iniciar el proyecto, 📚 Documentación, El núcleo cognitivo, 📁 Estructura (+8 more)

### Community 79 - "risk-service.ts"
Cohesion: 0.22
Nodes (14): aggregateExposure(), AggregateFreezeInput, aggregateFreezeSignal, CorrelationResult, Direction, OpenPosition, SymbolExposure, asDrawdownModel() (+6 more)

### Community 80 - "today-service.ts"
Cohesion: 0.22
Nodes (14): RiskBudget, assembleTodayFeed(), detectDailyAnomaly(), SignalInput, TodayItem, getIgnoreCounts(), recordIgnore(), getTodayFeed() (+6 more)

### Community 81 - "emit.ts"
Cohesion: 0.27
Nodes (10): POST(), buildCognitiveDigest(), DigestInput, DigestResult, isoWeekKey(), sendCognitiveDigest(), sendCognitiveDigestForAll(), getImprovementSeries() (+2 more)

### Community 83 - "G2 Rules Cutover Design Spec"
Cohesion: 0.22
Nodes (8): G2 Fase 2 — Retiro de `automations` · Implementation Plan, Global Constraints, Task 1: Engine solo-`runRules` (borrar flag/dispatcher/runAutomations), Task 2: Helpers puros de escritura de reglas (`rule-write.ts`, TDD), Task 3: Router `rules` a paridad ejecutable, Task 4: UI `/reglas` → `trpc.rules.*`, Task 5: Borrar automations router, dual-write e informe de migración, Task 6: Validación final, docs y push

### Community 85 - "gen-theme-css.mjs"
Cohesion: 0.23
Nodes (14): accentContrastFor(), clamp01(), contrastRatio(), derivePalette(), hexToRgb(), linearToSrgb(), okl(), oklchToHex() (+6 more)

### Community 86 - "use-data-table.ts"
Cohesion: 0.09
Nodes (22): Auto-revisión del plan, Estructura de ficheros, Global Constraints, PR 1 — El módulo `retrieval` (sin UI), PR 2 — Re-cableado, PR 3 — Citas abribles y deep-link, Recuperación semántica consolidada + citación en el Coach — Plan de implementación, Task 10: `aiConfig.indexStatus` + `aiConfig.reindex` (+14 more)

### Community 87 - "commitment-service.ts"
Cohesion: 0.10
Nodes (20): 0. Alcance de la congelación, 10. Analytics (FREEZE — subsistema), 12. Trazabilidad: cómo este freeze cierra los hallazgos, 13. Qué desbloquea la implementación (puerta de salida), 1. Principios (FREEZE-P), 2. Módulos (mapa físico), 3. Bounded contexts y fronteras (FREEZE-D, parte 1), 4.1 Mecanismo congelado (FREEZE-D1 — resuelve ADR-001) (+12 more)

### Community 88 - "resolveEmbeddingCall()"
Cohesion: 0.25
Nodes (16): EmbedOptions, embedText(), resolveEmbeddingCall(), classify(), ClassifyInput, clamp(), indexStatus(), reindex() (+8 more)

### Community 89 - "analytics-bundle.ts"
Cohesion: 0.14
Nodes (20): AccountIntel, AnalyticsBundle, buildAnalyticsBundle(), EmotionIntel, holdMinutes(), MarketIntel, round1(), round2() (+12 more)

### Community 90 - "gen-icons.mjs"
Cohesion: 0.19
Nodes (14): BG, chunk(), clamp(), crc32(), __dirname, distSeg(), DOT, encodePNG() (+6 more)

### Community 91 - "accounts.ts"
Cohesion: 0.12
Nodes (10): dashboardMutation, ACCOUNT_STATUSES, ACCOUNT_TYPES, AccountInput, accountsRouter, ENFORCE_MODES, PHASES, RawAccount (+2 more)

### Community 96 - "rules.ts"
Cohesion: 0.13
Nodes (16): ruleDataFromExecutableInput(), ruleDataFromTemplate(), TEMPLATE_MAP, classifyMode(), action, ACTION_TYPES, cmp, conditionNode (+8 more)

### Community 97 - "page.tsx"
Cohesion: 0.12
Nodes (17): [2026-06-05] · AI config, migraciones y consolidación documental, [2026-07-13] · G2 — cutover de reglas: `rules` es la única fuente, [2026-07-14] · S0/DT-4 — drift check SQL↔Prisma en CI, [2026-07-14] · TD-018 — trade services extraídos del router `trades`, Added, Changed, Changelog — Trading Journal v2, Fixed (+9 more)

### Community 98 - "page.tsx"
Cohesion: 0.12
Nodes (16): 1. Problema, 2. Objetivo y no-objetivos, 3. Umbrales que el fixture debe cruzar, 4.1 Por qué llevaba invisible, 4. Defecto encontrado: la secuencia se resuelve por UUID, 5.1 Modelo de escenario, 5.2 Flujo que asserta el test de integración, 5. Arquitectura (+8 more)

### Community 99 - "trajectory-panel.tsx"
Cohesion: 0.18
Nodes (12): Bead, BEADS, buildChart(), fmtWeek(), HOVER, money(), Overview, STAT (+4 more)

### Community 100 - "DrawdownModel"
Cohesion: 0.20
Nodes (11): AccountRiskConfig, DerivedRiskInputs, deriveRiskInputs(), median(), pctToFraction(), PropProjectionInput, DrawdownModel, AccountPhase (+3 more)

### Community 101 - "loadWeeklyReport()"
Cohesion: 0.22
Nodes (11): computeDisciplineScore(), DisciplineDetail, DisciplinePeriod, DisciplineResult, calcDisciplineScore(), DisciplineBreakdown, DisciplineParams, FinalizeResult (+3 more)

### Community 103 - "ai-models-card.tsx"
Cohesion: 0.17
Nodes (11): AiModelsCard(), ALL_TOOL_MODELS, COST_OPTIONS, FEATURE_LABEL, inputStyle, looksToolIncapable(), Provider, PROVIDER_LABEL (+3 more)

### Community 104 - "welch.ts"
Cohesion: 0.20
Nodes (16): mean(), oneSampleTTest(), sampleVariance(), studentTTwoSidedP(), TTestResult, welchTTest(), detectEdgeDecay(), EdgeDecayInput (+8 more)

### Community 105 - "verifiers.ts"
Cohesion: 0.17
Nodes (9): METRIC_KEYS, OFF_PLAN_TAGS, REGISTRY, sortByDateTime(), Verifier, VerifierOpts, VerifierResult, verifyTradesPerDayBeyond2() (+1 more)

### Community 106 - "pdf-report-html.ts"
Cohesion: 0.36
Nodes (12): analysisHtml(), C, CALLOUT, calloutHtml(), card(), equitySvg(), esc(), kpiCell() (+4 more)

### Community 110 - "commitment-machine.ts"
Cohesion: 0.11
Nodes (29): canCommit(), CommitmentResult, CommitmentSpec, CommitmentStatus, CommitmentWindow, Comparator, deriveCommitmentSpec(), evaluateResult() (+21 more)

### Community 111 - "memory-episode-service.ts"
Cohesion: 0.28
Nodes (11): BASE, decayedSalience(), initialSalience(), MemoryEventType, recallScore(), EpisodeRow, rankBySalience(), RecalledEpisode (+3 more)

### Community 112 - "resolve-provider.ts"
Cohesion: 0.15
Nodes (13): AccountHistoryModal(), EVENT_META, Log, CuentasPage(), STATUS_FILTER_OPTIONS, StatusFilter, TOUR_STEPS, readRect() (+5 more)

### Community 115 - "review-insights.ts"
Cohesion: 0.12
Nodes (15): 10. Fuera de alcance (YAGNI / POST), 11. Resumen de decisiones confirmadas, 1. Objetivo y valor, 2. Estado actual (de qué partimos), 3. Decisión arquitectónica — Snapshot (Approach A), 4.1 Nueva tabla `PropFirmPreset` (data de referencia GLOBAL, no per-usuario), 4.2 Campos nuevos en `Account` (los que faltan), 4.3 Migración (+7 more)

### Community 116 - "revisar-recurso-modal.tsx"
Cohesion: 0.14
Nodes (13): 1. Verificar que los intermedios siguen en disco, 2. Re-lanzar SOLO los chunks 01 y 04 (en paralelo, mismo mensaje), 3. Validar los 2 chunks nuevos, 4. Fusionar los 5 chunks (02+03+05 ya existentes + 01+04 nuevos) en `.graphify_semantic.json`, 5. Re-fusionar semantic + AST (`.graphify_extract.json`) y reconstruir el grafo completo, 6. Limpiar intermedios y commitear, Contexto de negocio (por si la máquina nueva no tiene memoria persistente), Cómo retomar (pasos exactos) (+5 more)

### Community 117 - "useQuickActions"
Cohesion: 0.18
Nodes (12): CreateAction, IconTab(), MobileBottomBar(), NavItem, useReducedMotion(), OnboardingWelcome(), Cmd, CommandPalette() (+4 more)

### Community 118 - "Sidebar.tsx"
Cohesion: 0.21
Nodes (14): accountDrawdown(), AccountRisk, AccountRiskInput, computeAccountRisk(), gauge(), LimitGauge, lossPct(), maxDrawdownFromPnl() (+6 more)

### Community 119 - "feed.ts"
Cohesion: 0.18
Nodes (10): AssembleInput, MemoryExtraction, MemoryKind, MemoryStatus, parseMemoryExtraction(), ProposedMemory, proposeMemory(), ADR-0003 (+2 more)

### Community 120 - "emotion-feedback.ts"
Cohesion: 0.13
Nodes (14): (a) Números de firma marcados `-- VERIFY`, ✅ ACTUALIZACIÓN (2026-07-10, cont.): a/b resueltos, c bloqueado por entorno, ✅ ACTUALIZACIÓN (2026-07-10): la UI de Tasks 9 y 10 ya está implementada, (b) Rojo del e2e en CI antes de la corrida de QA, Deploy / migración, ⚠️ Dos confirmaciones pendientes del usuario (heredadas del plan), Handoff QA — POST-6 Prop-Firm Rulebase, ⛔ (Histórico) BLOQUEANTE de UI — RESUELTO por `71154ac` (+6 more)

### Community 121 - "profile.ts"
Cohesion: 0.31
Nodes (8): invalidateAnalyticsCacheIfNeeded(), isValidIanaTimezone(), normalizeProfileInput(), PROFILE_PUBLIC_FIELDS, UpdateProfileInput, validateProfileUpdate(), createAdminClient(), profileRouter

### Community 122 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, dev, e2e, e2e:ui, email, gen:theme, lint (+4 more)

### Community 126 - "coach-service.ts"
Cohesion: 0.38
Nodes (9): calmarRatio(), computeRiskRatios(), Kelly, kellyCriterion(), kellyFromR, mean(), rollingRiskRatios(), sortinoRatio() (+1 more)

### Community 127 - "route.ts"
Cohesion: 0.50
Nodes (7): POST(), USER_SELECT, dayOfMonthOf(), duePeriods(), previousMonth(), previousWeekStart(), weekdayOf()

### Community 128 - "useLogout.ts"
Cohesion: 0.33
Nodes (7): LoginPage(), PerfilPage(), useLogout(), clearSessionStorageKeys(), SESSION_SCOPED_STORAGE_KEYS, STORAGE_KEYS, createClient()

### Community 129 - "setup-intelligence-panel.tsx"
Cohesion: 0.31
Nodes (8): EdgeEvolutionChart(), fmt(), Windows, DECAY_META, Drift, driftValue(), fmt(), SetupIntelligencePanel()

### Community 131 - "analytics-cache.ts"
Cohesion: 0.20
Nodes (12): MinimalTrade, computeSessionMatrix(), computeSetupStats(), DirectionStats, parseTimeMinutes(), SessionMatrixRow, SESSIONS, SetupMeta (+4 more)

### Community 132 - "pattern-detector.ts"
Cohesion: 0.15
Nodes (13): 1. EXECUTIVE SUMMARY, 2. HALLAZGOS CRÍTICOS (los que mueven la aguja), 5. RIESGOS DE PRODUCTO, 6. OPORTUNIDADES DE DIFERENCIACIÓN, 7. ROADMAP PRIORIZADO, 8. TOP 50 MEJORAS ORDENADAS POR ROI, AUDITORÍA DE PRODUCTO — Trading Journal v2, Equipo simulado: PM SaaS-trading · Prop trader · Trading psychologist · UX researcher · Behavioral designer · AI product lead · Staff architect (+5 more)

### Community 133 - "memory-pattern-service.ts"
Cohesion: 0.26
Nodes (9): POST(), DetectedPattern, detectPatterns(), EpisodeForPattern, PATTERN_TEXT, PatternStatus, recordImprovementSnapshotForAll(), recomputeMemoryPatterns() (+1 more)

### Community 134 - "package.json"
Cohesion: 0.22
Nodes (8): engines, node, name, packageManager, pnpm, onlyBuiltDependencies, private, version

### Community 139 - "tab-playbook.tsx"
Cohesion: 0.36
Nodes (6): checklistColor(), getWeekKey(), HEALTH_CONFIG, LifecycleSuggestions(), sessionCellColor(), TabPlaybook()

### Community 140 - "risk-budget.ts"
Cohesion: 0.15
Nodes (12): Global Constraints, Self-Review, Task 0: Rama, Task 1: Serializers, Task 2: Embedding service, Task 3: Dashboard service + primer test de orquestación, Task 4: Read service (list / violaciones / emoción / patrones), Task 5: Write service — create (+4 more)

### Community 141 - "study-sessions.ts"
Cohesion: 0.13
Nodes (18): computeProgressPct(), computeResourceStatus(), applyStudyFinish(), minutesThisWeek(), pickStudySuggestion(), ResourceProgressLite, ResourceProgressUpdate, startOfWeekUTC() (+10 more)

### Community 142 - "preferences.ts"
Cohesion: 0.15
Nodes (12): 1.1 Registro, 1.2 Cierre, 1.3 Fricción (lo más cercano a la pregunta de producto), Al terminar, Fase 0 — Limpiar el ruido y fijar la línea base, Fase 1 — Validar la captura, a mano (aquí está el valor), Fase 2 — Volumen con patrón, por script, Fase 3 — El loop conductual (+4 more)

### Community 145 - "RULES_SOURCE env var"
Cohesion: 0.40
Nodes (5): ensureTagsSeeded(), SYSTEM_APPEARANCE, SystemTagDef, systemTagDefs(), QUALITY_TAGS

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
Cohesion: 0.15
Nodes (12): 1. Contexto y estado real verificado (2026-07-13), 2. Gate OI-1 — informe de no-mapeo con datos reales (CERRADO 2026-07-13), 3. Fase 1 — Flip (ops, sin código), 4. Fase 2 — Retiro de `automations` (rama `feat/g2-rules-cutover`), 5. Testing y verificación, 6. Rollback y riesgos, Engine, G2 — Cutover de enforcement a `rules` y retiro de `automations` (+4 more)

### Community 151 - "backfill-resource-embeddings.mjs"
Cohesion: 0.19
Nodes (12): AccountRules, ADDABLE_TYPES, AddableType, CONTRACTS_TYPES, EVENT_COLORS, EVENT_DESCRIPTIONS, EVENT_LABELS, EventType (+4 more)

### Community 153 - "Cognitive Engine (root bounded context)"
Cohesion: 0.17
Nodes (12): 3.10 Etiquetas, 3.11 Mercados, 3.1 Dashboard, 3.2 Trades (journaling), 3.3 Psicología, 3.4 Playbook, 3.5 Reviews, 3.6 Aprendizaje (+4 more)

### Community 154 - "improvement-panel.tsx"
Cohesion: 0.47
Nodes (5): fmt(), Improvement, ImprovementPanel(), REGIME_LABEL, scoreColor()

### Community 155 - "action-list.tsx"
Cohesion: 0.19
Nodes (8): CoachAgentOptions, AiProvider, detectProvider(), getCoachModel(), getWeeklySummaryModel(), resolveModel(), ConnectivityResult, testProviderConnectivity()

### Community 156 - "note-tag-suggestions.tsx"
Cohesion: 0.47
Nodes (4): NoteTagSuggestions(), RULES, suggestTagsFromNote(), TagRule

### Community 158 - "mae-mfe.ts"
Cohesion: 0.40
Nodes (5): analyzeMaeMfe(), EMPTY, MaeMfeResult, MaeMfeTrade, mean()

### Community 159 - "reinforcement.ts"
Cohesion: 0.17
Nodes (11): File Structure, Global Constraints, S0–S2 Audit Closure Implementation Plan, Self-Review, Task 1: Integration harness (config, isolation, guard, smoke), Task 2: persistInsights integration tests, Task 3: dispatchPending integration test, Task 4: Wire the integration suite into CI (+3 more)

### Community 160 - "prop-firm-presets.ts"
Cohesion: 0.33
Nodes (5): DrawdownModel, FIRMS, Phase, PROP_FIRM_PRESETS, PropFirmPresetSeed

### Community 161 - "capture-rules.ts"
Cohesion: 0.17
Nodes (11): Al terminar, Fixture conductual + validación del loop — Plan de implementación, Global Constraints, Mapa de ficheros, Task 1: El generador de escenarios y su self-check, Task 2: Arreglar el ordenamiento de secuencia en insights-engine, Task 3: Los detectores disparan sobre el patrón y callan sin él, Task 4: La cadena pura hasta reinforcement (+3 more)

### Community 162 - "handler()"
Cohesion: 0.17
Nodes (11): 10. Criterios de éxito, 1. Punto de partida: qué era falso y qué era cierto, 2. Objetivo, 3. Decisión de arquitectura: A′ — registro con consultas literales, 4. Consolidación: qué absorbe y qué se queda fuera, 5. La tool del Coach y el viaje de una cita, 6. Taxonomía de estados — el corazón del sprint, 7. Auto-reparación y estado visible (+3 more)

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

### Community 170 - "README.md"
Cohesion: 0.23
Nodes (11): clamp01(), computeImprovementScore(), costOfIndiscipline(), DEFAULT_WEIGHTS, Driver, ImprovementInputs, ImprovementWeights, IndisciplineCost (+3 more)

### Community 171 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

### Community 177 - "AGENTS.md"
Cohesion: 0.35
Nodes (8): GET(), ReviewPeriod, buildHtml(), MONTHS, renderReviewPdf(), loadReviewAnalytics(), loadReviewInsights(), windowFor()

### Community 208 - "App Scripts (dev/build/start/lint/test/e2e from src/)"
Cohesion: 0.22
Nodes (8): DeskItem(), MobileClock(), NAV, NavItem, Sidebar(), SURFACE_NAV, useMinuteClock(), useWindowWidth()

### Community 211 - "CLAUDE.md"
Cohesion: 0.24
Nodes (9): KIND_ICON, severityColor(), TodayFeed(), AnomalyInput, AnomalyResult, BASE, SEVERITY_MULT, SignalKind (+1 more)

### Community 216 - "@anthropic-ai/sdk"
Cohesion: 0.20
Nodes (10): 1. ¿Qué es?, 2. ¿Qué NO es?, 3. Usuarios objetivo, 4. Módulos y rutas, 5. Stack, 6. Mapa de código, 7. Dónde está todo, Lo que v3 y v3.2 añadieron (+2 more)

### Community 217 - "clsx"
Cohesion: 0.20
Nodes (9): File Structure, Global Constraints, OI-4.8 Commitment-Loop Detectors Implementation Plan, Self-Review, Task 1: `detectRevengeTrading`, Task 2: `detectOversizing`, Task 3: `detectOffPlan`, Task 4: Round-trip + coverage guard (the loop actually closes) (+1 more)

### Community 218 - "dotenv"
Cohesion: 0.20
Nodes (9): Alcance, Decisiones de diseño, Eslabón de cableado (verificado), OI-4.8 — Cerrar los 3 loops de compromiso colgantes, Problema, Riesgos / a chequear durante la implementación, Señal (híbrido), Testing (TDD) (+1 more)

### Community 219 - "framer-motion"
Cohesion: 0.38
Nodes (8): AddEditResourceModal(), ResourceFromDB, ALL_TYPES, emptyForm(), FormState, PROGRESS_LABELS, PROGRESS_TYPES, TYPE_EMOJIS

### Community 220 - "@hookform/resolvers"
Cohesion: 0.27
Nodes (8): EmotionInsight(), LABELS, EmotionFeedback, EmotionStat, EmotionTrade, round1(), ADR-0002, wrByEmotion()

### Community 221 - "jsdom"
Cohesion: 0.27
Nodes (6): CacheDb, CacheDelegate, CacheRow, getCachedStats(), invalidateCache(), setCachedStats()

### Community 222 - "katex"
Cohesion: 0.22
Nodes (8): Alcance, Cerrar la deuda auditada de S0–S2, Decisiones / notas, Origen, Parte A — S0/DT-3: arnés de integración + tests del outbox, Parte B — S1/DT-4: FK de `Rule.sourceCommitmentId`, Parte C — STATUS.md: cerrar la auditoría, Verificación de cierre

### Community 223 - "lucide-react"
Cohesion: 0.28
Nodes (7): ACTION_LABEL, ActionList(), ALL, TAG_ACTIONS, ConditionValue, RuleActionType, TRIGGERS

### Community 224 - "next"
Cohesion: 0.29
Nodes (6): clamp01(), computeRiskBudget(), DailyWindow, DailyWindowInput, RiskBudgetInput, RiskOverview

### Community 225 - "pg"
Cohesion: 0.43
Nodes (6): buildPropFirmStatus(), checkConsistency(), phaseProgress, buildPropFirmExtras(), PropFirmExtras, PropFirmExtrasInput

### Community 226 - "prisma"
Cohesion: 0.19
Nodes (9): extractTradeId(), POST(), secretsMatch(), ALLOWED_MIME, POST(), globalForPrisma, NOTE: DATABASE_URL should point to the TRANSACTION pooler (port 6543,, createClient() (+1 more)

### Community 227 - "@prisma/adapter-pg"
Cohesion: 0.29
Nodes (5): ChecklistEvaluation, ChecklistState, evaluateChecklist(), Regime, REGIME_VALUES

### Community 228 - "puppeteer-core"
Cohesion: 0.33
Nodes (6): 4.1 Qué hace actualmente (exacto, leído del código), 4.2 Qué debería hacer (faltante), 4.3 Nivel actual: **ÚTIL** (no Profesional, no Elite), 4.4 Capacidades críticas faltantes, 4.5 Cómo sería una versión 10x (coach + psicólogo + quant + mentor prop), 4. HALLAZGOS DEL AI COACH (sección central)

### Community 229 - "@radix-ui/react-checkbox"
Cohesion: 0.33
Nodes (6): [2026-06-10] · Hardening: P&L, enforcement, CI/migraciones y rendimiento, Fixed — financiero (core), Fixed — UX / reglas, Infra / CI / migraciones, Performance, Tests

### Community 230 - "@radix-ui/react-dialog"
Cohesion: 0.47
Nodes (5): handler(), StatusSelect(), Dropdown(), createTRPCContext(), AppRouter

### Community 231 - "@radix-ui/react-select"
Cohesion: 0.50
Nodes (4): 11.1 Decisiones IRREVERSIBLES (revocar = nuevo freeze v3.2), 11.2 Decisiones REVERSIBLES (cambiables dentro del freeze, sin nuevo freeze), 11.3 Decisiones POSTERGADAS (no se deciden en v3.1; reservadas), 11. Clasificación de decisiones

### Community 232 - "@radix-ui/react-tabs"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **1590 isolated node(s):** `check-schema-drift.sh script`, `PALETTES`, `target`, `Instruments`, `TagEdges` (+1585 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **479 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `page.tsx` to `cn()`, `client.ts`, `resource-card.tsx`, `register-trade-modal.tsx`, `page.tsx`, `tab-playbook.tsx`, `ai-coach-drawer.tsx`, `page.tsx`, `backfill-resource-embeddings.mjs`, `index.ts`, `tab-portfolio.tsx`, `trades-table.tsx`, `page.tsx`, `page.tsx`, `review-report-shell.tsx`, `simple-table.tsx`, `page.tsx`, `page.tsx`, `notifications.ts`, `App Scripts (dev/build/start/lint/test/e2e from src/)`, `framer-motion`, `resolve-provider.ts`, `useQuickActions`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `weekly-reviews.ts`, `package.json`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `trpc` connect `client.ts` to `palette-studio.tsx`, `setup-intelligence-panel.tsx`, `cn()`, `page.tsx`, `resource-card.tsx`, `register-trade-modal.tsx`, `page.tsx`, `tab-playbook.tsx`, `ai-coach-drawer.tsx`, `goal-progress-widget.tsx`, `page.tsx`, `account-risk-panel.tsx`, `page.tsx`, `index.ts`, `tab-portfolio.tsx`, `page.tsx`, `account-card.tsx`, `page.tsx`, `review-report-shell.tsx`, `page.tsx`, `page.tsx`, `notifications.ts`, `page.tsx`, `App Scripts (dev/build/start/lint/test/e2e from src/)`, `CLAUDE.md`, `framer-motion`, `ai-models-card.tsx`, `resolve-provider.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `check-schema-drift.sh script`, `PALETTES`, `target` to the rest of the system?**
  _1634 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `palette-studio.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05427905427905428 - nodes in this community are weakly interconnected._
- **Should `POST-6 Prop-Firm Rulebase Spec` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `cn()` be split into smaller, more focused modules?**
  _Cohesion score 0.07003367003367003 - nodes in this community are weakly interconnected._