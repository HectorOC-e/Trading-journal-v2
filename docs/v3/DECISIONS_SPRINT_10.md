# DECISIONS_SPRINT_10.md
### Sprint 10 · Decisiones · 2026-06-27 · `feat/v3-s10-playbook`

## D10.1 — Edge decay por significancia, no por ventana fija
**Decide #12/P3.** El decay solo se marca si el deterioro supera el ruido esperado para ese n (Welch t-test, α=0.05). Reemplaza la ventana fija de 20 que dispara falsos positivos por varianza. Verificado en el smoke real: recent 0.41 vs baseline 0.15 → `stable` (p=0.53), no decay.

## D10.2 — Baseline: ventana histórica si la hay, si no el avg R definido
**Reversible.** `detectEdgeDecay` prefiere comparar la ventana reciente contra la histórica (two-sample Welch); sin histórico suficiente, cae a one-sample contra `expectedAvgR` del setup. Honesto sobre qué baseline se usó (`comparison`).

## D10.3 — Drift solo sobre dimensiones definidas
**Reversible.** Se evalúan dirección/WR/avgR **solo si el trader las definió** (`expectedWr`/`expectedAvgR`/dirección ≠ AMBAS). No se fabrica expectativa. Drift por sesión/mercado queda fuera: `Setup` no tiene "sesión esperada" (requeriría ampliar la definición).

## D10.4 — Welch t-test en institutional/stats (junto a bayes)
**Reversible.** El test de medias vive en `institutional/stats/welch.ts` (no en setups) porque es una primitiva estadística general; la p-value reusa `regularizedIncompleteBeta` del Bayesiano de S3 (Student-t SF). edge-decay y variant-compare lo comparten.

## D10.5 — #50 = primitiva de comparación, no framework A/B
**Decide FREEZE POST-7.** `compareVariants` compara dos cohortes de R con significancia y nombra ganador solo si es significativo. El A/B completo (asignación, tagging por versión en el trade) es POST-7. En S10 se aplica a la **redefinición real** del setup (antes/después de `edgeUpdatedAt`).

## D10.6 — Sin migración; SetupEdgeSnapshot derivado
**Reversible (precedente S3/S9).** La curva de evolución se calcula de la historia vía `rollingWindow`; persistir `SetupEdgeSnapshot` (E18) se hará cuando lo exija ImprovementScore (S14) o el recompute.
