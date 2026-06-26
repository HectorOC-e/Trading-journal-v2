# TEST_REPORT_SPRINT_6.md
### Sprint 6 · Verificación · 2026-06-26

## 1. Global
| Gate | Resultado |
|---|---|
| Vitest | ✅ **972/972** (104 archivos) · +5 S6 |
| tsc --noEmit | ✅ 0 errores |
| eslint | ✅ 0 errores en archivos S6 |
| Migración replay | ⏳ CI; aditiva (3 tablas + RLS) |

## 2. Tests nuevos (TDD)
| Módulo | Casos | Qué prueba |
|---|---|---|
| `coach-memory.test.ts` | 5 | frontera (`isInjectable` solo confirmed; `proposeMemory` siempre candidate/llm), `assembleContextBlock` (incluye identidad/compromisos/hechos/resumen; presupuesto trunca hechos con "(+N más)") |

## 3. Verificación end-to-end (prod)
Con usuario throwaway: añadir memoria (confirmada) + un compromiso activo → el bloque MEMORIA se inyecta en el prompt del coach; memoria visible en el panel y borrable. *(Detalle en el PR.)*

## 4. No-regresión
- El coach sigue funcionando sin memoria (best-effort; un fallo de contexto no rompe el chat).
- Aditivo: 3 tablas + 1 router + 1 panel; el `streamCoachReply` solo gana un bloque opcional.
