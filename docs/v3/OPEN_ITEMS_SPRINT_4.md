# OPEN_ITEMS_SPRINT_4.md
### Trading Journal v3.1 — Sprint 4 · Open items

> Fecha: 2026-06-26. No bloquean S4.

| # | Item | Por qué se deja | Se resuelve en |
|---|---|---|---|
| OI-4.1 | **`linkRule(commitment, template)`** + continuous-eval para compromisos con regla enforce | el cierre insight→protección es el foco de S5 | **S5** |
| OI-4.2 | **`suggestRulesFromInsights`** + CTA "Activar regla anti-X" en el insight | idem | **S5** |
| OI-4.3 | **Verificador `edge-decay`** (5º de FREEZE-D7) | necesita `SetupEdgeSnapshot` | **S10** |
| OI-4.4 | **Superficies ricas del loop** (HOY: compromisos del día/refuerzos; Reviews: bloque "¿Cumpliste?") | superficies = S12/S13; hoy vive en `/analytics` | **S12/S13** |
| OI-4.5 | **Feed a `ImprovementScore`** desde `commitment.kept/broken` | el índice de mejora es S14 | **S14** |
| OI-4.6 | **Scheduling de crons en prod** (`evaluate-commitments`, `dispatch-events`) | ops (pg_cron → pg_net + cron_secret ya configurado) | ops, cuando se quiera el loop autónomo |
| OI-4.7 | **Insights persistidos poblados en prod** | depende de programar `recompute-insights` (hoy invocable, no agendado) → sin él, `behavior.openInsights` está vacío en prod | ops |
| OI-4.8 | **Más specs insight→commitment** (revenge/oversizing/off-plan necesitan sus detectores) | hoy solo `intraday-decay` tiene detector + spec; los otros 3 verificadores existen, faltan sus detectores | incremental (S8/S10) |

## Heredados relevantes
- El **dispatcher de eventos** ya tiene su primer productor real (`commitment.*`); falta su scheduling en prod (OI-4.6) — entonces drenará los eventos a sus consumidores (coach/HOY, futuros).
