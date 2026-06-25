# DECISIONS_SPRINT_2.md
### Decisiones tomadas durante la implementación de Sprint 2

## D-S2-1 — C7 se cierra con bucle de incentivo, no con "menos taps"
**Decisión:** la pieza central es `emotion-feedback.ts` (D10): al capturar emoción se devuelve el WR/avgR histórico del trader con esa emoción.
**Por qué:** el Challenge §1.3 demostró que el problema de v2 no eran los taps sino la **falta de retorno** del dato. Sin incentivo, el nudge se ignora igual.

## D-S2-2 — Feedback con umbral mínimo de muestra (n≥5)
**Decisión:** `feedbackForEmotion` devuelve `null` por debajo de 5 trades con esa emoción.
**Por qué:** mostrar "tu WR ansioso es 100%" con n=1 es ruido peligroso (R6/ADR-002). Mejor no mostrar nada que un dato engañoso. El `n` viaja en el feedback para que la UI lo matice.

## D-S2-3 — Auto-tagging determinista, no LLM (en S2)
**Decisión:** `suggestTagsFromNote` es un matcher de keywords; suggestion-only, cap de 3.
**Por qué:** determinismo primero (FREEZE-P2) y testeabilidad. El LLM es una capa de enriquecimiento posterior, no un requisito de S2. Nada se aplica sin confirmación del usuario.

## D-S2-4 — Campos nuevos opcionales y aditivos; `riskPct` derivado en cliente
**Decisión:** `riskPct/maeR/mfeR/regime` son columnas nullable; `trades.create` los acepta opcionales y los persiste vía `...input`. `riskPct` lo deriva el cliente con `deriveRiskPct` (que conoce el balance de cuenta en el formulario).
**Por qué:** mínima superficie de cambio en el camino de captura (no romper). La derivación server-side desde el balance es un fallback documentado (OPEN_ITEMS), no un riesgo asumido sin DB para testear.

## D-S2-5 — `deriveSession` es una aproximación editable, no la verdad
**Decisión:** ventanas horarias fijas sobre la hora de apertura (sin timezone), pre-rellenan `session`; el usuario puede editar.
**Por qué:** el campo no tiene timezone; una derivación perfecta es imposible. Pre-rellenar reduce fricción (#27) sin imponer. Las fronteras concretas están pinned en tests.

## D-S2-6 — Checklist obligatorio se modela como evaluación, no como bloqueo duro
**Decisión:** `evaluateChecklist` devuelve `offPlan` (no lanza). Un setup con checklist incompleto → tag "Off-plan", no un bloqueo que impida guardar.
**Por qué:** E5.C3 pide "frenar si no cumples" vía etiquetado automático, no perder el trade. El bloqueo duro es competencia del motor de reglas (S1), no de la captura. Mantiene la captura sin fricción destructiva.

## D-S2-7 — `regime` manual (trend/range/volatile) en v3.0
**Decisión:** enum manual; sin proxy derivado del P&L.
**Por qué:** FREEZE-D18 marca el proxy de régimen como circular/experimental. Captura manual ahora; ATR exógeno es futuro.
