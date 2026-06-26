# CHANGELOG_SPRINT_4.md
### Trading Journal v3.1 — Sprint 4 (Behavior Engine I — el loop, C5)

> Estado: **completado** (dominio + persistencia + servicios + eventos + cron + tRPC + UI mínima). Las superficies ricas (HOY/Reviews) son S12/S13.
> Principio: **ningún insight muere como texto** — todo insight verificable ofrece "comprometerme", y **ningún compromiso sin verificación objetiva** (datos, no autoevaluación).
> Fecha: 2026-06-26 · Rama: `feat/v3-s4-behavior-engine`.

---

## 1. Resumen
Se materializa la tesis del producto: la cadena **INSIGHT → COMPROMISO → (REGLA) → VERIFICACIÓN → REFUERZO**. Un insight verificable se convierte en un `Commitment`; al cerrar la ventana, un verificador determinista mide el `observedValue` sobre los trades, decide **kept/partial/broken/expired** con evidencia (trade ids), y dispara un `Reinforcement` (positivo de ratio variable, o correctivo siempre). Todo emite `commitment.*` en el outbox (EV5/EV6).

## 2. Dominio puro (TDD) — `src/domains/behavior/`
| Archivo | Propósito |
|---|---|
| `verifiers.ts` | Librería de verificadores (FREEZE-D7): `revengeTradesAfterLoss`, `tradesPerDayBeyond2`, `oversizedTrades`, `offPlanTrades` → `{observedValue, evidence}`. `getVerifier`/`hasVerifier`. |
| `commitment-machine.ts` | `deriveCommitmentSpec(insightType)` (mapa insight→spec; null = sin verificador → estudiar/anotar), `evaluateResult` (kept/partial/broken con banda de tolerancia), `canCommit`. |
| `reinforcement.ts` | `planReinforcement(result, priorKeeps)`: correctivo siempre visible; positivo en **ratio variable** (FREEZE-D13, schedule triangular determinista). |

## 3. Schema (migración + prisma) — migración `20260626120000`
- `Commitment` (E7), `CommitmentCheck` (E8), `Reinforcement` (E9). **Anonimizable (ADR-004):** la señal vive en columnas estructuradas (`metric_key/target/comparator/result/observed_value/window`), sin PII; el `text` es del propio usuario. RLS per-usuario en las 3 tablas. Aditiva.

## 4. Servicios — `src/server/services/behavior/commitment-service.ts`
- `createCommitmentFromInsight` (deriva spec, crea commitment, marca insight `committed`, emite `commitment.created` en la tx).
- `evaluateCommitment` (carga trades de la ventana, corre verificador, crea `CommitmentCheck` + transición + `Reinforcement`, emite `commitment.{kept,partial,broken}`; 0 trades → `expired`).
- `evaluateWindowCommitments` (job: barre compromisos activos con ventana cerrada).
- `carryOverCommitments` (review #5).

## 5. Eventos / cron
- `commitment.created/kept/partial/broken` ya estaban en el catálogo (EV5/EV6); ahora **tienen productor**. Publicados vía outbox `publishEvent` dentro de la transacción (FREEZE-D6).
- Ruta cron `POST /api/cron/evaluate-commitments` (Bearer CRON_SECRET). **Scheduling pg_cron = paso de ops** (igual que recompute-insights/dispatch-events).

## 6. API + UI
- Router `behavior` (`server/trpc/routers/behavior.ts`): `openInsights` (insights activos + `canCommit`), `commitments` (carry-over con último check), `createFromInsight` (rechaza no-verificables con `BAD_REQUEST`), `evaluate`, `archive`. Json mapeado a shapes planos (evita TS2589).
- `components/behavior/behavior-loop-panel.tsx`: insights accionables con **"Comprometerme"** (solo si `canCommit`, si no "Para estudiar"), tarjetas de compromiso con estado/medición/refuerzo y "Verificar ahora"/"Archivar". Montado en `/analytics`.

## 7. Invariantes respetados (BEHAVIOR_ENGINE_V3 §8)
1. Ningún insight sin CTA (verificable → comprometerme; si no → estudiar). 2. Ningún compromiso sin verificación. 3. Verificación objetiva (datos, no opinión). 4. Refuerzo siempre (positivo ratio-variable / correctivo). 5. Privacidad: `archivar` compromisos.

## 8. Lo que NO se hizo (anti-alcance / diferido)
- ❌ `linkRule` (compromiso→regla enforce) y `suggestRulesFromInsights` → **S5**.
- ❌ Verificador `edge-decay` (5º de FREEZE-D7) → necesita `SetupEdgeSnapshot` (**S10**).
- ❌ Superficies ricas HOY/Reviews del loop → **S12/S13** (esta UI en /analytics es el primer hogar usable).
- ❌ Continuous-eval en cada trade para compromisos con regla enforce → llega con `linkRule` (S5).
- ❌ Feed a `ImprovementScore` → **S14**.
- ❌ Scheduling de crons en prod (evaluate-commitments / dispatch-events) = ops.

## 9. Verificación
Ver `TEST_REPORT_SPRINT_4.md`: **961/961 vitest** (+16, TDD), tsc+eslint verdes. Loop verificado end-to-end en preview (insight→comprometerme→verificar→refuerzo) — ver reporte.
