# Diseño: IA contexto global + redesign de Aprendizaje y Reviews

> Fecha: 2026-06-11 · Estado: aprobado, pendiente de plan de implementación.
> Un solo spec, tres secciones independientes pensadas para implementarse por fases.

## Resumen

Tres mejoras al Trading Journal, agrupadas en un spec pero secuenciables:

1. **IA Coach con contexto global (read-only)** — el coach hoy desconoce las cuentas y el catálogo de setups, y no sabe explicar cómo/por qué usar la app. Se le inyecta contexto rico de toda la BD (menos credenciales) y un bloque curado de conocimiento de la app.
2. **Aprendizaje redesign** — el sistema de estados/"Dominado" es opaco, el panel de progreso lateral se rompe en móvil. Se reestructura en una page con tabs, un modelo de dominio ganado por repaso espaciado (SRS), y cards orientadas a la acción.
3. **Reviews redesign (foco mensual)** — la review mensual es casi solo texto. Se convierte en un reporte visual en page propia.

### Decisiones tomadas (brainstorming)

| Tema | Decisión |
|---|---|
| IA — alcance | Solo asesor **read-only** (no ejecuta acciones, no navega por sí misma) |
| IA — arquitectura | **Contexto rico estático** (ampliar el dump actual + bloque de app-knowledge). Tools/agentic queda fuera de alcance (posible fase futura) |
| Aprendizaje — estructura | **Una page** con tabs internas (Biblioteca · Repaso · Progreso), deep-link `?tab=` |
| Aprendizaje — card | **Anillo de dominio (n/5) + CTA "Repasar hoy"** en la lista; **stepper de etapas** en el detalle |
| Aprendizaje — modelo de dominio | "Dominado" se **gana con SRS** (nivel 0–5) |
| Reviews — mensual | **Page propia** `/reviews/mensual/[YYYY-MM]`, reporte visual, deep-link + export PDF |

---

## Sección 1 — IA Coach: contexto global read-only + guía de app

### Objetivo
Que el coach pueda responder con conocimiento de las cuentas, setups y demás datos del usuario, y que pueda guiar sobre **cómo** hacer cosas en la app y el **por qué** de las métricas — sin ejecutar acciones y sin exponer credenciales.

### Cambios de datos: `domains/analytics/ai-context.ts`
Ampliar `buildTraderContext` (y su tipo `TraderContext`) con:

- **`accounts[]`**: `name`, `type`, `currency`, `phase`, `status`, `locked` + `lockReason`, `initialBalance` y `balance` (equity = inicial + P&L cerrado, convertido a `baseCurrency` vía `lib/fx`), límites prop-firm (`ddDailyPct`, `ddTotalPct`, `targetPct`) y uso de drawdown del periodo actual.
- **`setups[]`** (catálogo completo): `name`, `abbreviation`, `market`, `direction`, `status`, edge (`expectedWr`, `expectedAvgR`) y stats reales (WR, avgR, nº trades, `health` vía `calcSetupHealth`).
- **`withdrawals`**: resumen agregado por estado y divisa (montos y conteos).
- **`rules`**: lista de reglas activas (`name`, `severity`).
- **`psychology`**: agregados de `TradingSessionLog` (pre-mood y energía promedio) + correlaciones ya existentes en `psychology-insights` si están disponibles.
- **`markets`**: símbolos en watchlist (`symbol`, `name`).
- Se mantiene lo actual: `performance`, `behavior`, `learning`, `goals`, `recentTrades`, `patterns`.

Las sub-consultas se añaden al `Promise.all` existente. Todas filtran por `userId`. Se respeta el límite de tamaño manteniendo resúmenes (no volcar 500 retiros, sino agregados).

### Conocimiento de la app: nuevo `lib/ai/app-knowledge.ts`
Constante de texto mantenible (markdown) que describe:
- **Mapa de pages**: qué hace cada una (Dashboard, Trades, Cuentas, Playbook, Reglas, Mercados, Retiros, Aprendizaje, Reviews, Psicología, Analytics, Perfil).
- **Cómo hacer tareas clave**: registrar un trade, crear/editar un setup, hacer una review semanal/mensual, registrar un retiro y cambiar su estado, sincronizar balance, promover fase de cuenta prop-firm.
- **El porqué de las métricas**: R-multiple, profit factor, drawdown (fijo vs trailing), discipline score, expectancy, SRS/repaso espaciado.

Se versiona como código para mantenerlo al día junto a la app.

### Cambios en `lib/ai/coach-service.ts`
- `buildSystemPrompt` renderiza las nuevas secciones (`### Cuentas`, `### Setups`, `### Retiros`, `### Reglas`, `### Psicología`, `### Mercados`) y embebe el bloque de `app-knowledge.ts` bajo `## Cómo funciona la app`.
- Instrucciones nuevas: la IA **puede** referenciar cuentas/setups por nombre, explicar cómo/por qué, y señalar (en texto) la page o el botón correcto. **No** ejecuta acciones ni inventa navegación interactiva.
- **Prompt caching**: el bloque estático (app-knowledge + instrucciones) se marca como cacheable según el proveedor (cache control de Anthropic / equivalente) para controlar el costo del prompt más grande. Implementar en `lib/ai/chat.ts` si el proveedor lo soporta; degradar silenciosamente si no.

### Seguridad — exclusiones explícitas
Nunca se incluye en el contexto: `UserAiConfig.apiKeyEnc`, cualquier password/token, `AI_KEY_ENCRYPTION_SECRET`, claves de servicio, ni valores cifrados. El selector de columnas es explícito (whitelist), nunca `select: *`.

### Tests
- `buildTraderContext` devuelve los nuevos campos (cuentas, setups con stats, agregados) con datos de prueba mock.
- El system prompt incluye nombres de cuentas/setups y el bloque de app-knowledge.
- Ninguna columna sensible aparece en el contexto (test negativo).

---

## Sección 2 — Aprendizaje redesign

### Objetivo
Hacer legible el ciclo de vida de un recurso, arreglar el panel de progreso en móvil, y convertir el repaso espaciado (SRS) en el corazón de la experiencia.

### Estructura
- Una sola page `/aprendizaje` con un **segmented control**: **Biblioteca · Repaso · Progreso**.
- Estado de tab en la URL: `?tab=biblioteca|repaso|progreso` (default `biblioteca`). Deep-linkeable — la IA enlaza a `?tab=repaso`.
- **Biblioteca**: lista/grid de recursos con filtros (los actuales).
- **Repaso**: cola SRS — recursos cuyo `next_review_at <= hoy`, ordenados vencidos→hoy. Acción de repaso = `revisar-recurso-modal`.
- **Progreso**: la franja de progreso actual, ampliada (recursos, completados, horas, racha, dominados), más métricas de aprendizaje.

### Panel de progreso (fix móvil)
- Se retira/reescribe `resource-right-rail.tsx` como **franja superior** (full-width) en lugar de columna lateral.
- Responsive: en móvil, las stats colapsan a una fila de chips con scroll horizontal; sin desbordes.

### Modelo de dominio (SRS)
- `mastery_level` (0–5) avanza **solo** al completar un repaso exitoso; cada nivel alarga `review_interval`. **"Dominado" = nivel 5** (último).
- Se aprovechan los campos existentes: `review_interval`, `next_review_at`, `mastery_level`, `avg_score`, `status`.
- El estado textual (`PENDING`/`IN_PROGRESS`/`COMPLETED`/`IN_REVIEW`/`MASTERED`/`ABANDONED`) se mantiene en DB pero se presenta como etapas del stepper; `MASTERED` se alcanza al llegar a nivel 5.
- Lógica de progresión en un helper puro testeable (p. ej. `domains/.../mastery.ts`): dado (nivel actual, resultado del repaso) → (nuevo nivel, nuevo intervalo, próximo `next_review_at`).

### Card de recurso (lista)
- **Anillo de dominio** (n/5) + chip de estado + CTA prominente **"Repasar hoy →"** cuando `next_review_at <= hoy`.
- Compacta, prioriza la acción; buena en móvil.

### Detalle de recurso (modal/panel)
- **Stepper de etapas** (Nuevo → En curso → Completado → En repaso → Dominado) con la etapa actual resaltada.
- Historial de repasos (fechas, score, nivel ganado).

### Auditoría visual
- web-design-guidelines + frontend-design: a11y (labels, focus, `aria`), jerarquía, móvil, reducir tarjetas KPI redundantes.

### Tests
- Helper de progresión de dominio (avance de nivel + recálculo de intervalo).
- Selección de la cola de Repaso (vencidos primero).

---

## Sección 3 — Reviews redesign (foco mensual)

### Objetivo
Convertir la review mensual de un resumen de texto en un **reporte visual** que agregue el mes.

### Estructura
- La review mensual abre en **page propia**: `/reviews/mensual/[yearMonth]` (p. ej. `/reviews/mensual/2026-06`). Deep-linkeable.
- La lista en `/reviews` (tab Mensuales) enlaza a estas pages.

### Contenido del reporte mensual
- **Fila de KPIs con delta vs mes anterior**: Net P&L, win rate, discipline score, nº trades (cada uno con ▲/▼ vs mes previo).
- **Tendencia semana a semana** (barras): P&L por semana del mes.
- **Mejor / peor día** del mes.
- **Disciplina**: nº violaciones, costo de indisciplina, racha de días limpios.
- **Setups del mes**: top setups por P&L/uso.
- **P&L por cuenta** (en `baseCurrency`).
- **Resumen IA** (ya existe la degradación grácil sin clave).
- **Temas + metas** del mes (cumplidas / no cumplidas).
- **Export a PDF** del reporte.

### Agregación
- Servicio de rollup mensual que combina las weekly reviews del mes + trades del mes para producir el reporte. Reutiliza `dashboard-analytics` / formulas existentes; no duplica fórmulas.

### Semanales
- Se mantienen; polish ligero de jerarquía (sin rediseño profundo).

### Tests
- Servicio de agregación mensual: KPIs, deltas vs mes anterior, tendencia semanal, con datos mock.

---

## Transversal

- **Auditoría de UI**: todo lo visual (Secciones 2 y 3) se revisa contra **web-design-guidelines** y **frontend-design** antes de cerrar.
- **Reuso**: componentes y tokens existentes (`Card`, `KpiCard`, `--*` vars, `lib/fx`, formulas). No introducir un sistema de diseño nuevo.
- **i18n/moneda**: montos en `baseCurrency` usando `lib/fx` (consistente con el dashboard).
- **Node/test**: Node 24 vía nvm (ver memoria de toolchain).

## Fases sugeridas (para el plan)

1. **Fase 1 — IA contexto global** (mayor valor diario, lógica pura, sin UI nueva).
2. **Fase 2 — Aprendizaje redesign** (estructura, SRS, móvil, cards).
3. **Fase 3 — Reviews mensual** (page propia, agregación, reporte, PDF).

Cada fase es entregable y testeable de forma independiente.

## Fuera de alcance

- IA agentic / tool-calling / acciones de escritura (posible fase futura).
- Fine-tuning real de un modelo (lo de "entrenar" se resuelve con contexto + app-knowledge, no con entrenamiento).
- Rediseño profundo de reviews semanales.
- Cambios de esquema de DB (se usan los campos existentes de `LearningResource`/`ResourceReview`/`WeeklyReview`/`MonthlyReview`). Si la progresión de dominio necesitara un campo nuevo, se añade vía migración versionada como excepción acotada.
