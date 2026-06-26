# OPEN_ITEMS_SPRINT_3.md
### Trading Journal v3.1 — Sprint 3 · Open items

> Items abiertos al cierre de S3, con el sprint/owner donde se resuelven. No bloquean S3.
> Fecha: 2026-06-25.

---

| # | Item | Por qué se deja | Se resuelve en |
|---|---|---|---|
| OI-3.1 | **Superficies tRPC + UI** del cuadrante institucional (drawdown chart con bandas, histograma de R, Sortino/Calmar/Kelly, MAE/MFE, benchmark, heatmap) | FREEZE-D3: Analytics es puro; las superficies se diseñan con DS v3 | **S12** |
| OI-3.2 | **Mapper DB→métricas** (cargar trades con `maeR/mfeR/regime` + setups con `expectedWr/expectedAvgR` + equity y componer las 6 métricas) | crear el mapper sin consumidor sería dead code; el `analyticsBundle` actual no selecciona esos campos | **S4** (verificadores) / **S12** (UI) |
| OI-3.3 | **Wiring Bayesiano de insights continuos** (p. ej. `emotion-performance`: diferencia de medias de P&L) | requiere comparador de dos muestras; `normalEstimate` ya existe y está testeado, falta exponer la base en el detector | **S8** (psicología v3) |
| OI-3.4 | **Priors empíricos en producción** — hoy los detectores usan priors por defecto débiles; falta alimentar `empiricalBetaPrior`/`empiricalNormalPrior` con los grupos reales del usuario (setups/instrumentos) | el pooling cobra valor con volumen de datos; los priors son reversibles (FREEZE-D15) | **S9/S10** (edge decay/drift) |
| OI-3.5 | **Ampliar cobertura de `stat`** a más detectores de proporción (setup concentration, etc.) | cobertura inicial acotada a propósito (subconjunto de alto valor) | incremental, **S5+** |
| OI-3.6 | **Smoke en prod del llenado de confianza** — verificar que el cron persiste `confidence/credible_interval/effect_size` no nulos para los 2 detectores cableados | requiere deploy + corrida del cron | tras merge a main |

---

## Heredados de S0–S2 que S3 toca tangencialmente
- **OI (S0) — `sampleSize` coarse:** **parcialmente resuelto** en S3 — cuando un insight tiene base estadística, `sampleSize` se refina al n del detector. Los insights sin base siguen con el n coarse (nº trades).
- **Régimen exógeno (ATR, FREEZE-D18):** sigue postergado (POST-4); el campo `regime` es manual. La analítica por régimen que lo consume llega en S14.
