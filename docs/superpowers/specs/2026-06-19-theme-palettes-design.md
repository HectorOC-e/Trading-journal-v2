# Sistema de temas estilo "paleta de colores" completa

**Fecha:** 2026-06-19
**Estado:** Aprobado (brainstorming) → en implementación
**Rama:** `feat/theme-palettes`

## Contexto

Hoy el "tema de color" (`src/lib/themes.ts` + `globals.css`) solo cambia el acento y un
tinte de atmósfera **casi imperceptible** (chroma ~0.006). El usuario percibe que "solo
cambia un color". Se quiere:

1. Paletas predefinidas adicionales (8 en total).
2. Paletas **completas** (fondo, superficies, bordes, texto, acento) con variante clara y oscura.
3. Un **creador** de paletas estilo "paleta de colores".
4. Una **biblioteca** de paletas personalizadas (varias guardadas, no un único slot).

Los colores reservados **win/loss/be** (verde/rojo/ámbar) son semántica funcional del
journal y **nunca** se tocan por paleta (solo el overlay de daltonismo puede retunearlos).

## Decisiones (encuesta)

| Tema | Decisión |
|---|---|
| Alcance de la paleta | **Paleta completa** (atmósfera + acento), claro y oscuro |
| Intensidad de atmósfera | **Media** — tinte perceptible pero sobrio |
| Paletas predefinidas | **8**: Indigo, Violeta, Turquesa, Dorado/Carmesí, Océano, Rosa, Grafito, Esmeralda |
| Creación de custom | **Híbrido**: una semilla → auto-deriva todo; "Ajustes avanzados" afina roles |
| Biblioteca custom | **Varias** (tabla nueva), límite **10** por usuario |
| Ubicación del creador | **Modal dedicado** con vista previa grande |
| Migración del custom actual | **Convertir** el accent-only existente en una entrada "Mi paleta" |

## Arquitectura (Enfoque 3: motor compartido, predefinidas precompiladas)

Fuente de verdad única: **`derivePalette(config, mode) → TokenSet`** en `src/lib/theme/engine.ts`.

- **Predefinidas** → un script de build (`scripts/gen-theme-css.ts`) ejecuta el motor por
  cada paleta × {claro, oscuro} y emite `src/app/theme-palettes.generated.css` con bloques
  `[data-theme="x"]` y `.dark[data-theme="x"]`. Committeado e importado desde `globals.css`.
  Sin parpadeo, rápido, sin JS.
- **Custom** → se guardan como `PaletteConfig` (JSON). Al aplicarse, el **mismo** motor corre
  en el navegador e inyecta variables inline en `<html>` para el modo activo (se re-inyecta al
  alternar claro/oscuro). Un script bootstrap inline en `<head>` evita el parpadeo de la custom activa.

### Contrato de tokens (lo que una paleta controla)

```
--bg --panel --panel-2 --ink --ink-2 --ink-3 --line --line-2 --chip
--accent --accent-h --accent-soft --accent-contrast
```

Reservados (NO tocar por paleta): `--win(-soft) --loss(-soft) --be(-soft)`.
**El contrato no cambia** → cero cambios en los componentes consumidores; solo cambia a qué resuelven.

### Composición con capas existentes

- Toggle global **claro/oscuro/sistema** (`theme`): sigue poniendo la clase `.dark`. La paleta
  aporta ambos sets; el modo activo elige cuál.
- `data-theme="<id>"`: selecciona predefinida. `data-theme="custom"` + vars inline: custom activa.
- `colorScheme` (deuteranopia/mono): overlay ortogonal que solo retoca win/loss/be (mono dessatura).

## Modelo de datos

Nueva tabla **`custom_palette`** (Prisma `CustomPalette`):

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users(id) ON DELETE CASCADE | |
| `name` | text | nombre visible |
| `config` | jsonb | `PaletteConfig` serializado |
| `position` | int default 0 | orden en el grid |
| `created_at` / `updated_at` | timestamptz | |

Índice por `user_id`. Límite de **10** por usuario validado en el router (no en la BD).

`user_preferences`:
- `color_theme` ahora guarda id predefinido (`indigo`…) **o** `custom:<paletteId>`.
- `custom_theme` / `accent_hue` quedan **legacy** (solo lectura para migrar; no se borran).

## Migración (Supabase SQL · aplicada por CI al mergear a `main`)

Archivo `supabase/migrations/20260619xxxxxx_custom_palettes.sql`, **idempotente** (CI replay desde cero):

1. `create table if not exists public.custom_palette (...)` + índice + RLS acorde al resto de tablas.
2. Backfill: por cada `user_preferences` con `custom_theme` no nulo, insertar una fila
   `custom_palette` ("Mi paleta") derivada del accent existente y fijar `color_theme = 'custom:'<id>`.

> La migración **no se aplica ahora**. Se commitea en el PR; CI la valida (replay) y la aplica a
> producción al **merge a `main`** (lo hace el usuario). Prisma solo genera el cliente.

## Motor (`src/lib/theme/`)

`themes.ts` se reorganiza en módulo (manteniendo re-exports para no romper imports existentes):

- `types.ts` — `PaletteConfig`, `TokenSet`, `ColorMode`.
- `palettes.config.ts` — las 8 configs predefinidas.
- `engine.ts` — `derivePalette(config, mode)`, rampas OKLCH, guardas de contraste (reusa `contrastRatio`/`bestContrastOn`).
- `apply.ts` — `applyColorTheme(selection, palettes, mode)`, inyección de vars.
- `parse.ts` — parseo/validación de `PaletteConfig` y de la selección `custom:<id>`.
- `index.ts` — superficie pública.

`PaletteConfig` (mínimo = un hue; el resto opcional):
```ts
interface PaletteConfig {
  hue: number              // 0–360 OKLCH (semilla)
  chroma?: number          // saturación de atmósfera (default = media)
  accentL?: number         // luminosidad del acento
  overrides?: Partial<TokenSet>  // "Ajustes avanzados" por rol
}
```

## UI (Perfil → Apariencia)

- Grid: **8 predefinidas + entradas de biblioteca + tarjeta "＋ Crear paleta"**. Cada custom: editar/eliminar.
- **Modal creador** (`<PaletteCreatorModal>`): selector de color (semilla) + vista previa grande de
  un mini-dashboard en vivo; expander "Ajustes avanzados" con swatches por rol y badges AA en vivo;
  campo nombre; Guardar (añade/actualiza biblioteca) / Cancelar.
- Aplicar al hacer clic; persistencia con debounce (igual que hoy).

## Capa de aplicación

- `applyColorTheme` reescrito: predefinida → `data-theme`; custom → `derivePalette` + vars inline del modo
  actual (re-inyecta al cambiar de modo).
- `theme-provider` resuelve la selección (`indigo` vs `custom:<id>`) usando las paletas de la biblioteca;
  re-inyecta al cambiar claro/oscuro.
- Script bootstrap inline en `<head>` (extiende el actual) para la custom activa.

## Accesibilidad

- Guardas WCAG AA integradas en el motor (ink/bg y accent-contrast/accent).
- Badge de contraste en vivo en el creador.
- Overlay daltonismo intacto.

## Pruebas (las realiza el usuario — checklist de verificación)

1. Elegir cada predefinida en claro y oscuro: atmósfera y acento cambian; win/loss intactos.
2. Crear una custom desde un color → se aplica; abrir "Ajustes avanzados", afinar un rol, guardar.
3. Recargar: la custom activa no parpadea (bootstrap).
4. Alternar claro/oscuro con una custom activa: se re-deriva correctamente.
5. Biblioteca: crear hasta 10 (el 11º se bloquea), editar, eliminar.
6. Daltonismo: combina con cualquier paleta sin romper.
7. Migración (tras merge): el custom previo aparece como "Mi paleta" seleccionada.

---

## Deuda técnica / fuera de alcance — Fix de timezone (PR aparte)

**Problema confirmado:** el campo `timezone` del perfil se guarda y valida, pero **solo lo consume
el subsistema de emails/notificaciones**. La lógica de fechas de trades y del dashboard trabaja en **UTC**:

- `register-trade-modal.tsx:131` — fecha por defecto = `new Date().toISOString().slice(0,10)` (UTC).
  En `America/Tegucigalpa` (UTC−6), un trade a las 23:00 local cae en el **día siguiente**.
- `trades.ts:235` — "hoy" del dashboard = `now.toISOString().slice(0,10)` (UTC).
- `dashboard-analytics` agrupa por semana con `getISOWeekKey(new Date(t.date))` (UTC).
- El servidor guarda `date: new Date(input.date)` = medianoche **UTC**.

**Plan de remediación (PR separado):**

1. Helper `localDateISO(now, tz)` y `localHour` ya existen en `send-learning-digest.ts`;
   extraer a util compartida (`src/lib/datetime/local.ts`).
2. Fecha por defecto del formulario de trade → fecha **local del usuario** (tz del perfil), no UTC.
3. Fronteras "hoy / semana / mes" del dashboard → calcularlas en la **tz del usuario**.
4. Decidir representación de `Trade.date`: mantener como **local-date string** (recomendado, ya es
   "día de trading") y documentar que NO es un instante UTC; auditar lecturas que asumen UTC.
5. Invalida caché de analytics al cambiar tz (ya existe el gancho `invalidateAnalyticsCacheIfNeeded`).

Prioridad: media-alta (afecta correctitud de reportes diarios/semanales para usuarios fuera de UTC).
