# Backlog — Trading Journal v2

> Única fuente de verdad para trabajo pendiente accionable. Última actualización: 2026-06-05.
> Sin duplicados, sin tareas obsoletas, sin tareas ya implementadas.
> Prioridad: P1 (próximo) · P2 (deseable) · P3 (oportunista). Esfuerzo: S/M/L.

## P1 — Próximo (v2.1)
| ID | Tarea | Esfuerzo | Notas |
|---|---|---|---|
| B-01 | Generar iconos PWA PNG (192/512) y verificar `apple-touch-icon` en iOS | S | Script `scripts/gen-icons.mjs` |
| B-02 | Añadir `eslint` como gate de CI | S | Probado: gates solo-tsc dejan pasar bugs reales |
| B-03 | E2E Playwright en CI (smoke tests ya scaffolded) | M | — |
| B-04 | Wire de error tracker (Sentry) para runtime | M | Observabilidad parcial hoy (`logger.ts`) |
| B-05 | Test de carga a 1000+ trades; activar/medir `TradeStatsCache` | M | Cache existe, flag off |

## P2 — Deseable
| ID | Tarea | Esfuerzo | Notas |
|---|---|---|---|
| B-06 | Captura de charts en export PDF (hoy solo tablas) | M | `html2canvas` o chart con SVG export (QA M-02) |
| B-07 | Superficie de detección de patrones en la UI | M | `pattern-detector` ya existe |
| B-08 | Fallback de onboarding paso 4 (detectar `profile.email`||`name`) | S | QA M-03 |
| B-09 | Procedimiento de bump de cache del Service Worker por deploy | S | QA M-04 (evita HTML stale) |
| B-10 | Comparación de reviews lado a lado | M | — |

## P3 — Oportunista / futuro
| ID | Tarea | Esfuerzo | Notas |
|---|---|---|---|
| B-11 | Implementar features IA configurables pero no consumidas (trade/psychology/learning analysis) | L | Resolución ya lista vía `resolve-provider`; hoy "fantasma" |
| B-12 | `AiUsageLog` (tracking de uso/costo IA) | M | — |
| B-13 | Soporte multi-divisa | L | — |
| B-14 | Integración con API de brokers (import automático) | L | — |
| B-15 | App móvil / profundización PWA | L | — |
| B-16 | Features sociales (compartir setups, leaderboards) | L | — |

> Deuda técnica (refactors/riesgos) se rastrea aparte en [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).
> Bugs y hallazgos de calidad en [QA_STATUS.md](QA_STATUS.md).
