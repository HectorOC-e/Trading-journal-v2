# Changelog — Trading Journal v2

> Historial consolidado único, por hito. Formato inspirado en Keep a Changelog.
> Última actualización: 2026-07-14. El detalle verboso por sprint vivía en un
> `changelog-detailed.md` bajo el antiguo directorio de archivo, eliminado en la consolidación
> de docs/ (2026-07-09); sigue disponible en el historial de git.

---

## [2026-07-14] · S0/DT-4 — drift check SQL↔Prisma en CI

> Cierre de deuda técnica de validación (P3).

- **Check en CI:** job `migrate-validate` añade `prisma migrate status` tras el `db reset` local. Falla si el schema.prisma tiene cambios sin migración SQL correspondiente. Previene double-drift.

## [2026-07-14] · TD-018 — trade services extraídos del router `trades`

> Refactor behavior-preserving (PR #130). La deuda estaba parcialmente sobre-estimada: el
> cálculo ya vivía en `domains/`; lo que quedaba inline era orquestación I/O sin tests.

- **Service layer nuevo** en `src/server/services/trades/`: `serializers`, `embedding-service`
  (schedule/search/backfill pgvector), `dashboard-service` (pipeline completo de
  `dashboardStats`), `trade-read-service` (list/violaciones/emoción/patrones) y
  `trade-write-service` (create/update/close/addEvent/delete/checklist con todos los guards).
- **Router `trades.ts`: 1146 → 180 LOC** — schemas zod + delegación; contrato tRPC intacto
  (`RouterOutputs` sin cambios).
- **Primer test directo de `dashboardStats`**: la partición practice (financiero excluye
  DEMO/BACKTEST; discipline las cuenta; cuenta explícita gana) queda documentada por test.

## [2026-07-13] · G2 — cutover de reglas: `rules` es la única fuente

> Cierre del gate G2 (C6/FREEZE-D8). Fase 1 (flip `RULES_SOURCE=rules`) verificada en prod
> por observación directa (`rules.last_fired_at` bump, `automations` quieta); fase 2 en la
> rama `feat/g2-rules-cutover`.

- **Enforcement desde `rules`**: el engine queda solo-`runRules` (se retiran `runAutomations`,
  el dispatcher y el flag `RULES_SOURCE`); las reglas creadas por el loop de comportamiento
  (compromiso→regla) ahora bloquean de verdad.
- **`/reglas` edita `rules`**: router `rules` a paridad ejecutable (builder, plantillas
  fusionadas base+protección, reorder); reglas del loop visibles con badge de origen y
  badge de modo leyendo `rule.mode` (cierra OI-5.1 y S1/DT-5).
- **`automations` archivada**: tabla y modelo intactos (P9), sin lecturas ni escrituras;
  se retiran el router `automations`, el dual-write (`rule-sync`) y el informe de migración
  (`/api/cron/rules-migration-report`, propósito cumplido con el triaje OI-1 sobre datos reales).

## [2026-06-10] · Hardening: P&L, enforcement, CI/migraciones y rendimiento

> Tanda de fixes a partir de pruebas E2E (Playwright) de onboarding, ciclo de vida del trade y enforcement prop-firm. PRs #6–#17.

### Fixed — financiero (core)
- **P&L de cierre manual ignoraba el point value** (#14): un NQ daba +$99.40 en vez de +$1.988 (×$20). `computeClosedTradePnl`/`computeRMultiple` ahora reciben `pointValue` (default 1) + nuevo helper `parsePointValue`; la mutación `close` lo resuelve desde el catálogo de mercados. El import CSV no se vio afectado (usa el P&L del broker). **Nota:** trades cerrados manualmente antes de este fix sobre futuros/FX conservan su `pnl` antiguo (requeriría recompute).
- **Comisión** en el cierre pasó a ser opcional (vacío = $0); antes bloqueaba con "Requerida" (#14).
- **Signo negativo en pérdidas** (#17): la tabla mostraba "$7,000.00" (rojo, sin "−") → ahora "−$7,000.00".
- Drawdown prop-firm + enforcement de límites unificado (#6).

### Fixed — UX / reglas
- **Locks temporales** (diario/semanal/mensual) ya no ofrecen "Desbloquear cuenta" (re-bloqueaba al instante); muestran "se reactiva solo al renovarse el periodo". El desbloqueo manual queda solo para locks permanentes (#17).
- **Onboarding** (#10): mercados se siembran también desde Trades (antes quedaba bloqueado en "No hay mercados"); hydration del toggle de tema; `markets.create` duplicado → 409 + toast (antes 500); warning de `<Script>` inline; balance truncado en tarjeta; estados de carga en el modal de trade; aviso de contratos fraccionarios en futuros.
- **401 de `preferences.get` en `/login`** evitado gateando el query del tema (#9).
- **Service worker** ya no es redirigido por el middleware de auth (excluido del matcher) (#8).

### Performance
- `QueryClient` con `staleTime 30s` + sin refetch-on-focus + `retry 1` (antes refetcheaba todas las queries en cada navegación) (#10).
- Índice `trades(user_id, status, date desc)` para acelerar `dashboardStats` (#11).

### Infra / CI / migraciones
- Node fijado a **20.12+** (`.nvmrc` + `engines`); el toolchain no arranca con Node 18 (#7).
- Migración advisor hecha replay-safe (`user_ai_settings` faltante rompía el `db reset` del CI) (#11).
- Nombre de la migración `add_color_theme_preferences` alineado con la versión aplicada en prod → `db push` limpio (#12).
- GitHub Actions actualizadas (Node 20 → 24): `checkout@v5`, `setup-node@v5`, `pnpm/action-setup@v5` (#13).
- Secrets de GitHub Actions creados → job `migrate-deploy` verde por primera vez.

### Tests
- **577/577** unitarios (12 nuevos para `pointValue`/`parsePointValue`).

---

## [2026-06-05] · AI config, migraciones y consolidación documental

### Added
- **Motor de resolución de IA `lib/ai/resolve-provider.ts`**: único punto que resuelve provider+modelo+key por usuario/feature. Orden de key: clave persistida del usuario (`user_ai_configs`) → env → none.
- **Diagnóstico y Health Check de IA**: `aiConfig.diagnostics` (config efectiva + estado de keys), `aiConfig.healthCheck` + `lib/ai/health-check.ts`, y botón "Verificar configuración IA" en Perfil.
- **Botón "Probar conexión"** por proveedor (Anthropic/OpenAI/OpenRouter).
- **Tabla `user_ai_configs`** (claves IA cifradas) creada en producción vía migración versionada.
- **Sistema de migraciones Supabase CLI** reconciliado en el repo (`supabase/migrations/`, 36 migraciones, `config.toml`); esquema reproducible desde cero.
- Consolidación documental: 9 documentos maestros + `docs/archive/`.

### Fixed
- **Causa raíz "Configura ANTHROPIC_API_KEY" con OpenRouter configurado**: la capa de consumo IA leía provider/key solo de env vars, ignorando la config persistida. Ahora `streamChat`/`embedText` reciben provider+apiKey explícitos.
- **Guardado de claves OpenRouter** fallaba con error genérico (tabla `user_ai_configs` inexistente en prod).

### Changed
- Mensajes hardcodeados de "ANTHROPIC_API_KEY" (UI coach + reviews) → dirigen a Ajustes → Configuración de IA.
- `prisma.config.ts`: Prisma solo genera el cliente; nunca `prisma migrate`.

---

## [Sprints 9-12] — 2026-06-04 · Portfolio MVP, PWA, PDF, Onboarding
- Curva de equity multi-cuenta + comparación (tab Portfolio).
- Filtro de cuenta en trades; diff de versiones de setup.
- Fix de semana ISO en UTC (afecta métricas semanales y rachas).
- PWA (manifest + service worker, instalable, offline de lectura) + iconos PNG.
- Export PDF de reporte de rendimiento (print, tablas).
- Checklist de onboarding (4 pasos, anillo de progreso).
- Cierre de deuda (Cycle 1/2): render purity, a11y ARIA, TD-018/019/037 acotados.
- Estado: feature-complete ~93%, 479 tests, 0 errores TS.

## [Stabilization Sprint] — 2026-06-03 · Remediación QA manual
- 21 hallazgos P0 resueltos (cuentas archivadas excluidas de dashboard, tags personalizados en form de trade, discipline score con 0 trades, validación de retiros ≤ balance, navegación de botones muertos, etc.).
- Migración de campos de psicología + `plan_notes` aplicada.

## [Sprint 8] — Testing, accesibilidad, reviews mensuales
- Infraestructura de tests (Vitest), reviews mensuales, hardening de accesibilidad.

## [Sprint 7] — Hardening de reviews, centralización de disciplina, infraestructura.

## [Sprint 6] — Tema de sistema, filtros de review, sparklines, type safety, hardening de seguridad.

## [Sprint 5] — Config de IA, metas, planNotes, paginación, UX, soporte internacional.

## [Sprint 4] — Psicología, reviews y personalización.

## [Sprints 1-3] — Fundación
- **Sprint 1**: Formula Engine, especificación de fórmulas, decisiones de resolución, auditoría de sitios de win-rate.
- **Sprint 2**: Analítica server-side (`dashboardStats`), review de arquitectura.
- **Sprint 3**: Enforcement de reglas prop-firm, review de arquitectura.

## [Phase 0-1] — Fundación y aprendizaje
- Seguridad/RLS, auth, corrección de datos.
- Sistema de aprendizaje: repetición espaciada, detección de decay, streak materializado, idempotencia de email.

---

*Historia detallada por sprint (tareas individuales, IDs de QA) preservada en el historial de git,
en el antiguo `changelog-detailed.md` del directorio de archivo (previo al commit de consolidación
de 2026-07-09).*
