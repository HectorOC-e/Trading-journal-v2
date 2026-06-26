# CHANGELOG_SPRINT_3.md
### Trading Journal v3.1 — Sprint 3 (Métricas institucionales, C4)

> Estado: **completado** (motor analítico puro + estimador Bayesiano + wiring de confianza en insights). Superficies (tRPC/UI/dashboards) **diferidas a S12**; verificadores de S4 consumirán estas funciones puras directamente.
> Principio del sprint: **rigor honesto sobre muestras retail** (FREEZE-P3 / ADR-002) — ningún punto sin banda; el estimador es Bayesiano, no frecuentista.
> Fecha: 2026-06-25 · Rama: `feat/v3-s3-institutional-metrics`.

---

## 1. Resumen
Se cierra C4 a nivel de **motor**: el cuadrante institucional (max drawdown, distribución de R, Sortino/Calmar/Kelly, MAE/MFE, benchmark vs plan, heatmap) queda implementado como funciones **puras y unit-testeadas**, y —la pieza ancla— se construye el **estimador Bayesiano con shrinkage** (ADR-002 / FREEZE-D15) que da intervalos creíbles en vez de p-values. Ese estimador se **conecta al pipeline de insights**: las columnas `confidence/credibleInterval/effectSize` de `Insight` (NULL desde S0) ahora se rellenan para los detectores que exponen su base estadística, cerrando R6 en producción vía el cron `recompute-insights` existente.

---

## 2. Archivos creados (código)
| Archivo | Propósito | Ítem |
|---|---|---|
| `src/domains/analytics/institutional/stats/bayes.ts` | Estimador Bayesiano: `betaBinomialEstimate` (proporciones), `proportionEstimate` (confianza direccional vs baseline), `normalEstimate` (continuos), `empiricalBetaPrior`/`empiricalNormalPrior` (pooling), primitivas (`regularizedIncompleteBeta`, `betaQuantile`, `normalCdf`, `logGamma`) | **FREEZE-D15 / ADR-002** |
| `src/domains/analytics/institutional/drawdown.ts` | `analyzeDrawdown`: maxDD %/$/fecha, DD actual, días bajo agua, serie por fecha | #3, #34 |
| `src/domains/analytics/institutional/r-distribution.ts` | `analyzeRDistribution`: histograma, media/mediana/std/skew, dominancia de cola izquierda | #19 |
| `src/domains/analytics/institutional/risk-ratios.ts` | `sortinoRatio`, `calmarRatio`, `kellyCriterion`/`kellyFromR` (full+half), `computeRiskRatios`, `rollingRiskRatios` (sobre `rollingWindow`) | #22 |
| `src/domains/analytics/institutional/mae-mfe.ts` | `analyzeMaeMfe`: eficiencia de salida (`pnlR/mfeR`), calidad de stop (MAE en ganadores) | #35 |
| `src/domains/analytics/institutional/benchmark.ts` | `analyzeBenchmark`: WR/expectancy real vs esperado ponderado por nº trades, mismo subconjunto cubierto | #43 |
| `src/domains/analytics/institutional/pnl-heatmap.ts` | `buildPnlHeatmap`: grilla calendario con intensidad/niveles, mejor/peor día | #26 |

## 3. Archivos creados (tests — 63 casos nuevos, TDD)
| Archivo | Casos |
|---|---|
| `src/__tests__/domains/analytics/bayes.test.ts` | 22 |
| `src/__tests__/domains/analytics/drawdown.test.ts` | 6 |
| `src/__tests__/domains/analytics/r-distribution.test.ts` | 7 |
| `src/__tests__/domains/analytics/risk-ratios.test.ts` | 10 |
| `src/__tests__/domains/analytics/mae-mfe.test.ts` | 6 |
| `src/__tests__/domains/analytics/benchmark.test.ts` | 5 |
| `src/__tests__/domains/analytics/pnl-heatmap.test.ts` | 6 |
| `src/__tests__/domains/insight-store.test.ts` | +1 (caso con base estadística) |

## 4. Archivos modificados
| Archivo | Cambio |
|---|---|
| `src/domains/analytics/services/insights-engine.ts` | `Insight` += `stat?: InsightStat` (proporción); poblado en `detectIntradayDecay` y `detectWeekdayDiscipline` (base k/n + baseline + dirección) |
| `src/domains/analytics/insights/insight-store.ts` | `toComputedInsight` corre `proportionEstimate` cuando hay `stat` → rellena `confidence/credibleInterval/effectSize` y refina `sampleSize` al n del detector; sin base, fields NULL (R6) |

## 5. Migraciones
- **Ninguna.** S3 es analítica pura sobre columnas existentes (R, equity, `maeR/mfeR` de S2, `expectedWr/expectedAvgR` de setups, campos de `Insight` de S0). No toca el schema.

## 6. La decisión metodológica (la tesis del sprint)
| Pieza | Frecuentismo (rechazado, R6) | S3 (Bayesiano, ADR-002) |
|---|---|---|
| Edge per-user a n=20–200 | t-test/Mann-Kendall → falsos positivos | posterior con shrinkage hacia la población |
| Reporte | p-value / punto | **intervalo creíble** (banda) siempre |
| n pequeño | se rompe o miente | banda ancha y honesta (no falla) |
| Confianza de un insight | umbral arbitrario | P(efecto en la dirección flagada) vs baseline |

## 7. Cómo se cierra C4 / R6
- **C4 (métricas institucionales):** las 6 familias del cuadrante existen como motor determinista, testeado con casos de valor conocido. FREEZE-D3 (Analytics puro, sin efectos) respetado.
- **R6 (pseudo-rigor):** `Insight.confidence/credibleInterval/effectSize` dejan de ser NULL para los detectores con base; los que no la tienen siguen NULL → **no se fabrica rigor**.

## 8. Lo que NO se hizo (anti-alcance / diferido)
- ❌ **Superficies tRPC + UI** (dashboards del cuadrante, charts) → **S12** (DS v3 + superficies). Crear superficie ahora sería re-trabajada.
- ❌ **Mapper DB→métricas** para las 6 funciones → diferido a quien las consuma (S4 verificadores / S12). El bundle actual no selecciona `maeR/mfeR/regime` ni `expectedWr/expectedAvgR`; se añadirá al cablearlas (evita dead code).
- ❌ Wiring Bayesiano de insights **continuos** (p. ej. emotion-performance, diferencia de medias de P&L) → requiere comparador de dos muestras; el estimador `normalEstimate` ya existe y está testeado, falta el detector que exponga la base.
- ❌ Edge decay / drift / proyecciones prop (consumen el estimador) → **S9/S10**.
- ❌ Avance a Sprint 4.

## 9. Verificación
Ver `TEST_REPORT_SPRINT_3.md`: **945/945 vitest** (+63, TDD), tsc+eslint verdes (0 errores), sin regresión. `prisma generate` requerido (cliente estaba desactualizado vs schema S0–S2 mergeado).
