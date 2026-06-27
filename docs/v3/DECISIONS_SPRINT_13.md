# DECISIONS_SPRINT_13.md
### Sprint 13 · Decisiones · 2026-06-27 · `feat/v3-s13-today`

## D13.1 — Prioridad adaptativa con suelo para críticas
**Decide #36/P4.** `priority = base(kind) × severidad × decay-edad × penalización-ignorado`, pero las **críticas saltan el decay** (suelo) → nunca se hunden por ser ignoradas/viejas. Validación del sprint: ignoradas bajan, críticas no.

## D13.2 — Edad como proxy de "ignorado" (v1)
**Reversible.** Sin telemetría de interacción por ítem todavía, el decay usa la **edad** (exponencial, half-life 7d) como proxy de "ignorado". El modelo ya acepta un campo `ignored` para cuando exista el tracking de clicks/descartes (OI-13.1).

## D13.3 — Feed agregado en servicio, no nuevo modelo
**Reversible (precedente S9–S12).** El feed se **computa al vuelo** agregando las fuentes existentes (insights/compromisos/sugerencias/refuerzos/anomalía/budget). **Sin migración** ni tabla de feed. Persistir el feed (para histórico/telemetría) es futuro.

## D13.4 — Anomalía diaria sobre la cuenta principal
**Reversible.** `detectDailyAnomaly` (#44) se computa sobre los trades de la **cuenta real activa principal** (overtrading vs media, pérdida vs p90). Multi-cuenta agregado = follow-up.

## D13.5 — HOY = el dashboard (no ruta nueva)
**Reversible.** El feed se monta en `/dashboard` (la superficie HOY) arriba del hero. La ruta `/hoy` dedicada llega con la migración real de rutas (diferida de S12c).
