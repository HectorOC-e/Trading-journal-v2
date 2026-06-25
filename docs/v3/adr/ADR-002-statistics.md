# ADR-002 — Estrategia estadística

- **Estado:** Aceptada
- **Fecha:** 2026-06-25
- **Decide:** `FREEZE-D15`, `FREEZE-D16`, `FREEZE-D17`
- **Resuelve riesgo:** RI-3 / R6 (pseudo-rigor a tamaños retail)

## Contexto
El plan v3 name-dropea Welch t-test, Mann-Kendall, Monte Carlo y Kelly aplicados **per-user** sobre 20–200 trades con ~20 detectores rolling. A esos tamaños y con esa multiplicidad, el frecuentismo genera **falsos positivos** (look-elsewhere) — reintroduciendo el riesgo R6 que la auditoría señala (métricas pseudo-causales que erosionan credibilidad).

## Decisión
1. **Método base: Bayesiano con shrinkage / priors jerárquicos.** El edge de un setup/usuario se estima **encogiendo hacia la población** (pooling parcial). Se reportan **intervalos creíbles**, no p-values per-user.
2. **Sin puntos sin banda (FREEZE-D16):** proyecciones prop / riesgo de ruina se muestran como **distribución** con su inestabilidad; el coach **nunca** cita un punto ("72%") sin su banda.
3. **Causalidad honesta (FREEZE-D17):** transferencia de aprendizaje e ImprovementScore son **asociación con confounds declarados** (n, régimen, tiempo). La UI no usa "causa"/"transferencia" sin diseño causal.
4. **`Insight` lleva `sampleSize` + medida de confianza desde el día 1** (FREEZE-E6) para que intervención/verificación distingan señal de ruido.

## Alternativas consideradas
- *Frecuentismo per-user (t-test/Mann-Kendall)* → rechazada: falsos positivos a n retail; obligaría a reescritura a 24m (riesgo 24m #2).
- *Sin estadística (sólo umbrales)* → rechazada: es el estado v2 (ventana fija de 20 = ruido).

## Consecuencias
- **Irreversible:** la *dirección* metodológica (Bayesiano/jerárquico) — ancla todo el motor analítico.
- **Reversible:** los priors concretos y la fuerza del shrinkage (recalibrables con datos reales).
- **S0:** sólo se persisten los **campos** (`sampleSize`, `confidence`, `credibleIntervalLow/High`, `effectSize`). El **estimador** Bayesiano se construye en S3 (Analytics institucional). Hasta entonces, los campos no-`sampleSize` quedan nulos (no se fabrica rigor — ver OPEN_ITEMS).
