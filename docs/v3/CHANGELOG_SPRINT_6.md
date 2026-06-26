# CHANGELOG_SPRINT_6.md
### Trading Journal v3.1 — Sprint 6 (Coach v3 I: memoria + threads, C2)

> Estado: **completado** (threads + memoria con frontera anti-poisoning + inyección en el prompt + UI editable). El worker proactivo/intervención y la auto-extracción LLM de candidatos son **S7**.
> Principio: **el LLM propone, los datos/el usuario confirman** (ADR-003 / FREEZE-D9, irreversible). Solo lo confirmado se inyecta.
> Fecha: 2026-06-26 · Rama: `feat/v3-s6-coach-memory`.

---

## 1. Resumen
El coach pasa de stateless a **recordar**: cada conversación se persiste (`CoachThread`/`CoachMessage`) y el prompt se enriquece con un bloque **MEMORIA** = identidad + hechos **confirmados** + **compromisos activos** (de S4/S5) + resumen previo, acotado por presupuesto (FREEZE-D10). La memoria es **visible/editable/borrable** por el trader.

## 2. Frontera anti-poisoning (ADR-003 / FREEZE-D9) — irreversible
`CoachMemory` nace con la frontera: el LLM solo puede crear `status='candidate', source='llm'` (`proposeMemory`); lo **confirmado** viene del usuario (o soporte determinista, futuro). **Solo `confirmed` se inyecta** (`isInjectable`). Memoria plana editable por LLM = prohibida.

## 3. Dominio puro (TDD) — `src/domains/cognitive/coach/memory.ts`
`isInjectable` (confirmed), `proposeMemory` (siempre candidate/llm), `assembleContextBlock` (identidad+compromisos siempre; hechos confirmados por presupuesto con "(+N más)"; resumen si cabe).

## 4. Schema — migración `20260626200000`
`CoachThread` (E17), `CoachMessage` (E17, capa episódica), `CoachMemory` (frontera: kind/content/status/source/confidence/sourceThreadId). RLS per-usuario. Aditiva.

## 5. Servicios — `src/server/services/coach/`
- `coach-thread-service.ts`: `ensureThread`, `appendMessage`, `getThreads`, `getThreadMessages`.
- `coach-memory-service.ts`: `assembleCoachContext` (confirmado + compromisos activos + último resumen → bloque), `listMemory`/`createMemory`(user→confirmed)/`confirmMemory`/`editMemory`/`deleteMemory`, `proposeMemories` (candidatos — productor LLM en S7).

## 6. Integración
- `streamCoachReply` += `memoryBlock` (tercer bloque de system, dinámico, no cacheado).
- `/api/ai-coach` computa `assembleCoachContext` y lo inyecta (best-effort).
- Router `coach` (memory CRUD + threads + `appendExchange`). El drawer persiste cada intercambio (`appendExchange`) y mantiene el `threadId`.
- UI: `CoachMemoryPanel` en el drawer (toggle 🧠): lista memoria, confirmar/borrar candidatos, añadir hechos.

## 7. Invariantes (ADR-003)
- El LLM nunca escribe memoria confirmada (solo candidatos).
- Memoria visible/editable/borrable por el usuario.
- Una memoria/contexto falla → **nunca rompe el chat** (best-effort).

## 8. Lo que NO se hizo (diferido)
- ❌ **Auto-extracción LLM** de candidatos (resumen de thread + hechos) → **S7** (no hay helper de completion one-shot; encaja con el worker proactivo). El mecanismo (proposeMemory + storage candidato + confirmar) ya existe.
- ❌ Proactividad/intervención en tiempo real, write-tools con permiso, check-in → **S7**.
- ❌ Cifrado en reposo de memoria sensible + opt-out (ADR-003 §3 avanzado) → follow-up.
- ❌ Persistir el assistant message vía tee del stream server-side (se hace client-side con `appendExchange`).

## 9. Verificación
Ver `TEST_REPORT_SPRINT_6.md`: **972/972 vitest** (+5, TDD), tsc+eslint verdes. Verificado en prod: memoria del usuario + compromisos activos se inyectan; memoria editable/borrable.
