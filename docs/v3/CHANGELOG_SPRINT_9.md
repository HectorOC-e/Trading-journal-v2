# CHANGELOG_SPRINT_9.md
### Trading Journal v3.1 — Sprint 9 (Riesgo & Prop, E6)

> Estado: **completado** (risk engine: ruina + proyección de fase + presupuesto diario + correlación multi-cuenta + política de retiros).
> Fecha: 2026-06-26 · Rama: `feat/v3-s9-risk-prop`.

## 1. Resumen
El quant de prop firm: el journal ahora responde **"¿paso la fase?"**, **"¿cuánto puedo arriesgar hoy?"** y **"¿cuál es mi riesgo de ruina?"** con rigor honesto — todo en **bandas/distribuciones, nunca un punto** (FREEZE-D16). Determinista de punta a punta (P2); el coach narra, no calcula.

## 2. Dominio puro (TDD) — `src/domains/analytics/risk/`
- **`band.ts`:** banda creíble Jeffreys `Beta(k+0.5, n−k+0.5)` para toda proporción Monte Carlo (reusa `betaQuantile` de S3). Anclada a 0/1 en los extremos.
- **`risk-of-ruin.ts` (#17):** dos vistas honestas:
  - `analyticRiskOfRuin` — aproximación de barrera por difusión `exp(−2·μ·a/σ²)` (horizonte infinito). Sin edge ⇒ ruina segura; edge sin varianza ⇒ ruina 0.
  - `monteCarloRiskOfRuin` — bootstrap de la **distribución de R real** sobre el horizonte de fase, respeta skew/colas; honra `FIXED` (pérdida desde inicial) vs `TRAILING` (desde el pico). PRNG sembrable (`mulberry32`) → reproducible.
- **`prop-projection.ts` (#15):** Monte Carlo contra las reglas de la firma → `P(pasar)`, `P(violar DD primero)`, **sesiones esperadas** (entre las que pasan, con banda) y el **cuello de botella** (DAILY_DD / TOTAL_DD / TIMEOUT). Honra `minTradingDays`.
- **`risk-budget.ts` (#17/#38):** `computeRiskBudget` → room restante al límite diario → **nº máx de trades hoy**; `resolveDailyWindow` con **hora de reset configurable** (#38), tz por offset, puro.
- **`correlation.ts` (#39):** `aggregateExposure` — el mismo símbolo en N cuentas es **un riesgo sumado, no N nominales**; gross/net por símbolo + concentración. `aggregateFreezeSignal` (ok/warn/freeze) — warn-level en S9.
- **`withdrawal-policy.ts` (#46):** `adviseWithdrawal` — solo FUNDED retira; `maxSafeAmount` conserva un buffer sobre el floor de DD; evalúa una petición concreta con su buffer resultante.
- **`inputs.ts`:** mapper puro de la config de cuenta (unidades **porcentaje** → fracciones) + risk-per-trade **mediana** del histórico (robusta a outliers).

## 3. Schema
**Sin migración.** El engine es puro y los campos prop ya existen en `Account` (`ddTotalPct/ddDailyPct/targetPct/ddModel/phase/minTradingDays/maxTradesPerDay`) y `Trade` (`rMultiple/riskPct/direction`). E20 `RiskBudget` se mantiene **derivado** (no persistido).

## 4. Servicio + API
- `server/services/risk/risk-service.ts`: orquestación Prisma (lee cuenta + R/risk histórico, mapea, corre el engine). `getRiskOverview` (ruina+proyección+budget) y `getAggregateExposure` (exposición open cross-cuenta). Solo lectura.
- Router `risk` (`overview`, `aggregateExposure`) registrado en `root.ts`.
- `hasData:false` honesto cuando no hay R histórico o no hay límite de DD total (R6). Proyección omitida si `targetPct ≤ 0` (cuenta ya funded).

## 5. Invariantes
- **Determinista (P2):** todo número viene del engine; el servicio solo lee y forma.
- **Bandas, no puntos (FREEZE-D16):** ruina/proyección reportan intervalos creíbles.
- **Bloqueo pre-trade intacto:** S9 es solo señal/warn; el **bloqueo duro por budget se cablea en S13** (HOY/RiskBudgetMeter, reusando rules/account-lock). Sin regresión.

## 6. Diferido (OPEN_ITEMS_SPRINT_9)
- Superficie UI del cuadrante de riesgo + `RiskBudgetMeter` → S12/S13.
- Bloqueo duro pre-trade por budget/freeze agregado → S13.
- `aggregateCapAmount` como setting por usuario (hoy parámetro, inerte si null).
- Horizonte de fase desde el ritmo real / fecha límite de la firma (hoy 60 sesiones por defecto).

## 7. Verificación
Ver `TEST_REPORT_SPRINT_9.md`: **1050/1050 vitest** (+50, TDD), tsc+eslint verdes. **Smoke contra BD real** (cuenta FTMO Funded, n=12): ruina ≈0 banda `[0, 0.0005]`, budget diario 5%/5 trades — números sanos.
