# Plan de implementación — Epic 2 · Etiquetas

Spec: `docs/superpowers/specs/2026-06-17-tags-system-design.md`. Rama: `feat/tags-system`.
Cada fase se verifica (typecheck + tests) y se commitea por separado.

## E2-P0 — Schema + migración
- `prisma/schema.prisma`: modelo `Tag` + relación en `User`.
- `supabase/migrations/<ts>_tags.sql`: tabla `tags`, `UNIQUE(user_id, name)`, índice por user.
- `prisma generate`; typecheck. **Acepta:** compila, cliente regenerado, SQL replayable.

## E2-P1 — Consolidar constantes
- `types/index.ts`: `QUALITY_TAGS = ["A+"]`. Reemplazar las 3 redefiniciones inline de
  `VIOLATION_TAGS` por `import` desde `@/types`. **Acepta:** suite verde (sin cambios de valor).

## E2-P2 — Router `tags` + seed + upsert lazy
- `server/services/tags/seed.ts` (o en el router): `ensureSeeded` idempotente (sistema +
  backfill distinct strings, excluyendo nombres de sistema).
- `server/trpc/routers/tags.ts`: list/ensureSeeded/create/update/rename/merge/delete/reorder
  con protección `isSystem`. Registrar en root.
- Upsert lazy de Tags en `trades.create`/`update`.
- Migrar consumidores de `tradeTags` (página + modales) y **retirar** `tradeTags`.
- **Acepta:** tests de router (seed idempotente, protección sistema, rename/merge/reorder) verdes.

## E2-P3 — TagChip + catálogo
- `components/tags/tag-chip.tsx` (icon_color/dot/text), `lib/tags.ts` `useTagCatalog()`.
- Reemplazar render de tags en `trade-row.tsx` + `trade-detail-panel.tsx`.
- **Acepta:** chips renderizan por modo; typecheck/lint verdes.

## E2-P4 — Rediseño `/etiquetas`
- Reescribir página: agrupada por categoría, editores (color/icono/categoría/displayMode/
  descripción), reorder, conteo de uso, badge sistema. **Acepta:** CRUD + reorder vía router.

## E2-P5 — Picker en trades
- Picker agrupado con chips + crear inline en `register-trade-modal` y `edit-trade-modal`.
- **Acepta:** seleccionar/crear tags escribe strings + sincroniza catálogo.

## E2-P6 — IA
- `app-knowledge.ts`: etiquetas con categoría/color gestionadas en `/etiquetas`. **Acepta:** congruente.

## E2-P7 — Pruebas
- Suite unit + typecheck + lint + build; **webapp-testing** (`ariaoc89@gmail.com`). PR → merge → migrate-deploy.
