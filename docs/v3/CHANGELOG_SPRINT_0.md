# CHANGELOG_SPRINT_0.md
### Trading Journal v3.1 — Sprint 0 (Fundaciones técnicas)

> Estado: **completado** (sujeto a validación de migración por CI). No se avanzó a Sprint 1.
> Alcance: estrictamente las primitivas del freeze. **Sin** consumidores de eventos, **sin** memoria/coach/behavior/intervención, **sin** estimador Bayesiano, **sin** UI.
> Fecha: 2026-06-25 · Rama: `feat/v3-master-plan`.

---

## 1. Resumen
Se construyeron las tres raíces del DAG (`IMPLEMENTATION_ORDER §2`): la **primitiva longitudinal** (`rollingWindow`), el **outbox de eventos** (transporte del Cognitive Engine) y la **persistencia/historización de insights** (C8), más el job `recomputeInsights` que produce eventos por el outbox. Previo a S0 se formalizaron los **ADR-000..003** (A0).

Compatibilidad con `ARCHITECTURE_FREEZE.md`: total. Cada artefacto cita su ID de freeze.

---

## 2. ADRs implementados (A0, antes de S0)
| Archivo | Decide |
|---|---|
| `docs/v3/adr/ADR-000-root-decisions.md` | decisiones de raíz (FREEZE-P1, §2) |
| `docs/v3/adr/ADR-001-events-and-delivery.md` | outbox + fast-path + SLA redefinido (FREEZE-D1/D5/D6) |
| `docs/v3/adr/ADR-002-statistics.md` | Bayesiano/jerárquico; `Insight` con confianza (FREEZE-D15/E6) |
| `docs/v3/adr/ADR-003-memory-privacy.md` | frontera anti-poisoning + privacidad (FREEZE-D9/P6/P8) |

---

## 3. Archivos creados (código)
| Archivo | Propósito | Freeze |
|---|---|---|
| `src/domains/analytics/longitudinal/rolling-window.ts` | primitiva `rollingWindow` + `compareCurrentVsPrevious` (pura) | C3, FREEZE §10 |
| `src/domains/cognitive/events/event-types.ts` | catálogo congelado de eventos (`DOMAIN_EVENT_TYPES`) | FREEZE-EV |
| `src/domains/cognitive/events/event-bus.ts` | outbox: `publishEvent`, `dispatchPending`, `planEventTransition` (puro), registry | FREEZE-D1/D6, E5 |
| `src/domains/analytics/insights/insight-reconcile.ts` | diff de historización (puro): create/touch/resolve + dedupe | C8, FREEZE-E6 |
| `src/domains/analytics/insights/insight-store.ts` | persistencia + emisión de eventos; `toComputedInsight` (puro) | C8, FREEZE-E6/EV3/EV4 |
| `src/domains/analytics/insights/recompute-insights.ts` | job C8/#18 sobre detectores existentes | C8 |
| `src/app/api/cron/recompute-insights/route.ts` | endpoint del job (Bearer CRON_SECRET) | — |
| `src/app/api/cron/dispatch-events/route.ts` | dispatcher del outbox (validación G1, no programado) | FREEZE-D1 |

## 4. Archivos creados (tests — 25 casos nuevos)
| Archivo | Casos |
|---|---|
| `src/__tests__/domains/rolling-window.test.ts` | 10 |
| `src/__tests__/domains/event-bus.test.ts` | 5 |
| `src/__tests__/domains/insight-reconcile.test.ts` | 7 |
| `src/__tests__/domains/insight-store.test.ts` | 3 |

## 5. Archivos modificados
| Archivo | Cambio |
|---|---|
| `src/prisma/schema.prisma` | +modelos `DomainEvent`, `Insight`; +relaciones en `User` |
| `docs/v3/README.md` | índice de docs de arquitectura + estado "Sprint 0 ejecutado" |
| `docs/v3/SPRINT_PLAN.md` | S0 marcado ejecutado con notas de enmienda |

## 6. Migraciones
| Archivo | Contenido |
|---|---|
| `supabase/migrations/20260625120000_v3_s0_outbox_and_insights.sql` | tablas `domain_events` e `insights` + índices (parciales: pending hot-path, dedupe, active-fingerprint) + RLS por usuario (`<table>_user`) |

> Sincronización: el SQL es la fuente de verdad del esquema; `schema.prisma` se mantuvo en paralelo y `prisma generate` corrió OK. Replay (`supabase db reset`) lo valida CI (`migrate-validate`) — no ejecutable localmente.

## 7. Entidades creadas
| Entidad (freeze) | Tabla | Notas |
|---|---|---|
| **E5** `DomainEvent` | `domain_events` | outbox; `status pending\|processing\|processed\|failed`; `dedupe_key` único por usuario |
| **E6** `Insight` | `insights` | persistido con `sample_size` (real) + `confidence/credible_interval/effect_size` (null hasta S3, ADR-002); 1 fila activa por `(user, fingerprint)` |

## 8. Eventos creados (catálogo, transporte; sin productores/consumidores de negocio aún)
`trade.created`, `trade.closed`, `insight.created`, `insight.resolved`, `commitment.created`, `commitment.kept|partial|broken`, `rule.fired`, `account.dd_approach|dd_breach`, `checkin.submitted`, `intervention.responded`.
**Únicos emitidos en S0:** `insight.created` / `insight.resolved` (por `recomputeInsights`). El resto quedan declarados en el catálogo; sus productores llegan en sprints futuros.

## 9. Lo que NO se hizo (anti-alcance respetado)
- ❌ Consumidores/handlers de eventos (S4+).
- ❌ Memoria, coach, behavior engine, intervención (S4–S14).
- ❌ Estimador Bayesiano / detectores nuevos (S3+). Sólo se persisten los detectores **existentes**.
- ❌ Fast-path síncrono de intervención en `trade.create` (S7) — el outbox queda listo, el productor no.
- ❌ Programación (pg_cron) del dispatcher en producción — se evita drenar eventos sin consumidores.
- ❌ UI de cualquier tipo.

## 10. Verificación
Ver `TEST_REPORT_SPRINT_0.md`. Resumen: **817/817 vitest** (25 nuevos), **tsc verde** (salvo `puppeteer-core` preexistente del entorno local), **eslint verde**.
