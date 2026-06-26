# OPEN_ITEMS_SPRINT_5.md
### Sprint 5 · Open items (no bloquean)

| # | Item | Se resuelve en |
|---|---|---|
| OI-5.1 | Reglas del loop visibles en `/reglas` (la UI lista `automations`; las del loop viven en `rules`) | S12 (cohesión de superficies) |
| OI-5.2 | `offPlanTrades` como regla "warn" (no prevenible pre-trade, pero avisable) | S8/incremental |
| OI-5.3 | Plantillas extra (energía<3 → S8; no-aumentar-tamaño-tras-pérdida → captura) | S8+ |
| OI-5.4 | Sugerencias/Activar-regla también en HOY + panel de insights nativo | S12/S13 |
| OI-5.5 | `generateSuggestions` agendado (hoy on-demand vía tRPC; podría correr en el cron de insights) | ops/incremental |
