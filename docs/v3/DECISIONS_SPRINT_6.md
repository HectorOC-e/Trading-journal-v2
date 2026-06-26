# DECISIONS_SPRINT_6.md
### Sprint 6 · Decisiones · 2026-06-26 · `feat/v3-s6-coach-memory`

## D6.1 — Frontera anti-poisoning en una tabla con status/source (no 4 tablas)
**Decide:** ADR-003 / FREEZE-D9 (irreversible). `CoachMemory` único, pero la frontera vive en `status(candidate|confirmed)` + `source(llm|user)`: el código solo deja al LLM crear candidatos (`proposeMemory`); confirmar es acción de usuario; solo confirmado se inyecta. Cumple D9 ("LLM propone, datos confirman; nada de memoria plana editable por LLM") sin construir aún las 4 capas (episódica = CoachMessage; semántica/identidad = CoachMemory). Las 4 capas completas = sprints posteriores.

## D6.2 — Inyección = memoria confirmada + compromisos activos (sin LLM)
**Reversible.** Para "el coach recuerda" (C2) basta inyectar lo confirmado + los compromisos activos (que ya existen, S4/S5). La auto-extracción LLM de candidatos se difiere a S7 (no hay completion one-shot; pertenece al worker). Honesto: no se fabrica memoria.

## D6.3 — Persistencia del intercambio client-side (appendExchange)
**Reversible.** El stream va al cliente; en vez de tee-arlo server-side, el drawer persiste user+assistant vía `coach.appendExchange` al terminar (best-effort) y guarda el `threadId`. La inyección de memoria es server-side (no necesita threadId).

## D6.4 — Edición de memoria por el usuario la marca source=user
**Reversible.** Editar/crear memoria = el usuario la hace de confianza (`source=user`, `confirmed`). Borrable siempre (ADR-003 §3).
