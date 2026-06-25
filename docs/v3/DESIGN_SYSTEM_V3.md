# DESIGN_SYSTEM_V3.md
### Trading Journal v3 — Sistema de Diseño

> Documento 3/8. **Evoluciona** los tokens/temas existentes (`globals.css`, paletas) — no reescritura.
> Inspiración explícita: **Linear** (densidad y jerarquía), **Raycast** (command + velocidad), **Vercel** (claridad), **Emil Kowalski / Motion** (animación con propósito), **Arc/Notion** (estructura), **Stripe** (precisión de datos numéricos).

---

## 1. Principios de diseño (no negociables)
1. **Función sobre decoración.** Toda pantalla resuelve una tarea; todo gráfico produce una decisión; todo insight termina en una acción.
2. **El dato es la interfaz.** Números tabulares, jerarquía tipográfica clara, color = significado (no estética).
3. **Velocidad percibida.** ⌘K en todo; optimistic UI; skeletons que respetan el layout final.
4. **Calma por defecto, urgencia cuando importa.** La intervención del coach es la única interrupción permitida, y solo ante riesgo real.
5. **Motion con intención** (Emil Kowalski): la animación explica un cambio de estado o dirige la atención; nunca adorna. Respeta `prefers-reduced-motion`.

---

## 2. Spacing
Escala base **4px** (ya en uso vía Tailwind). Tokens semánticos nuevos:

| Token | px | Uso |
|---|---|---|
| `--space-0` | 0 | reset |
| `--space-1` | 4 | gaps internos de chips/iconos |
| `--space-2` | 8 | gap de elementos relacionados |
| `--space-3` | 12 | padding de celdas/inputs |
| `--space-4` | 16 | padding de tarjeta estándar |
| `--space-5` | 20 | padding de panel |
| `--space-6` | 24 | separación de secciones (densidad Linear) |
| `--space-8` | 32 | separación de bloques mayores |
| `--space-12` | 48 | aire de cabeceras de superficie |

**Densidad:** las superficies de datos (ANALIZAR, OPERAR) usan densidad alta (Linear); HOY usa densidad media (respiración, foco). Densidad configurable a futuro (no v3.0).

---

## 3. Grid & layout
- **Shell:** sidebar de superficies (icono+label) · contenido · rail contextual derecho opcional (coach/acciones). Patrón ya presente (`shell-with-rail`), se generaliza.
- **Contenedor de contenido:** `max-w` por superficie — HOY 1080px (foco), ANALIZAR 1320px (densidad), OPERAR full con rail.
- **Grid de tarjetas:** 12 columnas implícitas; KPIs en `repeat(auto-fit, minmax(180px,1fr))`.
- **Workspace de 2 columnas** (banda full-width + rail sticky) — patrón validado en el rediseño de Reviews, se estandariza para superficies con resumen + detalle.

---

## 4. Tipografía
- **UI/Sans:** la actual (sistema/Inter-like). **Datos numéricos:** mono tabular (`JetBrains Mono`, `tnum` — ya forzado en `.font-mono`/`.num`). **Editorial (títulos de review/edición):** `Newsreader` (ya importado).

| Rol | Size | Weight | Notas |
|---|---|---|---|
| Display (hero superficie) | 26–32 | 800 | tracking −0.025em |
| H1 superficie | 20 | 700 | |
| H2 sección | 16 | 600 | |
| Body | 13–14 | 400–500 | |
| Caption/eyebrow | 10–11 | 600 | uppercase, tracking 0.10em |
| Dato KPI | 16–26 | 700 | mono tabular |
| Dato denso (tabla) | 12–13 | 500 | mono tabular |

Regla: **todo número financiero usa tabular-nums** para evitar saltos de layout (ya es política del repo).

---

## 5. Color (semántica, sobre tokens existentes)
Se conservan `--bg/--panel/--panel-2/--ink*/--line/--accent/--win/--loss/--be` + `*-soft`. Se añaden roles:

| Rol nuevo | Mapea a | Uso |
|---|---|---|
| `--coach` | accent variante | superficie/acentos del coach |
| `--intervene` | loss/ámbar alto | capa de intervención (la única "alarma") |
| `--commit` | accent/win | compromisos activos |
| `--regime-trend` / `--regime-range` | 2 tonos neutros | etiquetas de régimen |
| `--reinforce` | win-soft | refuerzo positivo |

**Daltonismo:** color nunca es el único portador de significado — siempre acompañado de icono/texto (WCAG 1.4.1).

---

## 6. Elevación
Escala de sombras existente (`--shadow-lg`) + niveles semánticos:

| Nivel | Uso |
|---|---|
| e0 (flat, solo `--line`) | tablas, listas densas |
| e1 (sombra sutil) | tarjeta en reposo |
| e2 (hover) | tarjeta interactiva |
| e3 (`--shadow-lg`) | popovers, command palette |
| e4 (overlay + blur backdrop) | **intervención del coach** (máxima jerarquía) |

---

## 7. Motion (Emil Kowalski / Motion)
- **Curvas:** `--ease-out` (entradas), `ease-in-out` (cambios de estado), spring suave para elementos arrastrables. Existe `EASE_OUT` en `lib/motion`.
- **Duraciones:** 120ms (micro: hover, tap), 160–200ms (popover), 300–400ms (entrada de panel/sección), 1.7s (draw-on del sparkline, ya implementado).
- **Reglas:**
  - La animación **comunica causa→efecto** (un insight que se convierte en compromiso "vuela" a la lista de compromisos).
  - **Stagger** para listas que aparecen (ya en Reviews timeline).
  - **Nunca** animar más de lo necesario; `prefers-reduced-motion` desactiva opacidad/transform (ya soportado vía `MotionConfig`).
  - **Intervención:** entra con un "settle" deliberado (no rebote juguetón) — debe sentirse serio.

---

## 8. Patrones de interacción base
- **Command palette ⌘K** (Raycast): acciones globales, navegación a superficies, "preguntar al coach".
- **Entrada rápida** (Linear): registrar trade / crear compromiso desde cualquier sitio.
- **Optimistic mutations** con rollback (ya patrón tRPC + toasts).
- **Filtros como chips** persistentes (ya en Trades/Reviews).
- **Tablas potentes:** sort por columna, filtro por faceta, row→detail panel (patrón existente, se estandariza).
- **Inline edit** para campos derivados (sesión/riskPct) — editable pero pre-rellenado.

---

## 9. Patrones de interacción de IA (Claude / Cursor / ChatGPT / Perplexity)
- **Streaming con transparencia de tools:** chips "consultó X" mientras el coach razona (ya implementado vía framing NUL en `coach-agent`). Se mantiene y se estiliza.
- **Respuesta accionable:** toda respuesta del coach que implique un cambio ofrece **botones de acción** (crear regla/compromiso) — el coach actúa con permiso, nunca solo.
- **Citas de evidencia:** el coach enlaza a los trades/insights concretos que cita (chips clicables → row detail).
- **Longitudinal por defecto:** las respuestas comparan ventanas; se renderiza un mini-sparkline inline cuando aplica.
- **Modo conversación persistente:** threads guardados, reanudables (Perplexity/ChatGPT). Cabecera con "memoria" visible y editable.
- **LaTeX** para fórmulas (ya soportado/renderizado).

---

## 10. Estados (catálogo obligatorio por componente)

### 10.1 Empty states
- **Constructivos, no vacíos:** explican el valor + 1 CTA. Ej. ANALIZAR sin datos: "Registra 20 trades para desbloquear tu distribución de R. Llevas 7." con barra de progreso.
- Nunca un gráfico vacío sin texto; nunca un "no hay datos" muerto.

### 10.2 Loading states
- **Skeletons fieles** al layout final (ya patrón en Reviews). Sin spinners para contenido estructural.
- **Streaming** para el coach (texto progresivo) en vez de spinner.

### 10.3 Coaching states (nuevo)
- **Tono calmado, foco lectura.** Burbuja del coach con superficie `--coach`, chips de evidencia, acciones al pie.
- **Refuerzo positivo:** tarjeta `--reinforce` ligera ("3 días de disciplina limpia — protégela"). Aparece en HOY, no interrumpe.
- **Sugerencia:** insight con CTA "Comprometerme" / "Activar regla".

### 10.4 Intervention states (nuevo — la única interrupción permitida)
- **Disparada solo por riesgo real** (revenge/cascada/DD/oversizing en vivo). Overlay e4 con backdrop blur, copy directo y empático, **2 acciones máximo** ([Activar bloqueo][Seguir, entiendo el riesgo]).
- **Registra la respuesta** del trader (aceptó/ignoró) para aprendizaje (E11/E2).
- **No se puede spamear:** máximo 1 intervención activa; cooldown configurable; críticas (DD) siempre pasan.
- **Accesible:** foco atrapado, `Esc` = "seguir" con confirmación; lectores de pantalla anuncian la alerta.

### 10.5 Otros
- **Error:** mensaje humano (ya hay `formatErrorForUser`) + acción de reintento.
- **Offline/optimistic:** marca de "guardado localmente, sincronizando".

---

## 11. Componentes nuevos (biblioteca v3)
| Componente | Propósito | Estados |
|---|---|---|
| `InsightCard` | insight con evidencia + CTA (comprometerme/regla) | default/positive/critical |
| `CommitmentCard` | compromiso con progreso y verificación | active/kept/partial/broken |
| `InterventionOverlay` | la capa de intervención | enter/dismiss |
| `CoachBubble` | mensaje del coach con tools+acciones | streaming/done |
| `RiskBudgetMeter` | presupuesto de riesgo del día | safe/warning/exceeded |
| `RollingDeltaStat` | KPI con Δ vs periodo + sparkline | up/down/flat/empty |
| `RDistributionChart` | histograma de R | con/sin datos |
| `EquityDrawdownChart` | equity con bandas de DD | |
| `EdgeEvolutionChart` | curva temporal de edge de setup | |
| `RegimeBadge` | etiqueta de régimen | trend/range/volatile |
| `CheckinSheet` | check-in pre-sesión | green/amber/red |
| `CommandPalette` | ⌘K (existe semilla `command-palette`) | |

---

## 12. Criterios de aceptación de UI (gate de diseño)
Toda PR de UI debe cumplir:
1. **Cada visualización lleva un insight o CTA** (no hay gráficos decorativos).
2. Estados empty/loading/error definidos.
3. `prefers-reduced-motion` respetado.
4. Números financieros en tabular-nums.
5. Color nunca único portador de significado.
6. Accesibilidad: foco visible, contraste AA, teclado completo.
7. Intervención (si aplica) cumple §10.4.
