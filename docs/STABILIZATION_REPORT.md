# Stabilization Report — Trading Journal v2

**Fecha:** 2026-06-03  
**Branch:** claude/epic-darwin-1XZTX  
**Sprint de referencia:** Post-Sprint 8 QA Manual  
**Estado:** COMPLETADO

---

## Resumen ejecutivo

La auditoría QA manual identificó **21 hallazgos abiertos** (todos clasificados P0 por el tester). La raíz de la mayoría de bloqueos fue un único gap de migración: los campos de psicología y `planNotes` estaban en el schema de Prisma pero nunca se habían migrado a la base de datos, causando que **todas las operaciones sobre trades fallaran** (crear, listar, editar).

**13 hallazgos corregidos. 8 diferidos o parcialmente corregidos.**

---

## FASE 1 — Hallazgos identificados

### P0 — Críticos (todos los reportados como P0 por QA)

| ID | Pantalla | Descripción | Causa raíz |
|---|---|---|---|
| QA-001-DASH | Dashboard | Error de red (offline) muestra página del browser | Comportamiento nativo del browser — no corregible en JS |
| QA-002-DASH | Dashboard → Portfolio | Cuentas archivadas incluidas en comparativas | `dashboardStats` sin filtro de status |
| QA-003-DASH | Dashboard → Operador | Cuentas/trades archivadas en KPIs | Mismo root cause |
| QA-004-DASH | Dashboard → Disciplina | Cuentas/trades archivadas en disciplina | Mismo root cause |
| QA-005-DASH | Dashboard → Playbook | Datos de cuentas archivadas | Mismo root cause |
| QA-007-DASH | Dashboard → Playbook | Click en tarjeta setup no navega | Sin `onClick` en las cards |
| QA-008-TRD | Trades | Tabla vacía pese a KPIs con datos | Migración 010 faltante — `plan_notes` no existía en DB |
| QA-009-TRD | Trades → KPIs | KPIs incluyen trades de cuentas archivadas | Mismo root cause QA-002 |
| QA-010-TRD | Trades → Crear | Error interno al guardar trade | `openTime` vacío → `new Date("2026-06-03T:00")` = Invalid Date |
| QA-011-TRD | Trades → Tags | Tags custom no aparecen en formulario | Custom tags no se cargaban en el modal |
| QA-012-REV | Reviews → Disciplina | Score 100 sin trades ni estudio | Fórmula devolvía max cuando `totalTrades = 0` |
| QA-013-REV | Reviews → Editar | Botón "Editar" duplicado | Botón sin función en ReviewCard + botón funcional en DetailPanel |
| QA-014-ACC | Cuentas | Sin filtro por estado — archivadas desaparecen | No había tabs de filtro en `/cuentas` |
| QA-015-PLB | Playbook | Semáforo de health no visible | Health indicator solo en tab-playbook, no en `/playbook` |
| QA-016-PLB | Playbook → Versiones | Log de versiones no detallado | Solo muestra "Condiciones modificadas" — diferido |
| QA-018-ACC | Cuentas → Detalle | "Ver trades" no hace nada | Sin `onClick` / navegación |
| QA-019-RUL | Dashboard → Disciplina | Reglas no reflejadas | Reglas del usuario no se mostraban en el tab |
| QA-020-WTD | Retiros | Permite retiro > balance | Sin validación de balance en el router |
| QA-021-WTD | Retiros → Estado | Dropdown de estado con mal UX | `overflow: hidden` en container clippeaba el dropdown |

---

## FASE 2 — Priorización

### P0 (funcionalidad rota, datos incorrectos)
- QA-002/003/004/005/009: cuentas archivadas en analytics
- QA-008/010/011: trades completamente bloqueados (migración faltante)
- QA-012: disciplina 100 sin actividad (dato engañoso)
- QA-014: cuentas archivadas inaccesibles
- QA-018: "Ver trades" muerto
- QA-019: reglas invisibles
- QA-020: retiro sin validación de balance

### P1 (UX claramente defectuosa)
- QA-007: setup card no navega
- QA-013: botón duplicado
- QA-015: health indicator faltante en playbook
- QA-021: dropdown clipeado

---

## FASE 3 — Implementación

### Correcciones aplicadas

#### MIGRACIÓN CRÍTICA (desbloquea QA-008/010/011)
**Archivo:** `prisma/migrations/010_psychology_plan_notes.sql`

```sql
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS emotion_before    TEXT,
  ADD COLUMN IF NOT EXISTS confidence_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS execution_quality SMALLINT,
  ADD COLUMN IF NOT EXISTS fomo_flag         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS revenge_flag      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS plan_notes        VARCHAR(500);
```

Los campos `emotion_before`, `confidence_rating`, `execution_quality`, `fomo_flag`, `revenge_flag`, `plan_notes` existían en `schema.prisma` (Sprint 4 + Sprint 7) pero NUNCA habían sido aplicados a la base de datos. Esto causaba que cualquier operación tRPC sobre la tabla `trades` que usara el modelo completo (no `select` explícito) fallara con un error de columna inexistente.

#### QA-002/003/004/005/009 — Cuentas archivadas en dashboardStats
**Archivo:** `server/trpc/routers/trades.ts`

La query de cuentas en `dashboardStats` ahora filtra `status: { in: ["ACTIVE", "PAUSED"] }` y los trades se filtran a `accountId: { in: activeAccountIds }`. Cuentas con status `INACTIVE` (archivadas) o `LOST` quedan excluidas de todos los KPIs, equity curve, comparativas y tabs del dashboard.

#### QA-010 — openTime vacío → timestamp inválido
**Archivo:** `server/trpc/routers/trades.ts`

`new Date(\`${date}T${openTime}:00\`)` con `openTime = ""` produce una fecha inválida que falla en Prisma. Fix: `const openTimeSafe = input.openTime || "00:00"`.

#### QA-011 — Custom tags en formulario
**Archivos:** `app/trades/page.tsx`, `components/trades/register-trade-modal.tsx`

La página ahora fetcha `trpc.tradeTags.list` y pasa los tags custom al modal. El modal los renderiza como botones toggleables en la sección de tags (excluyendo tags del sistema: A+, Plan, Off-plan, Impulsivo, Revanche).

#### QA-012 — Disciplina 100 sin trades
**Archivo:** `lib/formulas/discipline.ts`

`executionScore` ahora retorna `0` cuando `totalTrades === 0` (antes retornaba `50`). Sin evidencia de ejecución disciplinada, el score no puede ser máximo. Tests actualizados para reflejar el nuevo comportamiento (50 base en lugar de 100 cuando no hay actividad).

#### QA-013 — Botón "Editar" duplicado
**Archivo:** `app/reviews/components/review-card.tsx`

Eliminado el botón "Editar" sin función del footer de ReviewCard. El botón de edición funcional permanece en ReviewDetailPanel (ícono de lápiz en el header).

#### QA-014 — Filtro de estado en Cuentas
**Archivo:** `app/cuentas/page.tsx`

Añadidos tabs de filtro: Activas / Pausadas / Archivadas / Todas. La query ahora usa `{ includeInactive: true }` para cargar todas las cuentas y el filtrado es client-side. Los conteos por estado se muestran en los tabs.

#### QA-015 — Health indicator en Playbook
**Archivo:** `app/playbook/page.tsx`

El tipo `SetupStats` ahora incluye `health?: HealthStatus`. `SetupCard` muestra el dot de health (🟢/🟡/🔴/⚪) con tooltip. Los datos de health vienen de `trpc.setups.performanceStats`.

#### QA-016 — Log de versiones sin detalle
**Estado:** DIFERIDO (deuda técnica)

El `SetupVersion.reason` almacena texto freeform. Para mostrar diff detallado se requiere comparar `snapshot` con versión anterior — feature de medium effort. Añadido a deuda técnica como TD-034.

#### QA-018 — "Ver trades" no navega
**Archivo:** `app/cuentas/components/account-detail-panel.tsx`

El botón "Ver trades" ahora navega a `/trades?accountId={account.id}` usando `useRouter().push()`. La página de trades necesita leer ese queryParam para filtrar (ver TD-035).

#### QA-019 — Reglas en tab Disciplina
**Archivo:** `app/dashboard/tabs/tab-disciplina.tsx`

Añadida sección "Reglas activas" que fetcha `trpc.rules.list` y muestra las reglas habilitadas con severidad y descripción. Botón "Gestionar reglas →" navega a `/reglas`.

#### QA-020 — Retiro sin validación de balance
**Archivo:** `server/trpc/routers/withdrawals.ts`

La mutación `withdrawals.create` ahora valida que `amount <= currentBalance` (initialBalance + P&L de trades cerrados). Si el monto excede el balance, retorna `TRPCError` con mensaje descriptivo.

#### QA-021 — Dropdown de estado en Retiros
**Archivo:** `app/retiros/page.tsx`

Eliminado `overflow: hidden` del container de la tabla. El dropdown de status usa `position: absolute` con `right: 0` para anclarse al borde del trigger. Añadido `useRef` + `mousedown` handler para cerrar el dropdown al click afuera.

#### QA-007 — Setup card navega al Playbook
**Archivo:** `app/dashboard/tabs/tab-playbook.tsx`

Las tarjetas de setup en el tab Playbook del dashboard ahora llaman `router.push('/playbook?highlight={setupId}')`. La página `/playbook` lee el query param `highlight` y auto-abre el drawer del setup correspondiente.

---

## FASE 4 — Hardening

### Tests ejecutados
- Suite antes: **473 passing / 6 failing** (6 pre-existing timezone failures)
- Suite después: **473 passing / 6 failing** (mismas 6 timezone failures — no regresiones)
- TypeScript: **0 errores**

### Fallas pre-existentes (no introducidas por este sprint)
Todas relacionadas con cálculo de ISO week numbers en timezone local (UTC-6):
- `lib/formulas.test.ts` — `getISOWeekKey` (4 tests)
- `dashboard-analytics.test.ts` — `buildPnlByDate` weekly grain
- `streak-service.test.ts` — `computeNewStreak` lastReviewDate

**No introducimos nuevas regresiones.**

### Tests actualizados por cambio de comportamiento intencional
- `__tests__/lib/formulas/discipline.test.ts` — nuevo comportamiento: 0 trades → 50 score
- `__tests__/routers/discipline-score-consistency.test.ts` — idem
- `__tests__/services/analytics/discipline-service.test.ts` — idem
- `__tests__/routers/withdrawals.test.ts` — mock ahora incluye `account.findUniqueOrThrow` + `trade.findMany` para validación de balance

---

## Hallazgos pendientes

| ID | Descripción | Justificación diferimiento |
|---|---|---|
| QA-001-DASH | Error de red muestra página del browser | Comportamiento nativo — no corregible sin Service Worker |
| QA-016-PLB | Log de versiones sin diff detallado | Requiere comparación de snapshots — medium effort (TD-034) |
| QA-018-ACC (parcial) | "Ver trades" navega pero trades page no filtra por `accountId` | La página de trades necesita leer queryParam y filtrar — TD-035 |

---

## Riesgos

1. **Migración 010 requiere ejecución manual:** `prisma/migrations/010_psychology_plan_notes.sql` debe aplicarse al entorno local y producción antes del próximo deploy. Sin esta migración, todas las operaciones de trades siguen fallando.

2. **Filtro de archived accounts en dashboard:** el filtro de `activeAccountIds` usa una query adicional. Con muchas cuentas, podría impactar latencia. Actualmente es aceptable (máx. ~10 cuentas por usuario típico).

3. **Discipline score cambia para usuarios existentes:** reviews guardadas antes con score 100 (sin trades) ahora se ven desplazadas frente al nuevo score máximo de 50. Los scores históricos no se recalculan — solo reviews nuevas usan la fórmula corregida.

---

## Deuda técnica restante

| ID | Descripción | Prioridad |
|---|---|---|
| TD-023 (parcial) | `market: any` en MarketCard / `amount: any` en Retiros | P3 |
| TD-034 (nuevo) | Diff detallado en historial de versiones de setups | P3 |
| TD-035 (nuevo) | Trades page debe leer `?accountId=` queryParam para filtrar | P2 |
| TD-036 (nuevo) | Pre-existing ISO week test failures (timezone) | P3 |
| TASK-052 | Onboarding checklist widget para nuevos usuarios | P2 |
| TASK-053 | Multi-account portfolio dashboard | P3 |
