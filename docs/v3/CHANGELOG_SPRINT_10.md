# CHANGELOG_SPRINT_10.md
### Trading Journal v3.1 — Sprint 10 (Playbook intelligence, E8)

> Estado: **completado** (edge decay con significancia + drift definido-vs-operado + curva de evolución + base de A/B de variantes).
> Fecha: 2026-06-27 · Rama: `feat/v3-s10-playbook`.

## 1. Resumen
El playbook deja de mostrar promedios sin contexto: ahora distingue **edge real de ruido** (significancia, no la ventana fija de 20), detecta **drift entre cómo definiste un setup y cómo lo operas**, dibuja la **evolución de su edge** y compara **variantes** con rigor. Determinista (P2); honesto sobre la muestra (P3).

## 2. Dominio puro (TDD) — `src/domains/analytics/`
- **`institutional/stats/welch.ts`:** Welch t-test (varianzas desiguales) + t-test de una muestra; p-value de la t de Student vía `regularizedIncompleteBeta` (reusa el motor Bayesiano de S3). El cimiento estadístico que evita marcar decay por varianza.
- **`setups/edge-decay.ts` (#12):** expectancy/avgR reciente vs baseline (**ventana histórica** si hay ≥2, si no el **avg R definido** del setup, one-sample). Solo marca `decaying`/`improving` si el cambio es **significativo** (Welch, α=0.05); si no, `stable`. `insufficient` con poca muestra (R6).
- **`setups/drift.ts` (#32):** definición (dirección / WR esperado / avg R esperado) vs ejecución reciente; marca la **dimensión que más driftea** ("definiste 1.5R, operas 0.8R"). Solo evalúa dimensiones realmente definidas — sin expectativa fabricada.
- **`setups/evolution.ts` (#21):** serie WR/avgR/netPnl por setup vía `rollingWindow` (S0) → datos del `EdgeEvolutionChart`.
- **`setups/variant-compare.ts` (#50):** **base** de A/B — compara el edge (avg R) de dos cohortes y nombra ganador **solo si es significativo** (Welch). Framework completo de A/B = POST-7.

## 3. Schema
**Sin migración.** Todo se calcula de la historia de trades + la definición ya en `Setup` (`direction/expectedWr/expectedAvgR/edgeUpdatedAt`). `SetupEdgeSnapshot` (E18) persistido se difiere a su uso real (ImprovementScore S14 / recompute).

## 4. Servicio + API
- `server/services/setups/playbook-service.ts` (orquestación Prisma, **read-only**): `getSetupPlaybook` → `{ decay, drift, evolution, redefinition }`. `redefinition` compara edge **antes/después de `edgeUpdatedAt`** (#50 aplicado a la redefinición real del setup).
- Router `playbook` (`setup`) registrado en `root.ts`.

## 5. Invariantes
- **Significancia honesta (P3/R6):** ni decay ni ganador de variante sin superar el ruido (Welch). `insufficient`/`stable` sobre muestra pobre.
- **Determinista (P2):** todo número del engine; el servicio solo lee y forma.
- Sin tocar el bloqueo pre-trade ni la separación práctica/real.

## 6. Diferido (OPEN_ITEMS_SPRINT_10)
- Superficie UI (`EdgeEvolutionChart`, drift badges, sugerencia de poda) → S12.
- `SetupEdgeSnapshot` persistido (job) → S14 / recompute.
- Drift por sesión/mercado (no hay campo "sesión esperada" en `Setup`) → requiere ampliar la definición.
- Decay como Insight persistido + oferta de compromiso/regla "revisar setup X" → con recompute/behavior.
- A/B completo (asignación, tagging por versión en el trade) → POST-7.

## 7. Verificación
Ver `TEST_REPORT_SPRINT_10.md`: **1077/1077 vitest** (+27, TDD), tsc+eslint verdes. **Smoke contra BD real** (setup "Breakout London", 57 trades): drift detectó **avgR definido 1.2 vs operado 0.24** (`drifting`); decay `stable` (diferencia no significativa, p=0.53) — hallazgo real + honestidad estadística.
