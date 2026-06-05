# UI/UX Master Redesign Plan — Trading Journal v2

> Plan maestro de rediseño de experiencia. Última actualización: 2026-06-05.
> **Estado: PROPUESTA — no implementado.** Este documento es la fuente de verdad del rediseño; ningún cambio de código se aplica hasta aprobar fase por fase.
> Verificado contra el código real en `src/` (no contra un diseño objetivo).

---

## 0. Resumen ejecutivo

Trading Journal v2 ya tiene una base sólida: design tokens en OKLCH, soporte de tema claro/oscuro/sistema, personalización de _accent hue_, modo daltónico, y un sistema de componentes coherente (`components/ui/`). **No partimos de cero — corregimos y elevamos.**

El producto es **Trading Journal + Psychology + Learning + AI Coach**, no un panel administrativo. Hoy se _ve_ como una herramienta interna densa y eficiente (lo cual es bueno para datos), pero **se siente** como un CRUD: navegación de carpetas, paneles laterales que compiten por el ancho, acciones escondidas tras hover, y un sistema de temas que se queda corto frente a lo que pide la visión (4 temas + custom + restaurar).

Los tres problemas estructurales más caros:

1. **Sobrecarga de paneles laterales (340px).** Cuatro pantallas (Trades, Cuentas, Reviews, Aprendizaje) empujan el contenido a un rail de 340px que estrangula la columna principal en laptops de 1280–1440px y rompe la legibilidad de tablas y métricas.
2. **Acciones invisibles.** El menú de 3 puntos de las cards de aprendizaje usa `opacity-0 group-hover:opacity-100` — **literalmente invisible sin hover, e inaccesible en táctil** (`resource-card.tsx:249`). Es el síntoma de un patrón repetido.
3. **Sistema de temas incompleto.** Existe `accentHue` (8 tonos) pero no temas con nombre, no paleta multi-color (primario/secundario/terciario/accent/estados), no "restaurar valores". La visión pide los cuatro.

Este plan los resuelve con justificación UX y mapea cada cambio a archivos reales.

---

## 1. Análisis de referencias adjuntas

### 1.1 Finexy Dashboard (la UI que te gusta)

**Qué resuelve / qué patrones usa:**

| Patrón observado | Por qué funciona | ¿Adoptar? |
|---|---|---|
| **Nav pill horizontal superior** (Overview / Activity / Manage…) flotante con fondo blanco redondeado | Reduce carga vertical, se siente "app" no "intranet". Da foco a 5–6 destinos. | **Parcial.** No para nav global (tenemos 13 secciones, no caben en pills). Sí para **sub-navegación de pantalla** (ya lo hacemos en Dashboard con tabs — unificar ese patrón visual). |
| **Saludo personalizado** "Good morning, Sajibur" + subtítulo de intención | Humaniza, orienta. Premium SaaS (Linear, Notion lo hacen). | **Sí.** Header de Dashboard con saludo + fecha + racha/estado emocional del día. |
| **Cards muy redondeadas** (radius ~16–20px) sobre fondo gris suave, paneles blancos elevados | Jerarquía por elevación, no por bordes duros. Aire. | **Sí, con calibración.** Subir `--radius-lg` y usar fondo `--bg` ligeramente más separado de `--panel`. NO exagerar: datos financieros densos necesitan bordes legibles. |
| **Una card "héroe" en color** (Total Earnings naranja) entre cards neutras | Dirige el ojo a la métrica #1. | **Sí.** La métrica clave del trader (Net P&L del periodo / estado de cuenta prop-firm) merece una card acentuada. |
| **Mini-rail de iconos** a la izquierda (atajos contextuales) | Acciones secundarias sin robar espacio. | **No como está.** Iconos sin label = adivinanza. Ya sufrimos esto en tablet. |
| **Top-right: búsqueda + notificaciones + avatar con menú** | Convención SaaS universal. Descubrible. | **Sí.** Hoy no tenemos búsqueda global ni centro de notificaciones. Oportunidad. |
| **Tabla de "Recent Activities"** con checkbox, icono por tipo, status dot, fecha, `···` por fila | Densidad correcta para datos. | **Sí** — ya lo tenemos (`.data-table`). Mantener. |
| Toggle claro/oscuro como dos botones sol/luna apilados | Visible, sin ambigüedad | **Sí** — mejor que nuestro toggle cíclico de 3 estados poco descubrible. |

**Qué NO adoptar:** la estética "fintech/banca" literal (tarjetas de crédito, wallets, USD/EUR/GBP). Nuestro dominio es trading, no banca personal. Tomamos el _lenguaje visual_ (aire, redondeo, card-héroe, saludo), no el contenido.

### 1.2 Paletas Noguchi (Purple / Turquoise / Red)

Son paletas de 4 tonos cada una construidas como **rampa oscura→media→acento→clara**, exactamente el modelo que necesita un sistema de temas:

- **Purple:** `#1e202c` (base oscura) · `#60519b` (acento) · `#31323e` (superficie) · `#bfc0d1` (clara/texto).
- **Turquoise:** `#222831` · `#283b48` · `#00a6c0` (acento) · `#d8d7ce`.
- **Red:** `#19171b` · `#75020f` / `#51080d` (acentos) · `#2b0307`.

**Adoptar:** la estructura de 4 roles (base / superficie / acento / clara) mapea limpio a nuestros tokens (`--bg` / `--panel` / `--accent` / `--ink`). Estas tres paletas + el indigo actual = los **4 temas predefinidos** que pide la visión.

**Advertencia crítica de dominio (Red):** en un trading journal el **rojo está reservado para pérdidas** (`--loss`). Un tema cuyo _accent_ es rojo crea conflicto semántico: el usuario no distingue "botón primario" de "estás perdiendo dinero". → El tema "Carmesí" usará el rojo como color de **superficie/atmósfera**, NO como accent de acciones. El accent será un tono diferenciado (ámbar/dorado). Ver §7.

### 1.3 Color Psychology Cheatsheet

Útil como **justificación**, no como regla rígida. Lo relevante para este producto:

- **Azul** = confianza, calma, lógica → ideal como default para una herramienta de _disciplina_ y decisión. (Nuestro indigo actual ya acierta.)
- **Verde** = crecimiento, dinero → **reservado** para ganancias. No usar como accent de tema.
- **Rojo** = peligro/alerta → **reservado** para pérdidas y acciones destructivas. No usar como accent.
- **Púrpura** = creatividad, lujo, "premium" → buen tema opcional, refuerza el posicionamiento SaaS premium.
- **Turquesa/Teal** = calma + tecnología → excelente para reducir la carga emocional del trading.

**Conclusión de diseño:** los colores semánticos de trading (win=verde, loss=rojo, breakeven=ámbar) **son intocables y constantes en todos los temas**. El "tema" solo cambia accent + atmósfera (fondos/superficies). Esto se documenta como ley del Design System (§9).

### 1.4 Navbar móvil con FAB central

Patrón de tab-bar con **botón flotante (+) elevado en el centro**, 2 destinos a cada lado. Es el patrón móvil correcto para una acción de creación dominante.

**Adoptar directamente.** En nuestro caso el `+` central = **Quick Action "Nuevo Trade"** (la acción más frecuente del producto). Resuelve dos peticiones de la visión a la vez (navbar móvil + quick actions). Ver §6 y §8.

---

## 2. Inventario del sistema actual (verificado en código)

**Stack:** Next.js (App Router) · React · Tailwind v4 (`@theme inline`) · Radix · tRPC · Zustand · Recharts · `lucide-react` · `sonner`.

**Shell:** `AppShell.tsx` → `Sidebar` (izquierda) + `main-content` + `AiCoachDrawer` (global).

**Navegación (`Sidebar.tsx`):** 13 destinos en 4 grupos (PRINCIPAL / GESTIÓN / APRENDIZAJE / CUENTA). Tres modos por breakpoint hardcodeados vía `useWindowWidth()`:
- **Mobile (<768):** header fijo 52px + bottom-nav de 4 items + botón "Más" que abre drawer con los 7 restantes.
- **Tablet (768–1023):** rail de 52px solo-iconos, sin labels.
- **Desktop (≥1024):** sidebar 232px colapsable a 52px.

**Pantallas reales** (mapeo a la lista de auditoría pedida):

| Auditoría pedida | Implementación real | Archivo |
|---|---|---|
| Dashboard | Dashboard con 4 tabs | `app/dashboard/` (`tab-portfolio/operador/disciplina/playbook`) |
| Trades | Tabla + detail-rail 340px | `app/trades/page.tsx` |
| Accounts | Cards + detail-rail 340px | `app/cuentas/` |
| Playbook | Página (1328 líneas) | `app/playbook/page.tsx` |
| **Psychology** | = tab **Disciplina** del Dashboard | `app/dashboard/tabs/tab-disciplina.tsx` |
| Learning | Grid + right-rail fijo + drawer + 5 modales | `app/aprendizaje/` |
| Reviews | Cards + detail-rail 340px | `app/reviews/` |
| **Analytics** | repartido en tabs Portfolio/Operador | `app/dashboard/tabs/` |
| **AI** | `AiCoachDrawer` global + ajustes IA en Perfil | `components/ai-coach/`, `app/perfil/components/ai-models-card.tsx` |
| **Settings** | = Perfil (919 líneas) | `app/perfil/page.tsx` |
| Rules | Página | `app/reglas/page.tsx` |
| Markets | Página | `app/mercados/page.tsx` |
| Withdrawals | Página | `app/retiros/page.tsx` |
| (Tags) | Página | `app/etiquetas/page.tsx` |

**Hallazgo de arquitectura de información:** "Psychology", "Analytics" y "AI" — tres de los cuatro pilares del producto — **no tienen entrada de navegación propia**. Están enterrados como tabs o drawers. Esto contradice la identidad del producto. Ver §3 (Crítico) y §4.

**Sistema de tokens (`globals.css`):** OKLCH, hue base 264° (azul-violeta). Tokens: `--bg --panel --panel-2 --ink --ink-2 --ink-3 --line --line-2 --chip --accent --accent-soft --win --loss --be` + soft variants. Radius `xs/sm/(base)/lg` = 5/7/10/14px. Sombras `xs→lg`. Escala Z documentada. **Base muy buena para construir el sistema de temas.**

**Tema actual (`theme-provider.tsx` + Perfil):** mode (light/dark/system) + `accentHue` (8 opciones) + `colorScheme` (default/deuteranopia/mono). Persistido en DB vía `trpc.preferences`. **No hay** temas con nombre, paleta multi-rol, ni "restaurar".

---

## 3. Auditoría global — hallazgos clasificados

Severidad: **Critical** (rompe uso/identidad) · **Major** (fricción seria) · **Minor** (pulido) · **Enhancement** (oportunidad nueva).

### CRITICAL

- **C1 — Menú de acciones invisible en cards de aprendizaje.** `resource-card.tsx:249` usa `opacity-0 group-hover:opacity-100`. Sin hover (todo móvil/tablet, y desktop hasta pasar el cursor) las acciones Editar/Eliminar/Completar/Favorito/Enlazar setup **no existen para el usuario**. Inaccesible por teclado/táctil.
- **C2 — Tres pilares del producto sin navegación.** Psychology, Analytics y AI no son destinos. El producto se anuncia como 4-en-1 pero navega como journal con extras. Pérdida de descubrimiento y de propuesta de valor.
- **C3 — Estrangulamiento por detail-rail de 340px.** Trades/Cuentas/Reviews empujan la columna principal a `width - sidebar(232) - rail(340)`. En 1366px reales ⇒ ~794px para una tabla de trades con 8+ columnas → scroll horizontal / truncado. El panel de detalle compite con, en vez de complementar, el contenido.
- **C4 — Sistema de temas no cumple la visión.** Faltan: 4 temas predefinidos, tema personalizado multi-rol, restaurar por defecto. Es un entregable explícito.

### MAJOR

- **M1 — AI Coach poco descubrible y no persistente.** `ai-coach-drawer.tsx`: FAB azul hardcodeado (`#4f6ef7`, ignora el theme), se abre como hoja fija bottom-right 420×600, **no movible, no minimizable, no expandible**, se cierra al click-fuera perdiendo contexto visual. Para un "pilar AI Coach" es subdimensionado.
- **M2 — Sin Quick Action global de "Nuevo Trade".** La acción más frecuente solo existe dentro de `/trades`. Registrar un trade desde Dashboard/Reviews exige navegar. Fricción diaria.
- **M3 — Rail de tablet solo-iconos sin label ni tooltip de calidad.** `Sidebar.tsx` tablet: 13 iconos de 16px sin texto. Adivinanza. Botón "Más"/drawer no existe en tablet (solo móvil) → si un icono no se reconoce, no hay recuperación.
- **M4 — Colores hardcodeados que rompen theming.** `#4f6ef7` / `#3d5ce6` aparecen literales en `ai-coach-drawer.tsx`, `trades/page.tsx` (sombras), etc. Cualquier tema nuevo los ignora. Deuda que bloquea §7.
- **M5 — Inconsistencia de patrón "detalle".** Trades/Cuentas/Reviews usan push-rail; Aprendizaje usa drawer overlay **+ además** un right-rail permanente de stats (dos paneles laterales en la misma pantalla, `aprendizaje/page.tsx`). El usuario aprende reglas distintas por pantalla.
- **M6 — Sobrecarga de modales en Aprendizaje.** 5 modales (`add-edit`, `revisar`, `link-setup`, `impact`, `session-review`) + drawer + right-rail en una sola ruta. Flujos anidados, difícil saber "dónde estoy".

### MINOR

- **m1 — Toggle de tema cíclico de 3 estados** (`light→dark→system`) poco descubrible: un solo botón que cambia de icono no comunica las opciones. Finexy usa controles explícitos.
- **m2 — Jerarquía tipográfica plana.** Títulos de página 18–20px; poca distancia con cuerpo 14px. Falta el "momento héroe" (saludo/número grande) que da el aire premium.
- **m3 — Tabs de Dashboard** son un patrón de sub-nav que no se reutiliza visualmente en otras pantallas con secciones (Perfil, Playbook). Falta un componente `SegmentedTabs` común.
- **m4 — `maximumScale: 1`** en viewport (`layout.tsx`) bloquea zoom → problema de accesibilidad (WCAG 1.4.4).
- **m5 — Densidad de iconos del bottom-nav móvil** corta labels a 8 chars (`label.slice(0,8)`) → "Aprendiza", "Dashboar".

### ENHANCEMENT

- **E1 — Búsqueda global (⌘K / command palette).** Referencia Linear/Notion. Navegar + crear + buscar trades/recursos desde cualquier lado.
- **E2 — Centro de notificaciones** (límites prop-firm cerca, reviews pendientes, decay de recursos).
- **E3 — Card-héroe de métrica** en Dashboard (estilo Finexy) para Net P&L / estado de cuenta.
- **E4 — Saludo + estado emocional del día** en Dashboard.
- **E5 — Vista previa de tema en vivo** al elegir/configurar (no aplicar a ciegas).

---

## 4. Arquitectura de información propuesta

Reorganizar la navegación para que **los 4 pilares sean visibles**, sin inflar el menú.

```
PRINCIPAL
  Dashboard        (home: saludo + card-héroe + resumen)
  Trades
  Reviews

ANÁLISIS                ← grupo renombrado, eleva los pilares
  Psicología       (era tab "Disciplina" → ruta propia /psicologia)
  Analytics        (consolida tabs Portfolio/Operador → /analytics)

GESTIÓN
  Cuentas
  Playbook
  Reglas
  Mercados
  Retiros

APRENDIZAJE
  Aprendizaje

CUENTA
  Etiquetas
  Perfil           (Settings: incl. Apariencia/Temas + IA)
```

- **AI Coach** no es un ítem de menú: es **omnipresente** (panel flotante global, §5) + sus ajustes viven en Perfil. Es un compañero, no un destino.
- **Dashboard** se aligera: deja de ser contenedor de 4 tabs pesados. Portfolio/Operador → `/analytics`; Disciplina → `/psicologia`; Playbook ya tiene su ruta. El Dashboard queda como **home de visión rápida** (estilo Finexy).
- Nota: esto **no** mueve lógica de negocio, solo reubica los componentes `tab-*` a rutas. Coste bajo, valor de descubrimiento alto.

---

## 5. Paneles laterales — decisión caso por caso

Criterios (en orden): **legibilidad del contenido principal · espacio en viewport · descubrimiento · densidad de métricas**.

| Panel actual | Hoy | Decisión | Justificación |
|---|---|---|---|
| **Trade Detail** (`trades/page.tsx`, 340px push) | Rail que empuja la tabla | **Drawer overlay** (deslizante derecha, ~480px, sobre backdrop) **en <1536px**; push-rail **solo en ≥1536px** | La tabla de trades necesita su ancho. Overlay no canibaliza columnas; en monitores anchos sí cabe el rail. Misma data, layout responsivo. |
| **Account Detail** (`cuentas/`, 340px) | Rail | **Drawer overlay** ~480px | Las cards de cuenta ya reflowean a 2 cols cuando abre; mejor un overlay con todo el detalle (historial, fases, límites) que media pantalla apretada. |
| **Review Detail** (`reviews/`, 340px) | Rail | **Página completa** `/reviews/[id]` | Una review es contenido de lectura/escritura largo (narrativa + adjuntos + métricas). Merece foco total, URL compartible, y back nativo. Patrón Notion (abrir doc). |
| **Resource Right-Rail** (`aprendizaje/`, stats permanentes) | Panel fijo siempre visible | **Mover stats a cabecera/strip** + colapsable | Robar 340px permanentes para stats es caro. Un `KpiStrip` arriba + sección "Cola de repaso" colapsable libera el grid. |
| **Resource Drawer** (detalle de recurso) | Drawer overlay | **Mantener como drawer** (unificar estilo con Trade/Account drawer) | El detalle de un recurso es ligero; overlay está bien. Unificar el componente. |
| **AI Coach** (`ai-coach-drawer.tsx`) | Hoja fija bottom-right | **Panel flotante movible/minimizable/expandible** (§ propio) | Es un pilar; ver abajo. |

**Resultado:** un **único patrón "Detalle"** = `DrawerPanel` (overlay, derecha, backdrop, cierre por Esc/click-fuera/botón, ancho responsivo) reutilizado en Trades/Cuentas/Aprendizaje. Reviews escala a página. Se elimina la ambigüedad de M5 y el estrangulamiento de C3.

### AI Coach — rediseño (resuelve M1)

Reemplazar la hoja fija por un **panel flotante (floating assistant)**:

- **Estados:** `colapsado` (burbuja/FAB con badge) → `panel` (flotante, por defecto ~400×560, **arrastrable** por la cabecera, recuerda posición en `localStorage`) → `expandido` (modal-ancho ~720px para análisis largos / tablas) → `minimizado` (solo cabecera, pin a una esquina).
- **Persistencia:** no se cierra al click-fuera; cerrar es explícito. Conserva el hilo de conversación entre navegaciones de página (estado global, no por-página).
- **Theming:** elimina `#4f6ef7` hardcodeado → `var(--accent)`. Respeta el tema activo (M4).
- **Contexto:** chip "Basado en tus datos reales" + atajo para adjuntar el trade/review activo a la pregunta.
- **Móvil:** se abre como hoja inferior a pantalla casi completa (no flotante arrastrable — no tiene sentido en táctil pequeño).

**Ventajas:** descubrible, no invasivo, multitarea (consultar mientras navegas), escalable a respuestas ricas.
**Desventajas / mitigación:** un panel flotante puede tapar contenido → por eso es arrastrable + minimizable + recuerda posición; en pantallas estrechas degrada a hoja inferior.

---

## 6. Quick Actions (resuelve M2)

**FAB global "Nuevo Trade"** disponible en todas las pantallas autenticadas.

- **Desktop/tablet:** FAB circular, esquina inferior **izquierda-centro** o sobre el contenido inferior-derecho, **separado del AI Coach** para no colisionar (Coach a la derecha, Quick Action a la izquierda; o un único FAB con _speed-dial_ que despliega: Nuevo Trade · Log sesión · Nueva review · Preguntar al Coach).
- **Recomendado:** **speed-dial** (un FAB `+` que expande 3–4 acciones). Menos ruido visual, una sola ancla.
- **Acción primaria:** abre **el mismo** `RegisterTradeModal` que `/trades` (reutiliza `components/trades/register-trade-modal`, sin duplicar flujo) — pre-selecciona cuenta activa.
- **Atajo de teclado:** `N` para nuevo trade, `⌘K` para command palette (E1).
- **Móvil:** el `+` **es el botón central del tab-bar** (§ navbar móvil). No hay FAB suelto en móvil — se integra en la navegación.

---

## 7. Navbar móvil (resuelve referencia + M5 móvil)

Adoptar el patrón de la referencia: **tab-bar con FAB central elevado**.

```
┌───────────────────────────────────────────────┐
│   [Dashboard] [Trades]   (+)   [Análisis] [Más] │
│      ▢          ▤        ⊕        ◳        ⋯     │
└───────────────────────────────────────────────┘
                       ▲
              FAB elevado = Quick Action
              (tap: Nuevo Trade · long-press/▲: speed-dial)
```

- **4 destinos + FAB central:** Dashboard · Trades · **(+)** · Análisis(Psicología/Analytics) · Más.
- **FAB central `+`:** acción dominante = Nuevo Trade. Long-press o swipe-up → speed-dial (Log sesión, Nueva review, Coach).
- **AI Coach en móvil:** accesible desde el speed-dial del `+` **y** como acción en "Más". No ocupa un slot fijo del tab-bar (no es navegación, es asistente).
- **"Más":** abre el drawer inferior existente (ya implementado en `Sidebar.tsx`) con las secciones restantes — mantener, mejorar el grid.
- **Labels:** eliminar `label.slice(0,8)` (m5); usar nombres cortos definidos por ítem ("Análisis", no "Aprendiza").
- **Header móvil:** mantener 52px; añadir acceso a búsqueda (E1) y notificaciones (E2) en vez de solo theme+avatar.

**Por qué este patrón:** convierte la acción #1 en gesto de un toque desde cualquier pantalla, alinea con expectativas móviles (Instagram/Twitter compose), y resuelve "integración de Nuevo Trade + Chat IA en navbar" que pide la visión.

---

## 8. Sistema de temas (resuelve C4)

Modelo de tokens de tres capas, sin romper lo existente:

```
Capa 1  Paleta cruda (por tema)     →  --t-base, --t-surface, --t-accent, --t-contrast …
Capa 2  Tokens semánticos (app)     →  --bg, --panel, --ink, --accent …  (ya existen)
Capa 3  Tokens reservados de dominio →  --win, --loss, --be  (CONSTANTES, nunca los pisa un tema)
```

**Ley de diseño:** un "tema" cambia **Capa 1→2** (atmósfera + accent). **Nunca** toca la Capa 3 (win/loss/be), porque en trading verde=ganancia y rojo=pérdida son semántica funcional, no estética.

### 8.1 Temas predefinidos (los 4 de la visión)

| # | Nombre | Accent | Atmósfera | Origen | Notas |
|---|---|---|---|---|---|
| **1** | **Indigo** (default) | azul-violeta 264° | neutro frío actual | Tema actual | Confianza/lógica (psicología del color). Mantener como default. |
| **2** | **Violeta** | `#60519b` | grises azulados profundos | Purple Noguchi | "Premium/creativo". Refuerza posicionamiento SaaS. |
| **3** | **Turquesa** | `#00a6c0` | azul petróleo `#283b48` | Turquoise Noguchi | Calma + tech; baja la carga emocional del trading. |
| **4** | **Carmesí** | **ámbar/dorado** (NO rojo) | superficies `#19171b`/`#2b0307` | Red Noguchi | El rojo va a **fondo/atmósfera**; accent dorado evita choque con `--loss`. |

Cada tema define variantes **clara y oscura** (8 combinaciones). Implementación: `data-theme="violeta"` en `<html>` + bloque de tokens por tema en `globals.css`, multiplicado por `.dark`.

### 8.2 Tema personalizado (desde Perfil → Apariencia)

Ampliar el actual `accentHue` a una paleta de roles:

- **Primario** (accent / acciones)
- **Secundario** (acentos de apoyo, charts)
- **Terciario** (superficies destacadas)
- **Accent/Highlight** (card-héroe, badges)
- **Estados** — **solo permitir ajustar el _tono_ de win/loss/be dentro de rangos seguros** (p.ej. variar verde/rojo por daltonismo), con advertencia: no se permite invertir ni neutralizar su semántica. Esto integra el modo daltónico existente (`colorScheme`).

UI: selectores de color con **vista previa en vivo** (E5) sobre una mini-maqueta (card + botón + tabla + win/loss). Validación de **contraste WCAG AA** en tiempo real (rechaza combinaciones ilegibles). Persistencia en `trpc.preferences` (extender esquema actual de `accentHue`).

### 8.3 Restaurar valores por defecto

Botón "Restaurar tema por defecto" → limpia overrides custom y `data-theme`, vuelve a **Indigo / system**. Ya hay precedente: `theme-provider.tsx` hace `root.style.removeProperty('--accent')`. Extender a todos los roles.

### 8.4 Deuda previa obligatoria (M4)

Antes de los temas: **eliminar todos los colores hardcodeados** (`#4f6ef7`, `#3d5ce6`, etc.) y reemplazar por `var(--…)`. Grep de control:
`#4f6ef7 | #3d5ce6 | rgba(79,110,247` en `ai-coach-drawer.tsx`, `trades/page.tsx`, y cualquier otro. Sin esto, ningún tema se ve completo.

---

## 9. Design System — refinamiento

Mantener la base OKLCH (excelente) y añadir/normalizar:

### 9.1 Tokens nuevos / ajustes
- **Radius:** subir `--radius-lg` a 16px y añadir `--radius-xl: 20px` para cards-héroe (estética Finexy), conservando `xs/sm/base` para densidad de datos.
- **Separación bg/panel:** aumentar levemente el delta de luminosidad entre `--bg` y `--panel` para que la elevación se lea sin sombras duras.
- **Reservados de dominio:** documentar formalmente `--win/--loss/--be` como **inmutables por tema** (comentario-ley en `globals.css`).
- **Accent escala:** `--accent`, `--accent-h` (hover), `--accent-soft`, **+ `--accent-contrast`** (texto sobre accent) para garantizar AA en todos los temas.

### 9.2 Componentes a estandarizar
- **`DrawerPanel`** — patrón único de detalle overlay (reemplaza los 3 push-rails). Props: `width`, `side`, `onClose`, breakpoint a hoja inferior en móvil.
- **`SegmentedTabs`** — extraer el patrón de tabs del Dashboard a `components/ui/` y reutilizar en Perfil/Playbook (m3).
- **`PageHeader`** — evolucionar `TopBar` con variante "héroe" (saludo + número grande + acciones) para Dashboard.
- **`ActionMenu`** — menú `···` **siempre visible** (no `opacity-0`), con tamaño táctil ≥40px, navegable por teclado (corrige C1). Reemplaza el patrón hover-only en cards.
- **`KpiHero`** — card de métrica acentuada (E3).
- **`CommandPalette`** (⌘K) y **`NotificationCenter`** (E1/E2) como nuevos primitivos.
- **`ThemePreview`** — mini-maqueta para §8.2.
- **`FloatingAssistant`** — contenedor movible/minimizable para el AI Coach (§5).
- **`SpeedDial`** — FAB con acciones (§6).

### 9.3 Reglas de accesibilidad
- Botón táctil mínimo 40×40px (corrige C1/M3).
- Quitar `maximumScale: 1` del viewport (m4).
- Mantener el `:focus-visible` global (ya existe, bueno).
- Contraste AA garantizado por validación en temas custom (§8.2).
- Toda acción descubrible sin hover (no `opacity-0 group-hover`).

---

## 10. Cambios por pantalla

> Severidad entre paréntesis. "→" = cambio propuesto.

- **Dashboard** (m2, E3, E4) → Convertir en **home de visión rápida**: `PageHeader` héroe con saludo + fecha + estado emocional del día → fila de `KpiHero` (Net P&L del periodo como card-héroe acentuada) → resumen de cuentas/alertas prop-firm → actividad reciente. Mover los tabs pesados a rutas (§4).
- **Trades** (C3) → Tabla a ancho completo; `TradeDetailPanel` pasa a `DrawerPanel` overlay (push-rail solo ≥1536px). Quick Action ya cubre "registrar".
- **Reviews** (C3) → Detalle a **página `/reviews/[id]`**. Lista + creación se quedan; el rail desaparece.
- **Cuentas** (C3) → `AccountDetailPanel` → `DrawerPanel` overlay. Grid de cards a ancho completo.
- **Playbook** (m3) → Es la pantalla más grande (1328 líneas); aplicar `SegmentedTabs` común y revisar densidad. Auditoría de detalle propia en fase posterior.
- **Psicología** (C2) → Nueva ruta `/psicologia` desde `tab-disciplina`. Entrada de menú propia. Card-héroe de "disciplina score" + emociones/FOMO/revancha.
- **Analytics** (C2) → Nueva ruta `/analytics` consolidando Portfolio + Operador. Entrada de menú propia.
- **Aprendizaje** (C1, M5, M6) → **Prioridad alta.** Menú `···` siempre visible (`ActionMenu`); right-rail de stats → `KpiStrip` superior + sección colapsable; auditar los 5 modales (¿cuáles a drawer/inline?); drawer de detalle unificado con `DrawerPanel`.
- **Reglas / Mercados / Retiros / Etiquetas** → Pantallas más simples; aplicar `PageHeader`, `ActionMenu` visible, y revisión responsive (overflow de tablas). Sin cambios estructurales mayores.
- **Perfil (Settings)** (C4) → Nueva sección **Apariencia** completa: 4 temas predefinidos (con preview), tema personalizado multi-rol, restaurar por defecto, modo daltónico integrado. Mantener ajustes de IA.
- **AI (global)** (M1) → `FloatingAssistant` movible/minimizable/expandible; theming correcto.

---

## 11. Cambios responsive

| Breakpoint | Hoy | Propuesta |
|---|---|---|
| **Móvil <768** | Bottom-nav 4 + "Más"; detail panels fixed; labels cortados | Tab-bar con **FAB central** (§7); detalles como hoja inferior; labels propios; búsqueda/notif en header |
| **Tablet 768–1023** (M3) | Rail 52px **solo iconos sin label** | Rail con **labels al hover/expandible**, o reusar el patrón móvil "Más"; tooltips de calidad; detalles overlay |
| **Laptop 1024–1535** (C3) | Sidebar 232 + push-rail 340 → main estrangulado | Detalles = **overlay**, no push; main a ancho completo |
| **Desktop ≥1536** | igual | Push-rail permitido (cabe); opción de layout 3 columnas |

Reglas transversales: tablas con scroll-x contenido + columnas prioritarias en móvil; ninguna acción solo-hover; áreas táctiles ≥40px; verificar overflow en Mercados/Retiros/Playbook.

---

## 12. Roadmap de implementación (fases, no implementar aún)

> Orden por dependencia y riesgo. Cada fase es aprobable/entregable por separado.

- **Fase 0 — Higiene de tokens (M4).** Eliminar colores hardcodeados → `var()`. Documentar reservados de dominio. *Bloqueante para temas.* Riesgo bajo.
- **Fase 1 — Sistema de temas (C4).** 4 temas predefinidos + custom multi-rol + restaurar + preview en Perfil. Riesgo medio.
- **Fase 2 — Acciones visibles + componente Detalle (C1, C3, M5).** `ActionMenu` visible, `DrawerPanel` unificado, migrar Trades/Cuentas/Aprendizaje; Reviews → página. Riesgo medio.
- **Fase 3 — Navegación + pilares (C2).** Reorganizar IA de navegación, rutas `/psicologia` y `/analytics`, navbar móvil con FAB, Quick Action / speed-dial. Riesgo medio.
- **Fase 4 — AI Coach flotante (M1).** `FloatingAssistant`. Riesgo medio.
- **Fase 5 — Momentos premium + enhancements (E1–E5, m*).** Dashboard héroe, command palette, notificaciones, pulidos. Riesgo bajo, alto valor percibido.

---

## 13. Principios de diseño (north star)

1. **Datos densos, marco con aire.** La tabla de trades es densa a propósito; el _alrededor_ (header, cards, navegación) respira como Linear/Stripe.
2. **Win=verde, Loss=rojo, siempre.** La semántica de trading manda sobre cualquier tema.
3. **Nada se esconde tras hover.** Toda acción es descubrible en táctil y teclado.
4. **Un solo patrón por intención.** Un patrón de "detalle", uno de "tabs", uno de "menú de acciones".
5. **El AI Coach acompaña, no interrumpe.** Persistente, movible, opt-in.
6. **La acción #1 (Nuevo Trade) está a un toque** desde cualquier pantalla.
7. **Premium = jerarquía + consistencia + calma**, no decoración.

---

*Fin del plan maestro. Próximo paso sugerido: aprobar Fases 0–1 para comenzar por la higiene de tokens y el sistema de temas (entregable explícito de la visión), sin tocar todavía navegación ni paneles.*
