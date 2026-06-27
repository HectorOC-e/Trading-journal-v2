# CHANGELOG_SPRINT_11.md
### Trading Journal v3.1 — Sprint 11 (Aprendizaje & transferencia E9 + Edge instrumento/tags E10)

> Estado: **completado** (edge por instrumento + poda, tag analytics poison/gold, transferencia honesta, SRS adaptado, errores→tarjeta).
> Fecha: 2026-06-27 · Rama: `feat/v3-s11-learning-edges`.

## 1. Resumen
Dos pantallas v2 se convierten en **decisiones**: Mercados → **edge por instrumento con sugerencia de poda**; Etiquetas → **tags-veneno/oro**. Y el aprendizaje deja de ser fe: mide **transferencia** (con honestidad causal), adapta el **SRS al rendimiento** y convierte **errores recurrentes en tarjetas**. Determinista (P2), significancia real (P3), causalidad honesta (D17).

## 2. Dominio puro (TDD)
- **`analytics/instrument/instrument-edge.ts` (#24):** por símbolo WR/avgR/expectancy/n/netPnl + contribución al P&L; **poda** cuando el edge es **significativamente negativo** (Welch one-sample vs 0). Absorbe Mercados (su valor reaparece como decisión "no operar US30").
- **`analytics/tags/tag-edge.ts` (#20):** por tag avgR/WR/netPnl + clasificación **gold/poison/neutral** por significancia. Cuenta cada trade en cada uno de sus tags; ordena gold arriba.
- **`learning/transfer.ts` (#31):** edge **antes/después** de estudiar un recurso (Welch). Etiqueta honesta `associated-improvement|decline|no-association|insufficient` + **caveat de confounds** (régimen/tiempo/n) — **nunca "causa"** (FREEZE-D17).
- **`learning/srs.ts` (#45):** SM-2 (intervalo + ease) **modulado por el rendimiento del setup vinculado**: edge `decaying` → revisar antes (×0.5); `improving` → espaciar (×1.2). Ease con suelo 1.3.
- **`learning/error-cards.ts` (#42):** tags de error recurrentes → tarjetas priorizadas por **coste real** (R y P&L), peor error primero.

## 3. Schema
**Sin migración.** Todo se calcula de la historia de trades + definición/links ya existentes. `transferBaseline` (E4) no se persiste: el antes/después se computa por fecha del recurso (precedente S10 redefinition).

## 4. Servicio + API
- `server/services/analytics/edge-service.ts` (instrument + tags) + `server/services/learning/learning-insights-service.ts` (transfer + performance signal #45 + error cards). **Read-only.** `getErrorCards` enriquece tags con `revengeFlag→Revancha`/`fomoFlag→FOMO`.
- Routers `edges` (`instruments`/`tags`) y `learningInsights` (`transfer`/`errorCards`) en `root.ts`.

## 5. Invariantes
- **Significancia honesta (P3/R6):** ni poda, ni poison/gold, ni transferencia sin superar el ruido (Welch). `neutral`/`insufficient` sobre muestra pobre.
- **Causalidad honesta (D17):** transferencia = asociación con confounds declarados, jamás "causa".
- **Determinista (P2);** sin tocar bloqueo pre-trade ni separación práctica/real.

## 6. Diferido (OPEN_ITEMS_SPRINT_11)
- Superficies UI (tabla de instrumento con CTA poda, tags-veneno/oro accionables, panel de transferencia/SRS) → S12.
- Cablear `computeNextReview` en la mutación de review/grade existente → S12 (hoy se entrega la señal de cadencia).
- Edge por instrumento/tag → Insight persistido + oferta de compromiso/regla ("no operar US30", "evita FOMO") → con recompute/behavior.
- Watchlist de Mercados se conserva como dato hasta paridad de valor (FREEZE).

## 7. Verificación
Ver `TEST_REPORT_SPRINT_11.md`: **1104/1104 vitest** (+27, TDD), tsc+eslint verdes. **Smoke contra BD real**: tags → **gold ['A+'], poison ['fomo','revenge']**; error cards → **FOMO 15× −19.5R, Revancha 13× −18.5R**; instrumentos todos `neutral` (honesto, ninguno significativo). Hallazgos accionables reales.
