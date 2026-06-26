# DECISIONS_SPRINT_8.md
### Sprint 8 · Decisiones · 2026-06-26 · `feat/v3-s8-psychology`

## D8.1 — Calibración con el Bayesiano de S3 (no WR crudo)
**Decide:** R6/ADR-002. Cada bucket de confianza se evalúa con `proportionEstimate` vs la media, exigiendo confianza posterior ≥0.8 y `value` realmente a un lado de la media. Un bucket pequeño no puede fingir señal. Guarda extra contra baseline degenerada (todos ganan/pierden).

## D8.2 — Check-in recomienda, no bloquea (por ahora)
**Reversible.** El veredicto `no_go` **recomienda** no operar (criterio de validación S8). El bloqueo duro en el momento ya lo cubre la intervención (S7). Un check-in que genere una regla "stop por hoy" queda como follow-up.

## D8.3 — PreSessionCheckin como entidad propia (no reutilizar TradingSessionLog)
**Reversible.** `TradingSessionLog` es un registro post-hoc de sesión (mood/energía); E12 es un acto deliberado pre-sesión con veredicto. Entidad separada (FREEZE E12). `getMoodTrend` combina ambas fuentes.

## D8.4 — Una sola dimensión crítica fuerza no_go
**Reversible.** Dormir 1/5 (o ánimo 1/5) basta para un rojo aunque la media sea decente — un colapso puntual es suficiente para no operar.
