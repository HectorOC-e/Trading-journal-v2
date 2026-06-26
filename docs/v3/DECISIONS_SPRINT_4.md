# DECISIONS_SPRINT_4.md
### Trading Journal v3.1 — Sprint 4 · Decisiones de implementación

> Fecha: 2026-06-26 · Rama: `feat/v3-s4-behavior-engine`.

## D4.1 — Subconjunto inicial de 4 verificadores (no 5)
**Decide:** FREEZE-D7. **Reversible.**
Se implementan 4 verificadores cuya señal existe HOY en la captura: revenge, intraday-decay, oversizing, off-plan. El 5º de FREEZE-D7 (`edge-decay`) requiere `SetupEdgeSnapshot` (S10) → su metricKey queda reservado pero no medible aún. No se fabrica un verificador sin datos.

## D4.2 — `expired` cuando la ventana no tiene trades
**Reversible.**
Si al evaluar no hay trades en la ventana, el compromiso pasa a `expired` (no a `kept`). Para métricas de "conteo de violaciones", 0 trades daría kept trivial — pero recompensar la inactividad es deshonesto. `expired` → re-proponer (BEHAVIOR_ENGINE_V3 §3). No se crea `CommitmentCheck` ni refuerzo en ese caso.

## D4.3 — Refuerzo positivo con schedule triangular determinista
**Decide:** FREEZE-D13. **Reversible.**
Ratio variable sin RNG (irreproducible): el refuerzo positivo se muestra en los conteos de cumplimiento 0,1,3,6,10,15… (números triangulares; gaps crecientes). Determinista → testeable. El correctivo se muestra **siempre** (§8.4).

## D4.4 — Anonimización por columnas estructuradas (ADR-004)
**Decide:** ADR-004 (BIZ-1 Decisión B). **Irreversible (frontera).**
`Commitment`/`CommitmentCheck` modelan la señal en columnas (`metric_key/target/comparator/result/observed_value/window`) sin PII, de modo que un pipeline cross-user futuro pueda agregarlas sin texto libre. El `text` (nota del usuario) y `evidence.tradeIds` son per-usuario y no entrarían en agregación. No se construye nada cross-user aún.

## D4.5 — `evaluateCommitment` transaccional con outbox
**Decide:** FREEZE-D6.
El `CommitmentCheck` + transición de estado + `Reinforcement` + evento `commitment.{result}` se escriben en **una transacción** (consistencia + outbox como única fuente de "qué pasó"). El refuerzo se decide con la función pura `planReinforcement`.

## D4.6 — UI mínima en /analytics (no nueva superficie)
**Reversible.**
El loop necesita un hogar usable ya, pero las superficies ricas (HOY/Reviews) son S12/S13. Se monta `BehaviorLoopPanel` junto al panel de insights de `/analytics`, consumiendo `behavior.openInsights`/`commitments`. Reubicable sin tocar el dominio.

## D4.7 — Sin scheduling de crons en prod
**Reversible (ops).**
Las rutas `evaluate-commitments` (nueva) y `dispatch-events` (S0) existen pero su `pg_cron` no se programa en código — es paso de ops (como recompute-insights). El dispatcher drena `commitment.*` cuando se programe; mientras, los eventos quedan durables en el outbox.
