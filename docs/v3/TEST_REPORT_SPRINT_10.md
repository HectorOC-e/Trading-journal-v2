# TEST_REPORT_SPRINT_10.md
### Sprint 10 · Verificación · 2026-06-27

| Gate | Resultado |
|---|---|
| Vitest | ✅ **1077/1077** · +27 S10 |
| tsc --noEmit | ✅ 0 (completo, sin filtrar) |
| eslint | ✅ 0 en archivos S10 |
| Migración replay | — sin migración (engine puro) |
| Bloqueo pre-trade | ✅ sin regresión (no se tocó `rules/engine`) |

## Tests nuevos (TDD) — `__tests__/domains/analytics/setups/` (27)
- **`welch`** (8): t y df Welch caso conocido (`t=−3.674, df=4`), p≈1 con medias iguales, p baja al separarse, **muestra ruidosa → p mayor** que una ajustada, null con <2; one-sample t y df, p≈1 en la referencia.
- **`edge-decay`** (6): insufficient bajo el mínimo, decay claro de baja varianza, **NO decay cuando la caída está dentro del ruido** (varianza, no señal), improvement significativo, fallback one-sample vs avg R definido, insufficient sin baseline.
- **`drift`** (6): insufficient bajo el mínimo, drift de dirección (operado contra el lado definido), drift de avgR (0.8 vs 1.5), drift de WR, aligned cuando ejecución = definición, insufficient sin nada definido.
- **`evolution`** (3): WR/avgR/netPnl por ventana rodante, avgR null sin R pero WR presente, vacío sin trades.
- **`variant-compare`** (4): ganador cuando una variante es significativamente mejor, sin ganador si son indistinguibles, win-rate desde P&L, null con muestra insuficiente.

## Verificación contra BD real (smoke, throwaway borrado)
Setup **"Breakout London"** real (57 trades cerrados con R):
- `hasData:true`, n=57.
- **decay** `stable`: recent avgR 0.41 vs baseline 0.15, **no significativo** (p=0.53, two-sample) → no marca decay pese a la diferencia (honestidad estadística, D10.1).
- **drift** `drifting`: dimensión top **avgR**, definido **1.2** vs operado **0.24** — hallazgo real de definición-vs-ejecución (#32).
- **evolution**: 5 ventanas (57/10).
- **redefinition**: n/a (setup nunca redefinido, `edgeUpdatedAt` null).

Números sanos; el drift encontró una señal accionable real. Servicio corre contra el schema real (tsc + runtime).
