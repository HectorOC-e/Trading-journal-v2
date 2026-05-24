# MASTER REMEDIATION PLAN — Trading Journal v2

> **Generado el:** 2026-05-24  
> **Auditoría base:** Revisión completa de código fuente, Supabase (jpojusluihjjsjvcubdp), Vercel (prj_qKKQQLDmGREOf0GYHqA4H95tdsFs)  
> **Branch de trabajo:** `claude/epic-darwin-1XZTX`

---

## Índice de Fases

| # | Fase | Prioridad | Impacto | Estado |
|---|------|-----------|---------|--------|
| 1 | [Seguridad Crítica](#fase-1--seguridad-crítica) | 🔴 CRÍTICA | Exposición de datos multi-usuario | Pendiente |
| 2 | [Integridad de Datos y Esquema](#fase-2--integridad-de-datos-y-esquema) | 🔴 ALTA | Corrupción silenciosa de datos | Pendiente |
| 3 | [Integración Frontend / Backend](#fase-3--integración-frontend--backend) | 🔴 ALTA | Páginas 100% mock en producción | Pendiente |
| 4 | [Consistencia Lógica y Fórmulas](#fase-4--consistencia-lógica-y-fórmulas) | 🟠 MEDIA-ALTA | KPIs y métricas incorrectos | Pendiente |
| 5 | [Performance y Escalabilidad](#fase-5--performance-y-escalabilidad) | 🟠 MEDIA | Degradación con volumen real | Pendiente |
| 6 | [Calidad de Código y UX](#fase-6--calidad-de-código-y-ux) | 🟡 MEDIA-BAJA | Deuda técnica acumulada | Pendiente |
| 7 | [Testing y Estabilidad de Producción](#fase-7--testing-y-estabilidad-de-producción) | 🟡 BAJA-MEDIA | Regresiones silenciosas | Pendiente |

---

## FASE 1 — Seguridad Crítica

**Objetivo:** Eliminar todas las vulnerabilidades de acceso a datos confirmadas en la auditoría antes de que el sistema sea usado por más de un usuario.

### Problema 1.1 — RLS deshabilitado en `public.trade_events`

**Sistema afectado:** Supabase (PostgreSQL 17.6.1), tabla `trade_events`  
**Detectado mediante:** `list_tables` MCP + `get_advisors` MCP — ambos confirmaron `row_level_security: false`

**Problema:** La tabla `trade_events` NO tiene Row Level Security (RLS) activado. Cualquier usuario autenticado puede leer y manipular eventos de trades de otros usuarios mediante queries directas al API de Supabase. El modelo `TradeEvent` en `schema.prisma` define `userId String @map("user_id")` como campo de aislamiento, pero sin RLS ese campo es ignorable.

**Riesgo:** CRÍTICO — Exposición completa de trades privados entre usuarios. Si la aplicación escala a múltiples usuarios, los datos de todos son visibles entre sí.

**Impacto:** Violación de privacidad, potencial manipulación de datos de trading ajenos, incumplimiento de principios básicos de seguridad multi-tenant.

**Dependencias:** Ninguna — operación independiente en Supabase.

**Validación requerida:**
1. Ejecutar `ALTER TABLE trade_events ENABLE ROW LEVEL SECURITY;`
2. Crear política: `CREATE POLICY "trade_events_user" ON trade_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`
3. Verificar con `list_tables` MCP que `row_level_security = true`
4. Test: intentar query desde usuario B para leer eventos de usuario A → debe retornar 0 rows

---

### Problema 1.2 — `handle_new_user` SECURITY DEFINER accesible por `anon`

**Sistema afectado:** Supabase — función `handle_new_user` (trigger en `auth.users`)  
**Detectado mediante:** Advisors MCP + confirmación de políticas activas de ejecución

**Problema:** La función `handle_new_user` (que inserta en `public.users` al registrar un nuevo usuario) tiene el modificador `SECURITY DEFINER`, lo que le da privilegios del owner de la función durante su ejecución. Adicionalmente, el rol `anon` tiene EXECUTE sobre esta función, permitiendo invocación sin autenticación.

**Riesgo:** ALTO — Un actor malicioso puede invocar `handle_new_user` directamente, potencialmente insertando registros arbitrarios en `public.users` o ejecutando lógica privilegiada sin pasar por el flujo de auth de Supabase.

**Impacto:** Creación de usuarios fantasma en `public.users`, posible bypass del flujo de registro.

**Dependencias:** Ninguna — operación de base de datos independiente.

**Validación requerida:**
1. `REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon;`
2. Verificar que el trigger `on_auth_user_created` sigue funcionando para usuarios `authenticated`
3. Test de registro completo de nuevo usuario — debe seguir funcionando correctamente

---

### Problema 1.3 — `set_updated_at` con `search_path` mutable

**Sistema afectado:** Supabase — función `set_updated_at` (trigger en tablas con `updated_at`)  
**Detectado mediante:** Advisors MCP — marcada como `search_path: mutable`

**Problema:** La función `set_updated_at` no tiene `search_path` fijado, lo que permite ataques de search_path hijacking donde un atacante con permisos de crear schemas podría insertar objetos con nombres que colisionen con los usados por la función.

**Riesgo:** MEDIO — Requiere privilegios elevados para explotar, pero es una práctica de seguridad estándar que debe cumplirse.

**Acción:**
```sql
ALTER FUNCTION set_updated_at() SET search_path = public, pg_catalog;
```

**Validación:** Ejecutar `get_advisors` MCP nuevamente — el warning de `set_updated_at` debe desaparecer.

---

### Problema 1.4 — Storage buckets de imágenes con política SELECT pública irrestricta

**Sistema afectado:** Supabase Storage — buckets `setup-images` y `trade-screenshots`  
**Detectado mediante:** Análisis de políticas de Storage en auditoría

**Problema:** Ambos buckets tienen política SELECT para `anon` sin restricción de path/folder. Cualquier persona con la URL de un screenshot de trade puede accederlo sin autenticación.

**Riesgo:** MEDIO — Los screenshots de trades son datos financieros sensibles (charts con PnL, símbolos operados, estrategias).

**Acción recomendada:** Cambiar a policy `authenticated` solamente, o implementar signed URLs con expiración desde el servidor.

**Archivos afectados:** Cualquier uso de `supabase.storage` en el frontend (buscar en `src/` con grep `storage.from`).

---

## FASE 2 — Integridad de Datos y Esquema

**Objetivo:** Asegurar que los datos guardados en la BD son válidos y que el esquema refleja las restricciones del dominio.

### Problema 2.1 — Ausencia de CHECK constraints en campos de enum

**Sistema afectado:** PostgreSQL — todas las tablas con campos `type`, `status`, `phase`, `direction`, `severity`, etc.  
**Detectado mediante:** `schema.prisma` — todos los enums implementados como `String` sin `@db.Check`

**Problema:** El `schema.prisma` define campos como `type String @default("PERSONAL")`, `status String @default("ACTIVE")`, `phase String @default("PHASE_1")` etc., pero en PostgreSQL no hay CHECK constraints que validen los valores permitidos. Prisma valida en runtime pero el constraint no existe en la BD. Una inserción directa a la BD (via Supabase Studio, migraciones, scripts de seed) puede meter valores inválidos como `type = "INVALID_TYPE"` sin ningún error.

**Riesgo:** ALTO — Datos corruptos que pasan la validación de BD pero rompen la lógica de la aplicación de formas silenciosas.

**Tablas afectadas:**
- `accounts`: campos `type` (PERSONAL|PROP_FIRM|DEMO_PERSONAL|DEMO_PROP|BACKTEST|QA), `status` (ACTIVE|PAUSED|INACTIVE|LOST), `dd_model` (FIXED|TRAILING), `phase` (PHASE_1|PHASE_2|FUNDED|NONE)
- `trades`: campo `status` (OPEN|CLOSED|CANCELLED), `direction` (LONG|SHORT), `session` (valores del dominio)
- `rules`: campo `severity` (CRÍTICA|ALTA|MEDIA|BAJA)
- `withdrawals`: campo `status` (SOLICITADO|EN_PROCESO|PAGADO|RECHAZADO)
- `setups`: campos `direction` (LARGO|CORTO|AMBAS), `status` (ACTIVO|INACTIVO)

**Validación requerida:** Después de aplicar constraints, verificar que todos los registros existentes pasan las validaciones (si hay datos en prod).

---

### Problema 2.2 — `tick_size` y `point_value` en `markets` almacenados como TEXT

**Sistema afectado:** `schema.prisma` línea 270-271: `tickSize String @map("tick_size")`, `pointValue String @map("point_value")`  
**Detectado mediante:** Lectura de `schema.prisma` + análisis de dominio

**Problema:** Los campos `tick_size` y `point_value` del modelo `Market` están definidos como `String` en el esquema, lo que significa que se guardan como texto libre (ej: `"$20"`, `"0.25 / lot"`). Esto hace imposible usar estos valores en cálculos de PnL real (especialmente para futuros donde el dollar value por punto es crítico).

**Riesgo:** ALTO — Cualquier feature de cálculo automático de PnL real usando especificaciones del mercado será imposible de implementar sin una migración disruptiva.

**Acción:** Migrar a `Decimal?` para ambos campos + migración de datos que parsee los strings existentes.

**Archivos afectados:**
- `src/prisma/schema.prisma` (líneas 270-271)
- Nueva migración de Supabase
- Componentes que editan/muestran estos campos en la UI de Mercados

---

### Problema 2.3 — Estructura de `propFirmRules` en mock-data no coincide con schema

**Sistema afectado:** `src/mock-data/index.ts` + cualquier componente que consume el tipo `Account`  
**Detectado mediante:** Lectura de `src/mock-data/index.ts` — objeto `propFirmRules: { maxDrawdownPct, dailyLossPct, ... }` vs schema Prisma plano

**Problema:** El archivo `src/mock-data/index.ts` define cuentas con un objeto anidado `propFirmRules` que no existe en el schema Prisma. El schema tiene campos planos: `dd_daily_pct`, `dd_weekly_pct`, `dd_monthly_pct`, `dd_total_pct`, `target_pct`. Esta discrepancia TypeScript se oculta con `as any` en algunos componentes.

**Riesgo:** MEDIO — Al conectar las páginas que usan mock data a la BD real, los mapeos fallarán en runtime.

---

## FASE 3 — Integración Frontend / Backend

**Objetivo:** Eliminar todos los usos de mock-data en páginas de producción y conectarlas a la BD real via tRPC.

### Problema 3.1 — Página `/reviews` (WeeklyReview) 100% mock, sin persistencia

**Sistema afectado:** `src/app/reviews/page.tsx` (1263 líneas)  
**Detectado mediante:** Lectura completa del archivo — cero llamadas tRPC, imports directos de `@/mock-data`

**Problema:**
- Importa `mockReviews, mockAccounts, mockResources, mockTrades` de `src/mock-data/index.ts`
- Tiene `EXTRA_REVIEWS` hardcodeado inline (4 objetos de review con fechas y PnLs fijos)
- Tiene `WEEK_OPTIONS` hardcodeado (semanas con displayPnl y wr estáticos)
- Tiene `MOCK_TRADES` hardcodeado en línea 348 (5 trades fijos)
- Los botones de "Guardar" en `NuevaReviewModal` (líneas 1198, 1201) solo llaman `onOpenChange(false)` — los datos NUNCA se persisten
- La función `accountName()` resuelve nombres desde `mockAccounts` — mostrará nombres incorrectos para cuentas reales
- KPIs calculados sobre datos mock — valores completamente ficticios

**Riesgo:** CRÍTICO — El usuario percibe que está guardando reviews pero los datos se pierden al recargar. Función completamente no funcional en producción.

**Solución requerida:**
1. Crear `src/server/trpc/routers/weekly-reviews.ts` con procedimientos: `list`, `create`, `update`, `delete`, `getByWeek`
2. Registrar en `src/server/trpc/root.ts`
3. Reemplazar todos los imports de `mockReviews` con `trpc.weeklyReviews.list.useQuery()`
4. Conectar `NuevaReviewModal` a `trpc.weeklyReviews.create.useMutation()`
5. Calcular KPIs desde datos reales de trades (ya disponibles via `trpc.trades.list`)
6. Eliminar `EXTRA_REVIEWS`, `WEEK_OPTIONS` hardcodeados, `MOCK_TRADES` inline

**Dependencias:** Supabase tabla `weekly_reviews` ya existe con todas las columnas necesarias.

---

### Problema 3.2 — Página `/aprendizaje` (LearningResource) 100% mock, sin persistencia

**Sistema afectado:** `src/app/aprendizaje/page.tsx`  
**Detectado mediante:** Análisis de imports — usa `mockResources` de `src/mock-data/index.ts`

**Problema:** La página de recursos de aprendizaje importa `mockResources` y no tiene ningún router tRPC para `LearningResource`. Los CRUD (crear, editar, eliminar recursos) no persisten.

**Solución requerida:**
1. Crear `src/server/trpc/routers/learning-resources.ts` con: `list`, `create`, `update`, `delete`, `toggleReview`
2. Registrar en `src/server/trpc/root.ts`
3. Conectar página con `trpc.learningResources.list.useQuery()` y mutations

**Dependencias:** Supabase tabla `learning_resources` ya existe.

---

### Problema 3.3 — No existe router tRPC para `weeklyReviews` ni `learningResources`

**Sistema afectado:** `src/server/trpc/root.ts` (estructura de routers)  
**Detectado mediante:** Análisis de la carpeta `src/server/trpc/routers/` — solo existen: `accounts.ts`, `trades.ts`, `setups.ts`, `markets.ts`, `rules.ts`

**Problema:** El backend tRPC no tiene implementados los routers para dos módulos completos del sistema:
- `weeklyReviewsRouter` — ningún archivo existe
- `learningResourcesRouter` — ningún archivo existe

Esto significa que aunque la BD tiene las tablas, no hay API para accederlas desde el frontend.

---

### Problema 3.4 — `src/mock-data/index.ts` importado en páginas de producción

**Sistema afectado:** `src/mock-data/index.ts`, `src/app/reviews/page.tsx`, `src/app/aprendizaje/page.tsx`

**Problema:** El archivo de mock data se importa directamente en páginas que se renderizan en producción. No hay separación entre entorno de desarrollo y producción para estos datos.

**Acción:** Una vez que las páginas estén conectadas a la BD, eliminar los imports de mock-data de las páginas de producción. El archivo `src/mock-data/index.ts` puede mantenerse solo para seeding/development.

---

## FASE 4 — Consistencia Lógica y Fórmulas

**Objetivo:** Corregir todos los errores de cálculo en métricas financieras y de trading.

### Problema 4.1 — Fórmula de Expectancy inconsistente entre router y dashboard

**Sistema afectado:**
- `src/server/trpc/routers/trades.ts` línea 284: `const expectancy = avgR * (winRate / 100) - (1 - winRate / 100)`
- `src/app/dashboard/page.tsx` — cálculo inline diferente

**Problema:** En `trades.ts`, la fórmula de Expectancy asume que todas las pérdidas son exactamente 1R: `Loss_avg_R = 1.0`. Esto es matemáticamente incorrecto. La fórmula correcta es:
```
Expectancy = (Win Rate × Avg Win R) - (Loss Rate × Avg Loss R)
```
Ambos `avgWinR` y `avgLossR` deben calcularse desde los trades reales con `r_multiple` guardado. Adicionalmente, el cálculo del dashboard es diferente al del router, produciendo dos valores distintos para la misma métrica.

**Riesgo:** ALTO — Métrica clave de trading (Expectancy) muestra valores incorrectos que pueden llevar al trader a conclusiones erróneas sobre su sistema.

**Archivos afectados:** `src/server/trpc/routers/trades.ts` (línea 284), `src/app/dashboard/page.tsx`

---

### Problema 4.2 — Sharpe Ratio usa desviación estándar poblacional en vez de muestral

**Sistema afectado:** `src/app/dashboard/page.tsx` línea ~291

**Problema:** El cálculo de Sharpe Ratio divide por `rs.length` (std dev poblacional, σ) en lugar de `rs.length - 1` (std dev muestral, s). Para tamaños de muestra pequeños (lo normal en trading, 10-100 trades), esta diferencia es significativa y produce un Sharpe ratio inflado artificialmente.

**Fórmula incorrecta:** `Math.sqrt(rs.reduce((a, v) => a + (v - mean) ** 2, 0) / rs.length)`  
**Fórmula correcta:** `Math.sqrt(rs.reduce((a, v) => a + (v - mean) ** 2, 0) / (rs.length - 1))`

**Archivos afectados:** `src/app/dashboard/page.tsx`

---

### Problema 4.3 — MAE/MFE calculado como riesgo planificado, no como excursión real

**Sistema afectado:** `src/app/dashboard/page.tsx` líneas 731-742

**Problema:** Las métricas "MAE" (Maximum Adverse Excursion) y "MFE" (Maximum Favorable Excursion) se calculan como `entry - stop` y `target - entry` respectivamente, es decir, el riesgo y reward **planificados** antes de entrar al trade. Las métricas MAE/MFE reales deben medir el movimiento de precio durante la vida del trade (el mínimo alcanzado en contra y el máximo a favor antes del cierre).

**Riesgo:** MEDIO — Los gráficos de MAE/MFE son engañosos — muestran distribución de R planificado, no el comportamiento de precio real.

**Nota:** Implementar MAE/MFE real requiere capturar datos de precio durante el trade (no disponible actualmente). Como solución intermedia, renombrar las métricas a "Riesgo Planificado" / "Reward Planificado" para evitar la confusión.

**Archivos afectados:** `src/app/dashboard/page.tsx` (etiquetas y comentarios de las métricas)

---

### Problema 4.4 — Cálculo de semana ISO incorrecto puede dar semana 0 o semana errónea

**Sistema afectado:** `src/app/dashboard/page.tsx` línea ~1202

**Problema:** La función de cálculo de semana del año usa:
```javascript
Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
```
Esta fórmula no implementa correctamente ISO 8601. Puede producir:
- Semana 0 para los primeros días de enero en algunos años
- Semana 53/54 incorrecta en diciembre
- Discrepancias con el estándar ISO que define la semana 1 como la que contiene el primer jueves del año

**Solución:** Reemplazar con implementación ISO 8601 correcta o usar `date-fns/getISOWeek` (ya disponible en el proyecto).

**Archivos afectados:** `src/app/dashboard/page.tsx`

---

### Problema 4.5 — `rMultiple` en trades abiertos representa RR planificado, no R real

**Sistema afectado:** `src/app/trades/page.tsx` línea ~103, `src/server/trpc/routers/trades.ts` procedimiento `create`

**Problema:** Al crear un trade, se pasa `rr` (ratio reward/risk planificado = `(target - entry) / (entry - stop)`) como valor para `rMultiple`. El R-Multiple real solo puede calcularse al **cerrar** el trade: `rMultiple = (closePrice - entry) / (entry - stop)`. Guardar el RR planificado como `rMultiple` mezcla dos conceptos distintos.

**Acción:** En `create`, no guardar `rMultiple` (dejar `null`). Solo guardarlo en el procedimiento `close` donde ya está implementado correctamente.

**Archivos afectados:** `src/app/trades/page.tsx`, `src/server/trpc/routers/trades.ts`

---

## FASE 5 — Performance y Escalabilidad

**Objetivo:** Asegurar que la aplicación no se degrada con volúmenes reales de datos.

### Problema 5.1 — 5 índices de FK faltantes en PostgreSQL

**Sistema afectado:** Supabase PostgreSQL — tablas `rules`, `setups`, `trade_events`, `trades`, `weekly_reviews`  
**Detectado mediante:** `get_advisors` MCP — los 5 índices aparecen explícitamente como advisories

**Índices faltantes (confirmados por el performance advisor de Supabase):**
```sql
CREATE INDEX IF NOT EXISTS rules_user_id_idx ON rules(user_id);
CREATE INDEX IF NOT EXISTS setups_user_id_idx ON setups(user_id);
CREATE INDEX IF NOT EXISTS trade_events_user_id_idx ON trade_events(user_id);
CREATE INDEX IF NOT EXISTS trades_setup_id_idx ON trades(setup_id);
CREATE INDEX IF NOT EXISTS weekly_reviews_account_id_idx ON weekly_reviews(account_id);
```

**Riesgo:** ALTO — Con usuarios que tienen >500 trades o >100 setups, las queries sin índice hacen sequential scans completos. El Supabase Performance Advisor marcó esto explícitamente.

**Dependencias:** Ninguna — pueden aplicarse en cualquier orden con `CREATE INDEX CONCURRENTLY` para no bloquear la BD.

---

### Problema 5.2 — `trades.list` carga TODOS los trades sin paginación

**Sistema afectado:** `src/server/trpc/routers/trades.ts` — procedimiento `list`  
**Detectado mediante:** Lectura del archivo — sin `take`/`skip` en la query de Prisma

**Problema:** El procedimiento `list` ejecuta `prisma.trade.findMany({ where: { userId }, orderBy: ... })` sin límite. Con 1000+ trades, esto implica:
- Transferencia masiva de datos en cada carga de página
- Rendering de 1000+ filas en el DOM
- Cálculos de KPIs sobre arrays de 1000+ elementos en el cliente

**Solución:** Implementar paginación cursor-based o offset + `take: 50` con carga incremental.

**Archivos afectados:** `src/server/trpc/routers/trades.ts`, `src/app/trades/page.tsx`, `src/app/dashboard/page.tsx` (que también consume trades.list)

---

### Problema 5.3 — RLS policies con `auth.uid()` reevaluado por fila sin wrapper `(select ...)`

**Sistema afectado:** Supabase — todas las 10 políticas RLS activas  
**Detectado mediante:** Análisis de políticas en auditoría

**Problema:** Todas las políticas RLS usan `USING (auth.uid() = user_id)` directamente. PostgreSQL evalúa `auth.uid()` una vez por cada fila chequeada. El patrón correcto es `USING ((select auth.uid()) = user_id)`, que permite al planner evaluar `auth.uid()` una sola vez por query (InitPlan vs rescan).

**Impacto:** En tablas con muchos registros, las queries con RLS activo son entre 2x-10x más lentas de lo necesario.

**Acción:** Recrear las 10 políticas usando el patrón `(select auth.uid())`:
```sql
DROP POLICY "trades_user" ON trades;
CREATE POLICY "trades_user" ON trades FOR ALL TO authenticated 
  USING ((select auth.uid()) = user_id) 
  WITH CHECK ((select auth.uid()) = user_id);
-- (repetir para las 9 políticas restantes)
```

---

## FASE 6 — Calidad de Código y UX

**Objetivo:** Eliminar deuda técnica, código muerto, tipos `any`, duplicaciones y componentes sin usar.

### Problema 6.1 — Código muerto: `ACCOUNT_STATS` mock en `cuentas/page.tsx`

**Sistema afectado:** `src/app/cuentas/page.tsx` líneas 39-64  
**Detectado mediante:** Lectura del archivo — objeto nunca referenciado en la UI

**Problema:** Existe un objeto `ACCOUNT_STATS` hardcodeado con datos de rendimiento de cuentas ficticias. Ya no se usa porque los stats se calculan desde datos reales (via `trpc.trades.list`). Ocupa ~25 líneas de código muerto.

**Acción:** Eliminar el objeto `ACCOUNT_STATS` completo.

---

### Problema 6.2 — `ACCOUNT_STATUS_META` definido dos veces en `cuentas/page.tsx`

**Sistema afectado:** `src/app/cuentas/page.tsx` líneas 78 y 341  
**Detectado mediante:** Lectura del archivo — definición duplicada del mismo objeto

**Problema:** El objeto `ACCOUNT_STATUS_META` aparece definido dos veces en el mismo archivo, con ligeras diferencias. Esto garantiza que una de las dos definiciones está siendo ignorada o sobrescribiendo la otra, y que ambas pueden quedar desincronizadas en el futuro.

**Acción:** Eliminar la segunda definición, mantener solo la primera y usarla en todo el archivo.

---

### Problema 6.3 — Componente `Sparkline` marcado como unused con `eslint-disable`

**Sistema afectado:** `src/app/dashboard/page.tsx`  
**Detectado mediante:** Presencia de `eslint-disable @typescript-eslint/no-unused-vars` sobre el componente

**Problema:** El componente `Sparkline` está definido en `dashboard/page.tsx` pero no se usa en ningún lugar. En lugar de eliminarlo, se suprimió el warning de ESLint con un comentario de deshabilitación.

**Acción:** Eliminar el componente `Sparkline` y su `eslint-disable` comment asociado.

---

### Problema 6.4 — Componente `RuleBar` duplicado en `dashboard/page.tsx` y `cuentas/page.tsx`

**Sistema afectado:** `src/app/dashboard/page.tsx`, `src/app/cuentas/page.tsx`  
**Detectado mediante:** Análisis de componentes inline

**Problema:** El componente `RuleBar` está definido inline en dos archivos distintos, con implementaciones potencialmente divergentes. Cambios en el diseño del componente deben hacerse en dos lugares.

**Acción:** Extraer a `src/components/ui/rule-bar.tsx` y exportar desde ambas páginas.

---

### Problema 6.5 — Componente `MiniSparkline` SVG duplicado en `dashboard` y `cuentas`

**Sistema afectado:** `src/app/dashboard/page.tsx`, `src/app/cuentas/page.tsx`  
**Detectado mediante:** Análisis de componentes inline con SVG

**Acción:** Extraer a `src/components/ui/mini-sparkline.tsx`.

---

### Problema 6.6 — Componente `KpiCard` duplicado: inline en `dashboard` y en `kpi-strip.tsx`

**Sistema afectado:** `src/app/dashboard/page.tsx`, `src/components/kpi-strip.tsx`  
**Detectado mediante:** Análisis de componentes inline

**Acción:** Usar exclusivamente el de `kpi-strip.tsx`, eliminar la definición inline en `dashboard/page.tsx`.

---

### Problema 6.7 — 4× casts `as never` en `src/app/trades/page.tsx`

**Sistema afectado:** `src/app/trades/page.tsx` líneas 179, 209, 210, 279

**Problema:** Se usa `as never` para silenciar errores de TypeScript en lugar de corregir los tipos. Esto oculta posibles discrepancias entre el tipo del formulario y el tipo esperado por el router tRPC.

**Acción:** Definir tipos explícitos que coincidan con los schemas de Zod de los routers tRPC y eliminar los casts.

---

### Problema 6.8 — 3× tipos `any` explícitos en `cuentas/page.tsx`

**Sistema afectado:** `src/app/cuentas/page.tsx` — parámetros `rawAccount: any` en múltiples componentes internos

**Problema:** Los componentes `AccountCard`, `AccountDetailPanel`, `NuevaCuentaModal`, `EditarCuentaModal` reciben `rawAccount: any` en lugar de usar el tipo inferido del router tRPC.

**Acción:** Extraer el tipo de output del router `accounts.list` y usarlo como tipo explícito:
```typescript
type AccountFromRouter = RouterOutputs['accounts']['list'][number]
```

---

## FASE 7 — Testing y Estabilidad de Producción

**Objetivo:** Establecer una suite de tests que detecte regresiones antes de que lleguen a producción.

### Problema 7.1 — 7+ deployments con estado ERROR en Vercel por TypeScript

**Sistema afectado:** Vercel — deployments históricos (confirmado via `list_deployments` MCP)

**Problema detectado:** Los errores recurrentes son:
- Recharts `Tooltip` prop `formatter` con tipo incompatible (`string | number | (ReactElement | string | number)[]` vs el tipo esperado)
- Recharts `Pie` prop `percent` con posible `undefined` no manejado

**Acción inmediata:** Corregir los 2 tipos de error de TypeScript en los componentes de charts del dashboard y verificar que el siguiente deployment sea READY.

**Archivos afectados:** `src/app/dashboard/page.tsx` (usos de `<Tooltip formatter={...}>` y `<Pie>`)

---

### Problema 7.2 — Sin suite de tests para lógica de negocio crítica

**Sistema afectado:** Framework Vitest (configurado pero sin tests de dominio)

**Problema:** No existen tests para:
- Fórmulas financieras (Expectancy, Sharpe, Profit Factor, R-Multiple)
- Procedimientos tRPC críticos (create trade, close trade, changePhase con guards)
- Lógica de guards de cambio de fase en `accounts.ts`
- Cálculos de AccountStats en `cuentas/page.tsx`

**Prioridad de tests a escribir:**
1. `src/server/trpc/routers/trades.test.ts` — close trade PnL calculation, expectancy formula
2. `src/server/trpc/routers/accounts.test.ts` — phase promotion guards
3. `src/lib/formulas.ts` (a crear) — unit tests de todas las fórmulas financieras

---

## Dependencias entre Fases

```
FASE 1 (Seguridad)
  └── Puede ejecutarse inmediatamente, no bloquea nada

FASE 2 (Integridad de Datos)
  └── Problema 2.2 (tick_size/point_value) bloquea cálculos de PnL real de futuros

FASE 3 (Integración Frontend/Backend)
  ├── Requiere: Fase 1 completa (RLS activo antes de conectar páginas reales)
  ├── Bloquea: cálculos de KPIs reales de reviews
  └── Problema 3.3 (routers faltantes) bloquea Problema 3.1 y 3.2

FASE 4 (Fórmulas)
  ├── Puede iniciarse en paralelo con Fase 3
  └── Requiere Fase 3 completa para validar con datos reales

FASE 5 (Performance)
  ├── Problema 5.1 (índices) puede ejecutarse inmediatamente (sin dependencias)
  └── Problema 5.2 (paginación) puede iniciarse en paralelo con Fase 3

FASE 6 (Calidad de Código)
  └── Puede ejecutarse en paralelo con cualquier fase, sin dependencias

FASE 7 (Testing)
  └── Idealmente después de Fase 4 (fórmulas correctas antes de escribir tests)
```

---

## Estimación Realista

| Fase | Esfuerzo estimado | Tipo de trabajo |
|------|------------------|-----------------|
| Fase 1 — Seguridad | 2-4 horas | SQL migrations + Supabase config |
| Fase 2 — Integridad | 4-8 horas | Schema migration + data migration |
| Fase 3 — Integración | 3-5 días | Nuevos routers tRPC + refactor pages |
| Fase 4 — Fórmulas | 4-8 horas | Bug fixes en formulas + tests |
| Fase 5 — Performance | 2-4 horas | SQL indexes + paginación |
| Fase 6 — Calidad | 1-2 días | Refactor de componentes + tipos |
| Fase 7 — Testing | 2-3 días | Escribir suite de tests |
| **TOTAL** | **~2.5 semanas** | Full stack + BD |

---

*Plan generado a partir de auditoría técnica real. Todos los problemas están documentados con ubicación específica en el código fuente, tablas de BD, y herramientas MCP de Supabase/Vercel.*
