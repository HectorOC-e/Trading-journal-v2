# TEST_REPORT_SPRINT_11.md
### Sprint 11 · Verificación · 2026-06-27

| Gate | Resultado |
|---|---|
| Vitest | ✅ **1104/1104** · +27 S11 |
| tsc --noEmit | ✅ 0 (completo, sin filtrar) |
| eslint | ✅ 0 en archivos S11 |
| Migración replay | — sin migración (engine puro) |
| Bloqueo pre-trade | ✅ sin regresión (no se tocó `rules/engine`) |

## Tests nuevos (TDD) (27)
- **`instrument-edge`** (6): edge + contribución por símbolo, poda con negativo significativo, **no poda con negativo dentro del ruido**, positivo significativo, peor netPnl primero, neutral bajo el mínimo.
- **`tag-edge`** (6): gold consistente, poison consistente, cuenta por cada tag del trade, neutral dentro del ruido, gold ordenado arriba, neutral bajo el mínimo.
- **`transfer`** (4): `associated-improvement` con n + caveat (no causa), `associated-decline`, `no-association`, `insufficient`.
- **`srs`** (7): primer review 1d, segundo 6d, ×ease desde el tercero, lapse a 1d+reset, `decaying` acorta, `improving` alarga, ease con suelo 1.3.
- **`error-cards`** (4): tag recurrente → tarjeta con coste, orden por coste (peor primero), ignora no-errores, exige mínimo de ocurrencias.

## Verificación contra BD real (smoke, throwaway borrado)
Usuario con historia real de trades cerrados:
- **instrumentos** (8 símbolos, netPnl total 17.036): NQ 14t avgR 0.50 `neutral`, US30 16t 0.03 `neutral`, BTCUSD 2t `neutral` (n<mínimo) — ninguno significativamente negativo → sin poda (honestidad estadística).
- **tags** (8): **gold `['A+']`**, **poison `['fomo','revenge']`** — clasificación correcta sobre datos reales.
- **error cards** (3): **FOMO 15× −19.5R**, **Revancha 13× −18.5R**, Off-plan 6× −4.7R — flags `revengeFlag/fomoFlag` mapeados a tags, ordenados por coste.
- **transferencia**: sin recurso con setups vinculados para este usuario → skip (rama `setupIds=0` cubierta por unit test).

Hallazgos accionables reales (FOMO cuesta 19.5R); servicios corren contra el schema real (tsc + runtime).
