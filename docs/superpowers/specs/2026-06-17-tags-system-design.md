# Epic 2 — Etiquetas (Tags) como entidad de primera clase

**Fecha:** 2026-06-17
**Estado:** Aprobado para implementación (diseño validado en brainstorming)
**Contexto:** Segundo de 3 epics de la reestructuración Reglas/Etiquetas/Notificaciones.
Orden: (1) Notificaciones ✅ → **(2) Etiquetas** → (3) Motor de Reglas. Las acciones
"Agregar/Remover etiqueta" del motor (Epic 3) se apoyarán en este catálogo.

## Problema

Hoy las etiquetas son `Trade.tags String[]` (texto libre). Se leen por *valor de
string* en decenas de sitios (filtros de trades, analítica de disciplina/psicología/
patrones/insights, IA, reviews). `types/index.ts` define `VIOLATION_TAGS =
["Impulsivo","Off-plan","Revanche"]` y se **re-declara inline** en 3 servicios; `"A+"`
es una tag de calidad usada en disciplina. Existe `/etiquetas` (TASK-051) que gestiona
strings vía el router `tradeTags` (list/rename/delete/merge) — **sin color, icono,
categoría, orden ni descripción**.

## Decisiones (validadas)

1. **Catálogo de metadata por nombre.** Tabla `Tag` (name, color, icon, category,
   description, displayMode, sortOrder, isSystem, semantic). Los trades **siguen** con
   `tags String[]`; el `name` es la clave de unión → analítica/IA/filtros **no cambian**.
2. **Tags de sistema** (Off-plan/Impulsivo/Revanche = `violation`; A+ = `quality`):
   sembradas con `isSystem`, **nombre bloqueado**, apariencia editable. Se **consolida**
   `VIOLATION_TAGS` en una sola fuente (`types/index.ts`) que usan analítica y el seed.
3. **Categorías:** `category` es string con sugerencias sembradas (Psicología, Calidad,
   Ejecución, Setup, Contexto) + personalizables. La UI **agrupa por categoría**.
4. **"Reglas visuales" = `displayMode`** por tag: `icon_color` | `dot` | `text`.

## Arquitectura — Backend

### 1. Modelo `Tag` (migración Supabase CLI)

```prisma
model Tag {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  name        String                              // join key con Trade.tags[]
  color       String   @default("#6b7280")
  icon        String?                             // nombre de icono lucide
  description String   @default("")
  category    String   @default("")              // "" = sin categoría
  displayMode String   @default("icon_color") @map("display_mode") // icon_color|dot|text
  sortOrder   Int      @default(0) @map("sort_order")
  isSystem    Boolean  @default(false) @map("is_system")
  semantic    String?                             // "violation" | "quality" | null
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, name])
  @@index([userId])
  @@map("tags")
}
```

### 2. Consolidación de constantes

`types/index.ts` = única fuente: `VIOLATION_TAGS` (existente) + nuevo
`QUALITY_TAGS = ["A+"] as const`. Las redefiniciones inline en
`domains/analytics/services/{psychology-insights,analytics-bundle,insights-engine}.ts`
se reemplazan por `import { VIOLATION_TAGS } from "@/types"`. El seed deriva las tags de
sistema de `VIOLATION_TAGS` (semantic="violation") y `QUALITY_TAGS` (semantic="quality").

### 3. Seed + backfill (idempotente)

`tags.ensureSeeded` (patrón `rules.seedDefaults`): si el usuario tiene 0 filas en `tags`:
1. Crea las tags de sistema desde las constantes, con color/icono por defecto y
   `isSystem=true`.
2. Crea filas para cada **string distinto** ya usado en `Trade.tags` del usuario que no
   sea de sistema (color gris, sin categoría).
La llama la página `/etiquetas` al montar. Script `scripts/backfill-tags.mjs` reutiliza
la misma lógica para usuarios reales.

### 4. Router `tags` (reemplaza `tradeTags`)

- `list` → metadata de cada Tag + `count` de uso (un solo `findMany` + agregación de
  conteos por `unnest(tags)`, como el `tradeTags.list` actual).
- `ensureSeeded` (mutación idempotente).
- `create({ name, color?, icon?, category?, displayMode? })`.
- `update({ id, ... })` — rechaza cambiar `name` si `isSystem`.
- `rename({ oldName, newName })` — actualiza metadata + `array_replace` en trades;
  bloqueado si `isSystem`.
- `merge({ dying, survivor })` — como el actual + borra la metadata de `dying`.
- `delete(id)` — quita el string de todos los trades + borra metadata; bloqueado si
  `isSystem`.
- `reorder({ ids[] })` — set `sortOrder` por posición.

**Sincronización automática:** al crear/editar un trade, hacer `upsert` (createMany
skipDuplicates) de un `Tag` con defaults para cada nombre nuevo en `tags`, para que el
catálogo nunca quede desincronizado. Se migran los consumidores de `tradeTags`
(página + pickers de trade) y se retira el router `tradeTags`.

## Arquitectura — Frontend

### 5. `TagChip` + catálogo en cliente

- `components/tags/tag-chip.tsx`: renderiza por `displayMode` — `icon_color` (chip
  teñido + icono + nombre), `dot` (punto de color + nombre), `text` (nombre con color
  sutil). Props `name`, `size` (`sm`|`md`). Resuelve metadata vía el catálogo; fallback
  gris para nombres sin catalogar.
- `lib/tags.ts` → `useTagCatalog()`: query `tags.list` cacheada → `Map<name, TagMeta>`.
- Reemplaza el render hardcodeado de tags en `components/trades/trade-row.tsx` y
  `components/trades/trade-detail-panel.tsx`.

### 6. Rediseño de `/etiquetas`

Secciones agrupadas por categoría. Cada fila: preview del chip, editor de color (paleta
de presets + hex), icono (picker curado ~24 lucide), categoría (combo sugerencias +
libre), `displayMode`, descripción, conteo de uso, badge "Sistema" (nombre con candado).
Acciones: crear, renombrar, fusionar, eliminar, reordenar (drag dentro de categoría →
`sortOrder`), búsqueda.

### 7. Picker en trades

`register-trade-modal` y `edit-trade-modal`: picker consciente del catálogo, agrupado por
categoría, con chips; crear tag inline (añade string al trade + upsert lazy del `Tag`).
Sustituye el autocomplete basado en `tradeTags.list`.

### 8. IA / conocimiento

`lib/ai/app-knowledge.ts`: las etiquetas tienen categoría/color/icono gestionados en
`/etiquetas`; el coach sigue leyendo los *nombres* (sin cambio de comportamiento). Sin
tool nueva.

## Tests

- **Unit:** router `tags` (seed idempotente, protección de `isSystem` en
  update/rename/delete, merge, reorder, upsert lazy); `TagChip` por `displayMode`;
  lookup del catálogo (fallback).
- **Backfill:** distinct strings → Tag rows + system tags sembradas.
- **Regresión:** analítica de disciplina/psicología sigue verde tras consolidar
  `VIOLATION_TAGS` (la suite existente lo cubre).
- **webapp-testing** (`ariaoc89@gmail.com`): `/etiquetas` (agrupación + system seeded),
  editar color/categoría, crear tag, registrar/editar trade con el picker, ver chip en la
  tabla; consola limpia.

## No-objetivos

- Sin normalización a join table (`Trade.tags` sigue `String[]`).
- Sin estilo condicional automático (eso roza el Epic 3).
- Tags de recursos de Aprendizaje (otro sistema: `category-chip`/`ResourceType`) fuera de
  alcance.
- Sin tabla separada de categorías (string + sugerencias).

## Riesgos / notas

- **Sin cambios manuales en BD:** migración versionada en `supabase/migrations/`.
- **Renombrar tags no-sistema** debe actualizar trades (`array_replace`) y la metadata en
  una transacción para no desincronizar.
- **`tradeTags` retirado:** verificar todos sus consumidores (página + modales) antes de
  borrarlo; mantener la firma de `list` si algún sitio depende de `{tag,count}`.
