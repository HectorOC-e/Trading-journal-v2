# Mundos operativos independientes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** separar Real, Demo y Backtesting en todas las consultas y acciones derivadas, corregir el registro histórico y reutilizar operaciones como evidencia de prácticas.

**Architecture:** contrato de dominio único y modalidad persistente en Trade; filtros en servidor antes de límites y agregados. Los consumidores comparten ese contrato, las comparaciones mantienen muestras independientes y LearningPractice se vincula a Trade sin duplicarlo.

**Tech Stack:** Next.js 16.2.7, React 19.2.7, tRPC, Prisma 7, PostgreSQL/Supabase, Zustand, Vitest y Playwright; sin dependencias nuevas previstas.

**Spec:** [diseño](../specs/2026-11-15-mundos-operativos-design.md).

Estado: plan pendiente de revisión del diseño, sin pasos de implementación ejecutados. Rama documental: `docs/separate-trading-worlds-plan`; base `c40467d`. Las pruebas citadas son verificaciones que debe ejecutar la implementación, no resultados ya obtenidos.

## Global Constraints

- REAL, DEMO y BACKTEST son ámbitos independientes; no existe ALL ni un total financiero entre ellos.
- PERSONAL/PROP_FIRM → REAL; DEMO_PERSONAL/DEMO_PROP → DEMO; BACKTEST → BACKTEST; QA → INTERNAL; desconocidos → NULL excluido.
- No reclasificar evaluaciones de fondeo ni registros desconocidos como Real por defecto.
- La modalidad se aplica también a psicología, disciplina, IA, aprendizaje y acciones derivadas.
- Conservar una review por periodo y las notas del usuario; resultados automáticos por modalidad.
- Preservar Trade.date para KPI de operaciones y distinguirlo de realizaciones/equity.
- Separar fecha de mercado, fecha efectiva de práctica y createdAt; no inferir esfuerzo de una importación.
- No duplicar operaciones, minutos, P&L ni la racha/meta de estudio.
- Sin cambios en datos reales para QA. RLS y propietario en todas las tablas/consultas nuevas.
- Antes de explorar código, ejecutar Graphify query; leer las guías actuales de Next.js antes de escribir código de framework.
- Migraciones: descubrir CLI con --help, crear mediante supabase migration new, validar localmente y no reescribir el historial remoto.
- Tras cambios de código, ejecutar graphify update .; conservar el estado de grafo heredado y añadir al commit sólo rutas revisadas.

## Review Focus

1. Cliente antiguo o pestañas simultáneas: nunca traducir includePractice=true a un agregado mixto ni mostrar caché Demo bajo etiqueta Real — tareas 3 y 4.
2. Cuenta archivada, capital de fondeo nominal o divisa no convertible: historia visible sin afirmar efectivo personal disponible — tareas 2 y 3.
3. Trade que cruza medianoche/zona con parciales: eventos ordenados, realizaciones no duplicadas y fechas legadas no inventadas — tarea 7.
4. Evidencia borrada/editada mientras la IA responde: feedback desactualizado y práctica conservada — tareas 8 y 9.
5. Migración con escrituras del despliegue anterior y dos propietarios: backfill repetible, referencias consistentes y acciones sin cruces — tareas 2 y 10.

## Estructura y puntos de integración

Las rutas siguientes existentes fueron localizadas en el grafo o en la auditoría; los archivos marcados «nuevo» son propuestas, no archivos ya presentes. No se deben refactorizar módulos ajenos sólo para uniformar su estilo.

| Unidad | Archivos principales |
|---|---|
| Contrato | nuevo `src/domains/trading/operational-mode.ts`; adaptar `src/domains/trading/account-reality.ts` |
| Persistencia | `src/prisma/schema.prisma`; nuevas migraciones creadas por CLI y un backfill idempotente en `scripts/` |
| Consulta compartida | nuevo `src/server/services/trades/operational-scope.ts` |
| Dashboard/Analytics | `src/server/services/trades/dashboard-service.ts`, `src/domains/analytics/services/analytics-bundle.ts`, `dashboard-analytics.ts`, `src/server/services/analytics/edge-service.ts` |
| Interfaz | nuevo `src/components/ui/operational-mode-selector.tsx`, nuevo `src/lib/operational-mode-store.ts`; adaptar consumidores de `practice-toggle.tsx` y `practice-scope-store.ts` |
| Setups/Disciplina | `src/server/trpc/routers/setups.ts`, `src/server/services/setups/playbook-service.ts`, `src/domains/analytics/services/discipline-service.ts` |
| Reviews | `src/server/services/reviews/{report-data,review-insights,finalize,finalize-monthly,pdf-report-html}.ts`, routers semanal/mensual, `src/server/services/email/send-review.ts` |
| IA | `src/domains/analytics/ai-context.ts`, `src/lib/ai/{coach-tools,coach-service}.ts`, `src/server/services/retrieval/corpora/trade-notes.ts` |
| Escritura histórica | `src/server/services/trades/trade-write-service.ts`, `trade-read-service.ts`, `src/server/trpc/routers/trades.ts`, modal de registro/edición, imports CSV/MT4 |
| Prácticas | `src/server/trpc/routers/learning-practices.ts`, nuevo `src/server/services/learning/practice-trades-service.ts`, modal y pestaña de Prácticas |
| Señales/tutor | `src/server/services/learning/{learning-insights-service,practice-feedback-service}.ts`, `src/domains/learning/error-cards.ts`, routers de recursos/sesiones |
| Comportamiento | `src/server/services/behavior/commitment-service.ts`, `src/server/trpc/routers/rules.ts`, servicios de riesgo/Hoy y productores derivados que identifique su grafo de llamadas |

## Interfaces entre tareas

En el dominio, exportar:

```ts
export type OperationalMode = "REAL" | "DEMO" | "BACKTEST";
export type StoredOperationalMode = OperationalMode | "INTERNAL";
export type ScopedWindow = {
  mode: OperationalMode;
  from?: string;
  to?: string;
  accountId?: string;
  includeArchived: boolean;
};
export function classifyAccountType(type: string | null | undefined): StoredOperationalMode | null;
```

En el servidor, usando `PrismaClient` y los tipos generados existentes:

```ts
export async function scopedTradeWhere(
  prisma: PrismaClient, userId: string, scope: ScopedWindow
): Promise<Prisma.TradeWhereInput>;
```

Esta función valida propietario/modalidad de una cuenta explícita y devuelve un filtro de Trade por modalidad persistida, fechas y cuentas archivadas según el contrato. No hace lecturas de trades ni aplica take. Las consultas de riesgo actual añaden su condición de estado activo/pausado sin cambiar la selección histórica.

Los servicios existentes de informes, analytics y disciplina reciben `ScopedWindow` como parámetro obligatorio interno. Los routers aceptan `mode` explícito, devuelven `scope` en los metadatos y usan REAL sólo para compatibilidad con entradas omitidas del cliente antiguo.

Para las prácticas:

```ts
export type PracticeTradeRole = "EXECUTED" | "REVIEWED";
export async function replacePracticeTradeLinks(
  prisma: PrismaClient, userId: string,
  input: {
    practiceId: string; expectedVersion: number;
    links: { tradeId: string; role: PracticeTradeRole }[];
  }
): Promise<{ version: number; linkedTradeCount: number }>;
```

La implementación usa una transacción y la versión de práctica existente. Sustituye únicamente los vínculos de esa práctica; no actualiza operaciones ni minutos.

## Fase 1 — Fundamento y consultas

### Tarea 1: Contrato de modalidades y validación

**Archivos:** nuevo `src/domains/trading/operational-mode.ts`; adaptar `account-reality.ts`; nuevo test `src/__tests__/domains/operational-mode.test.ts`.

**Consume:** tipos de cuenta existentes. **Produce:** `OperationalMode`, `StoredOperationalMode`, `ScopedWindow`, `classifyAccountType`.

- [ ] Escribir casos de catálogo y rechazo: `classifyAccountType("DEMO_PROP") === "DEMO"`, `classifyAccountType("QA") === "INTERNAL"`, `classifyAccountType(null) === null`; ALL no es un modo válido.
- [ ] Ejecutar desde `src`: `pnpm exec vitest run __tests__/domains/operational-mode.test.ts --maxWorkers=1`; confirmar fallo por contrato ausente.
- [ ] Implementar contrato sin duplicar listas de tipos. Mantener adaptadores existentes sólo hasta completar sus consumidores; ningún desconocido cae en REAL.
- [ ] Repetir el test y los tests existentes de account-reality; ajustar las expectativas que codificaban la política sustituida y obtener PASS.
- [ ] Revisar y hacer commit sólo de contrato, adaptador y pruebas: `feat: define isolated operational modes`.

### Tarea 2: Procedencia persistente, integridad y migración

**Archivos:** `src/prisma/schema.prisma`, `src/server/trpc/routers/accounts.ts`, todos los escritores de Trade localizados por Graphify, nueva migración, nuevo `scripts/backfill-trade-operational-mode.ts`, nuevo test de integración `src/__tests__/integration/operational-modes.test.ts`.

**Consume:** tarea 1. **Produce:** `Trade.operationalMode`, backfill repetible y prohibición de cambiar de modalidad cuentas con historia.

- [ ] Escribir pruebas PostgreSQL: tipos conocidos se rellenan, desconocidos quedan NULL, dos backfills no cambian recuentos; rol cliente no inserta REAL en cuenta DEMO ni referencia cuenta ajena; cuenta con trades no cambia DEMO→REAL.
- [ ] Ejecutar `pnpm exec vitest run --config vitest.integration.config.ts __tests__/integration/operational-modes.test.ts --maxWorkers=1` contra PostgreSQL local y confirmar fallo antes de la migración.
- [ ] Crear la migración con CLI, añadir campo nullable sin default REAL, constraint/trigger para propietario/modo y guardia de actualización de cuenta; derivar modalidad en todas las escrituras y no sólo el formulario manual.
- [ ] Añadir índices por `(user_id, operational_mode, status, date)` y verificar EXPLAIN; simular una escritura antigua entre dos lotes del backfill y comprobar que la segunda pasada la clasifica. Verificar retiro/capital nominal no reinterpretado.
- [ ] Repetir integración, `pnpm exec prisma validate` y generación de cliente; obtener PASS. Conservar informe de clasificados/no clasificados y commit `feat: persist trade operational provenance`.

### Tarea 3: Consultas y agregaciones completas por ámbito

**Archivos:** nuevo `src/server/services/trades/operational-scope.ts`; servicios de Dashboard, Analytics, Edges, Playbook y disciplina del mapa; routers que llaman esos servicios; nuevo `src/__tests__/services/trades/operational-isolation.test.ts`.

**Consume:** tareas 1–2. **Produce:** `scopedTradeWhere` y metadatos de modalidad en resultados; elimina el filtrado tardío.

- [ ] Escribir tests: Real +100 / Demo +500 / Backtest −200 devuelven tres resultados independientes; 1.100 backtests no ocultan un trade real; los agregados de Backtesting incluyen los 1.100. Cuenta explícita de otra modalidad devuelve BAD_REQUEST.
- [ ] Ejecutar `pnpm exec vitest run __tests__/services/trades/operational-isolation.test.ts --maxWorkers=1` y confirmar los fallos actuales de mezcla/límite.
- [ ] Aplicar el filtro compartido antes de take; agregar sobre la muestra completa. Introducir ámbito obligatorio en disciplina/psicología, Edges y estadísticas de setups; reutilizar el servicio separado de Playbook.
- [ ] Añadir casos de archivadas incluidas en rendimiento y excluidas del riesgo disponible, tipos desconocidos fuera del resultado y divisa sin conversión marcada incompleta; rechazar includePractice=true en la frontera de compatibilidad.
- [ ] Repetir tests y suites pertinentes de servicios; PASS. Commit `fix: isolate trading aggregates before pagination`.

## Fase 2 — Experiencia y consumidores coherentes

### Tarea 4: Selector, navegación y caché

**Archivos:** nuevos store/selector del mapa; `src/app/dashboard/page.tsx`, hook de estadísticas, `src/app/analytics/page.tsx`, `src/app/trades/page.tsx`, páginas de Reviews/Playbook y exportación; nuevo `src/__tests__/components/operational-mode-selector.test.tsx`.

**Consume:** contratos de tareas 1 y 3. **Produce:** selección única visible, parámetros en URL y claves de consulta por ámbito.

- [ ] Escribir tests de componente: valor inicial REAL, selección BACKTEST se mantiene al navegar, cuenta incompatible se limpia y una respuesta lenta REAL no ocupa una pantalla DEMO.
- [ ] Ejecutar `pnpm exec vitest run __tests__/components/operational-mode-selector.test.tsx --maxWorkers=1` y confirmar fallo.
- [ ] Reutilizar Tabs/Select/botones del sistema, reemplazar el toggle y migrar su preferencia a REAL, sin convertir el antiguo true en mezcla. La URL explícita prevalece sobre preferencia y luego aplica REAL.
- [ ] Propagar modo/periodo/cuenta a consultas y exportación; evitar placeholderData de otra modalidad. Comparación devuelve tres secciones sin total, con vacíos y muestras claras. Comprobar dos pestañas y el cliente antiguo.
- [ ] Repetir tests; aplicar checklist React y accesibilidad al tocar varios TSX. Commit `feat: add consistent operational mode navigation`.

### Tarea 5: Reviews, correo y PDF sin análisis mezclados

**Archivos:** modelos de review y nueva migración; servicios y routers de Reviews del mapa, `send-review.ts`, plantilla de correo y exportación del Dashboard; nuevo `src/__tests__/services/reviews/operational-review.test.ts` e integración de snapshots.

**Consume:** tareas 2–4. **Produce:** `ReviewModeSnapshot`, resultados y texto IA por `(userId, kind, periodKey, mode)` con firma de evidencia; una review y envío por periodo.

- [ ] Escribir tests: review/PDF REAL muestra 100 y no 600; snapshots DEMO y BACKTEST independientes; una semana sólo Demo sigue generando su sección sin inventar Real; el cron no lee preferencias del navegador.
- [ ] Ejecutar `pnpm exec vitest run __tests__/services/reviews/operational-review.test.ts --maxWorkers=1` y confirmar fallo.
- [ ] Crear snapshots con RLS/propietario y clave única, refactorizar loaders/cierre/IA/correo para producir secciones por modo; idempotencia del correo sigue siendo por usuario/periodo, no tres correos por modo.
- [ ] Migrar análisis automáticos anteriores a estado legado sin presentarlos como Real, preservar notas manuales; probar regeneración e invalidación por cambio de trades, modo y periodo. Exportación reproduce la selección y etiqueta base temporal/divisa.
- [ ] Repetir pruebas de review, snapshots y PDF; PASS. Commit `fix: scope review snapshots and exports by operational mode`.

### Tarea 6: Contexto IA, recuperación y acciones derivadas

**Archivos:** IA/herramientas/retrieval del mapa; compromiso, reglas, riesgo/Hoy y derivados hallados por Graphify; nuevo `src/__tests__/services/operational-derived-context.test.ts`.

**Consume:** tareas 1–5. **Produce:** procedencia en cada evidencia IA y ámbito en identidades, métricas y efectos de comportamiento.

- [ ] Escribir tests: 500 backtests anteriores no vacían el contexto REAL; búsqueda semántica y get_setup_detail no devuelven otra modalidad; cada trade incluye modalidad, cuenta y divisa.
- [ ] Ejecutar `pnpm exec vitest run __tests__/services/operational-derived-context.test.ts --maxWorkers=1` con proveedores IA simulados y confirmar fallo.
- [ ] Usar selección de ámbito antes de límites en prompts, herramientas y rehidratación semántica; consultas comparativas producen estructuras separadas. Incluido modo en cachés y firmas de análisis.
- [ ] Aislar compromisos, fingerprints, recomendaciones y bloqueos derivados; no cambiar un setup compartido por resultados de una sola modalidad. Añadir prueba Demo→alerta Demo sin cambio en Real y prueba de bloqueo manual global explícito conservado.
- [ ] Marcar derivados legados mezclados como no accionables hasta regenerar; repetir tests y riesgo vigente. Commit `fix: isolate AI evidence and derived trading actions`.

## Fase 3 — Historia y contabilidad temporal

### Tarea 7: Equity arrastrada y flujo histórico fiable

**Archivos:** nuevo `src/domains/trading/historical-capture.ts`, nuevo `src/server/services/trades/historical-equity-service.ts`, `trade-write-service.ts`, `realized-history.ts`, router/modal de trades, importadores, modelos/migración temporal; nuevo `src/__tests__/services/trades/historical-capture.test.ts`.

**Consume:** tareas 1–3 y 6. **Produce:** contexto LIVE/HISTORICAL; timestamps de mercado con zona y capital a fecha; correcciones trazables sin duplicar realizaciones.

- [ ] Escribir casos: capital 1.000 +9.000 previo al periodo +100 dentro → equity 10.000/10.100; riesgo histórico 10/1.000→1 % pese a balance actual 10.000; capital no reconstruible → porcentaje null.
- [ ] Añadir casos temporales: 02/01/2024 01:00 Honduras→07:00Z, parcial 30 +remanente 70→100, cruce de medianoche, fin de mes y zona con cambio de hora; sin fecha de parcial histórica no se usa ahora; cierre legado desconocido sigue desconocido.
- [ ] Ejecutar `pnpm exec vitest run __tests__/services/trades/historical-capture.test.ts --maxWorkers=1` y confirmar fallos pertinentes.
- [ ] Añadir `marketOpenedAt`, `marketClosedAt`, `marketTimeZone`, contexto de escritura y metadatos de emoción; flujo HISTORICAL siempre cerrado, controles LIVE intactos, cálculo as-of sin beneficio futuro y curva con arrastre previo. Una corrección de fecha modifica los eventos afectados en transacción y deja auditoría.
- [ ] Probar emoción reconstruida del pasado frente a emoción de práctica actual, misma ventana al crear/editar; cuenta bloqueada acepta historia cerrada pero rechaza posición nueva/abierta. Recalcular controles actuales y todos los derivados afectados.
- [ ] Repetir suite más pruebas existentes de realización/riesgo/Dashboard; PASS. Commit `fix: separate historical capture from live execution`.

## Fase 4 — Práctica con evidencia operativa

### Tarea 8: Vínculos de práctica con propietario y versión

**Archivos:** schema y nueva migración; nuevo `practice-trades-service.ts`; router/modal/pestaña de Prácticas, acciones de Trades; nuevos tests `src/__tests__/services/learning/practice-trades.test.ts` y `src/__tests__/integration/practice-trade-ownership.test.ts`.

**Consume:** tareas 1–2 y 7; versiones actuales de LearningPractice. **Produce:** kind/modo de práctica, `PracticeTradeLink` y `replacePracticeTradeLinks` con la firma declarada.

- [ ] Escribir tests: tres trades BACKTEST en una práctica, REAL sólo como REVIEW, mezcla DEMO/BACKTEST rechazada, usuario ajeno rechazado, segundo EXECUTED para un trade rechazado y REVIEWED repetido permitido en otra práctica.
- [ ] Ejecutar tests unitarios y PostgreSQL por separado con un worker; confirmar fallos por modelo/vínculos ausentes.
- [ ] Crear relaciones e índices únicos/propietario/RLS, sustitución transaccional con expectedVersion y alta de vínculos sin modificar Trade. CONCEPT sin operaciones continúa funcionando.
- [ ] Añadir «Usar en una práctica» y búsqueda filtrada reutilizando el formulario existente. Borrar práctica conserva trades; borrar trade conserva práctica e invalida feedback; cambiar trade enlazado incrementa revisión de evidencia.
- [ ] Probar que 45 minutos de práctica con tres trades siguen siendo 45, el plan no duplica estudio y importar no crea tiempo. Repetir pruebas existentes de prácticas y nuevas suites; PASS. Commit `feat: link learning practices to existing trades`.

### Tarea 9: Señales educativas y tutor con evidencia suficiente

**Archivos:** servicios de insights/feedback, error-cards, routers de recursos/sesiones, vistas educativas y prompts; nuevo `src/__tests__/services/learning/practice-evidence.test.ts`.

**Consume:** tareas 5–8. **Produce:** métricas por modalidad, cronología de aprendizaje y feedback con firma/versionado de evidencia.

- [ ] Escribir casos: dos trades con FOMO duplicado→2/−2R/−200; replay actual de mercado 2024 cuenta como práctica actual sin desplazar P&L; ausencia de fecha de práctica/hito de estudio no genera falsa transferencia.
- [ ] Añadir tests de prompt: incluye objetivo, autoevaluación, reglas y trades seleccionados con modalidad/fechas; no incluye todas las operaciones del setup ni califica por rentabilidad. Si se supera el límite de evidencia, se indica qué falta en vez de omitir silenciosamente.
- [ ] Ejecutar `pnpm exec vitest run __tests__/services/learning/practice-evidence.test.ts --maxWorkers=1` y confirmar fallo.
- [ ] Deduplicar por trade/etiqueta, segmentar señales, usar fecha EXECUTED para práctica y ejecución para Real con hito de estudio explícito; mantener SRS global basado en estudio/memoria. Incorporar evidencia al tutor conservando defensas actuales.
- [ ] Probar que editar/eliminar un trade durante una respuesta IA la marca desactualizada; una asociación REVIEWED no crea otra ejecución ni suma rendimiento global. Repetir nuevas suites y feedback versionado existente; PASS. Commit `feat: ground practice feedback in scoped trading evidence`.

## Fase 5 — Verificación y publicación

### Tarea 10: Regresión integrada, migración y aislamiento real

**Archivos:** nuevas pruebas integradas/end-to-end y fixtures QA con usuarios sintéticos; matriz de aceptación anexa al registro de validación.

**Consume:** tareas 1–9. **Produce:** evidencia de los 15 casos de aceptación del diseño y cero consumidores conocidos que mezclen modalidades.

- [ ] Convertir las 14 caracterizaciones externas de la auditoría en regresiones del comportamiento deseado, sin copiar sus expectativas que daban por buenos los defectos. Asignar cada H01–H12 a su prueba de corrección.
- [ ] Ejecutar migración limpia y actualización desde una copia local, dos usuarios, RLS por JWT, concurrencia de backfill y modificación de vínculos; comprobar filas/importe antes y después. No usar únicamente mocks para demostrar aislamiento.
- [ ] Ejecutar desde `src`, secuencialmente: `pnpm exec prisma validate`, `pnpm exec tsc --noEmit`, lint de archivos modificados, `pnpm test --maxWorkers=1`, `pnpm test:integration --maxWorkers=1` y `pnpm build` con los requisitos del repo.
- [ ] Auditar con Graphify todos los lectores/escritores de Trade, scope stores, cron, snapshots y recuperación; cerrar cada consumidor del mapa. Ejecutar `graphify update .` tras los cambios de código y revisar diff/secretos/rutas seleccionadas.
- [ ] Registrar resultados efectivos con SHA; commit `test: verify operational worlds remain isolated`.

### Tarea 11: Preview, capturas y manual

**Archivos:** manual y evidencias QA externas al repo; cambios correctivos mínimos si un recorrido falla.

**Consume:** tarea 10 y procedimiento de publicación previamente autorizado. **Produce:** preview del SHA exacto validado como usuario.

- [ ] Push de rama de implementación y PR; comprobar CI y Vercel del mismo commit. Usar un enlace temporal sólo si la protección lo necesita y revocarlo al terminar, según autorización vigente.
- [ ] Crear/delimitar datos QA: Real +100, Demo +500, Backtest −200, cuenta archivada, más de 1.000 backtests y fechas cruzadas. No manipular datos reales ni credenciales existentes.
- [ ] Recorrer escritorio/móvil: selector, navegación/recarga, Analytics/Edges/Playbook, Reviews/PDF, registro histórico, práctica enlazada y feedback. Capturar las tres modalidades, comparación y una práctica con ambas fechas visibles.
- [ ] Comprobar IA con proveedor simulado o configuración QA autorizada; no copiar secretos de una cuenta real por defecto. Probar correo con destinatario controlado, sin avisos de prueba a usuarios reales.
- [ ] Actualizar manual con capturas reales y diferencias entre fecha de mercado/práctica, operación en curso/histórica y rendimiento/capital disponible. Registrar limitaciones concretas que requieran una decisión antes de publicar.

### Tarea 12: Merge, producción y limpieza

**Consume:** tarea 11 aprobada y flujo de GitHub/Vercel vigente. **Produce:** release comprobada y datos QA retirados.

- [ ] Obtener revisión independiente de requisitos/código; resolver todos los defectos materiales y repetir sólo los controles afectados por cambios nuevos. No mergear con una superficie conocida mezclando ámbitos.
- [ ] Merge a main y comprobar CI y deployment READY del SHA exacto, no sólo el dominio o un preview anterior.
- [ ] Ejecutar el recorrido de producción con QA y verificar ausencia de cruces. No anunciar corrección basándose exclusivamente en tests locales.
- [ ] Eliminar rama y datos/cuenta QA de esta entrega, revocar enlaces temporales y retirar configuraciones QA copiadas si existieron. Respetar las confirmaciones específicas que exija el proveedor; una solicitud caducada no equivale a un borrado realizado.
- [ ] Entregar capturas, manual, PR/SHA, validaciones efectivas y cualquier limitación pendiente. No afirmar «cero errores» más allá de lo comprobado.

## Autorrevisión del plan

- Cobertura: contrato y persistencia (1–2); H01/H12 reviews/exportación (5); H02/H03 alcance/límites (3–4); H04 IA (6); H05–H08 historia/equity/emoción (7); H09–H11 aprendizaje/tutor (8–9); QA/entrega (10–12).
- Dependencias: las interfaces de dominio y vínculos se declaran una sola vez; los consumidores las reutilizan.
- Cambios de alcance explícitos: disciplina/psicología dejan de mezclarse; cuentas archivadas entran en rendimiento; snapshots legados no se renombran como Real; clasificación actual de PROP_FIRM se conserva con contexto.
- Las decisiones funcionales del diseño requieren revisión antes de implementar. Este documento no afirma que la rama documental ya corrija el producto.
