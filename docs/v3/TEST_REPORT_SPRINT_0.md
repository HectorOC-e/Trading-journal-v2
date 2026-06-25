# TEST_REPORT_SPRINT_0.md
### Trading Journal v3.1 — Sprint 0 · Reporte de verificación

> Metodología: **TDD** (RED→GREEN por cada función pura nueva). Validación por defecto del repo: `tsc + vitest + eslint` (el build completo y E2E tienen límites locales documentados).
> Fecha: 2026-06-25.

---

## 1. Resultado global
| Gate | Resultado | Detalle |
|---|---|---|
| **Vitest (suite completa)** | ✅ **817/817** (80 archivos) | incluye 25 casos nuevos de S0; cero regresiones |
| **Vitest (sólo S0)** | ✅ **25/25** (4 archivos) | ver §2 |
| **tsc `--noEmit`** | ✅ verde para S0 | único error restante: `puppeteer-core` (preexistente, entorno local — ver §4) |
| **eslint (archivos S0)** | ✅ 0 problemas | |
| **prisma generate** | ✅ OK | cliente regenerado con `DomainEvent` + `Insight` |
| **Migración replay** | ⏳ diferido a CI | `supabase db reset` no ejecutable localmente (sin Docker/CLI) — lo valida `migrate-validate` |

---

## 2. Cobertura de tests nuevos (TDD)
| Módulo | Casos | Qué prueba |
|---|---|---|
| `rolling-window.test.ts` | 10 | ventanas por conteo y por tiempo, from/to/count, orden de entrada, vacíos, `compareCurrentVsPrevious` (delta/null) |
| `event-bus.test.ts` | 5 | máquina de estados del outbox (processed/retry/failed), `isKnownEventType` (catálogo + rechazo de typos) |
| `insight-reconcile.test.ts` | 7 | create/touch/resolve, no-resolver-ya-resueltos, reaparición, dedupe por fingerprint, batch mixto |
| `insight-store.test.ts` | 3 | mapeo engine→persistido: fingerprint, n real, campos Bayesianos ausentes, passthrough |

**Trazas RED→GREEN observadas:** cada función pura (`rollingWindow`, `compareCurrentVsPrevious`, `planEventTransition`, `isKnownEventType`, `reconcileInsights`, `toComputedInsight`) se vio fallar antes de implementarse. La regla de dedupe se añadió tras observar su test fallar (esperaba 1, obtuvo 2).

---

## 3. Qué NO está cubierto por tests automatizados (y por qué)
| Área | Motivo | Mitigación |
|---|---|---|
| `publishEvent` / `persistInsights` / `dispatchPending` (capa DB) | requieren Postgres; sin entorno DB local fiable (DNS/SSL corporativo) | la **lógica pura** que contienen (`planEventTransition`, `reconcileInsights`, `toComputedInsight`) sí está testeada; la capa DB es glue fino verificado por tsc |
| `recomputeInsightsForUser/All` | integración (bundle + detectores + DB) | reutiliza componentes ya testeados; smoke vía endpoint cron tras deploy |
| Rutas cron | thin handlers | patrón idéntico a rutas cron existentes ya probadas |
| Migración SQL | sin DB local | CI `migrate-validate` (replay desde cero) — **gate G1 pendiente** |

---

## 4. Nota sobre el error de tsc
`server/services/reviews/render-pdf.ts: Cannot find module 'puppeteer-core'` — **preexistente**, no introducido por S0 (no se tocó ese archivo). Coincide con la limitación de entorno local conocida (`puppeteer-core` ausente localmente). No bloquea S0; el resto del type-check pasa.

---

## 5. Validación pendiente para cerrar el gate G1
Antes de declarar S0 "verificado en infra real" (criterio de `IMPLEMENTATION_ORDER` gate G1):
1. CI ejecuta `supabase db reset` → confirma replay de la migración desde cero.
2. **Spike ADR-001:** invocar `/api/cron/recompute-insights` en un entorno con DB → confirmar que se crean filas en `insights` y filas `insight.created` en `domain_events`; luego `/api/cron/dispatch-events` → confirmar que pasan a `processed`. Esto valida el outbox end-to-end a coste medido.

Hasta completar (1) y (2), S0 está **verificado a nivel de unidad y tipos**, **pendiente de verificación en infraestructura**.
