# DECISIONS_SPRINT_0.md
### Decisiones tomadas durante la implementación de Sprint 0

> Decisiones de implementación (no arquitectónicas — esas viven en los ADR/freeze). Cada una respeta el freeze; donde elegí un default reversible, lo marco.

---

## D-S0-1 — El bus se construye nuevo; `coach-bus.ts` no se toca
**Decisión:** crear `domains/cognitive/events/` desde cero. `lib/coach-bus.ts` (helper cliente de 9 líneas) se conserva intacto como atajo de UI.
**Por qué:** el plan original decía "extiende `coach-bus.ts`"; la rehidratación demostró que no es un bus. Reutilizarlo habría sido incorrecto.
**Reversible:** sí (estructura de carpetas, FREEZE §11.2).

## D-S0-2 — Outbox con dispatcher por claim `FOR UPDATE SKIP LOCKED`
**Decisión:** `dispatchPending` reclama lotes con `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED)`.
**Por qué:** seguro ante concurrencia (varias instancias serverless) sin cola dedicada — cumple ADR-001 con la infra actual.
**Reversible:** sí — migrable a `pg-boss` si el volumen lo exige (ADR-001 alternativas).

## D-S0-3 — Eventos sin handler se marcan `processed` (no bloquean)
**Decisión:** un evento sin handler registrado es un no-op exitoso.
**Por qué:** el catálogo puede adelantarse a sus consumidores (S0 declara EV1–EV10; los consumidores llegan en S4+) sin atascar el outbox.
**Consecuencia/guard:** por eso el dispatcher **no se programa** en producción en S0 (drenaría eventos que nadie consume). Se expone sólo como herramienta manual de validación G1.

## D-S0-4 — `sample_size` = nº de trades analizados (n coarse pero honesto)
**Decisión:** los detectores existentes no exponen n por insight; uso el total de trades del bundle como `sample_size`.
**Por qué:** ADR-002 exige n real desde el día 1, pero no fabricar precisión. n-por-detector es refinamiento de S3.
**Abierto:** ver `OPEN_ITEMS_SPRINT_0 OI-2`.

## D-S0-5 — Campos Bayesianos quedan NULL en S0
**Decisión:** `confidence`, `credible_interval_*`, `effect_size` se persisten como columnas pero se dejan nulos.
**Por qué:** el estimador Bayesiano es S3 (ADR-002). Persistir las columnas ahora cumple la decisión irreversible FREEZE-E6 sin simular rigor.
**Reversible:** no (la existencia de las columnas es irreversible por diseño); su llenado llega en S3.

## D-S0-6 — `fingerprint` = id estable del detector
**Decisión:** uso el `id` de los detectores existentes (slugs como `intraday-decay`, `account-locked-<id>`) como `fingerprint`.
**Por qué:** son estables y deterministas → identidad correcta del insight a lo largo del tiempo (habilita "mejoró/empeoró").
**Reversible:** sí (esquema de fingerprint, FREEZE §11.2).

## D-S0-7 — Dedupe de insights por fingerprint dentro de `reconcileInsights`
**Decisión:** la reconciliación deduplica el batch computado (mantiene el primero) para no violar el índice único `(user, fingerprint) where active`.
**Por qué:** `generateInsights` + `generatePsychologyInsights` podrían colisionar en id.
**Cubierto por test:** sí.

## D-S0-8 — `recomputeInsights` reutiliza `buildAnalyticsBundle` + detectores existentes
**Decisión:** no se escribió carga de datos nueva; se reutiliza el loader y los detectores ya en el repo.
**Por qué:** S0 es persistencia/historización de lo existente, no análisis nuevo (anti-alcance).

## D-S0-9 — `recomputeInsights` itera usuarios con aislamiento de fallos
**Decisión:** un error por usuario incrementa `failures` y continúa; no aborta el lote.
**Por qué:** idempotencia/robustez de job (NFR).
**Reversible:** sí.

## D-S0-10 — Migración SQL + `schema.prisma` mantenidos a mano en paralelo
**Decisión:** seguir el patrón del repo (SQL = fuente de verdad; Prisma para el cliente). Índices parciales y RLS sólo en SQL (Prisma no los expresa), igual que el resto del repo.
**Por qué:** consistencia con las 56 migraciones previas.
