# CHANGELOG_SPRINT_14.md
### Trading Journal v3.1 — Sprint 14 (Modelo de mejora, regímenes & onboarding, E14/E13)

> Estado: **completado** — el **último sprint**. ImprovementScore (North Star) + régimen + coste de indisciplina. (Onboarding día-1 #48 ya entregado en S12d.)
> Fecha: 2026-06-27 · Rama: `feat/v3-s14-improvement`.

## 1. Resumen
La **North Star**: un índice compuesto que dice "eres mejor trader que hace 3 meses" y **explica por qué** (descomposición de drivers). Cierra la cobertura de la auditoría. Determinista (P2), honesto (régimen marcado experimental).

## 2. Dominio puro (TDD)
- **`analytics/improvement/improvement-score.ts` (#41):** `computeImprovementScore` = `w·disciplina + w·expectancy(norm) + w·compromisos + w·(1−coste)` (0–100, pesos por defecto 0.3/0.3/0.25/0.15). **Descomposición de drivers** cuyos `points` suman el score (cada uno con `maxPoints` = 100·peso). + `costOfIndiscipline` (#49): coste de oportunidad `(cleanAvg − offPlanAvg) × offPlanCount`, **suelo 0** (off-plan que rinde mejor no inventa coste); `costRatio` normaliza sobre el beneficio bruto.
- **`analytics/regime/regime-performance.ts` (#33):** WR/avgR/netPnl por régimen (trend/range/volatile) + mejor/peor (mín 3 trades). **`experimental: true`** siempre (FREEZE-D18 — el régimen es etiqueta manual/proxy en v3.0; la UI no lo presenta como verdad exógena).

## 3. Servicio + API
- `server/services/improvement/improvement-service.ts` (**solo cuentas reales**): disciplina (1 − off-plan/total, con flags revenge/fomo + tags Off-plan/Impulsivo), expectancy (media de R), `commitmentKeptRate` (kept/resueltos; neutral 0.5 si no hay), coste (`costOfIndiscipline`), régimen. Router `improvement.overview`.

## 4. Superficie
- `components/improvement/improvement-panel.tsx` en una tab nueva **"Mejora"** en `/analytics`: score hero (color por umbral 70/45) + 4 barras de drivers + coste de indisciplina acumulado + tabla de rendimiento por régimen con badge "experimental".

## 5. Invariantes
- **Solo dinero real** alimenta el índice (la práctica no infla). Determinista (P2).
- Régimen **honesto** (experimental, FREEZE-D18). Coste con suelo (sin coste fabricado).
- Sin migración; sin tocar el bloqueo pre-trade.

## 6. Diferido (OPEN_ITEMS_SPRINT_14)
- **Persistir `ImprovementScore` (E19, snapshot diario)** vía job → la curva temporal "vs hace 3 meses" (hoy el índice es el valor actual; la serie histórica necesita snapshots).
- Régimen exógeno real (ATR) — POST-4 (hoy manual/proxy).
- Pesos del índice recalibrables con datos.

## 7. Verificación
Ver `TEST_REPORT_SPRINT_14.md`: **1130/1130 vitest** (+12, TDD), tsc+eslint verdes. **Visual (Playwright vs preview, cuenta demo):** tab "Mejora" → **índice 65/100** (104 trades), 4 barras de drivers, coste de indisciplina, sección de régimen. Render correcto.
