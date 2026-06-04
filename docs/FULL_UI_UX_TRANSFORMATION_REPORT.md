# Full UI/UX Transformation Report — Trading Journal v2

**Fecha:** 2026-06-04  
**Alcance:** Plataforma completa — componentes base, layout, páginas  
**TypeScript:** 0 errores  
**Tests:** 473 passing (mismas 6 pre-existing timezone failures)

---

## Hallazgos pre-transformación

### Problemas de fundación
| Hallazgo | Severidad | Categoría |
|---|---|---|
| Emoji como iconos (🌙☀️📈) en Sidebar y Login | Alta | Consistencia visual |
| `font-size: clamp()` en KpiCard para valores de datos — inapropiado en product UI | Alta | Tipografía |
| Sin transiciones `active:scale` en elementos clickables | Media | Interacción |
| `focus-visible` ausente o inconsistente en toda la UI | Alta | Accesibilidad |
| Sin shimmer animation en skeletons (solo pulse) | Media | Feedback visual |
| Tokens de sombra inexistentes — cada componente los define ad-hoc | Media | Consistencia |
| `border-radius` inconsistente — mezcla de `14px`, `10px`, valores hardcodeados | Media | Consistencia |
| Sin utilities para animaciones (fade-in, scale-pop) | Media | Motion |
| Font Inter cargaba sin italic — no se podía usar énfasis tipográfico | Baja | Tipografía |
| Scrollbar sin estilo — visual genérico del browser | Baja | Polish |
| Password field sin toggle show/hide | Media | UX formularios |
| Login usa emoji `📈` como logo y `border: var(--border)` (token inexistente) | Alta | Correctness |
| Sidebar: grupos de navegación poco claros (OPERACIÓN con 8 items mezclados) | Media | IA/Navegación |
| Dialog: shadows demasiado débiles para contexto modal | Media | Jerarquía visual |
| FilterBar: chips sin contadores, sin `active:scale` | Baja | Interacción |
| AccountCard: sin hover state, sin keyboard accessibility | Media | Accesibilidad |
| Button: sin `loading` prop, sin `active:scale` | Media | Interacción |
| `--radius` era 14px — demasiado redondo para dashboard (impeccable flag) | Media | Diseño |

---

## Cambios implementados

### 1. globals.css — Fundación rediseñada

**Nuevos tokens:**
- `--accent-h`: hover color del accent (más oscuro)
- `--shadow-xs/sm/md/lg`: escala de sombras semántica — light y dark mode
- `--ease-out/ease-in`: curvas de easing reutilizables
- `--radius-xs: 6px`, `--radius-lg: 16px` — escala completa

**Nuevos valores mejorados:**
- `--radius: 12px` (antes 14px) — más profesional, menos "app de consumer"
- `--radius-sm: 8px` (antes 10px) — consistente con escala 6/8/12/16

**Animaciones:**
- `@keyframes shimmer` — efecto shimmer real para skeletons (reemplaza pulse)
- `@keyframes fade-in` — entrada suave con translateY(4px)
- `@keyframes scale-pop` — escala de entrada para modales/cards

**Utilities:**
- `.shimmer`, `.fade-in`, `.scale-pop` — clases aplicables
- `.metric-value` — tipografía monospace tabular para valores de trading
- `.num` — `font-variant-numeric: tabular-nums` para columnas de datos
- `.card`, `.card-hover` — base reutilizable
- `.data-table` — tabla de datos con estilos consistentes
- `.input-label` — etiqueta de campo estandarizada
- `.status-dot` — indicador de estado pequeño
- `.compact-chip` — chip inline para etiquetas
- Scrollbar custom — 6px, sutil, brand-consistent
- `::selection` — selección de texto en colores del brand

**Responsive:**
- `@media (min-width: 1440px)` — padding más generoso en pantallas grandes
- Body `line-height: 1.5` (era 1.45) — mejor legibilidad
- `prefers-reduced-motion` — todas las animaciones respetan la preferencia

**Z-index scale documentada en comentarios:**
dropdown(10) → sticky(20) → overlay(30) → modal-bg(40) → modal(50) → toast(60) → tooltip(70)

---

### 2. Button — Estados completos

**Antes:** Sin loading, sin active scale, focus ring básico  
**Ahora:**
- `loading?: boolean` prop — muestra `<Loader2 className="animate-spin">` y desactiva
- `active:scale-[0.97]` — feedback táctil inmediato
- `focus-visible:ring-2 ring-offset-2 ring-offset-[var(--bg)]` — visible en todos los temas
- Nueva variante `subtle` — background chip sin borde (útil en toolbars)
- Nueva variante `link` — para acciones inline
- Tamaño `xs` — h-6 para contextos muy compactos
- Duración `duration-150` en lugar de sin valor — consistente

---

### 3. Input — Mejor UX

**Antes:** Ring de 1px, sin estado hover, sin prop error  
**Ahora:**
- `error?: boolean` — ring y border en color `--loss`
- `hover:border-[var(--line-2)]` — affordance de interactividad
- `focus:ring-2` con 30% opacity — más suave y moderno
- `h-8` en lugar de `h-9` — alineado con dashboard density
- Font size `13px` — consistente con el resto

---

### 4. Textarea — Matching Input

- `error?: boolean` prop — misma lógica que Input
- `resize-y` en lugar de `resize-none` — users can resize when needed
- `hover:border-[var(--line-2)]` — affordance
- Focus ring matching Input

---

### 5. Skeleton — Shimmer real

**Antes:** `animate-pulse` — básico, baja percepción de carga  
**Ahora:**
- Usa `.shimmer` CSS (gradient sweep de izquierda a derecha)
- `aria-hidden="true"` en todos los skeletons — no anunciar a screen readers
- `SkeletonCard` — nuevo componente para cards genéricas
- `SkeletonTableRows` — filas con border bottom en lugar de gap, más realista
- `SkeletonAccountCards` — incluye progress bar skeleton

---

### 6. KpiCard — Tipografía de datos correcta

**Antes:** `font-size: clamp(18px, 4vw, 28px)` — inapropiado para product UI (valores cambian con viewport)  
**Ahora:**
- `font-size: 22px` fixed — consistente en todos los viewports
- `font-variant-numeric: tabular-nums` — columnas de números no saltan
- `letter-spacing: -0.02em` — más profesional para valores monetarios
- `onClick?: () => void` — las KPI cards pueden ser interactivas
- Hover state cuando tiene onClick
- Icon alignment mejorado

---

### 7. EmptyState — Más versatile

**Antes:** Solo un action button, un size  
**Ahora:**
- `secondary?: { label, onClick }` — segundo botón de acción (ghost)
- `size?: "sm" | "md" | "lg"` — adaptable al contexto
- `strokeWidth={1.5}` en el icon — más ligero, más moderno
- `.fade-in` animation en la entrada
- Focus ring en los botones de acción

---

### 8. TopBar — Breadcrumbs y variantes

**Antes:** Solo title + subtitle + actions  
**Ahora:**
- `breadcrumbs?: BreadcrumbItem[]` — nav breadcrumb con ChevronRight separators
- `compact?: boolean` — `mb-4` y `text-[16px]` para páginas secundarias
- `loading/disabled` en TopBarAction — state forwarding al Button
- Title size `18px/20px` (era `text-lg sm:text-xl`) — más preciso
- Subtitle `text-[12px]` (era `text-sm`) — menor jerarquía visual

---

### 9. Sidebar — Redesign completo

**Antes:**
- Emoji (🌙☀️) como botón de tema — inconsistente, no accesible
- 8 items en sección "OPERACIÓN" sin sub-agrupación — información overload
- Logout button con borde completo — demasiado prominente
- User shows "Héctor O.C." hardcodeado
- Collapse button en posición inconsistente

**Ahora:**
- Lucide icons (Sun, Moon, Monitor) para tema — consistente con el resto del sistema
- Navegación re-agrupada en 4 secciones lógicas:
  - **PRINCIPAL**: Dashboard, Trades, Reviews (más usadas)
  - **GESTIÓN**: Cuentas, Playbook, Reglas, Mercados
  - **APRENDIZAJE**: Aprendizaje (sola — importancia propia)
  - **CUENTA**: Retiros, Etiquetas, Perfil
- User email from Supabase auth (no hardcodeado)
- Footer compacto con toggle-tema + logout en row (expanded) o column (collapsed)
- Mobile: drawer con más padding, logout accesible, animación mejorada
- Tablet: todos los items visibles (no solo algunos)
- `aria-label`, `aria-current="page"` en links de navegación
- Hover states con `hover:bg-[var(--chip)]` — consistente
- Active state con `var(--accent-soft)` background

---

### 10. FilterBar — Contadores y polish

- `count?: number` en opciones — muestra conteo junto al label
- Chip activo con `box-shadow` — más distinción visual
- `size?: "sm" | "md"` — adaptable al contexto
- `active:scale-[0.97]` — feedback inmediato

---

### 11. Badge — Escala ampliada

- Nueva variante `muted` (alias de auto) con uppercase
- `success`, `warning`, `error` — variantes semánticas adicionales
- `size?: "sm" | "md"` — control preciso
- Variante `aplus` usa amber tokens en lugar de green (más diferenciación)

---

### 12. Card — Action slot y compact

- `action?: ReactNode` — slot para acciones en el header (botones, filtros)
- `compact?: boolean` — padding reducido para cards en grids densos
- Title `leading-snug` — evita overflow en títulos largos

---

### 13. Dialog — Shadows y animación

**Antes:** Shadow básico, sin animación custom  
**Ahora:**
- `shadow-[0_20px_60px_rgba(0,0,0,0.20),0_8px_24px_rgba(0,0,0,0.12)]` — profundidad real
- `border-radius: var(--radius-lg)` — 16px para modales (vs 12px para cards)
- Animation: `scaleIn 0.18s cubic-bezier(0.16,1,0.3,1)` — entrada natural
- Overlay: `backdrop-blur-[3px]` — indica claramente contexto de fondo
- DialogTitle: `text-[15px]` — un tick más grande
- DialogDescription: `text-[13px] text-[var(--ink-3)]` — jerarquía correcta
- `aria-label="Cerrar"` en el botón X

---

### 14. Login page — Redesign completo

**Antes:**
- Emoji `📈` como logo — inconsistente
- `border: var(--border)` — token inexistente (bug silencioso)
- Sin toggle de contraseña
- Sin label `for` en inputs — accesibilidad rota
- Submit button sin loading visual
- Sin mensaje de error accesible

**Ahora:**
- `<TrendingUp>` Lucide icon con accent background
- Inputs con `id` y `<label htmlFor>` — accesibles
- `autocomplete="email"` y `autocomplete="current-password"` — browser autofill
- Toggle show/hide password con `<Eye>/<EyeOff>`
- Error con `role="alert"` y `<AlertCircle>` icon
- Submit: `<Loader2 className="animate-spin">` durante carga
- Disabled state cuando email o password están vacíos
- `.fade-in` animation en el card
- Footer con "Plataforma privada" para contexto

---

### 15. AccountCard — Hover y a11y

- `role="button"`, `tabIndex={0}`, `onKeyDown` — keyboard accessible
- `focus-visible:ring-2` — visible en navegación por teclado
- Hover: border cambia a `--line-2` (más tenue que accent)
- Selected: `box-shadow: var(--shadow-sm)` adicional
- Color bar de 4px (era 3px) — más visible

---

## Pantallas afectadas

| Pantalla | Tipo de cambio |
|---|---|
| Login | Redesign completo |
| Dashboard (todos los tabs) | KpiCard, Card, FilterBar, Skeleton |
| Trades | KpiCard, Skeleton, EmptyState, Button |
| Cuentas | AccountCard, Skeleton, FilterBar, Button |
| Playbook | Card, Badge, Button |
| Reviews | Card, Badge, Dialog |
| Aprendizaje | EmptyState, Badge, Button |
| Reglas | Toggle, Badge |
| Mercados | Card (via globals) |
| Retiros | Dialog, Button |
| Etiquetas | Table, Badge |
| Perfil | Dialog, Input |
| Sidebar | Redesign completo (desktop + tablet + mobile) |

---

## Componentes afectados

| Componente | Cambios |
|---|---|
| `globals.css` | Fundación completa, 400+ líneas nuevas |
| `Button` | loading, active scale, variantes nuevas |
| `Input` | error state, hover, focus ring |
| `Textarea` | error state, hover, resize-y |
| `Skeleton` | shimmer, aria-hidden, nuevas variantes |
| `KpiCard` | fixed size, tabular nums, onClick |
| `EmptyState` | secondary action, size prop |
| `TopBar` | breadcrumbs, compact |
| `FilterBar` | count, size, active shadow |
| `Badge` | más variantes, size prop |
| `Card` | action slot, compact |
| `Dialog` | shadows, animation, a11y |
| `Sidebar` | redesign completo |
| `login/page.tsx` | redesign completo |
| `account-card.tsx` | hover, a11y |

---

## Responsive mejorado

| Breakpoint | Cambio |
|---|---|
| `< 768px` (mobile) | Drawer items reorganizados, logout accesible, mejor padding |
| `768–1023px` (tablet) | Todos los items de nav visibles en icon-only mode |
| `>= 1024px` (desktop) | Sidebar colapsable con nav reagrupada |
| `>= 1440px` | Padding de main content más generoso (28px→36px) |

---

## Riesgos

1. **Radius 12px vs 14px**: algunos componentes inline (in `retiros/page.tsx`, `reglas/page.tsx`) usan `borderRadius: "var(--radius)"` en inline styles — se actualizan automáticamente. Revisar que no haya valores hardcodeados de `14px`.

2. **Input height 8 → 8 (h-8 = 32px)**: algunos formularios usan `h-9` via className override. El comportamiento es correcto (override gana), pero conviene auditar para consistencia.

3. **Sidebar nav reorganizada**: la sección "APRENDIZAJE" tiene solo un item. Puede moverse a GESTIÓN o PRINCIPAL en una iteración futura dependiendo de los analytics de uso.

4. **shimmer animation**: requiere CSS `background-size: 200% 100%` — funciona en todos los browsers modernos. IE11 no soportado (no es target).

---

## Trabajo pendiente (no implementado en este pass)

| Área | Descripción | Prioridad |
|---|---|---|
| Mercados | MarketCard a tokens de globals.css | P2 |
| Trades table | Reemplazar inline styles por clases CSS | P2 |
| Aprendizaje | Mejor card de recursos, categorías visuales | P2 |
| Etiquetas | Search/filter UX mejorado | P3 |
| Retiros | Tabla con `data-table` class | P3 |
| Reglas | Bulk enable/disable | P3 |
| Dashboard | Chart tooltips más informativos | P2 |
| Psychology tab | Visualización de patrones emocionales | P2 |
| Perfil | Settings layout más organizado | P3 |
| Breadcrumbs | Conectar a rutas específicas en todas las páginas | P2 |
| Onboarding | TASK-052 pendiente | P2 |
