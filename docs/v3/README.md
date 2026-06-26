# Trading Journal v3 — "Capa cognitiva sobre el broker"

Conjunto de especificaciones maestras que transforman Trading Journal v2 (journal + analytics)
en un **sistema de mejora de performance** para traders retail y prop firm.

La **auditoría** (`docs/auditoria-producto-trading-journal-v2.md`) es la **especificación obligatoria y vinculante**.
Ningún hallazgo (C1–C8, los 11 módulos, los 50 ítems por ROI, los riesgos y oportunidades)
queda sin representación en estos documentos. La trazabilidad está en `MASTER_PRD.md §Matriz de cobertura`.

## Decisiones de raíz (aprobadas por el usuario, 2026-06-25)
1. **Arquitectura radical** → 11 módulos colapsan en **5 superficies cognitivas** + 2 subsistemas transversales.
2. **Absorber bajo valor** → ninguna superficie se borra sin que su dato útil reaparezca como decisión.
3. **DS v3 evoluciona** los tokens/temas actuales (no reescritura desde cero).
4. Entrega de los 8 documentos de corrido; implementación **solo tras aprobación explícita**.

## Documentos
| # | Documento | Propósito |
|---|---|---|
| 1 | [PRODUCT_MASTER_PLAN.md](./PRODUCT_MASTER_PLAN.md) | Estado actual/futuro, brechas, dependencias, riesgos, re-arquitectura, modelo de dominio, módulos que nacen/mueren/fusionan. |
| 2 | [MASTER_PRD.md](./MASTER_PRD.md) | Todos los hallazgos → Epics → Capabilities → User Stories → Acceptance Criteria + matriz de cobertura. |
| 3 | [DESIGN_SYSTEM_V3.md](./DESIGN_SYSTEM_V3.md) | Spacing, grid, tipografía, motion, elevación, patrones de interacción + IA/coaching/intervención, estados. |
| 4 | [AI_COACH_V3.md](./AI_COACH_V3.md) | Memoria, proactividad, intervenciones, compromisos, seguimiento, psicología, cuantitativo, mentoría. |
| 5 | [ANALYTICS_V3.md](./ANALYTICS_V3.md) | Longitudinal, ventanas rodantes, régimen, drift, edge decay, calibración, riesgo de ruina, proyecciones prop, modelo de mejora. |
| 6 | [BEHAVIOR_ENGINE_V3.md](./BEHAVIOR_ENGINE_V3.md) | El núcleo: Insight→Compromiso→Regla→Seguimiento→Verificación→Refuerzo. |
| 7 | [SPRINT_PLAN.md](./SPRINT_PLAN.md) | Sprints 0..14 con objetivo, entregables, riesgos, dependencias, validaciones, hasta 100% de la auditoría. |
| 8 | [IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md) | Orden óptimo de ejecución, DAG de dependencias, ruta crítica, paralelización. |

## Principio rector
> Cada pantalla cumple una función. Ningún gráfico que no produzca una decisión.
> Ningún insight que no termine en una acción: **regla, hábito, compromiso, aprendizaje o protección**.

## Documentos de arquitectura (post-diseño)
| Documento | Propósito |
|---|---|
| [REHYDRATION_REPORT.md](./REHYDRATION_REPORT.md) | Reconstrucción de contexto + estado real del código |
| [ARCHITECTURE_CHALLENGE.md](./ARCHITECTURE_CHALLENGE.md) | Desafío crítico adversarial de la arquitectura |
| [ARCHITECTURE_V3_1_DELTA.md](./ARCHITECTURE_V3_1_DELTA.md) | Fusión de hallazgos → cambios v3→v3.1 con gating |
| [ARCHITECTURE_FREEZE.md](./ARCHITECTURE_FREEZE.md) | **Arquitectura oficial congelada (fuente de verdad).** |
| [adr/](./adr/) | ADR-000..003 (decisiones de raíz, eventos, estadística, memoria) |

## Estado
**SPRINT 7 EJECUTADO (v3.1.0).**
- **S0 (fundaciones):** `rollingWindow`, outbox (`domain_events`), `Insight` persistido (C8), job `recomputeInsights`. Reportes `*_SPRINT_0.md`.
- **S1 (unificación de Reglas, C6):** `Rule` unificado (enforce/warn) + migración aditiva + backfill, plantillas de protección, badge UI, informe de no-mapeo (gate G2). Enforcement sigue en `Automation` (cutover gated). Reportes `*_SPRINT_1.md`.
- **S2 (captura de trade v3, C7):** campos derivados (sesión/riskPct), MAE/MFE + `regime`, checklist obligatorio, auto-tagging de notas y **bucle de incentivo (D10)**. Columnas aditivas en `Trade`. Reportes `*_SPRINT_2.md`.
- **S3 (métricas institucionales, C4):** cuadrante institucional puro (`domains/analytics/institutional/`: drawdown, distribución de R, Sortino/Calmar/Kelly, MAE/MFE, benchmark, heatmap) + **estimador Bayesiano con shrinkage** (ADR-002) + wiring que rellena `confidence/credibleInterval/effectSize` de `Insight` (cierra R6). Sin migración. Superficies tRPC/UI diferidas a S12. Reportes `*_SPRINT_3.md`.
- **S4 (Behavior Engine I, C5 — el loop):** `Commitment`/`CommitmentCheck`/`Reinforcement` (migración `20260626120000`, anonimizables ADR-004); dominio `domains/behavior/` (verificadores FREEZE-D7, máquina de estados, refuerzo ratio-variable); servicios `createCommitmentFromInsight`/`evaluateCommitment`/`carryOverCommitments` + eventos `commitment.*` en outbox + cron `evaluate-commitments`; router `behavior` + `BehaviorLoopPanel` en `/analytics`. Reportes `*_SPRINT_4.md`.

- **S5 (Behavior Engine II, C5 — regla↔compromiso):** `linkRule` (compromiso→regla enforce, enforced live), `RuleSuggestion`+`suggestRulesFromInsights`+accept/dismiss (#14), continuous-eval en cada trade; UI "Activar regla". Migración `20260626180000`. Reportes `*_SPRINT_5.md`.

- **S6 (Coach v3 I, C2 — memoria + threads):** `CoachThread`/`CoachMessage`/`CoachMemory` con frontera anti-poisoning (ADR-003: LLM propone, usuario confirma); inyección de memoria confirmada + compromisos activos en el prompt; UI de memoria editable/borrable en el drawer. Migración `20260626200000`. Reportes `*_SPRINT_6.md`.

- **S7 (Coach v3 II, C1 — proactividad + intervención):** motor determinista de intervención (cascada/revenge/oversizing/DD + scoring/fatiga + override de capital); `Intervention` + fast-path en `trades.close` (≤2s) + `InterventionOverlay`; aceptar crea regla protectora. Migración `20260626220000`. Reportes `*_SPRINT_7.md`.

**G2 FLIPPEADO en prod**; **crons v3 activos**. No se ha avanzado a Sprint 8.
