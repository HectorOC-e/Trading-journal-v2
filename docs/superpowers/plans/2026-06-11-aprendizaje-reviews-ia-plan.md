# Plan de implementación: IA global + Aprendizaje/Reviews redesign

> Basado en `docs/superpowers/specs/2026-06-11-aprendizaje-reviews-ia-redesign-design.md`.
> Tres fases entregables e independientes. Cada fase: implementar → tests verdes → tsc/build → PR → merge (auto-deploy a prod).

---

## Fase 1 — IA Coach: contexto global read-only + guía de app

**Objetivo:** el coach conoce cuentas, setups y demás datos (menos credenciales) y sabe explicar cómo/por qué usar la app.

### Tareas
1. **`domains/analytics/ai-context.ts`** — extender `TraderContext` + `buildTraderContext`:
   - `accounts[]`: name, type, currency, phase, status, locked+lockReason, initialBalance, balance (inicial + P&L cerrado, FX→baseCurrency), ddDailyPct, ddTotalPct, targetPct.
   - `setups[]`: name, abbreviation, market, direction, status, expectedWr, expectedAvgR, winRate real, avgR real, tradeCount, health (`calcSetupHealth`).
   - `withdrawals`: agregados `{ [currency]: { [status]: { count, amount } } }`.
   - `rules[]`: name, severity (solo enabled).
   - `psychology`: preMood promedio, energyLevel promedio, nº sesiones (de `TradingSessionLog`).
   - `markets[]`: symbol, name (solo watchlisted).
   - `baseCurrency`: string.
   - Sub-queries nuevas en el `Promise.all`; selects con whitelist (sin columnas sensibles).
2. **`lib/ai/app-knowledge.ts`** (nuevo) — constante markdown: mapa de pages, cómo hacer tareas clave, porqué de las métricas.
3. **`lib/ai/coach-service.ts`** — `buildSystemPrompt` renderiza `### Cuentas / ### Setups / ### Retiros / ### Reglas / ### Psicología / ### Mercados` + embebe `APP_KNOWLEDGE`; instrucciones nuevas (referenciar por nombre, explicar cómo/por qué, señalar page; sigue read-only).
4. **`lib/ai/chat.ts`** — prompt caching del bloque estático si el proveedor lo soporta (Anthropic cache_control); degradar si no. *(Si añade complejidad, diferir y solo dejar el system grande — anotarlo.)*
5. **Tests** (`__tests__/`): nuevos campos del context (mock prisma), system prompt incluye nombres de cuenta/setup + app-knowledge, y test negativo (ninguna columna sensible en el output).

### Aceptación
- 605+ tests verdes (incl. nuevos) · tsc · build.
- Preguntar al coach "¿qué cuentas tengo?" / "¿cuál es mi mejor setup?" / "¿cómo registro un retiro?" responde con datos reales y guía.
- Sin credenciales en el contexto.

---

## Fase 2 — Aprendizaje redesign

### Tareas
1. `/aprendizaje` → segmented tabs Biblioteca · Repaso · Progreso con estado en `?tab=` (default biblioteca).
2. Retirar `resource-right-rail.tsx`; mover progreso a **franja superior** responsive (chips scroll en móvil).
3. Helper puro de progresión de dominio (`domains/learning/services/mastery.ts`): (nivel, resultado repaso) → (nivel nuevo 0–5, intervalo, next_review_at). Cablear en el flujo de review.
4. Card lista: anillo de dominio (n/5) + chip estado + CTA "Repasar hoy" cuando vence.
5. Detalle: stepper de etapas + historial de repasos.
6. Tab Repaso = cola SRS (vencidos→hoy primero).
7. Auditoría web-design-guidelines + frontend-design.
8. Tests: progresión de dominio, selección de cola.

### Aceptación
- Móvil sin desbordes; tabs deep-linkeables; "Dominado" alcanzable solo por SRS.

---

## Fase 3 — Reviews mensual

### Tareas
1. Page propia `/reviews/mensual/[yearMonth]` (deep-link); lista enlaza ahí.
2. Servicio de agregación mensual (rollup weekly reviews + trades, reusa dashboard-analytics/formulas).
3. Reporte: KPIs + delta vs mes anterior, tendencia semanal (barras), mejor/peor día, disciplina, setups del mes, P&L por cuenta (baseCurrency), resumen IA, temas+metas.
4. Export PDF.
5. Polish ligero de semanales.
6. Tests: agregación mensual + deltas.

### Aceptación
- Mensual es reporte visual, deep-linkeable, exportable.

---

## Notas transversales
- Node 24 vía nvm para test/build.
- Montos en baseCurrency vía `lib/fx`.
- Sin cambios de esquema salvo excepción acotada (migración versionada) si la progresión de dominio lo requiere.
