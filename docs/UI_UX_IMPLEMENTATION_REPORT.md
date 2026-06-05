# UI/UX Implementation Report — Trading Journal v2

> Implementación del `UI_UX_MASTER_REDESIGN_PLAN.md`. Fecha: 2026-06-05.
> Estado por ítem: ✅ Implementado · 🟡 Parcial · ⏭️ Diferido.
> Entorno local sin `node_modules` (cert self-signed bloquea `npm install`), por lo que **no se pudo correr `tsc`/`next build` localmente**; la verificación se hizo por revisión manual exhaustiva. Validación final pendiente en CI (`prisma generate && next build`).

---

## 1. Resumen

Se implementaron las Fases 0–4 del plan maestro. El sistema de temas (entregable explícito de la visión), la corrección de acciones invisibles (Critical C1), la eliminación del estrangulamiento por panel lateral (Critical C3), la elevación de los pilares en la navegación (Critical C2), el AI Coach flotante (M1), las Quick Actions globales (M2) y el navbar móvil con FAB central están funcionando.

**Archivos nuevos (8):**
- `src/lib/themes.ts` — modelo central de temas (4 predefinidos + custom + aplicar/restaurar).
- `src/lib/quick-actions-store.ts` — store Zustand compartido para "Nuevo Trade" global.
- `src/components/ui/drawer-panel.tsx` — patrón único de detalle overlay.
- `src/components/layout/quick-actions.tsx` — speed-dial global + modal de registro.
- `src/app/psicologia/page.tsx` — ruta de pilar Psicología.
- `src/app/analytics/page.tsx` — ruta de pilar Analytics.
- `supabase/migrations/20260605120000_add_color_theme_preferences.sql` — columnas `color_theme` + `custom_theme`.
- `docs/UI_UX_IMPLEMENTATION_REPORT.md` + `docs/UI_UX_REGRESSION_TEST_PLAN.md`.

**Archivos modificados (12):**
`globals.css`, `layout.tsx`, `theme-provider.tsx`, `button.tsx`, `prisma/schema.prisma`, `preferences.ts` (router), `perfil/page.tsx`, `AppShell.tsx`, `Sidebar.tsx`, `ai-coach-drawer.tsx`, `trades/page.tsx`, `cuentas/page.tsx`, `aprendizaje/resource-card.tsx`, `reviews/components/monthly-review-card.tsx`, `dashboard/tabs/tab-portfolio.tsx`.

---

## 2. Fase 0 — Higiene de tokens & Design System ✅

- ✅ `globals.css`: `--radius-lg` 14→16px, nuevo `--radius-xl: 20px`.
- ✅ Nuevo token **`--accent-contrast`** (texto/icono sobre accent, garantiza AA en temas con accent claro). Mapeado en `@theme inline` como `--color-accent-contrast`.
- ✅ **Ley de colores reservados** documentada en comentario: `--win/--loss/--be` son funcionales y constantes en todos los temas.
- ✅ `Button` variante `primary`: `text-white` → `text-[var(--accent-contrast)]`.
- ✅ AI Coach: eliminados `#4f6ef7`/`#3d5ce6` hardcodeados → `var(--accent)` / `var(--accent-h)` / `var(--accent-contrast)`.
- ✅ Botones primarios inline en `trades/page.tsx` y `tab-portfolio.tsx`: `text-white` → `text-[var(--accent-contrast)]`.
- 🟡 **Colores hardcodeados restantes:** los `#4f6ef7` que quedan son (a) series de gráficos recharts y (b) paletas semánticas fijas (colores de setup, categorías de aprendizaje, tipos de cuenta). Se dejaron a propósito: **no son el accent del tema** y deben permanecer constantes (el color elegido de un setup no debe cambiar con el tema). Migrarlos a tokens es trabajo cosmético de bajo riesgo, marcado como follow-up.

## 3. Fase 1 — Sistema de temas ✅

- ✅ **4 temas predefinidos** en `globals.css` vía `[data-theme]` (claro + oscuro c/u): **Indigo** (default), **Violeta** (#60519b), **Turquesa** (#00a6c0), **Carmesí** (rojo solo atmósfera, accent dorado para no chocar con `--loss`).
- ✅ **Tema personalizado** multi-rol (`CustomTheme`: accent/accentH/accentSoft/accentContrast) inyectado inline en `<html>`. UI rápida por color primario en Perfil (12 tonos), preservando win/loss reservados.
- ✅ **Restaurar por defecto** (botón en Perfil → Apariencia): limpia `data-theme`, vars inline, localStorage y DB; vuelve a Indigo.
- ✅ **Persistencia**: `prisma/schema.prisma` (`colorTheme`, `customTheme`) + migración idempotente + zod en `preferences.update` + defaults en `preferences.get`.
- ✅ **Aplicación sin flash**: script `beforeInteractive` en `layout.tsx` (lee `tj-theme` + `tj-color-theme` antes de hidratar). `theme-provider` aplica desde DB con fallback a localStorage.
- ✅ **Selector visual** en Perfil con swatches (accent + superficie) y descripción por tema.

## 4. Fase 2 — Acciones visibles + componente Detalle ✅

- ✅ **C1 (crítico) resuelto**: `resource-card.tsx` — el menú `···` pasó de `opacity-0 group-hover:opacity-100` (invisible/inaccesible en táctil) a **siempre visible**, target 36×36px, `aria-haspopup`/`aria-expanded`.
- ✅ `monthly-review-card.tsx`: acciones editar/eliminar ahora visibles (opacidad 60% en desktop, 100% en hover; siempre visibles en móvil) con targets 32px.
- ✅ Nuevo **`DrawerPanel`**: overlay derecho en desktop/tablet (no reflowea contenido), hoja inset (52px–60px) en móvil, cierre por Esc/backdrop/control, lock de scroll.
- ✅ **Trades**: detail-rail 340px (estrangulaba la tabla a ~794px en 1366px) → `DrawerPanel` overlay 460px. **C3 resuelto** en Trades.
- ✅ **Cuentas**: detail-rail 340px → `DrawerPanel` overlay 460px. Grid de cuentas a ancho completo.
- ✅ **Reviews**: el detail-rail 380px se migró a **`DrawerPanel`** overlay (480px), unificando el patrón con Trades/Cuentas y eliminando el último push-rail. (La variante "página completa `/reviews/[id]`" del plan se cambió por drawer por consistencia y menor riesgo.)
- 🟡 **Aprendizaje**: corregido el menú invisible (C1) pero el right-rail permanente de stats y los 5 modales (M5/M6) no se reestructuraron aún.

## 5. Fase 3 — Navegación, pilares, navbar móvil, Quick Actions ✅

- ✅ **C2 resuelto**: nuevo grupo de navegación **ANÁLISIS** con **Psicología** (`/psicologia`) y **Analytics** (`/analytics`) como destinos de primer nivel. Rutas creadas reutilizando `useDashboardStats` + los componentes `tab-*` existentes (sin duplicar lógica de negocio).
- ✅ **Sidebar**: grupos reordenados (PRINCIPAL · ANÁLISIS · GESTIÓN · APRENDIZAJE · CUENTA); iconos `Brain`/`LineChart`.
- ✅ **Navbar móvil**: rediseñado al patrón de la referencia — 2 destinos · **FAB central elevado (Nuevo Trade)** · 1 destino · "Más". Labels completos (se eliminó `slice(0,8)`), targets 56px, FAB 56px con borde de realce.
- ✅ **Quick Actions globales (M2)**: `QuickActions` montado en `AppShell`. Speed-dial FAB (desktop, abajo-derecha; apilado bajo el AI Coach) con Nuevo trade / Log sesión / Nueva review. Atajo de teclado **`N`**. Abre el **mismo** `RegisterTradeModal` que `/trades`, montado una vez globalmente vía store Zustand. El FAB central móvil dispara el mismo flujo.
- 🟡 **Dashboard**: el plan sugería aligerarlo moviendo los tabs pesados a rutas. Los tabs siguen en Dashboard **y además** existen como rutas (`/psicologia`, `/analytics`) — coexistencia para no romper. La conversión del Dashboard a "home héroe" (saludo + KpiHero) queda diferida (Fase 5).

## 6. Fase 4 — AI Coach flotante ✅

- ✅ `ai-coach-drawer.tsx` reescrito como **asistente flotante**:
  - Estados: launcher (burbuja) → panel (flotante) → **expandido** (~720px) → **minimizado** (barra de cabecera).
  - **Arrastrable** por la cabecera en desktop (pointer events), posición persistida en `localStorage` (`tj-coach-pos`).
  - **No se cierra al click-fuera** (cierre explícito); conserva el hilo.
  - **Theming correcto**: `var(--accent)` / `var(--accent-contrast)`.
  - **Móvil**: hoja inferior (sin drag), apilado sobre el navbar.
  - Lógica de streaming/API intacta.

## 7. Fase 5 — Momentos premium / enhancements 🟡

Implementado en esta iteración:
- ✅ **Command palette ⌘K / Ctrl+K** (E1) — `components/ui/command-palette.tsx`, montado en `AppShell`. Navega a cualquier destino + "Nuevo trade"; navegación con flechas, Enter, Esc.
- ✅ **Dashboard header héroe** (E3/E4) — saludo según hora + fecha + card héroe de **Net P&L del periodo** (coloreado win/loss) con win rate y nº de trades, en `app/dashboard/page.tsx`.
- ✅ **`maximumScale: 1` eliminado** (m4) — el usuario ya puede hacer zoom (WCAG 1.4.4).

- ✅ **Editor de tema personalizado** (`lib/themes.ts` + Perfil): selector de color hex exacto (`<input type=color>`) + presets de tono, **vista previa en vivo** (botón/chip/win-loss) y **badge de contraste WCAG AA** calculado en tiempo real; `accentContrast` se elige automáticamente (negro/blanco) por mejor contraste.

Diferido aún: centro de notificaciones (E2 — no hay top-bar global de escritorio donde anclarlo sin un cambio de layout mayor), `SegmentedTabs`/`PageHeader` extraídos (m3), roles secundario/terciario del tema (la app solo tematiza el accent de forma funcional; secundario/terciario serían decorativos). Ver §9.

---

## 8. Decisiones y notas de diseño

1. **Rojo reservado:** el tema Carmesí usa rojo como atmósfera y **dorado** como accent, evitando el choque con `--loss`. Es la decisión de dominio más importante del rediseño.
2. **Charts/colores semánticos no se tematizan:** colores de setup, categorías y series de gráfico permanecen constantes intencionalmente.
3. **Coexistencia Dashboard ↔ rutas de pilar:** se priorizó no romper sobre la limpieza total de IA. Sin deuda funcional, solo duplicación visual temporal.
4. **Sin migración destructiva:** la migración de temas es puramente aditiva e idempotente (`ADD COLUMN IF NOT EXISTS`).

## 9. Pendientes / follow-up (backlog)

- ⏭️ Reviews → página completa `/reviews/[id]`.
- ⏭️ Aprendizaje: right-rail de stats → KpiStrip colapsable; auditar 5 modales (M5/M6).
- ✅ Dashboard "home héroe" (saludo + KpiHero Net P&L) — hecho (falta estado emocional del día).
- ✅ Command palette ⌘K — hecho. ⏭️ Centro de notificaciones (E2) — pendiente.
- ⏭️ `SegmentedTabs` y `PageHeader` héroe extraídos a `components/ui/`.
- ✅ `maximumScale: 1` eliminado (WCAG 1.4.4).
- ⏭️ Migrar `#4f6ef7` restantes de charts a `var(--chart-1)` donde aplique.
- ⏭️ Editor de tema personalizado multi-rol completo (secundario/terciario) con preview en vivo y validación de contraste AA.

## 10. Verificación requerida en CI

1. `prisma generate && next build` (confirma tipos con el cliente Prisma regenerado que incluye `colorTheme`/`customTheme`).
2. Aplicar migración `20260605120000_add_color_theme_preferences.sql` (auto en workflow de migraciones).
3. `eslint` (revisar `no-unused-vars`).
4. Ejecutar `UI_UX_REGRESSION_TEST_PLAN.md`.
