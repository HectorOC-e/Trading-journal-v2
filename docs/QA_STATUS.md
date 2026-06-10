# QA Status — Trading Journal v2

> Estado actual de calidad. Última actualización: 2026-06-10.

## Gates (verificados contra código)
| Gate | Resultado |
|---|---|
| `next build` | ✅ Pasa |
| `tsc --noEmit` | ✅ 0 errores, 0 `any` en código de producción |
| Tests unitarios (Vitest) | ✅ **577/577** (45 archivos) |
| CI completo (incl. `migrate-deploy`) | ✅ Verde en `main` (secrets configurados) |
| Lint (ESLint) | 🟡 Aceptable — warnings preexistentes (TD-037); 0 errores nuevos |
| Render purity / a11y | ✅ Correcto (ARIA, focus rings, landmarks) |

## Bugs abiertos
- **Blocking: 0**
- **Major: 0**

## Hallazgos menores (Minor)
| ID | Hallazgo | Severidad | Fix |
|---|---|---|---|
| M-01 | Iconos PWA requieren PNG para iOS | Minor | Generar 192/512 (B-01) |
| M-02 | PDF solo incluye tablas, no charts | Minor | Captura de charts (B-06) |
| M-03 | Onboarding paso 4 depende de `profile.name` | Minor | Fallback a `email` (B-08) |
| M-04 | Service worker puede cachear HTML stale tras deploy | Minor | Bump de cache name (B-09) |

### Nitpicks
- N-01: auto-print del export puede dispararse antes de cargar fuentes → usar `document.fonts.ready`.
- N-02: diff de versión vacío no muestra mensaje "sin cambios de checklist".

## Riesgos conocidos
Ver [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) (migración en prod, claves IA, SW stale, volumen alto). Todos con mitigación.

## Cobertura funcional validada
Trade CRUD + import CSV · Account CRUD + fases + drawdown/lock · Enforcement prop-firm · Dashboard server-side · Setups (sparklines/versiones/diff) · Reviews (discipline score + resumen IA) · Learning SRS · Retiros · IA Coach (claves per-usuario, diagnóstico, health check) · Metas · Tags/markets/reglas.

## Flujos E2E (Playwright, manual) — 2026-06-10
Recorridos end-to-end contra el dev server real + Supabase, como un trader profesional, capturando consola/red/screenshots.

### ✅ Validados
- **Onboarding completo**: login → cuenta prop-firm → setup → mercado → primer trade → dashboard. (Fixes en #10.)
- **Ciclo de vida del trade**: registrar → cerrar (precio de salida) → P&L realizado → equity de cuenta → dashboard → analytics. (Fixes en #14.)
- **Enforcement prop-firm**: pérdida que rompe el límite diario → auto-lock (`DAILY_LOSS_LIMIT`) → nuevo trade rechazado con 403 + banner. Correcto.
- **Desbloqueo / reactivación**: lock temporal no operable mientras el breach sigue vivo (re-lock); manual unlock solo para permanentes. (Fix en #17.)

### ⏳ Próximos flujos a validar
| Prioridad | Flujo | Qué ejercita |
|---|---|---|
| Alta | **Gestión de posición** (scale-in / cierre parcial) | `position-log-modal`, promedio de entrada (`computeScaleInAvgEntry`), P&L parcial con point value |
| Alta | **Promoción de fase** (Phase 1 → 2 → Funded) | reset de reglas/objetivo por fase, audit log |
| Media | **Retiros / payouts** | impacto en balance/equity, historial, interacción con drawdown |
| Media | **Sync de balance** (`lastSyncedBalance`) | ajuste de equity como adjustment real, journal-vs-broker |
| Media | **Review semanal/mensual** (+ IA) | agregación del periodo, discipline score, resumen IA |
| Media | **CSV import (MT4)** | parseo, dedup, P&L del broker, ticket de importación |
| Baja | **Analytics de setups / edge** | win rate y avg R por setup, edge esperado vs real |
| Baja | **Psicología / journaling** | log de sesión, correlaciones |

> Recomendación pendiente: portar estos recorridos a specs Playwright versionadas y añadirlos al CI (B-03).

## Seguridad validada
RLS en todas las tablas · `protectedProcedure` (userId de sesión) · IDOR fix en `ai-embed` · rate limiting IA · SQL parametrizado · `CRON_SECRET` · claves IA cifradas (AES-256-GCM) · cap 16KB en webhook body.

## Recomendación
Listo para producción (GO condicional al checklist de pre-lanzamiento en [RELEASE_STATUS.md](RELEASE_STATUS.md)). Recomendado: añadir `eslint` y E2E al CI (B-02, B-03).
