# MASTER TASKS — Trading Journal v2

> **Backlog generado el:** 2026-05-24  
> **Fuente:** Auditoría técnica completa — código fuente, Supabase (jpojusluihjjsjvcubdp), Vercel (prj_qKKQQLDmGREOf0GYHqA4H95tdsFs)  
> **Branch de trabajo:** `claude/epic-darwin-1XZTX`

---

## Leyenda de Estado

| Símbolo | Significado |
|---------|-------------|
| `[ ]` | Pendiente |
| `[/]` | En progreso |
| `[x]` | Completado |
| `[!]` | Bloqueado |

## Leyenda de Prioridad

| Símbolo | Nivel |
|---------|-------|
| 🔴 | CRÍTICA — riesgo de seguridad o dato incorrecto en prod |
| 🟠 | ALTA — funcionalidad rota o incompleta |
| 🟡 | MEDIA — deuda técnica con impacto medible |
| 🟢 | BAJA — mejora de calidad sin impacto funcional inmediato |

---

## BLOQUE A — Seguridad Crítica

---

### TASK-001
**Prioridad:** 🔴 CRÍTICA  
**Estado:** `[x]`

**Descripción técnica:**  
Habilitar Row Level Security (RLS) en la tabla `public.trade_events` en Supabase y crear la política de aislamiento por usuario.

**Problema detectado:**  
La tabla `trade_events` tiene `row_level_security = false` confirmado por dos fuentes independientes: la herramienta MCP `list_tables` (campo `row_level_security: false`) y `get_advisors` (advisory explícito). Esto permite que cualquier usuario autenticado consulte los eventos de trades de otros usuarios directamente via el cliente de Supabase.

**Riesgo:** Un usuario malintencionado puede ejecutar `supabase.from('trade_events').select('*')` y obtener TODOS los eventos de trades de TODOS los usuarios del sistema.

**Impacto:** Exposición completa de datos financieros privados entre usuarios — violación crítica de privacidad multi-tenant.

**Dependencias:** Ninguna — operación independiente.

**Validaciones:**
- [ ] `ALTER TABLE trade_events ENABLE ROW LEVEL SECURITY;`
- [ ] `CREATE POLICY "trade_events_user" ON trade_events FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);`
- [ ] Verificar con `list_tables` MCP que `row_level_security: true`
- [ ] Test: usuario B no puede ver eventos del usuario A (query retorna 0 rows)
- [ ] Verificar que las queries de la app vía tRPC siguen funcionando correctamente

**Archivos afectados:**
- Supabase: tabla `public.trade_events`
- `src/server/trpc/routers/trades.ts` (procedimiento `addEvent`, `list` — verificar que no se rompen)

---

### TASK-002
**Prioridad:** 🔴 CRÍTICA  
**Estado:** `[x]`

**Descripción técnica:**  
Revocar el permiso EXECUTE del rol `anon` sobre la función `handle_new_user()` en Supabase.

**Problema detectado:**  
La función `handle_new_user()` (trigger de Supabase que inserta en `public.users` al registrar un usuario nuevo) tiene modificador `SECURITY DEFINER` (ejecuta con privilegios del owner) y el rol `anon` tiene permiso de ejecución. Confirmado por análisis de advisors del MCP de Supabase.

**Riesgo:** Un atacante sin autenticación puede invocar `handle_new_user()` directamente, potencialmente insertando registros arbitrarios en `public.users` o ejecutando lógica privilegiada sin pasar por el flujo auth de Supabase.

**Impacto:** Creación de usuarios fantasma en `public.users`, posible bypass del flujo de registro, ejecución de lógica SECURITY DEFINER sin autenticación.

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] `REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon;`
- [ ] Verificar que el trigger `on_auth_user_created` sigue funcionando para nuevos registros
- [ ] Test de registro completo de usuario nuevo → debe crearse correctamente en `public.users`
- [ ] Confirmar que `get_advisors` MCP ya no reporta este advisory

**Archivos afectados:**
- Supabase: función `handle_new_user()`
- Supabase: trigger `on_auth_user_created` en `auth.users`

---

### TASK-003
**Prioridad:** 🔴 CRÍTICA  
**Estado:** `[x]`

**Descripción técnica:**  
Fijar el `search_path` de la función `set_updated_at()` en Supabase para prevenir search_path hijacking.

**Problema detectado:**  
La función `set_updated_at()` (trigger que actualiza el campo `updated_at` en múltiples tablas) fue marcada por el advisor de Supabase MCP como función con `search_path` mutable — patrón de seguridad vulnerable.

**Riesgo:** MEDIO — Un actor con permisos de crear schemas podría insertar objetos con nombres que colisionen con los usados por la función durante su ejecución.

**Impacto:** Potencial ejecución de código malicioso con los privilegios de la función.

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] `ALTER FUNCTION set_updated_at() SET search_path = public, pg_catalog;`
- [ ] Verificar que `get_advisors` MCP ya no reporta `set_updated_at` como vulnerable
- [ ] Verificar que los campos `updated_at` siguen actualizándose correctamente en inserciones/updates

**Archivos afectados:**
- Supabase: función `set_updated_at()`

---

### TASK-004
**Prioridad:** 🔴 ALTA  
**Estado:** `[ ]`

**Descripción técnica:**  
Recrear las 10 políticas RLS usando el patrón `(select auth.uid())` en lugar de `auth.uid()` directamente para evitar reevaluación por fila.

**Problema detectado:**  
Todas las políticas RLS activas usan `USING (auth.uid() = user_id)`. PostgreSQL evalúa `auth.uid()` una vez por cada fila revisada (rescan), en lugar de evaluarlo una sola vez por query (InitPlan). El patrón correcto es `USING ((select auth.uid()) = user_id)`.

**Políticas afectadas (todas en Supabase):**
1. `account_logs_user` ON `account_logs`
2. `accounts_user` ON `accounts`
3. `learning_resources_user` ON `learning_resources`
4. `markets_user` ON `markets`
5. `rules_user` ON `rules`
6. `setups_user` ON `setups`
7. `trades_user` ON `trades`
8. `users_self` ON `users`
9. `weekly_reviews_user` ON `weekly_reviews`
10. `withdrawals_user` ON `withdrawals`

**Riesgo:** Performance — con volumen alto de datos, las queries con RLS son 2x-10x más lentas que con el patrón correcto.

**Impacto:** Degradación progresiva de performance a medida que crece el número de registros.

**Dependencias:** Ninguna — puede hacerse con `DROP POLICY` + `CREATE POLICY`.

**Validaciones:**
- [ ] Ejecutar DROP + CREATE para cada una de las 10 políticas
- [ ] Verificar que `EXPLAIN ANALYZE` muestra `InitPlan` en lugar de `Filter` con rescan
- [ ] Test funcional: usuarios aún solo ven sus propios datos
- [ ] Nuevo deployment exitoso en Vercel después del cambio

**Archivos afectados:**
- Supabase: 10 políticas RLS (ver lista arriba)

---

### TASK-005
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`

**Descripción técnica:**  
Restringir las políticas de SELECT en los buckets de Supabase Storage `setup-images` y `trade-screenshots` para requerir autenticación.

**Problema detectado:**  
Ambos buckets tienen política SELECT para el rol `anon`, lo que significa que cualquier persona con la URL directa de un screenshot de trade puede acceder al archivo sin autenticación. Confirmado durante el análisis de Storage en la auditoría.

**Riesgo:** MEDIO — Los screenshots de trades contienen información financiera sensible (charts con PnL visible, símbolos operados, timestamps).

**Impacto:** Fuga de datos financieros privados si las URLs son compartidas o descubiertas.

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] Cambiar política de Storage: `anon` → `authenticated` para SELECT en ambos buckets
- [ ] Verificar que las imágenes siguen cargando en la UI para usuarios autenticados
- [ ] Verificar que las imágenes retornan 403 para usuarios no autenticados
- [ ] Si se usan URLs públicas en campos del DB, evaluar migración a signed URLs

**Archivos afectados:**
- Supabase: bucket `setup-images` (política SELECT)
- Supabase: bucket `trade-screenshots` (política SELECT)
- Buscar en `src/` cualquier uso de `supabase.storage.from(...)` — verificar compatibilidad

---

## BLOQUE B — Integridad de Datos y Esquema

---

### TASK-006
**Prioridad:** 🔴 ALTA  
**Estado:** `[ ]`

**Descripción técnica:**  
Agregar CHECK constraints en PostgreSQL para todos los campos de enum en las tablas que los usan, empezando por las tablas más críticas (`trades`, `accounts`).

**Problema detectado:**  
El `schema.prisma` define todos los enums como `String` con valores por defecto pero sin restricciones de base de datos (`@db.Check`). Prisma valida en runtime pero el constraint no existe en PostgreSQL. Una inserción directa via Supabase Studio o scripts puede meter valores inválidos sin error.

**Enums a proteger:**
- `accounts.type`: `PERSONAL | PROP_FIRM | DEMO_PERSONAL | DEMO_PROP | BACKTEST | QA`
- `accounts.status`: `ACTIVE | PAUSED | INACTIVE | LOST`
- `accounts.dd_model`: `FIXED | TRAILING`
- `accounts.phase`: `PHASE_1 | PHASE_2 | FUNDED | NONE`
- `trades.status`: `OPEN | CLOSED | CANCELLED`
- `trades.direction`: `LONG | SHORT`
- `rules.severity`: `CRÍTICA | ALTA | MEDIA | BAJA`
- `withdrawals.status`: `SOLICITADO | EN_PROCESO | PAGADO | RECHAZADO`
- `setups.direction`: `LARGO | CORTO | AMBAS`
- `setups.status`: `ACTIVO | INACTIVO`

**Riesgo:** ALTO — Datos inválidos que pasan la capa de BD y rompen lógica de UI de formas silenciosas.

**Dependencias:** Verificar que los datos existentes en prod son todos válidos antes de aplicar constraints.

**Validaciones:**
- [ ] Ejecutar `SELECT DISTINCT type FROM accounts` para verificar valores actuales antes del constraint
- [ ] Aplicar constraints como migración de Supabase
- [ ] Verificar que el advisory de Supabase no reporta nuevos problemas
- [ ] Test: intentar insertar valor inválido → debe retornar error de constraint

**Archivos afectados:**
- `src/prisma/schema.prisma` (añadir `@db.Check` o usar Prisma native enum)
- Nueva migración SQL en Supabase

---

### TASK-007
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`

**Descripción técnica:**  
Migrar los campos `tick_size` y `point_value` del modelo `Market` de `String` a `Decimal?` en `schema.prisma` y en la tabla `markets` de Supabase.

**Problema detectado:**  
`src/prisma/schema.prisma` líneas 270-271: `tickSize String @map("tick_size")`, `pointValue String @map("point_value")`. Los valores se almacenan como texto (ej: `"$20"`, `"0.25 / lot"`), lo que hace imposible usarlos en cálculos numéricos de PnL para futuros y otros instrumentos que requieren multiplicadores de contrato.

**Riesgo:** ALTO — Bloquea cualquier feature futuro de cálculo automático de PnL real para instrumentos derivados.

**Impacto:** Los traders de futuros/opciones no pueden ver su PnL calculado automáticamente.

**Dependencias:** TASK-006 debe estar completa para asegurar integridad del esquema.

**Validaciones:**
- [ ] Migración SQL: `ALTER TABLE markets ALTER COLUMN tick_size TYPE DECIMAL(16,8) USING tick_size::decimal;`
- [ ] Script de migración de datos para parsear strings existentes (ej: `"0.25"` → `0.25`)
- [ ] Actualizar `schema.prisma`: `tickSize Decimal? @map("tick_size") @db.Decimal(16,8)`
- [ ] Actualizar formularios de UI de mercados que editan estos campos
- [ ] Regenerar cliente Prisma: `npx prisma generate`

**Archivos afectados:**
- `src/prisma/schema.prisma` (líneas 270-271)
- Supabase: tabla `markets` (columnas `tick_size`, `point_value`)
- `src/app/mercados/page.tsx` o equivalente — formularios de edición de mercado

---

### TASK-008
**Prioridad:** 🟡 MEDIA  
**Estado:** `[ ]`

**Descripción técnica:**  
Eliminar el objeto `propFirmRules` anidado del archivo `src/mock-data/index.ts` y alinear la estructura de datos mock con el schema plano de Prisma.

**Problema detectado:**  
`src/mock-data/index.ts` define cuentas de tipo prop firm con `propFirmRules: { maxDrawdownPct, dailyLossPct, ... }` (objeto anidado). El schema Prisma real tiene campos planos: `dd_daily_pct`, `dd_weekly_pct`, `dd_monthly_pct`, `dd_total_pct`, `target_pct`. Esta discrepancia está enmascarada con `as any` en varios componentes.

**Riesgo:** MEDIO — Al conectar páginas con mock data a la BD real, los mapeos de propiedades fallarán silenciosamente.

**Dependencias:** Ninguna, pero se vuelve crítico al completar TASK-011 y TASK-012 (integración de páginas).

**Validaciones:**
- [ ] Actualizar cada `mockAccount` en `src/mock-data/index.ts` para usar estructura plana
- [ ] Eliminar `propFirmRules` de todos los objetos mock
- [ ] Verificar que no hay errores de TypeScript después del cambio
- [ ] Verificar que las páginas que consumen mock data (reviews, aprendizaje) siguen compilando

**Archivos afectados:**
- `src/mock-data/index.ts` (objetos `mockAccounts`)
- `src/app/cuentas/page.tsx` (usos de `propFirmRules`)
- `src/app/reviews/page.tsx` (uso de `mockAccounts`)

---

## BLOQUE C — Integración Frontend / Backend

---

### TASK-009
**Prioridad:** 🔴 CRÍTICA  
**Estado:** `[ ]`

**Descripción técnica:**  
Crear el router tRPC `weeklyReviewsRouter` en `src/server/trpc/routers/weekly-reviews.ts` con los procedimientos `list`, `create`, `update`, `delete`, `getByWeek`.

**Problema detectado:**  
No existe ningún archivo `src/server/trpc/routers/weekly-reviews.ts`. La tabla `weekly_reviews` existe en Supabase con todas las columnas necesarias (`week_label`, `week_range`, `week_start`, `week_end`, `trade_count`, `net_pnl`, `win_rate`, `discipline_score`, `executive_summary`, `what_worked`, `to_improve`, `status`) pero no hay API para accederla desde el frontend.

**Riesgo:** CRÍTICO — Sin este router, la página `/reviews` no puede persistir datos.

**Impacto:** Funcionalidad de reviews completamente no funcional en producción.

**Dependencias:** TASK-001 (RLS de trade_events debe estar activo antes de conectar datos reales).

**Procedimientos requeridos:**
```typescript
weeklyReviews.list // input: { accountId? } → WeeklyReview[]
weeklyReviews.getByWeek // input: { weekStart: Date } → WeeklyReview | null
weeklyReviews.create // input: { accountId?, weekLabel, weekRange, weekStart, weekEnd, ... }
weeklyReviews.update // input: { id, ...partial fields }
weeklyReviews.delete // input: { id }
```

**Validaciones:**
- [ ] Archivo creado en `src/server/trpc/routers/weekly-reviews.ts`
- [ ] Todos los procedimientos usan `protectedProcedure` de `src/server/trpc/init.ts`
- [ ] Todos los procedimientos filtran por `userId: ctx.userId`
- [ ] Schema Zod creado para input de `create` y `update`
- [ ] Router exportado y registrado en `src/server/trpc/root.ts`
- [ ] TypeScript compila sin errores

**Archivos afectados:**
- `src/server/trpc/routers/weekly-reviews.ts` (crear nuevo)
- `src/server/trpc/root.ts` (registrar el nuevo router)

---

### TASK-010
**Prioridad:** 🔴 CRÍTICA  
**Estado:** `[ ]`

**Descripción técnica:**  
Crear el router tRPC `learningResourcesRouter` en `src/server/trpc/routers/learning-resources.ts` con los procedimientos `list`, `create`, `update`, `delete`, `toggleMarkedForReview`.

**Problema detectado:**  
No existe ningún archivo `src/server/trpc/routers/learning-resources.ts`. La tabla `learning_resources` existe en Supabase con las columnas: `title`, `type`, `author`, `source`, `date`, `notes`, `tags`, `marked_for_review`, `progress_pct`. No hay API para accederla desde el frontend.

**Riesgo:** CRÍTICO — Sin este router, la página `/aprendizaje` no puede persistir recursos.

**Dependencias:** Ninguna de las otras tareas.

**Procedimientos requeridos:**
```typescript
learningResources.list // input: { type?, tags?, markedForReview? } → LearningResource[]
learningResources.create // input: { title, type, author, source, date, notes, tags, progressPct? }
learningResources.update // input: { id, ...partial }
learningResources.delete // input: { id }
learningResources.toggleMarkedForReview // input: { id } → toggle boolean
```

**Validaciones:**
- [ ] Archivo creado en `src/server/trpc/routers/learning-resources.ts`
- [ ] Todos los procedimientos usan `protectedProcedure`
- [ ] Todos los procedimientos filtran por `userId: ctx.userId`
- [ ] Router registrado en `src/server/trpc/root.ts`
- [ ] TypeScript compila sin errores

**Archivos afectados:**
- `src/server/trpc/routers/learning-resources.ts` (crear nuevo)
- `src/server/trpc/root.ts` (registrar)

---

### TASK-011
**Prioridad:** 🔴 CRÍTICA  
**Estado:** `[ ]`

**Descripción técnica:**  
Refactorizar `src/app/reviews/page.tsx` para eliminar todos los imports de mock-data y conectar a los routers tRPC reales.

**Problema detectado:**  
`src/app/reviews/page.tsx` (1263 líneas) importa `mockReviews, mockAccounts, mockResources, mockTrades` de `@/mock-data`. Tiene `EXTRA_REVIEWS` hardcodeado inline (4 objetos), `WEEK_OPTIONS` hardcodeado (semanas con PnL y WR fijos), `MOCK_TRADES` hardcodeado en línea 348. Los botones de guardar en `NuevaReviewModal` (líneas 1198, 1201) solo llaman `onOpenChange(false)` — los datos NUNCA se persisten a la BD.

**Riesgo:** CRÍTICO — El usuario cree que está guardando reviews pero los datos se pierden al recargar. Función completamente ficticia en producción.

**Cambios requeridos:**
1. Reemplazar `import { mockReviews, mockAccounts } from '@/mock-data'` con `trpc.weeklyReviews.list.useQuery()`
2. Reemplazar `EXTRA_REVIEWS` hardcodeado con datos de la query
3. Reemplazar `WEEK_OPTIONS` hardcodeado con generación dinámica desde trades reales
4. Reemplazar `MOCK_TRADES` inline con `trpc.trades.list.useQuery()` filtrado por semana
5. Conectar `NuevaReviewModal` a `trpc.weeklyReviews.create.useMutation()`
6. Conectar botón de edición/actualización a `trpc.weeklyReviews.update.useMutation()`
7. Calcular KPIs (trade count, net PnL, win rate) desde datos reales de trades por semana
8. Reemplazar `accountName()` que usa `mockAccounts` con datos de `trpc.accounts.list.useQuery()`

**Dependencias:** TASK-009 (weeklyReviewsRouter debe existir antes de integrar la página).

**Validaciones:**
- [ ] Cero imports de `@/mock-data` en el archivo
- [ ] `NuevaReviewModal` persiste datos a la BD (verificar con Supabase Studio)
- [ ] Reviews se cargan desde BD al recargar la página
- [ ] KPIs muestran valores calculados desde trades reales
- [ ] Los nombres de cuenta se resuelven desde cuentas reales
- [ ] TypeScript compila sin errores ni `as any`

**Archivos afectados:**
- `src/app/reviews/page.tsx` (refactorización completa)
- `src/mock-data/index.ts` (confirmar que ya no es importado desde reviews)

---

### TASK-012
**Prioridad:** 🔴 ALTA  
**Estado:** `[ ]`

**Descripción técnica:**  
Refactorizar `src/app/aprendizaje/page.tsx` para eliminar imports de mock-data y conectar al router tRPC `learningResources`.

**Problema detectado:**  
`src/app/aprendizaje/page.tsx` importa `mockResources` de `src/mock-data/index.ts`. Los 8 recursos mock son los únicos datos que se muestran. Las operaciones de CRUD no persisten.

**Cambios requeridos:**
1. Reemplazar import de `mockResources` con `trpc.learningResources.list.useQuery()`
2. Conectar formulario de crear recurso a `trpc.learningResources.create.useMutation()`
3. Conectar botones de editar/eliminar a sus respectivas mutations
4. Conectar toggle "Marked for Review" a `trpc.learningResources.toggleMarkedForReview.useMutation()`

**Dependencias:** TASK-010 (learningResourcesRouter).

**Validaciones:**
- [ ] Cero imports de `@/mock-data` en el archivo
- [ ] Recursos se persisten a la BD
- [ ] Lista se recarga desde BD al recargar la página
- [ ] TypeScript compila sin errores

**Archivos afectados:**
- `src/app/aprendizaje/page.tsx`

---

### TASK-013
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`

**Descripción técnica:**  
Registrar `weeklyReviewsRouter` y `learningResourcesRouter` en `src/server/trpc/root.ts`.

**Problema detectado:**  
Actualmente `src/server/trpc/root.ts` solo registra: `accountsRouter`, `tradesRouter`, `setupsRouter`, `marketsRouter`, `rulesRouter`. Los dos nuevos routers de TASK-009 y TASK-010 deben registrarse aquí para ser accesibles desde el cliente.

**Dependencias:** TASK-009, TASK-010.

**Validaciones:**
- [ ] `weeklyReviews: weeklyReviewsRouter` agregado al `appRouter`
- [ ] `learningResources: learningResourcesRouter` agregado al `appRouter`
- [ ] `trpc.weeklyReviews.*` y `trpc.learningResources.*` son accesibles desde el cliente sin errores de tipo
- [ ] Build de Vercel pasa sin errores de TypeScript

**Archivos afectados:**
- `src/server/trpc/root.ts`

---

## BLOQUE D — Fórmulas y Lógica de Negocio

---

### TASK-014
**Prioridad:** 🔴 ALTA  
**Estado:** `[ ]`

**Descripción técnica:**  
Corregir la fórmula de Expectancy en `src/server/trpc/routers/trades.ts` línea 284 para usar el promedio real de R de los trades perdedores.

**Problema detectado:**  
Línea 284 en `src/server/trpc/routers/trades.ts`:
```javascript
const expectancy = avgR * (winRate / 100) - (1 - winRate / 100)
```
Esta fórmula asume que el promedio de R en trades perdedores es siempre exactamente `1.0`. La fórmula correcta debe calcular `avgLossR` desde los trades reales:
```javascript
const winTrades = closed.filter(t => t.rMultiple !== null && t.rMultiple > 0)
const lossTrades = closed.filter(t => t.rMultiple !== null && t.rMultiple <= 0)
const avgWinR = winTrades.reduce((s, t) => s + t.rMultiple, 0) / (winTrades.length || 1)
const avgLossR = Math.abs(lossTrades.reduce((s, t) => s + t.rMultiple, 0) / (lossTrades.length || 1))
const expectancy = (winRate / 100) * avgWinR - (1 - winRate / 100) * avgLossR
```

**Riesgo:** ALTO — Métrica clave de trading muestra valor incorrecto. Un sistema con pérdidas promedio de 0.5R se muestra igual que uno con pérdidas de 2R.

**Impacto:** El trader puede malinterpretar la calidad de su sistema y tomar decisiones incorrectas.

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] Fórmula actualizada usa `avgLossR` real calculado desde trades cerrados con `rMultiple`
- [ ] Manejo correcto de edge case: sin trades cerrados → expectancy = 0
- [ ] Manejo de trades sin `rMultiple` (trades abiertos) — excluir del cálculo
- [ ] Resultado es consistente con el cálculo mostrado en `src/app/dashboard/page.tsx`
- [ ] Test unitario escrito para la nueva fórmula (ver TASK-033)

**Archivos afectados:**
- `src/server/trpc/routers/trades.ts` (línea 284, procedimiento `stats`)

---

### TASK-015
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`

**Descripción técnica:**  
Corregir el cálculo de Sharpe Ratio en `src/app/dashboard/page.tsx` para usar desviación estándar muestral en lugar de poblacional.

**Problema detectado:**  
`src/app/dashboard/page.tsx` línea ~291 divide por `rs.length` (std dev poblacional) en lugar de `rs.length - 1` (std dev muestral de Bessel). Para muestras pequeñas de trades (10-100), la diferencia puede ser del 5-20%.

**Fórmula actual:**
```javascript
Math.sqrt(rs.reduce((a, v) => a + (v - mean) ** 2, 0) / rs.length)
```
**Fórmula correcta:**
```javascript
Math.sqrt(rs.reduce((a, v) => a + (v - mean) ** 2, 0) / (rs.length - 1))
```
Adicionalmente, manejar el edge case `rs.length === 1` (stdDev = 0 → Sharpe = 0 o Infinity).

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] Fórmula usa `rs.length - 1`
- [ ] Edge case `rs.length <= 1` retorna `0` o `null` sin dividir por cero
- [ ] Test unitario para Sharpe con muestra conocida (ver TASK-033)

**Archivos afectados:**
- `src/app/dashboard/page.tsx` (línea ~291)

---

### TASK-016
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`

**Descripción técnica:**  
Unificar el cálculo de Expectancy entre `src/server/trpc/routers/trades.ts` y `src/app/dashboard/page.tsx` para que ambos usen la misma fórmula y muestren el mismo valor.

**Problema detectado:**  
Existen dos implementaciones de Expectancy en el proyecto que producen valores diferentes para los mismos datos. El router `trades.stats` calcula uno, y el dashboard calcula otro inline. No deben divergir.

**Solución:** Extraer la fórmula a `src/lib/formulas.ts` (nuevo archivo) y reusarla desde ambos lugares.

**Dependencias:** TASK-014 (la fórmula correcta debe estar definida primero).

**Validaciones:**
- [ ] `src/lib/formulas.ts` creado con funciones exportadas: `calcExpectancy`, `calcSharpe`, `calcProfitFactor`
- [ ] `trades.ts` router importa `calcExpectancy` de `@/lib/formulas`
- [ ] `dashboard/page.tsx` importa las mismas funciones
- [ ] Ambas interfaces muestran el mismo valor para el mismo conjunto de trades

**Archivos afectados:**
- `src/lib/formulas.ts` (crear nuevo)
- `src/server/trpc/routers/trades.ts`
- `src/app/dashboard/page.tsx`

---

### TASK-017
**Prioridad:** 🟡 MEDIA  
**Estado:** `[ ]`

**Descripción técnica:**  
Renombrar las métricas MAE/MFE en `src/app/dashboard/page.tsx` para reflejar que son "Riesgo Planificado" y "Reward Planificado", no excursiones reales de precio.

**Problema detectado:**  
`src/app/dashboard/page.tsx` líneas 731-742 calcula "MAE" como `entry - stop` y "MFE" como `target - entry`. Estos son los valores planificados ANTES de la operación. MAE/MFE reales son el movimiento de precio durante la vida del trade (mínimo precio contra la posición y máximo a favor). Los labels actuales son técnicamente incorrectos y confunden al trader.

**Riesgo:** MEDIO — El trader interpreta estas métricas como MAE/MFE reales y toma conclusiones erróneas sobre el comportamiento de precio en sus trades.

**Acción:** Cambiar etiquetas a "Riesgo Planificado (R)" / "Reward Planificado (R)" hasta que se implemente captura de datos de precio intra-trade.

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] Etiquetas en los gráficos cambiadas
- [ ] Tooltips actualizados con descripción correcta
- [ ] No hay cambios en el cálculo numérico (solo labels)

**Archivos afectados:**
- `src/app/dashboard/page.tsx` (líneas 731-742 y secciones de gráficos correspondientes)

---

### TASK-018
**Prioridad:** 🟡 MEDIA  
**Estado:** `[ ]`

**Descripción técnica:**  
Reemplazar el cálculo de semana ISO en `src/app/dashboard/page.tsx` con `getISOWeek` de `date-fns`.

**Problema detectado:**  
`src/app/dashboard/page.tsx` línea ~1202 usa una fórmula manual de semana ISO que puede producir semana 0 o semanas incorrectas cerca de límites de año (último/primer domingo/lunes del año). El paquete `date-fns` ya está en el proyecto y tiene `getISOWeek` que implementa ISO 8601 correctamente.

**Fórmula actual incorrecta:**
```javascript
Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
```
**Solución:**
```javascript
import { getISOWeek, getISOWeekYear } from 'date-fns'
const weekNum = getISOWeek(d)
const weekYear = getISOWeekYear(d)
```

**Dependencias:** Ninguna (`date-fns` ya es dependencia del proyecto).

**Validaciones:**
- [ ] Agrupación de trades por semana produce resultados correctos
- [ ] Las semanas de diciembre/enero se agrupan correctamente según ISO 8601
- [ ] Test con fecha conocida que tenía bug (ej: 2024-01-01 → debe ser semana 1 de 2024)

**Archivos afectados:**
- `src/app/dashboard/page.tsx` (línea ~1202)

---

### TASK-019
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`

**Descripción técnica:**  
Corregir el manejo de `rMultiple` en el procedimiento `create` de trades: no guardar el RR planificado como `rMultiple`.

**Problema detectado:**  
`src/app/trades/page.tsx` línea ~103 calcula `rr = (target - entry) / (entry - stop)` (RR planificado) y lo pasa como `rMultiple` al crear el trade. El campo `r_multiple` en la BD debe representar el R real alcanzado al cerrar, que solo puede calcularse en el procedimiento `close` de `src/server/trpc/routers/trades.ts` (donde ya está implementado correctamente).

**Riesgo:** ALTO — Los cálculos de Expectancy y estadísticas de performance incluyen incorrectamente el RR planificado de trades abiertos como si fuera el resultado real, distorsionando todas las métricas.

**Acción:** En el flujo de `create`, no enviar `rMultiple` al router (o enviarlo como `null`). Solo el procedimiento `close` debe escribir `rMultiple`.

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] Al crear un trade, `r_multiple` en la BD es `null`
- [ ] Al cerrar un trade, `r_multiple` se calcula correctamente como `(closePrice - entry) / (entry - stop)` (ajustado por dirección)
- [ ] Las estadísticas del dashboard solo usan trades cerrados para calcular métricas de R
- [ ] Verificar que no hay regresión en el procedimiento `close` de `trades.ts`

**Archivos afectados:**
- `src/app/trades/page.tsx` (eliminación del cálculo y envío de `rr`/`rMultiple` en create)
- `src/server/trpc/routers/trades.ts` (verificar que `create` no acepta `rMultiple` en el input schema)

---

## BLOQUE E — Performance y Escalabilidad

---

### TASK-020
**Prioridad:** 🔴 ALTA  
**Estado:** `[x]`

**Descripción técnica:**  
Crear los 5 índices de FK faltantes en Supabase identificados por el Performance Advisor.

**Problema detectado:**  
El Performance Advisor de Supabase (via `get_advisors` MCP) identificó explícitamente 5 índices de foreign key faltantes que causan sequential scans:

1. `rules.user_id` → faltante FK index `rules_user_id_fkey`
2. `setups.user_id` → faltante FK index `setups_user_id_fkey`
3. `trade_events.user_id` → faltante FK index `trade_events_user_id_fkey`
4. `trades.setup_id` → faltante FK index `trades_setup_id_fkey`
5. `weekly_reviews.account_id` → faltante FK index `weekly_reviews_account_id_fkey`

**Riesgo:** ALTO — Sequential scans con crecimiento de datos. Con 500+ trades y múltiples setups, las queries de listado se vuelven lentas progresivamente.

**SQL a ejecutar:**
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS rules_user_id_idx ON rules(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS setups_user_id_idx ON setups(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS trade_events_user_id_idx ON trade_events(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS trades_setup_id_idx ON trades(setup_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS weekly_reviews_account_id_idx ON weekly_reviews(account_id);
```

**Dependencias:** Ninguna — `CONCURRENTLY` no bloquea la BD.

**Validaciones:**
- [ ] Los 5 índices existen en Supabase (verificar con `list_tables` o `execute_sql`)
- [ ] `get_advisors` MCP ya no reporta estos 5 índices como faltantes
- [ ] `EXPLAIN ANALYZE` de queries frecuentes muestra `Index Scan` en lugar de `Seq Scan`

**Archivos afectados:**
- Supabase: 5 tablas (`rules`, `setups`, `trade_events`, `trades`, `weekly_reviews`)

---

### TASK-021
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`

**Descripción técnica:**  
Implementar paginación en el procedimiento `trades.list` de `src/server/trpc/routers/trades.ts`.

**Problema detectado:**  
El procedimiento `list` en `src/server/trpc/routers/trades.ts` ejecuta `prisma.trade.findMany({ where: { userId } })` sin ningún límite de registros. Con 1000+ trades, esto transfiere toda la tabla en cada carga de página del dashboard y la lista de trades.

**Riesgo:** ALTO — Con volumen real de datos, la página se vuelve lenta e inutilizable. El cliente procesa arrays de 1000+ elementos en memoria.

**Implementación recomendada:** Cursor-based pagination con `cursor` (trade ID) + `limit: 50`.

**Cambios requeridos:**
1. Agregar input `{ cursor?: string, limit?: number, filters?: {...} }` al procedimiento `list`
2. Retornar `{ trades, nextCursor }` del procedimiento
3. Actualizar `src/app/trades/page.tsx` para usar `useInfiniteQuery` de tRPC/React Query
4. Agregar botón "Cargar más" o scroll infinito
5. Evaluar si `dashboard/page.tsx` necesita todos los trades o solo los últimos N

**Dependencias:** Ninguna técnica, pero es recomendable completar TASK-011 antes para no tener que adaptar dos versiones del listado.

**Validaciones:**
- [ ] Primera carga trae máximo `limit` trades
- [ ] "Cargar más" funciona y trae el siguiente bloque
- [ ] Filtros por fecha/cuenta/setup siguen funcionando con paginación
- [ ] El dashboard sigue calculando métricas correctamente (puede necesitar endpoint separado para estadísticas)

**Archivos afectados:**
- `src/server/trpc/routers/trades.ts` (procedimiento `list`)
- `src/app/trades/page.tsx`
- `src/app/dashboard/page.tsx` (puede necesitar separar `trades.list` de `trades.stats`)

---

## BLOQUE F — Calidad de Código y TypeScript

---

### TASK-022
**Prioridad:** 🟡 MEDIA  
**Estado:** `[ ]`

**Descripción técnica:**  
Corregir los 4 casts `as never` en `src/app/trades/page.tsx` (líneas 179, 209, 210, 279) reemplazándolos con tipos explícitos derivados de los schemas Zod de los routers tRPC.

**Problema detectado:**  
`src/app/trades/page.tsx` usa `as never` en 4 lugares para silenciar errores de TypeScript. Esto indica que hay una discrepancia entre el tipo del formulario local y el tipo esperado por las mutations de tRPC. Los casts `as never` ocultan posibles errores de mapeo de datos que solo se manifestarían en runtime.

**Solución:**
```typescript
import type { RouterInputs } from '@/server/trpc/root'
type CreateTradeInput = RouterInputs['trades']['create']
```
Usar `CreateTradeInput` como tipo de los datos del formulario, asegurando compatibilidad en tiempo de compilación.

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] Cero usos de `as never` en `trades/page.tsx`
- [ ] Cero usos de `as any` en el archivo
- [ ] TypeScript compila sin errores ni supresiones
- [ ] Las operaciones de create, update, close, delete siguen funcionando correctamente

**Archivos afectados:**
- `src/app/trades/page.tsx` (líneas 179, 209, 210, 279)

---

### TASK-023
**Prioridad:** 🟡 MEDIA  
**Estado:** `[ ]`

**Descripción técnica:**  
Eliminar los 3 usos de `any` explícito en `src/app/cuentas/page.tsx` reemplazándolos con el tipo inferido del router `accounts.list`.

**Problema detectado:**  
Los componentes `AccountCard`, `AccountDetailPanel`, `NuevaCuentaModal`, `EditarCuentaModal` en `src/app/cuentas/page.tsx` reciben `rawAccount: any` como prop. Esto elimina la seguridad de tipos en los componentes más críticos de la página de cuentas.

**Solución:**
```typescript
import type { RouterOutputs } from '@/server/trpc/root'
type AccountFromRouter = RouterOutputs['accounts']['list'][number]
```

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] Cero usos de `any` en el archivo
- [ ] Todos los componentes internos tipados correctamente
- [ ] TypeScript compila sin errores

**Archivos afectados:**
- `src/app/cuentas/page.tsx`

---

### TASK-024
**Prioridad:** 🟢 BAJA  
**Estado:** `[ ]`

**Descripción técnica:**  
Eliminar el objeto muerto `ACCOUNT_STATS` de `src/app/cuentas/page.tsx` (líneas 39-64).

**Problema detectado:**  
`src/app/cuentas/page.tsx` líneas 39-64 contiene un objeto `ACCOUNT_STATS` con datos hardcodeados de rendimiento de 3 cuentas ficticias. Este objeto ya no se referencia en ninguna parte del JSX porque los stats se calculan desde datos reales vía `trpc.trades.list`. Es código muerto que confunde a futuros desarrolladores.

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] Objeto `ACCOUNT_STATS` eliminado
- [ ] Sin referencias a `ACCOUNT_STATS` en el archivo
- [ ] UI de cuentas sigue mostrando stats correctamente desde la BD

**Archivos afectados:**
- `src/app/cuentas/page.tsx` (líneas 39-64)

---

### TASK-025
**Prioridad:** 🟢 BAJA  
**Estado:** `[ ]`

**Descripción técnica:**  
Eliminar la segunda definición duplicada de `ACCOUNT_STATUS_META` en `src/app/cuentas/page.tsx` (línea ~341).

**Problema detectado:**  
`src/app/cuentas/page.tsx` define el objeto `ACCOUNT_STATUS_META` dos veces — una vez cerca de la línea 78 y otra vez cerca de la línea 341. La segunda definición sobrescribe o es ignorada según el scope, y ambas pueden quedar desincronizadas al hacer cambios futuros.

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] Solo una definición de `ACCOUNT_STATUS_META` en el archivo
- [ ] La definición restante incluye todos los estados necesarios
- [ ] Las referencias al objeto siguen funcionando correctamente

**Archivos afectados:**
- `src/app/cuentas/page.tsx` (línea ~341)

---

### TASK-026
**Prioridad:** 🟢 BAJA  
**Estado:** `[ ]`

**Descripción técnica:**  
Eliminar el componente `Sparkline` y su comentario `eslint-disable` asociado de `src/app/dashboard/page.tsx`.

**Problema detectado:**  
El componente `Sparkline` está definido en `src/app/dashboard/page.tsx` pero no se usa en ningún lugar del JSX. En lugar de eliminarlo, se suprimió el warning de ESLint con `// eslint-disable-next-line @typescript-eslint/no-unused-vars`. Esto es código muerto que aumenta el tamaño del bundle innecesariamente.

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] Componente `Sparkline` eliminado del archivo
- [ ] Comentario `eslint-disable` eliminado
- [ ] El dashboard sigue compilando y renderizando correctamente
- [ ] Sin nuevos warnings de ESLint introducidos

**Archivos afectados:**
- `src/app/dashboard/page.tsx`

---

### TASK-027
**Prioridad:** 🟢 BAJA  
**Estado:** `[ ]`

**Descripción técnica:**  
Extraer el componente `RuleBar` a `src/components/ui/rule-bar.tsx` y usarlo desde `dashboard/page.tsx` y `cuentas/page.tsx`.

**Problema detectado:**  
El componente `RuleBar` está definido inline en dos archivos: `src/app/dashboard/page.tsx` y `src/app/cuentas/page.tsx`. Cualquier cambio de diseño o comportamiento debe hacerse en dos lugares, creando riesgo de divergencia.

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] `src/components/ui/rule-bar.tsx` creado con la implementación única
- [ ] `dashboard/page.tsx` importa desde `@/components/ui/rule-bar`
- [ ] `cuentas/page.tsx` importa desde `@/components/ui/rule-bar`
- [ ] Las definiciones inline eliminadas de ambos archivos
- [ ] UI visual de reglas sin cambios

**Archivos afectados:**
- `src/components/ui/rule-bar.tsx` (crear)
- `src/app/dashboard/page.tsx`
- `src/app/cuentas/page.tsx`

---

### TASK-028
**Prioridad:** 🟢 BAJA  
**Estado:** `[ ]`

**Descripción técnica:**  
Extraer el componente `MiniSparkline` SVG a `src/components/ui/mini-sparkline.tsx` y usarlo desde `dashboard/page.tsx` y `cuentas/page.tsx`.

**Problema detectado:**  
El SVG `MiniSparkline` está duplicado en `src/app/dashboard/page.tsx` y `src/app/cuentas/page.tsx` — misma situación que `RuleBar`.

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] `src/components/ui/mini-sparkline.tsx` creado
- [ ] Importado desde ambas páginas
- [ ] Definiciones inline eliminadas
- [ ] UI sin cambios visuales

**Archivos afectados:**
- `src/components/ui/mini-sparkline.tsx` (crear)
- `src/app/dashboard/page.tsx`
- `src/app/cuentas/page.tsx`

---

### TASK-029
**Prioridad:** 🟢 BAJA  
**Estado:** `[ ]`

**Descripción técnica:**  
Consolidar el componente `KpiCard` para usar exclusivamente la implementación en `src/components/kpi-strip.tsx`, eliminando la definición inline duplicada en `src/app/dashboard/page.tsx`.

**Problema detectado:**  
`KpiCard` está definido inline en `src/app/dashboard/page.tsx` Y exportado desde `src/components/kpi-strip.tsx`. El dashboard usa la versión local en lugar de la compartida, lo que significa que hay dos implementaciones que pueden divergir.

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] `KpiCard` eliminado de `dashboard/page.tsx`
- [ ] `dashboard/page.tsx` importa `KpiCard` de `@/components/kpi-strip`
- [ ] UI visual del dashboard sin cambios

**Archivos afectados:**
- `src/app/dashboard/page.tsx`
- `src/components/kpi-strip.tsx`

---

## BLOQUE G — Corrección de Build de Vercel

---

### TASK-030
**Prioridad:** 🔴 CRÍTICA  
**Estado:** `[x]`

**Descripción técnica:**  
Corregir los errores de TypeScript en los componentes Recharts del dashboard que causaron 7+ deployments con estado ERROR en Vercel.

**Problema detectado:**  
El log de deployments de Vercel (via `list_deployments` MCP) muestra 7+ deployments con estado `ERROR`. El patrón de error recurrente es:
1. Recharts `<Tooltip>` prop `formatter` con tipo incompatible: el formatter retorna `string | number | (ReactElement | string | number)[]` pero el tipo esperado es más estricto
2. Recharts `<Pie>` prop `percent` puede ser `undefined` y se usa en una operación aritmética sin guard

**Correcciones requeridas:**
```typescript
// Error 1: Tooltip formatter
<Tooltip formatter={(value: number) => [`${value.toFixed(2)}`, 'Label']} />

// Error 2: Pie percent
<Label value={`${(percent! * 100).toFixed(0)}%`} />
// o con guard:
<Label value={percent !== undefined ? `${(percent * 100).toFixed(0)}%` : '0%'} />
```

**Riesgo:** CRÍTICO — Los deployments de producción fallan por estos errores. La aplicación no se actualiza en Vercel.

**Dependencias:** Ninguna — corrección puramente de TypeScript.

**Validaciones:**
- [ ] `tsc --noEmit` pasa sin errores localmente
- [ ] Deployment en Vercel tiene estado READY (no ERROR)
- [ ] Los gráficos del dashboard siguen renderizando correctamente
- [ ] Sin warnings de TypeScript suprimidos con `@ts-ignore` o `as any`

**Archivos afectados:**
- `src/app/dashboard/page.tsx` (usos de `<Tooltip formatter={...}>` y `<Pie>` con `percent`)

---

## BLOQUE H — Testing

---

### TASK-031
**Prioridad:** 🟠 ALTA  
**Estado:** `[ ]`

**Descripción técnica:**  
Crear `src/lib/formulas.ts` con todas las funciones de cálculo financiero extraídas del dashboard y del router de trades, y escribir tests unitarios en `src/lib/formulas.test.ts`.

**Problema detectado:**  
Las fórmulas financieras (Expectancy, Sharpe, Profit Factor, R-Multiple, Drawdown) están duplicadas e implementadas de forma inconsistente en `src/app/dashboard/page.tsx` y `src/server/trpc/routers/trades.ts`. Ninguna tiene tests.

**Funciones a crear en `src/lib/formulas.ts`:**
```typescript
export function calcExpectancy(trades: ClosedTrade[]): number
export function calcSharpeRatio(returns: number[]): number
export function calcProfitFactor(trades: ClosedTrade[]): number
export function calcMaxDrawdown(equity: number[]): number
export function calcWinRate(trades: ClosedTrade[]): number
export function calcAvgRMultiple(trades: ClosedTrade[]): number
```

**Tests en `src/lib/formulas.test.ts`:**
- Expectancy: caso base con 3 wins (2R avg) y 2 losses (-1.5R avg) → resultado conocido
- Sharpe: array de returns conocidos → comparar con cálculo manual
- Profit Factor: PnL conocidos → verificar resultado
- Edge cases: array vacío, un solo trade, todos wins, todos losses

**Dependencias:** TASK-014, TASK-015, TASK-016 (las fórmulas deben estar corregidas antes de testearlas).

**Validaciones:**
- [ ] `src/lib/formulas.ts` creado con todas las funciones
- [ ] `src/lib/formulas.test.ts` creado con mínimo 3 tests por función
- [ ] `npx vitest run` pasa todos los tests
- [ ] Edge cases cubiertos (arrays vacíos, un elemento)

**Archivos afectados:**
- `src/lib/formulas.ts` (crear)
- `src/lib/formulas.test.ts` (crear)
- `src/server/trpc/routers/trades.ts` (refactor para importar de formulas)
- `src/app/dashboard/page.tsx` (refactor para importar de formulas)

---

### TASK-032
**Prioridad:** 🟡 MEDIA  
**Estado:** `[ ]`

**Descripción técnica:**  
Crear tests de integración para los guards de cambio de fase en `src/server/trpc/routers/accounts.ts`.

**Problema detectado:**  
El procedimiento `changePhase` en `src/server/trpc/routers/accounts.ts` tiene lógica de guards crítica: requiere `objectiveMet: true` OR `manualOverride: true` para promover una cuenta de fase. Esta lógica no tiene ningún test. Un refactor accidental podría eliminar las guards silenciosamente.

**Tests a crear en `src/server/trpc/routers/accounts.test.ts`:**
- `changePhase` sin `objectiveMet` ni `manualOverride` → debe lanzar `TRPCError`
- `changePhase` con `objectiveMet: true` → debe crear `AccountLog` con event `PHASE_CHANGE`
- `changePhase` con `manualOverride: true` → debe permitir la promoción
- `changeStatus` a `LOST` sin `statusNote` → debe lanzar error
- `changeStatus` a `LOST` con `statusNote` → debe guardar el note

**Dependencias:** TASK-009 (no crítico, puede hacerse en paralelo).

**Validaciones:**
- [ ] `src/server/trpc/routers/accounts.test.ts` creado
- [ ] Todos los tests pasan con `npx vitest run`
- [ ] Guards verificados en ambas direcciones (permite y bloquea correctamente)

**Archivos afectados:**
- `src/server/trpc/routers/accounts.test.ts` (crear)

---

### TASK-033
**Prioridad:** 🟡 MEDIA  
**Estado:** `[ ]`

**Descripción técnica:**  
Escribir tests para el procedimiento `trades.close` verificando el cálculo correcto de PnL y R-Multiple para posiciones LONG y SHORT.

**Problema detectado:**  
El procedimiento `close` en `src/server/trpc/routers/trades.ts` calcula PnL como `(closePrice - entry) * size` para LONG y `(entry - closePrice) * size` para SHORT, luego resta comisiones y calcula `rMultiple = rawPnl / risk`. Esta lógica crítica no tiene tests. Un error aquí afecta directamente los reportes financieros del usuario.

**Tests a crear:**
- Trade LONG cerrado en profit → PnL positivo, R-Multiple positivo
- Trade LONG cerrado en pérdida → PnL negativo, R-Multiple negativo  
- Trade SHORT cerrado en profit (precio bajó) → PnL positivo
- Trade con comisión → PnL neto correcto
- R-Multiple calculado correctamente con riesgo real

**Dependencias:** TASK-019.

**Validaciones:**
- [ ] `src/server/trpc/routers/trades.test.ts` creado
- [ ] Tests para LONG y SHORT en profit y pérdida
- [ ] Test con comisión
- [ ] Todos pasan con `npx vitest run`

**Archivos afectados:**
- `src/server/trpc/routers/trades.test.ts` (crear)

---

## Resumen de Prioridades

| Prioridad | Tareas |
|-----------|--------|
| 🔴 CRÍTICA | TASK-001, TASK-002, TASK-009, TASK-010, TASK-030 |
| 🔴 ALTA | TASK-003, TASK-004, TASK-006, TASK-011, TASK-014, TASK-019, TASK-020 |
| 🟠 ALTA | TASK-005, TASK-007, TASK-012, TASK-013, TASK-015, TASK-021, TASK-022, TASK-031 |
| 🟡 MEDIA | TASK-008, TASK-016, TASK-017, TASK-018, TASK-023, TASK-025, TASK-032, TASK-033 |
| 🟢 BAJA | TASK-024, TASK-026, TASK-027, TASK-028, TASK-029 |

## Orden de Ejecución Recomendado

```
Semana 1 (Seguridad + Build):
  TASK-030 → TASK-001 → TASK-002 → TASK-003 → TASK-020

Semana 2 (Integración Backend):
  TASK-009 → TASK-010 → TASK-013

Semana 2-3 (Integración Frontend):
  TASK-011 → TASK-012

Semana 3 (Fórmulas + Calidad):
  TASK-014 → TASK-015 → TASK-016 → TASK-019 → TASK-006
  TASK-022 → TASK-023 → TASK-024 → TASK-025

Semana 3-4 (Performance):
  TASK-004 → TASK-021 → TASK-007

Semana 4 (Testing):
  TASK-031 → TASK-032 → TASK-033

Ongoing (Calidad código):
  TASK-017 → TASK-018 → TASK-026 → TASK-027 → TASK-028 → TASK-029 → TASK-005 → TASK-008
```

---

### TASK-034
**Prioridad:** 🟡 MEDIA  
**Estado:** `[ ]`

**Descripción técnica:**  
Crear índice faltante en `account_logs.user_id` — detectado por Performance Advisor durante sesión de remediación Semana 1.

**Problema detectado:**  
El Performance Advisor de Supabase reportó `account_logs_user_id_fkey` sin índice cobertor después de aplicar TASK-020. Esta FK no estaba en el listado original de 5 índices del audit inicial.

**SQL:**
```sql
CREATE INDEX IF NOT EXISTS account_logs_user_id_idx ON public.account_logs(user_id);
```

**Dependencias:** Ninguna.

**Validaciones:**
- [ ] Índice `account_logs_user_id_idx` existe en Supabase
- [ ] Performance Advisor ya no reporta `account_logs_user_id_fkey` como unindexed

**Archivos afectados:**
- Supabase: tabla `public.account_logs`

---

*Backlog generado a partir de auditoría técnica real. Todos los problemas incluyen ubicación específica (archivo:línea), tabla de BD afectada, confirmación de herramientas MCP utilizadas, y validaciones verificables.*
