# TEST_REPORT_SPRINT_14.md
### Sprint 14 · Verificación · 2026-06-27

| Gate | Resultado |
|---|---|
| Vitest | ✅ **1130/1130** · +12 S14 |
| tsc --noEmit | ✅ 0 |
| eslint | ✅ 0 errores en archivos S14 |
| Migración replay | — sin migración |
| Bloqueo pre-trade | ✅ sin regresión |

## Tests nuevos (TDD) (12)
- **`improvement-score`** (8): 100 con todo al máximo; 0 con todo al mínimo; **drivers suman el score** (4 drivers); más coste → menor score; clamp de entradas fuera de rango. `costOfIndiscipline`: 0 sin off-plan; cobra el gap cuando off-plan rinde peor; 0 cuando off-plan rinde mejor (sin coste fabricado).
- **`regime-performance`** (4): WR/avgR/netPnl por régimen + experimental; mejor/peor por avg R; ignora trades sin régimen; empty-safe.

## Verificación visual (Playwright vs preview prod, cuenta demo)
Tab **"Mejora"** en /analytics:
- **Índice de mejora 65/100** (104 trades), color ámbar (umbral 45–70).
- 4 barras de drivers (Disciplina / Expectancy / Compromisos cumplidos / Bajo coste de indisciplina) con puntos/maxPoints.
- Coste de indisciplina acumulado + sección "Rendimiento por régimen" con badge experimental.

Render correcto con tokens DS v3; servicio corre contra el schema real (solo cuentas reales).
