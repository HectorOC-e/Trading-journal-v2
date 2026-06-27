# TEST_REPORT_SPRINT_13.md
### Sprint 13 · Verificación · 2026-06-27

| Gate | Resultado |
|---|---|
| Vitest | ✅ **1118/1118** · +10 S13 |
| tsc --noEmit | ✅ 0 (completo, sin filtrar) |
| eslint | ✅ 0 errores en archivos S13 |
| Migración replay | — sin migración |
| Bloqueo pre-trade | ✅ sin regresión |

## Tests nuevos (TDD) — `__tests__/domains/cognitive/today/feed.test.ts` (10)
- **`assembleTodayFeed`** (6): crítica de intervención arriba; ignorada (ignored=4) se hunde bajo la fresca; **crítica con ignored=9 + vieja NO se hunde** (suelo); item viejo bajo el reciente (age decay); refuerzo calmado bajo un riesgo warning; prioridad numérica + empty-safe.
- **`detectDailyAnomaly`** (4): overtrading > 1.5× media; no marca dentro de la banda; pérdida outsized > p90; silencio en día normal.

## Verificación visual (Playwright vs preview prod, cuenta demo)
Dashboard (HOY) con **6 insights activos reales**:
- Cabecera "☀ Hoy — qué mover para mejorar y no romperte" + **RiskBudgetMeter** (Margen diario disponible · 5 trades · 5% al floor).
- Orden adaptativo correcto: **crítico arriba** ("Tus operaciones impulsivas tienen expectancy negativo", icono rojo) → warnings → **info abajo** ("Tus violaciones de reglas se asocian a 'anxious'", icono gris). Cada ítem con CTA "Comprometerme →".

Render correcto con tokens DS v3; servicio corre contra el schema real.
