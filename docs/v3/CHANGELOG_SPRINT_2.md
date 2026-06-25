# CHANGELOG_SPRINT_2.md
### Trading Journal v3.1 — Sprint 2 (Captura de trade v3, C7)

> Estado: **completado** (lógica + persistencia; presentación UI a verificar por el usuario). No se avanzó a Sprint 3.
> Principio del sprint: **el dato debe devolver valor en el mismo trade** (DELTA D10) — no basta con "menos taps".
> Fecha: 2026-06-25 · Rama: `feat/v3-master-plan`.

---

## 1. Resumen
Se cierra C7 a nivel de **lógica y datos**: campos derivables dejan de teclearse (#27), la captura de MAE/MFE y `regime` queda disponible (#35, E5.C6), el checklist por setup se evalúa como obligatorio (E5.C3), las notas se auto-etiquetan de forma determinista (#37) y —clave— al registrar una emoción el sistema devuelve **tu WR histórico con esa emoción** (D10). Todo en módulos puros testeables; las columnas nuevas son aditivas.

---

## 2. Archivos creados (código)
| Archivo | Propósito | Hallazgo |
|---|---|---|
| `src/domains/trading/services/trade-derivation.ts` | `deriveSession`, `deriveRiskAmount`, `deriveRiskPct` | #27, E5.C2 |
| `src/domains/trading/services/capture-rules.ts` | `REGIME_VALUES`/`isRegime`, `evaluateChecklist` | E5.C6, E5.C3 |
| `src/domains/trading/services/note-tag-suggester.ts` | `suggestTagsFromNote` (determinista, suggestion-only) | #37 |
| `src/domains/trading/services/emotion-feedback.ts` | `wrByEmotion`, `feedbackForEmotion` (D10), `needsEmotionNudge` (#10) | D10, #10 |

## 3. Archivos creados (tests — 27 casos nuevos)
| Archivo | Casos |
|---|---|
| `src/__tests__/domains/trade-derivation.test.ts` | 7 |
| `src/__tests__/domains/capture-rules.test.ts` | 6 |
| `src/__tests__/domains/note-tag-suggester.test.ts` | 7 |
| `src/__tests__/domains/emotion-feedback.test.ts` | 7 |

## 4. Archivos modificados
| Archivo | Cambio |
|---|---|
| `src/prisma/schema.prisma` | `Trade` += `riskPct`, `maeR`, `mfeR`, `regime` (todos nullable) |
| `src/server/trpc/routers/trades.ts` | `create` acepta los 4 campos nuevos (opcionales); persistidos vía `...input` |
| `docs/v3/README.md`, `docs/v3/SPRINT_PLAN.md` | estado S2 |

## 5. Migraciones
| Archivo | Contenido |
|---|---|
| `supabase/migrations/20260625140000_v3_s2_trade_capture.sql` | `ALTER trades ADD COLUMN risk_pct, mae_r, mfe_r, regime` (aditivo, nullable). RLS sin cambios. |

## 6. Entidades
- **E1 `Trade` (enriquecido)** — +`riskPct`/`maeR`/`mfeR`/`regime`. No es tabla nueva. `TradeChecklistResult` ya existía (se reutiliza para E5.C3).

## 7. Eventos
- Ninguno nuevo. (`trade.created`/`trade.closed` ya están en el catálogo; su emisión por el outbox desde la mutación llega en S7, fast-path.)

## 8. Cómo se cierra C7 (la tesis del sprint)
| Pieza | Antes (v2) | Ahora (S2) |
|---|---|---|
| Emoción | opcional, sin retorno → se ignoraba | nudge al cerrar (#10) + **devuelve tu WR histórico** con esa emoción (D10) |
| Sesión/riskPct | tecleados a mano | derivables (`deriveSession`/`deriveRiskPct`) |
| Checklist | existía pero no forzado | `evaluateChecklist` → off-plan automático (E5.C3) |
| MAE/MFE | ausentes | columnas + input de captura (#35) |
| Régimen | ausente | `regime` (trend/range/volatile) (E5.C6) |
| Notas | tags manuales | sugerencia determinista 1-tap (#37) |

## 9. Lo que NO se hizo (anti-alcance / gated)
- ❌ **Analítica** de MAE/MFE (eficiencia de salida, calidad de stop) → **S3**.
- ❌ Capa LLM de auto-tagging (el core determinista es suficiente para S2; el LLM es enriquecimiento posterior).
- ❌ Derivación server-side de `riskPct` desde el balance de cuenta (hoy la deriva el cliente con `deriveRiskPct`; fallback server documentado en OPEN_ITEMS).
- ❌ Régimen exógeno (ATR) — v3.0 es manual (FREEZE-D18).
- ❌ Wiring visual del incentivo/nudge/pre-fill en el formulario (UI, verificación del usuario).
- ❌ Avance a Sprint 3.

## 10. Verificación
Ver `TEST_REPORT_SPRINT_2.md`: **863/863 vitest** (+27, TDD), tsc+eslint verdes, sin regresión en trades.
