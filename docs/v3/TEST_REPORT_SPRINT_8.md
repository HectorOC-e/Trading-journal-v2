# TEST_REPORT_SPRINT_8.md
### Sprint 8 · Verificación · 2026-06-26

| Gate | Resultado |
|---|---|
| Vitest | ✅ **1000/1000** · +11 S8 |
| tsc --noEmit | ✅ 0 |
| eslint | ✅ 0 en archivos S8 |
| Migración replay | ⏳ CI; aditiva (1 tabla + RLS) |

## Tests nuevos (TDD) — `psychology-v3.test.ts` (11)
- `calibration`: sobreconfianza (alta confianza gana menos), subconfianza, `insufficient`, ignora trades sin rating, baseline degenerada.
- `checkinVerdict`: dimensión en el suelo → no_go; media baja/media/alta → no_go/caution/go; clamp de rango.
- `moodTrend`: improving / declining / insufficient.

## Verificación end-to-end (prod)
Pendiente tras merge: usuario throwaway → check-in rojo recomienda no operar; calibración con trades de confianza variable.
