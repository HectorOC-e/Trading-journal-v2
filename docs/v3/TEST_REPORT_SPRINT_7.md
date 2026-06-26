# TEST_REPORT_SPRINT_7.md
### Sprint 7 · Verificación · 2026-06-26

## 1. Global
| Gate | Resultado |
|---|---|
| Vitest | ✅ **986/986** (105 archivos) · +14 S7 |
| tsc --noEmit | ✅ 0 errores |
| eslint | ✅ 0 errores en archivos S7 |
| Migración replay | ⏳ CI; aditiva (1 tabla + RLS) |

## 2. Tests nuevos (TDD)
| Módulo | Casos | Qué prueba |
|---|---|---|
| `intervention.test.ts` | 14 | `priority` (producto + fatiga); `detectInterventions` (cascada/revenge/oversizing/dd_breach/dd_approach/silencio); `decideIntervention` (calma→muestra; suprime por activa/cooldown/budget/θ; **capital override siempre**) |

## 3. Verificación end-to-end (prod)
Con usuario throwaway: cuenta con dd diario + cerrar 3 trades perdedores → al 3º se persiste una `Intervention` (cascada) → el overlay aparece en `/trades` → "Activar protección" registra `response=accepted, outcome=protected` y **crea una regla enforce**. *(Detalle en el PR.)*

## 4. No-regresión
- El cierre de trade no cambia de contrato; la intervención es best-effort (try/catch) y nunca rompe el write.
- Bloqueo pre-trade intacto. Aditivo: 1 tabla + 1 router + 1 overlay.
