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

## Estado
**FASE DE DISEÑO.** No se ha escrito código de producto. La implementación arranca solo tras aprobación del plan maestro.
