# SESSION_HANDOFF.md
### Trading Journal v3.1 — Punto de continuación entre sesiones

> **Léeme primero para recuperar contexto.** Resume qué es el proyecto v3, dónde está todo, qué se ha hecho y qué sigue. Mantener actualizado al final de cada sesión.
> Última actualización: 2026-06-25.

---

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
src/domains/analytics/insights/   insight-reconcile.ts, insight-store.ts, recompute-insights.ts (C8)
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
| **Cierre open items S0–S2** (D10 UI, tag chips, Off-plan, riskPct server, plantillas en galería) | PR abierto | #91 |
| **G1** outbox validado (BD real) · **G2** cutover tras flag `RULES_SOURCE` · **BIZ-1** Decisión B + ADR-004 | rama `feat/v3-g1-g2-biz1` | (este) |

**Migraciones se despliegan vía CI al mergear a main.** Tests: ~876 vitest verdes.

## 5. Gates
- **G1:** ✅ hecho (outbox OK en BD real).
- **G2:** ✅ implementado tras flag `RULES_SOURCE` (default OFF = sin cambio). Paridad 0 errores. Dual-write activo. **Para activar:** ver runbook en `GATES_G1_G2_BIZ1.md` (re-backfill → `RULES_SOURCE=rules` → smoke → cleanup). **No activado aún.**
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
- **Mergear** #91 (closeout) y la rama de gates.
- **Follow-up UI de S2** (no completado, requiere verificación visual): inputs MAE/MFE + selector `regime` + nudge de cierre + pre-fill de sesión — mejor en el flujo de **cierre/edición**. API y columnas ya listas.
- **(Opcional) flip de G2** siguiendo el runbook.
- **Sprint 3 — Métricas institucionales (C4):** max drawdown, distribución de R, Sortino/Calmar/Kelly **con la decisión Bayesiana de ADR-002** (no frecuentista), análisis de MAE/MFE (consume los campos de S2). Es el siguiente sprint del `SPRINT_PLAN.md`. **Recordar: `Insight` ya tiene columnas de confianza pero el estimador Bayesiano se construye aquí.**

## 8. Cosas que es fácil olvidar / trampas
- El bloqueo pre-trade y la separación práctica/real son **invariantes** (test de no-regresión siempre).
- El `Rule` unificado tiene columnas `Json` (`conditions/actions`): cualquier router que las devuelva a través de tRPC+React Query puede disparar **TS2589** → usar `select` escalar (ver `rules.list`).
- `Insight` columnas Bayesianas (`confidence/credible_interval/effect_size`) están **NULL** hasta S3 — no mostrarlas como ciertas en UI (R6).
- El dispatcher de eventos **no está programado** en prod (drenaría eventos sin consumidores); programarlo junto con el primer consumidor (S4).
