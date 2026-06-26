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

## 7. Próximo paso recomendado
- ✅ **S7 verificado end-to-end en prod** (cascada→overlay→aceptar crea regla). Gotcha del harness Playwright para registrar trades: usar selectores por `name` (`input[name=size/entry/...]`, NO `getByPlaceholder('2')` que matchea '21,4**5**0' por substring); cuenta/setup **por UI** (no fixtures SQL — no renderizan); símbolo: abrir combobox y click por texto BTCUSD con `{force:true}`.
- **Sprint 8 — Psicología v3 (E7):** cascadas/tilt intradía (#16), calibración de confianza (#23), sesgos extra (#40), mood longitudinal, check-in pre-sesión que puede bloquear (#30). Dep: S0 (rolling), S2 (captura), S7 (intervención usa cascada). Reusa el estimador Bayesiano (S3) para calibración.
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
