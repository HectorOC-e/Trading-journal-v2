# Changelog — Trading Journal v2

> Historial consolidado único, por hito. Formato inspirado en Keep a Changelog.
> Última actualización: 2026-06-05. Detalle verboso por sprint en `docs/archive/changelog-detailed.md`.

---

## [Unreleased] — 2026-06-05 · AI config, migraciones y consolidación documental

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

*Historia detallada por sprint (tareas individuales, IDs de QA) preservada en `docs/archive/changelog-detailed.md`.*
