# Sesiones de backtesting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Planear, documentar, cerrar y exportar sesiones de backtesting desde Prácticas y Playbook.

**Architecture:** El dominio valida el plan y calcula un informe determinista. La API autenticada usa una sesión con revisión optimista y versiones históricas, toma los datos de las prácticas y trades de Backtesting y exporta un documento a partir del cierre guardado.

**Tech Stack:** Next.js App Router, React, tRPC, Zod, Prisma, Supabase PostgreSQL, Chromium.

**Spec:** [Sesiones de backtesting](../specs/2026-11-24-sesiones-backtesting-design.md)

## Global Constraints

- Todas las operaciones deben pertenecer al usuario y estar clasificadas como Backtesting.
- La transición de cierre valida el estado y la versión esperada de la sesión.
- Los motivos faltantes aparecen como **Sin documentar**.
- La IA es opcional. Una versión cerrada conserva sus datos y capturas privadas.

## Review Focus

- Duplicados entre vínculos directos y de prácticas cuentan una vez en la muestra.
- Un cierre con información insuficiente conserva sus advertencias y denominadores.
- Un reintento o una edición concurrente nunca publica una segunda versión accidental.
- Un cambio posterior en un trade no altera el PDF original.
- Los textos de los registros quedan escapados en un PDF de varias páginas.

## Task 1 — Informe y evaluación

**Files:** `src/domains/learning/backtest-session.ts`, `src/__tests__/domains/backtest-session.test.ts`.

**Interface:** `buildBacktestReport(input: BacktestReportInput): BacktestReport` transforma plan, fixtures de evidencia y conclusión en un contrato serializable y validado.

- [ ] Añadir pruebas de deduplicación, R faltante, drawdown, checklist, operaciones abiertas y alcance histórico.
- [ ] Ejecutar `pnpm exec vitest run __tests__/domains/backtest-session.test.ts`, verificar rojo, implementar evaluación y verificar verde.

## Task 2 — Persistencia e integración de evidencia

**Files:** `src/prisma/schema.prisma`, `supabase/migrations/*_backtest_sessions.sql`, `src/server/services/learning/backtest-sessions.ts`, `src/server/trpc/routers/backtest-sessions.ts`, `src/server/trpc/root.ts`.

**Interface:** `backtestSessions` expone `list`, `get`, `create`, `save`, `start`, `preview`, `close`, `reopen` y `coach`. Los cierres llevan versión esperada, identificador de solicitud y firma del informe anticipado.

- [ ] Probar propiedad y modalidades, aislamiento del borrador, y cierre/reapertura versionados.
- [ ] Crear el esquema, bloquear escrituras directas desde Data API, validar todos los vínculos y tomar la evidencia consistente al cierre. Incluir selección explícita de capturas y comentario opcional de Coach IA.
- [ ] Ejecutar `pnpm exec prisma validate`, generar el cliente y verificar el camino de persistencia en PostgreSQL de prueba.

## Task 3 — Sesiones en Prácticas y Playbook

**Files:** `src/app/aprendizaje/backtesting/page.tsx`, `src/app/aprendizaje/backtesting/components/`, `src/app/aprendizaje/components/practices-tab.tsx`, `src/components/playbook/setup-validation-route.tsx`, `src/app/trades/page.tsx`.

**Interface:** `/aprendizaje/backtesting?setup=<uuid>` abre la creación desde Playbook y `/aprendizaje/backtesting?session=<uuid>` abre el editor o historial. Los enlaces de retorno usan un identificador validado.

- [ ] Crear recorrido verificable de creación, trabajo, previsualización, cierre y reapertura con evidencia histórica.
- [ ] Implementar planificación, vínculos, fichas, señales descartadas, cierre, filtros y accesos contextuales.
- [ ] Revisar teclado y móvil, y confirmar que Prácticas y Trades conservan sus flujos habituales.

## Task 4 — PDF y verificación

**Files:** `src/server/services/learning/backtest-pdf.ts`, `src/app/api/backtesting/pdf/route.ts`, generador compartido de Chromium y pruebas del informe.

**Interface:** `GET /api/backtesting/pdf?session=<uuid>&version=<number>` descarga una versión cerrada autorizada. `renderBacktestHtml(report: BacktestReport)` genera HTML autocontenido.

- [ ] Probar expansión de todas las fichas, caracteres especiales, datos faltantes y renders de más de una página.
- [ ] Implementar ruta autenticada, paginación y capturas privadas seleccionadas.
- [ ] Ejecutar typecheck, lint, Vitest, build y pruebas de navegador con datos de QA. Revisar cambios antes de la publicación según el alcance autorizado.
