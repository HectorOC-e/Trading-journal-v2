# DECISIONS_SPRINT_5.md
### Trading Journal v3.1 — Sprint 5 · Decisiones

> Fecha: 2026-06-26 · Rama: `feat/v3-s5-behavior-rules`.

## D5.1 — linkRule crea la regla en `rules` (no en `automations`)
**Decide:** G2 (flippeado). Post-cutover el enforcement lee `rules`, así que `linkRule`/accept crean directamente en `rules` con `sourceCommitmentId`/`sourceInsightId` → la regla bloquea de inmediato. (Coste: la `/reglas` UI hoy lista `automations`, no muestra estas reglas; cohesión de superficies = S12.)

## D5.2 — Solo se proponen reglas para métricas enforzables pre-trade
**Decide:** FREEZE-P3 (honestidad). `proposeRuleForCommitment` mapea a campos que el motor evalúa (`tradesToday`, `minsSinceLastLoss`, `riskPct`). `offPlanTrades` → null (el tag es post-hoc, no prevenible). Nunca una regla no-op.

## D5.3 — Continuous-eval solo termina en ruptura temprana
**Reversible.** En cada trade, los compromisos con regla se re-miden, pero `early` solo termina si el resultado es `broken` (defensa en profundidad — la regla ya debería prevenirlo). "kept"/"partial" siguen siendo decisión del job de cierre de ventana (no se premia antes de tiempo). Best-effort en `trades.create/close`, nunca bloquea la escritura.

## D5.4 — Sugerencias idempotentes por insight
**Reversible.** `suggestRulesFromInsights` no duplica: salta insights con una sugerencia `pending`. Severidades `critical`/`warning`.
