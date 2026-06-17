# Plan de implementación — Epic 3 · Motor de Reglas

Spec: `docs/superpowers/specs/2026-06-17-rules-engine-design.md`. Rama: `feat/rules-engine`.
Cada fase se verifica (typecheck + tests) y se commitea por separado.

## E3-P0 — Schema + migración
`Automation` model + relación User; `supabase/migrations/<ts>_automations.sql`. prisma generate, typecheck.

## E3-P1 — Condiciones + campos (puro)
`domains/rules/{types,conditions,fields}.ts`: ConditionNode, `evaluate()`, field registry. Unit tests (AND/OR/NOT, cada cmp, árbol vacío).

## E3-P2 — Acciones + runner + integración + catálogo
`domains/rules/{context,actions,engine}.ts`; códigos `RULE_REMINDER`/`RULE_BLOCKED` en lib/messages.
Integrar `runAutomations` en `trades.create` (pre+post) y `trades.update` (post). Unit tests (block pre, best-effort post, prioridad).

## E3-P3 — Router automations + plantillas
`server/trpc/routers/automations.ts` (CRUD/toggle/reorder/templates/createFromTemplate) con validación Zod (BLOCK solo pre); `domains/rules/templates.ts`; registrar en root. Router tests.

## E3-P4 — Pantalla /reglas (pestañas)
Reescribir `app/reglas/page.tsx`: pestañas Automatizaciones / Sistema / Recordatorios; lista de automatizaciones (toggle/editar/eliminar/reordenar). Conservar recordatorios.

## E3-P5 — Rule Builder
`components/rules/{rule-builder,condition-group,action-list}.tsx` (vertical WHEN/IF/THEN, AND/OR/NOT recursivo, modo JSON) + galería de plantillas.

## E3-P6 — Reglas del sistema (config)
UI por cuenta de límites de riesgo editables (umbrales + restaurar) sobre campos del Account.

## E3-P7 — IA
`app-knowledge.ts`: automatizaciones + reglas de sistema + recordatorios. Tool opcional diferible.

## E3-P8 — Pruebas
Suite unit + typecheck + lint + build; webapp-testing (`ariaoc89@gmail.com`). PR → merge → migrate-deploy.
