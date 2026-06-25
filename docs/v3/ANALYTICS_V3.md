# ANALYTICS_V3.md
### Trading Journal v3 — Motor analítico longitudinal y cuantitativo

> Documento 5/8. Implementa C3, C4 y los ítems #3, #7, #9, #12, #15, #16, #17, #18, #19, #21, #22, #23, #26, #32, #33, #34, #35, #41, #43, #44, #49.
> Principio: **todo cálculo es determinista y unit-testeable**; el LLM narra, no calcula (se conserva el patrón actual de `insights-engine.ts`).

---

## 1. Primitiva fundacional: ventanas rodantes (C3, #7)
Toda la analítica longitudinal se construye sobre una única primitiva pura:

```
rollingWindow<T>(series: Dated<T>[], opts: { size: Duration|count, step, agg }): Window<T>[]
```
- Soporta ventanas por **tiempo** (4 semanas) o por **conteo** (últimos 20 trades).
- Devuelve series de ventanas con su métrica agregada → habilita Δ, tendencia, sparklines.
- **Comparador estándar:** `current vs previous` (misma longitud) con Δ y significancia.

`rollingWindow` vive en `domains/analytics/longitudinal/` y la consumen TODOS los detectores temporales. Esto resuelve la brecha bloqueante C3.

---

## 2. Δ vs periodo anterior por KPI (#9, #43)
- Cada KPI (`buildKpis`) gana variante `withRolling(kpi, window=4w)` → `{ current, previous, delta, sparkline[] }`.
- **Benchmark vs plan (#43):** WR/expectancy real vs esperado agregado (deriva de los `expectedWr/expectedAvgR` de setups, ponderado por nº trades).
- Estado vacío explícito cuando no hay periodo previo (no Δ inventado).

---

## 3. Métricas institucionales (C4)

### 3.1 Max drawdown & duración (#3, #34)
Sobre la curva de equity FX-normalizada (`buildEquityCurve` existe):
```
peak_t = max(equity_0..t)
dd_t   = (equity_t - peak_t) / peak_t        # ≤ 0
maxDD  = min(dd_t)
ddActual = dd_T (al cierre)
ddDuration = días desde el último peak hasta hoy (si en DD)
```
Salida: maxDD %, $ y fecha; DD actual; duración. Visual: `EquityDrawdownChart` con bandas.

### 3.2 Distribución de R (#19)
Histograma de `rMultiple`; media, mediana, desviación, skew; resalta dominancia de cola izquierda (riesgo de outlier negativo).

### 3.3 MAE/MFE (#35)
Requiere captura (OPERAR E5.C4): `maeR` (peor excursión en R antes de cierre), `mfeR` (mejor). Análisis:
- **Eficiencia de salida** = `pnlR / mfeR` (cuánto del movimiento favorable capturas).
- **Calidad de stop** = distribución de `maeR` en ganadores (¿tus stops aguantan ruido o te sacan antes de revertir?).

### 3.4 Riesgo institucional rolling (#22)
- **Sortino** = `mean(R) / downsideDev(R)` (downside dev solo sobre R<0).
- **Calmar** = `CAGR_R / |maxDD|` (sobre ventana).
- **Kelly fraccional** = `W − (1−W)/Rr`, con `W`=winRate, `Rr`=avgWin/avgLoss; se reporta **media-Kelly** como sugerencia prudente.
- Todas en versión **rolling** (sobre §1) + valor histórico.
- Se conserva Sharpe existente (`calcSharpeRatio`).

### 3.5 Calendario heatmap (#26)
P&L por día en grilla mensual; color = magnitud; revela patrones temporales de un vistazo. (Datos de `buildPnlByDate`.)

---

## 4. Detección de mejora/deterioro reciente (#29 refuerzo, #44 anomalía)
- **Tendencia de métrica:** sobre `rollingWindow`, test de pendiente (Mann-Kendall ligero o regresión simple) → "mejorando/estable/deteriorando" con significancia.
- **Anomalía diaria (#44):** si `tradesHoy > 1.5× media` o `pérdidaHoy > p90(pérdida diaria)` → señal a HOY ("hoy 3× tu media — ¿overtrading?").
- **Coste de indisciplina temporal (#49):** serie rolling del coste de violaciones; reforzar cuando baja.

---

## 5. Edge decay & evolución de setup (#12, #21, #32)

### 5.1 Decay por expectancy (no solo WR) (#12)
Para cada setup con n≥N:
- Compara expectancy/avgR de la **ventana reciente** vs la **línea base** del setup (definida o histórica).
- **Significancia:** test de diferencia de medias (Welch t-test ligero) — solo se marca decay si el deterioro supera el ruido esperado para ese n. Evita falsos positivos de la ventana fija de 20 actual.

### 5.2 Curva de evolución (#21)
`SetupEdgeSnapshot` (job periódico) → serie temporal de WR/expectancy/avgR por setup. Visual `EdgeEvolutionChart`.

### 5.3 Drift (#32)
Compara la **definición** del setup (dirección, sesión esperada, R esperado, mercado) contra cómo se está **operando** (medias recientes). Marca la dimensión que driftea: "operas este setup en NY pero lo definiste para London", "tu R medio 0.8 vs 1.5 definido".

---

## 6. Calibración de confianza (#23) — psicología cuantitativa
- Bucketea `confidenceRating` (1–5); calcula WR real por bucket.
- **Curva de calibración:** confianza declarada vs WR observado; el ideal es monótono creciente.
- Detecta **sobreconfianza** (bucket 4–5 con WR < media) y **infraconfianza** (bucket bajo con WR alto → estás dejando pasar buenas).

---

## 7. Régimen de mercado (#33, E14.C1)
- **Proxy de régimen** sin datos externos (v3.0): derivado de la **dispersión/tendencia del propio P&L y del símbolo** o **etiqueta manual** en el trade (`regime: trend|range|volatile`), capturada en OPERAR.
- **Rendimiento por régimen:** expectancy/WR por régimen → "ganas en tendencia, pierdes en rango".
- **Cambio de régimen:** si el régimen dominante reciente cambia, aviso ("entraste en régimen de rango — tu peor entorno").
- v3.1 (futuro): integrar volatilidad real (ATR) si hay fuente de datos.

---

## 8. Riesgo de ruina & proyecciones prop (#15, #17) — risk engine
`domains/analytics/risk/`.

### 8.1 Riesgo de ruina
Monte Carlo / fórmula analítica sobre tu distribución de R y tamaño:
- Entrada: expectancy, std(R), riesgo por trade, umbral de ruina (DD total prop).
- Salida: P(tocar DD total) en el horizonte de la fase.

### 8.2 Proyección de paso de fase (#15)
- Entrada: objetivo %, DD diario/total, expectancy, varianza, ritmo de trades.
- Salida vía simulación: **P(pasar la fase)**, **tiempo esperado (sesiones)**, **P(violar DD primero)** y **qué límite es el cuello de botella**.

### 8.3 Presupuesto de riesgo del día / "trade máximo hoy" (#17)
- Dado lo que queda hasta el DD diario y tu tamaño habitual → **nº/tamaño máximo de trades permitido hoy**.
- Alimenta `RiskBudgetMeter` (HOY) y puede disparar bloqueo (PROTEGER).

### 8.4 Correlación multi-cuenta (#39)
Exposición agregada por símbolo a través de cuentas; riesgo real = suma, no nominal por cuenta.

---

## 9. Edge por instrumento (#24) — absorbe Mercados
- Por símbolo: WR, expectancy, avgR, nº, contribución a P&L.
- **Sugerencia de poda:** si un símbolo tiene edge negativo significativo, propone compromiso/regla "no operar US30".
- Esto **reemplaza** la pantalla Mercados (su watchlist se conserva como dato; su valor reaparece como decisión).

---

## 10. Tag analytics (#20) — absorbe parte de Etiquetas
- P&L/expectancy/R medio por tag; resalta tags-veneno ("dudé" = −0.4R) y tags-oro ("A+" = +1.8R).
- Cada fila → acción (crear compromiso/regla a partir del tag).

---

## 11. Modelo de mejora del trader (#41, E14.C2)
**Índice compuesto rolling** que predice y explica progreso:
```
ImprovementScore = w1·disciplineRolling + w2·expectancyRolling(norm)
                 + w3·commitmentKeptRate + w4·(−costoIndisciplinaRolling)
```
- Normalizado 0–100, con **descomposición de drivers** ("+ por cumplimiento de compromisos, − por WR en US30").
- Es la espina del relato del coach mentor (AI_COACH §9) y de la North Star del producto.

---

## 12. Persistencia de insights (C8, #18)
- **`Insight`** persistido: `type, category, severity, metric, evidence, windowFrom/To, createdAt, lastSeenAt, status('active'|'resolved')`.
- Permite: "este insight mejoró/empeoró", alertas al aparecer uno crítico nuevo, y feed de HOY.
- Snapshots periódicos (`SetupEdgeSnapshot`, `ImprovementScore` diario) vía job.

---

## 13. Organización del código
```
domains/analytics/
  longitudinal/   rollingWindow, trend, deltas
  institutional/  drawdown, rDistribution, sortino/calmar/kelly, maeMfe
  setups/         edgeDecay, drift, evolution (extiende setup-analytics)
  psychology/     calibration (+ existentes)
  regime/         regimeTag, regimePerformance
  risk/           riskOfRuin, propProjection, riskBudget, correlation
  instrument/     instrumentEdge (absorbe markets)
  tags/           tagEdge
  improvement/    improvementScore
  insights/       persistInsight, insightsHistory (extiende insights-engine)
```
Todo con tests unitarios (patrón ya establecido en el repo).

---

## 14. Cobertura (este doc)
C3 ✔ · C4 ✔ · #3 ✔ · #7 ✔ · #9 ✔ · #12 ✔ · #15 ✔ · #16 (cascada→psychology v3, datos aquí) · #17 ✔ · #18 ✔ · #19 ✔ · #21 ✔ · #22 ✔ · #23 ✔ · #24 ✔ · #26 ✔ · #32 ✔ · #33 ✔ · #34 ✔ · #35 ✔ · #39 ✔ · #41 ✔ · #43 ✔ · #44 ✔ · #49 ✔.
