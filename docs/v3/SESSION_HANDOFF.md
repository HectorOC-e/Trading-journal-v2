# SESSION_HANDOFF.md
### Trading Journal v3.1 — Punto de continuación entre sesiones

> **Léeme primero para recuperar contexto.** Resume qué es el proyecto v3, dónde está todo, qué se ha hecho y qué sigue. Mantener actualizado al final de cada sesión.
> Última actualización: 2026-06-25.

---

## 0. Capacidades del entorno (CONFIRMAR al inicio de cada sesión)
> El entorno de ejecución puede cambiar entre sesiones. **Pregunta al usuario al empezar qué de esto está disponible** antes de depender de ello. Cuando lo está, **no dejes deuda técnica que tú puedas cerrar** (mergear, verificar por UI, flip de env) — tómalo, no lo difieras como "tarea del usuario".

| Capacidad | Cómo | Úsalo para |
|---|---|---|
| **`gh` CLI** | `GH_TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' \| git credential fill \| sed -n 's/^password=//p')` | **Mergear PRs propios cuando CI esté verde**, crear PRs, leer `gh pr checks` |
| **MCP Vercel** (`mcp__claude_ai_Vercel__*`) | tools deferred | deployments, **env vars (p.ej. flip `RULES_SOURCE` de G2)**, logs, runtime errors |
| **MCP Supabase** (`mcp__claude_ai_Supabase__*`) | tools deferred | `execute_sql`, advisors, logs, migraciones, verificar prod/BD |
| **BD real** | `src/.env` (`DATABASE_URL`+`CRON_SECRET`) | vitest throwaway (dotenv + `await import("@/lib/prisma")`), **bórralo después** |
| **App real / Playwright** | webapp-testing, Node 24 vía nvm | **verificar features por la UI** (no marcar "pendiente de verificación del usuario") |

**Regla operativa:** mergea tus PRs cuando CI esté verde; **avisa antes** de acciones de prod sensibles/irreversibles (p.ej. flip de enforcement G2 → confirma, ejecuta con smoke + rollback listo). Verifica por UI real en vez de diferir. No acumules "follow-up de UI" como deuda.

## 1. Qué es esto
Trading Journal v3 = convertir un journal de trading (v2) en una **"capa cognitiva sobre el broker"**: un sistema que **cambia el comportamiento del trader** (loop verificado), no solo registra trades. La unidad de valor es **"el cambio de comportamiento verificado"**.

- **Fuente de verdad arquitectónica:** `docs/v3/ARCHITECTURE_FREEZE.md` (canónico; todo cambio cita sus IDs `FREEZE-P/D/E/EV`).
- **Auditoría vinculante original:** `docs/auditoria-producto-trading-journal-v2.md` (C1–C8, 50 ítems ROI, R1–R6).

## 2. Mapa de documentación (todo en `docs/v3/`)
| Archivo | Qué es |
|---|---|
| `ARCHITECTURE_FREEZE.md` | **Arquitectura oficial congelada** (principios, bounded contexts, entidades E1–E20, eventos EV1–EV10, decisiones irreversibles/reversibles/postergadas) |
| `REHYDRATION_REPORT.md` | Reconstrucción de contexto + estado real del código |
| `ARCHITECTURE_CHALLENGE.md` | Desafío crítico (memoria jerárquica, intervención scoring, moat §7) |
| `ARCHITECTURE_V3_1_DELTA.md` | Fusión de hallazgos → cambios v3→v3.1 con gating |
| `PRODUCT_MASTER_PLAN.md`, `MASTER_PRD.md` | Plan de producto + Epics/US/AC |
| `AI_COACH_V3.md`, `ANALYTICS_V3.md`, `BEHAVIOR_ENGINE_V3.md`, `DESIGN_SYSTEM_V3.md` | Specs de subsistemas |
| `SPRINT_PLAN.md`, `IMPLEMENTATION_ORDER.md` | Sprints S0–S14, DAG, gates G1–G6 |
| `adr/ADR-000..004` | Decisiones: raíz, eventos, estadística, memoria/privacidad, **cross-user (BIZ-1)** |
| `*_SPRINT_0/1/2.md` (CHANGELOG/DECISIONS/TEST_REPORT/OPEN_ITEMS) | Reportes por sprint |
| `OPENITEMS_CLOSEOUT_S0_S2.md` | Cierre de open items S0–S2 |
| `GATES_G1_G2_BIZ1.md` | Resultado de G1/G2/BIZ-1 + runbook de flip de G2 |

## 3. Mapa de código (lo construido en v3)
```
src/domains/cognitive/events/     event-types.ts (catálogo EV), event-bus.ts (outbox: publishEvent/dispatchPending/planEventTransition)
src/domains/analytics/longitudinal/ rolling-window.ts (primitiva C3)
src/domains/analytics/institutional/ stats/bayes.ts (estimador Bayesiano ADR-002), drawdown.ts, r-distribution.ts, risk-ratios.ts, mae-mfe.ts, benchmark.ts, pnl-heatmap.ts (C4, S3, puro)
src/domains/analytics/insights/   insight-reconcile.ts, insight-store.ts (S3: rellena confidence vía proportionEstimate cuando hay Insight.stat), recompute-insights.ts (C8)
src/domains/rules/                unification.ts, protection-templates.ts, migration-report.ts, rule-sync.ts (dual-write), engine.ts (runAutomations + runRules + runRuleEngine + flag)
src/domains/behavior/             verifiers.ts (FREEZE-D7), commitment-machine.ts (deriveSpec/evaluateResult), reinforcement.ts (ratio variable) — S4, puro
src/server/services/behavior/     commitment-service.ts (createCommitmentFromInsight/evaluateCommitment/evaluateWindowCommitments/carryOverCommitments + outbox)
src/domains/trading/services/     trade-derivation.ts, capture-rules.ts, note-tag-suggester.ts, emotion-feedback.ts (S2 captura)
src/components/trades/            emotion-insight.tsx, note-tag-suggestions.tsx (D10/#37 UI)
src/components/behavior/          behavior-loop-panel.tsx (S4 — CTA Comprometerme + tarjetas de compromiso, montado en /analytics)
src/components/rules/             rule-mode-badge.tsx (enforce/warn)
src/server/trpc/routers/behavior.ts  (openInsights/commitments/createFromInsight/evaluate/archive)
src/app/api/cron/                 recompute-insights/, dispatch-events/, rules-migration-report/, evaluate-commitments/ (S4)  (Bearer CRON_SECRET)
supabase/migrations/              20260625120000 (outbox+insights), 130000 (unify rules), 140000 (trade capture), 150000 (consent), 20260626120000 (S4 behavior: commitments/commitment_checks/reinforcements)
```

## 4. Estado actual (qué se ha hecho)
| Sprint / gate | Estado | PR |
|---|---|---|
| **S0** fundaciones (rollingWindow, outbox, Insight persistido, recompute) | ✅ merged a main | #89 |
| **S1** unificación de Reglas (C6) — `Rule` unificado, backfill no destructivo, plantillas, badge, informe | ✅ merged a main | #89 |
| **S2** captura de trade (C7) — derivación, MAE/MFE/regime, checklist, auto-tag, incentivo D10 | ✅ merged a main | #89 |
| Fix TS2589 en `rules.list` | ✅ merged | #90 |
| **Cierre open items S0–S2** (D10 UI, tag chips, Off-plan, riskPct server, plantillas en galería) | ✅ merged a main | #91 |
| **G1** outbox validado (BD real) · **G2** cutover tras flag `RULES_SOURCE` · **BIZ-1** Decisión B + ADR-004 | ✅ merged a main | #92 |
| **S3** métricas institucionales (C4) + estimador Bayesiano (ADR-002) + wiring de confianza en insights | ✅ merged a main | #93 |
| **Fix E2E** smoke de Reviews (rediseño quitó tabs Semanales/Mensuales) | ✅ merged a main | #94 |
| **S2 UI follow-up** (MAE/MFE + regime + derivación de sesión + nudge #10) — **verificado end-to-end** (Playwright vs preview + round-trip en BD) | ✅ merged a main | #95 |
| **S4** Behavior Engine I (C5 — el loop): Commitment/Check/Reinforcement + verificadores + servicios + eventos + cron + router + panel; **verificado en prod** | ✅ merged a main | #96 |
| **Crons v3 activados** (dispatch/recompute/evaluate) + fix `app_url`→www (401 latente en TODOS los crons) | ✅ merged a main | #97/#98 |
| **S5** Behavior Engine II (regla↔compromiso): `linkRule`, `RuleSuggestion`+sugerencias+accept/dismiss, continuous-eval, autogen en recompute; **verificado en prod** | ✅ merged a main | #99/#100 |
| **S6** Coach v3 I (memoria + threads, C2): `CoachThread`/`CoachMessage`/`CoachMemory` con frontera anti-poisoning (ADR-003/D9); inyección de memoria confirmada + compromisos en el prompt; UI editable/borrable; **verificado en prod** | ✅ merged a main | #101 |
| **S7** Coach v3 II (proactividad + intervención, C1): motor determinista (cascada/revenge/oversizing/DD + scoring/fatiga + override capital D14); `Intervention` (E11) + fast-path en `trades.close` (≤2s) + `InterventionOverlay`; aceptar→crea regla. **VERIFICADO end-to-end en prod**: 3 cierres perdedores→`cascade`→overlay→aceptar→`outcome=protected` + regla enforce 'Enfriamiento tras una pérdida' creada | ✅ merged a main | #102 |
| **S8** Psicología v3 (E7/C7): calibración de confianza (#23, Bayesiano S3), check-in pre-sesión go/no-go (#30, E12) + mood longitudinal; `PsychologyV3Panel` en /psicologia. **VERIFICADO en prod**: check-in ánimo=1 (media 3.67) → `no_go` 'Mejor no operes hoy' (una dimensión en el suelo fuerza rojo). Migración `20260626240000` | ✅ merged a main | #104 |
| **S9** Riesgo & Prop (E6): risk engine puro `domains/analytics/risk/` (ruina analítica+MC #17, proyección de fase #15, presupuesto diario+reset #17/#38, correlación multi-cuenta #39, retiros #46, freeze agregado) — todo en bandas (FREEZE-D16); `inputs.ts` mapper + `risk-service` + router `risk` (read-only). **Sin migración** (campos prop ya en `Account`/`Trade`). Smoke real OK (FTMO Funded, ruina ≈0). Decisión usuario: warn (block→S13), ruina analítica+MC | ✅ merged a main | #105 |
| **S10** Playbook intelligence (E8): `domains/analytics/setups/` (puro) — edge-decay con significancia Welch (#12), drift definido-vs-operado (#32), evolución rollingWindow (#21), variant-compare base A/B (#50); Welch t-test en `institutional/stats/welch.ts`. `playbook-service` + router `playbook` (read-only). **Sin migración**. Smoke real (Breakout London 57t): drift avgR 1.2def/0.24op, decay stable p=0.53 | ✅ merged a main | #106 |
| **S11** Aprendizaje & transferencia (E9) + Edge instrumento/tags (E10): puro — instrument-edge+poda (#24), tag-edge poison/gold (#20), transfer asociación-no-causa (#31, D17), SRS adaptado (#45), error-cards (#42). Welch reusado de S10. `edge-service`+`learning-insights-service` + routers `edges`/`learningInsights` (read-only). **Sin migración**. Smoke real: tags gold['A+']/poison['fomo','revenge'], FOMO 15×−19.5R | ✅ merged a main | #107 |

**Migraciones se despliegan vía CI al mergear a main.** Tests: **945 vitest verdes** (S3: +63).

**Deuda saldada hoy:** S2 UI (era "follow-up", ahora cableado+verificado) y el smoke E2E de Reviews. **Pendiente: flip de G2** (ver §5) — bloqueado solo por setear `RULES_SOURCE=rules` en el env de Vercel (el MCP de Vercel no setea env vars; requiere `VERCEL_TOKEN` o que el usuario lo ponga). Paridad ya verificada 0 errores.

## 5. Gates
- **G1:** ✅ hecho (outbox OK en BD real).
- **G2:** ✅ **FLIPPEADO Y VERIFICADO EN PROD (2026-06-26).** `RULES_SOURCE=rules` en el entorno Production de Vercel + redeploy (`dpl_8xDger…`). Smoke de cutover confirmado: regla `enforce` solo en `rules` (sin automation) → trade bloqueado en prod (`trades_created=0`, `rules.last_fired_at` set, que solo actualiza `runRules`). El enforcement pre-trade ahora lee de `rules`. Dual-write sigue activo; **rollback** = quitar la env var `RULES_SOURCE` + redeploy. Cleanup (dejar de escribir `automations` + drop table) = más tarde (FREEZE-P9). Para futuros flips de env Vercel: el MCP no setea env vars → usar REST API con un `VERCEL_TOKEN` (team `team_H1wCGwK6JxmFhFUsBf8zd3M8`, proj `prj_qKKQQLDmGREOf0GYHqA4H95tdsFs`).
- **BIZ-1:** ✅ Decisión **B (reservar)**. Columna `users.data_sharing_consent`. S4 debe diseñar `Intervention`/`Commitment` anonimizables.

## 6. Convenciones del repo (importante para no romper nada)
- **TDD obligatorio** (RED→GREEN) para toda lógica nueva; tests en `src/__tests__/`.
- **Migraciones duales:** SQL en `supabase/migrations/` (fuente de verdad, replay por CI `migrate-validate`) **+** `schema.prisma` a mano; correr `npx prisma generate` tras editar el schema.
- **RLS:** toda tabla per-usuario lleva `enable row level security` + policy `<table>_user (auth.uid()=user_id)`.
- **Validación local:** `npx vitest run`, `npx tsc --noEmit`, `npx eslint`. **NO** se puede correr build/E2E local fiable (falta `puppeteer-core` → error de tsc preexistente que se IGNORA; el build pasa en CI). Correr `tsc` **completo** (no filtrar por archivo) para no enmascarar errores como el TS2589.
- **BD:** hay `.env` en `src/.env` con `DATABASE_URL` + `CRON_SECRET` que conecta a la BD real; se puede ejecutar lógica contra ella con un archivo vitest throwaway (cargar `dotenv` + `await import("@/lib/prisma")`), **borrándolo después** (no commitear).
- **Quirk del tool Write:** a veces añade una línea literal `</content>` al final del archivo; hay que quitarla (`sed -i '${/^<\/content>$/d}' file`).
- **Workflow git:** por sprint se hace **commit + push** sin preguntar; **el usuario mergea** los PRs y corre tests. No mergear a main. PRs vía `gh` usando el token del credential helper de git (`printf 'protocol=https\nhost=github.com\n\n' | git credential fill | sed -n 's/^password=//p'` → `GH_TOKEN`).
- **Ramas:** trabajar siempre desde `origin/main` actualizado (la vieja `feat/v3-master-plan` está desincronizada de un refactor de Reviews; no usarla).

## 6.5 Auditoría de deuda técnica S1–S7 (2026-06-26)
- **D-A (S6) CERRADA (PR #103):** el productor de memoria LLM (`completeText` + `summarizeThread` + extracción de candidatos) estaba sin construir → `proposeMemories` y la UI de "candidatos" eran código muerto y `thread.summary` se leía pero no se escribía. Ya cableado (fire-and-forget desde `appendExchange`, best-effort, no-op sin API key). El LLM solo propone candidatos (D9 intacto).
- **D-B (S7) = S7b (enhancement, NO bloqueante):** el usuario aceptó la entrega vía panel+overlay; los write-tools del chat (`propose_commitment`/`propose_rule` como tools del agente con confirmación). Es **scope sin construir**, NO código muerto. La capacidad "acción con permiso" YA se entrega vía `BehaviorLoopPanel` (Comprometerme / Activar regla) y `InterventionOverlay` (aceptar→crea regla). Construirlo requiere tocar el loop agéntico + UI del chat y solo se verifica con API key. Tratable como S7b.
- **Resto diferido = scope futuro planificado (NO deuda):** dashboards S3→S12, edge-decay→S10, superficies HOY/Reviews→S12/S13, ImprovementScore→S14, off-plan-as-warn→S8, cifrado de memoria→follow-up.
- **Veredicto:** sin código muerto/roto tras D-A. D-B es el único deliverable listado sin construir.

## 7. Próximo paso recomendado
- 🔵 **S12 EN CURSO — por partes** (primer sprint de UI pesada; viste el quant de S3–S11). Hecho: **S12a** tokens DS v3 (#108) · **S12b1** ANALIZAR = tabs Institucional(S3)+Edges(S11) en /analytics (#109) · **S12b2** PROTEGER = RiskBudgetMeter + AccountRiskPanel (S9: ruina/proyección/budget) en el detalle de cuenta de /cuentas (#110) — ambos verificados visualmente. · **S12b3** MEJORAR = SetupIntelligencePanel (S10: decay/drift/EdgeEvolutionChart) en detalle de setup + ErrorCardsPanel (S11 #42) en /playbook (#111) — verificado visualmente. **S12b COMPLETO**. · **S12c** shell de 5 superficies tras flag (#112): `lib/v3-shell-store.ts` (localStorage `tj.v3Shell`, off default) + `SURFACE_NAV` swap en Sidebar + comando ⌘K "Vista: 5 superficies". OFF=nav v2 idéntica; ON=HOY/OPERAR/MEJORAR/PROTEGER/ANALIZAR. Verificado ambos estados. Sin cambios de ruta (reversible). · **S12d** intervención global (`InterventionOverlay` en `AppShell`, DS §10.4: `--intervene`/e4/foco+Esc) + onboarding día-1 (`OnboardingWelcome` en HOY, solo 0 trades) (#113) — verificado (intervención global en /analytics + onboarding en dashboard). **S12 COMPLETO.**
- ✅ **S13 hecho + MERGED (#114)** — HOY feed: puro `domains/cognitive/today/feed.ts` (`assembleTodayFeed` #36 con suelo para críticas + `detectDailyAnomaly` #44) + `today-service` (agrega insights/compromisos/sugerencias/refuerzos/anomalía/budget) + router `today.feed` + `TodayFeed` en el dashboard (HOY). Verificado visual (6 insights priorizados + RiskBudgetMeter). 1118 vitest. - ✅ **S14 hecho + MERGED (#115) — ÚLTIMO SPRINT.** ImprovementScore (#41, North Star) + drivers + `costOfIndiscipline` (#49) + `regimePerformance` (#33, experimental) puros; `improvement-service` (solo real) + router `improvement.overview` + tab "Mejora" en /analytics. Verificado visual (índice 65/100). **🎯 v3 = 14/14 sprints, 100% auditoría.**
- ✅ **AUDITORÍA FINAL hecha** → `AUDIT_FINAL.md`. **TRACK DE CIERRE en curso** (el usuario: "no se cierra v3 hasta saldar la deuda"). Specs: `CLOSURE_DESIGN.md` + `CLOSURE_SPRINT_PLAN.md`. **Re-verificación contra código** (`CLOSURE_REVERIFY.md`): **la deuda es mucho menor de lo que el audit nivel-doc sugería** — A4 (sección rules ya existe), C1 (detectLosingStreak/Oversizing/Emotion ya existen), A2 (cola SRS ya existe), C2 (overconfidence-bias ya existe) están parcial/mayormente hechos.
  - ✅ **A1 — guard de presupuesto forward-looking MERGED (#116)** (`budget-guard.ts` + `trades.create` bloquea si el riesgo del trade cruza el room diario; el lock backward-looking por breach ya existía). 1135 vitest.
  - ✅ **B1 — ImprovementScore historización MERGED (#117)**: migración `improvement_scores` (E19) + `improvement-snapshot-service` (record/series) + snapshot diario en cron `recompute-insights` + curva+delta en `ImprovementPanel`. **Verificado en PROD** (www, demo: índice 65 + curva "▲3 vs hace 13 días"; sembré 12 backdated para verificar, borrados; queda el real de hoy). **B2 omitido** (la curva de edge ya funciona al vuelo).
  - ✅ **A2 (#118)** transferencia + SRS cableado, verificado · ✅ **A4 (#119)** badge de origen de regla. **C1/C2 ya existían** (re-verificación: detectLosingStreak/Oversizing/HoldingAsymmetry). **🎯 DEUDA GENUINA SALDADA → v3.1 CERRADO** (ver `AUDIT_FINAL.md §9`).
  - ✅ **v3.2 E1 — MEMORIA JERÁRQUICA DE 4 CAPAS COMPLETA (#120/#121/#122, verificada BD real)**: E13 episódica (`memory_episodes` pgvector + salience + record/recall) · E14 semántica (`memory_patterns` + Memory Agent confirma con N≥3, P6) · E15 identidad (`memory_identity` estructurada + `CoachIdentityEditor` en panel 🧠) · E16 mejora (lee E19). `assembleCoachContext` ensambla las 4 con presupuesto (D10); D9 intacto; decay episódico a read-time. Smoke 4-capas OK. Ver `V32_MEMORY_PLAN.md`.
  - ✅ **v3.2 D1 — COACH WRITE-TOOL `propose_rule` MERGED #123, verificado BD real**: el coach PROPONE una regla protectora pre-trade (plantillas seguras: max_trades_per_day/cooldown_after_loss/max_risk_per_trade) creando una `RuleSuggestion` **pending** (insightId=null) que el usuario acepta/descarta en el UI de S5 — nunca auto-aplica (FREEZE §7). Sin migración (reusa E10). Auto-cableado en el loop agéntico (`COACH_TOOLS`/`coach-agent`). Smoke: propone→pending→accept→regla creada. Pendiente D1·b: `propose_commitment` (necesita superficie de propuesta de compromiso).
  - ✅ **v3.2 C3 — TELEMETRÍA DE IGNORADO DEL FEED MERGED #124, verificado BD real**: el feed HOY ya degradaba señales ignoradas pero nada lo alimentaba; ahora `feed_ignores` (count por signalKey) + `recordIgnore`/`getIgnoreCounts` + `today-service` realimenta `ignored` + `today.dismiss` + botón X en señales no-críticas. El feed aprende qué ignoras y lo hunde. Smoke: count→2, feed ensambla.
  - ✅ **v3.2 C4 — DIGEST COGNITIVO SEMANAL (#28) MERGED #125, verificado BD real**: `cognitive-digest.ts` puro (delta de mejora + compromisos cumplidos/rotos + patrón a vigilar; semanas vacías sin contenido) + `cognitive-digest-service` (reúne E19/E14/commitmentChecks → emite 1 notificación, dedupe por semana ISO) + catálogo `COGNITIVE_DIGEST` (INFO/P2/Aprendizaje, opt-outable) + ruta `/api/cron/cognitive-digest`. Smoke: emite "Tu semana cognitiva — índice +6". **OPS PENDIENTE: programar el cron** (pg_cron→pg_net→/api/cron/cognitive-digest semanal con Bearer CRON_SECRET); la ruta existe pero no está agendada.
  - **Siguiente v3.2:** A3 rutas reales · D1·b propose_commitment · POST-1..7 (cada uno con disparador).
  - **v3.2 resto (NO deuda, cada uno con disparador):** A3 rutas reales, C3/C4/D1, POST-1..7, sesgo de anclaje.
  - **GOTCHA migraciones:** `migrate-deploy` (CI ci.yml job "Apply migrations to production") corre **solo en push a main** tras el merge; el run del merge tarda ~5min — verificar la tabla en prod SOLO tras `migrate-deploy: success` (no confiar en un `gh run list` que cace un run anterior). Smoke real post-merge. **Diferido:** transfer #31 + SRS #45 (resource-centric → /aprendizaje, no /playbook; backend S11 ya existe). Componentes reutilizables: `components/analytics/{r-distribution-chart,equity-drawdown-chart}`, `components/risk/{risk-budget-meter,account-risk-panel}`, `components/playbook/{edge-evolution-chart,setup-intelligence-panel,error-cards-panel}`.
- **Verificación visual de UI (workflow establecido):** preview de Vercel está protegido por SSO → `get_access_to_vercel_url` (Vercel MCP) devuelve un bypass `?_vercel_share=…`; Playwright (chromium en node_modules) hace login con la cuenta demo **ariaoc89@gmail.com** (137 trades reales) y screenshotea. **OJO IMPORTANTE:** esa cuenta **ES el E2E_USER**; su password se cambió a `S12bVerify!2026` (vía service role del .env) y el secret GH `E2E_USER_PASSWORD` se actualizó para que coincida. NO volver a cambiarlo sin actualizar el secret, o E2E falla.
- **Bug encontrado en verificación visual (S12b1):** el drawdown institucional salía 343% (curva de equity desde P&L acumulado=0); corregido anclando a la equity real (capital+P&L) vía `bundle.risk.equityCurve`. Lección: las % de drawdown necesitan base de capital real.
- ✅ **S11 MERGED (#107)**: aprendizaje/edges puro read-only. Deuda S1–S11: limpia.
- ✅ **S10 hecho + MERGED a main (#106)**: playbook intelligence puro read-only, smoke real OK. El motor Welch (S10) se reusó en S11 (#24/#20/#31). Deuda S1–S10: limpia.
- ✅ **S9 hecho + MERGED a main (#105)** (risk engine puro, read-only, 1050/1050 vitest, CI verde incl. E2E, smoke real OK). Decisión registrada (D9.3): S9 es señal/warn; el **bloqueo duro por budget + freeze agregado se cablea en S13** reusando rules/account-lock. Deuda S1–S9: limpia.
- ✅ **S7 verificado end-to-end en prod** (cascada→overlay→aceptar crea regla). Gotcha del harness Playwright para registrar trades: usar selectores por `name` (`input[name=size/entry/...]`, NO `getByPlaceholder('2')` que matchea '21,4**5**0' por substring); cuenta/setup **por UI** (no fixtures SQL — no renderizan); símbolo: abrir combobox y click por texto BTCUSD con `{force:true}`.
- ✅ **S8 hecho/verificado.** Follow-ups S8: sesgos extra #40, check-in→regla stop (OPEN_ITEMS_SPRINT_8). Follow-ups S9: superficie UI del cuadrante + RiskBudgetMeter → S12/S13 (OPEN_ITEMS_SPRINT_9).
- **Sprint 7b (follow-up):** write-tools del chat (`propose_commitment`/`propose_rule`) + auto-extracción LLM de memoria candidata (S6 OI-6.1) — ambos necesitan tocar el agente / un completion one-shot.
- **(Histórico) Sprint 7 — Coach v3 II: proactividad + intervención (C1):** worker proactivo sobre `trade.*` (deltas), detección en vivo (revenge/oversizing/cascada/DD), `Intervention` + `InterventionOverlay` (scoring §9 freeze), refuerzos a HOY, **write-tools con permiso** (`propose_commitment`/`propose_rule`), y **la auto-extracción LLM de memoria candidata de S6** (resumen de thread + hechos → `proposeMemories`, que ya existe). Dep: S5 (compromisos/reglas a proponer), S6 (memoria), S0 (bus). **Aquí se hace el primer consumidor real que usa `proposeMemory`** (candidatos LLM). El dispatcher ya está programado (`v3-dispatch-events`).
- ✅ HECHO esta sesión: **S3** (#93), **fix E2E** (#94), **S2 UI** (#95), **flip G2** (prod), **S4** (#96), **crons v3 + fix app_url 401** (#97/#98), **S5** (#99/#100), **S6** (#101). Todo verificado en prod.
- ✅ **Crons activados en prod 2026-06-26** (PR #97): `v3-dispatch-events` (*/5m), `v3-recompute-insights` (diario 05:15 UTC), `v3-evaluate-commitments` (diario 05:45 UTC). **Bug latente encontrado + corregido (PR #98):** TODOS los crons devolvían 401 — el apex 308→www y pg_net descarta el header `Authorization` cross-host; fix = `app_url`→`https://www.tjournalx.com`. Verificado: recompute→200 (6 insights), dispatch→drenó 6 eventos. (Debug crons: mirar `net._http_response.status_code`, NO solo `cron.job_run_details`.) Esto también arregló los 6 digests que fallaban.
- **Diferido (OPEN_ITEMS_SPRINT_4):** `edge-decay` verifier (S10), superficies HOY/Reviews del loop (S12/S13), ImprovementScore (S14).
- **S3 diferido:** superficies del cuadrante (S12) + mapper DB→métricas + wiring Bayesiano de insights continuos (S8).

## 8. Cosas que es fácil olvidar / trampas
- El bloqueo pre-trade y la separación práctica/real son **invariantes** (test de no-regresión siempre).
- El `Rule` unificado tiene columnas `Json` (`conditions/actions`): cualquier router que las devuelva a través de tRPC+React Query puede disparar **TS2589** → usar `select` escalar (ver `rules.list`).
- `Insight` columnas Bayesianas (`confidence/credible_interval/effect_size`): desde **S3** se rellenan **solo** para detectores con base estadística (`Insight.stat`: `intraday-decay`, `weekday-discipline`); el resto siguen **NULL** — en UI tratar NULL como "sin rigor aún", no como cero (R6). El estimador vive en `analytics/institutional/stats/bayes.ts`.
- El dispatcher de eventos **no está programado** en prod (drenaría eventos sin consumidores); programarlo junto con el primer consumidor (S4).
