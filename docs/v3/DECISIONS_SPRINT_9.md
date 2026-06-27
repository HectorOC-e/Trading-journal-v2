# DECISIONS_SPRINT_9.md
### Sprint 9 · Decisiones · 2026-06-26 · `feat/v3-s9-risk-prop`

## D9.1 — Ruina con dos vistas: analítica + Monte Carlo (no una sola)
**Reversible.** La analítica (difusión `exp(−2μa/σ²)`) da el "¿es sobrevivible mi edge?" infinito-horizonte rápido; el Monte Carlo sobre la **R empírica** respeta skew/colas y el horizonte real de la fase. La distribución de R retail es asimétrica → un único método cerrado mentiría. El usuario eligió este combo.

## D9.2 — Todo en bandas, nunca un punto
**Decide FREEZE-D16/D15.** Proporciones Monte Carlo → banda Jeffreys `Beta(k+0.5, n−k+0.5)`; sesiones esperadas → media + percentiles 2.5/97.5. Las proyecciones prop son no estacionarias; el coach no cita "72%" sin banda.

## D9.3 — S9 es señal/warn; el bloqueo duro es S13
**Reversible (decisión del usuario).** El engine + router son read-only. El presupuesto y el freeze agregado se exponen como señal; el **bloqueo pre-trade por budget** se cablea en S13 junto a `RiskBudgetMeter`, reusando la infra de `Account.locked`/rules engine (no se reescribe). Evita tocar el invariante de bloqueo este sprint.

## D9.4 — Sin migración: E20 RiskBudget derivado
**Reversible.** Los campos prop ya viven en `Account`/`Trade`; el presupuesto se calcula al vuelo. Persistir `RiskBudget` (snapshot) se hará solo si una superficie lo exige (S13).

## D9.5 — DD diario estático desde el balance de apertura
**Reversible.** El room diario = distancia del equity actual al floor `−ddDailyPct` desde la apertura (un día ganador ensancha legítimamente el room). El reset diario es configurable por hora (#38, `resolveDailyWindow`). Cambiable a "trailing diario desde el máximo del día" si una firma lo exige.

## D9.6 — Risk-per-trade = mediana del histórico
**Reversible.** La mediana de `riskPct` es robusta a un trade outlier; fallback 1% sin histórico. Honesto sobre el tamaño "habitual" real, no el configurado.

## D9.7 — Proyección omitida con target ≤ 0
**Reversible.** Una cuenta FUNDED (target 0) no tiene fase que pasar; proyectarla "pasaría" en sesión 1 trivialmente. El servicio devuelve `projection:null`. (Hallado en el smoke real con una cuenta FTMO Funded.)
