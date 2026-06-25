# CHANGELOG_SPRINT_1.md
### Trading Journal v3.1 — Sprint 1 (Unificación de Reglas, C6)

> Estado: **completado** (cutover de enforcement gated a G2; migración replay vía CI). No se avanzó a Sprint 2.
> Principio rector del sprint: **fusión semántica, no destructiva, sin tocar el bloqueo pre-trade** (FREEZE-D8/D9/P9, gate G2).
> Fecha: 2026-06-25 · Rama: `feat/v3-master-plan`.

---

## 1. Resumen
Se unificó el concepto de "Regla": el modelo `Rule` (descriptivo) absorbe los campos ejecutables de `Automation` y gana `mode: enforce | warn`. La migración es **aditiva** y **no destructiva**: `Automation` se conserva y **el motor sigue enforzando desde `Automation`** (invariante intacto). El cutover de enforcement a `Rule` es un paso **verificado aparte (gate G2)**, precedido por un **informe de no-mapeo** que delata la "falsa protección" (reglas CRÍTICA descriptivas que no bloquean nada — riesgo R3).

---

## 2. Archivos creados (código)
| Archivo | Propósito | Freeze |
|---|---|---|
| `src/domains/rules/unification.ts` | merge semántico puro: `classifyMode`, `automationToUnifiedRule`, `descriptiveRuleToUnifiedRule`, `buildNoMappingReport` | C6, FREEZE-D8/D9, E2 |
| `src/domains/rules/protection-templates.ts` | catálogo `PROTECTION_TEMPLATES` (#8) + `templateToUnifiedRule` | E6.C2 |
| `src/domains/rules/migration-report.ts` | dry-run read-only del informe de no-mapeo (gate G2) | gate G2 |
| `src/components/rules/rule-mode-badge.tsx` | badge enforce/warn (DS §5, color no es el único portador) | DS §5 |
| `src/app/api/cron/rules-migration-report/route.ts` | endpoint del informe (Bearer CRON_SECRET, read-only) | — |

## 3. Archivos creados (tests — 19 casos nuevos)
| Archivo | Casos |
|---|---|
| `src/__tests__/domains/rules/unification.test.ts` | 10 |
| `src/__tests__/domains/rules/protection-templates.test.ts` | 6 |
| `src/__tests__/components/rule-mode-badge.test.tsx` | 3 |

## 4. Archivos modificados
| Archivo | Cambio |
|---|---|
| `src/prisma/schema.prisma` | `Rule` extendido: `mode, trigger, conditions, actions, priority, category, lastFiredAt, sourceAutomationId, sourceCommitmentId, sourceInsightId` + índices |
| `src/app/reglas/page.tsx` | `RuleModeBadge` junto al nombre de cada regla (mode derivado de `classifyMode(actions)`) |
| `docs/v3/README.md`, `docs/v3/SPRINT_PLAN.md` | estado S1 |

## 5. Migraciones
| Archivo | Contenido |
|---|---|
| `supabase/migrations/20260625130000_v3_s1_unify_rules.sql` | `ALTER rules ADD COLUMN …` (aditivo) + índices + **backfill idempotente** desde `automations` (mode=enforce si `actions @> [{"type":"BLOCK"}]`). `automations` **no se borra**. |

> Idempotente y replayable: el backfill usa `where not exists (… source_automation_id = a.id)`. Replay desde cero → CI (`migrate-validate`).

## 6. Entidades
- **E2 `Rule` (unificado)** — extiende el modelo existente; no es tabla nueva. Absorbe la semántica ejecutable de `Automation`.
- `Automation` — **conservada intacta** (fuente de enforcement hasta G2).

## 7. Eventos
- Ninguno nuevo en S1. (`rule.fired` ya está en el catálogo del freeze; su emisión desde el modelo unificado llega con el cutover.)

## 8. Plantillas de protección (#8)
| id | Estado | Campo |
|---|---|---|
| `daily-loss-stop` | ✅ disponible (enforce) | `dayPnlPct` |
| `weekly-loss-limit` | ✅ disponible (enforce) | `weekPnlPct` |
| `cooldown-after-loss` | ✅ disponible (enforce) | `minsSinceLastLoss` |
| `no-size-increase-after-loss` | ⛔ gated | requiere contexto del trade anterior (captura, S2+) |
| `no-trade-low-energy` | ⛔ gated | requiere campo de energía del check-in (S8) |

> Honestidad (FREEZE-P3): las gated **no** se materializan como reglas; `templateToUnifiedRule` lanza si se intenta. Sin enforcement falso.

## 9. Lo que NO se hizo (anti-alcance / gated)
- ❌ **Cutover de enforcement** `Automation`→`Rule` (gate G2, requiere revisar el informe de no-mapeo). El motor (`runAutomations`) **no se tocó**.
- ❌ Borrado de `automations` (P9: conservar hasta verificar).
- ❌ Reglas sugeridas desde insights / `linkRule` con compromisos (es S5).
- ❌ Campos de contexto nuevos en el motor (size-vs-last, energy) — pertenecen a S2/S8.
- ❌ Avance a Sprint 2.

## 10. Verificación
Ver `TEST_REPORT_SPRINT_1.md`: **836/836 vitest** (+19), **32/32 del motor de reglas sin regresión** (bloqueo pre-trade intacto), tsc+eslint verdes.
