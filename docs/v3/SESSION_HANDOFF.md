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
src/domains/trading/services/     trade-derivation.ts, capture-rules.ts, note-tag-suggester.ts, emotion-feedback.ts (S2 captura)
src/components/trades/            emotion-insight.tsx, note-tag-suggestions.tsx (D10/#37 UI)
src/components/rules/             rule-mode-badge.tsx (enforce/warn)
src/app/api/cron/                 recompute-insights/, dispatch-events/, rules-migration-report/  (Bearer CRON_SECRET)
supabase/migrations/              20260625120000 (outbox+insights), 130000 (unify rules), 140000 (trade capture), 150000 (data_sharing_consent)
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

**Migraciones se despliegan vía CI al mergear a main.** Tests: **945 vitest verdes** (S3: +63).

**Deuda saldada hoy:** S2 UI (era "follow-up", ahora cableado+verificado) y el smoke E2E de Reviews. **Pendiente: flip de G2** (ver §5) — bloqueado solo por setear `RULES_SOURCE=rules` en el env de Vercel (el MCP de Vercel no setea env vars; requiere `VERCEL_TOKEN` o que el usuario lo ponga). Paridad ya verificada 0 errores.

## 5. Gates
- **G1:** ✅ hecho (outbox OK en BD real).
- **G2:** ✅ implementado tras flag `RULES_SOURCE` (default OFF = sin cambio). **Paridad re-verificada en prod (2026-06-26): 5/5 automatizaciones espejadas, 0 sin espejo, 0 desajustes de `mode`.** Dual-write activo. **Bloqueo para activar:** `RULES_SOURCE` se lee de `process.env` (engine.ts:112); el MCP de Vercel NO setea env vars y no hay `VERCEL_TOKEN` en `.env` → el flip requiere token de Vercel o que el usuario ponga `RULES_SOURCE=rules` en el env Production + redeploy. Runbook completo en `GATES_G1_G2_BIZ1.md`. Smoke previsto: usuario throwaway + regla enforce (límite trades/día) → 2º trade debe bloquearse. Rollback = quitar la var + redeploy. **No activado aún.**
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
- **Mergear #93 (S3)** y correr CI.
- **Sprint 4 — Behavior Engine I (loop básico, C5):** `Commitment`/`CommitmentCheck`/`Reinforcement` (modelos+migración dual), `createCommitmentFromInsight`, `evaluateCommitment` (vía **librería de verificadores** FREEZE-D7 — **consume las funciones puras de `analytics/institutional/` directamente**, no tRPC), `reinforce` (ratio variable D13), `carryOverCommitments`. Subconjunto inicial 5 tipos (revenge/intraday-decay/oversizing/edge-decay/off-plan). **Aquí se programa el dispatcher de eventos en prod** (primer consumidor). BIZ-1: diseñar `Intervention`/`Commitment` anonimizables (ADR-004).
- **Follow-up UI de S2** (pendiente, verificación visual): inputs MAE/MFE + selector `regime` + nudge de cierre + pre-fill. API/columnas listas.
- **(Opcional) flip de G2** siguiendo el runbook.
- **S3 dejó diferido (OPEN_ITEMS_SPRINT_3):** superficies tRPC/UI del cuadrante (S12) + mapper DB→métricas (S4/S12) + wiring Bayesiano de insights continuos (S8).

## 8. Cosas que es fácil olvidar / trampas
- El bloqueo pre-trade y la separación práctica/real son **invariantes** (test de no-regresión siempre).
- El `Rule` unificado tiene columnas `Json` (`conditions/actions`): cualquier router que las devuelva a través de tRPC+React Query puede disparar **TS2589** → usar `select` escalar (ver `rules.list`).
- `Insight` columnas Bayesianas (`confidence/credible_interval/effect_size`): desde **S3** se rellenan **solo** para detectores con base estadística (`Insight.stat`: `intraday-decay`, `weekday-discipline`); el resto siguen **NULL** — en UI tratar NULL como "sin rigor aún", no como cero (R6). El estimador vive en `analytics/institutional/stats/bayes.ts`.
- El dispatcher de eventos **no está programado** en prod (drenaría eventos sin consumidores); programarlo junto con el primer consumidor (S4).
