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

## Bugs resueltos (E2E run 2026-06-10)
| ID | Hallazgo | Severidad | Estado |
|---|---|---|---|
| F-01 | **Historial de cuenta stale tras mutaciones.** Las entradas de audit (cambio de fase, lock/unlock, retiros) no aparecían en el modal de Historial hasta recargar la página. Dos causas: (1) `invalidate()` en `cuentas/page.tsx` no invalidaba `accountLogs.list` (con `staleTime: 30s` se servía la primera página cacheada); (2) el modal `account-history-modal.tsx` deduplicaba por cursor y descartaba la primera página re-fetcheada. | Major | ✅ Corregido (ambas capas) — verificado E2E |

## Hallazgos menores (Minor)
| ID | Hallazgo | Severidad | Fix |
|---|---|---|---|
| M-01 | Iconos PWA requieren PNG para iOS | Minor | Generar 192/512 (B-01) |
| M-02 | PDF solo incluye tablas, no charts | Minor | Captura de charts (B-06) |
| M-03 | Onboarding paso 4 depende de `profile.name` | Minor | Fallback a `email` (B-08) |
| M-04 | Service worker puede cachear HTML stale tras deploy | Minor | Bump de cache name (B-09) |

### Observaciones de diseño (requieren criterio de producto, no bugs)
- **D-01** Los retiros son un *ledger separado*: NO reducen el equity mostrado de la cuenta (`Balance actual` = balance inicial + P&L + ajuste de sync). Consistente con el modelo, pero conviene confirmarlo como intención.
- **D-02** La validación de tope del retiro usa `balance inicial + P&L cerrado` y **no resta retiros previos** → payouts acumulados podrían exceder lo ganado. Decisión de producto.

### Nitpicks
- N-01: auto-print del export puede dispararse antes de cargar fuentes → usar `document.fonts.ready`.
- N-02: diff de versión vacío no muestra mensaje "sin cambios de checklist".
- N-03: `weeklyReviews.generateSummary` sin clave de IA degrada con el mensaje correcto ("Configura un proveedor de IA…") pero responde HTTP 401 en vez de 412 (`PRECONDITION_FAILED`). UX correcta; status semánticamente impreciso.

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
- **Gestión de posición** (scale-in / cierre parcial) — 2026-06-10: `position-log-modal` + `computeScaleInAvgEntry`; el avg entry recalculado coincide exacto con la fórmula, el P&L parcial estimado (precio − avg) es correcto, y los eventos persisten (`size`/`entry` actualizados) tras reload. 0 errores.
- **Promoción de fase** (Phase 1 → 2 → Funded) — 2026-06-10: override manual cuando el objetivo no está cumplido, aplicación de `newRules` (objetivo 8%), y audit log `PHASE_CHANGE` con from→to + nota. **Reveló y se corrigió el bug F-01.**
- **Retiros / payouts** — 2026-06-10: alta → lista + KPIs (pendiente/pagado/total), transición de estado a Pagado, rechazo por over-balance, audit `WITHDRAWAL` en historial. Ver observaciones D-01/D-02.
- **Sync de balance** (`lastSyncedBalance`) — 2026-06-10: `variance = broker − equity` (+512), ajuste horneado al equity (94 988 → 95 500), línea "Broker" mostrada, y re-sync idéntico idempotente (varianza 0).
- **Review semanal (+ IA)** — 2026-06-10: agregación del periodo (2 trades / −$5 012 / 50% WR), discipline score autoritativo del servidor (100/100), persistencia, y degradación grácil de la IA sin clave configurada (ver N-03).

### ⏳ Próximos flujos a validar
| Prioridad | Flujo | Qué ejercita |
|---|---|---|
| Media | **CSV import (MT4)** | parseo, dedup, P&L del broker, ticket de importación |
| Baja | **Analytics de setups / edge** | win rate y avg R por setup, edge esperado vs real |
| Baja | **Psicología / journaling** | log de sesión, correlaciones |

> Pendientes pausados por bloqueo de **entorno** (inspección SSL corporativa que MITM-ea `supabase.co` de forma intermitente → rompe auth en el navegador headless y la validación de sesión SSR). No es un defecto de la app.
> Recomendación pendiente: portar estos recorridos a specs Playwright versionadas y añadirlos al CI (B-03).

## Seguridad validada
RLS en todas las tablas · `protectedProcedure` (userId de sesión) · IDOR fix en `ai-embed` · rate limiting IA · SQL parametrizado · `CRON_SECRET` · claves IA cifradas (AES-256-GCM) · cap 16KB en webhook body.

## Recomendación
Listo para producción (GO condicional al checklist de pre-lanzamiento en [RELEASE_STATUS.md](RELEASE_STATUS.md)). Recomendado: añadir `eslint` y E2E al CI (B-02, B-03).
