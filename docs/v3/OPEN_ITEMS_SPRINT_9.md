# OPEN_ITEMS_SPRINT_9.md
### Sprint 9 · Open items

| # | Item | Se resuelve en |
|---|---|---|
| OI-9.1 | Superficie UI del cuadrante de riesgo (ruina/proyección/budget) + `RiskBudgetMeter` | S12/S13 |
| OI-9.2 | Bloqueo duro pre-trade por budget diario + freeze agregado (hoy solo señal/warn) | S13 (reusa rules/account-lock) |
| OI-9.3 | `aggregateCapAmount` como setting por usuario (hoy parámetro del router, inerte si null) | S13 + ajustes PROTEGER |
| OI-9.4 | Horizonte de fase desde el ritmo real / deadline de la firma (hoy 60 sesiones por defecto) | S13 |
| OI-9.5 | Proyección/ruina como Insight persistido (historización + alertas al deteriorarse) | con recompute (#18) |
| OI-9.6 | Política de retiros para TRAILING con floor que sigue al pico (hoy reporta distancia al floor desde inicial) | follow-up |
| OI-9.7 | Verificación live end-to-end por UI (cuando exista la superficie, S12/S13) | S12/S13 |
