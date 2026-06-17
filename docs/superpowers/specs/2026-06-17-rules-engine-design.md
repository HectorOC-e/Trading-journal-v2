# Epic 3 — Motor de Reglas / Automatizaciones

**Fecha:** 2026-06-17
**Estado:** Aprobado para implementación (diseño validado en brainstorming)
**Contexto:** Tercero y último de la reestructuración. Notificaciones ✅ → Etiquetas ✅ →
**Motor de Reglas**. Se apoya en Epic 1 (`emitNotification`/`RULE_FIRED`) y Epic 2
(catálogo de tags para acciones de etiqueta).

## Problema

El `Rule` actual es una lista plana (name/description/severity/isSystem/enabled): solo
recordatorios, sin automatización. Las automatizaciones reales viven hardcodeadas en
`risk-enforcement.ts` (límites de pérdida/drawdown/máx-trades/símbolos) — un motor
WHEN/IF/THEN rígido y de caja negra. Se necesita un motor genérico de automatizaciones y
exponer las reglas del sistema.

## Decisiones (validadas)

1. **Exponer/envolver:** el motor genérico maneja reglas de usuario; el `risk-enforcement`
   testeado se mantiene y sus umbrales se vuelven editables (no se reescribe).
2. **Triggers pre/post:** `TRADE_PRE_CREATE` (síncrono, puede bloquear) + `TRADE_CREATED`/
   `TRADE_CLOSED`/`TRADE_UPDATED` (reactivos). Agendados/temporales diferidos.
3. **Acciones v1:** `NOTIFY`, `CRITICAL_ALERT`, `ADD_TAG`, `REMOVE_TAG`, `BLOCK` (solo
   pre), `CREATE_REMINDER` (→ notificación persistida). Registro extensible.
4. **Builder vertical** WHEN/IF/THEN (Notion/Linear) + modo JSON + plantillas.
5. **Pantalla /reglas con pestañas:** Automatizaciones · Reglas del sistema · Recordatorios.

## Arquitectura — Backend

### 1. Modelo `Automation` (migración Supabase; no toca `Rule`)

```prisma
model Automation {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  name        String
  description String   @default("")
  enabled     Boolean  @default(true)
  priority    Int      @default(0)
  trigger     String                              // TRADE_PRE_CREATE | TRADE_CREATED | TRADE_CLOSED | TRADE_UPDATED
  conditions  Json     @default("{}")             // ConditionNode tree (empty = always)
  actions     Json     @default("[]")             // RuleAction[]
  category    String   @default("")
  isSystem    Boolean  @default(false) @map("is_system")
  lastFiredAt DateTime? @map("last_fired_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, trigger, enabled])
  @@map("automations")
}
```

### 2. Condiciones (IF) — `domains/rules/conditions.ts`

```ts
type ConditionNode =
  | { op: "and" | "or"; children: ConditionNode[] }
  | { op: "not"; child: ConditionNode }
  | { field: string; cmp: Cmp; value: string | number | boolean | string[] }
type Cmp = "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "contains" | "in"
```

`evaluate(node, ctx): boolean` — pura, recursiva, unit-testable. Un árbol vacío (`{}`)
evalúa `true` (sin condiciones = siempre). **Field registry** (`fields.ts`) documenta los
campos por trigger: trade (`riskPct`, `rMultiple`, `pnl`, `symbol`, `direction`, `session`,
`setupId`, `tags`, `size`, `minsSinceLastLoss`) + cuenta (`dayPnlPct`, `weekPnlPct`,
`drawdownPct`, `winRate`, `tradesToday`). Cada campo: tipo + label + cmps válidos (para el
builder).

### 3. Contexto de evaluación — `domains/rules/context.ts`

`buildPreContext(input, account, prisma)` y `buildPostContext(trade, account, prisma)`
producen un `EvalContext` (mapa field→valor). Pre usa el input del trade (aún sin guardar);
post usa el trade guardado + métricas recomputadas (reutiliza `loadAccountRisk`).

### 4. Acciones (THEN) — `domains/rules/actions.ts` (registro extensible)

`ActionHandler = (action, ctx, deps) => Promise<ActionResult>` donde
`ActionResult = { block?: boolean; mutateTags?: string[] }`. Handlers v1:
- `NOTIFY` / `CRITICAL_ALERT` → `emitNotification(RULE_FIRED, …)` (P1 / P0).
- `ADD_TAG` / `REMOVE_TAG` → devuelve tags a mutar en el trade.
- `BLOCK` → `{ block: true }` (solo efectivo en pre).
- `CREATE_REMINDER` → `emitNotification(RULE_REMINDER, …)`.
Códigos de catálogo nuevos: `RULE_REMINDER`, `RULE_BLOCKED` (toast pre-trade); `RULE_FIRED`
ya existe.

### 5. Runner — `domains/rules/engine.ts`

`runAutomations(prisma, userId, trigger, ctx)`:
1. Carga `automations` habilitadas del `trigger` (orden `priority desc`).
2. Para cada una: `evaluate(conditions, ctx)` → ejecuta `actions` en orden.
3. **Pre-trade:** si alguna acción `BLOCK` dispara → lanza `AppError("RULE_BLOCKED", …)`
   (rechaza el trade). Las mutaciones de tag se aplican al input antes de guardar.
4. **Post-trade:** efectos best-effort, **try/catch por acción** (nunca rompe el write);
   `ADD_TAG`/`REMOVE_TAG` actualizan `trade.tags` (+ `ensureTagRows`).
5. Actualiza `lastFiredAt` de las que dispararon.

### 6. Integración (hooks de trade)

- `trades.create`: tras `assertTradeable`, `runAutomations(TRADE_PRE_CREATE, preCtx)`
  (puede bloquear / mutar tags del input). Tras el write, `runAutomations(TRADE_CREATED |
  TRADE_CLOSED, postCtx)` en try/catch.
- `trades.update`: tras el write, `runAutomations(TRADE_UPDATED | TRADE_CLOSED, postCtx)`.
- El `risk-enforcement` existente queda **intacto** y sigue corriendo antes/después.

### 7. Router `automations` — `server/trpc/routers/automations.ts`

`list`, `get`, `create`, `update`, `toggle`, `delete`, `reorder`, `templates` (lista de
plantillas en código), `createFromTemplate`. Validación Zod del árbol de condiciones y de
las acciones (rechaza `BLOCK` en triggers no-pre).

### 8. Reglas del sistema (exponer, no reescribir)

`accounts` router ya tiene update; se añade UI que lee/escribe los campos de riesgo del
`Account` (ddDailyPct/Weekly/Monthly/Total, maxTradesPerDay, allowedSymbols) con
descripción, defaults y **restaurar**. El `risk-enforcement` los evalúa igual.

## Arquitectura — Frontend

### 9. Rule Builder — `components/rules/`

Vertical apilado: bloque **WHEN** (selector de trigger) → **IF** (`condition-group.tsx`
recursivo con AND/OR/NOT, sangría, añadir condición/grupo; campos/cmps del registry) →
**THEN** (`action-list.tsx`, añadir acción del registro). Conmutador **modo JSON** (textarea
validado contra el Zod schema). Vista previa del resumen.

### 10. Pantalla `/reglas` (reescritura con pestañas)

- **Automatizaciones:** tarjetas (resumen WHEN·IF·THEN, prioridad, toggle), crear (→ galería
  de plantillas → builder), editar, eliminar, reordenar.
- **Reglas del sistema:** límites de riesgo por cuenta, editables + restaurar.
- **Recordatorios:** la lista `Rule` actual, conservada (UI existente reusada).

### 11. Plantillas

En código (`domains/rules/templates.ts`): Gestión de riesgo, Psicología, Drawdown, Control
de exposición (y "en blanco"). Cada una = `{ name, category, trigger, conditions, actions }`.
`createFromTemplate` instancia una `Automation` editable.

## IA / conocimiento

`lib/ai/app-knowledge.ts`: las automatizaciones (WHEN/IF/THEN), las reglas del sistema
editables y los recordatorios. Tool read-only opcional `get_automations` (diferible).

## Tests

- **Unit:** `evaluate` (AND/OR/NOT anidados, cada cmp, árbol vacío); field registry; cada
  ActionHandler (con deps mockeadas); `runAutomations` (pre bloquea, post best-effort,
  prioridad, lastFiredAt); validación Zod (BLOCK solo en pre).
- **Router:** `automations` CRUD + createFromTemplate (scoping por usuario).
- **Regresión:** suite de risk-enforcement/disciplina sigue verde (motor intacto).
- **webapp-testing** (`ariaoc89@gmail.com`): crear automatización desde plantilla, builder
  WHEN/IF/THEN, toggle, editar umbral de sistema, registrar un trade que dispare una regla
  (ver notificación/etiqueta); consola limpia.

## No-objetivos (v1)

- Triggers agendados/temporales (cron) — diferidos (placeholder "Revisión semanal").
- Acciones `solicitar confirmación`, `cambiar estado`, `ejecutar workflow`, `crear tarea`
  con entidad propia — el registro es extensible; `CREATE_REMINDER` usa notificaciones.
- Reescribir `risk-enforcement` (se expone, no se unifica).
- Backtesting/simulación de reglas sobre histórico.

## Riesgos / notas

- **Sin cambios manuales en BD:** migración versionada en `supabase/migrations/`.
- **Pre-trade debe ser barato:** el contexto pre evita queries pesadas innecesarias; reglas
  pre solo cuando el usuario las define.
- **Aislar el motor:** `domains/rules/{conditions,fields,context,actions,engine,templates}`
  — funciones puras donde se pueda, deps inyectadas (prisma/emit) para testear.
- **Validación estricta** del JSON (Zod) en el router para no persistir árboles inválidos.
