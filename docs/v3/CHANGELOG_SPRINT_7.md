# CHANGELOG_SPRINT_7.md
### Trading Journal v3.1 — Sprint 7 (Coach v3 II: proactividad + intervención, C1)

> Estado: **completado** (motor de intervención + fast-path + overlay + respuesta). Write-tools del chat y auto-extracción LLM de memoria → follow-up.
> Principio: **intervenir en el momento del error**, determinista y ≤2s, con silencio por defecto y override de capital.
> Fecha: 2026-06-26 · Rama: `feat/v3-s7-intervention`.

---

## 1. Resumen
El coach pasa de reactivo a **proactivo en el momento crítico**: al cerrar un trade, un motor **determinista** evalúa el estado del día y, si dispara, persiste una `Intervention` que el cliente muestra como **overlay** (mensaje directo + UNA acción protectora + salida con fricción). La decisión es determinista (sin LLM en el camino crítico, ≤2s); el override de capital ignora θ/fatiga (FREEZE-D14).

## 2. Motor puro (TDD) — `src/domains/cognitive/intervention/engine.ts`
- `detectInterventions(dayState)` → candidatos: **cascada** (3 pérdidas seguidas), **revenge** (2 pérdidas + impulsivo), **oversizing** (último riesgo ≥2× media tras pérdida), **dd_approach/dd_breach** (capital override).
- `priority = severity×urgency×confidence×expectedImpact×(1−fatiga)`.
- `decideIntervention(candidatos, fatiga, opts)`: máx **1 activa**, **cooldown**, **token-bucket diario**, `priority ≥ θ`; **capital override** siempre (D14).

## 3. Schema — migración `20260626220000`
`Intervention` (E11): trigger/severity/scores/suggestedAction/status/response/outcome (estructurado, anonimizable ADR-004). RLS.

## 4. Fast-path + servicio — `src/server/services/intervention/`
- `buildInterventionState` (1 query del día → DayState: rachas, riesgo, dd diario, impulsivos).
- `runIntervention` (estado + fatiga → motor → persiste la elegida). Cableado en `trades.close` (best-effort, **no cambia el contrato** de la mutación; el cliente la lee con `intervention.active`).
- `respondIntervention`: `accepted` → outcome `protected` + **crea regla enforce** protectora (cooldown / límite de riesgo); `dismissed` → `overridden` (se guarda para aprender `expectedImpact`, EV10).

## 5. API + UI
- Router `intervention` (`active`, `respond`).
- `InterventionOverlay` (DS §10.4): overlay crítico con el mensaje, la acción protectora y la salida con fricción. Montado en `/trades`; se refresca al cerrar un trade.

## 6. Invariantes
- Decisión determinista, **sin LLM** en el camino crítico (≤2s).
- **Silencio por defecto**: solo dispara con señal real y por encima de θ/fatiga.
- **Override de capital** nunca se suprime.
- Best-effort en la mutación: una intervención fallida **nunca rompe** el cierre del trade.

## 7. Lo que NO se hizo (diferido)
- ❌ **Write-tools del chat** (`propose_commitment`/`propose_rule` como tools del agente con confirmación) → follow-up (la acción protectora del overlay ya "acepta→crea regla").
- ❌ **Auto-extracción LLM** de memoria candidata (S6) — necesita completion one-shot; con el worker.
- ❌ Aprendizaje de `expectedImpact` desde `outcome` (hoy fijo) → futuro (E14/§9).
- ❌ Intervención en `trade.create` (oversizing en la entrada) — hoy en `close` (donde se realizan pérdidas); refinamiento posterior.
- ❌ Refuerzos a HOY (la superficie HOY es S13).

## 8. Verificación
Ver `TEST_REPORT_SPRINT_7.md`: **986/986 vitest** (+14, TDD), tsc+eslint verdes. Verificado en prod (cascada → overlay → aceptar crea regla).
