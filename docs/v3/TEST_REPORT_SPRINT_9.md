# TEST_REPORT_SPRINT_9.md
### Sprint 9 · Verificación · 2026-06-26

| Gate | Resultado |
|---|---|
| Vitest | ✅ **1050/1050** · +50 S9 |
| tsc --noEmit | ✅ 0 (completo, sin filtrar) |
| eslint | ✅ 0 en archivos S9 |
| Migración replay | — sin migración (engine puro) |
| Bloqueo pre-trade | ✅ sin regresión (no se tocó `rules/engine`) |

## Tests nuevos (TDD) — `__tests__/domains/analytics/risk/` (50)
- **`band`** (4): banda alrededor del punto, anclaje 0/1, ensancha con muestra pequeña, sin trials.
- **`risk-of-ruin`** (13): `mulberry32` determinista + rango; analítica = `exp(−2)` caso conocido, ruina segura sin edge, 0 con edge y sin varianza, monotonía edge/risk; MC = 0 todo gana / 1 todo pierde, banda, reproducible por seed, TRAILING ≥ FIXED; bundle + null sin historia.
- **`prop-projection`** (7): null sin R; pasa casi seguro con edge fuerte (bottleneck NONE); nunca pasa y culpa TOTAL_DD; TIMEOUT con edge débil; DAILY_DD antes que TOTAL_DD; banda + reproducible; respeta `minTradingDays`.
- **`risk-budget`** (8): room/maxTrades planos al abrir, encogen al perder, exhausted al límite, día ganador ensancha, sin límite → null; `resolveDailyWindow` reset medianoche UTC / antes de la hora → día anterior / offset negativo.
- **`correlation`** (9): suma mismo símbolo cross-cuenta, neteo direccional con gross visible, orden + concentración, vacío; `aggregateFreezeSignal` ok/warn/freeze + inerte sin cap.
- **`withdrawal-policy`** (5): bloquea en evaluación, bloquea sin profit, permite sobre el buffer, aprueba petición + buffer post-retiro, rechaza si excede.
- **`inputs`** (5): porcentaje→fracción, mediana risk-per-trade, fallback sin histórico, daily null, total/target null.

## Verificación contra BD real (smoke, throwaway borrado)
Cuenta **FTMO Funded** real (n=12 trades cerrados con R):
- `hasData:true`; ruina analítica `0.0000`, MC `0.0000` banda `[0.0000, 0.0005]`.
- proyección **omitida** (target 0 → cuenta funded; ver D9.7).
- budget diario: `remainingPct 0.05, maxTrades 5, exhausted false`.
- exposición agregada: 0 posiciones abiertas, freeze `ok`.

Números sanos y coherentes con una cuenta funded rentable. El servicio corre contra el schema real (campos verificados por tsc + runtime).
