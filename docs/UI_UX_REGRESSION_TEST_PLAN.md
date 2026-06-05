# UI/UX Regression Test Plan — Post-Transformation

**Fecha:** 2026-06-04  
**Versión:** 1.0  
**Navegadores:** Firefox 126+, Chrome 124+  
**Dispositivos:** Desktop (1440px), Tablet (768px), iPhone 15 Pro Max

---

## T1 — Foundation (globals.css)

| ID | Check | Método |
|---|---|---|
| F-01 | Radius de cards es 12px (no 14px) | Inspect Element |
| F-02 | Shimmer animation visible en skeleton screens | Visual |
| F-03 | `prefers-reduced-motion` desactiva animaciones | DevTools → Emulate |
| F-04 | Scrollbar usa 6px custom style | Visual |
| F-05 | Selección de texto usa colores del brand | Seleccionar texto |
| F-06 | `fade-in` animation visible en login card | Observar recarga |
| F-07 | Dark mode — todas las sombras más oscuras | Toggle tema |
| F-08 | Metric values no cambien de ancho al actualizar (tabular nums) | Comparar antes/después de nueva data |

---

## T2 — Button

| ID | Check | Método |
|---|---|---|
| B-01 | Click en botón primary muestra `active:scale(0.97)` | Click rápido |
| B-02 | `Button loading={true}` muestra spinner y deshabilita | Testear en form submit |
| B-03 | Focus visible (ring azul) al navegar con Tab | Teclado |
| B-04 | Botón disabled tiene `opacity-40` y no es clickable | Inspect + click |
| B-05 | Variante `subtle` usa `bg-[var(--chip)]` | Visual |
| B-06 | Tamaño `xs` tiene altura 24px | Inspect |

---

## T3 — Input / Textarea

| ID | Check | Método |
|---|---|---|
| I-01 | Focus en input muestra ring azul 2px | Click en campo |
| I-02 | Hover en input cambia border a `--line-2` | Hover |
| I-03 | `error` prop cambia border a `--loss` color | Inspect component |
| I-04 | Input height es 32px (h-8) | Inspect |
| I-05 | Textarea puede redimensionarse verticalmente | Drag esquina |
| I-06 | Placeholder text es `--ink-3` | Visual |

---

## T4 — Skeleton

| ID | Check | Método |
|---|---|---|
| SK-01 | Skeleton tiene shimmer (sweep de izquierda a derecha) | Visual |
| SK-02 | Skeleton no es anunciado por screen reader | `aria-hidden=true` en Inspect |
| SK-03 | `SkeletonTableRows` muestra filas con border-bottom | Visual |
| SK-04 | Shimmer pausa con `prefers-reduced-motion` | DevTools emulate |

---

## T5 — KpiCard

| ID | Check | Método |
|---|---|---|
| K-01 | Valor numérico tiene siempre 22px — no cambia con viewport | Resize ventana |
| K-02 | Números en KpiCard no saltan horizontalmente al cambiar datos | Comparar antes/después |
| K-03 | KpiCard clickable muestra hover border | Hover |
| K-04 | Icon en KpiCard alineado correctamente | Visual |

---

## T6 — Sidebar (Desktop)

| ID | Check | Método |
|---|---|---|
| S-01 | Sin emojis — toggle usa icono Sun/Moon/Monitor | Visual |
| S-02 | Sección "PRINCIPAL" tiene Dashboard, Trades, Reviews | Visual |
| S-03 | Sección "GESTIÓN" tiene Cuentas, Playbook, Reglas, Mercados | Visual |
| S-04 | Link activo tiene `aria-current="page"` | Inspect |
| S-05 | Sidebar colapsable — hover en link colapsado muestra tooltip | Hover |
| S-06 | Logout button tiene hover en rojo | Hover |
| S-07 | User email mostrado (no "Héctor O.C." hardcodeado) | Visual |

---

## T7 — Sidebar (Mobile)

| ID | Check | Método |
|---|---|---|
| SM-01 | Bottom nav muestra 4 items + "Más" | Visual 375px |
| SM-02 | "Más" drawer se abre desde abajo | Click Más |
| SM-03 | Logout accesible en "Más" drawer | Abrir drawer |
| SM-04 | Click fuera del drawer lo cierra | Click overlay |
| SM-05 | Bottom nav items tienen `aria-label` | Inspect |
| SM-06 | Items del drawer usan estilos actualizados (no inline hardcoded) | Visual |

---

## T8 — Login page

| ID | Check | Método |
|---|---|---|
| L-01 | Logo usa TrendingUp Lucide (no emoji 📈) | Visual |
| L-02 | Label tiene `for` attribute ligado al input id | Inspect |
| L-03 | Password toggle funciona (show/hide) | Click ojo |
| L-04 | Error muestra icon AlertCircle + `role="alert"` | Credenciales incorrectas |
| L-05 | Submit loading muestra spinner | Click submit |
| L-06 | Submit disabled si email o password vacíos | Dejar campos vacíos |
| L-07 | `autocomplete="email"` en campo email | Inspect |
| L-08 | `.fade-in` animation visible en card | Reload |

---

## T9 — EmptyState

| ID | Check | Método |
|---|---|---|
| E-01 | Trades sin registros muestra EmptyState con acción | Cuenta sin trades |
| E-02 | EmptyState con `secondary` muestra 2 botones | Visual |
| E-03 | EmptyState `size="sm"` tiene padding reducido | Visual |
| E-04 | `fade-in` animation al aparecer | Visual |

---

## T10 — Dialog

| ID | Check | Método |
|---|---|---|
| D-01 | Dialog tiene border-radius 16px | Inspect |
| D-02 | Backdrop tiene blur visible | Abrir cualquier modal |
| D-03 | Botón X tiene `aria-label="Cerrar"` | Inspect |
| D-04 | Escape key cierra el dialog | Abrir → Esc |
| D-05 | Dialog entry animation es suave (scale+fade) | Visual |
| D-06 | Shadow del dialog es más profunda que cards | Visual |

---

## T11 — FilterBar

| ID | Check | Método |
|---|---|---|
| FB-01 | Chip activo tiene sombra subtle | Visual |
| FB-02 | `active:scale-[0.97]` al click | Click rápido |
| FB-03 | Chip con `count` muestra conteo | Reviews/Cuentas |

---

## T12 — AccountCard

| ID | Check | Método |
|---|---|---|
| AC-01 | Hover cambia border a `--line-2` | Hover |
| AC-02 | Card seleccionada tiene accent ring + shadow | Click |
| AC-03 | `Tab` selecciona la card, `Enter` la activa | Teclado |
| AC-04 | `focus-visible` ring visible en teclado | Teclado |

---

## T13 — Responsive general

| ID | Check | Método |
|---|---|---|
| R-01 | Sin scroll horizontal en ninguna pantalla (375px) | DevTools mobile |
| R-02 | Modales no overflow en mobile | Abrir modal en móvil |
| R-03 | KPI strip en 2 columnas en mobile | 375px |
| R-04 | TopBar acciones en segunda línea en mobile | 375px |
| R-05 | Sidebar tablet: todos los items visibles | 768px |
| R-06 | Main content padding correcto en 1440px (28px→36px) | 1440px |

---

## T14 — Accesibilidad crítica

| ID | Check | Método |
|---|---|---|
| A-01 | Contraste ink vs bg ≥ 7:1 (WCAG AAA target) | DevTools → Accessibility |
| A-02 | Contraste ink-2 vs bg ≥ 4.5:1 | DevTools → Accessibility |
| A-03 | Todos los iconos standalone tienen aria-label/title | Screen reader |
| A-04 | Navegación completa con Tab en cada pantalla | Teclado |
| A-05 | Focus no queda atrapado en modales (trap correcto) | Teclado |
| A-06 | Skip link funcional (si existe) | Teclado |
| A-07 | Toasts anunciados por screen reader | aria-live region |

---

## T15 — Dark mode

| ID | Check | Método |
|---|---|---|
| DM-01 | Toggle tema funciona en todas las pantallas | Toggle |
| DM-02 | Sin texto legibilidad issues en dark mode | Visual |
| DM-03 | Shimmer skeleton visible en dark mode | Visual |
| DM-04 | Dialog backdrop visible en dark mode | Abrir modal |
| DM-05 | Gráficos legibles en dark mode | Dashboard |

---

## Criterio de aprobación

- **PASA:** 0 bloqueantes (A-01 a A-04, R-01, T8, S-01)  
- **CONDICIONAL:** ≤3 issues menores documentados
- **FALLA:** Cualquier bloqueante no resuelto
