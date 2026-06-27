# CHANGELOG_SPRINT_13.md
### Trading Journal v3.1 — Sprint 13 (HOY & notificaciones inteligentes, E11)

> Estado: **completado** (feed HOY priorizado + anomalía diaria + presupuesto de riesgo en HOY).
> Fecha: 2026-06-27 · Rama: `feat/v3-s13-today`.

## 1. Resumen
Abrir la app y **saber qué hacer hoy**: un único feed que une todas las señales cognitivas (insights, compromisos, sugerencias, refuerzos, anomalía, riesgo) en una **lista priorizada adaptativa** — las críticas mandan, las ignoradas se hunden, el refuerzo queda calmado abajo. Determinista (P2), read-only.

## 2. Dominio puro (TDD) — `src/domains/cognitive/today/`
- **`feed.ts` `assembleTodayFeed` (#36):** prioridad `base(kind) × severidad × decay-edad × penalización-ignorado`, con **suelo para críticas** (saltan el decay → nunca se hunden, P4). El refuerzo (base baja + severidad `positive`) nunca domina. Orden estable por prioridad desc.
- **`feed.ts` `detectDailyAnomaly` (#44, ANALYTICS_V3 §4):** overtrading (`hoy > 1.5× media diaria`, mín 3 trades) / pérdida outsized (`> p90 diario`). Mensajes accionables; silencio en un día normal.

## 3. Servicio + API
- `server/services/today/today-service.ts`: agrega **insights** (activos), **compromisos** (activos), **sugerencias de regla** (pending), **refuerzos** (visibles, canal today), la **anomalía diaria** (sobre los trades de la cuenta principal) y el **presupuesto de riesgo** (S9, cuenta principal real activa) → `assembleTodayFeed`. Read-only.
- Router `today` (`feed`) registrado en `root.ts`.

## 4. Superficie
- `components/today/today-feed.tsx`: sección **HOY** en el dashboard — `RiskBudgetMeter` (ahora tipado sobre el dominio `RiskBudget`, reutilizable) + la lista priorizada con icono/severidad/CTA por ítem ("Comprometerme"/"Activar regla"/"Check-in"/"Ver cuenta"). Estados empty/loading. Se monta arriba del hero (HOY responde "qué hago hoy").

## 5. Invariantes
- **Críticas no bajan** (suelo); ignoradas/viejas sí (decay) — validación del sprint.
- Color nunca único portador (icono + texto por severidad). Determinista (P2).
- Sin migración; sin tocar el bloqueo pre-trade.

## 6. Diferido (OPEN_ITEMS_SPRINT_13)
- **Telemetría de ignorado por ítem** (clicks/descartes → `ignored`): hoy el decay usa la **edad** como proxy de "ignorado"; el modelo ya acepta `ignored` cuando exista el tracking.
- Digest proactivo por email (#28) — el digest de aprendizaje ya existe; extender al feed HOY.
- Absorber la pantalla Notificaciones en el feed (hoy conviven); push/realtime (POST-1).
- Señales tempranas extra (#44): rachas/drift en vivo a HOY vía outbox.

## 7. Verificación
Ver `TEST_REPORT_SPRINT_13.md`: **1118/1118 vitest** (+10, TDD), tsc+eslint verdes. **Visual (Playwright vs preview, cuenta demo):** feed HOY con 6 insights — crítico ("expectancy impulsivo negativo") arriba, info ("violaciones→anxious") abajo, cada uno con "Comprometerme"; RiskBudgetMeter (5 trades / 5% al floor) en cabecera.
