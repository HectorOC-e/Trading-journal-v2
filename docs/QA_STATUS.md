# QA Status — Trading Journal v2

> Estado actual de calidad. Última actualización: 2026-06-10 (2da pasada).

## Gates (verificados contra código)
| Gate | Resultado |
|---|---|
| `next build` | ✅ Pasa |
| `tsc --noEmit` | ✅ 0 errores, 0 `any` en código de producción |
| Tests unitarios (Vitest) | ✅ **593/593** (47 archivos) — +16 nuevos (CSV import parser + dedup de ruta + D-02) |
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
| F-02 | **Dedup de import CSV no funcionaba por clave compuesta.** En `api/import/mt4/route.ts` la clave de fallback `(symbol, openTime, size)` comparaba el `openTime` ISO completo del parser contra el `openTime` "HH:MM" almacenado en DB → nunca coincidía. La idempotencia dependía solo de `importTicket`; trades sin ticket podían duplicarse al re-importar. Fix: clave compartida `symbol\|YYYY-MM-DD\|HH:MM\|size` (helpers `dupKey`/`storedKey`) + dedup intra-archivo. | Major | ✅ Corregido — cubierto por test de ruta |
| D-02 | **Tope de retiro no restaba retiros previos** (payouts acumulados podían exceder lo ganado). Fix (decisión de producto): `withdrawals.create` ahora valida `saldo disponible = balance inicial + P&L cerrado − retiros no rechazados` (PAGADO+EN_PROCESO+SOLICITADO). | Major | ✅ Corregido — 2 tests nuevos |

## Hallazgos menores (Minor)
| ID | Hallazgo | Severidad | Fix |
|---|---|---|---|
| M-01 | Iconos PWA requieren PNG para iOS | Minor | Generar 192/512 (B-01) |
| M-02 | PDF solo incluye tablas, no charts | Minor | Captura de charts (B-06) |
| M-03 | Onboarding paso 4 depende de `profile.name` | Minor | Fallback a `email` (B-08) |
| M-04 | Service worker puede cachear HTML stale tras deploy | Minor | Bump de cache name (B-09) |

### Observaciones de diseño (requieren criterio de producto, no bugs)
- **D-01** Los retiros son un *ledger separado*: NO reducen el equity mostrado de la cuenta (`Balance actual` = balance inicial + P&L + ajuste de sync). Consistente con el modelo, pero conviene confirmarlo como intención.
- **D-02** ✅ **Resuelto** — ahora el tope resta retiros previos no rechazados (ver tabla de bugs resueltos). El retiro queda como ledger separado (D-01) pero la validación de alta ya no permite sobre-retirar.

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

### ✅ Validados (2da pasada — nivel lógica/integración)
- **CSV import (MT4 + cTrader)** — 2026-06-10: parseo (buy/sell, skip de filas balance/deposit/withdrawal), P&L del broker (columna Profit), ticket de importación, auto-detección de formato, dedup por ticket **y** por clave compuesta `(symbol, fecha, HH:MM, size)`, dedup intra-archivo, e idempotencia de re-import. Reveló y corrigió **F-02**. Cubierto por `__tests__/services/trading/csv-import.test.ts` (parser) + `__tests__/api/import-mt4.test.ts` (ruta, incl. 401/403/dry-run/dedup).
- **Analytics de setups / edge** — 2026-06-10: `calcSetupHealth` (healthy/warning/critical/insufficient), WR y avg R por setup, edge esperado vs real, y sugerencias de ciclo de vida (PAUSE/REVIEW_EDGE) sobre los últimos 20 trades (orden `date asc` ⇒ `slice(-20)` correcto). Cubierto por `setup.test.ts` + `win-rate.test.ts` + risk formulas (160 tests del grupo verdes).
- **Psicología / journaling** — 2026-06-10: `psychology-insights` + `insights-engine` (log de sesión, correlaciones) verdes.

### ✅ Validados (browser E2E autenticado — Playwright, 2026-06-10)
Spec versionada `__tests__/e2e/flows-authed.spec.ts`, chromium real contra dev server + Supabase, usuario de prueba real:
- **Autenticación**: login email/password → `/dashboard`. Rutas protegidas redirigen 307→`/login` sin sesión.
- **Trades**: `/trades` lista trades + acción "Registrar trade" visible.
- **Dashboard**: renderiza (KPIs portfolio/operador/disciplina/playbook).
- **Retiros — multi-cuenta / multi-moneda**: alta de retiro USD (cuenta USD) + EUR (cuenta EUR) → **KPIs separados por divisa** (`Pagado · USD`/`Pagado · EUR`, formato `Intl` `$`/`€`, sin mezclar). Cambio de estado a Pagado, borrado con confirm inline (UI nueva), y **rechazo D-02** al intentar retiro > saldo disponible.

### ✅ Auditoría de Dashboard, Aprendizaje y Reviews (browser, 2026-06-10 · 3ra pasada)
Dataset rico sembrado vía service-role en la cuenta de prueba `ariaoc89` (5 cuentas: sana, **bloqueada** por breach de pérdida diaria, **prop-firm FUNDED** con logs `PHASE_CHANGE` PHASE_1→2→FUNDED, EUR; 49 trades W/L; 7 retiros en los 4 estados y 2 divisas; 3 recursos de aprendizaje + SRS; review semanal + mensual).
- **Dashboard — KPIs verificados contra ground-truth** (computado del DB): Net P&L **$3 113.00**, Win rate **57.14% (28/49)**, Profit factor **1.2390**, Avg R **0.6411**, mejor/peor día, racha, y **balance + win% por cuenta** — todos exactos. Gauge prop-firm de "Reto Bloqueado" muestra **ALERTA pérdida diaria 5.4% / 5.0%** (breach real). Tabs Operador/Disciplina renderizan con datos (discipline score 75.51, A+ vs std, heatmap, violations por tag).
- **Aprendizaje**: 3 recursos con badges de tipo/estado, scheduling SRS ("Review hoy / en N días"), tags, acciones. Funcional.
- **Reviews**: KPIs semanales (P&L +$1 240, WR 63%, disciplina 78) + tarjeta de review con score bar y qué-funcionó/a-mejorar. Funcional.

Hallazgos (dashboard):
- **D-03** ✅ **Resuelto** — el dashboard ahora **normaliza a la moneda base** del usuario (`user.baseCurrency`). `dashboardStats` convierte P&L y balance de cada cuenta por su factor divisa→base vía `lib/fx.ts` (`fxFactor`). Verificado en vivo: Net P&L $3 113→**$3 144.20**, cuenta EUR balance $30 390→**$32 821.20** (×1.08), cuentas USD sin cambio, y los % de drawdown **invariantes** (numerador y denominador escalan igual). Tabla FX estática (futuro: configurable/live). Cubierto por `__tests__/lib/fx.test.ts`.
- **Minor (abierto)** La cuenta bloqueada (`locked=true`) aparece como ESTADO "Activa" en la tabla de comparación (lock ≠ status); el gauge prop-firm sí señala el riesgo. Un badge "Bloqueada" sería más claro.
- **Minor (abierto)** El símbolo de moneda en el dashboard está fijo en `$`; si la base no fuera USD habría que reflejar el símbolo de `baseCurrency`.

> **Nota de entorno:** el bloqueo SSL/MITM de la 1ra pasada **ya no aplica**; el único obstáculo aquí fue que el *resolver del sistema* filtraba `*.supabase.co` (el host sí resuelve por DNS público). Workaround: pin en `/etc/hosts`. Con eso, server + browser alcanzan Supabase y el E2E autenticado corre completo.
> Datos de prueba: la cuenta `ariaoc89` es de **pruebas dedicada**; el dataset sembrado se **conserva** (más datos = mejor para auditar).
> Recomendación: añadir estas specs al CI con un usuario E2E sembrado vía service-role (B-03).

## Seguridad validada
RLS en todas las tablas · `protectedProcedure` (userId de sesión) · IDOR fix en `ai-embed` · rate limiting IA · SQL parametrizado · `CRON_SECRET` · claves IA cifradas (AES-256-GCM) · cap 16KB en webhook body.

## Recomendación
Listo para producción (GO condicional al checklist de pre-lanzamiento en [RELEASE_STATUS.md](RELEASE_STATUS.md)). Recomendado: añadir `eslint` y E2E al CI (B-02, B-03).
