# DECISIONS_SPRINT_3.md
### Trading Journal v3.1 — Sprint 3 · Decisiones de implementación

> Decisiones tomadas dentro del freeze (citan su ID). Las reversibles pueden cambiarse en sprints posteriores referenciando este doc.
> Fecha: 2026-06-25 · Rama: `feat/v3-s3-institutional-metrics`.

---

## D3.1 — Estimador Bayesiano de doble familia desde S3 (no solo WR)
**Decide:** FREEZE-D15 / ADR-002. **Reversible:** priors.
Se implementan **ambas** familias del estimador: **Beta-Binomial** para proporciones (win-rate) y **Normal-Normal** para continuos (expectancy/avg R), más constructores empíricos de prior (`empiricalBetaPrior`/`empiricalNormalPrior`) que hacen *partial pooling* hacia la población (los setups/instrumentos del usuario). Motivo: evitar un retrofit en S10 (edge decay consume bandas de continuos); el método irreversible queda completo desde el día 1.

## D3.2 — Intervalo creíble con la posterior Beta real (no aproximación normal)
**Reversible.**
La banda de proporciones se calcula con los **cuantiles de la Beta posterior** (`regularizedIncompleteBeta` + inversión por bisección), no con una aproximación normal. A n retail la Beta es asimétrica; la aproximación normal daría bandas fuera de [0,1] o sesgadas. Coste: ~60 líneas numéricas (continued fraction de Numerical Recipes), totalmente unit-testeadas (identidad `I_x(1,1)=x`, simetría, inversión).

## D3.3 — Priors por defecto débilmente informativos
**Reversible (FREEZE-D15 priors).**
- Beta: `{ mean: 0.5, strength: 2 }` (= Beta(1,1) uniforme) — deja hablar al dato rápido.
- Normal: `{ mean: 0, variance: 1e6 }` (≈ sin shrinkage si no se pasa prior empírico).
El pooling real se aplica pasando un prior empírico construido desde los grupos del usuario. Recalibrables con datos reales.

## D3.4 — `confidence` de un insight = probabilidad posterior direccional vs baseline
**Reversible.**
Para que `Insight.confidence` tenga un significado **consistente y honesto** entre detectores heterogéneos, se define como **P(la tasa verdadera está en el lado flagado del baseline)**: `P(p ≤ baseline)` para insights "below" (p. ej. WR tardío cae) y su complemento para "above" (p. ej. violaciones suben). `credibleInterval` = banda 95% de la proporción; `effectSize` = Cohen's h vs baseline. Esto evita el "confidence" como umbral arbitrario.

## D3.5 — Wiring honesto vía base estadística opcional (`Insight.stat`)
**Decide:** FREEZE-E6 / R6.
En vez de retrofittear todos los detectores, se añade `stat?: InsightStat` (aditivo, opcional) y se puebla solo donde hay base sólida k/n: **intraday-decay** (WR tardío vs temprano) y **weekday-discipline** (tasa de violación vs media). `toComputedInsight` corre el estimador solo si hay `stat`; sin base, los campos Bayesianos quedan **NULL** → no se fabrica rigor. Cobertura inicial deliberadamente acotada (espíritu del "subconjunto inicial" de FREEZE-D7); el resto se amplía cuando cada detector exponga su base.

## D3.6 — `sampleSize` se refina al n del detector cuando hay base
**Reversible.**
S0 persistía `sampleSize = nº trades del usuario` (coarse, ver OPEN_ITEMS_SPRINT_0). En S3, cuando un insight tiene `stat`, `sampleSize` pasa a ser el **n real del detector** (p. ej. trades tardíos), que es lo que determina la banda. Sin base, se mantiene el coarse anterior.

## D3.7 — Sin migración ni superficie en S3 (Analytics es puro, FREEZE-D3)
**Decide:** FREEZE-D3.
El motor no escribe estado de negocio (salvo el insight vía el job que ya existía). Las superficies (tRPC/UI) son trabajo de **S12**; los verificadores de **S4** consumen las funciones puras directamente. Crear un mapper DB→métricas ahora sería dead code → se difiere al primer consumidor real (evita la trampa de exponer y luego rehacer).

## D3.8 — Ratios devuelven `null` cuando son indefinidos (no 0)
**Reversible.**
Sortino sin downside, Calmar sin drawdown, Kelly sin ambas colas → `null`, no un 0 engañoso. Coherente con FREEZE-D16 (honestidad) y con el patrón de `calcSharpeRatio` existente.
