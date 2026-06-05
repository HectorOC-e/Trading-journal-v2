# Documentation Migration Report

> Fecha: 2026-06-05. Consolidación de `docs/` a una fuente de verdad única.

## Resumen

| Métrica | Antes | Después |
|---|---|---|
| Archivos en `docs/` (total) | 114 | 20 |
| Documentos vivos (raíz `docs/`) | ~113 | **9 maestros** |
| Archivo histórico (`docs/archive/`) | 0 | 11 |
| Eliminados | — | **101** |

Reducción del **~82%** de archivos vivos. Un desarrollador nuevo entiende el proyecto leyendo solo los 9 maestros.

---

## Nueva estructura documental

```
docs/
  PROJECT_GUIDE.md        ← punto de entrada (qué es, propósito, módulos, setup)
  ARCHITECTURE.md         ← stack, dominios, motores, BD/migraciones, IA, seguridad, flujo de datos, ADRs
  FEATURES.md             ← catálogo por módulo (estado, descripción, dependencias)
  ROADMAP.md              ← completado / en progreso / pendiente / futuro
  BACKLOG.md              ← trabajo pendiente accionable (P1/P2/P3)
  TECHNICAL_DEBT.md       ← deuda real, refactors, riesgos
  QA_STATUS.md            ← gates, bugs abiertos, hallazgos, riesgos
  CHANGELOG.md            ← historial consolidado único
  RELEASE_STATUS.md       ← completitud + recomendación de producción
  DOCUMENTATION_MIGRATION_REPORT.md  ← este documento
  archive/                ← historia con valor futuro (11 archivos)
```

---

## KEEP — Documentos maestros (9)
Creados/consolidados como fuente de verdad única. Cada uno reemplaza decenas de documentos temporales. Validación: cubren producto, arquitectura, features, plan, backlog, deuda, QA, historial y release sin necesidad de abrir nada más.

## MERGE — Información consolidada (fuentes → destino)

| Fuente(s) consolidadas | → Destino |
|---|---|
| PROJECT_VISION.md, PRODUCT.md (raíz) | PROJECT_GUIDE.md |
| architecture.md, ARCHITECTURE.md (previo), DOMAIN_MAP.md, ai-architecture-recommendations.md, AI_CONFIGURATION_SURVEY.md, AI_MODELS_CONFIG_REPORT.md | ARCHITECTURE.md |
| features.md, feature-opportunities.md | FEATURES.md |
| roadmap.md, IMPLEMENTATION_ROADMAP.md, personalization-roadmap.md, ux-improvement-roadmap.md, CANONICAL_EXECUTION_PLAN.md | ROADMAP.md |
| backlog.md, master-backlog.md, MASTER_TASKS.md, TASKS.md, EXECUTION_TASKS.md, LEARNING_TASKS*.md, *_REMEDIATION_PLAN.md | BACKLOG.md |
| technical-debt.md, CYCLE_2_DEBT_CLOSURE_REPORT.md | TECHNICAL_DEBT.md |
| FINAL_GLOBAL_QA_REPORT.md, FINAL_QA_REPORT.md, QUALITY_GATES.md (docs), MANUAL_QA_* (plantillas) | QA_STATUS.md |
| changelog.md (verboso), STABILIZATION_REPORT.md, *_COMPLETION_REPORT.md, *_FIX_REPORT.md | CHANGELOG.md |
| FINAL_PROJECT_STATUS.md, FINAL_COMPLETION_REPORT.md, PRODUCTION_READINESS_REPORT.md, ASSESSMENT_2026.md, FULL_UI_UX_TRANSFORMATION_REPORT.md, HIGH_PRIORITY_FIXES_REPORT.md | RELEASE_STATUS.md |

## ARCHIVE — Historia con valor futuro (11 → `docs/archive/`)

| Archivo | Por qué se conserva |
|---|---|
| target-architecture.md | Visión de arquitectura a 6 meses (referencia futura) |
| ai-architecture.md | Diseño detallado de IA |
| formula-engine.md | Referencia detallada de fórmulas |
| OPENROUTER_ROOT_CAUSE_REPORT.md | Análisis de causa raíz (contexto del fix) |
| AI_CONFIGURATION_CONSISTENCY_REPORT.md | Análisis de causa raíz IA |
| DATABASE_MIGRATIONS.md | Runbook detallado de migraciones (política en ARCHITECTURE §5) |
| EMAIL_SETUP.md | Runbook de configuración de email |
| FINAL_MANUAL_QA_TEST_PLAN.md | Plan canónico de QA manual (re-ejecutable) |
| MANUAL_QA_RESULTS.pdf | Evidencia de QA |
| repository-audit-report.md | Auditoría comprehensiva del repo |
| changelog-detailed.md (ex changelog.md) | Historia verbosa por sprint/tarea |

## DELETE — Ruido eliminado (101 archivos)

Eliminados por ser duplicados, obsoletos, temporales o redundantes. Todo su valor quedó consolidado en los 9 maestros (verificado antes de eliminar).

| Categoría | Aprox. | Ejemplos |
|---|---|---|
| Sprint plans / QA / retros / completion / fix / reviews (Sprints 1-12) | ~62 | `SPRINT_*_IMPLEMENTATION_PLAN/QA_REPORT/RETROSPECTIVE/COMPLETION_REPORT/FIX_REPORT/ARCHITECTURE_REVIEW.md` |
| Cycle / Pre-Sprint / Stabilization | ~8 | `CYCLE_1_*`, `PRE_SPRINT_4_*`, `STABILIZATION_REPORT.md` |
| Planes maestros / tasks / remediation superados | ~12 | `MASTER_TASKS.md`, `TASKS.md`, `EXECUTION_TASKS.md`, `CANONICAL_EXECUTION_PLAN.md`, `LEARNING_TASKS*.md`, `*REMEDIATION_PLAN.md`, `SPRINT_MASTER_PLAN.md` |
| Gap analysis / auditorías intermedias / assessment | ~6 | `final-gap-analysis.md`, `product-gap-analysis.md`, `ASSESSMENT_2026.md`, `feature-opportunities.md` |
| Duplicados por mayúsculas / versiones | ~8 | `architecture.md`, `roadmap.md`, `backlog.md`, `technical-debt.md`, `master-*`, `MANUAL_QA_TEST_PLAN*.md` |
| Reportes finales/UX/IA consolidados | ~5 | `FINAL_PROJECT_STATUS.md`, `FINAL_COMPLETION_REPORT.md`, `FULL_UI_UX_TRANSFORMATION_REPORT.md`, `personalization*.md` |

> Todos los archivos eliminados permanecen recuperables vía historial de git si se necesitara.

---

## Validación (Fase 5)

✅ Un desarrollador nuevo comprende el proyecto leyendo únicamente los 9 maestros:
PROJECT_GUIDE → ARCHITECTURE → FEATURES → ROADMAP → BACKLOG → TECHNICAL_DEBT → QA_STATUS → CHANGELOG → RELEASE_STATUS.
Ningún maestro requiere abrir documentos de `archive/` para entender el proyecto; `archive/` es solo referencia profunda opcional.

## Nota: changelog raíz
Existe un `CHANGELOG.md` en la raíz del repo (fuera de `docs/`). El changelog consolidado del proyecto es ahora **`docs/CHANGELOG.md`**. Se recomienda a los mantenedores reconciliar/eliminar el de la raíz para mantener una sola fuente.
