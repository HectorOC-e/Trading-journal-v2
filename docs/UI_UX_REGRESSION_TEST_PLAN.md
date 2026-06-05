# UI/UX Regression Test Plan — Trading Journal v2

> Plan de pruebas de regresión para el rediseño UI/UX. Fecha: 2026-06-05.
> Cubre Fases 0–4 implementadas. Marca: [ ] pendiente · [x] pasa · [!] falla.
> Breakpoints de referencia: **Móvil** <768 · **Tablet** 768–1023 · **Laptop** 1024–1535 · **Desktop** ≥1536.

---

## 0. Build & datos

- [ ] `prisma generate && next build` compila sin errores de tipo.
- [ ] `eslint` sin errores (revisar `no-unused-vars`).
- [ ] Migración `20260605120000_add_color_theme_preferences.sql` aplica limpia (y es idempotente al re-aplicar).
- [ ] `user_preferences` tiene columnas `color_theme` (default `indigo`) y `custom_theme` (nullable).

## 1. Sistema de temas (Fase 1)

- [ ] Perfil → Apariencia muestra 4 temas (Indigo, Violeta, Turquesa, Carmesí) con swatch + descripción.
- [ ] Seleccionar **Violeta** cambia accent y atmósfera en toda la app inmediatamente.
- [ ] Seleccionar **Turquesa** y **Carmesí** aplican correctamente en claro y en oscuro.
- [ ] **Carmesí**: el accent es dorado (no rojo). Botones primarios NO se confunden con estados de pérdida.
- [ ] **win/loss/be** (verde/rojo/ámbar) permanecen idénticos en los 4 temas (verificar una card de P&L positivo y uno negativo).
- [ ] Tema personalizado: elegir un color primario aplica accent + accentSoft; persiste como `custom`.
- [ ] **Restaurar por defecto** vuelve a Indigo, limpia vars inline y `tj-custom-theme`.
- [ ] Recargar la página mantiene el tema elegido (DB) **sin flash** de tema incorrecto.
- [ ] Logout/login con otra cuenta carga su propio tema (persistencia por usuario).
- [ ] Texto sobre accent legible (contraste) en temas con accent claro en modo oscuro (Turquesa/Carmesí oscuro).

## 2. Acciones visibles (Fase 2 · C1)

- [ ] **Aprendizaje**: el menú `···` de cada card es **visible sin hover** en desktop.
- [ ] Aprendizaje en **móvil/tablet (táctil)**: el `···` se puede tocar y abre el menú (Editar/Completar/Favorito/Archivar/Vincular/Eliminar).
- [ ] El menú cierra al hacer click fuera y al elegir una acción.
- [ ] **Reviews mensuales**: editar (✎) y eliminar (×) visibles y operables en móvil.
- [ ] Navegación por teclado: el botón `···` es enfocable y operable con Enter/Espacio.

## 3. DrawerPanel — detalle (Fase 2 · C3)

- [ ] **Trades** (laptop 1366px): la tabla ocupa el ancho completo (no estrangulada). Al seleccionar un trade abre overlay derecho ~460px sobre backdrop, sin reflow de la tabla.
- [ ] Cerrar con Esc, click en backdrop y botón de cierre del panel.
- [ ] Trades en **móvil**: el detalle es hoja inset entre header (52px) y navbar (60px), scrollea, no tapa la navegación.
- [ ] **Cuentas**: seleccionar una cuenta abre el mismo overlay; grid a ancho completo; acciones (editar/archivar/historial/promover/lock) funcionan desde el drawer.
- [ ] Body scroll bloqueado mientras el drawer está abierto; restaurado al cerrar.
- [ ] Abrir/cerrar drawer no deja el `overflow` del body pegado.

## 4. Navegación & pilares (Fase 3 · C2)

- [ ] Sidebar desktop muestra grupo **ANÁLISIS** con Psicología y Analytics.
- [ ] `/psicologia` carga y renderiza métricas de disciplina con selector de periodo.
- [ ] `/analytics` carga y alterna entre vistas **Portfolio** y **Operador** + selector de periodo.
- [ ] Los selectores de periodo en ambas rutas actualizan los datos.
- [ ] Estados activos del sidebar resaltan la ruta correcta para `/psicologia` y `/analytics`.
- [ ] Tablet: rail de iconos incluye los nuevos destinos sin romper layout.

## 5. Navbar móvil con FAB central (Fase 3)

- [ ] En móvil el navbar muestra: Dashboard · Trades · **(+)** · Analytics · Más.
- [ ] El FAB central `+` abre el flujo **Nuevo Trade** (RegisterTradeModal).
- [ ] Labels completos (sin truncar): "Analytics", "Dashboard".
- [ ] "Más" abre el drawer inferior con el resto de secciones (Reviews, Psicología, Cuentas, Playbook, Reglas, Mercados, Aprendizaje, Retiros, Etiquetas, Perfil) y badge de activo.
- [ ] El FAB no tapa contenido al final de la página (padding inferior suficiente).
- [ ] El contenido del detalle (drawer) no queda oculto tras el navbar.

## 6. Quick Actions globales (Fase 3 · M2)

- [ ] Desktop: speed-dial FAB visible (abajo-derecha) en todas las pantallas; expande 3 acciones.
- [ ] "Nuevo trade" desde el speed-dial abre RegisterTradeModal **en cualquier pantalla** (probar desde Dashboard, Reviews, Perfil).
- [ ] Registrar un trade desde el modal global lo crea y refresca listas/stats; muestra toast.
- [ ] Atajo de teclado **`N`** abre Nuevo Trade (y NO se dispara mientras se escribe en un input/textarea).
- [ ] El speed-dial FAB y el launcher del AI Coach **no se solapan** (apilados verticalmente a la derecha).
- [ ] En móvil no aparece el speed-dial (se usa el FAB del navbar).

## 7. AI Coach flotante (Fase 4 · M1)

- [ ] El launcher (burbuja) usa el color de accent del tema activo.
- [ ] Abrir → panel flotante. **Arrastrar por la cabecera** lo reposiciona (desktop).
- [ ] La posición persiste tras recargar (`tj-coach-pos`).
- [ ] **Expandir** ensancha a ~720px; **Minimizar** colapsa a la barra de cabecera; restaurar vuelve al panel.
- [ ] Click fuera del panel **NO** lo cierra; sólo el botón ✕ cierra.
- [ ] El hilo de conversación se conserva al navegar entre páginas.
- [ ] Burbujas de usuario usan accent + accent-contrast (legibles en todos los temas).
- [ ] Móvil: se abre como hoja inferior (sin arrastre); input enfocable; no tapado por el navbar.
- [ ] Sin API key configurada, muestra el mensaje de "Configuración pendiente" apuntando a Perfil → Configuración de IA.

## 8. Regresión general (no romper lo existente)

- [ ] Login/logout funcionan; `/login` no muestra shell/navegación.
- [ ] Dashboard (4 tabs) sigue funcionando igual que antes.
- [ ] Registrar/editar/cerrar/borrar trade desde `/trades` sigue OK.
- [ ] Playbook, Reglas, Mercados, Retiros, Etiquetas cargan sin errores de layout.
- [ ] Cambio de modo claro/oscuro/sistema sigue funcionando junto al nuevo selector de paleta.
- [ ] Modo daltónico (Perfil) sigue aplicándose.
- [ ] PWA/service worker registra sin errores en consola.
- [ ] Sin errores de hidratación en consola (especialmente por el script `theme-init`).

## 8b. Fase 5 — Command palette, hero, zoom

- [ ] **⌘K** (macOS) / **Ctrl+K** (Win/Linux) abre la paleta de comandos desde cualquier pantalla.
- [ ] Escribir filtra; ↑/↓ navegan; Enter ejecuta; Esc cierra; click en backdrop cierra.
- [ ] "Nuevo trade" en la paleta abre el RegisterTradeModal.
- [ ] Cada destino navega a su ruta correcta (incl. /psicologia, /analytics, Perfil).
- [ ] **Dashboard**: header muestra saludo según hora + fecha; card héroe de Net P&L coloreada (verde si ≥0, rojo si <0) con win rate y nº trades; botón PDF funciona.
- [ ] **Zoom**: en móvil se puede hacer pinch-zoom (ya no bloqueado por `maximumScale`).

## 8c. Backlog final — notificaciones, tabs, charts

- [ ] **Campana de notificaciones** visible en sidebar (desktop/tablet) y header móvil; muestra badge con nº de alertas.
- [ ] Con una cuenta bloqueada → aparece notificación "X bloqueada" que enlaza a /cuentas.
- [ ] Con reviews vencidas/pendientes → aparecen notificaciones que enlazan a /aprendizaje.
- [ ] Sin alertas → estado "Todo al día".
- [ ] El dropdown cierra al click-fuera y al navegar.
- [ ] **SegmentedTabs**: tabs del Dashboard (underline) y toggle Semanales/Mensuales de Reviews (pill) funcionan igual que antes; indicador activo correcto.
- [ ] **Charts** del Dashboard (disciplina/operador/portfolio/playbook): las series azules ahora usan el accent del tema (cambian al cambiar de tema).

## 9. Accesibilidad

- [ ] `:focus-visible` muestra anillo de accent en elementos interactivos nuevos (FABs, menú `···`, drawer).
- [ ] Targets táctiles ≥ ~40px en menús de card, navbar y FABs.
- [ ] Drawer y modales tienen `role="dialog"`/`aria-modal` y se cierran con Esc.
- [ ] Contraste AA de texto sobre accent en los 8 (tema×modo) combos.

---

### Matriz de smoke test por dispositivo

| Pantalla | Móvil | Tablet | Laptop | Desktop |
|---|---|---|---|---|
| Dashboard | [ ] | [ ] | [ ] | [ ] |
| Trades + drawer | [ ] | [ ] | [ ] | [ ] |
| Cuentas + drawer | [ ] | [ ] | [ ] | [ ] |
| Aprendizaje (menú ···) | [ ] | [ ] | [ ] | [ ] |
| /psicologia | [ ] | [ ] | [ ] | [ ] |
| /analytics | [ ] | [ ] | [ ] | [ ] |
| Perfil (temas) | [ ] | [ ] | [ ] | [ ] |
| AI Coach | [ ] | [ ] | [ ] | [ ] |
| Quick Actions | [ ] | [ ] | [ ] | [ ] |
| Navbar móvil/FAB | [ ] | — | — | — |
