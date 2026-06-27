# DECISIONS_SPRINT_11.md
### Sprint 11 · Decisiones · 2026-06-27 · `feat/v3-s11-learning-edges`

## D11.1 — Poda/poison/gold por significancia (Welch one-sample vs 0), no por media cruda
**Decide #24/#20/P3.** Un símbolo se marca para poda y un tag como veneno/oro solo si su edge difiere de 0 de forma significativa (Welch). Verificado en el smoke real: NQ avgR 0.50 pero `neutral` (no significativo); A+ `gold`, fomo/revenge `poison`.

## D11.2 — Transferencia = asociación, nunca causa (D17)
**Decide FREEZE-D17.** `computeTransfer` etiqueta `associated-improvement/decline/no-association` y adjunta un **caveat de confounds** (régimen/tiempo/n). La UI/coach no puede decir "causa"/"transferencia causal". Antes/después se parte por la fecha del recurso.

## D11.3 — SRS adaptado al rendimiento del setup vinculado
**Reversible.** SM-2 estándar (intervalo 1→6→×ease, ease≥1.3) modulado: edge del setup vinculado `decaying` → ×0.5 (revisar antes), `improving` → ×1.2. El núcleo puro `computeNextReview` es el entregable; cablearlo a la mutación de grade es tarea de superficie (S12).

## D11.4 — Errores→tarjeta priorizados por coste real, con flags como tags
**Reversible.** `generateErrorCards` agrupa tags de error (≥3 ocurrencias) y ordena por coste en R (peor primero). El servicio enriquece con `revengeFlag→Revancha`/`fomoFlag→FOMO` para no perder errores marcados por flag. Set de tags de error por defecto (extensible).

## D11.5 — Sin migración; transferBaseline (E4) derivado
**Reversible (precedente S3/S9/S10).** El antes/después se computa de la historia por fecha del recurso; persistir `transferBaseline` (snapshot de edge al vincular) se hará si una superficie lo exige.

## D11.6 — Routers `edges` y `learningInsights` nuevos (read-only)
**Reversible.** Separados de `markets`/`tags`/`learning` v2 (que siguen siendo CRUD/watchlist). La absorción real de Mercados/Etiquetas en superficies ocurre en S12; aquí se entrega el dato.
