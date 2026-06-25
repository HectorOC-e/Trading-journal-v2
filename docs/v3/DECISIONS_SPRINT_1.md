# DECISIONS_SPRINT_1.md
### Decisiones tomadas durante la implementación de Sprint 1

> Decisiones de implementación dentro del freeze. La de mayor peso: **cómo fusionar sin romper el enforcement**.

---

## D-S1-1 — `Rule` se extiende; NO se crea un modelo nuevo
**Decisión:** el modelo unificado es el `Rule` existente + columnas ejecutables, no una tabla nueva ni renombrar `Automation`.
**Por qué:** el coach ya lee `Rule`; extenderlo preserva esa relación y minimiza superficie de cambio. Es el "un solo concepto Regla" del freeze (E2).
**Reversible:** sí (esquema de columnas, FREEZE §11.2). La existencia del concepto unificado, no.

## D-S1-2 — Migración aditiva + backfill, `Automation` intacta (lo más importante)
**Decisión:** `ALTER rules ADD COLUMN` + backfill idempotente desde `automations`; **no** se borra `automations` ni se cambia `runAutomations`.
**Por qué:** FREEZE-P9 + gate G2 exigen "conservar Automation hasta verificar" y "no romper el bloqueo pre-trade". El enforcement sigue 100% en `automations`; las filas unificadas en `rules` son inertes (no las lee el motor) hasta el cutover. **Cero riesgo de doble disparo o de pérdida de protección.**
**Consecuencia:** C6 queda **estructuralmente** resuelto en S1; el **cutover** (motor lee `rules`) es el paso verificado de G2.

## D-S1-3 — `mode = enforce` ⟺ existe acción `BLOCK`
**Decisión:** la clasificación enforce/warn se deriva determinísticamente de si la regla tiene una acción `BLOCK`. El SQL del backfill (`actions @> '[{"type":"BLOCK"}]'`) **espeja** la función pura `classifyMode`.
**Por qué:** una regla "enforce" es, por definición, la que puede bloquear. Determinista y testeable.

## D-S1-4 — Reglas descriptivas → `warn` (y el informe de no-mapeo)
**Decisión:** una `Rule` descriptiva v2 (sin semántica ejecutable) sólo puede ser `warn`. Las que son `CRÍTICA` pero no tienen una automatización que las respalde se marcan en `buildNoMappingReport` como **falsa protección** (R3).
**Por qué:** es exactamente "el merge no es 1:1" del Challenge/Delta. El informe es el artefacto que un humano revisa en G2 antes del cutover. No se decide automáticamente: se **expone**.

## D-S1-5 — Plantillas gated en vez de enforcement falso
**Decisión:** `no-size-increase-after-loss` y `no-trade-low-energy` se catalogan con `available:false` + `requires`; `templateToUnifiedRule` lanza si se intentan instanciar.
**Por qué:** los campos que necesitan (contexto del trade anterior; energía del check-in S8) no existen en el motor. Materializarlas sería una regla que no bloquea nada → falsa protección (FREEZE-P3). Mejor honestas e inactivas que mentirosas y activas.
**Abierto:** se activan cuando lleguen sus campos (S2/S8) — ver `OPEN_ITEMS_SPRINT_1`.

## D-S1-6 — `sourceCommitmentId` / `sourceInsightId` como uuid sin FK
**Decisión:** se añaden las columnas de provenance ahora (parte del modelo unificado, FREEZE-E2) pero **sin** FK: `Insight` existe (S0) pero `Commitment` no (S4).
**Por qué:** evita acoplar S1 a tablas que aún no existen; la integridad referencial se añade cuando nazca `Commitment` (S4/S5).

## D-S1-7 — Badge `enforce/warn` reutiliza el `Badge` existente
**Decisión:** `RuleModeBadge` envuelve el `Badge` del DS con variantes `error` (Bloquea) / `warning` (Avisa), con `aria-label` y texto distinto por modo.
**Por qué:** consistencia con el DS y cumplimiento de §5 (color nunca es el único portador). Se integró en `app/reglas` sin tocar la lógica de la página.

## D-S1-8 — Informe de no-mapeo como cron route read-only
**Decisión:** se expone como `/api/cron/rules-migration-report` (Bearer), **sólo lectura**, sin programar.
**Por qué:** herramienta de revisión para G2; no debe escribir ni alterar comportamiento. Se ejecuta a demanda.
