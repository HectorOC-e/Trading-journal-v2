# DECISIONS_SPRINT_7.md
### Sprint 7 · Decisiones · 2026-06-26 · `feat/v3-s7-intervention`

## D7.1 — Decisión determinista en el fast-path (sin LLM)
**Decide:** FREEZE-D5/§9. La decisión de intervenir corre en `trades.close` con detectores deterministas sobre el estado del día (≤2s). El LLM no participa en el camino crítico (puede narrar después). Cumple el SLA sin push/websockets.

## D7.2 — No cambiar el contrato de la mutación; cliente lee intervention.active
**Reversible.** En vez de devolver la intervención en la respuesta de `close` (rompería consumidores), se persiste la `Intervention` en la mutación y el cliente la lee con `intervention.active` justo después (invalidación en `onSuccess`). Misma inmediatez, blast radius mínimo.

## D7.3 — Disparo en close, no en create
**Reversible.** Las pérdidas se realizan al **cerrar**; ahí se vuelven verdaderas cascada/revenge/dd. `buildInterventionState` lee trades CLOSED del día. Oversizing en la entrada (create) = refinamiento posterior.

## D7.4 — Aceptar → crea regla enforce protectora
**Reversible.** "Activar protección" materializa una regla enforce (cooldown tras pérdida, o límite de riesgo) — reutiliza la infra de reglas (enforced live tras G2). Satisface "aceptar crea regla" sin las write-tools del chat (diferidas).

## D7.5 — expectedImpact fijo por ahora
**Reversible (§9).** El `outcome` (protected/overridden) se guarda para aprender `expectedImpact` por tipo más adelante; hoy es un valor por defecto (0.6). El scoring ya lo contempla.
